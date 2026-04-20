import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function ReportsDashboardScreen({ navigation }) {
  const navigateToReport = (reportType, title) => {
    navigation.navigate('ReportViewer', { reportType, title });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center px-4 h-16 bg-white border-b border-slate-100 shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
          <MaterialIcons name="arrow-back" size={24} color="#262A56" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-primary ml-2 uppercase tracking-widest">Reports</Text>
      </View>

      <ScrollView 
        className="flex-1 px-4" 
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6 px-2">
          <Text className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-1">Business Analytics</Text>
          <Text className="text-slate-500 text-sm">Select a report to view detailed metrics and insights.</Text>
        </View>

        {/* Sales by Customer */}
        <TouchableOpacity 
          onPress={() => navigateToReport('sales_by_customer', 'Sales by Customer')}
          className="bg-white rounded-[24px] p-5 shadow-lg shadow-slate-200/50 border border-slate-50 mb-4 flex-row items-center gap-4"
        >
          <View className="w-12 h-12 rounded-xl bg-blue-50 items-center justify-center">
            <MaterialIcons name="groups" size={26} color="#3b82f6" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-black text-primary">Sales by Customer</Text>
            <Text className="text-slate-400 text-[11px] font-bold mt-0.5">Top purchasing customers</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
        </TouchableOpacity>

        {/* Sales by Item */}
        <TouchableOpacity 
          onPress={() => navigateToReport('sales_by_item', 'Sales by Item')}
          className="bg-white rounded-[24px] p-5 shadow-lg shadow-slate-200/50 border border-slate-50 mb-4 flex-row items-center gap-4"
        >
          <View className="w-12 h-12 rounded-xl bg-emerald-50 items-center justify-center">
            <MaterialIcons name="inventory-2" size={26} color="#10b981" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-black text-primary">Sales by Item</Text>
            <Text className="text-slate-400 text-[11px] font-bold mt-0.5">Most sold products & units</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
        </TouchableOpacity>

        {/* Sales Summary (By Person/User/Day) */}
        <TouchableOpacity 
          onPress={() => navigateToReport('sales_summary', 'Sales Summary')}
          className="bg-white rounded-[24px] p-5 shadow-lg shadow-slate-200/50 border border-slate-50 mb-4 flex-row items-center gap-4"
        >
          <View className="w-12 h-12 rounded-xl bg-purple-50 items-center justify-center">
            <MaterialIcons name="insert-chart" size={26} color="#a855f7" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-black text-primary">Sales Summary</Text>
            <Text className="text-slate-400 text-[11px] font-bold mt-0.5">Overall performance</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
        </TouchableOpacity>

        {/* Tax Report */}
        <TouchableOpacity 
          onPress={() => navigateToReport('tax_report', 'Tax Report')}
          className="bg-white rounded-[24px] p-5 shadow-lg shadow-slate-200/50 border border-slate-50 mb-4 flex-row items-center gap-4"
        >
          <View className="w-12 h-12 rounded-xl bg-orange-50 items-center justify-center">
            <MaterialIcons name="receipt-long" size={26} color="#f97316" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-black text-primary">Tax Report</Text>
            <Text className="text-slate-400 text-[11px] font-bold mt-0.5">Tax collected summary</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
