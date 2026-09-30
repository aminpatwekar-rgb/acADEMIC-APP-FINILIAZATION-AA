/**
 * Theme Utility Classes
 * Replaces hardcoded Tailwind colors with theme-aware CSS variable classes.
 * All components should use these utilities instead of hardcoded slate-*, gray-*, etc.
 */

/**
 * Card/Panel backgrounds — adapts to light/dark mode and theme
 */
export const THEME_CARD_BG = 'bg-card';
export const THEME_CARD_FG = 'text-card-foreground';
export const THEME_CARD_BORDER = 'border-border';

/**
 * Primary action buttons, accents, brand color — matches ThemeContext selection
 */
export const THEME_BRAND_BG = 'bg-brand';
export const THEME_BRAND_HOVER = 'hover:bg-brand-hover';
export const THEME_BRAND_TINT = 'bg-brand-tint';
export const THEME_BRAND_FG = 'text-primary-foreground';

/**
 * Input fields, textareas, form controls
 */
export const THEME_INPUT_BG = 'bg-input';
export const THEME_INPUT_BORDER = 'border-input';
export const THEME_INPUT_FG = 'text-foreground';

/**
 * Muted text and secondary info
 */
export const THEME_MUTED_FG = 'text-muted-foreground';
export const THEME_MUTED_BG = 'bg-muted';

/**
 * Focus rings and active states
 */
export const THEME_RING = 'ring-ring';
export const THEME_FOCUS = `focus:ring-2 focus:ring-offset-2 focus:ring-ring`;

/**
 * Full card panel class (light/dark aware)
 */
export const THEME_CARD_FULL = `${THEME_CARD_BG} border ${THEME_CARD_BORDER} rounded-lg shadow-sm`;

/**
 * Editor/code block background (like inputs but with slightly different contrast)
 */
export const THEME_EDITOR_BG = 'bg-input';
export const THEME_EDITOR_BORDER = 'border-input';

/**
 * Sidebar and major layout sections
 */
export const THEME_SIDEBAR_BG = 'bg-secondary';
export const THEME_SIDEBAR_FG = 'text-secondary-foreground';

/**
 * Primary button class (ready to use)
 */
export const THEME_BUTTON_PRIMARY = `px-4 py-2 rounded-lg ${THEME_BRAND_BG} ${THEME_BRAND_FG} font-medium ${THEME_BRAND_HOVER} transition-colors`;

/**
 * Secondary button class
 */
export const THEME_BUTTON_SECONDARY = `px-4 py-2 rounded-lg ${THEME_CARD_BG} ${THEME_CARD_FG} border ${THEME_CARD_BORDER} font-medium hover:bg-muted transition-colors`;

/**
 * Building complex theme-aware class strings
 * Use these to construct dynamic classes with proper type safety
 */
export function buildThemeCardClass(additionalClasses?: string): string {
  return [THEME_CARD_FULL, additionalClasses].filter(Boolean).join(' ');
}

export function buildThemeBrandButtonClass(additionalClasses?: string): string {
  return [THEME_BUTTON_PRIMARY, additionalClasses].filter(Boolean).join(' ');
}

export function buildThemeInputClass(additionalClasses?: string): string {
  return [
    'w-full px-3 py-2 rounded-lg',
    THEME_INPUT_BG,
    THEME_INPUT_BORDER,
    'border',
    THEME_INPUT_FG,
    'placeholder:text-muted-foreground',
    `focus:ring-2 focus:ring-offset-2 focus:${THEME_RING}`,
    additionalClasses
  ].filter(Boolean).join(' ');
}
