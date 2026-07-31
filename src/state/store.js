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
  SHAKU_PHASES, SHAKU_ROUTINE, seedRoutineSteps, LICK_SOURCES, seedLicks,
  DEFAULT_TASKS, GOALS, SEED_GOALS, applyGoals,
  PROJECTS, SEED_PROJECTS, applyProjects, SEED_DONE_DATES,
  DAYS, DEFAULT_ROTATION, DEFAULT_BLOCKS, DEFAULT_STRENGTH_DAYS,
  toKey, labelFor, mondayOf,
  STEP_STYLE, NEXT_STATUS,
} from '../data/index.js';

// Stand-ins for the authoring runtime's `data-props` (the original had an editor
// panel for these; here they're just fixed defaults matching that panel's own
// defaults).
const PROPS = {
  startTab: 'today',
  showQuote: true,
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

// Every field persisted to localStorage — kept as one list so persist(), the
// full-backup export, and import all agree on what "everything" means.
const BACKUP_FIELDS = [
  'sessions', 'checklist', 'mode', 'activeProjectId', 'stepStatus', 'routine',
  'stepDates', 'userGoals', 'tasks', 'taskDone', 'extraToday', 'jpStudied',
  'study', 'sheetUrl', 'sheetPushUrl', 'syncAt', 'pendingPush', 'licks',
  'instruments', 'goals', 'projects', 'routineSteps',
  // Migration marker — must persist, or purgeLegacySeed() would re-run on every
  // load and keep resetting progress on the seeded goals.
  '_seedPurged',
];

class Store {
  constructor(){
    this.state = {
      // version field for future migrations — the key name stays kata_state_v2.
      _schemaVersion: 1,
      _seedPurged: false,
      tab: 'today',
      mode: 'default',
      projects: clone(SEED_PROJECTS),
      activeProjectId: (SEED_PROJECTS[0] && SEED_PROJECTS[0].id) || '',
      projectForm: {open:false, name:'', blurb:'', goalId:'', activities:[], steps:'', until:''},
      sessions: [],
      checklist: {},
      stepStatus: {},
      stepDates: {},
      userGoals: [],
      openLibGoals: {},
      goalForm: {open:false, name:'', area:'Music', activities:[], steps:''},
      tasks: DEFAULT_TASKS,
      taskDone: {},
      taskForm: {open:false, name:'', act:'shaku', mode:'daily', days:[], date:'', from:'', to:''},
      extraToday: {},
      jpStudied: {},
      settingsOpen: false,
      routineView: 'grid',
      instruments: clone(ACT_DEFS),
      goals: clone(SEED_GOALS),
      routineSteps: seedRoutineSteps(),
      setupOpen: {inst:true, routines:false, goals:false},
      setupInst: 'shaku',
      instForm: {open:false, name:'', hue:75, rotate:true},
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
      routine: {variant:'current', rotation: DEFAULT_ROTATION, blocks: DEFAULT_BLOCKS, strengthDays: DEFAULT_STRENGTH_DAYS, rotationSize: 2, slotsByDay: {sat:1, sun:1}},
      sort: 'newest',
      filterActivity: 'all',
      stuckOpen: {},
      openProjects: {},
      coverageBasis: 'week',
      area: 'All',
      libraryAct: 'shaku',
      licks: seedLicks(),
      lickForm: {open:false, name:'', source:'Honkyoku', notation:'', note:''},
      openCue: {},
      form: {date: toKey(new Date()), activity: 'piano', minutes: '', whatWorked: '', whereStuck: '', link: '', steps: [], licks: []},
      backupMsg: '',
    };
    this.listeners = new Set();
  }

  subscribe(fn){ this.listeners.add(fn); return () => this.listeners.delete(fn); }
  getState(){ return this.state; }
  setState(patch){
    this.state = Object.assign({}, this.state, patch);
    this.listeners.forEach(fn => fn(this.state));
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
          _seedPurged: true,
          routineSteps: (s.routineSteps && s.routineSteps.length) ? s.routineSteps : seedRoutineSteps(),
          sessions: s.sessions||[], checklist: s.checklist||{}, mode: s.mode||'default',
          activeProjectId: s.activeProjectId || (projects[0] && projects[0].id) || '', stepStatus: s.stepStatus||{},
          stepDates: s.stepDates||{}, userGoals: s.userGoals||[],
          tasks: s.tasks||DEFAULT_TASKS, taskDone: s.taskDone||{},
          extraToday: s.extraToday||{}, jpStudied: s.jpStudied||{},
          study: s.study||SEED_STUDY, sheetUrl: s.sheetUrl||'', sheetPushUrl: s.sheetPushUrl||'',
          syncAt: s.syncAt||'', pendingPush: s.pendingPush||[],
          licks: (s.licks && s.licks.length) ? s.licks : seedLicks(),
          routine: Object.assign({}, this.state.routine, s.routine||{}),
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
        tasks: (s.tasks && s.tasks.length) ? s.tasks : this.state.tasks,
        taskDone: s.taskDone || this.state.taskDone,
        extraToday: s.extraToday || this.state.extraToday,
        jpStudied: s.jpStudied || this.state.jpStudied,
        study: (s.study && s.study.length) ? s.study : this.state.study,
        sheetUrl: s.sheetUrl != null ? s.sheetUrl : this.state.sheetUrl,
        sheetPushUrl: s.sheetPushUrl != null ? s.sheetPushUrl : this.state.sheetPushUrl,
        syncAt: s.syncAt || this.state.syncAt,
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
  toggleQuickLog(dateKey, actId, mins){
    const found = this.sessionFor(dateKey, actId);
    if(found){
      if(!found.quick) return;
      const sessions = this.state.sessions.filter(s=>s.id!==found.id);
      this.setState({sessions});
      this.persist({sessions});
      return;
    }
    const session = {id:'qk-'+dateKey+'-'+actId+'-'+Date.now(), date:dateKey, activity:actId,
      minutes:Number(mins)||0, whatWorked:'', whereStuck:'', projectId:'', goalId:'',
      steps:[], licks:[], quick:true};
    const sessions = [session].concat(this.state.sessions);
    this.setState({sessions});
    this.persist({sessions});
  }
  fillInQuick(id){
    const s = this.state.sessions.find(x=>x.id===id);
    if(!s) return;
    const sessions = this.state.sessions.filter(x=>x.id!==id);
    this.setState({sessions, tab:'log', sort:'newest',
      form: Object.assign({}, this.state.form, {date:s.date, activity:s.activity, minutes:String(s.minutes||''), whatWorked:'', whereStuck:'', link:'', steps:[], licks:[]})});
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
    const a = {id:'in-'+Date.now(), name, abbr:name.replace(/[^A-Za-z0-9]/g,'').slice(0,3) || name.slice(0,2),
      hue:Number(f.hue), rotate:!!f.rotate};
    this.commitInstruments(this.state.instruments.concat([a]), {instForm:{open:false, name:'', hue:f.hue, rotate:true}});
  }
  canDeleteInstrument(a){ return !a.anchor && a.id!=='other'; }
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
      form: this.state.form.activity===id ? Object.assign({}, this.state.form, {activity:fallback, link:''}) : this.state.form};
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
      until: f.until||'', steps, user:true,
    };
    this.commitProjects(this.state.projects.concat([project]), {
      activeProjectId: id,
      projectForm: {open:false, name:'', blurb:'', goalId:'', activities:[], steps:'', until:''},
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
  addTask(){
    const f = this.state.taskForm;
    const name = (f.name||'').trim();
    if(!name) return;
    const t = {id:'ut-'+Date.now(), name, act:f.act, mode:f.mode, days:f.days.slice(), date:f.date, from:f.from, to:f.to};
    const tasks = this.state.tasks.concat([t]);
    this.setState({tasks, taskForm:{open:false, name:'', act:f.act, mode:f.mode, days:[], date:'', from:'', to:''}});
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

  /* ---- rotation sizing ---- */
  slotsFor(dayId){
    const r = this.state.routine;
    const o = (r.slotsByDay||{})[dayId];
    return o==null ? (r.rotationSize||2) : o;
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

  stepStatusOf(step){ return this.state.stepStatus[step.id] || step.d || 'todo'; }
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
    return {label: step.label, fill: sty.fill, stroke: sty.stroke, dash: sty.dash, color: sty.color,
            doneLabel: at ? ' · done '+labelFor(at) : '', cycle: ()=>this.cycleStep(step)};
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
    const planned = (this.effectiveRotation()[todayId]||[]).map(e=>e.act);
    const extras = (this.state.extraToday[toKey(new Date())]||[]).filter(a=>planned.indexOf(a)<0);
    return {ids: planned.concat(extras), extras, last};
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
  isChecked(id){
    const key = this.checklistKey();
    if(this.state.checklist[key] && this.state.checklist[key][id]) return true;
    return this.state.sessions.some(s=>s.date===key && s.activity===id);
  }
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
    const link = projectId ? 'p:'+projectId : '';
    this.setState({tab:'log', form: Object.assign({}, this.state.form, {activity: actId, link, date: toKey(new Date())})});
  }

  effectiveRotation(){
    const r = this.state.routine;
    const last = this.lastPracticed();
    const stale = ROTATION_POOL.slice().sort((a,b)=>{ const da=last[a]||'', db=last[b]||''; return da<db?-1:da>db?1:0; });
    const rot = {};
    if(!stale.length){ DAYS.forEach(d=>{ rot[d.id] = []; }); return rot; }
    DAYS.forEach((d,di)=>{
      const want = this.slotsFor(d.id);
      const base = (r.rotation[d.id]||[]).slice(0, want);
      while(base.length < want){
        const start = (di*2 + base.length) % stale.length;
        let pick = null;
        for(let k=0;k<stale.length;k++){
          const cand = stale[(start+k) % stale.length];
          if(base.indexOf(cand)<0){ pick = cand; break; }
        }
        base.push(pick || stale[start]);
      }
      rot[d.id] = base.map(x=>({act:x, moved:false}));
    });
    if(r.variant === 'thu'){
      const moved = rot.thu.map(x=>x.act);
      rot.thu = [];
      if(moved[0]) rot.tue.push({act:moved[0], moved:true, srcDay:'thu', srcSlot:0});
      if(moved[1]) rot.fri.push({act:moved[1], moved:true, srcDay:'thu', srcSlot:1});
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
    const rotation = {}; let n = 0;
    DAYS.forEach(d=>{
      rotation[d.id] = [];
      const slots = this.slotsFor(d.id);
      for(let i=0;i<slots;i++){ rotation[d.id].push(order[n % order.length]); n++; }
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
    if(!f.activity || !f.minutes || Number(f.minutes)<=0) return;
    let projectId = '', goalId = '';
    if(f.link.indexOf('p:')===0){
      projectId = f.link.slice(2);
      const p = PROJECTS.find(x=>x.id===projectId);
      goalId = p ? p.goalId : '';
    } else if(f.link.indexOf('g:')===0){ goalId = f.link.slice(2); }
    const day = f.date || toKey(new Date());
    const isShaku = f.activity==='shaku';
    const usedLicks = isShaku ? (f.licks||[]) : [];
    const session = {
      id: 'log-'+Date.now(), date: day, activity: f.activity,
      minutes: Number(f.minutes), whatWorked: f.whatWorked||'', whereStuck: f.whereStuck||'', projectId, goalId,
      steps: isShaku ? (f.steps||[]) : [], licks: usedLicks,
    };
    const sessions = [session].concat(this.state.sessions);
    const licks = this.state.licks.map(l=>{
      if(usedLicks.indexOf(l.id)<0) return l;
      const plays = l.plays||[];
      return Object.assign({}, l, {plays: plays.indexOf(day)>=0 ? plays : plays.concat([day])});
    });
    this.setState({sessions, licks, form: {date: toKey(new Date()), activity: f.activity, minutes:'', whatWorked:'', whereStuck:'', link:'', steps:[], licks:[]}});
    this.persist({sessions, licks});
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
    ['today','log','routine','goals','study','library','settings'].forEach(id=>{
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
      return Object.assign(it, {isExtra: extra, drop: ()=>this.dropInstrumentToday(id),
        sub: extra ? 'Added for today only' : it.sub});
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
    const anchorItems = ['ear','jpn','strength'].map(id=>{
      const it = mkItem(id, this.isChecked(id) ? 'Done today' : 'Daily anchor');
      return Object.assign(it, {hasWord: id==='jpn' && PROPS.showQuote, word: id==='jpn' ? word : null, isExtra:false});
    });
    const usedToday = rotation.ids.concat(['ear','jpn','strength']);
    const addableToday = ACTIVITIES.filter(a=>usedToday.indexOf(a.id)<0 && a.id!=='other').map(a=>({
      name:a.name, add: ()=>this.addInstrumentToday(a.id),
      border:'var(--color-divider)', color: a.stroke,
    }));
    const todayTasks = this.tasksOn(todayKey).map(t=>{
      const a = ACT_BY_ID[t.act] || {name:t.act, stroke:'#7d7979'};
      const done = this.isTaskDone(t.id, todayKey);
      return {name:t.name, actName:a.name, stroke:a.stroke, done,
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
      openSteps: proj.steps.filter(s=>this.stepStatusOf(s)!=='done').slice(0,3).map(s=>this.stepView(s)),
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
      openIt: ()=>this.setProjectForm({open:true}),
      cancel: ()=>this.setProjectForm({open:false, name:'', blurb:'', goalId:'', activities:[], steps:'', until:''}),
      submit: ()=>this.addProject(),
    };

    return {
      todayHeading: state.mode==='project' ? 'The sprint continues.' : 'Today’s rotation.',
      isDefaultMode: state.mode==='default', isProjectMode: state.mode==='project',
      setDefaultMode: ()=>{ this.setState({mode:'default'}); this.persist({mode:'default'}); },
      setProjectMode: ()=>{ this.setState({mode:'project'}); this.persist({mode:'project'}); },
      projectChips, activeProject, hasProjects: state.projects.length>0, projectForm,
      rotationItems, anchorItems,
      goToLog: ()=>this.setState({tab:'log'}),
      addableToday, hasAddable: addableToday.length>0,
      goalPeek,
      rotationSizeLabel: String(state.routine.rotationSize||2),
      todayTasks, hasTodayTasks: todayTasks.length>0, noTodayTasks: todayTasks.length===0,
      tasksSummary: tasksDoneCount+' of '+todayTasks.length+' done',
      taskForm: tf, taskFormOpen: tf.open, taskFormClosed: !tf.open, taskDayChips,
      taskModeDaily: tf.mode==='daily', taskModeWeekdays: tf.mode==='weekdays',
      taskModeDate: tf.mode==='date', taskModeRange: tf.mode==='range',
      openTaskForm: ()=>this.setTaskForm({open:true}),
      cancelTask: ()=>this.setTaskForm({open:false, name:''}),
      setTaskName: e=>this.setTaskForm({name:e.target.value}),
      setTaskAct: e=>this.setTaskForm({act:e.target.value}),
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
    const actName = ACT_BY_ID[act] ? ACT_BY_ID[act].name : 'this';
    const linkHint = (linkProjects.length+linkGoals.length) ? 'what '+actName+' feeds' : 'nothing tied to '+actName+' yet';
    const shakuStroke = actOf(act).stroke;
    const actSteps = this.stepsFor(act);
    const isShakuLog = actSteps.length>0 && PROPS.routineInLog;
    const cuesDefaultOpen = !!PROPS.routineOpenCues;
    const formSteps = state.form.steps||[];
    const formLicks = state.form.licks||[];
    const shakuPhases = SHAKU_PHASES.filter(ph=>actSteps.some(s=>s.phase===ph)).map(ph=>({
      phase: ph,
      steps: actSteps.filter(s=>s.phase===ph).map(s=>{
        const on = formSteps.indexOf(s.id)>=0;
        const open = state.openCue[s.id]===undefined ? cuesDefaultOpen : !!state.openCue[s.id];
        return {label:s.label, mins:s.mins+' min', cues:s.cues.map(t=>({text:t})), open,
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
    const visibleSessions = this.visibleSessionsData().map(s=>{
      const a = actOf(s.activity);
      const p = PROJECTS.find(x=>x.id===s.projectId);
      const g = GOALS.find(x=>x.id===s.goalId);
      return {
        activityName:a.name, stroke:a.stroke, dateLabel:labelFor(s.date), minutes:s.minutes,
        linkName: p ? p.name : (g ? g.name : ''),
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
      setFormDate: e=>this.setState({form: Object.assign({}, state.form, {date:e.target.value})}),
      setFormActivity: e=>this.setState({form: Object.assign({}, state.form, {activity:e.target.value, link:''})}),
      setFormMinutes: e=>this.setState({form: Object.assign({}, state.form, {minutes:e.target.value})}),
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
      setFormWorked: e=>this.setState({form: Object.assign({}, state.form, {whatWorked:e.target.value})}),
      setFormStuck: e=>this.setState({form: Object.assign({}, state.form, {whereStuck:e.target.value})}),
      setFormLink: e=>this.setState({form: Object.assign({}, state.form, {link:e.target.value})}),
      submitSession: ()=>this.submitSession(),
      activityOptions: this.activityOptions(),
      linkProjects, linkGoals, linkHint,
      weekly, sort: state.sort, setSort: e=>this.setState({sort:e.target.value}),
      filterActivity: state.filterActivity, setFilter: e=>this.setState({filterActivity:e.target.value}),
      hasNoEntries: visibleSessions.length===0, visibleSessions,
      exportJson: ()=>this.exportJson(), exportCsv: ()=>this.exportCsv(),
    };
  }

  selectRoutine(){
    const state = this.state;
    const muted = MUTED;
    const rot = this.effectiveRotation();
    const blocks = state.routine.blocks;
    const todayId = DAYS[(new Date().getDay()+6)%7].id;
    const todayKey = toKey(new Date());
    const weekDays = DAYS.map(d=>{
      const list = [];
      list.push({actId:'ear', label:'Ear '+blocks.ear+'m', editable:false});
      (rot[d.id]||[]).forEach((entry, i)=>{
        const a = actOf(entry.act);
        list.push({actId:entry.act, label:(entry.moved?'‹ ':'')+a.name+' '+(i===0?blocks.a:blocks.b)+'m',
                   editable:true, cycle:()=>this.cycleSlot(entry.srcDay||d.id, entry.srcSlot==null?i:entry.srcSlot, entry.act)});
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
      (rot[d.id]||[]).forEach((e,i)=>items.push({actId:e.act, label:(e.moved?'‹':'')+abbrOf(e.act), mins:(i===0?blocks.a:blocks.b), firm:true}));
      items.push({actId:'jpn', label:'JP', mins:blocks.jpn, firm:false});
      items.push({actId:'other', label:'Bike', mins:blocks.cardio, firm:false});
      if((state.routine.strengthDays||[]).indexOf(d.id)>=0) items.push({actId:'strength', label:'Str', mins:blocks.strength, firm:false});
      const tappable = dk<=todayKey;
      const doneCount = items.filter(b=>!!this.sessionFor(dk, b.actId)).length;
      return {
        name:d.name, dateNum: String(dd.getDate()), isToday: dk===todayKey,
        doneLabel: doneCount ? doneCount+'/'+items.length : '',
        headBg: dk===todayKey ? 'var(--color-accent-100)' : 'transparent',
        headColor: dk===todayKey ? 'var(--color-accent-800)' : 'var(--color-text)',
        slots: String(this.slotsFor(d.id)),
        inc: ()=>this.setDaySlots(d.id, this.slotsFor(d.id)+1),
        dec: ()=>this.setDaySlots(d.id, this.slotsFor(d.id)-1),
        items: items.map(b=>{
          const a = actOf(b.actId);
          const sess = this.sessionFor(dk, b.actId);
          const done = !!sess;
          const detailed = done && !sess.quick;
          return {label:b.label, mins:String(b.mins), stroke:a.stroke, done,
                  title: a.name+' · '+b.mins+' min · ' + (detailed ? 'logged with detail' : done ? 'ticked — tap to clear' : (tappable ? 'tap to mark done' : 'later this week')),
                  bg: done ? 'color-mix(in srgb, '+a.stroke+' 26%, transparent)'
                           : (b.firm ? 'color-mix(in srgb, '+a.stroke+' 10%, transparent)' : 'transparent'),
                  borderStyle: done ? 'solid' : (b.firm ? 'solid' : 'dashed'),
                  labelWeight: done ? '600' : '400',
                  tickOpacity: done ? 1 : 0,
                  cursor: tappable ? 'pointer' : 'default',
                  toggle: tappable ? (()=>this.toggleQuickLog(dk, b.actId, b.mins)) : (()=>{})};
        }),
        tasks: this.tasksOn(dk).map(t=>{
          const a = actOf(t.act);
          const done = this.isTaskDone(t.id, dk);
          return {name:t.name, stroke:a.stroke, title:t.name+' · '+a.name,
                  opacity: done ? 0.4 : 1, decoration: done ? 'line-through' : 'none',
                  toggle: ()=>this.toggleTask(t.id, dk)};
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
      const t = blocks.ear + blocks.a + blocks.b + blocks.jpn + blocks.cardio;
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
      }));
    };
    const filteredGoals = GOALS.filter(g=>inArea(g) && !g.archived);
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
      areaChips, projectCards, goalRows,
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
      {value: (totalMins/60).toFixed(0)+' h', label:'Logged all time'},
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
      name: la.name, stroke: la.stroke,
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
    inst.routine = SHAKU_PHASES.filter(ph=>libSteps.some(s=>s.phase===ph)).map(ph=>({
      phase: ph,
      steps: libSteps.filter(s=>s.phase===ph).map(s=>{
        const open = !!state.openCue['lib-'+s.id];
        return {label:s.label, mins:s.mins+' min', cues:(s.cues||[]).map(t=>({text:t})), open, rate:this.stepRateLabel(s.id, state.libraryAct),
          chevron: open ? 'rotate(180deg)' : 'rotate(0deg)',
          toggle: ()=>{ const o=Object.assign({},state.openCue); o['lib-'+s.id]=!open; this.setState({openCue:o}); }};
      })
    }));
    inst.licks = state.licks.map(l=>this.lickView(l));
    inst.noLicks = inst.licks.length===0;
    inst.secRoutine = mkSec('routine', libSteps.length);
    inst.secLicks = mkSec('licks', inst.licks.length);
    inst.secStuck = mkSec('stuck', inst.stuckNotes.length);
    inst.secDone = mkSec('done', inst.accomplishments.length);
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
      return {name:a.name, stroke:c.stroke, usage:usageOf(a.id),
        kindLabel: a.anchor ? 'Daily anchor' : (a.rotate ? 'In the rotation' : 'Off the rotation'),
        canRotate: !a.anchor, canDelete: this.canDeleteInstrument(a),
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
    const setupSteps = SHAKU_PHASES.filter(ph=>setupOwnSteps.some(s=>s.phase===ph)).map(ph=>({
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
        steps: g.steps.map(s=>({label:s.label, statusLabel:this.stepStatusOf(s), remove:()=>this.removeGoalStep(g.id, s.id)})),
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
      toggleInstRotate: ()=>this.setInstForm({rotate: !insF.rotate}),
      instFormRotateLabel: insF.rotate ? 'Goes in the rotation' : 'Outside the rotation',
      instFormRotateBorder: insF.rotate ? 'var(--color-accent)' : 'var(--color-divider)',
      instFormRotateBg: insF.rotate ? 'var(--color-accent-100)' : 'transparent',
      instFormRotateColor: insF.rotate ? 'var(--color-accent-800)' : muted,
      addInstrument: ()=>this.addInstrument(),
      stepForm: stF, stepFormOpen: stF.open,
      phaseOptions: SHAKU_PHASES,
      openStepForm: ()=>this.setStepForm({open:!stF.open}),
      setStepPhase: e=>this.setStepForm({phase:e.target.value}),
      setStepLabel: e=>this.setStepForm({label:e.target.value}),
      setStepMins: e=>this.setStepForm({mins:e.target.value}),
      setStepCues: e=>this.setStepForm({cues:e.target.value}),
      addRoutineStep: ()=>this.addRoutineStep(),
      newGoalFromSetup: ()=>{ this.setState({tab:'goals'}); this.setGoalForm({open:true}); },
      resetArmed: state.resetArmed, resetIdle: !state.resetArmed,
      armReset: ()=>this.setState({resetArmed:true}),
      cancelReset: ()=>this.setState({resetArmed:false}),
      doReset: ()=>this.resetSetup(),
      areaOptions: AREAS,
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
