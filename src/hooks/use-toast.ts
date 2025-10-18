"use client";

import { toast } from "sonner";

/**
 * Client-side toast notifications using Sonner
 */
export const useToast = () => {
  return {
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    warning: (message: string) => toast.warning(message),
    info: (message: string) => toast.info(message),
  };
};

/**
 * Direct toast functions for use in client components
 */
export const toastNotifications = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast.warning(message),
  info: (message: string) => toast.info(message),
};
