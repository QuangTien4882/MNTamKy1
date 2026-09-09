import { useState, useEffect, useMemo, useCallback, FormEvent, Dispatch, SetStateAction } from 'react';
import { MealType, MealRegistration } from '../types';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { formatDate, getInitialLunchDate, getBreakfastDateFrom } from '../utils/date';

export const useDailyRegistrationForm = (options?: { onSuccess?: () => void }) => {
  const { onSuccess } = options || {};
  const { editingInfo, addRegistrations, updateRegistrations, clearEditing, getRegistrations, classes } = useData();
  const { addToast } = useUI();

  // Form state
  const [className, setClassName] = useState('');
  const [date, setDate] = useState(getInitialLunchDate);
  const [kidsLunchCount, setKidsLunchCount] = useState('');
  const [teachersLunchCount, setTeachersLunchCount] = useState('');
  const [kidsNextDayBreakfastCount, setKidsNextDayBreakfastCount] = useState('');
  const [breakfastDate, setBreakfastDate] = useState(() => getBreakfastDateFrom(date));
  const [registeredDates, setRegisteredDates] = useState<Set<string>>(new Set());
  
  // Stale data check state
  const [originalRegistrations, setOriginalRegistrations] = useState<MealRegistration[]>([]);

  // UI state
  const [isSundayMessageVisible, setIsSundayMessageVisible] = useState(new Date().getDay() === 0);
  const [confirmationData, setConfirmationData] = useState<Omit<MealRegistration, 'id'>[] | null>(null);
  const [overwriteConfirmation, setOverwriteConfirmation] = useState<{data: Omit<MealRegistration, 'id'>[], existing: MealRegistration[]} | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!editingInfo;

  const resetForm = useCallback(() => {
    setKidsLunchCount('');
    setTeachersLunchCount('');
    setKidsNextDayBreakfastCount('');
    setConfirmationData(null);
    setOverwriteConfirmation(null);
    setOriginalRegistrations([]);
    if(isEditing) {
        clearEditing();
    }
    setClassName('');
    setDate(getInitialLunchDate());
    setErrors({});
  }, [isEditing, clearEditing]);

  useEffect(() => {
    const fetchRegisteredDates = async () => {
        if (!className) {
            setRegisteredDates(new Set());
            return;
        }
        const { registrations } = await getRegistrations({ classNames: [className], getAll: true });
        const datesWithData = new Set(registrations.filter(r => r.count > 0).map(r => r.date));
        setRegisteredDates(datesWithData);
    };

    fetchRegisteredDates();
  }, [className, getRegistrations]);


  useEffect(() => {
    const fetchEditingData = async (editClass: string, editDate: string) => {
        const nextBreakfastDate = getBreakfastDateFrom(editDate);
        const { registrations: editingRegs } = await getRegistrations({ 
            classNames: [editClass], 
            dates: [editDate, nextBreakfastDate],
            getAll: true
        });
        setOriginalRegistrations(editingRegs);

        const klc = editingRegs.find(r => r.date === editDate && r.mealType === MealType.KidsLunch)?.count ?? '';
        const tlc = editingRegs.find(r => r.date === editDate && r.mealType === MealType.TeachersLunch)?.count ?? '';
        const knbc = editingRegs.find(r => r.date === nextBreakfastDate && r.mealType === MealType.KidsBreakfast)?.count ?? '';

        setKidsLunchCount(String(klc));
        setTeachersLunchCount(String(tlc));
        setKidsNextDayBreakfastCount(String(knbc));
    }

    if (isEditing) {
        setClassName(editingInfo.className);
        setDate(editingInfo.date);
        fetchEditingData(editingInfo.className, editingInfo.date);
    }
  }, [isEditing, editingInfo, getRegistrations]);

  useEffect(() => {
      if (date) {
        setBreakfastDate(getBreakfastDateFrom(date));
      }
  }, [date]);

  const breakfastDayIsSunday = useMemo(() => {
    if (!breakfastDate) return false;
    const d = new Date(breakfastDate + 'T00:00:00');
    return d.getDay() === 0;
  }, [breakfastDate]);
  
  const handleConfirmRegistration = useCallback(async (data: Omit<MealRegistration, 'id'>[]) => {
    try {
        const isOverwrite = !!overwriteConfirmation;

        if (isEditing || isOverwrite) {
            const originalsForUpdate = isEditing ? originalRegistrations : (overwriteConfirmation?.existing || []);
            await updateRegistrations(data, originalsForUpdate);
        } else {
            await addRegistrations(data);
        }
        
        addToast(`${isEditing ? 'Cập nhật' : 'Đăng ký'} thành công cho lớp ${className}.`, 'success');
        resetForm();
        onSuccess?.();
    } catch (error: any) {
        if (String(error?.message ?? '').includes('STALE_DATA')) {
            // Keep the values the user typed (the toast says so) and only refresh
            // the baseline so re-saving compares against the newest data.
            const { registrations: fresh } = await getRegistrations({ classNames: [className], dates: [date, getBreakfastDateFrom(date)], getAll: true });
            if (overwriteConfirmation) {
                setOverwriteConfirmation(prev => prev ? { ...prev, existing: fresh } : prev);
            } else {
                setOriginalRegistrations(fresh);
            }
        }
    }
  }, [addRegistrations, updateRegistrations, isEditing, className, addToast, resetForm, originalRegistrations, overwriteConfirmation, onSuccess, getRegistrations, date]);

  const validate = useCallback(() => {
      const newErrors: Record<string, string> = {};
      if (kidsLunchCount.trim() === '') newErrors.kidsLunchCount = 'Vui lòng nhập số lượng.';
      if (teachersLunchCount.trim() === '') newErrors.teachersLunchCount = 'Vui lòng nhập số lượng.';
      if (kidsNextDayBreakfastCount.trim() === '' && !breakfastDayIsSunday) newErrors.kidsNextDayBreakfastCount = 'Vui lòng nhập số lượng.';
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  }, [kidsLunchCount, teachersLunchCount, kidsNextDayBreakfastCount, breakfastDayIsSunday]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!className) { addToast('Vui lòng chọn một lớp để đăng ký.', 'error'); return; }
    
    if (!validate()) {
        addToast('Vui lòng điền đầy đủ thông tin vào các ô được yêu cầu.', 'error');
        return;
    }

    setConfirmationData(null);
    setOverwriteConfirmation(null);

    const klc = parseInt(kidsLunchCount, 10) || 0;
    const tlc = parseInt(teachersLunchCount, 10) || 0;
    const knbc = parseInt(kidsNextDayBreakfastCount, 10) || 0;
    
    if (klc < 0 || tlc < 0 || knbc < 0) { addToast('Số lượng suất ăn không thể là số âm.', 'error'); return; }

    const studentCount = classes.find(c => c.name === className)?.studentCount;
    if (studentCount !== undefined) {
        if (klc > studentCount) {
            addToast(`Số lượng ${MealType.KidsLunch} (${klc}) vượt quá sĩ số lớp ${className} (${studentCount}).`, 'error');
            return;
        }
        if (!breakfastDayIsSunday && knbc > studentCount) {
            addToast(`Số lượng ${MealType.KidsBreakfast} (${knbc}) vượt quá sĩ số lớp ${className} (${studentCount}).`, 'error');
            return;
        }
    }

    const registrationsToSubmit: Omit<MealRegistration, 'id'>[] = [
        { className, date, mealType: MealType.KidsLunch, count: klc },
        { className, date, mealType: MealType.TeachersLunch, count: tlc },
    ];

    if (!breakfastDayIsSunday) {
        registrationsToSubmit.push({ className, date: breakfastDate, mealType: MealType.KidsBreakfast, count: knbc });
    }

    if (isEditing) {
        setConfirmationData(registrationsToSubmit);
        return;
    }

    const datesToCheck = !breakfastDayIsSunday ? [date, breakfastDate] : [date];
    const { registrations: existing } = await getRegistrations({ classNames: [className], dates: datesToCheck, getAll: true });
    
    const relevantExisting = existing.filter(ex => {
        const isLunchConflict = ex.date === date && (ex.mealType === MealType.KidsLunch || ex.mealType === MealType.TeachersLunch);
        const isBreakfastConflict = !breakfastDayIsSunday && ex.date === breakfastDate && ex.mealType === MealType.KidsBreakfast;
        return (isLunchConflict || isBreakfastConflict) && ex.count > 0;
    });

    if (relevantExisting.length > 0) {
        setOverwriteConfirmation({ data: registrationsToSubmit, existing: relevantExisting });
        return;
    }
    
    setConfirmationData(registrationsToSubmit);
  }, [className, kidsLunchCount, teachersLunchCount, kidsNextDayBreakfastCount, date, breakfastDate, isEditing, breakfastDayIsSunday, addToast, getRegistrations, validate, classes]);
  
  const createChangeHandler = useCallback((setter: Dispatch<SetStateAction<string>>, fieldName: string) => {
      return (value: string) => {
          setter(value);
          if(errors[fieldName]) {
              setErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors[fieldName];
                  return newErrors;
              });
          }
      }
  }, [errors]);

  return {
    state: {
        className, date, kidsLunchCount, teachersLunchCount, kidsNextDayBreakfastCount,
        breakfastDate, isSundayMessageVisible, confirmationData, overwriteConfirmation,
        editingInfo, errors, registeredDates
    },
    handlers: {
        setClassName, setDate,
        handleKidsLunchChange: createChangeHandler(setKidsLunchCount, 'kidsLunchCount'),
        handleTeachersLunchChange: createChangeHandler(setTeachersLunchCount, 'teachersLunchCount'),
        handleKidsNextDayBreakfastChange: createChangeHandler(setKidsNextDayBreakfastCount, 'kidsNextDayBreakfastCount'),
        setBreakfastDate, setIsSundayMessageVisible,
        setConfirmationData, setOverwriteConfirmation,
        handleSubmit, handleConfirmRegistration, resetForm
    },
    isEditing,
    breakfastDayIsSunday,
    formatDate
  };
};