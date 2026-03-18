import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Placeholder screens
import DashboardScreen from '../screens/DashboardScreen';
import CustomersScreen from '../screens/CustomersScreen';
import ItemsScreen from '../screens/ItemsScreen';
import InvoicesScreen from '../screens/InvoicesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CreateInvoiceScreen from '../screens/CreateInvoiceScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import ChallansScreen from '../screens/ChallansScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ScannerScreen from '../screens/ScannerScreen';
import OrdersScreen from '../screens/OrdersScreen';
import CreateOrderScreen from '../screens/CreateOrderScreen';
import CustomerProfileScreen from '../screens/CustomerProfileScreen';
import ReportsScreen from '../screens/ReportsScreen';
import CustomTabBar from '../components/CustomTabBar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator 
      initialRouteName="Dashboard" 
      screenOptions={{ headerShown: false }}
      tabBar={props => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Items" component={ItemsScreen} />
      <Tab.Screen name="Invoices" component={InvoicesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
      <Stack.Screen name="Challans" component={ChallansScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Scanner" component={ScannerScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
      <Stack.Screen name="CustomerProfile" component={CustomerProfileScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
    </Stack.Navigator>
  );
}
