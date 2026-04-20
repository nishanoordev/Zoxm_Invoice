import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Modal, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as MailComposer from 'expo-mail-composer';
import { createFullBackup, restoreFullBackup } from '../database/BackupService';
import { useTranslation } from '../i18n/LanguageContext';

export default function BackupRestoreScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const loadFromDb = useStore(state => state.loadFromDb);
  const profile = useStore(state => state.profile);
  const { t } = useTranslation();

  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');

  // ═══════════════════════════════════════════════════════════
  // BACKUP LOGIC
  // ═══════════════════════════════════════════════════════════

  /** Create the backup JSON file on device and return its path */
  const createBackupFile = async () => {
    setStatusText('Creating backup...');
    const backupData = await createFullBackup();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
    const fileName = `ZOXM_Invoice_Backup_${timestamp[0]}_${timestamp[1].substring(0, 8)}.json`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backupData));
    return filePath;
  };

  /** Backup via system share sheet (user picks Google Drive / OneDrive / etc) */
  const handleShareBackup = async () => {
    try {
      setBackupModalVisible(false);
      setProcessing(true);
      const filePath = await createBackupFile();

      setStatusText('Opening share dialog...');
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Save Backup File',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('Backup Created', `Backup saved to:\n${filePath}`);
      }
    } catch (error) {
      Alert.alert('Backup Failed', error.message);
    } finally {
      setProcessing(false);
      setStatusText('');
    }
  };

  /** Backup on device (local save only) */
  const handleBackupOnDevice = async () => {
    try {
      setBackupModalVisible(false);
      setProcessing(true);
      const filePath = await createBackupFile();

      // Get file info for size
      const info = await FileSystem.getInfoAsync(filePath);
      const sizeKB = info.size ? (info.size / 1024).toFixed(1) : '?';

      Alert.alert(
        '✅ Backup Saved',
        `Your complete data backup has been saved successfully.\n\nFile: ${filePath.split('/').pop()}\nSize: ${sizeKB} KB\n\nTip: Use "Share Backup File" to save a copy to Google Drive or OneDrive for extra safety.`
      );
    } catch (error) {
      Alert.alert('Backup Failed', error.message);
    } finally {
      setProcessing(false);
      setStatusText('');
    }
  };

  /** Backup via email */
  const handleEmailBackup = async () => {
    try {
      setBackupModalVisible(false);
      setProcessing(true);
      const filePath = await createBackupFile();

      setStatusText('Opening email...');
      const isAvailable = await MailComposer.isAvailableAsync();
      if (isAvailable) {
        await MailComposer.composeAsync({
          subject: `ZOXM Invoice Backup - ${new Date().toISOString().split('T')[0]}`,
          body: 'Please find attached your ZOXM Invoice data backup.\n\nTo restore, open the app → Settings → Backup & Restore → Restore → Restore from Device, and select this file.',
          attachments: [filePath],
        });
      } else {
        // Fall back to share sheet
        Alert.alert('Email Unavailable', 'Email is not configured. Using share dialog instead.');
        await Sharing.shareAsync(filePath, { mimeType: 'application/json' });
      }
    } catch (error) {
      Alert.alert('Email Backup Failed', error.message);
    } finally {
      setProcessing(false);
      setStatusText('');
    }
  };

  /** Cloud backup — uses share sheet targeted at the cloud app */
  const handleCloudBackup = (service) => {
    // Both Google Drive and OneDrive accept files through the system share sheet
    handleShareBackup();
  };

  // ═══════════════════════════════════════════════════════════
  // RESTORE LOGIC
  // ═══════════════════════════════════════════════════════════

  /** Pick a JSON file from device and restore */
  const handleRestoreFromDevice = async () => {
    try {
      setRestoreModalVisible(false);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return; // User cancelled
      }

      setProcessing(true);
      setStatusText('Reading backup file...');

      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name || 'backup';
      const content = await FileSystem.readAsStringAsync(fileUri);

      let backupData;
      try {
        backupData = JSON.parse(content);
      } catch (parseErr) {
        throw new Error('The selected file is not a valid JSON backup.');
      }

      // Validate
      if (!backupData.appName || (backupData.appName !== 'ZOXM Invoice' && backupData.appName !== 'ZoxmInvoice')) {
        throw new Error('Invalid backup file. Please select a valid ZOXM Invoice backup.');
      }

      // Count items for the confirmation dialog
      const tables = backupData.tables || backupData.data || {};
      const counts = [];
      if (tables.customers?.length) counts.push(`${tables.customers.length} customers`);
      if (tables.items?.length) counts.push(`${tables.items.length} items`);
      if (tables.invoices?.length) counts.push(`${tables.invoices.length} invoices`);
      if (tables.payments?.length) counts.push(`${tables.payments.length} payments`);
      if (tables.orders?.length) counts.push(`${tables.orders.length} orders`);

      const backupDate = backupData.createdAt?.split('T')[0] || 'unknown date';
      const countsSummary = counts.length > 0 ? `\n\nData includes:\n• ${counts.join('\n• ')}` : '';

      Alert.alert(
        'Restore Data?',
        `This will replace ALL your current data with the backup from ${backupDate}.${countsSummary}\n\n⚠️ This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setProcessing(false) },
          {
            text: 'Restore Now',
            style: 'destructive',
            onPress: async () => {
              try {
                setStatusText('Restoring data...');
                const totalRestored = await restoreFullBackup(backupData);
                
                setStatusText('Syncing app state...');
                await loadFromDb();

                setProcessing(false);
                setStatusText('');

                Alert.alert(
                  '✅ Restore Complete',
                  `Successfully restored ${totalRestored} records from backup.\n\nAll your data has been restored.`
                );
              } catch (restoreErr) {
                setProcessing(false);
                setStatusText('');
                Alert.alert('Restore Error', restoreErr.message);
              }
            },
          },
        ]
      );
    } catch (error) {
      setProcessing(false);
      setStatusText('');
      Alert.alert('Restore Failed', error.message);
    }
  };

  /** Cloud restore — for now, uses device picker (user downloads from Drive/OneDrive first) */
  const handleCloudRestore = (service) => {
    setRestoreModalVisible(false);
    Alert.alert(
      `Restore from ${service}`,
      `To restore from ${service}:\n\n1. Open ${service} app on your phone\n2. Find your ZOXM Invoice backup file\n3. Download it to your device\n4. Come back here and tap "Restore from Device"\n\nWould you like to pick a file now?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pick File', onPress: () => setTimeout(() => handleRestoreFromDevice(), 300) },
      ]
    );
  };

  // ─── Modal Option Row ───
  const ModalOption = ({ icon, iconType = 'material', label, onPress, isLast = false }) => (
    <TouchableOpacity 
      onPress={onPress}
      className={`flex-row items-center justify-between px-5 py-4 ${!isLast ? 'border-b border-slate-50 dark:border-slate-800' : ''}`}
    >
      <View className="flex-row items-center gap-4">
        <View className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center">
          {iconType === 'community' ? (
            <MaterialCommunityIcons name={icon} size={22} color="#475569" />
          ) : (
            <MaterialIcons name={icon} size={22} color="#475569" />
          )}
        </View>
        <Text className="text-base font-semibold text-slate-900 dark:text-slate-100">{label}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-10 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full">
          <MaterialIcons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-900 dark:text-slate-100 ml-3">Backup and Restore</Text>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Note Card */}
        <View className="mx-4 mt-5 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30">
          <Text className="text-base font-bold text-blue-800 dark:text-blue-300 mb-2">Please Note</Text>
          <Text className="text-slate-600 dark:text-slate-400 text-sm leading-5 mb-2">
            If you lose the data or switch to a new device :
          </Text>
          <View className="ml-2 gap-1.5">
            <View className="flex-row">
              <Text className="text-slate-600 dark:text-slate-400 text-sm">1. </Text>
              <Text className="text-slate-600 dark:text-slate-400 text-sm flex-1 leading-5">
                Link to correct Drive/OneDrive account where you created previous backup.
              </Text>
            </View>
            <View className="flex-row">
              <Text className="text-slate-600 dark:text-slate-400 text-sm">2. </Text>
              <Text className="text-slate-600 dark:text-slate-400 text-sm flex-1 leading-5">
                Go to restore section and restore your data from the account.
              </Text>
            </View>
          </View>
        </View>

        {/* Processing Status */}
        {processing && (
          <View className="mx-4 mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 flex-row items-center gap-3">
            <ActivityIndicator size="small" color="#4f46e5" />
            <Text className="text-indigo-700 dark:text-indigo-300 font-semibold text-sm flex-1">
              {statusText || 'Processing...'}
            </Text>
          </View>
        )}

        {/* Backup Option */}
        <TouchableOpacity 
          onPress={() => setBackupModalVisible(true)}
          disabled={processing}
          className={`mx-4 mt-6 flex-row items-center justify-between py-5 px-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 ${processing ? 'opacity-50' : ''}`}
        >
          <View className="flex-row items-center gap-4">
            <View className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
              <MaterialCommunityIcons name="cloud-upload-outline" size={24} color="#475569" />
            </View>
            <View>
              <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Backup</Text>
              <Text className="text-slate-400 text-sm mt-0.5">Create new backup</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
        </TouchableOpacity>

        {/* Restore Option */}
        <TouchableOpacity 
          onPress={() => setRestoreModalVisible(true)}
          disabled={processing}
          className={`mx-4 mt-3 flex-row items-center justify-between py-5 px-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 ${processing ? 'opacity-50' : ''}`}
        >
          <View className="flex-row items-center gap-4">
            <View className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
              <MaterialCommunityIcons name="cloud-download-outline" size={24} color="#475569" />
            </View>
            <View>
              <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Restore</Text>
              <Text className="text-slate-400 text-sm mt-0.5">Restore previous data</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
        </TouchableOpacity>

        {/* Schedule Backup Reminder */}
        <View className="mx-4 mt-6 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30">
          <TouchableOpacity 
            onPress={() => Alert.alert('Schedule Backup', 'Automatic scheduled backups will be available in a future update.')}
            className="flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-4 flex-1">
              <View className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-800/40 items-center justify-center">
                <MaterialCommunityIcons name="calendar-clock" size={24} color="#3b82f6" />
              </View>
              <View className="flex-1 mr-2">
                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Schedule Backup Reminder</Text>
                <Text className="text-slate-500 dark:text-slate-400 text-sm mt-0.5 leading-5">
                  Take regular backups at your selected frequency on Google Drive/OneDrive.
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ═══════════ Backup Modal ═══════════ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={backupModalVisible}
        onRequestClose={() => setBackupModalVisible(false)}
      >
        <TouchableOpacity 
          style={{ flex: 1 }} 
          activeOpacity={1} 
          onPress={() => setBackupModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/40 px-6">
            <TouchableOpacity activeOpacity={1} className="w-full">
              <View className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl w-full">
                <View className="p-5 border-b border-slate-100 dark:border-slate-800">
                  <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">Backup</Text>
                </View>

                <View>
                  <ModalOption 
                    icon="google-drive" 
                    iconType="community" 
                    label="Backup on Google Drive" 
                    onPress={() => handleCloudBackup('Google Drive')} 
                  />
                  <ModalOption 
                    icon="microsoft-onedrive" 
                    iconType="community" 
                    label="Backup on OneDrive" 
                    onPress={() => handleCloudBackup('OneDrive')} 
                  />
                  <ModalOption 
                    icon="share" 
                    label="Share Backup File" 
                    onPress={handleShareBackup} 
                  />
                  <ModalOption 
                    icon="email" 
                    label="Email Backup File" 
                    onPress={handleEmailBackup} 
                  />
                  <ModalOption 
                    icon="smartphone" 
                    label="Backup on Device" 
                    onPress={handleBackupOnDevice} 
                    isLast 
                  />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ═══════════ Restore Modal ═══════════ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={restoreModalVisible}
        onRequestClose={() => setRestoreModalVisible(false)}
      >
        <TouchableOpacity 
          style={{ flex: 1 }} 
          activeOpacity={1} 
          onPress={() => setRestoreModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/40 px-6">
            <TouchableOpacity activeOpacity={1} className="w-full">
              <View className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl w-full">
                <View className="p-5 border-b border-slate-100 dark:border-slate-800">
                  <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">Restore</Text>
                </View>

                <View>
                  <ModalOption 
                    icon="google-drive" 
                    iconType="community" 
                    label="Restore from Google Drive" 
                    onPress={() => handleCloudRestore('Google Drive')} 
                  />
                  <ModalOption 
                    icon="microsoft-onedrive" 
                    iconType="community" 
                    label="Restore from OneDrive" 
                    onPress={() => handleCloudRestore('OneDrive')} 
                  />
                  <ModalOption 
                    icon="search" 
                    label="Search on Device" 
                    onPress={() => {
                      setRestoreModalVisible(false);
                      setTimeout(() => handleRestoreFromDevice(), 200);
                    }} 
                  />
                  <ModalOption 
                    icon="smartphone" 
                    label="Restore from Device" 
                    onPress={() => {
                      setRestoreModalVisible(false);
                      setTimeout(() => handleRestoreFromDevice(), 200);
                    }} 
                    isLast 
                  />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
