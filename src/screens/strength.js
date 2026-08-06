// Strength 鍛錬 — the workout screen.
//
// The other Ways are logged as "45 minutes of shakuhachi"; lifting is not like
// that. It needs the set in front of you, the number you hit last time, and
// somewhere to write what you actually did. So this screen carries the sets
// themselves — weight and reps per set, ticked as you go — and only turns into
// a session when you finish.
//
// Weight and reps are free text on purpose: bands, bodyweight and "per side"
// are not kilograms, and the app should not pretend otherwise.
import { h } from '../lib/dom.js';

const chevronDown = (rotate) => h('svg', {width:12, height:12, viewBox:'0 0 24 24', fill:'none', stroke:'var(--color-accent-700)', 'stroke-width':2.4, 'stroke-linecap':'round', 'stroke-linejoin':'round', style:`transform:${rotate}`}, [
  h('path', {d:'m6 9 6 6 6-6'}),
]);

function setRow(s){
  return h('div', {style:'display:flex;align-items:center;gap:7px;padding:5px 0'}, [
    h('span', {style:'flex:none;width:16px;font-size:10.5px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 42%, transparent)'}, s.n),
    h('input', {class:'input', style:'flex:1;min-width:0;font-size:12.5px;padding:6px 8px;text-align:center', placeholder:'weight', value:s.w, onInput:s.setW}),
    h('span', {style:'flex:none;font-size:11px;color:color-mix(in srgb, var(--color-text) 38%, transparent)'}, '×'),
    h('input', {class:'input', style:'flex:1;min-width:0;font-size:12.5px;padding:6px 8px;text-align:center', placeholder:'reps', value:s.r, onInput:s.setR}),
    h('button', {onClick:s.toggle, 'aria-label':'Set done', style:'flex:none;background:none;border:none;padding:0 2px;cursor:pointer;line-height:0'}, [
      h('svg', {width:22, height:22, viewBox:'0 0 20 20'}, [
        h('rect', {x:2, y:2, width:16, height:16, rx:3,
          fill: s.done ? 'var(--color-accent)' : 'transparent',
          stroke: s.done ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-text) 30%, transparent)',
          'stroke-width':1.5}),
        s.done ? h('path', {d:'m6 10.5 2.6 2.6L14.5 7', fill:'none', stroke:'var(--color-bg)', 'stroke-width':2, 'stroke-linecap':'round', 'stroke-linejoin':'round'}) : null,
      ]),
    ]),
  ]);
}

function exerciseCard(e){
  const kids = [
    h('div', {style:'display:flex;align-items:baseline;gap:9px'}, [
      h('div', {style:'flex:1;min-width:0'}, [
        h('div', {style:`font-family:var(--font-heading);font-weight:600;font-size:15px;line-height:1.3;color:${e.complete ? 'color-mix(in srgb, var(--color-text) 45%, transparent)' : 'var(--color-text)'}`}, e.label),
        h('div', {style:'font-size:11px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 50%, transparent);margin-top:2px'}, e.target),
      ]),
      h('div', {style:`flex:none;font-size:11px;font-variant-numeric:tabular-nums;color:${e.complete ? 'var(--color-accent-700)' : 'color-mix(in srgb, var(--color-text) 45%, transparent)'}`}, `${e.doneCount}/${e.total}`),
    ]),
    // What you did last time, so there is a number to beat.
    h('div', {style:'font-size:10.5px;line-height:1.45;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 45%, transparent);margin-top:5px'}, e.lastLabel),
    h('div', {style:'margin-top:8px;padding-top:6px;border-top:1px solid var(--color-divider)'}, e.sets.map(setRow)),
    h('div', {style:'display:flex;gap:12px;margin-top:4px'}, [
      h('button', {onClick:e.addSet, style:'background:none;border:none;padding:2px 0;font-family:var(--font-body);font-size:11px;color:var(--color-accent-700);cursor:pointer;text-decoration:underline;text-underline-offset:3px'}, '＋ set'),
      e.total > 1 ? h('button', {onClick:e.removeSet, style:'background:none;border:none;padding:2px 0;font-family:var(--font-body);font-size:11px;color:color-mix(in srgb, var(--color-text) 45%, transparent);cursor:pointer;text-decoration:underline;text-underline-offset:3px'}, '− set') : null,
    ]),
  ];
  if(e.hasCues){
    kids.push(h('button', {onClick:e.toggleCues, style:'background:none;border:none;padding:0;margin-top:8px;cursor:pointer;display:flex;align-items:center;gap:5px;font-size:11px;color:var(--color-accent-700);font-family:var(--font-body)'}, [
      chevronDown(e.open ? 'rotate(180deg)' : 'rotate(0deg)'),
      'Notes',
    ]));
    if(e.open){
      kids.push(h('div', {style:'display:flex;flex-direction:column;gap:4px;margin-top:6px;padding-left:17px'}, e.cues.map(c =>
        h('div', {style:'display:flex;gap:8px;font-size:12px;line-height:1.5;color:color-mix(in srgb, var(--color-text) 75%, transparent)'}, [
          h('span', {style:'flex:none;color:var(--color-accent)'}, '—'),
          h('span', {style:'flex:1;min-width:0;text-wrap:pretty'}, c.text),
        ])
      )));
    }
  }
  return h('div', {class:'card', style:`margin-bottom:11px;border-left:3px solid ${e.complete ? 'var(--color-accent)' : 'var(--color-divider)'}`}, kids);
}

