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

  const children = [
    h('h1', {style:'font-size:26px;margin:10px 0 6px'}, 'To Study'),
    h('div', {style:'font-size:12.5px;line-height:1.6;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-bottom:16px'}, 'The library itself lives in the sheet. Add to it with the form, read and sort it in the spreadsheet.'),
    linkCard(s.studyFormUrl, plusIcon(), 'Add to the study library', 'The form — work, link, and what you want off it.'),
    linkCard(s.studySheetUrl, sheetIcon(), 'Open the study spreadsheet', 'Everything captured so far, with its own columns and filters.'),
    h('div', {style:'display:flex;align-items:baseline;gap:10px;margin:22px 0 9px'}, [
      h('div', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent)'}, 'Fill it in here'),
      h('button', {onClick:s.toggleStudyEmbed, style:'margin-left:auto;background:none;border:none;padding:2px 0;font-family:var(--font-body);font-size:11.5px;color:var(--color-accent-700);cursor:pointer;text-decoration:underline;text-underline-offset:3px'}, s.studyEmbedLabel),
    ]),
  ];

  if(s.studyEmbedOpen){
    children.push(h('div', {style:'border:1px solid var(--color-divider);border-radius:var(--radius-sm);overflow:hidden;height:620px'}, [
      h('iframe', {src:s.studyFormUrl, title:'Add to the study library', style:'width:100%;height:100%;border:none;display:block'}),
    ]));
    children.push(h('div', {style:'font-size:11px;line-height:1.55;color:color-mix(in srgb, var(--color-text) 45%, transparent);margin-top:8px'}, 'If the frame stays blank, Google is refusing to embed it — open the form in a new tab instead.'));
  }

  return h('div', {}, children);
}
