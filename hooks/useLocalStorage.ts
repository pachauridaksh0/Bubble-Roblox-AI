
import { useState, useEffect } from 'react';

// FIX: Updated the hook's return type to allow for functional state updates.
export function useLocalStorage<T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  // FIX: Updated the type of the value parameter to accept a new value or a function.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error('LocalStorage Error:', error);
      // Dispatch a custom event for UI components to listen to.
      window.dispatchEvent(new CustomEvent('storageError', { 
        detail: { message: 'Could not save changes. Your browser storage might be full.' } 
      }));
    }
  };

  useEffect(() => {
    try {
        const item = window.localStorage.getItem(key);
        if (item) {
            setStoredValue(JSON.parse(item));
        }
    } catch (error) {
        console.log(error)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return [storedValue, setValue];
}