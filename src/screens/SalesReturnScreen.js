import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, FlatList, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { getInvoiceItems } from '../database/services';

export default function SalesReturnScreen({ navigation, route }) {
  const customers = useStore(state => state.customers);
  const invoices = useStore(state => state.invoices);
  const payments = useStore(state => state.payments);
  const profile = useStore(state => state.profile);
  const addSalesReturn = useStore(state => state.addSalesReturn);
  const deleteSalesReturn = useStore(state => state.deleteSalesReturn);
  const processReturnRefund = useStore(state => state.processReturnRefund);
  const inventoryItems = useStore(state => state.items);

  const { preselectedCustomerId, preselectedCustomerName } = route.params || {};

  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId || null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [reason, setReason] = useState('Incorrect Item Shipped');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [lineItems, setLineItems] = useState([]);
  const [manualAdjustment, setManualAdjustment] = useState('');
  const [notes, setNotes] = useState('');

  // Refund choice modal
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [savedReturn, setSavedReturn] = useState(null);
  const [processingRefund, setProcessingRefund] = useState(false);

  const reasons = [
    'Incorrect Item Shipped',
    'Damaged in Transit',
    'Overcharged / Pricing Error',
    'Quality Unsatisfactory',
    'Other / See Notes'
  ];

  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedCustomerId), 
    [customers, selectedCustomerId]
  );

  const availableInvoices = useMemo(() => 
    invoices.filter(i => i.customerId === selectedCustomerId || i.customer_id === selectedCustomerId),
    [invoices, selectedCustomerId]
  );

  const selectedInvoice = useMemo(() => 
    invoices.find(i => i.id === selectedInvoiceId),
    [invoices, selectedInvoiceId]
  );

  useEffect(() => {
    // If an invoice is passed via route params, auto-select it and its customer
    if (route.params?.invoice) {
      const inv = route.params.invoice;
      setSelectedCustomerId(inv.customerId || inv.customer_id);
      setSelectedInvoiceId(inv.id);
    }
  }, [route.params?.invoice]);

  useEffect(() => {
    if (selectedInvoiceId) {
      loadInvoiceItems(selectedInvoiceId);
    } else {
      setLineItems([]);
    }
  }, [selectedInvoiceId]);

  const loadInvoiceItems = async (id) => {
    try {
      const items = await getInvoiceItems(id);
      setLineItems(items.map(item => ({
        ...item,
        returnQty: (item.quantity || 1).toString(),
        originalQty: item.quantity || 1
      })));
    } catch (e) {
      console.error('Error loading invoice items:', e);
    }
  };

  // How much was actually paid (cash/credit) on the selected invoice (excluding credit_note entries)
  const amountPaidOnInvoice = useMemo(() => {
    if (!selectedInvoiceId) return 0;
    return payments
      .filter(p =>
        String(p.invoiceId || p.invoice_id) === String(selectedInvoiceId) &&
        p.type !== 'credit_note'
      )
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  }, [payments, selectedInvoiceId]);

  // How much of the invoice due has already been reduced by prior return credit notes
  const existingDueReducedOnInvoice = useMemo(() => {
    if (!selectedInvoiceId) return 0;
    return payments
      .filter(p =>
        p.type === 'credit_note' &&
        String(p.invoiceId || p.invoice_id) === String(selectedInvoiceId)
      )
      .reduce((sum, p) => sum + (parseFloat(p.dueReduced || p.due_reduced) || 0), 0);
  }, [payments, selectedInvoiceId]);

  const totals = useMemo(() => {
    const round2 = (v) => Math.round(v * 100) / 100;

    const itemsTotal = round2(lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.returnQty) || 0;
      const rate = parseFloat(item.rate) || 0;
      return sum + (qty * rate);
    }, 0));

    // Calculate proportional GST on returned items using the original invoice's tax %
    const taxPercent = parseFloat(selectedInvoice?.tax_percent || selectedInvoice?.taxPercent || 0);
    const taxAmount = round2((itemsTotal * taxPercent) / 100);

    const adjustment = round2(parseFloat(manualAdjustment) || 0);
    const grossCredit = round2(itemsTotal + taxAmount + adjustment);

    if (!selectedInvoiceId) {
      // No invoice linked — full credit, no due adjustment
      return { itemsTotal, taxPercent, taxAmount, grossCredit, effectiveRefund: grossCredit, dueReduced: 0, dueWaived: 0, total: grossCredit };
    }

    const invoiceTotal = round2(parseFloat(selectedInvoice?.total || 0));
    // Current outstanding due = invoice total MINUS cash paid MINUS already-applied return credits
    const dueOnInvoice = round2(Math.max(0, invoiceTotal - amountPaidOnInvoice - existingDueReducedOnInvoice));

    // 1) First adjust the return amount against the outstanding due
    const dueReduced = round2(Math.min(grossCredit, dueOnInvoice));

    // 2) Whatever remains after settling the due is the actual refund
    //    Also cap at amountPaid so we never refund more than the customer paid
    const effectiveRefund = round2(Math.max(0, Math.min(grossCredit - dueReduced, amountPaidOnInvoice)));

    // 3) Any due left that isn't covered by the return is waived (forgiven)
    const dueWaived = round2(Math.max(0, dueOnInvoice - dueReduced));

    return { itemsTotal, taxPercent, taxAmount, grossCredit, effectiveRefund, dueReduced, dueWaived, total: effectiveRefund };
  }, [lineItems, manualAdjustment, amountPaidOnInvoice, existingDueReducedOnInvoice, selectedInvoice, selectedInvoiceId]);

  const handleDeleteItem = (id) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateQty = (id, val) => {
    setLineItems(prev => prev.map(item => 
      item.id === id ? { ...item, returnQty: val, total: (parseFloat(val) || 0) * (parseFloat(item.rate) || 0) } : item
    ));
  };

  const handleUpdateRate = (id, val) => {
    setLineItems(prev => prev.map(item => 
      item.id === id ? { ...item, rate: val, total: (parseFloat(item.returnQty) || 0) * (parseFloat(val) || 0) } : item
    ));
  };

  const addItemFromInventory = (item) => {
    const newItem = {
      id: Date.now().toString(),
      item_id: item.id,
      name: item.name,
      rate: (item.retail_price || item.price || 0).toString(),
      returnQty: '1',
      total: parseFloat(item.retail_price || item.price || 0)
    };
    setLineItems(prev => [newItem, ...prev]);
    setShowItemPicker(false);
  };

  const addManualItem = () => {
    const newItem = {
      id: Date.now().toString(),
      item_id: '',
      name: '',
      rate: '0',
      returnQty: '1',
      total: 0
    };
    setLineItems(prev => [newItem, ...prev]);
  };

  const handleSave = async () => {
    if (!selectedCustomerId) return Alert.alert('Error', 'Please select a customer');
    if (lineItems.length === 0) return Alert.alert('Error', 'No items to return');

    // ── Guard: block a second return on the same invoice ──────────────────
    if (selectedInvoiceId && selectedInvoice?.return_status && selectedInvoice.return_status !== 'NONE') {
      return Alert.alert(
        '🚫 Return Not Allowed',
        'A return has already been recorded for this invoice. Only one return is permitted per invoice.',
        [{ text: 'OK' }]
      );
    }

    // Validate that all items have a name
    const emptyNameItems = lineItems.filter(item => !item.name || !item.name.trim());
    if (emptyNameItems.length > 0) {
      return Alert.alert('Incomplete Items', 'All items must have a name before processing a return.');
    }

    if (totals.grossCredit <= 0) {
      return Alert.alert('Invalid Total', 'Total return value must be greater than zero.');
    }

    try {
      const returnNumber = `RET-${Date.now().toString().slice(-6)}`;
      const saved = await addSalesReturn({
        returnNumber,
        invoiceId: selectedInvoiceId,
        customerId: selectedCustomerId,
        customerName: selectedCustomer.name,
        date: new Date().toISOString().split('T')[0],
        reason,
        subtotal: totals.itemsTotal,
        taxAmount: totals.taxAmount,
        total: totals.grossCredit,
        effectiveRefund: totals.effectiveRefund,
        dueReduced: totals.dueReduced,
        notes,
        items: lineItems.map(item => ({
          item_id: item.item_id,
          name: item.name,
          quantity: parseFloat(item.returnQty),
          rate: parseFloat(item.rate),
          total: (parseFloat(item.returnQty) || 0) * (parseFloat(item.rate) || 0)
        }))
      });
      // Show refund choice modal instead of navigating away
      setSavedReturn({ id: saved.id, returnNumber, grossCredit: totals.grossCredit });
      setShowRefundModal(true);
    } catch (e) {
      console.error('Error saving sales return:', e);
      Alert.alert('Error', 'Failed to process return');
    }
  };

  const sym = profile.currency_symbol || '₹';

  const fmt = (amt) => `${sym}${(parseFloat(amt) || 0).toFixed(2)}`;

  const handleRefundChoice = async (refundType) => {
    if (!savedReturn || processingRefund) return;
    try {
      setProcessingRefund(true);
      await processReturnRefund({
        refundType,
        amount: savedReturn.grossCredit,
        customerId: selectedCustomerId,
        customerName: selectedCustomer?.name,
        invoiceId: selectedInvoiceId,
        salesReturnId: savedReturn.id,
        returnNumber: savedReturn.returnNumber,
      });
      setShowRefundModal(false);
      setSavedReturn(null);
      const msg = refundType === 'WALLET'
        ? `${fmt(savedReturn.grossCredit)} added to customer wallet.`
        : `${fmt(savedReturn.grossCredit)} cash refund recorded.`;
      Alert.alert('✅ Refund Processed', msg, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error('processReturnRefund error:', e);
      Alert.alert('Error', 'Failed to process refund.');
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleBackFromRefund = async () => {
    if (!savedReturn || processingRefund) return;
    try {
      setProcessingRefund(true);
      // Deleting the sales return will also reverse the stock addition
      await deleteSalesReturn(savedReturn.id);
      setShowRefundModal(false);
      setSavedReturn(null);
    } catch (e) {
      console.error('handleBackFromRefund error:', e);
      Alert.alert('Error', 'Failed to undo return. Please try again or contact support.');
    } finally {
      setProcessingRefund(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-row items-center justify-between px-4 h-16 bg-white border-b border-slate-100 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
            <MaterialIcons name="arrow-back" size={24} color="#121642" />
          </TouchableOpacity>
          <Text className="text-xl font-black text-primary ml-2 uppercase tracking-tight">Sales Return</Text>
        </View>
        <TouchableOpacity className="p-2">
          <MaterialIcons name="more-vert" size={24} color="#121642" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Customer & Invoice Selection Header Section */}
        <View className="flex-row flex-wrap gap-4 mb-6">
          <TouchableOpacity 
            onPress={() => setShowCustomerModal(true)}
            className="flex-1 min-w-[300px] bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer Details</Text>
              <View className="bg-indigo-50 px-2 py-0.5 rounded-full">
                <Text className="text-[8px] font-black text-indigo-600 uppercase">Verified</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center">
                <MaterialIcons name="person" size={24} color="#6366f1" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-black text-primary">{selectedCustomer?.name || 'Select Customer'}</Text>
                <Text className="text-xs text-slate-400 font-medium">{selectedCustomer?.email || 'Tap to choose client'}</Text>
              </View>
              <MaterialIcons name="expand-more" size={20} color="#CBD5E1" />
            </View>
          </TouchableOpacity>

          <View className="flex-1 min-w-[300px] bg-white rounded-2xl p-5 shadow-sm border border-slate-100 gap-4">
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Original Invoice</Text>
              <TouchableOpacity 
                onPress={() => {
                  if (!selectedCustomerId) return Alert.alert('Notice', 'Select a customer first');
                  setShowInvoiceModal(true);
                }}
                className="bg-slate-50 rounded-xl p-3 flex-row items-center justify-between border border-dashed border-slate-200"
              >
                <Text className="text-primary font-bold">{selectedInvoice?.invoiceNumber || 'Link Invoice...'}</Text>
                <MaterialIcons name="search" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Reason for Return</Text>
              <TouchableOpacity 
                onPress={() => setShowReasonModal(true)}
                className="bg-slate-50 rounded-xl p-3 flex-row items-center justify-between"
              >
                <Text className="text-primary font-bold">{reason}</Text>
                <MaterialIcons name="expand-more" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        <View className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
          <View className="px-5 py-4 border-b border-slate-50 flex-row justify-between items-center">
            <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Line Items to Return</Text>
            <View className="flex-row items-center gap-4">
              <TouchableOpacity onPress={() => setShowItemPicker(true)} className="flex-row items-center gap-1">
                <MaterialIcons name="inventory-2" size={16} color="#121642" />
                <Text className="text-[10px] font-black text-primary uppercase">Inventory</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addManualItem} className="flex-row items-center gap-1">
                <MaterialIcons name="add-circle" size={16} color="#121642" />
                <Text className="text-[10px] font-black text-primary uppercase">Manual</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="px-5">
            {lineItems.length === 0 ? (
              <View className="py-10 items-center">
                <MaterialIcons name="shopping-basket" size={40} color="#E2E8F0" />
                <Text className="text-slate-400 text-xs mt-2 font-medium">No items selected from invoice</Text>
              </View>
            ) : (
              lineItems.map((item, idx) => (
                <View key={item.id} className={`py-4 ${idx !== lineItems.length - 1 ? 'border-b border-slate-50' : ''}`}>
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-4">
                      {item.item_id ? (
                        <Text className="text-sm font-black text-primary">{item.name}</Text>
                      ) : (
                        <TextInput
                          value={item.name}
                          onChangeText={(v) => {
                            setLineItems(prev => prev.map(li => li.id === item.id ? { ...li, name: v } : li));
                          }}
                          placeholder="Item Name"
                          className="text-sm font-black text-primary p-0"
                        />
                      )}
                      <View className="flex-row items-center gap-2 mt-1">
                        <Text className="text-[10px] text-slate-400 font-medium">Rate: {profile.currency_symbol || '₹'}</Text>
                        <TextInput
                          value={item.rate.toString()}
                          onChangeText={(v) => handleUpdateRate(item.id, v)}
                          keyboardType="numeric"
                          className="bg-slate-50 px-2 py-0.5 rounded text-[10px] font-bold text-primary min-w-[50px]"
                        />
                      </View>
                    </View>
                    <View className="flex-row items-center gap-4">
                      <View className="items-center">
                        <Text className="text-[8px] font-black text-slate-300 uppercase mb-1">Qty</Text>
                        <View className="flex-row items-center bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                          {/* Decrease button */}
                          <TouchableOpacity
                            onPress={() => {
                              const current = parseFloat(item.returnQty) || 1;
                              if (current > 1) handleUpdateQty(item.id, String(current - 1));
                            }}
                            style={{ width: 28, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}
                          >
                            <Text style={{ fontSize: 16, fontWeight: '900', color: '#262A56', lineHeight: 18 }}>‹</Text>
                          </TouchableOpacity>
                          {/* Editable qty */}
                          <TextInput
                            value={item.returnQty.toString()}
                            onChangeText={(v) => handleUpdateQty(item.id, v)}
                            keyboardType="numeric"
                            style={{ width: 36, height: 34, textAlign: 'center', fontWeight: '700', fontSize: 14, color: '#262A56', padding: 0 }}
                          />
                          {/* Increase button */}
                          <TouchableOpacity
                            onPress={() => {
                              const current = parseFloat(item.returnQty) || 1;
                              const max = item.originalQty || 9999;
                              if (current < max) handleUpdateQty(item.id, String(current + 1));
                            }}
                            style={{ width: 28, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}
                          >
                            <Text style={{ fontSize: 16, fontWeight: '900', color: '#262A56', lineHeight: 18 }}>›</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View className="items-end min-w-[80px]">
                        <Text className="text-[8px] font-black text-slate-300 uppercase mb-1">Amount</Text>
                        <Text className="text-sm font-black text-primary">
                          {profile.currency_symbol || '₹'}{( (parseFloat(item.returnQty) || 0) * (parseFloat(item.rate) || 0) ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => handleDeleteItem(item.id)}
                        className="ml-2"
                      >
                        <MaterialIcons name="delete-outline" size={20} color="#FDA4AF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Manual Adjustment Field */}
        <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
          <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">Manual Credit Adjustment</Text>
          <View className="flex-row items-center bg-slate-50 rounded-xl px-4 border border-slate-100">
            <Text className="text-slate-400 font-black mr-2">{profile.currency_symbol || '₹'}</Text>
            <TextInput
              placeholder="0.00"
              keyboardType="numeric"
              value={manualAdjustment}
              onChangeText={setManualAdjustment}
              className="flex-1 py-3 text-primary font-black"
            />
          </View>
          <Text className="text-[10px] text-slate-400 mt-2 font-medium italic">
            This amount will be added to the customer's available return credit.
          </Text>
        </View>

        {/* Footer actions & Totals */}
        <View className="flex-row flex-wrap gap-6 items-start">
          <View className="flex-1 min-w-[300px] bg-slate-100 rounded-2xl p-5">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Internal Memo / Notes</Text>
            <TextInput
              placeholder="Provide additional context for this return..."
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              className="bg-white rounded-xl p-4 text-primary text-xs font-medium min-h-[100px]"
              textAlignVertical="top"
            />
          </View>

          <View className="flex-1 min-w-[300px] bg-primary rounded-3xl p-8 shadow-xl shadow-primary/20">
            <View className="mb-4 gap-2">
              <Text className="text-[9px] font-black text-white uppercase tracking-[0.2em] mb-1 opacity-60">Return Value Breakdown</Text>
              <View className="flex-row justify-between">
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' }}>Items Subtotal</Text>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>
                  {profile.currency_symbol || '₹'}{totals.itemsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
              {totals.taxAmount > 0 && (
                <View className="flex-row justify-between">
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' }}>{profile.currency_code === 'INR' ? `GST (${totals.taxPercent}%)` : `Tax (${totals.taxPercent}%)`}</Text>
                  <Text style={{ color: '#86efac', fontSize: 12, fontWeight: '700' }}>
                    +{profile.currency_symbol || '₹'}{totals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              )}
              <View className="flex-row justify-between">
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' }}>Return Value</Text>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '800' }}>
                  {profile.currency_symbol || '₹'}{totals.grossCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
              {selectedInvoiceId && (totals.dueReduced > 0 || totals.dueWaived > 0) && (
                <>
                  <View className="flex-row justify-between">
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' }}>Due Adjusted</Text>
                    <Text style={{ color: '#fdba74', fontSize: 12, fontWeight: '700' }}>
                      -{profile.currency_symbol || '₹'}{totals.dueReduced.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  {totals.dueWaived > 0 && (
                    <View className="flex-row justify-between">
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' }}>Remaining Due</Text>
                      <Text style={{ color: '#fca5a5', fontSize: 12, fontWeight: '700' }}>
                        {profile.currency_symbol || '₹'}{totals.dueWaived.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  )}
                  <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 }} />
                </>
              )}
            </View>
            <View className="mb-6">
              <Text className="text-[9px] font-black text-white uppercase tracking-[0.2em] mb-1 opacity-60">
                {selectedInvoiceId && totals.dueReduced > 0
                  ? (totals.effectiveRefund > 0 ? 'Effective Refund' : 'Due Settled by Return')
                  : 'Total Credit Amount'}
              </Text>
              {totals.effectiveRefund > 0 || !selectedInvoiceId || totals.dueReduced <= 0 ? (
                <Text className="text-3xl font-black text-white tracking-widest">
                  {profile.currency_symbol || '₹'}{totals.effectiveRefund.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              ) : (
                <Text className="text-2xl font-black text-emerald-300 tracking-widest">
                  ✓ {profile.currency_symbol || '₹'}{totals.dueReduced.toLocaleString(undefined, { minimumFractionDigits: 2 })} adjusted
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={handleSave}
              className="bg-white h-14 rounded-2xl items-center justify-center shadow-lg active:scale-95 transition-all"
            >
              <Text className="text-primary font-black uppercase tracking-widest">
                {totals.effectiveRefund > 0 ? 'Process Return Credit' : 'Process Return & Settle Due'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <Modal visible={showCustomerModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[40px] h-[70%] p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black text-primary">Select Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <MaterialIcons name="close" size={28} color="#262A56" />
              </TouchableOpacity>
            </View>
            <FlatList 
              data={customers}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => {
                    setSelectedCustomerId(item.id);
                    setSelectedInvoiceId(null);
                    setShowCustomerModal(false);
                  }}
                  className={`p-4 rounded-2xl mb-3 flex-row items-center gap-4 ${selectedCustomerId === item.id ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-50'}`}
                >
                  <View className="w-10 h-10 rounded-full bg-white items-center justify-center">
                    <Text className="font-black text-primary">{item.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-black text-primary">{item.name}</Text>
                    <Text className="text-[10px] text-slate-400 font-bold">{item.email || 'No Email'}</Text>
                  </View>
                  {selectedCustomerId === item.id && <MaterialIcons name="check-circle" size={24} color="#6366f1" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showInvoiceModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[40px] h-[70%] p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black text-primary">Link Invoice</Text>
              <TouchableOpacity onPress={() => setShowInvoiceModal(false)}>
                <MaterialIcons name="close" size={28} color="#262A56" />
              </TouchableOpacity>
            </View>
            {availableInvoices.length === 0 ? (
              <View className="flex-1 items-center justify-center">
                <Text className="text-slate-400 font-bold">No invoices found for this customer</Text>
              </View>
            ) : (
              <FlatList 
                data={availableInvoices}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    onPress={() => {
                      setSelectedInvoiceId(item.id);
                      setShowInvoiceModal(false);
                    }}
                    className={`p-4 rounded-2xl mb-3 flex-row items-center justify-between ${selectedInvoiceId === item.id ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-50'}`}
                  >
                    <View>
                      <Text className="font-black text-primary">{item.invoiceNumber || item.invoice_number}</Text>
                      <Text className="text-[10px] text-slate-400 font-bold">{item.date} • {profile.currency_symbol}{item.total}</Text>
                    </View>
                    {selectedInvoiceId === item.id && <MaterialIcons name="check-circle" size={24} color="#6366f1" />}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showReasonModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[40px] p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black text-primary">Select Reason</Text>
              <TouchableOpacity onPress={() => setShowReasonModal(false)}>
                <MaterialIcons name="close" size={28} color="#262A56" />
              </TouchableOpacity>
            </View>
            {reasons.map((r) => (
              <TouchableOpacity 
                key={r}
                onPress={() => {
                  setReason(r);
                  setShowReasonModal(false);
                }}
                className={`p-4 rounded-2xl mb-3 flex-row items-center justify-between ${reason === r ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-50'}`}
              >
                <Text className="font-black text-primary">{r}</Text>
                {reason === r && <MaterialIcons name="check-circle" size={24} color="#6366f1" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={showItemPicker} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[40px] h-[70%] p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black text-primary">Select Item</Text>
              <TouchableOpacity onPress={() => setShowItemPicker(false)}>
                <MaterialIcons name="close" size={28} color="#262A56" />
              </TouchableOpacity>
            </View>
            <FlatList 
              data={inventoryItems}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => addItemFromInventory(item)}
                  className="p-4 rounded-2xl mb-3 flex-row items-center gap-4 bg-slate-50"
                >
                  <View className="w-10 h-10 rounded-full bg-white items-center justify-center">
                    <MaterialIcons name="inventory-2" size={20} color="#6366f1" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-black text-primary">{item.name}</Text>
                    <Text className="text-[10px] text-slate-400 font-bold">Stock: {item.stock} • {profile.currency_symbol}{item.retail_price || item.price}</Text>
                  </View>
                  <MaterialIcons name="add-circle" size={24} color="#6366f1" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ── Refund Choice Modal ─────────────────────────────────────────────────── */}
      <Modal 
        visible={showRefundModal} 
        transparent 
        animationType="slide" 
        onRequestClose={handleBackFromRefund}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, paddingBottom: 44, position: 'relative' }}>
            {/* Header / Handle */}
            <View style={{ width: 44, height: 5, backgroundColor: '#e2e8f0', borderRadius: 99, alignSelf: 'center', marginBottom: 20 }} />

            {/* Back Button */}
            <TouchableOpacity 
              onPress={handleBackFromRefund}
              disabled={processingRefund}
              style={{ position: 'absolute', top: 30, left: 24, padding: 8, backgroundColor: '#f8fafc', borderRadius: 12, opacity: processingRefund ? 0.5 : 1 }}
            >
              <MaterialIcons name="arrow-back" size={20} color="#1e293b" />
            </TouchableOpacity>

            {/* Icon + Title */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <MaterialIcons name="assignment-return" size={30} color="#16a34a" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b', textAlign: 'center' }}>Return Processed ✅</Text>

              {/* Summary pill */}
              {savedReturn && (() => {
                const gross = savedReturn.grossCredit || 0;
                // Compute effective refund from totals at time of save
                const refundable = totals.effectiveRefund;
                const settled = totals.dueReduced;
                return (
                  <View style={{ marginTop: 10, width: '100%', backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, gap: 6 }}>
                    {settled > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>Invoice balance settled</Text>
                        <Text style={{ fontSize: 12, color: '#0f172a', fontWeight: '800' }}>{fmt(settled)}</Text>
                      </View>
                    )}
                    {refundable > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>Customer refund due</Text>
                        <Text style={{ fontSize: 12, color: '#dc2626', fontWeight: '800' }}>{fmt(refundable)}</Text>
                      </View>
                    )}
                    <View style={{ borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: '#475569', fontWeight: '700' }}>Total return value</Text>
                      <Text style={{ fontSize: 13, color: '#1e293b', fontWeight: '900' }}>{fmt(gross)}</Text>
                    </View>
                  </View>
                );
              })()}

              {totals.effectiveRefund > 0 && (
                <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 12, textAlign: 'center' }}>
                  How should {fmt(totals.effectiveRefund)} be refunded?
                </Text>
              )}
            </View>

            {/* ── If there's a refundable amount, show wallet + cash options ── */}
            {totals.effectiveRefund > 0 ? (
              <>
                {/* Wallet option */}
                <TouchableOpacity
                  onPress={() => handleRefundChoice('WALLET')}
                  disabled={processingRefund}
                  style={{
                    backgroundColor: '#f0fdf4',
                    borderRadius: 20, padding: 18, marginBottom: 12,
                    borderWidth: 2, borderColor: '#86efac',
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                    opacity: processingRefund ? 0.5 : 1,
                  }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="account-balance-wallet" size={24} color="#16a34a" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#15803d' }}>Add to Customer Wallet</Text>
                    <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 }}>Credit saved — auto-applied on next invoice</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color="#86efac" />
                </TouchableOpacity>

                {/* Cash Refund option */}
                <TouchableOpacity
                  onPress={() => handleRefundChoice('CASH')}
                  disabled={processingRefund}
                  style={{
                    backgroundColor: '#fff5f5',
                    borderRadius: 20, padding: 18,
                    borderWidth: 2, borderColor: '#fecaca',
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                    opacity: processingRefund ? 0.5 : 1,
                  }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="payments" size={24} color="#dc2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#dc2626' }}>Cash Refund Given</Text>
                    <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 }}>Physical cash handed to customer now</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color="#fecaca" />
                </TouchableOpacity>
              </>
            ) : (
              /* ── No cash/wallet refund needed — return only settles the due ── */
              <>
                <View style={{ backgroundColor: '#eff6ff', borderRadius: 16, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <MaterialIcons name="info-outline" size={22} color="#3b82f6" />
                  <Text style={{ flex: 1, fontSize: 12, color: '#1e40af', fontWeight: '600', lineHeight: 18 }}>
                    The returned amount exactly settles the outstanding invoice balance.{'\n'}No cash or wallet refund is needed.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleRefundChoice('WALLET')}
                  disabled={processingRefund}
                  style={{
                    backgroundColor: '#f0fdf4',
                    borderRadius: 20, padding: 18, marginBottom: 12,
                    borderWidth: 2, borderColor: '#86efac',
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                    opacity: processingRefund ? 0.5 : 1,
                  }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="check-circle" size={26} color="#16a34a" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#15803d' }}>Confirm & Settle Balance</Text>
                    <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 }}>Invoice balance will be cleared to zero</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color="#86efac" />
                </TouchableOpacity>
              </>
            )}

            {processingRefund && (
              <View style={{ alignItems: 'center', marginTop: 16 }}>
                <ActivityIndicator color="#6366f1" />
                <Text style={{ color: '#94a3b8', marginTop: 8, fontSize: 12, fontWeight: '600' }}>Processing...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
