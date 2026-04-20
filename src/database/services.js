import { getDatabase } from './db';

// ========== HELPERS ==========
// L1 fix: substr() is deprecated — use substring()
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

// ========== PROFILE ==========
export async function getProfile() {
  const db = await getDatabase();
  const result = await db.getFirstAsync('SELECT * FROM profile WHERE id = 1');
  return result || { name: 'Business Name', email: '', currency_code: 'INR', currency_symbol: '₹', logo_uri: '', signature_uri: '', payment_instructions: '', bank_details: '', upi_qr_uri: '', is_logged_in: 0, gstin: '', pan_no: '' };
}

export async function updateProfile(profile) {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE profile SET name = ?, email = ?, phone = ?, address = ?, currency_symbol = ?, currency_code = ?, business_role = ?, logo_uri = ?, signature_uri = ?, payment_instructions = ?, bank_details = ?, upi_qr_uri = ?, upi_id = ?, is_logged_in = ?, gstin = ?, pan_no = ? WHERE id = 1',
    [
      profile.name || '',
      profile.email || '',
      profile.phone || '',
      profile.address || '',
      profile.currency_symbol || '₹',
      profile.currency_code || 'INR',
      profile.business_role || 'Store Owner',
      profile.logo_uri || '',
      profile.signature_uri || '',
      profile.payment_instructions || '',
      profile.bank_details || '',
      profile.upi_qr_uri || '',
      profile.upi_id || '',
      profile.is_logged_in || 0,
      profile.gstin || '',
      profile.pan_no || '',
    ]
  );
}

// ========== USERS (TEAM) ==========
export async function getUsers() {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM users ORDER BY created_at DESC');
}

export async function addUser(user) {
  const db = await getDatabase();
  const id = user.id || generateId();
  await db.runAsync(
    'INSERT INTO users (id, name, email, role, avatar_uri) VALUES (?, ?, ?, ?, ?)',
    [id, user.name, user.email || '', user.role || 'Staff', user.avatar_uri || '']
  );
  return { ...user, id };
}

export async function updateUser(user) {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE users SET name = ?, email = ?, role = ?, avatar_uri = ? WHERE id = ?',
    [user.name, user.email || '', user.role || 'Staff', user.avatar_uri || '', user.id]
  );
}

export async function deleteUser(id) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM users WHERE id = ?', [id]);
}

// ========== CUSTOMERS ==========
export async function getCustomers() {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM customers ORDER BY created_at DESC');
}

export async function addCustomer(customer) {
  const db = await getDatabase();
  const id = customer.id || generateId();
  await db.runAsync(
    'INSERT INTO customers (id, name, email, phone, address, notes, gstin, payment_due_date, payment_note, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, customer.name, customer.email || '', customer.phone || '', customer.address || '', customer.notes || '', customer.gstin || '', customer.payment_due_date || '', customer.payment_note || '', customer.photo || null]
  );
  return { ...customer, id };
}

export async function updateCustomer(customer) {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, notes = ?, gstin = ?, payment_due_date = ?, payment_note = ?, photo = ? WHERE id = ?',
    [customer.name, customer.email || '', customer.phone || '', customer.address || '', customer.notes || '', customer.gstin || '', customer.payment_due_date || '', customer.payment_note || '', customer.photo || null, customer.id]
  );
}

export async function deleteCustomer(id) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM customers WHERE id = ?', [id]);
}

export async function updateItemQuantity(id, newQuantity) {
  const db = await getDatabase();
  await db.runAsync('UPDATE items SET quantity = ? WHERE id = ?', [newQuantity, id]);
}

export async function hasCustomerDependencies(customerId) {
  const db = await getDatabase();
  const queries = [
    'SELECT id FROM invoices WHERE customer_id = ? LIMIT 1',
    'SELECT id FROM payments WHERE customer_id = ? LIMIT 1',
    'SELECT id FROM challans WHERE customer_id = ? LIMIT 1',
    'SELECT id FROM orders WHERE customer_id = ? LIMIT 1'
  ];
  
  for (const query of queries) {
    const result = await db.getFirstAsync(query, [customerId]);
    if (result) return true;
  }
  return false;
}

// ========== ITEMS ==========
export async function getItems() {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM items ORDER BY created_at DESC');
}

export async function getItemBySku(sku) {
  const db = await getDatabase();
  return await db.getFirstAsync('SELECT * FROM items WHERE sku = ?', [sku]);
}

export async function getItemById(id) {
  const db = await getDatabase();
  return await db.getFirstAsync('SELECT * FROM items WHERE id = ?', [id]);
}

