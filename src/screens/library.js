// Library screen — character search across everything; with no query,
// per-instrument detail: stats grid, 8-week sparkline, and six collapsible
// sections (goals, projects, tasks, words, stuck notes, finished-and-when).
// Ported 1:1 from reference/Kata.dc.html's `isLibrary` block (lines ~790-1099).
import { h } from '../lib/dom.js';

const chevronSec = (rotate) => h('svg', {width:11, height:11, viewBox:'0 0 24 24', fill:'none', stroke:'var(--color-accent-700)', 'stroke-width':2.6, 'stroke-linecap':'round', 'stroke-linejoin':'round', style:`flex:none;transform:${rotate}`}, [h('path', {d:'m6 9 6 6 6-6'})]);
const chevronBtn = (rotate, size=12, sw=2.4) => h('svg', {width:size, height:size, viewBox:'0 0 24 24', fill:'none', stroke:'var(--color-accent-700)', 'stroke-width':sw, 'stroke-linecap':'round', 'stroke-linejoin':'round', style:`transform:${rotate}`}, [h('path', {d:'m6 9 6 6 6-6'})]);
const trashIcon = () => h('svg', {width:15, height:15, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':1.8, 'stroke-linecap':'round', 'stroke-linejoin':'round'}, [
  h('path', {d:'M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7'}),
]);

function sectionHeader(label, count, sec){
  return h('button', {onClick:sec.toggle, style:'display:flex;align-items:center;gap:8px;width:100%;background:none;border:none;padding:0;margin:22px 0 9px;cursor:pointer;font-family:var(--font-body)'}, [
    chevronSec(sec.chevron),
    h('span', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent)'}, label),
    h('span', {style:'margin-left:auto;font-size:11px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 42%, transparent)'}, sec.count),
  ]);
}

function stepRow(s){
  return h('div', {style:`display:flex;align-items:flex-start;gap:9px;padding:6px 0;font-size:13px;line-height:1.45;color:${s.color}`}, [
    h('svg', {width:14, height:14, viewBox:'0 0 16 16', style:'flex:none;margin-top:2px'}, [h('circle', {cx:8, cy:8, r:6, fill:s.fill, stroke:s.stroke, 'stroke-width':1.4, 'stroke-dasharray':s.dash})]),
    h('span', {style:'flex:1;min-width:0'}, [s.label, h('span', {style:'font-size:11px;color:color-mix(in srgb, var(--color-text) 42%, transparent);font-variant-numeric:tabular-nums'}, s.doneLabel)]),
  ]);
}

function searchResults(l){
  const kids = [
    h('div', {style:'display:flex;align-items:baseline;gap:8px;margin-bottom:4px'}, [
      h('div', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent)'}, 'Matches'),
      h('button', {onClick:l.clearLibQuery, style:'margin-left:auto;background:none;border:none;padding:2px 0;font-family:var(--font-body);font-size:11.5px;color:var(--color-accent-700);cursor:pointer;text-decoration:underline;text-underline-offset:3px'}, 'Clear'),
    ]),
  ];
  if(l.libNoResults){
    kids.push(h('div', {style:'font-size:12.5px;line-height:1.55;color:color-mix(in srgb, var(--color-text) 48%, transparent);padding:14px 0'}, 'Nothing matches. Try a kanji, a reading, or a word from a note.'));
  }
  kids.push(...l.libGroups.map(grp => h('div', {style:'margin-bottom:16px'}, [
    h('div', {style:'display:flex;align-items:baseline;gap:8px;padding-bottom:6px;border-bottom:1px solid var(--color-divider)'}, [
      h('div', {style:'font-family:var(--font-heading);font-weight:600;font-size:13px;letter-spacing:0.04em;text-transform:uppercase'}, grp.title),
      h('div', {style:'margin-left:auto;font-size:11px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 42%, transparent)'}, grp.count),
    ]),
    ...grp.rows.map(r => h('button', {onClick:r.go, style:'display:flex;align-items:flex-start;gap:10px;width:100%;background:none;border:none;border-bottom:1px solid var(--color-divider);padding:10px 0;text-align:left;cursor:pointer;font-family:var(--font-body)'}, [
      h('span', {style:`width:7px;height:7px;border-radius:999px;border:2px solid ${r.stroke};flex:none;margin-top:5px`}),
      h('span', {style:'flex:1;min-width:0'}, [
        h('span', {style:'display:block;font-size:13.5px;line-height:1.4;color:var(--color-text)'}, r.title),
        h('span', {style:'display:block;font-size:11px;line-height:1.4;color:color-mix(in srgb, var(--color-text) 50%, transparent);margin-top:2px'}, r.sub),
      ]),
      h('span', {style:'flex:none;font-size:10.5px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 45%, transparent);text-align:right;max-width:84px;line-height:1.4'}, r.meta),
    ])),
  ])));
  return h('div', {}, kids);
}

