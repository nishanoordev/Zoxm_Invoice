/**
 * ReportViewerScreen.js
 *
 * Handles all 16 report types from ReportsScreen.
 * Each type reads from the Zustand store and computes real data.
 */
import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  SafeAreaView, ScrollView, Platform, Modal, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { formatAmount } from '../utils/formatters';
import { CsvService } from '../utils/CsvService';
import { ReportPdfService } from '../utils/ReportPdfService';
import { calculateCustomerBalances } from '../utils/balanceCalculator';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DATE_FILTERS = [
  { id: 'all',     label: 'All Time' },
  { id: 'today',   label: 'Today' },
  { id: 'week',    label: 'This Week' },
  { id: 'month',   label: 'This Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year',    label: 'This Year' },
];

function getPresetRange(filterId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (filterId) {
    case 'today':   return { start: today, end: now };
    case 'week': {
      const s = new Date(today); s.setDate(today.getDate() - today.getDay());
      return { start: s, end: now };
    }
    case 'month':   return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3);
      return { start: new Date(now.getFullYear(), q * 3, 1), end: now };
    }
    case 'year':    return { start: new Date(now.getFullYear(), 0, 1), end: now };
    default:        return null;
  }
}

function inRange(dateStr, range) {
  if (!range) return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= range.start && d <= range.end;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateShort(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

const sym = (s) => s || '₹';

// ─── Report Data Builders ─────────────────────────────────────────────────────

function buildCustomerTransactions(invoices, payments, customers, range) {
  const custMap = {};
  customers.forEach(c => { custMap[c.id] = c.name; });

  const rows = [];
  // Sales invoices
  invoices
    .filter(inv => !inv.isDeleted && inv.type !== 'estimate' && inRange(inv.date, range))
    .forEach(inv => {
      rows.push({
        id: inv.id,
        date: inv.date,
        customer: inv.customerName || inv.customer_name || '—',
        type: 'Invoice',
        ref: inv.invoiceNumber || inv.invoice_number || '—',
        amount: inv.total || 0,
        status: inv.status || '—',
        color: '#6366f1',
        icon: 'receipt',
      });
    });
  // Payments received
  payments
    .filter(p => p.type === 'payment' && inRange(p.date, range))
    .forEach(p => {
      rows.push({
        id: p.id,
        date: p.date,
        customer: p.customerName || '—',
        type: 'Payment',
        ref: p.method || 'Cash',
        amount: p.amount || 0,
        status: 'Received',
        color: '#10b981',
        icon: 'payment',
      });
    });

  return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function buildOutstandingDues(customers, invoices, payments, range) {
  // Group net due per customer using simple calculation
  const custInvoices = {};
  invoices
    .filter(inv => !inv.isDeleted && inv.type !== 'estimate')
    .forEach(inv => {
      const cid = inv.customerId || inv.customer_id;
      if (!cid) return;
      if (!custInvoices[cid]) custInvoices[cid] = { name: inv.customerName || inv.customer_name, invoiced: 0, paid: 0 };
      custInvoices[cid].invoiced += inv.total || 0;
    });

  payments
    .filter(p => p.type === 'payment' || p.type === 'due_entry')
    .forEach(p => {
      const cid = p.customerId || p.customer_id;
      if (!cid || !custInvoices[cid]) return;
      if (p.type === 'payment') custInvoices[cid].paid += p.amount || 0;
      else custInvoices[cid].invoiced += p.amount || 0;
    });

  return Object.entries(custInvoices)
    .map(([id, d]) => ({
      id,
      customer: d.name || '—',
      invoiced: d.invoiced,
      paid: d.paid,
      due: Math.max(0, d.invoiced - d.paid),
      color: '#f43f5e',
      icon: 'account-balance-wallet',
    }))
    .filter(r => r.due > 0.01)
    .sort((a, b) => b.due - a.due);
}

function buildCustomerDirectory(customers) {
  return customers.map(c => ({
    id: c.id,
    name: c.name || '—',
    phone: c.phone || '—',
    email: c.email || '—',
    address: c.address || '—',
    color: '#6366f1',
    icon: 'person',
  }));
}

function buildSalesOverview(invoices, payments, range) {
  const filtered = invoices.filter(inv => !inv.isDeleted && inv.type !== 'estimate' && inRange(inv.date, range));
  const monthMap = {};
  filtered.forEach(inv => {
    const month = (inv.date || '').substring(0, 7);
    if (!monthMap[month]) monthMap[month] = { label: month, revenue: 0, count: 0, tax: 0, discount: 0 };
    monthMap[month].revenue += inv.total || 0;
    monthMap[month].count += 1;
    monthMap[month].tax += inv.taxAmount || inv.tax_amount || 0;
    monthMap[month].discount += inv.discountAmount || inv.discount_amount || 0;
  });
  return Object.values(monthMap).sort((a, b) => b.label.localeCompare(a.label));
}

function buildPurchaseOverview(purchases, range) {
  const filtered = purchases.filter(p => inRange(p.date, range));
  const monthMap = {};
  filtered.forEach(p => {
    const month = (p.date || '').substring(0, 7);
    if (!monthMap[month]) monthMap[month] = { label: month, total: 0, count: 0, paid: 0 };
    monthMap[month].total += p.total || 0;
    monthMap[month].count += 1;
  });
  return Object.values(monthMap).sort((a, b) => b.label.localeCompare(a.label));
}

function buildCashFlow(invoices, payments, purchases, range) {
  const rows = [];
  // Cash inflows (payments received)
  payments
    .filter(p => p.type === 'payment' && inRange(p.date, range))
    .forEach(p => {
      rows.push({
        id: p.id, date: p.date,
        label: p.customerName || 'Customer',
        sub: `Payment · ${p.method || 'Cash'}`,
        amount: p.amount || 0,
        type: 'in', color: '#10b981', icon: 'arrow-downward',
      });
    });
  // Cash outflows (purchases paid)
  purchases
    .filter(p => inRange(p.date, range))
    .forEach(p => {
      rows.push({
        id: p.id, date: p.date,
        label: p.supplierName || p.supplier_name || 'Supplier',
        sub: `Purchase · ${p.paymentMode || 'Cash'}`,
        amount: p.total || 0,
        type: 'out', color: '#f43f5e', icon: 'arrow-upward',
      });
    });
  return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function buildGSTR1(invoices, range) {
  // Outward supply: all sales invoices grouped by tax rate
  const map = {};
  invoices
    .filter(inv => !inv.isDeleted && inv.type !== 'estimate' && inRange(inv.date, range))
    .forEach(inv => {
      const rate = inv.taxPercent || inv.tax_percent || 0;
      if (!map[rate]) map[rate] = { rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, count: 0 };
      const tax = inv.taxAmount || inv.tax_amount || 0;
      map[rate].taxable += (inv.subtotal || (inv.total - tax)) || 0;
      map[rate].cgst += inv.cgstAmount || inv.cgst_amount || (inv.isInterState ? 0 : tax / 2);
      map[rate].sgst += inv.sgstAmount || inv.sgst_amount || (inv.isInterState ? 0 : tax / 2);
      map[rate].igst += inv.igstAmount || inv.igst_amount || (inv.isInterState ? tax : 0);
      map[rate].count += 1;
    });
  return Object.values(map).sort((a, b) => b.taxable - a.taxable);
}

function buildGSTR2(purchases, range) {
  // Inward supply: all purchases grouped by tax rate
  const map = {};
  purchases
    .filter(p => inRange(p.date, range))
    .forEach(p => {
      const rate = p.taxPercent || p.tax_percent || 0;
      if (!map[rate]) map[rate] = { rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, count: 0 };
      const tax = p.taxAmount || p.tax_amount || 0;
      map[rate].taxable += (p.subtotal || (p.total - tax)) || 0;
      map[rate].cgst += p.cgstAmount || p.cgst_amount || (p.isInterState ? 0 : tax / 2);
      map[rate].sgst += p.sgstAmount || p.sgst_amount || (p.isInterState ? 0 : tax / 2);
      map[rate].igst += p.igstAmount || p.igst_amount || (p.isInterState ? tax : 0);
      map[rate].count += 1;
    });
  return Object.values(map).sort((a, b) => b.taxable - a.taxable);
}

function buildGSTR3B(invoices, purchases, range) {
  const outward = buildGSTR1(invoices, range);
  const inward = buildGSTR2(purchases, range);
  const totalOutCGST = outward.reduce((s, r) => s + r.cgst, 0);
  const totalOutSGST = outward.reduce((s, r) => s + r.sgst, 0);
  const totalOutIGST = outward.reduce((s, r) => s + r.igst, 0);
  const totalInCGST  = inward.reduce((s, r) => s + r.cgst, 0);
  const totalInSGST  = inward.reduce((s, r) => s + r.sgst, 0);
  const totalInIGST  = inward.reduce((s, r) => s + r.igst, 0);
  return [
    { label: 'Output CGST (Sales)', amount: totalOutCGST, color: '#dc2626', icon: 'receipt-long' },
    { label: 'Output SGST (Sales)', amount: totalOutSGST, color: '#dc2626', icon: 'receipt-long' },
    { label: 'Output IGST (Sales)', amount: totalOutIGST, color: '#dc2626', icon: 'receipt-long' },
    { label: 'Input CGST (Purchases)', amount: totalInCGST, color: '#10b981', icon: 'shopping-cart' },
    { label: 'Input SGST (Purchases)', amount: totalInSGST, color: '#10b981', icon: 'shopping-cart' },
    { label: 'Input IGST (Purchases)', amount: totalInIGST, color: '#10b981', icon: 'shopping-cart' },
    { label: 'Net CGST Payable', amount: Math.max(0, totalOutCGST - totalInCGST), color: '#7c3aed', icon: 'account-balance' },
    { label: 'Net SGST Payable', amount: Math.max(0, totalOutSGST - totalInSGST), color: '#7c3aed', icon: 'account-balance' },
    { label: 'Net IGST Payable', amount: Math.max(0, totalOutIGST - totalInIGST), color: '#7c3aed', icon: 'account-balance' },
  ];
}

function buildDaywiseSales(invoices, range) {
  const map = {};
  invoices
    .filter(inv => !inv.isDeleted && inv.type !== 'estimate' && inRange(inv.date, range))
    .forEach(inv => {
      const day = (inv.date || '').substring(0, 10);
      if (!map[day]) map[day] = { date: day, revenue: 0, count: 0, paid: 0 };
      map[day].revenue += inv.total || 0;
      map[day].count += 1;
      if (inv.status === 'Paid') map[day].paid += inv.total || 0;
    });
  return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
}

function buildDaywisePurchase(purchases, range) {
  const map = {};
  purchases
    .filter(p => inRange(p.date, range))
    .forEach(p => {
      const day = (p.date || '').substring(0, 10);
      if (!map[day]) map[day] = { date: day, total: 0, count: 0 };
      map[day].total += p.total || 0;
      map[day].count += 1;
    });
  return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
}

function buildStockSummary(items) {
  return items
    .map(item => ({
      id: item.id,
      name: item.name || '—',
      sku: item.sku || '—',
      qty: item.stock || item.quantity || 0,
      price: item.retailPrice || item.retail_price || item.price || 0,
      unit: item.unit || 'pcs',
      value: (item.stock || item.quantity || 0) * (item.retailPrice || item.retail_price || item.price || 0),
      color: '#ea580c',
      icon: 'inventory-2',
    }))
    .sort((a, b) => b.value - a.value);
}

function buildLowStock(items) {
  return items
    .filter(item => {
      const qty = item.stock || item.quantity || 0;
      const threshold = item.lowStockThreshold || item.low_stock_threshold || 5;
      return qty <= threshold;
    })
    .map(item => ({
      id: item.id,
      name: item.name || '—',
      qty: item.stock || item.quantity || 0,
      threshold: item.lowStockThreshold || item.low_stock_threshold || 5,
      color: '#f59e0b',
      icon: 'warning',
    }))
    .sort((a, b) => a.qty - b.qty);
}

function buildProfitLoss(invoices, purchases, range) {
  const sales = invoices
    .filter(inv => !inv.isDeleted && inv.type !== 'estimate' && inRange(inv.date, range))
    .reduce((s, inv) => s + (inv.total || 0), 0);
  const cost = purchases
    .filter(p => inRange(p.date, range))
    .reduce((s, p) => s + (p.total || 0), 0);
  const taxOut = invoices
    .filter(inv => !inv.isDeleted && inv.type !== 'estimate' && inRange(inv.date, range))
    .reduce((s, inv) => s + (inv.taxAmount || inv.tax_amount || 0), 0);
  const taxIn = purchases
    .filter(p => inRange(p.date, range))
    .reduce((s, p) => s + (p.taxAmount || p.tax_amount || 0), 0);
  const grossProfit = sales - cost;
  const netTax = taxOut - taxIn;
  return [
    { label: 'Total Revenue', amount: sales, color: '#10b981', icon: 'trending-up', sub: 'From all invoices' },
    { label: 'Cost of Goods', amount: cost, color: '#f43f5e', icon: 'shopping-cart', sub: 'Total purchases' },
    { label: 'Gross Profit', amount: grossProfit, color: grossProfit >= 0 ? '#10b981' : '#f43f5e', icon: 'show-chart', sub: 'Revenue minus cost' },
    { label: 'Tax Collected', amount: taxOut, color: '#dc2626', icon: 'receipt-long', sub: 'Output GST' },
    { label: 'Tax Paid (ITC)', amount: taxIn, color: '#6366f1', icon: 'receipt', sub: 'Input GST credit' },
    { label: 'Net Tax Liability', amount: netTax, color: '#7c3aed', icon: 'account-balance', sub: 'To be paid to govt' },
  ];
}

function buildSupplierTransactions(purchases, supplierPayments, range) {
  const rows = [];
  purchases
    .filter(p => inRange(p.date, range))
    .forEach(p => {
      rows.push({
        id: p.id, date: p.date,
        supplier: p.supplierName || p.supplier_name || 'Unknown',
        ref: p.billNumber || p.bill_number || '—',
        amount: p.total || 0,
        status: p.status || '—',
        color: '#0891b2', icon: 'receipt-long', type: 'Purchase',
      });
    });
  supplierPayments
    .filter(p => inRange(p.date || p.created_at, range))
    .forEach(p => {
      rows.push({
        id: p.id, date: p.date || p.created_at,
        supplier: p.supplierName || p.supplier_name || 'Supplier',
        ref: p.method || 'Payment',
        amount: p.amount || 0,
        status: 'Paid',
        color: '#10b981', icon: 'payment', type: 'Payment',
      });
    });
  return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function buildSupplierDirectory(suppliers) {
  return suppliers.map(s => ({
    id: s.id,
    name: s.name || '—',
    phone: s.phone || '—',
    email: s.email || '—',
    gstin: s.gstin || '—',
    state: s.state || '—',
    color: '#0891b2', icon: 'local-shipping',
  }));
}

function buildCustomerLedger(customers, invoices, payments, customerWallets) {
  const round2 = v => Math.round(v * 100) / 100;
  return customers
    .map(c => {
      const { totalDue, totalPaid, totalInvoiced, creditBalance } = calculateCustomerBalances(c.id, invoices, payments);
      const walletBal = (customerWallets || {})[c.id] || 0;
      const net = round2(totalDue - creditBalance - walletBal);
      const status = net > 0.01 ? 'you_get' : net < -0.01 ? 'you_give' : 'settled';
      return {
        id: c.id,
        name: c.name || '—',
        phone: c.phone || '—',
        invoiced: round2(totalInvoiced),
        paid: round2(totalPaid),
        net,
        status,
        color: status === 'you_get' ? '#f43f5e' : status === 'you_give' ? '#10b981' : '#94a3b8',
        icon: 'person',
      };
    })
    .sort((a, b) => b.net - a.net);
}

// ─── Row Renderers ─────────────────────────────────────────────────────────────

function GenericAmountRow({ item, currSym }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: (item.color || '#6366f1') + '18', alignItems: 'center', justifyContent: 'center', marginRight: 13 }}>
        <MaterialIcons name={item.icon || 'circle'} size={20} color={item.color || '#6366f1'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }} numberOfLines={1}>{item.label || item.name}</Text>
        {item.sub ? <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{item.sub}</Text> : null}
      </View>
      <Text style={{ fontSize: 15, fontWeight: '900', color: item.color || '#6366f1' }}>
        {formatAmount(item.amount ?? item.due ?? item.value ?? 0, currSym)}
      </Text>
    </View>
  );
}

function TransactionRow({ item, currSym }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: item.color + '18', alignItems: 'center', justifyContent: 'center', marginRight: 13 }}>
        <MaterialIcons name={item.icon} size={20} color={item.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e293b' }} numberOfLines={1}>{item.customer || item.supplier}</Text>
        <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
          {fmtDateShort(item.date)} · {item.type} · {item.ref}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 14, fontWeight: '900', color: item.color }}>
          {formatAmount(item.amount || 0, currSym)}
        </Text>
        <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{item.status}</Text>
      </View>
    </View>
  );
}

