import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PaymentsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState('Cash');

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900 pt-12">
      <View className="flex-1 max-w-md mx-auto w-full">
        {/* Header */}
        <View className="flex-row items-center px-4 py-6 gap-4 border-b border-slate-100 dark:border-slate-800">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <MaterialIcons name="arrow-back" size={24} className="text-primary dark:text-slate-200" />
          </TouchableOpacity>
          <Text className="text-xl font-bold tracking-tight text-primary dark:text-white">Record Payment</Text>
        </View>

        <ScrollView className="flex-1 px-4 py-6" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Customer Selection */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">Select Customer</Text>
            <TouchableOpacity className="flex-row items-center justify-between w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
              <Text className="text-slate-900 dark:text-slate-100">Search or select a customer</Text>
              <MaterialIcons name="expand-more" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Linked Invoice Section */}
          <View className="mb-6 p-4 rounded-xl border border-primary/10 bg-primary/5 dark:bg-primary/10">
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-[10px] font-bold text-primary dark:text-primary/80 uppercase tracking-widest leading-tight">Linked Invoice</Text>
                <Text className="text-base font-bold text-slate-900 dark:text-white mt-1">Invoice #INV-2024-001</Text>
              </View>
              <View className="w-12 h-12 rounded-lg bg-slate-200 border border-slate-200 dark:border-slate-700 items-center justify-center">
                <MaterialIcons name="description" size={24} className="text-primary" />
              </View>
            </View>
            <View className="pt-3 border-t border-primary/10 flex-row justify-between items-center">
              <Text className="text-sm text-slate-600 dark:text-slate-400">Outstanding Balance</Text>
              <Text className="text-base font-bold text-[#ec5b13]">$450.00</Text>
            </View>
          </View>

          {/* Payment Amount */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">Payment Amount</Text>
            <View className="relative">
              <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                <Text className="text-slate-500 font-medium text-xl">$</Text>
              </View>
              <TextInput 
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 pl-10 text-slate-900 dark:text-slate-100 font-bold text-xl"
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#cbd5e1"
              />
            </View>
          </View>

          {/* Payment Method */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 ml-1">Payment Method</Text>
            <View className="flex-row flex-wrap gap-3">
              {[
                { id: 'Cash', icon: 'payments' },
                { id: 'Card', icon: 'credit-card' },
                { id: 'Transfer', icon: 'account-balance' },
                { id: 'Check', icon: 'history-edu' }
              ].map(item => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setMethod(item.id)}
                  className={`flex-1 min-w-[45%] flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${method === item.id ? 'border-primary bg-primary shadow-md shadow-primary/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}
                >
                  <MaterialIcons name={item.icon} size={24} color={method === item.id ? 'white' : '#64748b'} />
                  <Text className={`text-xs font-bold uppercase mt-1 ${method === item.id ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>{item.id}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date Picker */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">Payment Date</Text>
            <TextInput 
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 text-slate-900 dark:text-slate-100"
              value="2024-05-20"
            />
          </View>

          {/* Reference / Notes */}
          <View className="mb-8">
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">Reference / Notes (Optional)</Text>
            <TextInput 
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 text-slate-900 dark:text-slate-100"
              placeholder="Add a note or reference number..."
              placeholderTextColor="#cbd5e1"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Footer Button */}
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800">
           <TouchableOpacity className="w-full py-4 bg-primary rounded-xl shadow-lg shadow-primary/30 flex-row items-center justify-center gap-2">
            <MaterialIcons name="save" size={20} color="white" />
            <Text className="text-white font-bold text-base">Save Payment</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
