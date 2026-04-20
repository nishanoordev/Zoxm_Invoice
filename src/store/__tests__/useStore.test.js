import { renderHook, act } from '@testing-library/react-native';
import { useStore } from '../useStore';
import * as DbServices from '../../database/services';

// ─── Mock all DbServices ────────────────────────────────────────────────────
jest.mock('../../database/services', () => ({
  getInvoices:         jest.fn(() => []),
  getItems:            jest.fn(() => []),
  getCustomers:        jest.fn(() => []),
  getPayments:         jest.fn(() => []),
  getChallans:         jest.fn(() => []),
  getOrders:           jest.fn(() => []),
  getProfile:          jest.fn(() => ({})),
  getInvoiceItems:     jest.fn(),
  updateItemQuantity:  jest.fn(),
  deleteInvoice:       jest.fn(),
  recoverInvoice:      jest.fn(),
  loadDraft:           jest.fn(() => null),
  getHistory:          jest.fn(() => []),
  getSalesReturns:     jest.fn(() => []),
  getSalesReturnItems: jest.fn(() => []),
  getUsers:            jest.fn(() => []),
  addHistory:          jest.fn(),
  addPayment:          jest.fn(() => ({ id: 'pay-new' })),
  addCustomer:         jest.fn(c => ({ ...c, id: 'cust-new' })),
  addItem:             jest.fn(i => ({ ...i, id: 'item-new' })),
  updateItem:          jest.fn(),
  deleteItem:          jest.fn(),
  updateCustomer:      jest.fn(),
  deleteCustomer:      jest.fn(),
  hasCustomerDependencies: jest.fn(() => false),
  addOrder:            jest.fn(o => ({ ...o, id: 'order-new', order_number: 'ORD-001', items_json: '[]' })),
  deleteOrder:         jest.fn(),
  updateOrder:         jest.fn(),
  addChallan:          jest.fn(c => ({ ...c, id: 'challan-new' })),
  addSalesReturn:      jest.fn(sr => ({ ...sr, id: 'ret-new', return_number: 'RET-001' })),
  deleteSalesReturn:   jest.fn(),
  getSuppliers:        jest.fn(() => []),
  getPurchases:        jest.fn(() => []),
  getSupplierPayments: jest.fn(() => []),
  getInquiries:        jest.fn(() => []),
  addInquiry:          jest.fn(inq => ({ ...inq, id: 'inq-new' })),
  updateInquiry:       jest.fn(),
  deleteInquiry:       jest.fn(),
}));

// ─── Helper to get a fresh store hook ────────────────────────────────────────
function getStore() {
  return renderHook(() => useStore());
}

