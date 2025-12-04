import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getEvents } from '../../../api/events';
import {
    format,
    subHours,
    subDays,
    startOfHour,
    endOfHour,
    startOfDay,
    endOfDay,
    eachHourOfInterval,
    eachDayOfInterval,
    differenceInHours
} from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../theme-provider';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui/button';

export function TimelineWidget() {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const now = new Date();
    const [start, setStart] = useState(subHours(now, 24));
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Track container resize to force chart re-render
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setContainerSize({ width, height });
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    const { data: events } = useQuery({
        queryKey: ['events', 'timeline-widget', format(start, 'yyyy-MM-dd HH:mm:ss')],
        queryFn: () => getEvents({
            startDateTime: format(start, 'yyyy-MM-dd HH:mm:ss'),
            limit: 1000,
        }),
        refetchInterval: 60000,
    });

    // Quick range handlers
    const setRange = (hours: number) => {
        setStart(subHours(new Date(), hours));
    };

    const setRangeDays = (days: number) => {
        setStart(subDays(new Date(), days));
    };

    // Intelligently aggregate events based on time range
    const { data, tickInterval } = useMemo(() => {
        const hoursDiff = differenceInHours(now, start);
        const useHourly = hoursDiff <= 72; // Use hourly for <= 3 days

        if (useHourly) {
            // Hourly aggregation for short ranges
            const intervals = eachHourOfInterval({ start, end: now });
            const chartData = intervals.map(interval => {
                const intervalStart = startOfHour(interval);
                const intervalEnd = endOfHour(interval);

                const count = events?.events.filter(e => {
                    const eventTime = new Date(e.Event.StartDateTime);
                    return eventTime >= intervalStart && eventTime <= intervalEnd;
                }).length || 0;

                return {
                    time: format(interval, 'HH:mm'),
                    fullTime: format(interval, 'MMM dd HH:mm'),
                    count,
                    intervalStart,
                    intervalEnd,
                };
            });

            // Calculate tick interval: show ~8-12 labels
            const targetLabels = 10;
            const calculatedInterval = Math.max(1, Math.floor(intervals.length / targetLabels));

            return { data: chartData, tickInterval: calculatedInterval };
        } else {
            // Daily aggregation for longer ranges
            const intervals = eachDayOfInterval({ start, end: now });
            const chartData = intervals.map(interval => {
                const intervalStart = startOfDay(interval);
                const intervalEnd = endOfDay(interval);

                const count = events?.events.filter(e => {
                    const eventTime = new Date(e.Event.StartDateTime);
                    return eventTime >= intervalStart && eventTime <= intervalEnd;
                }).length || 0;

                return {
                    time: format(interval, 'MMM dd'),
                    fullTime: format(interval, 'MMM dd, yyyy'),
                    count,
                    intervalStart,
                    intervalEnd,
                };
            });

            // For daily, show fewer labels for longer ranges
            const targetLabels = hoursDiff > 336 ? 6 : 8; // Less labels for month view
            const calculatedInterval = Math.max(0, Math.floor(intervals.length / targetLabels));

            return { data: chartData, tickInterval: calculatedInterval };
        }
    }, [start, now, events]);

    // Handle bar click - navigate to events with time filter
    const handleBarClick = (data: any) => {
        if (data && data.intervalStart && data.intervalEnd) {
            const formatDateTime = (date: Date) => {
                // Format as YYYY-MM-DDTHH:mm for datetime-local input
                return format(date, "yyyy-MM-dd'T'HH:mm");
            };

            navigate(`/events?start=${formatDateTime(data.intervalStart)}&end=${formatDateTime(data.intervalEnd)}`, {
                state: { from: '/dashboard' }
            });
        }
    };

    return (
        <div ref={containerRef} className="w-full h-full flex flex-col p-2 gap-2">
            <div className="flex flex-wrap gap-1 shrink-0">
                <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => setRange(24)}
                >
                    {t('events.past_24_hours')}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => setRange(48)}
                >
                    {t('events.past_48_hours')}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => setRangeDays(7)}
                >
                    {t('events.past_week')}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => setRangeDays(14)}
                >
                    {t('events.past_2_weeks')}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => setRangeDays(30)}
                >
                    {t('events.past_month')}
                </Button>
            </div>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%" key={`${containerSize.width}-${containerSize.height}`}>
                    <BarChart data={data}>
                    <XAxis
                        dataKey="time"
                        stroke="#888888"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        interval={tickInterval}
                        angle={data.length > 50 ? -45 : 0}
                        textAnchor={data.length > 50 ? 'end' : 'middle'}
                        height={data.length > 50 ? 60 : 30}
                    />
                    <YAxis
                        stroke="#888888"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                            borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                            borderRadius: '0.5rem',
                            fontSize: '12px'
                        }}
                        labelFormatter={(value, payload) => {
                            if (payload && payload[0]) {
                                return payload[0].payload.fullTime;
                            }
                            return value;
                        }}
                    />
                    <Bar
                        dataKey="count"
                        fill="currentColor"
                        radius={[4, 4, 0, 0]}
                        className="fill-primary cursor-pointer"
                        onClick={handleBarClick}
                    />
                </BarChart>
            </ResponsiveContainer>
            </div>
        </div>
    );
}
