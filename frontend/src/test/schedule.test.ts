import { describeSchedule, scheduleDetail } from '../utils/schedule'

test('describes common cron schedules for the UI', () => {
  expect(describeSchedule('0 2 * * *')).toBe('Daily at 02:00 UTC')
  expect(describeSchedule('*/15 * * * *')).toBe('Every 15 minutes')
  expect(describeSchedule('0 */6 * * *')).toBe('Every 6 hours at :00 UTC')
  expect(scheduleDetail('0 2 * * *')).toBe('0 2 * * *')
})
