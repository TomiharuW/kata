// Seed data + pure helpers, ported verbatim from reference/Kata.dc.html's
// <script type="text/x-dc"> block (constants defined before `class Component`).
// Names are kept identical to the source so behavior stays traceable to spec.
// Do not paraphrase or invent replacements for the quotations / seed content.

// The Ways (道) — everything you practise, not just the instruments. Each
// carries its Japanese name so the app reads bilingually; `jp` is the written
// form, `jpR` its romaji.
export const ACT_DEFS = [
  {id:'ear', name:'Ear Training', jp:'聴音', jpR:'chōon', abbr:'Ear', anchor:true},
  {id:'piano', name:'Piano', jp:'ピアノ', jpR:'piano', abbr:'Pf', hue:75, rotate:true},
  {id:'shaku', name:'Shakuhachi', jp:'尺八', jpR:'shakuhachi', abbr:'Shk', hue:150, rotate:true},
  {id:'shino', name:'Shinobue', jp:'篠笛', jpR:'shinobue', abbr:'Shn', hue:195, rotate:true},
  {id:'trumpet', name:'Trumpet', jp:'喇叭', jpR:'rappa', abbr:'Tpt', hue:28, rotate:true},
  {id:'taiko', name:'Taiko', jp:'太鼓', jpR:'taiko', abbr:'Tk', hue:345, rotate:true},
  {id:'jpn', name:'Japanese Reading', jp:'読解', jpR:'dokkai', abbr:'JP', anchor:true},
  {id:'comp', name:'Composition', jp:'作曲', jpR:'sakkyoku', abbr:'Cmp', hue:258, rotate:true},
  {id:'strength', name:'Strength', jp:'鍛錬', jpR:'tanren', abbr:'Str', anchor:true},
  {id:'other', name:'Other', jp:'その他', jpR:'sonota', abbr:'Bike', hue:null},
];
export const HUE_SWATCHES = [75, 150, 195, 28, 345, 258, 300, 120];

export function colorFor(a){
  if(a.anchor) return {stroke:'#3a2f28'};
  if(a.hue==null) return {stroke:'#7d7979'};
  return {stroke:'oklch(54% 0.10 '+a.hue+')'};
}

export let ACTIVITIES = [], ACT_BY_ID = {}, ROTATION_POOL = [];
export function applyInstruments(list){
  ACTIVITIES = list.map(a=>Object.assign({}, a, colorFor(a)));
  ACT_BY_ID = Object.fromEntries(ACTIVITIES.map(a=>[a.id, a]));
  ROTATION_POOL = ACTIVITIES.filter(a=>a.rotate).map(a=>a.id);
}
applyInstruments(ACT_DEFS);

export const actOf = id => ACT_BY_ID[id] || {id, name:id||'Unfiled', jp:'', jpR:'', abbr:String(id||'—').slice(0,3), stroke:'#7d7979'};
export const abbrOf = id => { const a = actOf(id); return a.abbr || a.name.slice(0,3); };
export const clone = x => JSON.parse(JSON.stringify(x));
export const AREAS = ['Music','Brass band','Japanese','Health / strength','Other'];

