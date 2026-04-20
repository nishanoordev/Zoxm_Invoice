import 'react-native-gesture-handler';
import 'react-native-reanimated';
// import * as Notifications from 'expo-notifications';
import './global.css';

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/database/db';
import { useStore } from './src/store/useStore';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const loadFromDb = useStore(state => state.loadFromDb);

  useEffect(() => {
    async function setupApp() {
      try {
        await initDatabase();
        await loadFromDb();
        setDbReady(true);
        
        // Request notifications permission (Disabled for Expo Go compatibility)
        /*
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        if (existingStatus !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
        */
      } catch (error) {
        console.error('App setup failed:', error);
        setDbReady(true);
      }
    }
    setupApp();
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#272756' }}>
        <ActivityIndicator size="large" color="#ec5b13" />
        <Text style={{ color: 'white', marginTop: 16, fontSize: 16, fontWeight: '600' }}>Loading Zoxm Invoice...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
      <StatusBar hidden={true} />
    </SafeAreaProvider>
  );
}
