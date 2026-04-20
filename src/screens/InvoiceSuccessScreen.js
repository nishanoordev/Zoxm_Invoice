import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Share, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';

export default function InvoiceSuccessScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const {
    invoiceNumber = '#INV-2024-001',
    customerName = 'Customer',
    totalAmount = 0,
    status = 'Sent',
  } = route.params || {};
  const profile = useStore(state => state.profile);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Invoice ${invoiceNumber} for ${customerName}\nAmount: ${profile.currency_symbol || '$'}${(parseFloat(totalAmount) || 0).toFixed(2)}\nStatus: ${status}`,
        title: `Invoice ${invoiceNumber}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const statusColors = {
    Sent: { bg: 'bg-blue-100', text: 'text-blue-700' },
    Paid: { bg: 'bg-green-100', text: 'text-green-700' },
    Draft: { bg: 'bg-slate-100', text: 'text-slate-700' },
    Overdue: { bg: 'bg-red-100', text: 'text-red-700' },
    Partial: { bg: 'bg-amber-100', text: 'text-amber-700' },
  };
  const statusStyle = statusColors[status] || statusColors.Sent;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-background-dark">
      {/* Header */}
      <View
        style={{ paddingTop: Platform.OS === 'android' ? 40 : 10 }}
        className="flex-row items-center bg-white dark:bg-slate-900 px-4 pb-4 border-b border-slate-100 dark:border-slate-800"
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('Main')}
          className="w-10 h-10 items-center justify-center rounded-full"
        >
          <MaterialIcons name="arrow-back" size={24} color="#262A56" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-base font-bold text-slate-900 dark:text-white">
          ZOXM Invoice
        </Text>
        <View className="w-10" />
      </View>

      <View className="flex-1 px-6">
        {/* Success Icon */}
        <View className="items-center mt-12 mb-8">
          <View className="relative">
            <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center">
              <View className="w-16 h-16 rounded-full bg-primary items-center justify-center shadow-xl">
                <MaterialIcons name="check" size={36} color="white" />
              </View>
            </View>
            {/* Decorative dots */}
            <View className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-blue-300/40" />
            <View className="absolute top-4 -left-3 w-3 h-3 rounded-full bg-primary/20" />
            <View className="absolute -bottom-1 right-0 w-2 h-2 rounded-full bg-accent/30" />
          </View>

          <Text className="text-3xl font-black text-slate-900 dark:text-white mt-6 text-center leading-tight">
            Invoice Sent{'\n'}Successfully
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-center mt-3 text-sm leading-relaxed px-4">
            The ledger has been updated. Your client will receive the invoice via email shortly.
          </Text>
        </View>

        {/* Invoice Details Card */}
        <View className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <View className="flex-row border-b border-slate-100 dark:border-slate-700">
            <View className="flex-1 p-4">
              <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                Invoice Number
              </Text>
              <Text className="text-base font-black text-primary dark:text-white">
                {invoiceNumber}
              </Text>
            </View>
            <View className="p-4 items-end justify-center">
              <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                Status
              </Text>
              <View className={`px-3 py-1 rounded-full ${statusStyle.bg}`}>
                <Text className={`text-xs font-bold uppercase tracking-wider ${statusStyle.text}`}>
                  {status}
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row border-b border-slate-100 dark:border-slate-700">
            <View className="flex-1 p-4">
              <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
                Recipient
              </Text>
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-full bg-primary items-center justify-center">
                  <Text className="text-white font-black text-sm">
                    {customerName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text className="text-base font-bold text-slate-900 dark:text-white flex-shrink">
                  {customerName}
                </Text>
              </View>
            </View>
            <View className="p-4 items-end justify-center">
              <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                Total Amount
              </Text>
              <Text className="text-xl font-black text-slate-900 dark:text-white">
                {profile.currency_symbol || '$'}{(parseFloat(totalAmount) || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="mt-6 gap-3">
          <TouchableOpacity
            onPress={() => navigation.navigate('Main')}
            className="w-full py-4 bg-primary rounded-2xl flex-row items-center justify-center gap-2 shadow-lg"
          >
            <MaterialIcons name="dashboard" size={20} color="white" />
            <Text className="text-white font-black uppercase tracking-wider text-sm">
              Back to Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            className="w-full py-4 bg-white dark:bg-slate-800 rounded-2xl flex-row items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
          >
            <MaterialIcons name="share" size={20} color="#262A56" />
            <Text className="text-primary dark:text-white font-bold text-sm">Share PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Footer note */}
        <Text className="text-center text-slate-400 text-xs mt-6 leading-relaxed">
          Need to make a change? You can still{' '}
          <Text className="text-primary font-bold">Edit Invoice</Text> within the next 15 minutes.
        </Text>
      </View>
    </SafeAreaView>
  );
}