/* ---- Quotation of the day: real, attributed, public-domain ---- */
export const TIME_CHUNKS = [
  {id:'deep', from:0, to:4, jp:'丑三つ時', r:'ushimitsudoki', en:'extremely late', gloss:'the dead of night'},
  {id:'wayEarly', from:4, to:7, jp:'朝まだき', r:'asamadaki', en:'way early', gloss:'before the light'},
  {id:'morning', from:7, to:11, jp:'朝のうち', r:'asa no uchi', en:'early morning', gloss:'while it is still morning'},
  {id:'midday', from:11, to:15, jp:'日中', r:'nicchū', en:'midday', gloss:'the middle of the day'},
  {id:'afternoon', from:15, to:18, jp:'夕暮れ前', r:'yūgure-mae', en:'late afternoon', gloss:'before dusk'},
  {id:'evening', from:18, to:22, jp:'宵の口', r:'yoi no kuchi', en:'evening', gloss:'the mouth of the night'},
  {id:'late', from:22, to:24, jp:'夜更け', r:'yofuke', en:'late', gloss:'deep into the night'},
];
export const QUOTES = [
  {id:'q1', author:'松尾芭蕉', authorR:'Matsuo Bashō', work:'おくのほそ道', year:'1702', theme:'time and travel',
   jp:'月日は百代の過客にして、行きかふ年も又旅人也。', r:'Tsukihi wa hakutai no kakaku ni shite, yukikau toshi mo mata tabibito nari.',
   en:'The days and months are travellers of a hundred generations; the years that come and go are travellers too.',
   word:{w:'過客', k:'かかく', r:'kakaku', en:'a traveller passing through'}, time:['morning','midday','afternoon']},
  {id:'q2', author:'松尾芭蕉', authorR:'Matsuo Bashō', work:'蛙合', year:'1686', theme:'attention',
   jp:'古池や蛙飛びこむ水の音', r:'Furuike ya kawazu tobikomu mizu no oto',
   en:'The old pond — a frog leaps in, the sound of water.',
   word:{w:'蛙', k:'かわず', r:'kawazu', en:'frog (the old reading)'}, time:['midday','afternoon','evening']},
  {id:'q3', author:'松尾芭蕉', authorR:'Matsuo Bashō', work:'おくのほそ道', year:'1702', theme:'stillness',
   jp:'閑さや岩にしみ入る蝉の声', r:'Shizukasa ya iwa ni shimiiru semi no koe',
   en:'Such stillness — the cry of the cicadas soaking into the rock.',
   word:{w:'閑さ', k:'しずかさ', r:'shizukasa', en:'stillness with weight in it'}, time:['midday','deep','late']},
  {id:'q4', author:'鴨長明', authorR:'Kamo no Chōmei', work:'方丈記', year:'1212', theme:'impermanence',
   jp:'ゆく河の流れは絶えずして、しかももとの水にあらず。', r:'Yuku kawa no nagare wa taezu shite, shikamo moto no mizu ni arazu.',
   en:'The flow of the river never ceases, and yet the water is never the water it was.',
   word:{w:'流れ', k:'ながれ', r:'nagare', en:'a current, a flowing'}, time:['deep','late','morning']},
  {id:'q5', author:'清少納言', authorR:'Sei Shōnagon', work:'枕草子', year:'c.1002', theme:'the seasons',
   jp:'春はあけぼの。やうやう白くなりゆく山ぎは、少し明かりて。', r:'Haru wa akebono. Yōyō shiroku nariyuku yamagiwa, sukoshi akarite.',
   en:'Spring: dawn. The ridgeline slowly whitening, a little light coming into it.',
   word:{w:'あけぼの', k:'あけぼの', r:'akebono', en:'first light, daybreak'}, time:['wayEarly','morning']},
  {id:'q6', author:'吉田兼好', authorR:'Yoshida Kenkō', work:'徒然草', year:'c.1330', theme:'idleness and writing',
   jp:'つれづれなるままに、日暮らし、硯にむかひて、心にうつりゆくよしなし事を書きつくれば', r:'Tsurezure naru mama ni, hikurashi, suzuri ni mukaite, kokoro ni utsuriyuku yoshinashigoto o kakitsukureba',
   en:'Idle, I sit at the inkstone all day setting down the pointless things that drift across my mind.',
   word:{w:'硯', k:'すずり', r:'suzuri', en:'inkstone'}, time:['afternoon','evening','late']},
  {id:'q7', author:'世阿弥', authorR:'Zeami', work:'風姿花伝', year:'c.1400', theme:'practice',
   jp:'初心忘るべからず。', r:'Shoshin wasuru bekarazu.',
   en:'The beginner’s mind must never be forgotten.',
   word:{w:'初心', k:'しょしん', r:'shoshin', en:'the beginner’s mind'}, time:['morning','wayEarly']},
  {id:'q8', author:'世阿弥', authorR:'Zeami', work:'風姿花伝', year:'c.1400', theme:'performance',
   jp:'秘すれば花なり。秘せずは花なるべからず。', r:'Hisureba hana nari. Hisezu wa hana naru bekarazu.',
   en:'Kept hidden, it is the flower. Not hidden, it cannot be the flower.',
   word:{w:'花', k:'はな', r:'hana', en:'the flower — the live charge of a performance'}, time:['evening','afternoon']},
  {id:'q9', author:'道元', authorR:'Dōgen', work:'正法眼蔵・現成公案', year:'1233', theme:'the self',
   jp:'仏道をならふといふは、自己をならふなり。自己をならふといふは、自己をわするるなり。', r:'Butsudō o narau to iu wa, jiko o narau nari. Jiko o narau to iu wa, jiko o wasururu nari.',
   en:'To study the way is to study the self. To study the self is to forget the self.',
   word:{w:'自己', k:'じこ', r:'jiko', en:'the self'}, time:['deep','wayEarly','morning']},
  {id:'q10', author:'宮本武蔵', authorR:'Miyamoto Musashi', work:'五輪書', year:'1645', theme:'training',
   jp:'千日の稽古を鍛とし、万日の稽古を練とす。', r:'Sennichi no keiko o tan to shi, mannichi no keiko o ren to su.',
   en:'A thousand days of practice is the forging; ten thousand days is the tempering.',
   word:{w:'稽古', k:'けいこ', r:'keiko', en:'disciplined practice'}, time:['morning','midday','afternoon']},
  {id:'q11', author:'宮本武蔵', authorR:'Miyamoto Musashi', work:'独行道', year:'1645', theme:'resolve',
   jp:'我事において後悔をせず。', r:'Waga koto ni oite kōkai o sezu.',
   en:'In my own affairs I do not look back with regret.',
   word:{w:'後悔', k:'こうかい', r:'kōkai', en:'regret'}, time:['late','deep','evening']},
  {id:'q12', author:'紀貫之', authorR:'Ki no Tsurayuki', work:'古今和歌集・仮名序', year:'905', theme:'language',
   jp:'やまとうたは、人の心を種として、万の言の葉とぞなれりける。', r:'Yamato-uta wa, hito no kokoro o tane to shite, yorozu no koto no ha to zo narerikeru.',
   en:'Japanese song takes the human heart as its seed and grows into ten thousand leaves of words.',
   word:{w:'言の葉', k:'ことのは', r:'kotonoha', en:'words — “leaves of speech”'}, time:['morning','midday','evening']},
  {id:'q13', author:'山上憶良', authorR:'Yamanoue no Okura', work:'万葉集・巻五', year:'c.759', theme:'what is worth having',
   jp:'銀も金も玉も何せむに勝れる宝子に及かめやも', r:'Shirogane mo kugane mo tama mo nani sen ni masareru takara ko ni shikame ya mo',
   en:'Silver, gold, jewels — what are they worth? No treasure comes near a child.',
   word:{w:'宝', k:'たから', r:'takara', en:'treasure'}, time:['evening','midday']},
  {id:'q14', author:'良寛', authorR:'Ryōkan', work:'辞世の句', year:'1831', theme:'dying',
   jp:'裏を見せ表を見せて散る紅葉', r:'Ura o mise omote o misete chiru momiji',
   en:'Showing its back, showing its face, the maple leaf falls.',
   word:{w:'紅葉', k:'もみじ', r:'momiji', en:'autumn leaves'}, time:['afternoon','evening','late']},
  {id:'q15', author:'小林一茶', authorR:'Kobayashi Issa', work:'おらが春', year:'1819', theme:'grief',
   jp:'露の世は露の世ながらさりながら', r:'Tsuyu no yo wa tsuyu no yo nagara sarinagara',
   en:'This world of dew is a world of dew — and yet, and yet.',
   word:{w:'露', k:'つゆ', r:'tsuyu', en:'dew'}, time:['wayEarly','deep','late']},
  {id:'q16', author:'与謝蕪村', authorR:'Yosa Buson', work:'蕪村句集', year:'c.1774', theme:'landscape',
   jp:'菜の花や月は東に日は西に', r:'Na no hana ya tsuki wa higashi ni hi wa nishi ni',
   en:'Fields of rape blossom — the moon in the east, the sun in the west.',
   word:{w:'菜の花', k:'なのはな', r:'nanohana', en:'rape blossom'}, time:['afternoon','evening']},
  {id:'q17', author:'松尾芭蕉', authorR:'Matsuo Bashō', work:'三冊子（服部土芳）', year:'1702', theme:'how to learn',
   jp:'松のことは松に習へ、竹のことは竹に習へ。', r:'Matsu no koto wa matsu ni narae, take no koto wa take ni narae.',
   en:'For the pine, learn from the pine; for the bamboo, learn from the bamboo.',
   word:{w:'習ふ', k:'ならう', r:'narau', en:'to learn by following'}, time:['morning','midday','afternoon']},
  {id:'q18', author:'松尾芭蕉', authorR:'Matsuo Bashō', work:'辞世の句', year:'1694', theme:'the end of a road',
   jp:'旅に病んで夢は枯野をかけ廻る', r:'Tabi ni yande yume wa kareno o kakemeguru',
   en:'Ill on the journey — my dreams still run over withered fields.',
   word:{w:'枯野', k:'かれの', r:'kareno', en:'a withered moor'}, time:['deep','late']},
  {id:'q19', author:'松尾芭蕉', authorR:'Matsuo Bashō', work:'芭蕉句集', year:'1694', theme:'solitude',
   jp:'この道や行く人なしに秋の暮', r:'Kono michi ya yuku hito nashi ni aki no kure',
   en:'This road — no one walking it, an autumn dusk.',
   word:{w:'秋の暮', k:'あきのくれ', r:'aki no kure', en:'an autumn evening'}, time:['evening','afternoon']},
  {id:'q20', author:'夏目漱石', authorR:'Natsume Sōseki', work:'草枕', year:'1906', theme:'temperament',
   jp:'山路を登りながら、こう考えた。智に働けば角が立つ。情に棹させば流される。', r:'Yamamichi o noborinagara, kō kangaeta. Chi ni hatarakeba kado ga tatsu. Jō ni sao saseba nagasareru.',
   en:'Climbing the mountain path I thought: work by reason and you make enemies; pole along on feeling and you are swept away.',
   word:{w:'山路', k:'やまみち', r:'yamamichi', en:'mountain path'}, time:['morning','midday']},
  {id:'q21', author:'夏目漱石', authorR:'Natsume Sōseki', work:'吾輩は猫である', year:'1905', theme:'a beginning',
   jp:'吾輩は猫である。名前はまだ無い。', r:'Wagahai wa neko de aru. Namae wa mada nai.',
   en:'I am a cat. As yet I have no name.',
   word:{w:'吾輩', k:'わがはい', r:'wagahai', en:'“I” — grand, archaic, faintly absurd'}, time:['midday','afternoon','evening']},
  {id:'q22', author:'森鷗外', authorR:'Mori Ōgai', work:'舞姫', year:'1890', theme:'departure',
   jp:'石炭をば早や積み果てつ。', r:'Sekitan o ba haya tsumihatetsu.',
   en:'The coal is already loaded.',
   word:{w:'石炭', k:'せきたん', r:'sekitan', en:'coal'}, time:['wayEarly','morning']},
  {id:'q23', author:'正岡子規', authorR:'Masaoka Shiki', work:'病牀六尺', year:'1902', theme:'illness',
   jp:'病牀六尺、これが我世界である。', r:'Byōshō rokushaku, kore ga waga sekai de aru.',
   en:'Six feet of sickbed — this is my world.',
   word:{w:'病牀', k:'びょうしょう', r:'byōshō', en:'sickbed'}, time:['deep','late']},
  {id:'q24', author:'石川啄木', authorR:'Ishikawa Takuboku', work:'一握の砂', year:'1910', theme:'work and money',
   jp:'はたらけどはたらけど猶わが生活楽にならざりぢつと手を見る', r:'Hatarakedo hatarakedo nao waga kurashi raku ni narazari jitto te o miru',
   en:'I work and work and still my life does not get easier. I stare at my hands.',
   word:{w:'生活', k:'くらし', r:'kurashi', en:'daily living, making ends meet'}, time:['evening','late','midday']},
  {id:'q25', author:'与謝野晶子', authorR:'Yosano Akiko', work:'みだれ髪', year:'1901', theme:'desire',
   jp:'やは肌のあつき血汐にふれも見でさびしからずや道を説く君', r:'Yawa hada no atsuki chishio ni fure mo mide sabishikarazu ya michi o toku kimi',
   en:'You preach the Way and never once touch this soft skin, this hot blood — are you not lonely?',
   word:{w:'血汐', k:'ちしお', r:'chishio', en:'hot blood'}, time:['evening','late']},
  {id:'q26', author:'樋口一葉', authorR:'Higuchi Ichiyō', work:'たけくらべ', year:'1895', theme:'a place',
   jp:'廻れば大門の見返り柳いと長けれど', r:'Mawareba ōmon no mikaeri-yanagi ito nagakeredo',
   en:'Round from the great gate stands the looking-back willow, long as it is.',
   word:{w:'柳', k:'やなぎ', r:'yanagi', en:'willow'}, time:['evening','afternoon']},
  {id:'q27', author:'宮沢賢治', authorR:'Miyazawa Kenji', work:'春と修羅・序', year:'1924', theme:'what a person is',
   jp:'わたくしといふ現象は仮定された有機交流電燈のひとつの青い照明です', r:'Watakushi to iu genshō wa katei sareta yūki kōryū dentō no hitotsu no aoi shōmei desu',
   en:'The phenomenon called “I” is one blue illumination of a supposed organic alternating-current lamp.',
   word:{w:'現象', k:'げんしょう', r:'genshō', en:'a phenomenon'}, time:['deep','late','wayEarly']},
  {id:'q28', author:'宮沢賢治', authorR:'Miyazawa Kenji', work:'雨ニモマケズ', year:'1931', theme:'endurance',
   jp:'雨ニモマケズ風ニモマケズ雪ニモ夏ノ暑サニモマケヌ丈夫ナカラダヲモチ', r:'Ame ni mo makezu kaze ni mo makezu yuki ni mo natsu no atsusa ni mo makenu jōbu na karada o mochi',
   en:'Not beaten by the rain, not beaten by the wind, nor by snow nor the heat of summer — having a sturdy body.',
   word:{w:'丈夫', k:'じょうぶ', r:'jōbu', en:'sturdy, hard to break'}, time:['wayEarly','morning','midday']},
  {id:'q29', author:'芥川龍之介', authorR:'Akutagawa Ryūnosuke', work:'侏儒の言葉', year:'1927', theme:'proportion',
   jp:'人生は一箱のマッチに似ている。重大に扱うのはばかばかしい。', r:'Jinsei wa hitohako no macchi ni nite iru. Jūdai ni atsukau no wa bakabakashii.',
   en:'Life resembles a box of matches. To handle it as though it were grave is absurd.',
   word:{w:'人生', k:'じんせい', r:'jinsei', en:'a life, a lifetime'}, time:['midday','evening','late']},
  {id:'q30', author:'高村光太郎', authorR:'Takamura Kōtarō', work:'道程', year:'1914', theme:'making your own way',
   jp:'僕の前に道はない僕の後ろに道は出来る', r:'Boku no mae ni michi wa nai boku no ushiro ni michi wa dekiru',
   en:'There is no road ahead of me. The road forms behind me.',
   word:{w:'道', k:'みち', r:'michi', en:'road, way, discipline'}, time:['morning','wayEarly','afternoon']},
  {id:'q31', author:'中原中也', authorR:'Nakahara Chūya', work:'山羊の歌', year:'1934', theme:'sorrow',
   jp:'汚れつちまつた悲しみに今日も小雪の降りかかる', r:'Yogorecchimatta kanashimi ni kyō mo koyuki no furikakaru',
   en:'On this sullied sorrow, again today, a light snow falls.',
   word:{w:'悲しみ', k:'かなしみ', r:'kanashimi', en:'sorrow'}, time:['late','deep','evening']},
  {id:'q32', author:'太宰治', authorR:'Dazai Osamu', work:'富嶽百景', year:'1939', theme:'what suits what',
   jp:'富士には月見草がよく似合ふ。', r:'Fuji ni wa tsukimisō ga yoku niau.',
   en:'The evening primrose suits Fuji well.',
   word:{w:'月見草', k:'つきみそう', r:'tsukimisō', en:'evening primrose'}, time:['evening','afternoon']},
  {id:'q33', author:'太宰治', authorR:'Dazai Osamu', work:'人間失格', year:'1948', theme:'shame',
   jp:'恥の多い生涯を送って来ました。', r:'Haji no ōi shōgai o okutte kimashita.',
   en:'Mine has been a life of much shame.',
   word:{w:'生涯', k:'しょうがい', r:'shōgai', en:'a lifetime, a life as a whole'}, time:['late','deep']},
  {id:'q34', author:'島崎藤村', authorR:'Shimazaki Tōson', work:'若菜集・初恋', year:'1897', theme:'first love',
   jp:'まだあげ初めし前髪の林檎のもとに見えしとき', r:'Mada agehajimeshi maegami no ringo no moto ni mieshi toki',
   en:'When I saw you beneath the apple tree, your forelocks only newly put up.',
   word:{w:'前髪', k:'まえがみ', r:'maegami', en:'forelocks'}, time:['wayEarly','morning','evening']},
  {id:'q35', author:'井伊直弼', authorR:'Ii Naosuke', work:'茶湯一会集', year:'1858', theme:'meeting',
   jp:'一期一会。', r:'Ichigo ichie.',
   en:'One lifetime, one meeting — this gathering will not come again.',
   word:{w:'一期一会', k:'いちごいちえ', r:'ichigo ichie', en:'this meeting, once and never again'}, time:['midday','evening','afternoon']},
];
export const Q_BY_ID = Object.fromEntries(QUOTES.map(q=>[q.id,q]));
export const SEKKI = [
  ['01-06','小寒','Shōkan','lesser cold'],['01-20','大寒','Daikan','greater cold'],
  ['02-04','立春','Risshun','beginning of spring'],['02-19','雨水','Usui','rainwater'],
  ['03-05','啓蟄','Keichitsu','insects awaken'],['03-20','春分','Shunbun','vernal equinox'],
  ['04-05','清明','Seimei','clear and bright'],['04-20','穀雨','Kokuu','grain rain'],
  ['05-05','立夏','Rikka','beginning of summer'],['05-21','小満','Shōman','lesser fullness'],
  ['06-06','芒種','Bōshu','grain in ear'],['06-21','夏至','Geshi','summer solstice'],
  ['07-07','小暑','Shōsho','lesser heat'],['07-23','大暑','Taisho','greater heat'],
  ['08-08','立秋','Risshū','beginning of autumn'],['08-23','処暑','Shosho','heat retreats'],
  ['09-08','白露','Hakuro','white dew'],['09-23','秋分','Shūbun','autumnal equinox'],
  ['10-08','寒露','Kanro','cold dew'],['10-24','霜降','Sōkō','frost falls'],
  ['11-07','立冬','Rittō','beginning of winter'],['11-22','小雪','Shōsetsu','lesser snow'],
  ['12-07','大雪','Taisetsu','greater snow'],['12-22','冬至','Tōji','winter solstice'],
];
export const NOTABLE = {
  '01-01':{jp:'元日', r:'Ganjitsu', en:'New Year’s Day', quote:'q7'},
  '02-03':{jp:'節分', r:'Setsubun', en:'the turn of the season', quote:'q4'},
  '03-03':{jp:'桃の節句', r:'Momo no Sekku', en:'the peach festival', quote:'q34'},
  '05-05':{jp:'端午の節句', r:'Tango no Sekku', en:'children’s day', quote:'q13'},
  '07-07':{jp:'七夕', r:'Tanabata', en:'the star festival — one meeting a year', quote:'q35'},
  '08-11':{jp:'山の日', r:'Yama no Hi', en:'mountain day', quote:'q20'},
  '09-09':{jp:'重陽', r:'Chōyō', en:'the chrysanthemum festival', quote:'q14'},
  '11-03':{jp:'文化の日', r:'Bunka no Hi', en:'culture day', quote:'q12'},
  '12-31':{jp:'大晦日', r:'Ōmisoka', en:'the last night of the year', quote:'q1'},
};