function DueRow({ item, currSym }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: '#fef2f2', elevation: 1 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginRight: 13 }}>
        <MaterialIcons name="account-balance-wallet" size={20} color="#f43f5e" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b' }} numberOfLines={1}>{item.customer}</Text>
        <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
          Invoiced {formatAmount(item.invoiced, currSym)} · Paid {formatAmount(item.paid, currSym)}
        </Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: '900', color: '#f43f5e' }}>
        {formatAmount(item.due, currSym)}
      </Text>
    </View>
  );
}

function DirectoryRow({ item }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: (item.color || '#6366f1') + '18', alignItems: 'center', justifyContent: 'center', marginRight: 13 }}>
        <MaterialIcons name={item.icon || 'person'} size={20} color={item.color || '#6366f1'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b' }} numberOfLines={1}>{item.name}</Text>
        <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
          📞 {item.phone}{item.gstin && item.gstin !== '—' ? ` · GST: ${item.gstin}` : ''}
        </Text>
      </View>
    </View>
  );
}

function CustomerLedgerRow({ item, currSym }) {
  const statusLabel =
    item.status === 'you_get' ? "You'll Get" :
    item.status === 'you_give' ? "You'll Give" : 'Settled';
  const borderColor =
    item.status === 'you_get' ? '#fef2f2' :
    item.status === 'you_give' ? '#f0fdf4' : '#f1f5f9';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, padding: 14, borderWidth: 1, borderColor, elevation: 1 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: item.color + '18', alignItems: 'center', justifyContent: 'center', marginRight: 13 }}>
        <MaterialIcons name="person" size={20} color={item.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b' }} numberOfLines={1}>{item.name}</Text>
        <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
          {item.phone !== '—' ? `📞 ${item.phone} · ` : ''}Invoiced {formatAmount(item.invoiced, currSym)} · Paid {formatAmount(item.paid, currSym)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 15, fontWeight: '900', color: item.color }}>
          {formatAmount(Math.abs(item.net), currSym)}
        </Text>
        <Text style={{ fontSize: 10, color: item.color, marginTop: 2, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' }}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}

function MonthSalesRow({ item, currSym }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: '#f1f5f9' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b' }}>{item.label}</Text>
        <Text style={{ fontSize: 15, fontWeight: '900', color: '#10b981' }}>{formatAmount(item.revenue ?? item.total ?? 0, currSym)}</Text>
      </View>
      <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
        {item.count} invoices{item.tax ? ` · Tax: ${formatAmount(item.tax, currSym)}` : ''}
      </Text>
    </View>
  );
}

function DaywiseRow({ item, currSym, isRevenue }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: '#f1f5f9' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b' }}>{fmtDate(item.date)}</Text>
        <Text style={{ fontSize: 15, fontWeight: '900', color: isRevenue ? '#10b981' : '#f97316' }}>
          {formatAmount(item.revenue ?? item.total ?? 0, currSym)}
        </Text>
      </View>
      <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
        {item.count} {isRevenue ? 'invoice' : 'purchase'}{item.count !== 1 ? 's' : ''}
      </Text>
    </View>
  );
}

