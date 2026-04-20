import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, StatusBar, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { useTheme } from '../theme/ThemeContext';

// ─── Palette ─────────────────────────────────────────────────────────────────────
const C = {
  bg:       '#f4f6ff',
  card:     '#ffffff',
  border:   '#e8ecf8',
  label:    '#8892b0',
  value:    '#1a2045',
  dimText:  '#a0aec0',
  cashClr:  '#059669',
  upiClr:   '#7c3aed',
  creditClr:'#dc2626',
  shadow: {
    shadowColor: '#4c5fad',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
  },
};

const PAY_MODES = [
  { key: 'Cash',   icon: 'payments',     color: C.cashClr   },
  { key: 'UPI',    icon: 'phone-android', color: C.upiClr   },
  { key: 'Credit', icon: 'account-balance-wallet', color: C.creditClr },
  { key: 'Cheque', icon: 'description',  color: '#d97706'   },
];

const fmtINR = (n) =>
  Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CalcSaleScreen({ navigation, route }) {
  const { prefillTotal = 0 } = route.params || {};
  const theme    = useTheme();
  const ins      = useSafeAreaInsets();
  const customers   = useStore(s => s.customers);
  const profile     = useStore(s => s.profile);
  const addInvoice  = useStore(s => s.addInvoice);
  const addPayment  = useStore(s => s.addPayment);

  const sym = profile?.currency_symbol || '₹';

  // ── State
  const [amount,       setAmount]       = useState(prefillTotal > 0 ? String(prefillTotal) : '');
  const [query,        setQuery]        = useState('');
  const [selectedCust, setSelectedCust] = useState(null);
  const [showDrop,     setShowDrop]     = useState(false);
  const [payMode,      setPayMode]      = useState('Cash');
  const [notes,        setNotes]        = useState('');
  const [saving,       setSaving]       = useState(false);

  // ── Customer filtering
  const filtered = useMemo(() => {
    if (!query.trim()) return customers.slice(0, 8);
    return customers.filter(c =>
      c.name?.toLowerCase().includes(query.toLowerCase()) ||
      c.phone?.includes(query)
    ).slice(0, 8);
  }, [customers, query]);

  const selectCustomer = useCallback((c) => {
    setSelectedCust(c);
    setQuery(c.name);
    setShowDrop(false);
  }, []);

  const parsedAmount = parseFloat(amount) || 0;

  // ── Quick Save — creates a direct invoice entry
  const handleSave = useCallback(async () => {
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Enter a valid amount to proceed.'); return;
    }
    if (!selectedCust) {
      Alert.alert('Customer Required', 'Please select or type a customer name.'); return;
    }
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const invNum = `#INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      const inv = await addInvoice({
        invoiceNumber: invNum,
        customerId:    selectedCust.id,
        customerName:  selectedCust.name,
        customerPhone: selectedCust.phone || '',
        date:          today,
        dueDate:       today,
        status:        payMode === 'Credit' ? 'Due' : 'Paid',
        subtotal:      parsedAmount,
        taxPercent:    0,
        taxAmount:     0,
        discountPercent: 0,
        discountAmount:  0,
        total:         parsedAmount,
        paymentMode:   payMode,
        notes:         notes.trim(),
        items: [{
          item_id:     '',
          name:        notes.trim() || 'Calculator Sale',
          description: `Via Calculator • ${payMode}`,
          quantity:    1,
          rate:        parsedAmount,
          total:       parsedAmount,
          rate_type:   'Retail',
          mrp_discount: 0,
          tax_percent:  0,
        }],
      });

      // Auto-record payment if not credit
      if (payMode !== 'Credit' && inv?.id) {
        await addPayment({
          invoiceId:     inv.id,
          customerId:    selectedCust.id,
          amount:        parsedAmount,
          paymentMethod: payMode,
          date:          today,
          notes:         `Calculator Sale • ${payMode}`,
        });
      }

      navigation.replace('InvoiceSuccess', {
        invoiceId: inv?.id,
        invoiceNumber: invNum,
        amount: parsedAmount,
        customerName: selectedCust.name,
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save invoice. Try again.');
    } finally {
      setSaving(false);
    }
  }, [parsedAmount, selectedCust, payMode, notes, addInvoice, addPayment, navigation]);

  // ── Full Invoice — pass data to CreateInvoice
  const handleFullInvoice = useCallback(() => {
    navigation.navigate('CreateInvoice', {
      customerId:   selectedCust?.id || null,
      prefillTotal: parsedAmount,
    });
  }, [navigation, selectedCust, parsedAmount]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[s.root, { paddingTop: ins.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.primary} />

        {/* ── Hero Header ── */}
        <View style={[s.hero, { backgroundColor: theme.primary }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.75}>
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.heroLabel}>Quick Sale</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* ── Amount Card (extends from header) ── */}
        <View style={[s.amtCard, { backgroundColor: theme.primary }]}>
          <View style={s.amtInner}>
            <Text style={s.amtLabel}>INVOICE AMOUNT</Text>
            <View style={s.amtRow}>
              <Text style={s.amtSym}>{sym}</Text>
              <TextInput
                style={s.amtInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="rgba(255,255,255,0.35)"
                selectTextOnFocus
              />
            </View>
            {prefillTotal > 0 && (
              <Text style={s.calcBadge}>
                <MaterialCommunityIcons name="calculator-variant" size={11} color="rgba(255,255,255,0.65)" />
                {' '}Pre-filled from Calculator
              </Text>
            )}
          </View>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 20, paddingHorizontal: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Customer Card ── */}
          <View style={[s.card, C.shadow]}>
            <View style={s.cardHeader}>
              <MaterialIcons name="person-outline" size={18} color={theme.primary} />
              <Text style={s.cardTitle}>Customer</Text>
              <Text style={s.required}>*</Text>
            </View>

            <TextInput
              style={[s.searchInput, selectedCust && { borderColor: theme.primary }]}
              value={query}
              onChangeText={(t) => {
                setQuery(t.toUpperCase());
                setSelectedCust(null);
                setShowDrop(true);
              }}
              onFocus={() => setShowDrop(true)}
              placeholder="Search or type customer name..."
              placeholderTextColor={C.dimText}
              autoCapitalize="characters"
            />

            {showDrop && (
              <View style={s.dropdown}>
                {filtered.length === 0 ? (
                  <View style={s.dropEmpty}>
                    <Text style={s.dropEmptyTxt}>No match — will be saved as new customer</Text>
                  </View>
                ) : (
                  filtered.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={s.dropRow}
                      onPress={() => selectCustomer(c)}
                      activeOpacity={0.7}
                    >
                      <View style={[s.dropAvatar, { backgroundColor: theme.primary + '20' }]}>
                        <Text style={[s.dropAvatarTxt, { color: theme.primary }]}>
                          {(c.name?.[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.dropName}>{c.name}</Text>
                        {c.phone ? <Text style={s.dropPhone}>{c.phone}</Text> : null}
                      </View>
                      <MaterialIcons name="chevron-right" size={18} color={C.border} />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {selectedCust && (
              <View style={[s.selectedBadge, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '30' }]}>
                <MaterialIcons name="check-circle" size={16} color={theme.primary} />
                <Text style={[s.selectedName, { color: theme.primary }]}>{selectedCust.name}</Text>
                <TouchableOpacity onPress={() => { setSelectedCust(null); setQuery(''); setShowDrop(true); }}>
                  <MaterialIcons name="close" size={16} color={C.dimText} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Payment Mode ── */}
          <View style={[s.card, C.shadow]}>
            <View style={s.cardHeader}>
              <MaterialIcons name="payment" size={18} color={theme.primary} />
              <Text style={s.cardTitle}>Payment Mode</Text>
            </View>
            <View style={s.payGrid}>
              {PAY_MODES.map(({ key, icon, color }) => {
                const active = payMode === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      s.payBtn,
                      active
                        ? { backgroundColor: color, borderColor: color }
                        : { backgroundColor: color + '10', borderColor: color + '30' },
                    ]}
                    onPress={() => setPayMode(key)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name={icon} size={18} color={active ? '#fff' : color} />
                    <Text style={[s.payLabel, { color: active ? '#fff' : color }]}>{key}</Text>
                    {active && <MaterialIcons name="check" size={13} color="#fff" style={s.payCheck} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Notes ── */}
          <View style={[s.card, C.shadow]}>
            <View style={s.cardHeader}>
              <MaterialIcons name="notes" size={18} color={theme.primary} />
              <Text style={s.cardTitle}>Notes <Text style={s.optional}>(optional)</Text></Text>
            </View>
            <TextInput
              style={s.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Spare parts bill, advance payment..."
              placeholderTextColor={C.dimText}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* ── Summary Strip ── */}
          <View style={[s.summaryStrip, { borderColor: theme.primary + '30', backgroundColor: theme.primary + '08' }]}>
            <SumRow label="Amount" value={`${sym} ${fmtINR(parsedAmount)}`} bold />
            <SumRow label="Tax" value="₹ 0.00" />
            <View style={[s.sumDivider, { backgroundColor: theme.primary + '20' }]} />
            <SumRow label="Total Payable" value={`${sym} ${fmtINR(parsedAmount)}`} bold accent={theme.primary} large />
          </View>

        </ScrollView>

        {/* ── Bottom CTAs ── */}
        <View style={[s.footer, { paddingBottom: ins.bottom + 12 }]}>
          <TouchableOpacity
            style={[s.btnOutline, { borderColor: theme.primary }]}
            onPress={handleFullInvoice}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="file-document-edit-outline" size={18} color={theme.primary} />
            <Text style={[s.btnOutlineTxt, { color: theme.primary }]}>Full Invoice</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btnFill, { backgroundColor: saving ? theme.primary + '80' : theme.primary }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <MaterialIcons name="check" size={20} color="#fff" />
            <Text style={s.btnFillTxt}>{saving ? 'Saving…' : 'Save Invoice'}</Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

// ── Helper component
const SumRow = ({ label, value, bold, accent, large }) => (
  <View style={s.sumRow}>
    <Text style={[s.sumLabel, large && { fontSize: 14, fontWeight: '700' }]}>{label}</Text>
    <Text style={[
      s.sumValue,
      bold && { fontWeight: '900' },
      large && { fontSize: 18 },
      accent && { color: accent },
    ]}>
      {value}
    </Text>
  </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  // Hero header
  hero: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 52,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroLabel: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.2 },
  // Amount card (same bg as header — seamless)
  amtCard: { paddingHorizontal: 20, paddingBottom: 28 },
  amtInner: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24, padding: 20,
  },
  amtLabel: {
    color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '800',
    letterSpacing: 1.2, marginBottom: 8,
  },
  amtRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amtSym: {
    color: 'rgba(255,255,255,0.75)', fontSize: 28, fontWeight: '700', marginTop: 2,
  },
  amtInput: {
    flex: 1, color: '#fff', fontSize: 46, fontWeight: '900',
    letterSpacing: -1.5, padding: 0,
  },
  calcBadge: {
    color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '500',
    marginTop: 6, letterSpacing: 0.3,
  },
  // Scroll
  scroll: { flex: 1, marginTop: -14, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: C.bg },
  // Cards
  card: {
    backgroundColor: C.card, borderRadius: 20,
    padding: 18, marginBottom: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: C.value, flex: 1 },
  required: { color: '#ef4444', fontWeight: '900', fontSize: 16 },
  optional: { fontSize: 12, fontWeight: '400', color: C.dimText },
  // Customer search
  searchInput: {
    backgroundColor: C.bg, borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontWeight: '700', color: C.value,
  },
  // Dropdown
  dropdown: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
    overflow: 'hidden', marginTop: 8, backgroundColor: C.card,
  },
  dropEmpty: { padding: 14 },
  dropEmptyTxt: { fontSize: 13, color: C.dimText, textAlign: 'center' },
  dropRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: C.bg,
  },
  dropAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  dropAvatarTxt: { fontSize: 15, fontWeight: '900' },
  dropName: { fontSize: 14, fontWeight: '800', color: C.value },
  dropPhone: { fontSize: 12, color: C.label, fontWeight: '500', marginTop: 1 },
  // Selected badge
  selectedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10,
  },
  selectedName: { flex: 1, fontSize: 14, fontWeight: '800' },
  // Payment modes
  payGrid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  payBtn: {
    flex: 1, minWidth: 70, borderWidth: 1.5, borderRadius: 14,
    paddingVertical: 12, alignItems: 'center', gap: 4, position: 'relative',
  },
  payLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  payCheck: { position: 'absolute', top: 5, right: 5 },
  // Notes
  notesInput: {
    backgroundColor: C.bg, borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontWeight: '500', color: C.value,
    textAlignVertical: 'top', minHeight: 72,
  },
  // Summary strip
  summaryStrip: {
    borderWidth: 1.5, borderRadius: 20, padding: 18, gap: 10, marginBottom: 8,
  },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel: { fontSize: 13, color: C.label, fontWeight: '500' },
  sumValue: { fontSize: 14, color: C.value, fontWeight: '700' },
  sumDivider: { height: 1, marginVertical: 2 },
  // Footer
  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 14,
    backgroundColor: C.card,
    borderTopWidth: 1, borderColor: C.border,
  },
  btnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 2, borderRadius: 16, paddingVertical: 14,
  },
  btnOutlineTxt: { fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  btnFill: {
    flex: 1.6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 16, paddingVertical: 14,
  },
  btnFillTxt: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.2 },
});
