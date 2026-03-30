/**
 * Timeline Filters Hook
 *
 * Persists filter selections to the settings store.
 * Mirrors Events filter options (monitors, date range, object detection)
 * but stored independently under timelinePageFilters.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCurrentProfile } from './useCurrentProfile';
import { useSettingsStore } from '../stores/settings';

interface UseTimelineFiltersReturn {
  selectedMonitorIds: string[];
  startDateInput: string;
  endDateInput: string;
  onlyDetectedObjects: boolean;
  setSelectedMonitorIds: (ids: string[]) => void;
  setStartDateInput: (date: string) => void;
  setEndDateInput: (date: string) => void;
  setOnlyDetectedObjects: (enabled: boolean) => void;
  clearFilters: () => void;
  activeFilterCount: number;
}

function saveFilterField(profileId: string, field: string, value: unknown) {
  const store = useSettingsStore.getState();
  const current = store.getProfileSettings(profileId).timelinePageFilters;
  store.updateProfileSettings(profileId, {
    timelinePageFilters: { ...current, [field]: value },
  });
}

export function useTimelineFilters(): UseTimelineFiltersReturn {
  const { currentProfile, settings } = useCurrentProfile();

  const [selectedMonitorIds, _setMonitorIds] = useState<string[]>([]);
  const [startDateInput, _setStartDate] = useState('');
  const [endDateInput, _setEndDate] = useState('');
  const [onlyDetectedObjects, _setOnlyDetected] = useState(false);

  const profileIdRef = useRef<string | null>(null);
  profileIdRef.current = currentProfile?.id ?? null;

  const setSelectedMonitorIds = useCallback((ids: string[]) => {
    _setMonitorIds(ids);
    if (profileIdRef.current) saveFilterField(profileIdRef.current, 'monitorIds', ids);
  }, []);

  const setStartDateInput = useCallback((date: string) => {
    _setStartDate(date);
    if (profileIdRef.current) saveFilterField(profileIdRef.current, 'startDateTime', date);
  }, []);

  const setEndDateInput = useCallback((date: string) => {
    _setEndDate(date);
    if (profileIdRef.current) saveFilterField(profileIdRef.current, 'endDateTime', date);
  }, []);

  const setOnlyDetectedObjects = useCallback((enabled: boolean) => {
    _setOnlyDetected(enabled);
    if (profileIdRef.current) saveFilterField(profileIdRef.current, 'onlyDetectedObjects', enabled);
  }, []);

  // Restore from persisted settings on mount / profile change
  const prevSettingsRef = useRef<string>('');
  useEffect(() => {
    if (!currentProfile) return;
    const saved = settings.timelinePageFilters;
    const settingsKey = JSON.stringify(saved);
    if (settingsKey === prevSettingsRef.current) return;
    prevSettingsRef.current = settingsKey;

    _setMonitorIds(saved.monitorIds);
    _setStartDate(saved.startDateTime);
    _setEndDate(saved.endDateTime);
    _setOnlyDetected(saved.onlyDetectedObjects);
  }, [currentProfile?.id, settings.timelinePageFilters]);

  const clearFilters = useCallback(() => {
    setSelectedMonitorIds([]);
    setStartDateInput('');
    setEndDateInput('');
    setOnlyDetectedObjects(false);
  }, [setSelectedMonitorIds, setStartDateInput, setEndDateInput, setOnlyDetectedObjects]);

  const activeFilterCount =
    (selectedMonitorIds.length > 0 ? 1 : 0) +
    (startDateInput ? 1 : 0) +
    (endDateInput ? 1 : 0) +
    (onlyDetectedObjects ? 1 : 0);

  return {
    selectedMonitorIds, startDateInput, endDateInput, onlyDetectedObjects,
    setSelectedMonitorIds, setStartDateInput, setEndDateInput, setOnlyDetectedObjects,
    clearFilters, activeFilterCount,
  };
}
