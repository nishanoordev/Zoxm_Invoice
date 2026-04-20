import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/LanguageContext';

// ── Defined OUTSIDE the component so it's never recreated on every render.
// If it were inside, every keystroke causes a re-render which rebuilds the
// component definition, React sees a new type, unmounts + remounts the
// TextInput and the keyboard closes. ────────────────────────────────────────
const InputField = ({ label, icon, value, onChangeText, placeholder, keyboardType = 'default' }) => (
  <View className="mb-6">
    <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-2 ml-1">{label}</Text>
    <View className="flex-row items-center bg-white dark:bg-slate-900 rounded-2xl px-4 h-14 border border-slate-100 dark:border-slate-800 shadow-sm">
      <MaterialIcons name={icon} size={20} className="text-slate-400" />
      <TextInput
        className="flex-1 ml-3 text-slate-900 dark:text-slate-100 font-medium"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
      />
    </View>
  </View>
);

export default function EditProfileScreen({ navigation }) {
  const profile = useStore(state => state.profile);
  const updateProfile = useStore(state => state.updateProfile);

  const [name, setName] = useState(profile.name || '');
  const [email, setEmail] = useState(profile.email || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [address, setAddress] = useState(profile.address || '');
  const [role, setRole] = useState(profile.business_role || '');
  const { t } = useTranslation();

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Company name is required');
      return;
    }
    await updateProfile({
      ...profile,
      name,
      email,
      phone,
      address,
      business_role: role,
    });
    Alert.alert(t('success'), t('profileUpdated'));
    navigation.goBack();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-10 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800">
            <MaterialIcons name="arrow-back" size={22} className="text-slate-900 dark:text-slate-100" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('editProfile')}</Text>
          <TouchableOpacity onPress={handleSave} className="px-4 py-2 bg-[#121642] rounded-xl">
            <Text className="text-white font-bold">{t('save')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <InputField label={t('companyName')} icon="business" value={name} onChangeText={setName} placeholder="Your Company Name" />
          <InputField label={t('businessEmail')} icon="mail-outline" value={email} onChangeText={setEmail} placeholder="contact@company.com" keyboardType="email-address" />
          <InputField label={t('contactPhone')} icon="phone-android" value={phone} onChangeText={setPhone} placeholder="+1 234 567 890" keyboardType="phone-pad" />
          <InputField label={t('businessAddress')} icon="location-on" value={address} onChangeText={setAddress} placeholder="123 Street, City, Country" />
          <InputField label={t('businessRole')} icon="person-outline" value={role} onChangeText={setRole} placeholder="e.g. CEO, Manager, Owner" />
          
          <View className="h-20" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
