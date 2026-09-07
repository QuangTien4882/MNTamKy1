import React, { useState, useEffect } from 'react';
import { MealType, Role } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useMultiDayRegistrationForm } from '../hooks/useMultiDayRegistrationForm';
import CalendarPicker from './CalendarPicker';
import ClassCombobox from './ClassCombobox';
import NumberInput from './NumberInput';

const LoadingSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const OverwriteComparison: React.FC<{
    existing: any[],
    newData: any[]
}> = ({ existing, newData }) => {
    const newRegsByDate: Record<string, Map<MealType, number>> = {};
    newData.forEach(r => {
        if (!newRegsByDate[r.date]) newRegsByDate[r.date] = new Map();
        newRegsByDate[r.date].set(r.mealType, r.count);
    });
    const oldRegsByDate: Record<string, Map<MealType, number>> = {};
    existing.forEach(r => {
        if (!oldRegsByDate[r.date]) oldRegsByDate[r.date] = new Map();
        oldRegsByDate[r.date].set(r.mealType, r.count);
    });
    const conflictingDates = Object.keys(oldRegsByDate).sort();

    return (
        <div className="text-sm bg-gray-100 dark:bg-gray-700 p-3 rounded-md max-h-48 overflow-y-auto space-y-3">
            {conflictingDates.map(date => {
                const oldMap = oldRegsByDate[date];
                const newMap = newRegsByDate[date] || new Map();
                const allMealTypes = [...new Set([...oldMap.keys(), ...newMap.keys()])];
                const dateDisplay = new Date(date + 'T00:00:00').toLocaleDateString('vi-VN');

                return (
                    <div key={date}>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">Ngày {dateDisplay}:</p>
                        <div className="pl-2 space-y-1 mt-1">
                            {allMealTypes.map(mealType => {
                                const oldCount = oldMap.get(mealType) || 0;
                                const newCount = newMap.get(mealType) || 0;
                                if(oldCount === newCount) return null;
                                let changeClass = "text-gray-500 dark:text-gray-400";
                                if (newCount > oldCount) changeClass = "text-green-600 dark:text-green-400";
                                if (newCount < oldCount) changeClass = "text-red-600 dark:text-red-400";
                                return (
                                     <div key={mealType} className="flex justify-between items-center text-xs">
                                        <span>{mealType}</span>
                                        <span className={`font-mono font-semibold ${changeClass}`}>{oldCount} → {newCount}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const formatFullDateWithWeekday = (date: Date): string => {
    const weekdays = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayOfWeek = weekdays[date.getDay()];
    const formattedDate = date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    return `${dayOfWeek}, ${formattedDate}`;
}

const formatShortDateForTab = (date: Date): string => {
    const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayOfWeek = weekdays[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${dayOfWeek}, ${day}/${month}`;
}

const MultiDayRegistrationForm: React.FC<{}> = () => {
  const { classes } = useData();
  const { currentUser } = useAuth();
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const {
      state,
      handlers,
      groupedConfirmation,
  } = useMultiDayRegistrationForm({ setActiveDate });

  const {
      className, formDates, counts, confirmationData,
      overwriteConfirmation, errors, registeredDates
  } = state;

  const {
      setClassName, setFormDates,
      handleRemoveDate, handleCountChange, handleSubmit,
      handleConfirmRegistration, setOverwriteConfirmation, setConfirmationData
  } = handlers;

  useEffect(() => {
    if (currentUser?.role === Role.GV && currentUser.assignedClass) {
        setClassName(currentUser.assignedClass);
    }
  }, [currentUser, setClassName]);
  
  const activeDateData = activeDate ? {
    counts: counts[activeDate] || {},
    errors: errors[activeDate] || {},
    dateObj: new Date(activeDate + 'T00:00:00'),
    index: formDates.indexOf(activeDate),
    isSingleDay: formDates.length === 1,
    isFirstDay: formDates.indexOf(activeDate) === 0,
    isLastDay: formDates.indexOf(activeDate) === formDates.length - 1
  } : null;
  
  const isTeacher = currentUser?.role === Role.GV;

  const handleConfirm = async (data: Parameters<typeof handleConfirmRegistration>[0]) => {
      setSubmitting(true);
      try {
          await handleConfirmRegistration(data);
      } finally {
          setSubmitting(false);
      }
  }

  const formattedDateForAria = activeDateData ? new Date(activeDateData.dateObj).toLocaleDateString('vi-VN') : activeDate;

  return (
    <div>
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
       {overwriteConfirmation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto modal-content">
                    <h2 className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mb-4">Xác nhận ghi đè</h2>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">Lớp <span className="font-bold">{className}</span> đã có dữ liệu. Vui lòng kiểm tra các thay đổi và xác nhận ghi đè.</p>
                    <OverwriteComparison existing={overwriteConfirmation.existing} newData={overwriteConfirmation.data} />
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={() => setOverwriteConfirmation(null)} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                        <button type="button" onClick={() => handleConfirm(overwriteConfirmation.data)} disabled={submitting} className="flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 rounded-md">{submitting ? <LoadingSpinner /> : 'Xác nhận & Ghi đè'}</button>
                    </div>
                </div>
            </div>
        )}

      {confirmationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto modal-content">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Xác nhận đăng ký</h2>
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <p><span className="font-semibold">Lớp:</span> {className}</p>
              <div className="border-t dark:border-gray-600 pt-3 space-y-3">
                {Object.entries(groupedConfirmation).map(([regDate, regs]) => (
                  <div key={regDate}>
                    <p className="font-semibold text-base text-indigo-700 dark:text-indigo-400">Ngày {new Date(regDate + 'T00:00:00').toLocaleDateString('vi-VN')}</p>
                    <ul className="space-y-1 mt-1 pl-2">
                      {(regs as any[]).filter(r => r.count > 0).map((reg, index) => (
                        <li key={index} className="flex justify-between items-center">
                          <span>{reg.mealType}</span>
                          <span className="font-semibold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{reg.count} suất</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button type="button" onClick={() => setConfirmationData(null)} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Sửa lại</button>
              <button type="button" onClick={() => handleConfirm(confirmationData)} disabled={submitting} className="flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-md disabled:bg-teal-400">{submitting ? <LoadingSpinner /> : 'Xác nhận'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="multiClassName" className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">Lớp</label>
           <ClassCombobox
              classes={classes}
              value={className}
              onChange={setClassName}
              disabled={isTeacher}
              placeholder="Chọn lớp"
            />
        </div>
        <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg space-y-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Chọn các ngày cần đăng ký trên lịch</p>
          <div className="flex justify-center">
            <CalendarPicker selectedDates={formDates} onDatesChange={setFormDates} registeredDates={registeredDates} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {formDates.length > 0 ? (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <div className="flex space-x-1 p-1">
                        {formDates.map(date => {
                            const dateObj = new Date(date + 'T00:00:00');
                             const hasError = errors[date] && Object.keys(errors[date]).length > 0;
                            return (
                                <button
                                    key={date}
                                    type="button"
                                    onClick={() => setActiveDate(date)}
                                    className={`relative flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeDate === date ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                >
                                    {formatShortDateForTab(dateObj)}
                                    {hasError && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
            {activeDateData && (
                <div className="p-4 space-y-3 relative">
                     <button type="button" onClick={() => handleRemoveDate(activeDate!)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label={`Xóa ngày ${formattedDateForAria}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    </button>
                    <h3 className="font-bold text-lg text-indigo-700 dark:text-indigo-400">{formatFullDateWithWeekday(activeDateData.dateObj)}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
                        <div>
                            <label htmlFor={`kbc-${activeDate}`} className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">{MealType.KidsBreakfast}</label>
                            <NumberInput id={`kbc-${activeDate}`} min={0} placeholder={!activeDateData.isSingleDay && activeDateData.isFirstDay ? 'Đã đăng ký' : 'Số lượng'} value={activeDateData.counts[MealType.KidsBreakfast] || ''} disabled={!activeDateData.isSingleDay && activeDateData.isFirstDay} onChange={val => handleCountChange(activeDate!, MealType.KidsBreakfast, val)} />
                            {!activeDateData.isSingleDay && activeDateData.isFirstDay && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Lưu ý: Bữa mai của trẻ vào ngày {activeDateData.dateObj.toLocaleDateString('vi-VN')} đã được đăng ký.</p>}
                            {activeDateData.errors[MealType.KidsBreakfast] && <p className="text-red-500 text-xs mt-1">{activeDateData.errors[MealType.KidsBreakfast]}</p>}
                        </div>
                         <div>
                           <label htmlFor={`klc-${activeDate}`} className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">{MealType.KidsLunch}</label>
                           <NumberInput id={`klc-${activeDate}`} min={0} placeholder={!activeDateData.isSingleDay && activeDateData.isLastDay ? 'Đăng ký sau' : 'Số lượng'} value={activeDateData.counts[MealType.KidsLunch] || ''} disabled={!activeDateData.isSingleDay && activeDateData.isLastDay} onChange={val => handleCountChange(activeDate!, MealType.KidsLunch, val)} />
                           {activeDateData.errors[MealType.KidsLunch] && <p className="text-red-500 text-xs mt-1">{activeDateData.errors[MealType.KidsLunch]}</p>}
                        </div>
                        <div>
                           <label htmlFor={`tlc-${activeDate}`} className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">{MealType.TeachersLunch}</label>
                           <NumberInput id={`tlc-${activeDate}`} min={0} placeholder={!activeDateData.isSingleDay && activeDateData.isLastDay ? 'Đăng ký sau' : 'Số lượng'} value={activeDateData.counts[MealType.TeachersLunch] || ''} disabled={!activeDateData.isSingleDay && activeDateData.isLastDay} onChange={val => handleCountChange(activeDate!, MealType.TeachersLunch, val)} />
                           {activeDateData.errors[MealType.TeachersLunch] && <p className="text-red-500 text-xs mt-1">{activeDateData.errors[MealType.TeachersLunch]}</p>}
                        </div>
                    </div>
                     {!activeDateData.isSingleDay && activeDateData.isLastDay && <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 text-center sm:text-left">Lưu ý: Bữa trưa của trẻ và giáo viên cho ngày {activeDateData.dateObj.toLocaleDateString('vi-VN')} sẽ được đăng ký vào ngày đó.</p>}
                </div>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">Chưa có ngày nào được chọn để tạo form.</p>
        )}
      </div>

<button type="submit" disabled={formDates.length === 0 || classes.length === 0 || submitting}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed">
        {submitting ? <LoadingSpinner /> : 'Đăng ký cho các ngày đã chọn'}
        </button>
    </form>
    </div>
  );
};

export default MultiDayRegistrationForm;