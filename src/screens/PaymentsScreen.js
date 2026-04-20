import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, SafeAreaView, Platform, Modal } from 'react-native';
import { useStore } from '../store/useStore';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function PaymentsScreen({ navigation }) {
  const payments = useStore(state => state.payments);
  const profile = useStore(state => state.profile);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const sortedPayments = useMemo(() => {
    return [...payments].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  }, [payments]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 pt-12">
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm">
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          className="w-10 h-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800"
        >
          <MaterialIcons name="arrow-back" size={24} color="#262A56" className="dark:text-slate-200" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-black text-primary dark:text-slate-100 uppercase tracking-widest">Payment Records</Text>
        <View className="w-10" />
      </View>

      <FlatList
        data={sortedPayments}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
        renderItem={({ item }) => (
          <View className="bg-white dark:bg-slate-900 rounded-[24px] p-5 shadow-sm border border-slate-100 dark:border-slate-800 flex-row justify-between items-center">
            <View className="flex-row items-center gap-4 flex-1">
              <View className={`w-12 h-12 rounded-2xl items-center justify-center ${item.method === 'Credit Note' ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                <MaterialIcons 
                  name={item.method === 'Credit Note' ? "assignment-return" : "payments"} 
                  size={24} 
                  color={item.method === 'Credit Note' ? "#f97316" : "#22c55e"} 
                />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-black text-primary dark:text-white" numberOfLines={1}>
                  {item.customerName || 'Unknown Customer'}
                </Text>
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  {item.invoiceId ? `Invoice #${item.invoiceId}` : 'Direct Payment'} • {item.date || item.createdAt?.split('T')[0]}
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className={`text-lg font-black ${item.method === 'Credit Note' ? 'text-orange-500' : 'text-green-600'}`}>
                {item.method === 'Credit Note' ? '-' : '+'}{profile.currency_symbol || '₹'}{parseFloat(item.amount || 0).toFixed(2)}
              </Text>
              <View className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md mt-1">
                <Text className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.method || 'Cash'}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-20 opacity-40">
            <MaterialCommunityIcons name="cash-multiple" size={64} color="#94a3b8" />
            <Text className="text-slate-500 font-bold mt-4">No payment records found.</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity 
        onPress={() => setShowActionMenu(true)}
        className="absolute bottom-6 right-6 w-16 h-16 bg-primary rounded-full items-center justify-center shadow-2xl shadow-primary/40 z-50"
      >
        <MaterialIcons name="add" size={32} color="white" />
      </TouchableOpacity>

      {/* Action Menu Modal */}
      <Modal visible={showActionMenu} transparent animationType="fade">
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setShowActionMenu(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <View className="bg-white dark:bg-slate-900 rounded-t-[40px] p-8 pb-12">
            <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full self-center mb-8" />
            
            <Text className="text-2xl font-black text-primary dark:text-white uppercase tracking-widest mb-6 text-center">Record New</Text>
            
            <View className="flex-row gap-4">
              <TouchableOpacity 
                onPress={() => {
                  setShowActionMenu(false);
                  navigation.navigate('RecordPayment', { mode: 'payment' });
                }}
                className="flex-1 bg-green-50 dark:bg-green-900/10 p-6 rounded-3xl items-center border border-green-100 dark:border-green-900/30"
              >
                <View className="w-14 h-14 bg-green-500 rounded-2xl items-center justify-center mb-3">
                  <MaterialIcons name="payments" size={32} color="white" />
                </View>
                <Text className="text-green-700 dark:text-green-400 font-black uppercase text-xs tracking-tighter">Payment</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => {
                  setShowActionMenu(false);
                  navigation.navigate('RecordPayment', { mode: 'credit_note' });
                }}
                className="flex-1 bg-orange-50 dark:bg-orange-900/10 p-6 rounded-3xl items-center border border-orange-100 dark:border-orange-900/30"
              >
                <View className="w-14 h-14 bg-orange-500 rounded-2xl items-center justify-center mb-3">
                  <MaterialIcons name="assignment-return" size={32} color="white" />
                </View>
                <Text className="text-orange-700 dark:text-orange-400 font-black uppercase text-xs tracking-tighter">Credit Note</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={() => setShowActionMenu(false)}
              className="mt-8 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl items-center"
            >
              <Text className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
