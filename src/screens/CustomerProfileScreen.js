import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Linking, Modal, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { calculateCustomerBalances } from '../utils/balanceCalculator';
import { formatAmount } from '../utils/formatters';
import { checkPermission } from '../utils/permissions';
import { getLedgerEntries } from '../database/services';
import DatePickerModal from '../components/DatePickerModal';

export default function CustomerProfileScreen({ navigation, route }) {
  const { customerId } = route.params || {};
  const [activeTab, setActiveTab] = useState('Payments');
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  
  const customers = useStore(state => state.customers);
  const deleteCustomer = useStore(state => state.deleteCustomer);
  const addPayment = useStore(state => state.addPayment);
  const addDueEntry = useStore(state => state.addDueEntry);
  const updateCustomer = useStore(state => state.updateCustomer);
  const currentRole = useStore(state => state.currentRole);

  // Receive Payment modal state
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveAmount, setReceiveAmount] = useState('');
  const [receiveMethod, setReceiveMethod] = useState('Cash');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Add Due modal state
  const [showGiveModal, setShowGiveModal] = useState(false);
  const [giveAmount, setGiveAmount] = useState('');
  const [giveNotes, setGiveNotes] = useState('');
  const [isSavingGive, setIsSavingGive] = useState(false);
  const [giveDueDate, setGiveDueDate] = useState('');
  const [showGiveDatePicker, setShowGiveDatePicker] = useState(false);


  const adjustCustomerWallet = useStore(state => state.adjustCustomerWallet);
  const customerWallets = useStore(state => state.customerWallets);
  const paymentMethods = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque'];
  const customer = customers.find(c => c.id === customerId);
  
  const invoices = useStore(state => state.invoices);
  const payments = useStore(state => state.payments);
  const orders = useStore(state => state.orders);
  const challans = useStore(state => state.challans);
  const profile = useStore(state => state.profile);

  const customerInvoices = useMemo(() => 
    invoices.filter(inv => (inv.customerId === customerId || inv.customer_id === customerId)),
    [invoices, customerId]
  );

  const customerPayments = useMemo(() => 
    payments.filter(p => (p.customerId === customerId || p.customer_id === customerId)),
    [payments, customerId]
  );

  const customerOrders = useMemo(() => 
    orders.filter(ord => (ord.customerId === customerId || ord.customer_id === customerId)),
    [orders, customerId]
  );

  const customerChallans = useMemo(() => 
    challans.filter(ch => (ch.customerId === customerId || ch.customer_id === customerId)),
    [challans, customerId]
  );

  // Transactions tab = PAYMENTS ONLY (money movement)
  // Invoices live in a dedicated tab — no duplication
  const allTransactions = useMemo(() => {
    return [...customerPayments]
      .sort((a, b) => {
        const dateA = new Date(a.date || a.created_at || 0);
        const dateB = new Date(b.date || b.created_at || 0);
        return dateB - dateA;
      })
      .map(p => ({ ...p, transactionType: 'Payment' }));
  }, [customerPayments]);

  // Unify balance calculation using the central utility
  const { totalInvoiced, totalPaid, totalGiven, totalDue, netBalance, creditBalance, returnCreditBalance, invoiceDueMap } = useMemo(
    () => calculateCustomerBalances(customerId, invoices, payments),
    [customerId, invoices, payments]
  );
  
  // Wallet balance from the dedicated customerWallets store (separate from balance due)
  const walletBalance = customerWallets[customerId] || 0;
  // netWalletBalance removed — wallet is now tracked separately in customerWallets

  // Per-invoice outstanding (used only for the per-transaction balance chip in TransactionItem)
  const getInvoiceBalance = (inv) => {
    return invoiceDueMap[inv.id] || 0;
  };

  // Format datetime helper
  const formatDateTime = useCallback((raw) => {
    if (!raw) return '';
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return raw;
      const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${date} · ${time}`;
    } catch { return raw; }
  }, []);

  // Load ledger entries when tab is opened
  useEffect(() => {
    if (activeTab === 'Ledger' && customerId) {
      setIsLoadingLedger(true);
      getLedgerEntries(customerId)
        .then(rows => setLedgerEntries(rows || []))
        .catch(e => console.error('Ledger load error:', e))
        .finally(() => setIsLoadingLedger(false));
    }
  }, [activeTab, customerId]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${customer.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomer(customerId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Cannot Delete', error.message || 'An error occurred while deleting the customer.');
            }
          }
        }
      ]
    );
  };

  const updateInvoice = useStore(state => state.updateInvoice);

  const handleReceivePayment = async () => {
    const amount = parseFloat(receiveAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than zero.');
      return;
    }
    try {
      setIsSavingPayment(true);
      const today = new Date().toISOString().split('T')[0];

      // Get outstanding invoices sorted oldest-first
      const { invoices: allInvoices } = useStore.getState();
      const outstandingInvoices = allInvoices
        .filter(inv =>
          (inv.customerId === customerId || inv.customer_id === customerId) &&
          inv.status !== 'Paid'
        )
        .sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at));

      let remaining = amount;

      // Distribute payment to invoices as LINKED payments (fixes InvoicesScreen balance display)
      for (const inv of outstandingInvoices) {
        if (remaining <= 0) break;

        // Re-read payments fresh each iteration (previous addPayment calls update the store)
        const { payments: freshPayments } = useStore.getState();
        const invoicePayments = freshPayments.filter(
          p => String(p.invoiceId || p.invoice_id) === String(inv.id)
        );
        // Only count real payments (exclude credit_notes and give_payments)
        const alreadyPaid = invoicePayments
          .filter(p => p.type !== 'credit_note' && p.type !== 'give_payment')
          .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        // Subtract dueReduced from any linked credit notes
        const creditNoteDueReduced = invoicePayments
          .filter(p => p.type === 'credit_note')
          .reduce((sum, p) => sum + (parseFloat(p.dueReduced || p.due_reduced) || 0), 0);
        const invoiceTotal = parseFloat(inv.total || 0);
        const balance = Math.max(0, invoiceTotal - alreadyPaid - creditNoteDueReduced);
        if (balance <= 0) continue;

        const applied = Math.min(remaining, balance);
        remaining -= applied;

        // Record LINKED payment so per-invoice balance is correct everywhere
        await addPayment({
          invoiceId: inv.id,
          customerId,
          customerName: customer.name,
          amount: applied,
          method: receiveMethod,
          type: 'payment',
          date: today,
          notes: receiveNotes || `Payment received via ${receiveMethod}`,
        });

        // Update invoice status
        const newStatus = applied >= balance ? 'Paid' : 'Partial';
        await updateInvoice({ ...inv, status: newStatus });
      }

      // If any amount is left over (advance / credit), record as unlinked
      if (remaining > 0) {
        await addPayment({
          invoiceId: null,
          customerId,
          customerName: customer.name,
          amount: remaining,
          method: receiveMethod,
          type: 'payment',
          date: today,
          notes: receiveNotes || `Advance received via ${receiveMethod}`,
        });
      }

      setShowReceiveModal(false);
      setReceiveAmount('');
      setReceiveNotes('');
      setReceiveMethod('Cash');
      Alert.alert('Payment Recorded', `${formatAmount(amount, profile.currency_symbol || '₹')} received successfully.`);
    } catch (err) {
      console.error('Receive payment error:', err);
      Alert.alert('Error', 'Failed to record payment. Please try again.');
    } finally {
      setIsSavingPayment(false);
    }
  };

  // ── Add Due handler ──────────────────────────────────────────────────
  const handleAddDue = async () => {
    const amount = parseFloat(giveAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than zero.');
      return;
    }
    try {
      setIsSavingGive(true);
      const today = new Date().toISOString().split('T')[0];

      // Create a due-entry so it shows in Balance Due but doesn't create an invoice
      await addDueEntry({
        customerId,
        customerName: customer.name,
        amount,
        date: today,
        dueDate: giveDueDate || '',
        notes: giveNotes || `Due added for ${customer.name}`,
        method: 'Credit',
      });

      // If a due date was set, also update the customer's payment_due_date
      if (giveDueDate) {
        await updateCustomer({
          id: customerId,
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone || '',
          address: customer.address || '',
          notes: customer.notes || '',
          gstin: customer.gstin || '',
          payment_due_date: giveDueDate,
          payment_note: customer.payment_note || '',
        });
      }

      setShowGiveModal(false);
      setGiveAmount('');
      setGiveNotes('');
      setGiveDueDate('');
      Alert.alert(
        'Due Added',
        `${formatAmount(amount, profile.currency_symbol || '₹')} due added for ${customer.name}.${giveDueDate ? `\nDue date: ${new Date(giveDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}`
      );
    } catch (err) {
      console.error('Add due error:', err);
      Alert.alert('Error', 'Failed to add due. Please try again.');
    } finally {
      setIsSavingGive(false);
    }
  };

  const [showAdjustWalletModal, setShowAdjustWalletModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState('add');   // 'add' | 'subtract'
  const [adjustNotes, setAdjustNotes] = useState('');
  const [isAdjustingWallet, setIsAdjustingWallet] = useState(false);

  // Cash Refund state — wallet credit → physical cash return
  const [showCashRefundModal, setShowCashRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundNotes, setRefundNotes] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  const handleAdjustWalletBalance = async () => {
    const delta = parseFloat(adjustAmount);
    if (isNaN(delta) || delta <= 0) {
      Alert.alert('Invalid Amount', 'Enter a valid positive amount.');
      return;
    }
    if (!adjustNotes.trim()) {
      Alert.alert('Reason Required', 'Please enter a reason for this adjustment. Required for audit trail.');
      return;
    }
    const newBalance = adjustType === 'add'
      ? Math.round((walletBalance + delta) * 100) / 100
      : Math.max(0, Math.round((walletBalance - delta) * 100) / 100);
    const sym = profile.currency_symbol || '₹';
    try {
      setIsAdjustingWallet(true);
      await adjustCustomerWallet(customerId, customer.name, walletBalance, newBalance);
      // Record audit entry in payments table
      await addPayment({
        invoiceId: null,
        customerId,
        customerName: customer.name,
        amount: adjustType === 'add' ? delta : -delta,
        method: 'Credit Adjustment',
        type: 'credit_note',
        date: new Date().toISOString().split('T')[0],
        notes: adjustNotes.trim(),
      });
      setShowAdjustWalletModal(false);
      setAdjustAmount('');
      setAdjustNotes('');
      Alert.alert(
        'Wallet Adjusted',
        `${adjustType === 'add' ? '+' : '-'}${sym}${delta.toFixed(2)} applied.\nNew balance: ${sym}${newBalance.toFixed(2)}`
      );
    } catch (err) {
      console.error('Adjust wallet error:', err);
      Alert.alert('Error', 'Failed to adjust wallet balance.');
    } finally {
      setIsAdjustingWallet(false);
    }
  };

  const handleCashRefund = async () => {
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Enter a valid refund amount.');
      return;
    }
    const totalCredit = creditBalance + walletBalance;
    if (amount > totalCredit + 0.01) {
      Alert.alert(
        'Insufficient Credit',
        `Customer only has ${profile.currency_symbol || '₹'}${totalCredit.toFixed(2)} available credit.`
      );
      return;
    }
    const sym = profile.currency_symbol || '₹';
    try {
      setIsRefunding(true);
      const today = new Date().toISOString().split('T')[0];
      // Deduct from wallet table
      const walletDeduction = Math.min(amount, walletBalance);
      if (walletDeduction > 0) {
        const newWallet = Math.max(0, Math.round((walletBalance - walletDeduction) * 100) / 100);
        await adjustCustomerWallet(customerId, customer.name, walletBalance, newWallet);
      }
      // Record cash refund in payments table (shows in Payments tab)
      await addPayment({
        invoiceId: null,
        customerId,
        customerName: customer.name,
        amount: -amount,   // negative = money going OUT to customer
        method: 'Cash Refund',
        type: 'cash_refund',
        date: today,
        notes: refundNotes.trim() || `Cash refund of ${sym}${amount.toFixed(2)} to ${customer.name}`,
      });
      // Also record a credit_note offset so balanceCalculator stays clean
      await addPayment({
        invoiceId: null,
        customerId,
        customerName: customer.name,
        amount: -amount,
        method: 'Advance Reversal',
        type: 'credit_note',
        date: today,
        notes: `Advance consumed for cash refund`,
      });
      setShowCashRefundModal(false);
      setRefundAmount('');
      setRefundNotes('');
      Alert.alert(
        'Cash Refunded ✅',
        `${sym}${amount.toFixed(2)} refunded to ${customer.name}.\nRemember to hand them cash physically.`
      );
    } catch (err) {
      console.error('Cash refund error:', err);
      Alert.alert('Error', 'Failed to process refund.');
    } finally {
      setIsRefunding(false);
    }
  };

  if (!customer) {
    return (
      <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark pt-12 items-center justify-center">
        <Text className="text-lg text-slate-500">Customer not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 p-2 bg-[#262A56] rounded-lg">
          <Text className="text-white">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const getInitials = (name) => {
    return name
      ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
      : '??';
  };

  const TransactionItem = ({ tx }) => {
    const type = tx.transactionType;
    const isInvoice = type === 'Invoice';
    const isPayment = type === 'Payment';
    const isOrder = type === 'Order';
    const isChallan = type === 'Challan';

    const amount = parseFloat(tx.total || tx.amount || 0);
    const number = tx.invoiceNumber || tx.invoice_number || tx.orderNumber || tx.order_number ||
                   tx.challanNumber || tx.challan_number || tx.payment_number || tx.id;
    const rawTimestamp = tx.created_at || tx.date || tx.deliveryDate || '';
    const displayTime = formatDateTime(rawTimestamp);

    const invoiceBalance = isInvoice ? getInvoiceBalance(tx) : null;

    let icon = 'description';
    let color = '#262A56'; // Use app primary
    let label = type;
    let statusColor = '#94a3b8';
    let statusBg = '#f1f5f9';

    const isCreditNote = tx.type === 'credit_note';
    const isDueEntry = isPayment && (tx.type === 'give_payment' || tx.type === 'due_entry');
    const isCashRefund = tx.type === 'cash_refund';

    if (isPayment && !isCreditNote && !isDueEntry && !isCashRefund) { icon = 'payments'; color = '#10b981'; label = 'Payment Received'; }
    if (isDueEntry) { icon = 'add-circle'; color = '#f43f5e'; label = 'Due Added'; }
    if (isCashRefund) { icon = 'money-off'; color = '#f97316'; label = 'Cash Refunded Out'; }
    if (isPayment && isCreditNote) { 
      icon = 'account-balance-wallet'; 
      color = '#0284c7'; 
      label = tx.method === 'Credit Adjustment' ? 'Manual Credit Adj.' : 
              tx.method === 'Advance Reversal' ? 'Credit Adjusted' : 'Return Credit'; 
    }
    if (isOrder)   { icon = 'shopping-bag'; color = '#ec5b13'; label = 'Order'; }
    if (isChallan) { icon = 'local-shipping'; color = '#64748b'; label = 'Challan'; }

    if (isInvoice) {
      const computedStatus = invoiceBalance === 0 ? 'Paid' : (invoiceBalance !== null && invoiceBalance < amount ? 'Partial' : (tx.status || 'Sent'));
      const st = computedStatus.toLowerCase();
      if (st === 'paid')    { statusColor = '#10b981'; statusBg = '#f0fdf4'; }
      else if (st === 'partial') { statusColor = '#d97706'; statusBg = '#fffbeb'; }
      else if (st === 'overdue') { statusColor = '#f43f5e'; statusBg = '#fef2f2'; }
      else { statusColor = '#262A56'; statusBg = '#eef2ff'; }
    }

    return (
      <TouchableOpacity
        onPress={() => {
          if (isInvoice) navigation.navigate('InvoiceDetail', { invoiceId: tx.id });
          if (isOrder)   navigation.navigate('OrderDetail', { orderId: tx.id });
        }}
        className="bg-white dark:bg-slate-900 rounded-3xl mb-4 border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
      >
        <View className="flex-row items-center gap-4 p-5 pb-3">
          <View style={{ backgroundColor: color + '15', width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name={icon} size={24} color={color} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <Text className="font-black text-[#262A56] dark:text-white text-[15px]">{label}</Text>
              {isInvoice && tx.status ? (
                <View style={{ backgroundColor: statusBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: statusColor, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {invoiceBalance === 0 ? 'PAID' : (invoiceBalance !== null && invoiceBalance < amount ? 'PARTIAL' : tx.status.toUpperCase())}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text className="text-slate-400 text-xs font-bold mt-1" numberOfLines={1}>REF: #{number}</Text>
          </View>
        </View>

        <View className="flex-row items-end justify-between px-5 pb-5 pt-1">
          <View>
            <Text style={{ fontSize: 9, color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              {isPayment ? (amount < 0 ? 'Deducted' : 'Amount') : 'Net Amount'}
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: isPayment ? (amount < 0 ? '#f43f5e' : '#10b981') : '#262A56' }}>
              {isPayment && amount > 0 ? '+' : ''}{formatAmount(amount, profile.currency_symbol || '₹')}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <View className="flex-row items-center gap-1.5 mb-2">
              <MaterialIcons name="schedule" size={12} color="#94a3b8" />
              <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '700' }}>{displayTime || '—'}</Text>
            </View>
            {isInvoice && invoiceBalance !== null ? (
              invoiceBalance === 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#10b98110' }}>
                  <MaterialIcons name="check-circle" size={14} color="#10b981" />
                  <Text style={{ fontSize: 11, color: '#10b981', fontWeight: '900' }}>FULLY PAID</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef2f2', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#f43f5e10' }}>
                  <MaterialIcons name="account-balance-wallet" size={14} color="#f43f5e" />
                  <Text style={{ fontSize: 11, color: '#f43f5e', fontWeight: '900' }}>DUE {formatAmount(invoiceBalance, profile.currency_symbol || '₹')}</Text>
                </View>
              )
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark pt-12">
      <View className="flex-1">
        
        {/* Premium App Header */}
        <View style={{ backgroundColor: '#262A56', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 }}>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 rounded-full">
              <MaterialIcons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-xl font-black ml-4 text-white letter-spacing-[-0.5px]">Customer Profile</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity className="p-2 bg-white/10 rounded-xl">
              <MaterialIcons name="search" size={22} color="white" />
            </TouchableOpacity>
            <TouchableOpacity className="p-2 bg-white/10 rounded-xl">
              <MaterialIcons name="more-vert" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1" stickyHeaderIndices={[2]}>
          
          {/* Ultra Premium Identity Card */}
          <View className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 pb-2">
            
            <View className="p-6">
              <TouchableOpacity 
                onPress={() => navigation.navigate('EditCustomerProfile', { customer })} 
                activeOpacity={0.7} 
                className="flex-row items-center gap-5 mb-2 bg-[#f8fafc] dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
              >
                <View className="bg-[#262A56] flex items-center justify-center rounded-[22px] h-20 w-20 shadow-lg border-2 border-white">
                  <Text className="text-white font-black text-2xl tracking-tighter">{getInitials(customer.name)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[26px] font-black tracking-tight text-[#262A56] dark:text-white" numberOfLines={1}>{customer.name}</Text>
                  
                  <View className="flex-row items-center justify-between mt-2">
                    <View>
                      <View className="flex-row items-center gap-1.5 mb-1">
                        <MaterialIcons name="phone" size={12} color="#64748b" />
                        <Text className="text-slate-600 dark:text-slate-400 font-bold text-xs">{customer.phone || 'No phone'}</Text>
                      </View>
                      <View className="flex-row items-center gap-1.5">
                        <MaterialIcons name="mail" size={12} color="#64748b" />
                        <Text className="text-slate-500 dark:text-slate-500 text-[10px] font-semibold" numberOfLines={1}>{customer.email || 'No email'}</Text>
                      </View>
                    </View>
                    
                    <View className="flex-row items-center gap-1.5">
                      <MaterialIcons name="chevron-right" size={20} color="#cbd5e1" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Quick Communication Pill Strip */}
              {customer.phone && (
                <View className="flex-row items-center gap-2 mt-2 px-1">
                  <TouchableOpacity 
                    onPress={() => Linking.openURL(`tel:${customer.phone}`)}
                    className="flex-1 flex-row items-center justify-center gap-2 bg-[#f1f5f9] dark:bg-slate-800 h-10 rounded-2xl border border-slate-200 dark:border-slate-700"
                  >
                    <MaterialIcons name="call" size={16} color="#262A56" />
                    <Text className="text-[#262A56] dark:text-slate-300 font-black text-[10px] uppercase tracking-widest">Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => Linking.openURL(`whatsapp://send?phone=${customer.phone}`)}
                    className="flex-1 flex-row items-center justify-center gap-2 bg-[#f1f5f9] dark:bg-slate-800 h-10 rounded-2xl border border-slate-200 dark:border-slate-700"
                  >
                    <MaterialIcons name="chat" size={16} color="#16a34a" />
                    <Text className="text-[#16a34a] font-black text-[10px] uppercase tracking-widest">WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Floating Action Capsule Pills */}
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => setShowReceiveModal(true)}
                style={{ flex: 1.2, backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 24, shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 }}
              >
                <MaterialIcons name="payments" size={18} color="white" />
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Receive</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowGiveModal(true)}
                style={{ flex: 1.2, backgroundColor: '#f43f5e', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 24, shadowColor: '#f43f5e', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 }}
              >
                <MaterialIcons name="add-circle" size={18} color="white" />
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Add Due</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => navigation.navigate('CreateInvoice', { customerId: customer.id })} 
                style={{ width: 48, height: 48, backgroundColor: '#262A56', borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 }}
              >
                <MaterialIcons name="receipt-long" size={20} color="white" />
              </TouchableOpacity>
            </View>

            {/* Premium Financial Summary Cards (Strict Red/Green Guidelines) */}
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 24 }}>
              {/* YOU'LL GET (Balance Due -> ROSE) */}
              <View style={{
                flex: 1, backgroundColor: '#fff', borderRadius: 24, padding: 20,
                borderTopWidth: 6, borderTopColor: '#f43f5e',
                shadowColor: '#f43f5e', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
                borderWidth: 1, borderColor: '#f43f5e15'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <View style={{ backgroundColor: '#f43f5e15', p: 4, borderRadius: 8 }}>
                    <MaterialIcons name="call-received" size={14} color="#f43f5e" />
                  </View>
                  <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>You'll Get</Text>
                </View>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#f43f5e' }} numberOfLines={1} adjustsFontSizeToFit>
                  {profile.currency_symbol || '₹'} {formatAmount(totalDue)}
                </Text>
                <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, fontWeight: '700' }}>
                  {totalDue > 0 ? 'DUE PAYMENT' : 'SETTLED'}
                </Text>
              </View>

              {/* YOU'LL GIVE (Advance / Wallet → EMERALD) */}
              <View style={{
                flex: 1, backgroundColor: '#fff', borderRadius: 24, padding: 16,
                borderTopWidth: 6, borderTopColor: '#10b981',
                shadowColor: '#10b981', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
                borderWidth: 1, borderColor: '#10b98115'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <View style={{ backgroundColor: '#10b98115', p: 4, borderRadius: 8 }}>
                    <MaterialIcons name="call-made" size={14} color="#10b981" />
                  </View>
                  <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>You'll Give</Text>
                </View>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#10b981', marginBottom: 2 }} numberOfLines={1} adjustsFontSizeToFit>
                  {profile.currency_symbol || '₹'} {formatAmount(creditBalance + walletBalance)}
                </Text>
                <Text style={{ fontSize: 10, color: '#94a3b8', marginBottom: 10, fontWeight: '700' }}>
                  {creditBalance + walletBalance > 0 ? 'ADVANCE CREDIT' : 'CLEAN'}
                </Text>
                {/* Wallet action buttons — only show when there's credit */}
                {(creditBalance + walletBalance) > 0 && (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => setShowAdjustWalletModal(true)}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                        gap: 4, backgroundColor: '#f0fdf4', borderRadius: 10, paddingVertical: 7,
                        borderWidth: 1, borderColor: '#bbf7d0',
                      }}
                    >
                      <MaterialIcons name="tune" size={13} color="#16a34a" />
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#16a34a' }}>Adjust</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowCashRefundModal(true)}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                        gap: 4, backgroundColor: '#fff7ed', borderRadius: 10, paddingVertical: 7,
                        borderWidth: 1, borderColor: '#fed7aa',
                      }}
                    >
                      <MaterialIcons name="money-off" size={13} color="#ea580c" />
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#ea580c' }}>Refund</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

          </View>

          {/* Premium Tabs Navigation */}
          <View className="bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row px-4">
                {['Payments', 'Invoices', 'Ledger', 'Details'].map(tab => (
                  <TouchableOpacity 
                    key={tab} 
                    onPress={() => setActiveTab(tab)}
                    className={`py-4 px-3 mr-2 border-b-4 ${activeTab === tab ? 'border-[#262A56]' : 'border-transparent'}`}
                  >
                    <Text className={`text-xs uppercase tracking-widest ${activeTab === tab ? 'text-[#262A56] font-black' : 'text-slate-400 font-bold'}`}>
                      {tab}{tab === 'Invoices' && customerInvoices.length > 0 ? ` (${customerInvoices.length})` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Tab Content */}
          <View className="flex-1">
            {activeTab === 'Ledger' && (
              <View style={{ flex: 1 }}>
                {isLoadingLedger ? (
                  <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#262A56" />
                    <Text style={{ color: '#94a3b8', marginTop: 12, fontWeight: '700', fontSize: 12, textTransform: 'uppercase' }}>Loading Ledger...</Text>
                  </View>
                ) : ledgerEntries.length === 0 ? (
                  <View style={{ paddingVertical: 80, alignItems: 'center' }}>
                    <View className="bg-slate-50 p-6 rounded-full mb-4">
                      <MaterialIcons name="menu-book" size={48} color="#cbd5e1" />
                    </View>
                    <Text style={{ color: '#262A56', fontWeight: '900', fontSize: 18 }}>No entry found</Text>
                    <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 4, fontWeight: '600' }}>Invoices and payments appear here</Text>
                  </View>
                ) : (
                  <View style={{ flex: 1 }}>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      backgroundColor: walletBalance > 0 ? '#10b98110' : '#f8fafc',
                      borderBottomWidth: 1, borderBottomColor: walletBalance > 0 ? '#10b98120' : '#e2e8f0',
                      paddingHorizontal: 20, paddingVertical: 12,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name="account-balance-wallet" size={16} color={walletBalance > 0 ? '#10b981' : '#94a3b8'} />
                        <Text style={{ fontSize: 11, fontWeight: '900', color: walletBalance > 0 ? '#10b981' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Wallet Credit</Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: walletBalance > 0 ? '#10b981' : '#94a3b8' }}>
                        {formatAmount(walletBalance, profile.currency_symbol || '₹')}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                      <Text style={{ flex: 2, fontSize: 9, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Date / Entry</Text>
                      <Text style={{ width: 72, textAlign: 'right', fontSize: 9, fontWeight: '900', color: '#f43f5e', textTransform: 'uppercase', letterSpacing: 1 }}>Debit</Text>
                      <Text style={{ width: 72, textAlign: 'right', fontSize: 9, fontWeight: '900', color: '#10b981', textTransform: 'uppercase', letterSpacing: 1 }}>Credit</Text>
                      <Text style={{ width: 80, textAlign: 'right', fontSize: 10, fontWeight: '900', color: '#262A56', textTransform: 'uppercase', letterSpacing: 1 }}>Balance</Text>
                    </View>

                    <View>
                      {ledgerEntries.map((entry, idx) => {
                        const isLast = idx === ledgerEntries.length - 1;
                        const entryTypeLabels = {
                          INVOICE_CREATED: { label: 'Invoice', color: '#262A56', icon: 'receipt' },
                          PAYMENT_RECEIVED: { label: 'Payment', color: '#10b981', icon: 'payments' },
                          ITEM_RETURNED: { label: 'Return', color: '#f97316', icon: 'assignment-return' },
                          WALLET_CREDIT: { label: 'Wallet+', color: '#10b981', icon: 'account-balance-wallet' },
                          WALLET_DEBIT: { label: 'Wallet-', color: '#f43f5e', icon: 'remove-circle' },
                          CASH_REFUND_OUT: { label: 'Refund', color: '#f97316', icon: 'money-off' },
                          ORDER_CANCELLED: { label: 'Cancel', color: '#64748b', icon: 'cancel' },
                        };
                        const meta = entryTypeLabels[entry.entry_type] || { label: entry.entry_type, color: '#64748b', icon: 'circle' };
                        const debit = parseFloat(entry.debit || 0);
                        const credit = parseFloat(entry.credit || 0);
                        const runBal = parseFloat(entry.running_balance || 0);
                        const dateStr = entry.created_at
                          ? new Date(entry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                          : '';

                        return (
                          <View
                            key={entry.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 16,
                              paddingVertical: 14,
                              borderBottomWidth: 1,
                              borderBottomColor: '#f8fafc',
                              backgroundColor: isLast ? '#fafbff' : 'white',
                            }}
                          >
                            <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: meta.color + '10', alignItems: 'center', justifyContent: 'center' }}>
                                <MaterialIcons name={meta.icon} size={16} color={meta.color} />
                              </View>
                              <View>
                                <Text style={{ fontSize: 12, fontWeight: '900', color: '#262A56' }}>{meta.label}</Text>
                                <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>{dateStr}</Text>
                              </View>
                            </View>
                            <Text style={{ width: 72, textAlign: 'right', fontSize: 12, fontWeight: '850', color: debit > 0 ? '#f43f5e' : '#cbd5e1' }}>
                              {debit > 0 ? formatAmount(debit, profile.currency_symbol || '₹') : '—'}
                            </Text>
                            <Text style={{ width: 72, textAlign: 'right', fontSize: 12, fontWeight: '850', color: credit > 0 ? '#10b981' : '#cbd5e1' }}>
                              {credit > 0 ? formatAmount(credit, profile.currency_symbol || '₹') : '—'}
                            </Text>
                            <View style={{ width: 80, alignItems: 'flex-end' }}>
                              <Text style={{
                                fontSize: 13, fontWeight: '900',
                                color: runBal > 0 ? '#f43f5e' : runBal < -0.01 ? '#10b981' : '#94a3b8'
                              }}>
                                {formatAmount(Math.abs(runBal), profile.currency_symbol || '₹')}
                              </Text>
                              <Text style={{ fontSize: 7, fontWeight: '900', color: runBal > 0.01 ? '#f43f5e' : runBal < -0.01 ? '#10b981' : '#94a3b8', textTransform: 'uppercase' }}>
                                {runBal > 0.01 ? 'Dr' : runBal < -0.01 ? 'Cr' : ''}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'Details' && (
              <View className="p-6 space-y-6">
                <View className="mb-6">
                  <View className="flex-row items-center gap-2 mb-4">
                    <View className="bg-[#262A56]/10 p-2 rounded-lg">
                      <MaterialIcons name="location-on" size={18} color="#262A56" />
                    </View>
                    <Text className="text-[#262A56] dark:text-white font-black uppercase text-[10px] tracking-widest">Billing Address</Text>
                  </View>
                  <View className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <Text className="text-slate-600 dark:text-slate-300 leading-relaxed font-bold">
                      {customer.address || "No address provided"}
                    </Text>
                  </View>
                </View>

                <View className="mb-6">
                  <View className="flex-row items-center gap-2 mb-4">
                    <View className="bg-[#262A56]/10 p-2 rounded-lg">
                      <MaterialIcons name="contact-phone" size={18} color="#262A56" />
                    </View>
                    <Text className="text-[#262A56] dark:text-white font-black uppercase text-[10px] tracking-widest">Primary Contact</Text>
                  </View>
                  <View className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex-row justify-between items-center">
                    <View>
                      <Text className="font-black text-[#262A56] dark:text-white text-lg">{customer.name}</Text>
                      <Text className="text-xs text-slate-400 font-bold uppercase tracking-wider">Main Contact Person</Text>
                    </View>
                    {customer.phone && (
                      <TouchableOpacity onPress={() => Linking.openURL(`tel:${customer.phone}`)} className="bg-[#262A56] p-3 rounded-2xl shadow-lg shadow-[#262A56]/40">
                        <MaterialIcons name="call" size={20} color="white" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View className="mb-10">
                  <View className="flex-row items-center gap-2 mb-4">
                    <View className="bg-[#262A56]/10 p-2 rounded-lg">
                      <MaterialIcons name="notes" size={18} color="#262A56" />
                    </View>
                    <Text className="text-[#262A56] dark:text-white font-black uppercase text-[10px] tracking-widest">Internal Notes</Text>
                  </View>
                  <View className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <Text className="text-slate-500 dark:text-slate-400 font-bold italic">
                      {customer.notes || "No internal notes recorded for this customer."}
                    </Text>
                  </View>
                </View>

                {/* Danger Zone */}
                {checkPermission(currentRole, 'canDeleteRecords') && (
                  <View className="mb-20">
                    <TouchableOpacity 
                      onPress={handleDelete}
                      className="flex-row items-center justify-center gap-3 p-5 rounded-3xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50"
                    >
                      <MaterialIcons name="delete-outline" size={22} color="#f43f5e" />
                      <Text className="text-[#f43f5e] font-black uppercase tracking-widest">Delete Customer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'Payments' && (
              <View className="p-4 pb-20">
                {allTransactions.length === 0 ? (
                  <View className="items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <MaterialIcons name="payments" size={56} color="#cbd5e1" />
                    <Text style={{ color: '#262A56', fontWeight: '900', fontSize: 16, marginTop: 16 }}>No Payments Yet</Text>
                    <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600', marginTop: 4 }}>Payments received, dues and credits appear here</Text>
                  </View>
                ) : (
                  <View>
                    <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-4 px-1">
                      Money Movement
                    </Text>
                    {allTransactions.map((tx) => (
                      <TransactionItem key={`${tx.transactionType}-${tx.id}`} tx={tx} />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ── INVOICES TAB ──────────────────────────────────────────── */}
            {activeTab === 'Invoices' && (() => {
              const sym = profile.currency_symbol || '₹';
              const sorted = [...customerInvoices].sort((a, b) => {
                const da = new Date(a.created_at || a.date || 0);
                const db = new Date(b.created_at || b.date || 0);
                return db - da;
              });
              const pendingCount = sorted.filter(inv =>
                inv.status !== 'Paid' && inv.status !== 'Cancelled' && inv.return_status !== 'FULL'
              ).length;
              const totalRevenue = sorted
                .filter(inv => inv.status !== 'Cancelled')
                .reduce((s, inv) => s + (parseFloat(inv.total) || 0), 0);

              const INV_STATUS_STYLE = {
                Paid:      { bg: '#dcfce7', text: '#15803d' },
                Partial:   { bg: '#fef9c3', text: '#a16207' },
                Draft:     { bg: '#f1f5f9', text: '#475569' },
                Sent:      { bg: '#dbeafe', text: '#1d4ed8' },
                Overdue:   { bg: '#fee2e2', text: '#dc2626' },
                Pending:   { bg: '#fff7ed', text: '#c2410c' },
                Cancelled: { bg: '#f4f4f5', text: '#71717a' },
                Returned:  { bg: '#f5f3ff', text: '#7c3aed' },
              };

              return (
                <View style={{ paddingBottom: 80 }}>
                  {/* Summary header */}
                  <View style={{
                    flexDirection: 'row', gap: 10,
                    padding: 16, paddingBottom: 8,
                  }}>
                    <View style={{
                      flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14,
                      borderWidth: 1, borderColor: '#f1f5f9',
                      alignItems: 'center',
                    }}>
                      <Text style={{ fontSize: 22, fontWeight: '900', color: '#262A56' }}>{sorted.length}</Text>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Total Bills</Text>
                    </View>
                    <View style={{
                      flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14,
                      borderWidth: 1, borderColor: '#fef9c3',
                      alignItems: 'center',
                    }}>
                      <Text style={{ fontSize: 22, fontWeight: '900', color: '#d97706' }}>{pendingCount}</Text>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Pending</Text>
                    </View>
                    <View style={{
                      flex: 1.4, backgroundColor: '#fff', borderRadius: 16, padding: 14,
                      borderWidth: 1, borderColor: '#dcfce7',
                      alignItems: 'center',
                    }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#15803d' }} numberOfLines={1} adjustsFontSizeToFit>
                        {sym}{Math.round(totalRevenue).toLocaleString('en-IN')}
                      </Text>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Revenue</Text>
                    </View>
                  </View>

                  {sorted.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                      <MaterialIcons name="receipt-long" size={56} color="#e2e8f0" />
                      <Text style={{ color: '#64748b', fontWeight: '900', fontSize: 16, marginTop: 16 }}>No Invoices Yet</Text>
                      <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600', marginTop: 4 }}>Tap below to create the first bill</Text>
                      <TouchableOpacity
                        onPress={() => navigation.navigate('CreateInvoice', { customerId: customer.id })}
                        style={{ marginTop: 20, backgroundColor: '#262A56', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>+ Create Invoice</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
                      {sorted.map((inv, idx) => {
                        const invBal = invoiceDueMap[inv.id];
                        const rawBal = invBal !== undefined ? invBal : Math.max(0, (parseFloat(inv.total) || 0));
                        const isReturned = inv.return_status === 'FULL';
                        let displayStatus = isReturned ? 'Returned' : (rawBal <= 0 && inv.status !== 'Cancelled' && inv.status !== 'Draft' ? 'Paid' : inv.status);
                        const sc = INV_STATUS_STYLE[displayStatus] || INV_STATUS_STYLE.Draft;
                        const invTotal = parseFloat(inv.total) || 0;
                        const rawDate = inv.created_at || inv.date || '';
                        const dateStr = rawDate
                          ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                          : '';
                        const invNum = inv.invoiceNumber || inv.invoice_number || `#${inv.id?.slice(-4)}`;

                        return (
                          <TouchableOpacity
                            key={inv.id}
                            onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: inv.id })}
                            style={{
                              backgroundColor: '#fff',
                              borderRadius: 16,
                              marginBottom: 10,
                              borderWidth: 1,
                              borderColor: '#f1f5f9',
                              overflow: 'hidden',
                            }}
                          >
                            {/* Row: invoice num + status */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                                  <MaterialIcons name="receipt-long" size={16} color="#262A56" />
                                </View>
                                <View>
                                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#262A56' }}>{invNum}</Text>
                                  <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 1 }}>{dateStr}</Text>
                                </View>
                              </View>
                              <View style={{ backgroundColor: sc.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                <Text style={{ fontSize: 10, fontWeight: '900', color: sc.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>{displayStatus}</Text>
                              </View>
                            </View>

                            {/* Row: total + due */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4 }}>
                              <View>
                                <Text style={{ fontSize: 9, color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 }}>Total</Text>
                                <Text style={{ fontSize: 17, fontWeight: '900', color: '#262A56', marginTop: 2 }}>{sym}{invTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                              </View>
                              {rawBal > 0 && inv.status !== 'Cancelled' && !isReturned ? (
                                <View style={{ alignItems: 'flex-end' }}>
                                  <Text style={{ fontSize: 9, color: '#f43f5e', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 }}>Balance Due</Text>
                                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#f43f5e', marginTop: 2 }}>{sym}{rawBal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                </View>
                              ) : inv.status !== 'Cancelled' && !isReturned ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                                  <MaterialIcons name="check-circle" size={13} color="#16a34a" />
                                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#16a34a' }}>SETTLED</Text>
                                </View>
                              ) : null}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                      {/* Create new invoice shortcut */}
                      <TouchableOpacity
                        onPress={() => navigation.navigate('CreateInvoice', { customerId: customer.id })}
                        style={{
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                          borderWidth: 1.5, borderColor: '#262A56', borderStyle: 'dashed',
                          borderRadius: 16, paddingVertical: 14, marginTop: 4,
                        }}
                      >
                        <MaterialIcons name="add" size={18} color="#262A56" />
                        <Text style={{ color: '#262A56', fontWeight: '900', fontSize: 13 }}>Create New Invoice</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
        </ScrollView>
      </View>

      {/* ── Receive Payment Modal ── */}
      <Modal visible={showReceiveModal} transparent animationType="slide" onRequestClose={() => setShowReceiveModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View className="bg-white dark:bg-slate-900 rounded-t-[36px] p-6">
            {/* Handle */}
            <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-5" />

            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-black text-[#262A56]">Receive Payment</Text>
              <TouchableOpacity onPress={() => setShowReceiveModal(false)} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Customer badge */}
            <View className="flex-row items-center gap-3 mb-5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <View className="w-10 h-10 rounded-full bg-[#262A56] items-center justify-center opacity-10">
                <Text className="text-[#262A56] font-black text-sm">{customer.name.slice(0,2).toUpperCase()}</Text>
              </View>
              <View>
                <Text className="font-black text-[#262A56]">{customer.name}</Text>
                <Text style={{ color: '#ef4444' }} className="text-xs font-bold">Outstanding: {formatAmount(totalDue, profile.currency_symbol || '₹')}</Text>
              </View>
            </View>

            {/* Amount input */}
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount Received</Text>
            <View className="flex-row items-center bg-slate-50 border-2 border-[#262A56] rounded-2xl px-4 mb-5">
              <Text className="text-2xl font-black text-[#262A56] mr-2">{profile.currency_symbol || '₹'}</Text>
              <TextInput
                value={receiveAmount}
                onChangeText={setReceiveAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                className="flex-1 text-2xl font-black text-[#262A56] py-4"
                autoFocus
              />
            </View>

            {/* Payment method */}
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Method</Text>
            <TouchableOpacity
              onPress={() => setShowMethodPicker(true)}
              className="flex-row items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-5"
            >
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="payments" size={20} color="#059669" />
                <Text className="font-bold text-slate-800">{receiveMethod}</Text>
              </View>
              <MaterialIcons name="keyboard-arrow-down" size={20} color="#94a3b8" />
            </TouchableOpacity>

            {/* Notes */}
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Notes (Optional)</Text>
            <TextInput
              value={receiveNotes}
              onChangeText={setReceiveNotes}
              placeholder="e.g. Paid via GPay"
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-medium text-slate-800 mb-6"
            />

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleReceivePayment}
              disabled={isSavingPayment}
              className="bg-emerald-500 rounded-2xl h-14 items-center justify-center shadow-lg"
            >
              <Text className="text-white font-black text-base uppercase tracking-widest">
                {isSavingPayment ? 'Saving...' : 'Save Payment'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Method Picker Sub-Modal ── */}
      <Modal visible={showMethodPicker} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View className="bg-white rounded-t-[36px] p-6">
            <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-5" />
            <Text className="text-xl font-black text-[#262A56] mb-4">Select Method</Text>
            {paymentMethods.map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => { setReceiveMethod(m); setShowMethodPicker(false); }}
                className={`flex-row items-center justify-between py-4 border-b border-slate-50 ${receiveMethod === m ? 'opacity-100' : 'opacity-70'}`}
              >
                <Text className={`text-base font-bold ${receiveMethod === m ? 'text-[#262A56]' : 'text-slate-700'}`}>{m}</Text>
                {receiveMethod === m && <MaterialIcons name="check-circle" size={22} color="#121642" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowMethodPicker(false)} className="mt-4 bg-slate-100 rounded-xl py-4 items-center">
              <Text className="font-bold text-slate-600">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      {/* ── Adjust Wallet Modal ── */}
      <Modal visible={showAdjustWalletModal} transparent animationType="slide" onRequestClose={() => setShowAdjustWalletModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View className="bg-white dark:bg-slate-900 rounded-t-[36px] p-6 pb-12">
            <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-5" />
            <View className="flex-row items-center justify-between mb-5">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 8 }}>
                  <MaterialIcons name="tune" size={20} color="#16a34a" />
                </View>
                <Text className="text-xl font-black text-[#262A56]">Adjust Credit</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAdjustWalletModal(false)} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Current balance */}
            <View style={{ backgroundColor: '#f0fdf4', borderRadius: 16, padding: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#15803d', textTransform: 'uppercase', letterSpacing: 0.8 }}>Current Credit</Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#15803d' }}>{profile.currency_symbol || '₹'}{(creditBalance + walletBalance).toFixed(2)}</Text>
            </View>

            {/* Add / Subtract toggle */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {[{ key: 'add', label: '+ Add Credit', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }, { key: 'subtract', label: '− Remove Credit', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' }].map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setAdjustType(opt.key)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                    backgroundColor: adjustType === opt.key ? opt.bg : '#f8fafc',
                    borderWidth: 1.5,
                    borderColor: adjustType === opt.key ? opt.border : '#e2e8f0',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '900', color: adjustType === opt.key ? opt.color : '#94a3b8' }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#262A56', borderRadius: 16, paddingHorizontal: 16, marginBottom: 12 }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#262A56', marginRight: 8 }}>{profile.currency_symbol || '₹'}</Text>
              <TextInput
                value={adjustAmount}
                onChangeText={setAdjustAmount}
                keyboardType="numeric"
                placeholder="0.00"
                style={{ flex: 1, fontSize: 22, fontWeight: '900', color: '#262A56', paddingVertical: 14 }}
                autoFocus
              />
            </View>

            {/* Reason — mandatory */}
            <TextInput
              value={adjustNotes}
              onChangeText={setAdjustNotes}
              placeholder="Reason for adjustment (required)..."
              style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 13, marginBottom: 18, color: '#1e293b' }}
              multiline
            />

            <TouchableOpacity
              onPress={handleAdjustWalletBalance}
              disabled={isAdjustingWallet}
              style={{ backgroundColor: '#262A56', borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {isAdjustingWallet ? 'Saving...' : 'Confirm Adjustment'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Cash Refund Modal ───────────────────────────────────────── */}
      <Modal visible={showCashRefundModal} transparent animationType="slide" onRequestClose={() => setShowCashRefundModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View className="bg-white rounded-t-[36px] p-6 pb-12">
            <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-5" />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ backgroundColor: '#fff7ed', borderRadius: 12, padding: 8 }}>
                  <MaterialIcons name="money-off" size={20} color="#ea580c" />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#262A56' }}>Refund to Cash</Text>
                  <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 2 }}>Credit → Physical Cash</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowCashRefundModal(false)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Available credit */}
            <View style={{ backgroundColor: '#fff7ed', borderRadius: 16, padding: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#fed7aa' }}>
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#c2410c', textTransform: 'uppercase', letterSpacing: 0.8 }}>Available Credit</Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#ea580c' }}>{profile.currency_symbol || '₹'}{(creditBalance + walletBalance).toFixed(2)}</Text>
            </View>

            {/* Warning */}
            <View style={{ backgroundColor: '#fef9c3', borderRadius: 12, padding: 12, marginBottom: 14, flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: '#fde68a' }}>
              <MaterialIcons name="warning-amber" size={16} color="#a16207" />
              <Text style={{ flex: 1, fontSize: 11, color: '#a16207', fontWeight: '600', lineHeight: 16 }}>
                This permanently converts credit to cash. The credit balance will be reduced. Make sure to hand the cash physically.
              </Text>
            </View>

            {/* Amount */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#ea580c', borderRadius: 16, paddingHorizontal: 16, marginBottom: 12 }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#ea580c', marginRight: 8 }}>{profile.currency_symbol || '₹'}</Text>
              <TextInput
                value={refundAmount}
                onChangeText={setRefundAmount}
                keyboardType="numeric"
                placeholder="0.00"
                style={{ flex: 1, fontSize: 22, fontWeight: '900', color: '#ea580c', paddingVertical: 14 }}
                autoFocus
              />
            </View>

            <TextInput
              value={refundNotes}
              onChangeText={setRefundNotes}
              placeholder="Refund reason / notes (optional)..."
              style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 13, marginBottom: 18, color: '#1e293b' }}
              multiline
            />

            <TouchableOpacity
              onPress={handleCashRefund}
              disabled={isRefunding}
              style={{ backgroundColor: '#ea580c', borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
            >
              <MaterialIcons name="money-off" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {isRefunding ? 'Processing...' : 'Confirm Cash Refund'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Add Due Modal ── */}
      <Modal visible={showGiveModal} transparent animationType="slide" onRequestClose={() => setShowGiveModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View className="bg-white dark:bg-slate-900 rounded-t-[36px] p-6 pb-10">
            {/* Handle */}
            <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-5" />

            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center gap-3">
                <View style={{ backgroundColor: '#fef2f2', borderRadius: 12, padding: 8 }}>
                  <MaterialIcons name="add-circle" size={22} color="#ef4444" />
                </View>
                <Text className="text-2xl font-black" style={{ color: '#ef4444' }}>Add Due</Text>
              </View>
              <TouchableOpacity onPress={() => { setShowGiveModal(false); setGiveDueDate(''); }} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Info banner */}
            <View style={{ backgroundColor: '#fef2f2', borderRadius: 16, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: '#fecaca' }}>
              <Text style={{ color: '#b91c1c', fontSize: 12, fontWeight: '700', lineHeight: 18 }}>
                📋 Adding a due entry for {customer.name}. This amount will appear in their Balance Due.
              </Text>
            </View>

            {/* Amount input */}
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Due Amount</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff5f5', borderWidth: 2, borderColor: '#ef4444', borderRadius: 16, paddingHorizontal: 16, marginBottom: 16 }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#ef4444', marginRight: 8 }}>{profile.currency_symbol || '₹'}</Text>
              <TextInput
                value={giveAmount}
                onChangeText={setGiveAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                style={{ flex: 1, fontSize: 24, fontWeight: '900', color: '#ef4444', paddingVertical: 16 }}
                autoFocus
              />
            </View>

            {/* Due Date */}
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Due Date (Optional)</Text>
            <TouchableOpacity
              onPress={() => setShowGiveDatePicker(true)}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: giveDueDate ? '#f0fdf4' : '#f8fafc',
                borderWidth: 1.5, borderColor: giveDueDate ? '#86efac' : '#e2e8f0',
                borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="event" size={20} color={giveDueDate ? '#16a34a' : '#94a3b8'} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: giveDueDate ? '#15803d' : '#94a3b8' }}>
                  {giveDueDate
                    ? new Date(giveDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'Select repayment date'
                  }
                </Text>
              </View>
              {giveDueDate ? (
                <TouchableOpacity onPress={() => setGiveDueDate('')}>
                  <MaterialIcons name="close" size={18} color="#94a3b8" />
                </TouchableOpacity>
              ) : (
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              )}
            </TouchableOpacity>

            {/* Notes */}
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Notes (Optional)</Text>
            <TextInput
              value={giveNotes}
              onChangeText={setGiveNotes}
              placeholder="e.g. Material credit, advance goods..."
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-medium text-slate-800 mb-6"
            />

            {/* Confirm Button */}
            <TouchableOpacity
              onPress={handleAddDue}
              disabled={isSavingGive}
              style={{ backgroundColor: isSavingGive ? '#fca5a5' : '#ef4444', borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                {isSavingGive ? 'Saving...' : `Add Due ${giveAmount ? `${profile.currency_symbol || '₹'}${giveAmount}` : ''}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Add Due Date Picker ── */}
      <DatePickerModal
        visible={showGiveDatePicker}
        selectedDate={giveDueDate || new Date().toISOString().split('T')[0]}
        onClose={() => setShowGiveDatePicker(false)}
        onSelect={(dateStr) => setGiveDueDate(dateStr)}
      />
    </SafeAreaView>
  );
}
