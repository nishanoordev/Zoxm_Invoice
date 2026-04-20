import { getDatabase } from './db';

/**
 * BackupService — Full database backup & restore.
 *
 * Backup:  Reads every row from every table → returns a JSON-serializable object.
 * Restore: Wipes all existing data → re-inserts every row from the backup object.
 *
 * This is a raw-SQL approach so we don't depend on the higher-level service
 * functions (which generate new IDs, add history entries, etc.).  We want an
 * exact copy of the data as it was when the backup was created.
 */

// ─── All tables in dependency-safe order (children after parents) ──────────
const ALL_TABLES = [
  'profile',
  'users',
  'customers',
  'items',
  'suppliers',
  'inquiries',
  'invoices',
  'invoice_items',
  'payments',
  'orders',
  'challans',
  'purchases',
  'purchase_items',
  'supplier_payments',
  'sales_returns',
  'sales_return_items',
  'returned_items',
  'transactions',
  'customer_ledger',
  'customer_wallet',
  'history',
];

// ─── BACKUP ────────────────────────────────────────────────────────────────

export async function createFullBackup() {
  const db = await getDatabase();
  const backup = {};

  for (const table of ALL_TABLES) {
    try {
      const rows = await db.getAllAsync(`SELECT * FROM ${table}`);
      backup[table] = rows || [];
    } catch (e) {
      // Table may not exist in older schemas — skip gracefully
      console.warn(`Backup: skipping table "${table}":`, e.message);
      backup[table] = [];
    }
  }

  return {
    version: 2,
    appName: 'ZOXM Invoice',
    createdAt: new Date().toISOString(),
    tables: backup,
  };
}

// ─── RESTORE ───────────────────────────────────────────────────────────────

