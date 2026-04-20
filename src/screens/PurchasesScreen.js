import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, SafeAreaView, Alert } from 'react-native';
import { useStore } from '../store/useStore';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatAmount } from '../utils/formatters';

export default function PurchasesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const profile = useStore(state => state.profile);
  const purchases = useStore(state => state.purchases);
  const deletePurchase = useStore(state => state.deletePurchase);
  
  const sym = profile.currency_symbol || '₹';

  // Basic sorting - newest first
  const sortedPurchases = [...purchases].sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleDelete = (purchase) => {
    Alert.alert(
      "Delete Purchase Bill",
      `Are you sure you want to delete bill ${purchase.billNumber}? This will revert item stock logic.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try { await deletePurchase(purchase.id); }
            catch (error) { Alert.alert('Error', error.message); }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'paid': return { bg: '#dcfce7', text: '#166534' };
      case 'unpaid': return { bg: '#fee2e2', text: '#991b1b' };
      case 'partial': return { bg: '#fef3c7', text: '#92400e' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const renderItem = ({ item }) => {
    const sc = getStatusColor(item.status);

    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        // Future: onPress={() => navigation.navigate('PurchaseDetail', { purchaseId: item.id })}
        style={{
          backgroundColor: '#fff',
          borderRadius: 16, padding: 16, marginBottom: 12,
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
        }}
        className="dark:bg-slate-900"
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>{item.supplierName || 'Unknown Supplier'}</Text>
            <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: '600' }}>Bill: {item.billNumber}</Text>
          </View>
          <View style={{ backgroundColor: sc.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: sc.text, textTransform: 'uppercase' }}>{item.status || 'Unpaid'}</Text>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 }} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>Date</Text>
            <Text style={{ fontSize: 14, color: '#334155', fontWeight: '700', marginTop: 2 }}>{new Date(item.date).toLocaleDateString()}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>Total Amount</Text>
            <Text style={{ fontSize: 18, color: '#0f172a', fontWeight: '900', marginTop: 2 }}>{formatAmount(item.total, sym)}</Text>
          </View>
        </View>

        {/* Delete button (Temp until PurchaseDetail exists) */}
        <TouchableOpacity 
           onPress={() => handleDelete(item)}
           style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, alignItems: 'flex-end' }}
        >
          <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13 }}>Delete Bill</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* ─── Header ─── */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingTop: 20, paddingBottom: 16 }}>
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 }}>Purchase Bills</Text>
              <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, fontWeight: '500' }}>
                {purchases.length} {purchases.length === 1 ? 'bill' : 'bills'}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            onPress={() => navigation.navigate('CreatePurchase')}
            style={{
              width: 44, height: 44, borderRadius: 14,
              backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center',
              shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
            }}
          >
            <MaterialIcons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── List ─── */}
      <FlatList 
        data={sortedPurchases}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 80) }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 100, opacity: 0.5 }}>
            <MaterialIcons name="receipt-long" size={64} color="#94a3b8" />
            <Text style={{ color: '#64748b', fontWeight: '700', marginTop: 16, fontSize: 16 }}>No purchases yet</Text>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>Tap + to record your first purchase</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
