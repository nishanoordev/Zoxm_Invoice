import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, Alert, Share, ScrollView, TextInput } from 'react-native';
import { useStore } from '../store/useStore';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { printInvoice } from '../utils/printInvoice';
import { calculateCustomerBalances } from '../utils/balanceCalculator';
import { formatAmount } from '../utils/formatters';
import { useTranslation } from '../i18n/LanguageContext';

export default function InvoicesScreen({ navigation, route }) {
  const invoices = useStore(state => state.invoices);
  const payments = useStore(state => state.payments);
  const salesReturns = useStore(state => state.salesReturns);
  const profile = useStore(state => state.profile);
  const duplicateInvoice = useStore(state => state.duplicateInvoice);
  const deleteInvoice = useStore(state => state.deleteInvoice);
  const permanentlyDeleteInvoice = useStore(state => state.permanentlyDeleteInvoice);
  const recoverInvoice = useStore(state => state.recoverInvoice);
  const convertEstimateToInvoice = useStore(state => state.convertEstimateToInvoice);
  const cancelInvoice = useStore(state => state.cancelInvoice);


  // NOTE: invoiceBalances (calculateCustomerBalances) is kept for customer-level
  // summaries elsewhere; getInvoiceBalance now computes per-invoice balance
  // DIRECTLY from payments + salesReturns for zero-ambiguity accuracy.

  const getInvoiceBalance = (invoice) => {
    const round2 = v => Math.round(v * 100) / 100;
    // Fully returned invoice → zero balance
    if (invoice.status === 'Returned') return 0;

    const invoiceTotal = round2(parseFloat(invoice.total) || 0);
    const invoiceId = String(invoice.id);

    // ── 1. Cash / online payments (NEVER include credit_notes, give_payments,
    //        due_entries — those are accounting entries, not real money received)
    const amountPaid = round2(
      payments
        .filter(p =>
          String(p.invoiceId || p.invoice_id) === invoiceId &&
          p.type !== 'credit_note' &&
          p.type !== 'give_payment' &&
          p.type !== 'due_entry'
        )
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    );

    // ── 2. Sales-return credits: sum the gross return value for ALL returns
    //        linked to this invoice.  This is the DIRECT, single-source-of-truth
    //        approach — no credit_note chain, no field-name mismatch risk.
    const totalReturnCredit = round2(
      salesReturns
        .filter(r => String(r.invoiceId || r.invoice_id) === invoiceId)
        .reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0)
    );

    // ── 3. Net balance:  never go below 0
    //        (If returns exceed the remaining due the excess shows as wallet
    //         credit — the invoice itself just hits 0)
    return round2(Math.max(0, invoiceTotal - amountPaid - totalReturnCredit));
  };

  const [statusFilter, setStatusFilter] = useState(route?.params?.status || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState('Active'); // Active or Trash
  const [documentType, setDocumentType] = useState('invoice'); // 'invoice' or 'estimate'
  
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { t } = useTranslation();

  const filteredInvoices = useMemo(() => {
    let result = invoices;

    // Filter by document type (invoice vs estimate)
    result = result.filter(inv => (inv.type || 'invoice') === documentType);

    // Filter by Active vs Trash
    if (viewMode === 'Trash') {
      result = result.filter(inv => inv.isDeleted);
    } else {
      result = result.filter(inv => !inv.isDeleted);
    }
    
    // Apply status filter
    if (statusFilter) {
      result = result.filter(inv => inv.status?.toLowerCase() === statusFilter.toLowerCase());
    }
    
    // Apply search filter (customer name or invoice number)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(inv => {
        const nameMatch = (inv.customerName || inv.customer_name || '').toLowerCase().includes(q);
        const invNumMatch = (inv.invoiceNumber || inv.invoice_number || '').toLowerCase().includes(q);
        return nameMatch || invNumMatch;
      });
    }
    
    return result;
  }, [invoices, statusFilter, searchQuery, documentType, viewMode]);

  useEffect(() => {
    if (route?.params?.status) {
      setStatusFilter(route.params.status);
    }
  }, [route?.params?.status]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Paid':      return { text: '#15803d', bg: '#f0fdf4' }; // green
      case 'Sent':      return { text: '#1d4ed8', bg: '#eff6ff' }; // blue
      case 'Pending':   return { text: '#b45309', bg: '#fffbeb' }; // amber
      case 'Partial':   return { text: '#b45309', bg: '#fffbeb' }; // amber
      case 'Overdue':   return { text: '#b91c1c', bg: '#fef2f2' }; // red
      case 'Draft':     return { text: '#475569', bg: '#f1f5f9' }; // slate
      case 'SALE':      return { text: '#059669', bg: '#ecfdf5' }; // emerald
      case 'Returned':  return { text: '#7c3aed', bg: '#f5f3ff' }; // violet
      case 'Cancelled': return { text: '#71717a', bg: '#f4f4f5' }; // zinc
      default:          return { text: '#475569', bg: '#f1f5f9' };
    }
  };

  // Smart number format: now using global utility
  const fmtAmount = (num) => formatAmount(num);

  const isEstimate = documentType === 'estimate';

  const handleConvertToInvoice = (invoice) => {
    Alert.alert(
      'Convert to Invoice',
      `Convert estimate ${invoice.invoiceNumber || ''} to an invoice? This will deduct inventory stock.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert', style: 'default',
          onPress: async () => {
            try {
              setShowOptions(false);
              await convertEstimateToInvoice(invoice.id);
              setDocumentType('invoice');
              Alert.alert('Converted', 'Estimate has been converted to an invoice.');
            } catch (e) {
              Alert.alert('Error', 'Failed to convert: ' + e.message);
            }
          }
        }
      ]
    );
  };

  const handleCancelInvoice = (invoice) => {
    Alert.alert(
      'Cancel Invoice',
      `Are you sure you want to cancel invoice ${invoice.invoiceNumber || ''}? This will restock the items and update the invoice status to Cancelled.`,
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', style: 'destructive',
          onPress: async () => {
             try {
               setShowOptions(false);
               await cancelInvoice(invoice.id);
             } catch (e) {
               Alert.alert('Error', 'Failed to cancel invoice: ' + e.message);
             }
          }
        }
      ]
    );
  };

  // Draft → Confirm: takes the user back through SaleDetails to finalize
  const handleConfirmDraft = (invoice) => {
    setShowOptions(false);
    navigation.navigate('CreateInvoice', { invoice, mode: 'edit', documentType: invoice.type || 'invoice' });
  };

  const handleDuplicate = async (invoice) => {
    try {
      await duplicateInvoice(invoice);
      setShowOptions(false);
      Alert.alert('Success', 'Invoice duplicated successfully');
    } catch (e) {
      Alert.alert('Error', 'Failed to duplicate invoice');
    }
  };

  const handlePrint = async (invoice) => {
    try {
      await printInvoice(invoice, profile, payments);
    } catch (e) {
      Alert.alert('Print Error', 'Failed to print invoice. Please try again.');
    }
  };

  const handleShare = async (invoice) => {
    try {
      // Generate and share PDF instead of text
      await printInvoice(invoice, profile, payments);
    } catch (e) {
      Alert.alert('Error', 'Failed to generate PDF for sharing');
    }
  };

  const handleDelete = (invoice) => {
    const isTrash = viewMode === 'Trash';
    const isEstimateLocal = invoice?.type === 'estimate';
    const isPermanent = isTrash || isEstimateLocal;

    Alert.alert(
      isPermanent ? `Permanently Delete ${isEstimateLocal ? 'Estimate' : 'Invoice'}` : 'Move to Trash',
      isPermanent 
        ? `Are you sure you want to permanently delete this ${isEstimateLocal ? 'estimate' : 'invoice'}? This action cannot be undone.`
        : `Are you sure you want to move invoice ${invoice.invoiceNumber || ''} to trash?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              setShowOptions(false);
              if (isPermanent) {
                await permanentlyDeleteInvoice(invoice.id);
                Alert.alert('Deleted', `${isEstimateLocal ? 'Estimate' : 'Invoice'} has been permanently deleted.`);
              } else {
                await deleteInvoice(invoice.id);
                Alert.alert('Moved to Trash', 'Invoice has been moved to trash.');
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to delete: ' + e.message);
            }
          }
        }
      ]
    );
  };

  const handleRecover = async (invoice) => {
    try {
      setShowOptions(false);
      await recoverInvoice(invoice.id);
      Alert.alert('Recovered', 'Invoice has been recovered from trash.');
    } catch (e) {
      Alert.alert('Error', 'Failed to recover invoice: ' + e.message);
    }
  };

  const OptionItem = ({ icon, label, onPress, color = '#475569' }) => (
    <TouchableOpacity 
      onPress={onPress}
      className="flex-row items-center py-4 border-b border-slate-50 dark:border-slate-800"
    >
      <View className="w-10 items-center">
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <Text style={{ color }} className="text-base font-semibold ml-2">{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark pb-24">
      {/* Header */}
      <View className="flex-row items-center bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-100 dark:border-slate-800 pt-12">
        <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800" onPress={() => setShowMenu(true)}>
          <MaterialIcons name="menu" size={24} className="text-slate-900 dark:text-slate-100" />
        </TouchableOpacity>
        
        {isSearching ? (
          <View className="flex-1 mx-3 bg-slate-50 dark:bg-slate-800 rounded-full flex-row items-center px-4 h-10">
            <TextInput
              autoFocus
              className="flex-1 text-slate-900 dark:text-slate-100 text-sm"
              placeholder="Search name or number..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} className="ml-2">
                <MaterialIcons name="close" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text className="flex-1 text-center text-lg font-black text-primary dark:text-slate-100">
            {viewMode === 'Trash' ? t('trashBin') : (isEstimate ? 'Estimates' : t('invoices'))}
          </Text>
        )}

        <TouchableOpacity 
          className="w-10 h-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800"
          onPress={() => {
            setIsSearching(!isSearching);
            if (isSearching) setSearchQuery('');
          }}
        >
          <MaterialIcons name={isSearching ? "close" : "search"} size={24} className="text-slate-900 dark:text-slate-100" />
        </TouchableOpacity>
      </View>

      {/* Invoice / Estimate Segmented Toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, marginBottom: 4, backgroundColor: '#f1f5f9', borderRadius: 16, padding: 4 }}>
        <TouchableOpacity
          onPress={() => { setDocumentType('invoice'); setStatusFilter(null); }}
          style={{
            flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
            backgroundColor: documentType === 'invoice' ? '#fff' : 'transparent',
            ...(documentType === 'invoice' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 } : {})
          }}
        >
          <Text style={{
            fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1,
            color: documentType === 'invoice' ? '#262A56' : '#94a3b8'
          }}>
            {t('invoices')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setDocumentType('estimate'); setStatusFilter(null); }}
          style={{
            flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
            backgroundColor: documentType === 'estimate' ? '#fff' : 'transparent',
            ...(documentType === 'estimate' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 } : {})
          }}
        >
          <Text style={{
            fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1,
            color: documentType === 'estimate' ? '#262A56' : '#94a3b8'
          }}>
            Estimates
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Badge */}
      {statusFilter && (
        <View className="flex-row items-center justify-between px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30">
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-indigo-500" />
            <Text className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
              {t('filteredBy')}: {statusFilter}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => setStatusFilter(null)}
            className="px-3 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm"
          >
            <Text className="text-xs font-bold text-slate-600 dark:text-slate-400">{t('clear')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* View toggled via hamburger menu */}

      <FlatList 
        data={filteredInvoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        renderItem={({ item }) => {
            const customerName = item.customerName || item.customer_name || 'Unknown';
            const invoiceNumber = item.invoiceNumber || item.invoice_number || '';
            const date = item.date || '';
            
            const total = parseFloat(item.total || 0); // original invoice total
            const balanceDue = getInvoiceBalance(item);

            // ── Return credit for this invoice (used in badge + status) ──
            const returnedTotal = salesReturns
              .filter(r => String(r.invoiceId || r.invoice_id) === String(item.id))
              .reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);

            // Amount paid = total - returned - balanceDue  (derived, no double-count)
            const amountPaid = Math.max(0, total - returnedTotal - balanceDue);

            let displayStatus = item.status;
            const isCancelled = displayStatus === 'Cancelled';
            const invoiceReturnStatus = item.return_status || 'NONE';
            const hasReturn = invoiceReturnStatus !== 'NONE';

            // FULL return → always show 'Returned'
            if (invoiceReturnStatus === 'FULL' && displayStatus !== 'Draft' && displayStatus !== 'Cancelled') {
              displayStatus = 'Returned';
            } else if (displayStatus !== 'Draft' && displayStatus !== 'Cancelled') {
              if (hasReturn && balanceDue <= 0) {
                displayStatus = 'Returned';
              } else if (balanceDue <= 0 || displayStatus === 'Paid') {
                displayStatus = 'SALE';
              }
            }

            const statusStyle = getStatusColor(displayStatus);
            const sym = profile.currency_symbol || '₹';
            
            return (
              <View style={{ opacity: isCancelled ? 0.85 : 1 }}>
              {/* Cancelled Banner */}
              {isCancelled && (
                <View style={{
                  backgroundColor: '#ef4444',
                  borderTopLeftRadius: 20, borderTopRightRadius: 20,
                  paddingVertical: 5, paddingHorizontal: 14,
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  marginBottom: -6,
                }}>
                  <MaterialIcons name="cancel" size={12} color="white" />
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' }}>Invoice Cancelled</Text>
                </View>
              )}
              <View style={{
                backgroundColor: 'white',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: isCancelled ? '#fca5a5' : '#f1f5f9',
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
                overflow: 'hidden',
                ...(isCancelled ? { borderTopLeftRadius: 0, borderTopRightRadius: 0 } : {}),
              }}>

                {/* ── Clickable header ── */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('InvoiceDetail', { invoice: item })}
                  style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 }}
                >
                  {/* Row 1: Customer name + Invoice number */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a', flex: 1, marginRight: 8, letterSpacing: -0.3 }} numberOfLines={1}>
                      {customerName}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8' }}>
                      #{invoiceNumber.split('-').pop()}
                    </Text>
                  </View>

                  {/* Row 2: Status badges + Date */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}>
                        <Text style={{ color: statusStyle.text, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {displayStatus ? displayStatus.toUpperCase() : ''}
                        </Text>
                      </View>
                      {invoiceReturnStatus === 'PARTIAL' && displayStatus !== 'Returned' && (
                        <View style={{ backgroundColor: '#f5f3ff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99, gap: 3 }}>
                          <MaterialIcons name="assignment-return" size={9} color="#7c3aed" />
                          <Text style={{ color: '#7c3aed', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 }}>Partial Return</Text>
                        </View>
                      )}
                      {invoiceReturnStatus === 'FULL' && displayStatus !== 'Returned' && (
                        <View style={{ backgroundColor: '#f5f3ff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99, gap: 3 }}>
                          <MaterialIcons name="assignment-returned" size={9} color="#7c3aed" />
                          <Text style={{ color: '#7c3aed', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 }}>Full Return</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#94a3b8' }}>{date}</Text>
                  </View>
                </TouchableOpacity>

                {/* ── Financial breakdown ── */}
                {!isEstimate && returnedTotal > 0 ? (
                  /* FINTECH LIST when a return exists */
                  <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('InvoiceDetail', { invoice: item })}>
                    <View style={{ marginHorizontal: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 7, paddingBottom: 2, gap: 5 }}>
                      {/* Invoice Total */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '600' }}>Invoice Total</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>{sym}{fmtAmount(total)}</Text>
                      </View>
                      {/* (−) Returned */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <View style={{ width: 15, height: 15, borderRadius: 8, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 10, color: '#dc2626', fontWeight: '900', lineHeight: 13 }}>−</Text>
                          </View>
                          <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>Returned</Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#dc2626' }}>{sym}{fmtAmount(returnedTotal)}</Text>
                      </View>
                      {/* (−) Paid */}
                      {amountPaid > 0 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <View style={{ width: 15, height: 15, borderRadius: 8, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: 10, color: '#16a34a', fontWeight: '900', lineHeight: 13 }}>−</Text>
                            </View>
                            <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>Paid</Text>
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#16a34a' }}>{sym}{fmtAmount(amountPaid)}</Text>
                        </View>
                      )}
                    </View>

                    {/* NET DUE highlighted row */}
                    <View style={{
                      marginTop: 5,
                      backgroundColor: balanceDue <= 0 ? '#f0fdf4' : '#fff1f2',
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTopWidth: 1,
                      borderTopColor: balanceDue <= 0 ? '#bbf7d0' : '#fecdd3',
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '900', color: balanceDue <= 0 ? '#15803d' : '#991b1b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        Net Due
                      </Text>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: balanceDue <= 0 ? '#16a34a' : '#dc2626', letterSpacing: -0.3 }}>
                        {sym}{fmtAmount(balanceDue)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  /* NORMAL layout: compact total + balance */
                  <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('InvoiceDetail', { invoice: item })}>
                    <View style={{ marginHorizontal: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8, paddingBottom: 4 }}>
                      <View style={{ flexDirection: 'row', gap: 24 }}>
                        <View>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 2 }}>{t('total')}</Text>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a' }}>{sym}{fmtAmount(total)}</Text>
                        </View>
                        {!isEstimate && (
                          <View>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 2 }}>{t('invoiceBalance')}</Text>
                            <Text style={{ fontSize: 16, fontWeight: '900', color: balanceDue <= 0 ? '#16a34a' : '#ef4444' }}>{sym}{fmtAmount(balanceDue)}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                )}

                {/* ── Action icon bar ── */}
                <View style={{
                  flexDirection: 'row', justifyContent: 'flex-end',
                  paddingHorizontal: 14, paddingVertical: 8,
                  borderTopWidth: 1, borderTopColor: '#f1f5f9',
                  gap: 18,
                }}>
                  <TouchableOpacity onPress={() => handlePrint(item)} style={{ padding: 4 }}>
                    <MaterialCommunityIcons name="printer-outline" size={22} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleShare(item)} style={{ padding: 4 }}>
                    <MaterialCommunityIcons name="share-variant-outline" size={22} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setSelectedInvoice(item); setShowOptions(true); }} style={{ padding: 4 }}>
                    <MaterialCommunityIcons name="dots-vertical" size={22} color="#64748b" />
                  </TouchableOpacity>
                </View>

              </View>
              </View>
            );
          }}
        ListEmptyComponent={<Text className="text-center text-slate-500 mt-10">{isEstimate ? 'No estimates yet' : t('noInvoices')}</Text>}
      />

      {/* Main Menu Modal */}
      <Modal visible={showMenu} animationType="fade" transparent={true} onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View className="absolute top-24 left-4 bg-white dark:bg-slate-900 rounded-2xl w-56 shadow-xl overflow-hidden p-2">
            <TouchableOpacity 
              className={`p-3 rounded-xl flex-row items-center mb-1 ${viewMode === 'Active' ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}
              onPress={() => { setViewMode('Active'); setShowMenu(false); }}
            >
              <MaterialIcons name="list" size={22} color={viewMode === 'Active' ? '#4f46e5' : '#64748b'} />
              <Text className={`ml-3 font-black text-base ${viewMode === 'Active' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{t('activeInvoices')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className={`p-3 rounded-xl flex-row items-center ${viewMode === 'Trash' ? 'bg-red-50 dark:bg-red-900/30' : ''}`}
              onPress={() => { setViewMode('Trash'); setShowMenu(false); }}
            >
              <MaterialIcons name="delete-outline" size={22} color={viewMode === 'Trash' ? '#ef4444' : '#64748b'} />
              <Text className={`ml-3 font-black text-base ${viewMode === 'Trash' ? 'text-red-500 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>{t('trashBin')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* More Options Modal */}
      <Modal visible={showOptions} animationType="slide" transparent={true} onRequestClose={() => setShowOptions(false)}>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white dark:bg-slate-900 rounded-t-[40px] p-8 pb-12 shadow-2xl">
            {/* Handle */}
            <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full self-center mb-8" />
            
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black text-primary dark:text-white">{t('moreOptions')}</Text>
              <TouchableOpacity onPress={() => setShowOptions(false)} className="w-10 h-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <MaterialIcons name="close" size={24} className="text-slate-600" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {viewMode === 'Active' ? (() => {
                const isFullyReturned = selectedInvoice?.return_status === 'FULL';
                const isPartiallyReturned = selectedInvoice?.return_status === 'PARTIAL';
                const hasAnyReturn = isFullyReturned || isPartiallyReturned;
                const isFullyPaid = selectedInvoice &&
                  !isFullyReturned && selectedInvoice?.status !== 'Cancelled' &&
                  getInvoiceBalance(selectedInvoice) <= 0;
                const isLocked = isFullyReturned || selectedInvoice?.status === 'Cancelled' || isFullyPaid;
                const isDraft = selectedInvoice?.status === 'Draft';

                return (
                  <>
                    {/* ── DRAFT BANNER + CONFIRM CTA ───────────────────────── */}
                    {isDraft && (
                      <View style={{
                        backgroundColor: '#fffbeb', borderRadius: 16, padding: 14,
                        marginBottom: 12, borderWidth: 1.5, borderColor: '#fde68a',
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <MaterialIcons name="edit-note" size={22} color="#d97706" />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#92400e' }}>Draft Invoice</Text>
                            <Text style={{ fontSize: 10, color: '#b45309', marginTop: 2 }}>
                              Not yet confirmed. Inventory not deducted. No payment recorded.
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleConfirmDraft(selectedInvoice)}
                          style={{
                            backgroundColor: '#16a34a', borderRadius: 12,
                            paddingVertical: 12, alignItems: 'center',
                            flexDirection: 'row', justifyContent: 'center', gap: 8,
                          }}
                        >
                          <MaterialIcons name="check-circle" size={18} color="#fff" />
                          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            Confirm Invoice
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Fully Returned banner */}
                    {isFullyReturned && (
                      <View style={{
                        backgroundColor: '#f5f3ff', borderRadius: 16, padding: 14,
                        marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
                        borderWidth: 1.5, borderColor: '#ddd6fe',
                      }}>
                        <MaterialIcons name="assignment-returned" size={24} color="#7c3aed" />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '900', color: '#7c3aed' }}>Invoice Fully Returned</Text>
                          <Text style={{ fontSize: 10, color: '#8b5cf6', marginTop: 2 }}>
                            This invoice has been fully returned. It is read-only.
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Partially Returned banner */}
                    {isPartiallyReturned && (
                      <View style={{
                        backgroundColor: '#fff1f2', borderRadius: 16, padding: 14,
                        marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
                        borderWidth: 1.5, borderColor: '#fecdd3',
                      }}>
                        <MaterialIcons name="assignment-return" size={24} color="#dc2626" />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '900', color: '#dc2626' }}>Return Already Processed</Text>
                          <Text style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>
                            A return has been recorded for this invoice. No further returns allowed.
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Fully Paid banner */}
                    {isFullyPaid && (
                      <View style={{
                        backgroundColor: '#f0fdf4', borderRadius: 16, padding: 14,
                        marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
                        borderWidth: 1.5, borderColor: '#bbf7d0',
                      }}>
                        <MaterialIcons name="check-circle" size={24} color="#16a34a" />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '900', color: '#16a34a' }}>Due Fully Paid — Locked</Text>
                          <Text style={{ fontSize: 10, color: '#22c55e', marginTop: 2 }}>
                            All dues have been cleared. This invoice is now read-only for audit integrity.
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Edit — only if NOT locked */}
                    {!isLocked && (
                      <OptionItem 
                        icon="pencil-outline" 
                        label={isEstimate ? 'Edit Estimate' : t('editInvoice')} 
                        onPress={() => { setShowOptions(false); navigation.navigate('CreateInvoice', { invoice: selectedInvoice, mode: 'edit', documentType }); }} 
                      />
                    )}
                    {isEstimate && (
                      <OptionItem 
                        icon="swap-horizontal-circle" 
                        label="Convert to Invoice" 
                        color="#3b82f6"
                        onPress={() => handleConvertToInvoice(selectedInvoice)} 
                      />
                    )}

                    {/* Receive Payment — blocked for Draft (uncommitted), locked, fully paid */}
                    {!isEstimate && !isLocked && !isFullyPaid && !isDraft && (
                      <OptionItem 
                        icon="cash-plus" 
                        label="Receive Payment" 
                        color="#10b981"
                        onPress={() => { setShowOptions(false); navigation.navigate('RecordPayment', { invoice: selectedInvoice }); }} 
                      />
                    )}

                    {/* Return — blocked for Draft (not yet confirmed), any return already done */}
                    {!isEstimate && !hasAnyReturn && !isDraft && (
                      <OptionItem 
                        icon="keyboard-return" 
                        label={t('returnLabel')} 
                        color="#7c3aed"
                        onPress={() => { setShowOptions(false); navigation.navigate('SalesReturn', { invoice: selectedInvoice }); }} 
                      />
                    )}

                    {!isEstimate && !isLocked && (
                      <OptionItem 
                        icon="truck-delivery-outline" 
                        label={t('deliveryChallan')} 
                        onPress={() => { setShowOptions(false); navigation.navigate('Challans', { invoice: selectedInvoice }); }} 
                      />
                    )}
                    <OptionItem 
                      icon="file-pdf-box" 
                      label={t('shareAsPdf')} 
                      onPress={() => { setShowOptions(false); handlePrint(selectedInvoice); }} 
                    />
                    {!isEstimate && !isLocked && (
                      <OptionItem 
                        icon="cancel" 
                        label="Cancel Invoice" 
                        color="#ef4444"
                        onPress={() => handleCancelInvoice(selectedInvoice)} 
                      />
                    )}
                    {!isFullyReturned && (
                      <OptionItem 
                        icon="delete-outline" 
                        label={t('moveToTrash')} 
                        color="#ef4444"
                        onPress={() => handleDelete(selectedInvoice)} 
                      />
                    )}
                  </>
                );
              })() : (
                <>
                  <OptionItem 
                    icon="backup-restore" 
                    label={t('recoverInvoice')} 
                    color="#10b981"
                    onPress={() => handleRecover(selectedInvoice)} 
                  />
                  <OptionItem 
                    icon="delete-forever" 
                    label="Delete Permanently" 
                    color="#ef4444"
                    onPress={() => handleDelete(selectedInvoice)} 
                  />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <TouchableOpacity 
        onPress={() => navigation.navigate('CreateInvoice', { documentType })}
        className="absolute bottom-6 right-6 w-16 h-16 bg-primary rounded-full items-center justify-center shadow-xl shadow-primary/40 z-50"
      >
        <MaterialIcons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}
