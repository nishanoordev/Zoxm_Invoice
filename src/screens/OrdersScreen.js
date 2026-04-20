import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, FlatList, Linking, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';

const STATUS_COLORS = {
  Pending: { bg: '#fef3c7', text: '#92400e', icon: 'hourglass-empty' },
  Processing: { bg: '#dbeafe', text: '#1e40af', icon: 'cached' },
  Completed: { bg: '#dcfce7', text: '#166534', icon: 'check-circle' },
  Cancelled: { bg: '#fee2e2', text: '#991b1b', icon: 'cancel' },
};

export default function OrdersScreen({ navigation, route }) {
  const orders = useStore(state => state.orders);
  const customers = useStore(state => state.customers);
  const profile = useStore(state => state.profile);
  const [activeFilter, setActiveFilter] = useState(route?.params?.status || 'All Orders');

  const filters = ['All Orders', 'Pending', 'Processing', 'Completed', 'Cancelled'];

  // Update filter if route params change
  React.useEffect(() => {
    if (route?.params?.status) {
      setActiveFilter(route.params.status);
    }
  }, [route?.params?.status]);

  const filteredOrders = activeFilter === 'All Orders'
    ? orders
    : orders.filter(o => (o.status || 'Pending').toLowerCase() === activeFilter.toLowerCase());

  const sym = profile?.currency_symbol || '₹';

  const handleNotify = (item) => {
    const cid = item.customerId || item.customer_id;
    const customer = customers.find(c => c.id === cid);
    const phone = customer?.phone;
    const name = item.customerName || item.customer_name || 'Customer';
    const orderNum = item.orderNumber || item.order_number || item.id?.slice(-6);
    const itemNames = (item.items || []).map(i => i.name).filter(Boolean).join(', ') || 'your ordered items';
    const message = `Hi ${name}, your order #${orderNum} (${itemNames}) is ready for pickup/delivery! - ${profile?.name || 'ZOXM'}`;

    if (!phone) {
      Alert.alert('No Phone Number', `${name} doesn't have a phone number saved. Please update their profile.`);
      return;
    }

    Alert.alert(
      `Notify ${name}`,
      `Order #${orderNum}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '📞 Call',
          onPress: () => Linking.openURL(`tel:${phone}`),
        },
        {
          text: '💬 WhatsApp',
          onPress: () => {
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
            Linking.openURL(`whatsapp://send?phone=${waPhone}&text=${encodeURIComponent(message)}`).catch(() =>
              Alert.alert('WhatsApp not installed', 'WhatsApp is not available on this device.')
            );
          },
        },
        {
          text: '📱 SMS',
          onPress: () => Linking.openURL(`sms:${phone}?body=${encodeURIComponent(message)}`),
        },
      ]
    );
  };

  const renderOrder = ({ item }) => {
    const status = item.status || 'Pending';
    const colors = STATUS_COLORS[status] || STATUS_COLORS.Pending;
    const itemCount = (item.items || []).length;
    const advance = parseFloat(item.advance_amount || item.advanceAmount || 0);
    const orderTotal = parseFloat(item.total || 0);
    const remaining = Math.max(0, orderTotal - advance);
    const progressPercent = orderTotal > 0 ? Math.min(100, (advance / orderTotal) * 100) : 0;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('EditOrder', { order: item })}
        activeOpacity={0.7}
        style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#e2e8f0',
          padding: 16,
          marginBottom: 14,
          shadowColor: '#64748b',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* Top Row: Status + Order Number */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>{status}</Text>
          </View>
          <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
            #{item.orderNumber || item.order_number || item.id?.slice(-6)}
          </Text>
        </View>

        {/* Customer + Total */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#272756' + '15', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name={colors.icon} size={22} color="#272756" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }} numberOfLines={1}>
              {item.customerName || item.customer_name || 'Walk-in Customer'}
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '500', marginTop: 2 }}>
              {item.date || ''}{item.deliveryDate || item.delivery_date ? ` · Deliver: ${item.deliveryDate || item.delivery_date}` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#272756', fontSize: 18, fontWeight: '900' }}>{sym}{orderTotal.toFixed(2)}</Text>
            <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '500' }}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Text>
          </View>
        </View>

        {/* Advance & Balance Row */}
        {advance > 0 && (
          <View style={{ marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#f1f5f9' }}>
            {/* Progress bar */}
            <View style={{ height: 4, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
              <View style={{ height: 4, width: `${progressPercent}%`, backgroundColor: remaining <= 0 ? '#10b981' : '#f59e0b', borderRadius: 4 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Advance Paid</Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#10b981' }}>{sym}{advance.toFixed(2)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Remaining</Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: remaining > 0 ? '#ef4444' : '#10b981' }}>
                  {remaining <= 0 ? '✓ Paid' : `${sym}${remaining.toFixed(2)}`}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Notify Button — for Pending / Processing orders */}
        {(status === 'Pending' || status === 'Processing' || status === 'Completed') && status !== 'Cancelled' && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); handleNotify(item); }}
            style={{
              marginTop: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              backgroundColor: '#eff6ff',
              borderWidth: 1,
              borderColor: '#bfdbfe',
              borderRadius: 12,
              paddingVertical: 8,
            }}
          >
            <MaterialIcons name="notifications-active" size={16} color="#2563eb" />
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5 }}>Notify Customer</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc', paddingTop: 48 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', padding: 16, justifyContent: 'space-between' }}>
        <TouchableOpacity style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="menu" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800', flex: 1, marginLeft: 8 }}>Orders</Text>
        <TouchableOpacity style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#f1f5f9' }}>
          <MaterialIcons name="search" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={{ backgroundColor: '#fff' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 8 }}>
          {filters.map(filter => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={{
                height: 36,
                paddingHorizontal: 20,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: activeFilter === filter ? '#272756' : '#f1f5f9',
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: '700',
                color: activeFilter === filter ? '#fff' : '#64748b',
              }}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={item => item.id}
        renderItem={renderOrder}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ paddingVertical: 80, alignItems: 'center' }}>
            <MaterialIcons name="shopping-basket" size={64} color="#e2e8f0" />
            <Text style={{ color: '#94a3b8', marginTop: 16, fontWeight: '500', textAlign: 'center' }}>
              {activeFilter === 'All Orders' ? 'No orders yet.\nCreate your first order!' : `No ${activeFilter} orders.`}
            </Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate('CreateOrder')}
        style={{
          position: 'absolute',
          bottom: 96,
          right: 24,
          width: 56,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 28,
          backgroundColor: '#272756',
          shadowColor: '#272756',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <MaterialIcons name="add" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
