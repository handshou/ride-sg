"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";

export function ToastProvider() {
  const { theme } = useTheme();

  return (
    <Toaster
      position="top-center"
      expand={true}
      richColors={false}
      closeButton={false}
      theme={theme as "light" | "dark" | "system"}
      toastOptions={{
        classNames: {
          toast:
            "bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white shadow-lg",
          title: "text-gray-900 dark:text-white font-medium",
          description: "text-gray-600 dark:text-gray-400",
          actionButton:
            "bg-gray-900 dark:bg-white text-white dark:text-gray-900",
          cancelButton:
            "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
        },
      }}
    />
  );
}
