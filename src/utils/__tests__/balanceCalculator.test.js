import { calculateCustomerBalances } from '../balanceCalculator';

describe('Balance Calculator Utility', () => {
  const dummyCustomerId = 1;

  // ─── Basic sanity tests ──────────────────────────────────────────────────────

  it('calculates correct dues for fresh unpaid invoices', () => {
    const invoices = [
      { id: 101, customerId: 1, total: 1000, status: 'Unpaid', isDeleted: false },
      { id: 102, customerId: 1, total: 500,  status: 'Unpaid', isDeleted: false },
    ];
    const result = calculateCustomerBalances(dummyCustomerId, invoices, []);

    expect(result.totalInvoiced).toBe(1500);
    expect(result.totalPaid).toBe(0);
    expect(result.totalDue).toBe(1500);
    expect(result.creditBalance).toBe(0);
  });

  it('subtracts payments properly to find correct pending balance', () => {
    const invoices = [
      { id: 101, customerId: 1, total: 2000, status: 'Partial', isDeleted: false },
    ];
    const payments = [
      { id: 1, invoiceId: 101, amount: 500, customerId: 1 },
    ];

    const result = calculateCustomerBalances(dummyCustomerId, invoices, payments);

    expect(result.totalInvoiced).toBe(2000);
    expect(result.totalPaid).toBe(500);
    expect(result.totalDue).toBe(1500);
  });

  it('returns zero instead of negative totalDue', () => {
    const invoices = [
      { id: 101, customerId: 1, total: 100, isDeleted: false },
    ];
    const payments = [
      { id: 1, amount: 200, customerId: 1 }, // overpayment
    ];

    const result = calculateCustomerBalances(dummyCustomerId, invoices, payments);
    expect(result.totalDue).toBe(0); // must never go negative
    expect(result.creditBalance).toBe(100);
  });

  // ─── Soft-delete handling ────────────────────────────────────────────────────

  it('ignores soft-deleted (Trash) invoices', () => {
    const invoices = [
      { id: 101, customerId: 1, total: 5000, status: 'Unpaid', isDeleted: true  }, // Deleted
      { id: 102, customerId: 1, total: 1000, status: 'Unpaid', isDeleted: false }, // Active
    ];

    const result = calculateCustomerBalances(dummyCustomerId, invoices, []);

    expect(result.totalInvoiced).toBe(1000); // only the active invoice counts
    expect(result.totalDue).toBe(1000);
  });

  // ─── Unlinked payments ───────────────────────────────────────────────────────

  it('correctly applies unlinked payments to oldest outstanding invoices', () => {
    const invoices = [
      { id: 101, customerId: 1, total: 1000, date: '2024-01-01', isDeleted: false },
      { id: 102, customerId: 1, total: 500,  date: '2024-02-01', isDeleted: false },
    ];
    // Unlinked payment of 1200 (no invoiceId)
    const payments = [
      { id: 1, amount: 1200, customerId: 1 },
    ];

    const result = calculateCustomerBalances(dummyCustomerId, invoices, payments);

    expect(result.totalInvoiced).toBe(1500);
    expect(result.totalPaid).toBe(1200);
    expect(result.totalDue).toBe(300);
    expect(result.invoiceDueMap[101]).toBe(0);    // Fully covered (1000)
    expect(result.invoiceDueMap[102]).toBe(300);  // 500 - 200 remaining = 300
  });

  // ─── BUG FIX: snake_case invoice_id payments ─────────────────────────────────

  it('[BUG-FIX] treats snake_case invoice_id payments as LINKED (not unlinked)', () => {
    // Payments from SQLite come with `invoice_id` (snake_case), not `invoiceId`.
    // Before the fix, the filter only checked `p.invoiceId`, so DB-raw payments
    // were always treated as unlinked, inflating totalDue and creditPool.
    const invoices = [
      { id: 'inv-1', customerId: 1, total: 1000, date: '2024-01-01', isDeleted: false },
    ];
    const payments = [
      // DB-raw format: snake_case keys
      { id: 'p-1', invoice_id: 'inv-1', customer_id: 1, amount: 600 },
    ];

    const result = calculateCustomerBalances(dummyCustomerId, invoices, payments);

    expect(result.totalPaid).toBe(600);
    expect(result.totalDue).toBe(400); // 1000 - 600 = 400
    // Must NOT treat the 600 payment as unlinked credit
    expect(result.creditBalance).toBe(0);
    expect(result.invoiceDueMap['inv-1']).toBe(400);
  });

  it('[BUG-FIX] unlinked pool is NOT inflated by snake_case-linked payments', () => {
    // If a fully-paid invoice's payment (via invoice_id) was wrongly pooled as
    // unlinked, it would cascade and zero-out an unrelated invoice's balance.
    const invoices = [
      { id: 'inv-1', customerId: 1, total: 500, date: '2024-01-01', isDeleted: false },
      { id: 'inv-2', customerId: 1, total: 300, date: '2024-02-01', isDeleted: false },
    ];
    const payments = [
      { id: 'p-1', invoice_id: 'inv-1', customer_id: 1, amount: 500 }, // pays inv-1 fully
    ];

    const result = calculateCustomerBalances(dummyCustomerId, invoices, payments);

    expect(result.invoiceDueMap['inv-1']).toBe(0);   // fully paid
    expect(result.invoiceDueMap['inv-2']).toBe(300); // unaffected
    expect(result.totalDue).toBe(300);
  });

  // ─── Credit Notes / Sales Returns ────────────────────────────────────────────

  it('calculates credit balance when customer overpays', () => {
    const invoices = [
      { id: 101, customerId: 1, total: 500, isDeleted: false },
    ];
    const payments = [
      { id: 1, amount: 800, customerId: 1 },
    ];

    const result = calculateCustomerBalances(dummyCustomerId, invoices, payments);

    expect(result.totalDue).toBe(0);
    expect(result.creditBalance).toBe(300);
    expect(result.invoiceDueMap[101]).toBe(0);
  });

  it('correctly handles Credit Notes from sales returns', () => {
    const invoices = [
      { id: 101, customerId: 1, total: 1000, isDeleted: false },
    ];
    const payments = [
      { id: 1, amount: 800,  customerId: 1 },                          // partial cash payment
      { id: 2, amount: 500,  customerId: 1, method: 'Credit Note' },   // return credit
    ];

    const result = calculateCustomerBalances(dummyCustomerId, invoices, payments);

    // 1000 billed - (800 + 500) = -300 → shows as credit
    expect(result.totalDue).toBe(0);
    expect(result.creditBalance).toBe(300);
  });

  // ─── Manual Balance Adjustments ──────────────────────────────────────────────

  it('correctly handles manual balance adjustments', () => {
    const invoices = [
      { id: 101, customerId: 1, total: 2000, isDeleted: false },
    ];
    // Adjustment payment of 1000 (current 2000 → target 1000)
    const payments = [
      { id: 1, amount: 1000, customerId: 1, method: 'Adjustment' },
    ];

    const result = calculateCustomerBalances(dummyCustomerId, invoices, payments);

    expect(result.totalDue).toBe(1000);
    expect(result.totalPaid).toBe(1000);
  });

  // ─── Edge Cases ──────────────────────────────────────────────────────────────

  it('returns zeros for a customer with no data', () => {
    const result = calculateCustomerBalances(999, [], []);
    expect(result.totalInvoiced).toBe(0);
    expect(result.totalPaid).toBe(0);
    expect(result.totalDue).toBe(0);
    expect(result.creditBalance).toBe(0);
  });

  it('does not include other customers data', () => {
    const invoices = [
      { id: 201, customerId: 2, total: 9999, isDeleted: false }, // Different customer
    ];
    const payments = [
      { id: 1, amount: 5000, customerId: 2 }, // Different customer
    ];

    const result = calculateCustomerBalances(dummyCustomerId, invoices, payments);
    expect(result.totalInvoiced).toBe(0);
    expect(result.totalPaid).toBe(0);
  });

  it('handles completely paid invoice (totalDue=0 forces all invoiceDueMap to 0)', () => {
    const invoices = [
      { id: 101, customerId: 1, total: 1000, date: '2024-01-01', isDeleted: false },
      { id: 102, customerId: 1, total: 500,  date: '2024-02-01', isDeleted: false },
    ];
    // Total payment exactly covers both invoices
    const payments = [
      { id: 1, invoiceId: 101, amount: 1000, customerId: 1 },
      { id: 2, invoiceId: 102, amount: 500,  customerId: 1 },
    ];

    const result = calculateCustomerBalances(dummyCustomerId, invoices, payments);
    expect(result.totalDue).toBe(0);
    expect(result.invoiceDueMap[101]).toBe(0);
    expect(result.invoiceDueMap[102]).toBe(0);
  });
});

