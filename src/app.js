// Entry point. Sets up the persistent header (enso mark + "Kata" + today's
// date) and bottom tab bar (7 tabs, exact SVG icons from
// reference/Kata.dc.html's nav buttons, lines ~1265-1294), subscribes to the
// store and re-renders the active screen's content into a container on every
// change (a full re-render per state change — the same thing the original
// React prototype effectively does), and registers the service worker.
import { h, mount } from './lib/dom.js';
import { store } from './state/store.js';
import * as today from './screens/today.js';
import * as log from './screens/log.js';
import * as routine from './screens/routine.js';
import * as goals from './screens/goals.js';
import * as study from './screens/study.js';
import * as library from './screens/library.js';
import * as setup from './screens/setup.js';
import * as strength from './screens/strength.js';

const SCREENS = {
  today, log, routine, strength, goals, study, library,
  settings: setup, // the source's tab id for the Setup screen is 'settings'
};

function ensoMark(){
  return h('svg', {width:22, height:22, viewBox:'0 0 32 32', style:'flex:none'}, [
    h('circle', {cx:16, cy:16, r:11, fill:'none', stroke:'var(--color-accent)', 'stroke-width':2, 'stroke-linecap':'round', 'stroke-dasharray':'60 9', transform:'rotate(-95 16 16)'}),
  ]);
}

const NAV_ICONS = {
  today: 'M4 11.5 12 4l8 7.5|M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9',
};

function navIcon(paths){
  return h('svg', {width:19, height:19, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':1.7, 'stroke-linecap':'round', 'stroke-linejoin':'round'},
    paths.map(d => h('path', {d})));
}

function navIconExtra(shapes){
  return h('svg', {width:19, height:19, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':1.7, 'stroke-linecap':'round', 'stroke-linejoin':'round'}, shapes);
}

function header(nav){
  return h('div', {style:'display:flex;align-items:center;gap:10px;padding:20px 20px 6px'}, [
    ensoMark(),
    h('div', {style:'font-family:var(--font-heading);font-weight:600;font-size:19px;letter-spacing:0.01em'}, 'Kata'),
    h('div', {style:'margin-left:auto;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 50%, transparent)'}, nav.todayLabel),
  ]);
}

function tabBar(nav){
  const items = [
    {id:'today', label:'Today', icon: navIcon(['M4 11.5 12 4l8 7.5', 'M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9'])},
    {id:'log', label:'Log', icon: navIcon(['M6 4h12v16l-6-3-6 3z'])},
    {id:'routine', label:'Routine', icon: navIconExtra([
      h('rect', {x:4, y:5, width:16, height:15, rx:2}),
      h('path', {d:'M4 10h16M8 3v4M16 3v4'}),
    ])},
    {id:'strength', label:'Strength', icon: navIconExtra([
      h('path', {d:'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11'}),
    ])},
    {id:'goals', label:'Goals', icon: navIconExtra([
      h('circle', {cx:12, cy:12, r:8}),
      h('circle', {cx:12, cy:12, r:3.5}),
    ])},
    {id:'study', label:'Study', icon: navIcon(['M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4V5.5z', 'M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6V5.5z'])},
    {id:'library', label:'Library', icon: navIcon(['M5 4h9a2 2 0 0 1 2 2v14l-6.5-3L5 20V4z'])},
    {id:'settings', label:'Setup', icon: navIconExtra([
      h('path', {d:'M5 8h8M17 8h2M5 16h2M11 16h8'}),
      h('circle', {cx:15, cy:8, r:2}),
      h('circle', {cx:9, cy:16, r:2}),
    ])},
  ];
  // z-index 30 keeps the bar above page content but below the goal-check
  // bottom sheet (backdrop 40 / sheet 41).
  return h('div', {class:'kata-tabbar', style:'position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:var(--color-bg);border-top:1px solid var(--color-divider);display:flex;padding:8px 2px 12px;z-index:30'},
    items.map(it => h('button', {onClick:nav.nav[it.id].select, style:`flex:1;background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 1px;color:${nav.nav[it.id].color};cursor:pointer`}, [
      it.icon,
      h('span', {style:'font-size:9.5px;font-family:var(--font-body)'}, it.label),
    ])));
}

function renderApp(){
  const state = store.getState();
  const nav = store.selectNav();
  const screen = SCREENS[state.tab] || SCREENS.today;

  const content = h('div', {style:'flex:1;padding:6px 20px 112px'}, [screen.render(state, store)]);

  const root = h('div', {style:'max-width:480px;margin:0 auto;min-height:100vh;background:var(--color-bg);position:relative;border-left:1px solid var(--color-divider);border-right:1px solid var(--color-divider);display:flex;flex-direction:column'}, [
    header(nav),
    content,
    tabBar(nav),
  ]);

  mount(document.getElementById('app'), root);
}

store.init();
store.subscribe(renderApp);
renderApp();

if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
