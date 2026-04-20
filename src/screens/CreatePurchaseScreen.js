import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { formatAmount } from '../utils/formatters';

export default function CreatePurchaseScreen({ route, navigation }) {
  const profile = useStore(state => state.profile);
  const suppliers = useStore(state => state.suppliers);
  const items = useStore(state => state.items);
  const addPurchase = useStore(state => state.addPurchase);
  
  const initialSupplierId = route.params?.supplierId || null;
  const initialSupplierName = route.params?.supplierName || '';

  const [selectedSupplierId, setSelectedSupplierId] = useState(initialSupplierId);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState(initialSupplierName);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  const [lineItems, setLineItems] = useState([]);
  const [showItemPicker, setShowItemPicker] = useState(false);

  const [taxRate, setTaxRate] = useState('0');
  const [discountRate, setDiscountRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [manualItemName, setManualItemName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const sym = profile.currency_symbol || '₹';

  // Computed Supplier
  const selectedSupplier = useMemo(() => suppliers.find(s => s.id === selectedSupplierId) || null, [suppliers, selectedSupplierId]);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchQuery) return suppliers;
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
      (s.phone && s.phone.includes(supplierSearchQuery))
    );
  }, [suppliers, supplierSearchQuery]);

  // Totals
  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.rate) * parseFloat(item.qty) || 0), 0);
    const taxAmount = (subtotal * (parseFloat(taxRate) || 0)) / 100;
    const discountAmount = (subtotal * (parseFloat(discountRate) || 0)) / 100;
    const finalTotal = subtotal + taxAmount - discountAmount;
    
    return { subtotal, taxAmount, discountAmount, finalTotal };
  }, [lineItems, taxRate, discountRate]);

  // Add item to list
  const addItemFromInventory = (item) => {
    // Defaults to mrp or wholesale as cost price (can be edited by user)
    const costPrice = parseFloat(item.wholesalePrice) || parseFloat(item.retailPrice) || 0;
    setLineItems(prev => [...prev, {
      id: Date.now().toString() + Math.random(),
      itemId: item.id,
      name: item.name,
      qty: '1',
      rate: costPrice.toString(),
      hsnCode: item.hsnCode || item.hsn_code || '',
      total: costPrice
    }]);
    setShowItemPicker(false);
  };

  const updateLineItem = (id, field, value) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        let newItem = { ...item, [field]: value };
        const rate = parseFloat(newItem.rate) || 0;
        const qty = parseFloat(newItem.qty) || 0;
        newItem.total = rate * qty;
        return newItem;
      }
      return item;
    }));
  };

  const removeLineItem = (id) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSavePurchase = async () => {
    if (!selectedSupplierId && !supplierSearchQuery.trim()) {
      Alert.alert("Missing Supplier", "Please select or type a supplier name for this purchase bill.");
      return;
    }
    if (lineItems.length === 0) {
      Alert.alert("No Items", "Please add at least one item.");
      return;
    }

    setIsSubmitting(true);
    try {
      // BUG-2 FIX: If a name was typed but no supplier was selected from the dropdown,
      // auto-create the supplier so the purchase is linked to a real DB record.
      let resolvedSupplierId = selectedSupplierId;
      let resolvedSupplierName = selectedSupplier?.name || supplierSearchQuery.trim();
      if (!resolvedSupplierId && supplierSearchQuery.trim()) {
        const addSupplier = useStore.getState().addSupplier;
        const saved = await addSupplier({
          name: supplierSearchQuery.trim().toUpperCase(),
          phone: '',
          email: '',
          address: '',
          gstin: '',
        });
        resolvedSupplierId = saved.id;
        resolvedSupplierName = saved.name;
        setSelectedSupplierId(saved.id);
      }

      const dbItems = lineItems.map(item => ({
        itemId: item.itemId,
        name: item.name,
        quantity: parseFloat(item.qty),
        rate: parseFloat(item.rate),
        total: parseFloat(item.total)
      }));

      const newPurchase = {
        supplierId: resolvedSupplierId,
        supplierName: resolvedSupplierName,
        date: new Date().toISOString().split('T')[0],
        status: 'Paid',
        paymentMode: 'Cash',
        subtotal: totals.subtotal,
        taxPercent: parseFloat(taxRate) || 0,
        taxAmount: totals.taxAmount,
        discountPercent: parseFloat(discountRate) || 0,
        discountAmount: totals.discountAmount,
        total: totals.finalTotal,
        notes: notes,
        items: dbItems
      };

      await addPurchase(newPurchase);
      Alert.alert("Success", "Purchase bill recorded and stock updated!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fdfdff' }}>
      {/* ── Premium Header ── */}
      <View style={{ 
        backgroundColor: '#262A56', 
        paddingHorizontal: 20, 
        paddingTop: Platform.OS === 'ios' ? 10 : 40, 
        paddingBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: '#262A56', shadowOpacity: 0.3, shadowRadius: 15, elevation: 10
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-2xl bg-white/10">
            <MaterialIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>Record Purchase</Text>
          <TouchableOpacity 
            onPress={handleSavePurchase}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30"
            testID="btn-save-purchase"
          >
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {isSubmitting ? '...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Supplier Section Card */}
        <View style={{ 
          backgroundColor: '#fff', borderRadius: 28, padding: 20, marginBottom: 24,
          borderWidth: 1, borderColor: '#f1f5f9',
          shadowColor: '#64748b', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 5
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <View className="bg-indigo-50 p-2 rounded-xl">
              <MaterialIcons name="person" size={16} color="#4f46e5" />
            </View>
            <Text style={{ fontSize: 11, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Supplier Info</Text>
          </View>
          
          <View style={{ 
            flexDirection: 'row', alignItems: 'center', 
            backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0',
            paddingHorizontal: 16
          }}>
            <MaterialIcons name="search" size={20} color="#94a3b8" />
            <TextInput 
               testID="input-supplier-search"
               style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 16, fontWeight: '800', color: '#1e293b' }}
               placeholder="Search or type name..."
               placeholderTextColor="#94a3b8"
               value={supplierSearchQuery}
               onChangeText={(t) => { setSupplierSearchQuery(t); setShowSupplierDropdown(true); setSelectedSupplierId(null); }}
               onFocus={() => setShowSupplierDropdown(true)}
            />
          </View>

          {showSupplierDropdown && filteredSuppliers.length > 0 && (
            <View style={{ 
              backgroundColor: '#fff', borderRadius: 20, marginTop: 8, 
              borderWidth: 1, borderColor: '#f1f5f9',
              shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 10,
              overflow: 'hidden' 
            }}>
              {filteredSuppliers.slice(0, 5).map(s => (
                <TouchableOpacity 
                  key={s.id} 
                  style={{ 
                    padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
                    flexDirection: 'row', alignItems: 'center', gap: 12
                  }}
                  onPress={() => { setSelectedSupplierId(s.id); setSupplierSearchQuery(s.name); setShowSupplierDropdown(false); }}
                >
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justify: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#4f46e5' }}>{s.name[0].toUpperCase()}</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b' }}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Line Items Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View className="bg-emerald-50 p-2 rounded-xl">
              <MaterialIcons name="inventory" size={16} color="#10b981" />
            </View>
            <Text style={{ fontSize: 11, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Items Received</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setShowItemPicker(true)} 
            className="flex-row items-center gap-2 bg-indigo-50 px-4 py-2.5 rounded-xl border border-indigo-100"
          >
            <MaterialIcons name="add-circle" size={18} color="#4f46e5" />
            <Text style={{ color: '#4f46e5', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {lineItems.map((item, index) => (
          <View key={item.id} style={{ 
            backgroundColor: '#fff', padding: 20, borderRadius: 28, marginBottom: 16, 
            borderWidth: 1, borderColor: '#f1f5f9',
            shadowColor: '#64748b', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 4
          }}>
             <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
               <View style={{ flex: 1 }}>
                 <Text style={{ fontSize: 17, fontWeight: '900', color: '#1e293b' }} numberOfLines={1}>{item.name}</Text>
                 <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '800', marginTop: 2, textTransform: 'uppercase' }}>Line Item #{index + 1}</Text>
               </View>
               <TouchableOpacity 
                 onPress={() => removeLineItem(item.id)}
                 className="w-8 h-8 items-center justify-center rounded-full bg-rose-50"
               >
                 <MaterialIcons name="delete-outline" size={18} color="#f43f5e" />
               </TouchableOpacity>
             </View>
             
             <View style={{ flexDirection: 'row', gap: 16 }}>
               <View style={{ flex: 0.8 }}>
                 <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '900', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>HSN Code</Text>
                 <TextInput 
                   style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', fontWeight: '900', color: '#1e293b', fontSize: 15 }} 
                   keyboardType="numeric" 
                   value={item.hsnCode} 
                   onChangeText={t => updateLineItem(item.id, 'hsnCode', t.replace(/[^0-9]/g, '').slice(0, 8))} 
                   placeholder="HSN"
                 />
               </View>
               <View style={{ flex: 0.6 }}>
                 <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '900', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Qty</Text>
                 <TextInput 
                   testID="input-purchase-qty"
                   style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', fontWeight: '900', color: '#1e293b', fontSize: 15 }} 
                   keyboardType="numeric" 
                   value={item.qty} 
                   onChangeText={t => updateLineItem(item.id, 'qty', t)} 
                 />
               </View>
               <View style={{ flex: 1 }}>
                 <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '900', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Unit Cost ({sym})</Text>
                 <TextInput 
                   testID="input-purchase-rate"
                   style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', fontWeight: '900', color: '#1e293b', fontSize: 15 }} 
                   keyboardType="decimal-pad" 
                   value={item.rate} 
                   onChangeText={t => updateLineItem(item.id, 'rate', t)} 
                 />
               </View>
             </View>
             
             <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Item Total</Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#262A56' }}>{formatAmount(item.total, sym)}</Text>
             </View>
          </View>
        ))}

        {lineItems.length === 0 && (
          <View style={{ 
            paddingVertical: 64, alignItems: 'center', 
            backgroundColor: '#f8fafc', borderRadius: 28, marginBottom: 24, 
            borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dotted' 
          }}>
             <View className="bg-white p-4 rounded-full shadow-sm mb-4">
               <MaterialIcons name="shopping-cart" size={32} color="#94a3b8" />
             </View>
             <Text style={{ color: '#64748b', fontWeight: '900', fontSize: 14 }}>No items added yet</Text>
             <Text style={{ color: '#94a3b8', fontWeight: '700', fontSize: 12, marginTop: 4 }}>Tap "+ Add Item" to start recording</Text>
          </View>
        )}

        {/* Totals Summary Card */}
        <View style={{ 
          backgroundColor: '#fff', borderRadius: 32, padding: 24, 
          borderWidth: 1, borderColor: '#f1f5f9', marginTop: 8,
          shadowColor: '#262A56', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 8
        }}>
           <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
             <Text style={{ fontSize: 13, fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Subtotal</Text>
             <Text style={{ fontSize: 16, fontWeight: '950', color: '#262A56' }}>{formatAmount(totals.subtotal, sym)}</Text>
           </View>

           <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
               <MaterialIcons name="local-offer" size={14} color="#f43f5e" />
               <Text style={{ fontSize: 13, fontWeight: '900', color: '#f43f5e', textTransform: 'uppercase' }}>Discount %</Text>
             </View>
             <TextInput 
               style={{ width: 80, backgroundColor: '#fff1f2', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, fontWeight: '900', color: '#be123c', textAlign: 'right', fontSize: 15 }} 
               keyboardType="numeric" 
               value={discountRate} 
               onChangeText={setDiscountRate} 
             />
           </View>

           <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' }}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
               <MaterialIcons name="account-balance" size={14} color="#10b981" />
               <Text style={{ fontSize: 13, fontWeight: '900', color: '#10b981', textTransform: 'uppercase' }}>Tax (GST) %</Text>
             </View>
             <TextInput 
               style={{ width: 80, backgroundColor: '#ecfdf5', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, fontWeight: '900', color: '#047857', textAlign: 'right', fontSize: 15 }} 
               keyboardType="numeric" 
               value={taxRate} 
               onChangeText={setTaxRate} 
             />
           </View>

           <View style={{ height: 1, backgroundColor: '#f1f5f9', marginBottom: 20 }} />

           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
             <View>
               <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Final Amount</Text>
               <Text style={{ fontSize: 24, fontWeight: '950', color: '#262A56', marginTop: 2 }}>{formatAmount(totals.finalTotal, sym)}</Text>
             </View>
             <View className="bg-indigo-50 p-4 rounded-2xl">
               <MaterialIcons name="payments" size={28} color="#4f46e5" />
             </View>
           </View>
        </View>

      </ScrollView>

      {/* Item Picker Modal */}
      <Modal visible={showItemPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfdff' }}>
           {/* Modal Header */}
           <View style={{ 
             flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
             padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' 
           }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View className="bg-indigo-50 p-2 rounded-xl">
                  <MaterialIcons name="add-shopping-cart" size={20} color="#4f46e5" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#262A56' }}>Select Item</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowItemPicker(false)}
                className="w-10 h-10 items-center justify-center rounded-xl bg-slate-50"
              >
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
           </View>
           
           <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
             {/* Manual Item Entry Card */}
             <View style={{ padding: 20 }}>
                <View style={{ 
                  backgroundColor: '#fff', borderRadius: 28, padding: 20,
                  borderWidth: 1, borderColor: '#f1f5f9',
                  shadowColor: '#64748b', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 5
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <View className="bg-amber-50 p-1.5 rounded-lg">
                      <MaterialIcons name="edit" size={14} color="#d97706" />
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Manual Custom Item</Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput 
                      style={{ 
                        flex: 1, backgroundColor: '#f8fafc', padding: 14, borderRadius: 16, 
                        borderWidth: 1, borderColor: '#e2e8f0', fontWeight: '800', color: '#1e293b', fontSize: 15 
                      }}
                      placeholder="Enter item name..."
                      placeholderTextColor="#94a3b8"
                      value={manualItemName}
                      onChangeText={setManualItemName}
                    />
                    <TouchableOpacity 
                      onPress={() => {
                        if (!manualItemName.trim()) return;
                        setLineItems(prev => [...prev, {
                          id: 'manual_' + Date.now().toString(),
                          itemId: 'manual', 
                          name: manualItemName.trim(),
                          qty: '1',
                          rate: '0',
                          total: 0
                        }]);
                        setManualItemName('');
                        setShowItemPicker(false);
                      }}
                      className="bg-emerald-500 px-6 justify-center rounded-16 shadow-lg shadow-emerald-500/20"
                    >
                      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13, textTransform: 'uppercase' }}>Add</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700', marginTop: 10, textAlign: 'center' }}>
                    * Use this for items not in your inventory
                  </Text>
                </View>
              </View>

              {/* Inventory List Header */}
              <View style={{ paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>From Inventory</Text>
                  <View className="bg-indigo-50 px-2 py-0.5 rounded-md">
                    <Text style={{ color: '#4f46e5', fontSize: 9, fontWeight: '900' }}>{items.length}</Text>
                  </View>
                </View>
              </View>

              {/* Inventory Items */}
              <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
                {items.length > 0 ? (
                  items.map(item => (
                    <TouchableOpacity 
                      key={item.id}
                      onPress={() => addItemFromInventory(item)}
                      style={{ 
                        backgroundColor: '#fff', padding: 16, borderRadius: 24, marginBottom: 12, 
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
                        borderWidth: 1, borderColor: '#f1f5f9',
                        shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                          <MaterialIcons name="inventory-2" size={22} color="#4f46e5" />
                        </View>
                        <View>
                          <Text style={{ fontSize: 15, fontWeight: '900', color: '#262A56' }}>{item.name}</Text>
                          <View className="flex-row items-center gap-1.5 mt-1">
                            <Text style={{ fontSize: 10, fontWeight: '800', color: (item.stock || 0) > 0 ? '#10b981' : '#f43f5e', textTransform: 'uppercase' }}>
                              Stock: {item.stock || 0}
                            </Text>
                            <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#cbd5e1' }} />
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>
                              MRP: {formatAmount(item.retailPrice || 0, sym)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View className="w-10 h-10 items-center justify-center rounded-xl bg-indigo-50">
                        <MaterialIcons name="add" size={24} color="#4f46e5" />
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={{ paddingVertical: 64, alignItems: 'center' }}>
                    <MaterialIcons name="inventory" size={48} color="#cbd5e1" />
                    <Text style={{ color: '#94a3b8', fontWeight: '800', marginTop: 16 }}>No items in inventory</Text>
                  </View>
                )}
              </View>
            </ScrollView>
        </SafeAreaView>
      </Modal>

    </View>
  );
}
