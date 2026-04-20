import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Image, Modal, FlatList, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { printChallan } from '../utils/printChallan';

export default function ChallansScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { customers, items, invoices, challans, addChallan, profile } = useStore();

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [challanNumber, setChallanNumber] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [status, setStatus] = useState('draft');
  const [selectedItems, setSelectedItems] = useState([]);
  const [vehicleMode, setVehicleMode] = useState('');
  const [notes, setNotes] = useState('');

  // Modals Visibility
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);

  // Auto-populate from navigation params
  useEffect(() => {
    if (route.params?.invoice) {
      const inv = route.params.invoice;
      const cust = customers.find(c => c.id === (inv.customerId || inv.customer_id));
      if (cust) setSelectedCustomer(cust);
      setSelectedInvoice(inv);
      
      // Auto-load items from invoice if present
      if (inv.items && inv.items.length > 0) {
        setSelectedItems(inv.items.map(i => ({
          ...i,
          quantity: i.quantity || i.qty || 1
        })));
      }
    }
  }, [route.params?.invoice, customers]);

  // Generate Challan Number on mount
  useEffect(() => {
    const nextNum = (challans.length + 1).toString().padStart(3, '0');
    const year = new Date().getFullYear();
    setChallanNumber(`CH-${year}-${nextNum}`);
  }, [challans]);

  const handleAddItem = (item) => {
    const exists = selectedItems.find(i => i.id === item.id);
    if (exists) {
      setSelectedItems(selectedItems.map(i => 
        i.id === item.id ? { ...i, quantity: (i.quantity || 1) + 1 } : i
      ));
    } else {
      setSelectedItems([...selectedItems, { ...item, quantity: 1 }]);
    }
    setItemModalVisible(false);
  };

  const updateItemQuantity = (id, delta) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, (item.quantity || 1) + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleSave = async (printAfter = false) => {
    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    const challanData = {
      challanNumber,
      invoiceId: selectedInvoice?.id || '',
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      status,
      date,
      items: selectedItems,
      notes,
      vehicleMode
    };

    try {
      await addChallan(challanData);
      
      if (printAfter) {
        await printChallan(challanData, profile);
      }

      Alert.alert('Success', printAfter ? 'Challan saved and shared as PDF' : 'Challan saved successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save or print challan');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark pt-12">
      {/* Header */}
      <View className="flex-row items-center bg-background-light dark:bg-background-dark p-4 sticky top-0 z-10 border-b border-primary/10">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full">
          <MaterialIcons name="arrow-back" size={24} className="text-primary" />
        </TouchableOpacity>
        <Text className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight flex-1 ml-2">Create Delivery Challan</Text>
        <TouchableOpacity 
          onPress={() => handleSave(false)}
          className="flex-row items-center justify-center rounded-lg h-10 px-4 bg-primary gap-2"
        >
          <MaterialIcons name="check" size={20} color="white" />
          <Text className="text-white text-sm font-bold">Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 40) }}>
        
        {/* Basic DetailsSection */}
        <View className="flex-col gap-4 mb-6">
          <View className="flex-col gap-1">
            <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Select Customer</Text>
            <TouchableOpacity 
              onPress={() => setCustomerModalVisible(true)}
              className="flex-row items-center justify-between w-full rounded-lg border border-primary/20 bg-white dark:bg-slate-800 h-12 px-4 shadow-sm"
            >
              <Text className={`text-base ${selectedCustomer ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                {selectedCustomer ? selectedCustomer.name : 'Search or select customer...'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} className="text-accent" />
            </TouchableOpacity>
          </View>
          
          <View className="flex-row gap-4">
            <View className="flex-1 flex-col gap-1">
              <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Challan Date</Text>
              <TextInput 
                className="w-full rounded-lg border border-primary/20 bg-white dark:bg-slate-800 h-12 px-4 text-slate-900 dark:text-white" 
                value={date}
                onChangeText={setDate}
              />
            </View>
            <View className="flex-1 flex-col gap-1">
              <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Challan Number</Text>
              <TextInput 
                className="w-full rounded-lg border border-primary/20 bg-white dark:bg-slate-800 h-12 px-4 text-slate-900 dark:text-white" 
                value={challanNumber}
                onChangeText={setChallanNumber}
                placeholder="CH-2023-001" 
                placeholderTextColor="#cbd5e1" 
              />
            </View>
          </View>

          <View className="flex-col gap-1">
            <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Link to Invoice (Optional)</Text>
            <TouchableOpacity 
              onPress={() => setInvoiceModalVisible(true)}
              className="flex-row items-center justify-between w-full rounded-lg border border-primary/20 bg-white dark:bg-slate-800 h-12 px-4 shadow-sm"
            >
              <Text className={`text-base ${selectedInvoice ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                {selectedInvoice ? `Inv #${selectedInvoice.invoice_number}` : 'Select an existing invoice'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} className="text-accent" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Selection */}
        <View className="flex-col gap-3 mb-6">
          <Text className="text-slate-900 dark:text-slate-100 text-base font-bold">Challan Status</Text>
          <View className="flex-row gap-2">
            {[
              { id: 'draft', icon: 'edit-note', label: 'Draft' },
              { id: 'open', icon: 'rocket-launch', label: 'Open' },
              { id: 'delivered', icon: 'task-alt', label: 'Delivered' }
            ].map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setStatus(item.id)}
                className={`flex-1 flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${status === item.id ? 'border-primary bg-primary/5' : 'border-primary/10 bg-white dark:bg-slate-800'}`}
              >
                <MaterialIcons name={item.icon} size={24} className={status === item.id ? "text-primary" : "text-slate-400"} />
                <Text className={`text-xs font-semibold mt-1 ${status === item.id ? "text-primary" : "text-slate-600 dark:text-slate-300"}`}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Items Section */}
        <View className="flex-col gap-4 mb-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-slate-900 dark:text-slate-100 text-lg font-bold">Items to Deliver</Text>
            <View className="flex-row items-center gap-4">
              <TouchableOpacity 
                onPress={() => navigation.navigate('Scanner', { 
                  onItemScanned: (item) => handleAddItem(item) 
                })}
                className="flex-row items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg"
              >
                <MaterialIcons name="qr-code-scanner" size={18} className="text-primary" />
                <Text className="text-primary text-sm font-bold">Scan QR</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setItemModalVisible(true)}
                className="flex-row items-center gap-1"
              >
                <MaterialIcons name="add" size={18} className="text-primary" />
                <Text className="text-primary text-sm font-bold">Add Item</Text>
              </TouchableOpacity>
            </View>
          </View>

          {selectedItems.map((item, index) => (
            <View key={index} className="flex-row items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-primary/5 shadow-sm mb-3">
              <View className="bg-primary/10 rounded-lg w-16 h-16 items-center justify-center overflow-hidden">
                {item.img ? (
                   <Image source={{ uri: item.img }} className="w-full h-full object-cover" />
                ) : (
                  <MaterialIcons name="inventory" size={32} className="text-primary/30" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-slate-900 dark:text-slate-100 text-sm font-bold" numberOfLines={1}>{item.name}</Text>
                <Text className="text-slate-500 text-xs">{item.sku ? `SKU: ${item.sku}` : 'No SKU'} • {item.unit || 'pcs'}</Text>
              </View>
              <View className="flex-col items-end gap-2">
                <View className="flex-row items-center gap-3 bg-background-light dark:bg-slate-700 rounded-lg p-1">
                  <TouchableOpacity 
                    onPress={() => updateItemQuantity(item.id, -1)}
                    className="w-8 h-8 items-center justify-center rounded-md bg-white dark:bg-slate-600 shadow-sm"
                  >
                    <MaterialIcons name="remove" size={18} className="text-primary" />
                  </TouchableOpacity>
                  <Text className="text-sm font-bold w-6 text-center text-slate-900 dark:text-white">{item.quantity}</Text>
                  <TouchableOpacity 
                    onPress={() => updateItemQuantity(item.id, 1)}
                    className="w-8 h-8 items-center justify-center rounded-md bg-primary shadow-sm"
                  >
                    <MaterialIcons name="add" size={18} color="white" />
                  </TouchableOpacity>
                </View>
                <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{item.unit || 'Units'}</Text>
              </View>
            </View>
          ))}

          {selectedItems.length === 0 && (
            <View className="bg-white dark:bg-slate-800/50 p-8 rounded-2xl border border-dashed border-primary/20 items-center justify-center">
              <MaterialIcons name="inventory-2" size={48} className="text-primary/20 mb-2" />
              <Text className="text-slate-400 text-center font-medium">No items added yet</Text>
            </View>
          )}
        </View>

        {/* Additional Info */}
        <View className="flex-col gap-4">
          <View className="flex-col gap-1">
            <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Vehicle / Delivery Mode</Text>
            <TextInput 
              className="w-full rounded-lg border border-primary/20 bg-white dark:bg-slate-800 h-12 px-4 text-slate-900 dark:text-white" 
              placeholder="Vehicle No, Courier Name, etc." 
              placeholderTextColor="#cbd5e1" 
              value={vehicleMode}
              onChangeText={setVehicleMode}
            />
          </View>
          <View className="flex-col gap-1">
            <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Notes</Text>
            <TextInput 
              className="w-full rounded-lg border border-primary/20 bg-white dark:bg-slate-800 px-4 py-4 min-h-[100px] text-slate-900 dark:text-white" 
              placeholder="Add delivery instructions or remarks..." 
              placeholderTextColor="#cbd5e1" 
              multiline 
              textAlignVertical="top" 
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </View>

        {/* Action Button */}
        <View className="pt-6 pb-12">
          <TouchableOpacity 
            onPress={() => handleSave(true)}
            className="w-full bg-primary/10 flex-row items-center justify-center gap-2 py-4 rounded-xl border border-primary/20"
          >
            <MaterialIcons name="print" size={24} className="text-primary" />
            <Text className="text-primary font-bold">Save and Print Challan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Select Customer Modal */}
      <Modal visible={customerModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl h-[70%] p-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-slate-900 dark:text-white">Select Customer</Text>
              <TouchableOpacity onPress={() => setCustomerModalVisible(false)}>
                <MaterialIcons name="close" size={24} className="text-slate-500" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={customers}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => {
                    setSelectedCustomer(item);
                    setCustomerModalVisible(false);
                  }}
                  className="p-4 border-b border-slate-100 dark:border-slate-800"
                >
                  <Text className="text-base font-bold text-slate-900 dark:text-white">{item.name}</Text>
                  <Text className="text-sm text-slate-500">{item.phone || item.email || 'No contact info'}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View className="p-8 items-center">
                  <Text className="text-slate-500">No customers found</Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Select Item Modal */}
      <Modal visible={itemModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl h-[70%] p-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-slate-900 dark:text-white">Add Item</Text>
              <TouchableOpacity onPress={() => setItemModalVisible(false)}>
                <MaterialIcons name="close" size={24} className="text-slate-500" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={items}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => handleAddItem(item)}
                  className="flex-row items-center p-4 border-b border-slate-100 dark:border-slate-800 gap-4"
                >
                  <View className="w-12 h-12 bg-primary/10 rounded-lg items-center justify-center overflow-hidden">
                    {item.img ? <Image source={{ uri: item.img }} className="w-full h-full" /> : <MaterialIcons name="inventory" size={24} className="text-primary/30" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-slate-900 dark:text-white">{item.name}</Text>
                    <Text className="text-xs text-slate-500">{item.sku} • Stock: {item.stock}</Text>
                  </View>
                  <MaterialIcons name="add-circle-outline" size={24} className="text-primary" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View className="p-8 items-center">
                  <Text className="text-slate-500">No items available</Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Select Invoice Modal */}
      <Modal visible={invoiceModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl h-[70%] p-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-slate-900 dark:text-white">Link to Invoice</Text>
              <TouchableOpacity onPress={() => setInvoiceModalVisible(false)}>
                <MaterialIcons name="close" size={24} className="text-slate-500" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={invoices}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => {
                    setSelectedInvoice(item);
                    setInvoiceModalVisible(false);
                  }}
                  className="p-4 border-b border-slate-100 dark:border-slate-800"
                >
                  <Text className="text-base font-bold text-slate-900 dark:text-white">Invoice #{item.invoice_number}</Text>
                  <Text className="text-sm text-slate-500">{item.customer_name} • {item.date}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View className="p-8 items-center">
                  <Text className="text-slate-500">No invoices found</Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