export const STUDY_STATUS = ['Inbox','Not started','Studying','Studied','Archived'];
export const STUDY_PRIORITY = ['Low','Medium','High'];
export const STUDY_CATEGORY = ['Video Game','Anime OP / ED','Film / TV','Concert work','Traditional','Pop / Song','Other'];
export const STUDY_COLS = ['Work / Piece','Source Link','Study Target / Why','Collection / Hub','Creator / Channel','Franchise / Series','Style Family','Style Detail / Influence','Format / Lens','Category','Tags','Status','Priority','Next Study Action','Ref ID'];
export const SEED_STUDY = [
  {id:'s1', refId:'ML-0001', title:'Witch hat OP theme', link:'', why:'Ending quick 3 chords', hub:'Anime OP / ED', creator:'', franchise:'Witch Hat', styleFamily:'Anime / Pop', styleDetail:'Opening theme', format:'Original Track', category:'Anime OP / ED', tags:'harmony, cadence', status:'Not started', priority:'Medium', next:'Transcribe the last three chords', inst:'piano', goalId:'g3', added:'2026-07-12'},
  {id:'s2', refId:'WAT-001', title:'Watari Dori', link:'', why:'Powell Street exploration — place feels alive without sentimentality', hub:'Game OST', creator:'', franchise:'Watari Dori', styleFamily:'Game OST', styleDetail:'exploration cue', format:'Reference brief', category:'Video Game', tags:'nostalgic, wonder, exploration', status:'Studying', priority:'High', next:'Map the shakuhachi/koto layering', inst:'shaku', goalId:'g2', added:'2026-07-18'},
  {id:'s3', refId:'ML-0002', title:'insaneintherainmusic — jazz arrangement breakdown', link:'', why:'Reharmonisation habits worth stealing', hub:'General Inbox', creator:'insaneintherainmusic', franchise:'Splatoon', styleFamily:'Splatoon Sound', styleDetail:'Splatoon-coded', format:'Arrangement', category:'Video Game', tags:'reharmonisation, big band', status:'Inbox', priority:'Medium', next:'', inst:'trumpet', goalId:'g1', added:'2026-07-25'},
  {id:'s4', refId:'ML-0003', title:'Honkyoku — Kokū', link:'', why:'Ornament vocabulary and breath as rhythm', hub:'Traditional', creator:'', franchise:'', styleFamily:'Honkyoku', styleDetail:'solo shakuhachi', format:'Original Track', category:'Traditional', tags:'meri, ornament, silence', status:'Studying', priority:'High', next:'Notate the meri passages', inst:'shaku', goalId:'g2', added:'2026-06-30'},
];

