import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { useStore } from '../store/useStore';
import { checkPermission } from '../utils/permissions';

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const theme = useTheme();
  const currentRole = useStore(state => state.currentRole);
  
  const getIconName = (routeName, isFocused) => {
    switch(routeName) {
      case 'Dashboard': return isFocused ? 'home' : 'home';
      case 'Customers': return 'group';
      case 'Inventory': return 'inventory';
      case 'Invoices': return 'receipt';
      case 'Settings': return 'settings';
      default: return 'circle';
    }
  };

  const getLabel = (routeName) => {
    switch(routeName) {
      case 'Dashboard': return t('home');
      case 'Customers': return t('customers');
      case 'Inventory': return t('inventory');
      case 'Invoices': return t('invoices');
      case 'Settings': return t('settings');
      default: return routeName;
    }
  };

  return (
    <View 
      className="flex-row justify-around items-center bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800 pt-3 px-3 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      {state.routes.map((route, index) => {
        // Guard: Check permissions for the route
        if (route.name === 'Settings' && currentRole !== null && !checkPermission(currentRole, 'canViewSettings')) {
          return null;
        }

        const { options } = descriptors[route.key];
        const label = getLabel(route.name);
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            className="flex-col items-center justify-center gap-1.5 pb-2 relative"
          >
            <MaterialIcons 
              name={getIconName(route.name, isFocused)} 
              size={24} 
              color={isFocused ? theme.primary : '#94a3b8'}
            />
            <Text className={`text-[10px] font-extrabold uppercase tracking-wide ${isFocused ? 'text-primary dark:text-white' : 'text-slate-400 dark:text-slate-500 font-bold'}`}>
              {label}
            </Text>
            {isFocused && (
              <View style={{ backgroundColor: theme.primary }} className="absolute -top-3 w-8 h-1 rounded-full" />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
