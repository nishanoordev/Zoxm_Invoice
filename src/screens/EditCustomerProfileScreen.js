import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, Image, ActionSheetIOS, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Contacts from 'expo-contacts';

export default function EditCustomerProfileScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { customer } = route.params || {};
  const isEdit = !!customer?.id;

  const updateCustomer = useStore(state => state.updateCustomer);
  const deleteCustomer = useStore(state => state.deleteCustomer);
  const addCustomer = useStore(state => state.addCustomer);
  const profile = useStore(state => state.profile);
  const isINR = (profile?.currency_code || 'INR') === 'INR';

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
    photo: null,
    ...customer,
  });

  // ── Contact Picker State ──
  const [contactList, setContactList] = useState([]);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  // ── Confirm button pulse (Add mode) ──
  const pulse = useRef(new Animated.Value(1)).current;
  const isReady = formData.name.trim().length > 0;
  useEffect(() => {
    if (!isReady) { pulse.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isReady]);

  // ── Open contact picker for phone field ──
  const handlePickContact = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Contacts access is required.');
      return;
    }
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Image],
    });
    if (data.length === 0) {
      Alert.alert('No contacts', 'No contacts found on this device.');
      return;
    }
    setContactList(data);
    setShowContactPicker(true);
  };

  const handleSelectContact = (contact) => {
    const phone = contact.phoneNumbers?.[0]?.number?.replace(/[^0-9]/g, '').slice(-10) || '';
    const photo = contact.image?.uri || null;
    setFormData(prev => ({
      ...prev,
      name: prev.name || (contact.name || '').toUpperCase(),
      phone: phone || prev.phone,
      photo: photo || prev.photo,
    }));
    setShowContactPicker(false);
    setContactSearch('');
  };

  // ── Photo Picker (Edit mode only) ──
  const handlePickPhoto = () => {
    const options = ['Take Photo', 'Choose from Gallery', 'Import from Contacts', 'Remove Photo', 'Cancel'];
    const destructiveIndex = 3;
    const cancelIndex = 4;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex, title: 'Customer Photo' },
        (idx) => handlePhotoAction(idx)
      );
    } else {
      Alert.alert('Customer Photo', 'Choose an option', [
        { text: 'Take Photo', onPress: () => handlePhotoAction(0) },
        { text: 'Choose from Gallery', onPress: () => handlePhotoAction(1) },
        { text: 'Import from Contacts', onPress: () => handlePhotoAction(2) },
        { text: 'Remove Photo', onPress: () => handlePhotoAction(3), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handlePhotoAction = async (idx) => {
    if (idx === 0) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access is required.'); return; }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (!result.canceled) setFormData(prev => ({ ...prev, photo: result.assets[0].uri }));
    } else if (idx === 1) {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Gallery access is required.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      if (!result.canceled) setFormData(prev => ({ ...prev, photo: result.assets[0].uri }));
    } else if (idx === 2) {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Contacts access is required.'); return; }
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Image] });
      if (data.length === 0) { Alert.alert('No contacts', 'No contacts found on this device.'); return; }
      setContactList(data);
      setShowContactPicker(true);
    } else if (idx === 3) {
      setFormData(prev => ({ ...prev, photo: null }));
    }
  };

  // ── Delete ──
  const handleDelete = () => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${formData.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'DELETE CUSTOMER',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomer(customer.id);
              navigation.navigate('Customers');
            } catch (error) {
              Alert.alert('Error', error.message || 'Cannot delete customer.');
            }
          },
        },
      ]
    );
  };

  // ── Save ──
  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Required', 'Please enter the customer name.');
      return;
    }
    try {
      const processedData = { ...formData, name: formData.name.trim().toUpperCase() };
      if (isEdit) {
        await updateCustomer(processedData);
      } else {
        await addCustomer(processedData);
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save customer.');
    }
  };

  // ── Components ──
  const InputField = ({ icon, label, placeholder, value, onChangeText, keyboardType, multiline, mandatory }) => (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginLeft: 4 }}>
        <Text style={{ color: '#64748b', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>
          {label}
        </Text>
        {mandatory && (
          <Text style={{ color: '#f43f5e', fontWeight: '900', fontSize: 12, marginLeft: 3 }}>*</Text>
        )}
      </View>
      <View style={{
        flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center',
        backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9',
        paddingHorizontal: 16, shadowColor: '#64748b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
      }}>
        <View style={{ marginTop: multiline ? 16 : 0 }}>
          <MaterialIcons name={icon} size={20} color="#94a3b8" />
        </View>
        <TextInput
          style={{
            flex: 1, paddingVertical: 14, paddingHorizontal: 12,
            fontSize: 16, fontWeight: '700', color: '#1e293b',
            minHeight: multiline ? 100 : 50,
          }}
          placeholder={placeholder}
          placeholderTextColor="#cbd5e1"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
    </View>
  );


  const SettingRow = ({ icon, label, value, onPress, isSwitch }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row', alignItems: 'center', padding: 16,
        backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9'
      }}
    >
      <View style={{ width: 24, alignItems: 'center' }}>
        <MaterialIcons name={icon} size={22} color="#64748b" />
      </View>
      <View style={{ flex: 1, paddingLeft: 16 }}>
        <Text style={{ color: value ? '#94a3b8' : '#334155', fontSize: value ? 11 : 15, marginBottom: value ? 2 : 0 }}>
          {label}
        </Text>
        {value ? (
          <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700' }}>
            {value}
          </Text>
        ) : null}
      </View>
      <MaterialIcons name={isSwitch ? 'autorenew' : 'chevron-right'} size={22} color="#cbd5e1" />
    </TouchableOpacity>
  );

  // ════════════════════════════════════════════
  //  ADD MODE  –  Minimal, focused form
  // ════════════════════════════════════════════
  if (!isEdit) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfdff' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

          {/* Header – clean, no save button */}
          <View style={{
            backgroundColor: '#262A56',
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 20,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            shadowColor: '#262A56', shadowOpacity: 0.3, shadowRadius: 15, elevation: 10
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                <MaterialIcons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>Add New Customer</Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginTop: 1 }}>Fill details and confirm below</Text>
              </View>
            </View>
          </View>

          <ScrollView
            style={{ flex: 1, paddingHorizontal: 20 }}
            contentContainerStyle={{ paddingTop: 32, paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Hint label */}
            <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '600', marginBottom: 24, textAlign: 'center' }}>
              Enter basic details to quickly add a customer.{'\n'}
              <Text style={{ color: '#6366f1', fontWeight: '700' }}>More details can be added later from the profile.</Text>
            </Text>

            {/* Name – mandatory, always uppercase */}
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginLeft: 4 }}>
                <Text style={{ color: '#64748b', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                  Full Name / Business Name
                </Text>
                <Text style={{ color: '#f43f5e', fontWeight: '900', fontSize: 12, marginLeft: 3 }}>*</Text>
              </View>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: 'white', borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0',
                paddingHorizontal: 16,
                shadowColor: '#64748b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
              }}>
                <MaterialIcons name="person" size={20} color="#94a3b8" />
                <TextInput
                  style={{
                    flex: 1, paddingVertical: 16, paddingHorizontal: 12,
                    fontSize: 16, fontWeight: '700', color: '#1e293b', letterSpacing: 0.3,
                  }}
                  placeholder="Enter customer name"
                  placeholderTextColor="#cbd5e1"
                  value={formData.name}
                  onChangeText={(t) => setFormData(prev => ({ ...prev, name: t.toUpperCase() }))}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Phone – universal, digits only, inlined to prevent remount */}
            <View style={{ marginBottom: 4 }}>
              <Text style={{ color: '#64748b', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 }}>
                Phone Number
              </Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: 'white', borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0',
                paddingHorizontal: 16, overflow: 'hidden',
                shadowColor: '#64748b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
              }}>
                <MaterialIcons name="phone" size={20} color="#94a3b8" />
                <TextInput
                  style={{
                    flex: 1, paddingVertical: 16, paddingHorizontal: 12,
                    fontSize: 16, fontWeight: '700', color: '#1e293b', letterSpacing: 0.5,
                  }}
                  placeholder="Phone number (optional)"
                  placeholderTextColor="#cbd5e1"
                  value={formData.phone}
                  onChangeText={(t) => {
                    const digits = t.replace(/[^0-9+\-\s]/g, '');
                    setFormData(prev => ({ ...prev, phone: digits }));
                  }}
                  keyboardType="phone-pad"
                />
              </View>
              {/* Add from contacts – right-aligned link below field */}
              <TouchableOpacity
                onPress={handlePickContact}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8, gap: 5, paddingRight: 4 }}
              >
                <MaterialIcons name="contacts" size={15} color="#6366f1" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#6366f1' }}>Add from contacts</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* ── Fixed Confirm Footer ── */}
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 28,
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#f1f5f9',
            shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 10,
          }}>
            <Animated.View style={{ transform: [{ scale: isReady ? pulse : 1 }] }}>
              <TouchableOpacity
                onPress={handleSave}
                disabled={!isReady}
                activeOpacity={0.85}
                style={{
                  borderRadius: 20,
                  overflow: 'hidden',
                  backgroundColor: isReady ? '#262A56' : '#e2e8f0',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 17,
                  gap: 10,
                  shadowColor: isReady ? '#262A56' : 'transparent',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.35,
                  shadowRadius: 14,
                  elevation: isReady ? 8 : 0,
                }}
              >
                {/* Decorative left accent */}
                <View style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 6,
                  backgroundColor: isReady ? '#10b981' : 'transparent',
                  borderTopLeftRadius: 20, borderBottomLeftRadius: 20,
                }} />

                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: isReady ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <MaterialIcons
                    name={isReady ? 'check-circle' : 'person-add'}
                    size={17}
                    color={isReady ? '#10b981' : '#94a3b8'}
                  />
                </View>

                <Text style={{
                  fontSize: 16,
                  fontWeight: '900',
                  color: isReady ? '#ffffff' : '#94a3b8',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}>
                  Confirm & Add Customer
                </Text>

                {isReady && (
                  <MaterialIcons name="arrow-forward" size={18} color="rgba(255,255,255,0.6)" />
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Security note */}
            {isReady && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, gap: 5 }}>
                <MaterialIcons name="lock-outline" size={11} color="#94a3b8" />
                <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '600', letterSpacing: 0.3 }}>Securely saved to your account</Text>
              </View>
            )}
          </View>

        </KeyboardAvoidingView>

        {/* Contact Picker Modal */}
        <ContactPickerModal />
      </SafeAreaView>
    );
  }

  // ════════════════════════════════════════════
  //  EDIT MODE  –  Full detailed form
  // ════════════════════════════════════════════
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                <MaterialIcons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>
                Edit Customer
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!formData.name.trim()}
              style={{
                backgroundColor: formData.name.trim() ? '#10b981' : 'rgba(255,255,255,0.1)',
                paddingHorizontal: 20,
                paddingVertical: 9,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }}>SAVE</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar with photo picker */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8}>
              <View style={{
                width: 96, height: 96, borderRadius: 36, backgroundColor: 'white',
                shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, elevation: 6,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 4, borderColor: 'rgba(38,42,86,0.06)', overflow: 'hidden'
              }}>
                {formData.photo ? (
                  <Image source={{ uri: formData.photo }} style={{ width: 96, height: 96, borderRadius: 36 }} />
                ) : (
                  <Text style={{ fontSize: 28, fontWeight: '900', color: '#262A56' }}>
                    {formData.name ? formData.name.substring(0, 2).toUpperCase() : '??'}
                  </Text>
                )}
              </View>
              <View style={{
                position: 'absolute', bottom: -4, right: -4,
                backgroundColor: '#262A56', padding: 8, borderRadius: 14, borderWidth: 2, borderColor: 'white'
              }}>
                <MaterialIcons name="camera-alt" size={14} color="white" />
              </View>
            </TouchableOpacity>
            <Text style={{ marginTop: 12, color: '#262A56', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              Tap to change photo
            </Text>
          </View>

          {/* Form Fields */}
          {/* Name */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginLeft: 4 }}>
              <Text style={{ color: '#64748b', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>Full Name / Business Name</Text>
              <Text style={{ color: '#f43f5e', fontWeight: '900', fontSize: 12, marginLeft: 3 }}>*</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 16, shadowColor: '#64748b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <MaterialIcons name="person" size={20} color="#94a3b8" />
              <TextInput
                style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12, fontSize: 16, fontWeight: '700', color: '#1e293b', letterSpacing: 0.3 }}
                placeholder="Enter name"
                placeholderTextColor="#cbd5e1"
                value={formData.name}
                onChangeText={(t) => setFormData(prev => ({ ...prev, name: t.toUpperCase() }))}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={{ marginBottom: 4 }}>
            <Text style={{ color: '#64748b', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 }}>Phone Number</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 16, overflow: 'hidden', shadowColor: '#64748b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <MaterialIcons name="phone" size={20} color="#94a3b8" />
              <TextInput
                style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12, fontSize: 16, fontWeight: '700', color: '#1e293b', letterSpacing: 0.5 }}
                placeholder="Phone number (optional)"
                placeholderTextColor="#cbd5e1"
                value={formData.phone}
                onChangeText={(t) => setFormData(prev => ({ ...prev, phone: t.replace(/[^0-9+\-\s]/g, '') }))}
                keyboardType="phone-pad"
              />
            </View>
            <TouchableOpacity
              onPress={handlePickContact}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8, gap: 5, paddingRight: 4, marginBottom: 16 }}
            >
              <MaterialIcons name="contacts" size={15} color="#6366f1" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#6366f1' }}>Add from contacts</Text>
            </TouchableOpacity>
          </View>

          {/* Email */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#64748b', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 }}>Email Address</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 16, shadowColor: '#64748b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <MaterialIcons name="alternate-email" size={20} color="#94a3b8" />
              <TextInput
                style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12, fontSize: 16, fontWeight: '700', color: '#1e293b' }}
                placeholder="Optional email"
                placeholderTextColor="#cbd5e1"
                value={formData.email}
                onChangeText={(t) => setFormData(prev => ({ ...prev, email: t }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* GSTIN */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#64748b', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 }}>GSTIN Number</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 16, shadowColor: '#64748b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <MaterialIcons name="receipt" size={20} color="#94a3b8" />
              <TextInput
                style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12, fontSize: 16, fontWeight: '700', color: '#1e293b' }}
                placeholder="Enter GST number"
                placeholderTextColor="#cbd5e1"
                value={formData.gstin}
                onChangeText={(t) => setFormData(prev => ({ ...prev, gstin: t }))}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Address */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#64748b', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 }}>Registered Address</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'white', borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 16, shadowColor: '#64748b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <View style={{ marginTop: 16 }}><MaterialIcons name="location-pin" size={20} color="#94a3b8" /></View>
              <TextInput
                style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12, fontSize: 16, fontWeight: '700', color: '#1e293b', minHeight: 100 }}
                placeholder="Full shop/business address"
                placeholderTextColor="#cbd5e1"
                value={formData.address}
                onChangeText={(t) => setFormData(prev => ({ ...prev, address: t }))}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Convert to Supplier */}
          <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', marginTop: 10, marginBottom: 20 }}>
            <SettingRow
              icon="swap-horiz"
              label="Convert Account to Supplier"
              isSwitch
              onPress={() => Alert.alert('Premium Symmetry', 'This feature will be available in the upcoming Business Symmetry update.')}
            />
          </View>

          {/* Customer Settings */}
          <View style={{ marginBottom: 32 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, marginLeft: 4 }}>
              <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: '#262A56' }} />
              <Text style={{ color: '#64748b', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Customer Settings
              </Text>
            </View>
            <View style={{ backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' }}>
              <SettingRow
                icon="notifications-active"
                label="Customer SMS Settings"
                value="SMS will be sent on each entry"
                onPress={() => {}}
              />
              <SettingRow
                icon="translate"
                label="SMS Language"
                value="Bengali / English"
                onPress={() => {}}
              />
              <SettingRow
                icon="link"
                label="Transaction History Link"
                onPress={() => {}}
              />
            </View>
          </View>

          {/* Danger Zone */}
          <TouchableOpacity
            onPress={handleDelete}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 12, padding: 20, borderRadius: 24,
              backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3', marginBottom: 10
            }}
          >
            <MaterialIcons name="delete-outline" size={22} color="#f43f5e" />
            <Text style={{ color: '#f43f5e', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Delete Customer</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Contact Picker Modal */}
      <ContactPickerModal />
    </SafeAreaView>
  );

  // ── Contact Picker Modal (shared by both modes) ──
  function ContactPickerModal() {
    return (
      <Modal visible={showContactPicker} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '80%', paddingBottom: 30 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#262A56' }}>Import from Contacts</Text>
              <TouchableOpacity onPress={() => { setShowContactPicker(false); setContactSearch(''); }}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            {/* Search */}
            <View style={{ flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#f8fafc', borderRadius: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
              <MaterialIcons name="search" size={20} color="#94a3b8" />
              <TextInput
                style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 15, color: '#1e293b' }}
                placeholder="Search contacts..."
                placeholderTextColor="#cbd5e1"
                value={contactSearch}
                onChangeText={setContactSearch}
              />
            </View>
            {/* List */}
            <ScrollView keyboardShouldPersistTaps="handled">
              {contactList
                .filter(c => c.name && c.name.toLowerCase().includes(contactSearch.toLowerCase()))
                .slice(0, 50)
                .map((contact, i) => (
                  <TouchableOpacity
                    key={contact.id || i}
                    onPress={() => handleSelectContact(contact)}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f8fafc' }}
                  >
                    <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#262A5615', alignItems: 'center', justifyContent: 'center', marginRight: 14, overflow: 'hidden' }}>
                      {contact.image?.uri ? (
                        <Image source={{ uri: contact.image.uri }} style={{ width: 42, height: 42 }} />
                      ) : (
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#262A56' }}>{(contact.name || '?').charAt(0).toUpperCase()}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b' }}>{contact.name}</Text>
                      {contact.phoneNumbers?.[0]?.number ? (
                        <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{contact.phoneNumbers[0].number}</Text>
                      ) : null}
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#cbd5e1" />
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }
}
