import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  
  const getIconName = (routeName, isFocused) => {
    switch(routeName) {
      case 'Dashboard': return isFocused ? 'home' : 'home';
      case 'Customers': return 'group';
      case 'Items': return 'inventory';
      case 'Invoices': return 'receipt';
      case 'Settings': return 'settings';
      default: return 'circle';
    }
  };

  const getLabel = (routeName) => {
    if (routeName === 'Dashboard') return 'Home';
    return routeName;
  };

  return (
    <View 
      className="flex-row justify-around items-center bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800 pt-3 px-3 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      {state.routes.map((route, index) => {
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
              className={isFocused ? 'text-primary dark:text-white' : 'text-slate-400 dark:text-slate-500'}
            />
            <Text className={`text-[10px] font-extrabold uppercase tracking-wide ${isFocused ? 'text-primary dark:text-white' : 'text-slate-400 dark:text-slate-500 font-bold'}`}>
              {label}
            </Text>
            {isFocused && (
              <View className="absolute -top-3 w-8 h-1 bg-primary rounded-full" />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