function StockRow({ item, currSym }) {
  const isLow = item.qty <= (item.threshold || 5);
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: isLow ? '#fff7ed' : '#f1f5f9' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#ea580c18', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <MaterialIcons name={isLow ? 'warning' : 'inventory-2'} size={18} color={isLow ? '#f59e0b' : '#ea580c'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }} numberOfLines={1}>{item.name}</Text>
          <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            Qty: {item.qty} {item.unit || ''} {item.threshold ? `· Min: ${item.threshold}` : ''}
          </Text>
        </View>
        {item.value !== undefined && (
          <Text style={{ fontSize: 14, fontWeight: '900', color: '#ea580c' }}>
            {formatAmount(item.value, currSym)}
          </Text>
        )}
      </View>
    </View>
  );
}

function GSTRow({ item, currSym }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: '#f1f5f9' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b' }}>GST {item.rate}%</Text>
        <Text style={{ fontSize: 11, color: '#94a3b8' }}>{item.count} transactions</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ fontSize: 11, color: '#64748b' }}>Taxable: {formatAmount(item.taxable, currSym)}</Text>
        <Text style={{ fontSize: 11, color: '#64748b' }}>
          CGST: {formatAmount(item.cgst, currSym)} · SGST: {formatAmount(item.sgst, currSym)}
        </Text>
      </View>
      {item.igst > 0 && (
        <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>IGST (Interstate): {formatAmount(item.igst, currSym)}</Text>
      )}
    </View>
  );
}

