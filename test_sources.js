const fs = require('fs');
const vm = require('vm');

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
  requestAnimationFrame:(fn)=>{fn();},
  alert:(m)=>{}, confirm:()=>true, prompt:()=>"",
  navigator:{}, localStorage:{_d:{},getItem(k){return this._d[k]||null;},setItem(k,v){this._d[k]=String(v);},clear(){this._d={};}},
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
ctx.window.scrollTo = (x,y)=>{ ctx._scrolledTo = y; };
ctx.pageYOffset = 0;

// 注入最小 WORDS + SOURCES
ctx.WORDS = [
  {word:"why", ipa:"/waɪ/", zh:"为什么", def:"疑问副词", example:"", context:"I don't know why he sounds like an advertisement", category:"其他"},
  {word:"advertisement", ipa:"/ˌædvərˈtaɪzmənt/", zh:"广告", def:"宣传内容", example:"", context:"", category:"其他"},
  {word:"clean", ipa:"", zh:"清音", def:"", example:"", context:"", category:"吉他"},
  {word:"guitar", ipa:"", zh:"吉他", def:"", example:"", context:"", category:"吉他"},
  {word:"chords", ipa:"", zh:"和弦", def:"", example:"", context:"", category:"键盘"},
  {word:"spacious", ipa:"", zh:"宽敞", def:"", example:"", context:"", category:"其他"},
];
ctx.SOURCES = [
  {date:"2026-09-23", text:"I don't know why he sounds like an advertisement", translation:"我不知道为什么他听起来像一个广告。", branches:[{word:"why",zh:"为什么"},{word:"advertisement",zh:"广告"}]},
  {date:"2026-09-23", text:"Why did you leave so early yesterday", translation:"你昨天为什么这么早离开？", branches:[{word:"why",zh:"为什么"}]},
];
ctx.window.WORDS = ctx.WORDS;
ctx.window.SOURCES = ctx.SOURCES;

vm.createContext(ctx);
vm.runInContext(appJs, ctx);

let passed=0, failed=0;
function ok(cond,msg){if(cond){passed++;}else{failed++;console.log("✗ FAIL:",msg);}}

// sourcesOf 匹配
ok(ctx.sourcesOf({word:"why"}).length===2, "why 应匹配 2 条记录");
ok(ctx.sourcesOf({word:"advertisement"}).length===1, "advertisement 应匹配 1 条");
ok(ctx.sourcesOf({word:"nope"}).length===0, "nope 应匹配 0 条");

// 大小写不敏感
ok(ctx.sourcesOf({word:"WHY"}).length===2, "WHY(大写) 应匹配 2 条");

// hlText 高亮
const hl = ctx.hlText("I don't know why he sounds like an advertisement", "why");
ok(hl.includes('<mark class="hl">why</mark>'), "hlText 应高亮 why");

// renderSources 渲染
try{
  ctx.renderSources("why", "renderList");
  ok(String(mainEl.innerHTML).includes("其他源自"), "renderSources 渲染含标题");
  ok(String(mainEl.innerHTML).includes("共 2 处语境"), "renderSources 渲染含计数");
}catch(e){failed++;console.log("✗ FAIL renderSources:",e.message);}

// openDetail 含「其他源自」按钮
try{
  ctx.openDetail("why", "renderList");
  const h = String(mainEl.innerHTML);
  ok(h.includes("其他源自 · 2 处语境"), "openDetail 含其他源自按钮");
}catch(e){failed++;console.log("✗ FAIL openDetail:",e.message);}

// 滚动修复：openDetailFromList 保存 + renderList 恢复（let 变量不挂 ctx，用行为验证）
try{
  ctx.pageYOffset = 5000;
  ctx.document.documentElement.scrollTop = 5000;
  ctx._scrolledTo = -1;
  ctx.openDetailFromList("why");
  ctx.renderList();
  ok(ctx._scrolledTo===5000, "从列表进详情后返回应恢复滚动到 5000，实际 "+ctx._scrolledTo);
  ctx._scrolledTo = -1;
  ctx.renderList();
  ok(ctx._scrolledTo===-1, "复位后再次 renderList 不应再恢复滚动");
}catch(e){failed++;console.log("✗ FAIL 滚动修复:",e.message);}

// ===== 其他源自 → 分支词详情可左右滑动（backToSources 上下文）=====
try{
  ctx.SOURCES=[{date:"2026-09-24", text:"clean guitar chords spacious", translation:"", branches:[{word:"clean",zh:"清音"},{word:"guitar",zh:"吉他"},{word:"chords",zh:"和弦"},{word:"spacious",zh:"宽敞"}]}];
  ctx.window.SOURCES=ctx.SOURCES;
  ctx.openBranchWord("guitar","吉他",["clean","guitar","chords","spacious"]);
  ok(String(mainEl.innerHTML).includes("guitar"), "点分支词后详情应显示 guitar");
  ctx.swipeDetail(1);
  ok(String(mainEl.innerHTML).includes("chords"), "右滑后详情应显示 chords（backToSources 可滑动）");
  ctx.swipeDetail(-1);
  ok(String(mainEl.innerHTML).includes("guitar"), "左滑应回到 guitar");
}catch(e){failed++;console.log("✗ FAIL 其他源自滑动:",e.message);}

console.log(`\n===== 通过 ${passed} / 失败 ${failed} =====`);
process.exit(failed?1:0);
