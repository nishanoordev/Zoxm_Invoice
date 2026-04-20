import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Platform } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';

export default function OthersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const orders = useStore(state => state.orders);
  const pendingCount = orders.filter(o => (o.status || 'Pending') === 'Pending').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfdff' }}>
      {/* ── Premium Header ── */}
      <View style={{ 
        backgroundColor: '#262A56', 
        paddingHorizontal: 20, 
        paddingTop: Platform.OS === 'ios' ? 10 : 40, 
        paddingBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: '#262A56', shadowOpacity: 0.3, shadowRadius: 15, elevation: 10
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-2xl bg-white/10">
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>Menu & Others</Text>
          <View className="w-10 h-10" />
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-4" 
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Reports & Analytics */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('Reports')}
          style={{
            backgroundColor: '#fff', borderRadius: 28, padding: 20,
            borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16,
            flexDirection: 'row', alignItems: 'center', gap: 16,
            shadowColor: '#64748b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 3
          }}
        >
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#ECFEFF', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="bar-chart" size={28} color="#06b6d4" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: '#262A56' }}>Reports & Analytics</Text>
            <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.5 }}>Insights and summaries</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
        </TouchableOpacity>

        {/* Pending Orders */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('Orders')}
          style={{
            backgroundColor: '#fff', borderRadius: 28, padding: 20,
            borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16,
            flexDirection: 'row', alignItems: 'center', gap: 16,
            shadowColor: '#64748b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 3
          }}
        >
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="clipboard-text-clock-outline" size={28} color="#6366f1" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: '#262A56' }}>Pending Orders</Text>
            <View style={{ backgroundColor: '#fff7ed', alignSelf: 'flex-start', px: 8, py: 2, borderRadius: 8, marginTop: 4 }}>
              <Text style={{ color: '#c2410c', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' }}>
                {pendingCount > 0 ? `${pendingCount} Pending` : 'No Pending'}
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
        </TouchableOpacity>

        {/* Delivery Challan */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('Challans')}
          style={{
            backgroundColor: '#fff', borderRadius: 28, padding: 20,
            borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16,
            flexDirection: 'row', alignItems: 'center', gap: 16,
            shadowColor: '#64748b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 3
          }}
        >
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="local-shipping" size={28} color="#3b82f6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: '#262A56' }}>Delivery Challan</Text>
            <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.5 }}>Manage shipments</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
        </TouchableOpacity>

        {/* Suppliers */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('Suppliers')}
          style={{
            backgroundColor: '#fff', borderRadius: 28, padding: 20,
            borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16,
            flexDirection: 'row', alignItems: 'center', gap: 16,
            shadowColor: '#64748b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 3
          }}
        >
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="local-shipping" size={28} color="#10b981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: '#262A56' }}>Suppliers</Text>
            <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.5 }}>Manage vendors</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
        </TouchableOpacity>

        {/* Purchase Bills */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('Purchases')}
          style={{
            backgroundColor: '#fff', borderRadius: 28, padding: 20,
            borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16,
            flexDirection: 'row', alignItems: 'center', gap: 16,
            shadowColor: '#64748b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 3
          }}
        >
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="receipt-long" size={28} color="#f97316" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: '#262A56' }}>Purchase Bills</Text>
            <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.5 }}>Record purchases</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
        </TouchableOpacity>

        {/* Sales Return */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('SalesReturn')}
          style={{
            backgroundColor: '#fff', borderRadius: 28, padding: 20,
            borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16,
            flexDirection: 'row', alignItems: 'center', gap: 16,
            shadowColor: '#64748b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 3
          }}
        >
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="assignment-return" size={28} color="#f43f5e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: '#262A56' }}>Sales Return</Text>
            <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.5 }}>Process returns</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
        </TouchableOpacity>

        {/* Payment Records */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('Payments')}
          style={{
            backgroundColor: '#fff', borderRadius: 28, padding: 20,
            borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16,
            flexDirection: 'row', alignItems: 'center', gap: 16,
            shadowColor: '#64748b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 3
          }}
        >
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="payments" size={28} color="#14b8a6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: '#262A56' }}>Payment Records</Text>
            <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.5 }}>Track received payments</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
        </TouchableOpacity>

        {/* Inquiry Management */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('Inquiry')}
          style={{
            backgroundColor: '#fff', borderRadius: 28, padding: 20,
            borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 24,
            flexDirection: 'row', alignItems: 'center', gap: 16,
            shadowColor: '#64748b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 3
          }}
        >
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#FAF5FF', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="question-answer" size={28} color="#a855f7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: '#262A56' }}>Inquiry</Text>
            <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.5 }}>Lead tracking</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
        </TouchableOpacity>

        {/* Premium Features Upgrade Banner */}
        <View className="bg-primary rounded-[32px] p-8 shadow-2xl shadow-primary/40 relative overflow-hidden">
          {/* Subtle Background Pattern/Gradient Pseudo-element */}
          <View className="absolute top-[-50] right-[-50] w-40 h-40 rounded-full bg-white/5" />
          
          <View className="items-center">
            <View className="w-16 h-16 rounded-full bg-white/10 items-center justify-center mb-6">
              <MaterialCommunityIcons name="rocket-launch" size={32} color="white" />
            </View>
            
            <Text className="text-2xl font-black text-white text-center mb-2">Premium Features</Text>
            <Text className="text-white/70 text-center text-sm font-medium px-4 mb-8 leading-5">
              Unlock automated tax calculations and recurring billing.
            </Text>
            
            <TouchableOpacity 
              className="bg-white px-8 py-4 rounded-2xl shadow-lg shadow-black/20"
              activeOpacity={0.8}
            >
              <Text className="text-primary font-black text-sm uppercase tracking-widest">Upgrade Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
