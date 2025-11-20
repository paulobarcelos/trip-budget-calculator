"use client";

import { useState, useEffect } from "react";

type LocalStorageMigration<T> = (value: unknown) => T;
type UrlDecoder<T> = (payload: string) => T;

interface UseLocalStorageOptions<T> {
  migrate?: LocalStorageMigration<T>;
  decodeFromUrl?: UrlDecoder<T>;
}

interface LocalStorageEventDetail<T> {
  key: string;
  value: T;
}

const LOCAL_STORAGE_EVENT_NAME = "codex-local-storage";

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageOptions<T>,
) {
  // Always initialize with the initial value during SSR
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);
  const migrate = options?.migrate;
  const decodeFromUrl = options?.decodeFromUrl;

  useEffect(() => {
    const hydrateFromUrl = (): T | null => {
      if (!decodeFromUrl || typeof window === "undefined") return null;

      try {
        const url = new URL(window.location.href);
        const hashValue = url.hash.startsWith("#data=")
          ? url.hash.slice(6)
          : url.hash.startsWith("#t=")
            ? url.hash.slice(1)
            : null;
        const queryValue = url.searchParams.get("data");
        const payload = hashValue ?? queryValue;
        if (!payload) return null;

        const decoded = decodeFromUrl(payload);
        const migrated = migrate ? migrate(decoded) : decoded;
        const serializedValue = JSON.stringify(migrated);
        window.localStorage.setItem(key, serializedValue);

        url.searchParams.delete("data");
        if (url.hash.startsWith("#data=") || url.hash.startsWith("#t=")) {
          url.hash = "";
        }
        window.history.replaceState({}, "", url.toString());
        return migrated;
      } catch (error) {
        console.warn(
          `Error hydrating localStorage key "${key}" from URL:`,
          error,
        );
        return null;
      }
    };

    const readValueFromStorage = () => {
      try {
        const seeded = hydrateFromUrl();
        if (seeded) {
          setStoredValue(seeded);
          return;
        }

        const item = window.localStorage.getItem(key);
        if (!item) {
          setStoredValue(initialValue);
          return;
        }

        const parsedValue = JSON.parse(item);
        const migratedValue = migrate
          ? migrate(parsedValue)
          : (parsedValue as T);
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
        const migratedValue = migrate
          ? migrate(parsedValue)
          : (parsedValue as T);
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

    window.addEventListener("storage", handleStorageEvent);
    window.addEventListener(
      LOCAL_STORAGE_EVENT_NAME,
      handleCustomEvent as EventListener,
    );

    return () => {
      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener(
        LOCAL_STORAGE_EVENT_NAME,
        handleCustomEvent as EventListener,
      );
    };
  }, [initialValue, key, migrate, decodeFromUrl]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      const migratedValue = migrate ? migrate(valueToStore) : valueToStore;

      setStoredValue(migratedValue);

      if (typeof window !== "undefined") {
        const serializedValue = JSON.stringify(migratedValue);
        window.localStorage.setItem(key, serializedValue);
        const customEvent: LocalStorageEventDetail<T> = {
          key,
          value: migratedValue,
        };
        // Defer the broadcast to avoid React warning about updating a component
        // while another component is rendering.
        const dispatch = () =>
          window.dispatchEvent(
            new CustomEvent(LOCAL_STORAGE_EVENT_NAME, { detail: customEvent }),
          );
        if (typeof queueMicrotask === "function") {
          queueMicrotask(dispatch);
        } else {
          setTimeout(dispatch, 0);
        }
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
  options?: UseLocalStorageOptions<T>,
): [S, (value: T | ((val: T) => T)) => void, boolean] {
  const [fullState, setFullState, isInitialized] = useLocalStorage<T>(
    key,
    initialValue,
    options,
  );
  return [selector(fullState), setFullState, isInitialized];
}
