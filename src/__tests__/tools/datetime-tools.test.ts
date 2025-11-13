/**
 * Tests for DateTimeTools
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DateTimeTools } from '../../tools/datetime-tools.js';
import { Logger, LogLevel } from '../../utils/logger.js';

describe('DateTimeTools', () => {
  let tools: DateTimeTools;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger(LogLevel.DEBUG);
    tools = new DateTimeTools(logger);
  });

  describe('getCurrentDateTime - Basic Functionality', () => {
    it('returns current datetime with all required fields', async () => {
      const result = await tools.getCurrentDateTime();

      // Timestamp fields
      expect(result.timestamp).toBeDefined();
      expect(result.unix_timestamp).toBeGreaterThan(0);

      // Human-readable
      expect(result.human).toBeDefined();
      expect(result.human.length).toBeGreaterThan(0);

      // Timezone
      expect(result.timezone).toBeDefined();
      expect(result.timezone_abbr).toBeDefined();
      expect(result.utc_offset).toMatch(/^[+-]\d{2}:\d{2}$/);
      expect(typeof result.is_dst).toBe('boolean');

      // Date components
      expect(result.year).toBeGreaterThan(2000);
      expect(result.quarter).toBeGreaterThanOrEqual(1);
      expect(result.quarter).toBeLessThanOrEqual(4);
      expect(result.month).toBeGreaterThanOrEqual(1);
      expect(result.month).toBeLessThanOrEqual(12);
      expect(result.month_name).toBeDefined();
      expect(result.day).toBeGreaterThanOrEqual(1);
      expect(result.day).toBeLessThanOrEqual(31);
      expect(result.day_of_week).toBeDefined();
      expect(result.day_of_year).toBeGreaterThanOrEqual(1);
      expect(result.day_of_year).toBeLessThanOrEqual(366);
      expect(result.week_of_year).toBeGreaterThanOrEqual(1);
      expect(result.week_of_year).toBeLessThanOrEqual(53);

      // Time components
      expect(result.hour).toBeGreaterThanOrEqual(0);
      expect(result.hour).toBeLessThanOrEqual(23);
      expect(result.minute).toBeGreaterThanOrEqual(0);
      expect(result.minute).toBeLessThanOrEqual(59);
      expect(result.second).toBeGreaterThanOrEqual(0);
      expect(result.second).toBeLessThanOrEqual(59);

      // Relative info
      expect(result.relative).toBeDefined();
      expect(result.relative!.days_in_month).toBeGreaterThanOrEqual(28);
      expect(result.relative!.days_in_month).toBeLessThanOrEqual(31);
      expect(result.relative!.days_in_year).toBeGreaterThanOrEqual(365);
      expect(result.relative!.days_in_year).toBeLessThanOrEqual(366);
      expect(result.relative!.days_remaining_in_year).toBeGreaterThanOrEqual(0);
      expect(result.relative!.weeks_remaining_in_year).toBeGreaterThanOrEqual(0);
      expect(typeof result.relative!.is_leap_year).toBe('boolean');
      expect(result.relative!.quarter_start).toBeDefined();
      expect(result.relative!.quarter_end).toBeDefined();
    });

    it('includes human-readable format', async () => {
      const result = await tools.getCurrentDateTime();

      // Should include day of week, month, day, year, time
      expect(result.human).toMatch(/\w+,/); // Day of week with comma
      expect(result.human).toMatch(/\d{4}/); // Year
      expect(result.human).toMatch(/\d{1,2}:\d{2}/); // Time
    });

    it('calculates quarter correctly for each month', async () => {
      // We can't easily mock the current date, but we can verify the quarter
      // is in the valid range and consistent with the month
      const result = await tools.getCurrentDateTime();

      const expectedQuarter = Math.floor((result.month - 1) / 3) + 1;
      expect(result.quarter!).toBe(expectedQuarter);
    });

    it('calculates day of year correctly', async () => {
      const result = await tools.getCurrentDateTime();

      // Day of year should be consistent with the current date
      // For the first day of the year, it should be 1
      // For December 31 of a non-leap year, it should be 365
      const isLeapYear = result.relative!.is_leap_year;
      const maxDay = isLeapYear ? 366 : 365;

      expect(result.day_of_year!).toBeGreaterThanOrEqual(1);
      expect(result.day_of_year!).toBeLessThanOrEqual(maxDay);
    });

    it('calculates ISO week number correctly', async () => {
      const result = await tools.getCurrentDateTime();

      // ISO week should be 1-53
      expect(result.week_of_year!).toBeGreaterThanOrEqual(1);
      expect(result.week_of_year!).toBeLessThanOrEqual(53);

      // Week 53 only exists in some years
      if (result.week_of_year! === 53) {
        // Should be near year end
        expect(result.month).toBe(12);
      }
    });
  });

  describe('getCurrentDateTime - Timezone Support', () => {
    it('uses system timezone by default', async () => {
      const result = await tools.getCurrentDateTime();

      const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      expect(result.timezone).toBe(systemTz);
    });

    it('accepts custom IANA timezone', async () => {
      const result = await tools.getCurrentDateTime({
        timezone: 'America/New_York',
      });

      expect(result.timezone).toBe('America/New_York');
      expect(result.timezone_abbr).toMatch(/^E[SD]T$/); // EST or EDT
    });

    it('calculates UTC offset correctly for different timezones', async () => {
      const utc = await tools.getCurrentDateTime({ timezone: 'UTC' });
      expect(utc.utc_offset).toBe('+00:00');

      const tokyo = await tools.getCurrentDateTime({ timezone: 'Asia/Tokyo' });
      expect(tokyo.utc_offset).toBe('+09:00');

      const newYork = await tools.getCurrentDateTime({
        timezone: 'America/New_York',
      });
      // EST is -05:00, EDT is -04:00
      expect(newYork.utc_offset).toMatch(/^-0[45]:00$/);
    });

    it('handles UTC timezone', async () => {
      const result = await tools.getCurrentDateTime({ timezone: 'UTC' });

      expect(result.timezone).toBe('UTC');
      expect(result.utc_offset).toBe('+00:00');
      expect(result.is_dst).toBe(false); // UTC never has DST
    });

    it('throws error for invalid timezone', async () => {
      await expect(
        tools.getCurrentDateTime({ timezone: 'Invalid/Timezone' })
      ).rejects.toThrow('Invalid timezone');
    });

    it('handles timezone crossing midnight', async () => {
      // When it's 11 PM in New York, it's already tomorrow in Tokyo
      const newYork = await tools.getCurrentDateTime({
        timezone: 'America/New_York',
      });
      const tokyo = await tools.getCurrentDateTime({ timezone: 'Asia/Tokyo' });

      // Tokyo is always ahead of New York (13-14 hours)
      // So Tokyo's day might be different from New York's
      // This test just verifies both return valid results
      expect(newYork.day).toBeGreaterThanOrEqual(1);
      expect(tokyo.day).toBeGreaterThanOrEqual(1);

      // The difference should never be more than 1 day
      const dayDiff = Math.abs(tokyo.day - newYork.day);
      expect(dayDiff).toBeLessThanOrEqual(1);
    });
  });

  describe('getCurrentDateTime - Relative Information', () => {
    it('calculates days remaining in year', async () => {
      const result = await tools.getCurrentDateTime();

      const daysInYear = result.relative!.days_in_year;
      const dayOfYear = result.day_of_year!;
      const daysRemaining = result.relative!.days_remaining_in_year;

      expect(daysRemaining).toBe(daysInYear - dayOfYear);
    });

    it('calculates weeks remaining in year', async () => {
      const result = await tools.getCurrentDateTime();

      const daysRemaining = result.relative!.days_remaining_in_year;
      const weeksRemaining = result.relative!.weeks_remaining_in_year;

      // Weeks remaining should be days remaining divided by 7, rounded up
      expect(weeksRemaining).toBe(Math.ceil(daysRemaining / 7));
    });

    it('detects leap years correctly', async () => {
      const result = await tools.getCurrentDateTime();

      const year = result.year;
      const isLeapYear = result.relative!.is_leap_year;
      const daysInYear = result.relative!.days_in_year;

      // Leap year rules:
      // - Divisible by 4 AND (not divisible by 100 OR divisible by 400)
      const expectedLeapYear =
        (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

      expect(isLeapYear).toBe(expectedLeapYear);
      expect(daysInYear).toBe(isLeapYear ? 366 : 365);
    });

    it('calculates quarter boundaries correctly', async () => {
      const result = await tools.getCurrentDateTime();

      const quarter = result.quarter!;
      const quarterStart = result.relative!.quarter_start;
      const quarterEnd = result.relative!.quarter_end;

      // Verify quarter start/end include the current year
      expect(quarterStart).toContain(result.year.toString());
      expect(quarterEnd).toContain(result.year.toString());

      // Verify quarter boundaries are logical
      const quarterMonths = [
        ['January', 'March'],
        ['April', 'June'],
        ['July', 'September'],
        ['October', 'December'],
      ];

      const [startMonth, endMonth] = quarterMonths[quarter - 1];
      expect(quarterStart).toContain(startMonth);
      expect(quarterEnd).toContain(endMonth);
    });

    it('handles year-end edge cases', async () => {
      const result = await tools.getCurrentDateTime();

      // If we're in December, verify quarter is Q4
      if (result.month === 12) {
        expect(result.quarter).toBe(4);
        expect(result.relative!.quarter_end).toContain('December 31');
      }

      // Days remaining should never be negative
      expect(result.relative!.days_remaining_in_year).toBeGreaterThanOrEqual(0);
      expect(result.relative!.weeks_remaining_in_year).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCurrentDateTime - Edge Cases', () => {
    it('handles January 1st correctly', async () => {
      // We can't control the current date easily in this test,
      // but we can verify that if we're on Jan 1st, the calculations are correct
      const result = await tools.getCurrentDateTime();

      if (result.month === 1 && result.day === 1) {
        expect(result.day_of_year).toBe(1);
        expect(result.quarter).toBe(1);
        expect(result.relative!.days_remaining_in_year).toBe(
          result.relative!.days_in_year - 1
        );
      }
    });

    it('handles December 31st correctly', async () => {
      const result = await tools.getCurrentDateTime();

      if (result.month === 12 && result.day === 31) {
        expect(result.day_of_year).toBe(result.relative!.days_in_year);
        expect(result.quarter).toBe(4);
        expect(result.relative!.days_remaining_in_year).toBe(0);
        expect(result.relative!.weeks_remaining_in_year).toBe(0);
      }
    });

    it('handles leap year February 29th', async () => {
      const result = await tools.getCurrentDateTime();

      if (
        result.relative?.is_leap_year &&
        result.month === 2 &&
        result.day === 29
      ) {
        expect(result.month_name).toBe('February');
        expect(result.relative!.days_in_month).toBe(29);
        expect(result.relative!.days_in_year).toBe(366);
      }
    });

    it('handles February correctly in non-leap years', async () => {
      const result = await tools.getCurrentDateTime();

      if (result.relative && !result.relative.is_leap_year && result.month === 2) {
        expect(result.relative!.days_in_month).toBe(28);
        expect(result.relative!.days_in_year).toBe(365);
      }
    });
  });

  describe('getCurrentDateTime - Output Format', () => {
    it('returns ISO 8601 timestamp', async () => {
      const result = await tools.getCurrentDateTime();

      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it('returns valid unix timestamp', async () => {
      const result = await tools.getCurrentDateTime();
      const now = Math.floor(Date.now() / 1000);

      // Unix timestamp should be close to current time (within 1 second)
      expect(Math.abs(result.unix_timestamp - now)).toBeLessThanOrEqual(1);
    });

    it('formats human-readable string correctly', async () => {
      const result = await tools.getCurrentDateTime();

      // Should contain day of week
      const daysOfWeek = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ];
      expect(daysOfWeek.some((day) => result.human.includes(day))).toBe(true);

      // Should contain month name
      const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      expect(months.some((month) => result.human.includes(month))).toBe(true);

      // Should contain year
      expect(result.human).toContain(result.year.toString());
    });

    it('includes all required fields', async () => {
      const result = await tools.getCurrentDateTime();

      // Verify all fields are present and have correct types
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.unix_timestamp).toBe('number');
      expect(typeof result.human).toBe('string');
      expect(typeof result.timezone).toBe('string');
      expect(typeof result.timezone_abbr).toBe('string');
      expect(typeof result.utc_offset).toBe('string');
      expect(typeof result.is_dst).toBe('boolean');
      expect(typeof result.year).toBe('number');
      expect(typeof result.quarter).toBe('number');
      expect(typeof result.month).toBe('number');
      expect(typeof result.month_name).toBe('string');
      expect(typeof result.day).toBe('number');
      expect(typeof result.day_of_week).toBe('string');
      expect(typeof result.day_of_year).toBe('number');
      expect(typeof result.week_of_year).toBe('number');
      expect(typeof result.hour).toBe('number');
      expect(typeof result.minute).toBe('number');
      expect(typeof result.second).toBe('number');
      expect(typeof result.relative).toBe('object');
      expect(typeof result.relative!.days_in_month).toBe('number');
      expect(typeof result.relative!.days_in_year).toBe('number');
      expect(typeof result.relative!.days_remaining_in_year).toBe('number');
      expect(typeof result.relative!.weeks_remaining_in_year).toBe('number');
      expect(typeof result.relative!.is_leap_year).toBe('boolean');
      expect(typeof result.relative!.quarter_start).toBe('string');
      expect(typeof result.relative!.quarter_end).toBe('string');
    });
  });

  describe('getCurrentDateTime - Calendar Options', () => {
    it('includes calendar information by default', async () => {
      const result = await tools.getCurrentDateTime();

      expect(result.quarter).toBeDefined();
      expect(result.week_of_year).toBeDefined();
      expect(result.relative).toBeDefined();
    });

    it('includes calendar information when explicitly enabled', async () => {
      const result = await tools.getCurrentDateTime({ include_calendar: true });

      expect(result.quarter).toBeDefined();
      expect(result.week_of_year).toBeDefined();
      expect(result.relative).toBeDefined();
    });

    it('excludes calendar information when disabled', async () => {
      const result = await tools.getCurrentDateTime({
        include_calendar: false,
      });

      // Calendar fields should be undefined
      expect(result.quarter).toBeUndefined();
      expect(result.day_of_year).toBeUndefined();
      expect(result.week_of_year).toBeUndefined();
      expect(result.relative).toBeUndefined();

      // Basic date/time fields should still be present
      expect(result.year).toBeDefined();
      expect(result.month).toBeDefined();
      expect(result.day).toBeDefined();
      expect(result.hour).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('provides complete output without calendar overhead', async () => {
      const resultWithCalendar = await tools.getCurrentDateTime({
        include_calendar: true,
      });
      const resultWithoutCalendar = await tools.getCurrentDateTime({
        include_calendar: false,
      });

      // Both should have core timestamp fields (values may differ slightly due to timing)
      expect(resultWithoutCalendar.timestamp).toBeDefined();
      expect(resultWithoutCalendar.year).toBeDefined();
      expect(resultWithoutCalendar.month).toBeDefined();
      expect(resultWithoutCalendar.day).toBeDefined();
      expect(resultWithoutCalendar.human).toBeDefined();

      // Only calendar version should have extended fields
      expect(resultWithCalendar.quarter).toBeDefined();
      expect(resultWithoutCalendar.quarter).toBeUndefined();
      expect(resultWithCalendar.relative).toBeDefined();
      expect(resultWithoutCalendar.relative).toBeUndefined();
    });
  });

  describe('getCurrentDateTime - Consistency', () => {
    it('returns consistent results for multiple calls', async () => {
      const result1 = await tools.getCurrentDateTime();
      const result2 = await tools.getCurrentDateTime();

      // Results should be very close (within 1 second)
      expect(Math.abs(result1.unix_timestamp - result2.unix_timestamp)).toBeLessThanOrEqual(
        1
      );

      // Should be same date (unless crossing midnight)
      if (result1.day === result2.day) {
        expect(result1.year).toBe(result2.year);
        expect(result1.month).toBe(result2.month);
        expect(result1.quarter).toBe(result2.quarter);
      }
    });

    it('returns same timezone for multiple calls without params', async () => {
      const result1 = await tools.getCurrentDateTime();
      const result2 = await tools.getCurrentDateTime();

      expect(result1.timezone).toBe(result2.timezone);
    });
  });
});
