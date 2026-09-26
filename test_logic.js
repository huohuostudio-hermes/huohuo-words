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
    documentElement:{scrollTop:0},
    body:{scrollTop:0},
  },
  inputEl, mainEl, fbEl, streakEl, badgeEl, hintEl, process,
};
ctx.window = ctx;
ctx.window.scrollTo = (x,y)=>{};
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
renderOK("renderExplain(wrong)", ()=>renderExplain(true));

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

// 12. 提示一级：按一次直接显示单词（音标已常驻中文下方）
session={mcqQueue:[],spellQueue:[WORDS[0]],pendingSpell:[],failQueue:[],current:WORDS[0],wordWrong:false,addedToFail:false};
renderSpell();
ok(session.hintUsed===false && session.hintLevel===0, "初始无提示");
ok(mainEl.innerHTML.indexOf(WORDS[0].ipa)>=0, "音标常驻中文下方");
toggleHint();
ok(session.hintLevel===1 && session.hintUsed===true, "第1次提示直接显示单词");
ok(hintEl.innerHTML.indexOf(WORDS[0].word)>=0, "单词已显示");

// 13. 用了提示即使拼对也不算掌握，进 failQueue
progress = normalize({cards:{},settings:{dailyNew:10},stats:{}});
markLearned(WORDS[0]);
session={mcqQueue:[],spellQueue:[WORDS[0]],pendingSpell:[],failQueue:[],current:WORDS[0],wordWrong:false,addedToFail:false};
renderSpell();
toggleHint();
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

// 14b. 分组页按日期分组 + 多选状态灯
progress = normalize({cards:{},settings:{dailyNew:10},stats:{}});
markLearned(WORDS[0]); markMastered(WORDS[1]);
showGroup("learned");
ok(String(mainEl.innerHTML).indexOf("datehead")>=0, "已学习页按日期分组含日期头");
ok(String(mainEl.innerHTML).indexOf("今天 · ")>=0, "日期头显示「今天」");
enterSelect();
ok(String(mainEl.innerHTML).indexOf('class="dot')>=0, "多选模式仍显示状态灯 dot");

// 14c. 日期头折叠 + 抽卡只取展开组 + deck 拼写全部
progress = normalize({cards:{},settings:{dailyNew:10},stats:{}});
markLearned(WORDS[0]); markLearned(WORDS[1]); markMastered(WORDS[2]);
showGroup("learned");
ok(String(mainEl.innerHTML).indexOf("darrow")>=0, "日期头含折叠箭头");
const gTotal=groupWordsOf("learned").length;
toggleGroupDate(todayStr());
ok(groupCollapsed.has(todayStr()), "折叠今天后 groupCollapsed 记录该日期");
ok(groupVisibleWords("learned").length < gTotal, "折叠后可见词变少");
toggleGroupDate(todayStr());
ok(groupVisibleWords("learned").length===gTotal, "再点展开恢复全部可见");
showGroup("learned");
cardDeck={cards:[{w:WORDS[0]},{w:WORDS[1]},{w:WORDS[2]}],idx:0,flipped:false};
deckSpellAll();
ok(session.spellQueue.length===3, "deckSpellAll 3 词进拼写队列");

// 14d. 重复拼写不改 masteredOn（已掌握日期固定为首次拼写日）
progress = normalize({cards:{},settings:{dailyNew:10},stats:{}});
markMastered(WORDS[0]);
cardOf(WORDS[0]).masteredOn = "2026-09-25";
markMastered(WORDS[0]);
ok(cardOf(WORDS[0]).masteredOn === "2026-09-25", "再次拼写不改 masteredOn（保持首次日期）");

// 15. 词网渲染冒烟 + 边/布局
progress = normalize({cards:{},settings:{dailyNew:10},stats:{}});
chainCat="乐器们";
renderOK("graphCardInner(乐器们)", ()=>graphCardInner());
renderOK("renderMenu含词网", ()=>renderMenu());
const gwords=allWords().filter(w=>catOf(w)==="乐器们");
const gedges=buildEdges(gwords);
ok(gedges.length>0, "乐器们词网应有边");
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
const rt=[{x:1,y:0,z:0},{x:0.999,y:0.045,z:0},{x:0,y:1,z:0}];
const angB=(a,b)=>Math.acos(Math.min(1,Math.max(-1,a.x*b.x+a.y*b.y+a.z*b.z)));
const bmin=Math.min(angB(rt[0],rt[1]),angB(rt[0],rt[2]),angB(rt[1],rt[2]));
relaxSphere(rt, rt.length);
const amin=Math.min(angB(rt[0],rt[1]),angB(rt[0],rt[2]),angB(rt[1],rt[2]));
ok(amin>bmin, "relaxSphere 增大最小角距");
ok(rt.every(p=>Math.abs(Math.hypot(p.x,p.y,p.z)-1)<1e-6), "relaxSphere 保持单位向量");