export async function addItem(item) {
  const db = await getDatabase();
  const id = item.id || generateId();
  await db.runAsync(
    'INSERT INTO items (id, name, sku, category, description, retail_price, wholesale_price, mrp, quantity, unit, img, hsn_code, tax_percent, max_discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      item.name,
      item.sku || null,
      item.category || '',
      item.description || '',
      item.retail_price || item.price || 0,
      item.wholesale_price || 0,
      item.mrp || 0,
      item.quantity || item.stock || 0,
      item.unit || 'pcs',
      item.img || '',
      item.hsn_code || '',
      item.tax_percent || 0,
      item.max_discount || 0
    ]
  );
  return { ...item, id };
}

export async function updateItem(item) {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE items SET name = ?, sku = ?, category = ?, description = ?, retail_price = ?, wholesale_price = ?, mrp = ?, quantity = ?, unit = ?, img = ?, hsn_code = ?, tax_percent = ?, max_discount = ? WHERE id = ?',
    [
      item.name,
      item.sku || null,
      item.category || '',
      item.description || '',
      item.retail_price || item.price || 0,
      item.wholesale_price || 0,
      item.mrp || 0,
      item.quantity || item.stock || 0,
      item.unit || 'pcs',
      item.img || '',
      item.hsn_code || '',
      item.tax_percent || item.taxPercent || 0,
      item.max_discount || item.maxDiscount || 0,
      item.id
    ]
  );
}

export async function deleteItem(id) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
}

// ========== INVOICES ==========
export async function getInvoices(includeDeleted = false) {
  const db = await getDatabase();
  const query = includeDeleted 
    ? 'SELECT * FROM invoices ORDER BY created_at DESC'
    : 'SELECT * FROM invoices WHERE COALESCE(is_deleted, 0) = 0 ORDER BY created_at DESC';
  return await db.getAllAsync(query);
}

export async function addInvoice(invoice) {
  const db = await getDatabase();
  const id = invoice.id || generateId();
  await db.runAsync(
    `INSERT INTO invoices (
       id, invoice_number, customer_id, customer_name, date, due_date, status, payment_mode,
       subtotal, tax_percent, tax_amount, discount_percent, discount_amount, total, notes,
       customer_gstin, type, customer_address, customer_phone, customer_email, customer_state,
       tax_mode, cgst_amount, sgst_amount, igst_amount, is_inter_state
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      invoice.invoiceNumber || invoice.invoice_number || '',
      invoice.customerId || invoice.customer_id || '',
      invoice.customerName || invoice.customer_name || '',
      invoice.date || new Date().toISOString().split('T')[0],
      invoice.dueDate || invoice.due_date || '',
      invoice.status || 'Draft',
      invoice.paymentMode || invoice.payment_mode || 'Cash',
      invoice.subtotal || 0,
      invoice.taxPercent || invoice.tax_percent || 0,
      invoice.taxAmount || invoice.tax_amount || 0,
      invoice.discountPercent || invoice.discount_percent || 0,
      invoice.discountAmount || invoice.discount_amount || 0,
      invoice.total || 0,
      invoice.notes || '',
      invoice.customer_gstin || invoice.customerGstin || '',
      invoice.type || 'invoice',
      invoice.customer_address || invoice.customerAddress || '',
      invoice.customer_phone || invoice.customerPhone || '',
      invoice.customer_email || invoice.customerEmail || '',
      invoice.customer_state || invoice.customerState || '',
      // GST fields (default to 'exclusive' / 0 for backwards compat)
      invoice.taxMode || invoice.tax_mode || 'exclusive',
      invoice.cgstAmount || invoice.cgst_amount || 0,
      invoice.sgstAmount || invoice.sgst_amount || 0,
      invoice.igstAmount || invoice.igst_amount || 0,
      invoice.isInterState || invoice.is_inter_state ? 1 : 0,
    ]
  );

  // Insert line items if provided
  if (invoice.items && invoice.items.length > 0) {
    for (const lineItem of invoice.items) {
      await addInvoiceItem({ ...lineItem, invoice_id: id });
    }
  }

  return { ...invoice, id };
}

export async function updateInvoice(invoice) {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE invoices SET
       invoice_number = ?, customer_id = ?, customer_name = ?, date = ?, due_date = ?,
       status = ?, payment_mode = ?, subtotal = ?, tax_percent = ?, tax_amount = ?,
       discount_percent = ?, discount_amount = ?, total = ?, notes = ?, customer_gstin = ?,
       type = ?, customer_address = ?, customer_phone = ?, customer_email = ?, customer_state = ?,
       tax_mode = ?, cgst_amount = ?, sgst_amount = ?, igst_amount = ?, is_inter_state = ?
     WHERE id = ?`,
    [
      invoice.invoiceNumber || invoice.invoice_number || '',
      invoice.customerId || invoice.customer_id || '',
      invoice.customerName || invoice.customer_name || '',
      invoice.date || '',
      invoice.dueDate || invoice.due_date || '',
      invoice.status || 'Draft',
      invoice.paymentMode || invoice.payment_mode || 'Cash',
      invoice.subtotal || 0,
      invoice.taxPercent || invoice.tax_percent || 0,
      invoice.taxAmount || invoice.tax_amount || 0,
      invoice.discountPercent || invoice.discount_percent || 0,
      invoice.discountAmount || invoice.discount_amount || 0,
      invoice.total || 0,
      invoice.notes || '',
      invoice.customer_gstin || invoice.customerGstin || '',
      invoice.type || 'invoice',
      invoice.customer_address || invoice.customerAddress || '',
      invoice.customer_phone || invoice.customerPhone || '',
      invoice.customer_email || invoice.customerEmail || '',
      invoice.customer_state || invoice.customerState || '',
      // GST fields
      invoice.taxMode || invoice.tax_mode || 'exclusive',
      invoice.cgstAmount || invoice.cgst_amount || 0,
      invoice.sgstAmount || invoice.sgst_amount || 0,
      invoice.igstAmount || invoice.igst_amount || 0,
      invoice.isInterState || invoice.is_inter_state ? 1 : 0,
      invoice.id
    ]
  );

  // Sync line items ONLY if items array is explicitly provided
  if (invoice.items !== undefined) {
    await db.runAsync('DELETE FROM invoice_items WHERE invoice_id = ?', [invoice.id]);
    if (invoice.items.length > 0) {
      for (const lineItem of invoice.items) {
        await addInvoiceItem({ ...lineItem, invoice_id: invoice.id });
      }
    }
  }
}

