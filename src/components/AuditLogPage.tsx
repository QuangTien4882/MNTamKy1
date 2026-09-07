import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { AuditLog } from '../types';

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center p-8">
        <svg className="animate-spin h-8 w-8 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const LoadingMoreSpinner: React.FC = () => (
    <div className="flex justify-center items-center py-4">
        <svg className="animate-spin h-6 w-6 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
};

const formatLogDetails = (log: AuditLog): string => {
    const { action, details } = log;
    switch (action) {
        case 'CREATE_REGISTRATION':
            return `Đã đăng ký cho lớp ${details.registrations[0]?.className}.`;
        case 'UPDATE_REGISTRATION':
            return `Cập nhật suất ăn lớp ${details.className} ngày ${new Date(details.date + 'T00:00:00').toLocaleDateString('vi-VN')}.`;
        case 'DELETE_REGISTRATION':
            return `Xóa đăng ký của lớp ${details.className || details.items[0]?.className} ngày ${details.date || new Date(details.items[0]?.date + 'T00:00:00').toLocaleDateString('vi-VN')}.`;
        case 'CREATE_CLASS':
            return `Tạo lớp mới: "${details.name}".`;
        case 'UPDATE_CLASS':
            return `Cập nhật lớp "${details.oldName}" thành "${details.newName}".`;
        case 'DELETE_CLASS':
            return `Xóa lớp: "${details.name}".`;
        case 'CREATE_USER':
            return `Tạo người dùng mới: ${details.displayName} (${details.email}).`;
        case 'UPDATE_USER':
            return `Cập nhật người dùng: ${details.displayName || details.email}.`;
        case 'DELETE_USER':
            return `Xóa người dùng: ${details.email}.`;
        case 'CREATE_ANNOUNCEMENT':
             return `Tạo thông báo mới: "${details.title}".`;
        case 'UPDATE_ANNOUNCEMENT':
             return `Cập nhật thông báo: "${details.newTitle}".`;
        case 'DELETE_ANNOUNCEMENT':
             return `Xóa thông báo (ID: ${details.announcementId}).`;
        case 'ARCHIVE_DATA':
            return `Lưu trữ dữ liệu suất ăn tháng ${details.month}/${details.year}.`;
        default:
            return JSON.stringify(details);
    }
};

const ITEMS_PER_PAGE = 25;

