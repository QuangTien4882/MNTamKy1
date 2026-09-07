import React, { createContext, useState, useCallback, useContext, ReactNode, useMemo, useRef, useEffect } from 'react';
import { Toast, Notification } from '../types';

interface UIContextType {
  toasts: Toast[];
  notifications: Notification[];
  isLoading: boolean;
  isOffline: boolean;
  addToast: (message: string, type: 'success' | 'error') => void;
  addNotification: (message: string) => void;
  setIsLoading: (loading: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeRequests, setActiveRequests] = useState(0);
  const [isOffline, setIsOffline] = useState(() => 
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const isLoading = activeRequests > 0;
  const nextId = useRef(0);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++nextId.current;
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    timersRef.current.push(window.setTimeout(() => {
      setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, 5000));
  }, []);

  const addNotification = useCallback((message: string) => {
    const id = ++nextId.current;
    setNotifications(prev => [...prev, { id, message }]);
    timersRef.current.push(window.setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000));
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    // Reference-count: a finishing task never clears the flag while others run.
    setActiveRequests(prev => Math.max(0, prev + (loading ? 1 : -1)));
  }, []);
  
  const value = useMemo(() => ({
      toasts,
      notifications,
      isLoading,
      isOffline,
      addToast,
      addNotification,
      setIsLoading
  }), [toasts, notifications, isLoading, isOffline, addToast, addNotification]);

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
