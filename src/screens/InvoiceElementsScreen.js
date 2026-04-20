import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, SafeAreaView,
  TextInput, Image, Alert, Platform, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '../store/useStore';

export default function InvoiceElementsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const profile = useStore(state => state.profile);
  const updateProfile = useStore(state => state.updateProfile);

  const [name, setName] = useState(profile.name || '');
  const [address, setAddress] = useState(profile.address || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [email, setEmail] = useState(profile.email || '');
  const [logoUri, setLogoUri] = useState(profile.logo_uri || '');
  const [signatureUri, setSignatureUri] = useState(profile.signature_uri || '');
  const [paymentInstructions, setPaymentInstructions] = useState(profile.payment_instructions || '');
  const [bankDetails, setBankDetails] = useState(profile.bank_details || '');
  const [upiQrUri, setUpiQrUri] = useState(profile.upi_qr_uri || '');
  const [upiId, setUpiId] = useState(profile.upi_id || '');
  const [gstin, setGstin] = useState(profile.gstin || '');
  const [panNo, setPanNo] = useState(profile.pan_no || '');
  const [saving, setSaving] = useState(false);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library to upload images.');
      return false;
    }
    return true;
  };

  const pickLogo = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const pickSignature = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setSignatureUri(result.assets[0].uri);
    }
  };
  
  const pickUpiQr = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setUpiQrUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        ...profile,
        name,
        address,
        phone,
        email,
        logo_uri: logoUri,
        signature_uri: signatureUri,
        payment_instructions: paymentInstructions,
        bank_details: bankDetails,
        upi_qr_uri: upiQrUri,
        upi_id: upiId,
        gstin,
        pan_no: panNo,
      });
      Alert.alert('Saved', 'Invoice elements saved successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to save invoice elements.');
    } finally {
      setSaving(false);
    }
  };

  const SectionHeader = ({ label }) => (
    <Text className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 mb-3 mt-6">
      {label}
    </Text>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View
        style={{ paddingTop: Platform.OS === 'android' ? 40 : 10 }}
        className="flex-row items-center bg-white border-b border-slate-100 px-4 pb-4"
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 items-center justify-center rounded-full"
        >
          <MaterialIcons name="arrow-back" size={24} color="#262A56" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-bold text-primary">Invoice Elements</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary rounded-xl"
        >
          {saving
            ? <ActivityIndicator size="small" color="white" />
            : <Text className="text-white font-bold text-sm">Save</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 40) + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Business Details */}
        <SectionHeader label="Business Details" />
        <View className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm gap-4">
          <View>
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Company Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. JS Global Trading"
              className="w-full bg-slate-50 rounded-xl px-4 h-12 text-sm text-slate-900 border border-slate-100 font-medium"
            />
          </View>
          <View>
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Business Address</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="123 Street, City, Country"
              className="w-full bg-slate-50 rounded-xl px-4 h-12 text-sm text-slate-900 border border-slate-100 font-medium"
            />
          </View>
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Phone Number</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 234 567 890"
                keyboardType="phone-pad"
                className="w-full bg-slate-50 rounded-xl px-4 h-12 text-sm text-slate-900 border border-slate-100 font-medium"
              />
            </View>
          </View>
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">GSTIN</Text>
              <TextInput
                value={gstin}
                onChangeText={setGstin}
                placeholder="e.g. 07AAAAA0000A1Z5"
                autoCapitalize="characters"
                className="w-full bg-slate-50 rounded-xl px-4 h-12 text-sm text-slate-900 border border-slate-100 font-medium"
              />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">PAN NO.</Text>
              <TextInput
                value={panNo}
                onChangeText={setPanNo}
                placeholder="e.g. ABCDE1234F"
                autoCapitalize="characters"
                className="w-full bg-slate-50 rounded-xl px-4 h-12 text-sm text-slate-900 border border-slate-100 font-medium"
              />
            </View>
          </View>
        </View>
        {/* Company Logo */}
        <SectionHeader label="Company Logo" />
        <View className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <Text className="text-xs text-slate-400 mb-3">
            This logo will appear on your invoices. Recommended: 300×100px, PNG/JPG.
          </Text>
          <View className="flex-row items-center gap-4">
            <View className="w-32 h-20 rounded-xl bg-slate-100 border border-slate-200 items-center justify-center overflow-hidden">
              {logoUri
                ? <Image source={{ uri: logoUri }} className="w-full h-full" resizeMode="contain" />
                : (
                  <View className="items-center">
                    <MaterialIcons name="image" size={28} color="#cbd5e1" />
                    <Text className="text-[10px] text-slate-400 mt-1">No Logo</Text>
                  </View>
                )
              }
            </View>
            <View className="flex-1 gap-2">
              <TouchableOpacity
                onPress={pickLogo}
                className="flex-row items-center justify-center gap-2 px-4 py-3 bg-primary/10 rounded-xl border border-primary/20"
              >
                <MaterialIcons name="upload" size={18} color="#262A56" />
                <Text className="text-primary font-bold text-sm">Upload Logo</Text>
              </TouchableOpacity>
              {logoUri ? (
                <TouchableOpacity
                  onPress={() => setLogoUri('')}
                  className="flex-row items-center justify-center gap-2 px-4 py-2 bg-red-50 rounded-xl border border-red-100"
                >
                  <MaterialIcons name="delete-outline" size={16} color="#ef4444" />
                  <Text className="text-red-500 font-bold text-sm">Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* Authorized Signature */}
        <SectionHeader label="Authorized Signature" />
        <View className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <Text className="text-xs text-slate-400 mb-3">
            This signature will appear at the bottom of your invoices.
          </Text>
          <View className="flex-row items-center gap-4">
            <View className="w-32 h-16 rounded-xl bg-slate-100 border border-slate-200 items-center justify-center overflow-hidden">
              {signatureUri
                ? <Image source={{ uri: signatureUri }} className="w-full h-full" resizeMode="contain" />
                : (
                  <View className="items-center">
                    <MaterialIcons name="draw" size={24} color="#cbd5e1" />
                    <Text className="text-[10px] text-slate-400 mt-1">No Signature</Text>
                  </View>
                )
              }
            </View>
            <View className="flex-1 gap-2">
              <TouchableOpacity
                onPress={pickSignature}
                className="flex-row items-center justify-center gap-2 px-4 py-3 bg-primary/10 rounded-xl border border-primary/20"
              >
                <MaterialIcons name="upload" size={18} color="#262A56" />
                <Text className="text-primary font-bold text-sm">Upload Signature</Text>
              </TouchableOpacity>
              {signatureUri ? (
                <TouchableOpacity
                  onPress={() => setSignatureUri('')}
                  className="flex-row items-center justify-center gap-2 px-4 py-2 bg-red-50 rounded-xl border border-red-100"
                >
                  <MaterialIcons name="delete-outline" size={16} color="#ef4444" />
                  <Text className="text-red-500 font-bold text-sm">Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* UPI Payment */}
        <SectionHeader label="UPI Payment" />
        <View className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm gap-4">
          <View>
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">UPI ID</Text>
            <TextInput
              value={upiId}
              onChangeText={setUpiId}
              placeholder="e.g. business@upi or 9876543210@paytm"
              autoCapitalize="none"
              keyboardType="email-address"
              className="w-full bg-slate-50 rounded-xl px-4 h-12 text-sm text-slate-900 border border-slate-100 font-medium"
            />
            <Text className="text-[10px] text-slate-400 mt-1 ml-1">Auto-generates QR code on invoices. Or upload a custom QR below.</Text>
          </View>
          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Custom QR Code Image (Optional)</Text>
          <View className="flex-row items-center gap-4">
            <View className="w-24 h-24 rounded-xl bg-slate-100 border border-slate-200 items-center justify-center overflow-hidden">
              {upiQrUri
                ? <Image source={{ uri: upiQrUri }} className="w-full h-full" resizeMode="contain" />
                : (
                  <View className="items-center">
                    <MaterialIcons name="qr-code-2" size={28} color="#cbd5e1" />
                    <Text className="text-[10px] text-slate-400 mt-1">No QR</Text>
                  </View>
                )
              }
            </View>
            <View className="flex-1 gap-2">
              <TouchableOpacity
                onPress={pickUpiQr}
                className="flex-row items-center justify-center gap-2 px-4 py-3 bg-primary/10 rounded-xl border border-primary/20"
              >
                <MaterialIcons name="upload" size={18} color="#262A56" />
                <Text className="text-primary font-bold text-sm">Upload QR</Text>
              </TouchableOpacity>
              {upiQrUri ? (
                <TouchableOpacity
                  onPress={() => setUpiQrUri('')}
                  className="flex-row items-center justify-center gap-2 px-4 py-2 bg-red-50 rounded-xl border border-red-100"
                >
                  <MaterialIcons name="delete-outline" size={16} color="#ef4444" />
                  <Text className="text-red-500 font-bold text-sm">Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* Payment Instructions */}
        <SectionHeader label="Payment Instructions" />
        <View className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <Text className="text-xs text-slate-400 mb-2">
            E.g. "Pay Cheque to John Doe" or "Bank Transfer instructions"
          </Text>
          <TextInput
            value={paymentInstructions}
            onChangeText={setPaymentInstructions}
            placeholder="Enter payment instructions..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            className="w-full bg-slate-50 rounded-xl p-3 text-sm text-slate-900 border border-slate-100 font-medium"
            style={{ textAlignVertical: 'top', minHeight: 80 }}
          />
        </View>

        {/* Bank Details */}
        <SectionHeader label="Bank Details" />
        <View className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <Text className="text-xs text-slate-400 mb-2">
            E.g. Account No., IFSC, Bank Name, Branch
          </Text>
          <TextInput
            value={bankDetails}
            onChangeText={setBankDetails}
            placeholder="Enter bank details..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            className="w-full bg-slate-50 rounded-xl p-3 text-sm text-slate-900 border border-slate-100 font-medium"
            style={{ textAlignVertical: 'top', minHeight: 80 }}
          />
        </View>

        {/* Preview Note */}
        <View className="mt-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 flex-row items-start gap-3">
          <MaterialIcons name="info-outline" size={18} color="#3b82f6" />
          <Text className="flex-1 text-xs text-blue-600 leading-5">
            All changes will appear on newly generated PDF invoices. Open any invoice and tap Share → PDF to see the result.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
