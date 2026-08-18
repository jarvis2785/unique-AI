export const COLUMN_ALIASES = {
  sku: ['sku', 'sku_code', 'item_code', 'product_code', 'code', 'item no'],
  name: ['name', 'product_name', 'description', 'item_name', 'particulars'],
  brand: ['brand', 'company', 'manufacturer', 'make'],
  model: ['model', 'model_name', 'compatible', 'product'],
  category: ['category', 'type', 'product_type', 'group'],
  variant: ['variant', 'sub_type', 'material'],
  retail_price: ['retail_price', 'mrp', 'price', 'selling_price', 'rate'],
  wholesale_price: ['wholesale_price', 'wholesale', 'trade_price'],
  barcode: ['barcode', 'bar_code', 'ean', 'upc'],
  quantity: ['quantity', 'qty', 'stock', 'closing_qty', 'closing qty'],
} as const;

export type CanonicalColumn = keyof typeof COLUMN_ALIASES;

export const CANONICAL_COLUMNS = Object.keys(COLUMN_ALIASES) as CanonicalColumn[];

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, '_');
}

/** Best-effort auto-map: for each CSV header, guess which canonical field it represents. */
export function autoMapColumns(headers: string[]): Partial<Record<CanonicalColumn, string>> {
  const mapping: Partial<Record<CanonicalColumn, string>> = {};

  for (const header of headers) {
    const normalized = normalizeHeader(header);
    for (const canonical of CANONICAL_COLUMNS) {
      if (mapping[canonical]) continue;
      const aliases = COLUMN_ALIASES[canonical].map((a) => a.replace(/\s+/g, '_'));
      if (aliases.includes(normalized)) {
        mapping[canonical] = header;
      }
    }
  }

  return mapping;
}

/** Minimal RFC 4180 CSV parser: handles quoted fields, escaped quotes, and commas inside quotes. */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && next === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((f) => f.trim() !== '')) rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  return { headers: headers ?? [], rows: dataRows };
}

export interface MappedProductRow {
  skuCode: string;
  name: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  variant: string | null;
  barcode: string | null;
  retailPrice: number;
  wholesalePrice: number;
  quantity: number;
}

function cell(row: string[], headers: string[], mapping: Partial<Record<CanonicalColumn, string>>, key: CanonicalColumn): string {
  const header = mapping[key];
  if (!header) return '';
  const idx = headers.indexOf(header);
  if (idx === -1) return '';
  return (row[idx] ?? '').trim();
}

function parseNumber(value: string): number {
  const cleaned = value.replace(/[₹,\s]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapRow(
  row: string[],
  headers: string[],
  mapping: Partial<Record<CanonicalColumn, string>>
): MappedProductRow | null {
  const sku = cell(row, headers, mapping, 'sku');
  if (!sku) return null;

  const brand = cell(row, headers, mapping, 'brand') || null;
  const model = cell(row, headers, mapping, 'model') || null;
  const category = cell(row, headers, mapping, 'category') || null;
  const variant = cell(row, headers, mapping, 'variant') || null;
  const barcode = cell(row, headers, mapping, 'barcode') || null;
  const retailPrice = parseNumber(cell(row, headers, mapping, 'retail_price'));
  const wholesalePrice = parseNumber(cell(row, headers, mapping, 'wholesale_price')) || retailPrice;
  const quantity = Math.max(0, Math.round(parseNumber(cell(row, headers, mapping, 'quantity'))));

  const explicitName = cell(row, headers, mapping, 'name');
  const nameParts = [variant, brand, model].filter(Boolean);
  const name = explicitName || (nameParts.length > 0 ? nameParts.join(' ') : sku);

  return { skuCode: sku, name, brand, model, category, variant, barcode, retailPrice, wholesalePrice, quantity };
}
