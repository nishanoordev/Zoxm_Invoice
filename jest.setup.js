// Jest Native module mocks
jest.mock('expo/src/winter/runtime.native', () => ({}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    getAllSync: jest.fn(() => []),
    getFirstSync: jest.fn(() => null),
    runSync: jest.fn(() => ({ lastInsertRowId: 1, changes: 1 })),
  })),
}));

// Mock FileSystem
const mockFileSystem = {
  documentDirectory: 'file:///mock/document/directory/',
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, isDirectory: false })),
  makeDirectoryAsync: jest.fn(),
  downloadAsync: jest.fn(),
  // EncodingType enum used by CsvService.exportToCsv
  EncodingType: {
    UTF8: 'utf8',
    Base64: 'base64',
  },
};

jest.mock('expo-file-system', () => mockFileSystem);
jest.mock('expo-file-system/legacy', () => mockFileSystem);

// Mock expo-sharing
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

// Mock MediaLibrary
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  saveToLibraryAsync: jest.fn(),
  createAssetAsync: jest.fn(),
}));

// Mock Haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock Expo AV (Audio)
jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(),
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({ sound: { playAsync: jest.fn(), setPositionAsync: jest.fn(), unloadAsync: jest.fn() } })),
    },
  },
}));

// Mock Camera
jest.mock('expo-camera', () => ({
  useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
  CameraView: 'CameraView',
}));

// Mock React Native Reanimated
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

