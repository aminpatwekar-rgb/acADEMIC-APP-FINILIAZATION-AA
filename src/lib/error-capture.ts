/**
 * ONYX Enterprise Error Capture & Normalization Engine
 * Safely captures, logs, and normalizes runtime and network exceptions
 * without exposing internal database paths, access tokens, or sensitive credentials.
 */

export interface CapturedError {
  id: string;
  title: string;
  message: string;
  category: 'auth' | 'network' | 'permission' | 'validation' | 'runtime';
  code?: string;
  source: string;
  timestamp: string;
  canRetry: boolean;
  userAgent: string;
  path?: string;
  sanitizedStack?: string;
}

const capturedErrors: CapturedError[] = [];
type ErrorListener = (error: CapturedError) => void;
const listeners = new Set<ErrorListener>();
let globalCaptureInitialized = false;

/**
 * Scrubs sensitive patterns such as bearer tokens, passwords, API keys, and session secrets.
 */
export function scrubSensitiveDetails(text: string): string {
  if (!text) return '';
  return text
    // Strip Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    // Strip apiKey parameters
    .replace(/key=[A-Za-z0-9_\-]+/gi, 'key=[REDACTED]')
    .replace(/apiKey[:=]\s*["']?[A-Za-z0-9_\-]+["']?/gi, 'apiKey="[REDACTED]"')
    // Strip passwords & secrets
    .replace(/password[:=]\s*["']?[^"',\s]+["']?/gi, 'password="[REDACTED]"')
    .replace(/secret[:=]\s*["']?[^"',\s]+["']?/gi, 'secret="[REDACTED]"')
    .replace(/token[:=]\s*["']?[^"',\s]+["']?/gi, 'token="[REDACTED]"')
    // Strip authorization headers
    .replace(/authorization[:=]\s*["']?[^"',\s]+["']?/gi, 'authorization="[REDACTED]"')
    // Strip raw Firebase project IDs and database paths
    .replace(/projects\/[a-zA-Z0-9_\-]+/gi, 'projects/[REDACTED]')
    .replace(/databases\/[a-zA-Z0-9_\-]+/gi, 'databases/[REDACTED]')
    .replace(/project-[0-9a-fA-F-]+/gi, 'project-[REDACTED]');
}

/**
 * Normalizes Firebase and generic exceptions into user-friendly descriptions.
 */
export function normalizeFirebaseError(error: unknown): {
  title: string;
  message: string;
  category: CapturedError['category'];
  code?: string;
  canRetry: boolean;
} {
  let rawStr = '';

  if (typeof error === 'string') {
    rawStr = error;
  } else if (error instanceof Error) {
    rawStr = error.message;
  } else if (error && typeof error === 'object' && 'message' in error) {
    rawStr = String((error as any).message);
  } else {
    rawStr = String(error);
  }

  // Check if this was a stringified FirestoreErrorInfo object
  if (rawStr.startsWith('{') && rawStr.includes('"operationType"')) {
    try {
      const parsed = JSON.parse(rawStr);
      if (parsed.error) rawStr = parsed.error;
    } catch {
      // ignore JSON parse fallback
    }
  }

  const lower = rawStr.toLowerCase();

  // 1. Firebase Auth Errors
  if (lower.includes('auth/invalid-credential') || lower.includes('auth/wrong-password') || lower.includes('auth/invalid-login-credentials')) {
    return {
      title: 'Invalid Credentials',
      message: 'The email address or password entered does not match our records. Please check your credentials and try again.',
      category: 'auth',
      code: 'AUTH_INVALID_CREDENTIALS',
      canRetry: true
    };
  }

  if (lower.includes('auth/user-not-found')) {
    return {
      title: 'Account Not Found',
      message: 'No student or faculty account is associated with this email address.',
      category: 'auth',
      code: 'AUTH_USER_NOT_FOUND',
      canRetry: true
    };
  }

  if (lower.includes('auth/email-already-in-use')) {
    return {
      title: 'Email Already Registered',
      message: 'An ONYX account is already associated with this email address. Please sign in or reset your password.',
      category: 'auth',
      code: 'AUTH_EMAIL_IN_USE',
      canRetry: false
    };
  }

  if (lower.includes('auth/weak-password')) {
    return {
      title: 'Password Requirements Not Met',
      message: 'Password must be at least 6 characters long with a secure combination of letters and numbers.',
      category: 'validation',
      code: 'AUTH_WEAK_PASSWORD',
      canRetry: true
    };
  }

  if (lower.includes('auth/invalid-email')) {
    return {
      title: 'Invalid Email Format',
      message: 'Please provide a valid institutional or personal email address (e.g. name@university.edu).',
      category: 'validation',
      code: 'AUTH_INVALID_EMAIL',
      canRetry: true
    };
  }

  if (lower.includes('auth/too-many-requests')) {
    return {
      title: 'Access Temporarily Suspended',
      message: 'Too many unsuccessful attempts. Access to this account has been temporarily paused for your protection. Please try again later or reset your password.',
      category: 'auth',
      code: 'AUTH_TOO_MANY_REQUESTS',
      canRetry: true
    };
  }

  if (lower.includes('auth/popup-closed-by-user')) {
    return {
      title: 'Sign-in Cancelled',
      message: 'The authentication window was closed before completion. Please try again.',
      category: 'auth',
      code: 'AUTH_POPUP_CLOSED',
      canRetry: true
    };
  }

  // 2. Permission Denied / Authorization
  if (
    lower.includes('permission-denied') ||
    lower.includes('insufficient permission') ||
    lower.includes('missing or insufficient permissions') ||
    lower.includes('forbidden')
  ) {
    return {
      title: 'Access Restricted',
      message: 'You do not have permission to view or modify this academic record. Check your enrolled class permissions or role clearance.',
      category: 'permission',
      code: 'PERMISSION_DENIED',
      canRetry: false
    };
  }

  // 3. Unauthenticated / Session Expired
  if (lower.includes('unauthenticated') || lower.includes('auth/id-token-expired')) {
    return {
      title: 'Session Expired',
      message: 'Your authenticated session has ended. Please sign in again to access course materials.',
      category: 'auth',
      code: 'UNAUTHENTICATED',
      canRetry: true
    };
  }

  // 4. Document or Resource Not Found
  if (lower.includes('not-found') || lower.includes('does not exist')) {
    return {
      title: 'Resource Not Found',
      message: 'The requested assignment, quiz, or course section could not be located. It may have been archived or removed.',
      category: 'runtime',
      code: 'NOT_FOUND',
      canRetry: false
    };
  }

  // 5. Already Exists / Conflict
  if (lower.includes('already-exists') || lower.includes('conflict')) {
    return {
      title: 'Record Already Exists',
      message: 'A course section, assignment, or submission with this identifier is already registered in the system.',
      category: 'validation',
      code: 'ALREADY_EXISTS',
      canRetry: false
    };
  }

  // 6. Offline / Network Connectivity
  if (
    lower.includes('offline') ||
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('unavailable') ||
    lower.includes('connection lost') ||
    lower.includes('timeout')
  ) {
    return {
      title: 'Network Connection Issue',
      message: 'Unable to synchronize with ONYX learning cloud. Please check your internet connection and retry.',
      category: 'network',
      code: 'NETWORK_DISCONNECTED',
      canRetry: true
    };
  }

  // 7. Rate Limits / Resource Exhausted
  if (lower.includes('resource-exhausted') || lower.includes('quota') || lower.includes('too many requests')) {
    return {
      title: 'Service Temporarily Throttled',
      message: 'High academic traffic volume detected. Your request has been queued; please wait a few moments before resubmitting.',
      category: 'network',
      code: 'QUOTA_EXCEEDED',
      canRetry: true
    };
  }

  // 8. Precondition Failed
  if (lower.includes('failed-precondition')) {
    return {
      title: 'Action Precondition Not Met',
      message: 'The requested operation could not be completed in the current system state. An index or requirement is pending.',
      category: 'runtime',
      code: 'FAILED_PRECONDITION',
      canRetry: true
    };
  }

  // Default Sanitized Fallback
  return {
    title: 'Unexpected Error',
    message: scrubSensitiveDetails(rawStr.slice(0, 160)) || 'An unexpected runtime anomaly occurred.',
    category: 'runtime',
    canRetry: true
  };
}

/**
 * Records an error in the audit log, sanitizes information, and notifies listeners.
 */
export function captureError(error: unknown, source: string = 'runtime'): CapturedError {
  const normalized = normalizeFirebaseError(error);
  const errObj = error instanceof Error ? error : null;

  const record: CapturedError = {
    id: Math.random().toString(36).substring(2, 9),
    title: normalized.title,
    message: normalized.message,
    category: normalized.category,
    code: normalized.code,
    source,
    canRetry: normalized.canRetry,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    path: window.location.pathname,
    sanitizedStack: errObj?.stack ? scrubSensitiveDetails(errObj.stack.slice(0, 400)) : undefined
  };

  capturedErrors.push(record);
  if (capturedErrors.length > 50) capturedErrors.shift();

  // Notify active UI listeners
  listeners.forEach(fn => {
    try {
      fn(record);
    } catch (e) {
      console.warn('Error in error-capture listener:', e);
    }
  });

  return record;
}

/**
 * Initialize automatic global runtime error and unhandled rejection trapping.
 */
export function initGlobalErrorCapture(): void {
  if (globalCaptureInitialized || typeof window === 'undefined') return;
  globalCaptureInitialized = true;

  window.addEventListener('error', (event) => {
    // Ignore benign Vite/HMR or extension errors
    if (event.message?.includes('ResizeObserver') || event.message?.includes('chrome-extension')) {
      return;
    }
    captureError(event.error || event.message, `window.onerror: ${event.filename || 'unknown'}:${event.lineno || 0}`);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    captureError(reason, 'window.unhandledrejection');
  });
}

export function subscribeToErrors(listener: ErrorListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCapturedErrors(): CapturedError[] {
  return [...capturedErrors];
}

export function getLastError(): CapturedError | null {
  return capturedErrors.length > 0 ? capturedErrors[capturedErrors.length - 1] : null;
}

export function clearCapturedErrors(): void {
  capturedErrors.length = 0;
}
