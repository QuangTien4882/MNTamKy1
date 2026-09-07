import React from 'react';

interface OfflineIndicatorProps {
    isOffline: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isOffline }) => {
    if (!isOffline) {
        return null;
    }

    return (
        <div 
            role="status"
            aria-live="assertive"
            className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-white text-xs sm:text-sm text-center p-2 z-50 flex items-center justify-center"
        >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zM9 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm1 3a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Bạn đang ngoại tuyến. Việc đăng ký không thể được lưu lúc này — hãy thử lại khi có mạng.
        </div>
    );
};

export default OfflineIndicator;
