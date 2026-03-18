import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground, SafeAreaView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ScannerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const bgImage = { uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABU0NIgaDHZXbyCRrDf3JAhbWs7A-mt4FtVRyLDpZP9hka4HV6Bib503vruvDyADru11O_ONwwfyDR1oeUWYjzRduZZFWrGkxrrutLxdm8PvyxUz19gHsYDw2mMzvmG60jrgNfFZtvFZM4BHhwmFqw-UpXAfqfhjdOFICb9a8GlAlZMoPu1GYwbvy1FJa1g6Mh9XCEZBWh6qmFIb6Nb3DHzlTzC_eiap3E7lyAvRxeV5Yo-yqngSMwzX8ql3LiE6CVG7M9qPAtba4' };

  return (
    <View className="flex-1 bg-black">
      <ImageBackground source={bgImage} className="flex-1" imageStyle={{ opacity: 0.8 }}>
        <View className="flex-1 bg-black/40">
          
          {/* Top Navigation */}
          <SafeAreaView className="bg-primary/20">
            <View className="flex-row items-center p-4 justify-between mt-8">
              <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full hover:bg-white/10">
                <MaterialIcons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text className="text-white text-lg font-bold tracking-tight">BillSnap Scanner</Text>
              <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-white/10">
                <MaterialIcons name="flashlight-on" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Scanner Viewfinder Core */}
          <View className="flex-1 items-center justify-center relative">
            <View className="absolute top-12 left-0 right-0 flex-row justify-center px-6 z-20">
              <View className="bg-primary/80 rounded-full px-6 py-2 border border-white/10">
                <Text className="text-white text-sm font-medium tracking-wide">Align QR code within the frame to scan</Text>
              </View>
            </View>

            <View className="relative w-64 h-64 md:w-80 md:h-80 items-center justify-center">
              <View className="absolute inset-0 border-2 border-transparent rounded-2xl shadow-[0_0_0_4000px_rgba(0,0,0,0.5)] z-0 pointer-events-none" />
              
              {/* Corner Indicators */}
              <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-accent rounded-tl-xl z-10" />
              <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-accent rounded-tr-xl z-10" />
              <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-accent rounded-bl-xl z-10" />
              <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-accent rounded-br-xl z-10" />
              
              {/* Scan Line */}
              <View className="absolute top-1/2 left-4 right-4 h-[2px] bg-accent/60 shadow-lg shadow-accent z-10" />
            </View>
            
            <Text className="text-white/80 text-sm font-bold uppercase tracking-widest mt-12 z-20">Scan Item QR Code</Text>
          </View>

          {/* Bottom Controls */}
          <View className="p-6 bg-black/60 pt-10" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
            <View className="flex-row items-center justify-center gap-6 mb-6">
              <TouchableOpacity className="w-12 h-12 rounded-full bg-white/10 items-center justify-center">
                <MaterialIcons name="image" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity className="w-20 h-20 rounded-full bg-accent items-center justify-center shadow-lg transform active:scale-95">
                <MaterialIcons name="photo-camera" size={36} color="white" />
              </TouchableOpacity>
              <TouchableOpacity className="w-12 h-12 rounded-full bg-white/10 items-center justify-center">
                <MaterialIcons name="history" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-4">
              <TouchableOpacity className="flex-1 items-center justify-center rounded-xl h-14 bg-white/10 border border-white/20">
                <Text className="text-white text-base font-bold">Enter Manually</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.goBack()} className="flex-1 items-center justify-center rounded-xl h-14 bg-primary border border-white/10 shadow-xl">
                <Text className="text-white text-base font-bold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </ImageBackground>
    </View>
  );
}