// ─── Give Payment (givePay) feature tests ────────────────────────────────────

describe('Give Payment — calculateCustomerBalances', () => {
  const CID = 1;

  it('exposes totalGiven in the return object', () => {
    const invoices = [];
    const payments = [
      { id: 'gp1', customerId: CID, amount: 200, type: 'give_payment', paymentDirection: 'given' },
    ];
    const result = calculateCustomerBalances(CID, invoices, payments);
    expect(result.totalGiven).toBe(200);
  });

  it('totalGiven is 0 when there are no give_payment entries', () => {
    const invoices = [{ id: 'inv1', customerId: CID, total: 500, isDeleted: false }];
    const payments = [{ id: 'p1', invoiceId: 'inv1', customerId: CID, amount: 300, type: 'payment' }];
    const result = calculateCustomerBalances(CID, invoices, payments);
    expect(result.totalGiven).toBe(0);
  });

  it('give_payment reduces advance credit', () => {
    // Customer paid ₹500, invoiced ₹0 so they have ₹500 credit
    // Then ₹200 give_payment → credit should drop to ₹300
    const invoices = [];
    const payments = [
      { id: 'p1', customerId: CID, amount: 500, type: 'payment' },
      { id: 'gp1', customerId: CID, amount: 200, type: 'give_payment', paymentDirection: 'given' },
    ];
    const result = calculateCustomerBalances(CID, invoices, payments);
    // adjustedPaid = 500 - 200 = 300; effectiveInvoiced = 0; rawCredit = 300
    expect(result.creditBalance).toBe(300);
    expect(result.totalDue).toBe(0);
    expect(result.totalGiven).toBe(200);
  });

  it('give_payment increases totalDue when customer has outstanding invoices', () => {
    // Invoice ₹1000, no regular payments, give_payment ₹200
    // → customer still owes ₹1000 invoice + ₹200 given = effectively ₹1000 due on invoices
    // adjustedPaid = 0 - 200 = max(0, -200) = 0; rawDue = 1000
    const invoices = [{ id: 'inv1', customerId: CID, total: 1000, isDeleted: false }];
    const payments = [
      { id: 'gp1', customerId: CID, amount: 200, type: 'give_payment', paymentDirection: 'given' },
    ];
    const result = calculateCustomerBalances(CID, invoices, payments);
    expect(result.totalDue).toBe(1000); // Invoice is unpaid; give_payment doesn't change invoice due
    expect(result.totalGiven).toBe(200);
    expect(result.creditBalance).toBe(0);
  });

  it('give_payment and receive_payment together: net credit is correct', () => {
    // Received ₹600, invoiced ₹0, gave ₹150  → net credit = 600 - 150 = 450
    const invoices = [];
    const payments = [
      { id: 'p1', customerId: CID, amount: 600, type: 'payment' },
      { id: 'gp1', customerId: CID, amount: 150, type: 'give_payment', paymentDirection: 'given' },
    ];
    const result = calculateCustomerBalances(CID, invoices, payments);
    expect(result.totalGiven).toBe(150);
    expect(result.totalPaid).toBe(600); // totalPaid is pre-adjustment received amount
    expect(result.creditBalance).toBe(450);
  });

  it('give_payment using paymentDirection field instead of type', () => {
    // Verify detection works via paymentDirection='given' even without type='give_payment'
    const invoices = [];
    const payments = [
      { id: 'p1', customerId: CID, amount: 300, type: 'payment' },
      { id: 'gp1', customerId: CID, amount: 100, paymentDirection: 'given' },
    ];
    const result = calculateCustomerBalances(CID, invoices, payments);
    expect(result.totalGiven).toBe(100);
    expect(result.creditBalance).toBe(200);
  });

  it('walletBalance formula: received - given - invoiced, no negative', () => {
    // Received ₹200, gave ₹300 (more than received), invoiced ₹0
    // adjustedPaid = max(0, 200 - 300) = 0; due = 0; credit = 0
    const invoices = [];
    const payments = [
      { id: 'p1', customerId: CID, amount: 200, type: 'payment' },
      { id: 'gp1', customerId: CID, amount: 300, type: 'give_payment', paymentDirection: 'given' },
    ];
    const result = calculateCustomerBalances(CID, invoices, payments);
    expect(result.creditBalance).toBe(0);
    expect(result.totalDue).toBe(0);
    expect(result.totalGiven).toBe(300);
  });
});