describe('useStore - Invoice Stock Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DbServices.getInvoices.mockResolvedValue([]);
    DbServices.getItems.mockResolvedValue([
      { id: 'item1', name: 'Product A', quantity: 10 },
    ]);
    DbServices.getPayments.mockResolvedValue([]);
  });

  it('restores stock when an invoice is moved to trash (softDelete)', async () => {
    const { result } = getStore();
    await act(async () => { await result.current.loadFromDb(); });
    expect(result.current.items[0].quantity).toBe(10);

    DbServices.getInvoiceItems.mockResolvedValue([
      { item_id: 'item1', quantity: 3 },
    ]);

    await act(async () => { await result.current.deleteInvoice('inv123'); });

    // 10 (original) + 3 (returned) = 13
    expect(DbServices.updateItemQuantity).toHaveBeenCalledWith('item1', 13);
  });

  it('deducts stock when an invoice is recovered from trash', async () => {
    DbServices.getItems.mockResolvedValue([
      { id: 'item1', name: 'Product A', quantity: 13 },
    ]);
    const { result } = getStore();
    await act(async () => { await result.current.loadFromDb(); });

    DbServices.getInvoiceItems.mockResolvedValue([
      { item_id: 'item1', quantity: 3 },
    ]);

    await act(async () => { await result.current.recoverInvoice('inv123'); });

    // 13 (in trash) - 3 (re-sold) = 10
    expect(DbServices.updateItemQuantity).toHaveBeenCalledWith('item1', 10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('useStore - Sales Return Stock Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DbServices.getInvoices.mockResolvedValue([]);
    DbServices.getItems.mockResolvedValue([
      { id: 'item1', name: 'Alpha', quantity: 5 },
    ]);
    DbServices.getPayments.mockResolvedValue([]);
    DbServices.getSalesReturns.mockResolvedValue([]);
  });

  it('restores stock when a sales return is created', async () => {
    const { result } = getStore();
    await act(async () => { await result.current.loadFromDb(); });

    await act(async () => {
      await result.current.addSalesReturn({
        customerId: 'c1',
        customerName: 'ACo',
        total: 200,
        date: '2024-03-01',
        items: [{ item_id: 'item1', name: 'Alpha', quantity: 2, rate: 100 }],
      });
    });

    // 5 (current) + 2 (returned) = 7
    expect(DbServices.updateItemQuantity).toHaveBeenCalledWith('item1', 7);
  });

  it('[BUG-FIX] stock does NOT go negative when a sales return is deleted', async () => {
    // The bug was: stock = (qty || 0) - returned_qty, with no Math.max(0) guard.
    // If stock was 0 (item sold out) and you delete the return, it went to -2.
    DbServices.getItems.mockResolvedValue([
      { id: 'item1', name: 'OOS Item', quantity: 0 }, // already at 0
    ]);
    DbServices.getSalesReturnItems.mockResolvedValue([
      { item_id: 'item1', quantity: 2 },
    ]);

    const { result } = getStore();
    await act(async () => { await result.current.loadFromDb(); });

    await act(async () => { await result.current.deleteSalesReturn('ret-001'); });

    const [, qty] = DbServices.updateItemQuantity.mock.calls[0];
    expect(qty).toBeGreaterThanOrEqual(0); // must never be negative
  });

  it('creates a Credit Note payment when a sales return is added', async () => {
    DbServices.getSalesReturnItems.mockResolvedValue([]);
    const { result } = getStore();
    await act(async () => { await result.current.loadFromDb(); });

    await act(async () => {
      await result.current.addSalesReturn({
        returnNumber: 'RET-999',
        customerId: 'c1',
        customerName: 'BuyerX',
        total: 450,
        date: '2024-04-01',
        reason: 'Overcharged',
        items: [],
      });
    });

    // Should record a 'Credit Note' payment entry
    expect(DbServices.addPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'Credit Note',
        amount: 450,
        customerId: 'c1',
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('useStore - Customer Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DbServices.getCustomers.mockResolvedValue([]);
    DbServices.getInvoices.mockResolvedValue([]);
    DbServices.getPayments.mockResolvedValue([]);
    DbServices.getItems.mockResolvedValue([]);
    DbServices.getSalesReturns.mockResolvedValue([]);
  });

  it('adds a customer and prepends to store', async () => {
    const { result } = getStore();
    await act(async () => { await result.current.loadFromDb(); });

    await act(async () => {
      await result.current.addCustomer({ name: 'New Corp', email: 'nc@test.com' });
    });

    expect(DbServices.addCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Corp' })
    );
    // Newly added customer should appear in store
    expect(result.current.customers.some(c => c.name === 'New Corp')).toBe(true);
  });

  it('throws when deleting a customer with dependencies', async () => {
    DbServices.hasCustomerDependencies.mockResolvedValueOnce(true);
    const { result } = getStore();

    await expect(
      act(async () => { await result.current.deleteCustomer('cust-with-invoices'); })
    ).rejects.toThrow();
  });

  it('deletes a free customer successfully', async () => {
    DbServices.hasCustomerDependencies.mockResolvedValueOnce(false);
    DbServices.getCustomers.mockResolvedValue([{ id: 'c1', name: 'ByeGuy', created_at: '' }]);

    const { result } = getStore();
    await act(async () => { await result.current.loadFromDb(); });
    expect(result.current.customers).toHaveLength(1);

    await act(async () => { await result.current.deleteCustomer('c1'); });

    expect(DbServices.deleteCustomer).toHaveBeenCalledWith('c1');
    expect(result.current.customers).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('useStore - Item Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DbServices.getItems.mockResolvedValue([]);
    DbServices.getInvoices.mockResolvedValue([]);
    DbServices.getPayments.mockResolvedValue([]);
    DbServices.getCustomers.mockResolvedValue([]);
    DbServices.getSalesReturns.mockResolvedValue([]);
  });

  it('adds an item with enriched fields (price, stock, lowStock)', async () => {
    DbServices.addItem.mockResolvedValue({
      id: 'item-new',
      name: 'Gadget',
      retail_price: 99.9,
      quantity: 8,
    });
    const { result } = getStore();
    await act(async () => { await result.current.loadFromDb(); });

    await act(async () => {
      await result.current.addItem({ name: 'Gadget', retail_price: 99.9, quantity: 8 });
    });

    const added = result.current.items.find(i => i.id === 'item-new');
    expect(added).toBeDefined();
    expect(added.price).toBe(99.9);
    expect(added.stock).toBe(8);
    expect(added.lowStock).toBe(false); // 8 >= 5 threshold
  });

  it('marks item as lowStock when quantity < 5', async () => {
    DbServices.addItem.mockResolvedValue({
      id: 'item-low',
      name: 'Rare Widget',
      retail_price: 50,
      quantity: 2,
    });
    const { result } = getStore();
    await act(async () => { await result.current.loadFromDb(); });

    await act(async () => {
      await result.current.addItem({ name: 'Rare Widget', retail_price: 50, quantity: 2 });
    });

    const added = result.current.items.find(i => i.id === 'item-low');
    expect(added.lowStock).toBe(true);
  });

  it('removes item from store after deletion', async () => {
    DbServices.getItems.mockResolvedValue([{ id: 'item-del', name: 'Delete Me', quantity: 3 }]);
    const { result } = getStore();
    await act(async () => { await result.current.loadFromDb(); });

    expect(result.current.items).toHaveLength(1);
    await act(async () => { await result.current.deleteItem('item-del'); });

    expect(result.current.items).toHaveLength(0);
    expect(DbServices.deleteItem).toHaveBeenCalledWith('item-del');
  });
});
