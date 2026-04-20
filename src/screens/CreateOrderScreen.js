import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Modal, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import DatePickerModal from '../components/DatePickerModal';

export default function CreateOrderScreen({ navigation }) {
  const items = useStore(state => state.items);
  const customers = useStore(state => state.customers);
  const addCustomer = useStore(state => state.addCustomer);
  const addOrder = useStore(state => state.addOrder);
  const addInvoice = useStore(state => state.addInvoice);
  const addPayment = useStore(state => state.addPayment);
  const invoices = useStore(state => state.invoices);
  const payments = useStore(state => state.payments);
  const profile = useStore(state => state.profile);
  
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [taxPercent, setTaxPercent] = useState('0');
  const [discountPercent, setDiscountPercent] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [lineItems, setLineItems] = useState([]);
  const [showItemOptions, setShowItemOptions] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState(null); // 'order' | 'delivery'
  
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const handleQuickAddCustomer = async () => {
    if (!newCustomerName.trim()) {
      alert('Customer name is required');
      return;
    }
    try {
      const saved = await addCustomer({
        name: newCustomerName,
        phone: newCustomerPhone,
        email: '',
        address: '',
        balance: 0
      });
      setSelectedCustomer(saved);
      setShowQuickAddCustomer(false);
      setShowCustomerPicker(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } catch (e) {
      alert('Failed to add customer');
    }
  };

  const addManualItem = () => {
    const newItem = {
      id: Date.now().toString(),
      name: '',
      description: '',
      qty: '1',
      rate: '0.00',
      total: 0
    };
    setLineItems([...lineItems, newItem]);
    setShowItemOptions(false);
  };

  const addItemFromInventory = (inventoryItem) => {
    const newItem = {
      id: Date.now().toString(),
      name: inventoryItem.name,
      description: inventoryItem.description || inventoryItem.category || '',
      rate: (inventoryItem.retail_price || inventoryItem.price || 0).toString(),
      qty: '1',
      total: inventoryItem.retail_price || inventoryItem.price || 0
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

  const removeLineItem = (id) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const calculateSubtotal = () => lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const subtotal = calculateSubtotal();
  const discountAmount = subtotal * (parseFloat(discountPercent) || 0) / 100;
  const afterDiscount = subtotal - discountAmount;
  const tax = afterDiscount * (parseFloat(taxPercent) || 0) / 100;
  const total = afterDiscount + tax;
  const availableCredit = React.useMemo(() => {
    if (!selectedCustomer?.id) return 0;
    const cid = selectedCustomer.id;
    const totalInvoiced = invoices
      .filter(inv => inv.customerId === cid || inv.customer_id === cid)
      .reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
    const totalPaid = payments
      .filter(p => p.customerId === cid || p.customer_id === cid)
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    return Math.max(0, totalPaid - totalInvoiced);
  }, [selectedCustomer, invoices, payments]);

  // Helper: saves an advance payment record linked to the customer
  const saveAdvancePaymentIfNeeded = async () => {
    const advance = parseFloat(advanceAmount);
    if (!advance || advance <= 0 || !selectedCustomer?.id) return;
    await addPayment({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      amount: advance,
      method: 'Advance',
      type: 'advance',
      date: new Date().toISOString().split('T')[0],
      notes: `Advance payment for order on ${orderDate}`,
    });
  };

  const handleSaveOrder = async () => {
    if (lineItems.length === 0) {
      alert('Please add at least one item.');
      return;
    }
    try {
      await addOrder({
        customerId: selectedCustomer?.id || '',
        customerName: selectedCustomer?.name || '',
        date: orderDate,
        deliveryDate: deliveryDate,
        status: 'Pending',
        subtotal,
        taxPercent: parseFloat(taxPercent) || 0,
        taxAmount: tax,
        discountPercent: parseFloat(discountPercent) || 0,
        discountAmount: discountAmount,
        total,
        advanceAmount: parseFloat(advanceAmount) || 0,
        items: lineItems,
      });
      await saveAdvancePaymentIfNeeded();
      const advance = parseFloat(advanceAmount);
      const msg = advance > 0
        ? `Order saved! Advance payment of ${profile.currency_symbol || '₹'}${advance.toFixed(2)} recorded.`
        : 'Order saved successfully!';
      alert(msg);
      navigation.goBack();
    } catch (e) {
      console.error('Save order error:', e);
      alert('Failed to save order. Please try again.');
    }
  };

  const handleSaveAndCreateInvoice = async () => {
    if (lineItems.length === 0) {
      alert('Please add at least one item.');
      return;
    }
    try {
      await addOrder({
        customerId: selectedCustomer?.id || '',
        customerName: selectedCustomer?.name || '',
        date: orderDate,
        deliveryDate: deliveryDate,
        status: 'Processing',
        subtotal,
        taxPercent: parseFloat(taxPercent) || 0,
        taxAmount: tax,
        discountPercent: parseFloat(discountPercent) || 0,
        discountAmount: discountAmount,
        total,
        advanceAmount: parseFloat(advanceAmount) || 0,
        items: lineItems,
      });
      await saveAdvancePaymentIfNeeded();
      navigation.navigate('CreateInvoice', { initialItems: lineItems, initialCustomer: selectedCustomer });
    } catch (e) {
      console.error('Save+Invoice error:', e);
      alert('Failed to save order.');
    }
  };

  const handleCompleteOrder = async () => {
    if (lineItems.length === 0) { alert('Please add at least one item.'); return; }
    if (!selectedCustomer) { alert('Please select a customer.'); return; }

    Alert.alert(
      'Complete Order & Create Invoice',
      'This will mark the order as Completed and automatically create an invoice. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete & Invoice',
          onPress: async () => {
            try {
              // 1. Create order as Completed
              const invoiceNumber = `#INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
              await addOrder({
                customerId: selectedCustomer?.id || '',
                customerName: selectedCustomer?.name || '',
                date: orderDate,
                deliveryDate: deliveryDate,
                status: 'Completed',
                subtotal,
                taxPercent: parseFloat(taxPercent) || 0,
                taxAmount: tax,
                discountPercent: parseFloat(discountPercent) || 0,
                discountAmount: discountAmount,
                total,
                advanceAmount: parseFloat(advanceAmount) || 0,
                items: lineItems,
              });

              // 2. Auto-create invoice from order
              await addInvoice({
                invoiceNumber,
                customerId: selectedCustomer?.id || '',
                customerName: selectedCustomer?.name || '',
                date: orderDate,
                dueDate: deliveryDate || orderDate,
                status: 'Pending',
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
                notes: `Generated from New Order`,
              });

              // 3. Save advance payment if entered
              await saveAdvancePaymentIfNeeded();

              const advance = parseFloat(advanceAmount);
              const advanceMsg = advance > 0 ? ` Advance of ${profile.currency_symbol || '₹'}${advance.toFixed(2)} recorded.` : '';
              alert(`Order completed! Invoice ${invoiceNumber} created.${advanceMsg}`);
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

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark pt-12">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-1 max-w-2xl mx-auto w-full">
          {/* Header — back button only; actions are in the footer */}
          <View className="flex-row items-center bg-primary p-4 pb-4 justify-between shadow-md">
            <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full">
              <MaterialIcons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-lg font-bold flex-1 ml-4">Create New Order</Text>
            <View className="w-10" />
          </View>

          <ScrollView className="flex-1 pb-24" contentContainerStyle={{ paddingBottom: 120 }}>
            {/* Order Details */}
            <View className="px-4 pt-6">
              <Text className="text-primary dark:text-accent text-xl font-bold mb-4">Order Details</Text>
              
              <View className="flex-col gap-4">
                <View className="flex-col w-full">
                  <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold mb-1.5 ml-1">Select Customer</Text>
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

                <View className="flex-row gap-4">
                  {/* ORDER DATE */}
                  <View className="flex-1">
                    <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold mb-1.5 ml-1">Order Date</Text>
                    <TouchableOpacity
                      onPress={() => { setActiveDateField('order'); setShowDatePicker(true); }}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-primary/10 h-14 px-4 flex-row items-center justify-between"
                    >
                      <Text className="text-base text-slate-900 dark:text-white">{orderDate}</Text>
                      <MaterialIcons name="calendar-today" size={18} color="#6366f1" />
                    </TouchableOpacity>
                  </View>

                  {/* DELIVERY DATE */}
                  <View className="flex-1">
                    <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold mb-1.5 ml-1">Expected Delivery</Text>
                    <TouchableOpacity
                      onPress={() => { setActiveDateField('delivery'); setShowDatePicker(true); }}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-primary/10 h-14 px-4 flex-row items-center justify-between"
                    >
                      <Text className={`text-base ${deliveryDate ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        {deliveryDate || 'Pick date'}
                      </Text>
                      <MaterialIcons name="event" size={18} color="#6366f1" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Calendar Date Picker Modal */}
                <DatePickerModal
                  visible={showDatePicker}
                  selectedDate={activeDateField === 'delivery' ? deliveryDate : orderDate}
                  onClose={() => setShowDatePicker(false)}
                  onSelect={(dateStr) => {
                    if (activeDateField === 'delivery') setDeliveryDate(dateStr);
                    else setOrderDate(dateStr);
                  }}
                />
              </View>
            </View>

            <View className="h-px bg-slate-100 dark:bg-slate-800 mx-4 my-8" />

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
                      <TouchableOpacity 
                        onPress={addManualItem}
                        className="flex-row items-center p-3 border-b border-slate-100 dark:border-slate-700"
                      >
                        <MaterialIcons name="edit" size={20} color="#64748b" />
                        <Text className="ml-3 text-slate-700 dark:text-slate-200 font-medium">Manual Entry</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => { setShowItemPicker(true); setShowItemOptions(false); }}
                        className="flex-row items-center p-3"
                      >
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
                        value={item.qty}
                        onChangeText={(val) => updateLineItem(item.id, 'qty', val)}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1">Rate</Text>
                      <TextInput 
                        className="bg-slate-50 dark:bg-primary/20 rounded-xl p-3 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700"
                        keyboardType="numeric"
                        value={item.rate}
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

              <View className="flex-row justify-between mb-6">
                <Text className="text-xl font-bold text-primary dark:text-accent">Total Amount</Text>
                <Text className="text-xl font-bold text-primary dark:text-accent">{profile.currency_symbol || '$'}{(parseFloat(total) || 0).toFixed(2)}</Text>
              </View>

              {/* Advance Payment */}
              <View className="border-t border-primary/10 pt-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <MaterialIcons name="payments" size={18} color="#059669" />
                  <Text className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">Advance Payment (Optional)</Text>
                </View>
                <View className="flex-row items-center bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/40 rounded-xl px-4 h-14">
                  <Text className="text-emerald-600 font-bold text-lg mr-2">{profile.currency_symbol || '₹'}</Text>
                  <TextInput
                    className="flex-1 text-base font-bold text-emerald-700 dark:text-emerald-400"
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor="#86efac"
                    value={advanceAmount}
                    onChangeText={setAdvanceAmount}
                  />
                </View>
                {parseFloat(advanceAmount) > 0 && (
                  <View className="flex-row items-center gap-2 mt-2 px-1">
                    <MaterialIcons name="info-outline" size={13} color="#059669" />
                    <Text className="text-xs text-emerald-600 font-medium">
                      {profile.currency_symbol || '₹'}{parseFloat(advanceAmount).toFixed(2)} will be recorded as advance for {selectedCustomer?.name || 'this customer'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Footer — two clear action buttons */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, backgroundColor: 'rgba(255,255,255,0.97)', borderTopWidth: 1, borderTopColor: '#e2e8f0', flexDirection: 'row', gap: 10 }}>
            {/* Save Draft */}
            <TouchableOpacity
              onPress={handleSaveOrder}
              style={{ flex: 1, height: 56, borderRadius: 14, borderWidth: 2, borderColor: '#262A56', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
            >
              <MaterialIcons name="save" size={18} color="#262A56" />
              <Text style={{ color: '#262A56', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }}>Save Draft</Text>
            </TouchableOpacity>

            {/* Complete & Invoice */}
            <TouchableOpacity
              onPress={handleCompleteOrder}
              style={{ flex: 1.6, height: 56, borderRadius: 14, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, shadowColor: '#10b981', shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 }}
            >
              <MaterialIcons name="receipt-long" size={18} color="white" />
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }}>Complete & Invoice</Text>
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
          <View className="flex-1 bg-black/50 justify-center items-center p-6 text-center">
            <View className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl">
              <Text className="text-xl font-black mb-6 text-primary dark:text-white uppercase tracking-tight text-center">Quick Add Customer</Text>
              
              <View className="flex-col gap-4">
                <View className="flex-col gap-1">
                  <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400 ml-1">Full Name</Text>
                  <TextInput 
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700"
                    placeholder="Customer Name"
                    placeholderTextColor="#94a3b8"
                    value={newCustomerName}
                    onChangeText={setNewCustomerName}
                  />
                </View>
                
                <View className="flex-col gap-1">
                  <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400 ml-1">Phone Number</Text>
                  <TextInput 
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700"
                    placeholder="Phone (Optional)"
                    placeholderTextColor="#94a3b8"
                    value={newCustomerPhone}
                    onChangeText={setNewCustomerPhone}
                    keyboardType="phone-pad"
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
                data={items}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
