/**
 * DateTime Tools - Provides rich temporal context for LLM awareness
 *
 * This module provides comprehensive date and time information optimized
 * for LLM consumption, including timezone handling, calendar calculations,
 * and relative temporal information.
 */

import type { Logger } from '../utils/logger.js';

/**
 * Parameters for getCurrentDateTime
 */
export interface GetDateTimeParams {
  /** IANA timezone identifier (e.g., 'America/New_York', 'UTC') */
  timezone?: string;
  /** Include calendar information like quarter, week, etc. (default: true) */
  include_calendar?: boolean;
}

/**
 * Relative temporal information
 */
export interface RelativeInfo {
  /** Number of days in current month */
  days_in_month: number;
  /** Number of days in current year (365 or 366 for leap years) */
  days_in_year: number;
  /** Days remaining in current year */
  days_remaining_in_year: number;
  /** Weeks remaining in current year */
  weeks_remaining_in_year: number;
  /** Whether current year is a leap year */
  is_leap_year: boolean;
  /** Start date of current quarter (human-readable) */
  quarter_start: string;
  /** End date of current quarter (human-readable) */
  quarter_end: string;
}

/**
 * Complete datetime result with rich temporal context
 */
export interface DateTimeResult {
  /** ISO 8601 timestamp with timezone */
  timestamp: string;
  /** Unix timestamp (seconds since epoch) */
  unix_timestamp: number;

  /** Human-readable datetime string optimized for LLMs */
  human: string;

  /** IANA timezone identifier */
  timezone: string;
  /** Timezone abbreviation (e.g., 'CST', 'JST') */
  timezone_abbr: string;
  /** UTC offset (e.g., '-06:00', '+09:00') */
  utc_offset: string;
  /** Whether currently in daylight saving time */
  is_dst: boolean;

  /** Full year (e.g., 2025) */
  year: number;
  /** Quarter of year (1-4) - only included if include_calendar is true */
  quarter?: number;
  /** Month (1-12) */
  month: number;
  /** Month name (e.g., 'November') */
  month_name: string;
  /** Day of month (1-31) */
  day: number;
  /** Day of week (e.g., 'Tuesday') */
  day_of_week: string;
  /** Day of year (1-366) - only included if include_calendar is true */
  day_of_year?: number;
  /** ISO week number (1-53) - only included if include_calendar is true */
  week_of_year?: number;

  /** Hour in 24-hour format (0-23) */
  hour: number;
  /** Minute (0-59) */
  minute: number;
  /** Second (0-59) */
  second: number;

  /** Relative temporal information - only included if include_calendar is true */
  relative?: RelativeInfo;
}

/**
 * DateTimeTools provides rich temporal context for LLM awareness.
 *
 * Key features:
 * - No external dependencies (pure JavaScript Date/Intl APIs)
 * - Fast synchronous operations
 * - Comprehensive timezone support
 * - Calendar calculations (quarters, weeks, day-of-year)
 * - Relative temporal information
 * - Human-readable formats optimized for LLMs
 *
 * @example
 * ```typescript
 * const tools = new DateTimeTools(logger);
 *
 * // Get current datetime with full context
 * const dt = await tools.getCurrentDateTime();
 * console.log(dt.human);
 * // "Tuesday, November 12, 2025 at 7:21 PM CST"
 *
 * console.log(`We're in Q${dt.quarter} ${dt.year}`);
 * // "We're in Q4 2025"
 *
 * console.log(`${dt.relative.days_remaining_in_year} days left in year`);
 * // "49 days left in year"
 * ```
 *
 * @example
 * ```typescript
 * // Get time in different timezone
 * const tokyo = await tools.getCurrentDateTime({
 *   timezone: 'Asia/Tokyo'
 * });
 * console.log(tokyo.human);
 * // "Wednesday, November 13, 2025 at 10:21 AM JST"
 * ```
 */
export class DateTimeTools {
  constructor(private logger: Logger) {}