export function render(state, store){
  const l = store.selectLibrary();
  const inst = l.inst;

  const children = [
    h('h1', {style:'font-size:26px;margin:10px 0 6px'}, 'Library'),
    h('div', {style:'font-size:12.5px;line-height:1.55;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-bottom:16px'}, 'Everything filed under one instrument: the hours it has taken, the goals riding on it, and what you have actually finished.'),
    h('div', {class:'field', style:'margin-bottom:16px'}, [
      h('input', {class:'input', type:'search', placeholder:'Search 稽古, kanji, a goal, a note…', value:l.libQuery, onChange:l.setLibQuery}),
    ]),
  ];

  if(l.libSearching){
    children.push(searchResults(l));
    return h('div', {}, children);
  }

  // libNotSearching branch
  children.push(h('div', {style:'display:flex;gap:14px;padding:13px 0;border-top:1px solid var(--color-divider);border-bottom:1px solid var(--color-divider);margin-bottom:18px'}, l.overallStats.map(s =>
    h('div', {style:'flex:1'}, [
      h('div', {style:'font-family:var(--font-heading);font-size:22px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1'}, s.value),
      h('div', {style:'font-size:10px;letter-spacing:0.07em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 48%, transparent);margin-top:4px;line-height:1.3'}, s.label),
    ])
  )));

  children.push(h('div', {style:'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px'}, l.instChips.map(c =>
    h('button', {onClick:c.select, style:`padding:8px 12px;border-radius:999px;border:1px solid ${c.border};background:${c.bg};color:${c.color};font-family:var(--font-body);font-size:12px;cursor:pointer;white-space:nowrap`}, c.name)
  )));

  children.push(h('h2', {style:`font-size:23px;margin:0 0 3px;color:${inst.stroke}`}, inst.name));
  children.push(h('div', {style:'font-size:11.5px;color:color-mix(in srgb, var(--color-text) 52%, transparent);margin-bottom:14px'}, `${inst.kindLabel} · ${inst.lastLabel}`));

  children.push(h('div', {style:'display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--color-divider);border:1px solid var(--color-divider);margin-bottom:18px'}, inst.stats.map(s =>
    h('div', {style:'background:var(--color-bg);padding:12px 11px'}, [
      h('div', {style:'font-family:var(--font-heading);font-size:20px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1'}, s.value),
      h('div', {style:'font-size:9.5px;letter-spacing:0.06em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 48%, transparent);margin-top:4px;line-height:1.3'}, s.label),
    ])
  )));

  children.push(h('div', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-bottom:8px'}, 'Last eight weeks · minutes'));
  children.push(h('svg', {width:'100%', height:60, viewBox:'0 0 260 60', style:'display:block;margin-bottom:4px'}, [
    ...inst.spark.map(b => h('rect', {x:b.x, y:b.y, width:22, height:b.h, fill:b.fill, stroke:b.stroke, 'stroke-width':1})),
    h('line', {x1:0, y1:52, x2:260, y2:52, stroke:'var(--color-divider)', 'stroke-width':1}),
  ]));
  children.push(h('div', {style:'display:flex;justify-content:space-between;font-size:9.5px;color:color-mix(in srgb, var(--color-text) 42%, transparent);margin-bottom:22px'}, [
    h('span', {}, '8 wks ago'), h('span', {}, `peak ${inst.sparkPeak} min`), h('span', {}, 'this week'),
  ]));

  // Goals riding on it
  children.push(sectionHeader('Goals riding on it', inst.secGoals.count, inst.secGoals));
  if(inst.secGoals.open){
    children.push(h('div', {class:'field', style:'margin-bottom:10px'}, [
      h('select', {class:'input', style:'font-size:12.5px', value:l.goalSort, onChange:l.setGoalSort}, [
        h('option', {value:'default'}, 'In filing order'),
        h('option', {value:'progress'}, 'Furthest along first'),
        h('option', {value:'done'}, 'Completed first'),
        h('option', {value:'alpha'}, 'A to Z'),
      ]),
    ]));
    if(inst.noGoals){
      children.push(h('div', {style:'font-size:12.5px;color:color-mix(in srgb, var(--color-text) 48%, transparent);padding-bottom:14px'}, 'No goals attached to this one yet.'));
    }
    children.push(...inst.goals.map(g => h('div', {style:'border-bottom:1px solid var(--color-divider)'}, [
      h('button', {onClick:g.toggle, style:'display:flex;align-items:center;gap:11px;width:100%;background:none;border:none;padding:11px 0;text-align:left;cursor:pointer;font-family:var(--font-body)'}, [
        chevronBtn(g.chevron),
        h('div', {style:'flex:1;min-width:0'}, [
          h('div', {style:'font-family:var(--font-heading);font-weight:600;font-size:14.5px;line-height:1.3;color:var(--color-text)'}, g.name),
          h('div', {style:'font-size:11px;color:color-mix(in srgb, var(--color-text) 50%, transparent);margin-top:2px'}, `${g.area}${g.doneLabel}`),
        ]),
        h('div', {style:'font-size:11.5px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 55%, transparent);flex:none'}, g.progressLabel),
      ]),
      g.open ? h('div', {style:'padding:2px 0 12px 23px'}, g.steps.map(stepRow)) : null,
    ])));
  }

  // Projects using it
  children.push(sectionHeader('Projects using it', inst.secProjects.count, inst.secProjects));
  if(inst.secProjects.open){
    if(inst.noProjects){
      children.push(h('div', {style:'font-size:12.5px;color:color-mix(in srgb, var(--color-text) 48%, transparent);padding-bottom:14px'}, 'Not in any active project.'));
    }
    children.push(...inst.projects.map(p => h('div', {style:'display:flex;align-items:center;gap:11px;padding:11px 0;border-bottom:1px solid var(--color-divider)'}, [
      h('div', {style:'flex:1;min-width:0'}, [
        h('div', {style:'font-family:var(--font-heading);font-weight:600;font-size:14.5px;line-height:1.3'}, p.name),
        h('div', {style:'font-size:11px;color:color-mix(in srgb, var(--color-text) 50%, transparent);margin-top:2px'}, p.minutesLabel),
      ]),
      h('div', {style:'font-size:11.5px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 55%, transparent);flex:none'}, p.progressLabel),
    ])));
  }

  // Daily tasks filed here
  children.push(sectionHeader('Daily tasks filed here', inst.secTasks.count, inst.secTasks));
  if(inst.secTasks.open){
    if(inst.noTasks){
      children.push(h('div', {style:'font-size:12.5px;color:color-mix(in srgb, var(--color-text) 48%, transparent);padding-bottom:14px'}, 'No repeating tasks filed under this one.'));
    }
    children.push(...inst.tasks.map(t => h('div', {style:'display:flex;align-items:center;gap:11px;padding:11px 0;border-bottom:1px solid var(--color-divider)'}, [
      h('span', {style:`width:7px;height:7px;border-radius:999px;border:2px solid ${t.stroke};flex:none`}),
      h('div', {style:'flex:1;min-width:0'}, [
        h('div', {style:'font-size:13.5px;line-height:1.35'}, t.name),
        h('div', {style:'font-size:11px;color:color-mix(in srgb, var(--color-text) 48%, transparent);margin-top:2px'}, `${t.whenLabel} · ${t.rateLabel}`),
      ]),
      h('div', {style:`flex:none;font-size:11px;font-variant-numeric:tabular-nums;color:${t.streakColor};text-align:right;max-width:78px;line-height:1.4`}, t.streakLabel),
    ])));
  }

  // Words studied (jpn only)
  if(inst.showWords){
    children.push(sectionHeader('Words studied', inst.secWords.count, inst.secWords));
    if(inst.secWords.open){
      if(inst.noWords){
        children.push(h('div', {style:'font-size:12.5px;line-height:1.55;color:color-mix(in srgb, var(--color-text) 48%, transparent);padding-bottom:14px'}, 'No words marked yet. Mark the word of the day on Today and it lands here.'));
      }
      children.push(...inst.words.map(w => h('div', {style:'padding:12px 0;border-bottom:1px solid var(--color-divider)'}, [
        h('div', {style:'display:flex;align-items:baseline;gap:10px'}, [
          h('div', {style:'font-family:var(--font-heading);font-size:20px;font-weight:600;line-height:1;flex:none'}, w.w),
          h('div', {style:'flex:1;min-width:0'}, [
            h('div', {style:'font-size:11.5px;color:color-mix(in srgb, var(--color-text) 58%, transparent)'}, w.reading),
            h('div', {style:'font-size:12.5px;font-style:italic;line-height:1.4;margin-top:1px'}, w.en),
          ]),
          h('div', {style:'flex:none;font-size:10.5px;font-variant-numeric:tabular-nums;color:var(--color-accent-700);text-align:right;line-height:1.4;max-width:82px'}, w.date),
        ]),
        h('div', {style:'font-size:14px;line-height:1.7;font-family:var(--font-heading);margin-top:9px'}, w.quoteJp),
        h('div', {style:'font-size:11.5px;line-height:1.5;font-style:italic;color:color-mix(in srgb, var(--color-text) 62%, transparent);margin-top:3px'}, w.quoteEn),
        h('div', {style:'display:flex;align-items:baseline;gap:8px;margin-top:7px'}, [
          h('div', {style:'font-size:11.5px;font-family:var(--font-heading);font-weight:600'}, w.source),
          h('div', {style:'font-size:10px;color:color-mix(in srgb, var(--color-text) 45%, transparent)'}, w.sourceSub),
          h('div', {style:'margin-left:auto;font-size:9.5px;letter-spacing:0.06em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 40%, transparent);white-space:nowrap'}, w.chunkLabel),
        ]),
      ])));
    }
  }

  // Shakuhachi routine + licks (shaku only)
  if(inst.showShaku){
    children.push(sectionHeader('The practice routine', inst.secRoutine.count, inst.secRoutine));
    if(inst.secRoutine.open){
      children.push(h('div', {style:'font-size:12.5px;line-height:1.55;color:color-mix(in srgb, var(--color-text) 52%, transparent);margin-bottom:6px'}, 'Warm up, technical, then reward. The rate is how often each step got ticked in the last ten shakuhachi sessions.'));
      children.push(...inst.routine.map(ph => h('div', {style:'margin-top:12px'}, [
        h('div', {style:'font-family:var(--font-heading);font-size:11.5px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 62%, transparent);padding-bottom:5px;border-bottom:1px solid var(--color-divider)'}, ph.phase),
        ...ph.steps.map(s => h('div', {style:'border-bottom:1px solid var(--color-divider)'}, [
          h('button', {onClick:s.toggle, style:'display:flex;align-items:center;gap:10px;width:100%;background:none;border:none;padding:10px 0;text-align:left;cursor:pointer;font-family:var(--font-body)'}, [
            chevronBtn(s.chevron, 11, 2.6),
            h('span', {style:'flex:1;min-width:0'}, [
              h('span', {style:'display:block;font-family:var(--font-heading);font-weight:600;font-size:14.5px;line-height:1.3;color:var(--color-text)'}, s.label),
              h('span', {style:'display:block;font-size:10.5px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 48%, transparent);margin-top:2px'}, s.mins),
            ]),
            h('span', {style:'flex:none;font-size:11px;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--color-accent-700);text-align:right;line-height:1.4'}, s.rate),
          ]),
          s.open ? h('div', {style:'display:flex;flex-direction:column;gap:4px;padding:0 0 12px 21px'}, s.cues.map(c =>
            h('div', {style:'display:flex;gap:8px;font-size:12.5px;line-height:1.55;color:color-mix(in srgb, var(--color-text) 78%, transparent)'}, [
              h('span', {style:'flex:none;color:var(--color-accent)'}, '—'), h('span', {style:'flex:1;min-width:0;text-wrap:pretty'}, c.text),
            ])
          )) : null,
        ])),
      ])));
    }

    children.push(sectionHeader('Licks & phrases', inst.secLicks.count, inst.secLicks));
    if(inst.secLicks.open){
      if(inst.noLicks){
        children.push(h('div', {style:'font-size:12.5px;line-height:1.55;color:color-mix(in srgb, var(--color-text) 48%, transparent);padding-bottom:12px'}, 'Nothing filed yet. Phrases added while logging a shakuhachi session land here.'));
      }
      children.push(...inst.licks.map(li => {
        const kids = [
          h('div', {style:'display:flex;align-items:flex-start;gap:10px'}, [
            h('div', {style:'flex:1;min-width:0'}, [
              h('div', {style:'font-family:var(--font-heading);font-weight:600;font-size:14.5px;line-height:1.3'}, li.name),
              h('div', {style:'font-size:11px;color:color-mix(in srgb, var(--color-text) 50%, transparent);margin-top:2px'}, `${li.source} · ${li.playLabel} · ${li.lastLabel}`),
            ]),
            h('button', {onClick:li.play, class:'btn btn-secondary', style:'flex:none;font-size:11px;padding:5px 10px'}, 'Played'),
            h('button', {onClick:li.remove, class:'btn btn-icon btn-ghost', 'aria-label':'Delete lick', style:'flex:none'}, [trashIcon()]),
          ]),
        ];
        if(li.hasNotation) kids.push(h('div', {style:'font-family:var(--font-heading);font-size:17px;line-height:1.6;margin-top:8px'}, li.notation));
        if(li.hasNote) kids.push(h('div', {style:'font-size:12.5px;line-height:1.55;font-style:italic;color:color-mix(in srgb, var(--color-text) 70%, transparent);margin-top:5px;text-wrap:pretty'}, li.note));
        return h('div', {style:'padding:12px 0;border-bottom:1px solid var(--color-divider)'}, kids);
      }));
      const lf = l.lickForm;
      children.push(h('div', {style:'margin-top:12px;padding:12px;border:1px solid var(--color-divider)'}, [
        h('div', {class:'field', style:'margin-bottom:8px'}, [h('label', {}, 'New phrase'), h('input', {class:'input', placeholder:'What to call it later', value:lf.name, onChange:l.setLickName})]),
        h('div', {style:'display:flex;gap:8px;margin-bottom:8px'}, [
          h('div', {class:'field', style:'flex:1'}, [
            h('label', {}, 'Where from'),
            h('select', {class:'input', value:lf.source, onChange:l.setLickSource}, l.lickSourceOptions.map(o => h('option', {value:o.value}, o.name))),
          ]),
          h('div', {class:'field', style:'flex:1'}, [h('label', {}, 'Fingering'), h('input', {class:'input', placeholder:'ロ ツ レ', value:lf.notation, onChange:l.setLickNotation})]),
        ]),
        h('div', {class:'field', style:'margin-bottom:10px'}, [h('label', {}, 'How it goes'), h('textarea', {class:'input', rows:2, placeholder:'Breath, meri, where it sits', value:lf.note, onChange:l.setLickNote})]),
        h('button', {class:'btn btn-secondary btn-block', onClick:l.addLickFromLibrary}, 'File the phrase'),
      ]));
    }
  }

  // Where you keep getting stuck
  children.push(sectionHeader('Where you keep getting stuck', inst.secStuck.count, inst.secStuck));
  if(inst.secStuck.open){
    if(inst.noStuck){
      children.push(h('div', {style:'font-size:12.5px;color:color-mix(in srgb, var(--color-text) 48%, transparent)'}, 'Nothing logged yet.'));
    }
    children.push(...inst.stuckNotes.map(n => h('div', {style:'padding:10px 13px;margin-bottom:7px;background:var(--color-accent-100);border-left:2px solid var(--color-accent);font-size:12.5px;line-height:1.55;color:var(--color-accent-800)'}, [
      n.text, h('span', {style:'opacity:0.6'}, ` · ${n.date}`),
    ])));
  }

  // Finished, and when
  children.push(sectionHeader('Finished, and when', inst.secDone.count, inst.secDone));
  if(inst.secDone.open){
    if(inst.noAccomplishments){
      children.push(h('div', {style:'font-size:12.5px;color:color-mix(in srgb, var(--color-text) 48%, transparent);padding-bottom:10px'}, 'Nothing marked done for this one yet. Finish a step in Goals and it lands here with the date.'));
    }
    children.push(...inst.accomplishments.map(a => h('div', {style:'display:flex;align-items:flex-start;gap:11px;padding:11px 0;border-bottom:1px solid var(--color-divider)'}, [
      h('svg', {width:15, height:15, viewBox:'0 0 16 16', style:'flex:none;margin-top:3px'}, [h('circle', {cx:8, cy:8, r:6, fill:'var(--color-accent)', stroke:'var(--color-accent)', 'stroke-width':1.4})]),
      h('div', {style:'flex:1;min-width:0'}, [
        h('div', {style:'font-size:13.5px;line-height:1.45'}, a.label),
        h('div', {style:'font-size:11px;color:color-mix(in srgb, var(--color-text) 50%, transparent);margin-top:3px'}, a.parent),
      ]),
      h('div', {style:'font-size:11px;font-variant-numeric:tabular-nums;color:var(--color-accent-700);flex:none;text-align:right;line-height:1.4;max-width:88px'}, a.date),
    ])));
  }

  return h('div', {}, children);
}
