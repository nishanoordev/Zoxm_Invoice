import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateInvoiceScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  
  // Dummy State for matching HTML
  const [rateType1, setRateType1] = useState('Retail');
  const [rateType2, setRateType2] = useState('ON MRP');

  const RateSelector = ({ selected, onSelect }) => (
    <View className="flex-row h-9 w-full items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 p-1 mb-4">
      {['Retail', 'Wholesale', 'ON MRP'].map(type => (
        <TouchableOpacity 
          key={type}
          onPress={() => onSelect(type)}
          className={`flex-1 items-center justify-center rounded-md h-full ${selected === type ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
        >
          <Text className={`text-[11px] font-bold ${selected === type ? 'text-primary dark:text-white' : 'text-slate-500'}`}>
            {type.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      {/* Header */}
      <View className="flex-row items-center bg-white/80 dark:bg-slate-900/80 p-4 border-b border-slate-200 dark:border-slate-800 pt-12">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <MaterialIcons name="arrow-back" size={24} className="text-slate-900 dark:text-slate-100" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-bold text-slate-900 dark:text-slate-100">New Invoice</Text>
        <TouchableOpacity className="px-4 py-2 rounded-lg">
          <Text className="text-primary dark:text-blue-400 text-base font-bold">Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 py-6" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 120) }}>
        
        {/* Customer & Status Selectors */}
        <View className="flex-col gap-4 mb-6">
          <View className="flex-col gap-2">
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">Customer</Text>
            <TouchableOpacity className="flex-row items-center justify-between w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
              <Text className="text-base text-slate-900 dark:text-slate-100">Select a customer</Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} className="text-primary dark:text-slate-400" />
            </TouchableOpacity>
          </View>
          <View className="flex-col gap-2">
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status</Text>
            <TouchableOpacity className="flex-row items-center justify-between w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
              <Text className="text-base text-slate-900 dark:text-slate-100">Draft</Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} className="text-primary dark:text-slate-400" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Line Items Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-bold text-slate-900 dark:text-white">Line Items</Text>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity className="w-9 h-9 items-center justify-center rounded-lg bg-primary shadow-sm">
              <MaterialIcons name="qr-code-scanner" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center gap-1 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5">
              <MaterialIcons name="add" size={16} className="text-primary dark:text-white" />
              <Text className="text-sm font-semibold text-primary dark:text-white">Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Line Item 1 */}
        <View className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 mb-3">
          <View className="flex-row justify-between items-start mb-4">
            <TextInput 
              className="flex-1 text-base font-medium p-0 text-slate-900 dark:text-slate-100"
              placeholder="Item Name"
              value="Graphic Design Services"
            />
            <TouchableOpacity className="ml-4">
              <MaterialIcons name="delete" size={20} color="#94a3b8" className="hover:text-red-500" />
            </TouchableOpacity>
          </View>

          <RateSelector selected={rateType1} onSelect={setRateType1} />

          <View className="flex-row gap-4 mb-2">
            <View className="flex-1 flex-col gap-1">
              <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Qty</Text>
              <TextInput className="w-full bg-slate-50 dark:bg-slate-900 rounded-lg p-2 text-sm text-slate-900 dark:text-slate-100" value="1" keyboardType="numeric" />
            </View>
            <View className="flex-1 flex-col gap-1">
              <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Rate</Text>
              <TextInput className="w-full bg-slate-50 dark:bg-slate-900 rounded-lg p-2 text-sm text-slate-900 dark:text-slate-100" value="85.00" keyboardType="numeric" />
            </View>
            <View className="flex-1 flex-col gap-1 items-end pt-1">
              <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total</Text>
              <Text className="p-2 text-sm font-bold text-primary dark:text-slate-100">$85.00</Text>
            </View>
          </View>

          {rateType1 === 'ON MRP' && (
            <View className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-1 flex-row items-center justify-between">
              <Text className="text-[11px] font-bold text-primary dark:text-slate-300">MRP DISCOUNT (%)</Text>
              <TextInput className="w-20 bg-primary/5 border border-primary/20 rounded-lg p-1.5 text-xs text-right font-bold text-slate-900 dark:text-slate-100" value="0" keyboardType="numeric" />
            </View>
          )}
        </View>

        {/* Line Item 2 */}
        <View className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
          <View className="flex-row justify-between items-start mb-4">
            <TextInput 
              className="flex-1 text-base font-medium p-0 text-slate-900 dark:text-slate-100"
              placeholder="Item Name"
              value="Web Hosting (Annual)"
            />
            <TouchableOpacity className="ml-4">
              <MaterialIcons name="delete" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <RateSelector selected={rateType2} onSelect={setRateType2} />

          <View className="flex-row gap-4 mb-2">
            <View className="flex-1 flex-col gap-1">
              <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Qty</Text>
              <TextInput className="w-full bg-slate-50 dark:bg-slate-900 rounded-lg p-2 text-sm text-slate-900 dark:text-slate-100" value="2" keyboardType="numeric" />
            </View>
            <View className="flex-1 flex-col gap-1">
              <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Rate (MRP)</Text>
              <TextInput className="w-full bg-slate-50 dark:bg-slate-900 rounded-lg p-2 text-sm text-slate-900 dark:text-slate-100" value="120.00" keyboardType="numeric" />
            </View>
            <View className="flex-1 flex-col gap-1 items-end pt-1">
              <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total</Text>
              <Text className="p-2 text-sm font-bold text-primary dark:text-slate-100">$216.00</Text>
            </View>
          </View>

          {rateType2 === 'ON MRP' && (
            <View className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-1 flex-row items-center justify-between">
              <Text className="text-[11px] font-bold text-primary dark:text-slate-300">MRP DISCOUNT (%)</Text>
              <TextInput className="w-20 bg-primary/5 border border-primary/20 rounded-lg p-1.5 text-xs text-right font-bold text-slate-900 dark:text-slate-100" value="10" keyboardType="numeric" />
            </View>
          )}
        </View>

        {/* Summary Section */}
        <View className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6 space-y-3 gap-3">
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-slate-600 dark:text-slate-400">Subtotal (Retail/Wholesale)</Text>
            <Text className="font-medium text-slate-900 dark:text-slate-200">$85.00</Text>
          </View>
          <View className="flex-row justify-between items-center pb-2">
            <Text className="text-sm text-slate-600 dark:text-slate-400">Subtotal (ON MRP)</Text>
            <Text className="font-medium text-slate-900 dark:text-slate-200">$216.00</Text>
          </View>
          
          <View className="border-t border-slate-100 dark:border-slate-800 pt-3 flex-col gap-3">
            <View className="flex-row items-center justify-between gap-4">
              <View className="flex-row items-center gap-2 flex-1">
                <Text className="text-sm text-slate-600 dark:text-slate-400 w-16">Tax (%)</Text>
                <TextInput className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-900 dark:text-slate-100" value="10" keyboardType="numeric" />
              </View>
              <Text className="text-sm font-medium text-slate-600 dark:text-slate-400">+$30.10</Text>
            </View>
            <View className="flex-row items-center justify-between gap-4">
              <View className="flex-row items-center gap-2 flex-1">
                <Text className="text-sm text-slate-600 dark:text-slate-400 w-16">Disc (%)</Text>
                <TextInput className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-900 dark:text-slate-100" value="5" keyboardType="numeric" />
              </View>
              <Text className="text-sm font-medium text-green-600">-$15.05</Text>
            </View>
          </View>

          <View className="flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 pb-2">
            <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <MaterialIcons name="share" size={18} className="text-slate-700 dark:text-slate-300" />
              <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Share PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20 py-2.5 rounded-lg border border-green-200 dark:border-green-800/50">
              <MaterialIcons name="chat" size={18} className="text-green-700 dark:text-green-400" />
              <Text className="text-green-700 dark:text-green-400 text-sm font-semibold">WhatsApp</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800 mb-6">
            <Text className="text-lg font-bold text-slate-900 dark:text-white">Grand Total</Text>
            <Text className="text-2xl font-black text-primary">$316.05</Text>
          </View>

        </View>

      </ScrollView>

      {/* Floating Action footer */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 pb-8 flex-row gap-3 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)]">
        <TouchableOpacity className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex-row items-center justify-center gap-2">
          <MaterialIcons name="save" size={20} className="text-slate-700 dark:text-slate-200" />
          <Text className="text-slate-700 dark:text-slate-200 font-bold">Save</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 py-4 bg-primary rounded-xl flex-row items-center justify-center gap-2 shadow-lg shadow-primary/20">
          <MaterialIcons name="send" size={20} color="white" />
          <Text className="text-white font-bold">Generate & Send</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
