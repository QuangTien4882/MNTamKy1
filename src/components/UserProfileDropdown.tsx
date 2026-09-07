import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { Role } from '../types';

const UserProfileDropdown: React.FC = () => {
    const { currentUser, signOutUser, changePassword } = useAuth();
    const { addToast } = useUI();
    const [isOpen, setIsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const handleSignOut = async () => {
        try {
            await signOutUser();
            addToast('Đăng xuất thành công.', 'success');
        } catch (error) {
            addToast('Lỗi khi đăng xuất.', 'error');
        }
    };
    
    const openChangePasswordModal = () => {
        setIsOpen(false);
        setIsModalOpen(true);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
    };

    const handlePasswordChangeSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setPasswordError('Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('Mật khẩu xác nhận không khớp.');
            return;
        }
        setPasswordError('');
        setIsChangingPassword(true);
        try {
            await changePassword(newPassword);
            addToast('Đổi mật khẩu thành công!', 'success');
            setIsModalOpen(false);
        } catch (err) {
            console.error(err);
            setPasswordError('Đã xảy ra lỗi khi đổi mật khẩu. Vui lòng đăng xuất và đăng nhập lại, sau đó thử lại.');
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (!currentUser) return null;

    return (
        <div className="relative" ref={wrapperRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {currentUser.displayName.charAt(0).toUpperCase()}
                </div>
                 <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:inline">{currentUser.displayName}</span>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400 hidden sm:inline" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg z-30 border dark:border-gray-700 dropdown-content origin-top-right">
                    <div className="px-4 py-3 border-b dark:border-gray-700">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={currentUser.displayName}>{currentUser.displayName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{currentUser.role}</p>
                        {currentUser.role === Role.GV && currentUser.assignedClass && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Lớp: {currentUser.assignedClass}</p>
                        )}
                    </div>
                    <div className="py-1">
                        <button onClick={openChangePasswordModal} className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Đổi mật khẩu</button>
                        <button onClick={handleSignOut} className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Đăng xuất</button>
                    </div>
                </div>
            )}
            
            {isModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
                    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="password-modal-title" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm m-4 modal-content">
                        <h3 id="password-modal-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">Đổi mật khẩu</h3>
                        <form onSubmit={handlePasswordChangeSubmit} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mật khẩu mới</label>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Xác nhận mật khẩu mới</label>
                                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md" />
                            </div>
                            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                            <div className="mt-6 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                                <button type="submit" disabled={isChangingPassword} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400">{isChangingPassword ? 'Đang lưu...' : 'Lưu'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfileDropdown;