// Today screen — daily check-in. Ported 1:1 from reference/Kata.dc.html's
// `isToday` block (lines ~31-278). Markup, inline styles, and behavior match
// the source; icon path data is copied verbatim.
import { h } from '../lib/dom.js';

const enso = (item) => h('svg', {width:30, height:30, viewBox:'0 0 32 32'}, [
  h('circle', {cx:16, cy:16, r:12, fill:item.fill, stroke:item.stroke,
    'stroke-width':item.strokeWidth, 'stroke-dasharray':item.dasharray,
    'stroke-linecap':'round', transform:'rotate(-90 16 16)'}),
]);

const plusIcon = (size, sw) => h('svg', {width:size, height:size, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':sw, 'stroke-linecap':'round'}, [
  h('path', {d:'M12 5v14M5 12h14'}),
]);

const logIcon = () => h('svg', {width:17, height:17, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':1.7, 'stroke-linecap':'round'}, [
  h('path', {d:'M12 5v14M5 12h14'}),
]);

const dropIcon = () => h('svg', {width:15, height:15, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':1.8, 'stroke-linecap':'round'}, [
  h('path', {d:'M5 12h14'}),
]);

const dotIcon = () => h('svg', {width:16, height:16, viewBox:'0 0 24 24', fill:'none', stroke:'var(--color-accent-700)', 'stroke-width':1.7, 'stroke-linecap':'round', 'stroke-linejoin':'round', style:'flex:none'}, [
  h('circle', {cx:12, cy:12, r:8}),
  h('circle', {cx:12, cy:12, r:3.5}),
]);

const chevronRight = () => h('svg', {width:13, height:13, viewBox:'0 0 24 24', fill:'none', stroke:'var(--color-accent-700)', 'stroke-width':2.2, 'stroke-linecap':'round', 'stroke-linejoin':'round', style:'flex:none'}, [
  h('path', {d:'m9 6 6 6-6 6'}),
]);

const xIcon = () => h('svg', {width:17, height:17, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':1.9, 'stroke-linecap':'round'}, [
  h('path', {d:'M6 6l12 12M18 6 6 18'}),
]);

const stepCircle = (s) => h('svg', {width:15, height:15, viewBox:'0 0 16 16', style:'flex:none'}, [
  h('circle', {cx:8, cy:8, r:6, fill:s.fill, stroke:s.stroke, 'stroke-width':1.4, 'stroke-dasharray':s.dash}),
]);