// ─── Summary Banner ──────────────────────────────────────────────────────────

function SummaryBanner({ rows, reportType, currSym, activeDateLabel }) {
  const isCountOnly = ['customer_list', 'supplier_list', 'low_stock', 'customer_ledger'].includes(reportType);
  let totalLabel = 'Total Amount';
  let total = 0;
  let totalStr = null;
  // For customer_ledger we render a custom 2-line summary
  let ledgerYoullGet = 0;
  let ledgerYoullGive = 0;

  if (reportType === 'customer_ledger') {
    ledgerYoullGet  = rows.filter(r => r.status === 'you_get').reduce((s, r) => s + r.net, 0);
    ledgerYoullGive = rows.filter(r => r.status === 'you_give').reduce((s, r) => s + Math.abs(r.net), 0);
    totalStr = `${rows.length} Customer${rows.length !== 1 ? 's' : ''}`;
    totalLabel = 'Customer Ledger';
  }
  else if (reportType === 'customer_list') { totalStr = `${rows.length} Customer${rows.length !== 1 ? 's' : ''}`; totalLabel = 'Customer Directory'; }
  else if (reportType === 'supplier_list') { totalStr = `${rows.length} Supplier${rows.length !== 1 ? 's' : ''}`; totalLabel = 'Supplier Directory'; }
  else if (reportType === 'low_stock') { totalStr = `${rows.length} Item${rows.length !== 1 ? 's' : ''} Low`; totalLabel = 'Low Stock Alert'; }
  else if (reportType === 'customer_transactions') { total = rows.reduce((s, r) => r.type === 'Invoice' ? s + r.amount : s, 0); totalLabel = 'Total Invoiced'; }
  else if (reportType === 'outstanding_dues') { total = rows.reduce((s, r) => s + r.due, 0); totalLabel = 'Total Outstanding'; }
  else if (reportType === 'sales_report') { total = rows.reduce((s, r) => s + r.revenue, 0); totalLabel = 'Total Revenue'; }
  else if (reportType === 'purchase_report') { total = rows.reduce((s, r) => s + (r.total || 0), 0); totalLabel = 'Total Purchased'; }
  else if (reportType === 'cashbook') {
    const inflow  = rows.filter(r => r.type === 'in').reduce((s, r) => s + r.amount, 0);
    const outflow = rows.filter(r => r.type === 'out').reduce((s, r) => s + r.amount, 0);
    total = inflow - outflow;
    totalLabel = `Net Cash  ·  In ${formatAmount(inflow, currSym)}  Out ${formatAmount(outflow, currSym)}`;
  }
  else if (reportType === 'stock_summary') { total = rows.reduce((s, r) => s + (r.value || 0), 0); totalLabel = 'Total Stock Value'; }
  else if (reportType === 'profit_loss') { const gp = rows.find(r => r.label === 'Gross Profit'); total = gp ? gp.amount : 0; totalLabel = 'Gross Profit'; }
  else if (reportType === 'gstr1' || reportType === 'gstr2') { total = rows.reduce((s, r) => s + r.taxable, 0); totalLabel = 'Total Taxable Value'; }
  else if (reportType === 'gstr3b') { total = rows.filter(r => r.label.startsWith('Net')).reduce((s, r) => s + r.amount, 0); totalLabel = 'Net Tax Payable'; }
  else if (reportType === 'sales_daywise') { total = rows.reduce((s, r) => s + (r.revenue || 0), 0); totalLabel = 'Total Sales'; }
  else if (reportType === 'purchase_daywise') { total = rows.reduce((s, r) => s + (r.total || 0), 0); totalLabel = 'Total Purchases'; }
  else if (reportType === 'supplier_transactions') { total = rows.reduce((s, r) => r.type === 'Purchase' ? s + r.amount : s, 0); totalLabel = 'Total Purchased'; }

  const accentColor = {
    customer_ledger: '#262A56',
    customer_transactions: '#6366f1', outstanding_dues: '#f43f5e', customer_list: '#6366f1',
    sales_report: '#10b981', purchase_report: '#f97316', cashbook: '#0891b2',
    gstr1: '#dc2626', gstr2: '#dc2626', gstr3b: '#7c3aed',
    sales_daywise: '#7c3aed', purchase_daywise: '#ea580c',
    stock_summary: '#ea580c', low_stock: '#f59e0b', profit_loss: '#10b981',
    supplier_transactions: '#0891b2', supplier_list: '#0891b2',
  }[reportType] || '#262A56';

  const displayColor = (reportType === 'profit_loss' && total < 0) ? '#f43f5e' : accentColor;

  if (reportType === 'customer_ledger') {
    return (
      <View style={{ backgroundColor: '#262A56', borderRadius: 20, padding: 20, marginBottom: 16 }}>
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>Customer Ledger Summary</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(244,63,94,0.18)', borderRadius: 14, padding: 14 }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>You'll Get</Text>
            <Text style={{ color: '#f87171', fontSize: 20, fontWeight: '900', marginTop: 6, letterSpacing: -0.5 }}>{formatAmount(ledgerYoullGet, currSym)}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: 'rgba(16,185,129,0.18)', borderRadius: 14, padding: 14 }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>You'll Give</Text>
            <Text style={{ color: '#34d399', fontSize: 20, fontWeight: '900', marginTop: 6, letterSpacing: -0.5 }}>{formatAmount(ledgerYoullGive, currSym)}</Text>
          </View>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 10 }}>
          {rows.length} customer{rows.length !== 1 ? 's' : ''} · {activeDateLabel}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: displayColor, borderRadius: 20, padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{totalLabel}</Text>
        {totalStr ? (
          <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -1 }}>{totalStr}</Text>
        ) : (
          <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -1 }}>
            {total < 0 ? '- ' : ''}{formatAmount(Math.abs(total), currSym)}
          </Text>
        )}
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 6 }}>
          {rows.length} entr{rows.length === 1 ? 'y' : 'ies'} · {activeDateLabel}
        </Text>
      </View>
      <MaterialIcons name={isCountOnly ? 'contacts' : 'bar-chart'} size={52} color="rgba(255,255,255,0.15)" />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ReportViewerScreen({ route, navigation }) {
  const { reportType, title } = route.params || {};
  const insets = useSafeAreaInsets();

  const invoices          = useStore(s => s.invoices);
  const payments          = useStore(s => s.payments);
  const purchases         = useStore(s => s.purchases);
  const supplierPayments  = useStore(s => s.supplierPayments);
  const customers         = useStore(s => s.customers);
  const suppliers         = useStore(s => s.suppliers);
  const items             = useStore(s => s.items);
  const customerWallets   = useStore(s => s.customerWallets);
  const profile            = useStore(s => s.profile);
  const currSym            = useStore(s => s.profile.currency_symbol || '₹');

  const [dateFilter, setDateFilter] = useState('month');

  const range = useMemo(() => getPresetRange(dateFilter), [dateFilter]);
  const activeDateLabel = DATE_FILTERS.find(f => f.id === dateFilter)?.label || 'All Time';

  const accentColor = {
    customer_transactions: '#6366f1', outstanding_dues: '#f43f5e', customer_list: '#6366f1',
    sales_report: '#10b981', purchase_report: '#f97316', cashbook: '#0891b2',
    gstr1: '#dc2626', gstr2: '#dc2626', gstr3b: '#7c3aed',
    sales_daywise: '#7c3aed', purchase_daywise: '#ea580c',
    stock_summary: '#ea580c', low_stock: '#f59e0b', profit_loss: '#10b981',
    supplier_transactions: '#0891b2', supplier_list: '#0891b2',
  }[reportType] || '#262A56';

  // No date filter for directories/inventory/ledger
  const noDateFilter = ['customer_list', 'supplier_list', 'stock_summary', 'low_stock', 'customer_ledger'].includes(reportType);

  const rows = useMemo(() => {
    const r = noDateFilter ? null : range;
    switch (reportType) {
      case 'customer_ledger':       return buildCustomerLedger(customers, invoices, payments, customerWallets);
      case 'customer_transactions': return buildCustomerTransactions(invoices, payments, customers, r);
      case 'outstanding_dues':      return buildOutstandingDues(customers, invoices, payments, r);
      case 'customer_list':         return buildCustomerDirectory(customers);
      case 'sales_report':          return buildSalesOverview(invoices, payments, r);
      case 'purchase_report':       return buildPurchaseOverview(purchases, r);
      case 'cashbook':              return buildCashFlow(invoices, payments, purchases, r);
      case 'gstr1':                 return buildGSTR1(invoices, r);
      case 'gstr2':                 return buildGSTR2(purchases, r);
      case 'gstr3b':                return buildGSTR3B(invoices, purchases, r);
      case 'sales_daywise':         return buildDaywiseSales(invoices, r);
      case 'purchase_daywise':      return buildDaywisePurchase(purchases, r);
      case 'stock_summary':         return buildStockSummary(items);
      case 'low_stock':             return buildLowStock(items);
      case 'profit_loss':           return buildProfitLoss(invoices, purchases, r);
      case 'supplier_transactions': return buildSupplierTransactions(purchases, supplierPayments, r);
      case 'supplier_list':         return buildSupplierDirectory(suppliers);
      default:                      return [];
    }
  }, [reportType, invoices, payments, purchases, supplierPayments, customers, suppliers, items, customerWallets, range, noDateFilter]);

  const renderRow = useCallback(({ item, index }) => {
    switch (reportType) {
      case 'customer_ledger':       return <CustomerLedgerRow item={item} currSym={currSym} />;
      case 'customer_transactions':
      case 'supplier_transactions': return <TransactionRow item={item} currSym={currSym} />;
      case 'outstanding_dues':      return <DueRow item={item} currSym={currSym} />;
      case 'customer_list':
      case 'supplier_list':         return <DirectoryRow item={item} />;
      case 'sales_report':          return <MonthSalesRow item={item} currSym={currSym} />;
      case 'purchase_report':       return <MonthSalesRow item={item} currSym={currSym} />;
      case 'cashbook':              return <TransactionRow item={item} currSym={currSym} />;
      case 'gstr1':
      case 'gstr2':                 return <GSTRow item={item} currSym={currSym} />;
      case 'gstr3b':                return <GenericAmountRow item={item} currSym={currSym} />;
      case 'sales_daywise':         return <DaywiseRow item={item} currSym={currSym} isRevenue={true} />;
      case 'purchase_daywise':      return <DaywiseRow item={item} currSym={currSym} isRevenue={false} />;
      case 'stock_summary':         return <StockRow item={item} currSym={currSym} />;
      case 'low_stock':             return <StockRow item={item} currSym={currSym} />;
      case 'profit_loss':           return <GenericAmountRow item={item} currSym={currSym} />;
      default:                      return <GenericAmountRow item={item} currSym={currSym} />;
    }
  }, [reportType, currSym]);

  const [showExportSheet, setShowExportSheet] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handlePdfExport = useCallback(async () => {
    if (rows.length === 0) { Alert.alert('No Data', 'Nothing to export for this period.'); return; }
    setShowExportSheet(false);
    setExporting(true);
    try {
      await ReportPdfService.export({
        reportType, rows, title,
        dateLabel: noDateFilter ? 'All Records' : activeDateLabel,
        profile, currSym,
      });
    } catch (e) {
      Alert.alert('PDF Export Failed', e.message || 'Could not generate PDF.');
    } finally { setExporting(false); }
  }, [rows, reportType, title, activeDateLabel, noDateFilter, profile, currSym]);

  const handlePrint = useCallback(async () => {
    if (rows.length === 0) { Alert.alert('No Data', 'Nothing to print.'); return; }
    setShowExportSheet(false);
    try {
      await ReportPdfService.print({
        reportType, rows, title,
        dateLabel: noDateFilter ? 'All Records' : activeDateLabel,
        profile, currSym,
      });
    } catch (e) {
      Alert.alert('Print Failed', e.message || 'Could not print.');
    }
  }, [rows, reportType, title, activeDateLabel, noDateFilter, profile, currSym]);

  const handleCsvExport = useCallback(async () => {
    if (rows.length === 0) { Alert.alert('No Data', 'Nothing to export.'); return; }
    setShowExportSheet(false);
    try {
      const filename = `${(title || reportType).replace(/\s+/g, '_')}_${activeDateLabel.replace(/[^a-z0-9]/gi, '_')}`;
      await CsvService.exportToCsv(filename, rows);
    } catch (e) {
      Alert.alert('CSV Export Failed', e.message || 'Could not export.');
    }
  }, [rows, title, reportType, activeDateLabel]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>

      {/* Header */}
      <View style={{
        backgroundColor: '#262A56',
        paddingHorizontal: 18,
        paddingTop: Platform.OS === 'ios' ? 10 : 38,
        paddingBottom: 16,
        flexDirection: 'row', alignItems: 'center',
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
        >
          <MaterialIcons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: -0.3 }} numberOfLines={1}>{title}</Text>
        <TouchableOpacity
          onPress={() => setShowExportSheet(true)}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: exporting ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialIcons name={exporting ? 'hourglass-top' : 'file-download'} size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Date Filter Chips */}
      {!noDateFilter && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
          style={{ maxHeight: 56, flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
        >
          {DATE_FILTERS.map(f => {
            const active = dateFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setDateFilter(f.id)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 7, borderRadius: 16,
                  backgroundColor: active ? accentColor : '#f1f5f9',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#fff' : '#64748b' }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Report List */}
      <FlatList
        data={rows}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderRow}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 80) }}
        ListHeaderComponent={
          <SummaryBanner
            rows={rows}
            reportType={reportType}
            currSym={currSym}
            activeDateLabel={noDateFilter ? 'All records' : activeDateLabel}
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <MaterialIcons name="bar-chart" size={56} color="#e2e8f0" />
            <Text style={{ color: '#94a3b8', fontWeight: '700', fontSize: 16, marginTop: 16 }}>No data for this period</Text>
            <Text style={{ color: '#cbd5e1', fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
              Try selecting a wider date range
            </Text>
          </View>
        }
        removeClippedSubviews={false}
      />

      {/* ── Export Action Sheet ── */}
      <Modal
        visible={showExportSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExportSheet(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
          activeOpacity={1}
          onPress={() => setShowExportSheet(false)}
        >
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: Math.max(insets.bottom, 24) }}>
            {/* Handle */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginTop: 12, marginBottom: 20 }} />
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', paddingHorizontal: 24, marginBottom: 6 }}>Export Report</Text>
            <Text style={{ fontSize: 12, color: '#94a3b8', paddingHorizontal: 24, marginBottom: 24 }}>{title}</Text>

            {/* PDF Export */}
            <TouchableOpacity
              onPress={handlePdfExport}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#fff1f2', marginHorizontal: 16, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: '#fecdd3' }}
            >
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: '#f43f5e', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <MaterialIcons name="picture-as-pdf" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b' }}>Export as PDF</Text>
                <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Share branded PDF via WhatsApp, Email, Drive…</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
            </TouchableOpacity>

            {/* Print */}
            <TouchableOpacity
              onPress={handlePrint}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#eff6ff', marginHorizontal: 16, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: '#bfdbfe' }}
            >
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <MaterialIcons name="print" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b' }}>Print Report</Text>
                <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Send to a printer or save as PDF via print dialog</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
            </TouchableOpacity>

            {/* CSV */}
            <TouchableOpacity
              onPress={handleCsvExport}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#f0fdf4', marginHorizontal: 16, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: '#bbf7d0' }}
            >
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <MaterialIcons name="table-chart" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b' }}>Export as CSV</Text>
                <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Open in Excel, Google Sheets, or Numbers</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              onPress={() => setShowExportSheet(false)}
              style={{ marginHorizontal: 16, marginTop: 4, paddingVertical: 14, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#64748b' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
