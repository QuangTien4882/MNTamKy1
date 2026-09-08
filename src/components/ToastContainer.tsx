import React from 'react';
import { useUI } from '../contexts/UIContext';

const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const icon = type === 'success' ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  );

  return (
    <div className={`toast-item flex items-center p-4 mb-4 text-white ${bgColor} rounded-md shadow-lg`}>
      <div className="mr-3">{icon}</div>
      <div className="flex-1">{message}</div>
      <button onClick={onClose} className="ml-4 text-white font-bold opacity-70 hover:opacity-100" aria-label="Close toast">&times;</button>
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useUI();

  return (
    <div role="status" aria-live="polite" className="fixed top-5 right-5 z-[100] w-full max-w-xs">
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => dismissToast(toast.id)} />
      ))}
    </div>
  );
};

export default ToastContainer;
