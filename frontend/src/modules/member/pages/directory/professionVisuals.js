import {
  Stethoscope, HardHat, Briefcase, GraduationCap, Scale, Landmark,
  HeartPulse, Laptop, TrendingUp, Factory, Truck, Home,
  UtensilsCrossed, Palette, Dumbbell, Video, Heart, ShoppingCart,
  Plane, Users, Leaf, User
} from 'lucide-react';

// Keyword → color-family mapping. Real profession strings vary, so this matches
// on substrings rather than exact names — "Software Engineer" still matches
// "Engineer", "Business Owner" still matches "Business", etc. One Tailwind
// color family (e.g. "sky") drives the box background, border and icon color,
// matching the compact admin stat-box look (light bg + light border + colored icon).
const KEYWORD_VISUALS = [
  { keywords: ['doctor', 'physician', 'surgeon'], icon: Stethoscope, color: 'sky' },
  { keywords: ['engineer'], icon: HardHat, color: 'emerald' },
  { keywords: ['business', 'entrepreneur', 'owner'], icon: Briefcase, color: 'amber' },
  { keywords: ['teacher', 'professor', 'lecturer', 'education'], icon: GraduationCap, color: 'rose' },
  { keywords: ['student'], icon: GraduationCap, color: 'purple' },
  { keywords: ['lawyer', 'advocate', 'legal'], icon: Scale, color: 'pink' },
  { keywords: ['government', 'govt', 'civil servant'], icon: Landmark, color: 'blue' },
  { keywords: ['nurse'], icon: HeartPulse, color: 'teal' },
  { keywords: ['it ', 'software', 'developer', 'programmer', 'tech'], icon: Laptop, color: 'orange' },
  { keywords: ['agricult', 'farm'], icon: Leaf, color: 'lime' },
  { keywords: ['finance', 'accountant', 'ca', 'banking', 'bank'], icon: TrendingUp, color: 'cyan' },
  { keywords: ['shop', 'retail', 'ecommerce', 'e-commerce'], icon: ShoppingCart, color: 'yellow' },
  { keywords: ['manufactur', 'factory', 'production'], icon: Factory, color: 'violet' },
  { keywords: ['transport', 'logistics', 'driver'], icon: Truck, color: 'orange' },
  { keywords: ['real estate', 'property', 'builder'], icon: Home, color: 'red' },
  { keywords: ['hotel', 'restaurant', 'chef', 'hospitality'], icon: UtensilsCrossed, color: 'fuchsia' },
  { keywords: ['artist', 'designer', 'interior'], icon: Palette, color: 'green' },
  { keywords: ['fitness', 'sports', 'trainer', 'gym'], icon: Dumbbell, color: 'orange' },
  { keywords: ['media', 'entertainment', 'film', 'actor'], icon: Video, color: 'indigo' },
  { keywords: ['social work', 'ngo', 'volunteer', 'nonprofit'], icon: Heart, color: 'rose' },
  { keywords: ['travel', 'tourism'], icon: Plane, color: 'sky' },
  { keywords: ['homemaker', 'housewife'], icon: Home, color: 'pink' }
];

const FALLBACK_COLORS = ['purple', 'blue', 'emerald', 'amber', 'rose', 'teal'];

// Deterministic fallback color per name (so the same profession always gets
// the same color across renders) when no keyword matches.
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
};

// Full Tailwind class names written out (not built from string interpolation)
// so Tailwind's content scanner picks them up at build time.
const COLOR_CLASSES = {
  sky:      { bg: 'bg-sky-50',      border: 'border-sky-100',      text: 'text-sky-500' },
  emerald:  { bg: 'bg-emerald-50',  border: 'border-emerald-100',  text: 'text-emerald-500' },
  amber:    { bg: 'bg-amber-50',    border: 'border-amber-100',    text: 'text-amber-500' },
  rose:     { bg: 'bg-rose-50',     border: 'border-rose-100',     text: 'text-rose-500' },
  purple:   { bg: 'bg-purple-50',   border: 'border-purple-100',   text: 'text-purple-500' },
  pink:     { bg: 'bg-pink-50',     border: 'border-pink-100',     text: 'text-pink-500' },
  blue:     { bg: 'bg-blue-50',     border: 'border-blue-100',     text: 'text-blue-500' },
  teal:     { bg: 'bg-teal-50',     border: 'border-teal-100',     text: 'text-teal-500' },
  orange:   { bg: 'bg-orange-50',   border: 'border-orange-100',   text: 'text-orange-500' },
  lime:     { bg: 'bg-lime-50',     border: 'border-lime-100',     text: 'text-lime-600' },
  cyan:     { bg: 'bg-cyan-50',     border: 'border-cyan-100',     text: 'text-cyan-500' },
  yellow:   { bg: 'bg-yellow-50',   border: 'border-yellow-100',   text: 'text-yellow-600' },
  violet:   { bg: 'bg-violet-50',   border: 'border-violet-100',   text: 'text-violet-500' },
  red:      { bg: 'bg-red-50',      border: 'border-red-100',      text: 'text-red-500' },
  fuchsia:  { bg: 'bg-fuchsia-50',  border: 'border-fuchsia-100',  text: 'text-fuchsia-500' },
  green:    { bg: 'bg-green-50',    border: 'border-green-100',    text: 'text-green-500' },
  indigo:   { bg: 'bg-indigo-50',   border: 'border-indigo-100',   text: 'text-indigo-500' }
};

export const getProfessionVisual = (name) => {
  const lower = (name || '').toLowerCase();
  const match = KEYWORD_VISUALS.find(v => v.keywords.some(k => lower.includes(k)));
  const color = match ? match.color : FALLBACK_COLORS[hashString(lower) % FALLBACK_COLORS.length];
  const icon = match ? match.icon : User;
  return { icon, ...COLOR_CLASSES[color] };
};
