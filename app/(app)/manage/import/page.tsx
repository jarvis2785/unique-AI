'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  autoMapColumns,
  CANONICAL_COLUMNS,
  mapRow,
  parseCsv,
  type CanonicalColumn,
  type MappedProductRow,
} from '@/lib/utils/csv';

const CANONICAL_LABELS: Record<CanonicalColumn, string> = {
  sku: 'SKU (required)',
  name: 'Product name',
  brand: 'Brand',
  model: 'Model',
  category: 'Category',
  variant: 'Variant',
  retail_price: 'Retail price',
  wholesale_price: 'Wholesale price',
  barcode: 'Barcode',
  quantity: 'Quantity',
};

const BATCH_SIZE = 100;

type Stage = 'upload' | 'preview' | 'importing' | 'done';

interface ImportSummary {
  imported: number;
  skipped: number;
  errors: string[];
  total: number;
}

export default function ImportPage() {
  const [stage, setStage] = useState<Stage>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Partial<Record<CanonicalColumn, string>>>({});
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const mappedRows = useMemo<MappedProductRow[]>(() => {
    return rows.map((row) => mapRow(row, headers, mapping)).filter((r): r is MappedProductRow => r !== null);
  }, [rows, headers, mapping]);

  async function handleFile(file: File) {
    setParseError(null);
    setFileName(file.name);
    const text = await file.text();
    const { headers: parsedHeaders, rows: parsedRows } = parseCsv(text);

    if (parsedHeaders.length === 0 || parsedRows.length === 0) {
      setParseError('Could not read any rows from this file.');
      return;
    }

    setHeaders(parsedHeaders);
    setRows(parsedRows);
    setMapping(autoMapColumns(parsedHeaders));
    setStage('preview');
  }

  async function runImport() {
    setStage('importing');
    setProgress(0);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const total = mappedRows.length;

    for (let i = 0; i < mappedRows.length; i += BATCH_SIZE) {
      const batch = mappedRows.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: batch }),
        });
        const data = await res.json();
        if (res.ok) {
          imported += data.imported ?? 0;
          skipped += data.skipped ?? 0;
          errors.push(...(data.errors ?? []));
        } else {
          skipped += batch.length;
          errors.push(data.error ?? 'Batch failed');
        }
      } catch {
        skipped += batch.length;
        errors.push('Network error during import batch.');
      }
      setProgress(Math.min(i + BATCH_SIZE, total));
    }

    setSummary({ imported, skipped, errors: errors.slice(0, 20), total });
    setStage('done');
  }

  function reset() {
    setStage('upload');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setSummary(null);
    setProgress(0);
  }

  return (
    <div>
      <div className="sticky top-0 z-20 border-b border-white/10 bg-background/95 px-5 pb-3 pt-safe-top backdrop-blur safe-top">
        <div className="flex items-center gap-3 pt-4">
          <Link href="/manage" className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted transition active:scale-[0.98] active:bg-elevated">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-page-title text-[20px]">Import CSV</h1>
        </div>
      </div>

      <div className="px-5 py-4">
        {stage === 'upload' && (
          <div>
            <EmptyState
              icon={Upload}
              title="Upload a Miracle export"
              description="CSV file with SKU, name, prices, and quantity columns. Column names don't need to match exactly."
            />
            <label className="mt-4 flex h-tap w-full cursor-pointer items-center justify-center rounded-xl bg-primary text-base font-semibold text-white active:scale-[0.98]">
              Choose File
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
            {parseError && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{parseError}</p>}
          </div>
        )}

        {stage === 'preview' && (
          <div>
            <p className="text-sm text-text-muted">
              <span className="font-medium text-text">{fileName}</span> — {rows.length} rows found
            </p>

            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-text-muted">Column mapping</p>
            <div className="space-y-2">
              {CANONICAL_COLUMNS.map((col) => (
                <div key={col} className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3.5 py-2.5">
                  <span className="text-sm text-text">{CANONICAL_LABELS[col]}</span>
                  <select
                    value={mapping[col] ?? ''}
                    onChange={(e) => setMapping((m) => ({ ...m, [col]: e.target.value || undefined }))}
                    className="h-9 rounded-lg border border-white/10 bg-background px-2 text-sm text-text"
                  >
                    <option value="">— none —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Preview (first 10 rows)
            </p>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-text-muted">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2">SKU</th>
                    <th className="whitespace-nowrap px-3 py-2">Name</th>
                    <th className="whitespace-nowrap px-3 py-2">Retail</th>
                    <th className="whitespace-nowrap px-3 py-2">Wholesale</th>
                    <th className="whitespace-nowrap px-3 py-2">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, i) => {
                    const mapped = mapRow(row, headers, mapping);
                    return (
                      <tr key={i} className="border-t border-white/10">
                        <td className="whitespace-nowrap px-3 py-2 text-text">{mapped?.skuCode ?? '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-text">{mapped?.name ?? '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-text">{mapped?.retailPrice ?? '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-text">{mapped?.wholesalePrice ?? '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-text">{mapped?.quantity ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-text-muted">
              {mappedRows.length} of {rows.length} rows have a SKU and can be imported. Quantities import into the
              Wholesale store.
            </p>

            <div className="mt-4 flex gap-2">
              <button onClick={reset} className="h-tap flex-1 rounded-xl border border-white/10 text-sm font-semibold text-text">
                Cancel
              </button>
              <button
                onClick={runImport}
                disabled={mappedRows.length === 0}
                className="h-tap flex-1 rounded-xl bg-primary text-sm font-semibold text-white disabled:opacity-60"
              >
                Import {mappedRows.length} products
              </button>
            </div>
          </div>
        )}

        {stage === 'importing' && (
          <div className="flex flex-col items-center gap-4 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-text-muted">
              Importing {progress} of {mappedRows.length}…
            </p>
            <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-elevated">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(progress / Math.max(mappedRows.length, 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {stage === 'done' && summary && (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <p className="mt-3 text-lg font-bold text-text">Import complete</p>
            <p className="mt-1 text-sm text-text-muted">
              {summary.imported} imported, {summary.skipped} skipped of {summary.total}
            </p>
            {summary.errors.length > 0 && (
              <div className="mx-auto mt-4 max-w-sm rounded-lg bg-danger/10 px-3.5 py-3 text-left text-xs text-danger">
                {summary.errors.map((e, i) => (
                  <p key={i} className="truncate">
                    {e}
                  </p>
                ))}
              </div>
            )}
            <button onClick={reset} className="mt-5 h-tap rounded-xl bg-primary px-6 text-sm font-semibold text-white">
              Import another file
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
