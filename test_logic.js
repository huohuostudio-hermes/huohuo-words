const fs = require('fs');
const vm = require('vm');

const wordsJs = fs.readFileSync('words.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script>\s*"use strict";([\s\S]*?)<\/script>\s*<\/body>/);
if (!m) { console.error('未找到内联 script'); process.exit(1); }
const appJs = '"use strict";' + m[1];

function fakeEl(){return {innerHTML:"",textContent:"",value:"",className:"",
  classList:{add(){},remove(){},toggle(){},contains(){return false}},
  style:{},focus(){},addEventListener(){},dataset:{},onclick:null};}
const mainEl = fakeEl(), inputEl = fakeEl(), fbEl = fakeEl(), streakEl = fakeEl(), badgeEl = fakeEl();

const ctx = {
  console, Math, Date, JSON, Object, Array, String, Number, RegExp, Set, Map,
  setTimeout:(fn)=>{fn();}, clearTimeout:()=>{},
  alert:(m)=>{}, confirm:()=>true, prompt:()=>"",
  navigator:{},
  localStorage:{_d:{},getItem(k){return this._d[k]||null;},setItem(k,v){this._d[k]=String(v);},clear(){this._d={};}},
  document:{
    querySelector(sel){
      if(sel==="#spellInput")return inputEl;
      if(sel==="#fb")return fbEl;
      if(sel==="#streakNum")return streakEl;
      if(sel==="#badgeStudy")return badgeEl;
      return mainEl;
    },
    querySelectorAll(sel){return [];},
  },
  inputEl, mainEl, fbEl, streakEl, badgeEl, process,
};
ctx.window = ctx;
vm.createContext(ctx);

const testCode = `
let passed=0, failed=0;
function ok(cond,msg){if(cond){passed++;}else{failed++;console.log("✗ FAIL:",msg);}}

ok(WORDS.length>=57, "WORDS 应 >=57，实际 "+WORDS.length);

const w0=WORDS[0];
const opts=buildOptions(w0);
ok(opts.length===4, "选项应 4 个，实际 "+opts.length);
ok(opts.filter(o=>o===w0.zh).length===1, "应恰好 1 个正确选项");
ok(new Set(opts).size===4, "选项应互不重复");

ok(pickNew(10).length===10, "pickNew(10) 应 10 个");
ok(pickDue().length===0, "初始应 0 个待复习");

beginSession();
ok(session.mcqQueue.length===10, "mcqQueue 应 10，实际 "+session.mcqQueue.length);
ok(session.spellQueue.length===10, "spellQueue 应 10(新词)，实际 "+session.spellQueue.length);

// SRS 间隔
const w=WORDS[0];
updateSRS(w,true); ok(progress.cards[w.word].interval===1,"首次正确 interval=1");
updateSRS(w,true); ok(progress.cards[w.word].interval===3,"二次正确 interval=3");
updateSRS(w,true); ok(progress.cards[w.word].interval===7,"三次正确 interval=7");
updateSRS(w,false); ok(progress.cards[w.word].interval===0,"答错 interval=0");

// 拼写流程
session.mcqQueue=[];
session.spellQueue=[WORDS[0],WORDS[1]];
session.failQueue=[];
startSpell();
ok(session.current.word===WORDS[0].word,"当前拼写词应为第一个");
inputEl.value=WORDS[0].word; submitSpell();
ok(progress.cards[WORDS[0].word] && progress.cards[WORDS[0].word].interval>=1,"拼对后 interval>=1");
ok(session.current.word===WORDS[1].word,"拼对后切到下一词");

inputEl.value="wrongxxx"; submitSpell();
ok(session.wordWrong===true,"拼错后 wordWrong=true");
ok(session.failQueue.length===1,"拼错词进入 failQueue");
ok(session.current.word===WORDS[1].word,"拼错后当前词不变待重拼");

inputEl.value=WORDS[1].word; submitSpell();
ok(progress.cards[WORDS[1].word] && progress.cards[WORDS[1].word].interval===0,"曾拼错的词 interval 回 0");
ok(session.spellQueue.length===1 && session.current.word===WORDS[1].word,"错词循环：稍后再次出现");

console.log("===== 通过 "+passed+" / 失败 "+failed+" =====");
if(failed>0) process.exitCode=1;
`;
vm.runInContext(wordsJs + "\n" + appJs + "\n" + testCode, ctx);
