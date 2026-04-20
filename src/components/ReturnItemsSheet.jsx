/**
 * ReturnItemsSheet.jsx
 *
 * Bottom-sheet modal for processing item-level product returns.
 * On confirm → creates credit note, persists returned_items, updates return_status.
 *
 * Props:
 *   visible      {boolean}
 *   invoice      {object}   full invoice object
 *   lineItems    {Array}    invoice line items from getInvoiceItems()
 *   payments     {Array}    all payments from store (for due calculation)
 *   profile      {object}   for currency_symbol
 *   onClose      {function}
 *   onConfirm    {function(result)} called after successful return
 */
import React, { useState, useMemo } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';

// ─── helpers ─────────────────────────────────────────────────────────────────
const round2 = v => Math.round(v * 100) / 100;

function fmt(amount, sym = '₹') {
  return `${sym}${(parseFloat(amount) || 0).toFixed(2)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ReturnItemsSheet({
  visible,
  invoice,
  lineItems = [],
  payments = [],
  profile = {},
  onClose,
  onConfirm,
}) {
  const sym = profile.currency_symbol || '₹';
  const addReturnWithItems = useStore(s => s.addReturnWithItems);
  const processReturnRefund = useStore(s => s.processReturnRefund);

  // Per-item return quantities (defaults to 0 so nothing is selected initially)
  const [returnQtys, setReturnQtys] = useState({});
  const [saving, setSaving] = useState(false);
  // Refund choice modal state (shown after return is saved)
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [savedReturnResult, setSavedReturnResult] = useState(null);
  const [processingRefund, setProcessingRefund] = useState(false);

  // Reset qty map each time sheet opens
  React.useEffect(() => {
    if (visible) {
      const initial = {};
      lineItems.forEach(item => { initial[item.id] = '0'; });
      setReturnQtys(initial);
    }
  }, [visible, lineItems]);

  // How much was already paid on this invoice (excluding credit notes)
  const amountPaidOnInvoice = useMemo(() => {
    if (!invoice) return 0;
    return round2(
      payments
        .filter(p =>
          String(p.invoiceId || p.invoice_id) === String(invoice.id) &&
          p.type !== 'credit_note'
        )
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    );
  }, [payments, invoice]);

  // Selected items (returnQty > 0)
  const selectedItems = useMemo(() => {
    return lineItems
      .map(item => ({
        ...item,
        returnQty: returnQtys[item.id] || '0',
        originalQty: parseFloat(item.quantity || item.qty || 1),
      }))
      .filter(item => parseFloat(item.returnQty) > 0);
  }, [lineItems, returnQtys]);

  // Live totals
  const totals = useMemo(() => {
    const itemsTotal = round2(
      selectedItems.reduce((sum, i) => sum + (parseFloat(i.returnQty) || 0) * (parseFloat(i.rate) || 0), 0)
    );

    const invoiceTotal = round2(parseFloat(invoice?.total || 0));
    const dueOnInvoice = round2(Math.max(0, invoiceTotal - amountPaidOnInvoice));

    const grossCredit = itemsTotal;
    const dueReduced = round2(Math.min(grossCredit, dueOnInvoice));
    const effectiveRefund = round2(Math.max(0, Math.min(grossCredit - dueReduced, amountPaidOnInvoice)));

    return { itemsTotal, grossCredit, dueReduced, effectiveRefund };
  }, [selectedItems, amountPaidOnInvoice, invoice]);

  // Qty stepper helpers
  const increment = (itemId, max) => {
    setReturnQtys(prev => {
      const cur = parseFloat(prev[itemId] || '0');
      return { ...prev, [itemId]: String(Math.min(max, cur + 1)) };
    });
  };
  const decrement = (itemId) => {
    setReturnQtys(prev => {
      const cur = parseFloat(prev[itemId] || '0');
      return { ...prev, [itemId]: String(Math.max(0, cur - 1)) };
    });
  };
  const setQty = (itemId, val, max) => {
    const n = parseFloat(val);
    if (isNaN(n)) { setReturnQtys(prev => ({ ...prev, [itemId]: val })); return; }
    setReturnQtys(prev => ({ ...prev, [itemId]: String(Math.min(max, Math.max(0, n))) }));
  };

  // ── Confirm ──────────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item to return.');
      return;
    }
    if (totals.grossCredit <= 0) {
      Alert.alert('Invalid Total', 'Return total must be greater than zero.');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      setSaving(true);
      const result = await addReturnWithItems({
        invoice,
        selectedItems,
        grossCredit: totals.grossCredit,
        effectiveRefund: totals.effectiveRefund,
        dueReduced: totals.dueReduced,
        reason: 'Product Return',
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Store the result and show the refund choice modal
      setSavedReturnResult(result);
      setShowRefundModal(true);
    } catch (err) {
      console.error('ReturnItemsSheet error:', err);
      Alert.alert('Error', 'Failed to process return. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRefundChoice = async (refundType) => {
    if (!savedReturnResult || processingRefund) return;
    try {
      setProcessingRefund(true);
      await processReturnRefund({
        refundType,
        amount: savedReturnResult.grossCredit,
        customerId: invoice.customerId || invoice.customer_id,
        customerName: invoice.customer_name || invoice.customerName,
        invoiceId: invoice.id,
        salesReturnId: savedReturnResult.salesReturnId,
        returnNumber: savedReturnResult.returnNumber,
      });
      setShowRefundModal(false);
      setSavedReturnResult(null);
      const msg = refundType === 'WALLET'
        ? `${fmt(savedReturnResult.grossCredit, sym)} added to customer wallet.`
        : `${fmt(savedReturnResult.grossCredit, sym)} cash refund recorded.`;
      Alert.alert('✅ Refund Processed', msg, [
        { text: 'OK', onPress: () => { onClose(); onConfirm?.(savedReturnResult); } }
      ]);
    } catch (err) {
      console.error('processReturnRefund error:', err);
      Alert.alert('Error', 'Failed to process refund. Please try again.');
    } finally {
      setProcessingRefund(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '90%' }}>

          {/* Handle */}
          <View style={{ width: 44, height: 5, backgroundColor: '#e2e8f0', borderRadius: 99, alignSelf: 'center', marginTop: 12, marginBottom: 4 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ backgroundColor: '#fef2f2', borderRadius: 12, padding: 8 }}>
                <MaterialIcons name="assignment-return" size={22} color="#ef4444" />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>Return Items</Text>
                <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>
                  {invoice?.invoice_number || invoice?.invoiceNumber}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Info banner */}
          <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fffbeb', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#fde68a', flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <MaterialIcons name="info-outline" size={16} color="#d97706" style={{ marginTop: 1 }} />
            <Text style={{ fontSize: 12, color: '#92400e', fontWeight: '600', flex: 1, lineHeight: 18 }}>
              Select quantities to return. You will choose Wallet or Cash Refund after confirming.
            </Text>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            {/* Items */}
            {lineItems.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <MaterialIcons name="inbox" size={40} color="#cbd5e1" />
                <Text style={{ color: '#94a3b8', marginTop: 8, fontWeight: '600' }}>No items found on this invoice</Text>
              </View>
            ) : (
              lineItems.map((item, idx) => {
                const maxQty = parseFloat(item.quantity || item.qty || 1);
                const qtyStr = returnQtys[item.id] || '0';
                const qtyNum = parseFloat(qtyStr) || 0;
                const lineTotal = round2(qtyNum * (parseFloat(item.rate) || 0));
                const isSelected = qtyNum > 0;

                return (
                  <View
                    key={item.id}
                    style={{
                      backgroundColor: isSelected ? '#f0fdf4' : '#f8fafc',
                      borderRadius: 16,
                      padding: 14,
                      marginBottom: 10,
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#86efac' : '#e2e8f0',
                    }}
                  >
                    {/* Item name + amount */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b' }}>{item.name}</Text>
                        <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          {fmt(item.rate, sym)} × {maxQty} = {fmt((parseFloat(item.rate) || 0) * maxQty, sym)}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={{ backgroundColor: '#dcfce7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 13, fontWeight: '900', color: '#16a34a' }}>+{fmt(lineTotal, sym)}</Text>
                        </View>
                      )}
                    </View>

                    {/* Qty stepper */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600' }}>Return Qty (max {maxQty})</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' }}>
                        <TouchableOpacity
                          onPress={() => decrement(item.id)}
                          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}
                        >
                          <MaterialIcons name="remove" size={18} color={qtyNum <= 0 ? '#cbd5e1' : '#262A56'} />
                        </TouchableOpacity>
                        <TextInput
                          value={qtyStr}
                          onChangeText={v => setQty(item.id, v, maxQty)}
                          keyboardType="numeric"
                          style={{ width: 44, height: 36, textAlign: 'center', fontWeight: '800', fontSize: 15, color: '#1e293b', padding: 0 }}
                        />
                        <TouchableOpacity
                          onPress={() => increment(item.id, maxQty)}
                          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}
                        >
                          <MaterialIcons name="add" size={18} color={qtyNum >= maxQty ? '#cbd5e1' : '#262A56'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Footer — Live total + Confirm */}
          <View style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', padding: 16, paddingBottom: 32, backgroundColor: 'white' }}>
            {/* Summary */}
            {selectedItems.length > 0 && (
              <View style={{ backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, marginBottom: 14, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '700' }}>Items Selected</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#1e293b' }}>{selectedItems.length}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '700' }}>Return Total</Text>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#1e293b' }}>{fmt(totals.grossCredit, sym)}</Text>
                </View>
                {totals.dueReduced > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#d97706', fontWeight: '700' }}>Applied to Due</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#d97706' }}>-{fmt(totals.dueReduced, sym)}</Text>
                  </View>
                )}
                <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 2 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#16a34a', fontWeight: '900' }}>💳 Wallet Credit</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#16a34a' }}>
                    +{fmt(totals.effectiveRefund > 0 ? totals.effectiveRefund : totals.dueReduced, sym)}
                  </Text>
                </View>
              </View>
            )}

            {/* Confirm button */}
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={saving || selectedItems.length === 0}
              style={{
                backgroundColor: selectedItems.length === 0 ? '#e2e8f0' : '#262A56',
                borderRadius: 16,
                height: 54,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              {saving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <MaterialIcons name="assignment-turned-in" size={20} color={selectedItems.length === 0 ? '#94a3b8' : 'white'} />
                  <Text style={{
                    color: selectedItems.length === 0 ? '#94a3b8' : 'white',
                    fontWeight: '900',
                    fontSize: 14,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}>
                    {selectedItems.length === 0
                      ? 'Select Items to Return'
                      : `Confirm Return — ${fmt(totals.grossCredit, sym)}`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Refund Choice Modal ─────────────────────────────────────────── */}
      <Modal visible={showRefundModal} transparent animationType="slide" onRequestClose={() => {}}
        // Not dismissable by back — owner must make a choice
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, paddingBottom: 40 }}>
            <View style={{ width: 44, height: 5, backgroundColor: '#e2e8f0', borderRadius: 99, alignSelf: 'center', marginBottom: 20 }} />

            {/* Icon + Title */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <MaterialIcons name="assignment-return" size={30} color="#16a34a" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b', textAlign: 'center' }}>Return Processed ✅</Text>
              <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 4, textAlign: 'center' }}>
                How should {fmt(savedReturnResult?.grossCredit || 0, sym)} be refunded?
              </Text>
            </View>

            {/* Choice: Wallet */}
            <TouchableOpacity
              onPress={() => handleRefundChoice('WALLET')}
              disabled={processingRefund}
              style={{
                backgroundColor: '#f0fdf4',
                borderRadius: 20,
                padding: 18,
                marginBottom: 12,
                borderWidth: 2,
                borderColor: '#86efac',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
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

            {/* Choice: Cash Refund */}
            <TouchableOpacity
              onPress={() => handleRefundChoice('CASH')}
              disabled={processingRefund}
              style={{
                backgroundColor: '#fff5f5',
                borderRadius: 20,
                padding: 18,
                borderWidth: 2,
                borderColor: '#fecaca',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                opacity: processingRefund ? 0.5 : 1,
              }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="money-off" size={24} color="#dc2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#dc2626' }}>Cash Refund Given</Text>
                <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 }}>Physical cash handed to customer now</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#fecaca" />
            </TouchableOpacity>

            {processingRefund && (
              <View style={{ alignItems: 'center', marginTop: 16 }}>
                <ActivityIndicator color="#6366f1" />
                <Text style={{ color: '#94a3b8', marginTop: 8, fontSize: 12, fontWeight: '600' }}>Processing...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </Modal>
  );
}
