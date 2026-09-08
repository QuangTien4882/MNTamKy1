import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { ClassInfo } from '../types';

const SettingsPage: React.FC = () => {
    const { classes, addClass, updateClass, deleteClass } = useData();
    const { isLoading } = useUI();

    const [newClass, setNewClass] = useState<Omit<ClassInfo, 'id'>>({ name: '', studentCount: 0 });
    
    const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);

    const [deletingClass, setDeletingClass] = useState<ClassInfo | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
    
    const modalRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);
    
    const filteredClasses = useMemo(() => 
        classes.filter(c => c.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
     [classes, debouncedSearchTerm]);

    // Accessibility: Focus trap for modals
    useEffect(() => {
        const isModalOpen = !!editingClass || !!deletingClass;
        if (isModalOpen && modalRef.current) {
            triggerRef.current = document.activeElement as HTMLElement;
            const focusableElements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            ) as NodeListOf<HTMLElement>;
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key !== 'Tab') return;
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            };

            document.addEventListener('keydown', handleKeyDown);
            firstElement?.focus();

            return () => {
                document.removeEventListener('keydown', handleKeyDown);
                triggerRef.current?.focus();
            };
        }
    }, [editingClass, deletingClass]);

    const handleAddClass = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await addClass(newClass);
        if (success) {
            setNewClass({ name: '', studentCount: 0 });
        }
    };

    const handleUpdateClass = async () => {
        if (editingClass) {
            const { id, ...updatedData } = editingClass;
            const success = await updateClass(id, updatedData);
            if (success) {
                setEditingClass(null);
            }
        }
    };

    const handleDeleteClass = async () => {
        if (deletingClass) {
            try {
                await deleteClass(deletingClass);
            } catch (error) {
                // Error toast is handled in context
                console.error("Delete failed:", error);
            } finally {
                 setDeletingClass(null);
            }
        }
    };
    
    return (
        <div className="space-y-8">
            {/* Delete Confirmation Modal */}
            {deletingClass && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
                    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="delete-class-title" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm m-4 modal-content">
                        <h3 id="delete-class-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">Xác nhận xóa</h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            Bạn có chắc chắn muốn xóa lớp <span className="font-semibold">{deletingClass.name}</span>? Tất cả dữ liệu đăng ký của lớp này cũng sẽ bị xóa vĩnh viễn.
                        </p>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setDeletingClass(null)} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                            <button onClick={handleDeleteClass} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">Xóa</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Edit Modal */}
            {editingClass && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
                    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="edit-class-title" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 modal-content">
                        <h3 id="edit-class-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">Chỉnh sửa thông tin lớp</h3>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label htmlFor="editClassName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tên lớp</label>
                                <input
                                    type="text" id="editClassName" value={editingClass.name}
                                    onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="editStudentCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Số lượng trẻ</label>
                                <input
                                    type="number" id="editStudentCount" value={editingClass.studentCount} min="0"
                                    onChange={(e) => setEditingClass({ ...editingClass, studentCount: parseInt(e.target.value, 10) || 0 })}
                                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setEditingClass(null)} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                            <button onClick={handleUpdateClass} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700">Lưu</button>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Quản lý lớp học</h2>
                <p className="mt-1 text-gray-600 dark:text-gray-400">Thêm, sửa, xóa và quản lý thông tin các lớp.</p>
            </div>

            <div className="space-y-6">
                <form onSubmit={handleAddClass} className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg space-y-4">
                    <h3 className="font-medium text-lg text-gray-800 dark:text-gray-200">Thêm lớp mới</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="newClassName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tên lớp <span className="text-red-500">*</span></label>
                            <input required type="text" id="newClassName" value={newClass.name} onChange={(e) => setNewClass(s => ({...s, name: e.target.value}))}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="newStudentCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Số lượng trẻ</label>
                            <input type="number" id="newStudentCount" min="0" value={newClass.studentCount} onChange={(e) => setNewClass(s => ({...s, studentCount: parseInt(e.target.value, 10) || 0}))}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md" />
                        </div>
                    </div>
                    <button type="submit" className="w-full sm:w-auto flex-shrink-0 justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700">
                        Thêm lớp
                    </button>
                </form>

                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Danh sách lớp hiện tại ({classes.length})</h3>
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Tìm kiếm lớp học..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full max-w-sm px-3 py-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md"
                        />
                    </div>
                    <div className="bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="overflow-auto max-h-[70vh]">
                            <table className="min-w-full border-separate border-spacing-0">
                                <thead>
                                    <tr>
                                        <th scope="col" className="sticky top-0 left-0 z-30 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">Tên lớp</th>
                                        <th scope="col" className="sticky top-0 z-20 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">Sĩ số</th>
                                        <th scope="col" className="sticky top-0 z-20 px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredClasses.map(cls => (
                                        <tr key={cls.id}>
                                            <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">{cls.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">{cls.studentCount}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4 border-b border-gray-200 dark:border-gray-700">
                                                <button onClick={() => setEditingClass(cls)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">Sửa</button>
                                                <button onClick={() => setDeletingClass(cls)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200">Xóa</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredClasses.length === 0 && (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-6">{isLoading ? "Đang tải..." : "Không tìm thấy lớp học nào."}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// FIX: Added a default export for the component.
export default SettingsPage;