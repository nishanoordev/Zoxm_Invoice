import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';

export default function CreateInquiryScreen({ navigation, route }) {
  const inquiryToEdit = route.params?.inquiry;
  const isEditing = !!inquiryToEdit;

  const addInquiry = useStore(state => state.addInquiry);
  const updateInquiry = useStore(state => state.updateInquiry);

  const [form, setForm] = useState({
    customer_name: '',
    contact: '',
    description: '',
    status: 'Pending',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isEditing) {
      setForm({ ...inquiryToEdit, customer_name: inquiryToEdit.customerName || inquiryToEdit.customer_name });
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!form.customer_name.trim()) {
      Alert.alert('Error', 'Customer name is required');
      return;
    }

    try {
      if (isEditing) {
        await updateInquiry({ ...form, id: inquiryToEdit.id });
      } else {
        await addInquiry(form);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save inquiry');
    }
  };

  const statusOptions = ['Pending', 'Followed Up', 'Closed'];

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 h-16 border-b border-slate-100">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
          <MaterialIcons name="close" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-lg font-black text-slate-800">{isEditing ? 'Edit Inquiry' : 'New Inquiry'}</Text>
        <TouchableOpacity onPress={handleSave} className="bg-primary px-4 py-2 rounded-xl">
          <Text className="text-white font-bold text-xs uppercase">Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        {/* Customer Name */}
        <View className="mb-6">
          <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Customer Name</Text>
          <View className="flex-row items-center bg-slate-50 rounded-2xl px-4 border border-slate-100 h-14">
            <MaterialIcons name="person-outline" size={20} color="#94a3b8" />
            <TextInput
              className="flex-1 ml-3 text-slate-700 font-bold"
              placeholder="Enter name"
              value={form.customer_name}
              onChangeText={(text) => setForm({ ...form, customer_name: text })}
            />
          </View>
        </View>

        {/* Contact Info */}
        <View className="mb-6">
          <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Contact Details</Text>
          <View className="flex-row items-center bg-slate-50 rounded-2xl px-4 border border-slate-100 h-14">
            <MaterialIcons name="phone-iphone" size={20} color="#94a3b8" />
            <TextInput
              className="flex-1 ml-3 text-slate-700 font-bold"
              placeholder="Phone or email"
              value={form.contact}
              onChangeText={(text) => setForm({ ...form, contact: text })}
              keyboardType="email-address"
            />
          </View>
        </View>

        {/* Status */}
        <View className="mb-6">
          <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Status</Text>
          <View className="flex-row flex-wrap gap-2">
            {statusOptions.map(status => (
              <TouchableOpacity 
                key={status}
                onPress={() => setForm({ ...form, status })}
                className={`px-6 py-3 rounded-2xl border ${form.status === status ? 'bg-indigo-50 border-primary' : 'bg-slate-50 border-slate-100'}`}
              >
                <Text className={`text-sm font-bold ${form.status === status ? 'text-primary' : 'text-slate-500'}`}>{status}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View className="mb-6">
          <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Requirements / Details</Text>
          <View className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100 min-h-[150px]">
            <TextInput
              className="flex-1 text-slate-700 font-medium"
              placeholder="What is the customer looking for?"
              value={form.description}
              onChangeText={(text) => setForm({ ...form, description: text })}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
