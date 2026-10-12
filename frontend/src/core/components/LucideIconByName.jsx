import React from 'react';
import { DynamicIcon, iconNames } from 'lucide-react/dynamic';

/**
 * Renders any Lucide icon from its name, loading only that one icon on demand.
 * Accepts the class style the admin types ("GraduationCap", "graduation-cap",
 * "Graduation Cap"); unknown names fall back to `fallback`.
 */
const ICON_NAME_SET = new Set(iconNames);

/** "GraduationCap" / "graduation cap" / "graduation_cap" → "graduation-cap" */
export const toLucideKebab = (name = '') =>
  String(name)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

/** "graduation-cap" → "GraduationCap" (the format stored on categories) */
export const toLucidePascal = (name = '') =>
  toLucideKebab(name).split('-').filter(Boolean).map(p => p[0].toUpperCase() + p.slice(1)).join('');

// Lucide renamed a few icons; keep the old names working
const ALIASES = { 'more-horizontal': 'ellipsis', 'more-vertical': 'ellipsis-vertical', 'help-circle': 'circle-help', 'check-circle': 'circle-check', 'x-circle': 'circle-x', 'alert-circle': 'circle-alert' };

/** The Lucide name to load for `name`, or null when it isn't a real Lucide icon */
export const resolveLucideName = (name) => {
  const kebab = toLucideKebab(name);
  if (!kebab) return null;
  if (ICON_NAME_SET.has(kebab)) return kebab;
  if (ALIASES[kebab] && ICON_NAME_SET.has(ALIASES[kebab])) return ALIASES[kebab];
  return null;
};

export const isLucideIconName = (name) => resolveLucideName(name) !== null;

/** All Lucide icon names (kebab-case), for search/suggestions */
export const lucideIconNames = iconNames;

export const LucideIconByName = ({ name, fallback = 'briefcase', size = 20, ...props }) => {
  const resolved = resolveLucideName(name) || resolveLucideName(fallback) || 'briefcase';
  return <DynamicIcon name={resolved} size={size} {...props} />;
};

export default LucideIconByName;
