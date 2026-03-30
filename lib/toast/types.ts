export type ToastType = "success" | "info" | "warning" | "error" | "debug";

export interface ToastAction {
  id?: string;
  label: string;
  altText?: string;
  onClick?: () => void;
  href?: string;
  closeOnClick?: boolean;
}

export interface ToastOptions {
  duration?: number;
  dismissible?: boolean;
  title?: string;
  description?: string;
  actions?: ToastAction[];
  metadata?: Record<string, unknown>;
}

export interface ShowToastInput {
  type: ToastType;
  payload: unknown;
  options?: ToastOptions;
}

export interface ToastRecord extends Required<Omit<ToastOptions, "metadata">> {
  id: string;
  type: ToastType;
  payload: unknown;
  metadata?: Record<string, unknown>;
  createdAt: number;
}
