"use strict";
(function(){
  const launch=document.getElementById("compareOpen");
  const dialog=document.getElementById("compareDialog");
  const find=document.getElementById("compareFind");
  const candidates=document.getElementById("compareCandidates");
  const output=document.getElementById("comparisonResult");
  const count=document.getElementById("compareCount");
  const submit=document.getElementById("runComparison");
  const close=document.getElementById("closeComparison");
  const selected=new Set();
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let cached=[];
  const fields=[
    {title:"药性（四气）",get:h=>h.nature||""},
    {title:"五味",get:h=>(h.flavors||[]).join("、")},
    {title:"归经",get:h=>(h.meridians||[]).join("、")},
    {title:"功效",get:h=>h.effects||""},
    {title:"用法用量",get:h=>h.details?.usage?.text||""},
    {title:"使用注意",get:h=>h.details?.cautions?.text||""},
    {title:"主治病证",get:h=>h.details?.indications?.text||""}
  ];
  const sync=()=>{
    count.textContent="已选 "+selected.size+"/4 味（至少2味）";
    submit.disabled=selected.size<2;
  };
  function choices(){
    const q=find.value.trim().toLowerCase();
    candidates.innerHTML=cached.filter(h=>!q||h.name.toLowerCase().includes(q)).map(h=>{
       const active=selected.has(h.id);
       return '<label class="comparison-option"><input type="checkbox" data-compare="'+esc(h.id)+'" '+(active?"checked":"")+'><span>'+esc(h.name)+'</span><small>归'+esc((h.meridians||[]).join("、"))+'经</small></label>';
    }).join("")||'<p class="mini-note">没有符合条件的中药。</p>';
    candidates.querySelectorAll("[data-compare]").forEach(box=>box.onchange=()=>{
      if(box.checked){if(selected.size>=4){box.checked=false;alert("最多比较4味中药");return;}selected.add(box.dataset.compare);}
      else selected.delete(box.dataset.compare);
      sync();
    });
    sync();
  }
  const textCell=(text,placeholder=false)=>'<span class="'+(placeholder?"muted":"")+'">'+esc(text||"尚待补充")+'</span>';
  function render(){
    const chosen=[...selected].map(id=>cached.find(h=>h.id===id)).filter(Boolean);
    if(chosen.length<2)return;
    let html='<p class="muted">数据取自公开基础数据库。资料尚需逐味校对；差异按字面标记，不等于药效优劣。</p>';
    html+='<div class="comparison-scroller"><table class="comparison-table"><thead><tr><th>比较项目</th>'+chosen.map(h=>'<th>'+esc(h.name)+'<button type="button" data-compare-jump="'+esc(h.id)+'" class="ghost">查看详情 ↗</button></th>').join("")+'</tr></thead><tbody>';
    for(const field of fields){
      const vals=chosen.map(field.get),difference=new Set(vals).size>1;
      html+='<tr><th>'+esc(field.title)+(difference?'<small class="contrast-tag">有差异</small>':'')+'</th>'+vals.map(v=>'<td class="'+(difference?"different":"")+'">'+textCell(v,!v)+'</td>').join("")+'</tr>';
    }
    html+='</tbody></table></div><p class="mini-note">用法、禁忌和主治尚未逐味录入时显示“尚待补充”，不会自动生成内容。</p>';
    output.innerHTML=html;
    output.querySelectorAll("[data-compare-jump]").forEach(b=>b.onclick=()=>{
      dialog.close();
      if(typeof selectHerb==="function")selectHerb(b.dataset.compareJump);
    });
  }
  launch.onclick=async()=>{
    if(!cached.length){
      try{
        const resp=await fetch("./data/herbs.json",{cache:"no-store"});
        if(!resp.ok)throw Error("获取数据失败："+resp.status);
        cached=await resp.json();
      }catch(err){alert("暂时无法加载中药数据："+err.message);return;}
    }
    // 初次打开默认添加当前选中药物，便于和另外一味药比较
    if(!selected.size&&typeof activeHerb!=="undefined"&&activeHerb)selected.add(activeHerb);
    find.value="";output.innerHTML='<p class="mini-note">选择两味或更多中药，查看差异。</p>';
    choices();dialog.showModal();
  };
  find.oninput=choices;
  submit.onclick=render;
  close.onclick=()=>dialog.close();
})();
