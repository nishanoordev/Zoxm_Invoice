import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, SafeAreaView } from 'react-native';
import { useStore } from '../store/useStore';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const customers = useStore(state => state.customers);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('CustomerProfile', { customerId: item.id })}
      className="flex-row items-center gap-4 bg-white dark:bg-primary/40 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-primary/60 mb-3"
    >
      <View className="flex-1 min-w-0">
        <Text className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{item.name}</Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.email}</Text>
      </View>
      <View className="flex-col items-end gap-1">
        <Text className="text-base font-bold text-accent">${(item.balance || 0).toFixed(2)}</Text>
        <MaterialIcons name="chevron-right" size={16} className="text-slate-300 dark:text-slate-600" />
      </View>
    </TouchableOpacity>
  );

  const dummyCustomers = [
    { id: '1', name: 'ABC Trading', email: 'abc@trading.com', balance: 1200.00 },
    { id: '2', name: 'Global Logistics Ltd', email: 'billing@globallogistics.com', balance: 450.25 },
    { id: '3', name: 'Horizon Design Studio', email: 'hello@horizon.io', balance: 3890.00 },
    { id: '4', name: 'Nova Tech Solutions', email: 'accounts@novatech.co', balance: 0.00 },
    { id: '5', name: 'Pinnacle Coffee Roasters', email: 'orders@pinnaclecoffee.com', balance: 820.50 },
    { id: '6', name: 'Swift Delivery', email: 'contact@swiftdelivery.net', balance: 2100.00 }
  ];

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark pt-12">
      <View className="bg-primary text-white shadow-md z-10 w-full">
        <View className="p-4 flex-col gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-3xl font-bold tracking-tight text-white">Customers</Text>
            <TouchableOpacity className="items-center justify-center rounded-full w-10 h-10 bg-accent shadow-lg">
              <MaterialIcons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <View className="relative w-full">
            <View className="absolute inset-y-0 left-0 pl-3 items-center justify-center z-10">
              <MaterialIcons name="search" size={20} color="#94a3b8" />
            </View>
            <TextInput 
              className="w-full pl-10 pr-3 py-2.5 bg-white/10 text-white rounded-xl text-sm"
              placeholder="Search customers by name or email"
              placeholderTextColor="#cbd5e1"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
        <View className="flex-row px-4 gap-6">
          {['All', 'Active', 'Unpaid'].map(tab => (
            <TouchableOpacity 
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`pb-3 px-2 border-b-2 ${activeTab === tab ? 'border-accent' : 'border-transparent'}`}
            >
              <Text className={`text-sm ${activeTab === tab ? 'text-accent font-semibold' : 'text-slate-300 font-medium'}`}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList 
        data={customers.length > 0 ? filteredCustomers : dummyCustomers}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 12) }}
        className="flex-1"
      />
    </SafeAreaView>
  );
}
