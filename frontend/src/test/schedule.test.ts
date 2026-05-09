import { cronToScheduleForm, describeSchedule, scheduleDetail, scheduleFormToCron } from '../utils/schedule'

test('describes common cron schedules for the UI', () => {
  expect(describeSchedule('0 2 * * *')).toBe('Daily at 02:00 UTC')
  expect(describeSchedule('*/15 * * * *')).toBe('Every 15 minutes')
  expect(describeSchedule('0 */6 * * *')).toBe('Every 6 hours at :00 UTC')
  expect(scheduleDetail('0 2 * * *')).toBe('0 2 * * *')
})

test('converts friendly schedule controls to cron', () => {
  expect(scheduleFormToCron({ enabled: false, mode: 'daily', time: '09:00', intervalHours: 6 })).toBe('')
  expect(scheduleFormToCron({ enabled: true, mode: 'daily', time: '09:30', intervalHours: 6 })).toBe('30 9 * * *')
  expect(scheduleFormToCron({ enabled: true, mode: 'weekdays', time: '08:15', intervalHours: 6 })).toBe('15 8 * * 1-5')
  expect(scheduleFormToCron({ enabled: true, mode: 'hourly', time: '00:10', intervalHours: 4 })).toBe('10 */4 * * *')
})

test('converts existing cron into friendly schedule controls', () => {
  expect(cronToScheduleForm('30 9 * * *')).toMatchObject({ enabled: true, mode: 'daily', time: '09:30' })
  expect(cronToScheduleForm('15 8 * * 1-5')).toMatchObject({ enabled: true, mode: 'weekdays', time: '08:15' })
  expect(cronToScheduleForm('10 */4 * * *')).toMatchObject({ enabled: true, mode: 'hourly', intervalHours: 4 })
})
