import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateOrderScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  
  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark pt-12">
      <View className="flex-1 max-w-2xl mx-auto w-full">
        {/* Header */}
        <View className="flex-row items-center bg-[#272756] p-4 pb-4 justify-between shadow-md">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full">
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold leading-tight tracking-tight flex-1 ml-4">Create New Order</Text>
          <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full">
            <MaterialIcons name="more-vert" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 pb-24" contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Order Details Header */}
          <View className="px-4 pt-6">
            <Text className="text-[#272756] dark:text-[#ec5b13] text-xl font-bold mb-4">Order Details</Text>
            
            <View className="flex-col gap-4">
              {/* Customer Dropdown */}
              <View className="flex-col w-full">
                <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold mb-1.5 ml-1">Select Customer</Text>
                <TouchableOpacity className="flex-row items-center justify-between w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#272756]/20 h-14 px-4">
                  <Text className="text-base text-slate-500">Choose a customer...</Text>
                  <MaterialIcons name="expand-more" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View className="flex-row gap-4">
                {/* Order Date */}
                <View className="flex-1 flex-col">
                  <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold mb-1.5 ml-1">Order Date</Text>
                  <TextInput className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#272756]/20 h-14 px-4 text-base" value="2023-10-27" />
                </View>
                {/* Delivery Date */}
                <View className="flex-1 flex-col">
                  <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold mb-1.5 ml-1">Expected Delivery</Text>
                  <TextInput className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#272756]/20 h-14 px-4 text-base" placeholder="YYYY-MM-DD" />
                </View>
              </View>
            </View>
          </View>

          <View className="h-px bg-slate-200 dark:bg-slate-800 mx-4 my-8" />

          {/* Items Section */}
          <View className="px-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[#272756] dark:text-[#ec5b13] text-xl font-bold">Items</Text>
              <TouchableOpacity className="flex-row items-center gap-1 bg-[#ec5b13]/10 px-4 py-2 rounded-lg">
                <MaterialIcons name="add-circle" size={18} color="#ec5b13" />
                <Text className="text-[#ec5b13] font-semibold text-sm">Add Item</Text>
              </TouchableOpacity>
            </View>

            {/* Item 1 */}
            <View className="flex-row items-center gap-4 p-4 bg-white dark:bg-[#272756]/10 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm mb-3">
              <View className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 items-center justify-center">
                <MaterialIcons name="package-variant-closed" size={24} color="#94a3b8" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-slate-900 dark:text-white">Wireless Mouse M350</Text>
                <Text className="text-xs text-slate-500">Unit Price: $25.00</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <TouchableOpacity className="px-2 py-1"><MaterialIcons name="remove" size={14} color="#64748b" /></TouchableOpacity>
                  <Text className="px-2 font-semibold text-sm text-slate-900 dark:text-white">2</Text>
                  <TouchableOpacity className="px-2 py-1"><MaterialIcons name="add" size={14} color="#64748b" /></TouchableOpacity>
                </View>
                <Text className="font-bold text-[#272756] dark:text-white w-16 text-right">$50.00</Text>
              </View>
            </View>

            {/* Item 2 */}
            <View className="flex-row items-center gap-4 p-4 bg-white dark:bg-[#272756]/10 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <View className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 items-center justify-center">
                <MaterialIcons name="keyboard" size={24} color="#94a3b8" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-slate-900 dark:text-white">Mechanical Keyboard K2</Text>
                <Text className="text-xs text-slate-500">Unit Price: $89.00</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <TouchableOpacity className="px-2 py-1"><MaterialIcons name="remove" size={14} color="#64748b" /></TouchableOpacity>
                  <Text className="px-2 font-semibold text-sm text-slate-900 dark:text-white">1</Text>
                  <TouchableOpacity className="px-2 py-1"><MaterialIcons name="add" size={14} color="#64748b" /></TouchableOpacity>
                </View>
                <Text className="font-bold text-[#272756] dark:text-white w-16 text-right">$89.00</Text>
              </View>
            </View>
          </View>

          {/* Summary Section */}
          <View className="mt-8 px-6 py-6 bg-[#272756]/5 dark:bg-[#272756]/20 rounded-2xl mx-4 border border-[#272756]/10">
            <View className="flex-row justify-between mb-2">
              <Text className="text-slate-600 dark:text-slate-400">Subtotal</Text>
              <Text className="text-slate-900 dark:text-white font-medium">$139.00</Text>
            </View>
            <View className="flex-row justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
              <Text className="text-slate-600 dark:text-slate-400">Tax (8%)</Text>
              <Text className="text-slate-900 dark:text-white font-medium">$11.12</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xl font-bold text-[#272756] dark:text-[#ec5b13]">Total Amount</Text>
              <Text className="text-xl font-bold text-[#272756] dark:text-[#ec5b13]">$150.12</Text>
            </View>
          </View>

        </ScrollView>

        {/* Sticky Footer */}
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-[#221610]/80 border-t border-slate-200 dark:border-slate-800 flex-row gap-4 max-w-2xl mx-auto z-10">
          <TouchableOpacity className="flex-1 h-14 rounded-xl border-2 border-[#272756] dark:border-[#ec5b13] flex-row items-center justify-center gap-2">
            <MaterialIcons name="save" size={20} color="#272756" className="dark:text-[#ec5b13]" />
            <Text className="text-[#272756] dark:text-[#ec5b13] font-bold">Save Order</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('CreateInvoice')} className="flex-1 h-14 rounded-xl bg-[#ec5b13] flex-row items-center justify-center gap-2 shadow-lg shadow-[#ec5b13]/25">
            <MaterialIcons name="receipt-long" size={20} color="white" />
            <Text className="text-white font-bold">Invoice</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
