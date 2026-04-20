import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ImageBackground } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';

export default function HistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const profile = useStore(state => state.profile);
  
  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark pt-12">
      {/* Header */}
      <View className="flex-row items-center p-4 pb-2 justify-between border-b border-primary/5 bg-background-light dark:bg-background-dark z-10">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full hover:bg-primary/10">
          <MaterialIcons name="arrow-back" size={24} className="text-primary" />
        </TouchableOpacity>
        <Text className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight flex-1 text-center">Activity History</Text>
        <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full hover:bg-primary/10">
          <MaterialIcons name="more-vert" size={24} className="text-slate-600 dark:text-slate-400" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 100) }}>
        {/* Customer Profile Summary */}
        <View className="p-6 bg-white dark:bg-slate-900/40 border-b border-primary/5">
          <View className="flex-row items-center gap-4">
            <ImageBackground 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCr0LWxpmW1XiYyU7yOu4IdfkWgwNPb4gJN5K-eopH_AwmoohMPa_SamU09O-zS7PIvg5RMsIjOcjQeqE7uVawX3-nD_QDgv98vFCoVmTdX3mt6KQcAyPlL8zgra6W8zefZRKFWTZZH5mYlC5c9T2u9OLGWYLq_yuvgjQ_612Std1dKdIhDXgcqAL7Otiv5us24UZ0XlxVOxYI76A7N1atOiB_gmPVOn-R4milqAridwZcx9bBaaOn-1B5G28KzsHFZUnQ9k_SINUI' }} 
              className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 items-center justify-center overflow-hidden" 
              imageStyle={{ borderRadius: 40 }}
            >
              <MaterialIcons name="corporate-fare" size={30} className="text-primary" />
            </ImageBackground>
            <View className="flex-col justify-center">
              <Text className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight">Acme Corp</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm font-medium">Customer since Oct 2023</Text>
              <View className="mt-1 self-start bg-primary/10 px-2 py-0.5 rounded-full">
                <Text className="text-primary text-xs font-bold">ID: CUST-88291</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Timeline Section */}
        <View className="px-6 py-4">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight">Recent Activity</Text>
            <TouchableOpacity>
              <Text className="text-accent text-sm font-semibold">Filter</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-col">
            
            {/* Timeline Entry 1 */}
            <View className="flex-row mb-4">
              <View className="flex-col items-center w-10">
                <View className="w-10 h-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 border-2 border-white dark:border-slate-900 z-10">
                  <MaterialIcons name="check-circle" size={20} className="text-green-600 dark:text-green-400" />
                </View>
                <View className="w-[2px] bg-slate-200 dark:bg-slate-700 flex-1 -mt-2" />
              </View>
              <View className="flex-1 pb-8 pl-4">
                <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold">Status updated to Paid</Text>
                <Text className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Today, 02:30 PM</Text>
                <View className="mt-2 p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                  <Text className="text-sm text-slate-600 dark:text-slate-300">Invoice <Text className="text-primary font-bold">#101</Text> final reconciliation complete.</Text>
                </View>
              </View>
            </View>

            {/* Timeline Entry 2 */}
            <View className="flex-row mb-4">
              <View className="flex-col items-center w-10">
                <View className="w-10 h-10 items-center justify-center rounded-full bg-accent/10 border-2 border-white dark:border-slate-900 z-10">
                  <MaterialIcons name="payments" size={20} className="text-accent" />
                </View>
                <View className="w-[2px] bg-slate-200 dark:bg-slate-700 flex-1 -mt-2" />
              </View>
              <View className="flex-1 pb-8 pl-4">
                <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold">Payment of {profile.currency_symbol || '$'}500 recorded</Text>
                <Text className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Yesterday, 10:15 AM</Text>
                <Text className="text-slate-500 dark:text-slate-400 text-xs italic mt-1">Ref: CHK-299102-ACME</Text>
              </View>
            </View>

            {/* Timeline Entry 3 */}
            <View className="flex-row mb-4">
              <View className="flex-col items-center w-10">
                <View className="w-10 h-10 items-center justify-center rounded-full bg-primary/10 border-2 border-white dark:border-slate-900 z-10">
                  <MaterialIcons name="description" size={20} className="text-primary" />
                </View>
                <View className="w-[2px] bg-slate-200 dark:bg-slate-700 flex-1 -mt-2" />
              </View>
              <View className="flex-1 pb-8 pl-4">
                <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold">Invoice #101 created</Text>
                <Text className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Oct 24, 2023, 09:00 AM</Text>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  <TouchableOpacity className="px-3 py-1 bg-primary rounded-full">
                    <Text className="text-white text-xs font-semibold">View PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="px-3 py-1 bg-white dark:bg-slate-800 border border-primary/20 rounded-full">
                    <Text className="text-primary text-xs font-medium">Email Link</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="px-3 py-1 border border-slate-200 dark:border-slate-700 flex-row items-center gap-1.5 rounded-full">
                    <MaterialIcons name="share" size={14} className="text-slate-600 dark:text-slate-400" />
                    <Text className="text-slate-600 dark:text-slate-400 text-xs font-medium">Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="px-3 py-1 border border-slate-200 dark:border-slate-700 flex-row items-center gap-1.5 rounded-full">
                    <MaterialIcons name="chat" size={14} className="text-slate-600 dark:text-slate-400" />
                    <Text className="text-slate-600 dark:text-slate-400 text-xs font-medium">WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Timeline Entry 4 */}
            <View className="flex-row">
              <View className="flex-col items-center w-10">
                <View className="w-10 h-10 items-center justify-center rounded-full bg-accent/10 border-2 border-white dark:border-slate-900 z-10">
                  <MaterialIcons name="person-add" size={20} className="text-accent" />
                </View>
              </View>
              <View className="flex-1 pb-4 pl-4 pt-1">
                <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold">Customer created</Text>
                <Text className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Oct 20, 2023, 11:45 AM</Text>
                <Text className="text-slate-400 dark:text-slate-500 text-xs mt-4 uppercase tracking-wider font-bold">End of History</Text>
              </View>
            </View>

          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
