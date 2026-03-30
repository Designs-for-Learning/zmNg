import { create } from 'zustand';
import { LOGGING } from '../lib/zmninja-ng-constants';

export interface LogEntry {
    id: string;
    timestamp: string;
    /** Epoch ms — used to format at display time with user's date/time settings */
    rawTimestamp?: number;
    level: string;
    message: string;
    context?: Record<string, unknown>;
    args?: unknown[];
}

interface LogState {
    logs: LogEntry[];
    addLog: (entry: Omit<LogEntry, 'id'>) => void;
    clearLogs: () => void;
}

export const useLogStore = create<LogState>((set) => ({
    logs: [],
    addLog: (entry) =>
        set((state) => {
            const newLog = { ...entry, id: crypto.randomUUID() };
            // Keep last N logs as configured
            const newLogs = [newLog, ...state.logs].slice(0, LOGGING.maxLogEntries);
            return { logs: newLogs };
        }),
    clearLogs: () => set({ logs: [] }),
}));
