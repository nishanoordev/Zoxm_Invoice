import * as DbServices from '../services';
import { getDatabase } from '../db';

// ─── Shared mock database ────────────────────────────────────────────────────
const mockDb = {
  runAsync:     jest.fn(),
  getFirstAsync: jest.fn(),
  getAllAsync:   jest.fn(),
  execSync:     jest.fn(),
};

jest.mock('../db', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockDb)),
}));

describe('DbServices - SQL Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Soft Delete / Recover ──────────────────────────────────────────────────

  it('correctly updates is_deleted flag during soft-delete', async () => {
    await DbServices.deleteInvoice('inv-001');

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE invoices SET is_deleted = 1 WHERE id = ?'),
      expect.arrayContaining(['inv-001'])
    );
  });

  it('correctly updates is_deleted flag during recovery', async () => {
    await DbServices.recoverInvoice('inv-001');

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE invoices SET is_deleted = 0 WHERE id = ?'),
      expect.arrayContaining(['inv-001'])
    );
  });

  // ─── Permanent Delete ───────────────────────────────────────────────────────

  it('wipes all related records during permanent delete', async () => {
    await DbServices.permanentlyDeleteInvoice('inv-001');

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM invoice_items WHERE invoice_id = ?'),
      ['inv-001']
    );
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM payments WHERE invoice_id = ?'),
      ['inv-001']
    );
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM invoices WHERE id = ?'),
      ['inv-001']
    );
    // Must delete in correct order: items → payments → invoice
    const calls = mockDb.runAsync.mock.calls.map(c => c[0]);
    const itemsIdx   = calls.findIndex(q => q.includes('invoice_items'));
    const paymentsIdx = calls.findIndex(q => q.includes('payments'));
    const invoiceIdx = calls.findIndex(q => q.includes('DELETE FROM invoices'));
    expect(itemsIdx).toBeLessThan(invoiceIdx);
    expect(paymentsIdx).toBeLessThan(invoiceIdx);
  });

  // ─── Add Customer ───────────────────────────────────────────────────────────

  it('inserts a customer with correct fields', async () => {
    const customer = {
      name: 'Test Corp',
      email: 'corp@test.com',
      phone: '9876543210',
      address: '123 Main St',
    };
    await DbServices.addCustomer(customer);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO customers'),
      expect.arrayContaining([customer.name, customer.email, customer.phone, customer.address])
    );
  });

  it('inserts a customer with default empty strings for optional fields', async () => {
    await DbServices.addCustomer({ name: 'Minimal' });

    const callArgs = mockDb.runAsync.mock.calls[0][1];
    // email, phone, address, notes, gstin should all default to ''
    expect(callArgs[2]).toBe(''); // email
    expect(callArgs[3]).toBe(''); // phone
    expect(callArgs[4]).toBe(''); // address
    expect(callArgs[5]).toBe(''); // notes
    expect(callArgs[6]).toBe(''); // gstin
  });

  // ─── Add Invoice ────────────────────────────────────────────────────────────

  it('inserts an invoice with correct field mappings', async () => {
    await DbServices.addInvoice({
      invoiceNumber: 'INV-001',
      customerId: 'cust-1',
      customerName: 'John Doe',
      total: 1500,
      status: 'Pending',
    });

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO invoices'),
      expect.arrayContaining(['INV-001', 'cust-1', 'John Doe', 1500])
    );
  });

  it('also accepts snake_case invoice fields (dual-key mapping)', async () => {
    await DbServices.addInvoice({
      invoice_number: 'INV-002',
      customer_id: 'cust-2',
      customer_name: 'Jane Doe',
      total: 2000,
    });

    const args = mockDb.runAsync.mock.calls[0][1];
    expect(args[1]).toBe('INV-002');  // invoice_number
    expect(args[2]).toBe('cust-2');   // customer_id
    expect(args[3]).toBe('Jane Doe'); // customer_name
  });

  // ─── Add Payment ───────────────────────────────────────────────────────────

  it('inserts a payment with correct fields', async () => {
    await DbServices.addPayment({
      invoiceId: 'inv-x',
      customerId: 'cust-y',
      customerName: 'Alice',
      amount: 500,
      method: 'UPI',
      type: 'payment',
      date: '2024-03-01',
    });

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO payments'),
      expect.arrayContaining(['inv-x', 'cust-y', 'Alice', 500, 'UPI', 'payment', '2024-03-01'])
    );
  });

  it('defaults payment method to Cash if not provided', async () => {
    await DbServices.addPayment({
      customerId: 'c1',
      customerName: 'Bob',
      amount: 100,
    });
    const args = mockDb.runAsync.mock.calls[0][1];
    expect(args[5]).toBe('Cash'); // method
    expect(args[6]).toBe('payment'); // type
  });

  // ─── Add Sales Return ───────────────────────────────────────────────────────

  it('inserts a sales return with correct fields', async () => {
    await DbServices.addSalesReturn({
      returnNumber: 'RET-001',
      invoiceId: 'inv-100',
      customerId: 'cust-1',
      customerName: 'ReturnCo',
      reason: 'Damaged in Transit',
      total: 300,
    });

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sales_returns'),
      expect.arrayContaining(['RET-001', 'inv-100', 'cust-1', 'ReturnCo', 'Damaged in Transit', 300])
    );
  });

  it('inserts sales return line items when provided', async () => {
    await DbServices.addSalesReturn({
      returnNumber: 'RET-002',
      customerId: 'c1',
      customerName: 'C1',
      total: 200,
      items: [
        { item_id: 'itm-1', name: 'Widget', quantity: 2, rate: 100, total: 200 },
      ],
    });

    // Check that child item was inserted too
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sales_return_items'),
      expect.arrayContaining(['itm-1', 'Widget', 2, 100, 200])
    );
  });

  it('deletes sales_return_items BEFORE the parent sales_return', async () => {
    await DbServices.deleteSalesReturn('ret-001');

    const calls = mockDb.runAsync.mock.calls.map(c => c[0]);
    const itemsIdx  = calls.findIndex(q => q.includes('sales_return_items'));
    const returnIdx = calls.findIndex(q => q.includes('DELETE FROM sales_returns'));
    expect(itemsIdx).toBeGreaterThanOrEqual(0);
    expect(returnIdx).toBeGreaterThanOrEqual(0);
    expect(itemsIdx).toBeLessThan(returnIdx);
  });

  // ─── Update Item Quantity ───────────────────────────────────────────────────

  it('updates item quantity in DB', async () => {
    await DbServices.updateItemQuantity('item-abc', 42);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'UPDATE items SET quantity = ? WHERE id = ?',
      [42, 'item-abc']
    );
  });

  // ─── Dashboard Stats ────────────────────────────────────────────────────────

  it('getDashboardStats calls correct aggregate queries', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ count: 5, total: 10000 });

    const stats = await DbServices.getDashboardStats();

    expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('SELECT COUNT(*) as count FROM invoices')
    );
    // Should return structured object
    expect(stats).toHaveProperty('totalInvoices');
    expect(stats).toHaveProperty('totalRevenue');
    expect(stats).toHaveProperty('paidCount');
    expect(stats).toHaveProperty('pendingCount');
    expect(stats).toHaveProperty('overdueCount');
  });

  it('getDashboardStats returns zeros when DB is empty', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ count: 0, total: 0 });

    const stats = await DbServices.getDashboardStats();

    expect(stats.totalInvoices).toBe(0);
    expect(stats.totalRevenue).toBe(0);
  });

  // ─── Inquiry Management ───────────────────────────────────────────────────

  it('inserts an inquiry with correct fields', async () => {
    const inquiry = {
      customer_name: 'Lead User',
      contact: '9999999999',
      description: 'Interested in bulk order',
      status: 'Pending',
      date: '2024-05-01',
    };
    await DbServices.addInquiry(inquiry);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO inquiries'),
      expect.arrayContaining([inquiry.customer_name, inquiry.contact, inquiry.description, inquiry.status, inquiry.date])
    );
  });

  it('updates an existing inquiry', async () => {
    const inquiry = {
      id: 'inq-1',
      customer_name: 'Updated User',
      contact: '111',
      description: 'Updated desc',
      status: 'Closed',
      date: '2024-05-02',
    };
    await DbServices.updateInquiry(inquiry);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE inquiries SET'),
      expect.arrayContaining([inquiry.customer_name, inquiry.contact, inquiry.description, inquiry.status, inquiry.date, inquiry.id])
    );
  });

  it('deletes an inquiry', async () => {
    await DbServices.deleteInquiry('inq-1');

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'DELETE FROM inquiries WHERE id = ?',
      ['inq-1']
    );
  });
});
