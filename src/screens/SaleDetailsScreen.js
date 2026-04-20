import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, Alert, Modal, FlatList, StyleSheet, Switch, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { formatAmount } from '../utils/formatters';
import { calculateCustomerBalances } from '../utils/balanceCalculator';
import { calcInvoiceGst, isInterState } from '../utils/gstCalculator';
import { getWalletBalance, setWalletBalance } from '../database/services';

// ─── Colour tokens (match your primary #121642 / accent #ec5b13) ─────────────
const C = {
  primary:  '#262A56',
  accent:   '#f43f5e', // Rose for alerts
  emerald:  '#10b981',
  red:      '#ef4444',
  surface:  '#f8fafc',
  border:   '#f1f5f9',
  muted:    '#94a3b8',
  label:    '#64748b',
};

// ─── Payment method icon map ──────────────────────────────────────────────────
const PM_ICONS = {
  Cash: 'payments',
  UPI: 'qr-code',
  Card: 'credit-card',
  'Bank Transfer': 'account-balance',
  Cheque: 'receipt-long',
  Credit: 'account-balance-wallet',
};

export default function SaleDetailsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { invoiceData, isEditMode, documentType: paramDocType } = route.params || {};
  const documentType = paramDocType || invoiceData?.type || 'invoice';
  const isEstimate = documentType === 'estimate';

  const addInvoice    = useStore(s => s.addInvoice);
  const addEstimate   = useStore(s => s.addEstimate);
  const updateInvoice = useStore(s => s.updateInvoice);
  const addPayment    = useStore(s => s.addPayment);
  const profile       = useStore(s => s.profile);
  const allItems      = useStore(s => s.items);
  const invoices      = useStore(s => s.invoices);
  const payments      = useStore(s => s.payments);

  const sym = profile?.currency_symbol || '₹';

  // In edit mode, pre-fill receivedAmount with what was already paid for this invoice
  // so Balance Due = grandTotal - alreadyPaid (not grandTotal - grandTotal)
  const alreadyPaidForInvoice = useMemo(() => {
    if (!isEditMode || !invoiceData?.id) return 0;
    return payments
      .filter(p => (p.invoiceId === invoiceData.id || p.invoice_id === invoiceData.id) && p.type !== 'credit_note')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  }, [isEditMode, invoiceData?.id, payments]);

  // BUG-1 FIX: useState initializer runs only once before the useMemo resolves,
  // so alreadyPaidForInvoice is always 0 on the first render in edit mode.
  // Use a separate useEffect to sync the value once the memo is computed.
  const [receivedAmount, setReceivedAmount] = useState('0');
  React.useEffect(() => {
    if (isEditMode) {
      setReceivedAmount(String(alreadyPaidForInvoice));
    }
  }, [isEditMode, alreadyPaidForInvoice]);
  const [paymentMethod, setPaymentMethod]                 = useState(
    invoiceData?.paymentMode || invoiceData?.payment_mode || 'Cash'
  );
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [stateOfSupply, setStateOfSupply] = useState(invoiceData?.state_of_supply || '');
  const [notes, setNotes]                                 = useState(invoiceData?.notes || '');
  const [items, setItems]                                 = useState(invoiceData?.items || []);
  const [taxPercent]                                      = useState(invoiceData?.taxPercent || 0);
  const [discountPercent]                                 = useState(invoiceData?.discountPercent || 0);
  const [showItemPicker, setShowItemPicker]               = useState(false);

  const [taxMode]                                        = useState(invoiceData?.taxMode || invoiceData?.tax_mode || 'exclusive');

  // Smart amount formatter: omit decimals when they are .00
  // Smart number format: now using global utility
  const fmtAmt = (num) => formatAmount(num);

  // ── GST-aware totals ───────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const sellerState = profile?.state || '';
    const buyerState  = invoiceData?.customer_state || invoiceData?.customerState || '';
    const interState  = isInterState(sellerState, buyerState);

    const gst = calcInvoiceGst(
      items,
      parseFloat(discountPercent) || 0,
      taxMode,
      interState,
      parseFloat(taxPercent) || 0
    );

    return {
      subtotal:        gst.subtotal,
      discountAmount:  gst.globalDiscountAmount,
      taxableAmount:   gst.taxableAmount,
      taxAmount:       gst.totalTax,
      totalCgst:       gst.totalCgst,
      totalSgst:       gst.totalSgst,
      totalIgst:       gst.totalIgst,
      grandTotal:      gst.grandTotal,
      isInterState:    gst.isInterState,
      itemGstDetails:  gst.itemGstDetails,
    };
  }, [items, discountPercent, taxPercent, taxMode, invoiceData, profile]);

  // Use calculateCustomerBalances (same as CustomerProfile) so returnCreditBalance is included
  const { creditBalance: availableCredit, advanceBalance, refundBalance } = useMemo(() => {
    const cid = invoiceData?.customerId || invoiceData?.customer_id;
    if (!cid) return { creditBalance: 0, advanceBalance: 0, refundBalance: 0 };
    return calculateCustomerBalances(cid, invoices, payments);
  }, [invoiceData, invoices, payments]);

  const [useAdvance, setUseAdvance] = useState(parseFloat(invoiceData?.appliedCredit) > 0);
  const advanceApplied = useAdvance 
    ? (parseFloat(invoiceData?.appliedCredit) > 0 
        ? parseFloat(invoiceData?.appliedCredit) 
        : Math.min(availableCredit, totals.grandTotal)) 
    : 0;

  const balanceDue = useMemo(() => {
    const raw = totals.grandTotal - advanceApplied - (parseFloat(receivedAmount) || 0);
    return Math.max(0, Math.round(raw * 100) / 100);
  }, [totals.grandTotal, advanceApplied, receivedAmount]);

  const isCredit = paymentMethod === 'Credit';

  React.useEffect(() => {
    if (!isEditMode) {
      if (!isCredit) {
        const raw = Math.max(0, Math.round((totals.grandTotal - advanceApplied) * 100) / 100);
        setReceivedAmount(raw === 0 ? '0' : String(raw));
      } else {
        setReceivedAmount('0');
      }
    }
  }, [isCredit, totals.grandTotal, advanceApplied, isEditMode]);

  const paymentMethods = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Credit'];

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleFinalSave = async (shouldReset = false) => {
    try {
      const finalInvoiceId = isEditMode ? (invoiceData.id || `inv_${Date.now()}`) : undefined;
      const finalStatus = isCredit
        ? 'Unpaid'
        : (balanceDue <= 0 ? 'Paid' : (parseFloat(receivedAmount) > 0 ? 'Partial' : 'Sent'));

      const updatedInvoiceData = {
        ...invoiceData,
        id:     finalInvoiceId,
        status: isEstimate ? 'Estimate' : finalStatus,
        paymentMode: isEstimate ? '' : paymentMethod,
        notes: notes || invoiceData.notes,
        state_of_supply: stateOfSupply,
        items,
        subtotal:        totals.subtotal,
        taxAmount:       totals.taxAmount,
        discountAmount:  totals.discountAmount,
        total:           totals.grandTotal,
        type:            documentType,
        taxMode,
        cgstAmount:      totals.totalCgst,
        sgstAmount:      totals.totalSgst,
        igstAmount:      totals.totalIgst,
        isInterState:    totals.isInterState,
      };

      let saved;
      if (isEditMode) {
        await updateInvoice(updatedInvoiceData);
        if (!isCredit && !isEstimate) {
          const newReceived = parseFloat(receivedAmount) || 0;
          const oldReceived = alreadyPaidForInvoice || 0;
          const delta = newReceived - oldReceived;
          if (Math.abs(delta) > 0.01) {
            if (delta > 0) {
              await addPayment({
                invoiceId:    finalInvoiceId,
                customerId:   invoiceData.customerId,
                customerName: invoiceData.customerName,
                amount:       delta,
                method:       paymentMethod,
                type:         'payment',
                date:         new Date().toISOString().split('T')[0],
                notes:        `Additional payment recorded during invoice edit`,
              });
            } else {
              await addPayment({
                invoiceId:    finalInvoiceId,
                customerId:   invoiceData.customerId,
                customerName: invoiceData.customerName,
                amount:       delta,
                method:       'Adjustment',
                type:         'payment',
                date:         new Date().toISOString().split('T')[0],
                notes:        `Payment reduced during invoice edit (refund/correction)`,
              });
            }
          }
        }
      } else if (isEstimate) {
        saved = await addEstimate(updatedInvoiceData);
      } else {
        saved = await addInvoice(updatedInvoiceData);
      }

      if (!isEditMode && !isCredit && !isEstimate && parseFloat(receivedAmount) > 0) {
        await addPayment({
          invoiceId:    saved?.id || finalInvoiceId,
          customerId:   invoiceData.customerId,
          customerName: invoiceData.customerName,
          amount:       parseFloat(receivedAmount),
          method:       paymentMethod,
          type:         'payment',
          date:         new Date().toISOString().split('T')[0],
          notes:        notes || 'Payment recorded during sale finalize',
        });
      }

      if (advanceApplied > 0 && !isEstimate) {
        const today = new Date().toISOString().split('T')[0];
        const resolvedId = saved?.id || finalInvoiceId;
        const cid = invoiceData.customerId;
        await addPayment({
          invoiceId:    resolvedId,
          customerId:   cid,
          customerName: invoiceData.customerName,
          amount:       advanceApplied,
          method:       'Advance Adjusted',
          type:         'payment',
          date:         today,
          notes:        'Credit balance automatically adjusted to invoice',
        });
        await addPayment({
          invoiceId:    null,
          customerId:   cid,
          customerName: invoiceData.customerName,
          amount:       -advanceApplied,
          method:       'Advance Reversal',
          type:         'credit_note',
          date:         today,
          notes:        `Advance consumed for Invoice ${invoiceData.invoiceNumber || invoiceData.invoice_number}`,
        });
        try {
          const currentWallet = await getWalletBalance(cid);
          if (currentWallet > 0) {
            const newWallet = Math.max(0, Math.round((currentWallet - advanceApplied) * 100) / 100);
            await setWalletBalance(cid, newWallet);
          }
        } catch (walletErr) {
          console.warn('Wallet balance update skipped:', walletErr);
        }
      }

      Alert.alert(
        'Success',
        isEstimate ? 'Estimate saved successfully.' : (isCredit ? 'Credit invoice saved.' : 'Invoice saved successfully'),
      );
      if (shouldReset) {
        navigation.popToTop();
      } else {
        navigation.navigate('Main', { screen: 'Invoices' });
      }
    } catch (e) {
      console.error('Final save error:', e);
      Alert.alert('Error', 'Failed to save invoice. Please try again.');
    }
  };

  // ── Save as Draft — saves invoice without recording payment or deducting stock
  //    Useful for preparing a bill in advance that isn’t confirmed yet.
  const handleSaveDraft = async () => {
    try {
      if (!items.length || items.every(it => !it.name?.trim())) {
        Alert.alert('No Items', 'Add at least one item before saving as draft.');
        return;
      }
      const draftData = {
        ...invoiceData,
        id:          isEditMode ? invoiceData.id : undefined,
        status:      'Draft',
        paymentMode: '',
        notes:       notes || invoiceData.notes,
        items,
        subtotal:        totals.subtotal,
        taxAmount:       totals.taxAmount,
        discountAmount:  totals.discountAmount,
        total:           totals.grandTotal,
        type:            documentType,
        taxMode,
        cgstAmount:      totals.totalCgst,
        sgstAmount:      totals.totalSgst,
        igstAmount:      totals.totalIgst,
        isInterState:    totals.isInterState,
      };
      if (isEditMode) {
        await updateInvoice(draftData);
      } else {
        await addInvoice(draftData);
      }
      Alert.alert('Saved as Draft', 'Invoice saved as draft. You can confirm it later from Invoice Details.');
      navigation.navigate('Main', { screen: 'Invoices' });
    } catch (e) {
      console.error('Draft save error:', e);
      Alert.alert('Error', 'Failed to save draft.');
    }
  };

  const handleUpdateItem = (index, field, value) => {
    setItems(prev => {
      const ns   = [...prev];
      const item = { ...ns[index] };
      item[field] = value;

      if (field === 'rate_type' && item.item_id) {
        const priceMap = {
          Retail:    parseFloat(item.retailPrice)    || 0,
          Wholesale: parseFloat(item.wholesalePrice) || 0,
          'ON MRP':  parseFloat(item.mrp)            || 0,
        };
        item.rate = (priceMap[value] || 0).toString();
      }
      const q = parseFloat(item.quantity) || 0;
      const r = parseFloat(item.rate)     || 0;
      const d = parseFloat(item.mrp_discount) || 0;
      const sub = q * r;
      item.total = sub - (sub * (d / 100));
      ns[index] = item;
      return ns;
    });
  };

  const handleRemoveItem = index => setItems(items.filter((_, i) => i !== index));

  const handleAddItem = inventoryItem => {
    const newItem = {
      item_id:       inventoryItem.id,
      name:          inventoryItem.name,
      description:   inventoryItem.description || inventoryItem.category || '',
      quantity:      1,
      rate:          (inventoryItem.mrp || inventoryItem.retail_price || inventoryItem.price || 0).toString(),
      total:         parseFloat(inventoryItem.mrp || inventoryItem.retail_price || inventoryItem.price || 0),
      rate_type:     inventoryItem.mrp ? 'ON MRP' : 'Retail',
      mrp_discount:  0,
      hsn_code:      inventoryItem.hsn_code || inventoryItem.hsnCode || '',
      retailPrice:   inventoryItem.retail_price || inventoryItem.retailPrice || inventoryItem.price || 0,
      wholesalePrice:inventoryItem.wholesale_price || inventoryItem.wholesalePrice || 0,
      mrp:           inventoryItem.mrp || 0,
    };
    setItems(prev => [newItem, ...prev]);
    setShowItemPicker(false);
  };

  const handleAddManualItem = () => {
    setItems(prev => [...prev, {
      item_id: '', name: '', description: '',
      quantity: 1, rate: 0, total: 0,
      rate_type: 'Retail', retailPrice: 0, wholesalePrice: 0,
      mrp: 0, mrp_discount: 0, hsn_code: '',
    }]);
  };

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!invoiceData) {
    return (
      <SafeAreaView style={S.center}>
        <MaterialIcons name="error-outline" size={52} color={C.muted} />
        <Text style={S.errorText}>No invoice data provided.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.errorBtn}>
          <Text style={S.errorBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────
  const Label = ({ children }) => <Text style={S.label}>{children}</Text>;

  const SectionHeader = ({ icon, title, right }) => (
    <View style={S.sectionHeader}>
      <View style={S.sectionHeaderLeft}>
        <View style={S.sectionIconBox}>
          <MaterialIcons name={icon} size={15} color={C.primary} />
        </View>
        <Text style={S.sectionTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={S.root}>

      {/* ── Premium Header ── */}
      <View style={{ 
        backgroundColor: '#262A56', 
        paddingHorizontal: 20, 
        paddingTop: Platform.OS === 'ios' ? 10 : 40, 
        paddingBottom: 14,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#262A56', shadowOpacity: 0.3, shadowRadius: 12, elevation: 10
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-2xl bg-white/10">
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>{isEstimate ? 'Estimate Details' : 'Sale Details'}</Text>
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#ffffff80', textTransform: 'uppercase', letterSpacing: 1 }}>{isEditMode ? 'Edit Mode' : 'New Entry'}</Text>
          </View>
          <View className="px-3 py-1 bg-white/10 rounded-xl border border-white/5">
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>{invoiceData?.invoice_number || invoiceData?.invoiceNumber || '—'}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#fdfdff' }}
        contentContainerStyle={[S.scrollContent, { paddingBottom: 150 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── CUSTOMER CARD ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, borderWidth: 1, borderColor: '#f1f5f9' }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: '#262A56', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: '#fff' }}>
              {(invoiceData?.customerName || 'C').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#262A56' }}>{invoiceData?.customerName || 'Customer'}</Text>
            {invoiceData?.customerPhone ? (
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 1 }}>{invoiceData.customerPhone}</Text>
            ) : null}
          </View>
          <View style={{ backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#262A56', textTransform: 'uppercase' }}>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#94a3b8' }}>{new Date().getFullYear()}</Text>
          </View>
        </View>

        {/* ── BILLED ITEMS ─────────────────────────────────────── */}
        <View style={S.section}>
          <SectionHeader
            icon="shopping-cart"
            title="Billed Items"
            right={
              <View style={S.itemCountBadge}>
                <Text style={S.itemCountText}>{items.length}</Text>
              </View>
            }
          />

          {items.map((item, index) => (
            <View key={index} style={S.itemCard}>

              {/* ── Row 1: Number + Name + Delete ── */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={S.itemNumBadge}>
                  <Text style={S.itemNumText}>{index + 1}</Text>
                </View>
                <TextInput
                  style={[S.input, { flex: 1, marginBottom: 0, paddingVertical: 8, fontSize: 13 }]}
                  value={item.name || ''}
                  placeholder="Item name…"
                  placeholderTextColor={C.muted}
                  onChangeText={val => handleUpdateItem(index, 'name', val)}
                />
                <TouchableOpacity onPress={() => handleRemoveItem(index)} style={S.deleteBtn}>
                  <MaterialIcons name="delete-outline" size={18} color={C.red} />
                </TouchableOpacity>
              </View>

              {/* ── Row 2: Price Tier pills ── */}
              <View style={[S.tierRow, !item.item_id && { opacity: 0.35 }, { marginBottom: 8 }]}>
                {['Retail', 'Wholesale', 'ON MRP'].map(type => {
                  const sel = item.rate_type === type;
                  const price = {
                    Retail:    parseFloat(item.retailPrice)    || 0,
                    Wholesale: parseFloat(item.wholesalePrice) || 0,
                    'ON MRP':  parseFloat(item.mrp)            || 0,
                  }[type];
                  return (
                    <TouchableOpacity
                      key={type}
                      disabled={!item.item_id}
                      onPress={() => handleUpdateItem(index, 'rate_type', type)}
                      style={[S.tierBtn, sel && S.tierBtnActive]}
                    >
                      <Text style={[S.tierLabel, sel && S.tierLabelActive]}>{type}</Text>
                      <Text style={[S.tierPrice, sel && S.tierPriceActive]}>
                        {price > 0 ? `${sym}${price.toFixed(0)}` : '—'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Row 3: Qty × Rate = Total | Discount ── */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {/* Qty */}
                <View style={{ alignItems: 'center', width: 52 }}>
                  <Text style={S.miniLabel}>QTY</Text>
                  <TextInput
                    style={[S.input, { textAlign: 'center', paddingVertical: 7, paddingHorizontal: 6, fontSize: 14, fontWeight: '900', width: 52 }]}
                    value={(item.quantity ?? 1).toString()}
                    onChangeText={val => handleUpdateItem(index, 'quantity', val)}
                    keyboardType="numeric"
                  />
                </View>
                <Text style={{ fontSize: 16, color: C.muted, fontWeight: '900', marginTop: 14 }}>×</Text>
                {/* Rate */}
                <View style={{ flex: 1 }}>
                  <Text style={S.miniLabel}>RATE</Text>
                  <TextInput
                    style={[S.input, { paddingVertical: 7, fontSize: 14, fontWeight: '900' }]}
                    value={(item.rate ?? 0).toString()}
                    onChangeText={val => handleUpdateItem(index, 'rate', val)}
                    keyboardType="numeric"
                  />
                </View>
                {/* Discount */}
                <View style={{ width: 58 }}>
                  <Text style={S.miniLabel}>DISC%</Text>
                  <TextInput
                    style={[S.input, { textAlign: 'center', paddingVertical: 7, paddingHorizontal: 6, fontSize: 14, fontWeight: '800', width: 58 }]}
                    value={(item.mrp_discount ?? 0).toString()}
                    onChangeText={val => handleUpdateItem(index, 'mrp_discount', val)}
                    keyboardType="numeric"
                  />
                </View>
                {/* Total */}
                <View style={{ alignItems: 'flex-end', minWidth: 70 }}>
                  <Text style={S.miniLabel}>TOTAL</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: C.primary }}>
                    {sym}{(parseFloat(item.total) || 0).toFixed(0)}
                  </Text>
                </View>
              </View>

            </View>
          ))}

          {/* Add Item buttons */}
          <View style={S.addItemRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Scanner', {
                onItemScanned: itm => { if (itm) handleAddItem(itm); },
              })}
              style={S.iconBtn}
            >
              <MaterialIcons name="qr-code-scanner" size={22} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowItemPicker(true)} style={S.iconBtn}>
              <MaterialIcons name="inventory-2" size={22} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddManualItem} style={S.addManualBtn}>
              <MaterialIcons name="add-circle-outline" size={20} color={C.primary} />
              <Text style={S.addManualText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── GRAND TOTAL BANNER ──────────────────────────────── */}
        <View style={{ 
          backgroundColor: '#262A56', 
          borderRadius: 32, 
          padding: 24, 
          marginVertical: 10,
          shadowColor: '#262A56', shadowOpacity: 0.3, shadowRadius: 20, elevation: 15
        }}>
          {totals.discountAmount > 0 || totals.taxAmount > 0 ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#ffffff80', textTransform: 'uppercase' }}>Subtotal</Text>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#fff' }}>{sym} {fmtAmt(totals.subtotal)}</Text>
            </View>
          ) : null}
          {totals.taxAmount > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#ffffff80', textTransform: 'uppercase' }}>Tax ({taxPercent}%)</Text>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#fff' }}>+ {sym} {fmtAmt(totals.taxAmount)}</Text>
            </View>
          )}
          {totals.discountAmount > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#fb7185', textTransform: 'uppercase' }}>Discount</Text>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#fb7185' }}>− {sym} {fmtAmt(totals.discountAmount)}</Text>
            </View>
          )}

          <View style={{ height: 1.5, backgroundColor: '#ffffff15', marginVertical: 16 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 1.5 }}>Total Bill</Text>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff' }}>{sym} {fmtAmt(totals.grandTotal)}</Text>
          </View>
        </View>

        {availableCredit > 0 && !isEditMode && !isEstimate && (
          <View style={[S.section]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <MaterialIcons name="account-balance-wallet" size={18} color={C.emerald} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: C.emerald, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {refundBalance > 0 ? '💰 Refund Credit' : 'Credit Balance'}
                  </Text>
                </View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: C.emerald }}>
                  {sym} {fmtAmt(availableCredit)}
                </Text>
                {refundBalance > 0 && (
                  <Text style={{ fontSize: 11, color: C.label, marginTop: 2 }}>
                    Refund: {sym}{fmtAmt(refundBalance)}
                    {advanceBalance > 0 ? `   Advance: ${sym}${fmtAmt(advanceBalance)}` : ''}
                  </Text>
                )}
                <Text style={{ fontSize: 12, color: C.label, marginTop: 4 }}>
                  {useAdvance
                    ? `✅ Applying ${sym}${fmtAmt(Math.min(availableCredit, totals.grandTotal))} — reduces balance due`
                    : 'Toggle ON to apply this credit to the invoice'}
                </Text>
              </View>
              <Switch
                value={useAdvance}
                onValueChange={setUseAdvance}
                trackColor={{ false: C.border, true: C.emerald }}
                thumbColor={C.surface}
              />
            </View>

            {/* When applied, show the deduction breakdown */}
            {useAdvance && advanceApplied > 0 && (
              <View style={{
                marginTop: 12, backgroundColor: '#f0fdf4',
                borderRadius: 12, padding: 12,
                borderWidth: 1, borderColor: '#bbf7d0'
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: C.label, fontWeight: '700' }}>Grand Total</Text>
                  <Text style={{ fontSize: 12, color: C.primary, fontWeight: '700' }}>{sym} {fmtAmt(totals.grandTotal)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: C.emerald, fontWeight: '700' }}>Credit Applied</Text>
                  <Text style={{ fontSize: 12, color: C.emerald, fontWeight: '700' }}>− {sym} {fmtAmt(advanceApplied)}</Text>
                </View>
                <View style={{ height: 1, backgroundColor: '#bbf7d0', marginVertical: 6 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, color: C.primary, fontWeight: '900' }}>Net Payable</Text>
                  <Text style={{ fontSize: 14, color: C.primary, fontWeight: '900' }}>
                    {sym} {fmtAmt(Math.max(0, totals.grandTotal - advanceApplied))}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── PAYMENT SECTION ─────────────────────────────────── */}
        {!isEstimate && (
        <View style={S.section}>
          <SectionHeader icon="payments" title="Payment" />

          {/* Payment Method selector */}
          <Label>Payment Method</Label>
          <TouchableOpacity onPress={() => setShowPaymentMethodModal(true)} style={S.selectorRow}>
            <View style={S.selectorIcon}>
              <MaterialIcons name={PM_ICONS[paymentMethod] || 'payments'} size={20} color={C.primary} />
            </View>
            <Text style={S.selectorText}>{paymentMethod}</Text>
            <MaterialIcons name="keyboard-arrow-down" size={22} color={C.muted} />
          </TouchableOpacity>

          {/* Credit badge notice */}
          {isCredit && (
            <View style={S.creditNotice}>
              <MaterialIcons name="info-outline" size={16} color={C.accent} />
              <Text style={S.creditNoticeText}>
                This will be saved as an unpaid credit invoice. Full balance added to customer account.
              </Text>
            </View>
          )}

          {/* Received / Balance — only for non-credit */}
          {!isCredit && (
            <View style={S.receivedCard}>
              {/* Received row */}
              <View style={S.receivedRow}>
                <View>
                  <Text style={S.receivedLabel}>Amount Received</Text>
                  <Text style={S.receivedHint}>Edit if partial payment</Text>
                </View>
                <View style={S.receivedInputWrap}>
                  <Text style={S.receivedSym}>{sym}</Text>
                  <TextInput
                    style={S.receivedInput}
                    value={fmtAmt(parseFloat(receivedAmount) || 0)}
                    onChangeText={(val) => {
                      // Strip commas before storing so parseFloat works correctly
                      const raw = val.replace(/,/g, '');
                      setReceivedAmount(raw);
                    }}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={C.muted}
                  />
                </View>
              </View>

              <View style={S.receivedDivider} />

              {/* Balance row */}
              <View style={S.receivedRow}>
                <Text style={S.balanceLabel}>Balance Due</Text>
                <Text style={[S.balanceAmount, balanceDue > 0 ? S.balanceRed : S.balanceGreen]}>
                  {sym} {fmtAmt(balanceDue)}
                </Text>
              </View>
            </View>
          )}
        </View>
        )}

        {/* ── NOTES ──────────────────────────────────────────── */}
        <View style={S.section}>
          <SectionHeader icon="notes" title="Notes" />
          <TextInput
            style={[S.input, S.inputMultiline]}
            placeholder="Add a note for this invoice…"
            placeholderTextColor={C.muted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* bottom spacer for fixed footer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FIXED FOOTER ───────────────────────────────────────── */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 8, 
        paddingHorizontal: 16,
        paddingTop: 12,
        backgroundColor: '#fff', 
        borderTopWidth: 1.5, 
        borderTopColor: '#f8fafc', 
        paddingBottom: Math.max(insets.bottom, 16),
      }}>
        {/* Save & New — icon only to save space */}
        <TouchableOpacity 
          onPress={() => handleFinalSave(true)} 
          style={{ width: 46, height: 46, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialIcons name="add-circle-outline" size={22} color="#64748b" />
        </TouchableOpacity>

        {/* Save Draft — only for non-estimate flows */}
        {!isEstimate && (
          <TouchableOpacity 
            onPress={handleSaveDraft}
            style={{
              flex: 1, height: 46, borderRadius: 14,
              borderWidth: 1.5, borderColor: '#262A56',
              backgroundColor: '#fff',
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 6,
            }}
          >
            <MaterialIcons name="draft" size={17} color="#262A56" />
            <Text style={{ color: '#262A56', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>Save Draft</Text>
          </TouchableOpacity>
        )}

        {/* Confirm Sale / Save Estimate / Save Credit */}
        <TouchableOpacity 
          onPress={() => handleFinalSave(false)} 
          style={{
            flex: isEstimate ? 2 : 1.4, height: 46, borderRadius: 14,
            backgroundColor: '#262A56',
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 6,
            shadowColor: '#262A56', shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
          }}
          testID="btn-confirm-sale"
        >
          <MaterialIcons name="check-circle-outline" size={19} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {isEstimate ? 'Save Estimate' : (isCredit ? 'Save Credit' : 'Confirm Sale')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── PAYMENT METHOD MODAL ────────────────────────────────── */}
      <Modal visible={showPaymentMethodModal} animationType="slide" transparent>
        <View style={S.modalOverlay}>
          <View style={S.modalSheet}>
            <View style={S.modalHandle} />
            <Text style={S.modalTitle}>Payment Method</Text>
            <FlatList
              data={paymentMethods}
              keyExtractor={i => i}
              renderItem={({ item }) => {
                const active = paymentMethod === item;
                return (
                  <TouchableOpacity
                    onPress={() => { setPaymentMethod(item); setShowPaymentMethodModal(false); }}
                    style={[S.modalItem, active && S.modalItemActive]}
                  >
                    <View style={[S.modalItemIcon, active && S.modalItemIconActive]}>
                      <MaterialIcons name={PM_ICONS[item] || 'payments'} size={20} color={active ? '#fff' : C.primary} />
                    </View>
                    <Text style={[S.modalItemText, active && S.modalItemTextActive]}>{item}</Text>
                    {active && <MaterialIcons name="check-circle" size={22} color={C.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity onPress={() => setShowPaymentMethodModal(false)} style={S.modalCancel}>
              <Text style={S.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      {/* ── ITEM PICKER MODAL ───────────────────────────────────── */}
      <Modal visible={showItemPicker} animationType="slide" transparent>
        <View style={S.modalOverlay}>
          <View style={[S.modalSheet, { height: '80%' }]}>
            <View style={S.modalHandle} />
            <View style={S.modalPickerHeader}>
              <Text style={S.modalTitle}>Select Item</Text>
              <TouchableOpacity onPress={() => setShowItemPicker(false)} style={S.modalClose}>
                <MaterialIcons name="close" size={22} color={C.label} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={allItems}
              keyExtractor={i => i.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleAddItem(item)} style={S.pickerItem}>
                  <View style={S.pickerIconBox}>
                    <MaterialIcons name="inventory-2" size={22} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.pickerItemName}>{item.name || 'Unnamed'}</Text>
                    <Text style={S.pickerItemSku}>SKU: {item.sku || 'N/A'}  ·  Stock: {item.stock ?? item.quantity ?? '—'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={S.pickerItemPrice}>
                      {formatAmount(item.retail_price || item.price || 0, sym)}
                    </Text>
                    <Text style={S.pickerItemUnit}>{item.unit || 'pcs'}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={S.emptyPicker}>
                  <MaterialIcons name="inventory" size={60} color="#e2e8f0" />
                  <Text style={S.emptyPickerText}>No inventory items found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── StyleSheet ───────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },

  // Error state
  errorText:    { color: C.muted, fontSize: 15, fontWeight: '700', marginTop: 12 },
  errorBtn:     { marginTop: 16, backgroundColor: C.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  errorBtnText: { color: '#fff', fontWeight: '800' },

  // ── HEADER
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
    gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: 18, fontWeight: '900', color: C.primary, letterSpacing: -0.5 },
  headerSub:    { fontSize: 11, color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  invBadge: {
    backgroundColor: C.primary + '12', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: C.primary + '20',
  },
  invBadgeText: { fontSize: 11, fontWeight: '900', color: C.primary },

  // ── SCROLL
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // ── CUSTOMER CARD
  customerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 20,
    padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: C.border,
    gap: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  customerAvatar: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  customerAvatarText: { fontSize: 22, fontWeight: '900', color: '#fff' },
  customerName:       { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  customerPhone:      { fontSize: 13, color: C.muted, fontWeight: '600', marginTop: 2 },
  dateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.surface, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5,
  },
  dateText: { fontSize: 11, color: C.muted, fontWeight: '700' },

  // ── SECTION
  section: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  sectionHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIconBox: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.primary + '12',
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5 },
  itemCountBadge: {
    backgroundColor: C.primary, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  itemCountText: { fontSize: 12, fontWeight: '900', color: '#fff' },

  // ── LABEL
  label: {
    fontSize: 10, fontWeight: '800', color: C.muted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 6, marginTop: 14, marginLeft: 2,
  },

  // ── INPUT
  input: {
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, fontWeight: '700', color: '#0f172a',
  },
  inputMultiline: { minHeight: 60, textAlignVertical: 'top' },
  inputCenter: { textAlign: 'center' },
  inputLarge:  { fontSize: 17, fontWeight: '800' },

  // ── ITEM CARD
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    padding: 10,
    marginBottom: 8,
  },
  itemTopBar: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 4, gap: 8,
  },
  itemNumBadge: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  itemNumText:  { fontSize: 11, fontWeight: '900', color: '#fff' },
  itemTopLabel: { flex: 1, fontSize: 13, fontWeight: '800', color: C.label },
  deleteBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#fef2f2',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#fecaca',
  },

  // ── TIER PILLS
  tierRow: { flexDirection: 'row', gap: 6 },
  tierBtn: {
    flex: 1, paddingVertical: 6, borderRadius: 9,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  tierBtnActive: {
    backgroundColor: C.primary + '10',
    borderColor: C.primary,
  },
  tierLabel:       { fontSize: 9, fontWeight: '800', color: C.muted, textTransform: 'uppercase' },
  tierLabelActive: { color: C.primary },
  tierPrice:       { fontSize: 11, fontWeight: '800', color: '#cbd5e1', marginTop: 1 },
  tierPriceActive: { color: C.accent },

  // ── MINI LABEL (compact row labels)
  miniLabel: { fontSize: 9, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },

  // ── QTY / RATE
  qtyRateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  qtyBox:     { flex: 1 },
  rateBox:    { flex: 2 },
  multiplyIcon: { paddingBottom: 13, alignItems: 'center', width: 24 },
  multiplyText: { fontSize: 20, fontWeight: '900', color: C.muted },

  // ── ITEM FOOTER
  itemFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 14,
    backgroundColor: C.primary + '08',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.primary + '15',
  },
  itemFooterLabel: { fontSize: 10, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  discountInput: {
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 10, paddingVertical: 8,
    width: 70, textAlign: 'center',
    fontSize: 15, fontWeight: '800', color: '#0f172a',
  },
  itemTotal: { fontSize: 24, fontWeight: '900', color: C.primary },

  // ── ADD ITEM ROW
  addItemRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  iconBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  addManualBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 14,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.primary + '50',
    backgroundColor: C.primary + '06',
  },
  addManualText: { fontSize: 14, fontWeight: '800', color: C.primary },

  // ── GRAND TOTAL BANNER
  totalBanner: {
    backgroundColor: C.primary, borderRadius: 24,
    padding: 22, marginBottom: 16,
    shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  totalBreakRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalBreakLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.55)' },
  totalBreakValue: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.55)' },
  totalDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 12 },
  totalLabel:  { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  totalAmount: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: -1 },

  // ── SELECTOR ROW
  selectorRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, backgroundColor: C.surface,
    borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 13,
    marginBottom: 4,
  },
  selectorIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.primary + '12',
    alignItems: 'center', justifyContent: 'center',
  },
  selectorText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0f172a' },

  // ── CREDIT NOTICE
  creditNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: C.accent + '10', borderRadius: 12,
    borderWidth: 1, borderColor: C.accent + '30',
    padding: 12, marginTop: 10,
  },
  creditNoticeText: { flex: 1, fontSize: 12, color: C.accent, fontWeight: '700', lineHeight: 18 },

  // ── RECEIVED CARD
  receivedCard: {
    backgroundColor: C.surface, borderRadius: 16,
    borderWidth: 1.5, borderColor: C.border,
    marginTop: 14, overflow: 'hidden',
  },
  receivedRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  receivedLabel:{ fontSize: 15, fontWeight: '700', color: '#1e293b' },
  receivedHint: { fontSize: 11, color: C.muted, fontWeight: '600', marginTop: 2 },
  receivedInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  receivedSym:  { fontSize: 20, fontWeight: '900', color: C.muted },
  receivedInput:{ fontSize: 26, fontWeight: '900', color: '#0f172a', minWidth: 100, textAlign: 'right' },
  receivedDivider: { height: 1, backgroundColor: C.border },
  balanceLabel: { fontSize: 15, fontWeight: '700', color: C.label },
  balanceAmount:{ fontSize: 26, fontWeight: '900' },
  balanceRed:   { color: C.red },
  balanceGreen: { color: C.emerald },

  // ── FOOTER
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 12,
  },
  btnSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 15, borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 1.5, borderColor: C.border,
  },
  btnSecondaryText: { fontSize: 13, fontWeight: '800', color: C.label, textTransform: 'uppercase', letterSpacing: 0.5 },
  btnPrimary: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 16,
    backgroundColor: C.primary,
    shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  btnPrimaryText: { fontSize: 15, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },

  // ── MODALS
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 20, maxHeight: '60%',
  },
  modalHandle: {
    width: 44, height: 5, borderRadius: 3,
    backgroundColor: C.border, alignSelf: 'center', marginBottom: 18,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: C.primary, marginBottom: 12, letterSpacing: -0.3 },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f8fafc',
    borderRadius: 12, paddingHorizontal: 4,
  },
  modalItemActive: { backgroundColor: C.primary + '08' },
  modalItemIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.primary + '12',
    alignItems: 'center', justifyContent: 'center',
  },
  modalItemIconActive: { backgroundColor: C.primary },
  modalItemText:       { flex: 1, fontSize: 16, fontWeight: '700', color: '#334155' },
  modalItemTextActive: { color: C.primary, fontWeight: '900' },
  modalCancel: {
    marginTop: 12, backgroundColor: C.surface,
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  modalCancelText: { fontWeight: '800', color: C.label, fontSize: 14 },
  modalPickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  modalClose: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
  },

  // ── ITEM PICKER
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface, borderRadius: 16,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
  },
  pickerIconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: C.primary + '10',
    alignItems: 'center', justifyContent: 'center',
  },
  pickerItemName:  { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  pickerItemSku:   { fontSize: 11, color: C.muted, fontWeight: '600', marginTop: 2 },
  pickerItemPrice: { fontSize: 16, fontWeight: '900', color: C.primary },
  pickerItemUnit:  { fontSize: 10, fontWeight: '700', color: C.muted, textTransform: 'uppercase', marginTop: 2 },

  // ── EMPTY
  emptyPicker: { alignItems: 'center', paddingVertical: 60 },
  emptyPickerText: { color: C.muted, fontWeight: '700', marginTop: 12, fontSize: 14 },
});
