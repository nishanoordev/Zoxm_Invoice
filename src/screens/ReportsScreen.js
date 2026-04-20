/**
 * ReportsScreen.js
 *
 * ZOXM-style Financial Reports Hub
 * - Filter tabs: All | Customer | Sales | GST | Inventory | Supplier
 * - Grouped categories with report rows
 * - Taps navigate to ReportViewer with the report type
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  SafeAreaView, Platform,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Report Data ──────────────────────────────────────────────────────────────
const REPORT_GROUPS = [
  {
    id: 'customer',
    category: 'Customer',
    title: 'Customer Analytics',
    icon: 'people',
    accent: '#6366f1',
    bg: '#eef2ff',
    reports: [
      {
        id: 'customer_transactions',
        title: 'Customer Transaction Summary',
        subtitle: 'Full ledger of all customer activity',
        icon: 'receipt-long',
        iconColor: '#6366f1',
      },
      {
        id: 'customer_due',
        title: 'Outstanding Dues Report',
        subtitle: 'Customers with pending balances',
        icon: 'account-balance-wallet',
        iconColor: '#f43f5e',
      },
      {
        id: 'customer_list',
        title: 'Customer Directory Export',
        subtitle: 'Complete list of all customers',
        icon: 'contacts',
        iconColor: '#6366f1',
      },
    ],
  },
  {
    id: 'sales',
    category: 'Sales',
    title: 'Sales & Billing',
    icon: 'trending-up',
    accent: '#10b981',
    bg: '#ecfdf5',
    reports: [
      {
        id: 'sales_report',
        title: 'Sales Overview Report',
        subtitle: 'Total revenue, invoices & collections',
        icon: 'bar-chart',
        iconColor: '#10b981',
      },
      {
        id: 'purchase_report',
        title: 'Purchase Overview Report',
        subtitle: 'All supplier purchases & expenses',
        icon: 'shopping-cart',
        iconColor: '#f59e0b',
      },
      {
        id: 'cashbook',
        title: 'Cash Flow Statement',
        subtitle: 'Daily inflow & outflow of cash',
        icon: 'currency-exchange',
        iconColor: '#0891b2',
      },
    ],
  },
  {
    id: 'gst',
    category: 'GST',
    title: 'GST / Tax Reports',
    icon: 'account-balance',
    accent: '#dc2626',
    bg: '#fef2f2',
    reports: [
      {
        id: 'gstr1',
        title: 'GSTR-1 Report',
        subtitle: 'Outward supply — monthly/quarterly',
        icon: 'description',
        iconColor: '#dc2626',
      },
      {
        id: 'gstr2',
        title: 'GSTR-2 Report',
        subtitle: 'Inward supply purchase summary',
        icon: 'description',
        iconColor: '#dc2626',
      },
      {
        id: 'gstr3b',
        title: 'GSTR-3B Summary',
        subtitle: 'Net tax liability — offset & payable',
        icon: 'description',
        iconColor: '#dc2626',
      },
    ],
  },
  {
    id: 'daywise',
    category: 'Day-wise',
    title: 'Day-wise Breakdown',
    icon: 'calendar-today',
    accent: '#7c3aed',
    bg: '#f5f3ff',
    reports: [
      {
        id: 'sales_daywise',
        title: 'Daily Sales Report',
        subtitle: 'Date-by-date sales breakdown',
        icon: 'event-note',
        iconColor: '#7c3aed',
      },
      {
        id: 'purchase_daywise',
        title: 'Daily Purchase Report',
        subtitle: 'Date-by-date purchase breakdown',
        icon: 'event-note',
        iconColor: '#7c3aed',
      },
    ],
  },
  {
    id: 'inventory',
    category: 'Inventory',
    title: 'Inventory Reports',
    icon: 'inventory',
    accent: '#ea580c',
    bg: '#fff7ed',
    reports: [
      {
        id: 'stock_summary',
        title: 'Stock Summary',
        subtitle: 'Current stock levels for all items',
        icon: 'inventory-2',
        iconColor: '#ea580c',
      },
      {
        id: 'low_stock',
        title: 'Low Stock Alert Report',
        subtitle: 'Items below minimum stock threshold',
        icon: 'warning',
        iconColor: '#f59e0b',
      },
      {
        id: 'profit_loss',
        title: 'Profit & Loss Statement',
        subtitle: 'Item-level margin & profitability',
        icon: 'show-chart',
        iconColor: '#10b981',
      },
    ],
  },
  {
    id: 'supplier',
    category: 'Supplier',
    title: 'Supplier Reports',
    icon: 'local-shipping',
    accent: '#0891b2',
    bg: '#ecfeff',
    reports: [
      {
        id: 'supplier_transactions',
        title: 'Supplier Transaction Summary',
        subtitle: 'Purchase ledger per supplier',
        icon: 'receipt-long',
        iconColor: '#0891b2',
      },
      {
        id: 'supplier_list',
        title: 'Supplier Directory Export',
        subtitle: 'Complete list of all suppliers',
        icon: 'contacts',
        iconColor: '#0891b2',
      },
    ],
  },
];

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'customer', label: 'Customer' },
  { id: 'sales', label: 'Sales' },
  { id: 'gst', label: 'GST' },
  { id: 'daywise', label: 'Day-wise' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'supplier', label: 'Supplier' },
];

// ─── Report Row ───────────────────────────────────────────────────────────────
function ReportRow({ report, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
        backgroundColor: '#fff',
      }}
    >
      {/* Icon bubble */}
      <View style={{
        width: 42, height: 42, borderRadius: 12,
        backgroundColor: report.iconColor + '15',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 14,
      }}>
        <MaterialIcons name={report.icon} size={22} color={report.iconColor} />
      </View>

      {/* Label */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b', letterSpacing: -0.1 }}>
          {report.title}
        </Text>
        <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 2 }}>
          {report.subtitle}
        </Text>
      </View>

      <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
    </TouchableOpacity>
  );
}

