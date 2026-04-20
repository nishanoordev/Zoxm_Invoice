import * as SQLite from 'expo-sqlite';

let db = null;

export async function getDatabase() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('zoxm_invoice.db');
  return db;
}

export async function initDatabase() {
  const database = await getDatabase();

  try {
    await database.execAsync('PRAGMA journal_mode = WAL;');
    await database.execAsync('PRAGMA foreign_keys = ON;');

    // Table Creation
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY DEFAULT 1,
        name TEXT DEFAULT '',
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        address TEXT DEFAULT '',
        logo_uri TEXT DEFAULT '',
        signature_uri TEXT DEFAULT '',
        currency_symbol TEXT DEFAULT '₹',
        currency_code TEXT DEFAULT 'INR',
        business_role TEXT DEFAULT 'Store Owner',
        upi_qr_uri TEXT DEFAULT '',
        is_logged_in INTEGER DEFAULT 0,
        gstin TEXT DEFAULT '',
        pan_no TEXT DEFAULT '',
        payment_instructions TEXT DEFAULT '',
        bank_details TEXT DEFAULT ''
      );
    `);

    // Ensure default profile exists
    await database.runAsync("INSERT OR IGNORE INTO profile (id) VALUES (1);");

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT DEFAULT '',
        role TEXT DEFAULT 'Staff',
        avatar_uri TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        address TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        gstin TEXT DEFAULT '',
        payment_due_date TEXT DEFAULT '',
        payment_note TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT UNIQUE,
        category TEXT DEFAULT '',
        description TEXT DEFAULT '',
        retail_price REAL DEFAULT 0,
        wholesale_price REAL DEFAULT 0,
        mrp REAL DEFAULT 0,
        quantity INTEGER DEFAULT 0,
        unit TEXT DEFAULT 'pcs',
        img TEXT DEFAULT '',
        low_stock_threshold INTEGER DEFAULT 5,
        hsn_code TEXT DEFAULT '',
        tax_percent REAL DEFAULT 0,
        max_discount REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT,
        customer_id TEXT,
        customer_name TEXT DEFAULT '',
        date TEXT DEFAULT (date('now')),
        due_date TEXT DEFAULT '',
        status TEXT DEFAULT 'Draft',
        payment_mode TEXT DEFAULT 'Cash',
        subtotal REAL DEFAULT 0,
        tax_percent REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        discount_percent REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        total REAL DEFAULT 0,
        notes TEXT DEFAULT '',
        customer_gstin TEXT DEFAULT '',
        is_deleted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        item_id TEXT,
        name TEXT NOT NULL,
        quantity REAL DEFAULT 1,
        rate REAL DEFAULT 0,
        rate_type TEXT DEFAULT 'Retail',
        mrp_discount REAL DEFAULT 0,
        total REAL DEFAULT 0,
        hsn_code TEXT DEFAULT '',
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        invoice_id TEXT,
        customer_id TEXT,
        customer_name TEXT DEFAULT '',
        amount REAL DEFAULT 0,
        method TEXT DEFAULT 'Cash',
        type TEXT DEFAULT 'payment',
        date TEXT DEFAULT (date('now')),
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (invoice_id) REFERENCES invoices(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS challans (
        id TEXT PRIMARY KEY,
        challan_number TEXT,
        invoice_id TEXT,
        customer_id TEXT,
        customer_name TEXT DEFAULT '',
        status TEXT DEFAULT 'Draft',
        date TEXT DEFAULT (date('now')),
        items_json TEXT DEFAULT '[]',
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (invoice_id) REFERENCES invoices(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        entity_id TEXT,
        entity_type TEXT,
        timestamp TEXT DEFAULT (datetime('now'))
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT,
        customer_id TEXT,
        customer_name TEXT DEFAULT '',
        date TEXT DEFAULT (date('now')),
        delivery_date TEXT DEFAULT '',
        status TEXT DEFAULT 'Pending',
        subtotal REAL DEFAULT 0,
        tax_percent REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        discount_percent REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        total REAL DEFAULT 0,
        notes TEXT DEFAULT '',
        items_json TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS sales_returns (
        id TEXT PRIMARY KEY,
        return_number TEXT,
        invoice_id TEXT,
        customer_id TEXT,
        customer_name TEXT DEFAULT '',
        date TEXT DEFAULT (date('now')),
        reason TEXT DEFAULT '',
        subtotal REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        total REAL DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (invoice_id) REFERENCES invoices(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS sales_return_items (
        id TEXT PRIMARY KEY,
        return_id TEXT NOT NULL,
        item_id TEXT,
        name TEXT NOT NULL,
        quantity REAL DEFAULT 1,
        rate REAL DEFAULT 0,
        total REAL DEFAULT 0,
        FOREIGN KEY (return_id) REFERENCES sales_returns(id) ON DELETE CASCADE
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        address TEXT DEFAULT '',
        gstin TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS purchases (
        id TEXT PRIMARY KEY,
        bill_number TEXT,
        supplier_id TEXT,
        supplier_name TEXT DEFAULT '',
        date TEXT DEFAULT (date('now')),
        due_date TEXT DEFAULT '',
        status TEXT DEFAULT 'Unpaid',
        payment_mode TEXT DEFAULT 'Cash',
        subtotal REAL DEFAULT 0,
        tax_percent REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        discount_percent REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        total REAL DEFAULT 0,
        notes TEXT DEFAULT '',
        is_deleted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id TEXT PRIMARY KEY,
        purchase_id TEXT NOT NULL,
        item_id TEXT,
        name TEXT NOT NULL,
        quantity REAL DEFAULT 1,
        rate REAL DEFAULT 0,
        total REAL DEFAULT 0,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id TEXT PRIMARY KEY,
        customer_name TEXT,
        contact TEXT DEFAULT '',
        description TEXT DEFAULT '',
        status TEXT DEFAULT 'Pending',
        date TEXT DEFAULT (date('now')),
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS supplier_payments (
        id TEXT PRIMARY KEY,
        purchase_id TEXT,
        supplier_id TEXT,
        supplier_name TEXT DEFAULT '',
        amount REAL DEFAULT 0,
        method TEXT DEFAULT 'Cash',
        type TEXT DEFAULT 'payment',
        date TEXT DEFAULT (date('now')),
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (purchase_id) REFERENCES purchases(id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      );
    `);

    // Aggregated Migrations
    const allMigrations = [
      'ALTER TABLE items ADD COLUMN description TEXT DEFAULT "";',
      'ALTER TABLE items ADD COLUMN hsn_code TEXT DEFAULT "";',
      'ALTER TABLE profile ADD COLUMN logo_uri TEXT DEFAULT "";',
      'ALTER TABLE profile ADD COLUMN signature_uri TEXT DEFAULT "";',
      'ALTER TABLE profile ADD COLUMN payment_instructions TEXT DEFAULT "";',
      'ALTER TABLE profile ADD COLUMN bank_details TEXT DEFAULT "";',
      'ALTER TABLE profile ADD COLUMN currency_symbol TEXT DEFAULT "₹";',
      'ALTER TABLE profile ADD COLUMN currency_code TEXT DEFAULT "INR";',
      'ALTER TABLE profile ADD COLUMN upi_qr_uri TEXT DEFAULT "";',
      'ALTER TABLE profile ADD COLUMN is_logged_in INTEGER DEFAULT 0;',
      'ALTER TABLE profile ADD COLUMN gstin TEXT DEFAULT "";',
      'ALTER TABLE profile ADD COLUMN pan_no TEXT DEFAULT "";',
      'ALTER TABLE profile ADD COLUMN business_role TEXT DEFAULT "Store Owner";',
      'ALTER TABLE profile ADD COLUMN business_type TEXT DEFAULT "Individual";',
      'ALTER TABLE profile ADD COLUMN owner_name TEXT DEFAULT "";',
      'ALTER TABLE profile ADD COLUMN address TEXT DEFAULT "";',
      'ALTER TABLE profile ADD COLUMN city TEXT DEFAULT "";',
      'ALTER TABLE profile ADD COLUMN state TEXT DEFAULT "";',
      'ALTER TABLE profile ADD COLUMN zip_code TEXT DEFAULT "";',
      'ALTER TABLE customers ADD COLUMN gstin TEXT DEFAULT "";',
      'ALTER TABLE invoice_items ADD COLUMN hsn_code TEXT DEFAULT "";',
      'ALTER TABLE invoices ADD COLUMN customer_gstin TEXT DEFAULT "";',
      'ALTER TABLE invoices ADD COLUMN payment_mode TEXT DEFAULT "Cash";',
      'ALTER TABLE payments ADD COLUMN type TEXT DEFAULT "payment";',
      'ALTER TABLE orders ADD COLUMN discount_percent REAL DEFAULT 0;',
      'ALTER TABLE orders ADD COLUMN discount_amount REAL DEFAULT 0;',
      'ALTER TABLE invoices ADD COLUMN is_deleted INTEGER DEFAULT 0;',
      'ALTER TABLE customers ADD COLUMN payment_due_date TEXT DEFAULT "";',
      'ALTER TABLE customers ADD COLUMN payment_note TEXT DEFAULT "";',
      'ALTER TABLE profile ADD COLUMN language TEXT DEFAULT "en";',
      'ALTER TABLE profile ADD COLUMN theme TEXT DEFAULT "system";',
      'ALTER TABLE profile ADD COLUMN business_name TEXT DEFAULT "";',
      'ALTER TABLE invoices ADD COLUMN type TEXT DEFAULT "invoice";',
      'ALTER TABLE items ADD COLUMN tax_percent REAL DEFAULT 0;',
      'ALTER TABLE items ADD COLUMN max_discount REAL DEFAULT 0;',
      // Stores how much of a sales return settled the invoice due (vs cash refund)
      'ALTER TABLE payments ADD COLUMN due_reduced REAL DEFAULT 0;',
      // UPI ID for generating QR codes on invoices
      'ALTER TABLE profile ADD COLUMN upi_id TEXT DEFAULT "";',
      // Customer contact for invoice PDF
      'ALTER TABLE invoices ADD COLUMN customer_address TEXT DEFAULT "";',
      'ALTER TABLE invoices ADD COLUMN customer_phone TEXT DEFAULT "";',
      'ALTER TABLE invoices ADD COLUMN customer_email TEXT DEFAULT "";',
      'ALTER TABLE invoices ADD COLUMN customer_state TEXT DEFAULT "";',
      // Item unit and description on invoice items  
      'ALTER TABLE invoice_items ADD COLUMN unit TEXT DEFAULT "pcs";',
      'ALTER TABLE invoice_items ADD COLUMN description TEXT DEFAULT "";',
      'ALTER TABLE invoice_items ADD COLUMN tax_percent REAL DEFAULT 0;',
      // ── Indian GST upgrade (invoices) ──────────────────────────────
      'ALTER TABLE invoices ADD COLUMN tax_mode TEXT DEFAULT "exclusive";',
      'ALTER TABLE invoices ADD COLUMN cgst_amount REAL DEFAULT 0;',
      'ALTER TABLE invoices ADD COLUMN sgst_amount REAL DEFAULT 0;',
      'ALTER TABLE invoices ADD COLUMN igst_amount REAL DEFAULT 0;',
      'ALTER TABLE invoices ADD COLUMN is_inter_state INTEGER DEFAULT 0;',
      // invoice_items: per-item GST amounts
      'ALTER TABLE invoice_items ADD COLUMN cgst_amount REAL DEFAULT 0;',
      'ALTER TABLE invoice_items ADD COLUMN sgst_amount REAL DEFAULT 0;',
      'ALTER TABLE invoice_items ADD COLUMN igst_amount REAL DEFAULT 0;',
      // profile: seller state for IGST determination
      'ALTER TABLE profile ADD COLUMN state TEXT DEFAULT "";',
      // ── Gap 2: purchase_items missing columns ──────────────────────
      'ALTER TABLE purchase_items ADD COLUMN unit TEXT DEFAULT "pcs";',
      'ALTER TABLE purchase_items ADD COLUMN description TEXT DEFAULT "";',
      'ALTER TABLE purchase_items ADD COLUMN hsn_code TEXT DEFAULT "";',
      'ALTER TABLE purchase_items ADD COLUMN tax_percent REAL DEFAULT 0;',
      // ── Gap 4: purchases GST split columns ────────────────────────
      'ALTER TABLE purchases ADD COLUMN tax_mode TEXT DEFAULT "exclusive";',
      'ALTER TABLE purchases ADD COLUMN cgst_amount REAL DEFAULT 0;',
      'ALTER TABLE purchases ADD COLUMN sgst_amount REAL DEFAULT 0;',
      'ALTER TABLE purchases ADD COLUMN igst_amount REAL DEFAULT 0;',
      'ALTER TABLE purchases ADD COLUMN is_inter_state INTEGER DEFAULT 0;',
      // ── Gap 5: supplier state for inter-state IGST detection ───────
      'ALTER TABLE suppliers ADD COLUMN state TEXT DEFAULT "";',
      // ── Invoice template customization ─────────────────────────────
      'ALTER TABLE profile ADD COLUMN invoice_config TEXT DEFAULT NULL;',
      // ── Give Payment feature ────────────────────────────────────────
      // payment_direction: 'received' (from customer) | 'given' (to customer)
      'ALTER TABLE payments ADD COLUMN payment_direction TEXT DEFAULT \'received\';',
      // ── Product Return → Wallet Credit ─────────────────────────────
      // per-item return detail table (used by ReturnItemsSheet)
      `CREATE TABLE IF NOT EXISTS returned_items (
        id TEXT PRIMARY KEY,
        sales_return_id TEXT,
        invoice_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        return_amount REAL NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );`,
      // return_status on invoices: 'NONE' | 'PARTIAL' | 'FULL'
      'ALTER TABLE invoices ADD COLUMN return_status TEXT DEFAULT \'NONE\';',
      // ── Order advance tracking ────────────────────────────────────────
      'ALTER TABLE orders ADD COLUMN advance_amount REAL DEFAULT 0;',

      // ── Ledger / Wallet / Transactions (Phase 2) ──────────────────────
      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        invoice_id TEXT,
        type TEXT DEFAULT 'PAYMENT_IN',
        amount REAL DEFAULT 0,
        direction TEXT DEFAULT 'IN',
        payment_mode TEXT DEFAULT 'CASH',
        reference_note TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );`,
      `CREATE TABLE IF NOT EXISTS customer_ledger (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        invoice_id TEXT,
        transaction_id TEXT,
        entry_type TEXT DEFAULT 'INVOICE_CREATED',
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        running_balance REAL DEFAULT 0,
        wallet_balance REAL DEFAULT 0,
        note TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );`,
      `CREATE TABLE IF NOT EXISTS customer_wallet (
        id TEXT PRIMARY KEY,
        customer_id TEXT UNIQUE,
        balance REAL DEFAULT 0,
        last_updated TEXT DEFAULT (datetime('now'))
      );`,
      // refund_type tracks how each return was resolved: 'WALLET' | 'CASH' | NULL
      'ALTER TABLE sales_returns ADD COLUMN refund_type TEXT DEFAULT NULL;',
      'ALTER TABLE sales_returns ADD COLUMN refund_amount REAL DEFAULT 0;',
      // wallet_delta: wallet amount credited/debited in this payment row
      'ALTER TABLE payments ADD COLUMN wallet_delta REAL DEFAULT 0;',
      // ── Customer profile photo (local file URI) ──────────────────────
      'ALTER TABLE customers ADD COLUMN photo TEXT DEFAULT NULL;',
    ];

    for (const sql of allMigrations) {
      try {
        await database.execAsync(sql);
      } catch (e) {
        // Ignore "duplicate column" or "already exists" errors
      }
    }

    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
  }

  return database;
}
