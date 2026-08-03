// Study screen — the SIMPLER version that reference/Kata.dc.html's `isStudy`
// block actually renders (per the fidelity note in reference/HANDOFF.md): two
// link-cards (Google Form / Google Sheet, opened in a new tab) plus an
// embeddable Google Form iframe with a show/hide toggle. The richer
// search/filter/item-card UI described in an older README fragment is NOT
// built here — it's documented as a future enhancement only. The store still
// keeps the full study-item state shape and CRUD methods (addStudy,
// patchStudy, cycleStudyStatus, pullSheet/parseCsv, pushSheet, flushPush) —
// see src/state/store.js — as cheap insurance for that richer UI later.
import { h } from '../lib/dom.js';

const plusIcon = () => h('svg', {width:17, height:17, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':1.7, 'stroke-linecap':'round', 'stroke-linejoin':'round'}, [h('path', {d:'M12 5v14M5 12h14'})]);
// Keep has no public API for personal accounts, so this is a launcher, not a
// sync: on Android the intent:// URL hands off to the installed Keep app (and
// falls back to the web if it isn't there); everywhere else it opens the web
// app in a new tab.
const KEEP_WEB = 'https://keep.google.com/';
const KEEP_ANDROID = 'intent://keep.google.com/#Intent;scheme=https;package=com.google.android.keep;S.browser_fallback_url=https%3A%2F%2Fkeep.google.com%2F;end';
const keepHref = () => (/android/i.test(navigator.userAgent) ? KEEP_ANDROID : KEEP_WEB);

const keepIcon = () => h('svg', {width:17, height:17, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':1.7, 'stroke-linecap':'round', 'stroke-linejoin':'round'}, [
  h('path', {d:'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.3.3.5.7.5 1.1h6c0-.4.2-.8.5-1.1A6 6 0 0 0 12 3z'}),
]);

const sheetIcon = () => h('svg', {width:17, height:17, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':1.7, 'stroke-linecap':'round', 'stroke-linejoin':'round'}, [
  h('rect', {x:4, y:4, width:16, height:16, rx:1.5}),
  h('path', {d:'M4 9.5h16M9.5 9.5V20M4 15h16'}),
]);

function linkCard(url, icon, title, sub){
  return h('a', {href:url, target:'_blank', rel:'noreferrer', class:'card', style:'display:flex;align-items:center;gap:13px;margin-bottom:11px;text-decoration:none;color:inherit'}, [
    h('span', {style:'flex:none;width:34px;height:34px;border:1px solid var(--color-accent);border-radius:4px;display:flex;align-items:center;justify-content:center;color:var(--color-accent-700)'}, [icon]),
    h('span', {style:'flex:1;min-width:0'}, [
      h('span', {style:'display:block;font-family:var(--font-heading);font-weight:600;font-size:15.5px;line-height:1.3'}, title),
      h('span', {style:'display:block;font-size:12px;line-height:1.5;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-top:3px'}, sub),
    ]),
    h('span', {style:'flex:none;font-size:14px;color:var(--color-accent-700)'}, '↗'),
  ]);
}

export function render(state, store){
  const s = store.selectStudy();

  // One card, two destinations. This screen used to offer three surfaces — a
  // form link, a sheet link, and a toggleable iframe of the same form — which
  // is three routes to two places.
  const children = [
    h('h1', {style:'font-size:26px;margin:10px 0 6px'}, 'To Study'),
    h('div', {style:'font-size:12.5px;line-height:1.6;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-bottom:16px'}, 'The library lives in the sheet. Capture with the form, read and sort in the spreadsheet.'),
    h('div', {class:'card'}, [
      h('a', {href:s.studyFormUrl, target:'_blank', rel:'noreferrer', style:'display:flex;align-items:center;gap:13px;text-decoration:none;color:inherit'}, [
        h('span', {style:'flex:none;width:34px;height:34px;border:1px solid var(--color-accent);border-radius:4px;display:flex;align-items:center;justify-content:center;color:var(--color-accent-700)'}, [plusIcon()]),
        h('span', {style:'flex:1;min-width:0'}, [
          h('span', {style:'display:block;font-family:var(--font-heading);font-weight:600;font-size:15.5px;line-height:1.3'}, 'Capture something to study'),
          h('span', {style:'display:block;font-size:12px;line-height:1.5;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-top:3px'}, 'Paste a title and a link — the rest can wait.'),
        ]),
        h('span', {style:'flex:none;font-size:14px;color:var(--color-accent-700)'}, '↗'),
      ]),
      h('a', {href:keepHref(), target:'_blank', rel:'noreferrer', style:'display:flex;align-items:center;gap:13px;text-decoration:none;color:inherit;margin-top:13px;padding-top:13px;border-top:1px solid var(--color-divider)'}, [
        h('span', {style:'flex:none;width:34px;height:34px;border:1px solid var(--color-accent);border-radius:4px;display:flex;align-items:center;justify-content:center;color:var(--color-accent-700)'}, [keepIcon()]),
        h('span', {style:'flex:1;min-width:0'}, [
          h('span', {style:'display:block;font-family:var(--font-heading);font-weight:600;font-size:15.5px;line-height:1.3'}, 'Open Google Keep'),
          h('span', {style:'display:block;font-size:12px;line-height:1.5;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-top:3px'}, 'The scratchpad — the app on the phone, the web on a computer. Nothing syncs; graduate anything real into the form above.'),
        ]),
        h('span', {style:'flex:none;font-size:14px;color:var(--color-accent-700)'}, '↗'),
      ]),
      h('a', {href:s.studySheetUrl, target:'_blank', rel:'noreferrer', style:'display:flex;align-items:center;gap:13px;text-decoration:none;color:inherit;margin-top:13px;padding-top:13px;border-top:1px solid var(--color-divider)'}, [
        h('span', {style:'flex:none;width:34px;height:34px;border:1px solid var(--color-divider);border-radius:4px;display:flex;align-items:center;justify-content:center;color:color-mix(in srgb, var(--color-text) 55%, transparent)'}, [sheetIcon()]),
        h('span', {style:'flex:1;min-width:0'}, [
          h('span', {style:'display:block;font-family:var(--font-heading);font-weight:600;font-size:15.5px;line-height:1.3'}, 'Open the whole list'),
          h('span', {style:'display:block;font-size:12px;line-height:1.5;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-top:3px'}, 'Everything captured so far, with its own columns and filters.'),
        ]),
        h('span', {style:'flex:none;font-size:14px;color:var(--color-accent-700)'}, '↗'),
      ]),
    ]),
  ];

  return h('div', {}, children);
}
