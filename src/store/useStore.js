import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useStore = create(
  persist(
    (set) => ({
      profile: {
        name: 'JS Global Trading',
        email: '',
      },
      customers: [],
      items: [],
      invoices: [],
      payments: [],
      challans: [],
      history: [],

      // Actions
      addCustomer: (customer) => set((state) => ({ customers: [...state.customers, customer] })),
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      addInvoice: (invoice) => set((state) => ({ invoices: [...state.invoices, invoice] })),
      addPayment: (payment) => set((state) => ({ payments: [...state.payments, payment] })),
      addHistory: (event) => set((state) => ({ history: [...state.history, event] })),
      updateProfile: (profile) => set({ profile }),

      // Setting Firebase Cloud Sync triggers
      syncToCloud: async () => {
        // Todo: Implement firebase sync logic
        console.log('Syncing to cloud...');
      }
    }),
    {
      name: 'zoxm-storage', // unique name
      storage: createJSONStorage(() => AsyncStorage), // async storage for React Native
    }
  )
);
