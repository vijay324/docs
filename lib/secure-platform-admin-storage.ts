export class SecurePlatformAdminStorage {
  static syncFromCookies(): void {}
  static getAccessToken(): string | null { 
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('pa_access'); 
  }
  static getRefreshToken(): string | null { 
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('pa_refresh'); 
  }
  static setTokens(access: string, refresh: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('pa_access', access);
    localStorage.setItem('pa_refresh', refresh);
  }
  static setAdminData(data: any): void { 
    if (typeof window === 'undefined') return;
    localStorage.setItem('pa_admin', JSON.stringify(data)); 
  }
  static getAdminData(): any | null { 
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem('pa_admin') || 'null') } catch { return null }
  }
  static clearAll(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('pa_access');
    localStorage.removeItem('pa_refresh');
    localStorage.removeItem('pa_admin');
  }
  static isAuthenticated(): boolean { return !!this.getAccessToken() }
  static needsRefresh(): boolean { return false }
  static verifyFingerprint(): boolean { return true }
}
