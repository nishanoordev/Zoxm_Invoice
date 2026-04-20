import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, SafeAreaView, ScrollView, Platform, StatusBar, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';


// Configuration is handled in src/services/authService.js

const { width } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  const statusBarHeight = Constants.statusBarHeight || 44;
  const loginAsGuest = useStore(state => state.loginAsGuest);
  const loginWithGoogle = useStore(state => state.loginWithGoogle);
  const { t } = useTranslation();
  const theme = useTheme();
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken || userInfo.idToken;
      if (!idToken) throw new Error('Could not obtain ID token from Google.');
      
      await loginWithGoogle(idToken);
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // in progress
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Google Play Services', 'Play Services not available or outdated.');
      } else {
        Alert.alert('Sign-In Failed', error.message || 'Google sign-in failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fbf8ff' }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Absolute Background Layer (Top 60% of Screen) */}
      <View className="absolute top-0 left-0 right-0 h-[60%] overflow-hidden z-0">
        <View style={{ ...{ position: 'absolute', bottom: 0, left: 0, right: 0, top: 0 }, backgroundColor: theme.primaryDark || '#132175' }} />
        
        {/* Abstract Blue Overlays */}
        <View 
          className="absolute w-[200%] h-[100%] bg-[#2d3a8c] opacity-40 origin-top-left"
          style={{ top: '10%', left: '-20%', transform: [{ rotate: '-15deg' }] }}
        />
        <View 
          className="absolute w-[200%] h-[100%] bg-white/5 opacity-50 origin-top-left"
          style={{ top: '25%', left: '-20%', transform: [{ rotate: '-25deg' }] }}
        />
        
        {/* The White Diagonal Cut at the bottom */}
        <View 
          className="absolute w-[150%] h-[50%] bg-[#fbf8ff] origin-top-left"
          style={{ bottom: '-30%', left: '-10%', transform: [{ rotate: '-12deg' }] }}
        />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} className="z-10 relative">
        
        {/* Top Header Layer (with Safe Area) */}
        <View 
          className="w-full flex-row justify-between px-6 mb-4"
          style={{ paddingTop: statusBarHeight + 16 }}
        >
          <TouchableOpacity 
            onPress={loginAsGuest}
            className="flex-row items-center border border-white/20 rounded-full px-3 py-1.5 gap-1 bg-black/10"
          >
            <MaterialIcons name="play-arrow" size={14} color="white" />
            <Text className="text-white text-xs font-semibold">{t('demoMode')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => Alert.alert('Help & Support', 'Visit our Help Center at support.zoxm.com or tap to contact us.')}
            className="flex-row items-center border border-white/20 rounded-full px-3 py-1.5 gap-1 bg-black/10"
          >
            <MaterialIcons name="help-outline" size={14} color="white" />
            <Text className="text-white text-xs font-semibold">{t('help')}</Text>
          </TouchableOpacity>
        </View>

        {/* Floating Invoice Illustration */}
        <View className="items-center justify-center my-2 shadow-2xl relative mb-6">
          {/* Glass Effect Outer Container */}
          <View 
            className="bg-white/10 rounded-[28px] p-3 border border-white/20 items-center justify-center shadow-lg shadow-[#132175]/30 transform" 
            style={{ width: width * 0.55, aspectRatio: 3/4, transform: [{ rotate: '-2deg' }] }}
          >
            {/* Inner Dashboard Card */}
            <View className="bg-white rounded-2xl w-full h-full p-5 shadow-sm overflow-hidden flex flex-col">
              
              {/* Card Header */}
              <View className="flex-row justify-between items-center mb-6">
                <Text style={{ color: theme.primary || '#132175' }} className="font-black text-lg tracking-widest">INVOICE</Text>
                <View className="w-8 h-8 bg-[#f5f2fa] rounded-full items-center justify-center">
                  <MaterialIcons name="send" size={14} color={theme.primary || '#132175'} />
                </View>
              </View>
              
              {/* Skeleton Lines */}
              <View className="h-1.5 w-1/3 bg-slate-200 rounded-full mb-2" />
              <View className="h-1.5 w-1/5 bg-slate-200 rounded-full mb-6" />
              
              {/* Simulated Rows */}
              <View className="h-10 w-full bg-[#fbf8ff] rounded-lg mb-3 flex-row items-center px-3 justify-between border border-[#e4e1e9]/50">
                <View className="h-2 w-1/4 bg-slate-300 rounded-full" />
                <View className="h-2 w-1/6 bg-[#cbd0f9] rounded-full" />
              </View>
              <View className="h-10 w-full bg-[#fbf8ff] rounded-lg mb-3 flex-row items-center px-3 justify-between border border-[#e4e1e9]/50">
                <View className="h-2 w-1/3 bg-slate-300 rounded-full" />
                <View className="h-2 w-1/5 bg-[#cbd0f9] rounded-full" />
              </View>
              <View className="h-10 w-full bg-[#fbf8ff] rounded-lg flex-row items-center px-3 justify-between border border-[#e4e1e9]/50">
                <View className="h-2 w-1/4 bg-slate-300 rounded-full" />
                <View className="h-2 w-1/6 bg-[#cbd0f9] rounded-full" />
              </View>
              
              {/* Bottom Action Skeleton */}
              <View className="mt-auto flex-row justify-between items-end">
                <View className="h-4 w-1/4 bg-slate-200 rounded-full" />
                <View className="h-8 w-1/3 bg-[#132175] rounded-lg" />
              </View>
            </View>
          </View>
        </View>

        {/* Text and Actions Area */}
        <View className="flex-1 px-8 pt-2 pb-6 items-center bg-transparent mt-0 w-full mb-2 relative">
          
          <View className="mb-6 items-center">
            {/* Outer Glow Ring */}
            <View 
              style={{
                width: 100,
                height: 100,
                borderRadius: 36,
                backgroundColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View 
                className="bg-white rounded-[28px] p-4 shadow-2xl border border-white/50"
                style={{
                  width: 80,
                  height: 80,
                  shadowColor: '#132175',
                  shadowOffset: { width: 0, height: 15 },
                  shadowOpacity: 0.1,
                  shadowRadius: 25,
                  elevation: 12
                }}
              >
                <Image 
                  source={require('../../assets/icon.png')} 
                  style={{ width: '100%', height: '100%', borderRadius: 12 }}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
          
          <Text className="text-2xl font-extrabold text-[#1b1b21] text-center tracking-tight leading-tight w-full">
            {t('manageFinances')}
          </Text>
          
          <Text className="text-[#454651] text-[14px] font-medium text-center mt-2 w-full">
            {t('manageFinancesDesc')}
          </Text>

          {/* Dots Indicator */}
          <View className="flex-row items-center justify-center gap-2 mt-4 mb-6">
            <View style={{ backgroundColor: theme.primary || '#132175' }} className="w-8 h-1.5 rounded-full" />
            <View className="w-1.5 h-1.5 rounded-full bg-[#d4d7ff]" />
            <View className="w-1.5 h-1.5 rounded-full bg-[#d4d7ff]" />
            <View className="w-1.5 h-1.5 rounded-full bg-[#d4d7ff]" />
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('SignUp')}
            style={{ backgroundColor: theme.primary || '#132175' }}
            className="w-full py-4 rounded-[14px] items-center justify-center shadow-md active:opacity-80"
          >
            <Text className="text-white font-bold text-base">{t('signUpWithEmail')}</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center w-full my-4">
            <View className="flex-1 h-[1px] bg-[#e4e1e9]" />
            <Text className="mx-4 text-[11px] font-bold uppercase tracking-wider text-[#767683]">{t('orContinueWith')}</Text>
            <View className="flex-1 h-[1px] bg-[#e4e1e9]" />
          </View>

          {/* Google Button */}
          <TouchableOpacity 
            onPress={handleGoogleSignIn}
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

          {/* Footer Login Link */}
          <View className="mt-6 flex-row items-center justify-center w-full">
            <Text className="text-[#454651] text-[14px] font-medium mr-2">{t('alreadyAccount')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} className="flex-row items-center justify-center">
              <Text style={{ color: theme.primary || '#132175' }} className="font-black text-[14px] uppercase tracking-widest mr-1">{t('signIn')}</Text>
              <MaterialIcons name="arrow-forward" size={16} color={theme.primary || '#132175'} />
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
