import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  
  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      {/* Header */}
      <View className="flex-row items-center bg-background-light/80 dark:bg-background-dark/80 p-4 border-b border-slate-200 dark:border-slate-800 z-10 pt-12">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
          <MaterialIcons name="arrow-back" size={24} className="text-slate-900 dark:text-slate-100" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-bold text-slate-900 dark:text-slate-100 pr-10">Settings</Text>
      </View>

      <ScrollView className="flex-1 pt-4 pb-24" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 120) }}>
        {/* Sync Section */}
        <View className="px-4 mb-6">
          <View className="flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
            <View className="flex-col gap-1">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="cloud-done" size={20} className="text-primary" />
                <Text className="text-slate-900 dark:text-slate-100 text-base font-bold leading-tight">Sync to Cloud</Text>
              </View>
              <Text className="text-slate-600 dark:text-slate-400 text-sm font-normal leading-normal mt-1">
                Last synced: 2 minutes ago. Your data is encrypted with AES-256.
              </Text>
            </View>
            <View className="flex-row gap-3 w-full mt-2">
              <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-2 rounded-lg h-11 px-4 bg-primary hover:bg-primary/90">
                <MaterialIcons name="sync" size={18} color="white" />
                <Text className="text-white text-sm font-semibold">Sync Now</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-2 rounded-lg h-11 px-4 border border-primary bg-white dark:bg-transparent">
                <MaterialIcons name="cloud-download" size={18} className="text-primary" />
                <Text className="text-primary text-sm font-semibold">Download</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Account & Security */}
        <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider px-4 pb-2">Account & Security</Text>
        <View className="bg-white dark:bg-slate-900/50 mx-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-6 overflow-hidden">
          <TouchableOpacity className="flex-row items-center justify-between px-4 py-4 min-h-[56px] border-b border-slate-100 dark:border-slate-800">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-lg bg-primary/10 items-center justify-center">
                <MaterialIcons name="mail" size={20} className="text-primary" />
              </View>
              <Text className="text-slate-900 dark:text-slate-100 text-base font-medium">Email Preferences</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} className="text-slate-400" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between px-4 py-4 min-h-[56px]">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-lg bg-primary/10 items-center justify-center">
                <MaterialIcons name="security" size={20} className="text-primary" />
              </View>
              <Text className="text-slate-900 dark:text-slate-100 text-base font-medium">Privacy & Security</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} className="text-slate-400" />
          </TouchableOpacity>
        </View>

        {/* Support & Community */}
        <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider px-4 pb-2">Support & Community</Text>
        <View className="bg-white dark:bg-slate-900/50 mx-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-6 overflow-hidden">
          <TouchableOpacity className="flex-row items-center justify-between px-4 py-4 min-h-[56px] border-b border-slate-100 dark:border-slate-800">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-lg bg-primary/10 items-center justify-center">
                <MaterialIcons name="chat-bubble" size={20} className="text-primary" />
              </View>
              <Text className="text-slate-900 dark:text-slate-100 text-base font-medium">Feedback</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} className="text-slate-400" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between px-4 py-4 min-h-[56px] border-b border-slate-100 dark:border-slate-800">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-lg bg-primary/10 items-center justify-center">
                <MaterialIcons name="share" size={20} className="text-primary" />
              </View>
              <Text className="text-slate-900 dark:text-slate-100 text-base font-medium">Share App</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} className="text-slate-400" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between px-4 py-4 min-h-[56px]">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-lg bg-primary/10 items-center justify-center">
                <MaterialIcons name="star" size={20} className="text-primary" />
              </View>
              <Text className="text-slate-900 dark:text-slate-100 text-base font-medium">Rate App</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} className="text-slate-400" />
          </TouchableOpacity>
        </View>

        {/* Others */}
        <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider px-4 pb-2">Others</Text>
        <View className="bg-white dark:bg-slate-900/50 mx-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-6 overflow-hidden">
          <TouchableOpacity className="flex-row items-center justify-between px-4 py-4 min-h-[56px]">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-lg bg-primary/10 items-center justify-center">
                <MaterialIcons name="info" size={20} className="text-primary" />
              </View>
              <Text className="text-slate-900 dark:text-slate-100 text-base font-medium">About Zoxm Invoice</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-slate-400 text-sm font-normal">v2.4.0</Text>
              <MaterialIcons name="chevron-right" size={24} className="text-slate-400" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <View className="px-4 pb-8">
          <TouchableOpacity className="flex-row items-center justify-center gap-2 rounded-xl h-12 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
            <MaterialIcons name="logout" size={20} color="#ef4444" />
            <Text className="text-red-500 text-base font-bold">Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
