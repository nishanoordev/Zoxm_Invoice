import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Platform, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomerProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('Details');

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark pt-12">
      <View className="flex-1">
        
        {/* Header */}
        <View className="flex-row items-center bg-primary p-4 sticky top-0 z-20 shadow-md">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 rounded-full">
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold ml-4 flex-1 text-white">Customer Profile</Text>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity className="p-2">
              <MaterialIcons name="search" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity className="p-2">
              <MaterialIcons name="more-vert" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1" stickyHeaderIndices={[2]}>
          
          {/* Customer Identity Section */}
          <View className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <View className="flex-row items-center gap-4 mb-6">
              <View className="bg-primary/10 flex items-center justify-center rounded-full h-20 w-20 border-2 border-primary/20">
                <Text className="text-primary font-bold text-2xl">AT</Text>
              </View>
              <View className="flex-1">
                <Text className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">ABC Trading</Text>
                <View className="flex-row items-center gap-1 mt-1">
                   <MaterialIcons name="mail" size={14} className="text-slate-400" />
                   <Text className="text-slate-500 dark:text-slate-400 text-sm">contact@abctrading.com</Text>
                </View>
                <View className="flex-row items-center gap-1 mt-1">
                   <MaterialIcons name="call" size={14} className="text-slate-400" />
                   <Text className="text-slate-500 dark:text-slate-400 text-sm">+1 (555) 012-3456</Text>
                </View>
              </View>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity className="flex-1 items-center justify-center rounded-lg h-12 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <Text className="text-slate-900 dark:text-slate-100 font-semibold">Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('CreateInvoice')} className="flex-1 items-center justify-center rounded-lg h-12 bg-primary shadow-sm">
                <Text className="text-white font-semibold">New Invoice</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Key Metrics Row */}
          <View className="flex-row gap-4 p-4">
            <View className="flex-1 flex-col gap-1 rounded-xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Receivables</Text>
              <Text className="text-2xl font-bold text-primary">$1,200.00</Text>
            </View>
            <View className="flex-1 flex-col gap-1 rounded-xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Unused Credits</Text>
              <Text className="text-2xl font-bold text-slate-900 dark:text-white">$0.00</Text>
            </View>
          </View>

          {/* Tabs Navigation */}
          <View className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
            <View className="flex-row gap-4 px-4">
              {['Details', 'Transactions', 'Timeline'].map(tab => (
                <TouchableOpacity 
                  key={tab} 
                  onPress={() => setActiveTab(tab)}
                  className={`py-4 border-b-2 ${activeTab === tab ? 'border-primary' : 'border-transparent'}`}
                >
                  <Text className={`text-sm ${activeTab === tab ? 'text-primary font-bold' : 'text-slate-500 font-medium'}`}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tab Content: Details */}
          <View className="p-4 space-y-6">
            <View className="mb-6">
              <View className="flex-row items-center gap-2 mb-3">
                <MaterialIcons name="location-on" size={20} className="text-primary" />
                <Text className="text-slate-900 dark:text-white font-bold">Billing Address</Text>
              </View>
              <View className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <Text className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  123 Business Avenue, Suite 500{"\n"}
                  Industrial Park East{"\n"}
                  New York, NY 10001
                </Text>
              </View>
            </View>

            <View className="mb-6">
              <View className="flex-row items-center gap-2 mb-3">
                <MaterialIcons name="contact-phone" size={20} className="text-primary" />
                <Text className="text-slate-900 dark:text-white font-bold">Primary Contact</Text>
              </View>
              <View className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex-row justify-between items-center">
                <View>
                  <Text className="font-bold text-slate-900 dark:text-white">John Doe</Text>
                  <Text className="text-sm text-slate-500 dark:text-slate-400">Procurement Manager</Text>
                </View>
                <TouchableOpacity onPress={() => Linking.openURL('tel:5550123456')} className="bg-primary/10 p-2 rounded-full">
                  <MaterialIcons name="call" size={20} className="text-primary" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-10">
              <View className="flex-row items-center gap-2 mb-3">
                <MaterialIcons name="notes" size={20} className="text-primary" />
                <Text className="text-slate-900 dark:text-white font-bold">Internal Notes</Text>
              </View>
              <View className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <Text className="text-slate-600 dark:text-slate-300 italic">
                  "Prefers digital invoices via email. Net 30 payment terms applied. Always pays on time. Contact John for all billing discrepancies."
                </Text>
              </View>
            </View>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
