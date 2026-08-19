/**
 * `stores`, `products`, `profiles`, `inventory`, `transactions`,
 * `daily_briefs`, `stock_by_store`, and `low_stock_alerts` are all CONFIRMED
 * against the live project (jctjxtamsmtpdctsmrkp) — `stores`/`products`/the
 * two views by reading real rows over the anon key; `profiles` by creating
 * the real owner account through the admin API and reading the row back;
 * `inventory`/`transactions`/`daily_briefs` were empty but PostgREST still
 * names the exact missing column when a `select` references one, so a
 * one-column-at-a-time probe nailed those down without needing real rows.
 * Only `dead_stock` and `sales_velocity` remain unconfirmed (empty views
 * with no data to probe against yet, since no sales exist). See
 * SCHEMA_ASSUMPTIONS.md for what's still open, most importantly the
 * transactions -> inventory trigger's *behavior* (column names are known;
 * whether it decrements correctly on a real sale hasn't been tested).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'owner' | 'manager' | 'staff';
export type TransactionType = 'sale' | 'purchase' | 'adjustment';
export type PriceType = 'retail' | 'wholesale';
export type StoreType = 'retail' | 'wholesale' | 'both';
export type StockStatusValue = 'in_stock' | 'low_stock' | 'out_of_stock';
export type PaymentMethod = 'cash' | 'upi' | 'card';

/**
 * postgrest-js requires each Table/View to declare its FK relationships so
 * `.select('a, b(c)')` embeds can be type-checked. Real FK names for the
 * still-inferred tables aren't known yet, so those declare an empty tuple;
 * embedded selects in lib/data/*.ts are cast through `unknown` for that
 * reason and re-validated against explicit Raw*Row interfaces instead.
 */

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string;
          name: string;
          location: string | null;
          type: StoreType;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location?: string | null;
          type?: StoreType;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['stores']['Insert']>;
        Relationships: [];
      };
      /**
       * Confirmed by creating the real owner account through the admin API
       * and reading back the inserted row. No `email` column — login is
       * name + PIN only, and the PIN lives solely as the Supabase Auth
       * password on a synthetic `<uuid>@staff.unique.internal` address that
       * profiles never stores.
       */
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          store_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role: UserRole;
          store_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          sku_code: string;
          brand: string | null;
          model: string | null;
          category: string | null;
          variant: string | null;
          color: string | null;
          description: string | null;
          retail_price: number | null;
          wholesale_price: number | null;
          barcode: string | null;
          image_url: string | null;
          low_stock_threshold: number;
          is_active: boolean;
          search_vector: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku_code: string;
          brand?: string | null;
          model?: string | null;
          category?: string | null;
          variant?: string | null;
          color?: string | null;
          description?: string | null;
          retail_price?: number | null;
          wholesale_price?: number | null;
          barcode?: string | null;
          image_url?: string | null;
          low_stock_threshold?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
        Relationships: [];
      };
      /** Confirmed by probing (empty table; see header comment). */
      inventory: {
        Row: {
          id: string;
          product_id: string;
          store_id: string;
          quantity: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          store_id: string;
          quantity?: number;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['inventory']['Insert']>;
        Relationships: [];
      };
      /**
       * Confirmed by probing (empty table, but PostgREST names the exact
       * missing column when a select references one, so this needed no
       * actual rows to verify). Staff reference is `user_id`, not
       * `staff_id`, and there is no stored total — `unit_price * quantity`
       * is computed in app code. `customer_name`, `customer_phone`,
       * `payment_method`, and `notes` are optional point-of-sale metadata
       * added for the Make Purchase modal — apply the migration in
       * SCHEMA_ASSUMPTIONS.md before relying on them.
       */
      transactions: {
        Row: {
          id: string;
          product_id: string;
          store_id: string;
          user_id: string;
          type: TransactionType;
          quantity: number;
          price_type: PriceType | null;
          unit_price: number | null;
          customer_name: string | null;
          customer_phone: string | null;
          payment_method: PaymentMethod | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          store_id: string;
          user_id: string;
          type: TransactionType;
          quantity: number;
          price_type?: PriceType | null;
          unit_price?: number | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          payment_method?: PaymentMethod | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
        Relationships: [];
      };
      /** Confirmed by probing (same method as transactions). Timestamp column is `generated_at`, not `created_at`. */
      daily_briefs: {
        Row: {
          id: string;
          brief_date: string;
          content: Json;
          generated_at: string;
        };
        Insert: {
          id?: string;
          brief_date: string;
          content: Json;
          generated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['daily_briefs']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      /** Confirmed. One row per product — pivoted, not one row per (product, store). */
      stock_by_store: {
        Row: {
          product_id: string;
          sku_code: string;
          brand: string | null;
          model: string | null;
          category: string | null;
          variant: string | null;
          color: string | null;
          retail_price: number | null;
          wholesale_price: number | null;
          low_stock_threshold: number;
          barcode: string | null;
          image_url: string | null;
          stock_retail: number | null;
          stock_wholesale: number | null;
          stock_shinai: number | null;
          stock_total: number;
          stock_status: StockStatusValue;
        };
        Relationships: [];
      };
      /** Confirmed. Keyed by store_name, not store_id. */
      low_stock_alerts: {
        Row: {
          product_id: string;
          sku_code: string;
          brand: string | null;
          model: string | null;
          category: string | null;
          variant: string | null;
          color: string | null;
          store_name: string;
          current_stock: number;
          low_stock_threshold: number;
          last_movement_at: string | null;
        };
        Relationships: [];
      };
      /** Inferred (empty until transactions exist) — assumed to follow low_stock_alerts' store_name/current_stock naming. */
      dead_stock: {
        Row: {
          product_id: string;
          sku_code: string;
          brand: string | null;
          model: string | null;
          category: string | null;
          variant: string | null;
          store_name: string;
          current_stock: number;
          days_idle: number;
          value_blocked: number;
        };
        Relationships: [];
      };
      /** Inferred (empty until transactions exist). */
      sales_velocity: {
        Row: {
          product_id: string;
          sku_code: string;
          brand: string | null;
          model: string | null;
          category: string | null;
          variant: string | null;
          store_name: string;
          units_sold_7d: number;
          current_stock: number;
          days_until_stockout: number | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