export function render(state, store){
  const s = store.selectStrength();

  const children = [
    h('div', {style:'display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin:10px 0 4px'}, [
      h('h1', {style:'font-size:26px;margin:0'}, s.name),
      h('span', {style:`font-family:var(--font-heading);font-size:21px;line-height:1;color:${s.stroke};opacity:0.8`}, s.jp),
    ]),

    // Which workout is up, and stepping through the rotation.
    h('div', {style:'display:flex;align-items:center;gap:9px;margin:14px 0 9px'}, [
      h('button', {onClick:s.prev, 'aria-label':'Previous workout', style:'flex:none;background:none;border:1px solid var(--color-divider);border-radius:4px;padding:6px 11px;cursor:pointer;color:var(--color-accent-700);font-family:var(--font-body);font-size:13px'}, '‹'),
      h('div', {style:'flex:1;min-width:0;text-align:center'}, [
        h('div', {style:'font-family:var(--font-heading);font-weight:600;font-size:19px;line-height:1.2'}, s.workout),
        h('div', {style:'font-size:11px;color:color-mix(in srgb, var(--color-text) 52%, transparent);margin-top:3px'}, s.focus),
      ]),
      h('button', {onClick:s.next, 'aria-label':'Next workout', style:'flex:none;background:none;border:1px solid var(--color-divider);border-radius:4px;padding:6px 11px;cursor:pointer;color:var(--color-accent-700);font-family:var(--font-body);font-size:13px'}, '›'),
    ]),

    h('div', {style:'display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px'}, s.chips.map(c =>
      h('button', {onClick:c.select, style:`padding:5px 10px;border-radius:999px;border:1px solid ${c.on?'var(--color-accent)':'var(--color-divider)'};background:${c.on?'var(--color-accent-100)':'transparent'};color:${c.on?'var(--color-accent-800)':'color-mix(in srgb, var(--color-text) 50%, transparent)'};font-family:var(--font-body);font-size:11px;cursor:pointer;white-space:nowrap`}, c.name)
    )),

    h('div', {style:'display:flex;align-items:baseline;gap:8px;margin-bottom:5px'}, [
      h('div', {style:'font-size:11px;letter-spacing:0.09em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent)'}, 'This session'),
      h('div', {style:'margin-left:auto;font-size:11px;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--color-text) 45%, transparent)'}, s.doneLabel),
    ]),
    h('div', {style:'height:3px;background:var(--color-divider);margin-bottom:14px'}, [
      h('div', {style:`height:3px;width:${s.pct};background:var(--color-accent)`}),
    ]),
  ];

  if(!s.hasExercises){
    children.push(h('div', {style:'font-size:12.5px;line-height:1.6;color:color-mix(in srgb, var(--color-text) 48%, transparent)'},
      'No exercises for this workout yet. Setup → Routines → “Load the built-in routines” brings in the programme, or add your own steps under Strength.'));
    return h('div', {}, children);
  }

  children.push(...s.exercises.map(exerciseCard));

  children.push(h('div', {style:'display:flex;gap:10px;align-items:flex-end;margin-top:16px'}, [
    h('div', {class:'field', style:'flex:none;width:110px'}, [
      h('label', {}, 'Minutes'),
      h('input', {class:'input', type:'number', min:1, placeholder:'45', value:s.minutes, onInput:s.setMinutes}),
    ]),
    h('button', {class:'btn btn-primary', style:'flex:1', onClick:s.finish}, 'Finish workout'),
  ]));

  if(s.finishMsg){
    children.push(h('div', {style:'display:flex;align-items:flex-start;gap:8px;margin-top:11px;padding:10px 12px;border-left:2px solid var(--color-accent);background:var(--color-accent-100);font-size:12.5px;line-height:1.5;color:var(--color-accent-800)'}, [
      h('span', {style:'flex:1;min-width:0'}, s.finishMsg),
      h('button', {onClick:s.clearFinishMsg, class:'btn btn-icon btn-ghost', 'aria-label':'Dismiss', style:'flex:none;width:22px;height:22px'}, [
        h('svg', {width:12, height:12, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':2, 'stroke-linecap':'round'}, [h('path', {d:'M6 6l12 12M18 6 6 18'})]),
      ]),
    ]));
  }

  children.push(h('div', {style:'font-size:10.5px;line-height:1.5;color:color-mix(in srgb, var(--color-text) 45%, transparent);margin-top:10px'},
    'Finishing logs a session against Strength and moves the rotation on to the next workout.'));

  return h('div', {}, children);
}