export async function deleteInvoice(id) {
  // Soft delete: move to trash
  const db = await getDatabase();
  await db.runAsync('UPDATE invoices SET is_deleted = 1 WHERE id = ?', [id]);
}

export async function permanentlyDeleteInvoice(id) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
  await db.runAsync('DELETE FROM payments WHERE invoice_id = ?', [id]);
  await db.runAsync('DELETE FROM invoices WHERE id = ?', [id]);
}

export async function recoverInvoice(id) {
  const db = await getDatabase();
  await db.runAsync('UPDATE invoices SET is_deleted = 0 WHERE id = ?', [id]);
}

export async function updateInvoiceStatus(id, status) {
  const db = await getDatabase();
  await db.runAsync('UPDATE invoices SET status = ? WHERE id = ?', [status, id]);
}

export async function updateInvoiceType(id, type, newNumber) {
  const db = await getDatabase();
  await db.runAsync('UPDATE invoices SET type = ?, invoice_number = ? WHERE id = ?', [type, newNumber, id]);
}

// ========== INVOICE ITEMS ==========
export async function getInvoiceItems(invoiceId) {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
}

export async function addInvoiceItem(item) {
  const db = await getDatabase();
  const id = item.id || generateId();
  await db.runAsync(
    `INSERT INTO invoice_items (
       id, invoice_id, item_id, name, quantity, rate, rate_type, mrp_discount,
       total, hsn_code, unit, description, tax_percent,
       cgst_amount, sgst_amount, igst_amount
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, item.invoice_id, item.item_id || '', item.name,
      item.quantity || 1, item.rate || 0, item.rate_type || 'Retail',
      item.mrp_discount || 0, item.total || 0, item.hsn_code || '',
      item.unit || 'pcs', item.description || '', item.tax_percent || 0,
      item.cgst_amount || 0, item.sgst_amount || 0, item.igst_amount || 0,
    ]
  );
  return { ...item, id };
}

// ========== PAYMENTS ==========
export async function getPayments() {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM payments ORDER BY created_at DESC');
  // Normalize snake_case DB columns to camelCase for the JS layer
  return rows.map(p => ({
    ...p,
    invoiceId: p.invoice_id,
    customerId: p.customer_id,
    customerName: p.customer_name,
    dueReduced: parseFloat(p.due_reduced) || 0,
    paymentDirection: p.payment_direction || 'received',
  }));
}

export async function addPayment(payment) {
  const db = await getDatabase();
  const id = payment.id || generateId();
  await db.runAsync(
    'INSERT INTO payments (id, invoice_id, customer_id, customer_name, amount, method, type, date, notes, due_reduced, payment_direction) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      payment.invoiceId || payment.invoice_id || null,
      payment.customerId || payment.customer_id || '',
      payment.customerName || payment.customer_name || '',
      payment.amount || 0,
      payment.method || 'Cash',
      payment.type || 'payment',
      payment.date || new Date().toISOString().split('T')[0],
      payment.notes || '',
      payment.dueReduced || payment.due_reduced || 0,
      payment.paymentDirection || payment.payment_direction || 'received',
    ]
  );
  return { ...payment, id };
}

/**
 * Records money given TO the customer (refund, advance credit, goodwill).
 * Stored with type='give_payment' and payment_direction='given'.
 */
export async function addGivePayment(payment) {
  return addPayment({
    ...payment,
    type: 'give_payment',
    paymentDirection: 'given',
    method: payment.method || 'Cash',
  });
}

/**
 * Records a due entry — money the customer owes us outside of an invoice.
 * Stored with type='due_entry'. This increases Balance Due without creating an invoice.
 * Also creates a ledger entry for proper bookkeeping.
 */
export async function addDueEntry(entry) {
  // 1. Create payment record with type='due_entry'
  const saved = await addPayment({
    customerId: entry.customerId,
    customerName: entry.customerName,
    amount: entry.amount,
    method: entry.method || 'Credit',
    type: 'due_entry',
    paymentDirection: 'due',
    date: entry.date || new Date().toISOString().split('T')[0],
    notes: entry.notes || '',
    dueDate: entry.dueDate || '',
  });

  // 2. Create ledger entry
  await addLedgerEntry({
    customer_id: entry.customerId,
    entry_type: 'DUE_ADDED',
    debit: entry.amount,
    credit: 0,
    note: entry.notes || `Due of ₹${entry.amount} added`,
    transaction_id: saved.id,
  });

  return saved;
}

export async function addCreditTransaction(customerId, customerName, amount, invoiceId, notes) {
  // Records a credit sale — appears in payment records with type='credit'
  return await addPayment({
    invoiceId,
    customerId,
    customerName,
    amount,
    method: 'Credit',
    type: 'credit',
    date: new Date().toISOString().split('T')[0],
    notes: notes || 'Credit sale',
  });
}

// ========== PRODUCT RETURN — WALLET CREDIT ==========

/**
 * Bulk-insert per-item return detail rows into returned_items table.
 * @param {Array} items  - [{ salesReturnId, invoiceId, itemName, quantity, unitPrice, returnAmount }]
 */
export async function addReturnedItems(items) {
  const db = await getDatabase();
  for (const item of items) {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    await db.runAsync(
      `INSERT INTO returned_items (id, sales_return_id, invoice_id, item_name, quantity, unit_price, return_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        item.salesReturnId || null,
        item.invoiceId,
        item.itemName,
        item.quantity,
        item.unitPrice,
        item.returnAmount,
      ]
    );
  }
}

