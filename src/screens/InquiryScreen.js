import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, Alert, SafeAreaView } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/LanguageContext';

export default function InquiryScreen({ navigation }) {
  const { t } = useTranslation();
  const inquiries = useStore(state => state.inquiries);
  const deleteInquiry = useStore(state => state.deleteInquiry);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredInquiries = inquiries.filter(inq => {
    const matchesSearch = (inq.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (inq.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || inq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Inquiry',
      'Are you sure you want to delete this inquiry?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteInquiry(id) }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return '#f59e0b';
      case 'Followed Up': return '#3b82f6';
      case 'Closed': return '#10b981';
      default: return '#64748b';
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('CreateInquiry', { inquiry: item })}
      className="bg-white mx-4 mb-4 rounded-3xl p-5 shadow-sm border border-slate-100"
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-lg font-black text-primary">{item.customerName}</Text>
          <Text className="text-slate-400 text-xs font-medium">{item.contact || 'No contact info'}</Text>
        </View>
        <View style={{ backgroundColor: getStatusColor(item.status) + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
          <Text style={{ color: getStatusColor(item.status), fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>{item.status}</Text>
        </View>
      </View>

      <Text className="text-slate-600 text-sm mb-4 leading-5" numberOfLines={2}>
        {item.description || 'No description provided.'}
      </Text>

      <View className="flex-row justify-between items-center pt-4 border-t border-slate-50">
        <View className="flex-row items-center">
          <MaterialIcons name="event" size={14} color="#94a3b8" />
          <Text className="text-slate-400 text-xs ml-1 font-medium">{item.date}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white px-4 pb-4 pt-2 shadow-sm">
        <View className="flex-row items-center h-12 mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-2xl bg-slate-50">
            <MaterialIcons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text className="text-xl font-black text-slate-800 ml-3">Inquiries</Text>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-slate-100 px-4 h-12 rounded-2xl">
          <MaterialIcons name="search" size={20} color="#94a3b8" />
          <TextInput
            placeholder="Search inquiries..."
            className="flex-1 ml-2 text-slate-700 font-medium"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Tabs */}
        <View className="flex-row mt-4 gap-2">
          {['All', 'Pending', 'Followed Up', 'Closed'].map(status => (
            <TouchableOpacity 
              key={status}
              onPress={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl border ${statusFilter === status ? 'bg-primary border-primary' : 'bg-white border-slate-200'}`}
            >
              <Text className={`text-xs font-bold ${statusFilter === status ? 'text-white' : 'text-slate-500'}`}>{status}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredInquiries}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}
        ListEmptyComponent={() => (
          <View className="flex-1 items-center justify-center mt-20 px-10">
            <View className="w-20 h-20 bg-slate-100 rounded-full items-center justify-center mb-4">
              <MaterialCommunityIcons name="comment-search-outline" size={40} color="#cbd5e1" />
            </View>
            <Text className="text-slate-400 text-center font-medium">No inquiries found. Tap + to record a new lead.</Text>
          </View>
        )}
      />

      {/* FAB */}
      <TouchableOpacity 
        onPress={() => navigation.navigate('CreateInquiry')}
        className="absolute bottom-8 right-6 w-16 h-16 bg-primary rounded-full items-center justify-center shadow-xl"
        style={{ elevation: 5 }}
      >
        <MaterialIcons name="add" size={32} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
