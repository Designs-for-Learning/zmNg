/**
 * Inline notification badge — small bell icon with unread count.
 * Only renders when there are unread notifications.
 * Rings when new notifications arrive.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useProfileStore } from '../stores/profile';
import { useNotificationStore } from '../stores/notifications';
import { cn } from '../lib/utils';

export function NotificationBadge() {
  const navigate = useNavigate();
  const currentProfileId = useProfileStore((state) => state.currentProfileId);
  const unreadCount = useNotificationStore((state) => {
    if (!currentProfileId) return 0;
    const events = state.profileEvents[currentProfileId] || [];
    return events.filter((e) => !e.read).length;
  });

  const [isRinging, setIsRinging] = useState(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (unreadCount > prevCountRef.current) {
      setIsRinging(true);
      const timeout = setTimeout(() => setIsRinging(false), 1000);
      prevCountRef.current = unreadCount;
      return () => clearTimeout(timeout);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  if (unreadCount === 0) return null;

  return (
    <button
      className="relative inline-flex items-center justify-center h-7 w-7 rounded-full bg-muted hover:bg-muted/80 transition-colors"
      onClick={(e) => { e.stopPropagation(); navigate('/notifications/history'); }}
      aria-label={`${unreadCount} unread notifications`}
      data-testid="notification-badge"
    >
      <Bell className={cn(
        "h-3.5 w-3.5 text-muted-foreground",
        isRinging && "animate-[ring_0.5s_ease-in-out_2]"
      )} />
      <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 flex items-center justify-center text-[9px] font-bold rounded-full bg-destructive text-destructive-foreground">
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    </button>
  );
}