function projectCard(t){
  const p = t.activeProject;
  const meta = [p.goalName ? 'Feeds ' + p.goalName : '', p.untilLabel].filter(Boolean).join(' · ');
  return h('div', {class:'card elev-sm', style:'margin-bottom:18px'}, [
    h('div', {style:'display:flex;align-items:baseline;gap:9px'}, [
      h('div', {class:'card-kicker', style:'flex:1;min-width:0'}, 'In the sprint'),
      h('button', {onClick:p.remove, class:'btn btn-icon btn-ghost', 'aria-label':'Delete project', style:'flex:none;width:26px;height:26px'}, [
        h('svg', {width:14, height:14, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':1.8, 'stroke-linecap':'round', 'stroke-linejoin':'round'}, [
          h('path', {d:'M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7'}),
        ]),
      ]),
    ]),
    h('div', {class:'card-title', style:'margin-bottom:4px'}, p.name),
    meta ? h('div', {style:'font-size:11px;line-height:1.45;color:var(--color-accent-700);margin-bottom:5px'}, meta) : null,
    h('button', {onClick:p.toggleSprint, style:`align-self:flex-start;padding:5px 10px;border-radius:999px;border:1px ${p.sprint?'solid':'dashed'} ${p.sprint?'var(--color-accent)':'var(--color-divider)'};background:${p.sprint?'var(--color-accent-100)':'transparent'};color:${p.sprint?'var(--color-accent-800)':'color-mix(in srgb, var(--color-text) 55%, transparent)'};font-family:var(--font-body);font-size:11px;cursor:pointer;margin-bottom:6px`}, p.sprintLabel),
    p.blurb ? h('div', {style:'font-size:13.5px;line-height:1.55;color:color-mix(in srgb, var(--color-text) 75%, transparent)'}, p.blurb) : null,
    h('div', {style:'display:flex;gap:6px;flex-wrap:wrap;margin-top:11px'}, p.actChips.map(c =>
      h('span', {style:`font-size:11px;padding:3px 8px;border-radius:999px;border:1px solid ${c.stroke};color:${c.stroke};white-space:nowrap`}, c.name)
    )),
    h('div', {style:'margin-top:13px;padding-top:12px;border-top:1px solid var(--color-divider)'}, [
      h('div', {style:'display:flex;align-items:baseline;gap:8px;margin-bottom:7px'}, [
        h('div', {style:'font-size:10.5px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 50%, transparent)'}, `${p.editing ? 'All steps' : 'Next steps'} · ${p.progressLabel}`),
        h('button', {onClick:p.toggleEdit, style:'margin-left:auto;background:none;border:none;padding:0;font-family:var(--font-body);font-size:11px;color:var(--color-accent-700);cursor:pointer;text-decoration:underline;text-underline-offset:3px'}, p.editing ? 'Done editing' : 'Edit steps'),
      ]),

      // Reading mode: the next three, tappable to advance.
      ...(p.editing ? [] : [
        p.openSteps.length ? null : h('div', {style:'font-size:12.5px;line-height:1.55;color:color-mix(in srgb, var(--color-text) 48%, transparent);padding:2px 0 6px'}, 'Every step is done. Add the next one, or finish the push.'),
        ...p.openSteps.map(s => h('button', {onClick:s.cycle, style:`display:flex;align-items:center;gap:9px;width:100%;background:none;border:none;padding:7px 0;text-align:left;cursor:pointer;font-family:var(--font-body);font-size:13.5px;color:${s.color}`}, [
          stepCircle(s), h('span', {style:'flex:1;min-width:0'}, s.label),
          s.tickLabel ? h('span', {title:s.tickTitle, style:'flex:none;font-size:10.5px;font-variant-numeric:tabular-nums;color:var(--color-accent-700);border:1px solid var(--color-accent);border-radius:999px;padding:1px 7px'}, s.tickLabel) : null,
        ])),
      ]),

      // Editing mode: every step, renameable, plus add and delete.
      ...(p.editing ? [
        ...p.allSteps.map(s => h('div', {style:'display:flex;align-items:center;gap:7px;padding:5px 0;border-bottom:1px solid var(--color-divider)'}, [
          h('button', {onClick:s.cycle, 'aria-label':'Advance step', style:'flex:none;background:none;border:none;padding:0;cursor:pointer;line-height:0'}, [stepCircle(s)]),
          h('input', {class:'input', style:'flex:1;min-width:0;font-size:12.5px;padding:6px 8px', value:s.label, onChange:s.rename}),
          h('button', {onClick:s.remove, class:'btn btn-icon btn-ghost', 'aria-label':'Remove step', style:'flex:none;width:26px;height:26px'}, [
            h('svg', {width:13, height:13, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':1.8, 'stroke-linecap':'round', 'stroke-linejoin':'round'}, [
              h('path', {d:'M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7'}),
            ]),
          ]),
        ])),
        h('div', {style:'display:flex;gap:8px;margin-top:10px'}, [
          h('input', {class:'input', style:'flex:1;min-width:0;font-size:12.5px;padding:7px 9px', placeholder:'Add a step', value:p.newStep, onInput:p.setNewStep}),
          h('button', {onClick:p.addStep, class:'btn btn-secondary', style:'flex:none;font-size:12px;padding:7px 12px'}, 'Add'),
        ]),
        h('div', {style:'display:flex;gap:9px;margin-top:12px'}, [
          h('div', {class:'field', style:'flex:1;min-width:0'}, [h('label', {}, 'Name'), h('input', {class:'input', style:'font-size:12.5px', value:p.name, onChange:p.rename})]),
          h('div', {class:'field', style:'flex:none;width:130px'}, [h('label', {}, 'Done by'), h('input', {class:'input', type:'date', style:'font-size:12.5px', value:p.until, onChange:p.setUntil})]),
        ]),
      ] : []),
    ]),
    h('button', {class:'btn btn-secondary btn-block', onClick:p.logIt, style:'margin-top:12px'}, 'Log against this project'),
  ]);
}

