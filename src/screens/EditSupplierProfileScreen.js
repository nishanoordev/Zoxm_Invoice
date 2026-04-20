import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

export default function EditSupplierProfileScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { supplier } = route.params || {};
  const isEdit = !!supplier?.id;
  const updateSupplier = useStore(state => state.updateSupplier);
  const addSupplier = useStore(state => state.addSupplier);
  const deleteSupplier = useStore(state => state.deleteSupplier);
  const theme = useTheme();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    ...supplier
  });

  const handleDelete = () => {
    Alert.alert(
      "Delete Supplier",
      `Are you sure you want to delete ${formData.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSupplier(supplier.id);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Supplier name is required');
      return;
    }
    // Ensure name is saved in uppercase
    const saveData = { ...formData, name: formData.name.trim().toUpperCase() };

    try {
      if (isEdit) {
        await updateSupplier(saveData);
        Alert.alert('Success', 'Supplier profile updated', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await addSupplier(saveData);
        Alert.alert('Success', 'Supplier added successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Save supplier error:', error);
      Alert.alert('Error', `Failed to ${isEdit ? 'update' : 'add'} supplier`);
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfdff' }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Premium Navy Header */}
        <View style={{ 
          backgroundColor: '#262A56', 
          paddingHorizontal: 16, 
          paddingTop: 10,
          paddingBottom: 20,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          shadowColor: '#262A56', shadowOpacity: 0.3, shadowRadius: 15, elevation: 10
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View className="flex-row items-center gap-4">
              <TouchableOpacity 
                onPress={() => navigation.goBack()}
                className="w-10 h-10 items-center justify-center rounded-2xl bg-white/10"
              >
                <MaterialIcons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>
                {isEdit ? 'Supplier Profile' : 'New Supplier'}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={handleSave}
              disabled={!formData.name}
              className={`w-10 h-10 items-center justify-center rounded-2xl ${formData.name ? 'bg-emerald-500' : 'bg-white/10'}`}
            >
              <MaterialIcons name="check" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          className="flex-1 px-5" 
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Business Shield Section */}
          <View className="items-center mb-8">
            <View className="relative">
              <View className="w-28 h-28 rounded-[40px] bg-white shadow-2xl items-center justify-center border-4 border-[#262A5610]">
                <MaterialIcons name="local-shipping" size={48} color="#262A56" />
              </View>
              <TouchableOpacity style={{ backgroundColor: '#262A56' }} className="absolute -bottom-2 -right-2 p-3 rounded-2xl border-4 border-white shadow-lg">
                <MaterialIcons name="edit" size={18} color="white" />
              </TouchableOpacity>
            </View>
            <Text className="mt-4 text-[#262A56] font-black text-xl tracking-tight">{formData.name || 'NEW VENDOR'}</Text>
          </View>

          {/* Section: Business Details */}
          <View className="mb-8">
            <View className="flex-row items-center gap-2 mb-4 ml-1">
              <View className="w-1 h-4 rounded-full bg-[#262A56]" />
              <Text style={{ color: '#64748b', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Vendor Information
              </Text>
            </View>
            
            <View className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <View className="p-4 border-b border-slate-50">
                <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Supplier Name / Company</Text>
                <TextInput 
                  className="text-lg font-black text-[#262A56] uppercase"
                  placeholder="ENTER NAME"
                  placeholderTextColor="#cbd5e1"
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text.toUpperCase() }))}
                  autoCapitalize="characters"
                />
              </View>
              <View className="p-4 border-b border-slate-50">
                <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Email ID</Text>
                <TextInput 
                  className="text-lg font-bold text-[#262A56]"
                  placeholder="vendor@company.com"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formData.email}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                />
              </View>
              <View className="p-4">
                <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Mobile Number</Text>
                <TextInput 
                  className="text-lg font-black text-[#262A56]"
                  placeholder="10-digit number"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="phone-pad"
                  value={formData.phone}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text.replace(/[^0-9]/g, '').slice(0, 10) }))}
                  maxLength={10}
                />
              </View>
            </View>
          </View>

          {/* Section: Office Address */}
          <View className="mb-8">
            <View className="flex-row items-center gap-2 mb-4 ml-1">
              <View className="w-1 h-4 rounded-full bg-[#262A56]" />
              <Text style={{ color: '#64748b', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Logistics & Billing
              </Text>
            </View>
            <View className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
              <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Registered Address</Text>
              <TextInput 
                className="text-base font-bold text-[#262A56] leading-relaxed"
                placeholder="Enter workspace/office address"
                placeholderTextColor="#cbd5e1"
                multiline
                numberOfLines={3}
                style={{ textAlignVertical: 'top' }}
                value={formData.address}
                onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
              />
            </View>
          </View>

          {/* Danger Zone */}
          {isEdit && (
            <TouchableOpacity 
              onPress={handleDelete}
              className="flex-row items-center justify-center gap-3 p-5 rounded-3xl bg-rose-50 border border-rose-100 mb-20"
            >
              <MaterialIcons name="delete-outline" size={22} color="#f43f5e" />
              <Text style={{ color: '#f43f5e', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Remove Supplier</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Global Save Button (Bottom Sticky Overlay) */}
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 20),
          paddingTop: 16, backgroundColor: '#fdfdff'
        }}>
          <TouchableOpacity 
            onPress={handleSave}
            style={{ backgroundColor: '#262A56' }}
            className="w-full py-5 rounded-[24px] shadow-2xl shadow-[#262A56]/40 flex-row items-center justify-center gap-3"
          >
            <MaterialIcons name="save" size={24} color="white" />
            <Text className="text-white text-lg font-black uppercase tracking-wider">Save Supplier</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>

  );
}
