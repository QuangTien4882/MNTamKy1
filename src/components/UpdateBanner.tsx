import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UpdateBanner: React.FC = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 bg-sky-600 text-white text-sm text-center p-2 z-50 flex items-center justify-center shadow"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v9a2 2 0 002 2h5a2 2 0 002-2V4a2 2 0 00-2-2H6zm9 4h.01a2 2 0 012 2v9a2 2 0 01-2 2H9a2 2 0 01-2-2v-.586A1 1 0 016.586 19H9a1 1 0 001-1v-2h5a1 1 0 001-1V8h-4.586a1 1 0 01-.707-.293L9 6.414V4h6zm-2 2H9.414l3 3V8z" clipRule="evenodd" />
      </svg>
      Có bản mới, bấm để tải lại
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="ml-3 px-3 py-1 rounded bg-white text-sky-700 font-semibold hover:bg-sky-100 transition-colors"
      >
        Tải lại
      </button>
    </div>
  );
};

export default UpdateBanner;