export const SHAKU_PHASES = ['Warm up','Technical','Repertoire'];
export const SHAKU_ROUTINE = [
  {id:'sr1', phase:'Warm up', label:'呂吹 — ro-buki', mins:'5–8', cues:[
    'Pressure and metallic tone — lean into it, don’t clean it up.',
    'Heavy crescendo: take the whole dynamic range on the way up.',
    'Nothing technical yet. Air first.']},
  {id:'sr2', phase:'Technical', label:'Long tones', mins:'8–10', cues:[
    'Vibrato: circular first, then diagonal.',
    'Diagonal against the metronome — one specific speed at a time.',
    'Relaxed neck, posture, hands. Right hand thumb especially.',
    'Meditative, but with focus. This is the one not to rush.']},
  {id:'sr3', phase:'Technical', label:'Fading in / fading out', mins:'4–5', cues:[
    'Extreme dynamics: enter out of nothing, leave to nothing.']},
  {id:'sr4', phase:'Technical', label:'Seamless octave jumps', mins:'6–8', cues:[
    'Bottom lip does 60% of the work — pout harder.',
    'Do NOT blow harder. Tighten the embouchure and the aperture.',
    'Sit as low as possible on the note, right at the edge of breaking — that is where the tone is fattest.',
    'The great players don’t have perfect tone either; the breaks belong. These instruments carry a hardened, pained sound, and that is the point.']},
  {id:'sr5', phase:'Repertoire', label:'Play the licks — honkyoku', mins:'10', cues:[
    'Improvise the Japanese effects; keep it honkyoku in spirit.',
    'Kevin pulled a phrase straight out of shōmyō — the chant the music came from.',
    'Tick the phrases below as you play them so they stop disappearing.']},
  {id:'sr6', phase:'Repertoire', label:'Play what you enjoy', mins:'15–20', cues:[
    'Songs you actually want to play, by ear.',
    'City pop counts — Stay With Me, Friday Chinatown.',
    'Always the last 15–20 minutes. The brain has to keep associating the instrument with fun.']},
];
export function seedRoutineSteps(){ return clone(SHAKU_ROUTINE).map(s=>Object.assign({inst:'shaku'}, s)); }
export const LICK_SOURCES = ['Honkyoku','Shōmyō','Improv','City pop','By ear'];
// The phrase library ships with its real content, but no play history —
// `plays` fills in as you tick them off while logging a shakuhachi session.
export function seedLicks(){
  const today = toKey(new Date());
  return [
    {id:'lk1', name:'Shōmyō phrase — from Kevin', source:'Shōmyō', notation:'ロ ─ ツ レ ─ ロ',
     note:'Straight out of chant. Low, no vibrato, one breath, no hurry.', added:today, plays:[]},
    {id:'lk2', name:'Kokū opening — breath as rhythm', source:'Honkyoku', notation:'ロ〜 ツメリ ─ レ',
     note:'Let the meri sag before it resolves. The silence is half the phrase.', added:today, plays:[]},
    {id:'lk3', name:'Octave snap into ハ', source:'Improv', notation:'ロ ↑ ハ',
     note:'Pout, don’t push. Sits right on the break.', added:today, plays:[]},
    {id:'lk4', name:'Stay With Me — head, by ear', source:'City pop', notation:'',
     note:'Sits well in the lower octave; slide into the fourth instead of tonguing it.', added:today, plays:[]},
  ];
}