  /**
   * Get current date and time with comprehensive temporal context.
   *
   * Provides LLMs with rich temporal awareness including:
   * - Human-readable timestamp
   * - Calendar context (quarter, week, day-of-year)
   * - Timezone information
   * - Relative calculations (days remaining, leap year, etc.)
   *
   * @param params - Optional timezone and calendar configuration
   * @returns Complete temporal context optimized for LLM consumption
   *
   * @example
   * ```typescript
   * // Get current datetime with full context
   * const dt = await tools.getCurrentDateTime();
   * console.log(dt.human);
   * // "Tuesday, November 12, 2025 at 7:21 PM CST"
   *
   * console.log(`We're in Q${dt.quarter} ${dt.year}`);
   * // "We're in Q4 2025"
   * ```
   */
  async getCurrentDateTime(params?: GetDateTimeParams): Promise<DateTimeResult> {
    const includeCalendar = params?.include_calendar ?? true;
    const now = new Date();

    // Get timezone (default to system timezone)
    const timezone = params?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    this.logger.debug('Getting current datetime', {
      timezone,
      includeCalendar,
      systemTime: now.toISOString(),
    });

    // Validate timezone by trying to use it
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(now);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Invalid timezone', { timezone, error: message });
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    // Create formatter for the specified timezone
    const zonedDate = this.getZonedDate(now, timezone);

    // Get all date components
    const year = zonedDate.year;
    const month = zonedDate.month;
    const day = zonedDate.day;
    const hour = zonedDate.hour;
    const minute = zonedDate.minute;
    const second = zonedDate.second;

    // Calculate calendar fields only if requested
    let quarter: number | undefined;
    let dayOfYear: number | undefined;
    let weekNumber: number | undefined;

    if (includeCalendar) {
      // Calculate quarter
      quarter = Math.floor((month - 1) / 3) + 1;

      // Calculate day of year
      dayOfYear = this.getDayOfYear(year, month, day);

      // Calculate ISO week number
      weekNumber = this.getISOWeek(year, month, day);
    }

    // Get human-readable format
    const humanFormatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZone: timezone,
      timeZoneName: 'short',
    });

    const human = humanFormatter.format(now);

    // Get timezone abbreviation from formatted string
    const parts = humanFormatter.formatToParts(now);
    const tzAbbr = parts.find((p) => p.type === 'timeZoneName')?.value || '';

    // Calculate UTC offset
    const utcOffset = this.getUTCOffset(now, timezone);

    // Detect DST
    const isDST = this.isDST(now, timezone);

    // Get month name
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
      new Date(year, month - 1, 1)
    );

    // Get day of week
    const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(
      new Date(year, month - 1, day)
    );

    // Calculate relative information only if calendar is included
    let relative: RelativeInfo | undefined;
    if (includeCalendar && quarter !== undefined && dayOfYear !== undefined) {
      relative = this.calculateRelativeInfo(year, month, quarter, dayOfYear);
    }

    const result: DateTimeResult = {
      timestamp: now.toISOString(),
      unix_timestamp: Math.floor(now.getTime() / 1000),

      human,

      timezone,
      timezone_abbr: tzAbbr,
      utc_offset: utcOffset,
      is_dst: isDST,

      year,
      month,
      month_name: monthName,
      day,
      day_of_week: dayOfWeek,

      hour,
      minute,
      second,

      // Conditionally include calendar fields
      ...(includeCalendar && {
        quarter,
        day_of_year: dayOfYear,
        week_of_year: weekNumber,
        relative,
      }),
    };

    this.logger.debug('DateTime result generated', {
      human: result.human,
      quarter: result.quarter,
      week: result.week_of_year,
    });

    return result;
  }

  /**
   * Get date components in a specific timezone
   */
  private getZonedDate(
    date: Date,
    timezone: string
  ): {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  } {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string): number =>
      parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

    return {
      year: getPart('year'),
      month: getPart('month'),
      day: getPart('day'),
      hour: getPart('hour'),
      minute: getPart('minute'),
      second: getPart('second'),
    };
  }

  /**
   * Calculate day of year (1-366)
   */
  private getDayOfYear(year: number, month: number, day: number): number {
    const start = new Date(year, 0, 0);
    const current = new Date(year, month - 1, day);
    const diff = current.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  /**
   * Calculate ISO week number (1-53)
   *
   * ISO 8601 week date system:
   * - Week 1 is the week with the year's first Thursday
   * - Weeks start on Monday
   * - Week 53 only occurs in years with 53 weeks
   */
  private getISOWeek(year: number, month: number, day: number): number {
    // Create date in UTC to avoid timezone issues
    const date = new Date(Date.UTC(year, month - 1, day));

    // Set to nearest Thursday (current date + 4 - current day number)
    // Make Sunday=7 instead of 0
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);

    // Get first day of year
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));

    // Calculate week number
    const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

    return weekNo;
  }

  /**
   * Get UTC offset string (e.g., '-06:00', '+09:00')
   */
  private getUTCOffset(date: Date, timezone: string): string {
    // Get offset in minutes for the specific timezone
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const offset = (tzDate.getTime() - utcDate.getTime()) / 60000;

    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';

    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Detect if currently in daylight saving time
   *
   * DST detection works by comparing the offset in January (winter)
   * vs July (summer). If current offset differs from the maximum,
   * we're in DST.
   */
  private isDST(date: Date, timezone: string): boolean {
    const year = date.getFullYear();

    // Get offset in January (typically standard time)
    const jan = new Date(year, 0, 1);
    const janFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    const janParts = janFormatter.formatToParts(jan);
    const janTz = janParts.find((p) => p.type === 'timeZoneName')?.value || '';

    // Get offset in July (typically DST if applicable)
    const jul = new Date(year, 6, 1);
    const julFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    const julParts = julFormatter.formatToParts(jul);
    const julTz = julParts.find((p) => p.type === 'timeZoneName')?.value || '';

    // Get current timezone abbreviation
    const currentFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    const currentParts = currentFormatter.formatToParts(date);
    const currentTz = currentParts.find((p) => p.type === 'timeZoneName')?.value || '';

    // If timezone abbreviations differ between Jan/Jul, DST exists
    // Current DST status is determined by which abbreviation we match
    if (janTz !== julTz) {
      return currentTz === julTz;
    }

    // No DST in this timezone
    return false;
  }

  /**
   * Check if a year is a leap year
   */
  private isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /**
   * Calculate relative temporal information
   */
  private calculateRelativeInfo(
    year: number,
    month: number,
    quarter: number,
    dayOfYear: number
  ): RelativeInfo {
    // Days in current month
    const daysInMonth = new Date(year, month, 0).getDate();

    // Days in year (365 or 366 for leap years)
    const daysInYear = this.isLeapYear(year) ? 366 : 365;

    // Days remaining in year
    const daysRemaining = daysInYear - dayOfYear;

    // Weeks remaining (rounded up)
    const weeksRemaining = Math.ceil(daysRemaining / 7);

    // Quarter boundaries
    const quarterStartMonth = (quarter - 1) * 3;
    const quarterEndMonth = quarter * 3;

    const quarterStart = new Date(year, quarterStartMonth, 1);
    const quarterEnd = new Date(year, quarterEndMonth, 0);

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      days_in_month: daysInMonth,
      days_in_year: daysInYear,
      days_remaining_in_year: daysRemaining,
      weeks_remaining_in_year: weeksRemaining,
      is_leap_year: this.isLeapYear(year),
      quarter_start: dateFormatter.format(quarterStart),
      quarter_end: dateFormatter.format(quarterEnd),
    };
  }
}