/**
 * Fetch all returned items for a given invoice.
 */
export async function getReturnedItemsByInvoice(invoiceId) {
  const db = await getDatabase();
  return await db.getAllAsync(
    `SELECT * FROM returned_items WHERE invoice_id = ? ORDER BY created_at DESC`,
    [invoiceId]
  );
}

/**
 * Update the return_status of an invoice.
 * @param {string} invoiceId
 * @param {'NONE'|'PARTIAL'|'FULL'} status
 */
export async function updateInvoiceReturnStatus(invoiceId, status) {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE invoices SET return_status = ? WHERE id = ?`,
    [status, invoiceId]
  );
}



export async function getChallans() {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM challans ORDER BY created_at DESC');
}

export async function addChallan(challan) {
  const db = await getDatabase();
  const id = challan.id || generateId();
  await db.runAsync(
    'INSERT INTO challans (id, challan_number, invoice_id, customer_id, customer_name, status, date, items_json, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      challan.challanNumber || challan.challan_number || '',
      challan.invoiceId || challan.invoice_id || '',
      challan.customerId || challan.customer_id || '',
      challan.customerName || challan.customer_name || '',
      challan.status || 'Draft',
      challan.date || new Date().toISOString().split('T')[0],
      JSON.stringify(challan.items || []),
      challan.notes || ''
    ]
  );
  return { ...challan, id };
}

// ========== ORDERS ==========
export async function getOrders() {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM orders ORDER BY created_at DESC');
}

export async function addOrder(order) {
  const db = await getDatabase();
  const id = order.id || generateId();
  const orderNumber = order.order_number || `ORD-${Date.now().toString().slice(-6)}`;
  const itemsJson = JSON.stringify(order.items || []);
  await db.runAsync(
    'INSERT INTO orders (id, order_number, customer_id, customer_name, date, delivery_date, status, subtotal, tax_percent, tax_amount, discount_percent, discount_amount, total, notes, items_json, advance_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      orderNumber,
      order.customer_id || order.customerId || '',
      order.customer_name || order.customerName || '',
      order.date || new Date().toISOString().split('T')[0],
      order.delivery_date || order.deliveryDate || '',
      order.status || 'Pending',
      order.subtotal || 0,
      order.tax_percent || order.taxPercent || 0,
      order.tax_amount || order.taxAmount || 0,
      order.discount_percent || order.discountPercent || 0,
      order.discount_amount || order.discountAmount || 0,
      order.total || 0,
      order.notes || '',
      itemsJson,
      order.advance_amount || order.advanceAmount || 0,
    ]
  );
  return { ...order, id, order_number: orderNumber, items_json: itemsJson };
}

export async function updateOrder(order) {
  const db = await getDatabase();
  const itemsJson = JSON.stringify(order.items || JSON.parse(order.items_json || '[]'));
  await db.runAsync(
    'UPDATE orders SET customer_id = ?, customer_name = ?, date = ?, delivery_date = ?, status = ?, subtotal = ?, tax_percent = ?, tax_amount = ?, discount_percent = ?, discount_amount = ?, total = ?, notes = ?, items_json = ?, advance_amount = ? WHERE id = ?',
    [
      order.customer_id || order.customerId || '',
      order.customer_name || order.customerName || '',
      order.date || '',
      order.delivery_date || order.deliveryDate || '',
      order.status || 'Pending',
      order.subtotal || 0,
      order.tax_percent || order.taxPercent || 0,
      order.tax_amount || order.taxAmount || 0,
      order.discount_percent || order.discountPercent || 0,
      order.discount_amount || order.discountAmount || 0,
      order.total || 0,
      order.notes || '',
      itemsJson,
      order.advance_amount || order.advanceAmount || 0,
      order.id,
    ]
  );
}

export async function deleteOrder(id) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM orders WHERE id = ?', [id]);
}

// ========== HISTORY ==========
export async function getHistory() {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM history ORDER BY timestamp DESC');
}

export async function addHistory(event) {
  const db = await getDatabase();
  const id = event.id || generateId();
  await db.runAsync(
    'INSERT INTO history (id, type, description, entity_id, entity_type) VALUES (?, ?, ?, ?, ?)',
    [id, event.type || 'info', event.description || '', event.entityId || event.entity_id || '', event.entityType || event.entity_type || '']
  );
  return { ...event, id };
}

// ========== DASHBOARD STATS ==========
export async function getDashboardStats() {
  const db = await getDatabase();

  const totalInvoices = await db.getFirstAsync("SELECT COUNT(*) as count FROM invoices WHERE COALESCE(is_deleted,0) = 0 AND COALESCE(type,'invoice') = 'invoice'");
  const paidInvoices = await db.getFirstAsync("SELECT COUNT(*) as count FROM invoices WHERE status = 'Paid' AND COALESCE(is_deleted,0) = 0 AND COALESCE(type,'invoice') = 'invoice'");
  const pendingInvoices = await db.getFirstAsync("SELECT COUNT(*) as count FROM invoices WHERE status = 'Pending' AND COALESCE(is_deleted,0) = 0 AND COALESCE(type,'invoice') = 'invoice'");
  const overdueInvoices = await db.getFirstAsync("SELECT COUNT(*) as count FROM invoices WHERE status = 'Overdue' AND COALESCE(is_deleted,0) = 0 AND COALESCE(type,'invoice') = 'invoice'");
  const totalRevenue = await db.getFirstAsync("SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE status IN ('Paid', 'SALE') AND COALESCE(is_deleted,0) = 0 AND COALESCE(type,'invoice') = 'invoice'");

  return {
    totalInvoices: totalInvoices?.count || 0,
    paidCount: paidInvoices?.count || 0,
    pendingCount: pendingInvoices?.count || 0,
    overdueCount: overdueInvoices?.count || 0,
    totalRevenue: totalRevenue?.total || 0,
  };
}
// ========== SALES RETURNS ==========
export async function getSalesReturns() {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM sales_returns ORDER BY created_at DESC');
}

export async function getSalesReturnItems(returnId) {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM sales_return_items WHERE return_id = ?', [returnId]);
}

export async function addSalesReturn(salesReturn) {
  const db = await getDatabase();
  const id = salesReturn.id || generateId();
  const returnNumber = salesReturn.returnNumber || salesReturn.return_number || `RET-${Date.now().toString().slice(-6)}`;
  
  await db.runAsync(
    `INSERT INTO sales_returns (id, return_number, invoice_id, customer_id, customer_name, date, reason, subtotal, tax_amount, total, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      returnNumber,
      salesReturn.invoiceId || salesReturn.invoice_id || '',
      salesReturn.customerId || salesReturn.customer_id || '',
      salesReturn.customerName || salesReturn.customer_name || '',
      salesReturn.date || new Date().toISOString().split('T')[0],
      salesReturn.reason || '',
      salesReturn.subtotal || 0,
      salesReturn.tax_amount || salesReturn.taxAmount || 0,
      salesReturn.total || 0,
      salesReturn.notes || ''
    ]
  );

  if (salesReturn.items && salesReturn.items.length > 0) {
    for (const item of salesReturn.items) {
      await addSalesReturnItem({ ...item, return_id: id });
    }
  }

  return { ...salesReturn, id, return_number: returnNumber };
}

