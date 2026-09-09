import React, { useState, lazy, Suspense } from 'react';
import { ManagementTab, Role } from '../types';
import SettingsPage from './SettingsPage';
import UserManagementPage from './UserManagementPage';
import AuditLogPage from './AuditLogPage';
import { useAuth } from '../contexts/AuthContext';
import { ManagementSkeleton } from './skeletons';

const ArchiveManagementPage = lazy(() => import('./ArchiveManagementPage'));

const ManagementPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<ManagementTab>(() => {
        try {
            const stored = localStorage.getItem('mn_management_tab_v1');
            const isValid = stored && Object.values(ManagementTab).includes(stored as ManagementTab);
            if (!isValid) return ManagementTab.Classes;
            const restored = stored as ManagementTab;
            const adminOnlyTab = restored === ManagementTab.AuditLogs || restored === ManagementTab.Archive;
            if (adminOnlyTab && currentUser?.role !== Role.Admin) return ManagementTab.Classes;
            return restored;
        } catch {
            return ManagementTab.Classes;
        }
    });

    React.useEffect(() => {
        try {
            localStorage.setItem('mn_management_tab_v1', activeTab);
        } catch {
            // ignore quota/private-mode errors
        }
    }, [activeTab]);
    
    const TabButton: React.FC<{tab: ManagementTab, label: string}> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`${
                activeTab === tab
                    ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
            } whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm transition-colors`}
        >
            {label}
        </button>
    );

    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg transition-colors fade-in">
             <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                  <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto flex-nowrap hide-scrollbar" aria-label="Tabs">
                     <TabButton tab={ManagementTab.Classes} label="Lớp học" />
                     <TabButton tab={ManagementTab.Users} label="Người dùng" />
                     {currentUser?.role === Role.Admin && (
                        <>
                            <TabButton tab={ManagementTab.AuditLogs} label="Lịch sử" />
                            <TabButton tab={ManagementTab.Archive} label="Lưu trữ & Cài đặt" />
                        </>
                     )}
                  </nav>
            </div>
            
            {activeTab === ManagementTab.Classes && <SettingsPage />}
            {activeTab === ManagementTab.Users && <UserManagementPage />}
            {activeTab === ManagementTab.AuditLogs && currentUser?.role === Role.Admin && <AuditLogPage />}
            {activeTab === ManagementTab.Archive && currentUser?.role === Role.Admin && (
                 <Suspense fallback={<ManagementSkeleton />}>
                    <ArchiveManagementPage />
                </Suspense>
            )}
        </div>
    );
};

export default ManagementPage;