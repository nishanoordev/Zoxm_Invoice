/**
 * Firebase Configuration — ZOXM Invoice
 * Account:  zoxm.apps@gmail.com
 * Project:  zoxm-invoice-1
 *
 * Services:
 *   ✅ Firebase Auth       — email/password, persisted via AsyncStorage
 *   ✅ Realtime Database   — live multi-device sync
 *   ❌ Analytics           — NOT included (crashes React Native / no browser env)
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            'AIzaSyB_w10e3GGinVsj9hIJZ5mY4U5dXJAztZs',
  authDomain:        'zoxm-invoice-1.firebaseapp.com',
  databaseURL:       'https://zoxm-invoice-1-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId:         'zoxm-invoice-1',
  storageBucket:     'zoxm-invoice-1.firebasestorage.app',
  messagingSenderId: '993971900127',
  appId:             '1:993971900127:web:06f5e834315b368436e36a',
  measurementId:     'G-NMLG2955T1'
};

// Guard against hot-reload re-initialisation (Expo Fast Refresh)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth — persisted to AsyncStorage so sessions survive app restarts
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Realtime Database — shared live data store for the whole business team
export const db = getDatabase(app);

export default app;
