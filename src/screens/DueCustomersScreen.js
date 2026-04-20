import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Linking, Platform, Alert, SafeAreaView, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { calculateCustomerBalances } from '../utils/balanceCalculator';
import { formatAmount } from '../utils/formatters';
import DatePickerModal from '../components/DatePickerModal';

export default function DueCustomersScreen({ navigation }) {
  const customers = useStore(state => state.customers);
  const invoices = useStore(state => state.invoices);
  const payments = useStore(state => state.payments);
  const profile = useStore(state => state.profile);
  const updateCustomer = useStore(state => state.updateCustomer);

  const [editingPromise, setEditingPromise] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dueCustomers = useMemo(() => {
    return customers.map(c => {
      const { totalDue } = calculateCustomerBalances(c.id, invoices, payments);
      return { ...c, totalDue };
    })
    .filter(c => c.totalDue > 0.01)
    .sort((a, b) => b.totalDue - a.totalDue);
  }, [customers, invoices, payments]);

  const totalGlobalDue = useMemo(() => dueCustomers.reduce((sum, c) => sum + c.totalDue, 0), [dueCustomers]);

  const handleCall = (phone) => {
    if (!phone) {
      Alert.alert('No Phone Number', 'This customer does not have a saved phone number.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleRemind = async (customer) => {
    if (!customer.phone) {
      Alert.alert('No Phone Number', 'This customer does not have a saved phone number.');
      return;
    }
    const message = `Hello ${customer.name}, a gentle reminder that your outstanding balance is ${formatAmount(customer.totalDue, profile.currency_symbol || '₹')}. Please arrange for payment at your earliest convenience. Thank you!`;
    const url = `whatsapp://send?phone=${customer.phone}&text=${encodeURIComponent(message)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        const smsUrl = Platform.OS === 'ios' ? `sms:${customer.phone}&body=${encodeURIComponent(message)}` : `sms:${customer.phone}?body=${encodeURIComponent(message)}`;
        await Linking.openURL(smsUrl);
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to open messaging app.');
    }
  };

  const handleSavePromise = async () => {
    if (editingPromise) {
      // Just update the customer's specific promising fields in DB
      await updateCustomer({
        id: editingPromise.id,
        name: editingPromise.name, // required for db
        payment_due_date: editingPromise.payment_due_date,
        payment_note: editingPromise.payment_note
      });
      setEditingPromise(null);
    }
  };

  const renderItem = ({ item }) => (
    <View className="bg-white p-4 rounded-2xl mb-3 shadow-sm border border-slate-50">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-800">{item.name}</Text>
          {item.phone && <Text className="text-xs text-slate-500 mt-1">{item.phone}</Text>}
        </View>
        <Text className="text-red-500 font-bold text-lg">
          {formatAmount(item.totalDue, profile.currency_symbol || '₹')}
        </Text>
      </View>

      {/* Promise Info Section */}
      {(item.payment_due_date || item.payment_note) && (
        <View className="bg-orange-50 rounded-lg p-3 mb-3 border border-orange-100">
          <View className="flex-row items-center gap-2 mb-1">
            <MaterialIcons name="edit-calendar" size={16} color="#d97706" />
            <Text className="text-xs font-bold text-amber-700">
              {item.payment_due_date ? `Promised: ${new Date(item.payment_due_date).toLocaleDateString()}` : 'Payment Note'}
            </Text>
          </View>
          {item.payment_note && (
            <Text className="text-xs text-amber-800 italic ml-6 leading-tight">
              "{item.payment_note}"
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View className="flex-row items-center justify-between border-t border-slate-50 pt-3 mt-1">
        <TouchableOpacity 
          onPress={() => setEditingPromise({ ...item })}
          className="flex-row items-center gap-1 py-1 px-2"
        >
          <MaterialIcons name="note-add" size={16} color="#64748b" />
          <Text className="text-xs font-medium text-slate-500">
            {item.payment_due_date || item.payment_note ? 'Edit Promise' : 'Add Promise'}
          </Text>
        </TouchableOpacity>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity 
            onPress={() => handleCall(item.phone)}
            className="w-10 h-10 bg-indigo-50 rounded-full items-center justify-center"
          >
            <MaterialIcons name="call" size={20} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handleRemind(item)}
            className="w-10 h-10 bg-emerald-50 rounded-full items-center justify-center"
          >
            <MaterialCommunityIcons name="whatsapp" size={20} color="#10b981" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50 pt-12">
      <View className="bg-primary flex-row items-center p-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1">
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Due Customers</Text>
      </View>

      <View className="p-4 bg-white border-b border-slate-100 flex-row items-center justify-between">
         <Text className="text-slate-500 font-bold uppercase text-xs tracking-wider">Total Outstanding</Text>
         <Text className="text-red-500 font-bold text-xl">{formatAmount(totalGlobalDue, profile.currency_symbol || '₹')}</Text>
      </View>

      <FlatList
        data={dueCustomers}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className="py-20 items-center justify-center">
            <MaterialIcons name="check-circle" size={48} color="#10b981" />
            <Text className="text-slate-500 mt-4 font-medium text-base text-center">
              All clear! No customers have pending dues.
            </Text>
          </View>
        }
      />

      {/* Promise Modal */}
      <Modal
        visible={!!editingPromise}
        transparent
        animationType="fade"
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/50"
        >
          <TouchableOpacity 
            className="absolute inset-0"
            activeOpacity={1}
            onPress={() => setEditingPromise(null)}
          />
          <View className="bg-white rounded-t-[32px] p-6 pt-8">
            <View className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 absolute top-3 left-1/2 -translate-x-6" />
            
            <Text className="text-xl font-bold text-slate-800 mb-6">Payment Promise</Text>
            
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Promise Date</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex-row items-center justify-between mb-4"
            >
              <Text className={editingPromise?.payment_due_date ? "text-slate-800 font-medium" : "text-slate-400"}>
                {editingPromise?.payment_due_date ? new Date(editingPromise.payment_due_date).toLocaleDateString() : "Select promised date"}
              </Text>
              <MaterialIcons name="calendar-today" size={20} color="#64748b" />
            </TouchableOpacity>

            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1 mt-2">Notes / Message</Text>
            <TextInput
              value={editingPromise?.payment_note || ''}
              onChangeText={(txt) => setEditingPromise(prev => ({ ...prev, payment_note: txt }))}
              placeholder="E.g. Will pay next Monday..."
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-h-[100px] text-slate-800"
              textAlignVertical="top"
              multiline
            />

            <View className="flex-row gap-3 mt-8 pb-4">
              <TouchableOpacity 
                onPress={() => setEditingPromise(null)}
                className="flex-1 py-4 rounded-xl bg-slate-100 items-center"
              >
                <Text className="text-slate-600 font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSavePromise}
                className="flex-1 py-4 rounded-xl bg-primary items-center shadow-lg shadow-primary/30"
              >
                <Text className="text-white font-bold tracking-wide">Save Promise</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Calendar Date Picker Modal */}
        <DatePickerModal
          visible={showDatePicker}
          selectedDate={editingPromise?.payment_due_date || new Date().toISOString().split('T')[0]}
          onClose={() => setShowDatePicker(false)}
          onSelect={(dateStr) => {
            setEditingPromise(prev => ({ ...prev, payment_due_date: dateStr }));
          }}
        />
      </Modal>
    </SafeAreaView>
  );
}
