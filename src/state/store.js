// Plain-JS store: pub/sub (subscribe/getState) + a private setState that merges,
// notifies and persists. Ports the ENTIRE `state = {...}` shape and every method on
// `class Component extends DCLogic` from reference/Kata.dc.html, faithfully — same
// field names, same algorithms, same localStorage persistence key (kata_state_v2).
//
// renderVals() in the source built one big per-render view-model object. Here it is
// split into per-screen selector methods (selectToday, selectLog, selectRoutine,
// selectGoals, selectStudy, selectLibrary, selectSetup, selectNav) that each screen
// module calls — but the computed VALUES and their exact semantics (labels, color
// logic, sort orders, filters) match the source exactly.

import {
  ACT_DEFS, HUE_SWATCHES, colorFor, applyInstruments, actOf, abbrOf, clone, AREAS,
  ACT_BY_ID, ACTIVITIES, ROTATION_POOL,
  TIME_CHUNKS, QUOTES, Q_BY_ID, SEKKI, NOTABLE,
  STUDY_STATUS, STUDY_PRIORITY, STUDY_CATEGORY, STUDY_COLS, SEED_STUDY,
  SHAKU_PHASES, SHAKU_ROUTINE, phasesFor, STRENGTH_WORKOUTS, seedRoutineSteps, LICK_SOURCES, seedLicks,
  DEFAULT_TASKS, GOALS, SEED_GOALS, applyGoals,
  PROJECTS, SEED_PROJECTS, applyProjects, SEED_DONE_DATES,
  DAYS, DEFAULT_ROTATION, DEFAULT_BLOCKS, DEFAULT_STRENGTH_DAYS, DEFAULT_LESSONS, DEFAULT_BANDS, DEFAULT_PINS,
  toKey, labelFor, mondayOf, scaleOfDay,
  STEP_STYLE, NEXT_STATUS,
} from '../data/index.js';

// Stand-ins for the authoring runtime's `data-props` (the original had an editor
// panel for these; here they're just fixed defaults matching that panel's own
// defaults).
const PROPS = {
  startTab: 'today',
  showQuote: true,
  showScale: true,
  routineInLog: true,
  routineOpenCues: false,
  peekScope: 'today',
  peekHideDone: false,
  studySheetUrl: 'https://docs.google.com/spreadsheets/d/1k0XG6jdzVZ1Fq1lPo-YR8TGBmyiovZhMailEoSUUxxo/edit?gid=1158544230#gid=1158544230',
  studyFormUrl: 'https://forms.gle/JKjyZFsuhfox46Y26',
  sheetTab: 'Study Queue',
};

const MUTED = 'color-mix(in srgb, var(--color-text) 60%, transparent)';
const STORAGE_KEY = 'kata_state_v2';

// 'HH:MM' for the moment the form is opened — sessions default to now.
const nowTime = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
};
const blankForm = (activity) => ({
  date: toKey(new Date()), time: nowTime(), activity: activity||'piano', minutes: '',
  whatWorked: '', whereStuck: '', projectIds: [], goalStepIds: [], steps: [], licks: [],
});

// Every field persisted to localStorage — kept as one list so persist(), the
// full-backup export, and import all agree on what "everything" means.
const BACKUP_FIELDS = [
  'sessions', 'checklist', 'mode', 'activeProjectId', 'stepStatus', 'routine',
  'stepDates', 'userGoals', 'tasks', 'taskDone', 'extraToday', 'jpStudied',
  'study', 'sheetUrl', 'sheetPushUrl', 'syncAt', 'pendingPush', 'licks',
  'instruments', 'goals', 'projects', 'routineSteps',
  // Migration marker — must persist, or purgeLegacySeed() would re-run on every
  // load and keep resetting progress on the seeded goals.
  'stepDaily', 'strengthWorkout', 'strengthSets',
  'calendarId', 'calendarView',
  '_seedPurged', '_quickConverted', '_tasksLinked',
];

class Store {
  constructor(){
    this.state = {
      // version field for future migrations — the key name stays kata_state_v2.
      _schemaVersion: 1,
      _seedPurged: false,
      _quickConverted: false,
      _tasksLinked: false,
      tab: 'today',
      mode: 'default',
      projects: clone(SEED_PROJECTS),
      activeProjectId: (SEED_PROJECTS[0] && SEED_PROJECTS[0].id) || '',
      projectForm: {open:false, name:'', blurb:'', goalId:'', activities:[], steps:'', until:'', sprint:false},
      sessions: [],
      checklist: {},
      stepStatus: {},
      stepDates: {},
      userGoals: [],
      openLibGoals: {},
      goalForm: {open:false, name:'', area:'Music', activities:[], steps:''},
      tasks: DEFAULT_TASKS,
      taskDone: {},
      taskForm: {open:false, name:'', link:'', mode:'daily', days:[], date:'', from:'', to:''},
      extraToday: {},
      jpStudied: {},
      settingsOpen: false,
      routineView: 'grid',
      instruments: clone(ACT_DEFS),
      goals: clone(SEED_GOALS),
      routineSteps: seedRoutineSteps(),
      setupOpen: {inst:true, routines:false, goals:false},
      setupInst: 'shaku',
      instForm: {open:false, name:'', jp:'', jpR:'', hue:75, rotate:true, anchor:false},
      stepForm: {open:false, phase:'Warm up', label:'', mins:'5', cues:''},
      goalOpen: {},
      newStep: {},
      resetArmed: false,
      wipeArmed: false,
      libQuery: '',
      study: SEED_STUDY,
      studyForm: {open:false, title:'', link:'', why:'', creator:'', category:'Video Game', priority:'Medium', inst:'piano', goalId:'', status:'Inbox'},
      goalPeekOpen: false,
      studyEmbed: true,
      studyQuery: '',
      studyStatus: 'all',
      studyGoal: 'all',
      sheetUrl: '',
      sheetPushUrl: '',
      syncMsg: '',
      syncAt: '',
      syncBusy: false,
      pendingPush: [],
      libOpen: {},
      goalSort: 'default',
      tick: 0,
      // Three instrument slots: Herseth's 45-on/15-off, four blocks deep —
      // ear 15, then three 45s, which is four hours on the clock. Saturday keeps
      // a one-slot override because the band takes that morning whole; Sunday is
      // back on the default now that taiko claims its slot as a fixture rather
      // than by squeezing the day. Every day's count is editable in Rotation
      // settings — that is where the week's load actually gets tuned.
      routine: {variant:'current', rotation: DEFAULT_ROTATION, blocks: DEFAULT_BLOCKS, strengthDays: DEFAULT_STRENGTH_DAYS, rotationSize: 3, slotsByDay: {sat:1}, lessons: clone(DEFAULT_LESSONS), bands: clone(DEFAULT_BANDS), pins: clone(DEFAULT_PINS)},
      sort: 'newest',
      filterActivity: 'all',
      stuckOpen: {},
      openProjects: {},
      coverageBasis: 'week',
      area: 'All',
      goalProjectFilter: 'all',
      libraryAct: 'shaku',
      licks: seedLicks(),
      lickForm: {open:false, name:'', source:'Honkyoku', notation:'', note:''},
      openCue: {},
      form: blankForm('piano'),
      backupMsg: '',
      logMsg: '', logMsgOk: false,
      taskMsg: '',
      routineMsg: '',
      todayProjectEdit: false,
      stepDaily: {},
      strengthWorkout: STRENGTH_WORKOUTS[0].name,
      strengthSets: {},
      strengthMinutes: '',
      calendarId: '',
      calendarView: 'AGENDA',
    };
    this.listeners = new Set();
  }

  subscribe(fn){ this.listeners.add(fn); return () => this.listeners.delete(fn); }
  getState(){ return this.state; }
  setState(patch){
    this.state = Object.assign({}, this.state, patch);
    this.listeners.forEach(fn => fn(this.state));
  }
  // Update state WITHOUT re-rendering. Text fields must use this: the screen is
  // rebuilt wholesale on every notify, so committing a keystroke would destroy
  // the button you are about to tap — a tap needs press and release on the same
  // element, so the click was being swallowed and logging did nothing.
  setStateQuiet(patch){
    this.state = Object.assign({}, this.state, patch);
  }
  setFormQuiet(patch){
    this.setStateQuiet({form: Object.assign({}, this.state.form, patch)});
  }

  // Installs made before the fresh-slate change carry the old demo dataset in
  // localStorage — 8 weeks of generated sessions, five demo projects, and goal
  // steps pre-marked done. New code never re-seeds those, but it also never
  // removed what was already stored, so they persisted. This strips them once,
  // leaving anything genuinely logged since then untouched.
  purgeLegacySeed(s){
    const LEGACY_PROJECT_IDS = ['p1','p2','p3','p4','p5'];
    const LEGACY_LICK_IDS = ['lk1','lk2','lk3','lk4'];
    let touched = false;

    const sessions = (s.sessions||[]).filter(x => !String(x.id||'').startsWith('seed-'));
    if(sessions.length !== (s.sessions||[]).length) touched = true;

    const projects = (s.projects||[]).filter(p => LEGACY_PROJECT_IDS.indexOf(p.id) < 0);
    if(projects.length !== (s.projects||[]).length) touched = true;

    // Seeded goals shipped with `d:'done'`/`'progress'` baked into their steps.
    // Reset those to 'todo'; goals the user created (user:true) are left alone.
    const goals = (s.goals||[]).map(g => {
      if(g.user) return g;
      const steps = (g.steps||[]).map(st => (st.d && st.d !== 'todo') ? (touched = true, Object.assign({}, st, {d:'todo'})) : st);
      return Object.assign({}, g, {steps});
    });

    const licks = (s.licks||[]).map(l => {
      if(LEGACY_LICK_IDS.indexOf(l.id) < 0 || !(l.plays||[]).length) return l;
      touched = true;
      return Object.assign({}, l, {plays: []});
    });

    // Completion stamps for steps that no longer exist anywhere.
    const liveStepIds = new Set(
      goals.concat(projects).reduce((a,x)=>a.concat((x.steps||[]).map(st=>st.id)), [])
    );
    const prune = obj => {
      const out = {};
      Object.keys(obj||{}).forEach(k => { if(liveStepIds.has(k)) out[k] = obj[k]; });
      if(Object.keys(out).length !== Object.keys(obj||{}).length) touched = true;
      return out;
    };
    const stepStatus = prune(s.stepStatus);
    const stepDates = prune(s.stepDates);

    return {changed: touched, patch: {sessions, projects, goals, licks, stepStatus, stepDates}};
  }

