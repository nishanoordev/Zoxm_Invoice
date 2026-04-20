import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  SafeAreaView, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { calculateCustomerBalances } from '../utils/balanceCalculator';
import { formatAmount } from '../utils/formatters';

const C = {
  primary: '#121642',
  accent: '#ec5b13',
  emerald: '#059669',
  red: '#ef4444',
  blue: '#2563eb',
  amber: '#d97706',
  violet: '#7c3aed',
  surface: '#f8fafc',
  border: '#e2e8f0',
  muted: '#94a3b8',
  label: '#64748b',
};

export default function WalletHistoryScreen({ navigation, route }) {
  const { customerId, customerName } = route.params || {};
  const invoices = useStore(s => s.invoices);
  const payments = useStore(s => s.payments);
  const profile = useStore(s => s.profile);
  const customerWallets = useStore(s => s.customerWallets);
  const sym = profile?.currency_symbol || '₹';

  const { totalDue, creditBalance, returnCreditBalance } = useMemo(
    () => calculateCustomerBalances(customerId, invoices, payments),
    [customerId, invoices, payments]
  );
  // Wallet balance from the dedicated customer_wallet table (single source of truth)
  const walletBalance = customerWallets[customerId] || 0;

  // Build the wallet ledger: every transaction that affects this customer's balance
  const ledger = useMemo(() => {
    const round2 = v => Math.round(v * 100) / 100;

    // 1. Invoices created (money owed — decreases wallet)
    const customerInvoices = invoices.filter(
      inv => (inv.customerId === customerId || inv.customer_id === customerId)
        && !inv.isDeleted && inv.status !== 'Cancelled'
    );

    // 2. All payments for this customer
    const customerPayments = payments.filter(
      p => (p.customerId === customerId || p.customer_id === customerId)
    );

    const entries = [];

    // Invoice entries
    customerInvoices.forEach(inv => {
      const total = round2(parseFloat(inv.total) || 0);
      if (total <= 0) return;
      entries.push({
        id: `inv-${inv.id}`,
        date: inv.created_at || inv.date || '',
        type: 'invoice',
        label: 'Invoice Created',
        description: inv.invoiceNumber || inv.invoice_number || `#${inv.id}`,
        amount: -total,
        icon: 'receipt-long',
        color: C.red,
        status: inv.status,
        linkedInvoice: inv.invoiceNumber || inv.invoice_number,
      });
    });

    // Payment entries
    customerPayments.forEach(p => {
      const amount = round2(parseFloat(p.amount) || 0);
      const dueReduced = round2(parseFloat(p.dueReduced || p.due_reduced) || 0);
      const isCreditNote = p.type === 'credit_note';
      const isAdjustment = p.method === 'Adjustment' || p.method === 'Wallet Adjustment';
      const isCreditAdj = p.method === 'Credit Adjustment';
      const isAdvanceReversal = p.method === 'Advance Reversal';
      const linkedInv = p.invoiceId || p.invoice_id;

      if (isCreditNote) {
        // Credit note: may have amount (refund to wallet) and/or dueReduced
        if (amount > 0) {
          entries.push({
            id: `cn-ref-${p.id}`,
            date: p.created_at || p.date || '',
            type: 'refund_credit',
            label: 'Return Credit (Refund)',
            description: p.notes || 'Sales return refund added to wallet',
            amount: +amount,
            icon: 'card-giftcard',
            color: C.emerald,
            linkedInvoice: linkedInv ? `#${linkedInv}` : null,
          });
        }
        if (amount < 0) {
          entries.push({
            id: `cn-con-${p.id}`,
            date: p.created_at || p.date || '',
            type: 'credit_consumed',
            label: isCreditAdj ? 'Credit Adjustment' : 'Credit Applied',
            description: p.notes || 'Credit consumed',
            amount: amount,
            icon: 'remove-circle-outline',
            color: C.amber,
            linkedInvoice: linkedInv ? `#${linkedInv}` : null,
          });
        }
        if (dueReduced > 0) {
          entries.push({
            id: `cn-due-${p.id}`,
            date: p.created_at || p.date || '',
            type: 'due_settled',
            label: 'Due Settled by Return',
            description: p.notes || `Due reduced on invoice`,
            amount: +dueReduced,
            icon: 'swap-horiz',
            color: C.blue,
            linkedInvoice: linkedInv ? `#${linkedInv}` : null,
          });
        }
        if (amount === 0 && dueReduced === 0) {
          // Zero credit note (edge case)
          entries.push({
            id: `cn-zero-${p.id}`,
            date: p.created_at || p.date || '',
            type: 'credit_note',
            label: 'Credit Note',
            description: p.notes || 'Credit note recorded',
            amount: 0,
            icon: 'note',
            color: C.muted,
          });
        }
      } else if (isAdjustment) {
        entries.push({
          id: `adj-${p.id}`,
          date: p.created_at || p.date || '',
          type: 'adjustment',
          label: 'Manual Adjustment',
          description: p.notes || 'Balance adjusted manually',
          amount: +amount,
          icon: 'tune',
          color: C.violet,
        });
      } else if (isAdvanceReversal) {
        entries.push({
          id: `adv-rev-${p.id}`,
          date: p.created_at || p.date || '',
          type: 'advance_used',
          label: 'Advance Credit Used',
          description: p.notes || 'Advance applied to invoice',
          amount: -Math.abs(amount),
          icon: 'account-balance-wallet',
          color: C.amber,
          linkedInvoice: linkedInv ? `#${linkedInv}` : null,
        });
      } else if (p.type === 'give_payment' || p.paymentDirection === 'given') {
        // Give Payment: money given TO the customer
        entries.push({
          id: `give-${p.id}`,
          date: p.created_at || p.date || '',
          type: 'give_payment',
          label: 'Payment Given',
          description: p.notes || 'Payment given to customer',
          amount: -Math.abs(amount),
          icon: 'money-off',
          color: C.red,
        });
      } else {
        // Regular payment
        entries.push({
          id: `pay-${p.id}`,
          date: p.created_at || p.date || '',
          type: 'payment',
          label: `${p.method || 'Cash'} Payment`,
          description: p.notes || `Payment received via ${p.method || 'Cash'}`,
          amount: +amount,
          icon: amount >= 0 ? 'payments' : 'money-off',
          color: amount >= 0 ? C.emerald : C.red,
          linkedInvoice: linkedInv ? `#${linkedInv}` : null,
        });
      }
    });

    // Sort by date (newest first)
    entries.sort((a, b) => {
      const da = new Date(a.date || 0);
      const db = new Date(b.date || 0);
      return db - da;
    });

    // Compute running balance (from oldest to newest, then reverse display)
    const chronological = [...entries].reverse();
    let runningBalance = 0;
    chronological.forEach(e => {
      runningBalance = round2(runningBalance + e.amount);
      e.runningBalance = runningBalance;
    });

    return entries;
  }, [customerId, invoices, payments]);

  const formatDateTime = (raw) => {
    if (!raw) return '';
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return raw;
      const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${date} · ${time}`;
    } catch { return raw; }
  };

  const renderItem = ({ item, index }) => {
    const isPositive = item.amount > 0;
    const isZero = item.amount === 0;

    return (
      <View style={{
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginBottom: 2,
        borderRadius: index === 0 ? 20 : (index === ledger.length - 1 ? 20 : 4),
        borderTopLeftRadius: index === 0 ? 20 : 4,
        borderTopRightRadius: index === 0 ? 20 : 4,
        borderBottomLeftRadius: index === ledger.length - 1 ? 20 : 4,
        borderBottomRightRadius: index === ledger.length - 1 ? 20 : 4,
        overflow: 'hidden',
      }}>
        <View style={{ flexDirection: 'row', padding: 14, gap: 12, alignItems: 'flex-start' }}>
          {/* Icon */}
          <View style={{
            width: 42, height: 42, borderRadius: 12,
            backgroundColor: item.color + '15',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <MaterialIcons name={item.icon} size={20} color={item.color} />
          </View>

          {/* Details */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: C.primary }} numberOfLines={1}>
                  {item.label}
                </Text>
                {item.linkedInvoice && (
                  <Text style={{ fontSize: 10, fontWeight: '700', color: C.blue, marginTop: 1 }}>
                    🔗 {item.linkedInvoice}
                  </Text>
                )}
              </View>
              {/* Amount */}
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{
                  fontSize: 15, fontWeight: '900',
                  color: isZero ? C.muted : isPositive ? C.emerald : C.red,
                }}>
                  {isPositive ? '+' : ''}{formatAmount(item.amount, sym)}
                </Text>
              </View>
            </View>

            {/* Description */}
            <Text style={{ fontSize: 10, color: C.label, marginTop: 3, lineHeight: 14 }} numberOfLines={2}>
              {item.description}
            </Text>

            {/* Bottom row: date + running balance */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialIcons name="schedule" size={10} color={C.muted} />
                <Text style={{ fontSize: 9, color: C.muted, fontWeight: '600' }}>
                  {formatDateTime(item.date) || '—'}
                </Text>
              </View>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: item.runningBalance >= 0 ? '#f0fdf4' : '#fef2f2',
                borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
              }}>
                <Text style={{
                  fontSize: 9, fontWeight: '800',
                  color: item.runningBalance >= 0 ? C.emerald : C.red,
                }}>
                  BAL: {item.runningBalance >= 0 ? '+' : ''}{formatAmount(item.runningBalance, sym)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const SummaryHeader = () => (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
      {/* Balance Summary Card */}
      <View style={{
        backgroundColor: walletBalance > 0 ? '#059669' : totalDue > 0 ? '#ef4444' : '#475569',
        borderRadius: 20, padding: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
      }}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 }}>
          Wallet Credit Balance
        </Text>
        <Text style={{ color: 'white', fontSize: 32, fontWeight: '900', marginTop: 4, letterSpacing: -0.5 }}>
          {formatAmount(walletBalance, sym)}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', marginTop: 4 }}>
          {walletBalance > 0 ? 'Credit available for future invoices' : 'No wallet credit'}
        </Text>

        {/* Mini stats */}
        <View style={{
          flexDirection: 'row', gap: 16, marginTop: 14,
          paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)',
        }}>
          {creditBalance > 0 && (
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>Advance</Text>
              <Text style={{ color: 'white', fontSize: 14, fontWeight: '800' }}>{formatAmount(creditBalance, sym)}</Text>
            </View>
          )}
          {totalDue > 0 && (
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>Due</Text>
              <Text style={{ color: 'white', fontSize: 14, fontWeight: '800' }}>{formatAmount(totalDue, sym)}</Text>
            </View>
          )}
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>Transactions</Text>
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '800' }}>{ledger.length}</Text>
          </View>
        </View>
      </View>

      {/* Section label */}
      <Text style={{
        fontSize: 10, fontWeight: '900', color: C.muted,
        textTransform: 'uppercase', letterSpacing: 1.5,
        marginTop: 20, marginBottom: 8, paddingLeft: 4,
      }}>
        Transaction History
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.primary, paddingHorizontal: 16,
        paddingVertical: 14, gap: 12,
        paddingTop: Platform.OS === 'android' ? 44 : 14,
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <MaterialIcons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }}>
            Wallet History
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600', marginTop: 1 }}>
            {customerName || 'Customer'}
          </Text>
        </View>
        <View style={{
          backgroundColor: 'rgba(255,255,255,0.15)',
          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
        }}>
          <Text style={{ color: 'white', fontSize: 11, fontWeight: '800' }}>
            {ledger.length} entries
          </Text>
        </View>
      </View>

      <FlatList
        data={ledger}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={SummaryHeader}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <MaterialIcons name="account-balance-wallet" size={48} color="#e2e8f0" />
            <Text style={{ color: C.muted, fontWeight: '600', marginTop: 12, fontSize: 14 }}>
              No wallet transactions yet
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
