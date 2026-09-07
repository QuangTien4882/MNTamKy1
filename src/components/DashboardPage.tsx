import React, { useState, useEffect } from 'react';
import { View, Role, MealType } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { DashboardSkeleton } from './skeletons';

interface DashboardPageProps {
    setView: (view: View) => void;
}

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const BackupPrompt: React.FC = () => {
    const { classes, exportData, dismissBackupPrompt } = useData();
    const [isLoading, setIsLoading] = useState(false);

    const handleBackup = async (format: 'csv' | 'pdf') => {
        setIsLoading(true);
        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const from = formatDate(prevMonth);
        const to = formatDate(new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0));

        try {
            await exportData({
                format,
                dateRange: { from, to },
                classNames: classes.map(c => c.name)
            });
            dismissBackupPrompt();
        } finally {
            setIsLoading(false);
        }
    };

    const now = new Date();
    const prevMonthName = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString('vi-VN', { month: 'long', year: 'numeric' });

    return (
        <div className="bg-blue-50 dark:bg-blue-900/60 p-5 rounded-xl shadow-lg border-2 border-dashed border-blue-200 dark:border-blue-800 fade-in">
            <div className="flex items-start">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500 mr-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 001.414 1.414L10 9.414l2.293 2.293a1 1 0 001.414-1.414l-3-3z" clipRule="evenodd" />
                </svg>
                <div>
                    <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200">Đã đến lúc sao lưu dữ liệu!</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Hãy tạo bản sao lưu dữ liệu đăng ký suất ăn của <span className="font-semibold">{prevMonthName}</span> để đảm bảo an toàn.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <button onClick={() => handleBackup('csv')} disabled={isLoading} className="flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400">
                            {isLoading && <LoadingSpinner />} Xuất Excel
                        </button>
                        <button onClick={() => handleBackup('pdf')} disabled={isLoading} className="flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
                             {isLoading && <LoadingSpinner />} Xuất PDF
                        </button>
                         <button onClick={dismissBackupPrompt} disabled={isLoading} className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700">
                            Bỏ qua
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LoadingSpinner = () => (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


const StatCard: React.FC<{ title: string, value: string, iconContainer: React.ReactNode, children?: React.ReactNode, className?: string }> = ({ title, value, iconContainer, children, className }) => (
    <div className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col ${className}`}>
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
            </div>
            {iconContainer}
        </div>
        {children && <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">{children}</div>}
    </div>
);

const TotalMealsIconContainer: React.FC = () => (
    <div className="bg-teal-100 dark:bg-teal-900/50 p-3 rounded-full">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    </div>
);

const MissingClassesIconContainer: React.FC<{ count: number }> = ({ count }) => {
    if (count > 0) {
        return (
            <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
        );
    }
    return (
        <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        </div>
    );
};


const ActionButton: React.FC<{ onClick: () => void, text: string, icon: React.ReactNode, className?: string, disabled?: boolean }> = ({ onClick, text, icon, className, disabled = false }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors ${className}`}
    >
        {icon}
        {text}
    </button>
);

const DashboardPage: React.FC<DashboardPageProps> = ({ setView }) => {
    const { classes, getRegistrations, getRegisteredClasses, requestEdit, dataVersion, showBackupPrompt } = useData();
    const { currentUser } = useAuth();
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (classes.length === 0) {
                setIsLoading(false);
                return;
            };
            setIsLoading(true);

            let today = new Date();
            if (today.getDay() === 0) today.setDate(today.getDate() + 1);
            const currentDayStr = formatDate(today);
            
            let tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = formatDate(tomorrow);

            const { registrations } = await getRegistrations({ dates: [currentDayStr, tomorrowStr], getAll: true });

            const totals = {
                [MealType.KidsLunch]: 0,
                [MealType.TeachersLunch]: 0,
                [MealType.KidsBreakfast]: 0,
            };
            const registeredClassesToday = new Set<string>();

            // Cross-class status via RPC (works for teachers too, whose RLS only
            // exposes their own class rows). Fall back to row-based inference.
            const registeredFromRpc = await getRegisteredClasses(currentDayStr);
            if (registeredFromRpc.length > 0) {
                registeredFromRpc.forEach(name => registeredClassesToday.add(name));
            } else {
                registrations.forEach(reg => {
                    if (reg.date === currentDayStr) {
                        if (reg.mealType === MealType.KidsLunch && reg.count > 0) {
                            registeredClassesToday.add(reg.className);
                        }
                        if (reg.mealType === MealType.TeachersLunch && reg.count > 0) {
                            registeredClassesToday.add(reg.className);
                        }
                    }
                });
            }

            registrations.forEach(reg => {
                if (reg.date === currentDayStr) {
                    if (reg.mealType === MealType.KidsLunch) {
                        totals[MealType.KidsLunch] += reg.count;
                    }
                    if (reg.mealType === MealType.TeachersLunch) {
                        totals[MealType.TeachersLunch] += reg.count;
                    }
                } else if (reg.date === tomorrowStr && reg.mealType === MealType.KidsBreakfast) {
                    totals[MealType.KidsBreakfast] += reg.count;
                }
            });
            
            const missingClasses = classes
                .map(c => c.name)
                .filter(name => !registeredClassesToday.has(name));
                
            const isTeacherClassRegistered = !!(currentUser?.role === Role.GV && registeredClassesToday.has(currentUser.assignedClass || ''));
            
            setDashboardData({
                totals,
                totalMeals: Object.values(totals).reduce((a, b) => a + b, 0),
                missingClasses,
                isTeacherClassRegistered,
                currentDay: currentDayStr,
            });
            setIsLoading(false);
        };

        fetchDashboardData();
    }, [classes, getRegistrations, getRegisteredClasses, currentUser, dataVersion]);
    
    const handleEdit = () => {
        if (dashboardData?.currentDay && currentUser?.assignedClass) {
            requestEdit(currentUser.assignedClass, dashboardData.currentDay);
            setView(View.Register);
        }
    }

    if (isLoading || !dashboardData) {
        return <DashboardSkeleton />;
    }

    const { totals, totalMeals, missingClasses, isTeacherClassRegistered, currentDay } = dashboardData;
    
    const todayString = new Date(currentDay + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const missingClassesCardClass = missingClasses.length > 0
    ? 'bg-red-50 dark:bg-red-900/60 border border-red-200 dark:border-red-800'
    : 'bg-green-50 dark:bg-green-900/60 border border-green-200 dark:border-green-800';

    return (
        <div className="space-y-8 fade-in">
            {showBackupPrompt && <BackupPrompt />}
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Bảng điều khiển</h1>
                <p className="mt-1 text-gray-600 dark:text-gray-400">Tổng quan đăng ký suất ăn cho {todayString}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard 
                    title="Tổng suất ăn đăng ký" 
                    value={totalMeals.toLocaleString('vi-VN')}
                    iconContainer={<TotalMealsIconContainer />}
                >
                   <div className="space-y-2">
                     <p className="flex justify-between"><span>{MealType.KidsLunch}:</span> <span className="font-semibold">{totals[MealType.KidsLunch].toLocaleString('vi-VN')}</span></p>
                     <p className="flex justify-between"><span>{MealType.TeachersLunch}:</span> <span className="font-semibold">{totals[MealType.TeachersLunch].toLocaleString('vi-VN')}</span></p>
                     <p className="flex justify-between"><span>{MealType.KidsBreakfast} (cho ngày mai):</span> <span className="font-semibold">{totals[MealType.KidsBreakfast].toLocaleString('vi-VN')}</span></p>
                   </div>
                </StatCard>
                <StatCard 
                    title="Các lớp chưa đăng ký"
                    value={missingClasses.length.toLocaleString('vi-VN')}
                    iconContainer={<MissingClassesIconContainer count={missingClasses.length} />}
                    className={missingClassesCardClass}
                >
                     {missingClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                           {missingClasses.map((c: string) => (
                             <span key={c} className="px-2.5 py-1 rounded-full bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-100 font-semibold text-xs">
                                {c}
                             </span>
                           ))}
                        </div>
                    ) : <p className="text-green-600 dark:text-green-400 font-medium">Tuyệt vời! Tất cả các lớp đã đăng ký.</p>}
                </StatCard>
            </div>
            
            {/* Role-specific Card */}
            {currentUser?.role === Role.GV ? (
                isTeacherClassRegistered ? (
                    <div className="bg-green-50 dark:bg-green-900/60 p-6 rounded-xl shadow-lg border border-green-200 dark:border-green-800">
                        <h3 className="text-lg font-bold text-green-800 dark:text-green-200">Lớp {currentUser.assignedClass} đã đăng ký!</h3>
                         <div className="mt-6 flex gap-3">
                            <ActionButton onClick={handleEdit} text="Chỉnh sửa" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>} className="bg-blue-600 hover:bg-blue-700" />
                            <ActionButton onClick={() => setView(View.List)} text="Xem danh sách" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>} className="bg-gray-600 hover:bg-gray-700" />
                        </div>
                    </div>
                ) : (
                    <div className="bg-red-50 dark:bg-red-900/60 p-6 rounded-xl shadow-lg border border-red-200 dark:border-red-800 flex flex-col items-center text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-xl font-bold text-red-800 dark:text-red-200">Lớp {currentUser.assignedClass} chưa đăng ký cho hôm nay!</h3>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-2">Vui lòng đăng ký suất ăn để đảm bảo các bé có bữa ăn đầy đủ.</p>
                        <div className="mt-6">
                            <ActionButton onClick={() => setView(View.Register)} text="Đăng ký ngay" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>} className="bg-teal-600 hover:bg-teal-700 text-base py-3 px-6" />
                        </div>
                    </div>
                )
            ) : (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                     <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Thao tác nhanh</h3>
                     <div className="mt-4 flex flex-wrap gap-4">
                        <ActionButton onClick={() => setView(View.List)} text="Xem danh sách" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>} className="bg-teal-600 hover:bg-teal-700" />
                        <ActionButton onClick={() => setView(View.Summary)} text="Xem báo cáo" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>} className="bg-blue-600 hover:bg-blue-700" />
                     </div>
                </div>
            )}

        </div>
    );
};

export default DashboardPage;
