import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, SafeAreaView, Image } from 'react-native';
import { useStore } from '../store/useStore';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ItemsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const items = useStore(state => state.items);
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredItems = items.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const dummyItems = [
    { id: '1', name: 'Wireless Mouse', sku: 'WM-001', category: 'Electronics', price: 25.00, stock: 15, lowStock: false, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCopIIz1juFiI494W33OpP4KHTHv0pAWyz6pcb9uTTOZry85wjFIB-am-pt0JKjo1UDB7ZoDJlQ6gQMf8vN7Wh0L7XMT65YZh0P0h-h8Eld-dnfW4A7z5HlBL4PHY-s5XF64ix-H_8-SeIxTGfBc3WDQiYdGl6jH7Ntk8FCfeJF5IaThlQecQD-vg23GmQ4Z5bhrPsHVWTiTfH937GvNZ-Wc21_Er5TqVTVmJJdKSD8a7rRR92yHS09S0UZIkjIN3cUR0XqgF951ag' },
    { id: '2', name: 'Pro Headphones', sku: 'PH-102', category: 'Electronics', price: 120.00, stock: 4, lowStock: false, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwES4PSEN9Iz3Oq9LrFc-PimlUOsoXZe01NslwyEBcQ7JiPF-PlfaUhQb0PfvFQJHFxUXVMkmxssYocwJ5NDe-z2ae7_0xICTA7UxfSFyaCmVStDd6tkVsKpIsxFf4PJlE6mwtwFSqSL9vx9HE_CWitcBB2iPg910aw7hNct7qrMhybOYEDsXBCkwZkXeHAjGaeTQgD6u1_mJswyYCpArV_sgkMVOsKy2-lVMUVuhPs1A780As-wD2cUt087SkzuMDmVBGKLB_ajs' },
    { id: '3', name: 'LED Desk Lamp', sku: 'DL-88', category: 'Office', price: 45.00, stock: 42, lowStock: false, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCko-uhM2SOAYB1N1QCXw_1YQMJ-DLiiY1GhuotE5QklEpcneTuebygDVO3OYW1GGTQb00fJeJxh7wPmYQpJlSG36sT3LERE_OFJi4pktG4jJlamG5V0dVd7S8aGyuCFgWnVeQF2sOO37ZbEKJ2AJHM9Ji1DbDJ7GtZ0r4_qD0fpTSHeCUBhMpqJN1xjppI_uxWp4NEfddHQOQ7doOaVgw4glbm4iXNrRThMHOV1_uo9LVg3sFj1hiuAOAKkFKmpQxNIz3qVmnUY5M' },
    { id: '4', name: 'MacBook Stand', sku: 'MS-099', category: 'Office', price: 59.00, stock: 2, lowStock: true, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNz2SjLHkPDfFSZnifDNMancvA8o_AjKzoLqlLsomjXLBz5vLUu_1SxBQVnUp5c_K1xlXLEGtX48-wPTLoUx8AqQZE9PZ5R6wzU59SasHliZQH8q7eYwFocs1XoudAgqhgfPhUnbteTD2IIapFVGI1RzL_91O2_qnofbHcQQtl3USAuTvMwHLo_BFfK6GQc0FS0ejrJBiLY8qPBUIRVuH-PAfAcWW5jyGf5bSoB0rYJDwNSvp1zfvdTDpfxhyUNspiidyhDjoRH8I' },
    { id: '5', name: 'Ergo Chair V2', sku: 'EC-400', category: 'Furniture', price: 349.00, stock: 8, lowStock: false, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDPG-nmt8vtQ_TwPZkxObnlnjrFyTnxHHNKOoffkO1MPK99EPJstrLL3-tvXHLcx8gFl2a-erx4gpsjOXMRt_nwvZcezrlVtPQkw5NN3o4plTuq-EIB0A5-HQPhrlFOxN_LOvHmulRWRFqDSeT4wjH55eKF7D5-b8KYE6KhJdYiruKYNwDuV3hl7GrAkrYmC6vj2yAKEPXWD-OXLZmBV3t8MB5goEsjDeRH23ORe_P7J6UJ1inEXsyCv4tzPNiCABmMoMCpkuL7iEg' }
  ];

  const renderItem = ({ item }) => (
    <View className={`flex-row items-center gap-3 p-3 rounded-xl bg-white dark:bg-primary/20 shadow-sm mb-3 overflow-hidden ${item.lowStock ? 'border border-red-500/20' : 'border border-primary/5'}`}>
      {item.lowStock && (
         <View className="absolute top-0 right-0 w-16 h-16 pointer-events-none z-10 overflow-hidden">
            <View className="absolute top-2 -right-4 bg-red-500 text-white py-0.5 px-5 rotate-45">
              <Text className="text-[8px] font-bold text-white uppercase text-center">Low</Text>
            </View>
         </View>
      )}
      <View className="w-16 h-16 rounded-lg bg-primary/5 dark:bg-primary/40 items-center justify-center overflow-hidden border border-primary/10">
         {item.img ? <Image source={{uri: item.img}} className="w-full h-full object-cover" /> : null}
      </View>
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center justify-between gap-2">
           <Text className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate flex-1">{item.name}</Text>
           <View className="px-2 py-0.5 rounded-full bg-primary/5 dark:bg-primary/40 mr-1">
             <Text className="text-primary dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider">{item.category}</Text>
           </View>
        </View>
        <Text className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">SKU: {item.sku}</Text>
        <View className="flex-row items-center justify-between mt-1.5 pr-2">
           <Text className="text-sm font-semibold text-accent">${item.price.toFixed(2)}</Text>
           <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded ${item.lowStock ? 'bg-red-100 dark:bg-red-900/30' : 'bg-slate-100 dark:bg-primary/60'}`}>
              <MaterialIcons name={item.lowStock ? "priority-high" : "inventory-2"} size={14} color={item.lowStock ? "#ef4444" : "#22c55e"} />
              <Text className={`text-[11px] font-medium ${item.lowStock ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                 {item.stock} units
              </Text>
           </View>
        </View>
      </View>
      <TouchableOpacity className="p-2 rounded-lg z-20">
         <MaterialIcons name="qr-code-2" size={24} className="text-accent" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark border-x border-primary/10 pt-12">
      <View className="pt-2 px-4 pb-2 space-y-4 bg-background-light dark:bg-background-dark sticky top-0 z-10">
        <View className="flex-row items-center justify-between">
           <Text className="text-2xl font-bold tracking-tight text-primary dark:text-white">Inventory</Text>
           <TouchableOpacity className="items-center justify-center w-10 h-10 rounded-full bg-accent hover:bg-accent/90 shadow-lg">
             <MaterialIcons name="add" size={24} color="white" />
           </TouchableOpacity>
        </View>
        
        <View className="relative w-full rounded-xl bg-white dark:bg-primary/20 border border-primary/10 shadow-sm flex-row items-center px-4 py-2 mt-4">
           <MaterialIcons name="search" size={20} className="text-primary/60 dark:text-primary/40 mr-2" />
           <TextInput 
             className="w-full h-full text-slate-900 dark:text-slate-100 text-sm"
             placeholder="Search items, SKUs..."
             placeholderTextColor="#94a3b8"
             value={searchQuery}
             onChangeText={setSearchQuery}
           />
        </View>

        <View className="flex-row items-center gap-2 py-1.5 px-1 bg-white dark:bg-primary/30 rounded-lg border border-primary/10 shadow-sm mt-4">
           <Text className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-r border-slate-200 dark:border-primary/20">Bulk</Text>
           <View className="flex-1 flex-row gap-2 pl-2">
              <TouchableOpacity className="flex-row items-center gap-1.5 px-3 py-1 rounded-md">
                 <MaterialIcons name="upload-file" size={16} className="text-accent" />
                 <Text className="text-[11px] font-semibold text-primary dark:text-slate-300">Import</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center gap-1.5 px-3 py-1 rounded-md">
                 <MaterialIcons name="download" size={16} className="text-accent" />
                 <Text className="text-[11px] font-semibold text-primary dark:text-slate-300">Export CSV</Text>
              </TouchableOpacity>
           </View>
        </View>

        <View className="flex-row gap-2 mt-4 pb-2">
           <TouchableOpacity className="h-8 items-center justify-center rounded-full bg-primary px-4">
              <Text className="text-white text-xs font-semibold">All</Text>
           </TouchableOpacity>
           <TouchableOpacity className="h-8 flex-row items-center justify-center gap-1 rounded-full bg-white dark:bg-primary/40 px-4 border border-primary/10">
              <Text className="text-slate-700 dark:text-slate-300 text-xs font-medium">Electronics</Text>
              <MaterialIcons name="keyboard-arrow-down" size={16} className="text-slate-700 dark:text-slate-300" />
           </TouchableOpacity>
           <TouchableOpacity className="h-8 flex-row items-center justify-center gap-1 rounded-full bg-white dark:bg-primary/40 px-4 border border-primary/10">
              <Text className="text-slate-700 dark:text-slate-300 text-xs font-medium">Office</Text>
              <MaterialIcons name="keyboard-arrow-down" size={16} className="text-slate-700 dark:text-slate-300" />
           </TouchableOpacity>
        </View>
      </View>

      <FlatList 
        data={items.length > 0 ? filteredItems : dummyItems}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        className="flex-1"
      />
    </SafeAreaView>
  );
}
