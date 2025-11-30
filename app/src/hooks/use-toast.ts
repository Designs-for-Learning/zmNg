/**
 * Toast Notification Hook
 * 
 * A wrapper around the 'sonner' toast library to provide a consistent API
 * compatible with shadcn/ui components.
 * 
 * Usage:
 * const { toast } = useToast();
 * toast({ title: "Success", description: "Operation completed" });
 */

import { toast as sonnerToast } from 'sonner';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  return {
    /**
     * Display a toast notification.
     * 
     * @param options - Toast configuration
     * @param options.title - Main message
     * @param options.description - Secondary detail text
     * @param options.variant - 'default' (neutral) or 'destructive' (error/red)
     */
    toast: ({ title, description, variant }: ToastOptions) => {
      if (variant === 'destructive') {
        sonnerToast.error(title, {
          description,
        });
      } else {
        sonnerToast(title, {
          description,
        });
      }
    },
  };
}
