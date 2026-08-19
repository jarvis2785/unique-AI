import type { PaymentMethod, PriceType, StoreType, TransactionType, UserRole } from './database.types';

export type { UserRole, TransactionType, PriceType, StoreType, PaymentMethod };

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export interface AuthedUser {
  id: string;
  fullName: string;
  role: UserRole;
  storeId: string | null;
}

export interface Store {
  id: string;
  name: string;
  location: string | null;
  type: StoreType;
}

export interface StoreStock {
  storeId: string;
  storeName: string;
  quantity: number;
}

export interface SearchResultProduct {
  productId: string;
  skuCode: string;
  name: string;
  brand: string | null;
  category: string | null;
  variant: string | null;
  overallStatus: StockStatus;
}

export interface ProductDetail extends SearchResultProduct {
  barcode: string | null;
  /** Null until priced — CSV import / catalog seeding can land stock before prices. */
  retailPrice: number | null;
  wholesalePrice: number | null;
  lowStockThreshold: number;
  storeStock: StoreStock[];
  variants: string[];
}

export interface Transaction {
  id: string;
  productId: string;
  productName: string;
  storeId: string;
  storeName: string;
  staffId: string;
  staffName: string;
  type: TransactionType;
  quantity: number;
  priceType: PriceType | null;
  unitPrice: number | null;
  totalAmount: number | null;
  customerName: string | null;
  customerPhone: string | null;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  createdAt: string;
}

export interface DailyBriefUrgentItem {
  product: string;
  store: string;
  issue: string;
  action: string;
}

export interface DailyBriefDeadStockItem {
  product: string;
  store: string;
  days_idle: number;
  quantity: number;
  value_blocked: number;
}

export interface DailyBriefYesterday {
  total_sales_inr: number;
  total_units: number;
  top_seller: string;
  top_seller_units: number;
  best_store: string;
}

export interface DailyBriefRefillItem {
  product: string;
  store: string;
  current_stock: number;
  days_until_stockout: number;
  recommended_order: number;
}

export interface DailyBriefContent {
  urgent: DailyBriefUrgentItem[];
  dead_stock: DailyBriefDeadStockItem[];
  yesterday: DailyBriefYesterday;
  refill: DailyBriefRefillItem[];
  insight: string;
}

export interface DailyBrief {
  id: string;
  briefDate: string;
  content: DailyBriefContent;
  createdAt: string;
}

export function stockStatusForQuantity(quantity: number, threshold: number): StockStatus {
  if (quantity <= 0) return 'out-of-stock';
  if (quantity <= threshold) return 'low-stock';
  return 'in-stock';
}

export function overallStockStatus(storeStock: StoreStock[], threshold: number): StockStatus {
  const total = storeStock.reduce((sum, s) => sum + s.quantity, 0);
  return stockStatusForQuantity(total, threshold);
}
