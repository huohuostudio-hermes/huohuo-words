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
function renderOK(name, fn){
  try{ fn(); ok(String(mainEl.innerHTML).length>0, name+" 渲染非空"); }
  catch(e){ failed++; console.log("✗ FAIL:", name+" 渲染抛错:", e.message); }
}

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

// ===== 渲染冒烟测试（抓模板里引用未定义变量的 ReferenceError） =====
// 1. 全新状态：未达成目标
progress = normalize({cards:{},settings:{dailyNew:10},stats:{}});
renderOK("renderMenu(未达成)", ()=>renderMenu());

// 2. 已达目标（此前 menuCardHTML 引用未定义的 master → 抛错致学习页空白）
progress = normalize({cards:{},settings:{dailyNew:1},stats:{}});
markLearned(WORDS[0]);
renderOK("renderMenu(已达成)", ()=>renderMenu());

// 3. 我的页（此前 const mastered=mastered() 遮蔽函数 → 抛错致页面消失）
progress = normalize({cards:{},settings:{dailyNew:10},stats:{}});
renderOK("renderMe", ()=>renderMe());

// 4. 单词本
renderOK("renderList", ()=>renderList());

// 5. 完成态
renderOK("renderDone", ()=>renderDone());

// 6. 选择题
session={mcqQueue:[WORDS[0]],spellQueue:[],pendingSpell:[],failQueue:[],current:null,wordWrong:false,addedToFail:false};
renderOK("renderMCQ", ()=>renderMCQ());

// 7. 解释页
session={mcqQueue:[],spellQueue:[],pendingSpell:[],failQueue:[],current:WORDS[0],wordWrong:false,addedToFail:false};
renderOK("renderExplain", ()=>renderExplain(false));

// 8. 拼写复习（含提示按钮）
session={mcqQueue:[],spellQueue:[],pendingSpell:[],failQueue:[],current:WORDS[0],wordWrong:false,addedToFail:false};
renderOK("renderSpell", ()=>renderSpell());
ok(String(mainEl.innerHTML).indexOf("hintbtn")>=0, "复习页含提示按钮");

// 9. 拼写解释
renderOK("renderSpellExplain", ()=>renderSpellExplain());

// 10. 分组查看（已学习/已掌握）
progress = normalize({cards:{},settings:{dailyNew:10},stats:{}});
markLearned(WORDS[0]); markMastered(WORDS[1]);
renderOK("showGroup(learned)", ()=>showGroup("learned"));
renderOK("showGroup(mastered)", ()=>showGroup("mastered"));

// 11. 分组再学/再复习会话
beginSessionOn([WORDS[2],WORDS[3]], "review");
ok(session.mcqQueue.length===0 && session.spellQueue.length===2, "review 模式：无MCQ、直接进拼写队列");
beginSessionOn([WORDS[2],WORDS[3]], "learn");
ok(session.mcqQueue.length===2 && session.pendingSpell.length===2, "learn 模式：MCQ=2 且待拼写=2");

// 12. 提示两级：先音标，再单词
session={mcqQueue:[],spellQueue:[WORDS[0]],pendingSpell:[],failQueue:[],current:WORDS[0],wordWrong:false,addedToFail:false};
renderSpell();
ok(session.hintUsed===false && session.hintLevel===0, "初始无提示");
toggleHint();
ok(session.hintLevel===1 && session.hintUsed===true, "第1次提示显示音标");
ok(hintEl.innerHTML.indexOf(WORDS[0].ipa)>=0, "音标已显示");
toggleHint();
ok(session.hintLevel===2, "第2次提示显示单词");
ok(hintEl.innerHTML.indexOf(WORDS[0].word)>=0, "单词已显示");

// 13. 用了提示即使拼对也不算掌握，进 failQueue
progress = normalize({cards:{},settings:{dailyNew:10},stats:{}});
markLearned(WORDS[0]);
session={mcqQueue:[],spellQueue:[WORDS[0]],pendingSpell:[],failQueue:[],current:WORDS[0],wordWrong:false,addedToFail:false};
renderSpell();
toggleHint(); toggleHint();
inputEl.value=WORDS[0].word; submitSpell();
ok(cardState(WORDS[0])==="learning", "用了提示拼对仍 learning（未掌握）");
ok(session.failQueue.length===1, "用了提示进 failQueue");