// Every repeating task now belongs to a goal or a project — a task that only
// named an instrument was a habit checklist wired to nothing, so the seeded
// instrument-only ones are gone. Create tasks from Setup, against the thing
// they actually serve.
export const DEFAULT_TASKS = [];

export let GOALS = [
  {id:'g1', area:'Music', name:'Idiomatic improvisation on jazz trumpet', activities:['trumpet','ear','piano'], steps:[
    {id:'g1s1', label:'ii–V vocabulary clean in all twelve keys', d:'todo'},
    {id:'g1s2', label:'Transcribe four choruses by ear, no score', d:'todo'},
    {id:'g1s3', label:'One standard from memory at three tempos', d:'todo'},
    {id:'g1s4', label:'Sit in at a session and take a full chorus', d:'todo'},
  ]},
  {id:'g2', area:'Music', name:'Idiomatic shakuhachi — honkyoku ornaments, meri/kari', activities:['shaku'], steps:[
    {id:'g2s1', label:'Meri stable across the lower octave', d:'todo'},
    {id:'g2s2', label:'Two honkyoku memorised end to end', d:'todo'},
    {id:'g2s3', label:'Ornament vocabulary written into my own notation', d:'todo'},
    {id:'g2s4', label:'Record one piece worth keeping', d:'todo'},
  ]},
  {id:'g3', area:'Music', name:'Composition — finish and deliver, not just start', activities:['comp','piano','shino','shaku'], steps:[
    {id:'g3s1', label:'A cue a fortnight, delivered', d:'todo'},
    {id:'g3s2', label:'Build a personal template that survives a deadline', d:'todo'},
    {id:'g3s3', label:'Score one documentary reel start to finish', d:'todo'},
  ]},
  {id:'g4', area:'Brass band', name:'Brass band repertoire and arranging', activities:['trumpet','comp','piano'], steps:[
    {id:'g4s1', label:'Four arrangements the band can actually read', d:'todo'},
    {id:'g4s2', label:'Rehearsal plan written before each Saturday', d:'todo'},
    {id:'g4s3', label:'A programme that holds a full concert', d:'todo'},
  ]},
  {id:'g5', area:'Health / strength', name:'Strength training that survives a sprint week', activities:['strength'], steps:[
    {id:'g5s1', label:'Three sessions a week for eight weeks', d:'todo'},
    {id:'g5s2', label:'Bodyweight press, clean form', d:'todo'},
    {id:'g5s3', label:'Keep it running through a project sprint', d:'todo'},
  ]},
  {id:'g6', area:'Japanese', name:'Read a novel without reaching for the dictionary', activities:['jpn'], steps:[
    {id:'g6s1', label:'Daily reading, no zero days', d:'todo'},
    {id:'g6s2', label:'Finish one full volume', d:'todo'},
    {id:'g6s3', label:'Immersion on the bike counts and sticks', d:'todo'},
  ]},
];
export const SEED_GOALS = GOALS.slice();
export function applyGoals(list){ GOALS = list; }

