import { captureError, scrubSensitiveDetails, getLastError } from './error-capture';

export interface UserFeedbackReport {
  id?: string;
  userEmail?: string;
  userName?: string;
  category: 'bug' | 'visual_glitch' | 'feature_request' | 'performance' | 'accessibility';
  description: string;
  route: string;
  timestamp: string;
  viewport?: { width: number; height: number };
  systemInfo?: {
    isTouch: boolean;
    userAgent: string;
    themeMode: string;
    lastErrorSnippet?: string;
  };
}

export function reportIssue(report: Omit<UserFeedbackReport, 'route' | 'timestamp'>): boolean {
  try {
    const sanitizedUrl = scrubSensitiveDetails(window.location.pathname);
    const lastErr = getLastError();

    const fullReport: UserFeedbackReport = {
      id: Math.random().toString(36).substring(2, 9),
      ...report,
      description: scrubSensitiveDetails(report.description),
      route: sanitizedUrl,
      timestamp: new Date().toISOString(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      systemInfo: {
        isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        userAgent: navigator.userAgent,
        themeMode: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
        lastErrorSnippet: lastErr ? `${lastErr.category.toUpperCase()}: ${lastErr.message}` : undefined
      }
    };

    const storageKey = 'onyx_error_reports';
    const existing: UserFeedbackReport[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
    existing.push(fullReport);
    localStorage.setItem(storageKey, JSON.stringify(existing.slice(-25)));

    // Emit event for UI acknowledgment
    window.dispatchEvent(new CustomEvent('onyx:issue-reported', { detail: fullReport }));
    return true;
  } catch (e) {
    captureError(e, 'lovable-error-reporting');
    return false;
  }
}

export function getStoredIssueReports(): UserFeedbackReport[] {
  try {
    return JSON.parse(localStorage.getItem('onyx_error_reports') || '[]');
  } catch {
    return [];
  }
}

export function clearStoredIssueReports(): void {
  try {
    localStorage.removeItem('onyx_error_reports');
  } catch {}
}
