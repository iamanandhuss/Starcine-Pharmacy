import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Store {
  id: string;
  name: string;
  store_code: string | null;
  code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  manager_name: string | null;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
}

interface StoreContextType {
  /** The active store ID for data filtering — Super Admin can switch this */
  selectedStoreId: string | null;
  /** The display name of the selected store */
  selectedStoreName: string | null;
  /** Full list of stores (only populated for Super Admin) */
  allStores: Store[];
  /** For Super Admin: switch the active store context */
  setSelectedStore: (storeId: string | null) => void;
  /** Whether stores are loading */
  storesLoading: boolean;
  /** Refresh stores list */
  refreshStores: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const SUPER_ADMIN_STORE_KEY = 'pharmacyops_selected_store_id';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSuperAdmin, isStoreAdmin, isEmployee, profile } = useAuth();

  const [allStores, setAllStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreIdState] = useState<string | null>(null);
  const [selectedStoreName, setSelectedStoreName] = useState<string | null>(null);
  const [storesLoading, setStoresLoading] = useState(true);

  const fetchAllStores = async () => {
    setStoresLoading(true);
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, store_code, code, address, phone, email, manager_name, is_active, latitude, longitude')
        .order('name', { ascending: true });

      if (error) throw error;
      setAllStores(data || []);
      return data || [];
    } catch (err: any) {
      console.error('Error fetching stores:', err.message);
      return [];
    } finally {
      setStoresLoading(false);
    }
  };

  const refreshStores = async () => {
    await fetchAllStores();
  };

  const setSelectedStore = (storeId: string | null) => {
    if (!isSuperAdmin) return; // Only Super Admin can switch
    setSelectedStoreIdState(storeId);

    if (storeId) {
      localStorage.setItem(SUPER_ADMIN_STORE_KEY, storeId);
      const found = allStores.find((s) => s.id === storeId);
      setSelectedStoreName(found?.name || null);
    } else {
      localStorage.removeItem(SUPER_ADMIN_STORE_KEY);
      setSelectedStoreName(null);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      if (isSuperAdmin) {
        // Super Admin: fetch all stores and restore selected store from localStorage
        const stores = await fetchAllStores();
        const savedStoreId = localStorage.getItem(SUPER_ADMIN_STORE_KEY);
        if (savedStoreId && stores.some((s) => s.id === savedStoreId)) {
          setSelectedStoreIdState(savedStoreId);
          const found = stores.find((s) => s.id === savedStoreId);
          setSelectedStoreName(found?.name || null);
        } else {
          setSelectedStoreIdState(null);
          setSelectedStoreName(null);
          setStoresLoading(false);
        }
      } else if (isStoreAdmin || isEmployee) {
        // Store Admin / Employee: automatically bound to their branch
        if (profile?.store_id) {
          setSelectedStoreIdState(profile.store_id);
          setSelectedStoreName(profile.store_name);
        }
        setStoresLoading(false);
      } else {
        setStoresLoading(false);
      }
    };

    initialize();
  }, [isSuperAdmin, isStoreAdmin, isEmployee, profile?.store_id]);

  // When allStores updates, refresh the selected store name if needed
  useEffect(() => {
    if (selectedStoreId && allStores.length > 0) {
      const found = allStores.find((s) => s.id === selectedStoreId);
      if (found) setSelectedStoreName(found.name);
    }
  }, [allStores, selectedStoreId]);

  return (
    <StoreContext.Provider value={{
      selectedStoreId,
      selectedStoreName,
      allStores,
      setSelectedStore,
      storesLoading,
      refreshStores,
    }}>
      {children}
    </StoreContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
