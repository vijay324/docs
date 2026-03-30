export const platformAdminTrustedDevice = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('pa_trusted_device');
  },
  setToken: (token: string) => {},
  clearToken: () => {},
  getPreference: (): boolean => false,
  setPreference: (pref: any) => {}
};
