/**
 * Monitor Filtering Utilities
 * 
 * Helper functions to filter and process monitor lists.
 * Primarily used to exclude deleted or disabled monitors from views.
 */

import type { MonitorData } from '../api/types';

/**
 * Filter monitors to only show non-deleted ones.
 * 
 * @param monitors - List of monitor data objects
 * @returns Filtered list of active monitors
 */
export function filterEnabledMonitors(monitors: MonitorData[]): MonitorData[] {
  return monitors.filter(
    ({ Monitor }) => Monitor.Deleted !== true
  );
}

/**
 * Get IDs of enabled monitors.
 * 
 * @param monitors - List of monitor data objects
 * @returns Array of monitor IDs
 */
export function getEnabledMonitorIds(monitors: MonitorData[]): string[] {
  return filterEnabledMonitors(monitors).map(({ Monitor }) => Monitor.Id);
}

/**
 * Check if a specific monitor ID corresponds to an enabled (non-deleted) monitor.
 * 
 * @param monitorId - The ID to check
 * @param monitors - The full list of monitors to check against
 * @returns True if the monitor exists and is not deleted
 */
export function isMonitorEnabled(monitorId: string, monitors: MonitorData[]): boolean {
  const monitor = monitors.find(({ Monitor }) => Monitor.Id === monitorId);
  return monitor ? monitor.Monitor.Deleted !== true : false;
}
