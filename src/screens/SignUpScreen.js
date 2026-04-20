import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import Constants from 'expo-constants';

export default function SignUpScreen({ navigation }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [phone, setPhone]             = useState('');
  const [business, setBusiness]       = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);

  const signUp       = useStore((state) => state.signUp);
  const loginAsGuest = useStore((state) => state.loginAsGuest);
  const statusBarHeight = Constants.statusBarHeight || 44;

  const passwordMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Missing Fields', 'Name, email, and password are required.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Your passwords do not match. Please check and try again.');
      return;
    }
    await signUp({ name: name.trim(), email: email.trim(), phone: phone.trim(), business: business.trim(), password });
  };

  /* helper: border colour for a field */
  const borderCls = (field) =>
    focusedInput === field
      ? 'border-[#132175] border-b-2'
      : 'border-[#c6c5d3]/50';

  return (
    <View className="flex-1 bg-[#fbf8ff]">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Blue diagonal background ── */}
      <View className="absolute top-0 left-0 right-0 h-[42%] overflow-hidden z-0">
        <View className="absolute inset-0 bg-[#132175]" />
        <View
          className="absolute w-[200%] h-[100%] bg-[#2d3a8c] opacity-40"
          style={{ top: '10%', left: '-20%', transform: [{ rotate: '-15deg' }] }}
        />
        <View
          className="absolute w-[200%] h-[100%] bg-white/5 opacity-50"
          style={{ top: '25%', left: '-20%', transform: [{ rotate: '-25deg' }] }}
        />
        {/* white diagonal cut */}
        <View
          className="absolute w-[150%] h-[50%] bg-[#fbf8ff]"
          style={{ bottom: '-30%', left: '-10%', transform: [{ rotate: '-12deg' }] }}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 relative z-10"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          className="px-6"
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top nav row ── */}
          <View
            className="w-full flex-row justify-between items-center mb-2"
            style={{ paddingTop: statusBarHeight + 4 }}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full bg-black/10 items-center justify-center"
            >
              <MaterialIcons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={loginAsGuest}
              className="flex-row items-center gap-1 px-4 py-2 rounded-full bg-black/10"
            >
              <MaterialIcons name="play-arrow" size={14} color="white" />
              <Text className="text-white text-xs font-bold">Try Demo</Text>
            </TouchableOpacity>
          </View>

          {/* ── Page title ── */}
          <View className="mb-3 pl-1 flex-row items-center justify-between">
            <View>
              <Text className="text-[28px] font-black text-white tracking-widest leading-[34px] mb-1">
                Create Account
              </Text>
              <Text className="text-[#dfe0ff] text-[13px]">
                Join ZOXM Invoice — it's free.
              </Text>
            </View>
            <View className="self-end">
              <View 
                className="bg-white/10 rounded-xl border border-white/20 items-center justify-center p-1"
                style={{ width: 44, height: 44 }}
              >
                <View className="bg-white rounded-lg items-center justify-center" style={{ width: 32, height: 32, padding: 6 }}>
                  <Image 
                    source={require('../../assets/icon.png')} 
                    style={{ width: '100%', height: '100%', borderRadius: 4 }}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* ── Main card ── */}
          <View className="bg-white rounded-[24px] px-6 pt-5 pb-5 shadow-sm border border-[#e4e1e9]/50 mb-3 w-full">

            {/* Step bar */}
            <View className="flex-row gap-1.5 mb-3">
              <View className="flex-1 h-1 rounded-full bg-[#132175]" />
              <View className="flex-1 h-1 rounded-full bg-[#e4e1e9]" />
              <View className="flex-1 h-1 rounded-full bg-[#e4e1e9]" />
            </View>
            <Text className="text-[10px] font-bold text-[#132175] tracking-wider mb-3">
              STEP 1 OF 3 — ACCOUNT DETAILS
            </Text>

            {/* Full Name */}
            <View className="mb-3">
              <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#767683] mb-1">
                Full Name *
              </Text>
              <View className={`flex-row items-center h-10 border-b ${borderCls('name')}`}>
                <MaterialIcons
                  name="person"
                  size={20}
                  color={focusedInput === 'name' ? '#132175' : '#767683'}
                />
                <TextInput
                  className="flex-1 ml-3 text-[#1b1b21] h-full text-[15px]"
                  placeholder="Jane Doe"
                  placeholderTextColor="#c6c5d3"
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {/* Email */}
            <View className="mb-3">
              <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#767683] mb-1">
                Email Address *
              </Text>
              <View className={`flex-row items-center h-10 border-b ${borderCls('email')}`}>
                <MaterialIcons
                  name="mail"
                  size={20}
                  color={focusedInput === 'email' ? '#132175' : '#767683'}
                />
                <TextInput
                  className="flex-1 ml-3 text-[#1b1b21] h-full text-[15px]"
                  placeholder="name@company.com"
                  placeholderTextColor="#c6c5d3"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {/* Phone */}
            <View className="mb-3">
              <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#767683] mb-1">
                Phone Number
              </Text>
              <View className={`flex-row items-center h-10 border-b ${borderCls('phone')}`}>
                <MaterialIcons
                  name="phone"
                  size={20}
                  color={focusedInput === 'phone' ? '#132175' : '#767683'}
                />
                <TextInput
                  className="flex-1 ml-3 text-[#1b1b21] h-full text-[15px]"
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#c6c5d3"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setFocusedInput('phone')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {/* Business Name */}
            <View className="mb-3">
              <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#767683] mb-1">
                Business Name
              </Text>
              <View className={`flex-row items-center h-10 border-b ${borderCls('business')}`}>
                <MaterialIcons
                  name="business"
                  size={20}
                  color={focusedInput === 'business' ? '#132175' : '#767683'}
                />
                <TextInput
                  className="flex-1 ml-3 text-[#1b1b21] h-full text-[15px]"
                  placeholder="My Company Pvt. Ltd."
                  placeholderTextColor="#c6c5d3"
                  value={business}
                  onChangeText={setBusiness}
                  onFocus={() => setFocusedInput('business')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {/* Password */}
            <View className="mb-3">
              <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#767683] mb-1">
                Password *
              </Text>
              <View className={`flex-row items-center h-10 border-b ${borderCls('password')}`}>
                <MaterialIcons
                  name="lock"
                  size={20}
                  color={focusedInput === 'password' ? '#132175' : '#767683'}
                />
                <TextInput
                  className="flex-1 ml-3 text-[#1b1b21] h-full text-[15px]"
                  placeholder="Min. 6 characters"
                  placeholderTextColor="#c6c5d3"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="pl-3 py-2">
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color="#767683"
                  />
                </TouchableOpacity>
              </View>
              {/* Password strength hint */}
              {password.length > 0 && (
                <View className="flex-row gap-1 mt-1.5">
                  <View className={`h-1 flex-1 rounded-full ${password.length >= 2 ? 'bg-red-400' : 'bg-[#e4e1e9]'}`} />
                  <View className={`h-1 flex-1 rounded-full ${password.length >= 6 ? 'bg-yellow-400' : 'bg-[#e4e1e9]'}`} />
                  <View className={`h-1 flex-1 rounded-full ${password.length >= 10 && /[A-Z]/.test(password) ? 'bg-green-400' : 'bg-[#e4e1e9]'}`} />
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View className="mb-4">
              <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#767683] mb-1">
                Confirm Password *
              </Text>
              <View
                className={`flex-row items-center h-10 border-b ${
                  passwordMismatch
                    ? 'border-red-400 border-b-2'
                    : passwordMatch
                    ? 'border-green-500 border-b-2'
                    : borderCls('confirm')
                }`}
              >
                <MaterialIcons
                  name="lock-outline"
                  size={20}
                  color={
                    passwordMismatch ? '#ef4444' : passwordMatch ? '#16a34a' : focusedInput === 'confirm' ? '#132175' : '#767683'
                  }
                />
                <TextInput
                  className="flex-1 ml-3 text-[#1b1b21] h-full text-[15px]"
                  placeholder="Re-enter your password"
                  placeholderTextColor="#c6c5d3"
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedInput('confirm')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} className="pl-3 py-2">
                  <MaterialIcons
                    name={showConfirm ? 'visibility' : 'visibility-off'}
                    size={20}
                    color="#767683"
                  />
                </TouchableOpacity>
              </View>
              {/* Inline feedback */}
              {passwordMismatch && (
                <View className="flex-row items-center gap-1 mt-1">
                  <MaterialIcons name="error-outline" size={13} color="#ef4444" />
                  <Text className="text-red-500 text-[11px] font-semibold">Passwords do not match</Text>
                </View>
              )}
              {passwordMatch && (
                <View className="flex-row items-center gap-1 mt-1">
                  <MaterialIcons name="check-circle" size={13} color="#16a34a" />
                  <Text className="text-green-600 text-[11px] font-semibold">Passwords match</Text>
                </View>
              )}
            </View>

            {/* Terms */}
            <Text className="text-[11px] text-[#767683] leading-4 mb-4">
              By creating an account you agree to our{' '}
              <Text className="font-bold text-[#132175]">Terms of Service</Text>
              {' '}and{' '}
              <Text className="font-bold text-[#132175]">Privacy Policy</Text>.
            </Text>

            {/* Create Account button */}
            <TouchableOpacity
              onPress={handleSignUp}
              className="w-full bg-[#132175] h-12 rounded-xl items-center justify-center flex-row shadow-md shadow-[#2d3a8c]/20"
            >
              <Text className="text-white font-bold text-[15px] tracking-wide">Create Account</Text>
              {/* secure badge */}
              <View className="bg-white/10 px-2 py-1 rounded gap-1 flex-row items-center border border-white/10 absolute right-4">
                <MaterialIcons name="lock-outline" size={12} color="white" />
                <Text className="text-[9px] text-white uppercase font-medium">Secure</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Social sign-up ── */}
          <View className="bg-white rounded-[24px] px-6 py-4 shadow-sm border border-[#e4e1e9]/50 mb-4">
            <View className="flex-row items-center mb-4">
              <View className="flex-1 h-[1px] bg-[#e4e1e9]" />
              <Text className="mx-4 text-[10px] font-bold text-[#767683] uppercase tracking-widest">
                Or Sign Up With
              </Text>
              <View className="flex-1 h-[1px] bg-[#e4e1e9]" />
            </View>

            <View className="items-center">
              <TouchableOpacity
                onPress={() => {/* Handle Google Sign Up */}}
                className="w-14 h-14 rounded-full bg-white border border-[#e4e1e9] items-center justify-center shadow-sm active:bg-slate-50"
              >
                <Image
                  source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }}
                  className="w-6 h-6"
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Footer: go to login ── */}
          <View className="mb-6 flex-row items-center justify-center w-full">
            <Text className="text-[#454651] text-[14px] font-medium mr-2">
              Already have an account?
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              className="flex-row items-center justify-center"
            >
              <Text className="text-[#132175] font-black text-[14px] uppercase tracking-widest mr-1">
                LOG IN
              </Text>
              <MaterialIcons name="arrow-forward" size={16} color="#132175" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
