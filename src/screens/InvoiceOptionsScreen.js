import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, SafeAreaView, Switch, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { useTheme } from '../theme/ThemeContext';
import { DEFAULT_INVOICE_CONFIG, mergeConfig } from '../utils/invoiceConfigDefaults';

const TOGGLE_GROUPS = [
  {
    title: 'Table Columns',
    icon: 'table-chart',
    description: 'Choose which columns appear in the items table',
    fields: [
      { key: 'showHsnColumn',      label: 'HSN / SAC Column',   icon: 'tag',          desc: 'Harmonized System Nomenclature code' },
      { key: 'showDiscountColumn', label: 'Discount Column',     icon: 'local-offer',  desc: 'Per-item discount amount or %' },
      { key: 'showGstColumn',      label: 'GST% Column',         icon: 'percent',      desc: 'GST rate applied on each item' },
      { key: 'showUnitColumn',     label: 'Unit Column',         icon: 'straighten',   desc: 'Unit of measurement (kg, pcs, etc.)' },
    ],
  },
  {
    title: 'Invoice Content',
    icon: 'receipt-long',
    description: 'Additional information shown on the invoice body',
    fields: [
      { key: 'showAmountInWords',  label: 'Amount in Words',     icon: 'spellcheck',   desc: 'Total amount written in words' },
      { key: 'showBuyerGstin',     label: 'Customer GSTIN',      icon: 'person-search', desc: "Buyer's GST identification number" },
      { key: 'showPaymentStatus',  label: 'Paid / Balance Row',  icon: 'account-balance-wallet', desc: 'Show paid amount and balance due' },
    ],
  },
  {
    title: 'Footer Items',
    icon: 'vertical-align-bottom',
    description: 'Elements that appear at the bottom of the invoice',
    fields: [
      { key: 'showDeclaration',    label: 'Tax Declaration',     icon: 'gavel',        desc: 'Standard tax declaration statement' },
      { key: 'termsEnabled',       label: 'Terms & Conditions',  icon: 'description',  desc: 'Your default terms printed below total' },
      { key: 'showNotesSection',   label: 'Invoice Notes',       icon: 'edit-note',    desc: 'Free-form notes section on invoice' },
      { key: 'showUpiQr',          label: 'UPI QR Code',         icon: 'qr-code-2',    desc: 'UPI QR for digital payment' },
      { key: 'showSignature',      label: 'Signature Block',     icon: 'draw',         desc: 'Authorized signatory area at bottom' },
    ],
  },
];

export default function InvoiceOptionsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const profile            = useStore(state => state.profile);
  const updateInvoiceConfig = useStore(state => state.updateInvoiceConfig);

  const invoiceConfig = mergeConfig(DEFAULT_INVOICE_CONFIG, profile.invoiceConfig || {});

  // Count enabled toggles
  const allFields = TOGGLE_GROUPS.flatMap(g => g.fields);
  const enabledCount = allFields.filter(f => !!invoiceConfig[f.key]).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: theme.primary,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: Platform.OS === 'android' ? 44 : 10,
          paddingBottom: 16,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' }}
        >
          <MaterialIcons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: 'white', fontSize: 17, fontWeight: '800' }}>Invoice Options</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', marginTop: 1 }}>
            {enabledCount} of {allFields.length} enabled
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 32) + 20, paddingTop: 8 }}
      >
        {TOGGLE_GROUPS.map((group, gi) => (
          <View key={group.title} style={{ marginTop: gi === 0 ? 16 : 24, marginHorizontal: 16 }}>
            {/* Group Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingHorizontal: 4 }}>
              <View style={{
                width: 30, height: 30, borderRadius: 8,
                backgroundColor: theme.primary + '18',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <MaterialIcons name={group.icon} size={16} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e293b', letterSpacing: 0.3 }}>
                  {group.title.toUpperCase()}
                </Text>
                <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 }}>
                  {group.description}
                </Text>
              </View>
            </View>

            {/* Toggle Card */}
            <View style={{
              backgroundColor: 'white',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              overflow: 'hidden',
            }}>
              {group.fields.map((field, fi) => {
                const isOn = !!invoiceConfig[field.key];
                const isLast = fi === group.fields.length - 1;
                return (
                  <TouchableOpacity
                    key={field.key}
                    activeOpacity={0.7}
                    onPress={() => updateInvoiceConfig({ [field.key]: !isOn })}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderBottomWidth: isLast ? 0 : 1,
                      borderBottomColor: '#f8fafc',
                      backgroundColor: isOn ? theme.primary + '05' : 'transparent',
                    }}
                  >
                    {/* Icon */}
                    <View style={{
                      width: 36, height: 36, borderRadius: 10,
                      backgroundColor: isOn ? theme.primary + '15' : '#f1f5f9',
                      alignItems: 'center', justifyContent: 'center',
                      marginRight: 12,
                    }}>
                      <MaterialIcons
                        name={field.icon}
                        size={18}
                        color={isOn ? theme.primary : '#94a3b8'}
                      />
                    </View>

                    {/* Label */}
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 14, fontWeight: '700',
                        color: isOn ? '#1e293b' : '#64748b',
                      }}>
                        {field.label}
                      </Text>
                      <Text style={{
                        fontSize: 11, color: '#94a3b8',
                        fontWeight: '500', marginTop: 1,
                      }}>
                        {field.desc}
                      </Text>
                    </View>

                    {/* Switch */}
                    <Switch
                      value={isOn}
                      onValueChange={(val) => updateInvoiceConfig({ [field.key]: val })}
                      trackColor={{ false: '#e2e8f0', true: theme.primary + '99' }}
                      thumbColor={isOn ? theme.primary : '#cbd5e1'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Info banner */}
        <View style={{
          marginHorizontal: 16, marginTop: 24,
          padding: 14, borderRadius: 16,
          backgroundColor: '#eff6ff',
          borderWidth: 1, borderColor: '#dbeafe',
          flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        }}>
          <MaterialIcons name="info-outline" size={16} color="#3b82f6" style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 12, color: '#2563eb', lineHeight: 18, fontWeight: '500' }}>
            Changes apply instantly to all newly generated invoice PDFs. Open any invoice and tap Share → PDF to preview.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
