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
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useStore } from '../store/useStore';
import Constants from 'expo-constants';
import { useTranslation } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs from Firebase/Google Console
const WEB_CLIENT_ID = '993971900127-up5903rc38rgnqj0hfds8ut1q6nhr2lp.apps.googleusercontent.com';
const ANDROID_CLIENT_ID = '993971900127-vas6uul1o1gccha8entmg1ba7ohqo1u1.apps.googleusercontent.com';

const GOOGLE_CONFIG = {
  clientId: WEB_CLIENT_ID,
  androidClientId: ANDROID_CLIENT_ID,
};

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint:         'https://oauth2.googleapis.com/token',
};



const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const login = useStore((state) => state.login);
  const loginWithGoogle = useStore((state) => state.loginWithGoogle);
  const statusBarHeight = Constants.statusBarHeight || 44;
  const { t } = useTranslation();
  const theme = useTheme();

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken || userInfo.idToken;
      if (!idToken) throw new Error('Could not obtain ID token from Google.');
      
      await loginWithGoogle(idToken);
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Google Play Services', 'Play Services not available or outdated.');
      } else {
        Alert.alert('Sign-In Failed', error.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) { setErrorMsg('Please enter your email and password.'); return; }
    setErrorMsg('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setErrorMsg('Invalid email or password.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMsg('Too many attempts. Please try again later.');
      } else if (code === 'auth/network-request-failed') {
        setErrorMsg('No internet connection.');
      } else {
        setErrorMsg(err?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = theme.primary || '#132175';
  const primaryDark = theme.primaryDark || '#132175';

  return (
    <View style={{ flex: 1, backgroundColor: '#fbf8ff' }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background Layer — Same diagonal style as Welcome */}
      <View className="absolute top-0 left-0 right-0 h-[45%] overflow-hidden z-0">
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: primaryDark }} />

        {/* Abstract Overlays */}
        <View
          className="absolute w-[200%] h-[100%] bg-[#2d3a8c] opacity-40 origin-top-left"
          style={{ top: '10%', left: '-20%', transform: [{ rotate: '-15deg' }] }}
        />
        <View
          className="absolute w-[200%] h-[100%] bg-white/5 opacity-50 origin-top-left"
          style={{ top: '25%', left: '-20%', transform: [{ rotate: '-25deg' }] }}
        />

        {/* White diagonal cut at bottom */}
        <View
          className="absolute w-[150%] h-[50%] bg-[#fbf8ff] origin-top-left"
          style={{ bottom: '-30%', left: '-10%', transform: [{ rotate: '-12deg' }] }}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        className="z-10 relative"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Bar */}
          <View
            className="w-full flex-row justify-between px-6"
            style={{ paddingTop: statusBarHeight + 16, marginBottom: 24 }}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="flex-row items-center border border-white/20 rounded-full px-3 py-1.5 gap-1 bg-black/10"
            >
              <MaterialIcons name="arrow-back" size={14} color="white" />
              <Text className="text-white text-xs font-semibold">{t('back') || 'Back'}</Text>
            </TouchableOpacity>

            <View className="flex-row items-center border border-white/20 rounded-full px-3 py-1.5 gap-1 bg-black/10">
              <MaterialIcons name="lock-outline" size={14} color="#6ee7b7" />
              <Text style={{ color: '#6ee7b7', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>SECURE</Text>
            </View>
          </View>

          {/* Brand / Lock Icon Card */}
          <View className="items-center justify-center mb-8">
            <View
              className="bg-white/10 rounded-[28px] border border-white/20 items-center justify-center shadow-lg"
              style={{
                width: 100,
                height: 100,
                shadowColor: primaryDark,
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.2,
                shadowRadius: 20,
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  backgroundColor: 'white',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 16, // Generous padding for original logo
                }}
              >
                <Image 
                  source={require('../../assets/icon.png')} 
                  style={{ width: '100%', height: '100%', borderRadius: 8 }}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>

          {/* Title */}
          <View className="items-center px-8 mb-2">
            <Text className="text-white text-2xl font-extrabold tracking-tight text-center">
              {t('welcomeBack') || 'Welcome Back'}
            </Text>
            <Text className="text-white/50 text-sm font-medium text-center mt-2">
              {t('signInDesc') || 'Sign in to your Zoxm Invoice account'}
            </Text>
          </View>

          {/* Form Card */}
          <View className="px-6 mt-8">
            <View
              className="bg-white rounded-3xl p-6 shadow-lg"
              style={{
                shadowColor: '#132175',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 20,
                elevation: 6,
              }}
            >
              {/* Email */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    color: '#767683',
                    fontSize: 10,
                    fontWeight: '700',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  {t('emailAddress') || 'Email Address'}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: focusedInput === 'email' ? '#f0eef8' : '#fbf8ff',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: focusedInput === 'email' ? primaryColor : '#e4e1e9',
                    paddingHorizontal: 16,
                    height: 52,
                  }}
                >
                  <MaterialIcons
                    name="mail-outline"
                    size={20}
                    color={focusedInput === 'email' ? primaryColor : '#94a3b8'}
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      marginLeft: 12,
                      color: '#1b1b21',
                      fontSize: 15,
                      height: '100%',
                    }}
                    placeholder="name@company.com"
                    placeholderTextColor="#b0aeb8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    color: '#767683',
                    fontSize: 10,
                    fontWeight: '700',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  {t('password') || 'Password'}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: focusedInput === 'password' ? '#f0eef8' : '#fbf8ff',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: focusedInput === 'password' ? primaryColor : '#e4e1e9',
                    paddingHorizontal: 16,
                    height: 52,
                  }}
                >
                  <MaterialIcons
                    name="lock-outline"
                    size={20}
                    color={focusedInput === 'password' ? primaryColor : '#94a3b8'}
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      marginLeft: 12,
                      color: '#1b1b21',
                      fontSize: 15,
                      height: '100%',
                    }}
                    placeholder="••••••••"
                    placeholderTextColor="#b0aeb8"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                    <MaterialIcons
                      name={showPassword ? 'visibility' : 'visibility-off'}
                      size={20}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot password */}
              <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 20, paddingVertical: 4 }}>
                <Text style={{ color: primaryColor, fontSize: 13, fontWeight: '700' }}>
                  {t('forgotPassword') || 'Forgot Password?'}
                </Text>
              </TouchableOpacity>

              {/* Error message */}
              {errorMsg ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', borderRadius: 10, padding: 10, marginBottom: 12, gap: 8 }}>
                  <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600', flex: 1 }}>{errorMsg}</Text>
                </View>
              ) : null}

              {/* Sign In button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                style={{
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: primaryColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  opacity: loading ? 0.75 : 1,
                  shadowColor: primaryColor,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 8,
                }}
              >
                {loading
                  ? <ActivityIndicator color="white" />
                  : <>
                      <Text style={{ color: 'white', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 }}>
                        {t('signIn') || 'Sign In'}
                      </Text>
                      <MaterialIcons name="arrow-forward" size={18} color="white" />
                    </>
                }
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View className="flex-row items-center w-full my-6">
              <View className="flex-1 h-[1px] bg-[#e4e1e9]" />
              <Text className="mx-4 text-[11px] font-bold uppercase tracking-wider text-[#767683]">
                {t('orContinueWith') || 'Or continue with'}
              </Text>
              <View className="flex-1 h-[1px] bg-[#e4e1e9]" />
            </View>

            {/* Google Button */}
            <View className="items-center">
              <TouchableOpacity
                onPress={handleGoogleLogin}
                disabled={googleLoading}
                className="w-14 h-14 rounded-full bg-white border border-[#e4e1e9] items-center justify-center shadow-sm active:bg-slate-50"
                style={{ opacity: googleLoading ? 0.6 : 1 }}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color="#4285F4" />
                ) : (
                  <Image
                    source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }}
                    className="w-6 h-6"
                    resizeMode="contain"
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View className="mt-6 mb-4">
              <View className="flex-row items-center justify-center mb-3">
                <Text className="text-[#454651] text-[14px] font-medium mr-2">
                  {t('noAccount') || "Don't have an account?"}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('SignUp')}
                  className="flex-row items-center justify-center"
                >
                  <Text style={{ color: primaryColor }} className="font-black text-[14px] uppercase tracking-widest mr-1">
                    {t('signUp') || 'SIGN UP'}
                  </Text>
                  <MaterialIcons name="arrow-forward" size={16} color={primaryColor} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('JoinBusiness')}
                style={{ alignItems: 'center', paddingVertical: 8 }}
              >
                <Text style={{ color: primaryColor, fontSize: 13, fontWeight: '700' }}>
                  🏢 Join a business with invite code
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
