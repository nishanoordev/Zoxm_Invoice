/**
 * CustomerLedgerScreen.js
 *
 * Khatabook-style ledger: shows all customers with You'll Give / You'll Get summary,
 * net totals at top, and tapping a customer opens their full transaction ledger.
 * Includes due date tracking and remind customer via Call/WhatsApp/SMS.
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, SafeAreaView,
  TextInput, Linking, Alert, Modal, Platform,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { calculateCustomerBalances } from '../utils/balanceCalculator';
import { formatAmount } from '../utils/formatters';
import DatePickerModal from '../components/DatePickerModal';
const round2 = v => Math.round(v * 100) / 100;

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const formatFullDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
export default function CustomerLedgerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const customers = useStore(s => s.customers);
  const invoices = useStore(s => s.invoices);
  const payments = useStore(s => s.payments);
  const profile = useStore(s => s.profile);
  const customerWallets = useStore(s => s.customerWallets);
  const updateCustomer = useStore(s => s.updateCustomer);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL | GET | GIVE | OVERDUE

  // Remind Customer action sheet state
  const [remindCustomer, setRemindCustomer] = useState(null);

  // Due date picker state
  const [dueDateCustomer, setDueDateCustomer] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const sym = profile.currency_symbol || '₹';

  // Compute balance for every customer once
  const customerBalances = useMemo(() => {
    return customers.map(c => {
      const { totalDue, totalPaid, totalInvoiced, creditBalance } = calculateCustomerBalances(c.id, invoices, payments);
      const walletBal = customerWallets[c.id] || 0;
      // Positive = customer owes us ("You'll Get"), Negative = we owe them ("You'll Give")
      const net = round2(totalDue - creditBalance - walletBal);

      // Compute overdue status
      const dueDate = c.payment_due_date || '';
      let isOverdue = false;
      let daysUntilDue = null;
      if (dueDate && net > 0.01) {
        const dueDateObj = new Date(dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDateObj.setHours(0, 0, 0, 0);
        const diffMs = dueDateObj - today;
        daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        isOverdue = daysUntilDue < 0;
      }

      return {
        ...c,
        totalDue: round2(totalDue),
        walletBalance: round2(walletBal),
        net,
        totalInvoiced: round2(totalInvoiced),
        totalPaid: round2(totalPaid),
        dueDate,
        isOverdue,
        daysUntilDue,
      };
    });
  }, [customers, invoices, payments, customerWallets]);

  // Aggregate totals
  const totals = useMemo(() => {
    let computedDue = 0;
    let computedAdvance = 0;
    customerBalances.forEach(c => {
      if (c.net > 0) computedDue += c.net;
      else if (c.net < -0.01) computedAdvance += Math.abs(c.net);
    });
    return { youllGet: round2(computedDue), youllGive: round2(computedAdvance), net: round2(computedDue - computedAdvance) };
  }, [customerBalances]);

  // Filter + search
  const filtered = useMemo(() => {
    return customerBalances
      .filter(c => {
        if (search) {
          const q = search.toLowerCase();
          if (!c.name.toLowerCase().includes(q) && !(c.phone || '').includes(q)) return false;
        }
        if (filter === 'GET') return c.net > 0.01;
        if (filter === 'GIVE') return c.net < -0.01;
        if (filter === 'OVERDUE') return c.isOverdue && c.net > 0.01;
        return true;
      })
      .sort((a, b) => {
        // Sort overdue first when in OVERDUE filter
        if (filter === 'OVERDUE') {
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
        }
        return b.net - a.net;
      });
  }, [customerBalances, search, filter]);

  const overdueCount = useMemo(() => customerBalances.filter(c => c.isOverdue && c.net > 0.01).length, [customerBalances]);

  const handleWhatsApp = (customer) => {
    if (!customer.phone) return Alert.alert('Error', 'No phone number for this customer');
    Linking.openURL(`whatsapp://send?phone=${customer.phone}&text=Hi ${customer.name}, just a friendly reminder regarding your outstanding balance.`);
  };

  const handleSMS = (customer) => {
    if (!customer.phone) return Alert.alert('Error', 'No phone number for this customer');
    Linking.openURL(`sms:${customer.phone}?body=Hi ${customer.name}, just a friendly reminder regarding your outstanding balance.`);
  };

  const handleCall = (customer) => {
    if (!customer.phone) return Alert.alert('Error', 'No phone number for this customer');
    Linking.openURL(`tel:${customer.phone}`);
  };

  const handleSetDueDate = (customer) => {
    setDueDateCustomer(customer);
    setShowDatePicker(true);
  };

  const handleSaveDueDate = async (dateStr) => {
    if (!dueDateCustomer) return;
    // Spread the full existing customer so we don't blank phone/email/address
    const base = customers.find(c => c.id === dueDateCustomer.id) || dueDateCustomer;
    await updateCustomer({ ...base, payment_due_date: dateStr });
    setDueDateCustomer(null);
    setShowDatePicker(false);
  };

  const handleClearDueDate = async (customer) => {
    const base = customers.find(c => c.id === customer.id) || customer;
    await updateCustomer({ ...base, payment_due_date: '' });
  };

  const handleDueDateTap = (item) => {
    if (item.dueDate) {
      Alert.alert(
        'Payment Due Date',
        `Set for ${formatFullDate(item.dueDate)}`,
        [
          { text: 'Change Date', onPress: () => handleSetDueDate(item) },
          { text: 'Clear Date', style: 'destructive', onPress: () => handleClearDueDate(item) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      handleSetDueDate(item);
    }
  };

  const getColor = (name) => {
    const colors = ['#059669', '#2563eb', '#ea580c', '#db2777', '#dc2626', '#6366f1', '#7c3aed', '#0891b2'];
    const idx = (name || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % colors.length;
    return colors[idx];
  };

  const renderCustomer = useCallback(({ item }) => {
    const isDue = item.net > 0.01;
    const isAdvance = item.net < -0.01;
    const avatarColor = getColor(item.name);
    const initials = (item.name || '?').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const isOverdue = item.isOverdue;

    let lastActivityStr = 'Few moments ago';
    if (item.updated_at) {
      const diffMs = Date.now() - new Date(item.updated_at).getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (days === 1) lastActivityStr = '1 day ago';
      else if (days > 1) lastActivityStr = `${days} days ago`;
    }

    const amountColor = isDue ? '#f43f5e' : isAdvance ? '#10b981' : '#94a3b8';
    const displayAmount = isDue
      ? formatAmount(item.net, sym)
      : isAdvance
      ? formatAmount(Math.abs(item.net), sym)
      : `${sym}0`;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('CustomerProfile', { customerId: item.id })}
        activeOpacity={0.55}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 13,
          paddingHorizontal: 20,
          backgroundColor: isOverdue ? '#fff8f8' : '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
        }}
      >
        {/* Circular avatar */}
        <View style={{
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: avatarColor + '22',
          alignItems: 'center', justifyContent: 'center',
          marginRight: 14,
        }}>
          <Text style={{ color: avatarColor, fontWeight: '900', fontSize: 15 }}>{initials}</Text>
        </View>

        {/* Name + last activity + due-date */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b', letterSpacing: -0.2 }} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '500' }}>{lastActivityStr}</Text>
            <TouchableOpacity
              onPress={() => handleDueDateTap(item)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 12 }}
            >
              {item.dueDate ? (
                <Text style={{
                  fontSize: 11, fontWeight: '700',
                  color: isOverdue ? '#f43f5e' : '#475569',
                }}>
                  · {isOverdue ? '⚠️ ' : '📅 '}{formatDate(item.dueDate)}
                </Text>
              ) : (
                <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '500' }}>· Set due date</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount + label/remind on the right */}
        <View style={{ alignItems: 'flex-end', minWidth: 76 }}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: amountColor, letterSpacing: -0.5 }}>
            {displayAmount}
          </Text>
          {isDue ? (
            <TouchableOpacity
              onPress={(e) => { setRemindCustomer(item); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 0 }}
            >
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#2563eb', letterSpacing: 0.3, marginTop: 3 }}>
                REMIND ›
              </Text>
            </TouchableOpacity>
          ) : isAdvance ? (
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#10b981', marginTop: 3, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              You'll Give
            </Text>
          ) : (
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 3, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              Settled
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [sym, navigation, updateCustomer]);

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
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>Customer Ledger</Text>
          <View style={{ width: 40, height: 40 }} />
        </View>
      </View>

      {/* ── Premium Summary Cards ── */}
      <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: 20, marginTop: -20 }}>
        {/* You'll Get (Rose -> Debt) */}
        <TouchableOpacity
          onPress={() => setFilter(filter === 'GET' ? 'ALL' : 'GET')}
          activeOpacity={0.9}
          style={{
            flex: 1, backgroundColor: '#fff', borderRadius: 24, padding: 20,
            borderTopWidth: 6, borderTopColor: '#f43f5e',
            shadowColor: '#f43f5e', shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
            borderWidth: 1, borderColor: filter === 'GET' ? '#f43f5e30' : '#f43f5e10'
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <View className="bg-rose-50 p-1.5 rounded-lg">
              <MaterialIcons name="call-received" size={14} color="#f43f5e" />
            </View>
            <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>You'll Get</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#f43f5e' }} numberOfLines={1} adjustsFontSizeToFit>
            {sym} {formatAmount(totals.youllGet)}
          </Text>
        </TouchableOpacity>

        {/* You'll Give (Emerald -> Advance/Wallet) */}
        <TouchableOpacity
          onPress={() => setFilter(filter === 'GIVE' ? 'ALL' : 'GIVE')}
          activeOpacity={0.9}
          style={{
            flex: 1, backgroundColor: '#fff', borderRadius: 24, padding: 20,
            borderTopWidth: 6, borderTopColor: '#10b981',
            shadowColor: '#10b981', shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
            borderWidth: 1, borderColor: filter === 'GIVE' ? '#10b98130' : '#10b98110'
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <View className="bg-emerald-50 p-1.5 rounded-lg">
              <MaterialIcons name="call-made" size={14} color="#10b981" />
            </View>
            <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>You'll Give</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#10b981' }} numberOfLines={1} adjustsFontSizeToFit>
            {sym} {formatAmount(totals.youllGive)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── View Reports PDF CTA ── */}
      <TouchableOpacity
        onPress={() => navigation.navigate('ReportViewer', {
          reportType: 'customer_ledger',
          title: 'Customer Ledger Report',
        })}
        activeOpacity={0.8}
        style={{
          marginHorizontal: 20,
          marginTop: 14,
          backgroundColor: '#fff',
          borderRadius: 18,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 18,
          paddingVertical: 14,
          borderWidth: 1,
          borderColor: '#e2e8f0',
          borderLeftWidth: 4,
          borderLeftColor: '#262A56',
          shadowColor: '#262A56',
          shadowOpacity: 0.07,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* PDF icon badge */}
        <View style={{
          width: 42, height: 42, borderRadius: 12,
          backgroundColor: '#262A56',
          alignItems: 'center', justifyContent: 'center',
          marginRight: 14,
        }}>
          <MaterialIcons name="picture-as-pdf" size={22} color="#fff" />
        </View>

        {/* Text */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#1e293b', letterSpacing: -0.2 }}>
            View Reports
          </Text>
          <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 2 }}>
            Customer outstanding · Export PDF
          </Text>
        </View>

        {/* Arrow */}
        <MaterialIcons name="chevron-right" size={22} color="#262A56" />
      </TouchableOpacity>

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
            placeholder="Search name or phone..."
            placeholderTextColor="#cbd5e1"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} className="bg-slate-100 p-1 rounded-full">
              <MaterialIcons name="close" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-[#262A56]" />
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {filtered.length} Customers Found
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

      {/* ── Customer List ── */}
      <View style={{
        flex: 1,
        marginHorizontal: 16,
        marginTop: 2,
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#64748b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
      }}>
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderCustomer}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
              <MaterialIcons name="person-search" size={52} color="#e2e8f0" />
              <Text style={{ color: '#94a3b8', fontWeight: '700', fontSize: 15, marginTop: 12 }}>No results found</Text>
            </View>
          }
        />
      </View>

      {/* ── Add Customer FAB (bottom-right pill) ── */}
      <TouchableOpacity
        onPress={() => navigation.navigate('EditCustomerProfile')}
        style={{
          position: 'absolute',
          bottom: Math.max(insets.bottom, 95),
          right: 20,
          backgroundColor: '#262A56',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingVertical: 16,
          borderRadius: 32,
          shadowColor: '#262A56',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 14,
          elevation: 12,
        }}
      >
        <MaterialIcons name="person-add" size={20} color="#fff" />
        <Text style={{ fontSize: 13, fontWeight: '900', color: '#fff', marginLeft: 9, letterSpacing: 1, textTransform: 'uppercase' }}>Add Customer</Text>
      </TouchableOpacity>

      {/* ── Premium Navigation Tab ── */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', height: 85,
        flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9',
        paddingBottom: Math.max(insets.bottom, 10),
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20, elevation: 10
      }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: '#262A5610', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
            <MaterialIcons name="people" size={18} color="#262A56" />
          </View>
          <Text style={{ fontSize: 10, fontWeight: '900', color: '#262A56', textTransform: 'uppercase', letterSpacing: 0.5 }}>Customers</Text>
          <View style={{ width: 32, height: 4, backgroundColor: '#262A56', borderRadius: 2, position: 'absolute', top: 0 }} />
        </View>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Suppliers')} 
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}
        >
          <MaterialIcons name="inventory" size={18} color="#94a3b8" />
          <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Suppliers</Text>
        </TouchableOpacity>
      </View>

      {/* ── Remind Customer Action Sheet ── */}
      <Modal
        visible={!!remindCustomer}
        transparent
        animationType="fade"
        onRequestClose={() => setRemindCustomer(null)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setRemindCustomer(null)}
        >
          <View style={{
            backgroundColor: 'white',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingTop: 8, paddingBottom: Math.max(insets.bottom, 20),
          }}>
            {/* Handle */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 16 }} />

            {/* Customer info header */}
            {remindCustomer && (
              <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#16a34a', marginBottom: 4 }}>
                  Remind {remindCustomer.name}
                </Text>
                <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>
                  Outstanding: <Text style={{ color: '#dc2626', fontWeight: '900' }}>{formatAmount(remindCustomer.net, sym)}</Text>
                  {remindCustomer.dueDate ? (
                    <Text style={{ color: remindCustomer.isOverdue ? '#dc2626' : '#64748b' }}>
                      {' '}· Due: {formatFullDate(remindCustomer.dueDate)}
                    </Text>
                  ) : null}
                </Text>
              </View>
            )}

            {/* Action buttons */}
            <View style={{ paddingHorizontal: 20, gap: 8 }}>
              {/* WhatsApp */}
              <TouchableOpacity
                onPress={() => { handleWhatsApp(remindCustomer); setRemindCustomer(null); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16,
                  borderWidth: 1, borderColor: '#bbf7d0',
                }}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 14,
                  backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MaterialCommunityIcons name="whatsapp" size={24} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#15803d' }}>WhatsApp</Text>
                  <Text style={{ fontSize: 11, color: '#4ade80', fontWeight: '500', marginTop: 1 }}>Send payment reminder via WhatsApp</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#86efac" />
              </TouchableOpacity>

              {/* SMS */}
              <TouchableOpacity
                onPress={() => { handleSMS(remindCustomer); setRemindCustomer(null); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  backgroundColor: '#eff6ff', borderRadius: 16, padding: 16,
                  borderWidth: 1, borderColor: '#bfdbfe',
                }}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 14,
                  backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MaterialIcons name="sms" size={22} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#1d4ed8' }}>SMS</Text>
                  <Text style={{ fontSize: 11, color: '#60a5fa', fontWeight: '500', marginTop: 1 }}>Send reminder via text message</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#93c5fd" />
              </TouchableOpacity>

              {/* Call */}
              <TouchableOpacity
                onPress={() => { handleCall(remindCustomer); setRemindCustomer(null); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  backgroundColor: '#faf5ff', borderRadius: 16, padding: 16,
                  borderWidth: 1, borderColor: '#e9d5ff',
                }}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 14,
                  backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MaterialIcons name="call" size={22} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#6d28d9' }}>Call</Text>
                  <Text style={{ fontSize: 11, color: '#a78bfa', fontWeight: '500', marginTop: 1 }}>Call customer to remind about payment</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#c4b5fd" />
              </TouchableOpacity>

              {/* Set/Change Due Date */}
              <TouchableOpacity
                onPress={() => {
                  const cust = remindCustomer;
                  setRemindCustomer(null);
                  setTimeout(() => {
                    if (cust) handleSetDueDate(cust);
                  }, 400);
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  backgroundColor: '#fffbeb', borderRadius: 16, padding: 16,
                  borderWidth: 1, borderColor: '#fde68a',
                }}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 14,
                  backgroundColor: '#d97706', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MaterialIcons name="event" size={22} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#92400e' }}>
                    {remindCustomer?.dueDate ? 'Change Due Date' : 'Set Due Date'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#fbbf24', fontWeight: '500', marginTop: 1 }}>
                    {remindCustomer?.dueDate ? `Current: ${formatFullDate(remindCustomer.dueDate)}` : 'Set a payment deadline'}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#fcd34d" />
              </TouchableOpacity>
            </View>

            {/* Cancel */}
            <TouchableOpacity
              onPress={() => setRemindCustomer(null)}
              style={{
                marginHorizontal: 20, marginTop: 12,
                paddingVertical: 14, borderRadius: 16,
                backgroundColor: '#f1f5f9', alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#64748b' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Date Picker Modal ── */}
      <DatePickerModal
        visible={showDatePicker}
        selectedDate={dueDateCustomer?.dueDate || dueDateCustomer?.payment_due_date || new Date().toISOString().split('T')[0]}
        onClose={() => {
          setDueDateCustomer(null);
          setShowDatePicker(false);
        }}
        onSelect={(dateStr) => handleSaveDueDate(dateStr)}
      />
    </SafeAreaView>
  );
}
