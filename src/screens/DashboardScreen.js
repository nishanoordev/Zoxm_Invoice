import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Image, Modal } from 'react-native';
import CalculatorScreen from './CalculatorScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatAmount } from '../utils/formatters';
import { calculateCustomerBalances } from '../utils/balanceCalculator';
import { useColorScheme } from 'nativewind';
import { useTranslation } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { checkPermission } from '../utils/permissions';

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [calcVisible, setCalcVisible] = useState(false);
  const profile = useStore(state => state.profile);
  const invoices = useStore(state => state.invoices);
  const payments = useStore(state => state.payments);
  const customers = useStore(state => state.customers);
  const orders = useStore(state => state.orders);
  const currentRole = useStore(state => state.currentRole);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  const theme = useTheme();
  const isSyncing = useStore(state => state.isSyncing);
  const lastSyncTime = useStore(state => state.lastSyncTime);
  
  // Deriving data - filtering out deleted invoices
  const activeInvoices = invoices.filter(inv => !inv.isDeleted && (inv.type || 'invoice') !== 'estimate');
  const totalRevenue = activeInvoices.filter(i => (i.status || '').toLowerCase() === 'paid' || (i.status || '').toLowerCase() === 'sale').reduce((sum, i) => sum + (i.total || 0), 0);
  const paidCount = activeInvoices.filter(i => (i.status || '').toLowerCase() === 'paid' || (i.status || '').toLowerCase() === 'sale').length;
  const overdueCount = activeInvoices.filter(i => (i.status || '').toLowerCase() === 'overdue').length;
  const pendingOrdersCount = orders.filter(o => (o.status || 'Pending') === 'Pending').length;

  // Separate Dues for Invoices and standalone Ledger entries
  const globalDues = React.useMemo(() => {
    const round2 = v => Math.round(v * 100) / 100;
    const result = customers.reduce((acc, c) => {
      const { totalDue, invoiceDueMap } = calculateCustomerBalances(c.id, invoices, payments);
      const invDue = Object.values(invoiceDueMap).reduce((s, d) => s + d, 0);
      const legDue = Math.max(0, totalDue - invDue);
      
      return {
        totalInvoice: acc.totalInvoice + invDue,
        totalLedger: acc.totalLedger + legDue
      };
    }, { totalInvoice: 0, totalLedger: 0 });

    return {
      totalInvoice: round2(result.totalInvoice),
      totalLedger: round2(result.totalLedger)
    };
  }, [customers, invoices, payments]);

  const topRecent = activeInvoices.slice(0, 3);

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Paid': return { bg: isDark ? '#064e3b' : '#def7ec', text: isDark ? '#6ee7b7' : '#03543f' };
      case 'Pending': return { bg: isDark ? '#78350f' : '#fef3c7', text: isDark ? '#fcd34d' : '#92400e' };
      case 'Overdue': return { bg: isDark ? '#7f1d1d' : '#fde2e1', text: isDark ? '#fca5a5' : '#9b1c1c' };
      default: return { bg: isDark ? '#1e293b' : '#f1f5f9', text: isDark ? '#94a3b8' : '#475569' };
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-slate-950">
      {/* Custom Header */}
      <View style={{ backgroundColor: theme.primary }} className="flex-row items-center justify-between px-4 h-16 shadow-lg shadow-black/20 dark:border-b dark:border-slate-800">
        <View className="flex-row items-center gap-3">
          <View className="w-11 h-11 items-center justify-center rounded-2xl bg-white/15 overflow-hidden">
            {profile.logo_uri ? (
              <Image source={{ uri: profile.logo_uri }} style={{ width: 44, height: 44 }} resizeMode="cover" />
            ) : (
              <View className="bg-white rounded-[10px] items-center justify-center" style={{ width: 34, height: 34, padding: 6 }}>
                <Image source={require('../../assets/icon.png')} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              </View>
            )}
          </View>
          <View>
            <Text className="text-white text-lg font-black tracking-tight" numberOfLines={1}>
              {profile.name || 'Guest User'}
            </Text>
            <View className="flex-row items-center gap-1">
              <Text className="text-white/60 text-[8px] font-bold uppercase tracking-[0.2em]">
                {profile.business_role || t('storeOwner')}
              </Text>
              {lastSyncTime && (
                <View className="flex-row items-center gap-0.5">
                  <View className="w-1 h-1 rounded-full bg-emerald-400" />
                  <Text className="text-white/40 text-[7px] font-medium uppercase tracking-[0.1em]">Cloud Sync: {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        <View className="flex-row items-center gap-2">
          {isSyncing && (
            <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
              <MaterialCommunityIcons name="cloud-sync" size={18} color="white" />
            </View>
          )}
          <TouchableOpacity
            onPress={() => setCalcVisible(true)}
            className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
          >
            <MaterialCommunityIcons name="calculator-variant" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
          >
            <MaterialIcons name="account-circle" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-4" 
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Overview Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4 px-1">
            <Text className="text-xl font-black text-primary dark:text-white">{t('overview')}</Text>
            <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('thisMonth')}</Text>
          </View>
          
          <View className="gap-3">
            {/* Revenue & Due Row (Financial visibility for Admin/Manager only) */}
            {(currentRole === null || checkPermission(currentRole, 'canViewReports')) && (
              <View className="flex-row gap-3">
                <View className="flex-1 bg-white dark:bg-slate-900 rounded-[28px] border border-slate-50 dark:border-slate-800 p-5 shadow-xl shadow-slate-100 dark:shadow-none">
                  <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{t('totalRevenue')}</Text>
                  <Text className="text-2xl font-black text-primary dark:text-emerald-400 tracking-tighter">
                    {formatAmount(totalRevenue, profile.currency_symbol || '₹')}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('DueCustomers')}
                  className="flex-1 bg-white dark:bg-slate-900 rounded-[28px] border border-red-50 dark:border-red-900/30 p-5 shadow-xl shadow-slate-100 dark:shadow-none"
                >
                  <Text className="text-[10px] font-bold text-red-400 dark:text-red-500 uppercase tracking-[0.2em] mb-1">Invoice Due</Text>
                  <Text className="text-2xl font-black text-red-500 dark:text-red-400 tracking-tighter">
                    {formatAmount(globalDues.totalInvoice, profile.currency_symbol || '₹')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Stats Grid */}
            <View className="flex-row flex-wrap justify-between gap-y-3">
              <StatCard 
                 label={t('invoices')} 
                 value={activeInvoices.length} 
                 onPress={() => navigation.navigate('Invoices')}
                 isDark={isDark}
              />
              <StatCard 
                label={t('paid')} 
                value={paidCount} 
                color="green" 
                onPress={() => navigation.navigate('Invoices', { status: 'Paid' })}
                isDark={isDark}
              />
                <StatCard 
                  label={t('pendingOrder')} 
                  value={pendingOrdersCount} 
                  color="orange" 
                  onPress={() => navigation.navigate('Orders', { status: 'Pending' })} 
                  isDark={isDark}
                />
                
                {(currentRole === null || checkPermission(currentRole, 'canViewReports')) && (
                  <StatCard 
                    label="Ledger Due" 
                    value={formatAmount(globalDues.totalLedger, profile.currency_symbol || '₹')} 
                    color="red" 
                    onPress={() => navigation.navigate('CustomerLedger')}
                    isDark={isDark}
                  />
                )}
              </View>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View className="mb-8">
          <Text className="text-xl font-black mb-4 px-1 text-primary dark:text-white">{t('quickActions')}</Text>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            <ActionButton 
              icon="add-circle" 
              label={t('createInvoice')} 
              isPrimary 
              onPress={() => navigation.navigate('CreateInvoice')} 
              isDark={isDark}
              theme={theme}
              testID="btn-create-invoice"
            />
            <ActionButton 
              icon="inventory" 
              label={t('inventory')} 
              isPrimary 
              onPress={() => navigation.navigate('Inventory')} 
              isDark={isDark}
              theme={theme}
            />
            <ActionButton 
              icon="shopping-cart" 
              label={t('newOrder')} 
              isPrimary 
              onPress={() => navigation.navigate('CreateOrder')} 
              isDark={isDark}
              theme={theme}
            />
            <ActionButton 
              icon="person-add" 
              label={t('addCustomer')} 
              onPress={() => navigation.navigate('EditCustomerProfile')} 
              isDark={isDark}
              theme={theme}
            />
            <ActionButton 
              icon="menu-book" 
              label="Ledger" 
              onPress={() => navigation.navigate('CustomerLedger')} 
              isDark={isDark}
              theme={theme}
            />
            <ActionButton 
              icon="grid-view" 
              label={t('others')} 
              onPress={() => navigation.navigate('Others')} 
              isDark={isDark}
              theme={theme}
            />
          </View>
        </View>

        {/* Recent Invoices */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-4 px-1">
            <Text className="text-xl font-black text-primary dark:text-white">{t('recentInvoices')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Invoices')}>
              <Text className="text-blue-500 dark:text-blue-400 text-sm font-black underline">{t('viewAll')}</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-3">
            {(topRecent.length > 0 ? topRecent : []).map((item, index) => (
              <InvoiceCard key={index} item={item} getStatusStyle={getStatusStyle} isDark={isDark} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Calculator — Full Screen Modal */}
      <Modal
        visible={calcVisible}
        animationType="slide"
        transparent={false}
        statusBarTranslucent
        onRequestClose={() => setCalcVisible(false)}
      >
        <CalculatorScreen
          onClose={() => setCalcVisible(false)}
          onSendToInvoice={(amount) => {
            setCalcVisible(false);
            navigation.navigate('CalcSale', { prefillTotal: amount });
          }}
        />
      </Modal>
    </SafeAreaView>
  );
}

// Components
const StatCard = ({ label, value, color, onPress, isDark, testID }) => {
  const textColors = {
    green: 'text-green-500 dark:text-green-400',
    orange: 'text-orange-500 dark:text-orange-400',
    red: 'text-red-500 dark:text-red-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    default: 'text-primary dark:text-white'
  };
  
  const content = (
    <View className="w-full bg-white dark:bg-slate-900 rounded-[24px] border border-slate-50 dark:border-slate-800 p-4 shadow-xl shadow-slate-100 dark:shadow-none">
      <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">{label}</Text>
      <Text className={`text-2xl font-black ${textColors[color] || textColors.default}`}>{value}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity testID={testID} onPress={onPress} activeOpacity={0.75} className="w-[48%]">
        {content}
      </TouchableOpacity>
    );
  }
  
  return (
    <View className="w-[48%]">
      {content}
    </View>
  );
};

const ActionButton = ({ icon, label, onPress, isPrimary, isDark, theme, testID }) => (
  <TouchableOpacity 
    testID={testID}
    onPress={onPress} 
    style={isPrimary ? { backgroundColor: theme?.primary || '#262A56' } : {}}
    className={`w-[31%] h-24 items-center justify-center rounded-[24px] px-2 shadow-sm ${isPrimary ? '' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800'}`}
  >
    <MaterialIcons name={icon} size={28} color={isPrimary ? "white" : (isDark ? "#94a3b8" : (theme?.primary || "#262A56"))} />
    <Text className={`text-[9px] font-black text-center uppercase tracking-wider mt-2 ${isPrimary ? 'text-white' : 'text-primary dark:text-slate-300'}`}>
      {label}
    </Text>
  </TouchableOpacity>
);

const InvoiceCard = ({ item, getStatusStyle, isDark }) => {
  const profile = useStore(state => state.profile);
  const status = getStatusStyle(item.status);
  return (
    <View className="bg-white dark:bg-slate-900 border border-slate-50 dark:border-slate-800 rounded-[24px] p-4 flex-row justify-between items-center shadow-xl shadow-slate-100 dark:shadow-none">
      <View className="flex-row gap-3 items-center">
        <View className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 items-center justify-center border border-slate-100 dark:border-slate-700">
          <Text className="text-primary dark:text-white font-black text-lg">
            {item.customerName?.substring(0, 2).toUpperCase() || 'NA'}
          </Text>
        </View>
        <View>
          <Text className="font-bold text-primary dark:text-white">{item.customerName}</Text>
          <Text className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">{item.invoiceNumber} • {item.date}</Text>
        </View>
      </View>
      <View className="items-end">
        <Text className="font-black text-primary dark:text-white text-[17px]">
          {formatAmount(item.total || 0, profile.currency_symbol || '₹')}
        </Text>
        <View style={{ backgroundColor: status.bg }} className="px-2.5 py-0.5 mt-1.5 rounded-lg">
          <Text style={{ color: status.text }} className="text-[9px] font-black uppercase tracking-widest">{item.status}</Text>
        </View>
      </View>
    </View>
  );
}
