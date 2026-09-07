import React, { useRef, useEffect, useState } from 'react';
import { MealType, Role } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useDailyRegistrationForm } from '../hooks/useDailyRegistrationForm';
import CustomDatePicker from './CustomDatePicker';
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
    const newRegsMap = new Map(newData.map(r => [`${r.date}-${r.mealType}`, r.count]));
    const oldRegsMap = new Map(existing.map(r => [`${r.date}-${r.mealType}`, r.count]));
    const allKeys = [...new Set([...newRegsMap.keys(), ...oldRegsMap.keys()])];

    return (
        <div className="text-sm bg-gray-100 dark:bg-gray-700 p-3 rounded-md max-h-40 overflow-y-auto space-y-2">
            {allKeys.sort().map(key => {
                const keyStr = String(key);
                const lastHyphenIndex = keyStr.lastIndexOf('-');
                const date = keyStr.substring(0, lastHyphenIndex);
                const mealType = keyStr.substring(lastHyphenIndex + 1);
                const oldCount = oldRegsMap.get(key) || 0;
                const newCount = newRegsMap.get(key) || 0;
                const dateDisplay = new Date(date + 'T00:00:00').toLocaleDateString('vi-VN');

                if (oldCount === newCount) return null;

                let changeClass = "text-gray-500 dark:text-gray-400";
                if (newCount > oldCount) changeClass = "text-green-600 dark:text-green-400";
                if (newCount < oldCount) changeClass = "text-red-600 dark:text-red-400";

                return (
                    <div key={key} className="flex justify-between items-center">
                        <span className="text-xs text-gray-600 dark:text-gray-300">({dateDisplay}) {mealType}</span>
                        <span className={`font-mono font-semibold ${changeClass}`}>{oldCount} → {newCount}</span>
                    </div>
                );
            })}
        </div>
    );
};


