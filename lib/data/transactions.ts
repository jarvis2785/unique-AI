import type { DB } from './db';
import type { PaymentMethod, PriceType, Transaction, UserRole } from '@/lib/types/domain';

export class InsufficientStockError extends Error {
  constructor(public available: number) {
    super(`Only ${available} units available`);
    this.name = 'InsufficientStockError';
  }
}

export interface RecordSaleInput {
  productId: string;
  storeId: string;
  staffId: string;
  quantity: number;
  priceType: PriceType;
  unitPrice: number;
  customerName?: string | null;
  customerPhone?: string | null;
  paymentMethod?: PaymentMethod;
  notes?: string | null;
}

/** Inserts a 'sale' transaction; the DB trigger decrements inventory. Returns the resulting quantity at the store. */
export async function recordSale(supabase: DB, input: RecordSaleInput): Promise<number> {
  const { data: current, error: invError } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('product_id', input.productId)
    .eq('store_id', input.storeId)
    .maybeSingle();

  if (invError) throw invError;
  const available = current?.quantity ?? 0;
  if (available < input.quantity) {
    throw new InsufficientStockError(available);
  }

  const { error } = await supabase.from('transactions').insert({
    product_id: input.productId,
    store_id: input.storeId,
    user_id: input.staffId,
    type: 'sale',
    quantity: input.quantity,
    price_type: input.priceType,
    unit_price: input.unitPrice,
    customer_name: input.customerName?.trim() || null,
    customer_phone: input.customerPhone?.trim() || null,
    payment_method: input.paymentMethod ?? 'cash',
    notes: input.notes?.trim() || null,
  });

  if (error) throw error;

  const { data: after } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('product_id', input.productId)
    .eq('store_id', input.storeId)
    .maybeSingle();

  return after?.quantity ?? Math.max(available - input.quantity, 0);
}

export interface RecordPurchaseInput {
  productId: string;
  storeId: string;
  staffId: string;
  quantity: number;
}

/** Inserts a 'purchase' transaction (stock coming in — CSV import, restock). The DB trigger increments inventory. */
export async function recordPurchase(supabase: DB, input: RecordPurchaseInput): Promise<void> {
  const { error } = await supabase.from('transactions').insert({
    product_id: input.productId,
    store_id: input.storeId,
    user_id: input.staffId,
    type: 'purchase',
    quantity: input.quantity,
  });
  if (error) throw error;
}

export interface AdjustStockInput {
  productId: string;
  storeId: string;
  staffId: string;
  newQuantity: number;
}

/** Physical-count corrections. Inserts an 'adjustment' transaction carrying the signed delta to reach newQuantity. */
export async function adjustStock(supabase: DB, input: AdjustStockInput): Promise<void> {
  const { data: current, error: invError } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('product_id', input.productId)
    .eq('store_id', input.storeId)
    .maybeSingle();

  if (invError) throw invError;
  const delta = input.newQuantity - (current?.quantity ?? 0);
  if (delta === 0) return;

  const { error } = await supabase.from('transactions').insert({
    product_id: input.productId,
    store_id: input.storeId,
    user_id: input.staffId,
    type: 'adjustment',
    quantity: delta,
  });
  if (error) throw error;
}

export interface TransactionFilters {
  storeId?: string;
  staffId?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface RawTransactionRow {
  id: string;
  product_id: string;
  store_id: string;
  user_id: string;
  type: Transaction['type'];
  quantity: number;
  price_type: PriceType | null;
  unit_price: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  payment_method: PaymentMethod | null;
  notes: string | null;
  created_at: string;
  products: { model: string | null; sku_code: string } | null;
  stores: { name: string } | null;
  profiles: { full_name: string } | null;
}

/** No stored total column — `unitPrice * quantity` is computed below instead of read from the row. */
const TRANSACTION_SELECT =
  'id, product_id, store_id, user_id, type, quantity, price_type, unit_price, customer_name, customer_phone, payment_method, notes, created_at, products(model, sku_code), stores(name), profiles(full_name)';

export async function listTransactions(
  supabase: DB,
  viewer: { role: UserRole; userId: string },
  filters: TransactionFilters,
  limit = 100
): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select(TRANSACTION_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Staff only ever see their own transactions, regardless of requested filters.
  if (viewer.role === 'staff') {
    query = query.eq('user_id', viewer.userId);
  } else if (filters.staffId) {
    query = query.eq('user_id', filters.staffId);
  }

  if (filters.storeId) query = query.eq('store_id', filters.storeId);
  if (filters.productId) query = query.eq('product_id', filters.productId);
  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
  if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as unknown as RawTransactionRow[]).map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.products?.model?.trim() || row.products?.sku_code || 'Unknown product',
    storeId: row.store_id,
    storeName: row.stores?.name ?? 'Unknown store',
    staffId: row.user_id,
    staffName: row.profiles?.full_name ?? 'Unknown staff',
    type: row.type,
    quantity: row.quantity,
    priceType: row.price_type,
    unitPrice: row.unit_price,
    totalAmount: row.unit_price !== null ? row.unit_price * row.quantity : null,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    paymentMethod: row.payment_method,
    notes: row.notes,
    createdAt: row.created_at,
  }));
}