// A project is the short-term, time-boxed sibling of a goal: it names the push,
// binds to the goal it serves, and carries its own steps.
function projectForm(f){
  return h('div', {class:'card elev-sm', style:'margin-bottom:18px'}, [
    h('div', {class:'card-kicker'}, 'New project'),
    h('div', {class:'field', style:'margin:10px 0'}, [
      h('label', {}, 'What is the push'),
      h('input', {class:'input', type:'text', placeholder:'e.g. Two honkyoku by the recital', value:f.name, onChange:f.setName}),
    ]),
    h('div', {class:'field', style:'margin-bottom:10px'}, [
      h('label', {}, 'In a sentence'),
      h('textarea', {class:'input', rows:2, placeholder:'What it is and why it matters right now', value:f.blurb, onChange:f.setBlurb}),
    ]),
    h('div', {style:'display:flex;gap:10px;margin-bottom:10px'}, [
      h('div', {class:'field', style:'flex:1;min-width:0'}, [
        h('label', {}, 'Feeds which goal'),
        h('select', {class:'input', value:f.goalId, onChange:f.setGoal}, [
          h('option', {value:''}, 'Not tied to a goal'),
          ...f.goalOptions.map(g => h('option', {value:g.value}, g.name)),
        ]),
      ]),
      h('div', {class:'field', style:'flex:none;width:132px'}, [
        h('label', {}, 'Done by'),
        h('input', {class:'input', type:'date', value:f.until, onChange:f.setUntil}),
      ]),
    ]),
    h('button', {onClick:f.toggleSprint, style:`align-self:flex-start;padding:7px 12px;border-radius:999px;border:1px ${f.sprint?'solid':'dashed'} ${f.sprint?'var(--color-accent)':'var(--color-divider)'};background:${f.sprint?'var(--color-accent-100)':'transparent'};color:${f.sprint?'var(--color-accent-800)':'color-mix(in srgb, var(--color-text) 55%, transparent)'};font-family:var(--font-body);font-size:11.5px;cursor:pointer;margin-bottom:10px`},
      f.sprint ? 'Sprint mode on — shows on every routine day' : 'Sprint mode off — shows on its due date only'),
    h('div', {class:'field', style:'margin-bottom:10px'}, [
      h('label', {}, 'Which instruments it uses — tap to pick'),
      h('div', {style:'display:flex;gap:6px;flex-wrap:wrap;margin-top:2px'}, f.actChips.map(c =>
        h('button', {onClick:c.toggle, style:`padding:7px 11px;border-radius:999px;border:1px solid ${c.border};background:${c.bg};color:${c.color};font-family:var(--font-body);font-size:12px;cursor:pointer;white-space:nowrap`}, c.name)
      )),
    ]),
    h('div', {class:'field', style:'margin-bottom:14px'}, [
      h('label', {}, 'Steps — one per line'),
      h('textarea', {class:'input', rows:4, placeholder:'Sketch the opening\nFix the meri passage\nRough mix to sit with', value:f.steps, onChange:f.setSteps}),
    ]),
    h('div', {style:'display:flex;gap:9px'}, [
      h('button', {class:'btn btn-secondary', onClick:f.cancel, style:'flex:none'}, 'Cancel'),
      h('button', {class:'btn btn-primary', onClick:f.submit, style:'flex:1'}, 'Start this project'),
    ]),
  ]);
}

