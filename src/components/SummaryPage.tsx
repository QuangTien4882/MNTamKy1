import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { MealType, View, MealRegistration, Role } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import CustomDatePicker from './CustomDatePicker';
import ClassFilterDropdown from './ClassFilterDropdown';
import SummaryTableRow from './SummaryTableRow';
import SummaryCard from './SummaryCard';

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekDateRange = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const from = new Date(today);
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    from.setDate(today.getDate() + diff);
    
    const to = new Date(from);
    to.setDate(from.getDate() + 5);

    return { from: formatDate(from), to: formatDate(to) }
}

const getMonthDateRange = () => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: formatDate(from), to: formatDate(to) };
}

const EmptyState: React.FC<{onRegisterClick: () => void}> = ({onRegisterClick}) => (
    <div className="text-center py-10 px-6 fade-in">
        <svg className="mx-auto h-32 w-32 text-gray-300 dark:text-gray-500" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M51 59H13c-2.2 0-4-1.8-4-4V9c0-2.2 1.8-4 4-4h23.2c.8 0 1.6.3 2.2.9l10.8 10.8c.6.6.9 1.4.9 2.2V55c0 2.2-1.8 4-4 4z" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M36 5v12c0 1.1.9 2 2 2h12M20 31h24M20 41h14" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">Không có dữ liệu</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Không có suất ăn nào phù hợp với bộ lọc hiện tại.</p>
        <div className="mt-6">
            <button
                type="button"
                onClick={onRegisterClick}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                Đi đến trang đăng ký
            </button>
        </div>
    </div>
);

export interface SummaryData {
    date: string;
    className: string;
    meals: { [key in MealType]?: { count: number; registeredBy?: string; } };
}

const ITEMS_PER_PAGE = 30;

export const TableRowsSkeleton = () => (
    <div className="p-4 space-y-2">
        {[...Array(10)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        ))}
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

const SortableHeader: React.FC<{
    title: string;
    sortKey: string;
    sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
    onSort: (key: string) => void;
    className?: string;
}> = ({ title, sortKey, sortConfig, onSort, className = '' }) => {
    const isSorted = sortConfig?.key === sortKey;
    const directionIcon = sortConfig?.direction === 'asc' ? '▲' : '▼';

    return (
        <th scope="col" className={`px-6 py-3 text-center align-top text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer ${className}`} onClick={() => onSort(sortKey)}>
            <div className="flex items-center justify-center space-x-1">
                <span>{title}</span>
                <span className={`transition-opacity duration-200 ${isSorted ? 'opacity-100' : 'opacity-30'}`}>{directionIcon}</span>
            </div>
        </th>
    );
};


