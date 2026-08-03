// Google Keep launcher, shared by the Study and Log screens.
//
// This is a launcher, not a sync. Keep has no public API for personal accounts
// — the Keep API is Workspace-only and service-account oriented, and no
// automation platform (Zapier, IFTTT, Apps Script) carries it either. So the
// most the app can honestly do is hand off to it.
//
// On Android the intent:// URL opens the installed Keep app, falling back to
// the web if it isn't there. Everywhere else it opens the web app.
import { h } from './dom.js';

const KEEP_WEB = 'https://keep.google.com/';
const KEEP_ANDROID = 'intent://keep.google.com/#Intent;scheme=https;package=com.google.android.keep;S.browser_fallback_url=https%3A%2F%2Fkeep.google.com%2F;end';

export const keepHref = () =>
  (/android/i.test(navigator.userAgent) ? KEEP_ANDROID : KEEP_WEB);

export const keepIcon = (size = 17) => h('svg', {
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', 'stroke-width': 1.7,
  'stroke-linecap': 'round', 'stroke-linejoin': 'round',
}, [
  h('path', {d: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.3.3.5.7.5 1.1h6c0-.4.2-.8.5-1.1A6 6 0 0 0 12 3z'}),
]);

// The slim variant — a single line for screens where Keep is a side errand
// rather than one of the main destinations.
export function keepRow(label = 'Jot it in Keep', style = '') {
  return h('a', {
    href: keepHref(), target: '_blank', rel: 'noreferrer',
    style: 'display:inline-flex;align-items:center;gap:6px;text-decoration:none;'
         + 'font-family:var(--font-body);font-size:11.5px;line-height:1.3;'
         + 'color:var(--color-accent-700);' + style,
  }, [
    keepIcon(13),
    h('span', {}, label),
    h('span', {style: 'opacity:0.7'}, '↗'),
  ]);
}