function rotationRow(item){
  return h('div', {style:'display:flex;align-items:center;gap:13px;padding:12px 0;border-bottom:1px solid var(--color-divider)'}, [
    h('button', {onClick:item.toggle, 'aria-label':'Mark done', style:'background:none;border:none;padding:0;cursor:pointer;line-height:0;flex:none'}, [enso(item)]),
    h('div', {style:'flex:1;min-width:0'}, [
      h('div', {style:'font-family:var(--font-heading);font-weight:600;font-size:16px'}, item.name),
      h('div', {style:'font-size:12px;color:color-mix(in srgb, var(--color-text) 55%, transparent)'}, item.sub),
    ]),
    item.isExtra ? h('button', {onClick:item.drop, class:'btn btn-icon btn-ghost', 'aria-label':'Remove from today', style:'flex:none'}, [dropIcon()]) : null,
    h('button', {onClick:item.logIt, class:'btn btn-icon btn-ghost', 'aria-label':'Log this', style:'flex:none'}, [logIcon()]),
  ]);
}

function wordPanel(word){
  return h('div', {style:'margin:12px 0 4px;padding:14px 15px;border:1px solid var(--color-divider);border-left:2px solid var(--color-accent);background:color-mix(in srgb, var(--color-accent) 4%, transparent)'}, [
    h('div', {style:'display:flex;align-items:baseline;gap:8px;margin-bottom:11px'}, [
      h('div', {style:'font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--color-accent-700)'}, 'Today’s word & line'),
      h('div', {style:'margin-left:auto;font-size:10px;letter-spacing:0.07em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 45%, transparent)'}, `${word.chunkJp} · ${word.chunkEn}`),
    ]),
    h('div', {style:'display:flex;align-items:baseline;gap:13px;flex-wrap:wrap'}, [
      h('div', {style:'font-family:var(--font-heading);font-size:34px;line-height:1;font-weight:600'}, word.w),
      h('div', {style:'min-width:0'}, [
        h('div', {style:'font-size:12.5px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 62%, transparent)'}, `${word.k} · ${word.r}`),
        h('div', {style:'font-size:13px;font-style:italic;line-height:1.4;margin-top:2px'}, word.en),
      ]),
    ]),
    h('div', {style:'margin-top:13px;padding-top:11px;border-top:1px solid var(--color-divider)'}, [
      h('div', {style:'font-family:var(--font-heading);font-size:18px;line-height:1.75'}, word.quoteJp),
      h('div', {style:'font-size:11.5px;line-height:1.55;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-top:6px'}, word.quoteR),
      h('div', {style:'font-size:13px;font-style:italic;line-height:1.55;color:color-mix(in srgb, var(--color-text) 78%, transparent);margin-top:4px'}, word.quoteEn),
      h('div', {style:'display:flex;align-items:baseline;gap:8px;margin-top:10px;padding-top:9px;border-top:1px solid var(--color-divider)'}, [
        h('div', {style:'min-width:0'}, [
          h('div', {style:'font-family:var(--font-heading);font-size:13.5px;font-weight:600;line-height:1.3'}, word.source),
          h('div', {style:'font-size:10.5px;letter-spacing:0.04em;color:color-mix(in srgb, var(--color-text) 48%, transparent);margin-top:2px'}, word.sourceSub),
        ]),
      ]),
    ]),
    h('div', {style:'font-size:11px;line-height:1.6;color:color-mix(in srgb, var(--color-text) 50%, transparent);margin-top:11px'}, word.dateNote),
    h('button', {onClick:word.mark, style:`margin-top:12px;width:100%;padding:10px;border:1px solid ${word.markBorder};background:${word.markBg};color:${word.markColor};border-radius:4px;font-family:var(--font-body);font-size:12.5px;cursor:pointer`}, word.markLabel),
  ]);
}

