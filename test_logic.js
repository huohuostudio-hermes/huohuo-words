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
const mainEl = fakeEl(), inputEl = fakeEl(), fbEl = fakeEl(), streakEl = fakeEl(),
      badgeEl = fakeEl(), hintEl = fakeEl();

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
      if(sel==="#hintBox")return hintEl;
      return mainEl;
    },
    querySelectorAll(sel){return [];},
  },
  inputEl, mainEl, fbEl, streakEl, badgeEl, hintEl, process,
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

// 初始状态
ok(pickNew(10).length===10, "pickNew(10) 应 10 个");
ok(learningCount()===0, "初始待复习=0");
ok(masteredCount()===0, "初始已掌握=0");

// 学习 → learning
markLearned(WORDS[0]);
ok(cardState(WORDS[0])==="learning", "学后状态=learning");
ok(learningCount()===1, "学后待复习=1");
ok(masteredCount()===0, "学后尚未掌握=0");

// 复习拼对 → mastered
session={spellQueue:[WORDS[0]],failQueue:[],current:WORDS[0],wordWrong:false,addedToFail:false};
inputEl.value=WORDS[0].word; submitSpell();
ok(cardState(WORDS[0])==="mastered", "拼对后状态=mastered");
ok(masteredCount()===1, "拼对后已掌握=1");

// 拼错 → 进 failQueue，仍 learning
markLearned(WORDS[1]); markLearned(WORDS[2]);
session={spellQueue:[WORDS[1],WORDS[2]],failQueue:[],current:WORDS[1],wordWrong:false,addedToFail:false};
inputEl.value="wrongxxx"; submitSpell();
ok(session.wordWrong===true, "拼错后 wordWrong=true");
ok(session.failQueue.length===1, "错词进 failQueue");
ok(cardState(WORDS[1])==="learning", "拼错后仍 learning");

// 提示按钮可见性（renderSpell 生成含 hintBox 的 HTML）
session={spellQueue:[WORDS[2]],failQueue:[],current:WORDS[2],wordWrong:false,addedToFail:false};
renderSpell();
ok(mainEl.innerHTML.indexOf("hintbtn")>=0, "复习页应含提示按钮");
ok(mainEl.innerHTML.indexOf("hintBox")>=0, "复习页应含提示内容区");

console.log("===== 通过 "+passed+" / 失败 "+failed+" =====");
if(failed>0) process.exitCode=1;
`;
vm.runInContext(wordsJs + "\n" + appJs + "\n" + testCode, ctx);
