"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-center"
      expand={true}
      richColors={true}
      closeButton={true}
    />
  );
}
