const TOKEN_KEY = "flotick_employee_trusted_device";
const REMEMBER_PREF_KEY = "flotick_employee_trust_device_pref";

export const employeeTrustedDevice = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
  },

  getRememberPreference(): boolean {
    if (typeof window === "undefined") return true;
    const raw = localStorage.getItem(REMEMBER_PREF_KEY);
    if (raw === null) return true;
    return raw === "1";
  },

  setRememberPreference(value: boolean): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(REMEMBER_PREF_KEY, value ? "1" : "0");
  },
};