function anchorRow(item){
  return h('div', {}, [
    h('div', {style:'display:flex;align-items:center;gap:13px;padding:12px 0;border-bottom:1px solid var(--color-divider)'}, [
      h('button', {onClick:item.toggle, 'aria-label':'Mark done', style:'background:none;border:none;padding:0;cursor:pointer;line-height:0;flex:none'}, [enso(item)]),
      h('div', {style:'flex:1;min-width:0'}, [
        h('div', {style:'font-family:var(--font-heading);font-weight:600;font-size:16px'}, item.name),
        h('div', {style:'font-size:12px;color:color-mix(in srgb, var(--color-text) 55%, transparent)'}, item.sub),
      ]),
      h('button', {onClick:item.logIt, class:'btn btn-icon btn-ghost', 'aria-label':'Log this', style:'flex:none'}, [logIcon()]),
    ]),
    item.hasWord ? wordPanel(item.word) : null,
  ]);
}

function goalPeekSheet(gp){
  return h('div', {}, [
    h('div', {onClick:gp.close, style:'position:fixed;inset:0;background:color-mix(in srgb, #201f1d 42%, transparent);z-index:40'}),
    h('div', {style:'position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;max-height:76vh;overflow-y:auto;background:var(--color-bg);border-top:1px solid var(--color-divider);box-shadow:var(--shadow-lg);z-index:41;padding:16px 20px 24px'}, [
      h('div', {style:'display:flex;align-items:baseline;gap:10px;margin-bottom:3px'}, [
        h('h2', {style:'font-size:19px;margin:0;flex:1;min-width:0'}, gp.title),
        h('button', {onClick:gp.close, class:'btn btn-icon btn-ghost', 'aria-label':'Close', style:'flex:none'}, [xIcon()]),
      ]),
      h('div', {style:'font-size:11.5px;line-height:1.5;color:color-mix(in srgb, var(--color-text) 50%, transparent);margin-bottom:14px'}, `${gp.subtitle} · tap a step to advance it`),
      gp.empty ? h('div', {style:'font-size:13px;line-height:1.6;color:color-mix(in srgb, var(--color-text) 48%, transparent);padding:14px 0'}, 'Nothing in the rotation feeds a goal yet. Add instruments to a goal in the Goals screen.') : null,
      ...gp.rows.map(g => h('div', {style:'padding:13px 0;border-top:1px solid var(--color-divider)'}, [
        h('div', {style:'display:flex;align-items:baseline;gap:9px'}, [
          h('span', {style:`width:7px;height:7px;border-radius:999px;border:2px solid ${g.stroke};flex:none`}),
          h('div', {style:'flex:1;min-width:0'}, [
            h('div', {style:'font-family:var(--font-heading);font-weight:600;font-size:15px;line-height:1.3'}, g.name),
            h('div', {style:'font-size:10.5px;letter-spacing:0.05em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 45%, transparent);margin-top:3px'}, `${g.kind} · ${g.instLabel}`),
          ]),
          h('div', {style:'flex:none;font-size:11.5px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 52%, transparent)'}, g.progressLabel),
        ]),
        h('div', {style:'margin-top:6px;padding-left:16px'}, g.steps.map(s =>
          h('button', {onClick:s.cycle, style:`display:flex;align-items:flex-start;gap:10px;width:100%;background:none;border:none;padding:9px 0;text-align:left;cursor:pointer;font-family:var(--font-body);font-size:13.5px;line-height:1.45;color:${s.color}`}, [
            h('svg', {width:16, height:16, viewBox:'0 0 16 16', style:'flex:none;margin-top:2px'}, [
              h('circle', {cx:8, cy:8, r:6, fill:s.fill, stroke:s.stroke, 'stroke-width':1.4, 'stroke-dasharray':s.dash}),
            ]),
            h('span', {style:'flex:1;min-width:0'}, [
              s.label,
              h('span', {style:'font-size:11px;color:color-mix(in srgb, var(--color-text) 42%, transparent);font-variant-numeric:tabular-nums'}, s.doneLabel),
            ]),
          ])
        )),
      ])),
    ]),
  ]);
}

