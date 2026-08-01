// Goals screen — area filter chips, new-goal form, project cards, long-term
// goals grouped under instrument subheadings, archived section. Ported 1:1
// from reference/Kata.dc.html's `isGoals` block (lines ~611-754).
import { h } from '../lib/dom.js';

const plusIcon = () => h('svg', {width:14, height:14, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':2, 'stroke-linecap':'round'}, [h('path', {d:'M12 5v14M5 12h14'})]);
const chevronDown = (rotate, size=12, sw=2.4, stroke='var(--color-accent-700)') => h('svg', {width:size, height:size, viewBox:'0 0 24 24', fill:'none', stroke, 'stroke-width':sw, 'stroke-linecap':'round', 'stroke-linejoin':'round', style:`transform:${rotate}`}, [h('path', {d:'m6 9 6 6 6-6'})]);
const archiveIcon = () => h('svg', {width:12, height:12, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':1.8, 'stroke-linecap':'round', 'stroke-linejoin':'round'}, [
  h('path', {d:'M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8z'}),
  h('path', {d:'M3 4h18v4H3zM10 12h4'}),
]);

function stepRow(s){
  return h('button', {onClick:s.cycle, style:`display:flex;align-items:flex-start;gap:9px;width:100%;background:none;border:none;padding:8px 0;text-align:left;cursor:pointer;font-family:var(--font-body);font-size:13.5px;line-height:1.45;color:${s.color}`}, [
    h('svg', {width:15, height:15, viewBox:'0 0 16 16', style:'flex:none;margin-top:2px'}, [h('circle', {cx:8, cy:8, r:6, fill:s.fill, stroke:s.stroke, 'stroke-width':1.4, 'stroke-dasharray':s.dash})]),
    h('span', {style:'flex:1;min-width:0'}, [s.label, h('span', {style:'font-size:11px;color:color-mix(in srgb, var(--color-text) 42%, transparent);font-variant-numeric:tabular-nums'}, s.doneLabel)]),
    s.tickCount ? h('span', {title:s.tickTitle, style:'flex:none;font-size:10.5px;font-variant-numeric:tabular-nums;color:var(--color-accent-700);border:1px solid var(--color-accent);border-radius:999px;padding:1px 7px;margin-top:1px'}, s.tickLabel) : null,
  ]);
}

function projectCard(p){
  const kids = [
    h('div', {style:'display:flex;align-items:baseline;gap:9px'}, [
      h('div', {style:'font-family:var(--font-heading);font-weight:600;font-size:16px;flex:1;min-width:0'}, p.name),
      h('div', {style:'font-size:11px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 50%, transparent);flex:none'}, p.progressLabel),
    ]),
    h('div', {style:'height:3px;background:var(--color-divider);margin:9px 0 10px'}, [h('div', {style:`height:3px;width:${p.progressPct};background:var(--color-accent)`})]),
    h('div', {style:'font-size:12.5px;line-height:1.55;color:color-mix(in srgb, var(--color-text) 72%, transparent)'}, p.blurb),
    h('div', {style:'display:flex;gap:6px;flex-wrap:wrap;margin-top:10px'}, p.actChips.map(c => h('span', {style:`font-size:11px;padding:3px 8px;border-radius:999px;border:1px solid ${c.stroke};color:${c.stroke};white-space:nowrap`}, c.name))),
    h('button', {onClick:p.toggleOpen, style:'background:none;border:none;padding:0;margin-top:11px;cursor:pointer;display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--color-accent-700);font-family:var(--font-body)'}, [
      chevronDown(p.chevron), p.stepsLabel,
    ]),
  ];
  if(p.open){
    kids.push(h('div', {style:'margin-top:6px;padding-top:8px;border-top:1px solid var(--color-divider)'}, [
      ...p.steps.map(stepRow),
      h('div', {style:'font-size:11.5px;color:color-mix(in srgb, var(--color-text) 50%, transparent);padding:7px 0 2px;border-top:1px solid var(--color-divider);margin-top:4px'}, p.rollup),
    ]));
  }
  return h('div', {class:'card', style:'margin-bottom:11px'}, kids);
}

function goalRow(g){
  if(g.isHeader){
    return h('div', {style:'display:flex;align-items:center;gap:9px;margin:18px 0 9px'}, [
      h('span', {style:`width:7px;height:7px;border-radius:999px;border:2px solid ${g.stroke};flex:none`}),
      h('div', {style:`font-family:var(--font-heading);font-weight:600;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;color:${g.stroke}`}, g.title),
      h('span', {style:'flex:1;height:1px;background:var(--color-divider)'}),
    ]);
  }
  const kids = [
    h('div', {style:'display:flex;align-items:baseline;gap:9px'}, [
      h('div', {style:'font-family:var(--font-heading);font-weight:600;font-size:16px;line-height:1.3;flex:1;min-width:0'}, g.name),
      h('div', {style:'font-size:11px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 50%, transparent);flex:none'}, g.progressLabel),
    ]),
    h('div', {style:'font-size:11.5px;color:color-mix(in srgb, var(--color-text) 50%, transparent);margin-top:4px'}, `${g.area} · ${g.rollup}`),
  ];
  if(g.doneLabel){
    kids.push(h('div', {style:'display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:8px'}, [
      h('span', {class:'tag tag-accent', style:'font-size:10.5px'}, g.doneLabel),
      g.canArchive ? h('button', {onClick:g.archive, style:'background:none;border:1px solid var(--color-accent);color:var(--color-accent-700);border-radius:4px;padding:5px 10px;font-family:var(--font-body);font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:5px'}, [archiveIcon(), 'Archive']) : null,
    ]));
  }
  if(g.projects && g.projects.length){
    kids.push(h('div', {style:'display:flex;gap:5px;flex-wrap:wrap;margin-top:8px'}, g.projects.map(p =>
      h('button', {onClick:p.open, style:`font-size:10.5px;padding:3px 9px;border-radius:999px;border:1px solid ${p.stroke};background:transparent;color:${p.stroke};white-space:nowrap;cursor:pointer;font-family:var(--font-body)`}, p.name)
    )));
  }
  if(g.nextUp){
    kids.push(h('div', {style:'display:flex;align-items:center;gap:9px;margin-top:10px;padding:9px 11px;border:1px solid var(--color-accent);border-radius:var(--radius-md);background:var(--color-accent-100)'}, [
      h('div', {style:'flex:1;min-width:0'}, [
        h('div', {style:'font-size:9.5px;letter-spacing:0.09em;text-transform:uppercase;color:var(--color-accent-700);margin-bottom:2px'}, 'Next up'),
        h('div', {style:'font-size:12.5px;line-height:1.4;color:var(--color-accent-800)'}, [
          g.nextUp.label,
          g.nextUp.tickLabel ? h('span', {title:g.nextUp.tickTitle, style:'font-variant-numeric:tabular-nums;opacity:0.75'}, ' · '+g.nextUp.tickLabel) : null,
        ]),
      ]),
      h('button', {onClick:g.nextUp.markDone, style:'flex:none;background:none;border:1px solid var(--color-accent);color:var(--color-accent-800);border-radius:4px;padding:6px 10px;font-family:var(--font-body);font-size:11px;cursor:pointer;white-space:nowrap'}, 'Done · next'),
    ]));
  }
  kids.push(h('div', {style:'margin-top:11px;padding-top:9px;border-top:1px solid var(--color-divider)'}, g.steps.map(stepRow)));
  return h('div', {class:'card', style:`margin-bottom:11px;border-left:3px solid ${g.stroke}`}, kids);
}

function archivedRow(g){
  if(g.isHeader){
    return h('div', {style:'display:flex;align-items:center;gap:9px;margin:16px 0 7px'}, [
      h('span', {style:`width:7px;height:7px;border-radius:999px;border:2px solid ${g.stroke};flex:none;opacity:0.7`}),
      h('div', {style:`font-family:var(--font-heading);font-weight:600;font-size:12.5px;letter-spacing:0.05em;text-transform:uppercase;color:${g.stroke};opacity:0.8`}, g.title),
      h('span', {style:'flex:1;height:1px;background:var(--color-divider)'}),
    ]);
  }
  return h('div', {style:'display:flex;align-items:flex-start;gap:11px;padding:10px 0;border-bottom:1px solid var(--color-divider)'}, [
    h('span', {style:`width:7px;height:7px;border-radius:999px;border:2px solid ${g.stroke};flex:none;margin-top:6px`}),
    h('div', {style:'flex:1;min-width:0'}, [
      h('div', {style:'font-family:var(--font-heading);font-weight:600;font-size:14.5px;line-height:1.3;color:color-mix(in srgb, var(--color-text) 70%, transparent)'}, g.name),
      h('div', {style:'font-size:11px;line-height:1.45;color:color-mix(in srgb, var(--color-text) 45%, transparent);margin-top:3px'}, `${g.archivedLabel} · ${g.progressLabel} · ${g.rollup}`),
    ]),
    h('button', {onClick:g.restore, style:'flex:none;background:none;border:1px solid var(--color-divider);color:var(--color-accent-700);border-radius:4px;padding:6px 10px;font-family:var(--font-body);font-size:11px;cursor:pointer;white-space:nowrap'}, 'Bring back'),
  ]);
}

export function render(state, store){
  const g = store.selectGoals();

  const children = [
    h('div', {style:'display:flex;align-items:center;gap:10px;margin:10px 0 14px'}, [
      h('h1', {style:'font-size:26px;margin:0;flex:1;min-width:0'}, 'Goals'),
      h('button', {class:'btn btn-primary', onClick:g.openGoalForm, style:'flex:none;font-size:12.5px;padding:8px 12px;display:inline-flex;align-items:center;gap:6px'}, [plusIcon(), 'New goal']),
    ]),
    h('div', {style:'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px'}, g.areaChips.map(a =>
      h('button', {onClick:a.select, style:`padding:8px 12px;border-radius:999px;border:1px solid ${a.border};background:${a.bg};color:${a.color};font-family:var(--font-body);font-size:12px;cursor:pointer;white-space:nowrap`}, a.name)
    )),
  ];

  if(g.goalFormOpen){
    const gf = g.goalForm;
    children.push(h('div', {class:'card elev-sm', style:'margin-bottom:20px'}, [
      h('div', {class:'card-kicker'}, 'New goal'),
      h('div', {class:'field', style:'margin:10px 0'}, [h('label', {}, 'What are you working toward'), h('input', {class:'input', type:'text', placeholder:'e.g. Play Tsuru no Sugomori from memory', value:gf.name, onChange:g.setGoalName})]),
      h('div', {class:'field', style:'margin-bottom:12px'}, [
        h('label', {}, 'Area'),
        h('select', {class:'input', value:gf.area, onChange:g.setGoalArea}, g.areaOptions.map(a => h('option', {value:a}, a))),
      ]),
      h('div', {class:'field', style:'margin-bottom:12px'}, [
        h('label', {}, 'Which instruments feed it — tap to pick'),
        h('div', {style:'display:flex;gap:6px;flex-wrap:wrap;margin-top:2px'}, g.goalActChips.map(c =>
          h('button', {onClick:c.toggle, style:`padding:7px 11px;border-radius:999px;border:1px solid ${c.border};background:${c.bg};color:${c.color};font-family:var(--font-body);font-size:12px;cursor:pointer;white-space:nowrap`}, c.name)
        )),
        h('div', {style:'font-size:11px;line-height:1.5;color:color-mix(in srgb, var(--color-text) 50%, transparent);margin-top:8px'}, 'The first one files the goal under that instrument. Log a session for any of them and this goal appears in “Working toward”.'),
      ]),
      h('div', {class:'field', style:'margin-bottom:14px'}, [h('label', {}, 'Steps — one per line'), h('textarea', {class:'input', rows:4, placeholder:'Meri stable across the lower octave\nMemorise the first half\nRecord a take worth keeping', value:gf.steps, onChange:g.setGoalSteps})]),
      h('div', {style:'display:flex;gap:9px'}, [
        h('button', {class:'btn btn-secondary', onClick:g.cancelGoal, style:'flex:none'}, 'Cancel'),
        h('button', {class:'btn btn-primary', onClick:g.addGoal, style:'flex:1'}, 'Add goal'),
      ]),
    ]));
  }

  children.push(h('div', {style:'font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 48%, transparent);margin-bottom:6px'}, 'Filter goals by project'));
  children.push(h('div', {style:'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px'}, g.projectChipRow.map(c =>
    h('button', {onClick:c.select, style:`padding:6px 11px;border-radius:999px;border:1px solid ${c.border};background:${c.bg};color:${c.color};font-family:var(--font-body);font-size:11.5px;cursor:pointer;white-space:nowrap`}, c.name)
  )));

  children.push(h('div', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-bottom:10px'}, 'Projects · time-boxed pushes'));
  if(g.projectCards.length){
    children.push(...g.projectCards.map(projectCard));
  } else {
    children.push(h('div', {style:'font-size:12.5px;line-height:1.6;color:color-mix(in srgb, var(--color-text) 48%, transparent);padding-bottom:4px'},
      'No projects running. A project is a short push at one goal — start one from Today, under Project.'));
  }

  children.push(h('div', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin:24px 0 10px'}, 'Long-term goals'));
  children.push(...g.goalRows.map(goalRow));
  children.push(h('div', {style:'font-size:11.5px;line-height:1.6;color:color-mix(in srgb, var(--color-text) 50%, transparent);margin-top:14px'}, 'Tap a step to cycle it: not started → in progress → done. Finishing one stamps the date — then archive the goal to put it away without losing it.'));

  if(g.hasArchived){
    children.push(h('button', {onClick:g.archivedSec.toggle, style:'display:flex;align-items:center;gap:8px;width:100%;background:none;border:none;padding:0;margin:24px 0 9px;cursor:pointer;font-family:var(--font-body)'}, [
      chevronDown(g.archivedSec.chevron, 11, 2.6),
      h('span', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent)'}, 'Archived — finished and put away'),
      h('span', {style:'margin-left:auto;font-size:11px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 42%, transparent)'}, g.archivedSec.count),
    ]));
    if(g.archivedSec.open){
      children.push(...g.archivedRows.map(archivedRow));
    }
  }

  return h('div', {}, children);
}
