/**
 * supplierBalanceCalculator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure-function utilities for computing supplier payable balances.
 * Mirrors the pattern of src/utils/balanceCalculator.js used for customers.
 *
 * Terminology:
 *   totalPurchased  — sum of all non-deleted purchase totals from this supplier
 *   totalPaid       — sum of all supplier_payments made to this supplier
 *   balance         — amount still owed = totalPurchased - totalPaid
 *   overdraft       — negative balance (rare: over-payment / credit note)
 */

/**
 * Computes the payable balance for a single supplier.
 *
 * @param {string}   supplierId
 * @param {object[]} purchases        — from useStore state (already normalized)
 * @param {object[]} supplierPayments — from useStore state (already normalized)
 * @returns {{
 *   totalPurchased:  number,
 *   totalPaid:       number,
 *   balance:         number,   // positive = still owe supplier
 *   paidCount:       number,
 *   partialCount:    number,
 *   unpaidCount:     number,
 *   lastPurchaseDate: string|null,
 *   lastPaymentDate:  string|null,
 * }}
 */
export function calcSupplierBalance(supplierId, purchases = [], supplierPayments = []) {
  const sid = String(supplierId);

  const supplierPurchases = purchases.filter(
    p => String(p.supplierId || p.supplier_id) === sid && !p.isDeleted && p.is_deleted !== 1
  );

  const supplierPaymentsList = supplierPayments.filter(
    p => String(p.supplierId || p.supplier_id) === sid
  );

  const totalPurchased = supplierPurchases.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
  const totalPaid      = supplierPaymentsList.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const paidCount    = supplierPurchases.filter(p => p.status === 'Paid').length;
  const partialCount = supplierPurchases.filter(p => p.status === 'Partial').length;
  const unpaidCount  = supplierPurchases.filter(p => p.status === 'Unpaid').length;

  const lastPurchaseDate = supplierPurchases.length > 0
    ? supplierPurchases.reduce((latest, p) => (p.date > latest ? p.date : latest), '')
    : null;

  const lastPaymentDate = supplierPaymentsList.length > 0
    ? supplierPaymentsList.reduce((latest, p) => (p.date > latest ? p.date : latest), '')
    : null;

  return {
    totalPurchased:  Math.round(totalPurchased * 100) / 100,
    totalPaid:       Math.round(totalPaid      * 100) / 100,
    balance:         Math.round((totalPurchased - totalPaid) * 100) / 100,
    paidCount,
    partialCount,
    unpaidCount,
    lastPurchaseDate,
    lastPaymentDate,
  };
}

/**
 * Computes the payable status for a single purchase based on payments recorded
 * against it specifically (not aggregate supplier-level payments).
 *
 * Used by addSupplierPayment to auto-update purchase.status.
 *
 * @param {string}   purchaseId
 * @param {number}   purchaseTotal
 * @param {object[]} supplierPayments — all supplier_payments (filtered internally)
 * @returns {'Paid' | 'Partial' | 'Unpaid'}
 */
export function calcPurchasePaymentStatus(purchaseId, purchaseTotal, supplierPayments = []) {
  const pid = String(purchaseId);
  const totalPaid = supplierPayments
    .filter(p => String(p.purchaseId || p.purchase_id) === pid)
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  if (totalPaid <= 0)                       return 'Unpaid';
  if (totalPaid >= (parseFloat(purchaseTotal) || 0)) return 'Paid';
  return 'Partial';
}

/**
 * Aggregate supplier balance stats across ALL suppliers.
 * Useful for dashboard / reports.
 *
 * @param {object[]} suppliers
 * @param {object[]} purchases
 * @param {object[]} supplierPayments
 * @returns {{
 *   totalPayable:    number,  — sum of all outstanding balances
 *   totalPurchased:  number,
 *   totalPaid:       number,
 *   supplierCount:   number,
 *   pendingSupplierCount: number,  — suppliers with balance > 0
 * }}
 */
export function calcAllSupplierBalances(suppliers = [], purchases = [], supplierPayments = []) {
  let totalPayable   = 0;
  let totalPurchased = 0;
  let totalPaid      = 0;
  let pendingCount   = 0;

  for (const s of suppliers) {
    const b = calcSupplierBalance(s.id, purchases, supplierPayments);
    totalPurchased += b.totalPurchased;
    totalPaid      += b.totalPaid;
    totalPayable   += b.balance;
    if (b.balance > 0) pendingCount++;
  }

  return {
    totalPayable:         Math.round(totalPayable   * 100) / 100,
    totalPurchased:       Math.round(totalPurchased * 100) / 100,
    totalPaid:            Math.round(totalPaid      * 100) / 100,
    supplierCount:        suppliers.length,
    pendingSupplierCount: pendingCount,
  };
}
