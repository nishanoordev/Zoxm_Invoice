export const calculateCustomerBalances = (customerId, allInvoices, allPayments) => {
  const round2 = v => Math.round(v * 100) / 100;

  // 1. Split invoices: active vs returned/cancelled (for this customer)
  // Exclude estimates — only real invoices affect balances
  const customerAllInvoices = allInvoices.filter(
    inv => (inv.customerId === customerId || inv.customer_id === customerId) && !inv.isDeleted && (inv.type || 'invoice') !== 'estimate'
  );
  const returnedInvoiceIds = customerAllInvoices
    .filter(inv => inv.status === 'Returned' || inv.status === 'Cancelled')
    .map(inv => String(inv.id));

  // Active invoices only (Returned and Cancelled are excluded)
  const customerInvoices = customerAllInvoices
    .filter(inv => inv.status !== 'Returned' && inv.status !== 'Cancelled')
    .sort((a, b) => new Date(a.date || a.created_at || 0) - new Date(b.date || b.created_at || 0));

  const activeInvoiceIds = customerInvoices.map(inv => String(inv.id));

  const allCustomerPayments = allPayments.filter(
    p => p.customerId === customerId || p.customer_id === customerId
  );

  // ── Give Payment totals ──────────────────────────────────────────────────
  // Money given TO the customer (refund, advance credit, goodwill). These
  // reduce the customer's wallet balance just like an invoice would.
  const totalGiven = round2(
    allCustomerPayments
      .filter(p => p.type === 'give_payment' || p.paymentDirection === 'given')
      .reduce((sum, p) => sum + Math.abs(parseFloat(p.amount) || 0), 0)
  );

  // Payments made towards invoices that are now Returned (excluded from active pool)
  const returnedInvoicePaymentsAmount = allCustomerPayments
    .filter(p => p.type !== 'credit_note' && p.type !== 'give_payment' && returnedInvoiceIds.includes(String(p.invoiceId || p.invoice_id)))
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  // Raw refund credit = positive credit_note amounts + payments on returned invoices.
  // NOTE: dueReduced-only credit_notes (amount=0) are NOT included here — they are
  // already handled by the totalDueReduced → effectiveInvoiced path above, so adding
  // them here would double-count and push totalDue to zero incorrectly.
  const rawReturnCreditBalance = round2(
    allCustomerPayments
      .filter(p => p.type === 'credit_note' && (parseFloat(p.amount) || 0) > 0)
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    + returnedInvoicePaymentsAmount
  );

  // Consumed refund credit = negative credit_note entries
  const returnCreditConsumed = round2(
    allCustomerPayments
      .filter(p => p.type === 'credit_note' && (parseFloat(p.amount) || 0) < 0)
      .reduce((sum, p) => sum + Math.abs(parseFloat(p.amount) || 0), 0)
  );

  // Net remaining refund credit available to the customer
  const returnCreditBalance = round2(Math.max(0, rawReturnCreditBalance - returnCreditConsumed));

  // Active payments: unlinked OR linked to an active invoice
  // (credit_note, give_payment, and due_entry entries are handled separately)
  const customerPayments = allCustomerPayments.filter(p => {
    if (p.type === 'credit_note') return false;
    if (p.type === 'give_payment' || p.paymentDirection === 'given') return false;
    if (p.type === 'due_entry') return false;  // due entries are standalone receivables
    const linkedId = p.invoiceId || p.invoice_id;
    if (!linkedId) return true;
    if (returnedInvoiceIds.includes(String(linkedId))) return false;
    return activeInvoiceIds.includes(String(linkedId));
  });

  // ── Due Entry totals (standalone receivables, not tied to invoices) ──
  const totalDueEntries = round2(
    allCustomerPayments
      .filter(p => p.type === 'due_entry')
      .reduce((sum, p) => sum + Math.abs(parseFloat(p.amount) || 0), 0)
  );

  // 2. Global totals (active invoices + due entries)
  const totalInvoiced = round2(
    customerInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0)
    + totalDueEntries  // due entries increase what customer owes
  );
  const totalPaid     = round2(customerPayments.reduce((sum, p)   => sum + (parseFloat(p.amount) || 0), 0));

  // Global dueReduced from all credit notes
  const totalDueReduced = round2(
    allCustomerPayments
      .filter(p => p.type === 'credit_note' && (parseFloat(p.dueReduced || p.due_reduced) || 0) > 0)
      .reduce((sum, p) => sum + (parseFloat(p.dueReduced || p.due_reduced) || 0), 0)
  );

  const effectiveInvoiced = round2(Math.max(0, totalInvoiced - totalDueReduced));

  // totalGiven shifts money out (reduces credit or increases due)
  const netDueShift = round2(effectiveInvoiced + totalGiven - totalPaid);

  const rawDue    = round2(Math.max(0, netDueShift));
  const rawCredit = round2(Math.max(0, -netDueShift));

  // Apply the net return-credit pool to global due
  const totalDue      = round2(Math.max(0, rawDue - returnCreditBalance));
  const creditBalance = round2(rawCredit + Math.max(0, returnCreditBalance - rawDue));

  // 3. Invoice-level exact allocation
  const invoiceDueMap = {};

  // A. Apply strictly linked regular payments to each invoice
  //    Exclude credit_note entries — their effect is tracked via dueReduced (step B).
  customerInvoices.forEach(inv => {
    const linkedPaid = round2(
      customerPayments
        .filter(p =>
          String(p.invoiceId || p.invoice_id) === String(inv.id) &&
          p.type !== 'credit_note'
        )
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    );
    invoiceDueMap[inv.id] = round2(Math.max(0, (parseFloat(inv.total) || 0) - linkedPaid));
  });

  // B. Apply dueReduced from credit-note payments linked to each invoice.
  //    FIX: DB returns the column as `due_reduced` (snake_case), so we must
  //    check BOTH `p.dueReduced` (JS camelCase written on save) AND
  //    `p.due_reduced` (what SQLite returns on load). Without this check the
  //    invoice balance never dropped after a sales return.
  customerInvoices.forEach(inv => {
    const creditNoteDueReduced = round2(
      allCustomerPayments
        .filter(p =>
          p.type === 'credit_note' &&
          String(p.invoiceId || p.invoice_id) === String(inv.id) &&
          (parseFloat(p.dueReduced || p.due_reduced) || 0) > 0
        )
        .reduce((sum, p) => sum + (parseFloat(p.dueReduced || p.due_reduced) || 0), 0)
    );
    if (creditNoteDueReduced > 0) {
      invoiceDueMap[inv.id] = round2(Math.max(0, invoiceDueMap[inv.id] - creditNoteDueReduced));
    }
  });

  // C. Pool unlinked / excess regular payments
  let unlinkedCreditPool = round2(
    customerPayments
      .filter(p => !p.invoiceId && !p.invoice_id)
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  );

  // Collect excess from overpaid invoices
  customerInvoices.forEach(inv => {
    const invTotal  = parseFloat(inv.total) || 0;
    const linkedPaid = round2(
      customerPayments
        .filter(p => String(p.invoiceId || p.invoice_id) === String(inv.id))
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    );
    if (linkedPaid > invTotal) {
      unlinkedCreditPool = round2(unlinkedCreditPool + (linkedPaid - invTotal));
    }
  });

  // D. Pour unlinked credit over unpaid invoices (oldest first)
  if (unlinkedCreditPool > 0) {
    for (const inv of customerInvoices) {
      if (unlinkedCreditPool <= 0) break;
      if (invoiceDueMap[inv.id] > 0) {
        const cover = round2(Math.min(invoiceDueMap[inv.id], unlinkedCreditPool));
        invoiceDueMap[inv.id] = round2(invoiceDueMap[inv.id] - cover);
        unlinkedCreditPool    = round2(unlinkedCreditPool - cover);
      }
    }
  }

  // D2. Pour unlinked refund credit over unpaid invoices (oldest first)
  let remainingReturnCreditForMap = returnCreditBalance;
  if (remainingReturnCreditForMap > 0) {
    for (const inv of customerInvoices) {
      if (remainingReturnCreditForMap <= 0) break;
      if (invoiceDueMap[inv.id] > 0) {
        const cover = round2(Math.min(invoiceDueMap[inv.id], remainingReturnCreditForMap));
        invoiceDueMap[inv.id] = round2(invoiceDueMap[inv.id] - cover);
        remainingReturnCreditForMap = round2(remainingReturnCreditForMap - cover);
      }
    }
  }

  const advanceBalance = rawCredit;
  const refundBalance  = round2(Math.max(0, returnCreditBalance - rawDue));

  const netBalance = round2(creditBalance - totalDue);

  return {
    totalInvoiced: effectiveInvoiced,
    totalPaid,
    totalGiven,
    totalDue,
    creditBalance,
    returnCreditBalance,
    advanceBalance,
    refundBalance,
    netBalance,
    invoiceDueMap,
  };
};

export const calculateSupplierBalances = (supplierId, allPurchases, allSupplierPayments) => {
  const round2 = v => Math.round(v * 100) / 100;

  const supplierPurchases = allPurchases.filter(
    p => (p.supplierId === supplierId || p.supplier_id === supplierId) && !p.isDeleted
  );
  
  const supplierPaymentsList = allSupplierPayments.filter(
    p => p.supplierId === supplierId || p.supplier_id === supplierId
  );

  const totalPurchased = round2(
    supplierPurchases.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0)
  );

  const totalPaid = round2(
    supplierPaymentsList.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  );

  const net = round2(totalPurchased - totalPaid);

  return {
    totalPurchased,
    totalPaid,
    net
  };
};
