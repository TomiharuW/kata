// Log screen — new-entry form, weekly summary, sort/filter, session cards,
// JSON/CSV export. Ported 1:1 from reference/Kata.dc.html's `isLog` block
// (lines ~280-446).
import { h } from '../lib/dom.js';

const chevronDown = (rotate, size=12, sw=2.4, stroke='var(--color-accent-700)') => h('svg', {width:size, height:size, viewBox:'0 0 24 24', fill:'none', stroke, 'stroke-width':sw, 'stroke-linecap':'round', 'stroke-linejoin':'round', style:`transform:${rotate}`}, [
  h('path', {d:'m6 9 6 6 6-6'}),
]);

const trashIcon = (size=16) => h('svg', {width:size, height:size, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':1.8, 'stroke-linecap':'round', 'stroke-linejoin':'round'}, [
  h('path', {d:'M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7'}),
]);

function shakuStepRow(s){
  return h('div', {style:'border-bottom:1px solid var(--color-divider)'}, [
    h('div', {style:'display:flex;align-items:center;gap:9px;padding:9px 0'}, [
      h('button', {onClick:s.toggle, 'aria-label':'Tick step', style:'background:none;border:none;padding:0;cursor:pointer;flex:none;display:flex;align-items:center'}, [
        h('svg', {width:19, height:19, viewBox:'0 0 18 18'}, [h('circle', {cx:9, cy:9, r:7, fill:s.fill, stroke:s.mark, 'stroke-width':1.7, 'stroke-dasharray':s.dash})]),
      ]),
      h('button', {onClick:s.toggle, style:'flex:1;min-width:0;background:none;border:none;padding:0;text-align:left;cursor:pointer;font-family:var(--font-body)'}, [
        h('span', {style:`display:block;font-size:13.5px;line-height:1.35;color:${s.labelColor}`}, s.label),
        h('span', {style:'display:block;font-size:10.5px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 45%, transparent);margin-top:2px'}, `${s.mins} · ${s.rate}`),
      ]),
      h('button', {onClick:s.toggleCue, 'aria-label':'Cues', style:'flex:none;background:none;border:none;padding:6px;cursor:pointer;display:flex;align-items:center'}, [
        chevronDown(s.chevron, 12, 2.4),
      ]),
    ]),
    s.open ? h('div', {style:'display:flex;flex-direction:column;gap:4px;padding:0 0 11px 28px'}, s.cues.map(c =>
      h('div', {style:'display:flex;gap:8px;font-size:12.5px;line-height:1.55;color:color-mix(in srgb, var(--color-text) 78%, transparent)'}, [
        h('span', {style:'flex:none;color:var(--color-accent)'}, '—'),
        h('span', {style:'flex:1;min-width:0;text-wrap:pretty'}, c.text),
      ])
    )) : null,
  ]);
}

