'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, LogOut, PackageSearch } from 'lucide-react';
import { SearchBar } from '@/components/search/SearchBar';
import { BarcodeScanner } from '@/components/search/BarcodeScanner';
import { ProductCard } from '@/components/search/ProductCard';
import { ProductDetailPanel } from '@/components/search/ProductDetailPanel';
import { MakePurchaseModal } from '@/components/search/MakePurchaseModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SkeletonCardList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/hooks/useAuth';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useRecentSearches } from '@/lib/hooks/useRecentSearches';
import type { ProductDetail, SearchResultProduct } from '@/lib/types/domain';

export default function SearchPage() {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const { recent, addRecent } = useRecentSearches();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [purchaseProduct, setPurchaseProduct] = useState<ProductDetail | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 150);
  const requestIdRef = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      setSearching(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setSearching(true);
    addRecent(trimmed);

    // Hard cap: never let the spinner show for more than 200ms, regardless
    // of how long either fetch below takes — whatever's on screen (even
    // still-empty) is shown instead of blocking further.
    const spinnerCap = setTimeout(() => {
      if (requestIdRef.current === requestId) setSearching(false);
    }, 200);

    // Instant path: DB-only, no Claude round trip. This is what the user
    // actually sees — resolves in well under 200ms on this catalog size.
    fetch(`/api/search?q=${encodeURIComponent(trimmed)}&fast=1`)
      .then((res) => res.json())
      .then((data) => {
        if (requestIdRef.current !== requestId) return;
        clearTimeout(spinnerCap);
        setResults(data.results ?? []);
        setHasSearched(true);
        setSearching(false);
      })
      .catch(() => {
        if (requestIdRef.current === requestId) {
          clearTimeout(spinnerCap);
          setHasSearched(true);
          setSearching(false);
        }
      });

    // Background upgrade: Claude-assisted shorthand expansion ("ss a54" ->
    // "Samsung A54"). Silently replaces results if it finds a better match —
    // never shown as a loading state, never blocks the instant path above.
    fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
      .then((res) => res.json())
      .then((data) => {
        if (requestIdRef.current !== requestId) return;
        const enhanced = data.results ?? [];
        if (enhanced.length > 0) setResults(enhanced);
      })
      .catch(() => {});

    return () => clearTimeout(spinnerCap);
  }, [debouncedQuery, addRecent]);

  const handleBarcodeDetected = useCallback(
    async (code: string) => {
      setScannerOpen(false);
      setQuery(code);

      try {
        const res = await fetch(`/api/products/barcode/${encodeURIComponent(code)}`);
        if (!res.ok) {
          showToast('Product not in catalog.', 'error');
          return;
        }
        const data = await res.json();
        setSelectedProductId(data.product.productId);
      } catch {
        showToast('Could not look up that barcode.', 'error');
      }
    },
    [showToast]
  );

  if (!user) return <LoadingSpinner label="Loading…" />;

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-background/95 px-5 pb-3 pt-safe-top backdrop-blur safe-top">
        <div className="flex items-center justify-between pt-4">
          <p className="text-secondary-body">
            {user.role === 'staff' ? user.fullName : `Hi, ${user.fullName.split(' ')[0]}`}
          </p>
          <button
            onClick={signOut}
            aria-label="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition active:scale-[0.98] active:bg-elevated"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2.5">
          <SearchBar ref={inputRef} value={query} onChange={setQuery} onScanTap={() => setScannerOpen(true)} />
        </div>
      </div>

      <div className="px-5 py-4">
        {!hasSearched && !searching && recent.length > 0 && (
          <div className="mb-2">
            <p className="text-section-header mb-2.5 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Recent searches
            </p>
            <div className="flex flex-wrap gap-2">
              {recent.map((term) => (
                <button
                  key={term}
                  onClick={() => setQuery(term)}
                  className="rounded-full border border-white/10 px-3.5 py-1.5 text-sm text-text-muted transition active:scale-[0.98] active:bg-elevated"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {searching && <SkeletonCardList count={5} />}

        {!searching && hasSearched && results.length === 0 && (
          <EmptyState
            icon={PackageSearch}
            title="No products found"
            description="Try a different name, brand, or scan the barcode."
          />
        )}

        {!searching && results.length > 0 && (
          <div className="space-y-2.5">
            {results.map((product) => (
              <ProductCard key={product.productId} product={product} onTap={() => setSelectedProductId(product.productId)} />
            ))}
          </div>
        )}

        {!hasSearched && !searching && recent.length === 0 && (
          <EmptyState
            icon={PackageSearch}
            title="Search the catalog"
            description="Type a product name or tap the camera to scan a barcode."
          />
        )}
      </div>

      {scannerOpen && <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setScannerOpen(false)} />}

      {selectedProductId && (
        <ProductDetailPanel
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
          onMakePurchase={(product) => setPurchaseProduct(product)}
        />
      )}

      {purchaseProduct && (
        <MakePurchaseModal
          product={purchaseProduct}
          user={user}
          onClose={() => setPurchaseProduct(null)}
          onSuccess={(remaining) => {
            setPurchaseProduct(null);
            setSelectedProductId(null);
            showToast(`Sale recorded. ${remaining} units remaining.`, 'success');
          }}
        />
      )}
    </div>
  );
}
