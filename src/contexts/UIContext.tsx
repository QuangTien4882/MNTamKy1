import React, { createContext, useState, useCallback, useContext, ReactNode, useMemo, useRef } from 'react';
import { Toast, Notification } from '../types';

interface UIContextType {
  toasts: Toast[];
  notifications: Notification[];
  isLoading: boolean;
  addToast: (message: string, type: 'success' | 'error') => void;
  addNotification: (message: string) => void;
  setIsLoading: (loading: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeRequests, setActiveRequests] = useState(0);
  const isLoading = activeRequests > 0;
  const nextId = useRef(0);

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++nextId.current;
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    setTimeout(() => {
      setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, 5000);
  }, []);

  const addNotification = useCallback((message: string) => {
    const id = ++nextId.current;
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    // Reference-count: a finishing task never clears the flag while others run.
    setActiveRequests(prev => Math.max(0, prev + (loading ? 1 : -1)));
  }, []);
  
  const value = useMemo(() => ({
      toasts,
      notifications,
      isLoading,
      addToast,
      addNotification,
      setIsLoading
  }), [toasts, notifications, isLoading, addToast, addNotification]);

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
