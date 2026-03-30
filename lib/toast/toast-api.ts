"use client";

import { useToastStore } from "@/lib/stores/toast-store";
import type { ShowToastInput, ToastOptions } from "@/lib/toast/types";

export function showToast(input: ShowToastInput) {
  return useToastStore.getState().enqueueToast(input);
}

export function dismissToast(id: string) {
  useToastStore.getState().dismissToast(id);
}

export function clearToasts() {
  useToastStore.getState().clearToasts();
}

export function showErrorToast(error: unknown, options?: ToastOptions) {
  return showToast({
    type: "error",
    payload: { error },
    options,
  });
}
