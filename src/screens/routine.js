// Routine screen — variant segmented control, week strips / day list toggle,
// 7-column grid, coverage panel, morning-block minutes, strength-day toggles,
// rotation settings + repeating-task list. Ported 1:1 from
// reference/Kata.dc.html's `isRoutine` block (lines ~448-609).
import { h } from '../lib/dom.js';

const chevronDown = (rotate) => h('svg', {width:12, height:12, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':2.4, 'stroke-linecap':'round', 'stroke-linejoin':'round', style:`transform:${rotate}`}, [
  h('path', {d:'m6 9 6 6 6-6'}),
]);
const trashIcon = () => h('svg', {width:15, height:15, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':1.8, 'stroke-linecap':'round', 'stroke-linejoin':'round'}, [
  h('path', {d:'M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7'}),
]);
const checkIcon = (opacity) => h('svg', {width:8, height:8, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':4.5, 'stroke-linecap':'round', 'stroke-linejoin':'round', style:`position:absolute;top:2px;right:2px;opacity:${opacity}`}, [
  h('path', {d:'m5 13 4 4L19 7'}),
]);

function dayListRow(d){
  return h('div', {style:`padding:12px 0;border-bottom:1px solid var(--color-divider);opacity:${d.opacity}`}, [
    h('div', {style:'display:flex;align-items:baseline;gap:9px'}, [
      h('div', {style:'font-family:var(--font-heading);font-weight:600;font-size:15px;width:38px;flex:none'}, d.name),
      h('div', {style:'font-size:11.5px;line-height:1.45;color:color-mix(in srgb, var(--color-text) 52%, transparent);flex:1'}, d.fixedLabel),
      d.isToday ? h('span', {style:'flex:none;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--color-accent-700);border:1px solid var(--color-accent);border-radius:999px;padding:2px 7px'}, 'Today') : null,
    ]),
    h('div', {style:'display:flex;gap:6px;flex-wrap:wrap;margin-top:9px'}, d.blocks.map(b =>
      h('button', {onClick:b.cycle, style:`display:inline-flex;align-items:center;gap:6px;padding:9px 11px;border-radius:4px;border:1px ${b.borderStyle} ${b.stroke};background:${b.bg};color:${b.stroke};font-family:var(--font-body);font-size:12px;line-height:1.2;cursor:${b.cursor};white-space:nowrap`}, b.label)
    )),
  ]);
}

function gridDayCol(d){
  return h('div', {style:'background:var(--color-bg);display:flex;flex-direction:column;min-height:300px'}, [
    h('div', {style:`padding:6px 3px 5px;text-align:center;background:${d.headBg};border-bottom:1px solid var(--color-divider)`}, [
      h('div', {style:`font-family:var(--font-heading);font-size:11px;font-weight:600;letter-spacing:0.03em;color:${d.headColor}`}, d.name),
      h('div', {style:`font-size:13px;font-family:var(--font-heading);font-variant-numeric:tabular-nums;line-height:1.1;color:${d.headColor}`}, d.dateNum),
      h('div', {style:'font-size:8.5px;font-variant-numeric:tabular-nums;line-height:1.2;color:var(--color-accent-700);min-height:10px'}, d.doneLabel),
    ]),
    h('div', {style:'flex:1;display:flex;flex-direction:column;gap:3px;padding:4px 3px'}, [
      ...d.items.map(b => h('button', {onClick:b.toggle, title:b.title, style:`position:relative;width:100%;border:1px ${b.borderStyle} ${b.stroke};background:${b.bg};color:${b.stroke};border-radius:3px;padding:4px 2px;text-align:center;line-height:1.15;font-family:var(--font-body);cursor:${b.cursor}`}, [
        h('span', {style:`display:block;font-size:9.5px;font-weight:${b.labelWeight}`}, b.label),
        h('span', {style:'display:block;font-size:8.5px;font-variant-numeric:tabular-nums;opacity:0.75'}, b.mins),
        checkIcon(b.tickOpacity),
      ])),
      ...d.tasks.map(t => h('button', {onClick:t.toggle, title:t.title, style:`background:none;border:none;border-top:1px dotted ${t.stroke};padding:5px 1px 3px;cursor:pointer;text-align:left;font-family:var(--font-body);font-size:9.5px;line-height:1.3;color:color-mix(in srgb, var(--color-text) 72%, transparent);opacity:${t.opacity};text-decoration:${t.decoration};display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden`}, t.name)),
    ]),
    h('div', {style:'display:flex;align-items:center;justify-content:center;gap:4px;padding:4px 2px;border-top:1px solid var(--color-divider)'}, [
      h('button', {onClick:d.dec, 'aria-label':'Fewer slots', style:'background:none;border:none;padding:0 2px;cursor:pointer;color:var(--color-accent-700);font-size:12px;line-height:1;font-family:var(--font-body)'}, '−'),
      h('span', {style:'font-size:10px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 55%, transparent)'}, d.slots),
      h('button', {onClick:d.inc, 'aria-label':'More slots', style:'background:none;border:none;padding:0 2px;cursor:pointer;color:var(--color-accent-700);font-size:12px;line-height:1;font-family:var(--font-body)'}, '+'),
    ]),
  ]);
}