const DailyRegistrationForm: React.FC<{}> = () => {
  const { classes } = useData();
  const { currentUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  
  const {
    state,
    handlers,
    isEditing,
    breakfastDayIsSunday,
    formatDate
  } = useDailyRegistrationForm();

  const {
    className, date, kidsLunchCount, teachersLunchCount, kidsNextDayBreakfastCount,
    breakfastDate, isSundayMessageVisible, confirmationData, overwriteConfirmation, errors,
    registeredDates
  } = state;

  const {
    setClassName, setDate,
    handleKidsLunchChange, handleTeachersLunchChange, handleKidsNextDayBreakfastChange,
    setBreakfastDate, setIsSundayMessageVisible,
    handleSubmit, handleConfirmRegistration, resetForm, setOverwriteConfirmation
  } = handlers;

  useEffect(() => {
    if (currentUser?.role === Role.GV && currentUser.assignedClass) {
        setClassName(currentUser.assignedClass);
    }
  }, [currentUser, setClassName]);

  // Accessibility: Focus trap for modals
  useEffect(() => {
    const isModalOpen = !!confirmationData || !!overwriteConfirmation;
    if (isModalOpen && modalRef.current) {
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
        triggerRef.current?.focus(); // Return focus to the trigger
      };
    }
  }, [confirmationData, overwriteConfirmation]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      triggerRef.current = document.activeElement as HTMLElement;
      handleSubmit(e);
  }

  const handleConfirm = async (data: Parameters<typeof handleConfirmRegistration>[0]) => {
      setSubmitting(true);
      try {
          await handleConfirmRegistration(data);
      } finally {
          setSubmitting(false);
      }
  }
  
  const isTeacher = currentUser?.role === Role.GV;

  return (
    <div>
        <form onSubmit={handleFormSubmit} className="space-y-6" noValidate>
            {isEditing && (
                <div className="text-teal-700 bg-teal-100 dark:bg-teal-900 dark:text-teal-200 p-3 rounded-md text-sm flex justify-between items-center">
                    <span>Đang chỉnh sửa đăng ký cho lớp <span className="font-bold">{state.editingInfo?.className}</span> ngày <span className="font-bold">{new Date(state.editingInfo!.date + 'T00:00:00').toLocaleDateString('vi-VN')}</span>.</span>
                    <button type="button" onClick={resetForm} className="font-semibold hover:underline">Hủy</button>
                </div>
            )}

            {overwriteConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="overwrite-title" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-md m-4 modal-content">
                        <h2 id="overwrite-title" className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mb-4">Xác nhận ghi đè</h2>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">Lớp <span className="font-bold">{className}</span> đã có dữ liệu. Vui lòng kiểm tra thay đổi và xác nhận ghi đè.</p>
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
                    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-md m-4 modal-content">
                        <h2 id="confirm-title" className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Xác nhận đăng ký</h2>
                        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                            <p><span className="font-semibold">Lớp:</span> {className}</p>
                            <div className="border-t dark:border-gray-600 pt-3">
                                <ul className="space-y-2">
                                {confirmationData.map((reg, index) => (
                                    reg.count > 0 &&
                                    <li key={index} className="flex justify-between items-center">
                                        <span>{reg.mealType} (Ngày {new Date(reg.date + 'T00:00:00').toLocaleDateString('vi-VN')})</span>
                                        <span className="font-semibold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{reg.count} suất</span>
                                    </li>
                                ))}
                                </ul>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button type="button" onClick={() => handlers.setConfirmationData(null)} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Sửa lại</button>
                            <button type="button" onClick={() => handleConfirm(confirmationData)} disabled={submitting} className="flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-md disabled:bg-teal-400">{submitting ? <LoadingSpinner /> : 'Xác nhận'}</button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="flex items-center justify-between">
                <label htmlFor="className" className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">Lớp</label>
                <ClassCombobox
                    classes={classes}
                    value={className}
                    onChange={setClassName}
                    disabled={isEditing || isTeacher}
                    placeholder="Chọn lớp"
                />
            </div>
            
            {isSundayMessageVisible && !isEditing && (
                <div className="text-blue-700 bg-blue-100 dark:bg-blue-900 dark:text-blue-200 p-3 rounded-md text-sm">Hôm nay là Chủ Nhật. Ngày đăng ký bữa trưa đã được tự động chuyển sang Thứ Hai.</div>
            )}

        <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between gap-x-4">
                <label htmlFor="date" className="px-3 py-1 text-sm font-semibold text-white bg-indigo-600 rounded-full shadow-md shrink-0">Bữa trưa:</label>
                <CustomDatePicker value={date} onChange={(newDate) => { setDate(newDate); setIsSundayMessageVisible(false); }} min={!isEditing ? formatDate(new Date()) : undefined} disabled={isEditing} className="flex-grow min-w-0" registeredDates={registeredDates} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t dark:border-gray-700 mt-2">
                <div>
                    <label htmlFor="kidsLunchCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{MealType.KidsLunch}</label>
                     <NumberInput id="kidsLunchCount" value={kidsLunchCount} onChange={handleKidsLunchChange} min={0} placeholder="Số lượng" />
                    {errors.kidsLunchCount && <p role="alert" className="text-red-500 text-xs mt-1">{errors.kidsLunchCount}</p>}
                </div>
                <div>
                    <label htmlFor="teachersLunchCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{MealType.TeachersLunch}</label>
                    <NumberInput id="teachersLunchCount" value={teachersLunchCount} onChange={handleTeachersLunchChange} min={0} placeholder="Số lượng" />
                    {errors.teachersLunchCount && <p role="alert" className="text-red-500 text-xs mt-1">{errors.teachersLunchCount}</p>}
                </div>
            </div>
        </div>

        <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center justify-between gap-x-4">
                <label htmlFor="breakfastDate" className="px-3 py-1 text-sm font-semibold text-white bg-pink-600 rounded-full shadow-md shrink-0">Bữa mai:</label>
                <CustomDatePicker value={breakfastDate} onChange={setBreakfastDate} min={!isEditing ? formatDate(new Date()) : undefined} className="flex-grow min-w-0" registeredDates={registeredDates} />
            </div>
            <div className="pt-2 border-t dark:border-gray-700 mt-2">
                <label htmlFor="kidsNextDayBreakfastCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{MealType.KidsBreakfast}</label>
                <NumberInput id="kidsNextDayBreakfastCount" value={kidsNextDayBreakfastCount} onChange={handleKidsNextDayBreakfastChange} min={0} placeholder="Số lượng" disabled={breakfastDayIsSunday} />
                {errors.kidsNextDayBreakfastCount && <p role="alert" className="text-red-500 text-xs mt-1">{errors.kidsNextDayBreakfastCount}</p>}
            </div>
            {breakfastDayIsSunday && (
                <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900 dark:text-red-200 p-3 rounded-md mt-2">Ngày ăn mai là Chủ Nhật, không thể đăng ký bữa ăn.</p>
            )}
        </div>

        <button type="submit" disabled={classes.length === 0 || submitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed">
            {submitting ? <LoadingSpinner /> : (isEditing ? 'Cập nhật' : 'Đăng ký')}
        </button>
        </form>
    </div>
  );
};

export default DailyRegistrationForm;