// 14. 多选
progress = normalize({cards:{},settings:{dailyNew:10},stats:{}});
markLearned(WORDS[0]); markLearned(WORDS[1]);
showGroup("learned");
enterSelect();
toggleSelectWord(WORDS[0].word);
toggleSelectWord(WORDS[1].word);
ok(groupSelected.size===2, "多选勾选 2 个");
actSelected("review");
ok(session.spellQueue.length===2, "复习所选 2 个进队列");

// 15. 词网渲染冒烟 + 边/布局
progress = normalize({cards:{},settings:{dailyNew:10},stats:{}});
chainCat="打击乐";
renderOK("graphCardInner(打击乐)", ()=>graphCardInner());
renderOK("renderMenu含词网", ()=>renderMenu());
const gwords=allWords().filter(w=>catOf(w)==="打击乐");
const gedges=buildEdges(gwords);
ok(gedges.length>0, "打击乐词网应有边");
ok(layoutGraph(gwords,gedges).pos.length===gwords.length, "布局节点数一致");
// 3D 球面 + 旋转数学
buildSphere(true);
ok(gSph.length===gwords.length, "球面点数=词数");
ok(gSph.every(p=>Math.abs(Math.hypot(p.x,p.y,p.z)-1)<1e-6), "球面点为单位向量");
const id=matIdentity();
ok(matVec(id,{x:1,y:2,z:3}).x===1 && matVec(id,{x:1,y:2,z:3}).z===3, "单位矩阵作用向量");
const r90=rotAxisAngle({x:0,y:0,z:1}, Math.PI/2);
const rz=matVec(r90,{x:1,y:0,z:0});
ok(Math.abs(rz.x)<1e-9 && Math.abs(rz.y-1)<1e-9, "绕Z轴90°旋转(1,0,0)→(0,1,0)");
ok(matVec(r90,{x:0,y:0,z:1}).z===1, "绕Z轴旋转保Z分量");
buildSphere(true);
focusWord(gwords[0].word);
const fw=matVec(gRot,gSph[0]);
ok(fw.z>0.999, "focusWord 后选中词移到正面(+z)");
ok(labelReveal(144,1)===0, "密集(全部)最小缩放不显示标签");
ok(labelReveal(144,2.5)===1, "密集放大到2.5显示标签");
ok(labelReveal(14,1)===1, "稀疏(小分类)始终显示标签");

// 16. 隐藏/恢复
progress = normalize({cards:{},settings:{dailyNew:10},stats:{}});
const totalBefore=allWords().length;
hideWord(WORDS[0].word);
ok(isHidden(WORDS[0]), "隐藏后 isHidden=true");
ok(allWords().length===totalBefore-1, "隐藏后总词数-1");
unhideWord(WORDS[0].word);
ok(!isHidden(WORDS[0]), "恢复后 isHidden=false");

// 17. 移标签/重置
setWordCat(WORDS[0].word,"键盘");
ok(catOf(WORDS[0])==="键盘", "移标签后 catOf=键盘");
resetWordCat(WORDS[0].word);
ok(catOf(WORDS[0])===WORDS[0].category, "重置标签恢复原分类");
reTag(WORDS[0].word,"吉他","renderList");
ok(catOf(WORDS[0])==="吉他", "详情页 reTag 改分类=吉他");
resetWordCat(WORDS[0].word);
learnThis(WORDS[0].word);
ok(session.mcqQueue.length===1, "learnThis 进学习队列1词");
reviewThis(WORDS[1].word);
ok(session.spellQueue.length===1, "reviewThis 进复习队列1词");

// 18. 删除后列表渲染
progress = normalize({cards:{},settings:{dailyNew:10},stats:{}});
hideWord(WORDS[0].word);
renderOK("renderList(含隐藏)", ()=>renderList());
renderOK("renderMe(含已删除面板)", ()=>renderMe());

console.log("===== 通过 "+passed+" / 失败 "+failed+" =====");
if(failed>0) process.exitCode=1;
`;
vm.runInContext(wordsJs + "\n" + appJs + "\n" + testCode, ctx);
