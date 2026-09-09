import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { MealType, MealRegistration } from '../types';
import CustomDatePicker from './CustomDatePicker';
import ClassFilterDropdown from './ClassFilterDropdown';
import SummaryTableRow from './SummaryTableRow';
import SummaryCard from './SummaryCard';
import { SummaryData, TableRowsSkeleton } from './SummaryPage';

const LoadingSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


const ArchiveManagementPage: React.FC = () => {
    const { classes, getArchivedRegistrations, archiveRegistrationsByMonth, deleteArchivedRegistrations, checkBackupNow } = useData();
    const { addToast } = useUI();
    
    // State for Archiving
    const [targetDate, setTargetDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d;
    });
    const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    // State for viewing archives
    const [archiveFilter, setArchiveFilter] = useState({ from: '', to: '' });
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [archivedData, setArchivedData] = useState<SummaryData[]>([]);
    const [isFetchingArchive, setIsFetchingArchive] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isDeletingArchive, setIsDeletingArchive] = useState(false);
    
    // State for Settings
    const [reminderDay, setReminderDay] = useState('1');
    const [reminderHour, setReminderHour] = useState('8');

    useEffect(() => {
        try {
            const settingsStr = localStorage.getItem('backupSettings_v1');
            if (settingsStr) {
                const settings = JSON.parse(settingsStr);
                setReminderDay(settings.day || '1');
                setReminderHour(settings.hour || '8');
            }
        } catch (e) {
            console.error("Failed to load backup settings from localStorage", e);
        }
    }, []);

    const handleSaveSettings = () => {
        try {
            const settings = { day: reminderDay, hour: reminderHour };
            localStorage.setItem('backupSettings_v1', JSON.stringify(settings));
            addToast('Đã lưu cài đặt nhắc nhở sao lưu.', 'success');
            // Apply the new rule immediately instead of waiting for reload.
            checkBackupNow();
        } catch (e) {
            console.error("Failed to save backup settings to localStorage", e);
            addToast('Không thể lưu cài đặt.', 'error');
        }
    };


    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    }, []);
    const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

    const dayOptions = useMemo(() => {
        const options = [];
        for (let i = 1; i <= 31; i++) {
            options.push(<option key={i} value={String(i)}>Ngày {i}</option>);
        }
        options.push(<option key="last" value="last">Ngày cuối tháng</option>);
        return options;
    }, []);

    const hourOptions = useMemo(() => {
        const options = [];
        for (let i = 6; i <= 18; i++) {
             options.push(<option key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</option>);
        }
        return options;
    }, []);


    const handleArchive = async () => {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;
        setIsArchiving(true);
        try {
            await archiveRegistrationsByMonth(year, month);
            setIsArchiveConfirmOpen(false);
        } finally {
            setIsArchiving(false);
        }
    };

    const handleFetchArchive = async () => {
        if (!archiveFilter.from || !archiveFilter.to) {
            addToast("Vui lòng chọn cả ngày bắt đầu và ngày kết thúc.", "error");
            return;
        }
        setIsFetchingArchive(true);
        const { registrations } = await getArchivedRegistrations({
            dateRange: archiveFilter,
            classNames: selectedClasses.length > 0 ? selectedClasses : undefined,
            getAll: true
        });

        const dataByDateAndClass = registrations.reduce((acc: Record<string, SummaryData>, reg: MealRegistration) => {
            const key = `${reg.date}-${reg.className}`;
            if (!acc[key]) {
                acc[key] = { date: reg.date, className: reg.className, meals: {} };
            }
            acc[key].meals[reg.mealType] = { 
                count: reg.count,
                registeredBy: reg.registeredBy
            };
            return acc;
        }, {} as Record<string, SummaryData>);
    
        const sortedData = (Object.values(dataByDateAndClass) as SummaryData[]).sort((a, b) => b.date.localeCompare(a.date) || a.className.localeCompare(b.className));
        setArchivedData(sortedData);
        setIsFetchingArchive(false);
    }

    const handleDeleteArchive = async () => {
        if (!archiveFilter.from || !archiveFilter.to) {
            addToast("Vui lòng chọn cả ngày bắt đầu và ngày kết thúc.", "error");
            return;
        }
        setIsDeletingArchive(true);
        try {
            const deletedCount = await deleteArchivedRegistrations({
                dateRange: archiveFilter,
                classNames: selectedClasses.length > 0 ? selectedClasses : undefined
            });
            if (deletedCount > 0) {
                setArchivedData([]);
                setIsDeleteConfirmOpen(false);
            }
        } finally {
            setIsDeletingArchive(false);
        }
    }

    return (
        <div className="space-y-8">
             {isArchiveConfirmOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg m-4 modal-content">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Xác nhận Lưu trữ</h3>
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            <p>Bạn có chắc chắn muốn lưu trữ toàn bộ dữ liệu suất ăn của <span className="font-semibold">tháng {targetDate.getMonth() + 1}/{targetDate.getFullYear()}</span>?</p>
                            <p className="mt-2 text-red-600 dark:text-red-400 font-semibold">
                                Cảnh báo: Hành động này sẽ <strong className="underline">di chuyển</strong> dữ liệu ra khỏi báo cáo hàng ngày và <strong className="underline">không thể hoàn tác</strong>. Dữ liệu vẫn có thể được xem trong mục "Xem dữ liệu đã lưu trữ".
                            </p>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setIsArchiveConfirmOpen(false)} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                            <button onClick={handleArchive} disabled={isArchiving} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 flex items-center">{isArchiving ? <LoadingSpinner /> : 'Xác nhận & Lưu trữ'}</button>
                        </div>
                    </div>
                </div>
            )}

            {isDeleteConfirmOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg m-4 modal-content">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Xác nhận Xóa dữ liệu lưu trữ</h3>
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            <p>Bạn có chắc chắn muốn <strong className="text-red-600 dark:text-red-400">xóa vĩnh viễn</strong> toàn bộ dữ liệu lưu trữ trong khoảng thời gian từ <span className="font-semibold">{archiveFilter.from}</span> đến <span className="font-semibold">{archiveFilter.to}</span>{selectedClasses.length > 0 && <> thuộc {selectedClasses.length} lớp đang chọn</>}?</p>
                            <p className="mt-2 text-red-600 dark:text-red-400 font-semibold">
                                Cảnh báo: Hành động này <strong className="underline">không thể hoàn tác</strong>. Dữ liệu đã xóa sẽ không thể xem lại được nữa.
                            </p>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setIsDeleteConfirmOpen(false)} disabled={isDeletingArchive} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                            <button onClick={handleDeleteArchive} disabled={isDeletingArchive} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 flex items-center">{isDeletingArchive ? <LoadingSpinner /> : 'Xóa vĩnh viễn'}</button>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Quản lý Lưu trữ & Cài đặt</h2>
                <p className="mt-1 text-gray-600 dark:text-gray-400">Lưu trữ dữ liệu cũ và tùy chỉnh các cài đặt liên quan.</p>
            </div>
            
             <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border dark:border-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cài đặt nhắc nhở sao lưu</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Chọn thời điểm bạn muốn nhận thông báo nhắc nhở sao lưu dữ liệu của tháng trước.
                </p>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                     <div>
                        <label htmlFor="reminderDay" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                           Ngày nhắc nhở
                        </label>
                        <select
                            id="reminderDay"
                            value={reminderDay}
                            onChange={e => setReminderDay(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                        >
                            {dayOptions}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="reminderHour" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                           Giờ nhắc nhở
                        </label>
                        <select
                            id="reminderHour"
                            value={reminderHour}
                            onChange={e => setReminderHour(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                        >
                            {hourOptions}
                        </select>
                    </div>
                </div>
                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSaveSettings}
                        className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    >
                        Lưu cài đặt
                    </button>
                </div>
            </div>


            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tạo bản lưu trữ mới</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Chọn tháng và năm bạn muốn lưu trữ. Chỉ nên lưu trữ dữ liệu của các tháng đã kết thúc.</p>
                <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2">
                         <select value={targetDate.getMonth()} onChange={e => setTargetDate(new Date(targetDate.getFullYear(), parseInt(e.target.value), 1))} className="px-3 py-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md">
                            {monthOptions.map(m => <option key={m} value={m-1}>Tháng {m}</option>)}
                        </select>
                        <select value={targetDate.getFullYear()} onChange={e => setTargetDate(new Date(parseInt(e.target.value), targetDate.getMonth(), 1))} className="px-3 py-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md">
                           {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <button onClick={() => setIsArchiveConfirmOpen(true)} className="px-4 py-2 font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 w-full sm:w-auto">Lưu trữ tháng {targetDate.getMonth() + 1}/{targetDate.getFullYear()}</button>
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Xem dữ liệu đã lưu trữ</h3>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border dark:border-gray-700 rounded-lg space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0 pr-4">Từ ngày</label>
                            <CustomDatePicker value={archiveFilter.from} onChange={d => setArchiveFilter(r => ({ ...r, from: d }))} />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0 pr-4">Đến ngày</label>
                            <CustomDatePicker value={archiveFilter.to} onChange={d => setArchiveFilter(r => ({ ...r, to: d }))} />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0 pr-4">Lớp</label>
                            <ClassFilterDropdown classes={classes} selectedClasses={selectedClasses} onSelectionChange={setSelectedClasses} />
                        </div>
                    </div>
                     <div className="flex justify-end gap-3">
                        <button onClick={handleFetchArchive} disabled={isFetchingArchive} className="px-6 py-2 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center w-32">{isFetchingArchive ? <LoadingSpinner/> : 'Xem báo cáo'}</button>
                        <button onClick={() => setIsDeleteConfirmOpen(true)} disabled={!archiveFilter.from || !archiveFilter.to || isDeletingArchive} className="px-6 py-2 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 flex items-center justify-center w-44">{isDeletingArchive ? <LoadingSpinner/> : 'Xóa dữ liệu đã lưu trữ'}</button>
                    </div>
                </div>
                <div className="mt-6 bg-white dark:bg-gray-800 md:shadow-lg rounded-lg overflow-hidden">
                    {isFetchingArchive ? <TableRowsSkeleton /> : archivedData.length > 0 ? (
                         <>
                            <div className="desktop-table overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Lớp</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ngày</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{MealType.KidsBreakfast}</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{MealType.KidsLunch}</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{MealType.TeachersLunch}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {archivedData.map(item => (
                                            <SummaryTableRow 
                                                key={`${item.date}-${item.className}`} 
                                                item={item} 
                                                isReadOnly={true}
                                                // Dummy props for read-only view
                                                isHighlighted={false} isSelected={false} isEditing={false} isSaving={false}
                                                editedMeals={null} disabled={true} onSelectRow={() => {}} onStartEdit={() => {}}
                                                onDelete={() => {}} onSave={() => {}} onCancel={() => {}} onMealChange={() => {}}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mobile-card-view p-4 md:p-0">
                                {archivedData.map(item => (
                                    <SummaryCard 
                                        key={`${item.date}-${item.className}`} 
                                        item={item} 
                                        isReadOnly={true}
                                        // Dummy props
                                        isHighlighted={false} isSelected={false} isEditing={false} isSaving={false}
                                        editedMeals={null} disabled={true} onSelectRow={() => {}} onStartEdit={() => {}}
                                        onDelete={() => {}} onSave={() => {}} onCancel={() => {}} onMealChange={() => {}}
                                    />
                                ))}
                            </div>
                         </>
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-10">Không có dữ liệu lưu trữ nào phù hợp với bộ lọc.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ArchiveManagementPage;
