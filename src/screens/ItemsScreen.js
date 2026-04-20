import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, SafeAreaView, Image, Alert, Modal } from 'react-native';
import { useStore } from '../store/useStore';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BarcodeModal from '../components/BarcodeModal';
import { useTranslation } from '../i18n/LanguageContext';
import { checkPermission } from '../utils/permissions';

export default function ItemsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const items = useStore(state => state.items);
  const profile = useStore(state => state.profile);
  const currentRole = useStore(state => state.currentRole);
  const deleteItem = useStore(state => state.deleteItem);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('All'); // 'All', 'InStock', 'LowStock', 'OutStock'
  const [barcodeItem, setBarcodeItem] = useState(null);
  const [barcodeModalVisible, setBarcodeModalVisible] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { t } = useTranslation();

  // Summary computations
  const totalUnits = items.reduce((sum, i) => sum + (parseFloat(i.quantity ?? i.stock ?? 0) || 0), 0);
  const totalStockValue = items.reduce((sum, i) => {
    const qty = parseFloat(i.quantity ?? i.stock ?? 0) || 0;
    const price = parseFloat(i.price ?? i.retail_price ?? 0) || 0;
    return sum + qty * price;
  }, 0);
  
  const filteredItems = items.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const stockStr = c.quantity ?? c.stock ?? 0;
    const stockNum = parseFloat(stockStr) || 0;

    if (filterMode === 'OutStock') return stockNum <= 0;
    if (filterMode === 'LowStock') return c.lowStock && stockNum > 0;
    if (filterMode === 'InStock') return !c.lowStock && stockNum > 0;
    return true; // 'All'
  });

  const getStockNum = (i) => parseFloat(i.quantity ?? i.stock ?? 0) || 0;
  const outOfStockCount = items.filter(i => getStockNum(i) <= 0).length;
  const lowStockCount = items.filter(i => i.lowStock && getStockNum(i) > 0).length;
  const inStockCount = items.filter(i => !i.lowStock && getStockNum(i) > 0).length;

  const handleShowBarcode = (item) => {
    setBarcodeItem(item);
    setBarcodeModalVisible(true);
  };

  const handleEdit = (item) => {
    // Navigate to AddItem screen with the item to edit
    navigation.navigate('AddItem', { item });
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(item.id);
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete item.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const stockNum = parseFloat(item.quantity ?? item.stock ?? 0) || 0;
    const isOutOfStock = stockNum <= 0;
    
    return (
    <View className="bg-white dark:bg-primary/40 rounded-2xl mb-4 border border-primary/10 overflow-hidden shadow-sm">
      {/* Stock status ribbon */}
      {(item.lowStock || isOutOfStock) && (
        <View className="absolute top-0 right-0 w-16 h-16 pointer-events-none z-10">
          <View className={`absolute top-2 -right-4 py-0.5 px-5 rotate-45 ${isOutOfStock ? 'bg-slate-700' : 'bg-red-500'}`}>
            <Text className="text-[8px] font-bold text-white uppercase text-center">{isOutOfStock ? 'OUT OF STOCK' : 'Low'}</Text>
          </View>
        </View>
      )}

      {/* Main row */}
      <TouchableOpacity
        className="flex-row items-center gap-4 p-4"
        onPress={() => handleEdit(item)}
      >
        <View className="w-16 h-16 rounded-lg bg-primary/5 dark:bg-primary/40 items-center justify-center overflow-hidden border border-primary/10">
          {item.img ? <Image source={{ uri: item.img }} className="w-full h-full object-cover" /> : (
            <MaterialIcons name="inventory-2" size={28} color="#121642" style={{ opacity: 0.25 }} />
          )}
        </View>

        <View className="flex-1 min-w-0">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate flex-1">{item.name}</Text>
            {item.category ? (
              <View className="px-2 py-0.5 rounded-full bg-primary/5 dark:bg-primary/40 mr-1">
                <Text className="text-primary dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider">{item.category}</Text>
              </View>
            ) : null}
          </View>
          <Text className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">SKU: {item.sku || '—'}</Text>
          <View className="flex-row items-center justify-between mt-1.5 pr-2">
            <Text className="text-primary font-bold text-base">
              {profile.currency_symbol || '₹'}{(item.price || item.retail_price || 0).toFixed(2)}
            </Text>
            <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded ${isOutOfStock ? 'bg-slate-200 dark:bg-slate-800' : item.lowStock ? 'bg-red-100 dark:bg-red-900/30' : 'bg-slate-100 dark:bg-primary/60'}`}>
              <MaterialIcons
                name={isOutOfStock ? 'remove-shopping-cart' : item.lowStock ? 'priority-high' : 'inventory-2'}
                size={14}
                color={isOutOfStock ? '#64748b' : item.lowStock ? '#ef4444' : '#22c55e'}
              />
              <Text className={`text-[11px] font-medium ${isOutOfStock ? 'text-slate-600 dark:text-slate-400' : item.lowStock ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                {stockNum} {t('units')}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Action footer */}
      <View className="flex-row border-t border-slate-100 dark:border-slate-800">
        <TouchableOpacity
          onPress={() => handleShowBarcode(item)}
          className="flex-1 flex-row items-center justify-center gap-2 py-2.5 border-r border-slate-100 dark:border-slate-800"
        >
          <MaterialIcons name="view-week" size={16} color="#ec5b13" />
          <Text className="text-[11px] font-bold text-accent uppercase tracking-wider">{t('barcode')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleEdit(item)}
          className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 ${checkPermission(currentRole, 'canDeleteRecords') ? 'border-r border-slate-100 dark:border-slate-800' : ''}`}
        >
          <MaterialIcons name="edit" size={16} color="#121642" />
          <Text className="text-[11px] font-bold text-primary uppercase tracking-wider">{t('edit')}</Text>
        </TouchableOpacity>

        {checkPermission(currentRole, 'canDeleteRecords') && (
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            className="flex-1 flex-row items-center justify-center gap-2 py-2.5"
          >
            <MaterialIcons name="delete-outline" size={16} color="#ef4444" />
            <Text className="text-[11px] font-bold text-red-500 uppercase tracking-wider">{t('delete')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark border-x border-primary/10 pt-12">
      <View className="pt-2 px-4 pb-2 space-y-4 bg-background-light dark:bg-background-dark sticky top-0 z-10">
        {/* Header row — matching Invoices screen layout */}
        <View className="flex-row items-center justify-between">
          <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800" onPress={() => setShowMenu(true)}>
            <MaterialIcons name="menu" size={24} className="text-slate-900 dark:text-slate-100" />
          </TouchableOpacity>

          <Text className="flex-1 text-center text-lg font-black text-primary dark:text-slate-100">{t('inventory')}</Text>

          <View className="flex-row gap-2">
            <TouchableOpacity
              className="w-10 h-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800"
              onPress={() => navigation.navigate('Scanner')}
            >
              <MaterialIcons name="qr-code-scanner" size={22} className="text-slate-900 dark:text-slate-100" />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-10 h-10 items-center justify-center rounded-full bg-primary dark:bg-primary shadow-lg shadow-primary/30"
              onPress={() => navigation.navigate('AddItem')}
            >
              <MaterialIcons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="relative">
          <View className="absolute left-3 top-3 z-20">
            <MaterialIcons name="search" size={20} color="#94a3b8" />
          </View>
          <TextInput
            placeholder="Search items, SKUs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="bg-white dark:bg-primary/40 h-11 pl-10 pr-4 rounded-xl border border-primary/10 text-sm text-slate-900 dark:text-slate-100"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Action Filters */}
        <View className="flex-row gap-2 mt-1">
          <TouchableOpacity 
            onPress={() => setFilterMode('All')}
            className={`flex-1 items-center justify-center rounded-xl py-2 border ${filterMode === 'All' ? 'bg-primary border-primary' : 'bg-primary/5 border-primary/10'}`}
          >
            <Text className={`text-[10px] font-bold uppercase tracking-wider ${filterMode === 'All' ? 'text-white' : 'text-slate-500'}`}>{t('all')}</Text>
            <Text className={`text-sm font-black ${filterMode === 'All' ? 'text-white' : 'text-primary'}`}>{items.length}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilterMode('InStock')}
            className={`flex-1 items-center justify-center rounded-xl py-2 border ${filterMode === 'InStock' ? 'bg-emerald-500 border-emerald-500' : 'bg-emerald-50 border-emerald-100'}`}
          >
            <Text className={`text-[10px] font-bold uppercase tracking-wider ${filterMode === 'InStock' ? 'text-white' : 'text-emerald-500'}`}>{t('inStock')}</Text>
            <Text className={`text-sm font-black ${filterMode === 'InStock' ? 'text-emerald-50' : 'text-emerald-600'}`}>{inStockCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilterMode('LowStock')}
            className={`flex-1 items-center justify-center rounded-xl py-2 border ${filterMode === 'LowStock' ? 'bg-orange-500 border-orange-500' : 'bg-orange-50 border-orange-100'}`}
          >
            <Text className={`text-[10px] font-bold uppercase tracking-wider ${filterMode === 'LowStock' ? 'text-white' : 'text-orange-500'}`}>{t('lowStock')}</Text>
            <Text className={`text-sm font-black ${filterMode === 'LowStock' ? 'text-orange-50' : 'text-orange-600'}`}>{lowStockCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilterMode('OutStock')}
            className={`flex-1 items-center justify-center rounded-xl py-2 border ${filterMode === 'OutStock' ? 'bg-slate-700 border-slate-700' : 'bg-slate-100 border-slate-200'}`}
          >
            <Text className={`text-[10px] font-bold uppercase tracking-wider ${filterMode === 'OutStock' ? 'text-white' : 'text-slate-500'}`}>{t('outOfStock')}</Text>
            <Text className={`text-sm font-black ${filterMode === 'OutStock' ? 'text-white' : 'text-slate-700'}`}>{outOfStockCount}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom + 80, 100) }}
        className="flex-1"
        ListEmptyComponent={
          <View className="items-center justify-center py-20 opacity-40">
            <MaterialIcons name="inventory" size={64} color="#94a3b8" />
            <Text className="text-slate-500 font-bold mt-4">{t('noInventory')}</Text>
            <Text className="text-slate-400 text-xs mt-1">{t('tapToAdd')}</Text>
          </View>
        }
      />

      {/* Barcode Modal */}
      <BarcodeModal
        visible={barcodeModalVisible}
        onClose={() => { setBarcodeModalVisible(false); setBarcodeItem(null); }}
        item={barcodeItem}
      />

      {/* Hamburger Menu Modal — Inventory Summary */}
      <Modal visible={showMenu} animationType="fade" transparent={true} onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View className="absolute top-24 left-4 bg-white dark:bg-slate-900 rounded-2xl w-72 shadow-xl overflow-hidden">
            {/* Header */}
            <View style={{ backgroundColor: '#121642', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="inventory" size={18} color="#ec5b13" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.5, textTransform: 'uppercase' }}>Inventory Summary</Text>
            </View>

            {/* Stats Row */}
            <View style={{ flexDirection: 'row' }}>
              {/* Total Items */}
              <View style={{ flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: 'rgba(18,22,66,0.07)' }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(18,22,66,0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  <MaterialIcons name="category" size={18} color="#121642" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#121642', lineHeight: 24 }}>{items.length}</Text>
                <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Products</Text>
              </View>

              {/* Total Units */}
              <View style={{ flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: 'rgba(18,22,66,0.07)' }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(34,197,94,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  <MaterialIcons name="layers" size={18} color="#16a34a" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#16a34a', lineHeight: 24 }}>{totalUnits.toLocaleString()}</Text>
                <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tot. Units</Text>
              </View>

              {/* Stock Value (Staff doesn't see financial totals) */}
              {checkPermission(currentRole, 'canViewReports') && (
                <View style={{ flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(236,91,19,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    <MaterialIcons name="payments" size={18} color="#ec5b13" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#ec5b13', lineHeight: 24 }} numberOfLines={1}>
                    {profile.currency_symbol || '₹'}{totalStockValue >= 1000 ? (totalStockValue / 1000).toFixed(1) + 'K' : totalStockValue.toFixed(0)}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Stock Val.</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