// Live binding, same pattern as GOALS: applyProjects() rebinds this so every
// module that imported it sees the user's current list rather than the seed.
//
// Ships empty — projects are short, time-boxed pushes you start yourself from
// the Today screen's Project mode. (The original design's five demo projects
// are preserved in reference/Kata.dc.html if they are ever wanted back.)
export let PROJECTS = [];
export const SEED_PROJECTS = PROJECTS.slice();
export function applyProjects(list){ PROJECTS = list; }

// Fresh slate: no fabricated completion dates. (Kept as an empty map so the
// stepDoneAt() fallback that reads it still resolves.)
export const SEED_DONE_DATES = {};


export const DAYS = [
  {id:'mon', name:'Mon', fixed:'French horn · work 15:00–22:00', slots:2},
  {id:'tue', name:'Tue', fixed:'Work 15:00–22:00', slots:2},
  {id:'wed', name:'Wed', fixed:'Jazz trumpet session · work 15:00–22:00', slots:2},
  {id:'thu', name:'Thu', fixed:'Work 15:00–22:00', slots:2},
  {id:'fri', name:'Fri', fixed:'Work 15:00–22:00', slots:2},
  {id:'sat', name:'Sat', fixed:'Brass band rehearsal 10:00–12:00 — I run it', slots:1},
  {id:'sun', name:'Sun', fixed:'Taiko 10:00–12:00', slots:1},
];
export const DEFAULT_ROTATION = {
  mon:['piano','comp'], tue:['shaku','trumpet'], wed:['trumpet','piano'],
  thu:['shino','comp'], fri:['shaku','taiko'], sat:['comp'], sun:['piano'],
};
export const DEFAULT_BLOCKS = {ear:15, a:45, b:45, jpn:30, cardio:35, strength:25};
export const DEFAULT_STRENGTH_DAYS = ['tue','fri'];

export function toKey(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
export function labelFor(dateStr){
  return new Date(dateStr+'T00:00:00').toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
}
export function mondayOf(d){
  const x = new Date(d); x.setHours(0,0,0,0);
  const off = (x.getDay()+6)%7;
  x.setDate(x.getDate()-off);
  return x;
}
export const STEP_STYLE = {
  todo: {fill:'none', stroke:'color-mix(in srgb, var(--color-text) 32%, transparent)', dash:'3 3', color:'color-mix(in srgb, var(--color-text) 62%, transparent)'},
  progress: {fill:'none', stroke:'var(--color-accent)', dash:'none', color:'var(--color-text)'},
  done: {fill:'var(--color-accent)', stroke:'var(--color-accent)', dash:'none', color:'color-mix(in srgb, var(--color-text) 42%, transparent)'},
};
export const NEXT_STATUS = {todo:'progress', progress:'done', done:'todo'};