const SummaryPage: React.FC<{setView: (view: View) => void}> = ({setView}) => {
  const { classes, dataVersion, recentlyUpdatedKeys, getRegistrations, deleteRegistrations, deleteMultipleRegistrationsByDate, updateRegistrations, exportData } = useData();
  const { currentUser } = useAuth();
  const { addToast, isLoading: isContextLoading } = useUI();
  
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  
  const [registrations, setRegistrations] = useState<MealRegistration[]>([]);
  const [reportTotals, setReportTotals] = useState<Record<MealType, number> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });


  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [deletingItem, setDeletingItem] = useState<{className: string, date: string} | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);
  const [editedMeals, setEditedMeals] = useState<{ [key in MealType]?: string } | null>(null);
  const [originalRegistrationsForEdit, setOriginalRegistrationsForEdit] = useState<MealRegistration[] | null>(null);

  const observer = useRef<IntersectionObserver | null>(null);
  // Monotonic id: only the latest filter/data request may apply its result.
  const listRequestIdRef = useRef(0);
  const totalsRequestIdRef = useRef(0);

  const isReadOnly = currentUser?.role === Role.BGH || currentUser?.role === Role.KT_CD;

  useEffect(() => {
    if (classes.length > 0) {
        setSelectedClasses(classes.map(c => c.name));
    }
  }, [classes]);

  const fetchMoreRegistrations = useCallback(async () => {
    if (isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);
    try {
        const { registrations: newRegistrations, hasMore: newHasMore } = await getRegistrations({
            dateRange: (dateRange.from && dateRange.to) ? dateRange : undefined,
            classNames: selectedClasses,
            limit: ITEMS_PER_PAGE,
            offset,
            skipCount: true
        });
        setRegistrations(prev => [...prev, ...newRegistrations]);
        setOffset(offset + newRegistrations.length);
        setHasMore(newHasMore);
    } catch (error) {
        console.error("Failed to fetch more registrations", error);
        addToast("Không thể tải thêm dữ liệu.", "error");
    } finally {
        setIsFetchingMore(false);
    }
  }, [isFetchingMore, hasMore, getRegistrations, dateRange, selectedClasses, offset, addToast]);


  const loaderRef = useCallback((node: HTMLElement | null) => {
      if (isLoading || isFetchingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting && hasMore) {
              fetchMoreRegistrations();
          }
      });
      if (node) observer.current.observe(node);
  }, [isLoading, isFetchingMore, hasMore, fetchMoreRegistrations]);

  useEffect(() => {
    const requestId = ++totalsRequestIdRef.current;
    const fetchTotals = async () => {
        if (!selectedClasses.length || !classes.length) {
            setReportTotals(null);
            return;
        }

        const { registrations: allRegs } = await getRegistrations({
            dateRange: (dateRange.from && dateRange.to) ? dateRange : undefined,
            classNames: selectedClasses,
            getAll: true
        });
        if (requestId !== totalsRequestIdRef.current) return;

        const totals = allRegs.reduce((acc, reg) => {
            acc[reg.mealType] = (acc[reg.mealType] || 0) + reg.count;
            return acc;
        }, {} as Record<MealType, number>);
        setReportTotals(totals);
    };
    
    if (classes.length > 0 && selectedClasses.length > 0) {
        fetchTotals();
    } else if (classes.length > 0 && selectedClasses.length === 0) {
        setReportTotals(null);
    }
  }, [selectedClasses, dateRange, getRegistrations, dataVersion, classes]);


  useEffect(() => {
    const requestId = ++listRequestIdRef.current;
    // This effect handles fetching data when filters change.
    setRegistrations([]);
    setOffset(0);
    setHasMore(true);
    setSelectedRows(new Set());
    setEditingRowKey(null);
    
    if (classes.length > 0 && selectedClasses.length > 0) {
        setIsLoading(true);
        getRegistrations({
            dateRange: (dateRange.from && dateRange.to) ? dateRange : undefined,
            classNames: selectedClasses,
            limit: ITEMS_PER_PAGE,
            offset: 0,
            skipCount: false
        }).then(({ registrations: newRegistrations, totalCount, hasMore: newHasMore }) => {
            if (requestId !== listRequestIdRef.current) return;
            setRegistrations(newRegistrations);
            setTotalRecords(totalCount);
            setOffset(newRegistrations.length);
            setHasMore(newHasMore);
        }).catch((error) => {
            if (requestId !== listRequestIdRef.current) return;
            console.error("Failed to fetch registrations", error);
            addToast("Không thể tải dữ liệu.", "error");
        }).finally(() => {
            if (requestId === listRequestIdRef.current) {
                setIsLoading(false);
            }
        });
    } else if (classes.length > 0 && selectedClasses.length === 0) {
        setRegistrations([]);
        setTotalRecords(0);
        setIsLoading(false);
    }
  }, [dateRange, selectedClasses, classes, dataVersion, getRegistrations, addToast]);


  const { paginatedData, isAllOnPageSelected } = useMemo(() => {
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
    
    const classOrder = classes.map(c => c.name);
    
    const sortedData = (Object.values(dataByDateAndClass) as SummaryData[]).sort((a, b) => {
        if (sortConfig) {
            let aValue: string | number;
            let bValue: string | number;

            if (sortConfig.key === 'className' || sortConfig.key === 'date') {
                aValue = a[sortConfig.key];
                bValue = b[sortConfig.key];
            } else { // It's a meal type
                aValue = a.meals[sortConfig.key as MealType]?.count || 0;
                bValue = b.meals[sortConfig.key as MealType]?.count || 0;
            }
            
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        }
        // Secondary sort
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return classOrder.indexOf(a.className) - classOrder.indexOf(b.className);
    });


    const paginatedKeys = new Set(sortedData.map(item => `${item.date}-${item.className}`));
    const isAllOnPageSelected = sortedData.length > 0 && [...paginatedKeys].every(key => selectedRows.has(key));

    return { paginatedData: sortedData, isAllOnPageSelected };
  }, [registrations, classes, selectedRows, sortConfig]);
  
    const handleSelectRow = useCallback((rowKey: string) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(rowKey)) {
                newSet.delete(rowKey);
            } else {
                newSet.add(rowKey);
            }
            return newSet;
        });
    }, []);

    const handleSelectAllOnPage = useCallback(() => {
        const pageKeys = paginatedData.map(item => `${item.date}-${item.className}`);
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (isAllOnPageSelected) {
                pageKeys.forEach(key => newSet.delete(key));
            } else {
                pageKeys.forEach(key => newSet.add(key));
            }
            return newSet;
        });
    }, [paginatedData, isAllOnPageSelected]);
    
    const handleSort = useCallback((key: string) => {
        setSortConfig(prev => {
            if (prev?.key === key && prev.direction === 'asc') {
                return { key, direction: 'desc' };
            }
            return { key, direction: 'asc' };
        });
    }, []);

    const handleCancelEdit = useCallback(() => {
        setEditingRowKey(null);
        setEditedMeals(null);
        setOriginalRegistrationsForEdit(null);
    }, []);

    const handleStartEdit = useCallback(async (item: SummaryData) => {
        if (isReadOnly || isContextLoading) return;

        const key = `${item.date}-${item.className}`;
        handleCancelEdit();
        setIsLoading(true);
        setEditingRowKey(key);

        const initialMeals = {
            [MealType.KidsBreakfast]: String(item.meals[MealType.KidsBreakfast]?.count || 0),
            [MealType.KidsLunch]: String(item.meals[MealType.KidsLunch]?.count || 0),
            [MealType.TeachersLunch]: String(item.meals[MealType.TeachersLunch]?.count || 0),
        };
        setEditedMeals(initialMeals);
        
        try {
            const { registrations: originals } = await getRegistrations({ classNames: [item.className], dates: [item.date], getAll: true });
            setOriginalRegistrationsForEdit(originals);
        } catch (error) {
            console.error("Failed to load edit data", error);
            addToast("Không thể tải dữ liệu chỉnh sửa.", 'error');
            setEditingRowKey(null);
        } finally {
            setIsLoading(false);
        }
    }, [getRegistrations, isReadOnly, isContextLoading, handleCancelEdit, addToast]);

    const handleMealChange = useCallback((mealType: MealType, value: string) => {
        setEditedMeals(prev => ({...prev, [mealType]: value}));
    }, []);

    const handleSaveEdit = useCallback(async () => {
        if (!editingRowKey || !editedMeals || !originalRegistrationsForEdit) return;

        const [date, className] = [editingRowKey.slice(0, 10), editingRowKey.slice(11)];
        setSavingRowKey(editingRowKey);
        
        let hasError = false;
        const updates = (Object.keys(editedMeals) as MealType[]).map(mealType => {
            const count = parseInt(editedMeals[mealType] || '0', 10);
            if (isNaN(count) || count < 0) {
                addToast(`Số lượng không hợp lệ cho ${mealType}.`, 'error');
                hasError = true;
                return null;
            }
            return { className, date, mealType, count };
        }).filter(Boolean) as Omit<MealRegistration, 'id' | 'updatedAt'>[];

        if (hasError) {
            setSavingRowKey(null);
            return;
        }
        
        try {
            await updateRegistrations(updates, originalRegistrationsForEdit);
            addToast(`Cập nhật thành công cho lớp ${className}.`, 'success');
            handleCancelEdit();
        } catch (error: any) {
            console.error("Update failed", error);
            if (String(error?.message ?? '').includes('STALE_DATA')) {
                // Data changed elsewhere while the user was editing. Keep the
                // user's edits and refresh the baseline so a retry can succeed.
                const { registrations: freshOriginals } = await getRegistrations({ classNames: [className], dates: [date], getAll: true });
                setOriginalRegistrationsForEdit(freshOriginals);
            } else {
                handleCancelEdit();
            }
        } finally {
            setSavingRowKey(null);
        }
    }, [editingRowKey, editedMeals, originalRegistrationsForEdit, updateRegistrations, addToast, handleCancelEdit, getRegistrations]);
    
    const handleDelete = useCallback(async () => {
        if (!deletingItem) return;
        await deleteRegistrations(deletingItem.className, deletingItem.date);
        setDeletingItem(null);
    }, [deletingItem, deleteRegistrations]);

    const handleBulkDelete = useCallback(async () => {
        if (selectedRows.size === 0) {
            setIsBulkDeleteConfirmOpen(false);
            return;
        }

        const itemsToDelete = Array.from(selectedRows).map((key: string) => {
            const date = key.slice(0, 10);
            const className = key.slice(11);
            return { className, date };
        });

        await deleteMultipleRegistrationsByDate(itemsToDelete);
        setSelectedRows(new Set());
        setIsBulkDeleteConfirmOpen(false);
    }, [selectedRows, deleteMultipleRegistrationsByDate]);

    const handleExport = (format: 'csv' | 'pdf') => {
        if (totalRecords === 0) return;
        exportData({
            format,
            dateRange,
            classNames: selectedClasses
        });
    };

  return (
    <div className="space-y-8">
      {deletingItem && (
         <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm m-4 modal-content">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Xác nhận xóa</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Bạn có chắc chắn muốn xóa toàn bộ đăng ký của lớp <span className="font-semibold">{deletingItem.className}</span> trong ngày <span className="font-semibold">{new Date(deletingItem.date + 'T00:00:00').toLocaleDateString('vi-VN')}</span>?
                </p>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setDeletingItem(null)} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
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
                    Bạn có chắc chắn muốn xóa <span className="font-semibold">{selectedRows.size}</span> mục đã chọn không?
                </p>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setIsBulkDeleteConfirmOpen(false)} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                    <button onClick={handleBulkDelete} disabled={isContextLoading} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400">Xóa</button>
                </div>
            </div>
        </div>
      )}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Báo cáo</h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Tổng hợp số lượng bữa ăn đã đăng ký</p>
      </div>
      
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border dark:border-gray-700 rounded-lg space-y-4 no-print">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0 pr-4">Từ ngày</label>
              <CustomDatePicker value={dateRange.from} onChange={d => {
                    if (dateRange.to && d && d > dateRange.to) {
                        addToast("Ngày bắt đầu không thể sau ngày kết thúc.", 'error');
                        return;
                    }
                    setDateRange(r => ({ ...r, from: d }));
                }} />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="toDate" className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0 pr-4">Đến ngày</label>
              <CustomDatePicker value={dateRange.to} onChange={d => {
                    if (dateRange.from && d && d < dateRange.from) {
                        addToast("Ngày kết thúc không thể trước ngày bắt đầu.", 'error');
                        return;
                    }
                    setDateRange(r => ({ ...r, to: d }));
                }} />
            </div>
             <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0 pr-4">Lớp</label>
              <ClassFilterDropdown classes={classes} selectedClasses={selectedClasses} onSelectionChange={setSelectedClasses} />
            </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2 border-t dark:border-gray-600">
            <button onClick={() => setDateRange({from: '', to: ''})} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">Tất cả</button>
            <button onClick={() => setDateRange(getWeekDateRange())} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">Tuần này</button>
            <button onClick={() => setDateRange(getMonthDateRange())} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">Tháng này</button>
        </div>
      </div>

       <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Kết quả chi tiết ({totalRecords} dòng)</h3>
             <div className="flex gap-2 no-print">
                <button onClick={() => handleExport('pdf')} disabled={totalRecords === 0} className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">PDF</button>
                <button onClick={() => handleExport('csv')} disabled={totalRecords === 0} className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400">Excel</button>
             </div>
        </div>
        <div className="bg-white dark:bg-gray-800 md:shadow-lg rounded-lg overflow-hidden">
             {isLoading ? (
                <TableRowsSkeleton />
             ) : paginatedData.length > 0 ? (
                <>
                {selectedRows.size > 0 && editingRowKey === null && !isReadOnly && (
                    <div className="p-3 bg-teal-50 dark:bg-teal-900/50 border-b dark:border-gray-700 flex justify-between items-center no-print">
                        <span className="text-sm font-semibold text-teal-800 dark:text-teal-200">{selectedRows.size} mục đã được chọn</span>
                        <button onClick={() => setIsBulkDeleteConfirmOpen(true)} className="px-3 py-1 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">Xóa hàng loạt</button>
                    </div>
                )}
                 {/* Desktop Table View */}
                <div className="desktop-table overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-[56px] z-10 isolation-isolate">
                            <tr>
                            <th scope="col" className="px-6 py-3 text-center">
                                {!isReadOnly && (
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                        checked={isAllOnPageSelected}
                                        onChange={handleSelectAllOnPage}
                                        aria-label="Select all on page"
                                    />
                                )}
                            </th>
                            <SortableHeader title="Lớp" sortKey="className" sortConfig={sortConfig} onSort={handleSort} />
                            <SortableHeader title="Ngày" sortKey="date" sortConfig={sortConfig} onSort={handleSort} />
                            <SortableHeader title={MealType.KidsBreakfast} sortKey={MealType.KidsBreakfast} sortConfig={sortConfig} onSort={handleSort} />
                            <SortableHeader title={MealType.KidsLunch} sortKey={MealType.KidsLunch} sortConfig={sortConfig} onSort={handleSort} />
                            <SortableHeader title={MealType.TeachersLunch} sortKey={MealType.TeachersLunch} sortConfig={sortConfig} onSort={handleSort} />
                            <th scope="col" className="px-6 py-3 text-center align-top text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedData.map((item) => {
                            const key = `${item.date}-${item.className}`;
                            const isEditing = editingRowKey === key;
                            const isSaving = savingRowKey === key;
                            return <SummaryTableRow 
                                key={key} 
                                item={item} 
                                isHighlighted={recentlyUpdatedKeys.has(key)}
                                isSelected={selectedRows.has(key)}
                                isEditing={isEditing}
                                isSaving={isSaving}
                                isReadOnly={isReadOnly}
                                editedMeals={isEditing ? editedMeals : null}
                                onSelectRow={() => handleSelectRow(key)}
                                onStartEdit={() => handleStartEdit(item)}
                                onDelete={() => setDeletingItem({className: item.className, date: item.date})}
                                onSave={handleSaveEdit}
                                onCancel={handleCancelEdit}
                                onMealChange={handleMealChange}
                                disabled={isContextLoading || (editingRowKey !== null && !isEditing)}
                            />;
                            })}
                        </tbody>
                        {reportTotals && (
                            <tfoot className="bg-gray-100 dark:bg-gray-700/50">
                                <tr>
                                    <th colSpan={3} className="px-6 py-3 text-right text-sm font-bold text-gray-700 dark:text-gray-200 uppercase">Tổng cộng</th>
                                    <td className="px-6 py-3 text-center text-sm font-bold text-gray-800 dark:text-gray-100">{(reportTotals[MealType.KidsBreakfast] || 0).toLocaleString('vi-VN')}</td>
                                    <td className="px-6 py-3 text-center text-sm font-bold text-gray-800 dark:text-gray-100">{(reportTotals[MealType.KidsLunch] || 0).toLocaleString('vi-VN')}</td>
                                    <td className="px-6 py-3 text-center text-sm font-bold text-gray-800 dark:text-gray-100">{(reportTotals[MealType.TeachersLunch] || 0).toLocaleString('vi-VN')}</td>
                                    <td className="px-6 py-3"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
                 {/* Mobile Card View */}
                <div className="mobile-card-view p-4 md:p-0">
                     {paginatedData.map((item) => {
                        const key = `${item.date}-${item.className}`;
                        const isEditing = editingRowKey === key;
                        const isSaving = savingRowKey === key;
                        return <SummaryCard
                            key={key} 
                            item={item} 
                            isHighlighted={recentlyUpdatedKeys.has(key)}
                            isSelected={selectedRows.has(key)}
                            isEditing={isEditing}
                            isSaving={isSaving}
                            isReadOnly={isReadOnly}
                            editedMeals={isEditing ? editedMeals : null}
                            onSelectRow={() => handleSelectRow(key)}
                            onStartEdit={() => handleStartEdit(item)}
                            onDelete={() => setDeletingItem({className: item.className, date: item.date})}
                            onSave={handleSaveEdit}
                            onCancel={handleCancelEdit}
                            onMealChange={handleMealChange}
                            disabled={isContextLoading || (editingRowKey !== null && !isEditing)}
                        />;
                    })}
                </div>

                 <div ref={loaderRef} />
                 {isFetchingMore && <LoadingMoreSpinner />}
                </>
             ) : (
                <EmptyState onRegisterClick={() => setView(View.Register)} />
             )}
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;