// 16. 隐藏/恢复
progress = normalize({cards:{},settings:{dailyNew:10},stats:{}});
const totalBefore=allWords().length;
hideWord(WORDS[0].word);
ok(isHidden(WORDS[0]), "隐藏后 isHidden=true");
ok(allWords().length===totalBefore-1, "隐藏后总词数-1");
unhideWord(WORDS[0].word);
ok(!isHidden(WORDS[0]), "恢复后 isHidden=false");
delWord(WORDS[0].word, "renderList");
ok(isHidden(WORDS[0]), "详情页 delWord 删除后 isHidden=true");
unhideWord(WORDS[0].word);

// 17. 移标签/重置
setWordCat(WORDS[0].word,"乐器们");
ok(catOf(WORDS[0])==="乐器们", "移标签后 catOf=乐器们");
resetWordCat(WORDS[0].word);
ok(catOf(WORDS[0])===WORDS[0].category, "重置标签恢复原分类");
reTag(WORDS[0].word,"乐器们","renderList");
ok(catOf(WORDS[0])==="乐器们", "详情页 reTag 改分类=乐器们");
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

// 19. 密码锁
ok(typeof PW_HASH==="string" && PW_HASH.length===64, "PW_HASH 是 64 位十六进制");
let lt=false; try{ checkLock(); lockNow(); }catch(e){ lt=true; }
ok(!lt, "checkLock/lockNow 不抛错");

// 20. 单词本多选
progress = normalize({cards:{},settings:{dailyNew:10},stats:{}});
curCat="全部"; curQuery="";
renderOK("renderList(进入多选)", ()=>{ enterListSelect(); });
ok(listSelectMode===true, "enterListSelect 后 listSelectMode=true");
renderOK("renderList(勾选2词)", ()=>{ toggleListWord(WORDS[0].word); toggleListWord(WORDS[1].word); });
ok(listSelected.size===2, "勾选2词后 listSelected.size=2");
renderOK("renderList(全选)", ()=>{ listSelectAll(); });
ok(listSelected.size===currentListWords().length, "全选后选中数=当前词表数");
actListSelected("learn");
ok(session.mcqQueue.length===currentListWords().length, "actListSelected(learn) 进队列=词表数");
renderOK("renderList(退出多选)", ()=>{ exitListSelect(); });
ok(listSelectMode===false, "exitListSelect 后 listSelectMode=false");


// 21. 收藏
progress = normalize({cards:{},settings:{dailyNew:10},stats:{}});
ok(isFav(WORDS[0])===false, "初始未收藏");
toggleFav(WORDS[0].word);
ok(isFav(WORDS[0])===true, "收藏后 isFav=true");
ok(favCount()===1, "favCount=1");
toggleFav(WORDS[0].word);
ok(favCount()===0, "取消收藏 favCount=0");
toggleFav(WORDS[1].word);
renderOK("renderFavs(有收藏)", ()=>renderFavs());
enterFavSelect();
toggleFavWord(WORDS[1].word);
ok(favSelected.size===1, "收藏多选勾选1");
actFavSelected("review");
ok(session.spellQueue.length===1, "收藏复习所选1词");
exitFavSelect();

// 22. 单词本（分类）管理：改名 / 新建 / 删除
progress = normalize({cards:{},settings:{dailyNew:10},stats:{}});
ok(catName("乐器们")==="乐器们", "未改名 catName 返回原名");
ok(catsList().includes("乐器们"), "catsList 含基础分类");
progress.catNames={"乐器们":"鼓组"};
ok(catName("乐器们")==="鼓组", "改名后 catName=鼓组");
ok(catsList().includes("鼓组") && !catsList().includes("乐器们"), "catsList 显示新名");
const _drum=WORDS.find(w=>w.category==="乐器们");
ok(_drum && catOf(_drum)==="鼓组", "改名后 catOf 返回新名");
progress.catNames={};
ok(addCat("女朋友的歌")===true, "addCat 新增自定义单词本");
ok(progress.customCats.includes("女朋友的歌"), "customCats 含新单词本");
ok(catsList().includes("女朋友的歌"), "catsList 含自定义");
addCat("女朋友的歌"); // 重复应拒绝
ok(progress.customCats.length===1, "重复 addCat 被拒绝");
setWordCat(WORDS[0].word, "女朋友的歌");
delCat("女朋友的歌");
ok(!catsList().includes("女朋友的歌"), "delCat 后不在列表");
ok(!progress.catOverride[WORDS[0].word], "delCat 清掉该分类下的 catOverride");
renderOK("renderCatManager", ()=>renderCatManager());
progress.catNames={}; progress.customCats=[]; curCat="全部";
renderOK("renderList(带管理chip)", ()=>renderList());

