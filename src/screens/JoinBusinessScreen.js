import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useStore } from '../store/useStore';

export default function JoinBusinessScreen({ navigation }) {
  const [mode, setMode] = useState('join'); // 'join' | 'create'

  // Shared fields
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');

  // Join-specific
  const [inviteCode, setInviteCode] = useState('');

  // Create-specific
  const [businessName, setBusinessName] = useState('');

  const [loading, setLoading]   = useState(false);
  const [focused, setFocused]   = useState(null);

  const staffJoin = useStore(s => s.staffJoin);
  const signUp    = useStore(s => s.signUp);

  const statusBarHeight = Constants.statusBarHeight || 44;
  const PRIMARY = '#132175';

  const border = (field) => ({
    borderBottomWidth: 1.5,
    borderBottomColor: focused === field ? PRIMARY : '#e4e1e9',
  });

  // ── Join as Staff ───────────────────────────────────────────
  const handleJoin = async () => {
    if (!name.trim() || !email.trim() || !password || !inviteCode.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields including the invite code.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password Mismatch', 'Your passwords do not match.');
      return;
    }
    try {
      setLoading(true);
      await staffJoin({ name: name.trim(), email: email.trim(), password, inviteCode: inviteCode.trim(), phone });
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to join business. Check your invite code.');
    } finally {
      setLoading(false);
    }
  };

  // ── Create as Owner ─────────────────────────────────────────
  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password || !businessName.trim()) {
      Alert.alert('Missing Fields', 'Name, email, business name, and password are required.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password Mismatch', 'Your passwords do not match.');
      return;
    }
    try {
      setLoading(true);
      const result = await signUp({ name: name.trim(), email: email.trim(), password, business: businessName.trim(), phone });
      if (result?.inviteCode) {
        Alert.alert(
          '🎉 Business Created!',
          `Your invite code for staff to join:\n\n${result.inviteCode}\n\nShare this with your team members.`,
          [{ text: 'Got it!', style: 'default' }]
        );
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create business account.');
    } finally {
      setLoading(false);
    }
  };

  const isJoin = mode === 'join';

  return (
    <View style={{ flex: 1, backgroundColor: '#fbf8ff' }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Blue diagonal header */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', overflow: 'hidden', zIndex: 0 }}>
        <View style={{ position: 'absolute', inset: 0, backgroundColor: PRIMARY }} />
        <View style={{ position: 'absolute', width: '200%', height: '100%', backgroundColor: '#2d3a8c', opacity: 0.4, top: '10%', left: '-20%', transform: [{ rotate: '-15deg' }] }} />
        <View style={{ position: 'absolute', width: '150%', height: '50%', backgroundColor: '#fbf8ff', bottom: '-30%', left: '-10%', transform: [{ rotate: '-12deg' }] }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, zIndex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Top bar */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: statusBarHeight + 12, paddingHorizontal: 20, marginBottom: 16 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
              <MaterialIcons name="lock-outline" size={12} color="#6ee7b7" />
              <Text style={{ color: '#6ee7b7', fontSize: 10, fontWeight: '800', marginLeft: 4, letterSpacing: 1 }}>SECURE</Text>
            </View>
          </View>

          {/* Page title */}
          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <Text style={{ fontSize: 28, fontWeight: '900', color: 'white', marginBottom: 4 }}>
              {isJoin ? 'Join a Business' : 'Create Business'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
              {isJoin ? 'Enter your invite code to join your team.' : 'Register your business and invite your staff.'}
            </Text>
          </View>

          {/* Mode toggle */}
          <View style={{ flexDirection: 'row', marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 4, marginBottom: 20 }}>
            {[['join', 'Join Team', 'group'], ['create', 'New Business', 'business']].map(([id, label, icon]) => (
              <TouchableOpacity
                key={id}
                onPress={() => setMode(id)}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  paddingVertical: 10, borderRadius: 13,
                  backgroundColor: mode === id ? 'white' : 'transparent',
                }}
              >
                <MaterialIcons name={icon} size={16} color={mode === id ? PRIMARY : 'rgba(255,255,255,0.7)'} />
                <Text style={{ fontWeight: '800', fontSize: 13, color: mode === id ? PRIMARY : 'rgba(255,255,255,0.7)' }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form card */}
          <View style={{ marginHorizontal: 16, backgroundColor: 'white', borderRadius: 24, padding: 24, marginBottom: 20, shadowColor: '#132175', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 6 }}>

            {/* Full Name */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#767683', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Full Name *</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', height: 42, ...border('name') }}>
                <MaterialIcons name="person" size={20} color={focused === 'name' ? PRIMARY : '#94a3b8'} />
                <TextInput style={{ flex: 1, marginLeft: 12, color: '#1b1b21', fontSize: 15 }} placeholder="Jane Doe" placeholderTextColor="#c6c5d3" value={name} onChangeText={setName} onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} />
              </View>
            </View>

            {/* Email */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#767683', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Email *</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', height: 42, ...border('email') }}>
                <MaterialIcons name="mail-outline" size={20} color={focused === 'email' ? PRIMARY : '#94a3b8'} />
                <TextInput style={{ flex: 1, marginLeft: 12, color: '#1b1b21', fontSize: 15 }} placeholder="name@company.com" placeholderTextColor="#c6c5d3" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
              </View>
            </View>

            {/* Business Name (create mode only) */}
            {!isJoin && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#767683', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Business Name *</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', height: 42, ...border('biz') }}>
                  <MaterialIcons name="business" size={20} color={focused === 'biz' ? PRIMARY : '#94a3b8'} />
                  <TextInput style={{ flex: 1, marginLeft: 12, color: '#1b1b21', fontSize: 15 }} placeholder="My Company Pvt. Ltd." placeholderTextColor="#c6c5d3" value={businessName} onChangeText={setBusinessName} onFocus={() => setFocused('biz')} onBlur={() => setFocused(null)} />
                </View>
              </View>
            )}

            {/* Invite Code (join mode only) */}
            {isJoin && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#767683', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Invite Code *</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', height: 42, ...border('code') }}>
                  <MaterialIcons name="vpn-key" size={20} color={focused === 'code' ? PRIMARY : '#94a3b8'} />
                  <TextInput style={{ flex: 1, marginLeft: 12, color: '#1b1b21', fontSize: 18, fontWeight: '900', letterSpacing: 3 }} placeholder="ABC123" placeholderTextColor="#c6c5d3" autoCapitalize="characters" maxLength={6} value={inviteCode} onChangeText={v => setInviteCode(v.toUpperCase())} onFocus={() => setFocused('code')} onBlur={() => setFocused(null)} />
                  {inviteCode.length === 6 && <MaterialIcons name="check-circle" size={20} color="#16a34a" />}
                </View>
                <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Ask your business owner for this 6-character code</Text>
              </View>
            )}

            {/* Password */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#767683', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Password *</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', height: 42, ...border('pwd') }}>
                <MaterialIcons name="lock-outline" size={20} color={focused === 'pwd' ? PRIMARY : '#94a3b8'} />
                <TextInput style={{ flex: 1, marginLeft: 12, color: '#1b1b21', fontSize: 15 }} placeholder="Min. 6 characters" placeholderTextColor="#c6c5d3" secureTextEntry value={password} onChangeText={setPassword} onFocus={() => setFocused('pwd')} onBlur={() => setFocused(null)} />
              </View>
            </View>

            {/* Confirm Password */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#767683', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Confirm Password *</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', height: 42, borderBottomWidth: 1.5, borderBottomColor: confirm && password !== confirm ? '#ef4444' : confirm && password === confirm ? '#16a34a' : focused === 'cfm' ? PRIMARY : '#e4e1e9' }}>
                <MaterialIcons name="lock-outline" size={20} color={confirm && password !== confirm ? '#ef4444' : confirm && password === confirm ? '#16a34a' : '#94a3b8'} />
                <TextInput style={{ flex: 1, marginLeft: 12, color: '#1b1b21', fontSize: 15 }} placeholder="Re-enter password" placeholderTextColor="#c6c5d3" secureTextEntry value={confirm} onChangeText={setConfirm} onFocus={() => setFocused('cfm')} onBlur={() => setFocused(null)} />
                {confirm.length > 0 && <MaterialIcons name={password === confirm ? 'check-circle' : 'error-outline'} size={20} color={password === confirm ? '#16a34a' : '#ef4444'} />}
              </View>
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              onPress={isJoin ? handleJoin : handleCreate}
              disabled={loading}
              style={{ height: 52, borderRadius: 14, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: loading ? 0.7 : 1, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 }}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <>
                    <MaterialIcons name={isJoin ? 'group-add' : 'business'} size={20} color="white" />
                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 }}>
                      {isJoin ? 'Join Business' : 'Create Business'}
                    </Text>
                  </>
              }
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
            <Text style={{ color: '#454651', fontSize: 14 }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: PRIMARY, fontWeight: '900', fontSize: 14 }}>LOG IN</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
