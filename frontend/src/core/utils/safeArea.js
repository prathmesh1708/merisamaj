/**
 * Some Android app shells place the WebView *below* the status bar but still report the
 * status-bar height as `safe-area-inset-top`. Headers that add that inset then show an
 * empty band above them (the space is counted twice).
 *
 * We detect that case and set `--spacing-safe-top` to 0. Use `var(--spacing-safe-top)`
 * instead of `env(safe-area-inset-top)` in components so they follow this fix.
 *
 * Detection: the WebView reaches under the bottom system bar (bottom inset > 0) but the
 * screen space it does NOT cover is at least the reported top inset, so the status bar is
 * outside the WebView and its inset must not be added again.
 */
const readInset = (side) => {
  const probe = document.createElement('div');
  probe.style.cssText = `position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;height:env(safe-area-inset-${side}, 0px)`;
  document.body.appendChild(probe);
  const value = probe.getBoundingClientRect().height;
  probe.remove();
  return value;
};

let tallestViewport = 0;
let lastPortrait = null;

const update = () => {
  const root = document.documentElement;
  const isPortrait = window.innerHeight >= window.innerWidth;
  // The keyboard only ever shrinks the viewport, so remember the tallest one we've seen
  if (isPortrait !== lastPortrait) { tallestViewport = 0; lastPortrait = isPortrait; }
  tallestViewport = Math.max(tallestViewport, window.innerHeight);

  root.style.removeProperty('--spacing-safe-top');
  const top = readInset('top');
  const bottom = readInset('bottom');
  if (!top) return;

  const screenHeight = isPortrait
    ? Math.max(window.screen.width, window.screen.height)
    : Math.min(window.screen.width, window.screen.height);
  const uncovered = screenHeight - tallestViewport;

  if (bottom > 0 && uncovered >= top - 4) {
    root.style.setProperty('--spacing-safe-top', '0px');
  }
};

export const initSafeArea = () => {
  if (typeof window === 'undefined') return;
  update();
  // Insets can arrive a moment after load in the Android app; re-check on size changes
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', () => setTimeout(update, 300));
  setTimeout(update, 500);
};
