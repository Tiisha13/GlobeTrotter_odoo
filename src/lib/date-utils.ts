import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';

/**
 * Formats a date string or Date object into a human-readable format
 * @param date - The date to format (string or Date object)
 * @returns Formatted date string (e.g., "Today, 2:30 PM" or "Tomorrow, 10:00 AM")
 */
export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  let prefix = '';
  if (isToday(dateObj)) {
    prefix = 'Today';
  } else if (isTomorrow(dateObj)) {
    prefix = 'Tomorrow';
  } else if (isYesterday(dateObj)) {
    prefix = 'Yesterday';
  } else {
    prefix = format(dateObj, 'EEEE, MMM d');
  }
  
  return `${prefix}, ${format(dateObj, 'h:mm a')}`;
};

/**
 * Formats a date range into a human-readable string
 * @param start - Start date (string or Date)
 * @param end - End date (string or Date)
 * @returns Formatted date range string (e.g., "Today, 2:30 PM - 4:00 PM")
 */
export const formatDateRange = (start: string | Date, end: string | Date): string => {
  if (!start || !end) return '';
  
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  
  // If same day, show date once with both times
  if (format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
    return `${format(startDate, 'MMM d, yyyy')} • ${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
  }
  
  // Different days, show full date range
  return `${format(startDate, 'MMM d, yyyy h:mm a')} - ${format(endDate, 'MMM d, yyyy h:mm a')}`;
};

/**
 * Returns a relative time string (e.g., "2 hours ago" or "in 3 days")
 * @param date - The date to format (string or Date object)
 * @returns Relative time string
 */
export const timeAgo = (date: string | Date): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
};

/**
 * Formats a duration in milliseconds to a human-readable format
 * @param milliseconds - Duration in milliseconds
 * @returns Formatted duration string (e.g., "2h 30m" or "1d 4h")
 */
export const formatDuration = (milliseconds: number): string => {
  if (!milliseconds && milliseconds !== 0) return '';
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  
  const parts = [];
  
  if (days > 0) {
    parts.push(`${days}d`);
  }
  
  if (remainingHours > 0 || days > 0) {
    parts.push(`${remainingHours}h`);
  }
  
  if (remainingMinutes > 0 || parts.length === 0) {
    parts.push(`${remainingMinutes}m`);
  }
  
  return parts.join(' ');
};

/**
 * Checks if a date is in the past
 * @param date - The date to check (string or Date object)
 * @returns True if the date is in the past
 */
export const isPastDate = (date: string | Date): boolean => {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj < new Date();
};

/**
 * Gets the day of the week as a string
 * @param date - The date to get the day for (string or Date object)
 * @returns The day of the week (e.g., "Monday", "Tuesday", etc.)
 */
export const getDayOfWeek = (date: string | Date): string => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'EEEE');
};

/**
 * Gets a short month and day string (e.g., "Jan 15")
 * @param date - The date to format (string or Date object)
 * @returns Formatted month and day string
 */
export const getShortMonthDay = (date: string | Date): string => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM d');
};

/**
 * Gets a time string in 12-hour format (e.g., "2:30 PM")
 * @param date - The date to format (string or Date object)
 * @returns Formatted time string
 */
export const getTimeString = (date: string | Date): string => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'h:mm a');
};
