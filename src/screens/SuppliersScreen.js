import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, SafeAreaView, Alert, Modal, Platform } from 'react-native';
import { useStore } from '../store/useStore';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../i18n/LanguageContext';
import { calculateSupplierBalances } from '../utils/balanceCalculator';
import { formatAmount } from '../utils/formatters';

const round2 = v => Math.round(v * 100) / 100;

export default function SuppliersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const profile = useStore(state => state.profile);
  const suppliers = useStore(state => state.suppliers);
  const purchases = useStore(state => state.purchases);
  const supplierPayments = useStore(state => state.supplierPayments);
  const deleteSupplier = useStore(state => state.deleteSupplier);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL | GET | GIVE
  const { t } = useTranslation();

  const sym = profile.currency_symbol || '₹';

  // Compute Supplier Balances
  const supplierBalancesList = useMemo(() => {
    return suppliers.map(s => {
      const bals = calculateSupplierBalances(s.id, purchases || [], supplierPayments || []);
      return {
        ...s,
        totalPurchased: bals.totalPurchased,
        totalPaid: bals.totalPaid,
        net: bals.net,
      };
    });
  }, [suppliers, purchases, supplierPayments]);

  const filteredSuppliers = useMemo(() => {
    return supplierBalancesList
      .filter(s => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          if (!(s.name || '').toLowerCase().includes(q) && !(s.email || '').toLowerCase().includes(q) && !(s.phone || '').includes(q)) return false;
        }
        if (filter === 'GET') return s.net < -0.01;
        if (filter === 'GIVE') return s.net > 0.01;
        return true;
      })
      .sort((a, b) => b.net - a.net);
  }, [supplierBalancesList, searchQuery, filter]);

  const totals = useMemo(() => {
    let youllGive = 0;
    let youllGet = 0;
    supplierBalancesList.forEach(s => {
      if (s.net > 0) youllGive += s.net;
      else if (s.net < 0) youllGet += Math.abs(s.net);
    });
    return { youllGive: round2(youllGive), youllGet: round2(youllGet) };
  }, [supplierBalancesList]);

  const [activeSupplier, setActiveSupplier] = useState(null);

  const handleDelete = (supplier) => {
    setActiveSupplier(null);
    setTimeout(() => {
      Alert.alert(
        "Delete Supplier",
        `Are you sure you want to delete ${supplier.name}?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive",
            onPress: async () => {
              try { await deleteSupplier(supplier.id); }
              catch (error) { Alert.alert('Error', error.message); }
            }
          }
        ]
      );
    }, 400);
  };

  const getColor = (name) => {
    const colors = ['#059669', '#2563eb', '#ea580c', '#db2777', '#dc2626', '#6366f1', '#7c3aed', '#0891b2', '#4f46e5', '#0d9488'];
    const idx = (name || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % colors.length;
    return colors[idx];
  };

  const renderItem = ({ item }) => {
    const initials = (item.name || '?').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const isNegative = item.net > 0.01; // We owe them money = You'll Give = Red
    const isPositive = item.net < -0.01; // They owe us (advance) = You'll Get = Emerald

    let lastActivityStr = 'Few moments ago';
    if (item.updated_at || item.created_at) {
      const dateVal = item.updated_at || item.created_at;
      const diffStr = Date.now() - new Date(dateVal).getTime();
      const days = Math.floor(diffStr / (1000 * 60 * 60 * 24));
      if (days > 0) lastActivityStr = `${days} days ago`;
    }

    return (
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 24,
          marginBottom: 14,
          padding: 18,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#f1f5f9',
          shadowColor: '#64748b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('SupplierProfile', { supplierId: item.id })}
          activeOpacity={0.7}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
        >
          <View style={{
            width: 52, height: 52, borderRadius: 16, backgroundColor: '#262A5610',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: '#262A56', fontWeight: '900', fontSize: 16 }}>{initials}</Text>
          </View>

          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#262A56' }} numberOfLines={1}>
              {item.name}
            </Text>
            <View className="flex-row items-center gap-1.5 mt-1">
              <MaterialIcons name="access-time" size={10} color="#94a3b8" />
              <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>
                {lastActivityStr}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <MaterialIcons name="storefront" size={12} color="#64748b" />
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#64748b' }}>
                  Supplier Account
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', paddingLeft: 12, height: 85 }}>
          <View style={{ alignItems: 'flex-end' }}>
            {isNegative ? (
              <>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#f43f5e' }}>
                  {formatAmount(Math.abs(item.net), sym)}
                </Text>
                <Text style={{ fontSize: 8, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
                  YOU'LL GIVE
                </Text>
              </>
            ) : isPositive ? (
              <>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#10b981' }}>
                  {formatAmount(Math.abs(item.net), sym)}
                </Text>
                <Text style={{ fontSize: 8, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
                  YOU'LL GET
                </Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#cbd5e1' }}>{sym}0</Text>
                <Text style={{ fontSize: 8, fontWeight: '900', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
                  SETTLED
                </Text>
              </>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setActiveSupplier(item)}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#262A56',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 12,
              shadowColor: '#262A56', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
            }}
          >
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' }}>Options</Text>
          </TouchableOpacity>
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
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>Supplier Ledger</Text>
          <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-2xl bg-white/10">
            <MaterialIcons name="notifications-none" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Premium Summary Cards ── */}
      <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: 20, marginTop: -20 }}>
        {/* You'll Give (Purchase due -> RED, because it's outstanding debt) */}
        <TouchableOpacity
          onPress={() => setFilter(filter === 'GIVE' ? 'ALL' : 'GIVE')}
          activeOpacity={0.9}
          style={{
            flex: 1, backgroundColor: '#fff', borderRadius: 24, padding: 20,
            borderTopWidth: 6, borderTopColor: '#f43f5e',
            shadowColor: '#f43f5e', shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
            borderWidth: 1, borderColor: filter === 'GIVE' ? '#f43f5e30' : '#f43f5e10'
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <View className="bg-rose-50 p-1.5 rounded-lg">
              <MaterialIcons name="call-made" size={14} color="#f43f5e" />
            </View>
            <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>You'll Give</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#f43f5e' }} numberOfLines={1} adjustsFontSizeToFit>
            {sym} {formatAmount(totals.youllGive)}
          </Text>
        </TouchableOpacity>

        {/* You'll Get (Advance paid -> EMERALD) */}
        <TouchableOpacity
          onPress={() => setFilter(filter === 'GET' ? 'ALL' : 'GET')}
          activeOpacity={0.9}
          style={{
            flex: 1, backgroundColor: '#fff', borderRadius: 24, padding: 20,
            borderTopWidth: 6, borderTopColor: '#10b981',
            shadowColor: '#10b981', shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
            borderWidth: 1, borderColor: filter === 'GET' ? '#10b98130' : '#10b98110'
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <View className="bg-emerald-50 p-1.5 rounded-lg">
              <MaterialIcons name="call-received" size={14} color="#10b981" />
            </View>
            <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>You'll Get</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#10b981' }} numberOfLines={1} adjustsFontSizeToFit>
            {sym} {formatAmount(totals.youllGet)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Modern Search & Stats ── */}
      <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <View style={{
          backgroundColor: '#fff', borderRadius: 20,
          flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56,
          borderWidth: 1, borderColor: '#f1f5f9',
          shadowColor: '#64748b', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
        }}>
          <MaterialIcons name="search" size={22} color="#94a3b8" />
          <TextInput
            style={{ flex: 1, marginLeft: 12, fontSize: 15, color: '#262A56', fontWeight: '700' }}
            placeholder="Search suppliers..."
            placeholderTextColor="#cbd5e1"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} className="bg-slate-100 p-1 rounded-full">
              <MaterialIcons name="close" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-[#262A56]" />
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {filteredSuppliers.length} Suppliers Active
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setFilter(filter === 'ALL' ? (totals.youllGet > totals.youllGive ? 'GET' : 'GIVE') : 'ALL')}
            className="flex-row items-center gap-1.5 py-1.5 px-3 rounded-full bg-slate-100"
          >
            <MaterialIcons name="filter-list" size={14} color="#64748b" />
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b' }}>{filter === 'ALL' ? 'FILTERS' : filter}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Supplier List ── */}
      <FlatList
        data={filteredSuppliers}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 100 }}>
            <View className="bg-slate-50 p-8 rounded-full mb-6">
              <MaterialIcons name="inventory" size={64} color="#cbd5e1" />
            </View>
            <Text style={{ color: '#262A56', fontWeight: '900', fontSize: 18 }}>No suppliers found</Text>
            <Text style={{ color: '#94a3b8', fontWeight: '600', marginTop: 6 }}>Record your first purchase</Text>
          </View>
        }
      />

      {/* ── Premium Floating Action Pill ── */}
      <TouchableOpacity
        onPress={() => navigation.navigate('EditSupplierProfile')}
        style={{
          position: 'absolute', bottom: Math.max(insets.bottom, 100), alignSelf: 'center',
          backgroundColor: '#262A56', flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 28, paddingVertical: 18, borderRadius: 32,
          shadowColor: '#262A56', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 12
        }}
      >
        <MaterialIcons name="add-business" size={20} color="#fff" />
        <Text style={{ fontSize: 14, fontWeight: '900', color: '#fff', marginLeft: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Add Supplier</Text>
      </TouchableOpacity>

      {/* ── Premium Navigation Tab ── */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', height: 85,
        flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9',
        paddingBottom: Math.max(insets.bottom, 10),
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20, elevation: 10
      }}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('CustomerLedger')} 
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}
        >
          <MaterialIcons name="people" size={18} color="#94a3b8" />
          <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Customers</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: '#262A5610', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
            <MaterialIcons name="inventory" size={18} color="#262A56" />
          </View>
          <Text style={{ fontSize: 10, fontWeight: '900', color: '#262A56', textTransform: 'uppercase', letterSpacing: 0.5 }}>Suppliers</Text>
          <View style={{ width: 32, height: 4, backgroundColor: '#262A56', borderRadius: 2, position: 'absolute', top: 0 }} />
        </View>
      </View>

      {/* ── Supplier Options Action Sheet ── */}
      <Modal visible={!!activeSupplier} transparent animationType="fade" onRequestClose={() => setActiveSupplier(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setActiveSupplier(null)}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 20) }}>
            <View style={{ width: 40, height: 5, borderRadius: 10, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20 }} />
            {activeSupplier && (
              <View style={{ paddingHorizontal: 24, marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View className="w-14 h-14 rounded-2xl bg-slate-50 items-center justify-center">
                  <Text className="text-xl font-black text-slate-400">{(activeSupplier.name || '?')[0].toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#262A56' }}>{activeSupplier.name}</Text>
                  <Text style={{ fontSize: 12, color: activeSupplier.net > 0 ? '#f43f5e' : '#10b981', fontWeight: '900' }}>
                    {activeSupplier.net > 0 ? 'You owe ' : 'They owe you '}{formatAmount(Math.abs(activeSupplier.net), sym)}
                  </Text>
                </View>
              </View>
            )}
            <View style={{ paddingHorizontal: 24, gap: 10 }}>
              <TouchableOpacity
                onPress={() => { const s = activeSupplier; setActiveSupplier(null); setTimeout(() => navigation.navigate('RecordPayment', { role: 'supplier', entityId: s.id, entityName: s.name }), 300); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fdfdff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#f1f5f9' }}
              >
                <View className="w-10 h-10 rounded-xl bg-emerald-500 items-center justify-center">
                  <MaterialIcons name="payments" size={20} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#262A56' }}>Record Payment</Text>
                  <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Settle supplier balances</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { const s = activeSupplier; setActiveSupplier(null); setTimeout(() => navigation.navigate('CreatePurchase', { supplierId: s.id, supplierName: s.name }), 300); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fdfdff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#f1f5f9' }}
              >
                <View className="w-10 h-10 rounded-xl bg-amber-500 items-center justify-center">
                  <MaterialIcons name="add-shopping-cart" size={20} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#262A56' }}>Create Purchase</Text>
                  <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Record a new incoming order</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(activeSupplier)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff5f5', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#fee2e2' }}
              >
                <View className="w-10 h-10 rounded-xl bg-rose-500 items-center justify-center">
                  <MaterialIcons name="delete-outline" size={20} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#991b1b' }}>Delete Supplier</Text>
                  <Text style={{ fontSize: 10, color: '#f43f5e', fontWeight: '700', textTransform: 'uppercase' }}>Permanently remove record</Text>
                </View>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setActiveSupplier(null)} style={{ marginHorizontal: 24, marginTop: 16, paddingVertical: 18, borderRadius: 20, backgroundColor: '#f8fafc', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
