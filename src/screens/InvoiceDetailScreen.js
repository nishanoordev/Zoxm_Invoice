import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Platform, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as DbServices from '../database/services';
import { useStore } from '../store/useStore';
import { shareInvoiceAsPdf, printInvoice, previewInvoiceAsPdf } from '../utils/invoicePdf';
import { calculateCustomerBalances } from '../utils/balanceCalculator';
import { checkPermission } from '../utils/permissions';
import ReturnItemsSheet from '../components/ReturnItemsSheet';

const STATUS_OPTIONS = ['Draft', 'Sent', 'Pending', 'Partial', 'Paid', 'Overdue'];

const STATUS_COLORS = {
  Sent:      { bg: '#dbeafe', text: '#1d4ed8' },
  Paid:      { bg: '#dcfce7', text: '#15803d' },
  Draft:     { bg: '#f1f5f9', text: '#475569' },
  Overdue:   { bg: '#fee2e2', text: '#dc2626' },
  Partial:   { bg: '#fef9c3', text: '#a16207' },
  Pending:   { bg: '#fff7ed', text: '#c2410c' },
  Cancelled: { bg: '#f4f4f5', text: '#71717a' },
};

export default function InvoiceDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { invoice: initialInvoice, invoiceId } = route.params || {};
  const targetId = initialInvoice?.id || invoiceId;
  const invoice = useStore(state => state.invoices.find(i => i.id === targetId)) || initialInvoice;
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showReturnSheet, setShowReturnSheet] = useState(false);
  const [returnStatus, setReturnStatus] = useState('NONE');

  // Reload return_status whenever the invoice updates
  useEffect(() => {
    const rs = invoice?.return_status || 'NONE';
    setReturnStatus(rs);
  }, [invoice?.return_status]);

  const deleteInvoice = useStore(state => state.deleteInvoice);
  const updateInvoice = useStore(state => state.updateInvoice);
  const cancelInvoice = useStore(state => state.cancelInvoice);
  const profile = useStore(state => state.profile);
  const currentRole = useStore(state => state.currentRole);
  const payments = useStore(state => state.payments);
  const invoices = useStore(state => state.invoices);

  useEffect(() => {
    loadItems();
  }, [invoice?.id]);

  const loadItems = async () => {
    try {
      const items = await DbServices.getInvoiceItems(invoice.id);
      setLineItems(items || []);
    } catch (e) {
      console.error('Error loading invoice items:', e);
    } finally {
      setLoading(false);
    }
  };

  const statusStyle = STATUS_COLORS[invoice?.status] || STATUS_COLORS.Draft;

  // Format datetime helper for Invoice Date
  const formatDateTime = (raw) => {
    if (!raw) return '';
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return raw;
      const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${date} · ${time}`;
    } catch { return raw; }
  };

  const handleSharePdf = async () => {
    setPdfLoading(true);
    try {
      await shareInvoiceAsPdf({ invoice, lineItems, profile, payments });
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to generate PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePreviewPdf = () => {
    navigation.navigate('InvoicePreview', { invoice });
  };

  const handlePrint = async () => {
    setPdfLoading(true);
    try {
      await printInvoice({ invoice, lineItems, profile, payments });
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to print invoice.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setShowStatusModal(false);
    try {
      if (newStatus === 'Cancelled' && invoice.status !== 'Cancelled') {
        Alert.alert(
          'Cancel Invoice',
          'Are you sure you want to cancel this invoice? Inventory stock will be restored.',
          [
            { text: 'No', style: 'cancel' },
            { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelInvoice(invoice.id) }
          ]
        );
      } else if (invoice.status === 'Cancelled' && newStatus !== 'Cancelled') {
        Alert.alert('Not Supported', 'You cannot change the status of a cancelled invoice. Please duplicate it instead.');
      } else {
        await updateInvoice({ ...invoice, status: newStatus });
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update status.');
    }
  };

  const handleDelete = () => {
    const isEstimateLocal = invoice?.type === 'estimate';

    Alert.alert(
      isEstimateLocal ? 'Delete Estimate' : 'Delete Invoice',
      isEstimateLocal 
        ? 'Are you sure you want to permanently delete this estimate? This cannot be undone.'
        : 'Are you sure you want to move this invoice to history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              if (isEstimateLocal) {
                await useStore.getState().permanentlyDeleteInvoice(invoice.id);
              } else {
                await deleteInvoice(invoice.id);
              }
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', 'Could not delete.');
            }
          }
        }
      ]
    );
  };

  // ── Cancel Invoice handler ────────────────────────────────────────────
  const handleCancel = () => {
    if (invoice?.status === 'Cancelled') return;
    if (returnStatus === 'FULL') {
      Alert.alert('Cannot Cancel', 'This invoice has a full sales return and cannot be cancelled.');
      return;
    }

    const paidAmount = payments
      .filter(p => String(p.invoiceId || p.invoice_id) === String(invoice?.id) && p.type !== 'credit_note' && (parseFloat(p.amount) || 0) > 0)
      .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

    const sym = profile?.currency_symbol || '₹';
    const hasPaid = paidAmount > 0.01;

    Alert.alert(
      'Cancel Invoice',
      hasPaid
        ? `This invoice has ${sym}${paidAmount.toFixed(2)} already paid. Cancelling will:\n\n• Restore inventory stock\n• Refund ${sym}${paidAmount.toFixed(2)} to customer wallet credit\n• Mark invoice as Cancelled\n\nProceed?`
        : 'Are you sure you want to cancel this invoice?\n\n• Inventory stock will be restored\n• Invoice will be marked Cancelled',
      [
        { text: 'Keep Invoice', style: 'cancel' },
        {
          text: hasPaid ? 'Cancel & Refund' : 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelInvoice(invoice.id);
              Alert.alert(
                'Invoice Cancelled',
                hasPaid
                  ? `Invoice cancelled. ${sym}${paidAmount.toFixed(2)} credited to customer wallet.`
                  : 'Invoice cancelled and stock restored.',
              );
            } catch (e) {
              Alert.alert('Error', 'Failed to cancel invoice.');
            }
          },
        },
      ]
    );
  };


  const round2 = v => Math.round(v * 100) / 100;

  // Calculate gross sales return for this item
  const invoicePaymentsTop = payments.filter(
    p => String(p.invoiceId || p.invoice_id) === String(invoice?.id)
  );
  const returnAdjTop = round2(
    invoicePaymentsTop
      .filter(p => p.type === 'credit_note')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0) + (parseFloat(p.dueReduced || p.due_reduced) || 0), 0)
  );

  const rawTotal = parseFloat(invoice?.total || 0);

  // Show the ORIGINAL invoice amounts (not reduced by returns)
  const subtotal = round2(parseFloat(invoice?.subtotal || 0));
  const taxAmount = round2(parseFloat(invoice?.tax_amount || invoice?.taxAmount || 0));
  const taxPercent = parseFloat(invoice?.tax_percent || invoice?.taxPercent || 0);
  const discountAmount = round2(parseFloat(invoice?.discount_amount || invoice?.discountAmount || 0));
  const discountPercent = parseFloat(invoice?.discount_percent || invoice?.discountPercent || 0);
  const total = round2(rawTotal); // Original invoice total — not reduced by returns
  const sym = profile?.currency_symbol || '$';

  const invoicePayments = payments.filter(
    p => String(p.invoiceId || p.invoice_id) === String(invoice?.id)
  );
  // Regular payments (cash, bank, UPI etc.)
  const amountPaid = round2(
    invoicePayments
      .filter(p => p.type !== 'credit_note')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  );

  const cid = invoice?.customerId || invoice?.customer_id;
  const { invoiceDueMap } = cid ? calculateCustomerBalances(cid, invoices, payments) : { invoiceDueMap: {} };
  const trueBalanceDue = invoiceDueMap[invoice?.id];
  const localBalanceDue = round2(Math.max(0, total - amountPaid));
  
  // Fallback to local math if map missing
  const balanceDue = trueBalanceDue !== undefined ? trueBalanceDue : localBalanceDue;

  // Return due reductions (from credit_notes linked to this invoice)
  const returnDueReduced = round2(
    invoicePayments
      .filter(p => p.type === 'credit_note')
      .reduce((sum, p) => sum + (parseFloat(p.dueReduced || p.due_reduced) || 0), 0)
  );
  // Wallet/advance applied = gap minus what returns settled
  const walletApplied = round2(Math.max(0, localBalanceDue - balanceDue - returnDueReduced));

  let displayStatus = invoice?.status || 'Draft';
  if (displayStatus !== 'Draft' && displayStatus !== 'Cancelled' && balanceDue <= 0) {
    displayStatus = 'Paid';
  }
  const dynamicStatusStyle = STATUS_COLORS[displayStatus] || STATUS_COLORS.Draft;

  // Lock the invoice once all dues are cleared (fintech audit rule)
  const isFullyPaid = returnStatus !== 'FULL' &&
    invoice?.status !== 'Cancelled' &&
    balanceDue <= 0;

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      {/* ── Premium Header ── */}
      <View style={{ 
        backgroundColor: '#262A56', 
        paddingHorizontal: 20, 
        paddingTop: Platform.OS === 'ios' ? 10 : 40, 
        paddingBottom: 25,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: '#262A56', shadowOpacity: 0.3, shadowRadius: 15, elevation: 12
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center rounded-2xl bg-white/10"
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>Invoice Detail</Text>
          {checkPermission(currentRole, 'canDeleteRecords') && returnStatus !== 'FULL' && invoice?.status !== 'Cancelled' && !isFullyPaid ? (
            <TouchableOpacity onPress={handleDelete} className="w-10 h-10 items-center justify-center rounded-2xl bg-white/10">
              <MaterialIcons name="delete-outline" size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View className="w-10 h-10" />
          )}
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 130 }}>

        {/* Fully Paid — Locked Banner */}
        {isFullyPaid && (
          <View style={{
            backgroundColor: '#f0fdf4',
            borderRadius: 16,
            paddingVertical: 10, paddingHorizontal: 16,
            flexDirection: 'row', alignItems: 'center', gap: 8,
            marginBottom: 8,
            borderWidth: 1.5, borderColor: '#bbf7d0',
          }}>
            <MaterialIcons name="verified" size={20} color="#16a34a" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#15803d', fontWeight: '900', fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase' }}>Due Fully Paid — Locked</Text>
              <Text style={{ color: '#22c55e', fontSize: 11, marginTop: 1 }}>All dues have been cleared. This invoice is read-only for audit integrity.</Text>
            </View>
          </View>
        )}
        {/* Cancelled Banner */}
        {invoice?.status === 'Cancelled' && (
          <View style={{
            backgroundColor: '#ef4444',
            borderRadius: 16,
            paddingVertical: 10, paddingHorizontal: 16,
            flexDirection: 'row', alignItems: 'center', gap: 8,
            marginBottom: 8,
          }}>
            <MaterialIcons name="cancel" size={20} color="white" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' }}>Invoice Cancelled</Text>
              <Text style={{ color: '#fca5a5', fontSize: 11, marginTop: 1 }}>This invoice has been cancelled. Inventory stock has been restored.</Text>
            </View>
          </View>
        )}
        {/* Invoice Header Card */}
        <View className="bg-white rounded-3xl p-6 border border-slate-100 mb-5 shadow-sm"
          style={invoice?.status === 'Cancelled' ? { borderColor: '#fca5a5', borderWidth: 2 } : {}}>          
          <View className="flex-row justify-between items-start mb-6">
            <View className="flex-1">
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#262A56' }}>
                {invoice?.invoice_number || invoice?.invoiceNumber || '#N/A'}
              </Text>
              <View className="flex-row items-center gap-2 mt-2">
                <View className="bg-slate-100 px-2 py-1 rounded-lg flex-row items-center gap-1">
                  <MaterialIcons name="schedule" size={12} color="#64748b" />
                  <Text className="text-[11px] font-black text-slate-500 uppercase tracking-tighter">
                    {formatDateTime(invoice?.created_at || invoice?.date) || invoice?.date}
                  </Text>
                </View>
              </View>
              {(invoice?.due_date || invoice?.dueDate) ? (
                <View className="flex-row items-center gap-1 mt-2">
                  <MaterialIcons name="event" size={14} color="#64748b" />
                  <Text className="text-sm font-black text-slate-500">Due: {invoice?.due_date || invoice?.dueDate}</Text>
                </View>
              ) : null}
              {/* Return status badge */}
              {returnStatus !== 'NONE' && returnStatus && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, alignSelf: 'flex-start', backgroundColor: returnStatus === 'FULL' ? '#fef2f2' : '#fffbeb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1.5, borderColor: returnStatus === 'FULL' ? '#fecaca' : '#fde68a' }}>
                  <MaterialIcons name="assignment-return" size={12} color={returnStatus === 'FULL' ? '#dc2626' : '#d97706'} />
                  <Text style={{ fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, color: returnStatus === 'FULL' ? '#dc2626' : '#d97706' }}>
                    {returnStatus === 'FULL' ? 'Full Return' : 'Partial Return'}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                if (!checkPermission(currentRole, 'canDeleteRecords') && currentRole === 'staff') {
                   // Staff shouldn't change status usually, but maybe they can? 
                   // Let's stick to: Staff CANNOT change status if we want high integrity.
                   Alert.alert('Access Denied', 'Staff accounts cannot manually change invoice status.');
                   return;
                }
                if (returnStatus !== 'FULL' && invoice?.status !== 'Cancelled' && !isFullyPaid) {
                   setShowStatusModal(true);
                }
              }}
              activeOpacity={returnStatus === 'FULL' || isFullyPaid ? 1 : 0.7}
              style={{ backgroundColor: returnStatus === 'FULL' ? '#7c3aed' : isFullyPaid ? '#16a34a' : dynamicStatusStyle.text, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 }}
              className="flex-row items-center gap-1 shadow-sm"
            >
              <Text style={{ color: '#fff' }} className="text-[10px] font-black uppercase tracking-widest">
                {returnStatus === 'FULL' ? 'Returned' : isFullyPaid ? 'PAID ✓' : displayStatus}
              </Text>
              {checkPermission(currentRole, 'canViewReports') && returnStatus !== 'FULL' && invoice?.status !== 'Cancelled' && !isFullyPaid && (
                <MaterialIcons name="expand-more" size={14} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          
          {/* Credit & Balance Detail Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fdfdff', borderRadius: 24, padding: 15, borderWidth: 1, borderColor: '#f1f5f9', gap: 10 }}>
            <View style={{ flex: 1, minWidth: '45%' }}>
              <Text className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Amount</Text>
              <Text className="text-base font-black text-[#262A56]">{sym}{(parseFloat(total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={{ flex: 1, minWidth: '45%' }}>
              <Text className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mb-1">Paid Amount</Text>
              <Text className="text-base font-black text-emerald-600">{sym}{amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={{ height: 1, width: '100%', backgroundColor: '#f1f5f9' }} />
            <View style={{ flex: 1, minWidth: '45%' }}>
              <Text className="text-[9px] text-red-500 font-black uppercase tracking-widest mb-1">Due Balance</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: balanceDue <= 0 ? '#10b981' : '#f43f5e' }}>
                {balanceDue <= 0 ? 'Settled' : `${sym}${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              </Text>
            </View>
            {(returnAdjTop > 0 || walletApplied > 0) && (
              <View style={{ flex: 1, minWidth: '45%', justifyContent: 'center' }}>
                {returnAdjTop > 0 && <Text className="text-[9px] text-orange-500 font-black uppercase">Returned: {sym}{returnAdjTop.toFixed(0)}</Text>}
                {walletApplied > 0 && <Text className="text-[9px] text-blue-500 font-black uppercase">Wallet: {sym}{walletApplied.toFixed(0)}</Text>}
              </View>
            )}
          </View>

          <View className="mt-6 pt-5 border-t border-slate-50">
            <Text className="text-[10px] uppercase font-black text-slate-400 mb-3 tracking-widest">Customer Details</Text>
            <View className="flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <View className="w-12 h-12 rounded-2xl bg-[#262A56] items-center justify-center shadow-md">
                <Text className="text-white font-black text-lg">
                  {(invoice?.customer_name || invoice?.customerName || 'C').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text className="text-lg font-black text-[#262A56]">
                  {invoice?.customer_name || invoice?.customerName || 'Unknown Customer'}
                </Text>
                <Text className="text-xs font-bold text-slate-500 mt-0.5">Customer Ledger Profile</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Line Items */}
        <Text style={{ fontSize: 13, fontWeight: '900', color: '#262A56', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Billed Items</Text>
        <View className="bg-white rounded-[24px] border border-slate-100 overflow-hidden mb-6 shadow-sm">
          {/* Table Header */}
          <View style={{ flexDirection: 'row', backgroundColor: '#262A56', paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text className="text-white font-black text-[9px] uppercase w-6 text-center">#</Text>
            <Text className="text-white font-black text-[9px] uppercase flex-1 ml-2">Description</Text>
            <Text className="text-white font-black text-[9px] uppercase w-10 text-center">Qty</Text>
            <Text className="text-white font-black text-[9px] uppercase w-20 text-right">Amount</Text>
          </View>
          {loading ? (
            <ActivityIndicator style={{ padding: 20 }} color="#262A56" />
          ) : lineItems.length === 0 ? (
            <Text className="text-center text-slate-400 py-8">No items found</Text>
          ) : (
            lineItems.map((item, index) => {
              const rate = parseFloat(item.rate || 0);
              const qty = parseFloat(item.quantity || item.qty || 1);
              const itemTotal = parseFloat(item.total || rate * qty);
              return (
                <View
                  key={index}
                  className={`flex-row px-4 py-3 items-start ${index < lineItems.length - 1 ? 'border-b border-slate-100' : ''} ${index % 2 === 1 ? 'bg-blue-50/40' : ''}`}
                >
                  <Text className="text-[11px] text-slate-500 w-6 text-center mt-0.5">{index + 1}</Text>
                  <View className="flex-1 ml-2">
                    <Text className="text-sm font-bold text-slate-900">{item.name}</Text>
                    {item.description ? <Text className="text-[10px] text-slate-400 mt-0.5">{item.description}</Text> : null}
                  </View>
                  <Text className="text-[11px] text-slate-600 w-10 text-center mt-0.5">{qty}</Text>
                  <Text className="text-[11px] font-medium text-slate-600 w-20 text-right mt-0.5">{sym}{(parseFloat(rate) || 0).toFixed(2)}</Text>
                  <Text className="text-[11px] font-black text-primary w-20 text-right mt-0.5">{sym}{(parseFloat(itemTotal) || 0).toFixed(2)}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Totals Card */}
        <View className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm mb-6">
          <View className="flex-row justify-between mb-4">
            <Text className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Subtotal</Text>
            <Text className="text-base font-black text-[#262A56]">{sym}{(parseFloat(subtotal) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
          {taxAmount > 0 && (
            <View className="flex-row justify-between mb-4">
              <Text className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{profile?.currency_code === 'INR' ? 'GST' : 'Tax'} ({taxPercent}%)</Text>
              <Text className="text-base font-black text-[#262A56]">+{sym}{(parseFloat(taxAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
          )}
          {discountAmount > 0 && (
            <View className="flex-row justify-between mb-4">
              <Text className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Discount ({discountPercent}%)</Text>
              <Text className="text-base font-black text-emerald-600">-{sym}{(parseFloat(discountAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
          )}
          <View style={{ height: 1.5, backgroundColor: '#f1f5f9', marginVertical: 12 }} />
          <View className="flex-row justify-between items-center">
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#262A56', textTransform: 'uppercase', letterSpacing: 1 }}>Grand Total</Text>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#262A56' }}>{sym}{(parseFloat(total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
          {returnAdjTop > 0 && (
            <View className="flex-row justify-between mt-4 p-3 bg-rose-50 rounded-xl border border-rose-100">
              <Text className="text-[10px] font-black text-rose-500 uppercase">Sales Return Adjustment</Text>
              <Text className="text-sm font-black text-rose-600">-{sym}{returnAdjTop.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
          )}
          {returnAdjTop > 0 && (
            <View className="flex-row justify-between pt-4 mt-2 border-t border-slate-100">
              <Text className="text-base font-black text-[#262A56] uppercase tracking-tighter">Net Total</Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#262A56' }}>{sym}{round2(Math.max(0, total - returnAdjTop)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
          )}
        </View>

        {/* Payment History */}
        {invoicePaymentsTop.length > 0 && (
          <>
            <Text className="text-sm font-black text-slate-900 uppercase tracking-wider mb-3 mt-2">Payment History</Text>
            <View className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4 shadow-sm">
              {invoicePaymentsTop.map((p, i) => {
                const amt = parseFloat(p.amount) || 0;
                const dueRed = parseFloat(p.dueReduced || p.due_reduced) || 0;
                const isCredit = p.type === 'credit_note';
                const isAdjustment = p.method === 'Adjustment';
                const isNegative = amt < 0;

                // For credit_notes with amount=0 but dueReduced>0, show the dueReduced
                const displayAmt = (isCredit && amt === 0 && dueRed > 0) ? dueRed : Math.abs(amt);

                // Determine label
                let label = `${p.method || 'Cash'} Payment`;
                if (isCredit) {
                  if (dueRed > 0 && amt === 0) label = 'Return — Due Settled';
                  else if (amt > 0) label = 'Return Wallet Credit';
                  else label = 'Return Credit';
                }
                if (isAdjustment) label = isNegative ? 'Payment Reduced' : 'Additional Payment';
                if (p.method === 'Advance Adjusted') label = 'Advance Credit Applied';

                // Color: return due settled = orange, credits = red, payments = green
                let amtColor = 'text-green-600';
                let sign = '+';
                if (isCredit) {
                  amtColor = dueRed > 0 ? 'text-orange-500' : 'text-red-500';
                  sign = '-';
                } else if (isNegative) {
                  amtColor = 'text-red-500';
                  sign = '-';
                }

                return (
                  <View key={i} className={`flex-row justify-between items-center px-4 py-3 ${i < invoicePaymentsTop.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text className="text-sm font-bold text-slate-900">{label}</Text>
                      <Text className="text-[10px] uppercase font-bold text-slate-500 mt-0.5" numberOfLines={1}>
                        {p.date} {p.notes ? `• ${p.notes}` : ''}
                      </Text>
                    </View>
                    <Text className={`text-sm font-black ${amtColor}`}>
                      {sign}{sym}{displayAmt.toFixed(2)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Notes */}
        {invoice?.notes ? (
          <View className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-4">
            <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Notes</Text>
            <Text className="text-sm text-slate-600">{invoice.notes}</Text>
          </View>
        ) : null}

      </ScrollView>

      {/* Footer Actions */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 8, 
        padding: 16, 
        backgroundColor: '#fff', 
        borderTopWidth: 1, 
        borderTopColor: '#f1f5f9', 
        paddingBottom: Math.max(insets.bottom, 20) 
      }}>
        
        {/* Secondary Actions Row */}
        <View className="flex-row gap-2 flex-1">
          <TouchableOpacity
            onPress={handlePrint}
            disabled={pdfLoading}
            className="w-12 h-12 bg-slate-50 rounded-2xl items-center justify-center border border-slate-100"
          >
            <MaterialIcons name="print" size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePreviewPdf}
            disabled={pdfLoading}
            className="w-12 h-12 bg-slate-50 rounded-2xl items-center justify-center border border-slate-100"
          >
            <MaterialIcons name="visibility" size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSharePdf}
            disabled={pdfLoading}
            className="w-12 h-12 bg-blue-50 rounded-2xl items-center justify-center border border-blue-100"
          >
            <MaterialIcons name="share" size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>
        
        {/* Primary Action ─ Edit: only for editable statuses */}
        {invoice?.status !== 'Cancelled' &&
          returnStatus !== 'FULL' &&
          !isFullyPaid &&
          ['Draft', 'Sent', 'Pending', 'Partial', 'Overdue'].includes(invoice?.status) && (
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateInvoice', { invoice, mode: 'edit' })}
            className="flex-1 h-12 bg-[#262A56] rounded-2xl flex-row items-center justify-center gap-2 shadow-lg"
          >
            <MaterialIcons name="edit" size={18} color="white" />
            <Text className="text-white font-black text-[12px] uppercase tracking-widest">Edit Bill</Text>
          </TouchableOpacity>
        )}

        {/* Cancel Action ─ only for non-cancelled, non-returned invoices, and non-staff */}
        {invoice?.status !== 'Cancelled' && returnStatus !== 'FULL' && checkPermission(currentRole, 'canDeleteRecords') && (
          <TouchableOpacity
            onPress={handleCancel}
            style={{
              height: 48, paddingHorizontal: 16,
              backgroundColor: '#fef2f2',
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: '#fecaca',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
            }}
          >
            <MaterialIcons name="cancel" size={18} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Cancel</Text>
          </TouchableOpacity>
        )}

        {/* Return Action */}
        {invoice?.status !== 'Cancelled' && returnStatus !== 'FULL' && (
          <TouchableOpacity
            onPress={() => setShowReturnSheet(true)}
            className="h-12 px-4 bg-rose-50 rounded-2xl flex-row items-center justify-center gap-2 border border-rose-100"
          >
            <MaterialIcons name="assignment-return" size={18} color="#f43f5e" />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Change Modal */}
      <Modal visible={showStatusModal} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-6">
            <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-6" />
            <Text className="text-xl font-black text-primary mb-4">Change Status</Text>
            {STATUS_OPTIONS.map(s => {
              const sc = STATUS_COLORS[s] || STATUS_COLORS.Draft;
              const isCurrent = (invoice?.status || 'Draft') === s;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => handleStatusChange(s)}
                  className={`flex-row items-center justify-between py-4 px-4 rounded-xl mb-2 ${isCurrent ? 'bg-primary/10 border border-primary/20' : 'bg-slate-50'}`}
                >
                  <View className="flex-row items-center gap-3">
                    <View style={{ backgroundColor: sc.bg }} className="px-3 py-1 rounded-full">
                      <Text style={{ color: sc.text }} className="text-xs font-black uppercase">{s}</Text>
                    </View>
                  </View>
                  {isCurrent && <MaterialIcons name="check-circle" size={20} color="#262A56" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Return Items Sheet */}
      <ReturnItemsSheet
        visible={showReturnSheet}
        invoice={invoice}
        lineItems={lineItems}
        payments={payments}
        profile={profile}
        onClose={() => setShowReturnSheet(false)}
        onConfirm={(result) => {
          setReturnStatus(result?.status || 'PARTIAL');
          setShowReturnSheet(false);
        }}
      />
    </SafeAreaView>
  );
}
