import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { MealType, View, ClassInfo, Role } from '../types';
import ClassFilterDropdown from './ClassFilterDropdown';
import ListTableRow from './ListTableRow';
import ListCard from './ListCard';
import PaginationControls from './PaginationControls';
import { TableSkeleton } from './skeletons';

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface CombinedData {
    className: string;
    kidsLunchCurrent: { count: number; registeredBy?: string; };
    teachersLunchCurrent: { count: number; registeredBy?: string; };
    kidsBreakfastNext: { count: number; registeredBy?: string; };
}

const TableHeaderCell: React.FC<{title: string; date: string | null}> = ({ title, date }) => (
    <th scope="col" className="px-6 py-3 text-center align-top text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
        <div className="flex flex-col">
            <span>{title}</span>
            {date && <span className="font-normal normal-case text-gray-400">({new Date(date + 'T00:00:00').toLocaleDateString('vi-VN')})</span>}
        </div>
    </th>
);

const EmptyState: React.FC<{onRegisterClick: () => void}> = ({onRegisterClick}) => (
    <div className="text-center py-10 px-6 fade-in">
         <svg className="mx-auto h-32 w-32 text-gray-300 dark:text-gray-500" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M51 59H13c-2.2 0-4-1.8-4-4V9c0-2.2 1.8-4 4-4h23.2c.8 0 1.6.3 2.2.9l1.8 1.8c.6.6.9 1.4.9 2.2V55c0 2.2-1.8 4-4 4z" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M36 5v12c0 1.1.9 2 2 2h12M20 31h24M20 41h14" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">Chưa có dữ liệu</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Hiện tại chưa có suất ăn nào được đăng ký cho hôm nay.</p>
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

const ListSummaryStatsBox: React.FC<{ totals: Record<MealType, number> | null }> = ({ totals }) => {
    // FIX: Explicitly type the parameters in the `reduce` function to resolve a type inference issue.
    const totalAll = totals ? Object.values(totals).reduce((sum: number, count: number) => sum + count, 0) : 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            <div className="bg-teal-50 dark:bg-teal-900/50 p-4 rounded-lg">
                <p className="text-sm font-medium text-teal-800 dark:text-teal-200">{MealType.KidsLunch}</p>
                {/* FIX: Use Intl.NumberFormat for robust locale-specific number formatting to fix "Expected 0 arguments, but got 1" error on toLocaleString. */}
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{new Intl.NumberFormat('vi-VN').format(totals?.[MealType.KidsLunch] || 0)}</p>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/50 p-4 rounded-lg">
                <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">{MealType.TeachersLunch}</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{new Intl.NumberFormat('vi-VN').format(totals?.[MealType.TeachersLunch] || 0)}</p>
            </div>
            <div className="bg-pink-50 dark:bg-pink-900/50 p-4 rounded-lg">
                <p className="text-sm font-medium text-pink-800 dark:text-pink-200">{MealType.KidsBreakfast}</p>
                <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">{new Intl.NumberFormat('vi-VN').format(totals?.[MealType.KidsBreakfast] || 0)}</p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg border-2 border-dashed">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">TỔNG CỘNG</p>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{new Intl.NumberFormat('vi-VN').format(totalAll)}</p>
            </div>
        </div>
    );
};

const ITEMS_PER_PAGE = 30;