export async function addSalesReturnItem(item) {
  const db = await getDatabase();
  const id = item.id || generateId();
  await db.runAsync(
    'INSERT INTO sales_return_items (id, return_id, item_id, name, quantity, rate, total) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, item.return_id, item.item_id || '', item.name, item.quantity || 1, item.rate || 0, item.total || 0]
  );
  return { ...item, id };
}

export async function deleteSalesReturn(id) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sales_return_items WHERE return_id = ?', [id]);
  await db.runAsync('DELETE FROM sales_returns WHERE id = ?', [id]);
}

// ========== SUPPLIERS ==========
export async function getSuppliers() {
  const db = await getDatabase();
  return await db.getAllAsync("SELECT * FROM suppliers ORDER BY name ASC");
}

export async function addSupplier(supplier) {
  const db = await getDatabase();
  const id = supplier.id || generateId();
  await db.runAsync(
    "INSERT INTO suppliers (id, name, phone, email, address, gstin, notes, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id, supplier.name, supplier.phone || '', supplier.email || '', supplier.address || '', supplier.gstin || '', supplier.notes || '', supplier.state || '']
  );
  return { ...supplier, id };
}

export async function updateSupplier(supplier) {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ?, gstin = ?, notes = ?, state = ? WHERE id = ?",
    [supplier.name, supplier.phone || '', supplier.email || '', supplier.address || '', supplier.gstin || '', supplier.notes || '', supplier.state || '', supplier.id]
  );
  return supplier;
}

