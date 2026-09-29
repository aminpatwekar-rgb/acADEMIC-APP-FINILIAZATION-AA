import React, { createContext, useContext, useState, useEffect } from 'react';
import { previewAuthStorage, UserRole } from './previewAuthStorage';
import { Eye, RotateCcw } from 'lucide-react';

interface ViewRoleContextType {
  actualRole: UserRole;
  effectiveRole: UserRole;
  isPreviewing: boolean;
  setPreviewRole: (role: UserRole | null) => void;
  resetRole: () => void;
}

const ViewRoleContext = createContext<ViewRoleContextType>({
  actualRole: 'student',
  effectiveRole: 'student',
  isPreviewing: false,
  setPreviewRole: () => {},
  resetRole: () => {},
});

export function ViewRoleProvider({
  actualRole = 'student',
  authLoading = false,
  children
}: {
  actualRole?: UserRole;
  authLoading?: boolean;
  children: React.ReactNode;
}) {
  const [previewRole, setPreviewRoleState] = useState<UserRole | null>(() => previewAuthStorage.getPreviewRole());

  useEffect(() => {
    // Only clear preview if auth has finished loading and the confirmed actual role is not admin
    if (!authLoading && actualRole !== 'admin' && previewRole) {
      previewAuthStorage.clearPreviewRole();
      setPreviewRoleState(null);
    }
  }, [actualRole, authLoading, previewRole]);

  const setPreviewRole = (role: UserRole | null) => {
    // Only real admins are permitted to initiate role simulations
    if (actualRole !== 'admin') {
      console.warn('Unauthorized attempt to set preview role: Only administrators can simulate roles.');
      return;
    }
    previewAuthStorage.setPreviewRole(role);
    setPreviewRoleState(role);
  };

  const resetRole = () => {
    previewAuthStorage.clearPreviewRole();
    setPreviewRoleState(null);
  };

  const isPreviewing = actualRole === 'admin' && previewRole !== null && previewRole !== actualRole;
  const effectiveRole: UserRole = (actualRole === 'admin' && previewRole) ? previewRole : actualRole;

  return (
    <ViewRoleContext.Provider value={{
      actualRole,
      effectiveRole,
      isPreviewing,
      setPreviewRole,
      resetRole
    }}>
      {children}
    </ViewRoleContext.Provider>
  );
}

export function useViewRole() {
  return useContext(ViewRoleContext);
}

export function RolePreviewBanner() {
  const { isPreviewing, effectiveRole, actualRole, resetRole } = useViewRole();

  if (!isPreviewing) return null;

  const roleLabel = effectiveRole.charAt(0).toUpperCase() + effectiveRole.slice(1);
  const actualRoleLabel = actualRole.charAt(0).toUpperCase() + actualRole.slice(1);

  return (
    <div className="w-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs sm:text-sm font-medium mb-6 shadow-xs animate-in fade-in duration-200">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>
          Previewing as <strong className="font-semibold">{roleLabel}</strong> — your account&apos;s actual role is <strong className="font-semibold">{actualRoleLabel}</strong>. Real permissions remain protected by Firebase rules.
        </span>
      </div>
      <button
        onClick={resetRole}
        className="text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 font-semibold underline underline-offset-2 ml-4 shrink-0 transition-colors cursor-pointer flex items-center gap-1"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset to {actualRole}
      </button>
    </div>
  );
}
