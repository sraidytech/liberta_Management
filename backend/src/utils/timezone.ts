/**
 * Timezone utilities for proper date handling in production
 * Addresses timezone discrepancies between localhost and server
 */

/**
 * Get the current date in the application timezone (Africa/Casablanca)
 */
export function getCurrentDate(): Date {
  const timezone = process.env.TZ || 'Africa/Casablanca';
  return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
}

/**
 * Convert a date to the application timezone
 */
export function toAppTimezone(date: Date): Date {
  const timezone = process.env.TZ || 'Africa/Casablanca';
  return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
}

/**
 * Get start of day in application timezone
 */
export function getStartOfDay(date?: Date): Date {
  const targetDate = date || getCurrentDate();
  const timezone = process.env.TZ || 'Africa/Casablanca';
  
  // Get the date in the target timezone
  const localDate = new Date(targetDate.toLocaleString('en-US', { timeZone: timezone }));
  
  // Set to start of day
  localDate.setHours(0, 0, 0, 0);
  
  return localDate;
}

/**
 * Get end of day in application timezone
 */
export function getEndOfDay(date?: Date): Date {
  const targetDate = date || getCurrentDate();
  const timezone = process.env.TZ || 'Africa/Casablanca';
  
  // Get the date in the target timezone
  const localDate = new Date(targetDate.toLocaleString('en-US', { timeZone: timezone }));
  
  // Set to end of day
  localDate.setHours(23, 59, 59, 999);
  
  return localDate;
}

/**
 * Get start of week in application timezone
 */
export function getStartOfWeek(date?: Date): Date {
  const targetDate = date || getCurrentDate();
  const timezone = process.env.TZ || 'Africa/Casablanca';
  
  const localDate = new Date(targetDate.toLocaleString('en-US', { timeZone: timezone }));
  const day = localDate.getDay();
  const diff = localDate.getDate() - day;
  
  const startOfWeek = new Date(localDate.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);
  
  return startOfWeek;
}

/**
 * Get start of month in application timezone
 */
export function getStartOfMonth(date?: Date): Date {
  const targetDate = date || getCurrentDate();
  const timezone = process.env.TZ || 'Africa/Casablanca';
  
  const localDate = new Date(targetDate.toLocaleString('en-US', { timeZone: timezone }));
  const startOfMonth = new Date(localDate.getFullYear(), localDate.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  return startOfMonth;
}

/**
 * Get end of month in application timezone
 */
export function getEndOfMonth(date?: Date): Date {
  const targetDate = date || getCurrentDate();
  const timezone = process.env.TZ || 'Africa/Casablanca';
  
  const localDate = new Date(targetDate.toLocaleString('en-US', { timeZone: timezone }));
  const endOfMonth = new Date(localDate.getFullYear(), localDate.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  
  return endOfMonth;
}

/**
 * Get date range for analytics based on period
 */
export function getDateRangeForPeriod(period: string): { startDate: Date; endDate: Date } {
  const now = getCurrentDate();
  let startDate: Date;
  let endDate = new Date(now);

  switch (period) {
    case 'today':
      startDate = getStartOfDay(now);
      endDate = getEndOfDay(now);
      break;
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = getStartOfDay(yesterday);
      endDate = getEndOfDay(yesterday);
      break;
    case 'last7days':
    case '7d':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      startDate = getStartOfDay(startDate);
      endDate = getEndOfDay(now);
      break;
    case 'last30days':
    case '30d':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      startDate = getStartOfDay(startDate);
      endDate = getEndOfDay(now);
      break;
    case 'last90days':
    case '90d':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 90);
      startDate = getStartOfDay(startDate);
      endDate = getEndOfDay(now);
      break;
    case 'thisMonth':
      startDate = getStartOfMonth(now);
      endDate = getEndOfDay(now);
      break;
    case 'lastMonth':
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      startDate = getStartOfMonth(lastMonth);
      endDate = getEndOfMonth(lastMonth);
      break;
    case 'thisYear':
      startDate = new Date(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = getEndOfDay(now);
      break;
    default:
      // Default to last 30 days
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      startDate = getStartOfDay(startDate);
      endDate = getEndOfDay(now);
  }

  return { startDate, endDate };
}

/**
 * Format date for database queries (ISO string)
 */
export function formatDateForDB(date: Date): string {
  return date.toISOString();
}

/**
 * Parse date from query parameters with timezone awareness
 */
export function parseDateFromQuery(dateString: string): Date {
  const date = new Date(dateString);
  return toAppTimezone(date);
}

/**
 * Get hours difference between two dates in application timezone
 */
export function getHoursDifference(startDate: Date, endDate: Date): number {
  const start = toAppTimezone(startDate);
  const end = toAppTimezone(endDate);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

/**
 * Get days difference between two dates in application timezone
 */
export function getDaysDifference(startDate: Date, endDate: Date): number {
  const start = getStartOfDay(startDate);
  const end = getStartOfDay(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is today in application timezone
 */
export function isToday(date: Date): boolean {
  const today = getStartOfDay();
  const targetDate = getStartOfDay(date);
  return today.getTime() === targetDate.getTime();
}

/**
 * Get hour of day in application timezone (0-23)
 */
export function getHourOfDay(date: Date): number {
  const timezone = process.env.TZ || 'Africa/Casablanca';
  const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return localDate.getHours();
}

/**
 * Create date array for a given range (useful for charts)
 */
export function createDateArray(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}