export async function deleteSupplier(id) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM suppliers WHERE id = ?", [id]);
}

// ========== PURCHASES ==========
export async function getPurchases() {
  const db = await getDatabase();
  return await db.getAllAsync("SELECT * FROM purchases WHERE COALESCE(is_deleted,0) = 0 ORDER BY created_at DESC");
}

export async function getPurchaseItems(purchaseId) {
  const db = await getDatabase();
  return await db.getAllAsync("SELECT * FROM purchase_items WHERE purchase_id = ?", [purchaseId]);
}

export async function addPurchase(purchase) {
  const db = await getDatabase();
  const id = purchase.id || ('pur_' + Date.now());
  const billNumber = purchase.bill_number || purchase.billNumber || ('#PUR-' + Date.now().toString().slice(-4));

  await db.runAsync(
    "INSERT INTO purchases " +
    "(id, bill_number, supplier_id, supplier_name, date, due_date, status, payment_mode, " +
    "subtotal, tax_percent, tax_amount, discount_percent, discount_amount, total, notes, " +
    "tax_mode, cgst_amount, sgst_amount, igst_amount, is_inter_state) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      id, billNumber, purchase.supplierId || null, purchase.supplierName || '', purchase.date, purchase.dueDate || '',
      purchase.status || 'Unpaid', purchase.paymentMode || 'Cash', purchase.subtotal || 0,
      purchase.taxPercent || 0, purchase.taxAmount || 0, purchase.discountPercent || 0,
      purchase.discountAmount || 0, purchase.total || 0, purchase.notes || '',
      purchase.taxMode || 'exclusive',
      purchase.cgstAmount || 0, purchase.sgstAmount || 0, purchase.igstAmount || 0,
      purchase.isInterState ? 1 : 0,
    ]
  );

  if (purchase.items && purchase.items.length > 0) {
    for (const item of purchase.items) {
      const itemId = item.id || generateId();
      await db.runAsync(
        "INSERT INTO purchase_items (id, purchase_id, item_id, name, quantity, rate, total, unit, description, hsn_code, tax_percent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [itemId, id, item.item_id || item.itemId || '', item.name, item.quantity || 1, item.rate || 0, item.total || 0,
         item.unit || 'pcs', item.description || '', item.hsn_code || '', item.tax_percent || 0]
      );
    }
  }

  return { ...purchase, id, bill_number: billNumber };
}

