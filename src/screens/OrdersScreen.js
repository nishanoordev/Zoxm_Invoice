import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OrdersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  
  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-background-dark pt-12">
      {/* Header */}
      <View className="flex-row items-center bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 justify-between z-10">
        <TouchableOpacity className="w-10 h-10 items-center justify-center">
          <MaterialIcons name="menu" size={24} className="text-slate-900 dark:text-slate-100" />
        </TouchableOpacity>
        <Text className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 ml-2">Orders</Text>
        <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
          <MaterialIcons name="search" size={24} className="text-slate-700 dark:text-slate-300" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View className="bg-white dark:bg-slate-900">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3 p-4">
          <TouchableOpacity className="h-9 px-5 rounded-full bg-primary items-center justify-center shadow-sm mr-3">
             <Text className="text-sm font-semibold text-white">All Orders</Text>
          </TouchableOpacity>
          {['Pending', 'Processing', 'Completed', 'Cancelled'].map(filter => (
            <TouchableOpacity key={filter} className="h-9 px-5 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mr-3">
              <Text className="text-sm font-medium text-slate-600 dark:text-slate-400">{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Orders List */}
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Order Card 1 */}
        <View className="flex-col rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 rounded-full">
              <Text className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Pending</Text>
            </View>
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">#ORD-8492</Text>
          </View>
          <View className="flex-row items-center gap-4">
            <View className="w-14 h-14 rounded-lg bg-primary/10 items-center justify-center">
              <MaterialIcons name="inventory-2" size={24} className="text-primary" />
            </View>
            <View className="flex-1">
              <Text className="text-slate-900 dark:text-slate-100 text-base font-bold">Alex Rivera</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm">Oct 24, 2023 • 2:30 PM</Text>
            </View>
            <View className="items-end">
              <Text className="text-primary text-lg font-bold">$124.50</Text>
              <Text className="text-slate-400 text-xs font-medium">3 items</Text>
            </View>
          </View>
        </View>

        {/* Order Card 2 */}
        <View className="flex-col rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-0.5 rounded-full">
              <Text className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Completed</Text>
            </View>
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">#ORD-8491</Text>
          </View>
          <View className="flex-row items-center gap-4">
            <View className="w-14 h-14 rounded-lg bg-primary/10 items-center justify-center">
              <MaterialIcons name="local-shipping" size={24} className="text-primary" />
            </View>
            <View className="flex-1">
              <Text className="text-slate-900 dark:text-slate-100 text-base font-bold">Sarah Jenkins</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm">Oct 23, 2023 • 11:15 AM</Text>
            </View>
            <View className="items-end">
              <Text className="text-primary text-lg font-bold">$45.00</Text>
              <Text className="text-slate-400 text-xs font-medium">1 item</Text>
            </View>
          </View>
        </View>

        {/* Order Card 3 */}
        <View className="flex-col rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="bg-blue-100 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-full">
              <Text className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase">Processing</Text>
            </View>
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">#ORD-8490</Text>
          </View>
          <View className="flex-row items-center gap-4">
            <View className="w-14 h-14 rounded-lg bg-primary/10 items-center justify-center">
              <MaterialIcons name="cached" size={24} className="text-primary" />
            </View>
            <View className="flex-1">
              <Text className="text-slate-900 dark:text-slate-100 text-base font-bold">Michael Chen</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm">Oct 23, 2023 • 09:45 AM</Text>
            </View>
            <View className="items-end">
              <Text className="text-primary text-lg font-bold">$210.99</Text>
              <Text className="text-slate-400 text-xs font-medium">5 items</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity className="absolute bottom-24 right-6 w-14 h-14 items-center justify-center rounded-full bg-primary shadow-xl z-20">
        <MaterialIcons name="add" size={30} color="white" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}
