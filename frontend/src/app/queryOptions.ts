export const LIVE_MONITOR_INTERVAL_MS = 5000

export const liveMonitorQueryOptions = {
  refetchInterval: LIVE_MONITOR_INTERVAL_MS,
  refetchIntervalInBackground: true,
}