export async function updatePurchase(purchase) {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE purchases SET " +
    "  supplier_id = ?, supplier_name = ?, date = ?, due_date = ?, status = ?, payment_mode = ?, " +
    "  subtotal = ?, tax_percent = ?, tax_amount = ?, discount_percent = ?, discount_amount = ?, total = ?, notes = ?, " +
    "  tax_mode = ?, cgst_amount = ?, sgst_amount = ?, igst_amount = ?, is_inter_state = ? " +
    "WHERE id = ?",
    [
      purchase.supplierId || purchase.supplier_id, purchase.supplierName || purchase.supplier_name, purchase.date, purchase.dueDate || purchase.due_date,
      purchase.status, purchase.paymentMode || purchase.payment_mode, purchase.subtotal,
      purchase.taxPercent || purchase.tax_percent, purchase.taxAmount || purchase.tax_amount,
      purchase.discountPercent || purchase.discount_percent, purchase.discountAmount || purchase.discount_amount,
      purchase.total, purchase.notes,
      purchase.taxMode || 'exclusive',
      purchase.cgstAmount || 0, purchase.sgstAmount || 0, purchase.igstAmount || 0,
      purchase.isInterState ? 1 : 0,
      purchase.id
    ]
  );

  // Clear and rewrite items
  await db.runAsync("DELETE FROM purchase_items WHERE purchase_id = ?", [purchase.id]);
  if (purchase.items && purchase.items.length > 0) {
    for (const item of purchase.items) {
      const itemId = item.id || generateId();
      await db.runAsync(
        "INSERT INTO purchase_items (id, purchase_id, item_id, name, quantity, rate, total, unit, description, hsn_code, tax_percent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [itemId, purchase.id, item.item_id || item.itemId || '', item.name, item.quantity || 1, item.rate || 0, item.total || 0,
         item.unit || 'pcs', item.description || '', item.hsn_code || '', item.tax_percent || 0]
      );
    }
  }
  return purchase;
}

// Update purchase payment status ('Unpaid' | 'Partial' | 'Paid')
export async function updatePurchaseStatus(id, status) {
  const db = await getDatabase();
  await db.runAsync('UPDATE purchases SET status = ? WHERE id = ?', [status, id]);
}

export async function deletePurchase(id) {
  const db = await getDatabase();
  await db.runAsync("UPDATE purchases SET is_deleted = 1 WHERE id = ?", [id]);
}

// ========== SUPPLIER PAYMENTS ==========
export async function getSupplierPayments() {
  const db = await getDatabase();
  return await db.getAllAsync("SELECT * FROM supplier_payments ORDER BY date DESC, created_at DESC");
}

export async function addSupplierPayment(payment) {
  const db = await getDatabase();
  const id = payment.id || generateId();
  await db.runAsync(
    "INSERT INTO supplier_payments (id, purchase_id, supplier_id, supplier_name, amount, method, type, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      id, payment.purchaseId || payment.purchase_id || null, payment.supplierId || payment.supplier_id, 
      payment.supplierName || payment.supplier_name || '', payment.amount || 0, payment.method || 'Cash', 
      payment.type || 'payment', payment.date, payment.notes || ''
    ]
  );
  return { ...payment, id };
}

export async function deleteSupplierPayment(id) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM supplier_payments WHERE id = ?", [id]);
}
// ========== INQUIRIES ==========
export async function getInquiries() {
  const db = await getDatabase();
  return await db.getAllAsync("SELECT * FROM inquiries ORDER BY created_at DESC");
}

export async function addInquiry(inquiry) {
  const db = await getDatabase();
  const id = inquiry.id || generateId();
  await db.runAsync(
    "INSERT INTO inquiries (id, customer_name, contact, description, status, date) VALUES (?, ?, ?, ?, ?, ?)",
    [id, inquiry.customer_name, inquiry.contact || '', inquiry.description || '', inquiry.status || 'Pending', inquiry.date || new Date().toISOString().split('T')[0]]
  );
  return { ...inquiry, id };
}

export async function updateInquiry(inquiry) {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE inquiries SET customer_name = ?, contact = ?, description = ?, status = ?, date = ? WHERE id = ?",
    [inquiry.customer_name, inquiry.contact || '', inquiry.description || '', inquiry.status || 'Pending', inquiry.date || '', inquiry.id]
  );
  return inquiry;
}

export async function deleteInquiry(id) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM inquiries WHERE id = ?", [id]);
}

