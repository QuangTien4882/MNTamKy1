export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getInitialLunchDate = (): string => {
    const today = new Date();
    if (today.getDay() === 0) {
        today.setDate(today.getDate() + 1);
    }
    return formatDate(today);
};

export const getBreakfastDateFrom = (lunchDate: string): string => {
    if (!lunchDate) return '';
    const selectedDate = new Date(lunchDate + 'T00:00:00');
    selectedDate.setDate(selectedDate.getDate() + 1);
    if (selectedDate.getDay() === 0) {
        selectedDate.setDate(selectedDate.getDate() + 1);
    }
    return formatDate(selectedDate);
};