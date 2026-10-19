import fs from "node:fs";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");
const read=(name)=>JSON.parse(fs.readFileSync(path.join(root,"data",name+".json"),"utf-8"));
const [chapters,herbs,knowledge,questions,notes,events]=["chapters","herbs","knowledge","questions","notes","events"].map(read);
const errors=[];
const check=(condition,msg)=>{if(!condition)errors.push(msg);};
for(const [name,data] of Object.entries({chapters,herbs,knowledge,questions,notes,events}))check(Array.isArray(data),name+" must be an array");
const unique=(arr,name)=>{const ids=arr.map(x=>x.id);check(ids.every(Boolean),name+" missing id");check(new Set(ids).size===ids.length,name+" duplicate id");};
for(const [name,list] of Object.entries({chapters,herbs,knowledge,questions,notes,events}))unique(list,name);
const cid=new Set(chapters.map(x=>x.id)), hid=new Set(herbs.map(x=>x.id)), kid=new Set(knowledge.map(x=>x.id));
for(const c of chapters){check(Number.isInteger(c.number)&&c.title&&c.id,"invalid chapter "+c.id);unique(c.groups||[],"groups "+c.id);}
for(const h of herbs){
 check(cid.has(h.chapterId),"missing chapter for "+h.name);
 const chapter=chapters.find(c=>c.id===h.chapterId);
 check((chapter?.groups||[]).some(g=>g.id===h.groupId),"missing group for "+h.name);
 check(typeof h.name==="string"&&h.name.length>0,"missing drug name "+h.id);
 check(typeof h.nature==="string"&&h.nature.length>0,"missing nature "+h.id);
 check(Array.isArray(h.flavors)&&h.flavors.length>0&&Array.isArray(h.meridians)&&h.meridians.length>0,"missing flavors or meridians "+h.id);
 check(typeof h.effects==="string"&&h.effects.length>0,"missing effects "+h.id);
 check(Number.isInteger(h.source?.printPage),"missing source page "+h.id);
 if(h.details!==undefined){
  check(h.details!==null&&typeof h.details==="object"&&!Array.isArray(h.details),"details must be object "+h.id);
  for(const [field,entry] of Object.entries(h.details||{})){
   check(["indications","usage","cautions","pairings","differentiation"].includes(field),"unknown details field "+field+" for "+h.id);
   check(entry&&typeof entry.text==="string"&&entry.text.trim().length>0,"details text missing "+field+" for "+h.id);
   check(entry&&typeof entry.source?.title==="string"&&entry.source.title.trim().length>0,"details source title missing "+field+" for "+h.id);
   check(entry&&Number.isInteger(entry.source?.printPage),"details source page missing "+field+" for "+h.id);
  }
 }
}
for(const k of knowledge){check(cid.has(k.chapterId),"missing chapter for point "+k.id);for(const id of k.herbIds||[])check(hid.has(id),"unknown herb "+id+" in knowledge "+k.id);}
for(const r of [...questions,...notes]){
 check(r.type==="question"||r.type==="note","invalid record type "+r.id);
 for(const id of r.herbIds||[])check(hid.has(id),"unknown herb "+id+" in record "+r.id);
 for(const id of r.knowledgeIds||[])check(kid.has(id),"unknown knowledge "+id+" in record "+r.id);
}
for(const ev of events)check(/^\d{4}-\d{2}-\d{2}$/.test(ev.date),"event has invalid YYYY-MM-DD date");
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log("VALID: "+chapters.length+" chapters, "+herbs.length+" herbs, "+knowledge.length+" points, "+(questions.length+notes.length)+" public records, "+events.length+" events");