const AuditLogPage: React.FC = () => {
    const { getAuditLogs, deleteAuditLogs } = useData();
    const { isLoading: isContextLoading } = useUI();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
    const [deletingLog, setDeletingLog] = useState<AuditLog | null>(null);
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

    const observer = useRef<IntersectionObserver | null>(null);

    const fetchLogs = useCallback(async (loadMore = false) => {
        if (loadMore) {
            setIsFetchingMore(true);
        } else {
            setIsLoading(true);
        }
        try {
            const { logs: newLogs, hasMore: newHasMore } = await getAuditLogs({
                limit: ITEMS_PER_PAGE,
                offset: loadMore ? offset : 0,
            });
            
            setLogs(prev => loadMore ? [...prev, ...newLogs] : newLogs);
            setOffset(loadMore ? offset + newLogs.length : newLogs.length);
            setHasMore(newHasMore);
        } catch (error) {
            console.error("Failed to fetch audit logs", error);
        } finally {
            setIsLoading(false);
            setIsFetchingMore(false);
        }
    }, [getAuditLogs, offset]);

    const loaderRef = useCallback((node: HTMLElement | null) => {
        if (isFetchingMore || isLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                fetchLogs(true);
            }
        });
        if (node) observer.current.observe(node);
    }, [isFetchingMore, isLoading, hasMore, fetchLogs]);

    useEffect(() => {
        fetchLogs(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSelectRow = (logId: string) => {
        setSelectedLogs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(logId)) {
                newSet.delete(logId);
            } else {
                newSet.add(logId);
            }
            return newSet;
        });
    };

    const isAllOnPageSelected = logs.length > 0 && logs.every(log => selectedLogs.has(log.id));

    const handleSelectAllOnPage = () => {
        const pageLogIds = logs.map(log => log.id);
        setSelectedLogs(prev => {
            const newSet = new Set(prev);
            if (isAllOnPageSelected) {
                pageLogIds.forEach(id => newSet.delete(id));
            } else {
                pageLogIds.forEach(id => newSet.add(id));
            }
            return newSet;
        });
    };

    const handleDelete = async () => {
        if (!deletingLog) return;
        await deleteAuditLogs([deletingLog.id]);
        setLogs(prev => prev.filter(log => log.id !== deletingLog.id));
        setSelectedLogs(prev => {
            const newSet = new Set(prev);
            newSet.delete(deletingLog.id);
            return newSet;
        });
        setDeletingLog(null);
    };

    const handleBulkDelete = async () => {
        if (selectedLogs.size === 0) {
            setIsBulkDeleteConfirmOpen(false);
            return;
        }
        await deleteAuditLogs(Array.from(selectedLogs));
        setLogs(prev => prev.filter(log => !selectedLogs.has(log.id)));
        setSelectedLogs(new Set());
        setIsBulkDeleteConfirmOpen(false);
    };


    return (
        <div className="space-y-8">
            {deletingLog && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm m-4 modal-content">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Xác nhận xóa</h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            Bạn có chắc chắn muốn xóa mục lịch sử này?
                        </p>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setDeletingLog(null)} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                            <button onClick={handleDelete} disabled={isContextLoading} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400">Xóa</button>
                        </div>
                    </div>
                </div>
            )}
            {isBulkDeleteConfirmOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm m-4 modal-content">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Xác nhận xóa hàng loạt</h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            Bạn có chắc chắn muốn xóa <span className="font-semibold">{selectedLogs.size}</span> mục đã chọn không?
                        </p>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setIsBulkDeleteConfirmOpen(false)} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                            <button onClick={handleBulkDelete} disabled={isContextLoading} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400">Xóa</button>
                        </div>
                    </div>
                </div>
            )}
            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Lịch sử hoạt động</h2>
                <p className="mt-1 text-gray-600 dark:text-gray-400">Ghi lại các thay đổi quan trọng trong hệ thống.</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800/50 shadow-sm border dark:border-gray-700 rounded-lg overflow-hidden">
                 <div className="overflow-x-auto">
                    {selectedLogs.size > 0 && (
                        <div className="p-3 bg-teal-50 dark:bg-teal-900/50 border-b dark:border-gray-700 flex justify-between items-center">
                            <span className="text-sm font-semibold text-teal-800 dark:text-teal-200">{selectedLogs.size} mục đã được chọn</span>
                            <button onClick={() => setIsBulkDeleteConfirmOpen(true)} className="px-3 py-1 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">Xóa hàng loạt</button>
                        </div>
                    )}
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-center">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                        checked={isAllOnPageSelected}
                                        onChange={handleSelectAllOnPage}
                                        aria-label="Select all on page"
                                    />
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Thời gian</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Người thực hiện</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hành động</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {logs.map(log => (
                                <tr key={log.id} className={selectedLogs.has(log.id) ? 'bg-teal-50 dark:bg-teal-900/50' : ''}>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                            checked={selectedLogs.has(log.id)}
                                            onChange={() => handleSelectRow(log.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatTimestamp(log.timestamp)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-100">{log.userName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{formatLogDetails(log)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <button onClick={() => setDeletingLog(log)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium">Xóa</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {isLoading && logs.length === 0 && <LoadingSpinner />}
                    {!isLoading && logs.length === 0 && (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">Không có lịch sử hoạt động nào.</p>
                    )}
                </div>
                 <div ref={loaderRef} />
                 {isFetchingMore && <LoadingMoreSpinner />}
            </div>
        </div>
    );
};

export default AuditLogPage;
