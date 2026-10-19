import fs from "node:fs";
import path from "node:path";
import { validateSource, validateDetails } from "./detail-schema.mjs";
const root=path.resolve(import.meta.dirname,"..");
const read=(name)=>JSON.parse(fs.readFileSync(path.join(root,"data",name+".json"),"utf-8"));
const [chapters,herbs,knowledge,questions,notes,events,theory]=["chapters","herbs","knowledge","questions","notes","events","theory"].map(read);
const errors=[];
const check=(condition,msg)=>{if(!condition)errors.push(msg);};
for(const [name,data] of Object.entries({chapters,herbs,knowledge,questions,notes,events,theory}))check(Array.isArray(data),name+" must be an array");
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
 validateSource(h.source,h.id,check);
 if(h.details!==undefined)validateDetails(h.details,h.id,check);
}
const theoryTopics=new Set();
for(const section of theory){
 check(cid.has(section.chapterId),"theory chapter missing "+section.chapterId);
 check(chapters.find(c=>c.id===section.chapterId)?.type==="theory","not marked theory "+section.chapterId);
 for(const topic of section.topics||[]){
  check(!theoryTopics.has(topic.id),"duplicate theory id "+topic.id);theoryTopics.add(topic.id);
  check(Array.isArray(topic.pdfPages)&&topic.pdfPages.every(Number.isInteger),"theory page invalid "+topic.id);
  check(typeof topic.summary==="string"&&topic.summary.trim().length>0,"theory summary missing "+topic.id);
  check(knowledge.some(k=>k.id==="kp-"+topic.id),"theory knowledge link missing "+topic.id);
 }
}
check(chapters.length===26,"expected 26 chapters");
for(const k of knowledge){check(cid.has(k.chapterId),"missing chapter for point "+k.id);for(const id of k.herbIds||[])check(hid.has(id),"unknown herb "+id+" in knowledge "+k.id);}
for(const r of [...questions,...notes]){
 check(r.type==="question"||r.type==="note","invalid record type "+r.id);
 for(const id of r.herbIds||[])check(hid.has(id),"unknown herb "+id+" in record "+r.id);
 for(const id of r.knowledgeIds||[])check(kid.has(id),"unknown knowledge "+id+" in record "+r.id);
}
for(const ev of events)check(/^\d{4}-\d{2}-\d{2}$/.test(ev.date),"event has invalid YYYY-MM-DD date");
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log("VALID: "+chapters.length+" chapters, "+theoryTopics.size+" theory topics, "+herbs.length+" herbs, "+knowledge.length+" points, "+(questions.length+notes.length)+" public records, "+events.length+" events");