// ─── netBalance (unified wallet) tests ───────────────────────────────────────

describe('netBalance — unified wallet field', () => {
  const CID = 1;

  it('netBalance is negative when customer owes money', () => {
    const invoices = [{ id: 'inv1', customerId: CID, total: 1000, isDeleted: false }];
    const result = calculateCustomerBalances(CID, invoices, []);
    expect(result.netBalance).toBe(-1000);
  });

  it('netBalance is positive when customer has credit', () => {
    const invoices = [{ id: 'inv1', customerId: CID, total: 500, isDeleted: false }];
    const payments = [{ id: 'p1', customerId: CID, amount: 800 }];
    const result = calculateCustomerBalances(CID, invoices, payments);
    expect(result.netBalance).toBe(300);
  });

  it('netBalance is zero when fully settled', () => {
    const invoices = [{ id: 'inv1', customerId: CID, total: 500, isDeleted: false }];
    const payments = [{ id: 'p1', invoiceId: 'inv1', customerId: CID, amount: 500 }];
    const result = calculateCustomerBalances(CID, invoices, payments);
    expect(result.netBalance).toBe(0);
  });

  it('netBalance accounts for give_payment', () => {
    const invoices = [];
    const payments = [
      { id: 'p1', customerId: CID, amount: 600, type: 'payment' },
      { id: 'gp1', customerId: CID, amount: 150, type: 'give_payment', paymentDirection: 'given' },
    ];
    const result = calculateCustomerBalances(CID, invoices, payments);
    expect(result.netBalance).toBe(450);
  });

  it('netBalance equals creditBalance - totalDue', () => {
    const invoices = [{ id: 'inv1', customerId: CID, total: 1000, isDeleted: false }];
    const payments = [{ id: 'p1', customerId: CID, amount: 400 }];
    const result = calculateCustomerBalances(CID, invoices, payments);
    expect(result.netBalance).toBe(result.creditBalance - result.totalDue);
  });

  it('netBalance is zero for empty customer', () => {
    const result = calculateCustomerBalances(999, [], []);
    expect(result.netBalance).toBe(0);
  });
});
