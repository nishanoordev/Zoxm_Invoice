import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useStore } from '../store/useStore';

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
import InvoiceElementsScreen from '../screens/InvoiceElementsScreen';
import InvoiceOptionsScreen from '../screens/InvoiceOptionsScreen';
import CreateOrderScreen from '../screens/CreateOrderScreen';
import CustomerProfileScreen from '../screens/CustomerProfileScreen';
import EditCustomerProfileScreen from '../screens/EditCustomerProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import RoleManagementScreen from '../screens/RoleManagementScreen';
import ReportsScreen from '../screens/ReportsScreen';
import OthersScreen from '../screens/OthersScreen';
import ReportsDashboardScreen from '../screens/ReportsDashboardScreen';
import ReportViewerScreen from '../screens/ReportViewerScreen';
import AddItemScreen from '../screens/AddItemScreen';
import InvoiceSuccessScreen from '../screens/InvoiceSuccessScreen';
import InvoiceDetailScreen from '../screens/InvoiceDetailScreen';
import EditOrderScreen from '../screens/EditOrderScreen';
import SalesReturnScreen from '../screens/SalesReturnScreen';
import BackupRestoreScreen from '../screens/BackupRestoreScreen';
import InvoicePreviewScreen from '../screens/InvoicePreviewScreen';
import WalletHistoryScreen from '../screens/WalletHistoryScreen';

import RecordPaymentScreen from '../screens/RecordPaymentScreen';
import SaleDetailsScreen from '../screens/SaleDetailsScreen';
import DueCustomersScreen from '../screens/DueCustomersScreen';
import CustomerLedgerScreen from '../screens/CustomerLedgerScreen';
import CalcSaleScreen from '../screens/CalcSaleScreen';
import CustomTabBar from '../components/CustomTabBar';

// New Purchase System Screens
import SuppliersScreen from '../screens/SuppliersScreen';
import EditSupplierProfileScreen from '../screens/EditSupplierProfileScreen';
import PurchasesScreen from '../screens/PurchasesScreen';
import CreatePurchaseScreen from '../screens/CreatePurchaseScreen';
import InquiryScreen from '../screens/InquiryScreen';
import CreateInquiryScreen from '../screens/CreateInquiryScreen';
import SupplierProfileScreen from '../screens/SupplierProfileScreen';

// New Auth Screens from Stitch
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import JoinBusinessScreen from '../screens/JoinBusinessScreen';

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
      <Tab.Screen name="Inventory" component={ItemsScreen} />
      <Tab.Screen name="Invoices" component={InvoicesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const isLoggedIn = useStore(state => state.isLoggedIn);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="JoinBusiness" component={JoinBusinessScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} />
          <Stack.Screen name="Payments" component={PaymentsScreen} />
          <Stack.Screen name="Challans" component={ChallansScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="Scanner" component={ScannerScreen} />
          <Stack.Screen name="Orders" component={OrdersScreen} />
          <Stack.Screen name="InvoiceElements" component={InvoiceElementsScreen} />
          <Stack.Screen name="InvoiceOptions" component={InvoiceOptionsScreen} />
          <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
          <Stack.Screen name="CustomerProfile" component={CustomerProfileScreen} />
          <Stack.Screen name="EditCustomerProfile" component={EditCustomerProfileScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="RoleManagement" component={RoleManagementScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="Others" component={OthersScreen} />
          <Stack.Screen name="AddItem" component={AddItemScreen} />
          <Stack.Screen name="InvoiceSuccess" component={InvoiceSuccessScreen} />
          <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
          <Stack.Screen name="InvoicePreview" component={InvoicePreviewScreen} />
          <Stack.Screen name="WalletHistory" component={WalletHistoryScreen} />
          <Stack.Screen name="EditOrder" component={EditOrderScreen} />
          <Stack.Screen name="SalesReturn" component={SalesReturnScreen} />
          <Stack.Screen name="BackupRestore" component={BackupRestoreScreen} />

          <Stack.Screen name="RecordPayment" component={RecordPaymentScreen} />
          <Stack.Screen name="SaleDetails" component={SaleDetailsScreen} />
          <Stack.Screen name="DueCustomers" component={DueCustomersScreen} />
          <Stack.Screen name="CustomerLedger" component={CustomerLedgerScreen} />
          <Stack.Screen name="CalcSale" component={CalcSaleScreen} />
          
          <Stack.Screen name="Suppliers" component={SuppliersScreen} />
          <Stack.Screen name="SupplierProfile" component={SupplierProfileScreen} />
          <Stack.Screen name="EditSupplierProfile" component={EditSupplierProfileScreen} />
          <Stack.Screen name="Purchases" component={PurchasesScreen} />
          <Stack.Screen name="CreatePurchase" component={CreatePurchaseScreen} />
          
          <Stack.Screen name="Inquiry" component={InquiryScreen} />
          <Stack.Screen name="CreateInquiry" component={CreateInquiryScreen} />

          <Stack.Screen name="ReportsDashboard" component={ReportsDashboardScreen} />
          <Stack.Screen name="ReportViewer" component={ReportViewerScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
