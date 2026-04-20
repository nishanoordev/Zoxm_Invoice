import { create } from 'zustand';
import * as DbServices from '../database/services';
import * as firebaseSync from '../services/firebaseSync';
import {
  loginUser,
  logoutUser,
  ownerSignUp,
  staffJoin,
  fetchBusinessStaff,
  updateMemberRole,
  removeMemberFromBusiness,
  refreshInviteCode,
  googleSignInWithFirebase,
} from '../services/authService';

// ── Module-level real-time sync refs (outside Zustand so they don't cause re-renders) ──
let _rtUnsubscribe = null;
let _syncDebounce  = null;

export const useStore = create((set, get) => ({
  // State
  profile: { name: '', email: '', currency_code: 'INR', currency_symbol: '₹', logo_uri: '', signature_uri: '', payment_instructions: '', bank_details: '', upi_qr_uri: '', gstin: '', pan_no: '', colorTheme: 'ocean' },
  customers: [],
  items: [],
  invoices: [],
  orders: [],
  payments: [],
  challans: [],
  salesReturns: [],
  users: [],
  suppliers: [],
  purchases: [],
  supplierPayments: [],
  inquiries: [],
  customerWallets: {},   // { [customerId]: walletBalance }
  history: [],
  firebaseUser: null,   // firebase Auth user object
  currentRole: null,    // 'admin' | 'staff' | null
  businessId: null,     // Firebase business node key
  teamMembers: [],      // Firebase team staff list
  businessInviteCode: null,
  isSyncing: false,
  lastSyncTime: null,

  // ========== LOAD ALL DATA FROM SQLite ==========
  loadFromDb: async () => {
    try {
      const [profile, customers, items, invoices, orders, payments, challans, history, users, salesReturns, suppliers, purchases, supplierPayments, inquiries, customerWallets] = await Promise.all([
        DbServices.getProfile(),
        DbServices.getCustomers(),
        DbServices.getItems(),
        DbServices.getInvoices(true),
        DbServices.getOrders(),
        DbServices.getPayments(),
        DbServices.getChallans(),
        DbServices.getHistory(),
        DbServices.getUsers(),
        DbServices.getSalesReturns(),
        DbServices.getSuppliers(),
        DbServices.getPurchases(),
        DbServices.getSupplierPayments(),
        DbServices.getInquiries(),
        DbServices.getAllWalletBalances(),
      ]);

      set({
        profile: (() => {
          const p = profile || { name: '', email: '', currency_code: 'INR', currency_symbol: '₹', upi_qr_uri: '', gstin: '', pan_no: '' };
          return {
            ...p,
            // Parse invoiceConfig JSON once at load time
            invoiceConfig: (() => {
              try { return JSON.parse(p.invoice_config) || null; } catch { return null; }
            })(),
          };
        })(),
        customers: (customers || []).map(c => ({
          ...c,
          createdAt: c.created_at || c.createdAt
        })),
        items: (items || []).map(item => ({
          ...item,
          description: item.description || '',
          retailPrice: item.retail_price || item.retailPrice || 0,
          wholesalePrice: item.wholesale_price || item.wholesalePrice || 0,
          lowStockThreshold: item.low_stock_threshold || item.lowStockThreshold || 5,
          hsnCode: item.hsn_code || item.hsnCode || '',
          createdAt: item.created_at || item.createdAt,
          price: item.retail_price || item.price || 0,
          stock: item.quantity || item.stock || 0,
          lowStock: (item.quantity || item.stock || 0) < (item.low_stock_threshold || 5),
        })),
        orders: (orders || []).map(ord => ({
          ...ord,
          orderNumber: ord.order_number || ord.orderNumber,
          customerId: ord.customer_id || ord.customerId,
          customerName: ord.customer_name || ord.customerName,
          deliveryDate: ord.delivery_date || ord.deliveryDate,
          items: (() => { try { return JSON.parse(ord.items_json || '[]'); } catch { return []; } })(),
          createdAt: ord.created_at || ord.createdAt
        })),
        invoices: (invoices || []).map(inv => ({
          ...inv,
          invoiceNumber: inv.invoice_number || inv.invoiceNumber,
          customerId: inv.customer_id || inv.customerId,
          customerName: inv.customer_name || inv.customerName,
          dueDate: inv.due_date || inv.dueDate,
          paymentMode: inv.payment_mode || inv.paymentMode || 'Cash',
          taxPercent: inv.tax_percent || inv.taxPercent,
          taxAmount: inv.tax_amount || inv.taxAmount,
          discountPercent: inv.discount_percent || inv.discountPercent,
          discountAmount: inv.discount_amount || inv.discountAmount,
          isDeleted: inv.is_deleted === 1,
          type: inv.type || 'invoice',
          // Indian GST fields
          taxMode: inv.tax_mode || 'exclusive',
          cgstAmount: inv.cgst_amount || 0,
          sgstAmount: inv.sgst_amount || 0,
          igstAmount: inv.igst_amount || 0,
          isInterState: inv.is_inter_state === 1,
          createdAt: inv.created_at || inv.createdAt
        })),
        payments: (payments || []).map(p => ({
          ...p,
          invoiceId: p.invoice_id || p.invoiceId,
          customerId: p.customer_id || p.customerId,
          customerName: p.customer_name || p.customerName,
          type: p.type || 'payment',
          paymentDirection: p.payment_direction || p.paymentDirection || 'received',
          createdAt: p.created_at || p.createdAt
        })),
        challans: (challans || []).map(ch => ({
          ...ch,
          challanNumber: ch.challan_number || ch.challanNumber,
          invoiceId: ch.invoice_id || ch.invoiceId,
          customerId: ch.customer_id || ch.customerId,
          customerName: ch.customer_name || ch.customerName,
          itemsJson: ch.items_json || ch.itemsJson,
          createdAt: ch.created_at || ch.createdAt
        })),
        history: (history || []).map(h => ({
          ...h,
          entityId: h.entity_id || h.entityId,
          entityType: h.entity_type || h.entityType,
          createdAt: h.timestamp || h.createdAt
        })),
        users: (users || []).map(u => ({
          ...u,
          avatarUri: u.avatar_uri || u.avatarUri,
          createdAt: u.created_at || u.createdAt
        })),
        salesReturns: (salesReturns || []).map(sr => ({
          ...sr,
          returnNumber: sr.return_number || sr.returnNumber,
          invoiceId: sr.invoice_id || sr.invoiceId,
          customerId: sr.customer_id || sr.customerId,
          customerName: sr.customer_name || sr.customerName,
          taxAmount: sr.tax_amount || sr.taxAmount,
          createdAt: sr.created_at || sr.createdAt
        })),
        suppliers: (suppliers || []).map(s => ({
          ...s,
          state: s.state || '',
          createdAt: s.created_at || s.createdAt
        })),
        purchases: (purchases || []).map(p => ({
          ...p,
          billNumber:      p.bill_number      || p.billNumber,
          supplierId:      p.supplier_id      || p.supplierId,
          supplierName:    p.supplier_name    || p.supplierName,
          dueDate:         p.due_date         || p.dueDate,
          paymentMode:     p.payment_mode     || p.paymentMode,
          taxPercent:      p.tax_percent      || p.taxPercent,
          taxAmount:       p.tax_amount       || p.taxAmount,
          discountPercent: p.discount_percent || p.discountPercent,
          discountAmount:  p.discount_amount  || p.discountAmount,
          isDeleted:       p.is_deleted === 1,
          // GST fields
          taxMode:         p.tax_mode         || 'exclusive',
          cgstAmount:      p.cgst_amount      || 0,
          sgstAmount:      p.sgst_amount      || 0,
          igstAmount:      p.igst_amount      || 0,
          isInterState:    p.is_inter_state === 1,
          createdAt:       p.created_at       || p.createdAt
        })),
        supplierPayments: (supplierPayments || []).map(p => ({
          ...p,
          purchaseId: p.purchase_id || p.purchaseId,
          supplierId: p.supplier_id || p.supplierId,
          supplierName: p.supplier_name || p.supplierName,
          createdAt: p.created_at || p.createdAt
        })),
        inquiries: (inquiries || []).map(inq => ({
          ...inq,
          customerName: inq.customer_name || inq.customerName,
          createdAt: inq.created_at || inq.createdAt
        })),
        customerWallets: customerWallets || {},
        isLoggedIn: profile?.is_logged_in === 1,
        isDbReady: true,
      });
      console.log('✅ Store hydrated from SQLite (normalized). Logged In:', profile?.is_logged_in === 1);
    } catch (error) {
      console.error('❌ Error loading from DB:', error);
      set({ isDbReady: true });
    }
  },

  updateProfile: async (profileData) => {
    const currentProfile = get().profile;
    const newProfile = { ...currentProfile, ...profileData };
    await DbServices.updateProfile(newProfile);
    set({ profile: newProfile });
    // Push profile to Firebase so other devices can pull it during sync
    const { businessId } = get();
    if (businessId) {
      // fire-and-forget — don't block profile saves on network
      firebaseSync.pushProfile(businessId, newProfile).catch(() => {});
    }
  },

  // ── Invoice Template Config ──────────────────────────────────────────
  updateInvoiceConfig: async (configPatch) => {
    const currentProfile = get().profile;
    const currentConfig  = currentProfile.invoiceConfig || {};
    const updatedConfig  = { ...currentConfig, ...configPatch };
    const newProfile = {
      ...currentProfile,
      invoiceConfig:  updatedConfig,
      invoice_config: JSON.stringify(updatedConfig),
    };
    await DbServices.updateProfile(newProfile);
    set({ profile: newProfile });
  },

  // ========== AUTH ACTIONS (Firebase) ==========

  /** Google Sign-In — works in Expo Go and native builds */
  loginWithGoogle: async (idToken, accessToken) => {
    const { user, userProfile } = await googleSignInWithFirebase(idToken, accessToken);
    const updatedProfile = {
      ...get().profile,
      email: user.email || get().profile.email,
      name: userProfile.name || user.displayName || get().profile.name,
      is_logged_in: 1,
    };
    await get().updateProfile(updatedProfile);
    set({
      isLoggedIn:   true,
      firebaseUser: user,
      currentRole:  userProfile.role  || 'admin',
      businessId:   userProfile.businessId || null,
      businessInviteCode: userProfile.inviteCode || null,
    });

    // Trigger cloud sync + real-time listener
    if (userProfile.businessId) {
      await get().performCloudSync();
      get().startRealtimeListener();
    }

    if (userProfile.role !== 'staff') {
      await get().fetchTeam();
    }
    return true;
  },

  /** Email/password login — fetches role + businessId from Realtime DB */
  login: async (email, password) => {
    const { user, userProfile } = await loginUser(email, password);
    const updatedProfile = {
      ...get().profile,
      email,
      name: userProfile.name || get().profile.name,
      is_logged_in: 1,
    };
    await get().updateProfile(updatedProfile);
    set({
      isLoggedIn:   true,
      firebaseUser: user,
      currentRole:  userProfile.role  || 'staff',
      businessId:   userProfile.businessId || null,
      businessInviteCode: userProfile.inviteCode || null,
    });

    // 4. Trigger cloud sync + real-time listener
    if (userProfile.businessId) {
      await get().performCloudSync();
      get().startRealtimeListener();
    }
    
    // Fetch team if admin/manager
    if (userProfile.role !== 'staff') {
      await get().fetchTeam();
    }
    return true;
  },

  /** Firebase sign-out & Local Data Wipe (Fintech Security) */
  logout: async () => {
    try {
      // 0. Stop real-time listener & any pending debounce
      if (_rtUnsubscribe) { try { _rtUnsubscribe(); } catch (_) {} _rtUnsubscribe = null; }
      if (_syncDebounce)  { clearTimeout(_syncDebounce); _syncDebounce = null; }

      // 1. Sign out from Firebase
      await logoutUser();
      
      // 2. Wipe local SQLite data immediately
      await DbServices.clearAllData();
      
      // 3. Reset all in-memory state
      set({
        isLoggedIn: false,
        firebaseUser: null,
        currentRole: null,
        businessId: null,
        teamMembers: [],
        businessInviteCode: null,
        customers: [],
        items: [],
        invoices: [],
        orders: [],
        payments: [],
        challans: [],
        salesReturns: [],
        history: [],
        profile: { 
          name: '', email: '', 
          currency_code: 'INR', currency_symbol: '₹', 
          logo_uri: '', signature_uri: '', 
          payment_instructions: '', bank_details: '', 
          upi_qr_uri: '', gstin: '', pan_no: '', 
          colorTheme: 'ocean' 
        },
      });
      
      console.log('✅ Secure logout: Firebase session ended and local data wiped.');
    } catch (error) {
      console.error('❌ Error during secure logout:', error);
    }
  },

  /**
   * Owner registration — creates a new business in Firebase.
   * Returns { inviteCode } so the owner can share it with staff.
   */
  signUp: async (userData) => {
    const { user, businessId, inviteCode } = await ownerSignUp({
      name:         userData.name,
      email:        userData.email,
      password:     userData.password,
      businessName: userData.business,
      phone:        userData.phone,
    });
    const updatedProfile = {
      ...get().profile,
      name:          userData.name,
      email:         userData.email,
      phone:         userData.phone  || '',
      business_name: userData.business || '',
      is_logged_in:  1,
    };
    await get().updateProfile(updatedProfile);
    set({
      isLoggedIn:   true,
      firebaseUser: user,
      currentRole:  'admin',
      businessId,
      businessInviteCode: inviteCode,
    });
    return { inviteCode };
  },

  /**
   * Staff join using invite code — validates code, creates account.
   */
  staffJoin: async (userData) => {
    const { user, businessId } = await firebaseStaffJoin({
      name:       userData.name,
      email:      userData.email,
      password:   userData.password,
      inviteCode: userData.inviteCode,
      phone:      userData.phone,
    });
    const updatedProfile = {
      ...get().profile,
      name:         userData.name,
      email:        userData.email,
      phone:        userData.phone || '',
      is_logged_in: 1,
    };
    await get().updateProfile(updatedProfile);
    set({
      isLoggedIn:   true,
      firebaseUser: user,
      currentRole:  'staff',
      businessId,
    });

    // Sync data locally
    if (businessId) {
      await get().performCloudSync();
      get().startRealtimeListener();
    }

    return true;
  },

  /** Guest/demo mode — bypasses Firebase, full local access */
  loginAsGuest: async () => {
    const updatedProfile = {
      ...get().profile,
      name:  'Guest User',
      email: 'guest@demo.com',
      is_logged_in: 1,
    };
    await get().updateProfile(updatedProfile);
    set({ isLoggedIn: true, currentRole: 'admin', firebaseUser: null, businessId: null });
    return true;
  },

  /** Team Management Actions */
  fetchTeam: async () => {
    const { businessId } = get();
    if (!businessId) return;
    const members = await fetchBusinessStaff(businessId);
    set({ teamMembers: members });
  },

  updateMemberRole: async (uid, newRole) => {
    await firebaseUpdateMemberRole(uid, newRole);
    await get().fetchTeam(); // reload
  },

  removeMember: async (uid) => {
    await firebaseRemoveMember(uid);
    await get().fetchTeam(); // reload
  },

  refreshBusinessInviteCode: async () => {
    const { businessId, businessInviteCode } = get();
    if (!businessId) return;
    const newCode = await firebaseRefreshCode(businessId, businessInviteCode);
    set({ businessInviteCode: newCode });
    return newCode;
  },

  exportData: async (type) => {
    let data = [];
    let filename = `zoxm_${type}_${new Date().toISOString().split('T')[0]}`;
    
    switch(type) {
      case 'invoices': data = get().invoices; break;
      case 'customers': data = get().customers; break;
      case 'inventory': data = get().items; break;
      case 'payments': data = get().payments; break;
      default: return;
    }
    
    await CsvService.exportToCsv(filename, data);
  },

  importData: async (type, jsonData) => {
    // Process JSON data and add to DB
    for (const item of jsonData) {
      if (type === 'customers') {
        await get().addCustomer(item);
      } else if (type === 'inventory') {
        await get().addItem(item);
      }
    }
    await get().loadFromDb();
  },

  // ========== CUSTOMERS ==========
  addCustomer: async (customer) => {
    const saved = await DbServices.addCustomer(customer);
    set((state) => ({ customers: [saved, ...state.customers] }));
    
    // Sync to cloud
    const { businessId } = get();
    if (businessId) {
      await firebaseSync.pushEntity(businessId, 'customers', saved);
    }

    await get().addHistory({
      type: 'customer_created',
      description: `Customer "${customer.name}" created`,
      entityId: saved.id,
      entityType: 'customer',
    });
    return saved;
  },

  updateCustomer: async (customer) => {
    await DbServices.updateCustomer(customer);
    set((state) => ({
      customers: state.customers.map(c => c.id === customer.id ? { ...c, ...customer } : c),
    }));
    // Sync to cloud
    const { businessId } = get();
    if (businessId) {
      const fullCustomer = get().customers.find(c => c.id === customer.id);
      await firebaseSync.pushEntity(businessId, 'customers', fullCustomer);
    }
  },

  deleteCustomer: async (id) => {
    const hasDeps = await DbServices.hasCustomerDependencies(id);
    if (hasDeps) {
      throw new Error('This customer has associated invoices, orders or other records and cannot be deleted.');
    }
    await DbServices.deleteCustomer(id);
    set((state) => ({
      customers: state.customers.filter(c => c.id !== id),
    }));
    // Sync to cloud
    const { businessId } = get();
    if (businessId) {
      await firebaseSync.deleteEntity(businessId, 'customers', id);
    }
  },

  // ========== ITEMS ==========
  addItem: async (item) => {
    const saved = await DbServices.addItem(item);
    const enriched = {
      ...saved,
      price: saved.retail_price || saved.price || 0,
      stock: saved.quantity || saved.stock || 0,
      lowStock: (saved.quantity || saved.stock || 0) < 5,
    };
    set((state) => ({ items: [enriched, ...state.items] }));
    
    // Sync to cloud
    const { businessId } = get();
    if (businessId) {
      await firebaseSync.pushEntity(businessId, 'items', enriched);
    }

    await get().addHistory({
      type: 'item_created',
      description: `Item "${item.name}" added to inventory`,
      entityId: saved.id,
      entityType: 'item',
    });
    return enriched;
  },

  updateItem: async (item) => {
    await DbServices.updateItem(item);
    set((state) => ({
      items: state.items.map(i => i.id === item.id ? {
        ...i, ...item,
        price: item.retail_price || item.price || 0,
        stock: item.quantity || item.stock || 0,
        lowStock: (item.quantity || item.stock || 0) < 5,
      } : i),
    }));
    // Sync to cloud
    const { businessId } = get();
    if (businessId) {
      const fullItem = get().items.find(i => i.id === item.id);
      await firebaseSync.pushEntity(businessId, 'items', fullItem);
    }
  },

  deleteItem: async (id) => {
    await DbServices.deleteItem(id);
    set((state) => ({
      items: state.items.filter(i => i.id !== id),
    }));
    // Sync to cloud
    const { businessId } = get();
    if (businessId) {
      await firebaseSync.deleteEntity(businessId, 'items', id);
    }
  },

  getItemBySku: async (sku) => {
    return await DbServices.getItemBySku(sku);
  },

  // ========== ORDERS ==========
  addOrder: async (order) => {
    const saved = await DbServices.addOrder(order);
    const enriched = {
      ...saved,
      orderNumber: saved.order_number || saved.orderNumber,
      customerId: saved.customer_id || saved.customerId,
      customerName: saved.customer_name || saved.customerName,
      deliveryDate: saved.delivery_date || saved.deliveryDate,
      advanceAmount: saved.advance_amount || order.advanceAmount || 0,
      advance_amount: saved.advance_amount || order.advanceAmount || 0,
      items: order.items || [],
      createdAt: saved.created_at || new Date().toISOString(),
    };
    set((state) => ({ orders: [enriched, ...state.orders] }));
    
    // Sync to cloud
    const { businessId } = get();
    if (businessId) {
      await firebaseSync.pushEntity(businessId, 'orders', enriched);
    }

    await get().addHistory({
      type: 'order_created',
      description: `Order "${enriched.orderNumber}" created for ${enriched.customerName || 'Unknown'}`,
      entityId: saved.id,
      entityType: 'order',
    });
    return enriched;
  },

  updateOrder: async (order) => {
    await DbServices.updateOrder(order);
    set((state) => ({
      orders: state.orders.map(o => o.id === order.id ? { ...o, ...order } : o),
    }));
    // Sync to cloud
    const { businessId } = get();
    if (businessId) {
      const fullOrder = get().orders.find(o => o.id === order.id);
      await firebaseSync.pushEntity(businessId, 'orders', fullOrder);
    }
  },

  deleteOrder: async (id) => {
    await DbServices.deleteOrder(id);
    set((state) => ({
      orders: state.orders.filter(o => o.id !== id),
    }));
    // Sync to cloud
    const { businessId } = get();
    if (businessId) {
      await firebaseSync.deleteEntity(businessId, 'orders', id);
    }
  },

  // ========== INVOICES ==========
  addInvoice: async (invoice) => {
    const saved = await DbServices.addInvoice(invoice);
    
    // Update stock for each item
    if (invoice.items && invoice.items.length > 0) {
      const currentItems = get().items;
      for (const item of invoice.items) {
        if (item.item_id) {
          const storeItem = currentItems.find(i => i.id === item.item_id);
          if (storeItem) {
            // BUG-3 FIX: store normalizes to `stock`, not `quantity`
            const newQty = Math.max(0, (storeItem.stock || storeItem.quantity || 0) - (item.quantity || 0));
            await DbServices.updateItemQuantity(item.item_id, newQty);
          }
        }
      }
    }

    await get().loadFromDb(); // Reload to get fresh counts and items
    
    // Sync to cloud
    const { businessId } = get();
    if (businessId) {
      // 1. Sync the invoice
      await firebaseSync.pushEntity(businessId, 'invoices', saved);
      
      // 2. Sync updated items (stock changed)
      if (invoice.items && invoice.items.length > 0) {
        for (const item of invoice.items) {
          if (item.item_id) {
            const freshItem = get().items.find(i => i.id === item.item_id);
            if (freshItem) {
              await firebaseSync.pushEntity(businessId, 'items', freshItem);
            }
          }
        }
      }
    }

    await get().addHistory({
      type: 'invoice_created',
      description: `Invoice "${invoice.invoiceNumber || invoice.invoice_number || saved.id}" created`,
      entityId: saved.id,
      entityType: 'invoice',
    });
    return saved;
  },

  updateInvoice: async (invoice) => {
    // BUG-04 fix: use a quantity delta map instead of directly mutating store state.
    // Directly mutating storeItem.quantity on objects in the Zustand state array
    // bypasses React's immutability rules and causes silent state corruption.
    const oldItems = await DbServices.getInvoiceItems(invoice.id);
    await DbServices.updateInvoice(invoice);

    // Build a quantity delta map: item_id -> net change (positive = restore, negative = deduct)
    // Build a quantity delta map: item_id -> net change (positive = restore, negative = deduct)
    // Only process stock deltas if items array is explicitly provided
    if (invoice.items !== undefined) {
      const quantityDelta = {};

      // Step 1: restore stock from old invoice items
      for (const oldItem of oldItems) {
        if (oldItem.item_id) {
          quantityDelta[oldItem.item_id] = (quantityDelta[oldItem.item_id] || 0) + (oldItem.quantity || 0);
        }
      }

      // Step 2: deduct stock for new invoice items
      if (invoice.items.length > 0) {
        for (const newItem of invoice.items) {
          if (newItem.item_id) {
            quantityDelta[newItem.item_id] = (quantityDelta[newItem.item_id] || 0) - (newItem.quantity || 0);
          }
        }
      }

      // Step 3: apply DB updates using computed deltas (no store state mutation)
      const currentItems = get().items;
      for (const [itemId, delta] of Object.entries(quantityDelta)) {
        if (delta !== 0) {
          const storeItem = currentItems.find(i => i.id === itemId);
          if (storeItem) {
            const newQty = Math.max(0, (storeItem.quantity || 0) + delta);
            await DbServices.updateItemQuantity(itemId, newQty);
          }
        }
      }
    }

    await get().loadFromDb();
  },

  deleteInvoice: async (id) => {
    // Restore stock before soft deleting (moving to trash)
    // Only for actual invoices, not estimates
    const invoice = get().invoices.find(i => i.id === id);
    const isEstimateType = invoice?.type === 'estimate';
    if (!isEstimateType) {
      const items = await DbServices.getInvoiceItems(id);
      const currentItems = get().items;
      for (const item of items) {
        if (item.item_id) {
          const storeItem = currentItems.find(i => i.id === item.item_id);
          if (storeItem) {
            // BUG-3 FIX: use `stock` (normalized field), not `quantity`
            const newQty = (storeItem.stock || storeItem.quantity || 0) + (item.quantity || 0);
            await DbServices.updateItemQuantity(item.item_id, newQty);
          }
        }
      }
    }
    await DbServices.deleteInvoice(id);
    await get().loadFromDb();
    // Sync to cloud
    const { businessId } = get();
    if (businessId) {
      await firebaseSync.deleteEntity(businessId, 'invoices', id);
    }
  },

  permanentlyDeleteInvoice: async (id) => {
    // Already soft-deleted: stock is already restored, just wipe rows.
    await DbServices.permanentlyDeleteInvoice(id);
    await get().loadFromDb();
  },

  cancelInvoice: async (id) => {
    // Restore stock and mark status as 'Cancelled'
    const invoice = get().invoices.find(i => i.id === id);
    if (!invoice) return;
    if (invoice.status === 'Cancelled') return; // Already cancelled — prevent double stock restore

    const isEstimateType = invoice?.type === 'estimate';

    // ── 1. Restore inventory stock ─────────────────────────────────────────────
    if (!isEstimateType) {
      const items = await DbServices.getInvoiceItems(id);
      const currentItems = get().items;
      for (const item of items) {
        if (item.item_id) {
          const storeItem = currentItems.find(i => i.id === item.item_id);
          if (storeItem) {
            const newQty = (storeItem.stock || storeItem.quantity || 0) + (item.quantity || 0);
            await DbServices.updateItemQuantity(item.item_id, newQty);
          }
        }
      }
    }

    // ── 2. Refund any payments made on this invoice back to customer wallet ────
    // Fintech rule: money paid by the customer must be returned, not silently lost.
    if (!isEstimateType) {
      const allPayments = get().payments;
      const invoicePayments = allPayments.filter(
        p => String(p.invoiceId || p.invoice_id) === String(id)
           && p.type !== 'credit_note'
           && (parseFloat(p.amount) || 0) > 0
      );
      const totalPaidOnInvoice = invoicePayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
      const cid = invoice.customerId || invoice.customer_id;
      const today = new Date().toISOString().split('T')[0];

      if (totalPaidOnInvoice > 0 && cid) {
        // Record credit_note so balanceCalculator knows money is back in customer pool
        await DbServices.addPayment({
          id: `pmt_cancel_${Date.now()}`,
          invoice_id: id,
          customer_id: cid,
          customer_name: invoice.customerName || invoice.customer_name,
          amount: totalPaidOnInvoice,
          method: 'Cancellation Refund',
          type: 'credit_note',
          date: today,
          notes: `Refund — Invoice ${invoice.invoiceNumber || invoice.invoice_number} cancelled`,
        });

        // Also credit the physical customer_wallet table
        try {
          const currentWallet = await DbServices.getWalletBalance(cid);
          await DbServices.setWalletBalance(cid, Math.round((currentWallet + totalPaidOnInvoice) * 100) / 100);
        } catch (walletErr) {
          console.warn('Wallet credit on cancel skipped:', walletErr);
        }
      }
    }

    // ── 3. Mark invoice as Cancelled ──────────────────────────────────────────
    await DbServices.updateInvoiceStatus(id, 'Cancelled');
    await get().loadFromDb();

    // ── 4. Audit log ──────────────────────────────────────────────────────────
    await get().addHistory({
      type: 'invoice_cancelled',
      description: `Invoice "${invoice?.invoiceNumber || invoice?.invoice_number || id}" cancelled`,
      entityId: id,
      entityType: isEstimateType ? 'estimate' : 'invoice',
    });
  },

  recoverInvoice: async (id) => {
    await DbServices.recoverInvoice(id);
    
    // Deduct stock again when recovering from trash (only for invoices, not estimates)
    const invoice = get().invoices.find(i => i.id === id);
    const isEstimateType = invoice?.type === 'estimate';
    if (!isEstimateType) {
      const items = await DbServices.getInvoiceItems(id);
      const currentItems = get().items;
      for (const item of items) {
        if (item.item_id) {
          const storeItem = currentItems.find(i => i.id === item.item_id);
          if (storeItem) {
            // BUG-3 FIX + BUG-6 FIX: use `stock` (normalized field), not `quantity`
            const newQty = Math.max(0, (storeItem.stock || storeItem.quantity || 0) - (item.quantity || 0));
            await DbServices.updateItemQuantity(item.item_id, newQty);
          }
        }
      }
    }
    
    await get().loadFromDb();
  },

  duplicateInvoice: async (invoice) => {
    const items = await DbServices.getInvoiceItems(invoice.id);
    const newInvoiceNumber = `#INV-DUP-${Date.now().toString().slice(-4)}`;
    const newInvoice = {
      ...invoice,
      id: undefined, // Let DB generate new ID
      invoice_number: newInvoiceNumber,
      invoiceNumber: newInvoiceNumber,
      date: new Date().toISOString().split('T')[0],
      status: 'Draft',
      items: items.map(item => ({
        ...item,
        id: undefined, // New ID for each item
        invoice_id: undefined
      }))
    };
    // BUG-5 FIX: use get().addInvoice (the store action) so stock is deducted,
    // instead of calling DbServices.addInvoice directly.
    const saved = await get().addInvoice(newInvoice);
    return saved;
  },

  // ========== ESTIMATES (no stock, no payments) ==========
  addEstimate: async (estimate) => {
    // Save as type 'estimate' — NO stock deduction, NO payment records
    const saved = await DbServices.addInvoice({ ...estimate, type: 'estimate' });
    await get().loadFromDb();
    await get().addHistory({
      type: 'estimate_created',
      description: `Estimate "${estimate.invoiceNumber || estimate.invoice_number || saved.id}" created`,
      entityId: saved.id,
      entityType: 'estimate',
    });
    return saved;
  },

  convertEstimateToInvoice: async (estimateId) => {
    // 1. Change type from 'estimate' to 'invoice' and assign new invoice number
    const newInvoiceNumber = `#INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    await DbServices.updateInvoiceType(estimateId, 'invoice', newInvoiceNumber);

    // 2. Deduct stock for each item
    const items = await DbServices.getInvoiceItems(estimateId);
    const currentItems = get().items;
    for (const item of items) {
      if (item.item_id) {
        const storeItem = currentItems.find(i => i.id === item.item_id);
        if (storeItem) {
          const newQty = Math.max(0, (storeItem.quantity || 0) - (item.quantity || 0));
          await DbServices.updateItemQuantity(item.item_id, newQty);
        }
      }
    }

    await get().loadFromDb();
    await get().addHistory({
      type: 'estimate_converted',
      description: `Estimate converted to Invoice ${newInvoiceNumber}`,
      entityId: estimateId,
      entityType: 'invoice',
    });
  },

  // ========== PAYMENTS ==========
  addPayment: async (payment) => {
    const saved = await DbServices.addPayment(payment);
    await get().loadFromDb(); 
    
    // Sync to cloud
    const { businessId } = get();
    if (businessId) {
      await firebaseSync.pushEntity(businessId, 'payments', saved);
    }

    await get().addHistory({
      type: 'payment_recorded',
      description: `Payment of ${get().profile.currency_symbol || '₹'}${payment.amount} recorded`,
      entityId: saved.id,
      entityType: 'payment',
    });
    return saved;
  },

  addCreditTransaction: async (customerId, customerName, amount, invoiceId, notes) => {
    const saved = await DbServices.addCreditTransaction(customerId, customerName, amount, invoiceId, notes);
    await get().loadFromDb();
    // Sync to cloud
    const { businessId } = get();
    if (businessId && saved) {
      await firebaseSync.pushEntity(businessId, 'payments', saved);
    }
    await get().addHistory({
      type: 'credit_sale',
      description: `Credit sale of ${get().profile.currency_symbol || '₹'}${amount} recorded for ${customerName}`,
      entityId: saved.id,
      entityType: 'payment',
    });
    return saved;
  },

  // Records money given TO the customer (refund, advance credit, goodwill)
  addGivePayment: async (payment) => {
    const saved = await DbServices.addGivePayment(payment);
    await get().loadFromDb();
    // Sync to cloud
    const { businessId } = get();
    if (businessId && saved) {
      await firebaseSync.pushEntity(businessId, 'payments', saved);
    }
    const sym = get().profile.currency_symbol || '₹';
    await get().addHistory({
      type: 'give_payment_recorded',
      description: `Payment of ${sym}${payment.amount} given to ${payment.customerName || 'customer'}`,
      entityId: saved.id,
      entityType: 'payment',
    });
    return saved;
  },

  // Records a due entry — money the customer owes us (not tied to an invoice)
  addDueEntry: async (entry) => {
    const saved = await DbServices.addDueEntry(entry);
    await get().loadFromDb();
    // Sync to cloud
    const { businessId } = get();
    if (businessId && saved) {
      await firebaseSync.pushEntity(businessId, 'payments', saved);
    }
    const sym = get().profile.currency_symbol || '₹';
    await get().addHistory({
      type: 'due_entry_added',
      description: `Due of ${sym}${entry.amount} added for ${entry.customerName || 'customer'}`,
      entityId: saved.id,
      entityType: 'payment',
    });
    return saved;
  },

  // ========== CHALLANS ==========
  addChallan: async (challan) => {
    const saved = await DbServices.addChallan(challan);
    set((state) => ({ challans: [saved, ...state.challans] }));
    return saved;
  },

  // ========== HISTORY ==========
  // L3 fix: `history` was missing from initial state. It's managed only via
  // loadFromDb so we only update it ad-hoc here; the full list refreshes on load.
  addHistory: async (event) => {
    const saved = await DbServices.addHistory(event);
    const enriched = {
      ...saved,
      entityId: saved.entity_id || saved.entityId,
      entityType: saved.entity_type || saved.entityType,
      createdAt: saved.timestamp || saved.createdAt || new Date().toISOString()
    };
    set((state) => ({ history: [enriched, ...state.history] }));

    // Sync to cloud
    const { businessId } = get();
    if (businessId) {
      await firebaseSync.pushEntity(businessId, 'history', enriched);
    }

    return enriched;
  },

  // ========== SALES RETURNS ==========
  addSalesReturn: async (salesReturn) => {
    const round2 = v => Math.round(v * 100) / 100;
    const saved = await DbServices.addSalesReturn(salesReturn);

    // 1. Update stock for returned items
    if (salesReturn.items && salesReturn.items.length > 0) {
      const currentItems = get().items;
      for (const item of salesReturn.items) {
        if (item.item_id) {
          const storeItem = currentItems.find(i => i.id === item.item_id);
          if (storeItem) {
            const newQty = (storeItem.quantity || 0) + (item.quantity || 0);
            await DbServices.updateItemQuantity(item.item_id, newQty);
            
            // Sync updated item to cloud
            const { businessId } = get();
            if (businessId) {
              const freshItem = get().items.find(i => i.id === item.item_id);
              if (freshItem) {
                await firebaseSync.pushEntity(businessId, 'items', freshItem);
              }
            }
          }
        }
      }
    }

    // 2. Refresh store
    await get().loadFromDb();

    // 3. Sync return to cloud
    const { businessId } = get();
    if (businessId) {
      await firebaseSync.pushEntity(businessId, 'salesReturns', saved);
    }

    await get().addHistory({
      type: 'sales_return_created',
      description: `Sales Return "${salesReturn.returnNumber || saved.return_number}" created for ${salesReturn.customerName || 'Unknown'}`,
      entityId: saved.id,
      entityType: 'sales_return',
    });
    return saved;
  },

  /**
   * Perform a product return from InvoiceDetailScreen / ReturnItemsSheet.
   * Wraps addSalesReturn + persists per-item detail + updates invoice return_status.
   *
   * @param {object} opts
   *   invoice        - full invoice object
   *   selectedItems  - [{ id, name, rate, returnQty, originalQty }]
   *   grossCredit    - total credit amount
   *   effectiveRefund
   *   dueReduced
   * @returns {string} salesReturnId
   */
  addReturnWithItems: async ({ invoice, selectedItems, grossCredit, effectiveRefund, dueReduced, reason = 'Product Return' }) => {
    const round2 = v => Math.round(v * 100) / 100;
    const returnNumber = `RET-${Date.now().toString().slice(-6)}`;

    // 1. Core sales return (creates credit note in payments, updates stock, etc.)
    const saved = await get().addSalesReturn({
      returnNumber,
      invoiceId: invoice.id,
      customerId: invoice.customerId || invoice.customer_id,
      customerName: invoice.customer_name || invoice.customerName,
      date: new Date().toISOString().split('T')[0],
      reason,
      subtotal: round2(selectedItems.reduce((s, i) => s + (parseFloat(i.returnQty) || 0) * (parseFloat(i.rate) || 0), 0)),
      taxAmount: 0,
      total: grossCredit,
      effectiveRefund,
      dueReduced,
      items: selectedItems.map(i => ({
        item_id: i.item_id || '',
        name: i.name,
        quantity: parseFloat(i.returnQty) || 0,
        rate: parseFloat(i.rate) || 0,
        total: (parseFloat(i.returnQty) || 0) * (parseFloat(i.rate) || 0),
      })),
    });

    // 2. Persist per-item detail in returned_items table (for ReturnItemsSheet history)
    await DbServices.addReturnedItems(
      selectedItems.map(i => ({
        salesReturnId: saved?.id || null,
        invoiceId: invoice.id,
        itemName: i.name,
        quantity: parseFloat(i.returnQty) || 0,
        unitPrice: parseFloat(i.rate) || 0,
        returnAmount: round2((parseFloat(i.returnQty) || 0) * (parseFloat(i.rate) || 0)),
      }))
    );

    // 3. Determine and store invoice return_status
    const invoiceTotal = round2(parseFloat(invoice.total) || 0);
    const status = grossCredit >= invoiceTotal ? 'FULL' : 'PARTIAL';
    await DbServices.updateInvoiceReturnStatus(invoice.id, status);

    // 4. Refresh Zustand store so callers see updated invoice + payments
    await get().loadFromDb();

    return { salesReturnId: saved?.id, returnNumber, status, grossCredit };
  },


  deleteSalesReturn: async (id) => {
    // Reverse stock for deleted return
    const items = await DbServices.getSalesReturnItems(id);
    const currentItems = get().items;
    for (const item of items) {
      if (item.item_id) {
        const storeItem = currentItems.find(i => i.id === item.item_id);
        if (storeItem) {
          const newQty = Math.max(0, (storeItem.quantity || 0) - (item.quantity || 0));
          await DbServices.updateItemQuantity(item.item_id, newQty);
        }
      }
    }
    await DbServices.deleteSalesReturn(id);
    await get().loadFromDb();
  },

  /**
   * Called after a product return is saved. Owner picks WALLET or CASH.
   * @param {'WALLET'|'CASH'} refundType
   * @param {number} amount         - gross refund amount
   * @param {string} customerId
   * @param {string} customerName
   * @param {string|null} invoiceId
   * @param {string|null} salesReturnId
   */
  /**
   * SINGLE SOURCE OF TRUTH for return financial effects.
   * Called AFTER addSalesReturn saves the return & restocks inventory.
   * Owner picks WALLET or CASH here — all money movement happens in this one place.
   *
   * Financial logic:
   *   grossCredit = full return value
   *   dueOnInvoice = how much the customer still owes on this invoice
   *   dueReduced = min(grossCredit, dueOnInvoice)  → always reduces invoice balance
   *   excess = grossCredit - dueReduced             → goes to wallet or cash
   *
   * WALLET path: excess added to customer_wallet; a credit_note with dueReduced
   *              is recorded so balanceCalculator correctly reduces invoice due.
   * CASH   path: excess is given as physical cash; same credit_note for due reduction.
   */
  processReturnRefund: async ({ refundType, amount, customerId, customerName, invoiceId, salesReturnId, returnNumber }) => {
    const round2 = v => Math.round(v * 100) / 100;
    const grossCredit = round2(parseFloat(amount) || 0);
    if (grossCredit <= 0) return;

    const today = new Date().toISOString().split('T')[0];

    // ── Step 1: Compute how much of the return settles outstanding due ──
    let dueReduced = 0;
    if (invoiceId) {
      const invoice = get().invoices.find(i => i.id === invoiceId);
      if (invoice) {
        const invoiceTotal = round2(parseFloat(invoice.total) || 0);
        const alreadyPaid = round2(
          get().payments
            .filter(p => String(p.invoiceId || p.invoice_id) === String(invoiceId)
                      && p.type !== 'credit_note')
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
        );
        // Existing credit_note dueReduced on this invoice
        const existingDueReduced = round2(
          get().payments
            .filter(p => p.type === 'credit_note'
                      && String(p.invoiceId || p.invoice_id) === String(invoiceId))
            .reduce((sum, p) => sum + (parseFloat(p.dueReduced || p.due_reduced) || 0), 0)
        );
        const currentDue = round2(Math.max(0, invoiceTotal - alreadyPaid - existingDueReduced));
        dueReduced = round2(Math.min(grossCredit, currentDue));
      }
    }

    const excess = round2(Math.max(0, grossCredit - dueReduced));

    // ── Step 2: Record credit_note payment for dueReduced (invoice tracking) ──
    //    amount = 0 (no cash-pool credit), dueReduced = actual settled amount.
    //    This is the ONLY thing the balanceCalculator uses from credit_notes.
    if (dueReduced > 0) {
      await get().addPayment({
        customerId,
        customerName,
        amount: 0,           // NO amount goes into credit pool
        method: 'Credit Note',
        type: 'credit_note',
        invoiceId: invoiceId || null,
        invoice_id: invoiceId || null,
        dueReduced: dueReduced,
        date: today,
        notes: `Return ${returnNumber || ''} settled ${dueReduced.toFixed(2)} of invoice due`,
      });
    }

    // ── Step 3: Handle the excess based on owner's choice ──
    const currentWallet = await DbServices.getWalletBalance(customerId);

    if (refundType === 'WALLET') {
      // Add EXCESS to wallet (dueReduced was already handled above)
      if (excess > 0) {
        const newWallet = round2(currentWallet + excess);
        await DbServices.setWalletBalance(customerId, newWallet);

        await DbServices.addLedgerEntry({
          customer_id: customerId,
          invoice_id: invoiceId || null,
          entry_type: 'WALLET_CREDIT',
          debit: 0,
          credit: excess,
          wallet_balance: newWallet,
          note: `Return credit to wallet${returnNumber ? ` (${returnNumber})` : ''}`,
        });

        await DbServices.addTransaction({
          customer_id: customerId,
          invoice_id: invoiceId || null,
          type: 'WALLET_CREDIT',
          amount: excess,
          direction: 'IN',
          payment_mode: 'WALLET',
          reference_note: `Product return wallet credit${returnNumber ? ` — ${returnNumber}` : ''}`,
        });
      }

      // Ledger entry for due-reduction part too
      if (dueReduced > 0) {
        await DbServices.addLedgerEntry({
          customer_id: customerId,
          invoice_id: invoiceId || null,
          entry_type: 'ITEM_RETURNED',
          debit: 0,
          credit: dueReduced,
          wallet_balance: excess > 0 ? round2(currentWallet + excess) : currentWallet,
          note: `Return settled ${dueReduced.toFixed(2)} of invoice due${returnNumber ? ` (${returnNumber})` : ''}`,
        });
      }
    } else {
      // CASH REFUND — excess given as physical cash
      if (excess > 0) {
        await DbServices.addLedgerEntry({
          customer_id: customerId,
          invoice_id: invoiceId || null,
          entry_type: 'CASH_REFUND_OUT',
          debit: 0,
          credit: excess,
          wallet_balance: currentWallet,
          note: `Cash refund to customer${returnNumber ? ` (${returnNumber})` : ''}`,
        });

        await DbServices.addTransaction({
          customer_id: customerId,
          invoice_id: invoiceId || null,
          type: 'CASH_REFUND_OUT',
          amount: excess,
          direction: 'OUT',
          payment_mode: 'CASH',
          reference_note: `Cash refund to customer${returnNumber ? ` — ${returnNumber}` : ''}`,
        });
      }

      // Ledger entry for due-reduction part
      if (dueReduced > 0) {
        await DbServices.addLedgerEntry({
          customer_id: customerId,
          invoice_id: invoiceId || null,
          entry_type: 'ITEM_RETURNED',
          debit: 0,
          credit: dueReduced,
          wallet_balance: currentWallet,
          note: `Return settled ${dueReduced.toFixed(2)} of invoice due${returnNumber ? ` (${returnNumber})` : ''}`,
        });
      }
    }

    // ── Step 4: Update invoice payment status + return_status ──
    if (invoiceId) {
      const invoice = get().invoices.find(inv => inv.id === invoiceId);
      if (invoice) {
        const invoiceTotal = round2(parseFloat(invoice.total) || 0);

        if (dueReduced > 0) {
          const alreadyPaid = round2(
            get().payments
              .filter(p => String(p.invoiceId || p.invoice_id) === String(invoiceId)
                        && p.type !== 'credit_note')
              .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
          );
          // FIX: addPayment() already ran loadFromDb(), so the new credit_note
          // is already in get().payments — do NOT add dueReduced again.
          const totalCnDueReduced = round2(
            get().payments
              .filter(p => p.type === 'credit_note'
                        && String(p.invoiceId || p.invoice_id) === String(invoiceId))
              .reduce((sum, p) => sum + (parseFloat(p.dueReduced || p.due_reduced) || 0), 0)
          );
          const remainingDue = round2(Math.max(0, invoiceTotal - alreadyPaid - totalCnDueReduced));
          const newStatus = remainingDue <= 0 ? 'Paid' : (alreadyPaid > 0 ? 'Partial' : invoice.status);
          await DbServices.updateInvoiceStatus(invoiceId, newStatus);
        }

        // Set return_status: FULL if grossCredit >= invoice total, else PARTIAL
        const returnStatus = grossCredit >= invoiceTotal ? 'FULL' : 'PARTIAL';
        await DbServices.updateInvoiceReturnStatus(invoiceId, returnStatus);
      }
    }

    // ── Step 5: Mark return row with refund type ──
    if (salesReturnId) {
      await DbServices.markReturnRefundType(salesReturnId, refundType, grossCredit);
    }

    // ── Step 6: Refresh store ──
    await get().loadFromDb();
  },

  /**
   * Directly set a customer's wallet balance to a target value.
   * Uses the customer_wallet table (single source of truth).
   * Creates a ledger entry for the adjustment.
   */
  adjustCustomerWallet: async (customerId, customerName, currentWallet, targetWallet) => {
    const round2 = v => Math.round(v * 100) / 100;
    const diff = round2(targetWallet - currentWallet);
    if (Math.abs(diff) < 0.01) return;

    // Directly set the new wallet balance
    await DbServices.setWalletBalance(customerId, round2(targetWallet));

    // Ledger entry
    const isIncrease = diff > 0;
    await DbServices.addLedgerEntry({
      customer_id: customerId,
      invoice_id: null,
      entry_type: isIncrease ? 'WALLET_CREDIT' : 'WALLET_DEBIT',
      debit: isIncrease ? 0 : Math.abs(diff),
      credit: isIncrease ? diff : 0,
      wallet_balance: round2(targetWallet),
      note: `Manual wallet adjustment: ${currentWallet.toFixed(2)} → ${targetWallet.toFixed(2)}`,
    });

    // Transaction log
    await DbServices.addTransaction({
      customer_id: customerId,
      invoice_id: null,
      type: isIncrease ? 'WALLET_CREDIT' : 'WALLET_DEBIT',
      amount: Math.abs(diff),
      direction: isIncrease ? 'IN' : 'OUT',
      payment_mode: 'CASH',
      reference_note: `Manual wallet adjustment by ${Math.abs(diff).toFixed(2)}`,
    });

    // Push wallet update to cloud so other devices stay in sync
    const { businessId } = get();
    if (businessId) {
      await firebaseSync.pushEntity(businessId, 'customerWallets', {
        id: customerId,
        balance: round2(targetWallet),
      });
    }

    await get().loadFromDb();
  },

  adjustBalance: async (customerId, customerName, currentBalance, targetBalance) => {
    const diff = currentBalance - targetBalance;
    if (Math.abs(diff) < 0.01) return; // No change needed

    const today = new Date().toISOString().split('T')[0];
    
    // To reduce balance (current 2000 -> target 1000), we record a POSITIVE payment of 1000.
    // To increase balance (current 1000 -> target 2000), we record a NEGATIVE payment of -1000.
    await get().addPayment({
      customerId,
      customerName,
      amount: diff,
      method: 'Adjustment',
      type: 'payment',
      date: today,
      notes: `Manual balance adjustment from ${(currentBalance||0).toFixed(2)} to ${(targetBalance||0).toFixed(2)}`
    });

    await get().loadFromDb();
  },

  adjustCreditBalance: async (customerId, customerName, currentCredit, targetCredit) => {
    const diff = targetCredit - currentCredit;
    if (Math.abs(diff) < 0.01) return; // No change needed

    const today = new Date().toISOString().split('T')[0];
    
    // To increase credit (current 1000 -> target 2000), we record a POSITIVE credit_note payment of 1000.
    // To decrease credit (current 2000 -> target 1000), we record a NEGATIVE credit_note payment of -1000.
    await get().addPayment({
      customerId,
      customerName,
      amount: diff,
      method: 'Credit Adjustment',
      type: 'credit_note',
      date: today,
      notes: `Manual credit balance adjustment from ${(currentCredit||0).toFixed(2)} to ${(targetCredit||0).toFixed(2)}`
    });

    await get().loadFromDb();
  },

  // ========== USERS ==========
  addUser: async (user) => {
    const saved = await DbServices.addUser(user);
    set((state) => ({ users: [saved, ...state.users] }));
    return saved;
  },

  updateUser: async (user) => {
    await DbServices.updateUser(user);
    set((state) => ({
      users: state.users.map(u => u.id === user.id ? { ...u, ...user } : u),
    }));
  },

  deleteUser: async (id) => {
    await DbServices.deleteUser(id);
    set((state) => ({
      users: state.users.filter(u => u.id !== id),
    }));
  },

  // ========== SUPPLIERS ==========
  addSupplier: async (supplier) => {
    const saved = await DbServices.addSupplier(supplier);
    await get().loadFromDb();

    // Sync to cloud
    const { businessId } = get();
    if (businessId) {
      await firebaseSync.pushEntity(businessId, 'suppliers', saved);
    }

    await get().addHistory({
      type: 'supplier_created',
      description: `Supplier "${supplier.name}" added`,
      entityId: saved.id,
      entityType: 'supplier',
    });
    return saved;
  },

  updateSupplier: async (supplier) => {
    const saved = await DbServices.updateSupplier(supplier);
    await get().loadFromDb();
    return saved;
  },

  deleteSupplier: async (id) => {
    await DbServices.deleteSupplier(id);
    await get().loadFromDb();
    // Sync to cloud
    const { businessId } = get();
    if (businessId) {
      await firebaseSync.deleteEntity(businessId, 'suppliers', id);
    }
  },

  // ========== PURCHASES ==========
  addPurchase: async (purchase) => {
    const saved = await DbServices.addPurchase(purchase);

    // Increase stock for each item using a delta map to handle duplicates
    if (purchase.items && purchase.items.length > 0) {
      const quantityMap = {};
      for (const item of purchase.items) {
        const id = item.item_id || item.itemId;
        if (id) {
          quantityMap[id] = (quantityMap[id] || 0) + (parseFloat(item.quantity) || 0);
        }
      }

      const currentItems = get().items;
      for (const [itemId, qty] of Object.entries(quantityMap)) {
        const storeItem = currentItems.find(i => i.id === itemId);
        if (storeItem) {
          const newQty = (storeItem.quantity || 0) + qty;
          await DbServices.updateItemQuantity(itemId, newQty);
        }
      }
    }

    await get().loadFromDb();

    // Sync to cloud
    const { businessId } = get();
    if (businessId) {
      await firebaseSync.pushEntity(businessId, 'purchases', saved);
    }

    await get().addHistory({
      type: 'purchase_created',
      description: `Purchase from "${purchase.supplierName}" recorded`,
      entityId: saved.id,
      entityType: 'purchase',
    });
    return saved;
  },

  updatePurchase: async (purchase) => {
    const oldItems = await DbServices.getPurchaseItems(purchase.id);
    await DbServices.updatePurchase(purchase);

    const quantityDelta = {};

    // 1. Revert the original stock increases (so deduct old purchase items)
    for (const oldItem of oldItems) {
      const id = oldItem.item_id || oldItem.itemId;
      if (id) {
        quantityDelta[id] = (quantityDelta[id] || 0) - (parseFloat(oldItem.quantity) || 0);
      }
    }

    // 2. Add the new stock increases
    if (purchase.items && purchase.items.length > 0) {
      for (const item of purchase.items) {
        const id = item.item_id || item.itemId;
        if (id) {
          quantityDelta[id] = (quantityDelta[id] || 0) + (parseFloat(item.quantity) || 0);
        }
      }
    }

    // Apply net differences
    const currentItems = get().items;
    for (const [itemId, delta] of Object.entries(quantityDelta)) {
      if (delta !== 0) {
        const storeItem = currentItems.find(i => i.id === itemId);
        if (storeItem) {
          const newQty = Math.max(0, (storeItem.quantity || 0) + delta);
          await DbServices.updateItemQuantity(itemId, newQty);
        }
      }
    }

    await get().loadFromDb();
    await get().addHistory({
      type: 'purchase_updated',
      description: `Purchase #${purchase.id} updated`,
      entityId: purchase.id,
      entityType: 'purchase',
    });
    return purchase;
  },

  deletePurchase: async (id) => {
    // Revert stock before deleting (deduct the purchase stock)
    const items = await DbServices.getPurchaseItems(id);
    if (items && items.length > 0) {
      const quantityMap = {};
      for (const item of items) {
        const iid = item.item_id || item.itemId;
        if (iid) {
          quantityMap[iid] = (quantityMap[iid] || 0) - (parseFloat(item.quantity) || 0);
        }
      }

      const currentItems = get().items;
      for (const [itemId, delta] of Object.entries(quantityMap)) {
        const storeItem = currentItems.find(i => i.id === itemId);
        if (storeItem) {
          const newQty = Math.max(0, (storeItem.quantity || 0) + delta);
          await DbServices.updateItemQuantity(itemId, newQty);
        }
      }
    }
    await DbServices.deletePurchase(id);
    await get().loadFromDb();
    await get().addHistory({
      type: 'purchase_deleted',
      description: `Purchase #${id} deleted`,
      entityId: id,
      entityType: 'purchase',
    });
  },

  // ========== SUPPLIER PAYMENTS ==========
  addSupplierPayment: async (payment) => {
    const saved = await DbServices.addSupplierPayment(payment);

    // Auto-update the linked purchase status if purchaseId is provided
    if (payment.purchaseId || payment.purchase_id) {
      const pid = payment.purchaseId || payment.purchase_id;
      const { purchases, supplierPayments } = get();
      const purchase = purchases.find(p => p.id === pid);
      if (purchase) {
        // Include the just-saved payment in the calculation
        const allPayments = [...supplierPayments, { ...saved, purchaseId: pid }];
        const newStatus = calcPurchasePaymentStatus(
          pid,
          purchase.total,
          allPayments
        );
        await DbServices.updatePurchaseStatus(pid, newStatus);
      }
    }

    await get().loadFromDb();
    return saved;
  },

  deleteSupplierPayment: async (id) => {
    await DbServices.deleteSupplierPayment(id);
    await get().loadFromDb();
  },

  // ========== INQUIRIES ==========
  addInquiry: async (inquiry) => {
    const saved = await DbServices.addInquiry(inquiry);
    await get().loadFromDb();
    return saved;
  },

  updateInquiry: async (inquiry) => {
    await DbServices.updateInquiry(inquiry);
    await get().loadFromDb();
  },

  deleteInquiry: async (id) => {
    await DbServices.deleteInquiry(id);
    await get().loadFromDb();
  },

  // ========== CLEAR ALL DATA ==========
  clearAllData: async () => {
    try {
      await DbServices.clearAllData();
      // Reset in-memory state to empty / defaults
      set({
        customers: [],
        items: [],
        invoices: [],
        orders: [],
        payments: [],
        challans: [],
        salesReturns: [],
        users: [],
        suppliers: [],
        purchases: [],
        supplierPayments: [],
        inquiries: [],
        customerWallets: {},
        history: [],
        isLoggedIn: false,
        profile: { 
          name: '', email: '', phone: '', address: '',
          currency_code: 'INR', currency_symbol: '₹', 
          logo_uri: '', signature_uri: '', 
          payment_instructions: '', bank_details: '', 
          upi_qr_uri: '', gstin: '', pan_no: '', 
          colorTheme: 'ocean', theme: 'light', language: 'en',
          is_logged_in: 0
        },
      });
      
      // Force reload from DB to ensure complete consistency
      await get().loadFromDb();
      
      console.log('✅ Store cleared successfully');
    } catch (error) {
      console.error('❌ Error in clearAllData store action:', error);
      throw error;
    }
  },

  // ========== CLOUD SYNC ==========

  /**
   * Start a real-time Firebase listener that debounces and triggers performCloudSync
   * whenever another device writes to this business's data node.
   * Safe to call multiple times — automatically cancels the previous listener.
   */
  startRealtimeListener: () => {
    const { businessId, isLoggedIn } = get();
    if (!businessId || !isLoggedIn) return;

    // Cancel any existing listener first
    if (_rtUnsubscribe) { try { _rtUnsubscribe(); } catch (_) {} _rtUnsubscribe = null; }
    if (_syncDebounce)  { clearTimeout(_syncDebounce); _syncDebounce = null; }

    let isFirstFire = true; // Skip the immediate initial fire (we just synced at login)

    console.log('[Sync] 📡 Real-time listener started for business:', businessId);

    _rtUnsubscribe = firebaseSync.subscribeToBusinessData(businessId, () => {
      // Ignore the first callback — it fires immediately with current data,
      // but we already ran performCloudSync at login.
      if (isFirstFire) { isFirstFire = false; return; }

      // Debounce: coalesce rapid writes (e.g. creating an invoice touches
      // invoices + items + payments) into a single sync after 3 seconds.
      if (_syncDebounce) clearTimeout(_syncDebounce);
      _syncDebounce = setTimeout(async () => {
        console.log('[Sync] 🔄 Remote change detected — syncing...');
        await get().performCloudSync();
        _syncDebounce = null;
      }, 3000);
    });
  },

  performCloudSync: async () => {
    const { businessId, isLoggedIn } = get();
    if (!businessId || !isLoggedIn) return;

    // Snapshot profile BEFORE any DB wipe so is_logged_in:1 is never lost
    const snapshotProfile = { ...get().profile };
    set({ isSyncing: true });
    try {
      console.log('[Sync] Starting full cloud sync...');

      // 1. Pull EVERYTHING from Firebase BEFORE touching local DB
      const [cloudData, cloudProfile] = await Promise.all([
        firebaseSync.pullAllData(businessId),
        firebaseSync.pullProfile(businessId),
      ]);

      // 2. If cloud has NO data (first login on Device A, brand new business),
      //    don't wipe local — instead upload local data UP to Firebase so it's there.
      if (!cloudData && !cloudProfile) {
        console.log('[Sync] Cloud is empty — uploading local data to Firebase...');
        await get().syncToCloud();
        await firebaseSync.pushProfile(businessId, snapshotProfile);
        set({ lastSyncTime: new Date().toISOString() });
        return;
      }

      // 3. Clear local SQLite (safe: we have confirmed cloud data)
      await DbServices.clearAllData();

      // 4. Restore profile — ALWAYS force is_logged_in:1 so loadFromDb
      //    never involuntarily logs the user out after a wipe.
      const profileToSave = {
        ...snapshotProfile,
        ...(cloudProfile ? {
          name:            cloudProfile.name            || snapshotProfile.name,
          business_name:   cloudProfile.business_name  || cloudProfile.businessName || snapshotProfile.business_name,
          currency_symbol: cloudProfile.currencySymbol  || cloudProfile.currency_symbol  || snapshotProfile.currency_symbol || '\u20b9',
          currency_code:   cloudProfile.currency        || cloudProfile.currency_code    || snapshotProfile.currency_code   || 'INR',
        } : {}),
        is_logged_in: 1, // CRITICAL — never lose the session after a wipe
      };
      await get().updateProfile(profileToSave);

      // 5. Restore all entity collections
      if (cloudData) {
        const collections = [
          { name: 'customers',        addFn: DbServices.addCustomer },
          { name: 'items',            addFn: DbServices.addItem },
          { name: 'invoices',         addFn: DbServices.addInvoice },
          { name: 'payments',         addFn: DbServices.addPayment },
          { name: 'orders',           addFn: DbServices.addOrder },
          { name: 'salesReturns',     addFn: DbServices.addSalesReturn },
          { name: 'history',          addFn: DbServices.addHistory },
          { name: 'suppliers',        addFn: DbServices.addSupplier },
          { name: 'purchases',        addFn: DbServices.addPurchase },
          { name: 'supplierPayments', addFn: DbServices.addSupplierPayment },
        ];

        for (const col of collections) {
          const list = cloudData[col.name];
          if (list) {
            for (const id in list) {
              try { await col.addFn({ ...list[id], id }); } catch (_) {}
            }
          }
        }

        // Restore customer wallet balances
        const cloudWallets = cloudData.customerWallets;
        if (cloudWallets && typeof cloudWallets === 'object') {
          for (const cid in cloudWallets) {
            try {
              const entry = cloudWallets[cid];
              const balance = typeof entry === 'object' ? (entry.balance ?? 0) : entry;
              await DbServices.setWalletBalance(cid, parseFloat(balance) || 0);
            } catch (walletErr) {
              console.warn('[Sync] Wallet restore failed for', cid, walletErr);
            }
          }
        }
      }

      // 6. Hydrate store — is_logged_in:1 in SQLite keeps session alive
      await get().loadFromDb();
      set({ lastSyncTime: new Date().toISOString() });
      console.log('[Sync] Cloud sync completed successfully.');
    } catch (error) {
      console.error('[Sync] Cloud sync failed:', error);
      // Safety net: restore profile login state and re-hydrate whatever survived
      try {
        await DbServices.updateProfile({ ...snapshotProfile, is_logged_in: 1 });
        await get().loadFromDb();
      } catch (_) {}
    } finally {
      set({ isSyncing: false });
    }
  },

  syncToCloud: async () => {
    // This is still useful as a manual trigger for a full "upload" if needed
    const { businessId, customers, items, invoices, payments, orders, salesReturns, history, suppliers, purchases } = get();
    if (!businessId) return;

    set({ isSyncing: true });
    try {
      console.log('🚀 Triggering manual full cloud upload...');
      const dataMap = {
        customers: customers.reduce((m, i) => ({ ...m, [i.id]: i }), {}),
        items: items.reduce((m, i) => ({ ...m, [i.id]: i }), {}),
        invoices: invoices.reduce((m, i) => ({ ...m, [i.id]: i }), {}),
        payments: payments.reduce((m, i) => ({ ...m, [i.id]: i }), {}),
        orders: orders.reduce((m, i) => ({ ...m, [i.id]: i }), {}),
        salesReturns: salesReturns.reduce((m, i) => ({ ...m, [i.id]: i }), {}),
        history: history.reduce((m, i) => ({ ...m, [i.id]: i }), {}),
        suppliers: suppliers.reduce((m, i) => ({ ...m, [i.id]: i }), {}),
        purchases: purchases.reduce((m, i) => ({ ...m, [i.id]: i }), {}),
      };
      await firebaseSync.bulkPush(businessId, dataMap);
      console.log('✅ Manual cloud upload successful.');
    } catch (e) {
      console.error('❌ Manual upload failed:', e);
    } finally {
      set({ isSyncing: false });
    }
  },
}));
