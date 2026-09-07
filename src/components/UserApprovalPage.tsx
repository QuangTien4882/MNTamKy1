import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { User, Role } from '../types';

const UserApprovalPage: React.FC = () => {
    const { users, classes, approveUser, rejectUser, refreshUsers } = useData();
    const { isLoading } = useUI();

    const pendingUsers = useMemo(() => users.filter(u => u.role === Role.Pending), [users]);

    const roleCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        users.forEach(u => {
            const key = u.role || 'Không có vai trò';
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }, [users]);

    const [assignRole, setAssignRole] = useState<Record<string, Role>>({});
    const [assignClass, setAssignClass] = useState<Record<string, string>>({});
    const [confirmReject, setConfirmReject] = useState<User | null>(null);

    useEffect(() => {
        const timer = setInterval(() => { refreshUsers(); }, 15000);
        return () => clearInterval(timer);
    }, [refreshUsers]);

    const handleApprove = async (user: User) => {
        const role = assignRole[user.id] || Role.GV;
        const cls = assignClass[user.id] || '';
        await approveUser(user.id, role, cls);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Duyệt tài khoản</h2>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                        Duyệt các tài khoản đã đăng ký. Bạn chọn vai trò và phân công lớp, sau đó chấp nhận hoặc từ chối.
                    </p>
                </div>
                <button
                    onClick={() => refreshUsers()}
                    disabled={isLoading}
                    className="flex-shrink-0 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                    Tải lại danh sách
                </button>
            </div>

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

            {pendingUsers.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-gray-500 dark:text-gray-400">Không có tài khoản nào đang chờ duyệt.</p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Tổng số người dùng hiện có: <strong>{users.length}</strong>. Danh mục vai trò hiện tại trong hệ thống:
                    </p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                        {Object.entries(roleCounts).map(([role, count]) => (
                            <span key={role} className={`px-3 py-1 rounded-full text-sm font-medium ${role === Role.Pending ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                {role}: {count}
                            </span>
                        ))}
                    </div>
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        Chỉ tài khoản có vai trò <strong>{Role.Pending}</strong> mới hiện ở đây. Nếu người vừa đăng ký lại đang mang vai trò khác
                        (ví dụ <strong>{Role.GV}</strong>), tức là database chưa áp đúng vai trò mặc định — hãy chạy lại <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">schema.sql</code>
                        rồi <strong>xóa tài khoản thử cũ</strong> (Authentication → Users) và <strong>đăng ký mới từ form đăng ký</strong>. Nút <strong>Tải lại danh sách</strong> ở trên.
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800/50 shadow-sm border dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tên hiển thị</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Vai trò</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Lớp phụ trách</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {pendingUsers.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-100">{user.displayName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <select
                                                value={assignRole[user.id] || Role.GV}
                                                onChange={e => setAssignRole(prev => ({ ...prev, [user.id]: e.target.value as Role }))}
                                                className="px-2 py-1 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                                            >
                                                {Object.values(Role)
                                                    .filter(r => r !== Role.Pending)
                                                    .map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <select
                                                disabled={assignRole[user.id] !== Role.GV}
                                                value={assignClass[user.id] || ''}
                                                onChange={e => setAssignClass(prev => ({ ...prev, [user.id]: e.target.value }))}
                                                className={`px-2 py-1 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:bg-gray-100 dark:disabled:bg-gray-600`}
                                            >
                                                <option value="">Không có</option>
                                                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                            <button onClick={() => handleApprove(user)} disabled={isLoading} className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300">Chấp nhận</button>
                                            <button onClick={() => setConfirmReject(user)} disabled={isLoading} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">Từ chối</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserApprovalPage;