export async function restoreFullBackup(backupData) {
  if (!backupData || !backupData.appName || (backupData.appName !== 'ZOXM Invoice' && backupData.appName !== 'ZoxmInvoice')) {
    throw new Error('Invalid backup file. This is not a valid ZOXM Invoice backup.');
  }

  const db = await getDatabase();
  const tables = backupData.tables;

  if (!tables) {
    // Legacy v1 backup format — only had data.profile, data.customers, etc.
    if (backupData.data) {
      return restoreLegacyBackup(db, backupData.data);
    }
    throw new Error('Backup file has no data to restore.');
  }

  // ── Step 1: Wipe all existing data (children first, parents last) ──
  const reverseOrder = [...ALL_TABLES].reverse();
  for (const table of reverseOrder) {
    try {
      if (table === 'profile') {
        // Don't delete the profile row — we'll UPDATE it instead
        continue;
      }
      await db.runAsync(`DELETE FROM ${table}`);
    } catch (e) {
      console.warn(`Restore: could not clear "${table}":`, e.message);
    }
  }

  // ── Step 2: Re-insert all rows ──
  let totalRestored = 0;

  for (const table of ALL_TABLES) {
    const rows = tables[table];
    if (!rows || rows.length === 0) continue;

    if (table === 'profile') {
      // Special handling: UPDATE profile row instead of INSERT
      const p = rows[0];
      await db.runAsync(
        `UPDATE profile SET
           name = ?, email = ?, phone = ?, address = ?,
           currency_symbol = ?, currency_code = ?, business_role = ?,
           logo_uri = ?, signature_uri = ?,
           payment_instructions = ?, bank_details = ?, upi_qr_uri = ?,
           is_logged_in = ?, gstin = ?, pan_no = ?,
           language = ?, theme = ?, business_name = ?,
           upi_id = ?, state = ?, city = ?, zip_code = ?,
           owner_name = ?, business_type = ?, invoice_config = ?
         WHERE id = 1`,
        [
          p.name || '', p.email || '', p.phone || '', p.address || '',
          p.currency_symbol || '₹', p.currency_code || 'INR', p.business_role || 'Store Owner',
          p.logo_uri || '', p.signature_uri || '',
          p.payment_instructions || '', p.bank_details || '', p.upi_qr_uri || '',
          1, // Keep logged in after restore
          p.gstin || '', p.pan_no || '',
          p.language || 'en', p.theme || 'system', p.business_name || '',
          p.upi_id || '', p.state || '', p.city || '', p.zip_code || '',
          p.owner_name || '', p.business_type || '', p.invoice_config || null
        ]
      );
      totalRestored++;
      continue;
    }

    // Generic insert for all other tables
    for (const row of rows) {
      try {
        const cols = Object.keys(row);
        const placeholders = cols.map(() => '?').join(', ');
        const values = cols.map(c => row[c]);
        await db.runAsync(
          `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
          values
        );
        totalRestored++;
      } catch (e) {
        console.warn(`Restore: failed to insert row into "${table}":`, e.message);
      }
    }
  }

  return totalRestored;
}

// ─── Legacy v1 backup support ──────────────────────────────────────────────

async function restoreLegacyBackup(db, data) {
  let totalRestored = 0;

  // Profile
  if (data.profile) {
    const p = data.profile;
    await db.runAsync(
      `UPDATE profile SET name = ?, email = ?, phone = ?, address = ?,
         currency_symbol = ?, currency_code = ?, business_role = ?,
         logo_uri = ?, signature_uri = ?,
         payment_instructions = ?, bank_details = ?, upi_qr_uri = ?,
         is_logged_in = ?, gstin = ?, pan_no = ?
       WHERE id = 1`,
      [
        p.name || '', p.email || '', p.phone || '', p.address || '',
        p.currency_symbol || '₹', p.currency_code || 'INR', p.business_role || '',
        p.logo_uri || '', p.signature_uri || '',
        p.payment_instructions || '', p.bank_details || '', p.upi_qr_uri || '',
        1, p.gstin || '', p.pan_no || '',
      ]
    );
    totalRestored++;
  }

  // Customers
  if (data.customers && data.customers.length > 0) {
    await db.runAsync('DELETE FROM customers');
    for (const c of data.customers) {
      await db.runAsync(
        'INSERT OR REPLACE INTO customers (id, name, email, phone, address, notes, gstin) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [c.id, c.name, c.email || '', c.phone || '', c.address || '', c.notes || '', c.gstin || '']
      );
      totalRestored++;
    }
  }

  // Items
  if (data.items && data.items.length > 0) {
    await db.runAsync('DELETE FROM items');
    for (const item of data.items) {
      await db.runAsync(
        'INSERT OR REPLACE INTO items (id, name, sku, category, description, retail_price, wholesale_price, mrp, quantity, unit, img, hsn_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          item.id, item.name, item.sku || null, item.category || '',
          item.description || '', item.retail_price || item.price || 0,
          item.wholesale_price || 0, item.mrp || 0,
          item.quantity || item.stock || 0, item.unit || 'pcs',
          item.img || '', item.hsn_code || item.hsnCode || '',
        ]
      );
      totalRestored++;
    }
  }

  // Invoices
  if (data.invoices && data.invoices.length > 0) {
    await db.runAsync('DELETE FROM invoice_items');
    await db.runAsync('DELETE FROM invoices');
    for (const inv of data.invoices) {
      await db.runAsync(
        `INSERT OR REPLACE INTO invoices (id, invoice_number, customer_id, customer_name, date, due_date, status, payment_mode, subtotal, tax_percent, tax_amount, discount_percent, discount_amount, total, notes, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inv.id, inv.invoiceNumber || inv.invoice_number || '',
          inv.customerId || inv.customer_id || '', inv.customerName || inv.customer_name || '',
          inv.date || '', inv.dueDate || inv.due_date || '',
          inv.status || 'Draft', inv.paymentMode || inv.payment_mode || 'Cash',
          inv.subtotal || 0, inv.taxPercent || inv.tax_percent || 0,
          inv.taxAmount || inv.tax_amount || 0, inv.discountPercent || inv.discount_percent || 0,
          inv.discountAmount || inv.discount_amount || 0, inv.total || 0,
          inv.notes || '', inv.isDeleted || inv.is_deleted || 0,
        ]
      );
      totalRestored++;
    }
  }

  // Payments
  if (data.payments && data.payments.length > 0) {
    await db.runAsync('DELETE FROM payments');
    for (const p of data.payments) {
      await db.runAsync(
        'INSERT OR REPLACE INTO payments (id, invoice_id, customer_id, customer_name, amount, method, type, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          p.id, p.invoiceId || p.invoice_id || null,
          p.customerId || p.customer_id || '', p.customerName || p.customer_name || '',
          p.amount || 0, p.method || 'Cash', p.type || 'payment',
          p.date || '', p.notes || '',
        ]
      );
      totalRestored++;
    }
  }

  // Orders
  if (data.orders && data.orders.length > 0) {
    await db.runAsync('DELETE FROM orders');
    for (const o of data.orders) {
      const itemsJson = typeof o.items === 'string' ? o.items : JSON.stringify(o.items || []);
      await db.runAsync(
        'INSERT OR REPLACE INTO orders (id, order_number, customer_id, customer_name, date, delivery_date, status, subtotal, tax_percent, tax_amount, discount_percent, discount_amount, total, notes, items_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          o.id, o.orderNumber || o.order_number || '',
          o.customerId || o.customer_id || '', o.customerName || o.customer_name || '',
          o.date || '', o.deliveryDate || o.delivery_date || '',
          o.status || 'Pending', o.subtotal || 0,
          o.taxPercent || o.tax_percent || 0, o.taxAmount || o.tax_amount || 0,
          o.discountPercent || o.discount_percent || 0, o.discountAmount || o.discount_amount || 0,
          o.total || 0, o.notes || '', itemsJson,
        ]
      );
      totalRestored++;
    }
  }

  return totalRestored;
}
