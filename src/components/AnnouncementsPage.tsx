import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Announcement, Role } from '../types';

const LoadingSpinner: React.FC<{ size?: string; color?: string }> = ({ size = 'h-5 w-5', color = 'text-white' }) => (
    <svg className={`animate-spin ${size} ${color}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const AnnouncementModal: React.FC<{
    announcement: Omit<Announcement, 'id' | 'createdAt' | 'createdBy' | 'createdById' | 'readBy'> | null,
    onClose: () => void,
    onSave: (data: Omit<Announcement, 'id' | 'createdAt' | 'createdBy' | 'createdById' | 'readBy'>) => void,
    isSaving: boolean
}> = ({ announcement, onClose, onSave, isSaving }) => {
    const [title, setTitle] = useState(announcement?.title || '');
    const [content, setContent] = useState(announcement?.content || '');
    const modalRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        modalRef.current?.querySelector('input')?.focus();
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        onSave({ title, content });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div ref={modalRef} role="dialog" aria-modal="true" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg m-4 modal-content">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                    {announcement ? 'Chỉnh sửa thông báo' : 'Tạo thông báo mới'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="announcement-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tiêu đề</label>
                        <input id="announcement-title" type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="announcement-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nội dung</label>
                        <textarea id="announcement-content" value={content} onChange={e => setContent(e.target.value)} required rows={6} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md" />
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 flex items-center justify-center w-24">
                            {isSaving ? <LoadingSpinner /> : 'Lưu'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AnnouncementsPage: React.FC = () => {
    const { announcements, announcementsLoading, hasMoreAnnouncements, loadMoreAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement, markAnnouncementsAsRead, isAnnouncementRead } = useData();
    const { currentUser } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    
    const [hiddenAnnouncements, setHiddenAnnouncements] = useState<string[]>(() => {
        try {
            const hidden = localStorage.getItem('hiddenAnnouncements_v1');
            return hidden ? JSON.parse(hidden) : [];
        } catch (e) {
            return [];
        }
    });
    
    const canManage = currentUser?.role === Role.Admin || currentUser?.role === Role.BGH;

    const handleHideAnnouncement = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newHidden = Array.from(new Set([...hiddenAnnouncements, id]));
        setHiddenAnnouncements(newHidden);
        try {
            localStorage.setItem('hiddenAnnouncements_v1', JSON.stringify(newHidden));
        } catch (e) {
            console.error("Failed to save hidden announcements to localStorage", e);
        }
    };

    const handleRestoreAll = () => {
        setHiddenAnnouncements([]);
        localStorage.removeItem('hiddenAnnouncements_v1');
    };
    
    const handleToggleExpand = (announcement: Announcement) => {
        // Toggle the expanded state for the clicked announcement
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(announcement.id)) {
                newSet.delete(announcement.id);
            } else {
                newSet.add(announcement.id);
            }
            return newSet;
        });

        // If the announcement is unread, mark it as read.
        // This now robustly updates the local cache, preventing the UI from reverting.
        if (!isAnnouncementRead(announcement)) {
            markAnnouncementsAsRead([announcement.id]);
        }
    };


    const { visibleAnnouncements, hiddenCount } = useMemo(() => {
        const hiddenSet = new Set(hiddenAnnouncements);
        const visible = [];
        let hidden = 0;
        for (const ann of announcements) {
            if (hiddenSet.has(ann.id)) {
                hidden++;
            } else {
                visible.push(ann);
            }
        }
        return { visibleAnnouncements: visible, hiddenCount: hidden };
    }, [announcements, hiddenAnnouncements]);


    const handleSave = async (data: Omit<Announcement, 'id' | 'createdAt' | 'createdBy' | 'createdById' | 'readBy'>) => {
        setIsSaving(true);
        try {
            let success = false;
            if (editingAnnouncement) {
                success = await updateAnnouncement(editingAnnouncement.id, data);
            } else {
                success = await addAnnouncement(data);
            }
            if (success) {
                setEditingAnnouncement(null);
                setIsCreating(false);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadMore = async () => {
        setIsLoadingMore(true);
        try {
            loadMoreAnnouncements();
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleDelete = async () => {
        if (deletingId) {
            await deleteAnnouncement(deletingId);
            setDeletingId(null);
        }
    };
    
    const formatTimestamp = (ts: string) => {
        return new Date(ts).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Thông báo</h2>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">Các thông báo và cập nhật mới nhất từ nhà trường.</p>
                </div>
                {canManage && (
                    <button onClick={() => { setIsCreating(true); setEditingAnnouncement(null); }} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Tạo mới
                    </button>
                )}
            </div>

            {announcementsLoading && announcements.length === 0 ? (
                <div className="text-center p-8"><LoadingSpinner size="h-8 w-8" color="text-teal-600" /></div>
            ) : visibleAnnouncements.length === 0 && hiddenCount === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-10">Chưa có thông báo nào.</p>
            ) : (
                <div className="space-y-4">
                    {visibleAnnouncements.map(ann => {
                         // Use the reliable isAnnouncementRead function from context
                         const isRead = isAnnouncementRead(ann);
                         const isExpanded = expandedIds.has(ann.id);

                         const handleActionClick = (e: React.MouseEvent) => e.stopPropagation();

                         return (
                            <div key={ann.id} onClick={() => handleToggleExpand(ann)} className={`relative p-5 rounded-lg shadow-sm border dark:border-gray-700 transition-all duration-300 bg-white dark:bg-gray-800/50 cursor-pointer overflow-hidden`}>
                                <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold z-10 ${
                                    isRead 
                                    ? 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200' 
                                    : 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 animate-pulse'
                                }`}>
                                    {isRead ? 'Đã xem' : 'Chưa xem'}
                                </div>
                                <div className="flex justify-between items-start pt-5">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{ann.title}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Đăng bởi <span className="font-medium">{ann.createdBy}</span> vào lúc {formatTimestamp(ann.createdAt)}</p>
                                    </div>
                                    <div onClick={handleActionClick} className="flex space-x-3 flex-shrink-0 ml-4 items-center">
                                        {canManage && (
                                            <>
                                                <button onClick={() => setEditingAnnouncement(ann)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm">Sửa</button>
                                                <button onClick={() => setDeletingId(ann.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm">Xóa</button>
                                            </>
                                        )}
                                        <button onClick={(e) => handleHideAnnouncement(e, ann.id)} title="Ẩn thông báo này" className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <p className={`mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                    {ann.content}
                                </p>
                            </div>
                         )
                    })}
                </div>
            )}

            {hasMoreAnnouncements && (
                <div className="text-center pt-4">
                    <button onClick={handleLoadMore} disabled={isLoadingMore} className="px-6 py-2 text-sm font-medium rounded-md text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 disabled:opacity-60 flex items-center gap-2 mx-auto">
                        {isLoadingMore ? <LoadingSpinner size="h-4 w-4" color="text-teal-600" /> : null}
                        Tải thêm thông báo
                    </button>
                </div>
            )}
            
            {hiddenCount > 0 && (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4">
                    <span>Bạn có {hiddenCount} thông báo đã ẩn. </span>
                    <button onClick={handleRestoreAll} className="text-teal-600 hover:underline font-medium">
                        Hiển thị lại tất cả
                    </button>
                </div>
            )}

            {(isCreating || editingAnnouncement) && (
                <AnnouncementModal 
                    announcement={editingAnnouncement} 
                    onClose={() => { setIsCreating(false); setEditingAnnouncement(null); }} 
                    onSave={handleSave} 
                    isSaving={isSaving}
                />
            )}
            
            {deletingId && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
                    <div role="dialog" aria-modal="true" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm m-4 modal-content">
                        <h3 className="text-lg font-bold">Xác nhận xóa</h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Bạn có chắc chắn muốn xóa vĩnh viễn thông báo này cho tất cả mọi người?</p>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setDeletingId(null)} className="px-4 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500">Hủy</button>
                            <button onClick={handleDelete} className="px-4 py-2 text-sm rounded-md text-white bg-red-600 hover:bg-red-700">Xóa vĩnh viễn</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnnouncementsPage;
