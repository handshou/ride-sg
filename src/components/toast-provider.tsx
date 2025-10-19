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
      closeButton={true}
      theme={theme as "light" | "dark" | "system"}
      toastOptions={{
        classNames: {
          toast:
            "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white",
          title: "text-gray-900 dark:text-white",
          description: "text-gray-600 dark:text-gray-400",
          actionButton:
            "bg-gray-900 dark:bg-white text-white dark:text-gray-900",
          cancelButton:
            "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
          closeButton:
            "!top-1.5 !left-1.5 !bg-transparent !border-0 !text-gray-400 hover:!text-gray-600 dark:!text-gray-500 dark:hover:!text-gray-300 !shadow-none !rounded-none",
        },
      }}
    />
  );
}
