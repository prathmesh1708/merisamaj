/**
 * Language switch on screens that have no app header: "Login as", member login /
 * registration / onboarding, Head and Admin login, and the public policy pages.
 * Signed-in screens use the switcher inside their own header instead.
 */
import { useLocation } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';

const PUBLIC_SCREENS = [
  /^\/login\/?$/,
  /^\/member\/(login|register|onboarding)\/?$/,
  /^\/head\/login\/?$/,
  /^\/admin\/login\/?$/,
  /^\/(privacy-policy|child-safety)\/?$/
];

const FloatingLanguageSwitcher = () => {
  const { pathname } = useLocation();
  if (!PUBLIC_SCREENS.some(re => re.test(pathname))) return null;
  return (
    <div
      className="fixed right-3 z-[70]"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
    >
      <LanguageSwitcher size="sm" className="bg-white/90 backdrop-blur shadow-md" />
    </div>
  );
};

export default FloatingLanguageSwitcher;
