import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, SafeAreaView, Alert, Linking } from 'react-native';
import { useStore } from '../store/useStore';
import { calculateCustomerBalances } from '../utils/balanceCalculator';
import { formatAmount } from '../utils/formatters';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../i18n/LanguageContext';

export default function CustomersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const profile = useStore(state => state.profile);
  const customers = useStore(state => state.customers);
  const invoices = useStore(state => state.invoices);
  const payments = useStore(state => state.payments);
  const deleteCustomer = useStore(state => state.deleteCustomer);
  const customerWallets = useStore(state => state.customerWallets);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const { t } = useTranslation();

  const sym = profile.currency_symbol || '₹';

  const getCustomerBalance = (customerId) => {
    const { totalDue, creditBalance } = calculateCustomerBalances(customerId, invoices, payments);
    const walletBalance = customerWallets[customerId] || 0;
    return { totalDue, creditBalance, walletBalance };
  };

  const getCustomerDue = (customerId) => getCustomerBalance(customerId).totalDue;

  // Stats
  const stats = useMemo(() => {
    let totalDue = 0;
    let unpaidCount = 0;
    customers.forEach(c => {
      const due = getCustomerDue(c.id);
      totalDue += due;
      if (due > 0) unpaidCount++;
    });
    return { totalCustomers: customers.length, totalDue, unpaidCount };
  }, [customers, invoices, payments]);

  const filteredCustomers = customers
    .filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.phone && c.phone.includes(searchQuery));
      if (!matchesSearch) return false;
      if (activeTab === 'Unpaid') return getCustomerDue(c.id) > 0;
      if (activeTab === 'Active') return invoices.some(inv => inv.customerId === c.id || inv.customer_id === c.id);
      return true;
    })
    .sort((a, b) => getCustomerDue(b.id) - getCustomerDue(a.id));

  const handleDelete = (customer) => {
    Alert.alert(
      "Delete Customer",
      `Are you sure you want to delete ${customer.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try { await deleteCustomer(customer.id); }
            catch (error) { Alert.alert('Error', error.message); }
          }
        }
      ]
    );
  };

  // ── Avatar ──
  const Avatar = ({ name }) => {
    const initials = (name || '?')
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const colorList = [
      '#6366f1', '#7c3aed', '#db2777', '#dc2626', '#ea580c',
      '#0891b2', '#059669', '#2563eb', '#4f46e5', '#0d9488',
      '#9333ea', '#0284c7',
    ];
    const idx = (name || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % colorList.length;
    const bg = colorList[idx];

    return (
      <View
        style={{
          width: 48, height: 48, borderRadius: 24,
          backgroundColor: bg,
          shadowColor: bg, shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.35, shadowRadius: 6, elevation: 4,
        }}
        className="items-center justify-center"
      >
        <Text style={{ fontSize: 17, color: '#fff', fontWeight: '800', letterSpacing: 0.5 }}>{initials}</Text>
      </View>
    );
  };

  // ── Customer Card ──
  const renderItem = ({ item }) => {
    const { totalDue, walletBalance } = getCustomerBalance(item.id);

    return (
      <TouchableOpacity 
        onPress={() => navigation.navigate('CustomerProfile', { customerId: item.id })}
        activeOpacity={0.7}
        style={{
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
          marginBottom: 14,
        }}
        className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden"
      >
        {/* Main Row */}
        <View className="flex-row items-center p-4">
          <Avatar name={item.name} />

          {/* Name + Contact */}
          <View className="flex-1 ml-4" style={{ minWidth: 0 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', letterSpacing: -0.3 }} numberOfLines={1}>
              {item.name}
            </Text>
            {item.phone ? (
              <View className="flex-row items-center" style={{ marginTop: 5 }}>
                <MaterialIcons name="phone" size={13} color="#334155" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginLeft: 5 }} numberOfLines={1}>
                  {item.phone}
                </Text>
              </View>
            ) : item.email ? (
              <View className="flex-row items-center" style={{ marginTop: 5 }}>
                <MaterialIcons name="email" size={13} color="#334155" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginLeft: 5 }} numberOfLines={1}>
                  {item.email}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>No contact info</Text>
            )}
          </View>

          {/* Balance + Wallet Badges — always separate */}
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {/* BALANCE badge — money customer owes */}
            <View style={{
              backgroundColor: totalDue > 0 ? '#fef2f2' : '#f8fafc',
              borderWidth: 1,
              borderColor: totalDue > 0 ? '#fecaca' : '#e2e8f0',
              borderRadius: 10,
              paddingHorizontal: 9,
              paddingVertical: 4,
              alignItems: 'flex-end',
              minWidth: 72,
            }}>
              <Text style={{ fontSize: 8, fontWeight: '900', color: totalDue > 0 ? '#f87171' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>Balance</Text>
              <Text style={{ fontSize: 13, fontWeight: '900', color: totalDue > 0 ? '#dc2626' : '#cbd5e1', marginTop: 1 }}>
                {totalDue > 0 ? formatAmount(totalDue, sym) : `${sym}0`}
              </Text>
            </View>
            {/* WALLET badge — return credits only */}
            <View style={{
              backgroundColor: walletBalance > 0 ? '#f0fdf4' : '#f8fafc',
              borderWidth: 1,
              borderColor: walletBalance > 0 ? '#86efac' : '#e2e8f0',
              borderRadius: 10,
              paddingHorizontal: 9,
              paddingVertical: 4,
              alignItems: 'flex-end',
              minWidth: 72,
            }}>
              <Text style={{ fontSize: 8, fontWeight: '900', color: walletBalance > 0 ? '#34d399' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>Wallet</Text>
              <Text style={{ fontSize: 13, fontWeight: '900', color: walletBalance > 0 ? '#059669' : '#cbd5e1', marginTop: 1 }}>
                {walletBalance > 0 ? formatAmount(walletBalance, sym) : `${sym}0`}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Action Bar */}
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#fafbfc' }}>

          <TouchableOpacity 
            onPress={() => navigation.navigate('CreateInvoice', { customerId: item.id, customerName: item.name })}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4 }}
          >
            <MaterialIcons name="receipt-long" size={14} color="#d97706" />
          </TouchableOpacity>
          <View style={{ width: 1, backgroundColor: '#f1f5f9' }} />
          <TouchableOpacity 
            onPress={() => {
              if(!item.phone) Alert.alert('Notice', 'No phone number for this customer');
              else Linking.openURL(`tel:${item.phone}`).catch(() => Alert.alert('Error', 'Unable to open phone dialer'));
            }}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4 }}
          >
            <MaterialIcons name="call" size={14} color="#059669" />
          </TouchableOpacity>
          <View style={{ width: 1, backgroundColor: '#f1f5f9' }} />
          <TouchableOpacity 
            onPress={() => {
              if(!item.phone) Alert.alert('Notice', 'No phone number for this customer');
              else Linking.openURL(`whatsapp://send?phone=${item.phone}`).catch(e => {
                Linking.openURL(`sms:${item.phone}`).catch(() => Alert.alert('Error', 'Unable to open messaging app'));
              });
            }}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4 }}
          >
            <MaterialIcons name="chat" size={14} color="#16a34a" />
          </TouchableOpacity>

          <View style={{ width: 1, backgroundColor: '#f1f5f9' }} />
          <TouchableOpacity 
            onPress={() => handleDelete(item)}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4 }}
          >
            <MaterialIcons name="delete-outline" size={14} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const tabs = [
    { key: 'All', label: t('all'), count: customers.length },
    { key: 'Active', label: t('active'), count: customers.filter(c => invoices.some(inv => inv.customerId === c.id || inv.customer_id === c.id)).length },
    { key: 'Unpaid', label: t('unpaid'), count: stats.unpaidCount },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* ─── Header ─── */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingTop: 48 }}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          {/* Title Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 }}>{t('customers')}</Text>
              <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, fontWeight: '500' }}>
                {stats.totalCustomers} {stats.totalCustomers === 1 ? 'customer' : 'customers'}
                {stats.totalDue > 0 ? ` · ${formatAmount(stats.totalDue, sym)} due` : ''}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => navigation.navigate('EditCustomerProfile')}
              style={{
                width: 44, height: 44, borderRadius: 14,
                backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center',
                shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
              }}
            >
              <MaterialIcons name="person-add" size={22} color="white" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={{ 
            flexDirection: 'row', alignItems: 'center', 
            backgroundColor: '#f8fafc', borderRadius: 12, 
            paddingHorizontal: 14, borderWidth: 1, borderColor: '#e2e8f0' 
          }}>
            <MaterialIcons name="search" size={20} color="#94a3b8" />
            <TextInput 
              style={{ flex: 1, marginLeft: 8, paddingVertical: 10, fontSize: 14, color: '#1e293b' }}
              placeholder={t('searchCustomers')}
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20 }}>
          {tabs.map(tab => (
            <TouchableOpacity 
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{ 
                marginRight: 24, paddingBottom: 12,
                borderBottomWidth: 2, 
                borderBottomColor: activeTab === tab.key ? '#6366f1' : 'transparent',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ 
                  fontSize: 14, 
                  color: activeTab === tab.key ? '#6366f1' : '#94a3b8',
                  fontWeight: activeTab === tab.key ? '700' : '500',
                }}>
                  {tab.label}
                </Text>
                <View style={{ 
                  paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                  backgroundColor: activeTab === tab.key ? '#eef2ff' : '#f1f5f9',
                }}>
                  <Text style={{ 
                    fontSize: 11, fontWeight: '700',
                    color: activeTab === tab.key ? '#6366f1' : '#94a3b8',
                  }}>
                    {tab.count}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ─── Customer List ─── */}
      <FlatList 
        data={filteredCustomers}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 80) }}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 100, opacity: 0.5 }}>
            <MaterialIcons name="people-outline" size={64} color="#94a3b8" />
            <Text style={{ color: '#64748b', fontWeight: '700', marginTop: 16, fontSize: 16 }}>
              {searchQuery ? 'No customers found' : 'No customers yet'}
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
              {searchQuery ? 'Try a different search' : 'Tap + to add your first customer'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
