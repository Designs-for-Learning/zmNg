import { useState } from 'react';
import { Maximize2, Minimize2, Calendar, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CardDescription, CardTitle } from '../ui/card';
import { CollapsibleCard } from '../ui/collapsible-card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useSettingsStore, type DateFormatPreset, type TimeFormatPreset } from '../../stores/settings';
import { useCurrentProfile } from '../../hooks/useCurrentProfile';
import { validateFormatString } from '../../lib/format-date-time';

const DATE_PRESETS: { value: DateFormatPreset; label: string; example: string }[] = [
    { value: 'MMM d, yyyy', label: 'MMM D, YYYY', example: '' },
    { value: 'MMM d', label: 'MMM D', example: '' },
    { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY', example: '' },
    { value: 'dd/MM', label: 'DD/MM', example: '' },
    { value: 'custom', label: 'Custom...', example: '' },
];

const TIME_PRESETS: { value: TimeFormatPreset; label: string; example: string }[] = [
    { value: '12h', label: '12-hour', example: '' },
    { value: '24h', label: '24-hour', example: '' },
    { value: 'custom', label: 'Custom...', example: '' },
];

// date-fns tokens reference for the help tooltip
const FORMAT_TOKENS = 'yyyy=year, MM=month, dd=day, MMM=abbr month, EEE=weekday, HH=24h, hh=12h, mm=min, ss=sec, a=AM/PM';

function getDateExample(preset: DateFormatPreset, custom: string): string {
    if (preset === 'custom') {
        return validateFormatString(custom) || 'Invalid';
    }
    return validateFormatString(preset) || '';
}

function getTimeExample(preset: TimeFormatPreset, custom: string): string {
    if (preset === 'custom') {
        return validateFormatString(custom) || 'Invalid';
    }
    if (preset === '12h') return validateFormatString('h:mm:ss a') || '';
    return validateFormatString('HH:mm:ss') || '';
}

export function DisplaySettings() {
    const { t } = useTranslation();

    const { currentProfile, settings } = useCurrentProfile();
    const updateSettings = useSettingsStore((state) => state.updateProfileSettings);

    const [customDateDraft, setCustomDateDraft] = useState(settings.customDateFormat);
    const [customTimeDraft, setCustomTimeDraft] = useState(settings.customTimeFormat);

    const update = <K extends keyof Parameters<typeof updateSettings>[1]>(
        key: K,
        value: Parameters<typeof updateSettings>[1][K]
    ) => {
        if (!currentProfile) return;
        updateSettings(currentProfile.id, { [key]: value });
    };

    const handleDisplayModeChange = (checked: boolean) => {
        if (!currentProfile) return;
        updateSettings(currentProfile.id, {
            displayMode: checked ? 'compact' : 'normal',
        });
    };

    const customDatePreview = validateFormatString(customDateDraft);
    const customTimePreview = validateFormatString(customTimeDraft);

    return (
        <CollapsibleCard storageKey="settings-display"
            header={
                <>
                    <div className="flex items-center gap-2">
                        <Minimize2 className="h-5 w-5 text-primary" />
                        <CardTitle>{t('settings.display_mode')}</CardTitle>
                    </div>
                    <CardDescription>
                        {t('settings.display_mode_desc')}
                    </CardDescription>
                </>
            }
        >
            <div className="space-y-6">
                {/* Compact Mode Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="display-mode" className="text-base font-semibold">
                                {t('settings.compact_view')}
                            </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {settings.displayMode === 'compact'
                                ? t('settings.compact_view_desc')
                                : t('settings.normal_view_desc')}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-sm">
                            <Maximize2 className="h-4 w-4" />
                            <span className="font-medium">{t('settings.normal')}</span>
                        </div>
                        <Switch
                            id="display-mode"
                            checked={settings.displayMode === 'compact'}
                            onCheckedChange={handleDisplayModeChange}
                            data-testid="settings-display-mode-switch"
                        />
                        <div className="flex items-center gap-2 text-sm">
                            <Minimize2 className="h-4 w-4" />
                            <span className="font-medium">{t('settings.compact')}</span>
                        </div>
                    </div>
                </div>

                {/* Date Format */}
                <div className="p-4 rounded-lg border bg-card space-y-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <Label className="text-base font-semibold">{t('settings.date_format')}</Label>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <Select
                            value={settings.dateFormat}
                            onValueChange={(v) => update('dateFormat', v as DateFormatPreset)}
                        >
                            <SelectTrigger className="w-48" data-testid="settings-date-format">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DATE_PRESETS.map(({ value, label }) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground">
                            {getDateExample(settings.dateFormat, settings.customDateFormat)}
                        </span>
                    </div>
                    {settings.dateFormat === 'custom' && (
                        <div className="space-y-2 ml-1">
                            <div className="flex items-center gap-3">
                                <Input
                                    value={customDateDraft}
                                    onChange={(e) => setCustomDateDraft(e.target.value)}
                                    onBlur={() => {
                                        if (customDatePreview) update('customDateFormat', customDateDraft);
                                    }}
                                    placeholder="EEE, MMM d yyyy"
                                    className="w-48 font-mono text-sm"
                                    data-testid="settings-custom-date-format"
                                />
                                <span className={customDatePreview ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
                                    {customDatePreview || t('settings.invalid_format')}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{FORMAT_TOKENS}</p>
                        </div>
                    )}
                </div>

                {/* Time Format */}
                <div className="p-4 rounded-lg border bg-card space-y-3">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <Label className="text-base font-semibold">{t('settings.time_format')}</Label>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <Select
                            value={settings.timeFormat}
                            onValueChange={(v) => update('timeFormat', v as TimeFormatPreset)}
                        >
                            <SelectTrigger className="w-48" data-testid="settings-time-format">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TIME_PRESETS.map(({ value, label }) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground">
                            {getTimeExample(settings.timeFormat, settings.customTimeFormat)}
                        </span>
                    </div>
                    {settings.timeFormat === 'custom' && (
                        <div className="space-y-2 ml-1">
                            <div className="flex items-center gap-3">
                                <Input
                                    value={customTimeDraft}
                                    onChange={(e) => setCustomTimeDraft(e.target.value)}
                                    onBlur={() => {
                                        if (customTimePreview) update('customTimeFormat', customTimeDraft);
                                    }}
                                    placeholder="h:mm:ss a"
                                    className="w-48 font-mono text-sm"
                                    data-testid="settings-custom-time-format"
                                />
                                <span className={customTimePreview ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
                                    {customTimePreview || t('settings.invalid_format')}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{FORMAT_TOKENS}</p>
                        </div>
                    )}
                </div>
            </div>
        </CollapsibleCard>
    );
}
