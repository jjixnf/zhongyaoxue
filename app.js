"use strict";
const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const key = "bencao-v1-private-records";
const endpointKey = "bencao-v1-ai-worker-url";
let db = {chapters:[],herbs:[],knowledge:[],questions:[],notes:[],events:[],theory:[],catalog:{chapters:{}}};
let user = {records:[]};
try { const parsed = JSON.parse(localStorage.getItem(key) || "{}"); if (Array.isArray(parsed.records)) user.records = parsed.records; } catch {}
const saveUser = () => localStorage.setItem(key,JSON.stringify(user));
const nowShanghai = () => dateOf(new Date().toISOString());
const df = new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"});
function dateOf(value) { const d = new Date(value); if (Number.isNaN(d.getTime())) return ""; const p = Object.fromEntries(df.formatToParts(d).map(x=>[x.type,x.value])); return p.year+"-"+p.month+"-"+p.day; }
function isoDate(y,m,d){return y+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0");}
let activeChapter="all", activeHerb=null, activeTopic=null, activePending=null, chosenDate=nowShanghai();
let calMonth=Number(chosenDate.slice(5,7)), calYear=Number(chosenDate.slice(0,4));
let currentRecordId=null, accessToken="",workerUrl=localStorage.getItem(endpointKey)||"";
const records=()=>[...db.questions.map(r=>({...r,origin:"public"})),...db.notes.map(r=>({...r,origin:"public"})),...user.records.map(r=>({...r,origin:"local"}))];
const herbById=(id)=>db.herbs.find(h=>h.id===id);
const kpById=(id)=>db.knowledge.find(k=>k.id===id);
const chapterById=(id)=>db.chapters.find(c=>c.id===id);
const drugDetailSections=[["indications","主治病证"],["usage","用法用量"],["processing","炮制与用法特点"],["cautions","使用注意"],["pairings","常用配伍"],["differentiation","鉴别要点"],["toxicity","毒性"],["specialNotes","其他考点"]];
function detailItems(entry){return Array.isArray(entry?.items)?entry.items.filter(item=>typeof item?.text==="string"&&item.text.trim()):[];}
function detailText(entry){
 const items=detailItems(entry);
 return items.length?items.map(item=>(item.label?item.label+"：":"")+item.text).join("\n"):(typeof entry?.text==="string"?entry.text:"");
}
function itemText(h){return [h.name,h.nature,...h.flavors,...h.meridians,h.effects,h.groupId,...Object.values(h.details||{}).flatMap(entry=>[entry.text||"",detailText(entry)])].join(" ").toLowerCase();}
function attachedToHerb(r,h){
 if ((r.herbIds||[]).includes(h.id))return true;
 return (r.knowledgeIds||[]).some(id=>(kpById(id)?.herbIds||[]).includes(h.id));
}
function matchingHerbs(){
 const q=$("searchInput").value.trim().toLowerCase(),n=$("natureFilter").value,m=$("meridianFilter").value,all=records();
 return db.herbs.filter(h=>(activeChapter==="all"||h.chapterId===activeChapter)&&(n===""||h.nature===n)&&(m===""||h.meridians.includes(m))&&(!q||itemText(h).includes(q)||all.some(r=>attachedToHerb(r,h)&&[r.title,r.body,r.answer,r.analysis].join(" ").toLowerCase().includes(q))));
}
function renderNav(){
 $("chapterCount").textContent=db.chapters.length+"章";
 $("chapterNav").innerHTML='<button class="nav-item '+(activeChapter==="all"?"active":"")+'" data-chapter="all">全部已录入中药<small>'+db.herbs.length+' 味</small></button>'+db.chapters.map(c=>{
   let count=db.herbs.filter(h=>h.chapterId===c.id).length;
   const directory=db.catalog.chapters?.[c.id]?.length||0;
   return '<button class="nav-item '+((count||c.type==="theory")?"available ":"")+(activeChapter===c.id?"active":"")+'" data-chapter="'+escapeHtml(c.id)+'">'+c.number+'. '+escapeHtml(c.title)+'<small>'+(c.type==="theory"?"理论知识点":count?count+" 味有详情 / "+directory+" 味目录":directory?directory+" 味待补录":"待录入")+'</small></button>';
 }).join("");
 $("chapterNav").querySelectorAll("[data-chapter]").forEach(b=>b.onclick=()=>{activeChapter=b.dataset.chapter;activeHerb=null;activePending=null;render();});
}
function showTheoryChapter(){
 const ch=db.theory.find(x=>x.chapterId===activeChapter);
 if(!ch)return false;
 const q=$("searchInput").value.trim().toLowerCase();
 const topics=ch.topics.filter(x=>!q||(x.title+" "+x.summary).toLowerCase().includes(q));
 $("herbCount").textContent=db.herbs.length+" 味药 + "+db.theory.reduce((n,x)=>n+x.topics.length,0)+" 个理论要点";
 $("coverage").textContent="《学霸笔记—中药学》"+ch.title+"：已整理主题概要，具体考点和细节正逐页补齐；原书 PDF 第"+ch.pdfPages.join("–")+"页。";
 $("resultCount").textContent=topics.length+" 主题";
 if(!topics.some(t=>t.id===activeTopic))activeTopic=topics[0]?.id||null;
 $("herbList").innerHTML=topics.length?topics.map(t=>'<button class="herb-row '+(t.id===activeTopic?"active":"")+'" data-topic="'+escapeHtml(t.id)+'"><strong>'+escapeHtml(t.title)+'</strong><small>PDF第'+escapeHtml(t.pdfPages.join("、"))+'页 · 已建知识点</small></button>').join(""):'<p class="placeholder">无匹配的理论主题。</p>';
 $("herbList").querySelectorAll("[data-topic]").forEach(b=>b.onclick=()=>{activeTopic=b.dataset.topic;showTheoryChapter();});
 const topic=ch.topics.find(t=>t.id===activeTopic);
 if(!topic){$("detailPanel").innerHTML='<p class="placeholder">选择一个知识点查看概述。</p>';return true;}
 const kp="kp-"+topic.id,items=records().filter(x=>(x.knowledgeIds||[]).includes(kp));
 $("detailPanel").innerHTML='<div class="detail-top"><div><span class="tag">'+escapeHtml(ch.title)+'</span><h2>'+escapeHtml(topic.title)+'</h2></div></div><p class="muted">来源：《学霸笔记—中药学》 PDF第'+escapeHtml(topic.pdfPages.join("、"))+'页 · 主题概要（尚未完整录入原书所有细节）</p><div class="subsection"><h3>知识点概述</h3><p>'+escapeHtml(topic.summary)+'</p></div>'+(topic.relatedChapterId?'<div class="subsection"><button id="gotoChapter" type="button">进入'+escapeHtml(chapterById(topic.relatedChapterId)?.title||"对应药物分类")+' →</button></div>':'')+'<div class="subsection"><h3>关联错题与笔记（'+items.length+'）</h3><div class="button-pair"><button id="newTopicQuestion" class="primary" type="button">＋记录错题</button><button id="newTopicNote" type="button">＋记录笔记</button></div>'+(items.length?items.map(recordCard).join(""):'<p class="muted">暂无关联内容。</p>')+'</div>';
 $("gotoChapter")?.addEventListener("click",()=>{activeChapter=topic.relatedChapterId;activeTopic=null;activeHerb=null;render();});
 $("newTopicQuestion").onclick=()=>openRecordForm("question",null,null,kp);
 $("newTopicNote").onclick=()=>openRecordForm("note",null,null,kp);
 enableRecordLinks($("detailPanel"));
 return true;
}
function renderHerbList(){
 if(showTheoryChapter()){renderExtraResults();return;}
 const matches=matchingHerbs();
 const hasFilters=Boolean($("natureFilter").value||$("meridianFilter").value);
 const search=$("searchInput").value.trim().toLowerCase();
 const directory=Object.values(db.catalog.chapters||{}).flat().filter(x=>activeChapter==="all"||x.chapterId===activeChapter);
 const pending=hasFilters?[]:directory.filter(x=>!db.herbs.some(h=>h.name===x.name&&h.chapterId===x.chapterId)&&(!search||x.name.toLowerCase().includes(search)));
 $("herbCount").textContent=db.herbs.length+" 味已有详情 · 全书目录 "+directory.length+" 味";
 $("resultCount").textContent=(matches.length+pending.length)+" 条";
 const c=chapterById(activeChapter);
 $("coverage").textContent=c?(c.title+" · 已录入详情 "+matches.length+" 味，待补充 "+pending.length+" 味；已入库内容仍按原书逐项复核。"):"已建立 "+db.chapters.length+" 章目录；全书药名索引已建立，只有部分药物已完成结构化初稿。";
 if(matches.length && !matches.some(h=>h.id===activeHerb)&&!activePending)activeHerb=matches[0].id;
 if(!matches.length)activeHerb=null;
 if(!activeHerb && !activePending && pending.length)activePending=pending[0].name;
 $("herbList").innerHTML=matches.map(h=>{
  const cat=chapterById(h.chapterId),group=cat?.groups.find(g=>g.id===h.groupId);
  return '<button class="herb-row '+(h.id===activeHerb?"active":"")+'" data-herb="'+escapeHtml(h.id)+'"><strong>'+escapeHtml(h.name)+'</strong><small>'+escapeHtml(group?.title||cat?.title||"")+" · "+escapeHtml(h.nature)+" · "+escapeHtml(h.flavors.join("、"))+" · 归"+escapeHtml(h.meridians.join("、"))+'经</small></button>';
 }).join("")+pending.map(x=>'<button class="herb-row '+(activePending===x.name?"active":"")+'" data-pending="'+escapeHtml(x.name)+'" data-pending-chapter="'+escapeHtml(x.chapterId)+'"><strong>'+escapeHtml(x.name)+'</strong><small>PDF第'+escapeHtml(x.pdfPage)+'页 · 仅药名目录，完整详情待核实</small></button>').join("")||'<p class="placeholder">没有符合条件的药物。试试清除搜索或筛选。</p>';
 $("herbList").querySelectorAll("[data-herb]").forEach(b=>b.onclick=()=>selectHerb(b.dataset.herb));
 $("herbList").querySelectorAll("[data-pending]").forEach(b=>b.onclick=()=>{activePending=b.dataset.pending;activeHerb=null;activeChapter=b.dataset.pendingChapter;render();});
 renderDetail();renderExtraResults();
}
function selectHerb(id){activePending=null;activeHerb=id;const h=herbById(id);if(!h)return;if(activeChapter!=="all"&&activeChapter!==h.chapterId)activeChapter="all";renderNav();renderHerbList();if(window.innerWidth<740)$("detailPanel").scrollIntoView({behavior:"smooth",block:"start"});}
function linkedRecords(h){return records().filter(r=>attachedToHerb(r,h));}
function recordCard(r){
 const tag=r.type==="question"?"错题":"笔记";
 return '<button class="record-card" data-record="'+escapeHtml(r.id)+'"><small>'+tag+' · '+escapeHtml(dateOf(r.createdAt)||r.createdOn||"日期未知")+(r.origin==="local"?" · 本机":" · 公开")+'</small><strong>'+escapeHtml(r.title||"未命名")+'</strong></button>';
}
function enableRecordLinks(scope){scope.querySelectorAll("[data-record]").forEach(b=>b.onclick=()=>viewRecord(b.dataset.record));}
// 资料细节是可选且必须有来源的扩展字段；不存在时不凭空生成医学知识
function renderDrugExtra(h){
 const detail=h.details||{};
 let html='<div class="herb-extra"><h3>药物详解</h3>';
 let count=0;
 for (const [key,label] of drugDetailSections){
   const entry=detail[key];
   if(!detailText(entry).trim())continue;
   count++;
   const items=detailItems(entry);
   const content=items.length?'<ul class="detail-items">'+items.map(item=>'<li>'+(item.label?'<strong>'+escapeHtml(item.label)+'</strong>':'')+'<span>'+escapeHtml(item.text)+'</span></li>').join("")+'</ul>':escapeHtml(entry.text);
   html+='<dl><dt>'+escapeHtml(label)+'</dt><dd>'+content+'</dd></dl>';
 }
 if(!count)html+='<p class="mini-note">主治、用量、注意事项、配伍和鉴别点尚待按教材逐味录入。现有功效与性味归经已在上方展示。</p>';
 return html+'</div>';
}
function sourceText(source={}){
 return [source.title?"《"+source.title+"》":"来源待注明",source.edition||"",source.printPage?"印刷页 "+source.printPage:"",source.pdfPage?"PDF 第 "+source.pdfPage+" 页":""].filter(Boolean).join(" · ");
}
function verificationText(source={}){
 const verification=source.verification;
 if(!verification)return "";
 const method=verification.method==="pdf-visual"?"PDF 页面核对":verification.method;
 const scope=Array.isArray(verification.scope)?verification.scope.join("、"):verification.scope;
 return [method,verification.verifiedAt,scope?"核对范围："+scope:""].filter(Boolean).join(" · ");
}
function provenanceRows(h){
 const rows=[{label:"性味归经与功效",source:h.source||{},reviewStatus:h.reviewStatus||"待逐味复核"}];
 for(const [key,label] of drugDetailSections){
  const entry=h.details?.[key];
  if(!detailText(entry).trim())continue;
  const source=entry.source||h.source||{},reviewStatus=entry.reviewStatus||h.reviewStatus||"待复核";
  rows.push({label,source,reviewStatus});
  for(const item of detailItems(entry)){
   if(item.source||item.reviewStatus)rows.push({label:label+" · "+(item.label||item.text),source:item.source||source,reviewStatus:item.reviewStatus||reviewStatus});
  }
 }
 return rows;
}
function renderProvenance(h){
 return '<details class="source-details"><summary>资料出处与校对</summary><p class="mini-note">核对范围以各项记录为准，部分核对不代表整味药已复核。</p><dl>'+provenanceRows(h).map(row=>'<div class="source-entry"><dt>'+escapeHtml(row.label)+'</dt><dd>'+escapeHtml(sourceText(row.source))+'<br><span>'+escapeHtml(row.reviewStatus)+'</span>'+(verificationText(row.source)?'<br>'+escapeHtml(verificationText(row.source)):"")+'</dd></div>').join("")+'</dl></details>';
}
function renderDetail(){
 let h=herbById(activeHerb);
 if(!h && activePending){ const x=Object.values(db.catalog.chapters||{}).flat().find(z=>z.name===activePending&&z.chapterId===activeChapter); $("detailPanel").innerHTML='<h2>'+escapeHtml(activePending)+'</h2><p class="muted">药名已进入全书目录，PDF第'+escapeHtml(x?.pdfPage||"待查")+'页。尚未完成逐味核对，不展示可能错误的性味归经与用量。</p><p class="mini-note">资料正按原书整理，之后会自动关联到正式药物档案。</p>';return;}
 if(!h){$("detailPanel").innerHTML='<div class="placeholder">选择一味药，查看药性、药味、归经、功效及关联错题和笔记。</div>';return;}
 const chapter=chapterById(h.chapterId),group=chapter?.groups.find(g=>g.id===h.groupId),linked=linkedRecords(h),points=db.knowledge.filter(k=>(k.herbIds||[]).includes(h.id));
 $("detailPanel").innerHTML='<div class="detail-top"><div><span class="tag">'+escapeHtml(chapter?.title||"")+'</span><span class="tag">'+escapeHtml(group?.title||"")+'</span><h2>'+escapeHtml(h.name)+'</h2><span class="tag">'+escapeHtml(h.syllabusLevel||"考纲级别待核") +'</span></div><button class="ghost" id="copyHerb" type="button">复制资料</button></div>'+
 '<p class="muted review-status">'+escapeHtml(h.reviewStatus||"待逐味复核")+'</p><div class="property-grid"><div class="property"><small>四气</small><strong class="warm">'+escapeHtml(h.nature)+'</strong></div><div class="property"><small>五味</small><strong>'+escapeHtml(h.flavors.join("、"))+'</strong></div><div class="property"><small>归经</small><strong>'+escapeHtml(h.meridians.join("、"))+'</strong></div></div><div class="subsection"><h3>功效</h3><p>'+escapeHtml(h.effects)+'</p></div>'+renderDrugExtra(h)+
 '<div class="subsection"><h3>知识点</h3><div class="pill-row">'+points.map(k=>'<span class="chip" title="'+escapeHtml(k.id)+'">'+escapeHtml(k.title)+'</span>').join("")+'</div></div><div class="subsection"><div class="section-heading"><h3>关联错题和笔记（'+linked.length+'）</h3></div><div class="button-pair"><button class="primary" id="addRelatedQuestion" type="button">＋ 添加错题</button><button id="addRelatedNote" type="button">＋ 添加笔记</button></div>'+(linked.length?linked.map(recordCard).join(""):'<p class="muted">暂无关联记录；新增后将与本味药和对应知识点双向关联。</p>')+'</div>'+renderProvenance(h);
 $("copyHerb").onclick=()=>copyText(contextForHerb(h),"已复制当前药物资料");
 $("addRelatedQuestion").onclick=()=>openRecordForm("question",h.id);
 $("addRelatedNote").onclick=()=>openRecordForm("note",h.id);
 enableRecordLinks($("detailPanel"));
}
function renderExtraResults(){
 const q=$("searchInput").value.trim().toLowerCase(),scope=$("searchExtras");
 if(!q){scope.hidden=true;return;}
 const k=db.knowledge.filter(x=>[x.title,...(x.tags||[])].join(" ").toLowerCase().includes(q)).slice(0,15);
 const r=records().filter(x=>[x.title,x.body,x.answer,x.analysis].join(" ").toLowerCase().includes(q)).slice(0,30);
 scope.hidden=!(k.length||r.length);
 $("extraList").innerHTML=k.map(x=>'<div class="event">知识点 · '+escapeHtml(x.title)+' → '+escapeHtml((x.herbIds||[]).map(id=>herbById(id)?.name||"").join("、"))+'</div>').join("")+r.map(recordCard).join("");
 enableRecordLinks($("extraList"));
}
function renderRecentRecords(){
 const r=records().slice().sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||""))).slice(0,5);
 $("recordCount").textContent=records().length+" 条";
 $("recentRecords").innerHTML=r.length?r.map(recordCard).join(""):'<p class="mini-note">尚未添加错题或笔记。</p>';
 enableRecordLinks($("recentRecords"));
}
function collectDayEvents(date){
 let x=db.events.filter(e=>e.date===date).map(e=>({label:e.label,id:e.entityId,type:"import",count:e.count}));
 for (const r of records()){
  const made=dateOf(r.createdAt);
  if(made===date)x.push({label:(r.type==="question"?"新增错题：":"新增笔记：")+(r.title||"无标题"),id:r.id,type:"record"});
  const updated=dateOf(r.updatedAt);
  if(updated&&updated===date&&updated!==made)x.push({label:"更新："+(r.title||"无标题"),id:r.id,type:"record"});
 }
 return x;
}
function renderCalendar(){
 const first=(new Date(calYear,calMonth-1,1).getDay()+6)%7;
 const last=new Date(calYear,calMonth,0).getDate();
 $("monthTitle").textContent=calYear+"年"+calMonth+"月";
 let html=["一","二","三","四","五","六","日"].map(w=>'<div class="weekday">'+w+'</div>').join("");
 for(let i=0;i<first;i++)html+="<span></span>";
 for(let d=1;d<=last;d++){
  const date=isoDate(calYear,calMonth,d),ev=collectDayEvents(date);
  html+='<button type="button" class="date '+(chosenDate===date?"selected ":"")+(ev.length?"marked":"")+'" data-date="'+date+'" aria-label="'+date+'，'+ev.length+'条新增或更新">'+d+'</button>';
 }
 $("calendar").innerHTML=html;
 $("calendar").querySelectorAll("[data-date]").forEach(b=>b.onclick=()=>{chosenDate=b.dataset.date;renderCalendar();});
 const ev=collectDayEvents(chosenDate);
 $("dayEvents").innerHTML='<h3>'+chosenDate+' · '+ev.length+' 项</h3>'+(ev.length?ev.map(e=>'<div class="event" '+(e.type==="record"?'data-event-record="'+escapeHtml(e.id)+'"':"")+'>'+escapeHtml(e.label)+'</div>').join(""):'<p class="mini-note">这一天没有记录。</p>');
 $("dayEvents").querySelectorAll("[data-event-record]").forEach(b=>b.onclick=()=>viewRecord(b.dataset.eventRecord));
}
function render(){renderNav();renderHerbList();renderRecentRecords();renderCalendar();}
function selectedValues(id){return Array.from($(id).selectedOptions).map(x=>x.value);}
function openRecordForm(type,herbId,editId,knowledgeId){
 const existing=editId?user.records.find(r=>r.id===editId):null;
 $("recordForm").reset();$("recordId").value=existing?.id||"";
 $("recordKind").value=existing?.type||type;
 $("recordTitle").value=existing?.title||"";$("recordBody").value=existing?.body||"";
 $("recordAnswer").value=existing?.answer||"";$("recordAnalysis").value=existing?.analysis||"";
 $("dialogTitle").textContent=existing?"修改学习记录":"新增"+(type==="question"?"错题":"笔记");
 $("recordHerbs").innerHTML=db.herbs.map(h=>'<option value="'+escapeHtml(h.id)+'">'+escapeHtml(h.name)+'</option>').join("");
 $("recordKnowledge").innerHTML=db.knowledge.map(k=>'<option value="'+escapeHtml(k.id)+'">'+escapeHtml(k.title)+'</option>').join("");
 const selectedHerbs=existing?.herbIds||(herbId?[herbId]:[]);
 const selectedPoints=existing?.knowledgeIds||(knowledgeId?[knowledgeId]:(herbId?db.knowledge.filter(k=>(k.herbIds||[]).includes(herbId)).map(k=>k.id):[]));
 for(const o of $("recordHerbs").options)o.selected=selectedHerbs.includes(o.value);
 for(const o of $("recordKnowledge").options)o.selected=selectedPoints.includes(o.value);
 $("editDialog").showModal();
}
function viewRecord(id){
 const r=records().find(x=>x.id===id);if(!r)return;
 currentRecordId=id;
 $("viewTitle").textContent=(r.type==="question"?"错题 · ":"笔记 · ")+(r.title||"");
 const links=[...new Set([...(r.herbIds||[]),...(r.knowledgeIds||[]).flatMap(x=>kpById(x)?.herbIds||[])])];
 $("viewContent").innerHTML='<p class="muted">创建：'+escapeHtml(dateOf(r.createdAt)||r.createdOn||"未知")+'　来源：'+(r.origin==="local"?"本机":"公开知识库")+'</p><h3>正文</h3><div class="long-text">'+escapeHtml(r.body||"")+'</div>'+(r.answer?'<h3>答案</h3><div class="long-text">'+escapeHtml(r.answer)+'</div>':"")+(r.analysis?'<h3>分析与总结</h3><div class="long-text">'+escapeHtml(r.analysis)+'</div>':"")+'<h3>相关中药（点击跳转）</h3><div class="pill-row">'+(links.length?links.map(id=>'<button class="chip" data-view-herb="'+escapeHtml(id)+'">'+escapeHtml(herbById(id)?.name||id)+'</button>').join(""):"尚未关联中药")+'</div><h3>知识点（点击跳转）</h3><div class="pill-row">'+(r.knowledgeIds||[]).map(id=>'<button class="chip" data-view-point="'+escapeHtml(id)+'">'+escapeHtml(kpById(id)?.title||id)+'</button>').join("")+'</div>';
 $("editRecordBtn").hidden=r.origin!=="local";
 $("viewContent").querySelectorAll("[data-view-herb]").forEach(b=>b.onclick=()=>{$("viewDialog").close();selectHerb(b.dataset.viewHerb);});
 $("viewContent").querySelectorAll("[data-view-point]").forEach(b=>b.onclick=()=>{const id=b.dataset.viewPoint;const c=kpById(id)?.chapterId;if(!c)return;$("viewDialog").close();activeChapter=c;activeTopic=id.startsWith("kp-")?id.slice(3):null;activeHerb=kpById(id)?.herbIds?.[0]||null;render();});
 $("viewDialog").showModal();
}
$("recordForm").onsubmit=(e)=>{
 e.preventDefault();const id=$("recordId").value;const old=user.records.find(r=>r.id===id),ts=new Date().toISOString();
 const body=$("recordBody").value.trim(),title=$("recordTitle").value.trim();
 if(!title||!body)return;
 const rec={id:old?.id||"local-"+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)),type:$("recordKind").value,title,body,answer:$("recordAnswer").value.trim(),analysis:$("recordAnalysis").value.trim(),herbIds:selectedValues("recordHerbs"),knowledgeIds:selectedValues("recordKnowledge"),createdAt:old?.createdAt||ts,updatedAt:ts};
 if(old){user.records[user.records.findIndex(r=>r.id===id)]=rec;}else user.records.push(rec);
 saveUser();$("editDialog").close();chosenDate=dateOf(ts);calYear=Number(chosenDate.slice(0,4));calMonth=Number(chosenDate.slice(5,7));render();
};
function contextForHerb(h){
 const attached=linkedRecords(h).slice(0,20);
 const details=drugDetailSections.filter(([key])=>detailText(h.details?.[key]).trim()).map(([key,label])=>"【"+label+"】\n"+detailText(h.details[key])).join("\n");
 const sources=provenanceRows(h).map(row=>row.label+"："+[sourceText(row.source),row.reviewStatus,verificationText(row.source)].filter(Boolean).join("；")).join("\n");
 return "【药名】"+h.name+"\n【性】"+h.nature+"\n【味】"+h.flavors.join("、")+"\n【归经】"+h.meridians.join("、")+"\n【功效】"+h.effects+"\n"+details+"\n【资料出处与校对】\n"+sources+"\n【错题和笔记】\n"+(attached.length?attached.map(r=>"["+r.type+"] "+r.title+"\n"+r.body+"\n"+(r.analysis||"")).join("\n---\n"):"暂无");
}
function aiContext(){
 const section=db.theory.find(x=>x.chapterId===activeChapter);
 if(section){
  const t=section.topics.find(x=>x.id===activeTopic);
  const linked=records().filter(r=>(r.knowledgeIds||[]).includes("kp-"+(t?.id||"")));
  return ("【资料来源】《学霸笔记—中药学》前五章主题概要（仍在扩充）\n【章节】"+section.title+"\n【主题】"+(t?.title||"")+
  "\n【知识点概要】"+(t?.summary||"")+"\n【原 PDF 页码】"+(t?.pdfPages.join("、")||"")+
  "\n【关联错题与笔记】\n"+linked.map(r=>r.title+"："+r.body).join("\n"));
 }
 const h=herbById(activeHerb);
 if(h)return contextForHerb(h);
 return matchingHerbs().slice(0,12).map(contextForHerb).join("\n\n")||"没有相关知识库内容";
}
async function copyText(value,status){
 try{await navigator.clipboard.writeText(value);$("aiStatus").textContent=status||"已复制";}catch{$("aiStatus").textContent="复制失败，请使用 HTTPS 网页或手动复制。";}
}
$("copyContext").onclick=()=>copyText(aiContext(),"已复制知识库上下文，打开 ChatGPT 粘贴即可");
$("chatGptBtn").onclick=()=>window.open("https://chatgpt.com/","_blank","noopener,noreferrer");
$("newQuestion").onclick=()=>openRecordForm("question",activeHerb);
$("newNote").onclick=()=>openRecordForm("note",activeHerb);
$("editRecordBtn").onclick=()=>{let id=currentRecordId;let r=user.records.find(x=>x.id===id);if(r){$("viewDialog").close();openRecordForm(r.type,null,id);}};
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$("todayBtn").onclick=()=>{chosenDate=nowShanghai();calYear=Number(chosenDate.slice(0,4));calMonth=Number(chosenDate.slice(5,7));renderCalendar();};
$("prevMonth").onclick=()=>{calMonth--;if(calMonth<1){calMonth=12;calYear--;}renderCalendar();};
$("nextMonth").onclick=()=>{calMonth++;if(calMonth>12){calMonth=1;calYear++;}renderCalendar();};
$("searchInput").oninput=renderHerbList;
$("natureFilter").onchange=renderHerbList;$("meridianFilter").onchange=renderHerbList;
$("resetFilters").onclick=()=>{$("searchInput").value="";$("natureFilter").value="";$("meridianFilter").value="";activeChapter="all";render();};
$("exportBtn").onclick=()=>{
 const blob=new Blob([JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),records:user.records},null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="本草研习-错题笔记-"+nowShanghai()+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$("importBtn").onclick=()=>$("importFile").click();
$("importFile").onchange=async (e)=>{
 try{const f=e.target.files?.[0];if(!f)return;const value=JSON.parse(await f.text());
 if(value.schemaVersion!==1||!Array.isArray(value.records)||value.records.some(r=>!r||typeof r.id!=="string"||!["note","question"].includes(r.type)||!Array.isArray(r.herbIds)||!Array.isArray(r.knowledgeIds)))throw Error("备份数据格式不正确");
 if(!confirm("导入将替换当前浏览器记录。请先导出备份，确定继续吗？"))return;
 user.records=value.records.map(r=>({...r,origin:undefined}));saveUser();render();alert("导入完成，共 "+user.records.length+" 条记录");
 }catch(err){alert("导入失败："+err.message);}finally{e.target.value="";}
};
$("aiSettingsBtn").onclick=()=>{$("aiEndpoint").value=workerUrl;$("aiAccessToken").value=accessToken;$("settingsDialog").showModal();};
$("saveAiSettings").onclick=()=>{
 const url=$("aiEndpoint").value.trim(),token=$("aiAccessToken").value.trim();
 if(url&&!/^https:\/\//i.test(url)&&!/^http:\/\/localhost(?::\d+)?\//i.test(url)){alert("请提供 HTTPS 接口地址");return;}
 workerUrl=url;accessToken=token;if(url)localStorage.setItem(endpointKey,url);else localStorage.removeItem(endpointKey);
 $("settingsDialog").close();$("aiStatus").textContent=url?"已配置中转地址，访问令牌仅在当前标签页保留。":"已清除中转地址。";
};
$("askAi").onclick=async()=>{
 const question=$("aiQuestion").value.trim();if(!question){$("aiStatus").textContent="先输入问题";return;}
 if(!workerUrl||!accessToken){$("aiStatus").textContent="请先配置受保护的 API 中转地址与访问令牌，或者复制上下文到 ChatGPT。";return;}
 const context=aiContext(),body=JSON.stringify({question,context});
 if(context.length>11500||new TextEncoder().encode(body).length>45000){$("aiStatus").textContent="资料超过网页 AI 中转上限，未发送也未截断。请使用“复制上下文”保留完整资料。";return;}
 const btn=$("askAi");btn.disabled=true;$("aiStatus").textContent="正在发送知识库上下文……";
 try{
 const resp=await fetch(workerUrl,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+accessToken},body});
 const result=await resp.json();if(!resp.ok)throw Error(result.error||"HTTP "+resp.status);
 $("aiResponse").hidden=false;$("aiResponse").textContent=String(result.answer||"没有收到回复");
 $("aiStatus").textContent="AI 回复完成。请结合来源核对重要信息。";
 }catch(err){$("aiStatus").textContent="AI 请求失败："+err.message;}finally{btn.disabled=false;}
};
async function init(){
 try{
  const names=["chapters","herbs","knowledge","questions","notes","events","theory"];
  const results=await Promise.all(names.map(async n=>{const r=await fetch("./data/"+n+".json",{cache:"no-store"});if(!r.ok)throw Error(n+" 数据读取失败（"+r.status+"）");return r.json();}));
  names.forEach((name,i)=>{if(!Array.isArray(results[i]))throw Error(name+" 数据不是数组");db[name]=results[i];});
  if(new Set(db.herbs.map(x=>x.id)).size!==db.herbs.length)throw Error("药物 ID 重复");
  const cr=await fetch("./data/catalog.json",{cache:"no-store"});if(!cr.ok)throw Error("药物目录加载失败");db.catalog=await cr.json();
  render();
 }catch(err){
 $("coverage").innerHTML='<strong class="error">数据加载失败：</strong>'+escapeHtml(err.message)+'。请从 GitHub Pages 或本地 HTTP 服务器打开，不要直接双击 file:// 页面。';
 $("detailPanel").textContent="请检查数据文件目录和浏览器控制台。";
 }
}
init();
