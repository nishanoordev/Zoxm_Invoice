import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';

const InputField = ({ label, value, onChangeText, placeholder, keyboardType = 'default', prefix, multiline, numberOfLines }) => (
  <View className="mb-4">
    <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold mb-1.5 ml-1">{label}</Text>
    <View className={`flex-row items-center w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-primary/10 px-4 ${multiline ? 'h-32 py-2 items-start' : 'h-14'}`}>
      {prefix && <Text className={`mr-2 text-slate-500 font-medium ${multiline ? 'mt-1' : ''}`}>{prefix}</Text>}
      <TextInput
        className="flex-1 h-full text-base text-slate-900 dark:text-slate-100"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  </View>
);

export default function AddItemScreen({ navigation, route }) {
  const { item: existingItem } = route.params || {};
  const isEdit = !!existingItem;
  
  const profile = useStore(state => state.profile);
  const addItem = useStore(state => state.addItem);
  const updateItem = useStore(state => state.updateItem);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    description: '',
    retail_price: '',
    wholesale_price: '',
    mrp: '',
    quantity: '',
    unit: 'pcs',
    hsn_code: '',
    tax_percent: '',
    max_discount: '',
  });

  useEffect(() => {
    if (existingItem) {
      setFormData({
        id: existingItem.id,
        name: existingItem.name || '',
        sku: existingItem.sku || '',
        category: existingItem.category || '',
        description: existingItem.description || '',
        retail_price: (existingItem.retail_price || existingItem.price || 0).toString(),
        wholesale_price: (existingItem.wholesale_price || 0).toString(),
        mrp: (existingItem.mrp || 0).toString(),
        quantity: (existingItem.quantity || existingItem.stock || 0).toString(),
        unit: existingItem.unit || 'pcs',
        hsn_code: existingItem.hsnCode || existingItem.hsn_code || '',
        tax_percent: (existingItem.taxPercent || existingItem.tax_percent || 0).toString(),
        max_discount: (existingItem.maxDiscount || existingItem.max_discount || 0).toString(),
      });
    }
  }, [existingItem]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Item name is required');
      return;
    }

    const itemToSave = {
      ...formData,
      description: formData.description.trim(),
      retail_price: parseFloat(formData.retail_price) || 0,
      wholesale_price: parseFloat(formData.wholesale_price) || 0,
      mrp: parseFloat(formData.mrp) || 0,
      quantity: parseFloat(formData.quantity) || 0,
      tax_percent: parseFloat(formData.tax_percent) || 0,
      max_discount: parseFloat(formData.max_discount) || 0,
    };

    try {
      if (isEdit) {
        await updateItem(itemToSave);
      } else {
        await addItem(itemToSave);
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save item');
      console.error(error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View className="flex-row items-center bg-primary p-4 justify-between shadow-md">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full">
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold flex-1 ml-4">
            {isEdit ? 'Edit Inventory Item' : 'New Inventory Item'}
          </Text>
          <TouchableOpacity onPress={handleSave} className="bg-accent px-4 py-2 rounded-lg">
            <Text className="text-white font-bold">Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          className="flex-1 p-4"
          contentContainerStyle={{ paddingBottom: 150 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-white dark:bg-primary/5 rounded-2xl p-4 border border-primary/5 shadow-sm mb-6">
            <Text className="text-primary dark:text-accent font-bold text-lg mb-4">Inventory Details</Text>
            
            <InputField 
              label="Item Name *" 
              value={formData.name} 
              onChangeText={(val) => setFormData({...formData, name: val})}
              placeholder="e.g. Wireless Mouse M350"
            />

            <InputField 
              label="Description" 
              value={formData.description} 
              onChangeText={(val) => setFormData({...formData, description: val})}
              placeholder="Enter item details..."
              multiline={true}
              numberOfLines={3}
            />

            <View className="flex-row gap-4">
              <View className="flex-1">
                <InputField 
                  label="SKU / Barcode" 
                  value={formData.sku} 
                  onChangeText={(val) => setFormData({...formData, sku: val})}
                  placeholder="SKU-123"
                />
              </View>
              <View className="flex-1">
                <InputField 
                  label="Category" 
                  value={formData.category} 
                  onChangeText={(val) => setFormData({...formData, category: val})}
                  placeholder="Electronics"
                />
              </View>
            </View>

            <InputField 
              label="HSN Code" 
              value={formData.hsn_code} 
              onChangeText={(val) => setFormData({...formData, hsn_code: val})}
              placeholder="e.g. 8471"
            />
          </View>

          <View className="bg-white dark:bg-primary/5 rounded-2xl p-4 border border-primary/5 shadow-sm mb-6">
            <Text className="text-primary dark:text-accent font-bold text-lg mb-4">Pricing & Stock</Text>
            
            <View className="flex-row gap-4">
              <View className="flex-1">
                <InputField 
                  label="Retail Price" 
                  value={formData.retail_price} 
                  onChangeText={(val) => setFormData({...formData, retail_price: val})}
                  placeholder="0.00"
                  keyboardType="numeric"
                  prefix={profile.currency_symbol || '$'}
                />
              </View>
              <View className="flex-1">
                <InputField 
                  label="Stock Quantity" 
                  value={formData.quantity} 
                  onChangeText={(val) => setFormData({...formData, quantity: val})}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View className="flex-row gap-4">
              <View className="flex-1">
                <InputField 
                  label="Wholesale Price" 
                  value={formData.wholesale_price} 
                  onChangeText={(val) => setFormData({...formData, wholesale_price: val})}
                  placeholder="0.00"
                  keyboardType="numeric"
                  prefix={profile.currency_symbol || '$'}
                />
              </View>
              <View className="flex-1">
                <InputField 
                  label="MRP" 
                  value={formData.mrp} 
                  onChangeText={(val) => setFormData({...formData, mrp: val})}
                  placeholder="0.00"
                  keyboardType="numeric"
                  prefix={profile.currency_symbol || '$'}
                />
              </View>
            </View>

            <View className="flex-row gap-4 mb-4">
              <View className="flex-1">
                <InputField 
                  label="Tax (%)" 
                  value={formData.tax_percent} 
                  onChangeText={(val) => setFormData({...formData, tax_percent: val})}
                  placeholder="0"
                  keyboardType="numeric"
                  prefix="%"
                />
              </View>
              <View className="flex-1">
                <InputField 
                  label="Max Discount (%)" 
                  value={formData.max_discount} 
                  onChangeText={(val) => setFormData({...formData, max_discount: val})}
                  placeholder="0"
                  keyboardType="numeric"
                  prefix="%"
                />
              </View>
            </View>

            <InputField 
              label="Unit" 
              value={formData.unit} 
              onChangeText={(val) => setFormData({...formData, unit: val})}
              placeholder="pcs, box, kg..."
            />
          </View>
          
          <View className="h-20" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