// ========== CLEAR ALL DATA ==========
export async function clearAllData() {
  const db = await getDatabase();
  
  // Disable foreign keys temporarily to ensure we can wipe everything regardless of internal links
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  
  const sql = `
    DELETE FROM invoice_items;
    DELETE FROM payments;
    DELETE FROM challans;
    DELETE FROM sales_return_items;
    DELETE FROM sales_returns;
    DELETE FROM invoices;
    DELETE FROM orders;
    DELETE FROM customers;
    DELETE FROM purchase_items;
    DELETE FROM supplier_payments;
    DELETE FROM purchases;
    DELETE FROM suppliers;
    DELETE FROM items;
    DELETE FROM history;
    DELETE FROM users;
    DELETE FROM inquiries;
    DELETE FROM transactions;
    DELETE FROM customer_ledger;
    DELETE FROM customer_wallet;
    
    UPDATE profile SET
      name = '', email = '', phone = '', address = '',
      currency_symbol = '₹', currency_code = 'INR',
      business_role = 'Store Owner',
      logo_uri = '', signature_uri = '',
      payment_instructions = '', bank_details = '',
      upi_qr_uri = '', upi_id = '', is_logged_in = 0,
      gstin = '', pan_no = ''
    WHERE id = 1;
  `;
  
  try {
    await db.execAsync(sql);
  } finally {
    // Re-enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
}

// ========== LEDGER ==========

/**
 * Insert a ledger entry and auto-compute running_balance from the previous row.
 * @param {object} entry - { customer_id, invoice_id?, transaction_id?, entry_type, debit, credit, wallet_balance?, note? }
 */
export async function addLedgerEntry(entry) {
  const db = await getDatabase();
  const id = generateId();

  // Get previous running balance for this customer
  const prev = await db.getFirstAsync(
    'SELECT running_balance FROM customer_ledger WHERE customer_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1',
    [entry.customer_id]
  );
  const prevBalance = parseFloat(prev?.running_balance || 0);

  // Debit increases what customer owes; Credit reduces it
  const debit = parseFloat(entry.debit || 0);
  const credit = parseFloat(entry.credit || 0);
  const running_balance = Math.round((prevBalance + debit - credit) * 100) / 100;

  // Get current wallet balance for this customer
  const wallet = await db.getFirstAsync(
    'SELECT balance FROM customer_wallet WHERE customer_id = ?',
    [entry.customer_id]
  );
  const wallet_balance = parseFloat(entry.wallet_balance ?? wallet?.balance ?? 0);

  await db.runAsync(
    `INSERT INTO customer_ledger
      (id, customer_id, invoice_id, transaction_id, entry_type, debit, credit, running_balance, wallet_balance, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      entry.customer_id,
      entry.invoice_id || null,
      entry.transaction_id || null,
      entry.entry_type || 'INVOICE_CREATED',
      debit,
      credit,
      running_balance,
      wallet_balance,
      entry.note || '',
    ]
  );
  return { id, running_balance, wallet_balance };
}

/**
 * Fetch all ledger entries for a customer, newest-first.
 */
export async function getLedgerEntries(customerId) {
  const db = await getDatabase();
  return await db.getAllAsync(
    'SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY created_at ASC, rowid ASC',
    [customerId]
  );
}

// ========== WALLET ==========

/**
 * Get the current wallet balance for a customer (0 if no row exists).
 */
export async function getWalletBalance(customerId) {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    'SELECT balance FROM customer_wallet WHERE customer_id = ?',
    [customerId]
  );
  return parseFloat(row?.balance || 0);
}

/**
 * Set the wallet balance for a customer (upsert).
 */
export async function setWalletBalance(customerId, balance) {
  const db = await getDatabase();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO customer_wallet (id, customer_id, balance, last_updated)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(customer_id) DO UPDATE SET balance = excluded.balance, last_updated = excluded.last_updated`,
    [id, customerId, Math.round(balance * 100) / 100]
  );
}

/**
 * Get wallet balances for ALL customers as { customerId: balance }.
 */
export async function getAllWalletBalances() {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT customer_id, balance FROM customer_wallet');
  const map = {};
  rows.forEach(r => { map[r.customer_id] = parseFloat(r.balance || 0); });
  return map;
}

// ========== TRANSACTIONS ==========

/**
 * Insert a raw transaction record.
 */
export async function addTransaction(txn) {
  const db = await getDatabase();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO transactions (id, customer_id, invoice_id, type, amount, direction, payment_mode, reference_note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      txn.customer_id || null,
      txn.invoice_id || null,
      txn.type || 'PAYMENT_IN',
      parseFloat(txn.amount || 0),
      txn.direction || 'IN',
      txn.payment_mode || 'CASH',
      txn.reference_note || '',
    ]
  );
  return { ...txn, id };
}

// ========== SALES RETURN — REFUND TYPE ==========

/**
 * Persist the owner's refund choice on a sales return row.
 */
export async function markReturnRefundType(returnId, refundType, refundAmount) {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE sales_returns SET refund_type = ?, refund_amount = ? WHERE id = ?',
    [refundType, parseFloat(refundAmount || 0), returnId]
  );
}

