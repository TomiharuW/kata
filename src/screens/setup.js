// Setup screen — instrument list (rename/delete/add, hue swatch picker,
// rotate toggle), routine step editor per instrument, goal editor (area,
// instruments, steps), and a reset-to-defaults control. Ported 1:1 from
// reference/Kata.dc.html's `isSettings` block (lines ~1101-1262).
import { h } from '../lib/dom.js';

const chevronSec = (rotate) => h('svg', {width:11, height:11, viewBox:'0 0 24 24', fill:'none', stroke:'var(--color-accent-700)', 'stroke-width':2.6, 'stroke-linecap':'round', 'stroke-linejoin':'round', style:`flex:none;transform:${rotate}`}, [h('path', {d:'m6 9 6 6 6-6'})]);
const chevronBtn = (rotate) => h('svg', {width:12, height:12, viewBox:'0 0 24 24', fill:'none', stroke:'var(--color-accent-700)', 'stroke-width':2.4, 'stroke-linecap':'round', 'stroke-linejoin':'round', style:`transform:${rotate}`}, [h('path', {d:'m6 9 6 6 6-6'})]);
const trashIcon = () => h('svg', {width:15, height:15, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':1.8, 'stroke-linecap':'round', 'stroke-linejoin':'round'}, [
  h('path', {d:'M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7'}),
]);

function sectionHeader(label, sec){
  return h('button', {onClick:sec.toggle, style:'display:flex;align-items:center;gap:8px;width:100%;background:none;border:none;padding:0;margin:22px 0 9px;cursor:pointer;font-family:var(--font-body)'}, [
    chevronSec(sec.chevron),
    h('span', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent)'}, label),
    h('span', {style:'margin-left:auto;font-size:11px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 42%, transparent)'}, sec.count),
  ]);
}