export function render(state, store){
  const t = store.selectToday();

  const children = [];

  children.push(h('h1', {style:'font-size:30px;margin:10px 0 18px'}, t.todayHeading));

  children.push(h('div', {class:'seg', style:'margin-bottom:22px'}, [
    h('label', {class:'seg-opt'}, [
      h('input', {type:'radio', name:'mode', checked:t.isDefaultMode, onChange:t.setDefaultMode}),
      h('svg', {width:16, height:16, viewBox:'0 0 32 32'}, [h('circle', {cx:16, cy:16, r:11, fill:'none', stroke:'currentColor', 'stroke-width':1.6, 'stroke-linecap':'round', 'stroke-dasharray':'52 20', transform:'rotate(-90 16 16)'})]),
      ' Default',
    ]),
    h('label', {class:'seg-opt'}, [
      h('input', {type:'radio', name:'mode', checked:t.isProjectMode, onChange:t.setProjectMode}),
      h('svg', {width:16, height:16, viewBox:'0 0 32 32'}, [h('circle', {cx:16, cy:16, r:11, fill:'none', stroke:'currentColor', 'stroke-width':2.4, 'stroke-linecap':'round'})]),
      ' Project',
    ]),
  ]));

  if(t.isProjectMode){
    if(t.hasProjects){
      children.push(h('div', {style:'display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px'}, [
        ...t.projectChips.map(p =>
          h('button', {onClick:p.select, style:`border:1px solid ${p.border};background:${p.bg};color:${p.color};border-radius:999px;padding:7px 12px;font-size:12px;font-family:var(--font-body);cursor:pointer;line-height:1.3`}, p.name)
        ),
        t.projectForm.open ? null : h('button', {onClick:t.projectForm.openIt, style:'display:inline-flex;align-items:center;gap:5px;border:1px dashed var(--color-accent);background:transparent;color:var(--color-accent-700);border-radius:999px;padding:7px 12px;font-size:12px;font-family:var(--font-body);cursor:pointer;line-height:1.3'}, [
          h('svg', {width:11, height:11, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':2.4, 'stroke-linecap':'round'}, [h('path', {d:'M12 5v14M5 12h14'})]),
          'New',
        ]),
      ]));
    }
    if(t.projectForm.open) children.push(projectForm(t.projectForm));
    if(t.activeProject) children.push(projectCard(t));
    if(!t.hasProjects && !t.projectForm.open){
      children.push(h('div', {style:'padding:6px 0 4px'}, [
        h('div', {style:'font-size:13.5px;line-height:1.6;color:color-mix(in srgb, var(--color-text) 62%, transparent);margin-bottom:14px'},
          'No project running. A project is a short, time-boxed push — a handful of steps aimed at one goal, worked on until it is done. Start one and it shows up here, in the Log’s “working toward”, and on the Goals screen.'),
        h('button', {class:'btn btn-primary btn-block', onClick:t.projectForm.openIt, style:'margin-top:0'}, 'Start a project'),
      ]));
    }
  }

  if(t.isDefaultMode){
    children.push(h('div', {style:'display:flex;align-items:baseline;gap:8px;margin-bottom:2px'}, [
      h('div', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent)'}, 'Today’s rotation'),
      h('div', {style:'margin-left:auto;font-size:11px;color:color-mix(in srgb, var(--color-text) 45%, transparent);font-variant-numeric:tabular-nums'}, `${t.rotationSizeLabel} slots`),
    ]));
    children.push(...t.rotationItems.map(rotationRow));
    if(t.hasAddable){
      children.push(h('div', {style:'padding:11px 0 2px'}, [
        h('div', {style:'font-size:11px;color:color-mix(in srgb, var(--color-text) 48%, transparent);margin-bottom:8px'}, 'Add one more for today only'),
        h('div', {style:'display:flex;gap:6px;flex-wrap:wrap'}, t.addableToday.map(a =>
          h('button', {onClick:a.add, style:`display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border-radius:999px;border:1px dashed ${a.border};background:transparent;color:${a.color};font-family:var(--font-body);font-size:11.5px;cursor:pointer;white-space:nowrap`}, [
            plusIcon(11, 2.4), a.name,
          ])
        )),
      ]));
    }
    children.push(h('button', {onClick:t.goalPeek.openIt, style:'display:flex;align-items:center;gap:9px;width:100%;margin-top:14px;padding:12px 13px;border:1px solid var(--color-accent);background:transparent;border-radius:4px;cursor:pointer;font-family:var(--font-body);text-align:left'}, [
      dotIcon(),
      h('span', {style:'flex:1;min-width:0;font-size:13px;line-height:1.4;color:var(--color-accent-800)'}, t.goalPeek.buttonLabel),
      chevronRight(),
    ]));
  }

  if(t.goalPeek.open){
    children.push(goalPeekSheet(t.goalPeek));
  }

  children.push(h('div', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin:20px 0 2px'}, 'Daily anchors'));
  children.push(...t.anchorItems.map(anchorRow));

  children.push(h('div', {style:'display:flex;align-items:baseline;gap:8px;margin:22px 0 4px'}, [
    h('div', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent)'}, 'Today’s tasks'),
    h('div', {style:'margin-left:auto;font-size:11px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 45%, transparent)'}, t.tasksSummary),
  ]));
  children.push(h('div', {style:'font-size:11px;color:color-mix(in srgb, var(--color-text) 45%, transparent);margin-bottom:6px'}, 'Tick these off — no session log needed.'));
  if(t.noTodayTasks){
    children.push(h('div', {style:'font-size:12.5px;color:color-mix(in srgb, var(--color-text) 48%, transparent);padding:8px 0 4px'}, 'Nothing scheduled for today.'));
  }
  children.push(...t.todayTasks.map(tk => h('div', {style:'display:flex;align-items:center;gap:11px;padding:10px 0;border-bottom:1px solid var(--color-divider)'}, [
    h('button', {onClick:tk.toggle, 'aria-label':'Mark done', style:'flex:none;background:none;border:none;padding:0;cursor:pointer;line-height:0'}, [
      h('svg', {width:19, height:19, viewBox:'0 0 20 20'}, [
        h('rect', {x:2, y:2, width:16, height:16, rx:3, fill:tk.boxFill, stroke:tk.boxStroke, 'stroke-width':1.5}),
        h('path', {d:'m6 10.5 2.6 2.6L14.5 7', fill:'none', stroke:'var(--color-bg)', 'stroke-width':2, 'stroke-linecap':'round', 'stroke-linejoin':'round', opacity:tk.tickOpacity}),
      ]),
    ]),
    h('div', {style:'flex:1;min-width:0'}, [
      h('div', {style:`font-size:14px;line-height:1.35;color:${tk.textColor};text-decoration:${tk.textDecoration}`}, tk.name),
      h('div', {style:'font-size:11px;color:color-mix(in srgb, var(--color-text) 48%, transparent);margin-top:2px'}, (tk.parentName ? tk.parentName+' · ' : '') + tk.whenLabel),
    ]),
    h('span', {style:`width:7px;height:7px;border-radius:999px;border:2px solid ${tk.stroke};flex:none`}),
  ])));

  if(t.taskFormOpen){
    const tf = t.taskForm;
    const formChildren = [
      h('div', {class:'card-kicker'}, 'New task'),
      h('div', {class:'field', style:'margin:10px 0'}, [
        h('label', {}, 'What is it'),
        h('input', {class:'input', type:'text', placeholder:'e.g. Long tones before anything else', value:tf.name, onChange:t.setTaskName}),
      ]),
      h('div', {style:'display:flex;gap:10px;margin-bottom:10px'}, [
        h('div', {class:'field', style:'flex:1'}, [
          h('label', {}, 'What it serves'),
          h('select', {class:'input', value:tf.link, onChange:t.setTaskLink}, [
            h('option', {value:''}, 'Pick a goal or project…'),
            ...t.taskLinkOptions.map(o => h('option', {value:o.value}, o.name)),
          ]),
        ]),
        h('div', {class:'field', style:'flex:1'}, [
          h('label', {}, 'When'),
          h('select', {class:'input', value:tf.mode, onChange:t.setTaskMode}, [
            h('option', {value:'daily'}, 'Every day'),
            h('option', {value:'weekdays'}, 'Certain days'),
            h('option', {value:'date'}, 'One date'),
            h('option', {value:'range'}, 'A date range'),
          ]),
        ]),
      ]),
    ];
    if(t.taskModeWeekdays){
      formChildren.push(h('div', {class:'field', style:'margin-bottom:12px'}, [
        h('label', {}, 'Which days'),
        h('div', {style:'display:flex;gap:6px;flex-wrap:wrap;margin-top:2px'}, t.taskDayChips.map(d =>
          h('button', {onClick:d.toggle, style:`padding:7px 11px;border-radius:4px;border:1px solid ${d.border};background:${d.bg};color:${d.color};font-family:var(--font-body);font-size:12px;cursor:pointer`}, d.name)
        )),
      ]));
    }
    if(t.taskModeDate){
      formChildren.push(h('div', {class:'field', style:'margin-bottom:12px'}, [
        h('label', {}, 'Date'),
        h('input', {class:'input', type:'date', value:tf.date, onChange:t.setTaskDate}),
      ]));
    }
    if(t.taskModeRange){
      formChildren.push(h('div', {style:'display:flex;gap:10px;margin-bottom:12px'}, [
        h('div', {class:'field', style:'flex:1'}, [h('label', {}, 'From'), h('input', {class:'input', type:'date', value:tf.from, onChange:t.setTaskFrom})]),
        h('div', {class:'field', style:'flex:1'}, [h('label', {}, 'To'), h('input', {class:'input', type:'date', value:tf.to, onChange:t.setTaskTo})]),
      ]));
    }
    formChildren.push(h('div', {style:'display:flex;gap:9px'}, [
      h('button', {class:'btn btn-secondary', onClick:t.cancelTask, style:'flex:none'}, 'Cancel'),
      h('button', {class:'btn btn-primary', onClick:t.addTask, style:'flex:1'}, 'Add task'),
    ]));
    children.push(h('div', {class:'card elev-sm', style:'margin-top:14px'}, formChildren));
  } else {
    children.push(h('button', {class:'btn btn-secondary btn-block', onClick:t.openTaskForm, style:'margin-top:12px;font-size:12.5px'}, 'Add a repeating task'));
  }
  if(t.taskMsg){
    children.push(h('div', {style:'display:flex;align-items:flex-start;gap:8px;margin-top:9px;padding:9px 11px;border-left:2px solid var(--color-divider);font-size:12px;line-height:1.5'}, [
      h('span', {style:'flex:1;min-width:0'}, t.taskMsg),
      h('button', {onClick:t.clearTaskMsg, class:'btn btn-icon btn-ghost', 'aria-label':'Dismiss', style:'flex:none;width:22px;height:22px'}, [
        h('svg', {width:12, height:12, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':2, 'stroke-linecap':'round'}, [h('path', {d:'M6 6l12 12M18 6 6 18'})]),
      ]),
    ]));
  }

  children.push(h('button', {class:'btn btn-primary btn-block', onClick:t.goToLog, style:'margin-top:22px;font-size:15px;padding:12px'}, 'Log a session'));

  return h('div', {}, children);
}
