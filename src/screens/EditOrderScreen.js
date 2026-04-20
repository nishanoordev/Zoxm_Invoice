import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Modal, FlatList, KeyboardAvoidingView, Platform, Alert, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';

const STATUS_OPTIONS = ['Pending', 'Processing', 'Completed', 'Cancelled'];

export default function EditOrderScreen({ navigation, route }) {
  const order = route.params?.order;
  const inventoryItems = useStore(state => state.items);
  const customers = useStore(state => state.customers);
  const addCustomer = useStore(state => state.addCustomer);
  const updateOrder = useStore(state => state.updateOrder);
  const deleteOrder = useStore(state => state.deleteOrder);
  const addInvoice = useStore(state => state.addInvoice);
  const addPayment = useStore(state => state.addPayment);
  const invoices = useStore(state => state.invoices);
  const payments = useStore(state => state.payments);
  const profile = useStore(state => state.profile);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orderDate, setOrderDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [taxPercent, setTaxPercent] = useState('0');
  const [discountPercent, setDiscountPercent] = useState('');
  const [status, setStatus] = useState('Pending');
  const [lineItems, setLineItems] = useState([]);
  const [showItemOptions, setShowItemOptions] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');

  // Pre-fill from existing order
  useEffect(() => {
    if (order) {
      setOrderDate(order.date || '');
      setDeliveryDate(order.deliveryDate || order.delivery_date || '');
      setTaxPercent(order.taxPercent?.toString() || order.tax_percent?.toString() || '0');
      setDiscountPercent(order.discountAmount > 0 || order.discount_amount > 0 ? (order.discountPercent?.toString() || order.discount_percent?.toString() || '') : '');
      setStatus(order.status || 'Pending');
      const orderAdvance = parseFloat(order.advance_amount || order.advanceAmount || 0);
      if (orderAdvance > 0) setAdvanceAmount(orderAdvance.toString());
      const existingCustomer = customers.find(c => c.id === (order.customerId || order.customer_id));
      if (existingCustomer) {
        setSelectedCustomer(existingCustomer);
      } else if (order.customerName || order.customer_name) {
        setSelectedCustomer({ id: order.customerId || order.customer_id, name: order.customerName || order.customer_name });
      }
      const items = order.items || (() => { try { return JSON.parse(order.items_json || '[]'); } catch { return []; } })();
      setLineItems(items.map(it => ({
        ...it,
        id: it.id || Date.now().toString() + Math.random(),
        qty: it.qty?.toString() || it.quantity?.toString() || '1',
        rate: it.rate?.toString() || '0',
        total: it.total || 0,
        description: it.description || '',
      })));
    }
  }, [order]);

  const handleQuickAddCustomer = async () => {
    if (!newCustomerName.trim()) { alert('Name required'); return; }
    try {
      const saved = await addCustomer({ name: newCustomerName, phone: newCustomerPhone, email: '', address: '', balance: 0 });
      setSelectedCustomer(saved);
      setShowQuickAddCustomer(false);
      setShowCustomerPicker(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } catch { alert('Failed to add customer'); }
  };

  const addManualItem = () => {
    setLineItems([...lineItems, { id: Date.now().toString(), name: '', description: '', qty: '1', rate: '0.00', total: 0 }]);
    setShowItemOptions(false);
  };

  const addItemFromInventory = (inventoryItem) => {
    const newItem = {
      id: Date.now().toString(),
      name: inventoryItem.name,
      description: inventoryItem.description || inventoryItem.category || '',
      rate: (inventoryItem.retail_price || inventoryItem.price || 0).toString(),
      qty: '1',
      total: inventoryItem.retail_price || inventoryItem.price || 0,
    };
    setLineItems([...lineItems, newItem]);
    setShowItemPicker(false);
  };

  const updateLineItem = (id, field, value) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        const rate = parseFloat(field === 'rate' ? value : item.rate) || 0;
        const qty = parseFloat(field === 'qty' ? value : item.qty) || 0;
        newItem.total = rate * qty;
        return newItem;
      }
      return item;
    }));
  };

  const removeLineItem = (id) => setLineItems(lineItems.filter(item => item.id !== id));

  const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const discountAmount = subtotal * (parseFloat(discountPercent) || 0) / 100;
  const afterDiscount = subtotal - discountAmount;
  const tax = afterDiscount * (parseFloat(taxPercent) || 0) / 100;
  const total = afterDiscount + tax;
  // How much has this customer paid in advances (not yet invoiced)
  const advancePaidPayments = React.useMemo(() => {
    if (!selectedCustomer?.id) return 0;
    const cid = selectedCustomer.id;
    return payments
      .filter(p => (p.customerId === cid || p.customer_id === cid) && p.type === 'advance')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  }, [selectedCustomer, payments]);

  // Already consumed advance = advances applied to prior invoices
  const advanceConsumed = React.useMemo(() => {
    if (!selectedCustomer?.id) return 0;
    const cid = selectedCustomer.id;
    return payments
      .filter(p => (p.customerId === cid || p.customer_id === cid) && p.method === 'Advance Adjusted')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  }, [selectedCustomer, payments]);

  const availableAdvance = Math.max(0, advancePaidPayments - advanceConsumed);
  const balanceDueOnDelivery = Math.max(0, total - availableAdvance);
  const advanceApplicable = Math.min(availableAdvance, total);
  const pctPaid = total > 0 ? Math.min(100, (availableAdvance / total) * 100) : 0;

  // Add more advance
  const [showAddAdvance, setShowAddAdvance] = useState(false);
  const [extraAdvance, setExtraAdvance] = useState('');

  const handleRecordExtraAdvance = async () => {
    const amt = parseFloat(extraAdvance);
    if (!amt || amt <= 0) { Alert.alert('Invalid amount'); return; }
    if (!selectedCustomer?.id) { Alert.alert('Select a customer first'); return; }
    try {
      await addPayment({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        amount: amt,
        method: 'Cash',
        type: 'advance',
        date: new Date().toISOString().split('T')[0],
        notes: `Additional advance for order #${order?.orderNumber || order?.id?.slice(-6)}`,
      });
      setExtraAdvance('');
      setShowAddAdvance(false);
      Alert.alert('Advance Recorded', `₹${amt.toFixed(2)} advance added successfully.`);
    } catch (e) {
      Alert.alert('Error', 'Failed to record advance.');
    }
  };

  const buildUpdatedOrder = () => ({
    ...order,
    id: order.id,
    customerId: selectedCustomer?.id || '',
    customer_id: selectedCustomer?.id || '',
    customerName: selectedCustomer?.name || '',
    customer_name: selectedCustomer?.name || '',
    date: orderDate,
    deliveryDate,
    delivery_date: deliveryDate,
    subtotal,
    taxPercent: parseFloat(taxPercent) || 0,
    tax_percent: parseFloat(taxPercent) || 0,
    taxAmount: tax,
    tax_amount: tax,
    discountPercent: parseFloat(discountPercent) || 0,
    discount_percent: parseFloat(discountPercent) || 0,
    discountAmount: discountAmount,
    discount_amount: discountAmount,
    total,
    advanceAmount: parseFloat(advanceAmount) || 0,
    advance_amount: parseFloat(advanceAmount) || 0,
    items: lineItems,
    items_json: JSON.stringify(lineItems),
  });

  const handleUpdateOrder = async () => {
    if (lineItems.length === 0) { alert('Please add at least one item.'); return; }
    try {
      await updateOrder({ ...buildUpdatedOrder(), status });
      alert('Order updated!');
      navigation.goBack();
    } catch (e) {
      console.error('Update order error:', e);
      alert('Failed to update order.');
    }
  };

  const handleUpdateAndCreateInvoice = async () => {
    if (lineItems.length === 0) { alert('Please add at least one item.'); return; }
    try {
      await updateOrder({ ...buildUpdatedOrder(), status: 'Processing' });
      navigation.navigate('CreateInvoice', { initialItems: lineItems, initialCustomer: selectedCustomer });
    } catch (e) {
      console.error('Update+Invoice error:', e);
      alert('Failed to save order.');
    }
  };

  const handleCompleteOrder = async () => {
    if (lineItems.length === 0) { alert('Please add at least one item.'); return; }
    const sym = profile.currency_symbol || '₹';
    const balanceMsg = availableAdvance > 0
      ? `${sym}${advanceApplicable.toFixed(2)} advance will be auto-applied.\nBalance to collect on delivery: ${sym}${balanceDueOnDelivery.toFixed(2)}`
      : `Full amount of ${sym}${total.toFixed(2)} to be collected on delivery.`;

    Alert.alert(
      'Complete & Create Invoice',
      `${balanceMsg}\n\nThis will create an invoice and mark the order as Completed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await updateOrder({ ...buildUpdatedOrder(), status: 'Completed' });
              const invoiceNumber = `#INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
              const invoice = await addInvoice({
                invoiceNumber,
                customerId: selectedCustomer?.id || '',
                customerName: selectedCustomer?.name || '',
                date: orderDate,
                dueDate: deliveryDate || orderDate,
                status: balanceDueOnDelivery <= 0 ? 'Paid' : 'Pending',
                subtotal,
                taxPercent: parseFloat(taxPercent) || 0,
                taxAmount: tax,
                discountPercent: parseFloat(discountPercent) || 0,
                discountAmount: discountAmount,
                total,
                items: lineItems.map(it => ({
                  item_id: it.item_id || it.inventoryId || '',
                  name: it.name,
                  description: it.description || '',
                  quantity: parseFloat(it.qty) || 1,
                  rate: parseFloat(it.rate) || 0,
                  total: parseFloat(it.total) || 0,
                  rate_type: it.rateType || 'Retail',
                  mrp_discount: parseFloat(it.mrpDiscount) || 0,
                  hsn_code: it.hsn_code || ''
                })),
                notes: `Created from Order #${order.orderNumber || order.order_number || order.id?.slice(-6)}`,
              });

              // Auto-apply available advance to new invoice
              if (advanceApplicable > 0 && invoice?.id) {
                const today = new Date().toISOString().split('T')[0];
                await addPayment({
                  invoiceId: invoice.id,
                  customerId: selectedCustomer?.id || '',
                  customerName: selectedCustomer?.name || '',
                  amount: advanceApplicable,
                  method: 'Advance Adjusted',
                  type: 'payment',
                  date: today,
                  notes: `Advance applied for Invoice ${invoiceNumber}`,
                });
                // Reversal to consume from advance pool
                await addPayment({
                  invoiceId: null,
                  customerId: selectedCustomer?.id || '',
                  customerName: selectedCustomer?.name || '',
                  amount: -advanceApplicable,
                  method: 'Advance Reversal',
                  type: 'credit_note',
                  date: today,
                  notes: `Advance consumed for Invoice ${invoiceNumber}`,
                });
              }

              Alert.alert(
                'Order Completed! ✓',
                advanceApplicable > 0
                  ? `Invoice ${invoiceNumber} created.\n${sym}${advanceApplicable.toFixed(2)} advance applied.\nBalance due: ${sym}${balanceDueOnDelivery.toFixed(2)}`
                  : `Invoice ${invoiceNumber} created successfully.`
              );
              navigation.goBack();
            } catch (e) {
              console.error('Complete order error:', e);
              alert('Failed to complete order.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteOrder = () => {
    Alert.alert(
      'Delete Order',
      'Are you sure you want to delete this order? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOrder(order.id);
              navigation.goBack();
            } catch { alert('Failed to delete order.'); }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark pt-12">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-1 max-w-2xl mx-auto w-full">
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#262A56', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 }}>
              <MaterialIcons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '900', flex: 1, marginLeft: 12 }}>Edit Order</Text>
            <TouchableOpacity onPress={handleDeleteOrder} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.25)' }}>
              <MaterialIcons name="delete" size={22} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 140 }}>

            {/* ── FINANCIAL SUMMARY CARD ── */}
            {selectedCustomer && (
              <View style={{ margin: 16, borderRadius: 24, overflow: 'hidden', backgroundColor: '#262A56', shadowColor: '#262A56', shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 }}>
                {/* Header row */}
                <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Order Financial Summary</Text>
                  <Text style={{ color: 'white', fontSize: 26, fontWeight: '900' }}>{profile.currency_symbol || '₹'}{total.toFixed(2)}</Text>
                </View>

                {/* Progress bar */}
                <View style={{ marginHorizontal: 20, height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6, marginBottom: 4 }}>
                  <View style={{ height: 6, width: `${pctPaid}%`, backgroundColor: pctPaid >= 100 ? '#10b981' : '#f59e0b', borderRadius: 6 }} />
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginHorizontal: 20, marginBottom: 12 }}>
                  {pctPaid >= 100 ? '✓ Fully covered by advance' : `${pctPaid.toFixed(0)}% covered by advance`}
                </Text>

                {/* 3-col breakdown */}
                <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingVertical: 14 }}>
                  <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Order Total</Text>
                    <Text style={{ color: 'white', fontSize: 15, fontWeight: '900' }}>{profile.currency_symbol || '₹'}{total.toFixed(2)}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Advance Paid</Text>
                    <Text style={{ color: '#34d399', fontSize: 15, fontWeight: '900' }}>{profile.currency_symbol || '₹'}{availableAdvance.toFixed(2)}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Balance Due</Text>
                    <Text style={{ color: balanceDueOnDelivery <= 0 ? '#34d399' : '#fb923c', fontSize: 15, fontWeight: '900' }}>
                      {balanceDueOnDelivery <= 0 ? '✓ Settled' : `${profile.currency_symbol || '₹'}${balanceDueOnDelivery.toFixed(2)}`}
                    </Text>
                  </View>
                </View>

                {/* Collect advance button */}
                {balanceDueOnDelivery > 0 && (
                  <TouchableOpacity
                    onPress={() => setShowAddAdvance(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: 'rgba(16,185,129,0.2)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}
                  >
                    <MaterialIcons name="add-circle" size={16} color="#34d399" />
                    <Text style={{ color: '#34d399', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 }}>Collect Advance Payment</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Order Details */}
            <View className="px-4 pt-2">
              <Text className="text-primary dark:text-accent text-xl font-bold mb-4">Order Details</Text>

              <View className="flex-col gap-4">
                {/* Customer */}
                <View className="flex-col w-full">
                  <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold mb-1.5 ml-1">Customer</Text>
                  <TouchableOpacity
                    onPress={() => setShowCustomerPicker(true)}
                    className="flex-row items-center justify-between w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-primary/10 h-14 px-4"
                  >
                    <Text className={`text-base ${selectedCustomer ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                      {selectedCustomer ? selectedCustomer.name : 'Choose a customer...'}
                    </Text>
                    <MaterialIcons name="person-search" size={24} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* Status */}
                <View>
                  <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold mb-1.5 ml-1">Status</Text>
                  <TouchableOpacity
                    onPress={() => setShowStatusPicker(true)}
                    className="flex-row items-center justify-between w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-primary/10 h-14 px-4"
                  >
                    <Text className="text-base text-slate-900 dark:text-white">{status}</Text>
                    <MaterialIcons name="expand-more" size={24} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* Dates */}
                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold mb-1.5 ml-1">Order Date</Text>
                    <TextInput
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-primary/10 h-14 px-4 text-base text-slate-900 dark:text-white"
                      value={orderDate}
                      onChangeText={setOrderDate}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold mb-1.5 ml-1">Expected Delivery</Text>
                    <TextInput
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-primary/10 h-14 px-4 text-base text-slate-900 dark:text-white"
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#94a3b8"
                      value={deliveryDate}
                      onChangeText={setDeliveryDate}
                    />
                  </View>
                </View>
              </View>
            </View>

            <View className="h-px bg-slate-100 dark:bg-slate-800 mx-4 my-6" />

            {/* Items Section */}
            <View className="px-4">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-primary dark:text-accent text-xl font-bold">Items</Text>
                <View className="relative">
                  <TouchableOpacity
                    onPress={() => setShowItemOptions(!showItemOptions)}
                    className="flex-row items-center gap-1 bg-accent/10 px-4 py-2 rounded-lg"
                  >
                    <MaterialIcons name="add-circle" size={18} color="#ec5b13" />
                    <Text className="text-accent font-semibold text-sm">Add Item</Text>
                  </TouchableOpacity>
                  {showItemOptions && (
                    <View className="absolute top-12 right-0 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
                      <TouchableOpacity onPress={addManualItem} className="flex-row items-center p-3 border-b border-slate-100 dark:border-slate-700">
                        <MaterialIcons name="edit" size={20} color="#64748b" />
                        <Text className="ml-3 text-slate-700 dark:text-slate-200 font-medium">Manual Entry</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setShowItemPicker(true); setShowItemOptions(false); }} className="flex-row items-center p-3">
                        <MaterialIcons name="inventory" size={20} color="#64748b" />
                        <Text className="ml-3 text-slate-700 dark:text-slate-200 font-medium">From Inventory</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {lineItems.map((item) => (
                <View key={item.id} className="p-4 bg-white dark:bg-primary/5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-4">
                  <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-1">
                      <Text className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1">Item Name</Text>
                      <TextInput
                        className="w-full bg-slate-50 dark:bg-primary/20 rounded-xl p-3 text-base font-bold text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700"
                        placeholder="Item Name"
                        placeholderTextColor="#94a3b8"
                        value={item.name}
                        onChangeText={(val) => updateLineItem(item.id, 'name', val)}
                      />
                    </View>
                    <TouchableOpacity onPress={() => removeLineItem(item.id)} className="ml-4 mt-6">
                      <MaterialIcons name="delete-outline" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  <View className="mb-4">
                    <Text className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1">Description / Details</Text>
                    <TextInput
                      className="w-full bg-slate-50 dark:bg-primary/20 rounded-xl p-3 text-sm text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700"
                      placeholder="Add details..."
                      placeholderTextColor="#94a3b8"
                      value={item.description}
                      onChangeText={(val) => updateLineItem(item.id, 'description', val)}
                      multiline={true}
                    />
                  </View>

                  <View className="flex-row items-center gap-4">
                    <View className="flex-1">
                      <Text className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1">Qty</Text>
                      <TextInput
                        className="bg-slate-50 dark:bg-primary/20 rounded-xl p-3 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700"
                        keyboardType="numeric"
                        value={item.qty?.toString()}
                        onChangeText={(val) => updateLineItem(item.id, 'qty', val)}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1">Rate</Text>
                      <TextInput
                        className="bg-slate-50 dark:bg-primary/20 rounded-xl p-3 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700"
                        keyboardType="numeric"
                        value={item.rate?.toString()}
                        onChangeText={(val) => updateLineItem(item.id, 'rate', val)}
                      />
                    </View>
                    <View className="flex-1 items-end pt-5">
                      <Text className="text-[10px] uppercase font-bold text-slate-400 mb-1 pr-1">Total</Text>
                      <Text className="text-base font-bold text-primary dark:text-white pr-1">{profile.currency_symbol || '$'}{(parseFloat(item.total) || 0).toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              ))}

              {lineItems.length === 0 && (
                <View className="py-12 items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <MaterialIcons name="shopping-basket" size={48} color="#cbd5e1" />
                  <Text className="text-slate-400 mt-2">No items added yet</Text>
                </View>
              )}
            </View>

            {/* Summary */}
            <View className="mt-8 px-6 py-6 bg-primary/5 dark:bg-primary/20 rounded-2xl mx-4 border border-primary/10">
              <View className="flex-row justify-between mb-4">
                <Text className="text-slate-600 dark:text-slate-400">Subtotal</Text>
                <Text className="text-slate-900 dark:text-white font-medium">{profile.currency_symbol || '$'}{(parseFloat(subtotal) || 0).toFixed(2)}</Text>
              </View>

              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-3">
                  <Text className="text-slate-600 dark:text-slate-400">{profile.currency_code === 'INR' ? 'GST (%)' : 'Tax (%)'}</Text>
                  <TextInput 
                    className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1 text-center text-sm text-primary font-bold"
                    value={taxPercent}
                    onChangeText={setTaxPercent}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <Text className="text-slate-900 dark:text-white font-medium">+{profile.currency_symbol || '$'}{(parseFloat(tax) || 0).toFixed(2)}</Text>
              </View>

              <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <View className="flex-row items-center gap-3">
                  <Text className="text-slate-600 dark:text-slate-400">Discount (%)</Text>
                  <TextInput 
                    className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1 text-center text-sm text-primary font-bold"
                    value={discountPercent}
                    onChangeText={setDiscountPercent}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <Text className="text-green-600 font-medium">-{profile.currency_symbol || '$'}{(parseFloat(discountAmount) || 0).toFixed(2)}</Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-xl font-bold text-primary dark:text-accent">Total Amount</Text>
                <Text className="text-xl font-bold text-primary dark:text-accent">{profile.currency_symbol || '$'}{(parseFloat(total) || 0).toFixed(2)}</Text>
              </View>

              {/* Advance Payment Section */}
              <View style={{ borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 16, paddingTop: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <MaterialIcons name="payments" size={18} color="#059669" />
                  <Text style={{ color: '#059669', fontWeight: '800', fontSize: 13 }}>Advance Payment</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1fae5', borderRadius: 12, paddingHorizontal: 16, height: 48 }}>
                  <Text style={{ color: '#059669', fontWeight: '800', fontSize: 16, marginRight: 8 }}>{profile.currency_symbol || '₹'}</Text>
                  <TextInput
                    style={{ flex: 1, fontSize: 15, fontWeight: '700', color: '#059669' }}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor="#86efac"
                    value={advanceAmount}
                    onChangeText={setAdvanceAmount}
                  />
                </View>
                {parseFloat(advanceAmount) > 0 && (
                  <View style={{ marginTop: 10 }}>
                    {/* Progress bar */}
                    <View style={{ height: 6, backgroundColor: '#e2e8f0', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
                      <View style={{ height: 6, width: `${Math.min(100, ((parseFloat(advanceAmount) || 0) / (total || 1)) * 100)}%`, backgroundColor: (parseFloat(advanceAmount) || 0) >= total ? '#10b981' : '#f59e0b', borderRadius: 6 }} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Advance</Text>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: '#10b981' }}>{profile.currency_symbol || '₹'}{parseFloat(advanceAmount).toFixed(2)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Remaining</Text>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: Math.max(0, total - parseFloat(advanceAmount)) > 0 ? '#ef4444' : '#10b981' }}>
                          {Math.max(0, total - parseFloat(advanceAmount)) <= 0 ? '✓ Fully Paid' : `${profile.currency_symbol || '₹'}${Math.max(0, total - parseFloat(advanceAmount)).toFixed(2)}`}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Notify Customer Section */}
            {selectedCustomer && (
              <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: '#eff6ff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#bfdbfe' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <MaterialIcons name="notifications-active" size={18} color="#2563eb" />
                  <Text style={{ color: '#2563eb', fontWeight: '800', fontSize: 13 }}>Notify Customer</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {/* Call */}
                  <TouchableOpacity
                    onPress={() => {
                      const phone = selectedCustomer.phone || customers.find(c => c.id === selectedCustomer.id)?.phone;
                      if (!phone) { Alert.alert('No Phone', 'Customer has no phone number saved.'); return; }
                      Linking.openURL(`tel:${phone}`);
                    }}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#dcfce7', borderRadius: 10, paddingVertical: 10 }}
                  >
                    <MaterialIcons name="call" size={18} color="#16a34a" />
                    <Text style={{ color: '#16a34a', fontWeight: '800', fontSize: 12 }}>Call</Text>
                  </TouchableOpacity>
                  {/* WhatsApp */}
                  <TouchableOpacity
                    onPress={() => {
                      const phone = selectedCustomer.phone || customers.find(c => c.id === selectedCustomer.id)?.phone;
                      if (!phone) { Alert.alert('No Phone', 'Customer has no phone number saved.'); return; }
                      const name = selectedCustomer.name;
                      const orderNum = order?.orderNumber || order?.order_number || order?.id?.slice(-6);
                      const itemNames = lineItems.map(i => i.name).filter(Boolean).join(', ') || 'your ordered items';
                      const message = `Hi ${name}, your order #${orderNum} (${itemNames}) is ready for pickup/delivery! - ${profile?.name || 'ZOXM'}`;
                      const cleanPhone = phone.replace(/[^0-9]/g, '');
                      const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                      Linking.openURL(`whatsapp://send?phone=${waPhone}&text=${encodeURIComponent(message)}`).catch(() =>
                        Alert.alert('WhatsApp not installed')
                      );
                    }}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#d1fae5', borderRadius: 10, paddingVertical: 10 }}
                  >
                    <MaterialIcons name="chat" size={18} color="#059669" />
                    <Text style={{ color: '#059669', fontWeight: '800', fontSize: 12 }}>WhatsApp</Text>
                  </TouchableOpacity>
                  {/* SMS */}
                  <TouchableOpacity
                    onPress={() => {
                      const phone = selectedCustomer.phone || customers.find(c => c.id === selectedCustomer.id)?.phone;
                      if (!phone) { Alert.alert('No Phone', 'Customer has no phone number saved.'); return; }
                      const name = selectedCustomer.name;
                      const orderNum = order?.orderNumber || order?.order_number || order?.id?.slice(-6);
                      const message = `Hi ${name}, your order #${orderNum} is ready! - ${profile?.name || 'ZOXM'}`;
                      Linking.openURL(`sms:${phone}?body=${encodeURIComponent(message)}`);
                    }}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#e0e7ff', borderRadius: 10, paddingVertical: 10 }}
                  >
                    <MaterialIcons name="sms" size={18} color="#4f46e5" />
                    <Text style={{ color: '#4f46e5', fontWeight: '800', fontSize: 12 }}>SMS</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer — two distinct CTAs */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, backgroundColor: 'rgba(255,255,255,0.97)', borderTopWidth: 1, borderTopColor: '#e2e8f0', flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={handleUpdateOrder}
              style={{ flex: 1, height: 56, borderRadius: 14, borderWidth: 2, borderColor: '#262A56', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
            >
              <MaterialIcons name="save" size={18} color="#262A56" />
              <Text style={{ color: '#262A56', fontWeight: '900', fontSize: 13 }}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCompleteOrder}
              style={{ flex: 1.6, height: 56, borderRadius: 14, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, shadowColor: '#10b981', shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 }}
            >
              <MaterialIcons name="receipt-long" size={18} color="white" />
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 13 }}>Complete & Invoice</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Customer Picker Modal */}
        <Modal visible={showCustomerPicker} animationType="slide" transparent={true}>
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white dark:bg-slate-900 rounded-t-3xl h-3/4 p-6">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-slate-900 dark:text-white">Choose Customer</Text>
                <TouchableOpacity onPress={() => setShowCustomerPicker(false)}>
                  <MaterialIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={customers}
                keyExtractor={item => item.id}
                ListHeaderComponent={
                  <TouchableOpacity
                    onPress={() => setShowQuickAddCustomer(true)}
                    className="flex-row items-center gap-3 p-4 bg-primary/5 rounded-xl mb-4 mx-1 border border-dashed border-primary/20"
                  >
                    <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                      <MaterialIcons name="person-add" size={20} color="#272756" />
                    </View>
                    <Text className="text-base font-bold text-primary">Quick Add Customer</Text>
                  </TouchableOpacity>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => { setSelectedCustomer(item); setShowCustomerPicker(false); }}
                    className="p-4 border-b border-slate-100 dark:border-slate-800"
                  >
                    <Text className="text-base font-semibold text-slate-900 dark:text-white">{item.name}</Text>
                    <Text className="text-sm text-slate-500">{item.phone || item.email}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Quick Add Customer Modal */}
        <Modal visible={showQuickAddCustomer} animationType="fade" transparent={true}>
          <View className="flex-1 bg-black/50 justify-center items-center p-6">
            <View className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl">
              <Text className="text-xl font-black mb-6 text-primary dark:text-white uppercase tracking-tight text-center">Quick Add Customer</Text>
              <TextInput
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 mb-4"
                placeholder="Customer Name"
                placeholderTextColor="#94a3b8"
                value={newCustomerName}
                onChangeText={setNewCustomerName}
              />
              <TextInput
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700"
                placeholder="Phone (Optional)"
                placeholderTextColor="#94a3b8"
                value={newCustomerPhone}
                onChangeText={setNewCustomerPhone}
                keyboardType="phone-pad"
              />
              <View className="flex-row gap-3 mt-8">
                <TouchableOpacity onPress={() => setShowQuickAddCustomer(false)} className="flex-1 py-4 items-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <Text className="text-slate-500 font-bold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleQuickAddCustomer} className="flex-[2] py-4 items-center rounded-2xl bg-primary shadow-lg">
                  <Text className="text-white font-bold">Add & Select</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Status Picker Modal */}
        <Modal visible={showStatusPicker} animationType="fade" transparent={true}>
          <View className="flex-1 bg-black/50 justify-center items-center p-6">
            <View className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl">
              <Text className="text-xl font-black mb-6 text-primary dark:text-white">Order Status</Text>
              {STATUS_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => { setStatus(opt); setShowStatusPicker(false); }}
                  className={`p-4 rounded-xl mb-3 flex-row items-center justify-between ${status === opt ? 'bg-primary' : 'bg-slate-50 dark:bg-slate-800'}`}
                >
                  <Text className={`font-bold text-base ${status === opt ? 'text-white' : 'text-slate-700 dark:text-white'}`}>{opt}</Text>
                  {status === opt && <MaterialIcons name="check" size={20} color="white" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* Item Picker Modal */}
        <Modal visible={showItemPicker} animationType="slide" transparent={true}>
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white dark:bg-slate-900 rounded-t-3xl h-3/4 p-6">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-slate-900 dark:text-white">Select Item</Text>
                <TouchableOpacity onPress={() => setShowItemPicker(false)}>
                  <MaterialIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={inventoryItems}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => addItemFromInventory(item)}
                    className="p-4 border-b border-slate-100 dark:border-slate-800 flex-row justify-between items-center"
                  >
                    <View>
                      <Text className="text-base font-semibold text-slate-900 dark:text-white">{item.name}</Text>
                      <Text className="text-sm text-slate-500">Stock: {item.quantity || item.stock}</Text>
                    </View>
                    <Text className="text-base font-bold text-primary dark:text-white">{profile.currency_symbol || '$'}{(parseFloat(item.retail_price || item.price || 0) || 0).toFixed(2)}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Collect Advance Payment Modal */}
        <Modal visible={showAddAdvance} animationType="fade" transparent>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <View style={{ backgroundColor: 'white', borderRadius: 28, width: '100%', maxWidth: 380, padding: 24, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, elevation: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#262A56', marginBottom: 4 }}>Collect Advance Payment</Text>
              <Text style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
                Balance due: {profile.currency_symbol || '₹'}{balanceDueOnDelivery.toFixed(2)} from {selectedCustomer?.name || 'customer'}
              </Text>

              {/* Amount input */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 2, borderColor: '#e2e8f0', paddingHorizontal: 16, height: 56, marginBottom: 20 }}>
                <Text style={{ color: '#262A56', fontWeight: '900', fontSize: 20, marginRight: 8 }}>{profile.currency_symbol || '₹'}</Text>
                <TextInput
                  style={{ flex: 1, fontSize: 22, fontWeight: '900', color: '#262A56' }}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#cbd5e1"
                  value={extraAdvance}
                  onChangeText={setExtraAdvance}
                  autoFocus
                />
              </View>

              {/* Quick fill buttons */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {[0.25, 0.5, 1].map(pct => {
                  const amt = (balanceDueOnDelivery * pct).toFixed(0);
                  return (
                    <TouchableOpacity
                      key={pct}
                      onPress={() => setExtraAdvance(amt)}
                      style={{ flex: 1, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 10, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#262A56', fontWeight: '800', fontSize: 12 }}>{pct * 100}%</Text>
                      <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '700' }}>{profile.currency_symbol || '₹'}{amt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => { setShowAddAdvance(false); setExtraAdvance(''); }}
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center' }}
                >
                  <Text style={{ color: '#64748b', fontWeight: '900' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRecordExtraAdvance}
                  style={{ flex: 1.5, paddingVertical: 14, borderRadius: 14, backgroundColor: '#262A56', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                >
                  <MaterialIcons name="check" size={18} color="white" />
                  <Text style={{ color: 'white', fontWeight: '900' }}>Record</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
