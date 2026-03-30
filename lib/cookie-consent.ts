/**
 * Cookie Consent Utility
 * Manages cookie consent preferences in localStorage
 */

export interface CookieConsent {
  essential: boolean; // Always true - required for app functionality
  analytics: boolean; // Google Analytics, etc.
  functional: boolean; // Theme, preferences
  marketing: boolean; // Ads, retargeting
  timestamp: string; // When consent was given
  version: string; // Consent version for future updates
}

const CONSENT_KEY = 'flotick-cookie-consent';
const CONSENT_VERSION = '1.0';

/**
 * Default consent state - only essential cookies are allowed by default
 */
export const defaultConsent: CookieConsent = {
  essential: true,
  analytics: false,
  functional: false,
  marketing: false,
  timestamp: '',
  version: CONSENT_VERSION,
};

/**
 * Check if user has given consent
 */
export function hasConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    return stored !== null;
  } catch {
    return false;
  }
}

/**
 * Get current consent preferences
 */
export function getConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return null;
    
    const consent = JSON.parse(stored) as CookieConsent;
    
    // Check if consent version matches current version
    if (consent.version !== CONSENT_VERSION) {
      // Version mismatch - user needs to re-consent
      return null;
    }
    
    return consent;
  } catch {
    return null;
  }
}

/**
 * Save consent preferences
 */
export function saveConsent(consent: Partial<CookieConsent>): void {
  if (typeof window === 'undefined') return;
  try {
    const fullConsent: CookieConsent = {
      essential: true, // Always true
      analytics: consent.analytics ?? false,
      functional: consent.functional ?? true,
      marketing: consent.marketing ?? false,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(fullConsent));
    
    // Dispatch custom event for components to react
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', { 
      detail: fullConsent 
    }));
  } catch (error) {
    console.error('Error saving cookie consent:', error);
  }
}

/**
 * Accept all cookies
 */
export function acceptAllCookies(): void {
  saveConsent({
    essential: true,
    analytics: true,
    functional: true,
    marketing: true,
  });
}

/**
 * Reject all non-essential cookies
 */
export function rejectAllCookies(): void {
  saveConsent({
    essential: true,
    analytics: false,
    functional: false,
    marketing: false,
  });
}

/**
 * Accept only essential cookies
 */
export function acceptEssentialOnly(): void {
  rejectAllCookies();
}

/**
 * Clear consent (for testing or user request)
 */
export function clearConsent(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CONSENT_KEY);
    window.dispatchEvent(new CustomEvent('cookieConsentCleared'));
  } catch (error) {
    console.error('Error clearing cookie consent:', error);
  }
}

/**
 * Check if analytics is allowed
 */
export function isAnalyticsAllowed(): boolean {
  const consent = getConsent();
  return consent?.analytics ?? false;
}

/**
 * Check if functional cookies are allowed
 */
export function isFunctionalAllowed(): boolean {
  const consent = getConsent();
  return consent?.functional ?? false;
}

/**
 * Check if marketing cookies are allowed
 */
export function isMarketingAllowed(): boolean {
  const consent = getConsent();
  return consent?.marketing ?? false;
}
