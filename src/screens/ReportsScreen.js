import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function ReportsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  
  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark pt-12">
      <View className="flex-1">
        
        {/* Header */}
        <View className="flex-row items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between border-b border-primary/10 z-10">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
            <MaterialIcons name="arrow-back" size={24} className="text-slate-900 dark:text-white" />
          </TouchableOpacity>
          <Text className="text-slate-900 dark:text-white text-lg font-bold flex-1 text-center">Business Analytics</Text>
          <TouchableOpacity className="w-10 h-10 items-center justify-center">
            <MaterialIcons name="download" size={24} className="text-slate-900 dark:text-white" />
          </TouchableOpacity>
        </View>

        {/* Time Filters */}
        <View className="px-4 py-2 bg-background-light dark:bg-background-dark z-10">
          <View className="flex-row border-b border-primary/10 gap-8">
            {['Daily', 'Weekly', 'Monthly'].map(filter => (
              <TouchableOpacity key={filter} className={`pb-3 pt-2 border-b-2 ${filter === 'Monthly' ? 'border-primary' : 'border-transparent'}`}>
                <Text className={`text-sm ${filter === 'Monthly' ? 'text-primary font-bold' : 'text-slate-500 dark:text-slate-400 font-semibold'}`}>{filter}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
          
          {/* Main Chart Card */}
          <View className="px-4 py-6">
            <View className="bg-white dark:bg-primary/10 rounded-xl p-4 shadow-sm border border-primary/10">
              <Text className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Sales Overview</Text>
              <View className="flex-row items-baseline gap-2 mt-1">
                <Text className="text-slate-900 dark:text-white text-3xl font-bold">$12,450.00</Text>
                <View className="flex-row items-center">
                  <MaterialIcons name="trending-up" size={14} color="#10b981" />
                  <Text className="text-emerald-600 dark:text-emerald-400 text-sm font-bold ml-1">12.5%</Text>
                </View>
              </View>
              <Text className="text-slate-400 text-[10px] mt-1">vs last month ($11,066.00)</Text>
              
              {/* Dummy SVG Chart */}
              <View className="h-40 w-full mt-4 justify-center">
                <Svg height="120" width={width - 72} viewBox="0 0 472 150">
                  <Defs>
                    <LinearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#4f46e5" stopOpacity="0.3" />
                      <Stop offset="1" stopColor="#4f46e5" stopOpacity="0" />
                    </LinearGradient>
                  </Defs>
                  <Path 
                    d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 11 363.077 11C381.231 11 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25V149H0V109Z" 
                    fill="url(#salesGradient)" 
                  />
                  <Path 
                    d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 11 363.077 11C381.231 11 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25" 
                    stroke="#4f46e5" 
                    strokeWidth="3" 
                  />
                </Svg>
                <View className="flex-row justify-between px-2 mt-2">
                  <Text className="text-slate-400 text-[9px] font-bold uppercase">Week 1</Text>
                  <Text className="text-slate-400 text-[9px] font-bold uppercase">Week 2</Text>
                  <Text className="text-slate-400 text-[9px] font-bold uppercase">Week 3</Text>
                  <Text className="text-slate-400 text-[9px] font-bold uppercase">Week 4</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Category Breakdown */}
          <View className="px-4 py-2">
            <Text className="text-slate-900 dark:text-white text-lg font-bold mb-4">Revenue by Category</Text>
            <View className="bg-white dark:bg-primary/10 rounded-xl p-6 shadow-sm border border-primary/10 flex-row items-center gap-6">
              <View className="w-24 h-24 items-center justify-center">
                 <Svg height="80" width="80" viewBox="0 0 36 36">
                    <Circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                    <Circle cx="18" cy="18" r="16" fill="none" stroke="#272756" strokeWidth="4" strokeDasharray="65, 100" strokeLinecap="round" transform="rotate(-90 18 18)" />
                    <Circle cx="18" cy="18" r="16" fill="none" stroke="#4f46e5" strokeWidth="4" strokeDasharray="20, 100" strokeDashoffset="-65" strokeLinecap="round" transform="rotate(-90 18 18)" />
                 </Svg>
              </View>
              <View className="flex-1 gap-2">
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center gap-2">
                    <View className="w-2 h-2 rounded-full bg-primary" />
                    <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">Services</Text>
                  </View>
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">$8,092</Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center gap-2">
                    <View className="w-2 h-2 rounded-full bg-accent" />
                    <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">Products</Text>
                  </View>
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">$2,490</Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center gap-2">
                    <View className="w-2 h-2 rounded-full bg-indigo-300" />
                    <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">Other</Text>
                  </View>
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">$1,868</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Monthly Trends */}
          <View className="px-4 py-6">
            <Text className="text-slate-900 dark:text-white text-lg font-bold mb-4">Monthly Trends</Text>
            <View className="bg-white dark:bg-primary/10 rounded-xl p-4 shadow-sm border border-primary/10">
              <View className="flex-row items-end justify-between h-40 gap-2 mb-4 px-2">
                <View className="flex-1 bg-primary/30 rounded-t-lg h-[40%]" />
                <View className="flex-1 bg-primary/30 rounded-t-lg h-[55%]" />
                <View className="flex-1 bg-primary/30 rounded-t-lg h-[45%]" />
                <View className="flex-1 bg-primary/30 rounded-t-lg h-[70%]" />
                <View className="flex-1 bg-primary/30 rounded-t-lg h-[60%]" />
                <View className="flex-1 bg-primary rounded-t-lg h-[85%]" />
              </View>
              <View className="flex-row justify-between px-1">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(m => (
                  <Text key={m} className="text-slate-400 text-[10px] font-bold uppercase">{m}</Text>
                ))}
              </View>
            </View>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