const ListPage: React.FC<{ setView: (view: View) => void }> = ({ setView }) => {
  const { classes, recentlyUpdatedKeys, getRegistrations, dataVersion } = useData();
  const { currentUser } = useAuth();

  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [listData, setListData] = useState<CombinedData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [filterableClasses, setFilterableClasses] = useState<ClassInfo[]>([]);
  
  const [currentDay, setCurrentDay] = useState('');
  const [nextRegisteredDay, setNextRegisteredDay] = useState<string | null>(null);
  const initialScrollDone = useRef(false);
  
  useEffect(() => {
    const fetchData = async () => {
        setIsLoadingData(true);

        let today = new Date();
        if (today.getDay() === 0) today.setDate(today.getDate() + 1);
        const currentDayStr = formatDate(today);
        setCurrentDay(currentDayStr);

        let tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = formatDate(tomorrow);
        setNextRegisteredDay(tomorrowStr);

        const { registrations } = await getRegistrations({ dates: [currentDayStr, tomorrowStr], getAll: true });
        
        const regsMap = new Map<string, {count: number, registeredBy?: string}>();
        registrations.forEach(r => {
            const key = `${r.className}-${r.date}-${r.mealType}`;
            regsMap.set(key, { count: r.count, registeredBy: r.registeredBy });
        });
        
        const allCombinedData = classes.map(cls => {
            const className = cls.name;
            const kidsLunchCurrent = regsMap.get(`${className}-${currentDayStr}-${MealType.KidsLunch}`) || { count: 0 };
            const teachersLunchCurrent = regsMap.get(`${className}-${currentDayStr}-${MealType.TeachersLunch}`) || { count: 0 };
            const kidsBreakfastNext = regsMap.get(`${className}-${tomorrowStr}-${MealType.KidsBreakfast}`) || { count: 0 };

            return { className, kidsLunchCurrent, teachersLunchCurrent, kidsBreakfastNext };
        });
        
        const finalCombinedData = allCombinedData.filter(item => 
            item.kidsLunchCurrent.count > 0 ||
            item.teachersLunchCurrent.count > 0 ||
            item.kidsBreakfastNext.count > 0
        );
        
        const classOrder = classes.map(c => c.name);
        finalCombinedData.sort((a, b) => classOrder.indexOf(a.className) - classOrder.indexOf(b.className));

        setListData(finalCombinedData);

        const registeredClassNames = new Set(finalCombinedData.map(d => d.className));
        const relevantClasses = classes.filter(c => registeredClassNames.has(c.name));
        setFilterableClasses(relevantClasses);

        if (isInitialLoad) {
            if (relevantClasses.length > 0) {
                setSelectedClasses(relevantClasses.map(c => c.name));
            }
            setIsInitialLoad(false);
        }

        setIsLoadingData(false);
    };

    fetchData();
  }, [getRegistrations, dataVersion, classes, currentUser, isInitialLoad]);

    useEffect(() => {
        if (!isLoadingData && currentUser?.role === Role.GV && currentUser.assignedClass && !initialScrollDone.current) {
            setTimeout(() => {
                const rowElement = document.querySelector(`tr[data-classname="${currentUser.assignedClass}"]`);
                if (rowElement) {
                    rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    initialScrollDone.current = true;
                }
            }, 100);
        }
    }, [isLoadingData, currentUser, listData]);

    const summaryTotals = useMemo(() => {
        const dataToTotal = listData.filter(item => selectedClasses.includes(item.className));
        return dataToTotal.reduce((acc, item) => {
            acc[MealType.KidsLunch] = (acc[MealType.KidsLunch] || 0) + item.kidsLunchCurrent.count;
            acc[MealType.TeachersLunch] = (acc[MealType.TeachersLunch] || 0) + item.teachersLunchCurrent.count;
            acc[MealType.KidsBreakfast] = (acc[MealType.KidsBreakfast] || 0) + item.kidsBreakfastNext.count;
            return acc;
        }, {} as Record<MealType, number>);
    }, [listData, selectedClasses]);

    const paginatedData = useMemo(() => {
        const filtered = listData.filter(item => selectedClasses.includes(item.className));
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [listData, selectedClasses, currentPage]);

    const totalPages = useMemo(() => {
        const totalItems = listData.filter(item => selectedClasses.includes(item.className)).length;
        return Math.ceil(totalItems / ITEMS_PER_PAGE);
    }, [listData, selectedClasses]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedClasses]);

  if (isLoadingData) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Danh sách đăng ký</h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Hiển thị số lượng bữa ăn đã đăng ký hôm nay và bữa mai cho ngày kế tiếp.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Tổng kết nhanh theo bộ lọc</h3>
        <ListSummaryStatsBox totals={summaryTotals} />
      </div>
      
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">Bộ lọc</h3>
        <ClassFilterDropdown 
            classes={filterableClasses}
            selectedClasses={selectedClasses}
            onSelectionChange={setSelectedClasses}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 md:shadow-lg rounded-lg overflow-hidden">
        {paginatedData.length > 0 ? (
            <>
                {/* Desktop Table View */}
                <div className="desktop-table overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-[0px] z-10 isolation-isolate">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">STT</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Lớp</th>
                                <TableHeaderCell title={MealType.KidsLunch} date={currentDay} />
                                <TableHeaderCell title={MealType.TeachersLunch} date={currentDay} />
                                <TableHeaderCell title={MealType.KidsBreakfast} date={nextRegisteredDay} />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedData.map((item, index) => {
                                const stt = ((currentPage - 1) * ITEMS_PER_PAGE) + index + 1;
                                const isUserClassHighlight = currentUser?.role === Role.GV && currentUser?.assignedClass === item.className && !initialScrollDone.current;
                                return (
                                    <ListTableRow 
                                        key={item.className} 
                                        data={item} 
                                        isHighlighted={recentlyUpdatedKeys.has(`${currentDay}-${item.className}`) || (nextRegisteredDay ? recentlyUpdatedKeys.has(`${nextRegisteredDay}-${item.className}`) : false)}
                                        stt={stt}
                                        isUserClassHighlight={isUserClassHighlight}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="mobile-card-view">
                     {paginatedData.map((item, index) => {
                        const stt = ((currentPage - 1) * ITEMS_PER_PAGE) + index + 1;
                        const isUserClassHighlight = currentUser?.role === Role.GV && currentUser?.assignedClass === item.className && !initialScrollDone.current;
                        return (
                             <ListCard 
                                key={item.className} 
                                data={item} 
                                stt={stt}
                                isUserClassHighlight={isUserClassHighlight}
                            />
                        );
                     })}
                </div>

                <PaginationControls 
                    currentPage={currentPage} 
                    totalPages={totalPages} 
                    onPageChange={setCurrentPage} 
                    className="no-print"
                />
            </>
        ) : (
            <EmptyState onRegisterClick={() => setView(View.Register)} />
        )}
      </div>
    </div>
  );
};

export default ListPage;
