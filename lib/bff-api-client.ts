import axios, { type AxiosRequestConfig } from "axios";
import { API_CONFIG } from "@/utils/api-config";

type GenericResponse<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
  [key: string]: unknown;
};

function apiOrigin(): string {
  return API_CONFIG.BASE_URL.replace(/\/$/, "");
}

async function request<T>(
  method: "get" | "post" | "put" | "patch" | "delete",
  path: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<GenericResponse<T>> {
  const clean = path.replace(/^\//, "");
  const url = `${apiOrigin()}/api/v1/${clean}`;
  try {
    const res = await axios.request<GenericResponse<T>>({
      method,
      url,
      data: method === "get" || method === "delete" ? undefined : data,
      params: config?.params,
      headers: config?.headers,
      withCredentials: true,
      timeout: config?.timeout ?? 30_000,
    });
    return res.data ?? { success: true };
  } catch (e: unknown) {
    const err = e as { response?: { data?: GenericResponse<T>; status?: number } };
    if (err.response?.data) {
      const out = err.response.data as GenericResponse<T> & { status?: number };
      (out as { status?: number }).status = err.response.status;
      throw out;
    }
    throw e;
  }
}

export const bffApiClient = {
  get: <T = unknown>(path: string, config?: AxiosRequestConfig) =>
    request<T>("get", path, undefined, config),
  post: <T = unknown>(path: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>("post", path, data, config),
  put: <T = unknown>(path: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>("put", path, data, config),
  patch: <T = unknown>(path: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>("patch", path, data, config),
  delete: <T = unknown>(path: string, config?: AxiosRequestConfig) =>
    request<T>("delete", path, undefined, config),
};

export const bffGet = bffApiClient.get;
export const bffPost = bffApiClient.post;
export const bffPut = bffApiClient.put;
export const bffDelete = bffApiClient.delete;
export default bffApiClient;
