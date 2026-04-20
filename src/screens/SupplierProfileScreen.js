import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Linking, Modal, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { calculateSupplierBalances } from '../utils/balanceCalculator';
import { formatAmount } from '../utils/formatters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SupplierProfileScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { supplierId } = route.params || {};
  const [activeTab, setActiveTab] = useState('Transactions');
  
  const suppliers = useStore(state => state.suppliers);
  const purchases = useStore(state => state.purchases);
  const supplierPayments = useStore(state => state.supplierPayments);
  const profile = useStore(state => state.profile);
  const deleteSupplier = useStore(state => state.deleteSupplier);

  const supplier = suppliers.find(s => String(s.id) === String(supplierId));
  const sym = profile.currency_symbol || '₹';

  const supplierPurchases = useMemo(() => 
    purchases.filter(p => (p.supplierId === supplierId || p.supplier_id === supplierId)),
    [purchases, supplierId]
  );

  const paymentsToSupplier = useMemo(() => 
    supplierPayments.filter(p => (p.supplierId === supplierId || p.supplier_id === supplierId)),
    [supplierPayments, supplierId]
  );

  const allTransactions = useMemo(() => {
    const combined = [
      ...supplierPurchases.map(p => ({ ...p, transactionType: 'Purchase' })),
      ...paymentsToSupplier.map(p => ({ ...p, transactionType: 'Payment' }))
    ];
    return combined.sort((a, b) => {
      const dateA = new Date(a.date || a.created_at || 0);
      const dateB = new Date(b.date || b.created_at || 0);
      return dateB - dateA;
    });
  }, [supplierPurchases, paymentsToSupplier]);

  const { totalPurchased, totalPaid, net } = useMemo(
    () => calculateSupplierBalances(supplierId, purchases, supplierPayments),
    [supplierId, purchases, supplierPayments]
  );

  const formatDateTime = useCallback((raw) => {
    if (!raw) return '';
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return raw;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return raw; }
  }, []);

  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '??';
    return name.trim().split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().substring(0, 2) || '??';
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Supplier',
      `Are you sure you want to delete ${supplier.name}? All history will be kept in database but supplier won't show in list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSupplier(supplierId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  if (!supplier) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#262A56" />
      </View>
    );
  }

  const TransactionItem = ({ tx }) => {
    const isPurchase = tx.transactionType === 'Purchase';
    const amount = parseFloat(tx.total || tx.amount || 0);
    const date = formatDateTime(tx.date || tx.created_at);
    
    let icon = isPurchase ? 'shopping-cart' : 'payments';
    let color = isPurchase ? '#262A56' : '#10b981';
    let label = isPurchase ? 'Purchase Bill' : 'Payment Out';
    
    return (
      <View className="bg-white rounded-3xl mb-4 border border-slate-100 shadow-sm p-5">
        <View className="flex-row items-center gap-4">
          <View style={{ backgroundColor: color + '15', width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name={icon} size={24} color={color} />
          </View>
          <View className="flex-1">
            <Text className="font-black text-[#262A56] text-[15px]">{label}</Text>
            <Text className="text-slate-400 text-xs font-bold mt-1">Ref: #{tx.billNumber || tx.bill_number || (tx.id ? String(tx.id).substring(0, 8) : 'N/A')}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: isPurchase ? '#262A56' : '#10b981' }}>
              {isPurchase ? '' : '-'}{formatAmount(amount, sym)}
            </Text>
            <Text className="text-slate-400 text-[10px] font-bold mt-1">{date}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfdff' }}>
      {/* ── Premium Header ── */}
      <View style={{ 
        backgroundColor: '#262A56', 
        paddingHorizontal: 20, 
        paddingTop: Platform.OS === 'ios' ? 10 : 40, 
        paddingBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: '#262A56', shadowOpacity: 0.3, shadowRadius: 15, elevation: 10
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-2xl bg-white/10">
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>Supplier Profile</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('EditSupplierProfile', { supplier })}
            className="w-10 h-10 items-center justify-center rounded-2xl bg-white/10"
          >
            <MaterialIcons name="edit" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Identity Card */}
        <View className="p-6">
          <View className="flex-row items-center gap-5 bg-[#f8fafc] p-5 rounded-[32px] border border-slate-100 shadow-sm">
            <View className="bg-[#262A56] h-16 w-16 rounded-2xl items-center justify-center shadow-lg">
              <Text className="text-white font-black text-xl">{getInitials(supplier.name)}</Text>
            </View>
            <View className="flex-1">
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#262A56' }} numberOfLines={1}>{supplier.name}</Text>
              <View className="flex-row items-center gap-2 mt-1">
                <MaterialIcons name="phone" size={14} color="#64748b" />
                <Text className="text-slate-500 font-bold text-sm tracking-tight">{supplier.phone || 'No Mobile'}</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="flex-row items-center gap-2 mt-4">
            <TouchableOpacity 
              onPress={() => supplier.phone && Linking.openURL(`tel:${supplier.phone}`)}
              className="flex-1 flex-row items-center justify-center gap-2 bg-slate-50 h-10 rounded-2xl border border-slate-100"
            >
              <MaterialIcons name="call" size={16} color="#262A56" />
              <Text className="text-[#262A56] font-black text-[10px] uppercase tracking-widest">Call</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => supplier.phone && Linking.openURL(`whatsapp://send?phone=${supplier.phone}`)}
              className="flex-1 flex-row items-center justify-center gap-2 bg-slate-50 h-10 rounded-2xl border border-slate-100"
            >
              <MaterialIcons name="chat" size={16} color="#16a34a" />
              <Text className="text-[#16a34a] font-black text-[10px] uppercase tracking-widest">WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Primary Actions */}
        <View className="flex-row gap-3 px-6 mb-6">
          <TouchableOpacity
            onPress={() => navigation.navigate('RecordPayment', { role: 'supplier', entityId: supplier.id, entityName: supplier.name })}
            style={{ flex: 1, backgroundColor: '#10b981', height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <MaterialIcons name="payments" size={18} color="white" />
            <Text className="text-white font-black uppercase text-[12px] tracking-widest">Pay Vendor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('CreatePurchase', { supplierId: supplier.id, supplierName: supplier.name })}
            style={{ flex: 1, backgroundColor: '#262A56', height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <MaterialIcons name="add-shopping-cart" size={18} color="white" />
            <Text className="text-white font-black uppercase text-[12px] tracking-widest">New Bill</Text>
          </TouchableOpacity>
        </View>

        {/* Financial Cards */}
        <View className="flex-row gap-3 px-6 mb-8">
          <View className="flex-1 bg-white rounded-3xl p-5 border-t-4 border-rose-500 shadow-sm border border-slate-100">
            <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">You'll Give</Text>
            <Text className="text-xl font-black text-rose-500 uppercase">{formatAmount(Math.max(0, net), sym)}</Text>
            <Text className="text-[9px] font-bold text-slate-400 mt-2 uppercase">Current Debt</Text>
          </View>
          <View className="flex-1 bg-white rounded-3xl p-5 border-t-4 border-emerald-500 shadow-sm border border-slate-100">
            <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">You'll Get</Text>
            <Text className="text-xl font-black text-emerald-500 uppercase">{formatAmount(Math.abs(Math.min(0, net)), sym)}</Text>
            <Text className="text-[9px] font-bold text-slate-400 mt-2 uppercase">Advance Credit</Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row px-6 border-b border-slate-100">
          {['Transactions', 'Details'].map(tab => (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setActiveTab(tab)}
              className={`py-4 px-2 mr-6 border-b-4 ${activeTab === tab ? 'border-[#262A56]' : 'border-transparent'}`}
            >
              <Text className={`text-[10px] uppercase tracking-widest ${activeTab === tab ? 'text-[#262A56] font-black' : 'text-slate-400 font-bold'}`}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View className="p-6">
          {activeTab === 'Transactions' && (
            <View>
              {allTransactions.length === 0 ? (
                <View className="items-center py-20">
                  <MaterialIcons name="receipt" size={64} color="#f1f5f9" />
                  <Text className="text-slate-400 font-bold mt-4">No transactions found</Text>
                </View>
              ) : (
                allTransactions.map((tx, idx) => (
                  <TransactionItem key={tx.id || idx} tx={tx} />
                ))
              )}
            </View>
          )}

          {activeTab === 'Details' && (
            <View>
              <View className="mb-6">
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Office Address</Text>
                <View className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                  <Text className="text-[#262A56] font-bold leading-relaxed">{supplier.address || 'Address not mentioned.'}</Text>
                </View>
              </View>
              <View className="mb-6">
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">GSTIN Details</Text>
                <View className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                  <Text className="text-[#262A56] font-black text-lg">{supplier.gstin || 'Not Registered'}</Text>
                </View>
              </View>
              
              <TouchableOpacity onPress={handleDelete} className="mt-10 flex-row items-center justify-center p-5 rounded-3xl bg-rose-50 border border-rose-100 mb-20">
                <MaterialIcons name="delete-outline" size={22} color="#f43f5e" />
                <Text className="text-rose-500 font-black uppercase text-[12px] tracking-widest ml-2">Remove Supplier</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* View Reports Button placeholder */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 16, right: 16 }}>
        <TouchableOpacity 
          className="px-6 py-4 bg-[#262A56] rounded-full shadow-2xl border-4 border-white flex-row items-center gap-2"
        >
          <MaterialIcons name="analytics" size={20} color="white" />
          <Text className="text-white font-black text-[12px] uppercase tracking-widest">View PDF Ledger</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
