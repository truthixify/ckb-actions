import { randomUUID } from 'node:crypto';

export interface Invoice {
  readonly id: string;
  readonly amount: number;
  readonly description: string;
  readonly createdAt: Date;
  paidAt?: Date;
  txHash?: string;
}

export interface NewInvoice {
  id?: string;
  amount: number;
  description: string;
}

export interface InvoiceStore {
  create(input: NewInvoice): Invoice;
  get(id: string): Invoice | undefined;
  markPaid(id: string, txHash: string): boolean;
}

/**
 * In-memory invoice store. Reference-only: real publishers persist invoices
 * to a database and look them up by id.
 */
export function createInvoiceStore(): InvoiceStore {
  const invoices = new Map<string, Invoice>();

  return {
    create({ id, amount, description }) {
      const invoice: Invoice = {
        id: id ?? randomUUID(),
        amount,
        description,
        createdAt: new Date(),
      };
      invoices.set(invoice.id, invoice);
      return invoice;
    },
    get(id) {
      return invoices.get(id);
    },
    markPaid(id, txHash) {
      const invoice = invoices.get(id);
      if (!invoice) return false;
      invoice.paidAt = new Date();
      invoice.txHash = txHash;
      return true;
    },
  };
}
