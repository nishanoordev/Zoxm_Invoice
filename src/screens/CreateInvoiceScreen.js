import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Platform, Modal, FlatList, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { getInvoiceItems } from '../database/services';
import { registerScanCallback } from './ScannerScreen';
import { calculateCustomerBalances } from '../utils/balanceCalculator';
import { calcInvoiceGst, isInterState, validateGstin } from '../utils/gstCalculator';

export default function CreateInvoiceScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { customerId: paramsCustomerId, invoice: editInvoice, mode, documentType: paramDocType } = route.params || {};
  const isEditMode = mode === 'edit';
  const documentType = paramDocType || editInvoice?.type || 'invoice';
  const isEstimate = documentType === 'estimate';

  const customers = useStore(state => state.customers);
  const profile = useStore(state => state.profile);
  const inventoryItems = useStore(state => state.items);
  const addInvoice = useStore(state => state.addInvoice);
  const updateInvoice = useStore(state => state.updateInvoice);
  const addCustomer = useStore(state => state.addCustomer);
  const updateCustomer = useStore(state => state.updateCustomer);
  const addPayment = useStore(state => state.addPayment);
  const invoices = useStore(state => state.invoices);
  const payments = useStore(state => state.payments);

  const [selectedCustomerId, setSelectedCustomerId] = useState(paramsCustomerId || editInvoice?.customerId || editInvoice?.customer_id || null);
  const [status, setStatus] = useState(editInvoice?.status || 'Draft');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [quickPhoneNumber, setQuickPhoneNumber] = useState('');

  // New State for Searchable Selector
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [paymentMode, setPaymentMode] = useState('Cash'); // preserved for SaleDetails but hidden from UI

  // Line Items State
  const [lineItems, setLineItems] = useState([
    { id: Date.now().toString(), name: '', description: '', rate: '', qty: '1', rateType: 'Retail', mrpDiscount: '', total: 0 }
  ]);
  const [taxRate, setTaxRate] = useState(editInvoice?.tax_percent?.toString() || editInvoice?.taxPercent?.toString() || '0');
  // GST mode state
  const [taxMode, setTaxMode] = useState(editInvoice?.taxMode || editInvoice?.tax_mode || 'exclusive'); // 'exclusive' | 'inclusive'
  const [discountRate, setDiscountRate] = useState(editInvoice?.discountPercent?.toString() || editInvoice?.discount_percent?.toString() || '');
  const [appliedCredit, setAppliedCredit] = useState(0);
  const [showItemPicker, setShowItemPicker] = useState(false);

  useEffect(() => {
    if (route.params?.reset) {
      resetForm();
      // Clear params to avoid repeating reset
      navigation.setParams({ reset: undefined });
    }
    if (isEditMode && editInvoice) {
      loadEditItems();
    }
  }, [isEditMode, editInvoice, route.params?.reset]);

  const loadEditItems = async () => {
    try {
      console.log('Loading items for invoice:', editInvoice?.id);
      const items = await getInvoiceItems(editInvoice.id);
      if (items && items.length > 0) {
        setLineItems(items.map(item => {
          // Look up current inventory item to get Retail/Wholesale prices
          const invItem = inventoryItems.find(i => i.id === (item.item_id || item.itemId));

          return {
            id: item.id || Date.now().toString() + Math.random(),
            name: item.name,
            description: item.description || '',
            rate: item.rate?.toString() || '0',
            qty: (item.quantity || item.qty || 1).toString(),
            rateType: item.rate_type || item.rateType || 'Retail',
            mrpDiscount: (item.mrp_discount || item.mrpDiscount || 0).toString(),
            total: item.total || 0,
            inventoryId: item.item_id || item.itemId,
            // Fallback to item values or invItem values or 0
            retailPrice: invItem?.retailPrice || item.retail_price || item.retailPrice || 0,
            wholesalePrice: invItem?.wholesalePrice || item.wholesale_price || item.wholesalePrice || 0,
            mrp: invItem?.mrp || item.mrp || 0,
            hsn_code: item.hsn_code || item.hsnCode || ''
          };
        }));
      }
    } catch (e) {
      console.error('Error loading items for edit:', e);
    }
  };

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    const found = customers.find(c => String(c.id) === String(selectedCustomerId));
    if (found) return found;

    // Fallback if editing and we have the name stored on the invoice
    if (isEditMode && editInvoice?.customerName) {
      return { id: selectedCustomerId, name: editInvoice.customerName };
    }
    return null;
  }, [customers, selectedCustomerId, isEditMode, editInvoice]);

  // Total available credit = advance payments + wallet credit from returns
  const customerWallets = useStore(s => s.customerWallets);
  const availableCredit = useMemo(() => {
    if (!selectedCustomerId) return 0;
    const { creditBalance } = calculateCustomerBalances(selectedCustomerId, invoices, payments);
    const walletBal = customerWallets[selectedCustomerId] || 0;
    return Math.round((creditBalance + walletBal) * 100) / 100;
  }, [selectedCustomerId, invoices, payments, customerWallets]);

  // Sync search query on mount or when selection changes from outside (like edit mode)
  useEffect(() => {
    if (selectedCustomer && !showCustomerDropdown) {
      setCustomerSearchQuery(selectedCustomer.name);
    }
  }, [selectedCustomer, showCustomerDropdown]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(customerSearchQuery))
    );
  }, [customers, customerSearchQuery]);

  // ── GST-aware Totals Calculation ──────────────────────────────────────────
  const totals = useMemo(() => {
    const sellerState = profile?.state || '';
    const buyerState = selectedCustomer?.state || '';
    const interState = isInterState(sellerState, buyerState);

    // Pass fallbackRate (global taxRate) for items that have no tax_percent set
    const gst = calcInvoiceGst(
      lineItems,
      parseFloat(discountRate) || 0,
      taxMode,
      interState,
      parseFloat(taxRate) || 0  // fallback global GST rate
    );

    const totalToPay = Math.max(0, gst.grandTotal - appliedCredit);

    return {
      // Backward-compat aliases
      grossSubtotal: gst.grossSubtotal,
      netSubtotal: gst.subtotal,
      itemDiscountTotal: gst.itemDiscountTotal,
      taxAmount: gst.totalTax,
      globalDiscountAmount: gst.globalDiscountAmount,
      grandTotal: gst.grandTotal,
      totalToPay,
      // New GST fields
      taxableAmount: gst.taxableAmount,
      totalCgst: gst.totalCgst,
      totalSgst: gst.totalSgst,
      totalIgst: gst.totalIgst,
      isInterState: gst.isInterState,
      itemGstDetails: gst.itemGstDetails,
    };
  }, [lineItems, taxRate, taxMode, discountRate, appliedCredit, profile, selectedCustomer]);

  const updateLineItem = (id, field, value) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        let newItem = { ...item, [field]: value };

        // Auto-update rate if rateType changes — works for any item with price fields stored
        if (field === 'rateType') {
          const retail = parseFloat(item.retailPrice);
          const wholesale = parseFloat(item.wholesalePrice);
          const mrp = parseFloat(item.mrp);

          const priceMap = {
            'Retail': !isNaN(retail) ? retail : 0,
            'Wholesale': !isNaN(wholesale) ? wholesale : 0,
            'ON MRP': !isNaN(mrp) ? mrp : 0,
          };
          const newPrice = priceMap[value];
          // Only update if we found a valid price > 0
          if (newPrice > 0) {
            newItem.rate = newPrice.toString();
          }
        }

        // Max Discount Validation (Item + Global)
        if (field === 'mrpDiscount' && newItem.maxDiscount > 0) {
          const currentGlobalDisc = parseFloat(discountRate) || 0;
          const maxItemDiscAllowed = Math.max(0, newItem.maxDiscount - currentGlobalDisc);
          if ((parseFloat(value) || 0) > maxItemDiscAllowed) {
            Alert.alert('Discount Exceeded', `Total discount (Item + Global ${currentGlobalDisc}%) cannot exceed maximum ${newItem.maxDiscount}% for this item.`);
            newItem.mrpDiscount = maxItemDiscAllowed.toString();
          }
        }

        // Recalculate total for this item
        const rate = parseFloat(newItem.rate) || 0;
        const qty = parseFloat(newItem.qty) || 0;
        const discount = parseFloat(newItem.mrpDiscount) || 0;

        const discountedRate = rate * (1 - discount / 100);
        newItem.total = discountedRate * qty;

        return newItem;
      }
      return item;
    }));
  };

  const addManualItem = () => {
    setLineItems(prev => [
      ...prev,
      { id: Date.now().toString(), name: '', description: '', rate: '', qty: '1', rateType: 'Retail', mrpDiscount: '', total: 0, retailPrice: 0, wholesalePrice: 0, mrp: 0 }
    ]);
  };

  const addItemFromInventory = (inventoryItem) => {
    const availableStock = parseFloat(inventoryItem.stock) || 0;
    if (availableStock <= 0) {
      Alert.alert('Out of Stock', 'This item is currently out of stock.');
      return;
    }

    setLineItems(prev => {
      // Check if this inventory item already exists — if so, just bump qty
      const existingIdx = prev.findIndex(
        li => li.inventoryId && li.inventoryId === inventoryItem.id
      );

      if (existingIdx !== -1) {
        const currentQty = parseFloat(prev[existingIdx].qty) || 0;
        if (currentQty + 1 > availableStock) {
          setTimeout(() => Alert.alert('Stock Limit', `Only ${availableStock} items available in stock.`), 0);
          return prev;
        }

        return prev.map((li, idx) => {
          if (idx !== existingIdx) return li;
          const newQty = currentQty + 1;
          const rate = parseFloat(li.rate) || 0;
          const discount = parseFloat(li.mrpDiscount) || 0;
          const discountedRate = rate * (1 - discount / 100);
          return { ...li, qty: newQty.toString(), total: discountedRate * newQty };
        });
      }

      // New item — add to top of list, removing any empty placeholder
      const retailPrice = parseFloat(inventoryItem.retail_price || inventoryItem.retailPrice || inventoryItem.price || 0);
      const wholesalePrice = parseFloat(inventoryItem.wholesale_price || inventoryItem.wholesalePrice || 0);
      const mrpPrice = parseFloat(inventoryItem.mrp || 0);
      const defaultRate = retailPrice || mrpPrice || 0;

      // Remove any trailing empty-placeholder item so we don't end up with a ghost card
      const withoutEmpty = prev.filter(li => li.name.trim() !== '' || li.inventoryId);

      return [
        {
          id: Date.now().toString(),
          name: inventoryItem.name,
          description: inventoryItem.description || inventoryItem.category || '',
          rate: defaultRate.toString(),
          qty: '1',
          rateType: 'Retail',
          mrpDiscount: '',
          total: defaultRate,
          inventoryId: inventoryItem.id,
          hsn_code: inventoryItem.hsnCode || inventoryItem.hsn_code || '',
          unit: inventoryItem.unit || 'pcs',
          tax_percent: parseFloat(inventoryItem.taxPercent || inventoryItem.tax_percent || 0),
          retailPrice,
          wholesalePrice,
          mrp: mrpPrice,
          maxDiscount: parseFloat(inventoryItem.maxDiscount || inventoryItem.max_discount || 0),
        },
        ...withoutEmpty,
      ];
    });

    // Auto-apply tax rate if the item has one
    const itemTax = parseFloat(inventoryItem.taxPercent || inventoryItem.tax_percent || 0);
    if (itemTax > 0) {
      setTimeout(() => setTaxRate(itemTax.toString()), 0);
    }

    setShowItemPicker(false);
  };

  const removeItem = (id) => {
    if (lineItems.length === 1) {
      setLineItems([{ id: Date.now().toString(), name: '', description: '', rate: '', qty: '1', rateType: 'Retail', mrpDiscount: '', total: 0 }]);
    } else {
      setLineItems(prev => prev.filter(item => item.id !== id));
    }
  };
  const resetForm = () => {
    setSelectedCustomerId(null);
    setCustomerSearchQuery('');
    setQuickPhoneNumber('');
    setLineItems([{ id: Date.now().toString(), name: '', description: '', rate: '', qty: '1', rateType: 'Retail', mrpDiscount: '', total: 0, retailPrice: 0, wholesalePrice: 0, mrp: 0 }]);
    setTaxRate('0');
    setTaxMode('exclusive');
    setDiscountRate('');
    setStatus('Draft');
  };

  const handleContinue = async () => {
    let resolvedCustomerId = selectedCustomerId;
    let resolvedCustomer = selectedCustomer;

    // Auto-create customer if name typed but no existing customer selected
    if (!resolvedCustomerId && customerSearchQuery.trim()) {
      try {
        const saved = await addCustomer({
          name: customerSearchQuery.trim().toUpperCase(),
          phone: quickPhoneNumber.trim(),
          email: '',
          address: '',
          balance: 0,
        });
        resolvedCustomerId = saved.id;
        resolvedCustomer = saved;
        setSelectedCustomerId(saved.id);
      } catch (e) {
        Alert.alert('Error', 'Could not create customer. Please try again.');
        return;
      }
    }

    // Validate phone for INR using the locally edited phone
    const phoneToCheck = quickPhoneNumber.trim();
    if (profile.currency_code === 'INR' && phoneToCheck && phoneToCheck.replace(/[^0-9]/g, '').length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
      return;
    }

    // Auto-update the existing customer's DB record if they edited the phone number
    if (resolvedCustomerId && resolvedCustomer && phoneToCheck !== (resolvedCustomer.phone || '')) {
      try {
        await updateCustomer({ ...resolvedCustomer, phone: phoneToCheck });
        resolvedCustomer.phone = phoneToCheck; // update local ref
      } catch (e) {
        console.error('Failed to auto-update customer phone:', e);
      }
    }

    if (!resolvedCustomerId) {
      Alert.alert('Error', 'Please enter a customer name or select one');
      return;
    }
    const validItems = lineItems.filter(item => item.name.trim() !== '');

    if (validItems.length === 0) {
      Alert.alert('Error', 'Please enter at least one item name');
      return;
    }

    const missingRates = validItems.filter(item => !item.rate || parseFloat(item.rate) <= 0);
    if (missingRates.length > 0) {
      Alert.alert('Incomplete Items', 'Some items have no rate. Please enter a rate for all items with a name.');
      return;
    }

    // Generate invoice number
    const invoiceNumber = isEditMode
      ? (editInvoice.invoiceNumber || editInvoice.invoice_number)
      : (isEstimate
        ? `#EST-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
        : `#INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`);
    const today = new Date().toISOString().split('T')[0];

    try {
      // Build per-item GST details map for enriching items
      const detailsMap = {};
      (totals.itemGstDetails || []).forEach((d, i) => { detailsMap[i] = d; });

      const invoiceData = {
        id: isEditMode ? editInvoice.id : undefined,
        invoiceNumber,
        customerId: resolvedCustomerId,
        customerName: resolvedCustomer?.name || customerSearchQuery.trim(),
        customerPhone: phoneToCheck,
        customer_address: selectedCustomer?.address || '',
        customer_phone: phoneToCheck,
        customer_email: selectedCustomer?.email || '',
        customer_state: selectedCustomer?.state || '',
        date: isEditMode ? (editInvoice.date || today) : today,
        dueDate: isEditMode ? (editInvoice.dueDate || editInvoice.due_date || today) : today,
        status,
        subtotal: totals.netSubtotal,
        taxPercent: parseFloat(taxRate) || 0,
        taxAmount: totals.taxAmount,
        discountPercent: parseFloat(discountRate) || 0,
        discountAmount: totals.globalDiscountAmount,
        total: totals.grandTotal,
        paymentMode: paymentMode,
        notes: isEditMode ? (editInvoice.notes || '') : '',
        customer_gstin: selectedCustomer?.gstin || '',
        // ── GST summary fields ──
        taxMode,
        cgstAmount: totals.totalCgst,
        sgstAmount: totals.totalSgst,
        igstAmount: totals.totalIgst,
        isInterState: totals.isInterState,
        items: validItems.map((item, idx) => ({
          item_id: item.inventoryId || '',
          name: item.name,
          description: item.description || '',
          quantity: parseFloat(item.qty) || 1,
          rate: parseFloat(item.rate) || 0,
          total: parseFloat(item.total) || 0,
          rate_type: item.rateType,
          mrp_discount: parseFloat(item.mrpDiscount) || 0,
          hsn_code: item.hsn_code || '',
          unit: item.unit || 'pcs',
          tax_percent: parseFloat(item.tax_percent) > 0
            ? parseFloat(item.tax_percent)
            : parseFloat(taxRate) || 0,
          // Per-item GST amounts from calculator
          cgst_amount: detailsMap[idx]?.cgstAmt || 0,
          sgst_amount: detailsMap[idx]?.sgstAmt || 0,
          igst_amount: detailsMap[idx]?.igstAmt || 0,
          retailPrice: parseFloat(item.retailPrice) || 0,
          wholesalePrice: parseFloat(item.wholesalePrice) || 0,
          mrp: parseFloat(item.mrp) || 0,
        })),
        appliedCredit: parseFloat(appliedCredit) || 0,
      };

      navigation.navigate('SaleDetails', { invoiceData, isEditMode, documentType });
    } catch (e) {
      console.error('Continue error:', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };


  const handleQuickAddCustomer = async () => {
    if (!newCustomerName.trim()) {
      Alert.alert('Error', 'Customer name is required');
      return;
    }
    try {
      const saved = await addCustomer({
        name: newCustomerName.trim().toUpperCase(),
        phone: newCustomerPhone,
        email: '',
        address: '',
        balance: 0
      });
      setSelectedCustomerId(saved.id);
      setShowQuickAddCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } catch (e) {
      Alert.alert('Error', 'Failed to add customer');
    }
  };

  const [showItemOptions, setShowItemOptions] = useState(false);
  const [showBottomItemOptions, setShowBottomItemOptions] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      {/* Header */}
      <View style={{ paddingTop: Platform.OS === 'android' ? 40 : 10 }} className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center justify-between p-4">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800">
              <MaterialIcons name="arrow-back" size={24} className="text-slate-900 dark:text-slate-100" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">{isEstimate ? 'Estimate' : 'Sale'}</Text>
          </View>

          <TouchableOpacity className="w-10 h-10 items-center justify-center">
            <View className="relative">
              <MaterialIcons name="settings" size={24} className="text-slate-600 dark:text-slate-400" />
              <View className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full" />
            </View>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center p-4 pt-0 gap-4">
          <View className="flex-1 border-r border-slate-100 dark:border-slate-800 pr-4">
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{isEstimate ? 'Estimate No.' : 'Invoice No.'}</Text>
            <TouchableOpacity className="flex-row items-center gap-1">
              <Text className="text-base font-bold text-slate-900 dark:text-white">{isEditMode ? (editInvoice.invoiceNumber || editInvoice.invoice_number) : 'Auto'}</Text>
              <MaterialIcons name="keyboard-arrow-down" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <View className="flex-1">
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Date</Text>
            <TouchableOpacity className="flex-row items-center gap-1">
              <Text className="text-base font-bold text-slate-900 dark:text-white">{new Date().toLocaleDateString('en-IN')}</Text>
              <MaterialIcons name="keyboard-arrow-down" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 py-6"
        contentContainerStyle={{ paddingBottom: 150 }}
        keyboardShouldPersistTaps="handled"
      >

        {/* Customer Section - Name + Phone always visible */}
        <View className="mb-4">
          {/* Customer Name Input */}
          <View className={`rounded-xl border-2 bg-white dark:bg-slate-900 p-1 px-3 mb-3 relative ${showCustomerDropdown || selectedCustomerId ? 'border-primary' : 'border-slate-200 dark:border-slate-800'}`}>
            <Text className={`absolute -top-2.5 left-3 bg-white dark:bg-slate-900 px-1 text-[11px] font-bold ${showCustomerDropdown || selectedCustomerId ? 'text-primary' : 'text-slate-400'}`}>
              Customer *
            </Text>
            <TextInput
              testID="input-customer-name"
              value={customerSearchQuery}
              onChangeText={(text) => {
                const upper = text.toUpperCase();
                setCustomerSearchQuery(upper);
                setShowCustomerDropdown(true);
                // Carry over the existing customer's phone so user can correct it
                if (selectedCustomerId && selectedCustomer?.phone) {
                  setQuickPhoneNumber(selectedCustomer.phone);
                }
                setSelectedCustomerId(null);
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              placeholder="Type customer name..."
              placeholderTextColor="#94a3b8"
              className="text-base font-bold text-slate-900 dark:text-white h-12 uppercase"
              selectTextOnFocus={true}
              autoCapitalize="characters"
            />
          </View>





          {/* Phone Number Input — always visible */}
          <View className={`rounded-xl border-2 bg-white dark:bg-slate-900 p-1 px-3 mb-3 relative ${!selectedCustomerId && customerSearchQuery.trim() ? 'border-primary' : 'border-slate-200 dark:border-slate-800'}`}>
            <Text className={`absolute -top-2.5 left-3 bg-white dark:bg-slate-900 px-1 text-[11px] font-bold ${!selectedCustomerId && customerSearchQuery.trim() ? 'text-primary' : 'text-slate-400'}`}>
              Phone Number
            </Text>
            <TextInput
              value={quickPhoneNumber}
              onChangeText={(text) => {
                let newPhone = text;
                if (profile.currency_code === 'INR') {
                  newPhone = text.replace(/[^0-9]/g, '').slice(0, 10);
                } else {
                  newPhone = text;
                }
                setQuickPhoneNumber(newPhone);

                if (newPhone.trim().length > 0) {
                  const matchedCustomer = customers.find(c => c.phone && c.phone === newPhone.trim());
                  if (matchedCustomer && (!selectedCustomerId || selectedCustomerId !== matchedCustomer.id)) {
                    setSelectedCustomerId(matchedCustomer.id);
                    setCustomerSearchQuery(matchedCustomer.name);
                    setShowCustomerDropdown(false);
                  }
                }
              }}
              onFocus={() => setShowCustomerDropdown(false)}
              placeholder={profile.currency_code === 'INR' ? '10-digit phone number' : 'Phone Number (optional)'}
              placeholderTextColor="#94a3b8"
              className="text-base font-bold text-slate-900 dark:text-white h-12"
              editable={true}
              keyboardType="phone-pad"
              maxLength={profile.currency_code === 'INR' ? 10 : undefined}
            />
          </View>

          {/* Suggestions list — flows below phone field, no absolute overlay */}
          {showCustomerDropdown && (
            <View className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 mb-3 overflow-hidden">
              <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <Text className="text-xs font-bold text-slate-500 uppercase">
                  {filteredCustomers.length > 0 ? 'Saved Parties' : 'New Customer'}
                </Text>
              </View>

              {filteredCustomers.length === 0 ? (
                <View className="px-4 py-3">
                  <Text className="text-slate-400 text-sm text-center">
                    No match — fill phone above and tap Continue
                  </Text>
                </View>
              ) : (
                <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
                  {filteredCustomers.map((c) => {
                    const cWallet = customerWallets[c.id] || 0;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => {
                          setSelectedCustomerId(c.id);
                          setCustomerSearchQuery(c.name);
                          setQuickPhoneNumber(c.phone || '');
                          setShowCustomerDropdown(false);
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc' }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b', textTransform: 'uppercase' }}>{c.name}</Text>
                          <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 1 }}>{c.phone || ''}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {cWallet > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#86efac' }}>
                              <MaterialIcons name="account-balance-wallet" size={12} color="#16a34a" />
                              <Text style={{ fontSize: 11, fontWeight: '900', color: '#16a34a' }}>
                                {profile.currency_symbol || '₹'}{cWallet.toFixed(2)}
                              </Text>
                            </View>
                          )}
                          <MaterialIcons name="chevron-right" size={20} color="#cbd5e1" />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}
        </View>


        {/* Line Items Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-bold text-slate-900 dark:text-white">Line Items</Text>
          <View className="flex-row items-center gap-2">
            {/* Barcode */}
            <TouchableOpacity
              onPress={() => {
                const key = Date.now().toString();
                registerScanCallback(key, (item) => {
                  if (item) addItemFromInventory(item);
                });
                navigation.navigate('Scanner', { callbackKey: key });
              }}
              className="w-10 h-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
            >
              <MaterialIcons name="qr-code-scanner" size={20} className="text-primary dark:text-blue-400" />
            </TouchableOpacity>
            {/* From Inventory */}
            <TouchableOpacity
              onPress={() => setShowItemPicker(true)}
              className="w-10 h-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
            >
              <MaterialIcons name="inventory-2" size={20} className="text-primary dark:text-blue-400" />
            </TouchableOpacity>
            {/* Add Item → Manual Entry directly */}
            <TouchableOpacity
              onPress={addManualItem}
              className="flex-row items-center gap-1 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5"
            >
              <MaterialIcons name="add" size={16} className="text-primary dark:text-white" />
              <Text className="text-sm font-semibold text-primary dark:text-white">Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Line Items List */}
        {lineItems.map((item) => (
          <View key={item.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 mb-3 shadow-sm">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1">
                <Text className="text-[10px] uppercase tracking-wider font-extrabold text-primary mb-1">Item Name</Text>
                <TextInput
                  testID="input-item-name"
                  className="w-full bg-slate-50 dark:bg-primary/20 rounded-lg p-3 text-base text-primary dark:text-blue-400 border border-slate-100 dark:border-slate-800 font-bold uppercase"
                  placeholder="ITEM NAME"
                  placeholderTextColor="#94a3b8"
                  value={item.name}
                  onChangeText={(val) => updateLineItem(item.id, 'name', val.toUpperCase())}
                  autoCapitalize="characters"
                />
              </View>
              <TouchableOpacity onPress={() => removeItem(item.id)} className="ml-4 p-2 mt-4">
                <MaterialIcons name="delete" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-[10px] uppercase tracking-wider font-extrabold text-primary mb-1">Details / Description</Text>
              <TextInput
                className="w-full bg-slate-50 dark:bg-primary/20 rounded-lg p-3 text-sm text-primary dark:text-slate-100 border border-slate-100 dark:border-slate-800 font-bold"
                placeholder="Add more details about this item..."
                placeholderTextColor="#94a3b8"
                value={item.description}
                onChangeText={(val) => updateLineItem(item.id, 'description', val)}
                multiline={true}
                numberOfLines={2}
              />
            </View>

            {/* HSN Code + GST % */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-[10px] uppercase tracking-wider font-extrabold text-primary mb-1">HSN / SAC Code</Text>
                <TextInput
                  className="w-full bg-slate-50 dark:bg-primary/20 rounded-lg p-3 text-sm text-primary dark:text-slate-100 border border-slate-100 dark:border-slate-800 font-bold"
                  placeholder="e.g. 6203"
                  placeholderTextColor="#94a3b8"
                  value={item.hsn_code || ''}
                  onChangeText={(val) => updateLineItem(item.id, 'hsn_code', val.replace(/[^0-9]/g, '').slice(0, 8))}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] uppercase tracking-wider font-extrabold text-primary mb-1">GST %</Text>
                <TextInput
                  className="w-full bg-slate-50 dark:bg-primary/20 rounded-lg p-3 text-sm text-primary dark:text-slate-100 border border-slate-100 dark:border-slate-800 font-bold"
                  placeholder={taxRate || '0'}
                  placeholderTextColor="#94a3b8"
                  value={item.tax_percent > 0 ? item.tax_percent?.toString() : ''}
                  onChangeText={(val) => updateLineItem(item.id, 'tax_percent', val)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Dynamic Price Type Selector */}
            <View className="mb-4">
              <Text className="text-[10px] uppercase tracking-wider font-extrabold text-primary mb-2">Price Type</Text>
              <View className="flex-row gap-2">
                {[
                  { type: 'Retail', price: item.retailPrice, color: '#10b981' },
                  { type: 'Wholesale', price: item.wholesalePrice, color: '#3b82f6' },
                  { type: 'ON MRP', price: item.mrp, color: '#f59e0b' },
                ].map(({ type, price, color }) => {
                  const isActive = item.rateType === type;
                  const hasPrice = parseFloat(price) > 0;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => updateLineItem(item.id, 'rateType', type)}
                      style={[
                        {
                          flex: 1, borderRadius: 10, padding: 8, alignItems: 'center',
                          borderWidth: 1.5,
                          borderColor: isActive ? color : '#e2e8f0',
                          backgroundColor: isActive ? `${color}15` : '#f8fafc'
                        }
                      ]}
                    >
                      <Text style={{ fontSize: 9, fontWeight: '800', color: isActive ? color : '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {type}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: isActive ? color : '#64748b', marginTop: 2 }}>
                        {hasPrice ? `${profile.currency_symbol || '₹'}${parseFloat(price).toFixed(2)}` : '—'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View className="flex-row gap-4 mb-2">
              <View className="flex-1 flex-col gap-1">
                <Text className="text-[10px] uppercase tracking-wider font-extrabold text-primary">Qty</Text>
                <View className="flex-row items-center w-full min-h-[46px] bg-slate-50 dark:bg-primary/20 rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <TextInput
                    className="flex-1 px-3 py-2 text-sm text-primary dark:text-slate-100 font-bold"
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    value={item.qty}
                    onChangeText={(val) => updateLineItem(item.id, 'qty', val)}
                    keyboardType="numeric"
                  />
                  <View className="flex-col h-full border-l border-slate-200 dark:border-slate-700 w-8 bg-slate-100 dark:bg-slate-800">
                    <TouchableOpacity
                      onPress={() => {
                        const current = parseFloat(item.qty) || 0;
                        updateLineItem(item.id, 'qty', (current + 1).toString());
                      }}
                      className="flex-1 items-center justify-center border-b border-slate-200 dark:border-slate-700"
                    >
                      <MaterialIcons name="keyboard-arrow-up" size={16} color="#64748b" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        const current = parseFloat(item.qty) || 0;
                        if (current > 1) {
                          updateLineItem(item.id, 'qty', (current - 1).toString());
                        } else if (current > 0) {
                          // Allow stepping down to fractional if not integer, or maybe just go to 0
                          updateLineItem(item.id, 'qty', '1');
                        }
                      }}
                      className="flex-1 items-center justify-center"
                    >
                      <MaterialIcons name="keyboard-arrow-down" size={16} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View className="flex-1 flex-col gap-1">
                <Text className="text-[10px] uppercase tracking-wider font-extrabold text-primary">Rate</Text>
                <TextInput
                  className="w-full bg-slate-50 dark:bg-primary/20 rounded-lg p-3 text-sm text-primary dark:text-slate-100 border border-slate-100 dark:border-slate-800 font-bold"
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  value={item.rate}
                  onChangeText={(val) => updateLineItem(item.id, 'rate', val)}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1 flex-col gap-1 items-end pt-1">
                <Text className="text-[10px] uppercase tracking-wider font-extrabold text-primary">Total</Text>
                <Text className="p-2.5 text-sm font-bold text-primary dark:text-blue-400">
                  {profile.currency_symbol || '$'}{(parseFloat(item.total) || 0).toFixed(2)}
                </Text>
              </View>
            </View>

            <View className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-1 flex-row items-center justify-between">
              <Text className="text-[11px] font-extrabold text-primary dark:text-slate-300 uppercase tracking-tight">ITEM DISCOUNT (%)</Text>
              <TextInput
                className="w-20 bg-primary/5 border border-primary/20 rounded-lg p-1.5 text-xs text-right font-bold text-slate-900 dark:text-slate-100"
                value={item.mrpDiscount}
                onChangeText={(val) => updateLineItem(item.id, 'mrpDiscount', val)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>
        ))}

        {/* Add Item Row - bottom of list */}
        <View className="flex-row items-center gap-2 mb-6">
          {/* Barcode icon */}
          <TouchableOpacity
            onPress={() => {
              const key = Date.now().toString();
              registerScanCallback(key, (item) => {
                if (item) addItemFromInventory(item);
              });
              navigation.navigate('Scanner', { callbackKey: key });
            }}
            className="w-12 h-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <MaterialIcons name="qr-code-scanner" size={22} color="#3b82f6" />
          </TouchableOpacity>
          {/* From Inventory icon */}
          <TouchableOpacity
            onPress={() => setShowItemPicker(true)}
            className="w-12 h-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <MaterialIcons name="inventory-2" size={22} color="#3b82f6" />
          </TouchableOpacity>
          {/* Add Item → Manual Entry directly */}
          <TouchableOpacity
            onPress={addManualItem}
            className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5"
          >
            <MaterialIcons name="add-circle-outline" size={20} color="#3b82f6" />
            <Text className="text-sm font-bold text-primary">Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Section */}
        <View className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6 space-y-4">
          <View className="flex-row justify-between items-center px-1">
            <Text className="text-sm font-extrabold text-primary dark:text-slate-400 uppercase tracking-wider">Subtotal</Text>
            <Text className="text-base font-bold text-slate-900 dark:text-slate-200">{profile.currency_symbol || '$'}{(parseFloat(totals.grossSubtotal) || 0).toFixed(2)}</Text>
          </View>

          <View className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3 gap-3">
            {/* ── Tax Mode Toggle (Inclusive / Exclusive) ── */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 items-center justify-center">
                  <MaterialIcons name="receipt" size={16} color="#3b82f6" />
                </View>
                <Text className="text-sm font-extrabold text-primary dark:text-slate-300">GST Mode</Text>
              </View>
              <View className="flex-row rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                {['exclusive', 'inclusive'].map(mode => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setTaxMode(mode)}
                    style={{ backgroundColor: taxMode === mode ? '#121642' : 'transparent', paddingHorizontal: 12, paddingVertical: 6 }}
                  >
                    <Text style={{ color: taxMode === mode ? '#fff' : '#64748b', fontSize: 11, fontWeight: '800', textTransform: 'capitalize' }}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Fallback global GST rate (used when item has no tax_percent) */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 items-center justify-center">
                  <MaterialIcons name="percent" size={16} color="#3b82f6" />
                </View>
                <Text className="text-sm font-extrabold text-primary dark:text-slate-300">GST Rate (%)</Text>
                <TextInput
                  className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-center text-sm text-primary font-bold"
                  value={taxRate}
                  onChangeText={setTaxRate}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <Text className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                {taxMode === 'inclusive' ? 'Incl.' : '+'}  {profile.currency_symbol || '₹'}{(parseFloat(totals.taxAmount) || 0).toFixed(2)}
              </Text>
            </View>

            {/* GST Breakdown: CGST + SGST or IGST */}
            {totals.taxAmount > 0 && (
              <View className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 mt-1 gap-1.5">
                <Text className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">
                  {totals.isInterState ? 'IGST (Inter-State)' : 'GST Breakdown (Intra-State)'}
                </Text>
                {totals.isInterState ? (
                  <View className="flex-row justify-between">
                    <Text className="text-xs font-bold text-blue-700 dark:text-blue-300">IGST</Text>
                    <Text className="text-xs font-bold text-blue-700 dark:text-blue-300">{profile.currency_symbol || '₹'}{totals.totalIgst.toFixed(2)}</Text>
                  </View>
                ) : (
                  <>
                    <View className="flex-row justify-between">
                      <Text className="text-xs font-bold text-blue-600 dark:text-blue-300">CGST</Text>
                      <Text className="text-xs font-bold text-blue-600 dark:text-blue-300">{profile.currency_symbol || '₹'}{totals.totalCgst.toFixed(2)}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs font-bold text-blue-600 dark:text-blue-300">SGST</Text>
                      <Text className="text-xs font-bold text-blue-600 dark:text-blue-300">{profile.currency_symbol || '₹'}{totals.totalSgst.toFixed(2)}</Text>
                    </View>
                  </>
                )}
                {totals.isInterState === false && totals.taxAmount > 0 && (
                  <Text className="text-[9px] text-blue-400 mt-0.5">
                    {selectedCustomer?.state ? '' : '(Fill customer state for IGST auto-detection)'}
                  </Text>
                )}
              </View>
            )}

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 items-center justify-center">
                  <MaterialIcons name="sell" size={16} color="#22c55e" />
                </View>
                <Text className="text-sm font-extrabold text-primary dark:text-slate-300">Disc (%)</Text>
                <TextInput
                  className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-center text-sm text-primary font-bold"
                  value={discountRate}
                  onChangeText={(val) => {
                    const globalDisc = parseFloat(val) || 0;
                    let maxAllowed = 100;
                    let limitingItem = null;

                    for (const item of lineItems) {
                      if (item.maxDiscount > 0) {
                        const itemDisc = parseFloat(item.mrpDiscount) || 0;
                        const allowedGlobal = Math.max(0, item.maxDiscount - itemDisc);
                        if (allowedGlobal < maxAllowed) {
                          maxAllowed = allowedGlobal;
                          limitingItem = item.name;
                        }
                      }
                    }

                    if (globalDisc > maxAllowed) {
                      Alert.alert('Discount Exceeded', `Global discount cannot exceed ${maxAllowed}% because of item "${limitingItem}"'s max discount limit.`);
                      setDiscountRate(maxAllowed.toString());
                    } else {
                      setDiscountRate(val);
                    }
                  }}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <Text className="text-sm font-bold text-green-600">-{profile.currency_symbol || '$'}{(parseFloat(totals.itemDiscountTotal + totals.globalDiscountAmount) || 0).toFixed(2)}</Text>
            </View>
          </View>

          <View className="flex-row justify-between items-center py-4 bg-primary/5 rounded-2xl px-4 mt-2">
            <Text className="text-lg font-extrabold text-primary dark:text-white">Grand Total</Text>
            <Text className="text-2xl font-black text-primary">{profile.currency_symbol || '$'}{(parseFloat(totals.grandTotal) || 0).toFixed(2)}</Text>
          </View>

          {/* ── Single compact credit apply row ── */}
          {availableCredit > 0 && !isEstimate && (
            <TouchableOpacity
              onPress={() => setAppliedCredit(appliedCredit > 0 ? 0 : Math.min(availableCredit, totals.grandTotal))}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                marginTop: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
                backgroundColor: appliedCredit > 0 ? '#f0fdf4' : '#f8fafc',
                borderWidth: 1.5,
                borderColor: appliedCredit > 0 ? '#86efac' : '#e2e8f0',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="account-balance-wallet" size={16} color={appliedCredit > 0 ? '#16a34a' : '#64748b'} />
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: appliedCredit > 0 ? '#15803d' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {appliedCredit > 0 ? '✅ Wallet Credit Applied' : '💳 Wallet Credit'}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: appliedCredit > 0 ? '#16a34a' : '#94a3b8', marginTop: 1 }}>
                    {appliedCredit > 0
                      ? `${profile.currency_symbol || '₹'}${appliedCredit.toFixed(2)} deducted`
                      : `${profile.currency_symbol || '₹'}${availableCredit.toFixed(2)} available`}
                  </Text>
                </View>
              </View>
              <View style={{
                paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
                backgroundColor: appliedCredit > 0 ? '#dcfce7' : '#262A56',
              }}>
                <Text style={{ fontSize: 11, fontWeight: '900', color: appliedCredit > 0 ? '#16a34a' : '#fff', textTransform: 'uppercase' }}>
                  {appliedCredit > 0 ? 'Remove' : 'Apply'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <View className="flex-row justify-between items-center py-4 border-t border-slate-100 dark:border-slate-800 mt-4 px-2">
            <Text className="text-slate-400 font-bold">Net Balance Due</Text>
            <Text className="text-xl font-black text-slate-900 dark:text-white">{profile.currency_symbol || '$'}{(parseFloat(totals.totalToPay) || 0).toFixed(2)}</Text>
          </View>
        </View>

      </ScrollView>

      {/* Floating Footer */}
      <View style={{ paddingBottom: Math.max(insets.bottom, 20) }} className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl">
        <TouchableOpacity
          onPress={handleContinue}
          className="w-full py-4 bg-primary rounded-xl flex-row items-center justify-center gap-2 shadow-lg shadow-primary/30"
          testID="btn-continue"
        >
          <MaterialIcons name="arrow-forward" size={20} color="white" />
          <Text className="text-white font-black uppercase tracking-wider">Continue</Text>
        </TouchableOpacity>
      </View>


      {/* Item Selection Modal (Inventory) */}
      <Modal visible={showItemPicker} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white dark:bg-slate-950 rounded-t-[40px] h-[80%] p-6">
            <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full self-center mb-6" />
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black text-primary dark:text-white">Add from Inventory</Text>
              <TouchableOpacity onPress={() => setShowItemPicker(false)} className="w-10 h-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <MaterialIcons name="close" size={24} className="text-slate-600" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={inventoryItems}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => addItemFromInventory(item)}
                  className="flex-row items-center gap-4 py-4 border-b border-slate-50 dark:border-slate-900"
                >
                  <View className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700">
                    <MaterialIcons name="inventory-2" size={24} className="text-primary/40" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-slate-900 dark:text-white">{item.name}</Text>
                    <View className="flex-row items-center gap-3 mt-1">
                      {/* BUG-7 FIX: item.price is undefined after normalization; use item.retailPrice */}
                      <Text className="text-primary font-bold">{profile.currency_symbol || '$'}{(parseFloat(item.retailPrice || item.price) || 0).toFixed(2)}</Text>
                      <View className="w-1 h-1 rounded-full bg-slate-300" />
                      <Text className="text-slate-500 text-xs">Stock: {item.stock}</Text>
                    </View>
                  </View>
                  <View className="w-8 h-8 rounded-full bg-primary/5 items-center justify-center">
                    <MaterialIcons name="add" size={20} className="text-primary" />
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View className="py-20 items-center px-10">
                  <MaterialIcons name="inventory" size={64} color="#e2e8f0" />
                  <Text className="text-slate-400 text-center mt-4 font-medium">Your inventory is empty.</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowItemPicker(false);
                      navigation.navigate('Inventory');
                    }}
                    className="mt-8 px-8 py-4 bg-primary/10 rounded-2xl"
                  >
                    <Text className="text-primary font-bold">Go to Inventory</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Quick Add Customer Modal */}
      <Modal visible={showQuickAddCustomer} animationType="fade" transparent={true}>
        <View className="flex-1 bg-black/50 justify-center items-center p-6">
          <View className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <Text className="text-xl font-black mb-6 text-primary dark:text-white uppercase tracking-tight">Quick Add Customer</Text>

            <View className="flex-col gap-4">
              <View className="flex-col gap-1">
                <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400 ml-1">Full Name</Text>
                <TextInput
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 uppercase font-bold"
                  placeholder="CUSTOMER NAME"
                  placeholderTextColor="#94a3b8"
                  value={newCustomerName}
                  onChangeText={(t) => setNewCustomerName(t.toUpperCase())}
                  autoCapitalize="characters"
                />
              </View>

              <View className="flex-col gap-1">
                <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400 ml-1">Phone Number</Text>
                <TextInput
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 font-bold"
                  placeholder={profile.currency_code === 'INR' ? '10-digit phone number' : 'Phone (Optional)'}
                  placeholderTextColor="#94a3b8"
                  value={newCustomerPhone}
                  onChangeText={(t) => {
                    if (profile.currency_code === 'INR') {
                      setNewCustomerPhone(t.replace(/[^0-9]/g, '').slice(0, 10));
                    } else {
                      setNewCustomerPhone(t);
                    }
                  }}
                  keyboardType="phone-pad"
                  maxLength={profile.currency_code === 'INR' ? 10 : undefined}
                />
              </View>
            </View>

            <View className="flex-row gap-3 mt-8">
              <TouchableOpacity
                onPress={() => setShowQuickAddCustomer(false)}
                className="flex-1 py-4 items-center rounded-2xl bg-slate-100 dark:bg-slate-800"
              >
                <Text className="text-slate-500 font-bold uppercase tracking-wider">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleQuickAddCustomer}
                className="flex-[2] py-4 items-center rounded-2xl bg-primary shadow-lg"
              >
                <Text className="text-white font-bold uppercase tracking-wider">Add & Select</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
