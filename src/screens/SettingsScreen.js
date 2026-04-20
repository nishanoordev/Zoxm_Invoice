import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Modal, FlatList, Alert, TextInput, Linking, Share } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';

import { useColorScheme } from 'nativewind';
import { useTranslation } from '../i18n/LanguageContext';
import { useTheme, THEME_LIST } from '../theme/ThemeContext';
import { DEFAULT_INVOICE_CONFIG, mergeConfig } from '../utils/invoiceConfigDefaults';
import { TEMPLATES } from '../utils/invoiceTemplates';
import { checkPermission } from '../utils/permissions';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal' },
  { code: 'OMR', symbol: 'ر.ع.', name: 'Omani Rial' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
  { code: 'BHD', symbol: '.د.ب', name: 'Bahraini Dinar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
];



const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
];

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const profile             = useStore(state => state.profile);
  const currentRole         = useStore(state => state.currentRole);
  const updateProfile       = useStore(state => state.updateProfile);
  const updateInvoiceConfig = useStore(state => state.updateInvoiceConfig);

  const [isCurrencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [saleModalVisible, setSaleModalVisible]           = useState(false);
  const [themeModalVisible, setThemeModalVisible]         = useState(false);
  const [colorThemeModalVisible, setColorThemeModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible]   = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible]     = useState(false);
  const [passwordModalVisible, setPasswordModalVisible]   = useState(false);
  // Invoice appearance modals
  const [templateModalVisible, setTemplateModalVisible]   = useState(false);
  const [termsModalVisible,    setTermsModalVisible]      = useState(false);
  const [termsText,            setTermsText]              = useState('');
  const [showAppearanceSheet,  setShowAppearanceSheet]    = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const { setColorScheme, colorScheme } = useColorScheme();
  const { t } = useTranslation();
  const theme = useTheme();

  // Enforce light as default if empty or 'system'
  const currentTheme = (profile.theme === 'system' || !profile.theme) ? 'light' : profile.theme;
  const currentColorTheme = profile.colorTheme || 'ocean';
  const currentColorThemeObj = THEME_LIST.find(t => t.id === currentColorTheme) || THEME_LIST[0];
  const currentLanguage = LANGUAGES.find(l => l.code === (profile.language || 'en'));

  // Invoice config (merged with defaults so all keys are always present)
  const invoiceConfig = mergeConfig(DEFAULT_INVOICE_CONFIG, profile.invoiceConfig || {});
  const currentTemplateName = TEMPLATES[invoiceConfig.template]?.name || 'Modern';

  const LOGO_POSITIONS = [
    { id: 'left',   label: 'Left',   icon: 'format-align-left' },
    { id: 'center', label: 'Center', icon: 'format-align-center' },
    { id: 'right',  label: 'Right',  icon: 'format-align-right' },
  ];

  const TOGGLE_KEYS = [
    'showHsnColumn', 'showDiscountColumn', 'showGstColumn', 'showUnitColumn',
    'showAmountInWords', 'showBuyerGstin', 'showPaymentStatus', 'showDeclaration',
    'termsEnabled', 'showNotesSection', 'showUpiQr', 'showSignature',
  ];
  const enabledCount = TOGGLE_KEYS.filter(k => !!invoiceConfig[k]).length;

  const handleCurrencySelect = async (currency) => {
    await updateProfile({
      ...profile,
      currency_code: currency.code,
      currency_symbol: currency.symbol,
    });
    setCurrencyModalVisible(false);
  };

  const handleThemeSelect = async (theme) => {
    await updateProfile({
      ...profile,
      theme: theme,
    });
    setColorScheme(theme);
    setThemeModalVisible(false);
  };

  const handleColorThemeSelect = async (colorThemeId) => {
    await updateProfile({
      ...profile,
      colorTheme: colorThemeId,
    });
    setColorThemeModalVisible(false);
  };

  const handleLanguageSelect = async (languageCode) => {
    await updateProfile({
      ...profile,
      language: languageCode,
    });
    setLanguageModalVisible(false);
  };
  
  const SettingItem = ({ icon, label, onPress, rightElement, subLabel, color }) => (
    <TouchableOpacity 
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-4 min-h-[56px] border-b border-slate-100 dark:border-slate-800"
    >
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center">
          <MaterialIcons name={icon} size={22} color={color} className={!color ? "text-slate-700 dark:text-slate-300" : ""} />
        </View>
        <View className="flex-col">
          <Text 
            style={color ? { color } : {}}
            className={!color ? "text-slate-900 dark:text-slate-100 text-[16px] font-semibold" : "text-[16px] font-semibold"}
          >
            {label}
          </Text>
          {subLabel && <Text className="text-slate-400 text-xs font-medium">{subLabel}</Text>}
        </View>
      </View>
      {rightElement || <MaterialIcons name="chevron-right" size={24} className="text-slate-300" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <View style={{ backgroundColor: theme.primary }} className="flex-row items-center justify-between px-4 pt-10 pb-4 border-b border-slate-100 dark:border-slate-800">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full bg-white/10">
          <MaterialIcons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">{t('settings')}</Text>
        <View className="w-10" />
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 120) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View className="mx-4 mt-6 p-4 rounded-3xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800">
          <TouchableOpacity 
            onPress={() => navigation.navigate('EditProfile')}
            className="flex-row items-center gap-4"
          >
            <View className="w-16 h-16 rounded-3xl bg-slate-200 dark:bg-slate-700 overflow-hidden items-center justify-center">
              {profile.logo_uri ? (
                 <View className="w-full h-full bg-white items-center justify-center">
                   <Text className="text-slate-400 text-[10px]">Logo Set</Text>
                 </View>
              ) : (
                <MaterialIcons name="person" size={40} className="text-slate-400" />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">{profile.name || 'Alex Johnson'}</Text>
              <Text className="text-slate-400 text-sm font-medium">{profile.business_role || t('storeOwner')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} className="text-slate-300" />
          </TouchableOpacity>
        </View>

        {/* Sync Card */}
        <View className="mx-4 mt-6 p-5 rounded-3xl bg-[#F4F4F9] dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="w-8 h-8 rounded-full bg-indigo-50 items-center justify-center">
              <MaterialIcons name="cloud-queue" size={18} className="text-indigo-600" />
            </View>
            <Text className="text-slate-900 dark:text-slate-100 font-bold text-base">{t('syncToCloud')}</Text>
          </View>
          <Text className="text-slate-500 dark:text-slate-400 text-sm leading-5 mb-5">
            {t('syncDesc')}
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity 
              onPress={() => Alert.alert('Sync', 'Cloud syncing is under development.')}
              className="flex-1 h-12 bg-[#2D2D5F] rounded-2xl flex-row items-center justify-center gap-2"
            >
              <MaterialIcons name="sync" size={18} color="white" />
              <Text className="text-white font-bold text-sm">{t('syncNow')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => Alert.alert('Backup', 'Automatic cloud backup is under development.')}
              className="flex-1 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex-row items-center justify-center gap-2"
            >
              <MaterialIcons name="cloud-download" size={18} className="text-slate-600 dark:text-slate-300" />
              <Text className="text-slate-600 dark:text-slate-300 font-bold text-sm">{t('download')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* My Business Sale */}
        <View className="mt-8">
          <Text className="text-slate-400 text-[12px] font-bold uppercase tracking-widest px-6 mb-3">{t('myBusinessSale')}</Text>
          <View className="mx-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden">
            <SettingItem 
              icon="business-center" 
              label={t('salesFunctions')}
              onPress={() => setSaleModalVisible(true)} 
              subLabel={t('salesFunctionsDesc')}
            />
          </View>
        </View>

        {/* Invoice Appearance — single tappable row */}
        <View className="mt-8">
          <Text className="text-slate-400 text-[12px] font-bold uppercase tracking-widest px-6 mb-3">Invoice Appearance</Text>
          <View className="mx-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden">
            <SettingItem
              icon="style"
              label="Invoice Appearance"
              subLabel={`Template: ${currentTemplateName}  ·  Logo: ${(invoiceConfig.logoPosition || 'center').charAt(0).toUpperCase() + (invoiceConfig.logoPosition || 'center').slice(1)}  ·  ${enabledCount}/${TOGGLE_KEYS.length} options`}
              onPress={() => setShowAppearanceSheet(true)}
            />
          </View>
        </View>

        {/* Business Profile */}
        <View className="mt-8">
          <Text className="text-slate-400 text-[12px] font-bold uppercase tracking-widest px-6 mb-3">{t('businessProfile')}</Text>
          <View className="mx-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden">
            {checkPermission(currentRole, 'canManageTeam') && (
              <SettingItem 
                icon="supervisor-account" 
                label={t('roleManagement')} 
                onPress={() => navigation.navigate('RoleManagement')} 
              />
            )}
            {checkPermission(currentRole, 'canEditBusinessDetails') && (
              <SettingItem 
                icon="description" 
                label={t('invoiceElements')} 
                onPress={() => navigation.navigate('InvoiceElements')} 
              />
            )}
            {checkPermission(currentRole, 'canEditBusinessDetails') && (
              <SettingItem 
                icon="payments" 
                label={t('currency')} 
                onPress={() => setCurrencyModalVisible(true)} 
                subLabel={`${profile.currency_code || 'INR'} (${profile.currency_symbol || '₹'})`}
                rightElement={<MaterialIcons name="chevron-right" size={24} className="text-slate-300" />}
              />
            )}
            <SettingItem 
              icon="palette" 
              label="Color Theme"
              onPress={() => setColorThemeModalVisible(true)} 
              subLabel={`${currentColorThemeObj.emoji} ${currentColorThemeObj.name}`}
              rightElement={<MaterialIcons name="chevron-right" size={24} className="text-slate-300" />}
            />
            <SettingItem 
              icon="brightness-6" 
              label="Display Mode"
              onPress={() => setThemeModalVisible(true)} 
              subLabel={currentTheme === 'dark' ? t('darkMode') : t('lightMode')}
              rightElement={<MaterialIcons name="chevron-right" size={24} className="text-slate-300" />}
            />
            <SettingItem 
              icon="language" 
              label={t('language')} 
              onPress={() => setLanguageModalVisible(true)} 
              subLabel={currentLanguage ? `${currentLanguage.name} (${currentLanguage.nativeName})` : 'English'}
              rightElement={<MaterialIcons name="chevron-right" size={24} className="text-slate-300" />}
            />
          </View>
        </View>

        {/* Data & Reports */}
        <View className="mt-8">
          <Text className="text-slate-400 text-[12px] font-bold uppercase tracking-widest px-6 mb-3">Data & Reports</Text>
          <View className="mx-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden">
            <SettingItem
              icon="bar-chart"
              label="Financial Reports"
              subLabel="Sales, GST, Inventory & more"
              onPress={() => navigation.navigate('Reports')}
            />
            <SettingItem
              icon="history"
              label="Activity History"
              subLabel="All recent changes & events"
              onPress={() => navigation.navigate('History')}
            />
            {checkPermission(currentRole, 'canDeleteRecords') && (
              <SettingItem
                icon="backup"
                label="Backup & Restore"
                subLabel="Create backup or restore data"
                onPress={() => navigation.navigate('BackupRestore')}
              />
            )}
          </View>
        </View>

        {/* Account & Security */}
        <View className="mt-8">
          <Text className="text-slate-400 text-[12px] font-bold uppercase tracking-widest px-6 mb-3">{t('accountSecurity')}</Text>
          <View className="mx-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden">
            <SettingItem icon="security" label={t('privacySecurity')} onPress={() => setPrivacyModalVisible(true)} />
          </View>
        </View>

        {/* Support & Community */}
        <View className="mt-8">
          <Text className="text-slate-400 text-[12px] font-bold uppercase tracking-widest px-6 mb-3">{t('supportCommunity')}</Text>
          <View className="mx-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden">
            <SettingItem icon="info" label="About" onPress={() => Alert.alert('About', 'Zoxm Invoice\nVersion 1.0.0\n\nThe ultimate offline POS, billing and inventory management solution.')} />
            <SettingItem icon="chat-bubble-outline" label={t('feedback')} onPress={() => Linking.openURL('mailto:support@zoxminvoice.com')} />
            <SettingItem icon="share" label={t('shareApp')} onPress={() => Share.share({ message: 'Try out Zoxm Invoice - The ultimate offline billing and inventory management app! 🚀' })} />
            <SettingItem icon="star-rate" label="Rate App" onPress={() => Linking.openURL('market://details?id=com.zoxm.invoice').catch(() => Alert.alert("Error", "Store app could not be opened."))} />
          </View>
        </View>

        {/* Danger Zone */}
        {checkPermission(currentRole, 'canDeleteRecords') && (
          <View className="mt-8">
            <Text className="text-red-500 text-[12px] font-bold uppercase tracking-widest px-6 mb-3">Danger Zone</Text>
            <View className="mx-4 rounded-3xl bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/30 overflow-hidden">
              <SettingItem 
                icon="delete-sweep" 
                label="Clear All Data" 
                onPress={() => {
                  Alert.alert(
                    "Clear All Data",
                    "This will permanently delete ALL invoices, items, customers, and business settings. This action CANNOT be undone.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { 
                        text: "Yes, Delete Everything", 
                        style: "destructive",
                        onPress: () => {
                          Alert.alert(
                            "Final Confirmation",
                            "Are you absolutely sure? This will wipe your entire database.",
                            [
                              { text: "No, Stop!", style: "cancel" },
                              { 
                                text: "Wipe Data", 
                                style: "destructive",
                                onPress: async () => {
                                  try {
                                    await useStore.getState().clearAllData();
                                    Alert.alert("Success", "All data has been cleared.");
                                  } catch (error) {
                                    Alert.alert("Error", "Failed to clear data: " + error.message);
                                  }
                                }
                              }
                            ]
                          );
                        }
                      }
                    ]
                  );
                }} 
                color="#FF5252"
                rightElement={<MaterialIcons name="warning" size={20} color="#FF5252" />}
              />
            </View>
          </View>
        )}

        {/* Logout */}
        <View className="mx-4 mt-10 mb-20">
          <TouchableOpacity 
            onPress={() => {
              useStore.getState().logout();
            }}
            className="w-full h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex-row items-center justify-center gap-2 shadow-sm"
          >
            <MaterialIcons name="logout" size={20} color="#FF5252" />
            <Text className="text-[#FF5252] font-bold text-base">{t('logout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* \u2500\u2500 Invoice Appearance Bottom Sheet \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <Modal
        visible={showAppearanceSheet}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAppearanceSheet(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingTop: 12, paddingBottom: 36, paddingHorizontal: 20 }}>
            {/* Handle */}
            <View style={{ width: 44, height: 5, backgroundColor: '#e2e8f0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 }} />

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ backgroundColor: theme.primary + '15', padding: 10, borderRadius: 14 }}>
                  <MaterialIcons name="style" size={22} color={theme.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>Invoice Appearance</Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 2 }}>Customize how your invoices look</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowAppearanceSheet(false)}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
              >
                <MaterialIcons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* \u2500\u2500 Option 1: Invoice Template \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
            <TouchableOpacity
              onPress={() => { setShowAppearanceSheet(false); setTimeout(() => setTemplateModalVisible(true), 300); }}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: theme.primary + '15', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <MaterialIcons name="style" size={22} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a' }}>Invoice Template</Text>
                <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2 }}>{currentTemplateName} \u2014 tap to change</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
            </TouchableOpacity>

            {/* \u2500\u2500 Option 2: Logo Position (inline toggle) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
            <View style={{ backgroundColor: '#f8fafc', borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: '#6366f115', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <MaterialIcons name="format-align-center" size={22} color="#6366f1" />
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a' }}>Logo Position</Text>
                  <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2 }}>
                    Currently: {(invoiceConfig.logoPosition || 'center').charAt(0).toUpperCase() + (invoiceConfig.logoPosition || 'center').slice(1)}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {LOGO_POSITIONS.map(pos => {
                  const active = invoiceConfig.logoPosition === pos.id;
                  return (
                    <TouchableOpacity
                      key={pos.id}
                      onPress={() => updateInvoiceConfig({ logoPosition: pos.id })}
                      style={{
                        flex: 1, borderRadius: 14, paddingVertical: 12,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: active ? theme.primary : '#fff',
                        borderWidth: 1.5,
                        borderColor: active ? theme.primary : '#e2e8f0',
                      }}
                    >
                      <MaterialIcons name={pos.icon} size={20} color={active ? '#fff' : '#64748b'} />
                      <Text style={{ fontSize: 11, fontWeight: '800', marginTop: 5, color: active ? '#fff' : '#64748b' }}>{pos.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* \u2500\u2500 Option 3: Terms & Conditions \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
            <TouchableOpacity
              onPress={() => {
                setShowAppearanceSheet(false);
                setTimeout(() => {
                  setTermsText(invoiceConfig.termsText || DEFAULT_INVOICE_CONFIG.termsText);
                  setTermsModalVisible(true);
                }, 300);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: '#f0fdf415', alignItems: 'center', justifyContent: 'center', marginRight: 14, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' }}>
                <MaterialIcons name="article" size={22} color="#16a34a" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a' }}>Terms &amp; Conditions</Text>
                <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2 }}>Edit default terms on PDF</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
            </TouchableOpacity>

            {/* \u2500\u2500 Option 4: Invoice Options \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
            <TouchableOpacity
              onPress={() => { setShowAppearanceSheet(false); navigation.navigate('InvoiceOptions'); }}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1, borderColor: '#fed7aa' }}>
                <MaterialIcons name="tune" size={22} color="#ea580c" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a' }}>Invoice Options</Text>
                <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2 }}>{enabledCount} of {TOGGLE_KEYS.length} options enabled</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* \u2500\u2500 Invoice Template Picker Modal \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <Modal
        visible={templateModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTemplateModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white dark:bg-slate-900 rounded-t-[32px] pb-10">
            <View className="p-6 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">Invoice Template</Text>
              <TouchableOpacity
                onPress={() => setTemplateModalVisible(false)}
                className="w-8 h-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <MaterialIcons name="close" size={20} className="text-slate-600 dark:text-slate-400" />
              </TouchableOpacity>
            </View>
            <View className="p-4 gap-3">
              {Object.values(TEMPLATES).map(tmpl => {
                const isSelected = invoiceConfig.template === tmpl.id;
                return (
                  <TouchableOpacity
                    key={tmpl.id}
                    onPress={() => {
                      updateInvoiceConfig({ template: tmpl.id });
                      setTemplateModalVisible(false);
                    }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', padding: 16,
                      borderRadius: 16,
                      borderWidth: isSelected ? 2 : 1.5,
                      borderColor: isSelected ? theme.primary : '#e2e8f0',
                      backgroundColor: isSelected ? theme.primary + '08' : '#f8fafc',
                    }}
                  >
                    <View style={{
                      width: 44, height: 44, borderRadius: 12,
                      backgroundColor: isSelected ? theme.primary : '#e2e8f0',
                      alignItems: 'center', justifyContent: 'center', marginRight: 12,
                    }}>
                      <MaterialIcons
                        name={tmpl.id === 'modern' ? 'auto-awesome' : tmpl.id === 'classic' ? 'history-edu' : 'space-bar'}
                        size={22}
                        color={isSelected ? '#fff' : '#94a3b8'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 16, fontWeight: '700',
                        color: isSelected ? theme.primary : '#1e293b',
                      }}>{tmpl.name}</Text>
                      <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                        {tmpl.description}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialIcons name="check-circle" size={22} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Terms Editor Modal ────────────────────────── */}
      <Modal
        visible={termsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white dark:bg-slate-900 rounded-t-[32px] pb-10">
            <View className="p-6 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">Terms & Conditions</Text>
              <TouchableOpacity
                onPress={() => setTermsModalVisible(false)}
                className="w-8 h-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <MaterialIcons name="close" size={20} className="text-slate-600 dark:text-slate-400" />
              </TouchableOpacity>
            </View>
            <View className="p-5 gap-4">
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                Printed on every invoice PDF
              </Text>
              <TextInput
                value={termsText}
                onChangeText={setTermsText}
                multiline
                numberOfLines={8}
                style={{
                  minHeight: 180, backgroundColor: '#f8fafc',
                  borderRadius: 16, padding: 14,
                  borderWidth: 1, borderColor: '#e2e8f0',
                  fontSize: 13, color: '#1e293b',
                  textAlignVertical: 'top', lineHeight: 22,
                }}
                placeholder="Enter your terms and conditions..."
                placeholderTextColor="#94a3b8"
              />
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setTermsText(DEFAULT_INVOICE_CONFIG.termsText)}
                  className="flex-1 h-12 rounded-2xl border border-slate-200 items-center justify-center"
                >
                  <Text className="text-slate-500 font-semibold">Reset Default</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    updateInvoiceConfig({ termsText });
                    setTermsModalVisible(false);
                  }}
                  style={{ flex: 1, height: 48, borderRadius: 16, backgroundColor: theme.primary,
                           alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal
        visible={isCurrencyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white dark:bg-slate-900 rounded-t-[32px] max-h-[70%]">
            <View className="p-6 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('selectCurrency')}</Text>
              <TouchableOpacity 
                onPress={() => setCurrencyModalVisible(false)}
                className="w-8 h-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <MaterialIcons name="close" size={20} className="text-slate-600 dark:text-slate-400" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item.code}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleCurrencySelect(item)}
                  className={`flex-row items-center justify-between p-4 mb-2 rounded-2xl ${
                    profile.currency_code === item.code 
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800' 
                      : 'bg-slate-50 dark:bg-slate-800/50'
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <View className={`w-10 h-10 rounded-xl items-center justify-center ${
                      profile.currency_code === item.code ? 'bg-indigo-100 dark:bg-indigo-800' : 'bg-white dark:bg-slate-700'
                    }`}>
                      <Text className={`font-bold ${profile.currency_code === item.code ? 'text-indigo-600' : 'text-slate-600 dark:text-slate-300'}`}>
                        {item.symbol}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-slate-900 dark:text-slate-100 font-bold">{item.name}</Text>
                      <Text className="text-slate-400 text-xs">{item.code}</Text>
                    </View>
                  </View>
                  {profile.currency_code === item.code && (
                    <MaterialIcons name="check-circle" size={24} className="text-indigo-600" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Color Theme Selection Modal */}
      <Modal
        visible={colorThemeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setColorThemeModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white dark:bg-slate-900 rounded-t-[32px] pb-10">
            <View className="p-6 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">Color Theme</Text>
              <TouchableOpacity 
                onPress={() => setColorThemeModalVisible(false)}
                className="w-8 h-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <MaterialIcons name="close" size={20} className="text-slate-600 dark:text-slate-400" />
              </TouchableOpacity>
            </View>
            <View className="p-4">
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 px-1">Choose your brand color</Text>
              <View className="flex-row flex-wrap gap-3">
                {THEME_LIST.map((item) => {
                  const isSelected = currentColorTheme === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleColorThemeSelect(item.id)}
                      style={{
                        width: '47%',
                        borderRadius: 20,
                        overflow: 'hidden',
                        borderWidth: isSelected ? 2.5 : 1.5,
                        borderColor: isSelected ? item.primary : 'rgba(0,0,0,0.08)',
                      }}
                    >
                      {/* Swatch preview bar */}
                      <View style={{ height: 52, flexDirection: 'row' }}>
                        {item.swatch.map((color, i) => (
                          <View key={i} style={{ flex: 1, backgroundColor: color }} />
                        ))}
                      </View>
                      <View style={{
                        padding: 12,
                        backgroundColor: isSelected ? `${item.primary}10` : 'transparent',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <View>
                          <Text style={{ fontSize: 15 }}>{item.emoji}</Text>
                          <Text style={{
                            fontSize: 13,
                            fontWeight: '700',
                            color: isSelected ? item.primary : '#1e293b',
                            marginTop: 2,
                          }}>{item.name}</Text>
                        </View>
                        {isSelected && (
                          <MaterialIcons name="check-circle" size={22} color={item.primary} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Display Mode Modal */}
      <Modal
        visible={themeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white dark:bg-slate-900 rounded-t-[32px] pb-10">
            <View className="p-6 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('selectTheme')}</Text>
              <TouchableOpacity 
                onPress={() => setThemeModalVisible(false)}
                className="w-8 h-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <MaterialIcons name="close" size={20} className="text-slate-600 dark:text-slate-400" />
              </TouchableOpacity>
            </View>
            <View className="p-4 gap-3">
              {[
                { id: 'light', label: t('lightMode'), icon: 'light-mode', desc: t('lightDesc'), color: '#f59e0b' },
                { id: 'dark', label: t('darkMode'), icon: 'dark-mode', desc: t('darkDesc'), color: '#6366f1' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleThemeSelect(item.id)}
                  className={`flex-row items-center p-4 rounded-2xl border ${
                    currentTheme === item.id 
                      ? 'bg-primary/5 dark:bg-indigo-900/30 border-primary/20 dark:border-indigo-700' 
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <View className={`w-12 h-12 rounded-2xl items-center justify-center ${
                    currentTheme === item.id ? 'bg-primary/10 dark:bg-indigo-800/50' : 'bg-white dark:bg-slate-700'
                  }`}>
                    <MaterialIcons name={item.icon} size={24} color={currentTheme === item.id ? '#262A56' : item.color} />
                  </View>
                  <View className="flex-1 ml-4">
                    <Text className={`font-bold text-base ${currentTheme === item.id ? 'text-primary dark:text-indigo-200' : 'text-slate-900 dark:text-slate-100'}`}>
                      {item.label}
                    </Text>
                    <Text className="text-slate-400 text-xs mt-0.5">{item.desc}</Text>
                  </View>
                  {currentTheme === item.id && (
                    <MaterialIcons name="check-circle" size={24} color="#262A56" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white dark:bg-slate-900 rounded-t-[32px] max-h-[70%]">
            <View className="p-6 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('selectLanguage')}</Text>
              <TouchableOpacity 
                onPress={() => setLanguageModalVisible(false)}
                className="w-8 h-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <MaterialIcons name="close" size={20} className="text-slate-600 dark:text-slate-400" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleLanguageSelect(item.code)}
                  className={`flex-row items-center justify-between p-4 mb-2 rounded-2xl ${
                    (profile.language || 'en') === item.code 
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800' 
                      : 'bg-slate-50 dark:bg-slate-800/50'
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <View className={`w-10 h-10 rounded-xl items-center justify-center ${
                      (profile.language || 'en') === item.code ? 'bg-indigo-100 dark:bg-indigo-800' : 'bg-white dark:bg-slate-700'
                    }`}>
                      <Text className={`font-bold ${ (profile.language || 'en') === item.code ? 'text-indigo-600' : 'text-slate-600 dark:text-slate-300'}`}>
                        {item.code.toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-slate-900 dark:text-slate-100 font-bold">{item.name}</Text>
                      <Text className="text-slate-400 text-xs">{item.nativeName}</Text>
                    </View>
                  </View>
                  {(profile.language || 'en') === item.code && (
                    <MaterialIcons name="check-circle" size={24} className="text-indigo-600" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Sales Functions Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={saleModalVisible}
        onRequestClose={() => setSaleModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-12">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-black text-slate-900 dark:text-slate-100">{t('myBusinessSale')}</Text>
              <TouchableOpacity onPress={() => setSaleModalVisible(false)}>
                <MaterialIcons name="close" size={24} className="text-slate-400" />
              </TouchableOpacity>
            </View>
            
            <View className="gap-3">
              <TouchableOpacity
                onPress={() => {
                  setSaleModalVisible(false);
                  navigation.navigate('Invoices');
                }}
                className="flex-row items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700"
              >
                <View className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center">
                  <MaterialIcons name="receipt-long" size={20} className="text-indigo-600" />
                </View>
                <Text className="flex-1 ml-4 font-bold text-slate-900 dark:text-slate-100">{t('saleInvoices')}</Text>
                <MaterialIcons name="chevron-right" size={20} className="text-slate-300" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSaleModalVisible(false);
                  navigation.navigate('Payments');
                }}
                className="flex-row items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700"
              >
                <View className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 items-center justify-center">
                  <MaterialIcons name="payments" size={20} className="text-green-600" />
                </View>
                <Text className="flex-1 ml-4 font-bold text-slate-900 dark:text-slate-100">{t('payment')}</Text>
                <MaterialIcons name="chevron-right" size={20} className="text-slate-300" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSaleModalVisible(false);
                  navigation.navigate('SalesReturn');
                }}
                className="flex-row items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700"
              >
                <View className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 items-center justify-center">
                  <MaterialIcons name="assignment-return" size={20} className="text-red-600" />
                </View>
                <Text className="flex-1 ml-4 font-bold text-slate-900 dark:text-slate-100">{t('saleReturn')}</Text>
                <MaterialIcons name="chevron-right" size={20} className="text-slate-300" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSaleModalVisible(false);
                  navigation.navigate('Orders');
                }}
                className="flex-row items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700"
              >
                <View className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 items-center justify-center">
                  <MaterialIcons name="pending-actions" size={20} className="text-blue-600" />
                </View>
                <Text className="flex-1 ml-4 font-bold text-slate-900 dark:text-slate-100">{t('pendingOrderLabel')}</Text>
                <MaterialIcons name="chevron-right" size={20} className="text-slate-300" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSaleModalVisible(false);
                  navigation.navigate('Challans');
                }}
                className="flex-row items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700"
              >
                <View className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/30 items-center justify-center">
                  <MaterialIcons name="local-shipping" size={20} className="text-orange-600" />
                </View>
                <Text className="flex-1 ml-4 font-bold text-slate-900 dark:text-slate-100">{t('deliveryChallanLabel')}</Text>
                <MaterialIcons name="chevron-right" size={20} className="text-slate-300" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy & Security Modal */}
      <Modal
        visible={privacyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white dark:bg-slate-900 rounded-t-[32px] pb-10">
            <View className="p-6 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('privacySecurity')}</Text>
              <TouchableOpacity 
                onPress={() => setPrivacyModalVisible(false)}
                className="w-8 h-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <MaterialIcons name="close" size={20} className="text-slate-600 dark:text-slate-400" />
              </TouchableOpacity>
            </View>
            <View className="p-6">
              <View className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 mb-6">
                <Text className="text-indigo-800 dark:text-indigo-300 font-medium leading-5 text-justify">
                  Your data is securely stored locally on this device. We do not track your activity or share data with third parties.
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setPrivacyModalVisible(false);
                  setTimeout(() => setPasswordModalVisible(true), 300);
                }}
                className="w-full flex-row items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700"
              >
                <View className="flex-row items-center gap-4">
                  <View className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 items-center justify-center">
                    <MaterialIcons name="lock" size={22} className="text-orange-600 dark:text-orange-400" />
                  </View>
                  <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{t('changePassword')}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} className="text-slate-400" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white dark:bg-slate-900 rounded-3xl w-full p-6 pb-8 shadow-xl">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">Change Password</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <MaterialIcons name="close" size={24} className="text-slate-400" />
              </TouchableOpacity>
            </View>
            
            <Text className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">Current Password</Text>
            <TextInput
              className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-base text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 mb-4"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              placeholderTextColor="#94a3b8"
            />

            <Text className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">New Password</Text>
            <TextInput
              className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-base text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 mb-6"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor="#94a3b8"
            />

            <TouchableOpacity
              onPress={() => {
                if (!currentPassword || !newPassword) {
                  Alert.alert('Error', 'Please fill all fields');
                  return;
                }
                Alert.alert('Success', 'Password updated successfully!');
                setCurrentPassword('');
                setNewPassword('');
                setPasswordModalVisible(false);
              }}
              style={{ backgroundColor: theme.primary }}
              className="w-full py-4 rounded-xl items-center justify-center"
            >
              <Text className="text-white font-bold text-base">Update Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View className="h-20" />
    </SafeAreaView>
  );
}
