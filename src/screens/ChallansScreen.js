import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChallansScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState('draft');

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark pt-12">
      {/* Header */}
      <View className="flex-row items-center bg-background-light dark:bg-background-dark p-4 sticky top-0 z-10 border-b border-primary/10">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full">
          <MaterialIcons name="arrow-back" size={24} className="text-primary" />
        </TouchableOpacity>
        <Text className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight flex-1 ml-2">Create Delivery Challan</Text>
        <TouchableOpacity className="flex-row items-center justify-center rounded-lg h-10 px-4 bg-primary gap-2">
          <MaterialIcons name="check" size={20} color="white" />
          <Text className="text-white text-sm font-bold">Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 40) }}>
        
        {/* Basic DetailsSection */}
        <View className="flex-col gap-4 mb-6">
          <View className="flex-col gap-1">
            <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Select Customer</Text>
            <TouchableOpacity className="flex-row items-center justify-between w-full rounded-lg border border-primary/20 bg-white dark:bg-slate-800 h-12 px-4 shadow-sm">
              <Text className="text-base text-slate-900 dark:text-slate-100">Search or select customer...</Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} className="text-accent" />
            </TouchableOpacity>
          </View>
          
          <View className="flex-row gap-4">
            <View className="flex-1 flex-col gap-1">
              <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Challan Date</Text>
              <TextInput className="w-full rounded-lg border border-primary/20 bg-white dark:bg-slate-800 h-12 px-4 text-slate-900 dark:text-white" value="2023-10-27" />
            </View>
            <View className="flex-1 flex-col gap-1">
              <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Challan Number</Text>
              <TextInput className="w-full rounded-lg border border-primary/20 bg-white dark:bg-slate-800 h-12 px-4 text-slate-900 dark:text-white" placeholder="CH-2023-001" placeholderTextColor="#cbd5e1" />
            </View>
          </View>

          <View className="flex-col gap-1">
            <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Link to Invoice (Optional)</Text>
            <TouchableOpacity className="flex-row items-center justify-between w-full rounded-lg border border-primary/20 bg-white dark:bg-slate-800 h-12 px-4 shadow-sm">
              <Text className="text-base text-slate-900 dark:text-slate-100">Select an existing invoice</Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} className="text-accent" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Selection */}
        <View className="flex-col gap-3 mb-6">
          <Text className="text-slate-900 dark:text-slate-100 text-base font-bold">Challan Status</Text>
          <View className="flex-row gap-2">
            {[
              { id: 'draft', icon: 'edit-note', label: 'Draft' },
              { id: 'open', icon: 'rocket-launch', label: 'Open' },
              { id: 'delivered', icon: 'task-alt', label: 'Delivered' }
            ].map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setStatus(item.id)}
                className={`flex-1 flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${status === item.id ? 'border-primary bg-primary/5' : 'border-primary/10 bg-white dark:bg-slate-800'}`}
              >
                <MaterialIcons name={item.icon} size={24} className={status === item.id ? "text-primary" : "text-slate-400"} />
                <Text className={`text-xs font-semibold mt-1 ${status === item.id ? "text-primary" : "text-slate-600 dark:text-slate-300"}`}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Items Section */}
        <View className="flex-col gap-4 mb-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-slate-900 dark:text-slate-100 text-lg font-bold">Items to Deliver</Text>
            <TouchableOpacity className="flex-row items-center gap-1">
              <MaterialIcons name="add" size={18} className="text-primary" />
              <Text className="text-primary text-sm font-bold">Add Item</Text>
            </TouchableOpacity>
          </View>

          {/* Item 1 */}
          <View className="flex-row items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-primary/5 shadow-sm mb-3">
            <View className="bg-primary/10 rounded-lg w-16 h-16 items-center justify-center overflow-hidden">
               <Image source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnCWBfnG35ZyOZFf3Chd-HaATI-FVy5U3YRWHlLlLOWvmQZA0iBLwjUrG14MCl-qgM5P8wNGNsngR9ILTK-FB1qQbsoCzNgBW6QCf4Bu-eVmR7JpHUR2GZw2-HBX7Dmz8kXRrjwETA10goV1S2ZWsPg_Yrw9c22frpEca0G_KX0k9GWG3Mpef9DPjA0_RTk23J-P1MoUr_zDjDYff73JLNp3K2PClCuqr1f91dCajOzqoaH_H7-i-a3pNKE2QjeDglUywv_KP5rHM' }} className="w-full h-full object-cover" />
            </View>
            <View className="flex-1">
              <Text className="text-slate-900 dark:text-slate-100 text-sm font-bold">Industrial Drill - Model X</Text>
              <Text className="text-slate-500 text-xs">SKU: DRILL-001 • Box A4</Text>
            </View>
            <View className="flex-col items-end gap-2">
              <View className="flex-row items-center gap-3 bg-background-light dark:bg-slate-700 rounded-lg p-1">
                <TouchableOpacity className="w-6 h-6 items-center justify-center rounded-md bg-white dark:bg-slate-600 shadow-sm">
                  <MaterialIcons name="remove" size={14} className="text-primary" />
                </TouchableOpacity>
                <Text className="text-sm font-bold w-4 text-center text-slate-900 dark:text-white">5</Text>
                <TouchableOpacity className="w-6 h-6 items-center justify-center rounded-md bg-primary shadow-sm">
                  <MaterialIcons name="add" size={14} color="white" />
                </TouchableOpacity>
              </View>
              <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Units</Text>
            </View>
          </View>

          {/* Item 2 */}
          <View className="flex-row items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-primary/5 shadow-sm">
            <View className="bg-primary/10 rounded-lg w-16 h-16 items-center justify-center overflow-hidden">
               <Image source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCa_6qsnX3F3jKtVdgLpdAlC5Q2oBI4BKxNyqQ1ht38-wfwAsnzTyKrnRMQ7p8P9YRPgUNc2ufdk4UZ4ZKXI2A7m2KeQuSP_cAGrW_NwHPrsT6ypluGiD1DzifqNv41xKAZs5t2Uce8b5jwtC9rtDr05w7RDw8XdaPk8PjK96nQX5XGrjNWrJf5TLKBHbafF2lSF0_msGr2PC92ZgLu2idGOQVTVI1h1zfFT3rueD2JbDjVD0J5orCMV1ePKtX1LZs3kVJFLFna-G0' }} className="w-full h-full object-cover" />
            </View>
            <View className="flex-1">
              <Text className="text-slate-900 dark:text-slate-100 text-sm font-bold">High-Tensile Bolts (Pack of 50)</Text>
              <Text className="text-slate-500 text-xs">SKU: BOLT-HT-50 • Shelf 2</Text>
            </View>
            <View className="flex-col items-end gap-2">
              <View className="flex-row items-center gap-3 bg-background-light dark:bg-slate-700 rounded-lg p-1">
                <TouchableOpacity className="w-6 h-6 items-center justify-center rounded-md bg-white dark:bg-slate-600 shadow-sm">
                  <MaterialIcons name="remove" size={14} className="text-primary" />
                </TouchableOpacity>
                <Text className="text-sm font-bold w-6 text-center text-slate-900 dark:text-white">12</Text>
                <TouchableOpacity className="w-6 h-6 items-center justify-center rounded-md bg-primary shadow-sm">
                  <MaterialIcons name="add" size={14} color="white" />
                </TouchableOpacity>
              </View>
              <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Packs</Text>
            </View>
          </View>

        </View>

        {/* Additional Info */}
        <View className="flex-col gap-4">
          <View className="flex-col gap-1">
            <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Vehicle / Delivery Mode</Text>
            <TextInput className="w-full rounded-lg border border-primary/20 bg-white dark:bg-slate-800 h-12 px-4 text-slate-900 dark:text-white" placeholder="Vehicle No, Courier Name, etc." placeholderTextColor="#cbd5e1" />
          </View>
          <View className="flex-col gap-1">
            <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Notes</Text>
            <TextInput className="w-full rounded-lg border border-primary/20 bg-white dark:bg-slate-800 px-4 py-4 min-h-[100px] text-slate-900 dark:text-white" placeholder="Add delivery instructions or remarks..." placeholderTextColor="#cbd5e1" multiline textAlignVertical="top" />
          </View>
        </View>

        {/* Action Button */}
        <View className="pt-6 pb-12">
          <TouchableOpacity className="w-full bg-primary/10 flex-row items-center justify-center gap-2 py-4 rounded-xl border border-primary/20">
            <MaterialIcons name="print" size={24} className="text-primary" />
            <Text className="text-primary font-bold">Save and Print Challan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
