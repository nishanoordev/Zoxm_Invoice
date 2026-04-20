import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Platform, Alert, Modal, FlatList } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { formatAmount } from '../utils/formatters';

export default function RecordPaymentScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { invoice: initialInvoice, mode } = route.params || {};
  const isCreditNote = mode === 'credit_note';
  
  const profile = useStore(state => state.profile);
  const customers = useStore(state => state.customers);
  const invoices = useStore(state => state.invoices);
  const payments = useStore(state => state.payments);
  const addPayment = useStore(state => state.addPayment);
  const updateInvoice = useStore(state => state.updateInvoice);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialInvoice?.customerId || initialInvoice?.customer_id || null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(initialInvoice?.id || null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(isCreditNote ? 'Credit Note' : 'Cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedCustomerId), 
  [customers, selectedCustomerId]);

  const selectedInvoice = useMemo(() => 
    invoices.find(inv => inv.id === selectedInvoiceId), 
  [invoices, selectedInvoiceId]);

  const customerInvoices = useMemo(() => {
    if (!selectedCustomerId) return [];
    return invoices.filter(inv => {
      const isSettled = inv.status === 'Paid' || inv.status === 'Returned' || inv.status === 'Cancelled';
      if (isSettled) return false;
      if (inv.customerId !== selectedCustomerId && inv.customer_id !== selectedCustomerId) return false;
      // Also exclude invoices where the computed balance is already 0
      const paid = payments
        .filter(p => String(p.invoiceId || p.invoice_id) === String(inv.id))
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const balance = Math.max(0, parseFloat(inv.total || 0) - paid);
      return balance > 0;
    });
  }, [invoices, payments, selectedCustomerId]);

  // Compute balance remaining on the selected invoice
  const invoiceDueBalance = useMemo(() => {
    if (!selectedInvoice) return 0;
    const paid = payments
      .filter(p => String(p.invoiceId || p.invoice_id) === String(selectedInvoice.id))
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    return Math.max(0, parseFloat(selectedInvoice.total || 0) - paid);
  }, [selectedInvoice, payments]);

  // Auto-fill amount with remaining balance when invoice changes
  useEffect(() => {
    if (selectedInvoice) {
      const paid = payments
        .filter(p => String(p.invoiceId || p.invoice_id) === String(selectedInvoice.id))
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const balance = Math.max(0, parseFloat(selectedInvoice.total || 0) - paid);
      setAmount(balance > 0 ? String(balance) : '');
    } else {
      setAmount('');
    }
  }, [selectedInvoice]);

  const handleSave = async () => {
    if (!selectedCustomerId) {
      Alert.alert('Error', 'Please select a customer.');
      return;
    }
    // ── Guard: block payment on a fully settled invoice ─────────────────────────
    if (selectedInvoice && invoiceDueBalance <= 0) {
      Alert.alert(
        '✅ Already Fully Paid',
        'This invoice has no remaining balance. No further payment is required.',
        [{ text: 'OK' }]
      );
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    try {
      // BUG-13 fix: set `type` explicitly so credit notes are correctly classified
      // in the payments table instead of defaulting to 'payment'.
      const paymentData = {
        invoiceId: selectedInvoice?.id || null,
        customerId: selectedCustomerId,
        customerName: selectedCustomer?.name || 'Walk-in Customer',
        amount: parseFloat(String(amount).replace(/,/g, '')) || 0,
        method: method,
        type: isCreditNote ? 'credit_note' : 'payment',
        date: date,
        notes: notes
      };

      await addPayment(paymentData);

      if (selectedInvoice) {
        // BUGFIX: After addPayment → loadFromDb(), the new payment IS already in allPayments.
        // Do NOT add newAmount again — that causes double-counting and premature 'Paid' status.
        const { payments: allPayments } = useStore.getState();
        const cumulativePaid = allPayments
          .filter(p => String(p.invoiceId || p.invoice_id) === String(selectedInvoice.id))
          .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const invoiceTotal = parseFloat(selectedInvoice.total || 0);

        if (cumulativePaid >= invoiceTotal) {
          await updateInvoice({ ...selectedInvoice, status: 'Paid' });
        } else {
          await updateInvoice({ ...selectedInvoice, status: 'Partial' });
        }
      }

      Alert.alert('Success', `${isCreditNote ? 'Credit Note' : 'Payment'} recorded successfully! [${formatAmount(amount, profile.currency_symbol || '₹')}]`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error('Error saving payment:', e);
      Alert.alert('Error', 'Failed to save payment record.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950 pt-12">
      <View className="flex-1 max-w-md mx-auto w-full">
        {/* Header */}
        <View className="flex-row items-center px-4 py-4 gap-4 border-b border-slate-100 dark:border-slate-800">
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            className="w-10 h-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800"
          >
            <MaterialIcons name="arrow-back" size={24} color="#262A56" className="dark:text-slate-200" />
          </TouchableOpacity>
          <Text className="text-xl font-black tracking-tight text-primary dark:text-white uppercase tracking-widest">
            {isCreditNote ? 'Create Credit Note' : 'Record Payment'}
          </Text>
        </View>

        <ScrollView className="flex-1 px-4 py-6" contentContainerStyle={{ paddingBottom: 120 }}>
          
          {/* Customer Selection */}
          <View className="mb-6">
            <Text className="text-sm font-black text-primary dark:text-slate-300 mb-2 ml-1 uppercase tracking-widest">Select Customer</Text>
            <TouchableOpacity 
              onPress={() => setShowCustomerModal(true)}
              className="flex-row items-center justify-between w-full rounded-[24px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5"
            >
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="person" size={22} color="#64748b" />
                <Text className={`text-base font-bold ${selectedCustomer ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                  {selectedCustomer ? selectedCustomer.name : 'Choose a customer'}
                </Text>
              </View>
              <MaterialIcons name="expand-more" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Invoice Selection */}
          <View className="mb-3">
            <Text className="text-sm font-black text-primary dark:text-slate-300 mb-2 ml-1 uppercase tracking-widest">Select Bill (Invoice)</Text>
            <TouchableOpacity 
              onPress={() => {
                if (!selectedCustomerId) {
                  Alert.alert('Note', 'Please select a customer first.');
                  return;
                }
                setShowInvoiceModal(true);
              }}
              className="flex-row items-center justify-between w-full rounded-[24px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5"
            >
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="description" size={22} color="#64748b" />
                <Text className={`text-base font-bold ${selectedInvoice ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                  {selectedInvoice
                    ? `${selectedInvoice.invoiceNumber || selectedInvoice.invoice_number} (${formatAmount(selectedInvoice.total, profile.currency_symbol || '₹')})`
                    : 'Choose a bill'}
                </Text>
              </View>
              <MaterialIcons name="expand-more" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Balance Due info chip — shown when invoice is selected */}
          {selectedInvoice && invoiceDueBalance > 0 && (
            <View className="flex-row items-center justify-between mb-6 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="account-balance-wallet" size={18} color="#b45309" />
                <Text className="text-amber-700 dark:text-amber-400 text-sm font-bold">Balance Due</Text>
              </View>
              <Text className="text-amber-800 dark:text-amber-300 text-lg font-black">
                {formatAmount(invoiceDueBalance, profile.currency_symbol || '₹')}
              </Text>
            </View>
          )}

          {/* Fully Paid banner — block the form visually */}
          {selectedInvoice && invoiceDueBalance <= 0 && (
            <View style={{
              backgroundColor: '#f0fdf4', borderRadius: 20, padding: 16, marginBottom: 24,
              flexDirection: 'row', alignItems: 'center', gap: 12,
              borderWidth: 1.5, borderColor: '#bbf7d0',
            }}>
              <MaterialIcons name="check-circle" size={28} color="#16a34a" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#16a34a' }}>Invoice Fully Paid</Text>
                <Text style={{ fontSize: 11, color: '#22c55e', marginTop: 3 }}>
                  Balance is ₹0. This invoice is already settled—no payment needed.
                </Text>
              </View>
            </View>
          )}

          <View className="h-0.5 bg-slate-100 dark:bg-slate-800 w-full mb-8 rounded-full" />

          {/* Payment Amount */}
          <View className="mb-6">
            <Text className="text-sm font-black text-primary dark:text-slate-300 mb-2 ml-1 uppercase tracking-widest">
              {isCreditNote ? 'Credit Amount' : 'Payment Amount'}
            </Text>
            <View className="relative">
              <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                <Text className="text-primary text-2xl font-black">{profile.currency_symbol || '₹'}</Text>
              </View>
              <TextInput 
                className="w-full rounded-[24px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 pl-12 text-slate-900 dark:text-slate-100 font-black text-2xl"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#cbd5e1"
              />
            </View>
          </View>

          {/* Payment Method */}
          {!isCreditNote && (
            <View className="mb-6">
              <Text className="text-sm font-black text-primary dark:text-slate-300 mb-3 ml-1 uppercase tracking-widest">Payment Method</Text>
              <View className="flex-row flex-wrap gap-3">
                {[
                  { id: 'Cash', icon: 'payments' },
                  { id: 'UPI/Online', icon: 'qr-code' },
                  { id: 'Bank', icon: 'account-balance' },
                  { id: 'Card', icon: 'credit-card' }
                ].map(item => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setMethod(item.id)}
                    className={`flex-1 min-w-[45%] flex-row items-center gap-3 p-4 rounded-2xl border-2 ${method === item.id ? 'border-primary bg-primary' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                  >
                    <MaterialIcons name={item.icon} size={22} color={method === item.id ? 'white' : '#64748b'} />
                    <Text className={`text-xs font-black uppercase tracking-widest ${method === item.id ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>{item.id}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Date Picker */}
          <View className="mb-6">
            <Text className="text-sm font-black text-primary dark:text-slate-300 mb-2 ml-1 uppercase tracking-widest">
              {isCreditNote ? 'Credit Date' : 'Payment Date'}
            </Text>
            <View className="flex-row items-center rounded-[24px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-5 py-4">
               <MaterialIcons name="event" size={20} color="#64748b" className="mr-3" />
               <TextInput 
                className="flex-1 text-slate-900 dark:text-slate-100 font-bold"
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          {/* Reference / Notes */}
          <View className="mb-8">
            <Text className="text-sm font-black text-primary dark:text-slate-300 mb-2 ml-1 uppercase tracking-widest">Notes (Optional)</Text>
            <TextInput 
              className="w-full rounded-[24px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 text-slate-900 dark:text-slate-100 font-bold"
              placeholder="Add a note or reference number..."
              placeholderTextColor="#cbd5e1"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </ScrollView>

        {/* Footer Button */}
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-950/90 border-t border-slate-100 dark:border-slate-800">
           <TouchableOpacity 
             onPress={handleSave}
             className="w-full py-4 bg-primary rounded-[20px] shadow-xl shadow-primary/30 flex-row items-center justify-center gap-2"
           >
            <MaterialIcons name={isCreditNote ? "assignment-return" : "check-circle"} size={24} color="white" />
            <Text className="text-white font-black text-lg uppercase tracking-widest">
              {isCreditNote ? 'Confirm Credit Note' : 'Confirm Payment'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Customer Modal */}
      <Modal visible={showCustomerModal} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white dark:bg-slate-900 rounded-t-[40px] p-6 h-[70%]">
            <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full self-center mb-6" />
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black text-primary dark:text-white uppercase tracking-widest">Select Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)} className="w-10 h-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <MaterialIcons name="close" size={24} className="text-slate-600" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={customers}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => {
                    setSelectedCustomerId(item.id);
                    setSelectedInvoiceId(null);
                    setShowCustomerModal(false);
                  }}
                  className="flex-row items-center gap-4 py-5 border-b border-slate-100 dark:border-slate-800"
                >
                  <View className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/50 items-center justify-center">
                    <Text className="text-primary font-black text-lg">{item.name?.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-black text-primary dark:text-white">{item.name}</Text>
                    <Text className="text-xs text-slate-400 font-bold uppercase tracking-wider">{item.phone || 'No Phone'}</Text>
                  </View>
                  {selectedCustomerId === item.id && <MaterialIcons name="check-circle" size={24} color="#262A56" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Invoice Modal */}
      <Modal visible={showInvoiceModal} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white dark:bg-slate-900 rounded-t-[40px] p-6 h-[70%]">
            <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full self-center mb-6" />
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black text-primary dark:text-white uppercase tracking-widest">Select Bill</Text>
              <TouchableOpacity onPress={() => setShowInvoiceModal(false)} className="w-10 h-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <MaterialIcons name="close" size={24} className="text-slate-600" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={customerInvoices}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => {
                const paidForInvoice = payments
                  .filter(p => String(p.invoiceId || p.invoice_id) === String(item.id))
                  .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                const balanceDue = Math.max(0, parseFloat(item.total || 0) - paidForInvoice);
                return (
                  <TouchableOpacity 
                    onPress={() => {
                      setSelectedInvoiceId(item.id);
                      setShowInvoiceModal(false);
                    }}
                    className="flex-row items-center gap-4 py-4 border-b border-slate-100 dark:border-slate-800"
                  >
                    <View className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 items-center justify-center">
                      <MaterialIcons name="description" size={24} color="#6366f1" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-black text-primary dark:text-white">{item.invoiceNumber || item.invoice_number}</Text>
                      <Text className="text-xs text-slate-400 font-bold">{item.date} · Total: {formatAmount(item.total, profile.currency_symbol || '₹')}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs text-amber-600 font-black">Due</Text>
                      <Text className="text-base font-black text-amber-700">{formatAmount(balanceDue, profile.currency_symbol || '₹')}</Text>
                    </View>
                    {selectedInvoiceId === item.id && <MaterialIcons name="check-circle" size={22} color="#262A56" />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text className="text-center text-slate-400 py-10 font-bold">No outstanding bills for this customer.</Text>}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