// ─── Group Card ───────────────────────────────────────────────────────────────
function ReportGroup({ group, navigation }) {
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 18, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#64748b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
      {/* Group header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 18, paddingVertical: 13,
        backgroundColor: group.bg,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
      }}>
        <View style={{
          width: 34, height: 34, borderRadius: 10,
          backgroundColor: group.accent + '20',
          alignItems: 'center', justifyContent: 'center',
          marginRight: 12,
        }}>
          <MaterialIcons name={group.icon} size={18} color={group.accent} />
        </View>
        <Text style={{ fontSize: 15, fontWeight: '900', color: '#1e293b', letterSpacing: -0.2 }}>
          {group.title}
        </Text>
      </View>

      {/* Report rows */}
      {group.reports.map((report, idx) => (
        <ReportRow
          key={report.id}
          report={report}
          onPress={() => navigation.navigate('ReportViewer', { reportType: report.id, title: report.title })}
        />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ReportsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('all');

  const visibleGroups = activeTab === 'all'
    ? REPORT_GROUPS
    : REPORT_GROUPS.filter(g => g.id === activeTab);

  const totalReports = REPORT_GROUPS.reduce((sum, g) => sum + g.reports.length, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>

      {/* ── Header ── */}
      <View style={{
        backgroundColor: '#262A56',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 10 : 40,
        paddingBottom: 0,
        shadowColor: '#262A56', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
          >
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>Financial Reports</Text>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="file-download" size={22} color="#fff" />
          </View>
        </View>

        {/* Summary pill */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 8 }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="bar-chart" size={14} color="#a5b4fc" />
            <Text style={{ color: '#e0e7ff', fontSize: 12, fontWeight: '700' }}>{totalReports} reports available</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="folder" size={14} color="#a5b4fc" />
            <Text style={{ color: '#e0e7ff', fontSize: 12, fontWeight: '700' }}>{REPORT_GROUPS.length} categories</Text>
          </View>
        </View>

        {/* ── Filter Tabs (inside header) ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 2, paddingVertical: 14, gap: 8 }}
          style={{ flexShrink: 0 }}
        >
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: active ? '#fff' : 'rgba(255,255,255,0.13)',
                  borderWidth: active ? 0 : 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <Text style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: active ? '#262A56' : 'rgba(255,255,255,0.8)',
                  letterSpacing: -0.1,
                }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Report Groups ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: Math.max(insets.bottom, 100) }}
      >
        {visibleGroups.map(group => (
          <ReportGroup key={group.id} group={group} navigation={navigation} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
