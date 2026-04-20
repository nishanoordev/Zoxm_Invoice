import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, Animated, Easing, Vibration } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
// import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

// ── Global callback registry — avoids passing functions through navigation params,
// which React Navigation strips on Android. The caller registers a callback keyed
// by a session ID, the scanner calls it and removes it. ──────────────────────────
const _callbacks = {};
export function registerScanCallback(key, fn) { _callbacks[key] = fn; }
export function removeScanCallback(key) { delete _callbacks[key]; }

export default function ScannerScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedItem, setScannedItem] = useState(null);
  const [torch, setTorch] = useState(false);
  const getItemBySku = useStore(state => state.getItemBySku);
  const soundRef = useRef(null);

  // Load beep sound on mount
  useEffect(() => {
    /*
    const loadSound = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound: s } = await Audio.Sound.createAsync(
          require('../../assets/beep.mp3'),
          { shouldPlay: false }
        );
        soundRef.current = s;
      } catch (e) {
        console.log('Sound load error:', e);
      }
    };
    loadSound();
    */
    return () => {
      /* if (soundRef.current) soundRef.current.unloadAsync(); */
    };
  }, []);

  const playBeep = useCallback(async () => {
    try {
      Vibration.vibrate(200);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      /*
      if (soundRef.current) {
        // Reset position to start and play with forced volume/mode
        await soundRef.current.setPositionAsync(0);
        await soundRef.current.setVolumeAsync(1.0);
        await soundRef.current.playAsync();
      } else {
        // Fallback: load and play if ref was null for some reason
        const { sound } = await Audio.Sound.createAsync(require('../../assets/beep.mp3'), { shouldPlay: true, volume: 1.0 });
        soundRef.current = sound;
      }
      */
    } catch (e) {
      console.log('Beep error:', e);
    }
  }, []);
  const items = useStore(state => state.items);
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // Session key passed from the caller via navigation params
  const callbackKey = route.params?.callbackKey;

  // Animate scan line
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  const handleBarCodeScanned = useCallback(async ({ type, data }) => {
    if (scanned) return;
    setScanned(true);

    try {
      // Try to parse as Zoxm QR JSON first
      const parsed = JSON.parse(data);

      if (parsed.app === 'zoxm' && parsed.type === 'item') {
        let foundItem = null;
        if (parsed.sku) foundItem = await getItemBySku(parsed.sku);
        if (!foundItem && parsed.id) foundItem = items.find(i => i.id === parsed.id);

        if (foundItem) {
          await playBeep();
          setScannedItem(foundItem);
        } else {
          Alert.alert(
            'Item Not Found',
            `No item found with SKU "${parsed.sku || parsed.id}".\n\nThe item may have been deleted.`,
            [{ text: 'Scan Again', onPress: () => setScanned(false) }]
          );
        }
      } else {
        // Unknown JSON — try to find item by raw data
        const found = await getItemBySku(data) || items.find(i => i.name === data || i.id === data);
        if (found) {
          await playBeep();
          setScannedItem(found);
        } else {
          Alert.alert(
            'Unknown Code',
            `Scanned: "${data}"\n\nNo matching item found in inventory.`,
            [{ text: 'Scan Again', onPress: () => setScanned(false) }]
          );
        }
      }
    } catch {
      // Not valid JSON — treat as a plain barcode / SKU string
      try {
        const foundBySku = await getItemBySku(data);
        if (foundBySku) {
          await playBeep();
          setScannedItem(foundBySku);
          return;
        }
        // Also search by name or ID in the store as a fallback
        const foundInStore = items.find(
          i => i.sku === data || i.id === data || i.name?.toLowerCase() === data?.toLowerCase()
        );
        if (foundInStore) {
          await playBeep();
          setScannedItem(foundInStore);
        } else {
          Alert.alert(
            'No Match',
            `Barcode "${data}" not found in inventory. Make sure the item's SKU matches.`,
            [{ text: 'Scan Again', onPress: () => setScanned(false) }]
          );
        }
      } catch (err) {
        Alert.alert('Scan Error', 'An error occurred while looking up the item.', [
          { text: 'Scan Again', onPress: () => setScanned(false) }
        ]);
      }
    }
  }, [scanned, getItemBySku, items]);

  const handleAddToInvoice = () => {
    if (scannedItem) {
      // Try the global callback registry first (works cross-platform)
      if (callbackKey && _callbacks[callbackKey]) {
        _callbacks[callbackKey](scannedItem);
        removeScanCallback(callbackKey);
      } else if (route.params?.onItemScanned) {
        // Fallback for cases where a function was passed directly (iOS / dev)
        route.params.onItemScanned(scannedItem);
      }
    }
    navigation.goBack();
  };

  const handleScanAgain = () => {
    setScanned(false);
    setScannedItem(null);
  };

  // Permission not determined
  if (!permission) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <MaterialIcons name="camera" size={48} color="#666" />
        <Text style={{ color: '#999', marginTop: 16, fontSize: 16 }}>Loading camera...</Text>
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <View style={{
          width: 80, height: 80, borderRadius: 40, backgroundColor: '#272756',
          alignItems: 'center', justifyContent: 'center', marginBottom: 24,
        }}>
          <MaterialIcons name="camera-alt" size={40} color="#ec5b13" />
        </View>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>
          Camera Permission Required
        </Text>
        <Text style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 22 }}>
          To scan barcodes, ZOXM Invoice needs access to your camera. Your privacy is important — we only use the camera for scanning.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: '#ec5b13', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12,
          }}
        >
          <MaterialIcons name="camera" size={20} color="white" />
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#64748b', fontSize: 14, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_e', 'upc_a', 'code39', 'code128', 'datamatrix', 'pdf417'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          {/* Top Navigation */}
          <SafeAreaView>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              padding: 16, paddingTop: insets.top + 16,
            }}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                <MaterialIcons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>Barcode Scanner</Text>
              <TouchableOpacity
                onPress={() => setTorch(!torch)}
                style={{
                  width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22,
                  backgroundColor: torch ? '#ec5b13' : 'rgba(255,255,255,0.15)',
                }}
              >
                <MaterialIcons name={torch ? "flash-on" : "flash-off"} size={24} color="white" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Scanner Viewfinder */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {/* Instruction badge */}
            <View style={{
              position: 'absolute', top: 24, backgroundColor: 'rgba(39,39,86,0.8)',
              borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
            }}>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>
                Align Barcode within the frame
              </Text>
            </View>

            {/* Viewfinder */}
            <View style={{ width: 280, height: 160, alignItems: 'center', justifyContent: 'center' }}>
              {/* Corners */}
              <View style={{ position: 'absolute', top: 0, left: 0, width: 32, height: 32, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#ec5b13', borderTopLeftRadius: 16 }} />
              <View style={{ position: 'absolute', top: 0, right: 0, width: 32, height: 32, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#ec5b13', borderTopRightRadius: 16 }} />
              <View style={{ position: 'absolute', bottom: 0, left: 0, width: 32, height: 32, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#ec5b13', borderBottomLeftRadius: 16 }} />
              <View style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#ec5b13', borderBottomRightRadius: 16 }} />

              {/* Animated scan line */}
              <Animated.View style={{
                position: 'absolute', left: 16, right: 16, height: 2,
                backgroundColor: 'rgba(236,91,19,0.7)',
                shadowColor: '#ec5b13', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8,
                transform: [{ translateY: scanLineTranslate }],
              }} />
            </View>

            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, marginTop: 24 }}>
              {scanned ? 'Processing...' : 'Scan Item Barcode'}
            </Text>
          </View>

          {/* Scanned Item Result Card */}
          {scannedItem && (
            <View style={{
              margin: 16, padding: 20, backgroundColor: 'white', borderRadius: 20,
              shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 15,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{
                  width: 48, height: 48, borderRadius: 12, backgroundColor: '#272756',
                  alignItems: 'center', justifyContent: 'center', marginRight: 14,
                }}>
                  <MaterialIcons name="inventory-2" size={24} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>{scannedItem.name}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: '#94a3b8', marginTop: 2 }}>
                    SKU: {scannedItem.sku || 'N/A'} • {scannedItem.category || 'Uncategorized'}
                  </Text>
                </View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#ec5b13' }}>
                  ₹{(scannedItem.retail_price || scannedItem.price || 0).toFixed(2)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(callbackKey || route.params?.onItemScanned) && (
                  <TouchableOpacity
                    onPress={handleAddToInvoice}
                    style={{
                      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                      height: 48, borderRadius: 12, backgroundColor: '#272756',
                    }}
                  >
                    <MaterialIcons name="add-circle" size={18} color="white" />
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Add to Invoice</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleScanAgain}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                    height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0',
                  }}
                >
                  <MaterialIcons name="qr-code-scanner" size={18} color="#64748b" />
                  <Text style={{ color: '#64748b', fontWeight: '700', fontSize: 14 }}>Scan Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bottom Controls */}
          {!scannedItem && (
            <View style={{ padding: 16, paddingBottom: Math.max(insets.bottom, 24) }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={{
                    flex: 1, alignItems: 'center', justifyContent: 'center', height: 52,
                    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </CameraView>
    </View>
  );
}
