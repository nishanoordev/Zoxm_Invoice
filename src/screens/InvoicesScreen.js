import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useStore } from '../store/useStore';
import { MaterialIcons } from '@expo/vector-icons';

export default function InvoicesScreen({ navigation }) {
  const invoices = useStore(state => state.invoices);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Paid': return 'text-green-700 bg-green-100/80';
      case 'Pending': return 'text-amber-700 bg-amber-100/80';
      case 'Overdue': return 'text-red-700 bg-red-100/80';
      default: return 'text-slate-700 bg-slate-100/80';
    }
  };

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark pb-24">
      {/* Header */}
      <View className="flex-row items-center bg-white/80 dark:bg-slate-900/80 p-4 border-b border-slate-200 dark:border-slate-800 pt-12">
        <TouchableOpacity className="w-10 h-10 items-center justify-center">
          <MaterialIcons name="menu" size={24} className="text-slate-900 dark:text-slate-100" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-bold text-slate-900 dark:text-slate-100 pr-10">Invoices</Text>
      </View>

      <FlatList 
        data={invoices}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-2xl p-4 flex-row justify-between items-center shadow-sm">
            <View className="flex-row gap-4 items-center">
              <View className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 items-center justify-center">
                <Text className="text-primary dark:text-white font-bold text-lg">{item.customerName?.substring(0, 2).toUpperCase() || 'NA'}</Text>
              </View>
              <View>
                <Text className="font-bold text-slate-900 dark:text-white">{item.customerName}</Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{item.invoiceNumber} • {item.date}</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="font-black text-slate-900 dark:text-white text-lg">${(item.total || 0).toFixed(2)}</Text>
              <View className={`px-3 py-1 mt-1.5 rounded-full ${getStatusColor(item.status).split(' ')[1]}`}>
                <Text className={`text-[10px] font-black uppercase tracking-widest ${getStatusColor(item.status).split(' ')[0]}`}>{item.status}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text className="text-center text-slate-500 mt-10">No invoices generated yet.</Text>}
      />

      <TouchableOpacity 
        onPress={() => navigation.navigate('CreateInvoice')}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg"
      >
        <MaterialIcons name="add" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}
