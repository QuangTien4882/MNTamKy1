import { useState, useMemo, useCallback, FormEvent, Dispatch, SetStateAction, useEffect } from 'react';
import { MealType, MealRegistration } from '../types';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';

interface UseMultiDayRegistrationFormProps {
    setActiveDate: Dispatch<SetStateAction<string | null>>;
    onSuccess?: () => void;
}

export const useMultiDayRegistrationForm = ({ setActiveDate, onSuccess }: UseMultiDayRegistrationFormProps) => {
    const { addRegistrations, getRegistrations, updateRegistrations, classes } = useData();
    const { addToast } = useUI();
    
    // State
    const [className, setClassName] = useState('');
    const [formDates, setFormDates] = useState<string[]>([]);
    const [counts, setCounts] = useState<Record<string, { [key in MealType]?: string }>>({});
    const [confirmationData, setConfirmationData] = useState<Omit<MealRegistration, 'id'>[] | null>(null);
    const [overwriteConfirmation, setOverwriteConfirmation] = useState<{data: Omit<MealRegistration, 'id'>[], existing: MealRegistration[]} | null>(null);
    const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
    const [registeredDates, setRegisteredDates] = useState<Set<string>>(new Set());

    useEffect(() => {
        // This effect runs when formDates changes, ensuring activeDate is updated correctly.
        setActiveDate(currentActive => {
            if (formDates.length === 0) return null;
            if (currentActive && formDates.includes(currentActive)) {
                return currentActive;
            }
            return formDates[0]; // Default to the first date in the list
        });
    }, [formDates, setActiveDate]);

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


    const groupedConfirmation = useMemo(() => {
        const data = confirmationData || overwriteConfirmation?.data;
        if (!data) return {};
        return data.reduce((acc, reg) => {
            (acc[reg.date] = acc[reg.date] || []).push(reg);
            return acc;
        }, {} as Record<string, Omit<MealRegistration, 'id'>[]>);
    }, [confirmationData, overwriteConfirmation]);
    
    const resetForm = useCallback(() => {
        setFormDates([]);
        setCounts({});
        setConfirmationData(null);
        setOverwriteConfirmation(null);
        setClassName('');
        setErrors({});
        setActiveDate(null);
    }, [setActiveDate]);

    const handleRemoveDate = useCallback((dateToRemove: string) => {
        setFormDates(prev => prev.filter(d => d !== dateToRemove));

        setCounts(prev => {
            const newCounts = { ...prev };
            delete newCounts[dateToRemove];
            return newCounts;
        });
        setErrors(prev => {
            const newErrors = {...prev};
            delete newErrors[dateToRemove];
            return newErrors;
        });
    }, []);

    const handleCountChange = useCallback((date: string, mealType: MealType, value: string) => {
        setCounts(prev => ({ ...prev, [date]: { ...prev[date], [mealType]: value } }));
        if (errors[date] && errors[date][mealType]) {
            setErrors(prev => {
                const newDateErrors = { ...prev[date] };
                delete newDateErrors[mealType];
                const newErrors = { ...prev, [date]: newDateErrors };
                if(Object.keys(newDateErrors).length === 0) {
                    delete newErrors[date];
                }
                return newErrors;
            });
        }
    }, [errors]);

    const validate = useCallback((): boolean => {
        const newErrors: Record<string, Record<string, string>> = {};
        let isValid = true;
        formDates.forEach((date, index) => {
            const dayCounts = counts[date] || {};
            const dateErrors: Record<string, string> = {};
            const isSingleDay = formDates.length === 1;
            const isFirstDay = index === 0;
            const isLastDay = index === formDates.length - 1;

            if (!isSingleDay && isFirstDay) { // Skip breakfast on first multi-day
            } else if (!dayCounts[MealType.KidsBreakfast] || dayCounts[MealType.KidsBreakfast]?.trim() === '') {
                dateErrors[MealType.KidsBreakfast] = 'Vui lòng nhập số lượng.';
                isValid = false;
            }
            
            if (!isSingleDay && isLastDay) { // Skip lunches on last multi-day
            } else {
                 if (!dayCounts[MealType.KidsLunch] || dayCounts[MealType.KidsLunch]?.trim() === '') {
                    dateErrors[MealType.KidsLunch] = 'Vui lòng nhập số lượng.';
                    isValid = false;
                }
                if (!dayCounts[MealType.TeachersLunch] || dayCounts[MealType.TeachersLunch]?.trim() === '') {
                    dateErrors[MealType.TeachersLunch] = 'Vui lòng nhập số lượng.';
                    isValid = false;
                }
            }

            if (Object.keys(dateErrors).length > 0) {
                newErrors[date] = dateErrors;
            }
        });
        setErrors(newErrors);
        return isValid;
    }, [formDates, counts]);

    const handleSubmit = useCallback(async (e: FormEvent) => {
        e.preventDefault();
        if (!className) { addToast('Vui lòng chọn một lớp để đăng ký.', 'error'); return; }
        if (formDates.length === 0) { addToast('Vui lòng tạo form cho ít nhất một ngày.', 'error'); return; }
        if (!validate()) { addToast('Vui lòng điền đầy đủ thông tin vào các ô được yêu cầu.', 'error'); return; }

        setConfirmationData(null);
        setOverwriteConfirmation(null);

        const newRegistrations: Omit<MealRegistration, 'id'>[] = [];
        let hasInvalidCount = false;

        formDates.forEach((date, index) => {
            const dayCounts = counts[date]; if (!dayCounts) return;
            const isSingleDay = formDates.length === 1, isFirstDay = index === 0, isLastDay = index === formDates.length - 1;
            const skipBreakfast = !isSingleDay && isFirstDay, skipLunch = !isSingleDay && isLastDay;
            const kbc = parseInt(dayCounts[MealType.KidsBreakfast] || '0', 10), klc = parseInt(dayCounts[MealType.KidsLunch] || '0', 10), tlc = parseInt(dayCounts[MealType.TeachersLunch] || '0', 10);

            if (kbc < 0 || klc < 0 || tlc < 0) hasInvalidCount = true;

            if (!skipBreakfast) { newRegistrations.push({ className, date, mealType: MealType.KidsBreakfast, count: kbc }); }
            if (!skipLunch) {
                newRegistrations.push({ className, date, mealType: MealType.KidsLunch, count: klc });
                newRegistrations.push({ className, date, mealType: MealType.TeachersLunch, count: tlc });
            }
        });

        if (hasInvalidCount) { addToast('Số lượng suất ăn không thể là số âm.', 'error'); return; }

        const studentCount = classes.find(c => c.name === className)?.studentCount;
        if (studentCount !== undefined) {
            for (const reg of newRegistrations) {
                if ((reg.mealType === MealType.KidsLunch || reg.mealType === MealType.KidsBreakfast) && reg.count > studentCount) {
                    const dateDisplay = reg.date ? new Date(reg.date + 'T00:00:00').toLocaleDateString('vi-VN') : '';
                    addToast(`Số lượng ${reg.mealType} (${reg.count}) ngày ${dateDisplay} vượt quá sĩ số lớp ${className} (${studentCount}).`, 'error');
                    return;
                }
            }
        }

        const { registrations: existing } = await getRegistrations({ classNames: [className], dates: formDates, getAll: true });
        if (existing.length > 0) {
            const relevantExisting = existing.filter(ex => {
                const hasNewData = newRegistrations.some(nr => nr.date === ex.date && nr.mealType === ex.mealType);
                return hasNewData && ex.count > 0;
            });
            if (relevantExisting.length > 0) { setOverwriteConfirmation({ data: newRegistrations, existing: relevantExisting }); return; }
        }
        setConfirmationData(newRegistrations);
    }, [className, formDates, counts, addToast, getRegistrations, validate, classes]);

    const handleConfirmRegistration = useCallback(async (data: Omit<MealRegistration, 'id'>[]) => {
        if (!data) return;

        try {
            const isOverwrite = !!overwriteConfirmation;

            if (isOverwrite) {
                await updateRegistrations(data, overwriteConfirmation?.existing || []);
            } else {
                await addRegistrations(data);
            }
            addToast(`Đăng ký thành công cho lớp ${className}.`, 'success');
            resetForm();
            onSuccess?.();
        } catch (error: any) {
            if (String(error?.message ?? '').includes('STALE_DATA')) {
                // Keep the typed values; only refresh the overwrite baseline so
                // re-saving compares against the newest data.
                if (overwriteConfirmation) {
                    const dates = Array.from(new Set(overwriteConfirmation.data.map(d => d.date)));
                    const { registrations: fresh } = await getRegistrations({ classNames: [className], dates, getAll: true });
                    setOverwriteConfirmation(prev => prev ? { ...prev, existing: fresh } : prev);
                }
            }
        }
    }, [addRegistrations, updateRegistrations, className, addToast, resetForm, overwriteConfirmation, onSuccess, getRegistrations]);

    return {
        state: {
            className, formDates, counts, confirmationData,
            overwriteConfirmation, errors, registeredDates,
        },
        handlers: {
            setClassName, setFormDates,
            handleRemoveDate, handleCountChange, handleSubmit,
            handleConfirmRegistration, resetForm, setOverwriteConfirmation, setConfirmationData
        },
        groupedConfirmation
    };
};