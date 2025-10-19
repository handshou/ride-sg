"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      expand={true}
      richColors={true}
      closeButton={true}
    />
  );
}
