import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { User, Role } from '../types';

const getRoleBadgeClass = (role: Role) => {
    switch (role) {
        case Role.Admin:
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        case Role.BGH:
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
        case Role.KT_CD:
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case Role.GV:
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        case Role.Pending:
            return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
};

const UserManagementPage: React.FC = () => {
    const { classes, users, approveUser, rejectUser, updateUser, deleteUser } = useData();
    const { isLoading, addToast } = useUI();

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [confirmReject, setConfirmReject] = useState<User | null>(null);
    const [approvingUser, setApprovingUser] = useState<User | null>(null);
    const [approveClass, setApproveClass] = useState('');
    const [approving, setApproving] = useState(false);

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
    
    // Accessibility: Focus trap for modals
    useEffect(() => {
        const isModalOpen = !!editingUser || !!deletingUser || !!confirmReject || !!approvingUser;
        if (isModalOpen && modalRef.current) {
            triggerRef.current = document.activeElement as HTMLElement;
            // FIX: Replaced generic type argument on `querySelectorAll` with a type assertion to fix the "Untyped function calls may not accept type arguments" error.
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
    }, [editingUser, deletingUser, confirmReject, approvingUser]);

    const filteredUsers = useMemo(() =>
        users.filter(u =>
            u.displayName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        ).sort((a,b) => a.displayName.localeCompare(b.displayName)),
        [users, debouncedSearchTerm]);

    const pendingUsers = useMemo(() => users.filter(u => u.role === Role.Pending), [users]);

    const openApprove = (user: User) => {
        setApproveClass('');
        setApprovingUser(user);
    };

    const handleApprove = async (user: User) => {
        setApproving(true);
        await approveUser(user.id, Role.GV, approveClass);
        setApproving(false);
        setApprovingUser(null);
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        const { id, ...updatedData } = editingUser;
        let dataToUpdate: Partial<Omit<User, 'id'>> = {
            displayName: updatedData.displayName,
            role: updatedData.role,
            assignedClass: updatedData.role === Role.GV ? updatedData.assignedClass : ''
        };
        
        const success = await updateUser(id, dataToUpdate);
        if (success) {
            setEditingUser(null);
        }
    }
    
    const handleDeleteUser = async () => {
        if(deletingUser) {
            await deleteUser(deletingUser.id);
            setDeletingUser(null);
        }
    }

    const handleRoleChange = (role: Role, userStateSetter: React.Dispatch<React.SetStateAction<any>>) => {
        userStateSetter((prev: any) => ({
            ...prev,
            role: role,
            assignedClass: role === Role.GV ? prev.assignedClass : ''
        }));
    };
    
    return (
        <div className="space-y-8">
            {deletingUser && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
                    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="delete-user-title" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm m-4 modal-content">
                        <h3 id="delete-user-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">Xác nhận xóa</h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            Bạn có chắc chắn muốn xóa người dùng <span className="font-semibold">{deletingUser.displayName}</span>?
                        </p>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setDeletingUser(null)} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                            <button onClick={handleDeleteUser} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">Xóa</button>
                        </div>
                    </div>
                </div>
            )}
            {approvingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
                    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="approve-user-title" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 modal-content">
                        <h3 id="approve-user-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">Duyệt tài khoản</h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            Xác nhận duyệt tài khoản <span className="font-semibold">{approvingUser.displayName}</span> ({approvingUser.email})?
                            Sau khi duyệt, tài khoản sẽ có thể đăng nhập với vai trò <span className="font-semibold">Giáo viên</span>.
                        </p>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Lớp phụ trách <span className="text-red-600">*</span></label>
                            <select value={approveClass} onChange={e => setApproveClass(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md">
                                <option value="">-- Chọn lớp --</option>
                                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                            {!approveClass && <p className="mt-1 text-xs text-red-600 dark:text-red-400">Vui lòng chọn lớp phụ trách trước khi duyệt.</p>}
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setApprovingUser(null)} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                            <button
                                onClick={() => { if (!approveClass) { addToast('Vui lòng chọn lớp phụ trách.', 'error'); return; } handleApprove(approvingUser); }}
                                disabled={approving || !approveClass}
                                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                            >
                                {approving ? 'Đang duyệt...' : 'Xác nhận duyệt'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {confirmReject && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
                    <div role="dialog" aria-modal="true" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm m-4 modal-content">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Xác nhận từ chối</h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            Bạn có chắc chắn muốn từ chối tài khoản <span className="font-semibold">{confirmReject.displayName}</span> ({confirmReject.email})? Tài khoản sẽ bị xóa vĩnh viễn.
                        </p>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setConfirmReject(null)} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                            <button
                                onClick={async () => {
                                    await rejectUser(confirmReject.id);
                                    setConfirmReject(null);
                                }}
                                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                            >
                                Từ chối
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
                    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="edit-user-title" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 modal-content">
                        <h3 id="edit-user-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">Chỉnh sửa người dùng</h3>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tên hiển thị</label>
                                <input type="text" value={editingUser.displayName} onChange={e => setEditingUser({...editingUser, displayName: e.target.value})} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                                <input type="email" value={editingUser.email} readOnly className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md cursor-not-allowed" />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Email không thể thay đổi sau khi tạo tài khoản.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vai trò</label>
                                <select value={editingUser.role} onChange={e => handleRoleChange(e.target.value as Role, setEditingUser)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md">
                                    {Object.values(Role).map(role => <option key={role} value={role}>{role}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Lớp phụ trách</label>
                                <select disabled={editingUser.role !== Role.GV} value={editingUser.assignedClass || ''} onChange={e => setEditingUser({...editingUser, assignedClass: e.target.value})} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md disabled:bg-gray-100 dark:disabled:bg-gray-600">
                                    <option value="">Không có</option>
                                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                            <button onClick={handleUpdateUser} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700">Lưu</button>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Quản lý người dùng</h2>
                <p className="mt-1 text-gray-600 dark:text-gray-400">Thêm, sửa, và quản lý vai trò của người dùng trong hệ thống.</p>
            </div>

            <div className="space-y-6">
                <div className="p-4 bg-teal-50 dark:bg-gray-800/50 border dark:border-teal-600/30 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                    <p>
                        Người dùng <strong>tự đăng ký</strong> ngay trên trang đăng nhập (tab <strong>"Đăng ký"</strong>).
                        Tài khoản mới có vai trò <strong>"Chưa duyệt"</strong> và bị chặn đăng nhập. Tại đây, bấm
                        <strong> "Duyệt"</strong> để kích hoạt tài khoản. Chỉ <em>sau khi đã duyệt</em>, Admin mới được
                        <strong> chỉnh vai trò</strong> và <strong>phân công lớp</strong> (nếu cần) qua nút <strong>"Sửa"</strong>.
                    </p>
                    <p className="mt-2">Tài khoản <strong>chưa duyệt</strong> chỉ có thao tác <strong>Duyệt</strong> hoặc <strong>Từ chối</strong>.</p>
                </div>

                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-3">
                        <span>Danh sách người dùng ({users.length})</span>
                        {pendingUsers.length > 0 && (
                            <span className="px-2 py-0.5 inline-flex text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                {pendingUsers.length} chờ duyệt
                            </span>
                        )}
                    </h3>
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Tìm kiếm người dùng..."
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
                                        <th scope="col" className="sticky top-0 left-0 z-30 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">Tên hiển thị</th>
                                        <th scope="col" className="sticky top-0 z-20 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">Email</th>
                                        <th scope="col" className="sticky top-0 z-20 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">Vai trò</th>
                                        <th scope="col" className="sticky top-0 z-20 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">Lớp phụ trách</th>
                                        <th scope="col" className="sticky top-0 z-20 px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(user => {
                                        const isPending = user.role === Role.Pending;
                                        return (
                                        <tr key={user.id} className={isPending ? 'bg-amber-50 dark:bg-amber-900/20' : undefined}>
                                            <td className={`sticky left-0 z-10 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 ${isPending ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-white dark:bg-gray-800'}`}>{user.displayName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">{user.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">{user.assignedClass || '—'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4 border-b border-gray-200 dark:border-gray-700">
                                                {user.role === Role.Pending ? (
                                                    <>
                                                        <button onClick={() => openApprove(user)} disabled={isLoading} className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50">Duyệt</button>
                                                        <button onClick={() => setConfirmReject(user)} disabled={isLoading} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50">Từ chối</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => setEditingUser(user)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">Sửa</button>
                                                        <button onClick={() => setDeletingUser(user)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200">Xóa</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredUsers.length === 0 && (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-6">{isLoading ? "Đang tải..." : "Không tìm thấy người dùng nào."}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagementPage;