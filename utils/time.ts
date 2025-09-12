
export const formatTime = (date: Date | number): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

export const formatDate = (date: Date | number): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const getTodayDateString = (): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const offset = today.getTimezoneOffset();
    const todayWithOffset = new Date(today.getTime() - (offset*60*1000));
    return todayWithOffset.toISOString().split('T')[0];
};

export const parseTimeStringToDate = (timeString: string, baseDate: Date = new Date()): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
};
