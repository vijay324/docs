"use client";

import { create } from "zustand";
import { DEFAULT_TOAST_DURATION, MAX_VISIBLE_TOASTS } from "@/lib/toast/constants";
import type { ShowToastInput, ToastRecord } from "@/lib/toast/types";

interface ToastState {
  toasts: ToastRecord[];
  enqueueToast: (input: ShowToastInput & { id?: string }) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

function createToastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  enqueueToast: (input) => {
    const id = input.id ?? createToastId();
    const duration = input.options?.duration ?? DEFAULT_TOAST_DURATION;
    const dismissible = input.options?.dismissible ?? true;
    const title = input.options?.title ?? "";
    const description = input.options?.description ?? "";
    const actions = input.options?.actions ?? [];
    const metadata = input.options?.metadata;

    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id,
          type: input.type,
          payload: input.payload,
          duration,
          dismissible,
          title,
          description,
          actions,
          metadata,
          createdAt: Date.now(),
        },
      ].slice(-MAX_VISIBLE_TOASTS),
    }));

    return id;
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));
