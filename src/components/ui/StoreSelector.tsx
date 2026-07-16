import React, { useState, useRef, useEffect } from 'react';
import { Store, ChevronDown, Check } from 'lucide-react';
import { useStore, type Store as StoreType } from '../../context/StoreContext';

interface StoreSelectorProps {
  className?: string;
}

export const StoreSelector: React.FC<StoreSelectorProps> = ({ className = '' }) => {
  const { allStores, selectedStoreId, selectedStoreName, setSelectedStore } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSelect = (store: StoreType | null) => {
    setSelectedStore(store?.id ?? null);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 hover:bg-dark-50 dark:hover:bg-dark-750 text-xs font-semibold text-dark-700 dark:text-dark-300 transition-colors cursor-pointer min-w-[160px]"
        aria-label="Select store"
      >
        <Store className="h-3.5 w-3.5 text-brand-500 shrink-0" />
        <span className="flex-1 text-left truncate">
          {selectedStoreName ?? 'All Stores'}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-dark-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-64 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-2 border-b border-dark-100 dark:border-dark-800">
            <p className="text-[10px] font-bold uppercase tracking-wider text-dark-400 dark:text-dark-500 px-2 py-1">
              Switch Store View
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {/* "All Stores" option */}
            <button
              onClick={() => handleSelect(null)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs text-left transition-colors hover:bg-dark-50 dark:hover:bg-dark-800 cursor-pointer ${
                !selectedStoreId ? 'bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400' : 'text-dark-700 dark:text-dark-300'
              }`}
            >
              <Store className="h-4 w-4 shrink-0 opacity-60" />
              <span className="flex-1 font-semibold">All Stores</span>
              {!selectedStoreId && <Check className="h-3.5 w-3.5 text-brand-500" />}
            </button>

            {/* Store list */}
            {allStores.map((store) => (
              <button
                key={store.id}
                onClick={() => handleSelect(store)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs text-left transition-colors hover:bg-dark-50 dark:hover:bg-dark-800 cursor-pointer ${
                  selectedStoreId === store.id
                    ? 'bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400'
                    : 'text-dark-700 dark:text-dark-300'
                }`}
                disabled={!store.is_active}
              >
                <div className={`h-2 w-2 rounded-full shrink-0 ${store.is_active ? 'bg-emerald-500' : 'bg-dark-300 dark:bg-dark-600'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{store.name}</p>
                  {store.store_code || store.code ? (
                    <p className="text-[10px] text-dark-400 dark:text-dark-500 truncate">
                      {store.store_code || store.code}
                    </p>
                  ) : null}
                </div>
                {selectedStoreId === store.id && <Check className="h-3.5 w-3.5 text-brand-500 shrink-0" />}
                {!store.is_active && (
                  <span className="text-[9px] text-dark-400 dark:text-dark-500 font-bold uppercase">Inactive</span>
                )}
              </button>
            ))}

            {allStores.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-dark-400 dark:text-dark-500">
                No stores found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
