export type UserRole = 'student' | 'teacher' | 'admin';

const PREVIEW_ROLE_KEY = 'onyx_preview_role';

export const previewAuthStorage = {
  getPreviewRole: (): UserRole | null => {
    try {
      const stored = localStorage.getItem(PREVIEW_ROLE_KEY);
      if (stored === 'student' || stored === 'teacher' || stored === 'admin') {
        return stored;
      }
      return null;
    } catch {
      return null;
    }
  },

  setPreviewRole: (role: UserRole | null) => {
    try {
      if (!role) {
        localStorage.removeItem(PREVIEW_ROLE_KEY);
      } else {
        localStorage.setItem(PREVIEW_ROLE_KEY, role);
      }
    } catch (e) {
      console.error('Failed to set preview role in storage', e);
    }
  },

  clearPreviewRole: () => {
    try {
      localStorage.removeItem(PREVIEW_ROLE_KEY);
    } catch (e) {
      console.error('Failed to clear preview role', e);
    }
  }
};
