import React, { useState, Suspense, lazy } from 'react';
import ToastContainer from './components/ToastContainer';
import NotificationContainer from './components/NotificationContainer';
import { DataProvider, useData } from './contexts/DataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UIProvider, useUI } from './contexts/UIContext';
import { useTheme } from './contexts/ThemeContext';
import { View, Tab, Role } from './types';
import { SKELETONS } from './components/skeletons';
import OfflineIndicator from './components/OfflineIndicator';
import UpdateBanner from './components/UpdateBanner';
import ErrorBoundary from './components/ErrorBoundary';
import BrandLogo from './components/Logo';

const DailyRegistrationForm = lazy(() => import('./components/DailyRegistrationForm'));
const MultiDayRegistrationForm = lazy(() => import('./components/MultiDayRegistrationForm'));
const SummaryPage = lazy(() => import('./components/SummaryPage'));
const ListPage = lazy(() => import('./components/ListPage'));
const ManagementPage = lazy(() => import('./components/ManagementPage'));
const LoginPage = lazy(() => import('./components/LoginPage'));
const UserProfileDropdown = lazy(() => import('./components/UserProfileDropdown'));
const DashboardPage = lazy(() => import('./components/DashboardPage'));
const AnnouncementsPage = lazy(() => import('./components/AnnouncementsPage'));

const AppContent: React.FC = () => {
  const { currentUser, authLoading } = useAuth();
  const { unreadAnnouncementsCount } = useData();
  const { isOffline } = useUI();
  const [view, setView] = useState<View>(View.Dashboard);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Daily);
  const { theme, toggleTheme } = useTheme();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  const Logo = () => <BrandLogo compact />;

  const ICONS: { [key in View]: React.ReactElement } = {
    [View.Dashboard]: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
    ),
    [View.Register]: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    [View.Announcements]: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-3.174 7.625-7.25V3a1 1 0 10-2 0v.75c0 2.9-2.31 5.25-5.25 5.25H8" />
      </svg>
    ),
    [View.List]: (
       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    [View.Summary]: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    [View.Management]: (
       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  };

  const NAV_ITEMS: { [key in View]: string } = {
    [View.Dashboard]: 'Bảng tin',
    [View.Register]: 'Đăng ký',
    [View.Announcements]: 'Thông báo',
    [View.List]: 'Danh sách',
    [View.Summary]: 'Báo cáo',
    [View.Management]: 'Quản lý',
  };

  const Fallback = SKELETONS[view] || <div />;

  const ThemeToggle = () => (
    <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Toggle theme">
        {theme === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        )}
    </button>
  );

  const getNavOrderForRole = (role: Role): View[] => {
      switch (role) {
          case Role.Admin:
              return [View.Dashboard, View.Register, View.Announcements, View.List, View.Summary, View.Management];
          case Role.BGH:
              return [View.Dashboard, View.Announcements, View.List, View.Summary];
          case Role.KT_CD:
              return [View.Dashboard, View.Announcements, View.List, View.Summary];
          case Role.GV:
              return [View.Dashboard, View.Register, View.Announcements, View.List];
          default:
              return [];
      }
  };

  const navOrder = getNavOrderForRole(currentUser.role);

  const renderNav = (isMobile: boolean) => {
    const navItemsToRender = navOrder;
    
    return (
       <div className={isMobile ? `flex items-start justify-around text-xs font-medium` : 'hidden sm:flex space-x-1'}>
        {navItemsToRender.map(navItem => {
          const baseClasses = isMobile ? "flex flex-col items-center justify-center pt-2 pb-1 space-y-1 w-full relative" : "relative flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors space-x-2";
          const activeClasses = isMobile ? "text-teal-600 dark:text-teal-400" : "bg-teal-600 text-white shadow";
          const inactiveClasses = isMobile ? "text-gray-500 dark:text-gray-400" : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700";
          const hasBadge = navItem === View.Announcements && unreadAnnouncementsCount > 0;
          
          return (
            <button
              key={navItem}
              onClick={() => setView(navItem)}
              className={`${baseClasses} ${view === navItem ? activeClasses : inactiveClasses}`}
            >
              {ICONS[navItem]}
              <span className={isMobile ? 'text-xs' : ''}>{NAV_ITEMS[navItem]}</span>
{hasBadge && (
            isMobile ? (
              <span className="absolute top-0.5 right-[calc(50%-1.5rem)] min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-gray-800">
                {unreadAnnouncementsCount > 9 ? '9+' : unreadAnnouncementsCount}
              </span>
            ) : (
              <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-teal-600">
                {unreadAnnouncementsCount > 9 ? '9+' : unreadAnnouncementsCount}
              </span>
            )
          )}
            </button>
          )
        })}
      </div>
    )
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
      <ToastContainer />
      <NotificationContainer />
      <UpdateBanner />
      <OfflineIndicator isOffline={isOffline} />

      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-20 transition-colors no-print h-[56px] flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex justify-between items-center">
            <Logo />
            <div className="flex items-center space-x-2">
              <nav className="hidden sm:flex space-x-1">
                {renderNav(false)}
              </nav>
              <div className="border-l border-gray-200 dark:border-gray-600 ml-2 pl-2 flex items-center space-x-2">
                <ThemeToggle />
                <Suspense fallback={<div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />}>
                  <UserProfileDropdown />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className={`max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-8 ${isOffline ? 'pb-offline-banner' : ''}`}>
        <Suspense fallback={Fallback}>
          {view === View.Dashboard && <DashboardPage setView={setView} />}
          {view === View.Register && (
            <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg transition-colors fade-in">
              <div className="border-b border-gray-200 dark:border-gray-700 mb-6 no-print">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab(Tab.Daily)}
                    className={`${
                      activeTab === Tab.Daily
                        ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                  >
                    Đăng ký hàng ngày
                  </button>
                  <button
                    onClick={() => setActiveTab(Tab.MultiDay)}
                    className={`${
                      activeTab === Tab.MultiDay
                        ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                  >
                    Đăng ký nhiều ngày
                  </button>
                </nav>
              </div>
              {activeTab === Tab.Daily ? (
                <DailyRegistrationForm />
              ) : (
                <MultiDayRegistrationForm />
              )}
            </div>
          )}
          
          {view === View.Summary && (
              <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg transition-colors fade-in">
              <SummaryPage setView={setView} />
            </div>
          )}
          {view === View.List && (
              <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg transition-colors fade-in">
              <ListPage setView={setView} />
            </div>
          )}
          {view === View.Announcements && (
            <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg transition-colors fade-in">
              <AnnouncementsPage />
            </div>
          )}
          {view === View.Management && (
              <ManagementPage />
          )}
        </Suspense>
      </main>
      
      {/* Bottom Navigation for Mobile */}
      <div className={`sm:hidden fixed left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 z-20 transition-all duration-300 no-print mobile-nav ${isOffline ? 'pb-offline-banner' : 'bottom-0'}`}>
        {renderNav(true)}
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <UIProvider>
    <AuthProvider>
      <DataProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </DataProvider>
    </AuthProvider>
  </UIProvider>
);

export default App;