export function render(state, store){
  const s = store.selectSetup();

  const children = [
    h('h1', {style:'font-size:26px;margin:10px 0 6px'}, 'Setup'),
    h('div', {style:'font-size:12.5px;line-height:1.6;color:color-mix(in srgb, var(--color-text) 55%, transparent)'}, 'Instruments, the routines hanging off them, and the goals they feed. Anything changed here changes everywhere — the rotation, the log, the library.'),
  ];

  // Instruments
  children.push(sectionHeader('Instruments', s.secInstruments));
  if(s.secInstruments.open){
    children.push(...s.setupInstruments.map(a => h('div', {style:'padding:11px 0;border-bottom:1px solid var(--color-divider)'}, [
      h('div', {style:'display:flex;align-items:center;gap:10px'}, [
        h('span', {style:`width:9px;height:9px;border-radius:999px;border:2px solid ${a.stroke};flex:none`}),
        h('input', {class:'input', style:'flex:1;min-width:0;font-size:13.5px;padding:7px 9px', value:a.name, onChange:a.rename}),
        a.canDelete ? h('button', {onClick:a.remove, class:'btn btn-icon btn-ghost', 'aria-label':'Remove instrument', style:'flex:none'}, [trashIcon()]) : null,
      ]),
      h('div', {style:'display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:7px;padding-left:19px'}, [
        a.canRotate ? h('button', {onClick:a.toggleRotate, style:`flex:none;padding:5px 10px;border-radius:999px;border:1px solid ${a.rotateBorder};background:${a.rotateBg};color:${a.rotateColor};font-family:var(--font-body);font-size:11px;cursor:pointer;white-space:nowrap`}, a.rotateLabel) : null,
        h('span', {style:'font-size:10.5px;line-height:1.4;color:color-mix(in srgb, var(--color-text) 45%, transparent)'}, a.usage),
      ]),
    ])));
    children.push(h('div', {style:'font-size:11px;line-height:1.55;color:color-mix(in srgb, var(--color-text) 45%, transparent);margin-top:9px'}, 'The three daily anchors and the catch-all stay put — everything else can go. Removing an instrument pulls it out of the rotation, its routine, and the goals that named it. Logged sessions are kept.'));
    children.push(h('button', {onClick:s.openInstForm, style:'background:none;border:none;padding:8px 0 0;font-family:var(--font-body);font-size:11.5px;color:var(--color-accent-700);cursor:pointer;text-decoration:underline;text-underline-offset:3px'}, '＋ new instrument'));
    if(s.instFormOpen){
      const f = s.instForm;
      children.push(h('div', {style:'margin-top:9px;padding:13px;border:1px solid var(--color-divider);border-radius:var(--radius-sm)'}, [
        h('div', {class:'field', style:'margin-bottom:11px'}, [h('label', {}, 'Name'), h('input', {class:'input', placeholder:'e.g. Koto', value:f.name, onChange:s.setInstName})]),
        h('div', {style:'font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-bottom:7px'}, 'Colour'),
        h('div', {style:'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px'}, s.hueSwatches.map(hw =>
          h('button', {onClick:hw.select, 'aria-label':'Choose colour', style:`width:28px;height:28px;border-radius:999px;border:1.5px solid ${hw.ring};background:none;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center`}, [
            h('span', {style:`width:16px;height:16px;border-radius:999px;background:${hw.fill};display:block`}),
          ])
        )),
        h('button', {onClick:s.toggleInstRotate, style:`padding:7px 12px;border-radius:999px;border:1px solid ${s.instFormRotateBorder};background:${s.instFormRotateBg};color:${s.instFormRotateColor};font-family:var(--font-body);font-size:11.5px;cursor:pointer`}, s.instFormRotateLabel),
        h('button', {class:'btn btn-primary btn-block', onClick:s.addInstrument, style:'margin-top:13px'}, 'Add instrument'),
      ]));
    }
  }

  // Routines
  children.push(sectionHeader('Routines', s.secRoutines));
  if(s.secRoutines.open){
    children.push(h('div', {style:'font-size:12.5px;line-height:1.6;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-bottom:10px'}, 'A routine is the run of steps you tick while logging that instrument. Pick one, then add or drop steps — the log and the library follow.'));
    children.push(h('div', {style:'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:13px'}, s.setupInstChips.map(c =>
      h('button', {onClick:c.select, style:`padding:7px 11px;border-radius:var(--radius-sm);border:1px solid ${c.border};background:${c.bg};color:${c.color};font-family:var(--font-body);font-size:12px;cursor:pointer;white-space:nowrap`}, [
        c.name + ' ', h('span', {style:'font-variant-numeric:tabular-nums;opacity:0.6'}, c.count),
      ])
    )));
    if(s.setupStepsEmpty){
      children.push(h('div', {style:'font-size:12.5px;line-height:1.55;color:color-mix(in srgb, var(--color-text) 48%, transparent)'}, `${s.setupInstName} has no routine yet. Add a first step and it appears in the log the next time you pick it.`));
    }
    children.push(...s.setupSteps.map(ph => h('div', {style:'margin-bottom:14px'}, [
      h('div', {style:'font-family:var(--font-heading);font-size:11.5px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 62%, transparent);padding-bottom:5px;border-bottom:1px solid var(--color-divider)'}, ph.phase),
      ...ph.steps.map(st => h('div', {style:'display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--color-divider)'}, [
        h('div', {style:'flex:1;min-width:0'}, [
          h('div', {style:'font-size:13.5px;line-height:1.35'}, st.label),
          h('div', {style:'font-size:10.5px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 45%, transparent);margin-top:2px'}, st.meta),
        ]),
        h('button', {onClick:st.remove, class:'btn btn-icon btn-ghost', 'aria-label':'Remove step', style:'flex:none'}, [trashIcon()]),
      ])),
    ])));
    children.push(h('button', {onClick:s.openStepForm, style:'background:none;border:none;padding:8px 0 0;font-family:var(--font-body);font-size:11.5px;color:var(--color-accent-700);cursor:pointer;text-decoration:underline;text-underline-offset:3px'}, '＋ new step'));
    if(s.stepFormOpen){
      const f = s.stepForm;
      children.push(h('div', {style:'margin-top:9px;padding:13px;border:1px solid var(--color-divider);border-radius:var(--radius-sm)'}, [
        h('div', {style:'display:flex;gap:9px;margin-bottom:10px'}, [
          h('div', {class:'field', style:'flex:1'}, [
            h('label', {}, 'Phase'),
            h('select', {class:'input', value:f.phase, onChange:s.setStepPhase}, s.phaseOptions.map(p => h('option', {value:p}, p))),
          ]),
          h('div', {class:'field', style:'flex:none;width:96px'}, [h('label', {}, 'Minutes'), h('input', {class:'input', placeholder:'5–8', value:f.mins, onChange:s.setStepMins})]),
        ]),
        h('div', {class:'field', style:'margin-bottom:10px'}, [h('label', {}, 'Step'), h('input', {class:'input', placeholder:'What you do', value:f.label, onChange:s.setStepLabel})]),
        h('div', {class:'field', style:'margin-bottom:12px'}, [h('label', {}, 'Cues — one per line'), h('textarea', {class:'input', rows:3, placeholder:'The reminders you want in front of you', value:f.cues, onChange:s.setStepCues})]),
        h('button', {class:'btn btn-primary btn-block', onClick:s.addRoutineStep}, `Add to ${s.setupInstName}`),
      ]));
    }
  }

  // Goals
  children.push(sectionHeader('Goals', s.secGoals));
  if(s.secGoals.open){
    children.push(...s.setupGoals.map(g => h('div', {style:'padding:11px 0;border-bottom:1px solid var(--color-divider)'}, [
      h('div', {style:'display:flex;align-items:center;gap:10px'}, [
        h('span', {style:`width:9px;height:9px;border-radius:999px;border:2px solid ${g.stroke};flex:none`}),
        h('input', {class:'input', style:'flex:1;min-width:0;font-size:13.5px;padding:7px 9px', value:g.name, onChange:g.rename}),
        h('span', {style:'flex:none;font-size:11px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 45%, transparent)'}, g.progressLabel),
        h('button', {onClick:g.toggle, 'aria-label':'Edit goal', style:'flex:none;background:none;border:none;padding:6px;cursor:pointer;display:flex;align-items:center'}, [chevronBtn(g.chevron)]),
      ]),
      h('div', {style:'font-size:10.5px;line-height:1.4;color:color-mix(in srgb, var(--color-text) 45%, transparent);margin:5px 0 0 19px'}, `${g.area} · ${g.instLabel}`),
      g.open ? h('div', {style:'padding:11px 0 2px 19px'}, [
        h('div', {class:'field', style:'margin-bottom:11px'}, [
          h('label', {}, 'Area'),
          h('select', {class:'input', value:g.area, onChange:g.setArea}, s.areaOptions.map(a => h('option', {value:a}, a))),
        ]),
        h('div', {style:'font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-bottom:7px'}, 'Instruments it rides on'),
        h('div', {style:'display:flex;gap:5px;flex-wrap:wrap;margin-bottom:13px'}, g.actChips.map(c =>
          h('button', {onClick:c.toggle, style:`padding:5px 10px;border-radius:999px;border:1px solid ${c.border};background:${c.bg};color:${c.color};font-family:var(--font-body);font-size:11px;cursor:pointer;white-space:nowrap`}, c.name)
        )),
        h('div', {style:'font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-bottom:5px'}, 'Steps'),
        g.noSteps ? h('div', {style:'font-size:12px;color:color-mix(in srgb, var(--color-text) 48%, transparent);padding-bottom:6px'}, 'No steps yet.') : null,
        ...g.steps.map(st => h('div', {style:'display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid var(--color-divider)'}, [
          h('div', {style:'flex:1;min-width:0;font-size:12.5px;line-height:1.4'}, st.label),
          h('span', {style:'flex:none;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 42%, transparent)'}, st.statusLabel),
          h('button', {onClick:st.remove, class:'btn btn-icon btn-ghost', 'aria-label':'Remove step', style:'flex:none'}, [trashIcon()]),
        ])),
        h('div', {style:'display:flex;gap:8px;margin-top:11px'}, [
          h('input', {class:'input', style:'flex:1;min-width:0;font-size:12.5px;padding:7px 9px', placeholder:'Add a step', value:g.newStep, onChange:g.setNewStep}),
          h('button', {onClick:g.addStep, class:'btn btn-secondary', style:'flex:none;font-size:12px;padding:7px 12px'}, 'Add'),
        ]),
        h('div', {style:'display:flex;gap:8px;flex-wrap:wrap;margin-top:13px'}, [
          h('button', {onClick:g.toggleArchive, style:'background:none;border:1px solid var(--color-accent);color:var(--color-accent-700);border-radius:4px;padding:7px 11px;font-family:var(--font-body);font-size:11.5px;cursor:pointer'}, g.archiveLabel),
          h('button', {onClick:g.remove, style:'background:none;border:1px solid var(--color-divider);color:var(--color-accent-700);border-radius:4px;padding:7px 11px;font-family:var(--font-body);font-size:11.5px;cursor:pointer'}, 'Delete this goal'),
        ]),
      ]) : null,
    ])));
    children.push(h('button', {onClick:s.newGoalFromSetup, style:'background:none;border:none;padding:8px 0 0;font-family:var(--font-body);font-size:11.5px;color:var(--color-accent-700);cursor:pointer;text-decoration:underline;text-underline-offset:3px'}, '＋ new goal'));
  }

  // Backup & restore — a full snapshot of everything persisted (sessions,
  // goals, tasks, instruments, licks, study queue, routine — not just the
  // practice log the Log screen's Export .json covers), since data lives only
  // on this device.
  const fileInput = h('input', {
    type: 'file', accept: 'application/json,.json', style: 'display:none',
    onChange: async e => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if(file) await s.importBackup(file);
    },
  });
  children.push(h('div', {style:'margin:26px 0 0;padding-top:14px;border-top:1px solid var(--color-divider)'}, [
    h('div', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-bottom:8px'}, 'Backup & restore'),
    h('div', {style:'font-size:12px;line-height:1.55;color:color-mix(in srgb, var(--color-text) 50%, transparent);margin-bottom:11px'}, 'Everything lives only on this device. Download a full backup now and then, and keep the file somewhere off the phone — a restore replaces sessions, goals, tasks, instruments and the study queue with what’s in the file.'),
    h('div', {style:'display:flex;gap:9px'}, [
      h('button', {class:'btn btn-secondary', style:'flex:1', onClick:s.exportBackup}, 'Download full backup'),
      h('button', {class:'btn btn-secondary', style:'flex:1', onClick:()=>fileInput.click()}, 'Restore from backup…'),
    ]),
    fileInput,
    s.backupMsg ? h('div', {style:'display:flex;align-items:flex-start;gap:8px;margin-top:10px;padding:10px 12px;background:var(--color-accent-100);border-left:2px solid var(--color-accent);font-size:12px;line-height:1.5;color:var(--color-accent-800)'}, [
      h('span', {style:'flex:1;min-width:0'}, s.backupMsg),
      h('button', {onClick:s.clearBackupMsg, class:'btn btn-icon btn-ghost', 'aria-label':'Dismiss', style:'flex:none;width:24px;height:24px'}, [
        h('svg', {width:13, height:13, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':2, 'stroke-linecap':'round'}, [h('path', {d:'M6 6l12 12M18 6 6 18'})]),
      ]),
    ]) : null,
  ]));

  // Reset
  const resetChildren = [];
  if(s.resetIdle){
    resetChildren.push(h('button', {onClick:s.armReset, style:'background:none;border:none;padding:0;font-family:var(--font-body);font-size:11.5px;color:color-mix(in srgb, var(--color-text) 45%, transparent);cursor:pointer;text-decoration:underline;text-underline-offset:3px'}, 'Reset instruments, routines and goals to the original setup'));
  }
  if(s.resetArmed){
    resetChildren.push(h('div', {style:'font-size:12.5px;line-height:1.55;color:var(--color-accent-800);margin-bottom:10px'}, 'This puts the instruments, routines and goals back as they started. Sessions, ticks and licks are kept.'));
    resetChildren.push(h('div', {style:'display:flex;gap:9px'}, [
      h('button', {class:'btn btn-secondary', onClick:s.cancelReset, style:'flex:1'}, 'Keep mine'),
      h('button', {class:'btn btn-primary', onClick:s.doReset, style:'flex:1'}, 'Reset'),
    ]));
  }
  children.push(h('div', {style:'margin:26px 0 0;padding-top:14px;border-top:1px solid var(--color-divider)'}, resetChildren));

  return h('div', {}, children);
}