  init(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        let s = JSON.parse(raw);
        // Sessions previously fabricated by tapping a week strip carried planned
        // minutes as if practised. Convert them to plain ticks so the hours
        // figures reflect only what was actually entered.
        if(!s._quickConverted){
          const checklist = Object.assign({}, s.checklist||{});
          let converted = 0;
          (s.sessions||[]).forEach(x=>{
            if(!x.quick) return;
            const day = Object.assign({}, checklist[x.date]||{});
            day[x.activity] = true;
            checklist[x.date] = day;
            converted++;
          });
          s = Object.assign({}, s, {
            sessions: (s.sessions||[]).filter(x=>!x.quick),
            checklist, _quickConverted: true,
          });
          if(converted) try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }catch(e){}
        }
        // Repeating tasks must serve a goal or a project. Instrument-only ones
        // were a parallel habit list wired to nothing — drop them.
        if(!s._tasksLinked){
          const kept = (s.tasks||[]).filter(t=>t.projectId || t.goalId);
          s = Object.assign({}, s, {tasks: kept, _tasksLinked: true});
          try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }catch(e){}
        }
        if(!s._seedPurged){
          const {patch} = this.purgeLegacySeed(s);
          s = Object.assign({}, s, patch, {_seedPurged: true});
          try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }catch(e){}
        }
        const instruments = (s.instruments && s.instruments.length) ? s.instruments : clone(ACT_DEFS);
        const goals = (s.goals && s.goals.length) ? s.goals : clone(SEED_GOALS).concat(s.userGoals||[]);
        // Projects may legitimately be an empty list (fresh slate), so honour a
        // stored [] rather than falling back to the seed the way goals do.
        const projects = Array.isArray(s.projects) ? s.projects : clone(SEED_PROJECTS);
        applyInstruments(instruments);
        applyGoals(goals);
        applyProjects(projects);
        this.setState({
          instruments, goals, projects,
          _seedPurged: true, _quickConverted: true, _tasksLinked: true,
          routineSteps: (s.routineSteps && s.routineSteps.length) ? s.routineSteps : seedRoutineSteps(),
          sessions: s.sessions||[], checklist: s.checklist||{}, mode: s.mode||'default',
          activeProjectId: s.activeProjectId || (projects[0] && projects[0].id) || '', stepStatus: s.stepStatus||{},
          stepDates: s.stepDates||{}, userGoals: s.userGoals||[],
          tasks: s.tasks||DEFAULT_TASKS, taskDone: s.taskDone||{},
          extraToday: s.extraToday||{}, jpStudied: s.jpStudied||{}, stepDaily: s.stepDaily||{},
          strengthWorkout: s.strengthWorkout || STRENGTH_WORKOUTS[0].name,
          strengthSets: s.strengthSets||{},
          study: s.study||SEED_STUDY, sheetUrl: s.sheetUrl||'', sheetPushUrl: s.sheetPushUrl||'',
          syncAt: s.syncAt||'', pendingPush: s.pendingPush||[],
          calendarId: s.calendarId||'', calendarView: s.calendarView||'AGENDA',
          licks: (s.licks && s.licks.length) ? s.licks : seedLicks(),
          routine: this.migrateRoutine(Object.assign({}, this.state.routine, s.routine||{})),
        });
      } else {
        // First run: start empty. Goals, repeating tasks, routine steps and the
        // study queue come from the seeds in the initial state above; the
        // practice log and projects begin blank so the app is yours from day one.
        applyProjects(this.state.projects);
        this.persist({_seedPurged: true});
      }
    }catch(e){ /* corrupt stored state — fall through to the seeded defaults */ }
    const st = PROPS.startTab; if(st && st!=='today') this.setState({tab:st});
    this._tick = setInterval(()=>this.setState({tick: Date.now()}), 60000);
  }
  dispose(){ if(this._tick) clearInterval(this._tick); }

  snapshot(){
    const s = {};
    BACKUP_FIELDS.forEach(k => { s[k] = this.state[k]; });
    return s;
  }

  persist(patch){
    const s = Object.assign(this.snapshot(), patch||{});
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }catch(e){}
  }

  /* ---- full backup / restore (beyond the practice-log-only Export .json
     on the Log screen) — covers every persisted field so a phone loss
     doesn't also mean losing goals, tasks, instruments, licks, etc. ---- */
  exportBackup(){
    const payload = Object.assign(
      {_schemaVersion: this.state._schemaVersion||1, _exportedAt: new Date().toISOString()},
      this.snapshot()
    );
    this.download('kata-backup-'+toKey(new Date())+'.json', JSON.stringify(payload, null, 2), 'application/json');
  }
  async importBackup(file){
    try{
      const text = await file.text();
      const s = JSON.parse(text);
      if(!s || typeof s !== 'object') throw new Error('that file isn’t a valid backup');
      const instruments = (s.instruments && s.instruments.length) ? s.instruments : this.state.instruments;
      const goals = (s.goals && s.goals.length) ? s.goals : this.state.goals;
      const projects = Array.isArray(s.projects) ? s.projects : this.state.projects;
      applyInstruments(instruments);
      applyGoals(goals);
      applyProjects(projects);
      const patch = {
        instruments, goals, projects,
        activeProjectId: s.activeProjectId || (projects[0] && projects[0].id) || '',
        routineSteps: (s.routineSteps && s.routineSteps.length) ? s.routineSteps : this.state.routineSteps,
        sessions: s.sessions || this.state.sessions,
        checklist: s.checklist || this.state.checklist,
        mode: s.mode || this.state.mode,
        activeProjectId: s.activeProjectId || this.state.activeProjectId,
        stepStatus: s.stepStatus || this.state.stepStatus,
        stepDates: s.stepDates || this.state.stepDates,
        userGoals: s.userGoals || this.state.userGoals,
        // The same rule as the migration: a task must serve a goal or project.
        tasks: (s.tasks && s.tasks.length) ? s.tasks.filter(t=>t.projectId || t.goalId) : this.state.tasks,
        taskDone: s.taskDone || this.state.taskDone,
        extraToday: s.extraToday || this.state.extraToday,
        stepDaily: s.stepDaily || this.state.stepDaily,
        strengthWorkout: s.strengthWorkout || this.state.strengthWorkout,
        strengthSets: s.strengthSets || this.state.strengthSets,
        jpStudied: s.jpStudied || this.state.jpStudied,
        study: (s.study && s.study.length) ? s.study : this.state.study,
        sheetUrl: s.sheetUrl != null ? s.sheetUrl : this.state.sheetUrl,
        sheetPushUrl: s.sheetPushUrl != null ? s.sheetPushUrl : this.state.sheetPushUrl,
        syncAt: s.syncAt || this.state.syncAt,
        calendarId: s.calendarId != null ? s.calendarId : this.state.calendarId,
        calendarView: s.calendarView || this.state.calendarView,
        pendingPush: s.pendingPush || this.state.pendingPush,
        licks: (s.licks && s.licks.length) ? s.licks : this.state.licks,
        routine: s.routine ? Object.assign({}, this.state.routine, s.routine) : this.state.routine,
      };
      const when = s._exportedAt ? labelFor(s._exportedAt.slice(0,10)) : 'an earlier backup';
      patch.backupMsg = 'Restored '+when+' — '+patch.sessions.length+' sessions, '+patch.goals.length+' goals, '+patch.projects.length+' projects, '+patch.tasks.length+' tasks.';
      this.setState(patch);
      this.persist(patch);
      return {ok:true};
    }catch(e){
      this.setState({backupMsg: 'Could not read that file — '+e.message});
      return {ok:false, error:e.message};
    }
  }

  /* ---- word of the day ---- */
  chunkNow(){
    const h = new Date().getHours();
    return TIME_CHUNKS.find(c=>h>=c.from && h<c.to) || TIME_CHUNKS[0];
  }
  dayOfYear(d){ return Math.floor((d - new Date(d.getFullYear(),0,0))/86400000); }
  sekkiFor(d){
    const md = String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    let cur = SEKKI[SEKKI.length-1];
    for(let i=0;i<SEKKI.length;i++){ if(SEKKI[i][0]<=md) cur = SEKKI[i]; }
    return {jp:cur[1], r:cur[2], en:cur[3]};
  }
  wordOfDay(){
    const now = new Date();
    const md = String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
    const occ = NOTABLE[md] || null;
    const doy = this.dayOfYear(now);
    const chunk = this.chunkNow();
    let q = occ && Q_BY_ID[occ.quote] ? Q_BY_ID[occ.quote] : null;
    if(!q){
      const pool = QUOTES.filter(x=>x.time.indexOf(chunk.id)>=0);
      const p = pool.length ? pool : QUOTES;
      q = p[(doy + TIME_CHUNKS.findIndex(c=>c.id===chunk.id)*7) % p.length];
    }
    const sekki = this.sekkiFor(now);
    return {
      id: q.id, w: q.word.w, k: q.word.k, r: q.word.r, en: q.word.en,
      quoteJp: q.jp, quoteR: q.r, quoteEn: q.en,
      author: q.author, authorR: q.authorR, work: q.work, year: q.year, theme: q.theme,
      source: q.author+'『'+q.work+'』', sourceSub: q.authorR+' · '+q.year+' · on '+q.theme,
      chunkJp: chunk.jp, chunkR: chunk.r, chunkEn: chunk.en, chunkGloss: chunk.gloss, chunkId: chunk.id,
      occasion: occ,
      dateNote: (occ ? occ.jp+' ('+occ.r+') — '+occ.en+'. ' : '')
        + sekki.jp+' ('+sekki.r+'), '+sekki.en+' · '+chunk.jp+' ('+chunk.r+'), '+chunk.gloss+'.',
      sekki,
    };
  }
  jpKey(){ return toKey(new Date()); }
  markWord(word){
    const key = this.jpKey();
    const jpStudied = Object.assign({}, this.state.jpStudied);
    if(jpStudied[key]) delete jpStudied[key];
    else jpStudied[key] = {quoteId: word.id, chunk: word.chunkId, at: new Date().toISOString()};
    this.setState({jpStudied});
    this.persist({jpStudied});
  }

  /* ---- study queue ---- */
  setStudyForm(patch){ this.setState({studyForm: Object.assign({}, this.state.studyForm, patch)}); }
  addStudy(){
    const f = this.state.studyForm;
    const title = (f.title||'').trim();
    if(!title) return;
    const item = {id:'us-'+Date.now(), refId:'', title, link:(f.link||'').trim(), why:f.why||'',
      hub:'', creator:f.creator||'', franchise:'', styleFamily:'', styleDetail:'', format:'',
      category:f.category, tags:'', status:f.status||'Inbox', priority:f.priority, next:'',
      inst:f.inst, goalId:f.goalId||'', added:toKey(new Date()), local:true};
    const study = [item].concat(this.state.study);
    const pendingPush = this.state.pendingPush.concat([item.id]);
    this.setState({study, pendingPush, studyForm:Object.assign({}, f, {open:false, title:'', link:'', why:'', next:''})});
    this.persist({study, pendingPush});
    this.pushSheet([item]);
  }
  removeStudy(id){
    const study = this.state.study.filter(x=>x.id!==id);
    this.setState({study});
    this.persist({study});
  }
  patchStudy(id, patch){
    const study = this.state.study.map(x=>x.id===id ? Object.assign({}, x, patch, {dirty:true}) : x);
    const pendingPush = this.state.pendingPush.indexOf(id)>=0 ? this.state.pendingPush : this.state.pendingPush.concat([id]);
    this.setState({study, pendingPush});
    this.persist({study, pendingPush});
    const it = study.find(x=>x.id===id);
    if(it) this.pushSheet([it]);
  }
  cycleStudyStatus(item){
    const i = STUDY_STATUS.indexOf(item.status);
    this.patchStudy(item.id, {status: STUDY_STATUS[(i+1) % STUDY_STATUS.length]});
  }
  parseCsv(text){
    const rows=[]; let row=[], cell='', q=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(q){
        if(c==='"'){ if(text[i+1]==='"'){ cell+='"'; i++; } else q=false; }
        else cell+=c;
      } else if(c==='"') q=true;
      else if(c===','){ row.push(cell); cell=''; }
      else if(c==='\n'){ row.push(cell); rows.push(row); row=[]; cell=''; }
      else if(c!=='\r') cell+=c;
    }
    if(cell!=='' || row.length){ row.push(cell); rows.push(row); }
    return rows.filter(r=>r.some(x=>String(x).trim()!==''));
  }
  csvUrl(raw, tab){
    const t = String(raw||'').trim();
    if(!t) return '';
    const m = t.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if(m) return 'https://docs.google.com/spreadsheets/d/'+m[1]+'/gviz/tq?tqx=out:csv&sheet='+encodeURIComponent(tab);
    return t;
  }
  async pullSheet(){
    const url = this.csvUrl(this.state.sheetUrl, PROPS.sheetTab ?? 'Study Queue');
    if(!url){ this.setState({syncMsg:'Paste your sheet URL first.'}); return; }
    this.setState({syncBusy:true, syncMsg:'Pulling…'});
    try{
      const res = await fetch(url, {cache:'no-store'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const rows = this.parseCsv(await res.text());
      if(!rows.length) throw new Error('empty sheet');
      let head = 0;
      for(let i=0;i<Math.min(6, rows.length);i++){
        if(rows[i].some(c=>/work \/ piece/i.test(c))){ head = i; break; }
      }
      const cols = rows[head].map(c=>c.trim().toLowerCase());
      const at = n => { const i = cols.indexOf(n.toLowerCase()); return r => i<0 ? '' : (r[i]||'').trim(); };
      const g = {title:at('Work / Piece'), link:at('Source Link'), why:at('Study Target / Why'),
        hub:at('Collection / Hub'), creator:at('Creator / Channel'), franchise:at('Franchise / Series'),
        styleFamily:at('Style Family'), styleDetail:at('Style Detail / Influence'), format:at('Format / Lens'),
        category:at('Category'), tags:at('Tags'), status:at('Status'), priority:at('Priority'),
        next:at('Next Study Action'), refId:at('Ref ID')};
      const incoming = rows.slice(head+1).map(r=>{
        const o = {}; Object.keys(g).forEach(k=>{ o[k] = g[k](r); });
        return o;
      }).filter(o=>o.title);
      const byKey = {};
      this.state.study.forEach(x=>{ byKey[(x.refId||x.title).toLowerCase()] = x; });
      let added = 0, updated = 0;
      incoming.forEach(o=>{
        const key = (o.refId||o.title).toLowerCase();
        const ex = byKey[key];
        if(ex){
          Object.keys(o).forEach(k=>{ if(o[k]) ex[k] = o[k]; });
          ex.dirty = false; updated++;
        } else {
          byKey[key] = Object.assign({id:'sh-'+key.replace(/[^a-z0-9]+/g,'-').slice(0,40), inst:'', goalId:'', added:toKey(new Date())}, o);
          added++;
        }
      });
      const study = Object.keys(byKey).map(k=>byKey[k]);
      const syncAt = new Date().toISOString();
      this.setState({study, syncBusy:false, syncAt, syncMsg:added+' new · '+updated+' updated from the sheet'});
      this.persist({study, syncAt});
    }catch(e){
      this.setState({syncBusy:false, syncMsg:'Could not read the sheet — publish it to the web (File → Share → Publish to web → CSV). '+e.message});
    }
  }
  pushSheet(items){
    const url = (this.state.sheetPushUrl||'').trim();
    if(!url || !items || !items.length) return;
    try{
      fetch(url, {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain'},
        body: JSON.stringify({sheet:'Study Queue', cols:STUDY_COLS, items})});
      const pendingPush = this.state.pendingPush.filter(id=>!items.some(i=>i.id===id));
      this.setState({pendingPush});
      this.persist({pendingPush});
    }catch(e){}
  }
  flushPush(){
    const items = this.state.study.filter(x=>this.state.pendingPush.indexOf(x.id)>=0);
    if(items.length) this.pushSheet(items);
    else this.setState({syncMsg:'Nothing waiting to send.'});
  }

  /* ---- shakuhachi routine & licks ---- */
  toggleFormStep(id){
    const cur = this.state.form.steps||[];
    this.setState({form: Object.assign({}, this.state.form, {steps: cur.indexOf(id)>=0 ? cur.filter(x=>x!==id) : cur.concat([id])})});
  }
  toggleFormLick(id){
    const cur = this.state.form.licks||[];
    this.setState({form: Object.assign({}, this.state.form, {licks: cur.indexOf(id)>=0 ? cur.filter(x=>x!==id) : cur.concat([id])})});
  }
  setLickForm(patch){ this.setState({lickForm: Object.assign({}, this.state.lickForm, patch)}); }
  addLick(fromLog){
    const f = this.state.lickForm;
    const name = (f.name||'').trim();
    if(!name) return;
    const lick = {id:'lk-'+Date.now(), name, source: f.source||'Honkyoku', notation:(f.notation||'').trim(),
                  note:(f.note||'').trim(), added: toKey(new Date()), plays: []};
    const licks = [lick].concat(this.state.licks);
    const patch = {licks, lickForm: {open:false, name:'', source: f.source||'Honkyoku', notation:'', note:''}};
    if(fromLog) patch.form = Object.assign({}, this.state.form, {licks: (this.state.form.licks||[]).concat([lick.id])});
    this.setState(patch);
    this.persist({licks});
  }
  removeLick(id){
    const licks = this.state.licks.filter(l=>l.id!==id);
    this.setState({licks});
    this.persist({licks});
  }
  markLickPlayed(id){
    const day = toKey(new Date());
    const licks = this.state.licks.map(l=>{
      if(l.id!==id) return l;
      const plays = (l.plays||[]);
      return Object.assign({}, l, {plays: plays.indexOf(day)>=0 ? plays : plays.concat([day])});
    });
    this.setState({licks});
    this.persist({licks});
  }
  lickView(l){
    const plays = (l.plays||[]).slice().sort();
    const last = plays.length ? plays[plays.length-1] : '';
    return {name:l.name, source:l.source, notation:l.notation, note:l.note,
      hasNotation: !!l.notation, hasNote: !!l.note,
      playLabel: plays.length ? plays.length+(plays.length===1?' play':' plays') : 'not yet played',
      lastLabel: last ? 'last '+labelFor(last) : 'added '+labelFor(l.added||toKey(new Date())),
      play: ()=>this.markLickPlayed(l.id), remove: ()=>this.removeLick(l.id)};
  }
  instSessions(instId){
    return this.state.sessions.filter(s=>s.activity===instId).slice().sort((a,b)=> a.date<b.date?1:a.date>b.date?-1:0);
  }
  // '5–8' is minutes; '3 × 8–12' is sets and reps and must not gain a suffix.
  minsLabel(v){ const t = String(v||''); return /[×x]/.test(t) ? t : t + ' min'; }
  stepsFor(instId){ return this.state.routineSteps.filter(s=>s.inst===instId); }
  stepRateLabel(stepId, instId){
    const recent = this.instSessions(instId||'shaku').slice(0,10);
    if(!recent.length) return 'no sessions yet';
    return recent.filter(s=>(s.steps||[]).indexOf(stepId)>=0).length+' of last '+recent.length;
  }

  /* ---- quick ticks from the week strips ---- */
  sessionFor(dateKey, actId){
    return this.state.sessions.find(s=>s.date===dateKey && s.activity===actId) || null;
  }
  // Ticking a block marks it done for that day. It deliberately does NOT
  // create a session: a session carries minutes you actually practised, and
  // fabricating one from the planned block time inflated every hours figure in
  // the app with numbers that were never entered.
  toggleQuickLog(dateKey, actId){
    if(this.sessionFor(dateKey, actId)) return; // a real logged session wins
    const day = Object.assign({}, this.state.checklist[dateKey]);
    if(day[actId]) delete day[actId]; else day[actId] = true;
    const checklist = Object.assign({}, this.state.checklist, {[dateKey]: day});
    this.setState({checklist});
    this.persist({checklist});
  }
  // Done on a given day = explicitly ticked, or a real session exists.
  isDoneOn(dateKey, actId){
    const d = this.state.checklist[dateKey];
    if(d && d[actId]) return true;
    return !!this.sessionFor(dateKey, actId);
  }
  fillInQuick(id){
    const s = this.state.sessions.find(x=>x.id===id);
    if(!s) return;
    const sessions = this.state.sessions.filter(x=>x.id!==id);
    this.setState({sessions, tab:'log', sort:'newest',
      form: Object.assign({}, blankForm(s.activity), {date:s.date, time:s.time||nowTime(), minutes:String(s.minutes||'')})});
    this.persist({sessions});
  }

  /* ---- setup: instruments ---- */
  commitInstruments(instruments, extra){
    applyInstruments(instruments);
    this.setState(Object.assign({instruments}, extra||{}));
    this.persist(Object.assign({instruments}, extra||{}));
  }
  patchInstrument(id, patch){
    this.commitInstruments(this.state.instruments.map(a=>a.id===id ? Object.assign({}, a, patch) : a));
  }
  setInstForm(patch){ this.setState({instForm: Object.assign({}, this.state.instForm, patch)}); }
  addInstrument(){
    const f = this.state.instForm;
    const name = (f.name||'').trim();
    if(!name) return;
    const a = {id:'in-'+Date.now(), name, jp:(f.jp||'').trim(), jpR:(f.jpR||'').trim(),
      abbr:name.replace(/[^A-Za-z0-9]/g,'').slice(0,3) || name.slice(0,2),
      hue:Number(f.hue), rotate:!!f.rotate, anchor:!!f.anchor};
    this.commitInstruments(this.state.instruments.concat([a]), {instForm:{open:false, name:'', jp:'', jpR:'', hue:f.hue, rotate:true, anchor:false}});
  }
  canDeleteInstrument(a){ return a.id!=='other'; }
  removeInstrument(id){
    const a = this.state.instruments.find(x=>x.id===id);
    if(!a || !this.canDeleteInstrument(a)) return;
    const instruments = this.state.instruments.filter(x=>x.id!==id);
    const rotation = {};
    Object.keys(this.state.routine.rotation||{}).forEach(k=>{ rotation[k] = (this.state.routine.rotation[k]||[]).filter(x=>x!==id); });
    const routine = Object.assign({}, this.state.routine, {rotation});
    const tasks = this.state.tasks.map(t=>t.act===id ? Object.assign({}, t, {act:'other'}) : t);
    const goals = this.state.goals.map(g=>{
      const acts = (g.activities||[]).filter(x=>x!==id);
      return acts.length===(g.activities||[]).length ? g : Object.assign({}, g, {activities: acts.length?acts:['other']});
    });
    applyGoals(goals);
    const routineSteps = this.state.routineSteps.filter(s=>s.inst!==id);
    const fallback = (instruments.find(x=>x.rotate) || instruments[0] || {id:'other'}).id;
    const extra = {routine, tasks, goals, routineSteps,
      libraryAct: this.state.libraryAct===id ? fallback : this.state.libraryAct,
      setupInst: this.state.setupInst===id ? fallback : this.state.setupInst,
      form: this.state.form.activity===id ? Object.assign({}, this.state.form, {activity:fallback, projectIds:[], goalStepIds:[]}) : this.state.form};
    this.commitInstruments(instruments, extra);
  }

  /* ---- setup: routine steps ---- */
  setStepForm(patch){ this.setState({stepForm: Object.assign({}, this.state.stepForm, patch)}); }
  addRoutineStep(){
    const f = this.state.stepForm;
    const label = (f.label||'').trim();
    if(!label) return;
    const step = {id:'rs-'+Date.now(), inst:this.state.setupInst, phase:f.phase, label,
      mins:String(f.mins||'').trim() || '5',
      cues:(f.cues||'').split('\n').map(t=>t.trim()).filter(Boolean)};
    const routineSteps = this.state.routineSteps.concat([step]);
    this.setState({routineSteps, stepForm:{open:false, phase:f.phase, label:'', mins:f.mins, cues:''}});
    this.persist({routineSteps});
  }
  removeRoutineStep(id){
    const routineSteps = this.state.routineSteps.filter(s=>s.id!==id);
    this.setState({routineSteps});
    this.persist({routineSteps});
  }

  // Pull in any built-in routine steps this device is missing, without
  // touching what is already there. Seeds normally only apply to a fresh
  // install, which left existing devices unable to receive a new programme
  // without wiping everything first.
  restoreDefaultRoutines(){
    const have = new Set(this.state.routineSteps.map(s=>s.id));
    const missing = seedRoutineSteps().filter(s=>!have.has(s.id));
    if(!missing.length){
      this.setState({routineMsg:'Nothing missing — the built-in routines are already here.'});
      return;
    }
    const routineSteps = this.state.routineSteps.concat(missing);
    const byWay = {};
    missing.forEach(s=>{ byWay[s.inst] = (byWay[s.inst]||0)+1; });
    const summary = Object.keys(byWay).map(id=>byWay[id]+' to '+actOf(id).name).join(', ');
    this.setState({routineSteps, routineMsg:'Added '+missing.length+' steps — '+summary+'. Nothing existing was changed.'});
    this.persist({routineSteps});
  }

  /* ---- setup: goals ---- */
  commitGoals(goals){
    applyGoals(goals);
    this.setState({goals});
    this.persist({goals});
  }
  patchGoal(id, patch){ this.commitGoals(this.state.goals.map(g=>g.id===id ? Object.assign({}, g, patch) : g)); }
  removeGoal(id){ this.commitGoals(this.state.goals.filter(g=>g.id!==id)); }
  archiveGoal(id){ this.patchGoal(id, {archived: toKey(new Date())}); }
  unarchiveGoal(id){ this.patchGoal(id, {archived: ''}); }
  addGoalStep(goalId, label){
    const text = (label||'').trim();
    if(!text) return;
    const newStep = Object.assign({}, this.state.newStep); delete newStep[goalId];
    this.setState({newStep});
    this.commitGoals(this.state.goals.map(g=>g.id===goalId
      ? Object.assign({}, g, {steps: g.steps.concat([{id:goalId+'s'+Date.now(), label:text, d:'todo'}])}) : g));
  }
  renameGoalStep(goalId, stepId, label){
    this.commitGoals(this.state.goals.map(g=>g.id===goalId
      ? Object.assign({}, g, {steps: g.steps.map(s=>s.id===stepId ? Object.assign({}, s, {label}) : s)}) : g));
  }
  removeGoalStep(goalId, stepId){
    this.commitGoals(this.state.goals.map(g=>g.id===goalId
      ? Object.assign({}, g, {steps: g.steps.filter(s=>s.id!==stepId)}) : g));
  }
  toggleGoalActivity(goalId, actId){
    const g = this.state.goals.find(x=>x.id===goalId);
    if(!g) return;
    const on = (g.activities||[]).indexOf(actId)>=0;
    const activities = on ? g.activities.filter(x=>x!==actId) : (g.activities||[]).concat([actId]);
    this.patchGoal(goalId, {activities: activities.length ? activities : ['other']});
  }
  // Wipes everything this device has stored and reloads into a first-run app.
  // The only way back is a backup file, so the UI gates it behind a confirm.
  wipeEverything(){
    try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
    location.reload();
  }

  /* ---- projects (time-boxed pushes) ----
     Same shape as a goal plus `blurb`, an optional `until` date, and a
     `goalId` binding — logging against a project also credits that goal
     (see submitSession). */
  commitProjects(projects, extra){
    applyProjects(projects);
    this.setState(Object.assign({projects}, extra||{}));
    this.persist(Object.assign({projects}, extra||{}));
  }
  setProjectForm(patch){ this.setState({projectForm: Object.assign({}, this.state.projectForm, patch)}); }
  addProject(){
    const f = this.state.projectForm;
    const name = (f.name||'').trim();
    if(!name) return;
    const id = 'up-'+Date.now();
    const steps = (f.steps||'').split('\n').map(t=>t.trim()).filter(Boolean)
      .map((label,i)=>({id:id+'s'+i, label, d:'todo'}));
    const goal = GOALS.find(g=>g.id===f.goalId);
    const project = {
      id, name, blurb:(f.blurb||'').trim(), goalId:f.goalId||'',
      area: goal ? goal.area : 'Music',
      activities: f.activities.length ? f.activities.slice() : ['other'],
      until: f.until||'', sprint: !!f.sprint, steps, user:true,
    };
    this.commitProjects(this.state.projects.concat([project]), {
      activeProjectId: id,
      projectForm: {open:false, name:'', blurb:'', goalId:'', activities:[], steps:'', until:'', sprint:false},
    });
  }
  patchProject(id, patch){
    this.commitProjects(this.state.projects.map(p=>p.id===id ? Object.assign({}, p, patch) : p));
  }
  removeProject(id){
    const projects = this.state.projects.filter(p=>p.id!==id);
    this.commitProjects(projects, {
      activeProjectId: this.state.activeProjectId===id ? ((projects[0] && projects[0].id) || '') : this.state.activeProjectId,
    });
  }
  addProjectStep(projectId, label){
    const text = (label||'').trim();
    if(!text) return;
    this.commitProjects(this.state.projects.map(p=>p.id===projectId
      ? Object.assign({}, p, {steps: p.steps.concat([{id:projectId+'s'+Date.now(), label:text, d:'todo'}])}) : p));
  }
  renameProjectStep(projectId, stepId, label){
    this.commitProjects(this.state.projects.map(p=>p.id===projectId
      ? Object.assign({}, p, {steps: p.steps.map(s=>s.id===stepId ? Object.assign({}, s, {label}) : s)}) : p));
  }
  removeProjectStep(projectId, stepId){
    this.commitProjects(this.state.projects.map(p=>p.id===projectId
      ? Object.assign({}, p, {steps: p.steps.filter(s=>s.id!==stepId)}) : p));
  }
  toggleProjectActivity(actId){
    const cur = this.state.projectForm.activities||[];
    this.setProjectForm({activities: cur.indexOf(actId)>=0 ? cur.filter(x=>x!==actId) : cur.concat([actId])});
  }

  resetSetup(){
    const instruments = clone(ACT_DEFS), goals = clone(SEED_GOALS), routineSteps = seedRoutineSteps();
    applyInstruments(instruments); applyGoals(goals);
    this.setState({instruments, goals, routineSteps, resetArmed:false, setupInst:'shaku', libraryAct:'shaku'});
    this.persist({instruments, goals, routineSteps});
  }

  /* ---- daily tasks ---- */
  taskOccursOn(t, dateStr){
    const d = new Date(dateStr+'T00:00:00');
    const dayId = DAYS[(d.getDay()+6)%7].id;
    if(t.mode==='daily') return true;
    if(t.mode==='weekdays') return (t.days||[]).indexOf(dayId)>=0;
    if(t.mode==='date') return t.date===dateStr;
    if(t.mode==='range') return (!t.from||dateStr>=t.from) && (!t.to||dateStr<=t.to);
    return false;
  }
  tasksOn(dateStr){ return this.state.tasks.filter(t=>this.taskOccursOn(t, dateStr)); }
  isTaskDone(id, dateStr){ const d = this.state.taskDone[dateStr]; return !!(d && d[id]); }
  toggleTask(id, dateStr){
    const day = Object.assign({}, this.state.taskDone[dateStr]);
    if(day[id]) delete day[id]; else day[id] = true;
    const taskDone = Object.assign({}, this.state.taskDone, {[dateStr]: day});
    this.setState({taskDone});
    this.persist({taskDone});
  }
  // A task must serve a goal or a project. `act` is derived from that parent so
  // the task still files under an instrument in the Library.
  addTask(){
    const f = this.state.taskForm;
    const name = (f.name||'').trim();
    if(!name){ this.setState({taskMsg:'Give the task a name.'}); return; }
    const link = f.link||'';
    if(!link){ this.setState({taskMsg:'Pick the goal or project this task serves.'}); return; }
    const parent = this.taskParentOf(link);
    if(!parent){ this.setState({taskMsg:'That goal or project no longer exists.'}); return; }
    const t = {id:'ut-'+Date.now(), name, act: parent.act,
      projectId: link.indexOf('p:')===0 ? link.slice(2) : '',
      goalId: link.indexOf('g:')===0 ? link.slice(2) : '',
      mode:f.mode, days:f.days.slice(), date:f.date, from:f.from, to:f.to};
    const tasks = this.state.tasks.concat([t]);
    this.setState({tasks, taskMsg:'', taskForm:{open:false, name:'', link, mode:f.mode, days:[], date:'', from:'', to:''}});
    this.persist({tasks});
  }
  // Resolve 'g:<id>' / 'p:<id>' to its owner, plus the instrument it files under.
  taskParentOf(link){
    if(!link) return null;
    if(link.indexOf('p:')===0){
      const p = (this.state.projects||[]).find(x=>x.id===link.slice(2));
      return p ? {name:p.name, kind:'Project', act:(p.activities||[])[0]||'other'} : null;
    }
    if(link.indexOf('g:')===0){
      const g = GOALS.find(x=>x.id===link.slice(2));
      return g ? {name:g.name, kind:'Goal', act:(g.activities||[])[0]||'other'} : null;
    }
    return null;
  }
  taskLinkOf(t){ return t.projectId ? 'p:'+t.projectId : (t.goalId ? 'g:'+t.goalId : ''); }
  patchTask(id, patch){
    const tasks = this.state.tasks.map(t=>{
      if(t.id!==id) return t;
      const next = Object.assign({}, t, patch);
      if(patch.link !== undefined){
        const parent = this.taskParentOf(patch.link);
        next.projectId = patch.link.indexOf('p:')===0 ? patch.link.slice(2) : '';
        next.goalId = patch.link.indexOf('g:')===0 ? patch.link.slice(2) : '';
        if(parent) next.act = parent.act;
        delete next.link;
      }
      return next;
    });
    this.setState({tasks});
    this.persist({tasks});
  }
  removeTask(id){
    const tasks = this.state.tasks.filter(t=>t.id!==id);
    this.setState({tasks});
    this.persist({tasks});
  }
  setTaskForm(patch){ this.setState({taskForm: Object.assign({}, this.state.taskForm, patch)}); }
  taskWhenLabel(t){
    if(t.mode==='daily') return 'Every day';
    if(t.mode==='weekdays'){
      const names = DAYS.filter(d=>(t.days||[]).indexOf(d.id)>=0).map(d=>d.name);
      return names.length ? names.join(' · ') : 'No days chosen';
    }
    if(t.mode==='date') return t.date ? labelFor(t.date) : 'No date set';
    if(t.mode==='range') return (t.from?labelFor(t.from):'—')+' → '+(t.to?labelFor(t.to):'—');
    return '';
  }

  // Google Calendar embed. Display only: an iframe is opaque to the page, so
  // this shows commitments but cannot feed the routine's free-time maths —
  // that would need the Calendar API and a key.
  calendarEmbedUrl(){
    const id = (this.state.calendarId||'').trim();
    if(!id) return '';
    let tz = 'UTC';
    try{ tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }catch(e){}
    const p = [
      'src=' + encodeURIComponent(id),
      'ctz=' + encodeURIComponent(tz),
      'mode=' + encodeURIComponent(this.state.calendarView||'AGENDA'),
      'bgcolor=%23f3f2f2',
      'showTitle=0', 'showPrint=0', 'showTabs=0', 'showCalendars=0', 'showTz=0',
    ];
    return 'https://calendar.google.com/calendar/embed?' + p.join('&');
  }

  addPin(){
    const pins = (this.state.routine.pins||[]).concat([
      {id:'pin-'+Date.now(), act:(ROTATION_POOL[0]||'other'), day:'mon'},
    ]);
    const routine = Object.assign({}, this.state.routine, {pins});
    this.setState({routine}); this.persist({routine});
  }
  patchPin(id, patch){
    const pins = (this.state.routine.pins||[]).map(p=>p.id===id ? Object.assign({}, p, patch) : p);
    const routine = Object.assign({}, this.state.routine, {pins});
    this.setState({routine}); this.persist({routine});
  }
  removePin(id){
    const pins = (this.state.routine.pins||[]).filter(p=>p.id!==id);
    const routine = Object.assign({}, this.state.routine, {pins});
    this.setState({routine}); this.persist({routine});
  }

  // Fixtures used to carry a single `act`. Normalise stored ones to the `acts`
  // list on load so nothing downstream has to keep asking which shape it has.
  // Idempotent: an already-migrated routine passes through untouched.
  migrateRoutine(routine){
    const fix = list => (list||[]).map(f=>{
      if(Array.isArray(f.acts)) return f;
      const out = Object.assign({}, f, {acts: f.act ? [f.act] : []});
      delete out.act;
      return out;
    });
    return Object.assign({}, routine, {lessons: fix(routine.lessons), bands: fix(routine.bands)});
  }

  lessonsOn(dayId){ return (this.state.routine.lessons||[]).filter(l=>l.day===dayId); }
  bandsOn(dayId){ return (this.state.routine.bands||[]).filter(b=>b.day===dayId); }
  // Fixtures: everything on the week that someone else's clock decides — a
  // lesson with a teacher, a rehearsal with a band. They differ in what they
  // are and how they read, but not in how the rotation treats them, so the
  // slot-claiming logic works on this one list rather than on either array.
  // Lessons come first: an hour of correction outranks an ensemble seat when
  // both land on a day with only one slot to give.
  fixturesOn(dayId){
    return this.lessonsOn(dayId).map(l=>Object.assign({kind:'lesson'}, l))
      .concat(this.bandsOn(dayId).map(b=>Object.assign({kind:'band'}, b)));
  }
  // The Ways a fixture serves. Tolerates the old single-`act` shape so a device
  // that stored one before this change still reads correctly.
  fixtureActsOf(f){
    if(Array.isArray(f.acts)) return f.acts;
    return f.act ? [f.act] : [];
  }
  // The Ways a fixture touches that do NOT rotate — Direction being the reason
  // this exists. They claim no slot (you do not schedule an hour to conduct)
  // but the fixture should still say they are part of it.
  fixtureAlsoLabel(f){
    const extra = this.fixtureActsOf(f).filter(a=>ROTATION_POOL.indexOf(a)<0);
    return extra.length ? ' · '+extra.map(a=>actOf(a).name).join(' · ') : '';
  }
  // The Ways carrying a fixture on this day, deduped and limited to the ones
  // that actually rotate. Two fixtures on the same instrument still claim only
  // one slot — it is one instrument played that day, however it is split.
  fixtureActsOn(dayId){
    const out = [];
    this.fixturesOn(dayId).forEach(f=>{
      this.fixtureActsOf(f).forEach(a=>{
        if(ROTATION_POOL.indexOf(a)>=0 && out.indexOf(a)<0) out.push(a);
      });
    });
    return out;
  }
  fixtureMark(kind){ return kind==='band' ? '◎' : '◉'; }
  commitLessons(lessons){
    const routine = Object.assign({}, this.state.routine, {lessons});
    this.setState({routine});
    this.persist({routine});
  }
  addLesson(){
    const lessons = (this.state.routine.lessons||[]).concat([
      {id:'ls-'+Date.now(), name:'New lesson', acts:[ROTATION_POOL[0]||'other'], day:'thu', time:'09:00', mins:60},
    ]);
    this.commitLessons(lessons);
  }
  patchLesson(id, patch){
    this.commitLessons((this.state.routine.lessons||[]).map(l=>l.id===id ? Object.assign({}, l, patch) : l));
  }
  removeLesson(id){
    this.commitLessons((this.state.routine.lessons||[]).filter(l=>l.id!==id));
  }
  commitBands(bands){
    const routine = Object.assign({}, this.state.routine, {bands});
    this.setState({routine});
    this.persist({routine});
  }
  addBand(){
    const bands = (this.state.routine.bands||[]).concat([
      {id:'bd-'+Date.now(), name:'New band', acts:[ROTATION_POOL[0]||'other'], day:'sat', time:'10:00', mins:120},
    ]);
    this.commitBands(bands);
  }
  patchBand(id, patch){
    this.commitBands((this.state.routine.bands||[]).map(b=>b.id===id ? Object.assign({}, b, patch) : b));
  }
  removeBand(id){
    this.commitBands((this.state.routine.bands||[]).filter(b=>b.id!==id));
  }
  // '09:30' -> '9:30am', for the day list
  clockLabel(t){
    const m = /^(\d{1,2}):(\d{2})$/.exec(t||'');
    if(!m) return t||'';
    let hr = Number(m[1]); const suffix = hr < 12 ? 'am' : 'pm';
    if(hr === 0) hr = 12; else if(hr > 12) hr -= 12;
    return hr + ':' + m[2] + suffix;
  }

  /* ---- rotation sizing ---- */
  slotsFor(dayId){
    const r = this.state.routine;
    const o = (r.slotsByDay||{})[dayId];
    return o==null ? (r.rotationSize||2) : o;
  }
  // What the day actually carries. A fixture is happening whether or not the
  // plan left room for it, so it raises the floor rather than being dropped.
  effectiveSlotsFor(dayId){
    return Math.max(this.slotsFor(dayId), this.fixtureActsOn(dayId).length);
  }
  setRotationSize(n){
    const size = Math.max(0, Math.min(4, n));
    const routine = Object.assign({}, this.state.routine, {rotationSize:size});
    this.setState({routine});
    this.persist({routine});
  }
  setDaySlots(dayId, n){
    const slotsByDay = Object.assign({}, this.state.routine.slotsByDay||{});
    slotsByDay[dayId] = Math.max(0, Math.min(4, n));
    const routine = Object.assign({}, this.state.routine, {slotsByDay});
    this.setState({routine});
    this.persist({routine});
  }
  // Drop a day's override so it follows the default again.
  clearDaySlots(dayId){
    const slotsByDay = Object.assign({}, this.state.routine.slotsByDay||{});
    delete slotsByDay[dayId];
    const routine = Object.assign({}, this.state.routine, {slotsByDay});
    this.setState({routine});
    this.persist({routine});
  }
  addInstrumentToday(actId){
    const key = toKey(new Date());
    const cur = (this.state.extraToday[key]||[]).slice();
    if(cur.indexOf(actId)<0) cur.push(actId);
    const extraToday = Object.assign({}, this.state.extraToday, {[key]: cur});
    this.setState({extraToday});
    this.persist({extraToday});
  }
  dropInstrumentToday(actId){
    const key = toKey(new Date());
    const cur = (this.state.extraToday[key]||[]).filter(x=>x!==actId);
    const extraToday = Object.assign({}, this.state.extraToday, {[key]: cur});
    this.setState({extraToday});
    this.persist({extraToday});
  }

  // A repeating step is ticked once per day and finishes either when it has
  // been done `target` times or once its `until` date has passed. Its status is
  // derived, not stored, so progress bars and rollups follow automatically.
  stepDayKeys(stepId){
    const out = [];
    Object.keys(this.state.stepDaily||{}).forEach(k=>{ if(this.state.stepDaily[k][stepId]) out.push(k); });
    return out.sort();
  }
  stepDailyCount(stepId){ return this.stepDayKeys(stepId).length; }
  isStepDoneToday(stepId){
    const d = this.state.stepDaily[toKey(new Date())];
    return !!(d && d[stepId]);
  }
  toggleStepDay(stepId, dateKey){
    const key = dateKey || toKey(new Date());
    const day = Object.assign({}, this.state.stepDaily[key]);
    if(day[stepId]) delete day[stepId]; else day[stepId] = true;
    const stepDaily = Object.assign({}, this.state.stepDaily, {[key]: day});
    this.setState({stepDaily});
    this.persist({stepDaily});
  }
  repeatStepDone(step){
    if(step.until && toKey(new Date()) > step.until) return true;
    const target = Number(step.target)||0;
    return target > 0 && this.stepDailyCount(step.id) >= target;
  }
  stepStatusOf(step){
    if(step && step.repeat){
      if(this.repeatStepDone(step)) return 'done';
      return this.stepDailyCount(step.id) > 0 ? 'progress' : 'todo';
    }
    return this.state.stepStatus[step.id] || step.d || 'todo';
  }
  setStepRepeat(projectId, stepId, patch){
    this.commitProjects(this.state.projects.map(p=>p.id!==projectId ? p : Object.assign({}, p, {
      steps: p.steps.map(st=>st.id===stepId ? Object.assign({}, st, patch) : st),
    })));
  }
  cycleStep(step){
    const next = NEXT_STATUS[this.stepStatusOf(step)];
    const stepStatus = Object.assign({}, this.state.stepStatus, {[step.id]: next});
    const stepDates = Object.assign({}, this.state.stepDates);
    if(next==='done') stepDates[step.id] = toKey(new Date()); else delete stepDates[step.id];
    this.setState({stepStatus, stepDates});
    this.persist({stepStatus, stepDates});
  }
  stepDoneAt(step){
    if(this.stepStatusOf(step)!=='done') return '';
    return this.state.stepDates[step.id] || SEED_DONE_DATES[step.id] || '';
  }
  completedAt(item){
    if(!item.steps.length) return '';
    let latest = '';
    for(let i=0;i<item.steps.length;i++){
      const s = item.steps[i];
      if(this.stepStatusOf(s)!=='done') return '';
      const d = this.stepDoneAt(s);
      if(d && d>latest) latest = d;
    }
    return latest || 'earlier';
  }
  addGoal(){
    const f = this.state.goalForm;
    const name = (f.name||'').trim();
    if(!name) return;
    const id = 'ug-'+Date.now();
    const steps = (f.steps||'').split('\n').map(t=>t.trim()).filter(Boolean).map((label,i)=>({id:id+'s'+i, label, d:'todo'}));
    const goal = {id, area:f.area, name, activities:(f.activities.length?f.activities.slice():['other']), steps, user:true};
    const goals = this.state.goals.concat([goal]);
    applyGoals(goals);
    this.setState({goals, area: f.area, goalForm:{open:false, name:'', area:f.area, activities:[], steps:''}});
    this.persist({goals});
  }
  setGoalForm(patch){ this.setState({goalForm: Object.assign({}, this.state.goalForm, patch)}); }
  stepView(step){
    const st = this.stepStatusOf(step);
    const sty = STEP_STYLE[st];
    const at = st==='done' ? this.stepDoneAt(step) : '';
    const t = this.stepTickStats()[step.id];
    return {label: step.label, fill: sty.fill, stroke: sty.stroke, dash: sty.dash, color: sty.color,
            doneLabel: at ? ' · done '+labelFor(at) : '',
            tickCount: t ? t.count : 0,
            tickLabel: t ? '×'+t.count : '',
            tickTitle: t ? t.count+(t.count===1?' session':' sessions')+' · '+t.minutes+' min · last '+labelFor(t.last) : 'not worked on yet',
            isDone: st==='done',
            markDone: ()=>this.setStepStatus(step, 'done'),
            cycle: ()=>this.cycleStep(step)};
  }
  // Direct set (the tap-cycle goes todo -> progress -> done; this jumps straight
  // there so "finish this and show me the next one" is one tap).
  setStepStatus(step, next){
    const stepStatus = Object.assign({}, this.state.stepStatus, {[step.id]: next});
    const stepDates = Object.assign({}, this.state.stepDates);
    if(next==='done') stepDates[step.id] = toKey(new Date()); else delete stepDates[step.id];
    this.setState({stepStatus, stepDates});
    this.persist({stepStatus, stepDates});
  }
  progressOf(item){
    const done = item.steps.filter(s=>this.stepStatusOf(s)==='done').length;
    return {done, total: item.steps.length, label: done+'/'+item.steps.length, pct: item.steps.length ? Math.round(done/item.steps.length*100)+'%' : '0%'};
  }

  lastPracticed(){
    const last = {};
    this.state.sessions.forEach(s=>{ if(!last[s.activity] || s.date > last[s.activity]) last[s.activity] = s.date; });
    return last;
  }
  computeRotation(){
    const last = this.lastPracticed();
    const todayId = DAYS[(new Date().getDay()+6)%7].id;
    const entries = this.effectiveRotation()[todayId]||[];
    const planned = entries.map(e=>e.act);
    const fixtures = {};
    entries.forEach(e=>{ if(e.fixture) fixtures[e.act] = e.fixture; });
    const extras = (this.state.extraToday[toKey(new Date())]||[]).filter(a=>planned.indexOf(a)<0);
    return {ids: planned.concat(extras), extras, last, fixtures};
  }
  daysAgoLabel(dateStr){
    if(!dateStr) return 'Never logged';
    const then = new Date(dateStr+'T00:00:00'); const now = new Date(); now.setHours(0,0,0,0);
    const diff = Math.round((now-then)/86400000);
    if(diff<=0) return 'Practised today';
    if(diff===1) return 'Last practised yesterday';
    return 'Last practised '+diff+' days ago';
  }

  checklistKey(){ return toKey(new Date()); }
  isChecked(id){ return this.isDoneOn(this.checklistKey(), id); }
  toggleChecklist(id){
    const key = this.checklistKey();
    const day = Object.assign({}, this.state.checklist[key]);
    day[id] = !this.isChecked(id);
    const checklist = Object.assign({}, this.state.checklist, {[key]: day});
    this.setState({checklist});
    this.persist({checklist});
  }
  ensoFor(checked, stroke){
    return checked
      ? {fill:'color-mix(in srgb, '+stroke+' 12%, transparent)', stroke, strokeWidth:3, dasharray:'none'}
      : {fill:'none', stroke, strokeWidth:1.5, dasharray:'62 12'};
  }
  jumpToLog(actId, projectId){
    this.setState({tab:'log', form: Object.assign({}, blankForm(actId), {
      projectIds: projectId ? [projectId] : [],
    })});
  }

  effectiveRotation(){
    const r = this.state.routine;
    const last = this.lastPracticed();
    const stale = ROTATION_POOL.slice().sort((a,b)=>{ const da=last[a]||'', db=last[b]||''; return da<db?-1:da>db?1:0; });
    const rot = {};
    if(!stale.length){ DAYS.forEach(d=>{ rot[d.id] = []; }); return rot; }
    const pins = r.pins||[];
    DAYS.forEach((d,di)=>{
      const want = this.effectiveSlotsFor(d.id);
      // A fixture claims its slot before anything else: an hour with a teacher
      // or a rehearsal with a band is that instrument's playing for the day,
      // and the time is not yours to move. Staleness and the hand-set plan
      // fill in around it.
      const fixtureActs = this.fixtureActsOn(d.id);
      const fixtureBy = {};
      this.fixturesOn(d.id).forEach(f=>{
        this.fixtureActsOf(f).forEach(a=>{ if(!fixtureBy[a]) fixtureBy[a] = f; });
      });
      const base = [];
      fixtureActs.forEach(a=>{ if(base.length<want && base.indexOf(a)<0) base.push(a); });
      // Pinned Ways come next — staleness never displaces them.
      const pinnedActs = pins.filter(p=>p.day===d.id).map(p=>p.act)
        .filter(a=>ROTATION_POOL.indexOf(a)>=0);
      pinnedActs.forEach(a=>{ if(base.length<want && base.indexOf(a)<0) base.push(a); });
      // then whatever was set by hand, then staleness for anything still empty
      (r.rotation[d.id]||[]).forEach(a=>{ if(base.length<want && base.indexOf(a)<0) base.push(a); });
      while(base.length < want){
        const start = (di*2 + base.length) % stale.length;
        let pick = null;
        for(let k=0;k<stale.length;k++){
          const cand = stale[(start+k) % stale.length];
          if(base.indexOf(cand)<0){ pick = cand; break; }
        }
        base.push(pick || stale[start]);
      }
      rot[d.id] = base.map(x=>({act:x, moved:false, pinned: pinnedActs.indexOf(x)>=0,
        fixture: fixtureBy[x] || null}));
    });
    if(r.variant === 'thu'){
      // A fixture does not move when the day is given to work — neither the
      // teacher's hour nor the band's is yours to redistribute. Only the free
      // slots go, carrying their original index so editing one still lands on
      // Thursday.
      const moved = [];
      rot.thu.forEach((x,i)=>{ if(!x.fixture) moved.push({act:x.act, slot:i}); });
      rot.thu = rot.thu.filter(x=>x.fixture);
      if(moved[0]) rot.tue.push({act:moved[0].act, moved:true, srcDay:'thu', srcSlot:moved[0].slot});
      if(moved[1]) rot.fri.push({act:moved[1].act, moved:true, srcDay:'thu', srcSlot:moved[1].slot});
    }
    return rot;
  }
  setRotationSlot(dayId, slot, actId){
    const day = DAYS.find(d=>d.id===dayId);
    if(!day || slot<0 || slot>=this.slotsFor(dayId)) return;
    const rotation = Object.assign({}, this.state.routine.rotation);
    const arr = (rotation[dayId]||[]).slice();
    arr[slot] = actId;
    rotation[dayId] = arr;
    const routine = Object.assign({}, this.state.routine, {rotation});
    this.setState({routine});
    this.persist({routine});
  }
  cycleSlot(dayId, slot, current){
    if(!ROTATION_POOL.length) return;
    const i = ROTATION_POOL.indexOf(current);
    this.setRotationSlot(dayId, slot, ROTATION_POOL[(i+1) % ROTATION_POOL.length]);
  }
  autofill(){
    const last = this.lastPracticed();
    const order = ROTATION_POOL.slice().sort((a,b)=>{
      const da = last[a]||'', db = last[b]||'';
      return da < db ? -1 : da > db ? 1 : 0;
    });
    if(!order.length) return;
    const pins = this.state.routine.pins||[];
    const rotation = {}; let n = 0;
    DAYS.forEach(d=>{
      const slots = this.effectiveSlotsFor(d.id);
      // Fixtures and pinned Ways survive a refill; only the free slots are
      // re-derived. Fixtures first, for the same reason they come first above.
      const pinnedActs = pins.filter(p=>p.day===d.id).map(p=>p.act)
        .filter(a=>ROTATION_POOL.indexOf(a)>=0);
      const row = this.fixtureActsOn(d.id).slice(0, slots);
      pinnedActs.forEach(a=>{ if(row.length<slots && row.indexOf(a)<0) row.push(a); });
      while(row.length < slots){
        let pick = null;
        for(let k=0;k<order.length;k++){
          const cand = order[(n+k) % order.length];
          if(row.indexOf(cand)<0){ pick = cand; break; }
        }
        row.push(pick || order[n % order.length]);
        n++;
      }
      rotation[d.id] = row;
    });
    const routine = Object.assign({}, this.state.routine, {rotation});
    this.setState({routine});
    this.persist({routine});
  }
  addToPlan(actId){
    const rot = this.state.routine.rotation;
    const counts = {};
    Object.keys(rot).forEach(k=>rot[k].forEach(a=>{ counts[a]=(counts[a]||0)+1; }));
    let best = null;
    DAYS.forEach(d=>{
      (rot[d.id]||[]).forEach((a,i)=>{
        const c = counts[a]||0;
        if(!best || c > best.count) best = {day:d.id, slot:i, count:c};
      });
    });
    if(best) this.setRotationSlot(best.day, best.slot, actId);
  }
  setBlock(key, value){
    const blocks = Object.assign({}, this.state.routine.blocks, {[key]: Number(value)||0});
    const routine = Object.assign({}, this.state.routine, {blocks});
    this.setState({routine});
    this.persist({routine});
  }
  toggleStrengthDay(dayId){
    const cur = this.state.routine.strengthDays||[];
    const strengthDays = cur.indexOf(dayId)>=0 ? cur.filter(d=>d!==dayId) : cur.concat([dayId]);
    const routine = Object.assign({}, this.state.routine, {strengthDays});
    this.setState({routine});
    this.persist({routine});
  }

  weeklyStats(){
    const monday = toKey(mondayOf(new Date()));
    const recent = this.state.sessions.filter(s=>s.date>=monday);
    const minutes = recent.reduce((a,s)=>a+(Number(s.minutes)||0),0);
    const counts = {};
    recent.forEach(s=>{ counts[s.activity]=(counts[s.activity]||0)+1; });
    const breakdown = Object.keys(counts).map(id=>({name:ACT_BY_ID[id].name, count:counts[id], stroke:ACT_BY_ID[id].stroke}));
    breakdown.sort((a,b)=>b.count-a.count);
    return {count: recent.length, minutes, breakdown};
  }
  visibleSessionsData(){
    let list = this.state.sessions.slice();
    if(this.state.filterActivity!=='all') list = list.filter(s=>s.activity===this.state.filterActivity);
    const sort = this.state.sort;
    if(sort==='newest') list.sort((a,b)=> a.date<b.date?1:a.date>b.date?-1:(b.id>a.id?1:-1));
    else if(sort==='oldest') list.sort((a,b)=> a.date>b.date?1:a.date<b.date?-1:0);
    else if(sort==='longest') list.sort((a,b)=> (b.minutes||0)-(a.minutes||0));
    else if(sort==='activity') list.sort((a,b)=> ACT_BY_ID[a.activity].name.localeCompare(ACT_BY_ID[b.activity].name) || (a.date<b.date?1:-1));
    return list.slice(0, 60);
  }
  removeSession(id){
    const sessions = this.state.sessions.filter(s=>s.id!==id);
    this.setState({sessions});
    this.persist({sessions});
  }
  submitSession(){
    const f = this.state.form;
    if(!f.activity || !f.minutes || Number(f.minutes)<=0){
      this.setState({logMsg: 'Add how many minutes you practised, then log it.', logMsgOk: false});
      return;
    }
    const projectIds = (f.projectIds||[]).slice();
    const goalStepIds = (f.goalStepIds||[]).slice();
    // projectId/goalId stay as the single "headline" link so older readers
    // (session card tag, CSV export, goal rollups) keep working.
    const projectId = projectIds[0] || '';
    const headProject = PROJECTS.find(x=>x.id===projectId);
    let goalId = headProject ? headProject.goalId : '';
    if(!goalId && goalStepIds.length){
      const owner = GOALS.find(g=>(g.steps||[]).some(s=>s.id===goalStepIds[0]));
      if(owner) goalId = owner.id;
    }
    const day = f.date || toKey(new Date());
    const isShaku = f.activity==='shaku';
    const usedLicks = isShaku ? (f.licks||[]) : [];
    const session = {
      id: 'log-'+Date.now(), date: day, time: f.time||'', activity: f.activity,
      minutes: Number(f.minutes), whatWorked: f.whatWorked||'', whereStuck: f.whereStuck||'',
      projectId, goalId, projectIds, goalStepIds,
      steps: isShaku ? (f.steps||[]) : [], licks: usedLicks,
    };
    const sessions = [session].concat(this.state.sessions);
    const licks = this.state.licks.map(l=>{
      if(usedLicks.indexOf(l.id)<0) return l;
      const plays = l.plays||[];
      return Object.assign({}, l, {plays: plays.indexOf(day)>=0 ? plays : plays.concat([day])});
    });
    if(f.activity === 'strength' && (f.steps||[]).length) this.advanceStrengthWorkout(1);
    const marked = projectIds.length + goalStepIds.length;
    this.setState({sessions, licks, form: blankForm(f.activity),
      logMsg: 'Logged — '+session.minutes+' min of '+actOf(f.activity).name
              + (marked ? ', '+marked+' marked' : '') + '.', logMsgOk: true});
    this.persist({sessions, licks});
  }

  // How many sessions have ticked each step, and the most recent date. This is
  // the long-term signal: a step you keep returning to is where the work is.
  stepTickStats(){
    if(this._tickCache && this._tickCacheFor === this.state.sessions) return this._tickCache;
    const out = {};
    this.state.sessions.forEach(sess=>{
      (sess.goalStepIds||[]).forEach(id=>{
        const e = out[id] || (out[id] = {count:0, last:'', minutes:0});
        e.count++;
        e.minutes += Number(sess.minutes)||0;
        if(sess.date > e.last) e.last = sess.date;
      });
    });
    this._tickCache = out; this._tickCacheFor = this.state.sessions;
    return out;
  }

  // The push/pull/legs rotation: which workout is up, and moving through it.
  strengthWorkoutNames(){ return STRENGTH_WORKOUTS.map(w=>w.name); }
  currentStrengthWorkout(){
    const names = this.strengthWorkoutNames();
    return names.indexOf(this.state.strengthWorkout) >= 0 ? this.state.strengthWorkout : names[0];
  }
  setStrengthWorkout(name){
    this.setState({strengthWorkout:name});
    this.persist({strengthWorkout:name});
  }
  advanceStrengthWorkout(step){
    const names = this.strengthWorkoutNames();
    const i = names.indexOf(this.currentStrengthWorkout());
    this.setStrengthWorkout(names[(i + (step||1) + names.length) % names.length]);
  }

  /* ---- the workout itself: sets, weight, reps ----
     Kept per date and per exercise so last time's numbers are there to beat.
     Weight and reps are free text — bands and bodyweight are not kilos. */
  targetSetCount(step){
    const m = /^\s*(\d+)/.exec(String(step.mins||''));
    return m ? Math.max(1, Math.min(10, Number(m[1]))) : 3;
  }
  setsFor(exId, dateKey){
    const key = dateKey || toKey(new Date());
    const d = this.state.strengthSets[key];
    return (d && d[exId]) ? d[exId] : null;
  }
  ensureSets(step){
    const existing = this.setsFor(step.id);
    if(existing) return existing;
    const n = this.targetSetCount(step);
    return Array.from({length:n}, ()=>({w:'', r:'', done:false}));
  }
  writeSets(exId, rows, quiet){
    const key = toKey(new Date());
    const day = Object.assign({}, this.state.strengthSets[key], {[exId]: rows});
    const strengthSets = Object.assign({}, this.state.strengthSets, {[key]: day});
    if(quiet) this.setStateQuiet({strengthSets}); else this.setState({strengthSets});
    this.persist({strengthSets});
  }
  setSetField(step, i, field, value){
    const rows = this.ensureSets(step).slice();
    rows[i] = Object.assign({}, rows[i], {[field]: value});
    this.writeSets(step.id, rows, true);   // typing must not rebuild the screen
  }
  toggleSetDone(step, i){
    const rows = this.ensureSets(step).slice();
    rows[i] = Object.assign({}, rows[i], {done: !rows[i].done});
    this.writeSets(step.id, rows, false);
  }
  addSetRow(step){ this.writeSets(step.id, this.ensureSets(step).concat([{w:'', r:'', done:false}]), false); }
  removeSetRow(step){
    const rows = this.ensureSets(step).slice();
    if(rows.length > 1) rows.pop();
    this.writeSets(step.id, rows, false);
  }
  // The most recent earlier day this exercise was worked, for the "last time" line.
  lastTimeFor(exId){
    const today = toKey(new Date());
    const days = Object.keys(this.state.strengthSets).filter(k=>k < today).sort();
    for(let i=days.length-1; i>=0; i--){
      const rows = (this.state.strengthSets[days[i]]||{})[exId];
      if(rows && rows.some(r=>r.done || r.w || r.r)) return {date:days[i], rows};
    }
    return null;
  }

  // step id -> which goal/project owns it, for rendering "worked on" entries.
  stepOwnerIndex(){
    const idx = {};
    GOALS.forEach(g => (g.steps||[]).forEach(s => { idx[s.id] = {label:s.label, parent:g.name, kind:'Goal', activities:g.activities||[]}; }));
    (this.state.projects||[]).forEach(p => (p.steps||[]).forEach(s => { idx[s.id] = {label:s.label, parent:p.name, kind:'Project', activities:p.activities||[]}; }));
    return idx;
  }
  download(name, text, type){
    const url = URL.createObjectURL(new Blob([text], {type}));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  exportJson(){
    this.download('kata-export.json', JSON.stringify({
      sessions:this.state.sessions, checklist:this.state.checklist,
      stepStatus:this.state.stepStatus, routine:this.state.routine,
    }, null, 2), 'application/json');
  }
  exportCsv(){
    const esc = v => '"'+String(v==null?'':v).replace(/"/g,'""')+'"';
    const rows = [['date','activity','minutes','project','goal','what worked','where stuck']];
    this.state.sessions.forEach(s=>{
      const p = PROJECTS.find(x=>x.id===s.projectId);
      const g = GOALS.find(x=>x.id===s.goalId);
      rows.push([s.date, ACT_BY_ID[s.activity]?ACT_BY_ID[s.activity].name:s.activity, s.minutes, p?p.name:'', g?g.name:'', s.whatWorked, s.whereStuck]);
    });
    this.download('kata-practice-log.csv', rows.map(r=>r.map(esc).join(',')).join('\n'), 'text/csv');
  }

  actChips(ids){
    return ids.map(id=>({name: ACT_BY_ID[id]?ACT_BY_ID[id].name:id, stroke: ACT_BY_ID[id]?ACT_BY_ID[id].stroke:'#7d7979'}));
  }
  rollupFor(filter){
    const rel = this.state.sessions.filter(filter);
    const mins = rel.reduce((a,s)=>a+(Number(s.minutes)||0),0);
    if(!rel.length) return 'No sessions tagged yet';
    return rel.length+' sessions · '+(mins>=60 ? (mins/60).toFixed(1)+' h' : mins+' min')+' logged';
  }

  activityOptions(){ return ACTIVITIES.map(a=>({id:a.id, name:a.name})); }

  /* ==================================================================
     Selectors — one per screen, replacing the source's single renderVals().
     ================================================================== */

  selectNav(){
    const state = this.state;
    const nav = {};
    ['today','log','routine','strength','goals','study','library','settings'].forEach(id=>{
      nav[id] = {select: ()=>this.setState({tab:id}), color: state.tab===id ? 'var(--color-accent)' : MUTED};
    });
    return {
      nav,
      todayLabel: new Date().toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'}),
      tab: state.tab,
    };
  }

  selectToday(){
    const state = this.state;
    const muted = MUTED;
    const rotation = this.computeRotation();
    const mkItem = (id, sub) => {
      const a = ACT_BY_ID[id];
      const enso = this.ensoFor(this.isChecked(id), a.stroke);
      return {name:a.name, sub, toggle:()=>this.toggleChecklist(id), logIt:()=>this.jumpToLog(id,''),
              fill:enso.fill, stroke:enso.stroke, strokeWidth:enso.strokeWidth, dasharray:enso.dasharray};
    };
    const todayKey = toKey(new Date());
    const rotationItems = rotation.ids.map(id=>{
      const it = mkItem(id, this.daysAgoLabel(rotation.last[id]));
      const extra = rotation.extras.indexOf(id)>=0;
      // A fixture day says whose hour it is rather than how stale the Way is —
      // "last practised 4 days ago" is not the useful fact when you are about
      // to sit down with Kevin, or in front of the band.
      const fx = (rotation.fixtures||{})[id];
      return Object.assign(it, {isExtra: extra, drop: ()=>this.dropInstrumentToday(id),
        isFixture: !!fx, fixtureKind: fx ? fx.kind : '',
        sub: extra ? 'Added for today only'
           : fx ? this.fixtureMark(fx.kind)+' '+fx.name+' · '+this.clockLabel(fx.time)+' · '+fx.mins+' min'+this.fixtureAlsoLabel(fx)
           : it.sub});
    });
    const wod = this.wordOfDay();
    const studied = state.jpStudied[todayKey];
    const word = Object.assign({}, wod, {
      studied: !!studied,
      markLabel: studied ? '✓ Studied today — counts toward Japanese' : 'Mark studied · adds to Japanese',
      markBorder: studied ? 'var(--color-accent)' : 'var(--color-divider)',
      markBg: studied ? 'var(--color-accent-100)' : 'transparent',
      markColor: studied ? 'var(--color-accent-800)' : 'var(--color-accent-700)',
      mark: ()=>this.markWord(wod),
    });
    const anchorItems = state.instruments.filter(a=>a.anchor).map(a=>a.id).map(id=>{
      const it = mkItem(id, this.isChecked(id) ? 'Done today' : 'Daily anchor');
      return Object.assign(it, {hasWord: id==='jpn' && PROPS.showQuote, word: id==='jpn' ? word : null, isExtra:false});
    });
    // Which mode is up today, and out of which parent scale. Derived from the
    // date alone — nothing to set, nothing to remember.
    const scale = Object.assign({}, scaleOfDay(), {
      onRotation: rotation.ids.indexOf('trumpet')>=0 || rotation.ids.indexOf('piano')>=0,
    });
    const usedToday = rotation.ids.concat(state.instruments.filter(a=>a.anchor).map(a=>a.id));
    const addableToday = ACTIVITIES.filter(a=>usedToday.indexOf(a.id)<0 && a.id!=='other').map(a=>({
      name:a.name, add: ()=>this.addInstrumentToday(a.id),
      border:'var(--color-divider)', color: a.stroke,
    }));
    const todayTasks = this.tasksOn(todayKey).map(t=>{
      const a = ACT_BY_ID[t.act] || {name:t.act, stroke:'#7d7979'};
      const done = this.isTaskDone(t.id, todayKey);
      const parent = this.taskParentOf(this.taskLinkOf(t));
      return {name:t.name, actName:a.name, stroke:a.stroke, done,
        parentName: parent ? parent.name : '', parentKind: parent ? parent.kind : '',
        whenLabel: this.taskWhenLabel(t),
        boxFill: done ? a.stroke : 'transparent', boxStroke: done ? a.stroke : 'color-mix(in srgb, var(--color-text) 30%, transparent)',
        tickOpacity: done ? 1 : 0,
        textColor: done ? 'color-mix(in srgb, var(--color-text) 45%, transparent)' : 'var(--color-text)',
        textDecoration: done ? 'line-through' : 'none',
        toggle: ()=>this.toggleTask(t.id, todayKey),
        remove: ()=>this.removeTask(t.id)};
    });
    const peekScope = PROPS.peekScope;
    const peekHideDone = PROPS.peekHideDone;
    const inRotation = x => x.activities.some(a=>rotation.ids.indexOf(a)>=0);
    const peekSource = GOALS.filter(g=>!g.archived).map(g=>({item:g, kind:'Goal'})).concat(PROJECTS.map(p=>({item:p, kind:'Project'})));
    const peekRows = peekSource.filter(e=>peekScope==='all' || inRotation(e.item)).map(e=>{
      const pr = this.progressOf(e.item);
      let steps = e.item.steps;
      if(peekHideDone) steps = steps.filter(st=>this.stepStatusOf(st)!=='done');
      const first = e.item.activities[0];
      return {name:e.item.name, kind:e.kind, progressLabel:pr.label,
        stroke: ACT_BY_ID[first] ? ACT_BY_ID[first].stroke : '#7d7979',
        instLabel: e.item.activities.map(a=>ACT_BY_ID[a] ? ACT_BY_ID[a].name : a).join(' · '),
        steps: steps.map(st=>this.stepView(st)),
        noSteps: steps.length===0};
    }).filter(r=>!r.noSteps);
    const peekOpenCount = peekRows.reduce((a,r)=>a+r.steps.filter(st=>!st.doneLabel).length, 0);
    const goalPeek = {
      open: state.goalPeekOpen,
      rows: peekRows,
      empty: peekRows.length===0,
      buttonLabel: peekRows.length ? peekOpenCount+' open steps on today’s instruments' : 'No goals on today’s instruments',
      title: peekScope==='all' ? 'Every goal and project' : 'Riding on today’s rotation',
      subtitle: peekRows.length+' tied to '+rotation.ids.map(a=>ACT_BY_ID[a] ? ACT_BY_ID[a].name : a).join(', '),
      openIt: ()=>this.setState({goalPeekOpen:true}),
      close: ()=>this.setState({goalPeekOpen:false}),
    };
    const tasksDoneCount = todayTasks.filter(t=>t.done).length;
    const tf = state.taskForm;
    const taskDayChips = DAYS.map(d=>{
      const on = tf.days.indexOf(d.id)>=0;
      return {name:d.name, toggle:()=>this.setTaskForm({days: on ? tf.days.filter(x=>x!==d.id) : tf.days.concat([d.id])}),
        border: on ? 'var(--color-accent)' : 'var(--color-divider)',
        bg: on ? 'var(--color-accent-100)' : 'transparent',
        color: on ? 'var(--color-accent-800)' : muted};
    });

    // There may be no projects at all (fresh install, or all of them finished
    // and cleared away) — every consumer below has to tolerate that.
    const proj = state.projects.find(p=>p.id===state.activeProjectId) || state.projects[0] || null;
    const projProg = proj ? this.progressOf(proj) : null;
    const daysLeft = d => {
      if(!d) return '';
      const then = new Date(d+'T00:00:00'), now = new Date(); now.setHours(0,0,0,0);
      const n = Math.round((then-now)/86400000);
      if(n < 0) return 'ran over ' + (-n) + (n===-1?' day':' days') + ' ago';
      if(n === 0) return 'due today';
      if(n === 1) return '1 day left';
      return n + ' days left';
    };
    const activeProject = proj ? {
      id: proj.id, name: proj.name, blurb: proj.blurb, actChips: this.actChips(proj.activities),
      progressLabel: projProg.label+' done',
      goalName: (GOALS.find(g=>g.id===proj.goalId)||{}).name || '',
      untilLabel: daysLeft(proj.until),
      sprint: !!proj.sprint,
      sprintLabel: proj.sprint ? 'In sprint — on every day' : 'Sprint mode off',
      toggleSprint: ()=>this.patchProject(proj.id, {sprint: !proj.sprint}),
      openSteps: proj.steps.filter(s=>this.stepStatusOf(s)!=='done').slice(0,3).map(st=>{
        const v = this.stepView(st);
        if(!st.repeat) return Object.assign(v, {repeat:false});
        const count = this.stepDailyCount(st.id);
        const target = Number(st.target)||0;
        return Object.assign(v, {
          repeat: true,
          doneToday: this.isStepDoneToday(st.id),
          toggleToday: ()=>this.toggleStepDay(st.id),
          repeatLabel: target ? count+'/'+target
            : st.until ? 'to '+labelFor(st.until) : String(count),
        });
      }),
      // Editing the push without leaving Today: the steps are the work, and
      // they change while you are doing them.
      editing: !!state.todayProjectEdit,
      toggleEdit: ()=>this.setState({todayProjectEdit: !state.todayProjectEdit}),
      allSteps: proj.steps.map(st=>{
        const v = this.stepView(st);
        const count = this.stepDailyCount(st.id);
        const target = Number(st.target)||0;
        return {label: st.label, tickLabel: v.tickLabel, tickTitle: v.tickTitle,
          repeat: !!st.repeat, target: target ? String(target) : '', until: st.until||'',
          doneToday: this.isStepDoneToday(st.id),
          dailyCount: count,
          repeatLabel: st.repeat
            ? (target ? count+' of '+target+' days'
               : st.until ? 'until '+labelFor(st.until)
               : count+(count===1?' day':' days'))
            : '',
          toggleToday: ()=>this.toggleStepDay(st.id),
          toggleRepeat: ()=>this.setStepRepeat(proj.id, st.id, {repeat: !st.repeat}),
          setTarget: e=>this.setStepRepeat(proj.id, st.id, {target: Number(e.target.value)||0}),
          setUntil: e=>this.setStepRepeat(proj.id, st.id, {until: e.target.value}),
          statusLabel: this.stepStatusOf(st),
          fill: v.fill, stroke: v.stroke, dash: v.dash, color: v.color,
          cycle: v.cycle,
          rename: e=>this.renameProjectStep(proj.id, st.id, e.target.value),
          remove: ()=>this.removeProjectStep(proj.id, st.id)};
      }),
      newStep: state.newStep[proj.id]||'',
      setNewStep: e=>{ const o=Object.assign({},state.newStep); o[proj.id]=e.target.value; this.setStateQuiet({newStep:o}); },
      addStep: ()=>{ this.addProjectStep(proj.id, this.state.newStep[proj.id]||''); const o=Object.assign({},this.state.newStep); delete o[proj.id]; this.setState({newStep:o}); },
      rename: e=>this.patchProject(proj.id, {name:e.target.value}),
      setBlurb: e=>this.patchProject(proj.id, {blurb:e.target.value}),
      setUntil: e=>this.patchProject(proj.id, {until:e.target.value}),
      until: proj.until||'',
      logIt: ()=>this.jumpToLog(proj.activities[0], proj.id),
      remove: ()=>this.removeProject(proj.id),
    } : null;
    const projectChips = state.projects.map(p=>{
      const on = p.id===state.activeProjectId;
      return {name:p.name, select:()=>{ this.setState({activeProjectId:p.id}); this.persist({activeProjectId:p.id}); },
              border: on ? 'var(--color-accent)' : 'var(--color-divider)',
              bg: on ? 'var(--color-accent-100)' : 'transparent',
              color: on ? 'var(--color-accent-800)' : muted};
    });
    const pf = state.projectForm;
    const projectForm = {
      open: pf.open, name: pf.name, blurb: pf.blurb, steps: pf.steps, until: pf.until, goalId: pf.goalId,
      goalOptions: GOALS.filter(g=>!g.archived).map(g=>({value:g.id, name:g.name})),
      actChips: ACTIVITIES.filter(a=>a.id!=='other').map(a=>{
        const on = pf.activities.indexOf(a.id)>=0;
        return {name:a.name, toggle:()=>this.toggleProjectActivity(a.id),
          border: on ? a.stroke : 'var(--color-divider)',
          bg: on ? 'color-mix(in srgb, '+a.stroke+' 10%, transparent)' : 'transparent',
          color: on ? a.stroke : muted};
      }),
      setName: e=>this.setProjectForm({name:e.target.value}),
      setBlurb: e=>this.setProjectForm({blurb:e.target.value}),
      setGoal: e=>this.setProjectForm({goalId:e.target.value}),
      setSteps: e=>this.setProjectForm({steps:e.target.value}),
      setUntil: e=>this.setProjectForm({until:e.target.value}),
      sprint: !!pf.sprint,
      toggleSprint: ()=>this.setProjectForm({sprint: !pf.sprint}),
      openIt: ()=>this.setProjectForm({open:true}),
      cancel: ()=>this.setProjectForm({open:false, name:'', blurb:'', goalId:'', activities:[], steps:'', until:'', sprint:false}),
      submit: ()=>this.addProject(),
    };

    return {
      todayHeading: state.mode==='project' ? 'The sprint continues.' : 'Today’s rotation.',
      isDefaultMode: state.mode==='default', isProjectMode: state.mode==='project',
      setDefaultMode: ()=>{ this.setState({mode:'default'}); this.persist({mode:'default'}); },
      setProjectMode: ()=>{ this.setState({mode:'project'}); this.persist({mode:'project'}); },
      projectChips, activeProject, hasProjects: state.projects.length>0, projectForm,
      rotationItems, anchorItems,
      scale, showScale: PROPS.showScale,
      goToLog: ()=>this.setState({tab:'log'}),
      addableToday, hasAddable: addableToday.length>0,
      goalPeek,
      // What today actually carries, not the week's default — Saturday has its
      // own override, and a fixture can raise the floor above either.
      rotationSizeLabel: (n=>n+(n===1?' slot':' slots'))(this.effectiveSlotsFor(DAYS[(new Date().getDay()+6)%7].id)),
      todayTasks, hasTodayTasks: todayTasks.length>0, noTodayTasks: todayTasks.length===0,
      tasksSummary: tasksDoneCount+' of '+todayTasks.length+' done',
      taskForm: tf, taskFormOpen: tf.open, taskFormClosed: !tf.open, taskDayChips,
      taskModeDaily: tf.mode==='daily', taskModeWeekdays: tf.mode==='weekdays',
      taskModeDate: tf.mode==='date', taskModeRange: tf.mode==='range',
      openTaskForm: ()=>this.setTaskForm({open:true}),
      cancelTask: ()=>this.setTaskForm({open:false, name:''}),
      setTaskName: e=>this.setTaskForm({name:e.target.value}),
      setTaskLink: e=>this.setTaskForm({link:e.target.value}),
      taskLinkOptions: (()=>{
        const out = [];
        (state.projects||[]).forEach(p=>out.push({value:'p:'+p.id, name:'▸ '+p.name}));
        GOALS.filter(g=>!g.archived).forEach(g=>out.push({value:'g:'+g.id, name:'◦ '+g.name}));
        return out;
      })(),
      taskMsg: state.taskMsg,
      clearTaskMsg: ()=>this.setState({taskMsg:''}),
      setTaskMode: e=>this.setTaskForm({mode:e.target.value}),
      setTaskDate: e=>this.setTaskForm({date:e.target.value}),
      setTaskFrom: e=>this.setTaskForm({from:e.target.value}),
      setTaskTo: e=>this.setTaskForm({to:e.target.value}),
      addTask: ()=>this.addTask(),
      activityOptions: this.activityOptions(),
    };
  }

  selectLog(){
    const state = this.state;
    const muted = MUTED;
    const act = state.form.activity;
    const linkProjects = PROJECTS.filter(p=>p.activities.indexOf(act)>=0).map(p=>({value:'p:'+p.id, name:p.name}));
    const linkGoals = GOALS.filter(g=>!g.archived && g.activities.indexOf(act)>=0).map(g=>({value:'g:'+g.id, name:g.name}));

    /* --- what was worked on: several projects and several goal steps --- */
    const pickedProjects = state.form.projectIds||[];
    const pickedSteps = state.form.goalStepIds||[];
    const toggleIn = (list, id) => list.indexOf(id)>=0 ? list.filter(x=>x!==id) : list.concat([id]);
    // Anything already ticked stays visible even after switching activity, so a
    // selection can't silently vanish from the form.
    const projectPicks = PROJECTS.filter(p=>p.activities.indexOf(act)>=0 || pickedProjects.indexOf(p.id)>=0).map(p=>{
      const on = pickedProjects.indexOf(p.id)>=0;
      const stroke = actOf((p.activities||[])[0]).stroke;
      return {id:p.id, name:p.name, on,
        toggle: ()=>this.setState({form: Object.assign({}, state.form, {projectIds: toggleIn(pickedProjects, p.id)})}),
        border: on ? stroke : 'var(--color-divider)',
        bg: on ? 'color-mix(in srgb, '+stroke+' 10%, transparent)' : 'transparent',
        color: on ? stroke : muted};
    });
    const stepPickGroups = GOALS.filter(g=>!g.archived && (g.activities.indexOf(act)>=0 || (g.steps||[]).some(s=>pickedSteps.indexOf(s.id)>=0)))
      .map(g=>({
        name: g.name,
        stroke: actOf((g.activities||[])[0]).stroke,
        steps: (g.steps||[]).map(s=>{
          const on = pickedSteps.indexOf(s.id)>=0;
          return {id:s.id, label:s.label, on,
            toggle: ()=>this.setState({form: Object.assign({}, state.form, {goalStepIds: toggleIn(pickedSteps, s.id)})}),
            mark: on ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-text) 30%, transparent)',
            fill: on ? 'var(--color-accent)' : 'transparent',
            color: on ? 'var(--color-text)' : MUTED};
        }),
      })).filter(g=>g.steps.length);
    const workedCount = pickedProjects.length + pickedSteps.length;
    const actName = ACT_BY_ID[act] ? ACT_BY_ID[act].name : 'this';
    const linkHint = (linkProjects.length+linkGoals.length) ? 'what '+actName+' feeds' : 'nothing tied to '+actName+' yet';
    const shakuStroke = actOf(act).stroke;
    const actSteps = this.stepsFor(act);
    const isShakuLog = actSteps.length>0 && PROPS.routineInLog;
    const cuesDefaultOpen = !!PROPS.routineOpenCues;
    const formSteps = state.form.steps||[];
    const formLicks = state.form.licks||[];
    const isStrength = act === 'strength';
    const curWorkout = this.currentStrengthWorkout();
    const visiblePhases = isStrength
      ? phasesFor(act).filter(ph=>ph === curWorkout)
      : phasesFor(act);
    const shakuPhases = visiblePhases.filter(ph=>actSteps.some(s=>s.phase===ph)).map(ph=>({
      phase: ph,
      steps: actSteps.filter(s=>s.phase===ph).map(s=>{
        const on = formSteps.indexOf(s.id)>=0;
        const open = state.openCue[s.id]===undefined ? cuesDefaultOpen : !!state.openCue[s.id];
        return {label:s.label, mins:this.minsLabel(s.mins), cues:s.cues.map(t=>({text:t})), open,
          chevron: open ? 'rotate(180deg)' : 'rotate(0deg)',
          toggle: ()=>this.toggleFormStep(s.id),
          toggleCue: ()=>{ const o=Object.assign({},state.openCue); o[s.id]=!open; this.setState({openCue:o}); },
          mark: on ? shakuStroke : 'var(--color-divider)',
          fill: on ? 'color-mix(in srgb, '+shakuStroke+' 22%, transparent)' : 'transparent',
          dash: on ? 'none' : '3 3',
          labelColor: on ? shakuStroke : 'var(--color-text)',
          rate: this.stepRateLabel(s.id, act)};
      })
    }));
    const stepCountLabel = formSteps.length+' of '+actSteps.length+' ticked';
    const lickChips = state.licks.map(l=>{
      const on = formLicks.indexOf(l.id)>=0;
      return {name:l.name, toggle: ()=>this.toggleFormLick(l.id),
        border: on ? shakuStroke : 'var(--color-divider)',
        bg: on ? 'color-mix(in srgb, '+shakuStroke+' 10%, transparent)' : 'transparent',
        color: on ? shakuStroke : muted};
    });
    const lf = state.lickForm;
    const weekly = this.weeklyStats();
    const ownerIdx = this.stepOwnerIndex();
    const visibleSessions = this.visibleSessionsData().map(s=>{
      const a = actOf(s.activity);
      const p = PROJECTS.find(x=>x.id===s.projectId);
      const g = GOALS.find(x=>x.id===s.goalId);
      return {
        activityName:a.name, stroke:a.stroke,
        dateLabel: labelFor(s.date) + (s.time ? ' · '+s.time : ''), minutes:s.minutes,
        linkName: p ? p.name : (g ? g.name : ''),
        workedProjects: (s.projectIds||[]).map(id=>{
          const pr = PROJECTS.find(x=>x.id===id);
          return {name: pr ? pr.name : 'project', stroke: pr ? actOf((pr.activities||[])[0]).stroke : '#7d7979'};
        }),
        workedSteps: (s.goalStepIds||[]).map(id=>{
          const o = ownerIdx[id];
          return {label: o ? o.label : 'step', parent: o ? o.parent : ''};
        }),
        whatWorked:s.whatWorked, whereStuck:s.whereStuck,
        quick: !!s.quick, fillIn: ()=>this.fillInQuick(s.id),
        routineLabel: (s.steps||[]).length ? (s.steps||[]).length+' of '+this.stepsFor(s.activity).length+' routine steps' : '',
        lickTags: (s.licks||[]).map(id=>{ const l = this.state.licks.find(x=>x.id===id); return {name: l ? l.name : 'lick'}; }),
        stuckOpen: !!state.stuckOpen[s.id],
        chevronRotate: state.stuckOpen[s.id] ? 'rotate(180deg)' : 'rotate(0deg)',
        toggleStuck: ()=>{ const o=Object.assign({},state.stuckOpen); o[s.id]=!o[s.id]; this.setState({stuckOpen:o}); },
        remove: ()=>this.removeSession(s.id),
      };
    });

    return {
      form: state.form,
      setFormDate: e=>this.setFormQuiet({date:e.target.value}),
      setFormActivity: e=>this.setState({form: Object.assign({}, state.form, {activity:e.target.value})}),
      setFormTime: e=>this.setFormQuiet({time:e.target.value}),
      setFormMinutes: e=>this.setFormQuiet({minutes:e.target.value}),
      isShakuLog, shakuPhases, stepCountLabel, lickChips,
      noLicks: state.licks.length===0,
      lickFormOpen: lf.open,
      lickForm: lf,
      lickSourceOptions: LICK_SOURCES.map(s=>({value:s, name:s})),
      openLickForm: ()=>this.setLickForm({open:!lf.open}),
      setLickName: e=>this.setLickForm({name:e.target.value}),
      setLickSource: e=>this.setLickForm({source:e.target.value}),
      setLickNotation: e=>this.setLickForm({notation:e.target.value}),
      setLickNote: e=>this.setLickForm({note:e.target.value}),
      addLickFromLog: ()=>this.addLick(true),
      addLickFromLibrary: ()=>this.addLick(false),
      setFormWorked: e=>this.setFormQuiet({whatWorked:e.target.value}),
      setFormStuck: e=>this.setFormQuiet({whereStuck:e.target.value}),
      submitSession: ()=>this.submitSession(),
      logMsg: state.logMsg, logMsgOk: state.logMsgOk,
      clearLogMsg: ()=>this.setState({logMsg:'', logMsgOk:false}),
      activityOptions: this.activityOptions(),
      isStrength,
      showLicks: act === 'shaku',
      strengthWorkout: curWorkout,
      strengthFocus: (STRENGTH_WORKOUTS.find(w=>w.name===curWorkout)||{}).focus || '',
      strengthChips: STRENGTH_WORKOUTS.map(w=>({
        name: w.name, focus: w.focus, on: w.name===curWorkout,
        select: ()=>this.setStrengthWorkout(w.name),
      })),
      nextStrengthWorkout: ()=>this.advanceStrengthWorkout(1),
      prevStrengthWorkout: ()=>this.advanceStrengthWorkout(-1),
      linkProjects, linkGoals, linkHint,
      projectPicks, stepPickGroups, workedCount,
      workedLabel: workedCount ? workedCount+' marked' : 'nothing marked yet',
      weekly, sort: state.sort, setSort: e=>this.setState({sort:e.target.value}),
      filterActivity: state.filterActivity, setFilter: e=>this.setState({filterActivity:e.target.value}),
      hasNoEntries: visibleSessions.length===0, visibleSessions,
      exportJson: ()=>this.exportJson(), exportCsv: ()=>this.exportCsv(),
    };
  }

  selectStrength(){
    const state = this.state;
    const cur = this.currentStrengthWorkout();
    const steps = this.stepsFor('strength').filter(x=>x.phase === cur);
    const a = actOf('strength');

    const exercises = steps.map(step=>{
      const rows = this.ensureSets(step);
      const last = this.lastTimeFor(step.id);
      const doneCount = rows.filter(r=>r.done).length;
      return {
        id: step.id, label: step.label, target: step.mins,
        cues: (step.cues||[]).map(t=>({text:t})),
        hasCues: (step.cues||[]).length > 0,
        open: !!state.openCue[step.id],
        toggleCues: ()=>{ const o=Object.assign({},state.openCue); o[step.id]=!state.openCue[step.id]; this.setState({openCue:o}); },
        doneCount, total: rows.length,
        complete: doneCount > 0 && doneCount === rows.length,
        sets: rows.map((r,i)=>({
          n: i+1, w: r.w, r: r.r, done: r.done,
          setW: e=>this.setSetField(step, i, 'w', e.target.value),
          setR: e=>this.setSetField(step, i, 'r', e.target.value),
          toggle: ()=>this.toggleSetDone(step, i),
        })),
        addSet: ()=>this.addSetRow(step),
        removeSet: ()=>this.removeSetRow(step),
        lastLabel: last
          ? labelFor(last.date) + ' — ' + last.rows.filter(r=>r.w||r.r)
              .map(r=>(r.w||'—')+'×'+(r.r||'—')).join(', ')
          : 'No record yet — this is the baseline.',
      };
    });

    const doneEx = exercises.filter(e=>e.complete).length;
    return {
      name: a.name, jp: a.jp, stroke: a.stroke,
      workout: cur,
      focus: (STRENGTH_WORKOUTS.find(w=>w.name===cur)||{}).focus || '',
      chips: STRENGTH_WORKOUTS.map(w=>({name:w.name, on:w.name===cur, select:()=>this.setStrengthWorkout(w.name)})),
      next: ()=>this.advanceStrengthWorkout(1),
      prev: ()=>this.advanceStrengthWorkout(-1),
      exercises,
      hasExercises: exercises.length > 0,
      doneLabel: doneEx + ' of ' + exercises.length + ' done',
      pct: exercises.length ? Math.round(doneEx/exercises.length*100) + '%' : '0%',
      minutes: state.strengthMinutes,
      setMinutes: e=>this.setStateQuiet({strengthMinutes: e.target.value}),
      canFinish: doneEx > 0,
      finishMsg: state.logMsg,
      clearFinishMsg: ()=>this.setState({logMsg:'', logMsgOk:false}),
      finish: ()=>this.finishWorkout(),
    };
  }

  // Turns the ticked sets into a real session, then moves the rotation on.
  finishWorkout(){
    const cur = this.currentStrengthWorkout();
    const steps = this.stepsFor('strength').filter(x=>x.phase === cur);
    const done = steps.filter(st=>{
      const rows = this.setsFor(st.id);
      return rows && rows.some(r=>r.done);
    });
    if(!done.length){
      this.setState({logMsg:'Tick at least one set before finishing.', logMsgOk:false});
      return;
    }
    const mins = Number(this.state.strengthMinutes) || 45;
    const session = {
      id: 'log-'+Date.now(), date: toKey(new Date()), time: nowTime(), activity: 'strength',
      minutes: mins, whatWorked: cur, whereStuck: '', projectId: '', goalId: '',
      projectIds: [], goalStepIds: [], steps: done.map(x=>x.id), licks: [],
    };
    const sessions = [session].concat(this.state.sessions);
    this.setState({sessions, strengthMinutes:'',
      logMsg: 'Logged — '+cur+', '+done.length+' of '+steps.length+' exercises, '+mins+' min.', logMsgOk:true});
    this.persist({sessions});
    this.advanceStrengthWorkout(1);
  }

  selectRoutine(){
    const state = this.state;
    const muted = MUTED;
    const rot = this.effectiveRotation();
    const blocks = state.routine.blocks;
    // Fixtures serve a list of Ways, so the editor picks them with chips rather
    // than a dropdown. Every Way is offered, including the ones outside the
    // rotation — a band that you also conduct is the case this exists for.
    const fixtureChips = (f, patch) => {
      const on = this.fixtureActsOf(f);
      return ACTIVITIES.filter(a=>a.id!=='other').map(a=>{
        const picked = on.indexOf(a.id)>=0;
        return {
          name: a.name, picked,
          border: picked ? a.stroke : 'var(--color-divider)',
          bg: picked ? 'color-mix(in srgb, '+a.stroke+' 10%, transparent)' : 'transparent',
          color: picked ? a.stroke : muted,
          // Never let the last one go — a fixture with no Way claims nothing
          // and reads as a blank row.
          toggle: ()=>{
            const next = picked ? on.filter(x=>x!==a.id) : on.concat([a.id]);
            if(next.length) patch({acts: next});
          },
        };
      });
    };
    const fixtureActsLabel = f => this.fixtureActsOf(f).map(a=>actOf(a).name).join(' · ');
    const todayId = DAYS[(new Date().getDay()+6)%7].id;
    const todayKey = toKey(new Date());
    const weekDays = DAYS.map(d=>{
      const list = [];
      list.push({actId:'ear', label:'Ear '+blocks.ear+'m', editable:false});
      // A fixture serving two Ways claims two slots, so it appears on two rows.
      // Each leads with its own Way — otherwise the rows read as duplicates —
      // and only the first carries the non-rotating extras.
      const alsoShown = {};
      (rot[d.id]||[]).forEach((entry, i)=>{
        const a = actOf(entry.act);
        // A fixture slot names the commitment and the hour, and cannot be
        // cycled to another Way — the appointment is why the slot exists.
        if(entry.fixture){
          const f = entry.fixture;
          const also = alsoShown[f.id] ? '' : this.fixtureAlsoLabel(f);
          alsoShown[f.id] = true;
          list.push({actId:entry.act, editable:false, lesson:true,
                     label:this.fixtureMark(f.kind)+' '+a.name+' · '+f.name+' '
                           + this.clockLabel(f.time)+' '+f.mins+'m'+also});
          return;
        }
        list.push({actId:entry.act,
                   label:(entry.moved?'‹ ':'')+(entry.pinned?'◆ ':'')+a.name+' '+(i===0?blocks.a:blocks.b)+'m',
                   editable:true, pinned:!!entry.pinned,
                   cycle:()=>this.cycleSlot(entry.srcDay||d.id, entry.srcSlot==null?i:entry.srcSlot, entry.act)});
      });
      list.push({actId:'jpn', label:'Japanese '+blocks.jpn+'m', editable:false});
      list.push({actId:'other', label:'Bike + immersion '+blocks.cardio+'m', editable:false});
      if((state.routine.strengthDays||[]).indexOf(d.id)>=0) list.push({actId:'strength', label:'Strength '+blocks.strength+'m', editable:false});
      const empty = (rot[d.id]||[]).length===0;
      return {
        name:d.name, fixedLabel: empty ? 'Given to work — no practice' : d.fixed,
        isToday: d.id===todayId, opacity: empty ? 0.45 : 1,
        blocks: list.map(b=>{
          const a = actOf(b.actId);
          return {label:b.label, stroke:a.stroke, cycle: b.cycle || (()=>{}),
                  borderStyle: b.editable ? 'solid' : 'dashed',
                  bg: b.editable ? 'color-mix(in srgb, '+a.stroke+' 7%, transparent)' : 'transparent',
                  cursor: b.editable ? 'pointer' : 'default'};
        }),
      };
    });
    const weekMonday = mondayOf(new Date());
    const weekGrid = DAYS.map((d,di)=>{
      const dd = new Date(weekMonday); dd.setDate(dd.getDate()+di);
      const dk = toKey(dd);
      const items = [];
      items.push({actId:'ear', label:'Ear', mins:blocks.ear, firm:false});
      (rot[d.id]||[]).forEach((e,i)=>items.push(e.fixture
        ? {actId:e.act, label:abbrOf(e.act)+this.fixtureMark(e.fixture.kind), mins:e.fixture.mins,
           firm:true, fixture:true, fixtureName:e.fixture.name}
        : {actId:e.act, label:(e.moved?'‹':'')+abbrOf(e.act)+(e.pinned?'◆':''), mins:(i===0?blocks.a:blocks.b), firm:true, pinned:!!e.pinned}));
      items.push({actId:'jpn', label:'JP', mins:blocks.jpn, firm:false});
      items.push({actId:'other', label:'Bike', mins:blocks.cardio, firm:false});
      if((state.routine.strengthDays||[]).indexOf(d.id)>=0) items.push({actId:'strength', label:'Str', mins:blocks.strength, firm:false});
      const tappable = dk<=todayKey;
      const doneCount = items.filter(b=>this.isDoneOn(dk, b.actId)).length;
      return {
        name:d.name, dateNum: String(dd.getDate()), isToday: dk===todayKey,
        doneLabel: doneCount ? doneCount+'/'+items.length : '',
        headBg: dk===todayKey ? 'var(--color-accent-100)' : 'transparent',
        headColor: dk===todayKey ? 'var(--color-accent-800)' : 'var(--color-text)',
        slots: String(this.effectiveSlotsFor(d.id)),
        inc: ()=>this.setDaySlots(d.id, this.slotsFor(d.id)+1),
        dec: ()=>this.setDaySlots(d.id, this.slotsFor(d.id)-1),
        items: items.map(b=>{
          const a = actOf(b.actId);
          const sess = this.sessionFor(dk, b.actId);
          const done = this.isDoneOn(dk, b.actId);
          const detailed = !!sess;
          return {label:b.label, mins:String(b.mins), stroke:a.stroke, done,
                  title: (b.fixture ? b.fixtureName+' · ' : '') + a.name+' · '+b.mins+' min planned · ' + (detailed ? sess.minutes+' min logged' : done ? 'ticked — tap to clear' : (tappable ? 'tap to mark done' : 'later this week')),
                  bg: done ? 'color-mix(in srgb, '+a.stroke+' 26%, transparent)'
                           : (b.firm ? 'color-mix(in srgb, '+a.stroke+' 10%, transparent)' : 'transparent'),
                  borderStyle: done ? 'solid' : (b.firm ? 'solid' : 'dashed'),
                  labelWeight: done ? '600' : '400',
                  tickOpacity: done ? 1 : 0,
                  cursor: tappable ? 'pointer' : 'default',
                  toggle: tappable ? (()=>this.toggleQuickLog(dk, b.actId)) : (()=>{})};
        }),
        // The strips carry project work, not the generic daily habits — a
        // project lands on its due date, or on every day while it is in sprint.
        tasks: (state.projects||[]).filter(p => p.sprint || (p.until && p.until===dk)).map(p=>{
          const a = actOf((p.activities||[])[0]);
          const due = p.until===dk;
          const pr = this.progressOf(p);
          const done = pr.total>0 && pr.done===pr.total;
          return {name: (due ? '▲ ' : '') + p.name + ' ' + pr.label,
                  stroke: a.stroke,
                  title: p.name+' · '+(due ? 'due today' : 'in sprint')+' · '+pr.label+' done',
                  opacity: done ? 0.45 : 1, decoration: done ? 'line-through' : 'none',
                  toggle: ()=>this.setState({tab:'today', mode:'project', activeProjectId:p.id})};
        }),
      };
    });
    const gridLegend = ROTATION_POOL.concat(['ear','jpn','strength']).map(id=>({name:actOf(id).name, abbr:abbrOf(id), stroke:actOf(id).stroke}));
    const allTasks = state.tasks.map(t=>{
      const a = actOf(t.act);
      return {name:t.name, actName:a.name, stroke:a.stroke, whenLabel:this.taskWhenLabel(t), remove:()=>this.removeTask(t.id)};
    });
    const planCounts = {};
    Object.keys(rot).forEach(k=>rot[k].forEach(e=>{ planCounts[e.act]=(planCounts[e.act]||0)+1; }));
    const basis = state.coverageBasis;
    const since = basis==='week' ? toKey(mondayOf(new Date())) : toKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const loggedCounts = {};
    state.sessions.filter(s=>s.date>=since).forEach(s=>{ loggedCounts[s.activity]=(loggedCounts[s.activity]||0)+1; });
    const coverage = ROTATION_POOL.map(id=>{
      const a = ACT_BY_ID[id];
      const plan = planCounts[id]||0, logged = loggedCounts[id]||0;
      const missing = plan===0;
      return {
        name:a.name, stroke:a.stroke, logged,
        note: missing ? 'Not in this week’s plan' : plan+'× in the week’s plan',
        missing,
        countColor: logged===0 ? 'var(--color-accent-700)' : 'var(--color-text)',
        borderStyle: (missing || logged===0) ? 'dashed' : 'solid',
        borderColor: (missing || logged===0) ? 'var(--color-accent)' : 'var(--color-divider)',
        bg: missing ? 'var(--color-accent-100)' : 'transparent',
        addToPlan: ()=>this.addToPlan(id),
      };
    }).sort((a,b)=>a.logged-b.logged);
    const morningTotal = (()=>{
      // The first instrument slot takes block A, every further slot takes B.
      // This used to be hard-coded to a+b, which undercounted any day carrying
      // a third or fourth slot.
      const slots = Math.max(1, state.routine.rotationSize||2);
      const t = blocks.ear + blocks.a + blocks.b*(slots-1) + blocks.jpn + blocks.cardio;
      return Math.floor(t/60)+' h '+(t%60)+' min';
    })();
    const strengthToggles = DAYS.map(d=>{
      const on = (state.routine.strengthDays||[]).indexOf(d.id)>=0;
      return {name:d.name, toggle:()=>this.toggleStrengthDay(d.id),
              border: on ? '#3a2f28' : 'var(--color-divider)',
              bg: on ? 'color-mix(in srgb, #3a2f28 8%, transparent)' : 'transparent',
              color: on ? '#3a2f28' : muted};
    });

    return {
      isVariantCurrent: state.routine.variant==='current', isVariantThu: state.routine.variant==='thu',
      setVariantCurrent: ()=>{ const routine=Object.assign({},state.routine,{variant:'current'}); this.setState({routine}); this.persist({routine}); },
      setVariantThu: ()=>{ const routine=Object.assign({},state.routine,{variant:'thu'}); this.setState({routine}); this.persist({routine}); },
      weekDays, autofillRotation: ()=>this.autofill(), coverage,
      calendarUrl: this.calendarEmbedUrl(),
      hasCalendar: !!(state.calendarId||'').trim(),
      calendarView: state.calendarView||'AGENDA',
      setCalendarView: v=>{ this.setState({calendarView:v}); this.persist({calendarView:v}); },
      calOpen: state.libOpen.cal===undefined ? true : !!state.libOpen.cal,
      toggleCal: ()=>{ const o=Object.assign({},state.libOpen); o.cal = !(state.libOpen.cal===undefined ? true : !!state.libOpen.cal); this.setState({libOpen:o}); },
      lessons: (state.routine.lessons||[]).map(l=>({
        name:l.name, day:l.day, time:l.time, mins:String(l.mins||60),
        stroke: actOf(this.fixtureActsOf(l)[0]).stroke,
        actChips: fixtureChips(l, patch=>this.patchLesson(l.id, patch)),
        actsLabel: fixtureActsLabel(l),
        dayName: (DAYS.find(d=>d.id===l.day)||{}).name || l.day,
        whenLabel: 'Every '+((DAYS.find(d=>d.id===l.day)||{}).name||l.day)+' at '+this.clockLabel(l.time)+' · '+(l.mins||60)+' min',
        setName: e=>this.patchLesson(l.id, {name:e.target.value}),
        setDay: e=>this.patchLesson(l.id, {day:e.target.value}),
        setTime: e=>this.patchLesson(l.id, {time:e.target.value}),
        setMins: e=>this.patchLesson(l.id, {mins:Number(e.target.value)||60}),
        remove: ()=>this.removeLesson(l.id),
      })),
      bands: (state.routine.bands||[]).map(b=>({
        name:b.name, day:b.day, time:b.time, mins:String(b.mins||120),
        stroke: actOf(this.fixtureActsOf(b)[0]).stroke,
        actChips: fixtureChips(b, patch=>this.patchBand(b.id, patch)),
        actsLabel: fixtureActsLabel(b),
        dayName: (DAYS.find(d=>d.id===b.day)||{}).name || b.day,
        whenLabel: 'Every '+((DAYS.find(d=>d.id===b.day)||{}).name||b.day)+' at '+this.clockLabel(b.time)+' · '+(b.mins||120)+' min',
        setName: e=>this.patchBand(b.id, {name:e.target.value}),
        setDay: e=>this.patchBand(b.id, {day:e.target.value}),
        setTime: e=>this.patchBand(b.id, {time:e.target.value}),
        setMins: e=>this.patchBand(b.id, {mins:Number(e.target.value)||120}),
        remove: ()=>this.removeBand(b.id),
      })),
      addBand: ()=>this.addBand(),
      // Per-day load. The default applies to any day without an override; a day
      // carrying fixtures shows the floor they set, since that part is not
      // yours to tune down.
      daySlots: DAYS.map(d=>{
        const set = (state.routine.slotsByDay||{})[d.id];
        const own = this.slotsFor(d.id);
        const eff = this.effectiveSlotsFor(d.id);
        const fixed = this.fixtureActsOn(d.id).length;
        return {
          name: d.name, count: String(own), isDefault: set==null,
          note: fixed ? fixed+' held by '+(fixed===1?'a fixture':'fixtures')
                      : (set==null ? 'Following the default' : 'Set for this day'),
          overLabel: eff>own ? '→ '+eff : '',
          inc: ()=>this.setDaySlots(d.id, own+1),
          dec: ()=>this.setDaySlots(d.id, own-1),
          reset: ()=>this.clearDaySlots(d.id),
        };
      }),
      dayOptions: DAYS.map(d=>({value:d.id, name:d.name})),
      pins: (state.routine.pins||[]).map(pin=>({
        act:pin.act, day:pin.day,
        name: actOf(pin.act).name, jp: actOf(pin.act).jp||'',
        stroke: actOf(pin.act).stroke,
        whenLabel: 'Every '+((DAYS.find(d=>d.id===pin.day)||{}).name||pin.day),
        setAct: e=>this.patchPin(pin.id, {act:e.target.value}),
        setDay: e=>this.patchPin(pin.id, {day:e.target.value}),
        remove: ()=>this.removePin(pin.id),
      })),
      rotationOptions: ROTATION_POOL.map(id=>({id, name:actOf(id).name})),
      addPin: ()=>this.addPin(),
      activityOptions: this.activityOptions(),
      addLesson: ()=>this.addLesson(),
      weekGrid, gridLegend, allTasks,
      isViewList: state.routineView==='list', isViewGrid: state.routineView==='grid',
      setViewList: ()=>this.setState({routineView:'list'}),
      setViewGrid: ()=>this.setState({routineView:'grid'}),
      viewListColor: state.routineView==='list' ? 'var(--color-accent-700)' : muted,
      viewGridColor: state.routineView==='grid' ? 'var(--color-accent-700)' : muted,
      viewListUnderline: state.routineView==='list' ? 'var(--color-accent)' : 'transparent',
      viewGridUnderline: state.routineView==='grid' ? 'var(--color-accent)' : 'transparent',
      settingsOpen: state.settingsOpen,
      toggleSettings: ()=>this.setState({settingsOpen:!state.settingsOpen}),
      settingsChevron: state.settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      rotationSize: String(state.routine.rotationSize||2),
      incRotation: ()=>this.setRotationSize((state.routine.rotationSize||2)+1),
      decRotation: ()=>this.setRotationSize((state.routine.rotationSize||2)-1),
      basisWeekColor: basis==='week' ? 'var(--color-accent-700)' : muted,
      basisMonthColor: basis==='month' ? 'var(--color-accent-700)' : muted,
      basisWeekUnderline: basis==='week' ? 'var(--color-accent)' : 'transparent',
      basisMonthUnderline: basis==='month' ? 'var(--color-accent)' : 'transparent',
      setBasisWeek: ()=>this.setState({coverageBasis:'week'}),
      setBasisMonth: ()=>this.setState({coverageBasis:'month'}),
      blocks, morningTotal, strengthToggles,
      setBlockEar: e=>this.setBlock('ear', e.target.value),
      setBlockA: e=>this.setBlock('a', e.target.value),
      setBlockB: e=>this.setBlock('b', e.target.value),
      setBlockJpn: e=>this.setBlock('jpn', e.target.value),
      setBlockCardio: e=>this.setBlock('cardio', e.target.value),
      setBlockStrength: e=>this.setBlock('strength', e.target.value),
    };
  }

  selectGoals(){
    const state = this.state;
    const muted = MUTED;
    const studyByGoal = {};
    state.study.forEach(x=>{ if(x.goalId && x.status!=='Archived') studyByGoal[x.goalId]=(studyByGoal[x.goalId]||0)+1; });
    const areaChips = ['All'].concat(AREAS).map(name=>{
      const on = state.area===name;
      return {name, select:()=>this.setState({area:name}),
              border: on ? 'var(--color-accent)' : 'var(--color-divider)',
              bg: on ? 'var(--color-accent-100)' : 'transparent',
              color: on ? 'var(--color-accent-800)' : muted};
    });
    const inArea = x => state.area==='All' || x.area===state.area;
    const projectCards = PROJECTS.filter(inArea).map(p=>{
      const pr = this.progressOf(p);
      return {
        name:p.name, blurb:p.blurb, actChips:this.actChips(p.activities),
        progressLabel: pr.label, progressPct: pr.pct,
        open: !!state.openProjects[p.id],
        chevron: state.openProjects[p.id] ? 'rotate(180deg)' : 'rotate(0deg)',
        stepsLabel: (pr.total-pr.done)+' steps open',
        toggleOpen: ()=>{ const o=Object.assign({},state.openProjects); o[p.id]=!o[p.id]; this.setState({openProjects:o}); },
        steps: p.steps.map(s=>this.stepView(s)),
        rollup: this.rollupFor(s=>s.projectId===p.id),
      };
    });
    const projectChipRow = [{id:'all', name:'All goals'}].concat((state.projects||[]).map(p=>({id:p.id, name:p.name})))
      .map(o=>{
        const on = (state.goalProjectFilter||'all')===o.id;
        return {name:o.name, select: ()=>this.setState({goalProjectFilter:o.id}),
          border: on ? 'var(--color-accent)' : 'var(--color-divider)',
          bg: on ? 'var(--color-accent-100)' : 'transparent',
          color: on ? 'var(--color-accent-800)' : MUTED};
      });
    const MUSIC_SUB = ['piano','shaku','shino','trumpet','taiko','comp','ear'];
    const goalRows = [];
    const rowBase = {isHeader:false, isGoal:false, title:'', name:'', area:'', progressLabel:'', doneLabel:'', stroke:'#7d7979', steps:[], rollup:'', canArchive:false, archive:()=>{}, archivedLabel:'', restore:()=>{}};
    const pushHeader = (title, stroke) => goalRows.push(Object.assign({}, rowBase, {isHeader:true, title, stroke}));
    const pushGoal = g => {
      const pr = this.progressOf(g);
      const at = this.completedAt(g);
      goalRows.push(Object.assign({}, rowBase, {
        isGoal:true, name:g.name, area:g.area, progressLabel:pr.label,
        canArchive: !!at, archive: ()=>this.archiveGoal(g.id),
        stroke: ACT_BY_ID[g.activities[0]] ? ACT_BY_ID[g.activities[0]].stroke : '#7d7979',
        doneLabel: at ? (at==='earlier' ? 'Complete' : 'Complete · '+labelFor(at)) : '',
        steps: g.steps.map(s=>this.stepView(s)),
        rollup: this.rollupFor(s=>s.goalId===g.id),
        studyLabel: studyByGoal[g.id] ? studyByGoal[g.id]+' in the study list' : '',
        projects: (state.projects||[]).filter(p=>p.goalId===g.id).map(p=>({
          name:p.name, stroke: actOf((p.activities||[])[0]).stroke,
          open: ()=>this.setState({tab:'today', mode:'project', activeProjectId:p.id}),
        })),
        nextUp: (()=>{
          const nxt = g.steps.find(st=>this.stepStatusOf(st)!=='done');
          if(!nxt) return null;
          const v = this.stepView(nxt);
          return {label: nxt.label, tickLabel: v.tickLabel, tickTitle: v.tickTitle,
                  markDone: ()=>this.setStepStatus(nxt, 'done')};
        })(),
      }));
    };
    const projFilter = state.goalProjectFilter || 'all';
    const projFilterGoalIds = projFilter==='all' ? null
      : new Set((state.projects||[]).filter(p=>p.id===projFilter).map(p=>p.goalId).filter(Boolean));
    const inProjFilter = g => !projFilterGoalIds || projFilterGoalIds.has(g.id);
    const filteredGoals = GOALS.filter(g=>inArea(g) && !g.archived && inProjFilter(g));
    const musicGoals = filteredGoals.filter(g=>g.area==='Music');
    MUSIC_SUB.forEach(actId=>{
      const grp = musicGoals.filter(g=>g.activities[0]===actId);
      if(!grp.length) return;
      pushHeader(ACT_BY_ID[actId].name, ACT_BY_ID[actId].stroke);
      grp.forEach(pushGoal);
    });
    const genericMusic = musicGoals.filter(g=>MUSIC_SUB.indexOf(g.activities[0])<0);
    if(genericMusic.length){ pushHeader('Music — general', '#7d7979'); genericMusic.forEach(pushGoal); }
    AREAS.filter(a=>a!=='Music').forEach(area=>{
      const grp = filteredGoals.filter(g=>g.area===area);
      if(!grp.length) return;
      pushHeader(area, '#3a2f28');
      grp.forEach(pushGoal);
    });
    const archivedRows = [];
    const archived = GOALS.filter(g=>g.archived && inArea(g));
    const pushArchHeader = (title, stroke) => archivedRows.push(Object.assign({}, rowBase, {isHeader:true, title, stroke}));
    const pushArch = g => {
      const pr = this.progressOf(g);
      archivedRows.push(Object.assign({}, rowBase, {isGoal:true, name:g.name, area:g.area, progressLabel:pr.label,
        stroke: actOf((g.activities||[])[0]).stroke,
        archivedLabel: 'Archived '+labelFor(g.archived),
        rollup: this.rollupFor(s=>s.goalId===g.id),
        restore: ()=>this.unarchiveGoal(g.id)}));
    };
    const archMusic = archived.filter(g=>g.area==='Music');
    MUSIC_SUB.forEach(actId=>{
      const grp = archMusic.filter(g=>g.activities[0]===actId);
      if(!grp.length) return;
      pushArchHeader(actOf(actId).name, actOf(actId).stroke);
      grp.forEach(pushArch);
    });
    const archGeneric = archMusic.filter(g=>MUSIC_SUB.indexOf(g.activities[0])<0);
    if(archGeneric.length){ pushArchHeader('Music — general', '#7d7979'); archGeneric.forEach(pushArch); }
    AREAS.filter(a=>a!=='Music').forEach(area=>{
      const grp = archived.filter(g=>g.area===area);
      if(!grp.length) return;
      pushArchHeader(area, '#3a2f28');
      grp.forEach(pushArch);
    });
    const archivedSec = (()=>{
      const open = !!state.libOpen.archived;
      return {open, count:String(archived.length),
        chevron: open ? 'rotate(180deg)' : 'rotate(0deg)',
        toggle: ()=>{ const o=Object.assign({},state.libOpen); o.archived=!open; this.setState({libOpen:o}); }};
    })();
    const gf = state.goalForm;
    const goalActChips = ACTIVITIES.map(a=>{
      const on = gf.activities.indexOf(a.id)>=0;
      return {name:a.name, toggle:()=>this.setGoalForm({activities: on ? gf.activities.filter(x=>x!==a.id) : gf.activities.concat([a.id])}),
              border: on ? a.stroke : 'var(--color-divider)',
              bg: on ? 'color-mix(in srgb, '+a.stroke+' 10%, transparent)' : 'transparent',
              color: on ? a.stroke : muted};
    });

    return {
      areaChips, projectChipRow, projectCards, goalRows,
      archivedRows, archivedSec, hasArchived: archived.length>0,
      goalForm: gf, goalFormOpen: gf.open, goalFormClosed: !gf.open, goalActChips,
      areaOptions: AREAS,
      openGoalForm: ()=>this.setGoalForm({open:true}),
      cancelGoal: ()=>this.setState({goalForm:{open:false, name:'', area:'Music', activities:[], steps:''}}),
      setGoalName: e=>this.setGoalForm({name:e.target.value}),
      setGoalArea: e=>this.setGoalForm({area:e.target.value}),
      setGoalSteps: e=>this.setGoalForm({steps:e.target.value}),
      addGoal: ()=>this.addGoal(),
    };
  }

  selectStudy(){
    const state = this.state;
    return {
      studySheetUrl: PROPS.studySheetUrl,
      studyFormUrl: PROPS.studyFormUrl,
      studyEmbedOpen: state.studyEmbed,
      studyEmbedLabel: state.studyEmbed ? 'Hide the form' : 'Show the form',
      toggleStudyEmbed: ()=>this.setState({studyEmbed: !state.studyEmbed}),
    };
  }

  selectLibrary(){
    const state = this.state;
    const muted = MUTED;
    const totalMins = state.sessions.reduce((a,s)=>a+(Number(s.minutes)||0),0);
    const allSteps = GOALS.concat(PROJECTS).reduce((a,x)=>a.concat(x.steps),[]);
    const stepsDone = allSteps.filter(s=>this.stepStatusOf(s)==='done').length;
    const overallStats = [
      // One decimal, matching the per-instrument figures — rounding to whole
      // hours reported a 30-minute session as "1 h".
      {value: (totalMins/60).toFixed(1)+' h', label:'Logged all time'},
      {value: String(state.sessions.length), label:'Sessions'},
      {value: stepsDone+'/'+allSteps.length, label:'Steps completed'},
    ];
    const instChips = ACTIVITIES.map(a=>{
      const on = a.id===state.libraryAct;
      return {name:a.name, select:()=>this.setState({libraryAct:a.id}),
              border: on ? a.stroke : 'var(--color-divider)',
              bg: on ? 'color-mix(in srgb, '+a.stroke+' 10%, transparent)' : 'transparent',
              color: on ? a.stroke : muted};
    });
    const la = ACT_BY_ID[state.libraryAct];
    const mine = state.sessions.filter(s=>s.activity===state.libraryAct);
    const myMins = mine.reduce((a,s)=>a+(Number(s.minutes)||0),0);
    const lastDate = mine.reduce((a,s)=> !a||s.date>a ? s.date : a, '');
    const monthStart = toKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const monthMins = mine.filter(s=>s.date>=monthStart).reduce((a,s)=>a+(Number(s.minutes)||0),0);
    const myGoals = GOALS.filter(g=>!g.archived && g.activities.indexOf(state.libraryAct)>=0);
    const myProjects = PROJECTS.filter(p=>p.activities.indexOf(state.libraryAct)>=0);
    const myStepsAll = myGoals.concat(myProjects).reduce((a,x)=>a.concat(x.steps),[]);
    const myStepsDone = myStepsAll.filter(s=>this.stepStatusOf(s)==='done').length;
    const weekBuckets = [];
    for(let w=7; w>=0; w--){
      const start = mondayOf(new Date()); start.setDate(start.getDate()-w*7);
      const end = new Date(start); end.setDate(end.getDate()+7);
      const sk = toKey(start), ek = toKey(end);
      weekBuckets.push(mine.filter(s=>s.date>=sk && s.date<ek).reduce((a,s)=>a+(Number(s.minutes)||0),0));
    }
    // The real peak is what gets displayed; `divisor` is only a guard so an
    // all-zero history doesn't divide by zero (it used to leak into the label
    // as a phantom "peak 1 min" on a completely empty log).
    const peak = Math.max.apply(null, weekBuckets.concat([0]));
    const divisor = peak || 1;
    const spark = weekBuckets.map((v,i)=>{
      const h = peak ? Math.max(1, Math.round(v/divisor*48)) : 0;
      return {x: i*32+2, y: 52-h, h, fill: v ? 'color-mix(in srgb, '+la.stroke+' 16%, transparent)' : 'transparent', stroke: v ? la.stroke : 'var(--color-divider)'};
    });
    const inst = {
      name: la.name, jp: la.jp||'', jpR: la.jpR||'', stroke: la.stroke,
      kindLabel: la.anchor ? 'Daily anchor' : (ROTATION_POOL.indexOf(la.id)>=0 ? 'In the rotation' : 'Catch-all'),
      lastLabel: this.daysAgoLabel(lastDate),
      stats: [
        {value: (myMins/60).toFixed(1)+' h', label:'Total logged'},
        {value: String(mine.length), label:'Sessions'},
        {value: mine.length ? Math.round(myMins/mine.length)+'m' : '—', label:'Avg session'},
        {value: (monthMins/60).toFixed(1)+' h', label:'This month'},
        {value: myStepsDone+'/'+myStepsAll.length, label:'Steps done'},
        {value: String(myGoals.length+myProjects.length), label:'Goals + projects'},
      ],
      spark, sparkPeak: peak,
      goals: myGoals.map(g=>{
        const at = this.completedAt(g);
        return {name:g.name, area:g.area, progressLabel:this.progressOf(g).label,
          open: !!state.openLibGoals[g.id],
          chevron: state.openLibGoals[g.id] ? 'rotate(180deg)' : 'rotate(0deg)',
          doneLabel: at ? (at==='earlier' ? ' · complete' : ' · complete '+labelFor(at)) : '',
          toggle: ()=>{ const o=Object.assign({},state.openLibGoals); o[g.id]=!o[g.id]; this.setState({openLibGoals:o}); },
          steps: g.steps.map(s=>this.stepView(s))};
      }),
      projects: myProjects.map(p=>({name:p.name, progressLabel:this.progressOf(p).label,
        minutesLabel: this.rollupFor(s=>s.projectId===p.id)})),
      noGoals: myGoals.length===0, noProjects: myProjects.length===0,
      stuckNotes: (()=>{
        const seen = {}; const out = [];
        mine.filter(s=>s.whereStuck).slice().sort((a,b)=> a.date<b.date?1:a.date>b.date?-1:0).forEach(s=>{
          if(seen[s.whereStuck] || out.length>=3) return;
          seen[s.whereStuck] = true;
          out.push({text:s.whereStuck, date:labelFor(s.date)});
        });
        return out;
      })(),
      noStuck: mine.filter(s=>s.whereStuck).length===0,
      accomplishments: (()=>{
        const out = [];
        myGoals.concat(myProjects).forEach(x=>x.steps.forEach(s=>{
          if(this.stepStatusOf(s)!=='done') return;
          const at = this.stepDoneAt(s);
          out.push({label:s.label, parent:x.name, date: at ? labelFor(at) : 'date not recorded', sortKey: at||''});
        }));
        out.sort((a,b)=> a.sortKey<b.sortKey?1:a.sortKey>b.sortKey?-1:0);
        return out;
      })(),
    };
    inst.noAccomplishments = inst.accomplishments.length===0;

    // Everything ticked under "Worked on" while logging, newest first. Unlike
    // accomplishments (a step *finished*), this is a record of attention:
    // the same step can appear on many dates.
    inst.workedLog = (()=>{
      const idx = this.stepOwnerIndex();
      const out = [];
      mine.forEach(sess=>{
        const when = labelFor(sess.date) + (sess.time ? ' · '+sess.time : '');
        (sess.projectIds||[]).forEach(pid=>{
          const pr = (state.projects||[]).find(x=>x.id===pid);
          if(pr) out.push({label: pr.name, parent: 'Project', date: when, sortKey: sess.date+(sess.time||'')});
        });
        (sess.goalStepIds||[]).forEach(sid=>{
          const o = idx[sid];
          if(o) out.push({label: o.label, parent: o.parent, date: when, sortKey: sess.date+(sess.time||'')});
        });
      });
      // Ensō ticks: "I did this today" with no session behind it. They are a
      // real completion, so they belong in the history as a plain line.
      Object.keys(state.checklist||{}).forEach(k=>{
        if(!state.checklist[k][state.libraryAct]) return;
        if(mine.some(x=>x.date===k)) return;  // a logged session already covers it
        out.push({label: la.name, parent: 'Marked done', date: labelFor(k), sortKey: k, tick: true});
      });
      out.sort((a,b)=> a.sortKey<b.sortKey?1:a.sortKey>b.sortKey?-1:0);
      return out.slice(0, 60);
    })();
    inst.noWorkedLog = inst.workedLog.length===0;

    const secOpen = k => state.libOpen[k]===undefined ? true : !!state.libOpen[k];
    const mkSec = (k, count) => ({open: secOpen(k), count: String(count),
      chevron: secOpen(k) ? 'rotate(180deg)' : 'rotate(0deg)',
      toggle: ()=>{ const o=Object.assign({},state.libOpen); o[k]=!secOpen(k); this.setState({libOpen:o}); }});
    const gs = state.goalSort;
    inst.goals = inst.goals.slice().sort((a,b)=>{
      if(gs==='alpha') return a.name.localeCompare(b.name);
      if(gs==='progress') return parseInt(b.progressLabel)-parseInt(a.progressLabel);
      if(gs==='done') return (b.doneLabel?1:0)-(a.doneLabel?1:0);
      return 0;
    });
    const myTasks = state.tasks.filter(t=>t.act===state.libraryAct);
    const last30 = (()=>{ const d=new Date(); d.setDate(d.getDate()-29); return toKey(d); })();
    inst.tasks = myTasks.map(t=>{
      let hits = 0, due = 0;
      Object.keys(state.taskDone).forEach(k=>{ if(k>=last30 && state.taskDone[k][t.id]) hits++; });
      for(let i=0;i<30;i++){ const d=new Date(); d.setDate(d.getDate()-i); if(this.taskOccursOn(t, toKey(d))) due++; }
      let streak = 0;
      for(let i=0;i<120;i++){
        const d=new Date(); d.setDate(d.getDate()-i); const k=toKey(d);
        if(!this.taskOccursOn(t,k)) continue;
        if(this.isTaskDone(t.id,k)) streak++; else break;
      }
      return {name:t.name, whenLabel:this.taskWhenLabel(t), stroke:la.stroke,
        rateLabel: hits+'/'+due+' in 30 days',
        streakLabel: streak>1 ? streak+' in a row' : (streak===1 ? 'started' : 'cold'),
        streakColor: streak>1 ? 'var(--color-accent-700)' : 'color-mix(in srgb, var(--color-text) 45%, transparent)'};
    });
    inst.noTasks = inst.tasks.length===0;
    inst.showWords = state.libraryAct==='jpn';
    inst.words = Object.keys(state.jpStudied).sort().reverse().map(k=>{
      const e = state.jpStudied[k];
      const q = Q_BY_ID[e.quoteId || e.wordId] || null;
      const ch = TIME_CHUNKS.find(c=>c.id===e.chunk) || TIME_CHUNKS[0];
      if(!q) return {w:'—', reading:'', en:'', date:labelFor(k), quoteJp:'', quoteR:'', quoteEn:'', source:'', sourceSub:'', chunkLabel:ch.jp};
      return {w:q.word.w, reading:q.word.k+' · '+q.word.r, en:q.word.en, date:labelFor(k),
        quoteJp:q.jp, quoteR:q.r, quoteEn:q.en,
        source:q.author+'『'+q.work+'』', sourceSub:q.authorR+' · '+q.year,
        chunkLabel: ch.jp+' ('+ch.en+')'};
    });
    inst.noWords = inst.words.length===0;
    inst.secGoals = mkSec('goals', inst.goals.length);
    inst.secProjects = mkSec('projects', inst.projects.length);
    inst.secTasks = mkSec('tasks', inst.tasks.length);
    inst.secWords = mkSec('words', inst.words.length);
    inst.showShaku = state.libraryAct==='shaku';
    const libSteps = this.stepsFor(state.libraryAct);
    inst.showRoutine = libSteps.length>0;
    const lickFormForLib = state.lickForm;
    inst.routine = phasesFor(state.libraryAct).filter(ph=>libSteps.some(s=>s.phase===ph)).map(ph=>({
      phase: ph,
      steps: libSteps.filter(s=>s.phase===ph).map(s=>{
        const open = !!state.openCue['lib-'+s.id];
        return {label:s.label, mins:this.minsLabel(s.mins), cues:(s.cues||[]).map(t=>({text:t})), open, rate:this.stepRateLabel(s.id, state.libraryAct),
          chevron: open ? 'rotate(180deg)' : 'rotate(0deg)',
          toggle: ()=>{ const o=Object.assign({},state.openCue); o['lib-'+s.id]=!open; this.setState({openCue:o}); }};
      })
    }));
    inst.licks = state.licks.map(l=>this.lickView(l));
    inst.noLicks = inst.licks.length===0;
    inst.secRoutine = mkSec('routine', libSteps.length);
    inst.secLicks = mkSec('licks', inst.licks.length);
    inst.secStuck = mkSec('stuck', inst.stuckNotes.length);
    // One history: what was worked on and what was finished, newest first.
    // These were two sections of identical shape reading as one story.
    inst.history = inst.workedLog.map(w=>Object.assign({}, w, {kind: w.tick ? 'tick' : 'worked'}))
      .concat(inst.accomplishments.map(a=>Object.assign({}, a, {kind:'done'})))
      .sort((a,b)=> a.sortKey<b.sortKey?1:a.sortKey>b.sortKey?-1:0)
      .slice(0, 80);
    inst.noHistory = inst.history.length===0;
    inst.secHistory = mkSec('history', inst.history.length);
    inst.secChart = mkSec('chart', 8);

    const lq = state.libQuery.trim().toLowerCase();
    const hit = s => String(s||'').toLowerCase().indexOf(lq)>=0;
    const libGroups = [];
    if(lq){
      const push = (title, rows) => { if(rows.length) libGroups.push({title, count:String(rows.length), rows:rows.slice(0,8)}); };
      push('Instruments', ACTIVITIES.filter(a=>hit(a.name)).map(a=>({
        title:a.name, sub:'Open in the library', meta:'', stroke:a.stroke, go:()=>this.setState({libraryAct:a.id, libQuery:''})})));
      push('Quotations', QUOTES.filter(q=>hit(q.jp)||hit(q.r)||hit(q.en)||hit(q.author)||hit(q.authorR)||hit(q.work)||hit(q.theme)||hit(q.word.w)||hit(q.word.k)||hit(q.word.r)||hit(q.word.en)).map(q=>({
        title:q.jp, sub:q.author+'『'+q.work+'』 · '+q.word.w+' ('+q.word.r+') '+q.word.en, meta:q.year,
        stroke:ACT_BY_ID.jpn.stroke, go:()=>this.setState({libraryAct:'jpn', libQuery:''})})));
      push('Licks & phrases', state.licks.filter(l=>hit(l.name)||hit(l.source)||hit(l.notation)||hit(l.note)).map(l=>({
        title:l.name, sub:l.source+(l.notation?' · '+l.notation:''), meta:(l.plays||[]).length+' plays',
        stroke:ACT_BY_ID.shaku.stroke, go:()=>this.setState({libraryAct:'shaku', libQuery:'', libOpen:Object.assign({},state.libOpen,{licks:true})})})));
      push('Routine steps', state.routineSteps.filter(s=>hit(s.label)||hit(s.phase)||(s.cues||[]).some(hit)).map(s=>({
        title:s.label, sub:actOf(s.inst).name+' · '+s.phase, meta:s.mins+' min',
        stroke:actOf(s.inst).stroke, go:()=>this.setState({libraryAct:s.inst, libQuery:'', libOpen:Object.assign({},state.libOpen,{routine:true})})})));
      push('Goals', GOALS.filter(g=>hit(g.name)||hit(g.area)).map(g=>({
        title:g.name, sub:g.area, meta:this.progressOf(g).label,
        stroke: ACT_BY_ID[g.activities[0]] ? ACT_BY_ID[g.activities[0]].stroke : '#7d7979',
        go:()=>this.setState({libraryAct:g.activities[0]||'other', libQuery:'', openLibGoals:Object.assign({},state.openLibGoals,{[g.id]:true})})})));
      push('Goal steps', GOALS.concat(PROJECTS).reduce((a,x)=>a.concat(x.steps.filter(s=>hit(s.label)).map(s=>({
        title:s.label, sub:x.name, meta:this.stepDoneAt(s) ? labelFor(this.stepDoneAt(s)) : this.stepStatusOf(s),
        stroke: ACT_BY_ID[x.activities[0]] ? ACT_BY_ID[x.activities[0]].stroke : '#7d7979',
        go:()=>this.setState({libraryAct:x.activities[0]||'other', libQuery:''})}))), []));
      push('Projects', PROJECTS.filter(p=>hit(p.name)||hit(p.blurb)).map(p=>({
        title:p.name, sub:p.blurb, meta:this.progressOf(p).label,
        stroke: ACT_BY_ID[p.activities[0]].stroke, go:()=>this.setState({libraryAct:p.activities[0], libQuery:''})})));
      push('Daily tasks', state.tasks.filter(t=>hit(t.name)).map(t=>({
        title:t.name, sub:(ACT_BY_ID[t.act]?ACT_BY_ID[t.act].name:t.act), meta:this.taskWhenLabel(t),
        stroke: ACT_BY_ID[t.act] ? ACT_BY_ID[t.act].stroke : '#7d7979',
        go:()=>this.setState({libraryAct:t.act, libQuery:''})})));
      const noteRows = [];
      state.sessions.forEach(s=>{
        if(hit(s.whereStuck) && s.whereStuck) noteRows.push({title:s.whereStuck, sub:'Stuck · '+(ACT_BY_ID[s.activity]?ACT_BY_ID[s.activity].name:s.activity), meta:labelFor(s.date), stroke:'var(--color-accent)', go:()=>this.setState({libraryAct:s.activity, libQuery:''})});
        else if(hit(s.whatWorked) && s.whatWorked) noteRows.push({title:s.whatWorked, sub:'Worked · '+(ACT_BY_ID[s.activity]?ACT_BY_ID[s.activity].name:s.activity), meta:labelFor(s.date), stroke:ACT_BY_ID[s.activity]?ACT_BY_ID[s.activity].stroke:'#7d7979', go:()=>this.setState({libraryAct:s.activity, libQuery:''})});
      });
      push('Session notes', noteRows);
    }
    const libNoResults = !!lq && libGroups.length===0;

    return {
      overallStats, instChips, inst,
      libQuery: state.libQuery, setLibQuery: e=>this.setState({libQuery:e.target.value}),
      clearLibQuery: ()=>this.setState({libQuery:''}),
      libSearching: !!lq, libNotSearching: !lq, libGroups, libNoResults,
      goalSort: state.goalSort, setGoalSort: e=>this.setState({goalSort:e.target.value}),
      lickForm: lickFormForLib, lickFormOpen: lickFormForLib.open,
      lickSourceOptions: LICK_SOURCES.map(s=>({value:s, name:s})),
      setLickName: e=>this.setLickForm({name:e.target.value}),
      setLickSource: e=>this.setLickForm({source:e.target.value}),
      setLickNotation: e=>this.setLickForm({notation:e.target.value}),
      setLickNote: e=>this.setLickForm({note:e.target.value}),
      addLickFromLibrary: ()=>this.addLick(false),
    };
  }

  selectSetup(){
    const state = this.state;
    const muted = MUTED;
    const usageOf = id => {
      const gc = state.goals.filter(g=>(g.activities||[]).indexOf(id)>=0).length;
      const rc = this.stepsFor(id).length;
      const sc = state.sessions.filter(s=>s.activity===id).length;
      return gc+(gc===1?' goal':' goals')+' · '+rc+' routine '+(rc===1?'step':'steps')+' · '+sc+(sc===1?' session':' sessions');
    };
    const setupInstruments = state.instruments.map(a=>{
      const c = colorFor(a);
      return {name:a.name, jp:a.jp||'', jpR:a.jpR||'', stroke:c.stroke, usage:usageOf(a.id),
        setJp: e=>this.patchInstrument(a.id, {jp:e.target.value}),
        setJpR: e=>this.patchInstrument(a.id, {jpR:e.target.value}),
        kindLabel: a.anchor ? 'Daily anchor' : (a.rotate ? 'In the rotation' : 'Off the rotation'),
        canRotate: true, canDelete: this.canDeleteInstrument(a),
        anchor: !!a.anchor,
        anchorLabel: a.anchor ? 'Daily anchor' : 'Not an anchor',
        anchorBorder: a.anchor ? 'var(--color-accent)' : 'var(--color-divider)',
        anchorBg: a.anchor ? 'var(--color-accent-100)' : 'transparent',
        anchorColor: a.anchor ? 'var(--color-accent-800)' : muted,
        toggleAnchor: ()=>this.patchInstrument(a.id, {anchor: !a.anchor}),
        rotateLabel: a.rotate ? 'In rotation' : 'Off rotation',
        rotateBorder: a.rotate ? 'var(--color-accent)' : 'var(--color-divider)',
        rotateBg: a.rotate ? 'var(--color-accent-100)' : 'transparent',
        rotateColor: a.rotate ? 'var(--color-accent-800)' : muted,
        rename: e=>this.patchInstrument(a.id, {name:e.target.value}),
        toggleRotate: ()=>this.patchInstrument(a.id, {rotate: !a.rotate}),
        remove: ()=>this.removeInstrument(a.id)};
    });
    const insF = state.instForm;
    const hueSwatches = HUE_SWATCHES.map(h=>{
      const on = Number(insF.hue)===h;
      return {fill:'oklch(54% 0.10 '+h+')', select: ()=>this.setInstForm({hue:h}),
        ring: on ? 'oklch(54% 0.10 '+h+')' : 'transparent'};
    });
    const setupInstChips = state.instruments.map(a=>{
      const on = a.id===state.setupInst;
      const c = colorFor(a);
      return {name:a.name, count:String(this.stepsFor(a.id).length),
        select: ()=>this.setState({setupInst:a.id}),
        border: on ? c.stroke : 'var(--color-divider)',
        bg: on ? 'color-mix(in srgb, '+c.stroke+' 10%, transparent)' : 'transparent',
        color: on ? c.stroke : muted};
    });
    const setupOwnSteps = this.stepsFor(state.setupInst);
    const setupSteps = phasesFor(state.setupInst).filter(ph=>setupOwnSteps.some(s=>s.phase===ph)).map(ph=>({
      phase: ph,
      steps: setupOwnSteps.filter(s=>s.phase===ph).map(s=>({
        label:s.label, meta:s.mins+' min · '+((s.cues||[]).length)+' cues',
        remove: ()=>this.removeRoutineStep(s.id)})),
    }));
    const stF = state.stepForm;
    const setupGoals = state.goals.map(g=>{
      const pr = this.progressOf(g);
      const open = !!state.goalOpen[g.id];
      return {name:g.name, area:g.area, progressLabel:pr.label, open,
        chevron: open ? 'rotate(180deg)' : 'rotate(0deg)',
        archived: !!g.archived,
        archiveLabel: g.archived ? 'Bring back from the archive' : 'Archive this goal',
        toggleArchive: ()=>g.archived ? this.unarchiveGoal(g.id) : this.archiveGoal(g.id),
        instLabel: (g.archived ? 'Archived · ' : '') + (g.activities||[]).map(a=>actOf(a).name).join(' · '),
        stroke: actOf((g.activities||[])[0]).stroke,
        toggle: ()=>{ const o=Object.assign({},state.goalOpen); o[g.id]=!open; this.setState({goalOpen:o}); },
        rename: e=>this.patchGoal(g.id, {name:e.target.value}),
        setArea: e=>this.patchGoal(g.id, {area:e.target.value}),
        remove: ()=>this.removeGoal(g.id),
        steps: g.steps.map(s=>({label:s.label, statusLabel:this.stepStatusOf(s),
          rename: e=>this.renameGoalStep(g.id, s.id, e.target.value),
          remove:()=>this.removeGoalStep(g.id, s.id)})),
        noSteps: g.steps.length===0,
        actChips: state.instruments.map(a=>{
          const on = (g.activities||[]).indexOf(a.id)>=0;
          const c = colorFor(a);
          return {name:a.name, toggle:()=>this.toggleGoalActivity(g.id, a.id),
            border: on ? c.stroke : 'var(--color-divider)',
            bg: on ? 'color-mix(in srgb, '+c.stroke+' 10%, transparent)' : 'transparent',
            color: on ? c.stroke : muted};
        }),
        newStep: state.newStep[g.id]||'',
        setNewStep: e=>{ const o=Object.assign({},state.newStep); o[g.id]=e.target.value; this.setState({newStep:o}); },
        addStep: ()=>this.addGoalStep(g.id, state.newStep[g.id]||'')};
    });
    const mkSetupSec = (k, count) => ({open: !!state.setupOpen[k], count:String(count),
      chevron: state.setupOpen[k] ? 'rotate(180deg)' : 'rotate(0deg)',
      toggle: ()=>{ const o=Object.assign({},state.setupOpen); o[k]=!state.setupOpen[k]; this.setState({setupOpen:o}); }});

    return {
      setupInstruments, setupInstChips, setupSteps, setupGoals, hueSwatches,
      setupInstName: actOf(state.setupInst).name,
      setupStepsEmpty: setupOwnSteps.length===0,
      secInstruments: mkSetupSec('inst', state.instruments.length),
      secRoutines: mkSetupSec('routines', state.routineSteps.length),
      secGoals: mkSetupSec('goals', state.goals.length),
      instForm: insF, instFormOpen: insF.open,
      openInstForm: ()=>this.setInstForm({open:!insF.open}),
      setInstName: e=>this.setInstForm({name:e.target.value}),
      setInstJp: e=>this.setInstForm({jp:e.target.value}),
      setInstJpR: e=>this.setInstForm({jpR:e.target.value}),
      toggleInstRotate: ()=>this.setInstForm({rotate: !insF.rotate}),
      instFormAnchor: !!insF.anchor,
      toggleInstAnchor: ()=>this.setInstForm({anchor: !insF.anchor}),
      instFormAnchorLabel: insF.anchor ? 'Daily anchor' : 'Not an anchor',
      instFormRotateLabel: insF.rotate ? 'Goes in the rotation' : 'Outside the rotation',
      instFormRotateBorder: insF.rotate ? 'var(--color-accent)' : 'var(--color-divider)',
      instFormRotateBg: insF.rotate ? 'var(--color-accent-100)' : 'transparent',
      instFormRotateColor: insF.rotate ? 'var(--color-accent-800)' : muted,
      addInstrument: ()=>this.addInstrument(),
      stepForm: stF, stepFormOpen: stF.open,
      phaseOptions: phasesFor(state.setupInst),
      openStepForm: ()=>this.setStepForm({open:!stF.open}),
      setStepPhase: e=>this.setStepForm({phase:e.target.value}),
      setStepLabel: e=>this.setStepForm({label:e.target.value}),
      setStepMins: e=>this.setStepForm({mins:e.target.value}),
      setStepCues: e=>this.setStepForm({cues:e.target.value}),
      addRoutineStep: ()=>this.addRoutineStep(),
      restoreDefaultRoutines: ()=>this.restoreDefaultRoutines(),
      routineMsg: state.routineMsg,
      clearRoutineMsg: ()=>this.setState({routineMsg:''}),
      newGoalFromSetup: ()=>{ this.setState({tab:'goals'}); this.setGoalForm({open:true}); },
      resetArmed: state.resetArmed, resetIdle: !state.resetArmed,
      armReset: ()=>this.setState({resetArmed:true}),
      cancelReset: ()=>this.setState({resetArmed:false}),
      doReset: ()=>this.resetSetup(),
      areaOptions: AREAS,
      setupProjects: state.projects.map(p=>{
        const pr = this.progressOf(p);
        const open = !!state.goalOpen[p.id];
        return {name:p.name, progressLabel:pr.label, open, until:p.until||'',
          chevron: open ? 'rotate(180deg)' : 'rotate(0deg)',
          stroke: actOf((p.activities||[])[0]).stroke,
          goalName: (GOALS.find(x=>x.id===p.goalId)||{}).name || 'Not tied to a goal',
          instLabel: (p.activities||[]).map(a=>actOf(a).name).join(' · '),
          toggle: ()=>{ const o=Object.assign({},state.goalOpen); o[p.id]=!open; this.setState({goalOpen:o}); },
          rename: e=>this.patchProject(p.id, {name:e.target.value}),
          setBlurb: e=>this.patchProject(p.id, {blurb:e.target.value}),
          setUntil: e=>this.patchProject(p.id, {until:e.target.value}),
          sprint: !!p.sprint,
          sprintLabel: p.sprint ? 'In sprint — shows every day' : 'Sprint mode off',
          toggleSprint: ()=>this.patchProject(p.id, {sprint: !p.sprint}),
          setGoal: e=>this.patchProject(p.id, {goalId:e.target.value}),
          blurb: p.blurb||'',
          goalOptions: GOALS.filter(x=>!x.archived).map(x=>({value:x.id, name:x.name})),
          remove: ()=>this.removeProject(p.id),
          noSteps: (p.steps||[]).length===0,
          steps: (p.steps||[]).map(st=>({label:st.label, statusLabel:this.stepStatusOf(st),
            rename: e=>this.renameProjectStep(p.id, st.id, e.target.value),
            remove: ()=>this.removeProjectStep(p.id, st.id)})),
          actChips: state.instruments.map(a=>{
            const on = (p.activities||[]).indexOf(a.id)>=0;
            const c = colorFor(a);
            return {name:a.name, toggle:()=>{
                const cur = p.activities||[];
                const next = on ? cur.filter(x=>x!==a.id) : cur.concat([a.id]);
                this.patchProject(p.id, {activities: next.length ? next : ['other']});
              },
              border: on ? c.stroke : 'var(--color-divider)',
              bg: on ? 'color-mix(in srgb, '+c.stroke+' 10%, transparent)' : 'transparent',
              color: on ? c.stroke : muted};
          }),
          newStep: state.newStep[p.id]||'',
          setNewStep: e=>{ const o=Object.assign({},state.newStep); o[p.id]=e.target.value; this.setState({newStep:o}); },
          addStep: ()=>{ this.addProjectStep(p.id, state.newStep[p.id]||''); const o=Object.assign({},state.newStep); delete o[p.id]; this.setState({newStep:o}); }};
      }),
      secProjects: mkSetupSec('projects', state.projects.length),
      setupTasks: state.tasks.map(t=>{
        const parent = this.taskParentOf(this.taskLinkOf(t));
        const a = actOf(t.act);
        return {name:t.name, stroke:a.stroke, actName:a.name,
          parentName: parent ? parent.name : 'Orphaned — pick something',
          whenLabel: this.taskWhenLabel(t),
          link: this.taskLinkOf(t),
          mode: t.mode, days: t.days||[], date:t.date||'', from:t.from||'', to:t.to||'',
          rename: e=>this.patchTask(t.id, {name:e.target.value}),
          setLink: e=>this.patchTask(t.id, {link:e.target.value}),
          setMode: e=>this.patchTask(t.id, {mode:e.target.value}),
          setDate: e=>this.patchTask(t.id, {date:e.target.value}),
          setFrom: e=>this.patchTask(t.id, {from:e.target.value}),
          setTo: e=>this.patchTask(t.id, {to:e.target.value}),
          dayChips: DAYS.map(d=>{
            const on = (t.days||[]).indexOf(d.id)>=0;
            return {name:d.name, toggle:()=>this.patchTask(t.id, {days: on ? (t.days||[]).filter(x=>x!==d.id) : (t.days||[]).concat([d.id])}),
              border: on ? 'var(--color-accent)' : 'var(--color-divider)',
              bg: on ? 'var(--color-accent-100)' : 'transparent',
              color: on ? 'var(--color-accent-800)' : muted};
          }),
          remove: ()=>this.removeTask(t.id)};
      }),
      secTasks: mkSetupSec('tasks', state.tasks.length),
      taskLinkOptions: (()=>{
        const out = [];
        (state.projects||[]).forEach(p=>out.push({value:'p:'+p.id, name:'▸ '+p.name}));
        GOALS.filter(g=>!g.archived).forEach(g=>out.push({value:'g:'+g.id, name:'◦ '+g.name}));
        return out;
      })(),
      calendarId: state.calendarId||'',
      setCalendarId: e=>{ const v=e.target.value.trim(); this.setState({calendarId:v}); this.persist({calendarId:v}); },
      backupMsg: state.backupMsg,
      exportBackup: ()=>this.exportBackup(),
      importBackup: file=>this.importBackup(file),
      clearBackupMsg: ()=>this.setState({backupMsg:''}),
      wipeArmed: state.wipeArmed, wipeIdle: !state.wipeArmed,
      armWipe: ()=>this.setState({wipeArmed:true}),
      cancelWipe: ()=>this.setState({wipeArmed:false}),
      doWipe: ()=>this.wipeEverything(),
      wipeSummary: state.sessions.length+' sessions · '+state.projects.length+' projects · '+state.goals.length+' goals',
    };
  }
}

export const store = new Store();
