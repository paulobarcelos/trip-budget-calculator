'use client';

import { useState, useEffect } from 'react';

type LocalStorageMigration<T> = (value: unknown) => T;

interface UseLocalStorageOptions<T> {
  migrate?: LocalStorageMigration<T>;
}

interface LocalStorageEventDetail<T> {
  key: string;
  value: T;
}

const LOCAL_STORAGE_EVENT_NAME = 'codex-local-storage';

export function useLocalStorage<T>(key: string, initialValue: T, options?: UseLocalStorageOptions<T>) {
  // Always initialize with the initial value during SSR
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);
  const migrate = options?.migrate;

  useEffect(() => {
    const readValueFromStorage = () => {
      try {
        const item = window.localStorage.getItem(key);
        if (!item) {
          setStoredValue(initialValue);
          return;
        }

        const parsedValue = JSON.parse(item);
        const migratedValue = migrate ? migrate(parsedValue) : (parsedValue as T);
        setStoredValue(migratedValue);
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}":`, error);
        setStoredValue(initialValue);
      } finally {
        setIsInitialized(true);
      }
    };

    readValueFromStorage();

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key !== key) return;

      if (event.newValue === null) {
        setStoredValue(initialValue);
        return;
      }

      try {
        const parsedValue = JSON.parse(event.newValue);
        const migratedValue = migrate ? migrate(parsedValue) : (parsedValue as T);
        setStoredValue(migratedValue);
      } catch (error) {
        console.warn(`Error syncing localStorage key "${key}":`, error);
      }
    };

    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<LocalStorageEventDetail<T>>;
      if (customEvent.detail?.key !== key) return;
      setStoredValue(customEvent.detail.value);
    };

    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener(LOCAL_STORAGE_EVENT_NAME, handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener(LOCAL_STORAGE_EVENT_NAME, handleCustomEvent as EventListener);
    };
  }, [initialValue, key, migrate]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        const serializedValue = JSON.stringify(valueToStore);
        window.localStorage.setItem(key, serializedValue);
        const customEvent: LocalStorageEventDetail<T> = { key, value: valueToStore };
        window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_EVENT_NAME, { detail: customEvent }));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, isInitialized] as const;
}

export function useLocalStorageSelector<T, S>(
  key: string,
  selector: (state: T) => S,
  initialValue: T,
  options?: UseLocalStorageOptions<T>
): [S, (value: T | ((val: T) => T)) => void, boolean] {
  const [fullState, setFullState, isInitialized] = useLocalStorage<T>(key, initialValue, options);
  return [selector(fullState), setFullState, isInitialized];
}