export function render(state, store){
  const r = store.selectRoutine();

  const children = [
    h('h1', {style:'font-size:26px;margin:10px 0 14px'}, 'Routine'),
    h('div', {class:'seg', style:'margin-bottom:18px'}, [
      h('label', {class:'seg-opt'}, [h('input', {type:'radio', name:'variant', checked:r.isVariantCurrent, onChange:r.setVariantCurrent}), 'Current week']),
      h('label', {class:'seg-opt'}, [h('input', {type:'radio', name:'variant', checked:r.isVariantThu, onChange:r.setVariantThu}), 'Thursdays blocked']),
    ]),
  ];

  if(r.isVariantThu){
    children.push(h('div', {style:'font-size:12.5px;line-height:1.55;padding:11px 13px;margin-bottom:16px;border-left:2px solid var(--color-accent);background:var(--color-accent-100);color:var(--color-accent-800)'},
      'Thursday is given to work. Its two instrument blocks have been redistributed to the lightest mornings — shown with a caret.'));
  }

  children.push(h('div', {style:'display:flex;align-items:baseline;gap:8px;margin-bottom:2px'}, [
    h('div', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent)'}, 'The week'),
    h('button', {onClick:r.autofillRotation, style:'margin-left:auto;background:none;border:none;padding:4px 0;font-family:var(--font-body);font-size:11.5px;color:var(--color-accent-700);cursor:pointer;text-decoration:underline;text-underline-offset:3px'}, 'Refill by staleness'),
  ]));
  children.push(h('div', {style:'display:flex;gap:14px;margin:8px 0 12px'}, [
    h('button', {onClick:r.setViewGrid, style:`background:none;border:none;padding:2px 0;font-family:var(--font-body);font-size:11.5px;cursor:pointer;color:${r.viewGridColor};border-bottom:1px solid ${r.viewGridUnderline}`}, 'Week strips'),
    h('button', {onClick:r.setViewList, style:`background:none;border:none;padding:2px 0;font-family:var(--font-body);font-size:11.5px;cursor:pointer;color:${r.viewListColor};border-bottom:1px solid ${r.viewListUnderline}`}, 'Day list'),
  ]));

  if(r.isViewList){
    children.push(h('div', {style:'font-size:11.5px;color:color-mix(in srgb, var(--color-text) 50%, transparent);margin-bottom:10px'}, 'Tap any instrument block to swap it. Ticking off is done in the week strips.'));
    children.push(...r.weekDays.map(dayListRow));
  }

  if(r.isViewGrid){
    children.push(h('div', {style:'font-size:11.5px;line-height:1.5;color:color-mix(in srgb, var(--color-text) 50%, transparent);margin-bottom:10px'},
      'One strip per day. Tap a block to mark it done — it lands in the practice log with no detail, and you can fill that in later. Tap again to clear it. Tasks tick off the same way; ± changes how many instrument slots a day carries.'));
    children.push(h('div', {style:'display:grid;grid-template-columns:repeat(7, 1fr);gap:1px;background:var(--color-divider);border:1px solid var(--color-divider)'}, r.weekGrid.map(gridDayCol)));
    children.push(h('div', {style:'display:flex;gap:8px;flex-wrap:wrap;margin-top:10px'}, r.gridLegend.map(l =>
      h('span', {style:'display:inline-flex;align-items:center;gap:5px;font-size:10.5px;color:color-mix(in srgb, var(--color-text) 60%, transparent);white-space:nowrap'}, [
        h('span', {style:`width:7px;height:7px;border-radius:999px;border:2px solid ${l.stroke}`}),
        `${l.abbr} — ${l.name}`,
      ])
    )));
  }

  children.push(h('button', {onClick:r.toggleSettings, style:'display:flex;align-items:center;gap:6px;width:100%;background:none;border:none;padding:16px 0 0;cursor:pointer;font-family:var(--font-body);font-size:11.5px;color:var(--color-accent-700)'}, [
    chevronDown(r.settingsChevron),
    'Rotation settings and repeating tasks',
  ]));

  if(r.settingsOpen){
    children.push(h('div', {class:'card', style:'margin-top:11px'}, [
      h('div', {class:'card-kicker'}, 'Instrument slots per day'),
      h('div', {style:'display:flex;align-items:center;gap:12px;margin:11px 0 3px'}, [
        h('div', {style:'flex:1;font-size:13px;line-height:1.5'}, 'Default for every day. Weekend days keep their own override — change those in the week strips.'),
        h('div', {style:'display:flex;align-items:center;gap:10px;flex:none;border:1px solid var(--color-divider);border-radius:4px;padding:6px 10px'}, [
          h('button', {onClick:r.decRotation, 'aria-label':'Fewer', style:'background:none;border:none;padding:0;cursor:pointer;color:var(--color-accent-700);font-size:17px;line-height:1;font-family:var(--font-body)'}, '−'),
          h('span', {style:'font-family:var(--font-heading);font-size:18px;font-weight:600;font-variant-numeric:tabular-nums;min-width:14px;text-align:center'}, r.rotationSize),
          h('button', {onClick:r.incRotation, 'aria-label':'More', style:'background:none;border:none;padding:0;cursor:pointer;color:var(--color-accent-700);font-size:17px;line-height:1;font-family:var(--font-body)'}, '+'),
        ]),
      ]),
      h('div', {style:'margin-top:14px;padding-top:12px;border-top:1px solid var(--color-divider)'}, [
        h('div', {style:'font-size:10.5px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 50%, transparent);margin-bottom:8px'}, 'Repeating tasks'),
        ...r.allTasks.map(t => h('div', {style:'display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--color-divider)'}, [
          h('span', {style:`width:7px;height:7px;border-radius:999px;border:2px solid ${t.stroke};flex:none`}),
          h('div', {style:'flex:1;min-width:0'}, [
            h('div', {style:'font-size:13px;line-height:1.35'}, t.name),
            h('div', {style:'font-size:11px;color:color-mix(in srgb, var(--color-text) 48%, transparent);margin-top:2px'}, `${t.actName} · ${t.whenLabel}`),
          ]),
          h('button', {onClick:t.remove, class:'btn btn-icon btn-ghost', 'aria-label':'Delete task', style:'flex:none'}, [trashIcon()]),
        ])),
        h('div', {style:'font-size:11.5px;line-height:1.55;color:color-mix(in srgb, var(--color-text) 48%, transparent);margin-top:10px'}, 'Add new tasks from Today.'),
      ]),
    ]));
  }

  children.push(h('div', {style:'display:flex;align-items:baseline;gap:10px;margin:24px 0 10px'}, [
    h('div', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent)'}, 'Coverage'),
    h('div', {style:'margin-left:auto;display:flex;gap:14px'}, [
      h('button', {onClick:r.setBasisWeek, style:`background:none;border:none;padding:2px 0;font-family:var(--font-body);font-size:11.5px;cursor:pointer;color:${r.basisWeekColor};border-bottom:1px solid ${r.basisWeekUnderline}`}, 'This week'),
      h('button', {onClick:r.setBasisMonth, style:`background:none;border:none;padding:2px 0;font-family:var(--font-body);font-size:11.5px;cursor:pointer;color:${r.basisMonthColor};border-bottom:1px solid ${r.basisMonthUnderline}`}, 'This month'),
    ]),
  ]));

  children.push(...r.coverage.map(c => h('div', {style:`display:flex;align-items:center;gap:11px;padding:11px 12px;margin-bottom:7px;border:1px ${c.borderStyle} ${c.borderColor};border-radius:4px;background:${c.bg}`}, [
    h('span', {style:`width:9px;height:9px;border-radius:999px;border:2px solid ${c.stroke};flex:none`}),
    h('div', {style:'flex:1;min-width:0'}, [
      h('div', {style:'font-family:var(--font-heading);font-weight:600;font-size:14.5px'}, c.name),
      h('div', {style:'font-size:11.5px;color:color-mix(in srgb, var(--color-text) 55%, transparent)'}, c.note),
    ]),
    h('div', {style:'text-align:right;flex:none'}, [
      h('div', {style:`font-family:var(--font-heading);font-size:19px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1;color:${c.countColor}`}, String(c.logged)),
      h('div', {style:'font-size:9.5px;letter-spacing:0.07em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 45%, transparent);margin-top:3px'}, 'logged'),
    ]),
    c.missing ? h('button', {onClick:c.addToPlan, style:'flex:none;background:none;border:1px solid var(--color-accent);color:var(--color-accent-700);border-radius:4px;padding:7px 9px;font-family:var(--font-body);font-size:11px;cursor:pointer'}, 'Add') : null,
  ])));

  children.push(h('div', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin:24px 0 10px'}, 'Morning block · minutes'));
  children.push(h('div', {style:'display:grid;grid-template-columns:1fr 1fr;gap:10px'}, [
    h('div', {class:'field'}, [h('label', {}, 'Ear training'), h('input', {class:'input', type:'number', min:0, step:5, value:r.blocks.ear, onChange:r.setBlockEar})]),
    h('div', {class:'field'}, [h('label', {}, 'Instrument A'), h('input', {class:'input', type:'number', min:0, step:5, value:r.blocks.a, onChange:r.setBlockA})]),
    h('div', {class:'field'}, [h('label', {}, 'Instrument B'), h('input', {class:'input', type:'number', min:0, step:5, value:r.blocks.b, onChange:r.setBlockB})]),
    h('div', {class:'field'}, [h('label', {}, 'Japanese reading'), h('input', {class:'input', type:'number', min:0, step:5, value:r.blocks.jpn, onChange:r.setBlockJpn})]),
    h('div', {class:'field'}, [h('label', {}, 'Bike / elliptical'), h('input', {class:'input', type:'number', min:0, step:5, value:r.blocks.cardio, onChange:r.setBlockCardio})]),
    h('div', {class:'field'}, [h('label', {}, 'Strength'), h('input', {class:'input', type:'number', min:0, step:5, value:r.blocks.strength, onChange:r.setBlockStrength})]),
  ]));
  children.push(h('div', {style:'font-size:12px;line-height:1.55;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-top:10px'}, `Total morning: ${r.morningTotal} · Bike doubles as Japanese immersion.`));

  children.push(h('div', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin:24px 0 9px'}, 'Strength on the lighter mornings'));
  children.push(h('div', {style:'display:flex;gap:6px;flex-wrap:wrap'}, r.strengthToggles.map(t =>
    h('button', {onClick:t.toggle, style:`padding:10px 13px;border-radius:4px;border:1px solid ${t.border};background:${t.bg};color:${t.color};font-family:var(--font-body);font-size:12.5px;cursor:pointer`}, t.name)
  )));

  return h('div', {}, children);
}