function routinePanel(l){
  const kids = [
    h('div', {style:'display:flex;align-items:baseline;gap:8px'}, [
      h('div', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;white-space:nowrap;color:color-mix(in srgb, var(--color-text) 55%, transparent)'}, 'The routine'),
      h('div', {style:'margin-left:auto;font-size:11px;font-variant-numeric:tabular-nums;white-space:nowrap;color:color-mix(in srgb, var(--color-text) 45%, transparent)'}, l.stepCountLabel),
    ]),
    ...l.shakuPhases.map(ph => h('div', {style:'margin-top:12px'}, [
      h('div', {style:'font-family:var(--font-heading);font-size:11.5px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 62%, transparent);padding-bottom:5px;border-bottom:1px solid var(--color-divider)'}, ph.phase),
      ...ph.steps.map(shakuStepRow),
    ])),
    h('div', {style:'display:flex;align-items:baseline;gap:8px;margin:16px 0 8px'}, [
      h('div', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;white-space:nowrap;color:color-mix(in srgb, var(--color-text) 55%, transparent)'}, 'Licks played today'),
      h('button', {onClick:l.openLickForm, style:'margin-left:auto;background:none;border:none;padding:0;white-space:nowrap;font-family:var(--font-body);font-size:11.5px;color:var(--color-accent-700);cursor:pointer;text-decoration:underline;text-underline-offset:3px'}, '＋ new lick'),
    ]),
  ];
  if(l.noLicks){
    kids.push(h('div', {style:'font-size:12.5px;line-height:1.55;color:color-mix(in srgb, var(--color-text) 48%, transparent);padding-bottom:6px'}, 'Nothing filed yet. Add the phrase you just played and it lands in the shakuhachi library.'));
  }
  kids.push(h('div', {style:'display:flex;gap:6px;flex-wrap:wrap'}, l.lickChips.map(c =>
    h('button', {onClick:c.toggle, style:`padding:7px 11px;border-radius:var(--radius-sm);border:1px solid ${c.border};background:${c.bg};color:${c.color};font-family:var(--font-body);font-size:12px;cursor:pointer;text-align:left;line-height:1.4;max-width:100%`}, c.name)
  )));
  if(l.lickFormOpen){
    const lf = l.lickForm;
    kids.push(h('div', {style:'margin-top:11px;padding:12px;border:1px solid var(--color-divider)'}, [
      h('div', {class:'field', style:'margin-bottom:8px'}, [h('label', {}, 'Phrase'), h('input', {class:'input', placeholder:'What to call it later', value:lf.name, onChange:l.setLickName})]),
      h('div', {style:'display:flex;gap:8px;margin-bottom:8px'}, [
        h('div', {class:'field', style:'flex:1'}, [
          h('label', {}, 'Where from'),
          h('select', {class:'input', value:lf.source, onChange:l.setLickSource}, l.lickSourceOptions.map(o => h('option', {value:o.value}, o.name))),
        ]),
        h('div', {class:'field', style:'flex:1'}, [h('label', {}, 'Fingering / notes'), h('input', {class:'input', placeholder:'ロ ツ レ', value:lf.notation, onChange:l.setLickNotation})]),
      ]),
      h('div', {class:'field', style:'margin-bottom:10px'}, [h('label', {}, 'How it goes'), h('textarea', {class:'input', rows:2, placeholder:'Breath, meri, where it sits', value:lf.note, onChange:l.setLickNote})]),
      h('button', {class:'btn btn-secondary btn-block', onClick:l.addLickFromLog}, 'Add and tick it'),
    ]));
  }
  return h('div', {style:'margin:4px 0 14px;padding-top:12px;border-top:1px solid var(--color-divider)'}, kids);
}

function sessionCard(s){
  const kids = [
    h('div', {style:'display:flex;align-items:flex-start;gap:10px'}, [
      h('div', {style:'flex:1;min-width:0'}, [
        h('div', {style:'font-family:var(--font-heading);font-weight:600;font-size:15.5px'}, s.activityName),
        h('div', {style:'font-size:11.5px;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-top:1px'}, `${s.dateLabel} · ${s.minutes} min`),
      ]),
      h('button', {onClick:s.remove, class:'btn btn-icon btn-ghost', 'aria-label':'Delete', style:'flex:none'}, [trashIcon()]),
    ]),
  ];
  if(s.quick){
    kids.push(h('div', {style:'display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:9px;padding:8px 10px;border:1px dashed var(--color-accent);border-radius:var(--radius-sm)'}, [
      h('span', {style:'font-size:11.5px;line-height:1.45;color:var(--color-accent-800);flex:1;min-width:120px'}, 'Ticked on the week strip — no detail yet.'),
      h('button', {onClick:s.fillIn, style:'flex:none;background:none;border:1px solid var(--color-accent);color:var(--color-accent-700);border-radius:4px;padding:6px 10px;font-family:var(--font-body);font-size:11px;cursor:pointer'}, 'Fill it in'),
    ]));
  }
  if(s.linkName){
    kids.push(h('div', {style:'margin-top:8px'}, [h('span', {class:'tag tag-outline', style:'font-size:11px'}, s.linkName)]));
  }
  if(s.routineLabel){
    kids.push(h('div', {style:'font-size:11px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 50%, transparent);margin-top:8px'}, s.routineLabel));
  }
  if(s.lickTags.length){
    kids.push(h('div', {style:'display:flex;gap:5px;flex-wrap:wrap;margin-top:7px'}, s.lickTags.map(t => h('span', {class:'tag tag-outline', style:'font-size:10.5px'}, t.name))));
  }
  if(s.whatWorked){
    kids.push(h('div', {style:'font-size:13px;line-height:1.55;margin-top:9px;color:color-mix(in srgb, var(--color-text) 82%, transparent)'}, s.whatWorked));
  }
  if(s.whereStuck){
    kids.push(h('button', {onClick:s.toggleStuck, style:'background:none;border:none;padding:0;margin-top:10px;cursor:pointer;display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--color-accent-700);font-family:var(--font-body)'}, [
      chevronDown(s.chevronRotate),
      'Where I got stuck',
    ]));
    if(s.stuckOpen){
      kids.push(h('div', {style:'margin-top:8px;padding:11px 13px;background:var(--color-accent-100);border-left:2px solid var(--color-accent);font-size:13px;line-height:1.55;color:var(--color-accent-800)'}, s.whereStuck));
    }
  }
  return h('div', {class:'card', style:`margin-bottom:10px;border-left:3px solid ${s.stroke}`}, kids);
}

export function render(state, store){
  const l = store.selectLog();
  const f = l.form;

  const formChildren = [
    h('div', {class:'card-kicker'}, 'New entry'),
    h('div', {style:'display:flex;gap:10px;margin:10px 0'}, [
      h('div', {class:'field', style:'flex:1'}, [h('label', {}, 'Date'), h('input', {class:'input', type:'date', value:f.date, onChange:l.setFormDate})]),
      h('div', {class:'field', style:'flex:1'}, [
        h('label', {}, 'Activity'),
        h('select', {class:'input', value:f.activity, onChange:l.setFormActivity}, l.activityOptions.map(a => h('option', {value:a.id}, a.name))),
      ]),
    ]),
    h('div', {class:'field', style:'margin-bottom:10px'}, [h('label', {}, 'Minutes'), h('input', {class:'input', type:'number', min:1, placeholder:'e.g. 30', value:f.minutes, onChange:l.setFormMinutes})]),
    h('div', {class:'field', style:'margin-bottom:10px'}, [
      h('label', {}, `Working toward — ${l.linkHint}`),
      h('select', {class:'input', value:f.link, onChange:l.setFormLink}, [
        h('option', {value:''}, 'Nothing in particular'),
        ...l.linkProjects.map(p => h('option', {value:p.value}, `▸ ${p.name}`)),
        ...l.linkGoals.map(g => h('option', {value:g.value}, `◦ ${g.name}`)),
      ]),
    ]),
  ];
  if(l.isShakuLog) formChildren.push(routinePanel(l));
  formChildren.push(
    h('div', {class:'field', style:'margin-bottom:10px'}, [h('label', {}, 'What worked'), h('textarea', {class:'input', rows:2, placeholder:'What went well today', value:f.whatWorked, onChange:l.setFormWorked})]),
    h('div', {class:'field', style:'margin-bottom:12px'}, [h('label', {}, 'Where I got stuck'), h('textarea', {class:'input', rows:2, placeholder:'Where to restart tomorrow', value:f.whereStuck, onChange:l.setFormStuck})]),
    h('button', {class:'btn btn-primary btn-block', onClick:l.submitSession}, 'Log session'),
  );

  const children = [
    h('h1', {style:'font-size:26px;margin:10px 0 16px'}, 'Practice Log'),
    h('div', {class:'card elev-sm', style:'margin-bottom:18px'}, formChildren),
    h('div', {style:'margin-bottom:18px;padding:13px 0;border-top:1px solid var(--color-divider);border-bottom:1px solid var(--color-divider)'}, [
      h('div', {style:'font-size:13px;display:flex;align-items:baseline;gap:6px'}, [
        h('b', {style:'font-family:var(--font-heading);font-size:19px;font-weight:600;font-variant-numeric:tabular-nums'}, String(l.weekly.count)),
        ' sessions this week · ',
        h('b', {style:'font-family:var(--font-heading);font-size:19px;font-weight:600;font-variant-numeric:tabular-nums'}, String(l.weekly.minutes)),
        ' minutes',
      ]),
      h('div', {style:'display:flex;gap:6px;flex-wrap:wrap;margin-top:9px'}, l.weekly.breakdown.map(b =>
        h('span', {style:`display:inline-flex;align-items:center;gap:5px;font-size:11.5px;padding:4px 9px;border-radius:999px;border:1px solid ${b.stroke};color:${b.stroke};white-space:nowrap;line-height:1.3`}, `${b.name} × ${b.count}`)
      )),
    ]),
    h('div', {style:'display:flex;gap:10px;margin-bottom:14px'}, [
      h('select', {class:'input', style:'flex:1;font-size:13px', value:l.sort, onChange:l.setSort}, [
        h('option', {value:'newest'}, 'Newest first'),
        h('option', {value:'oldest'}, 'Oldest first'),
        h('option', {value:'activity'}, 'By activity'),
        h('option', {value:'longest'}, 'Longest first'),
      ]),
      h('select', {class:'input', style:'flex:1;font-size:13px', value:l.filterActivity, onChange:l.setFilter}, [
        h('option', {value:'all'}, 'All activities'),
        ...l.activityOptions.map(a => h('option', {value:a.id}, a.name)),
      ]),
    ]),
  ];

  if(l.hasNoEntries){
    children.push(h('div', {style:'padding:30px 0;text-align:center;color:color-mix(in srgb, var(--color-text) 55%, transparent);font-size:13.5px'}, 'Nothing here — log a session above, or clear the filter.'));
  }
  children.push(...l.visibleSessions.map(sessionCard));
  children.push(h('div', {style:'display:flex;gap:10px;margin-top:14px'}, [
    h('button', {class:'btn btn-secondary', onClick:l.exportJson, style:'flex:1'}, 'Export .json'),
    h('button', {class:'btn btn-secondary', onClick:l.exportCsv, style:'flex:1'}, 'Export .csv'),
  ]));

  return h('div', {}, children);
}