// 22b. 删除/恢复自动生成单词本 + 多选批量拖拽手柄存在
progress.deletedCats=[]; progress.catNames={}; progress.customCats=[];
ok(catsList().includes("乐器们"), "删除前 catsList 含乐器们");
delBaseCat("乐器们");
ok(!catsList().includes("乐器们"), "delBaseCat 后 catsList 不含乐器们");
ok(progress.deletedCats.includes("乐器们"), "deletedCats 记录乐器们");
setWordCat(WORDS[0].word, "乐器们");
delBaseCat("乐器们");
ok(!progress.catOverride[WORDS[0].word], "delBaseCat 清掉该分类 catOverride");
restoreBaseCat("乐器们");
ok(catsList().includes("乐器们") && !progress.deletedCats.includes("乐器们"), "restoreBaseCat 恢复乐器们");
ok(typeof batchHandleDown==="function", "batchHandleDown 已定义");
progress.deletedCats=[]; progress.catNames={}; progress.customCats=[]; curCat="全部";

// 23. 其他源自分支可点（openBranchWord/backToSources 存在且不抛错）
renderOK("renderSources", ()=>renderSources(WORDS[0].word, "renderList"));
ok(typeof openBranchWord==="function" && typeof backToSources==="function", "openBranchWord/backToSources 已定义");

// 23b. 其他源自：分支词大小写不敏感 + 未收录词轻量详情 + 返回栈逐层
ok(resolveWord("chords")==="Chords", "resolveWord 大小写不敏感：chords→Chords");
ok(resolveWord("clean")==="Clean", "resolveWord 大小写不敏感：clean→Clean");
ok(resolveWord("CLEAN GUITAR")==="clean guitar", "resolveWord 大小写不敏感：CLEAN GUITAR→clean guitar");
ok(resolveWord("zzznonexist")===null, "resolveWord 未收录词返回 null");

renderSources("Clean", "renderList");
openBranchWord("clean guitar", "清音吉他");
ok(String(mainEl.innerHTML).indexOf("尚未收录")<0, "clean guitar 已在词库→进入正式详情页");
renderSources("clean guitar", "backToSources");
openBranchWord("chords", "和弦");
ok(String(mainEl.innerHTML).indexOf("Chords")>=0, "chords(小写) 大小写不敏感进入 Chords 详情");
backToSources();
ok(String(mainEl.innerHTML).indexOf("clean guitar")>=0, "返回一层→clean guitar 其他源自");
backToSources();
ok(String(mainEl.innerHTML).indexOf("Clean")>=0, "返回两层→Clean 其他源自");
backToSources();
ok(true, "栈空时返回列表不抛错");

renderSources("Clean", "renderList");
openBranchWord("zzznonexist", "测试未收录词");
ok(String(mainEl.innerHTML).indexOf("尚未收录")>=0 && String(mainEl.innerHTML).indexOf("查词典")>=0, "未收录词打开轻量详情(提示+查词典)");

// 24. 词网收起
graphCollapsed=true;
let ghtml=graphCardInner();
ok(String(ghtml).indexOf("已收起")>=0, "收起态含「已收起」");
ok(String(ghtml).indexOf("graphwrap")<0, "收起态不含 graphwrap");
graphCollapsed=false;
ghtml=graphCardInner();
ok(String(ghtml).indexOf("graphwrap")>=0, "展开态含 graphwrap");
ok(String(ghtml).indexOf("已收起")<0, "展开态不含「已收起」");

// 25. contextBlock 译文
ok(contextBlock({context:"I don't know why he forgot to buy milk", contextZh:"我不知道他为什么忘了买牛奶。"}).indexOf("译文")>=0, "有 contextZh 时含译文");
ok(contextBlock({context:"x", contextZh:""}).indexOf("译文")<0, "无 contextZh 时不显示译文");
ok(contextBlock({context:""})==="", "无 context 时返回空");

console.log("===== 通过 "+passed+" / 失败 "+failed+" =====");
if(failed>0) process.exitCode=1;
`;
vm.runInContext(wordsJs + "\n" + appJs + "\n" + testCode, ctx);
