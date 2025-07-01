import { showErrorNotification } from "components/notifications";
import { useCallback, useEffect, useState } from "react";

export const SESSION_STORAGE_EVENT = "APP-SESSION-STORAGE";

export const useSessionStorage = <T>(
  key: string,
  initialValue?: T,
): readonly [T | undefined, (value?: T) => void] => {
  const readValue = useCallback(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? (JSON.parse(item) as T | undefined) : initialValue;
    } catch (error) {
      return initialValue;
    }
  }, [initialValue, key]);

  const [storeValue, setStoredValue] = useState<T | undefined>(readValue);

  const setValue = (value?: T) => {
    try {
      const newValue = value instanceof Function
        ? (value(storeValue) as T | undefined)
        : value;

      if (!value) {
        window.sessionStorage.removeItem(key);
      } else {
        window.sessionStorage.setItem(key, JSON.stringify(newValue));
      }
      setStoredValue(newValue);
      window.dispatchEvent(new Event(SESSION_STORAGE_EVENT));
    } catch (error) {
      showErrorNotification({
        title: "Error setting session storage",
        message: `Failed to set session storage for key "${key}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  };
  useEffect(() => {
    setStoredValue(readValue());
  }, [readValue]);

  useEffect(() => {
    const handleStorageChange = () => {
      setStoredValue(readValue());
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(SESSION_STORAGE_EVENT, handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(SESSION_STORAGE_EVENT, handleStorageChange);
    };
  }, [readValue]);
  return [storeValue, setValue] as const;
};
