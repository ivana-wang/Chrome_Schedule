/* Build a single-file distribution: bundles index.html + ChromeSchedule.html +
   RefreshBoard.html (+ avatar) into ChromeSchedule_Standalone.html.
   The two engine pages are embedded as base64 and loaded via iframe.srcdoc, so they
   stay byte-identical and fully isolated (the frozen Function-1 engine is untouched).
   Usage:  node build_single.js
   Note: CDN deps (Tesseract.js / html2canvas / Google Fonts) still need internet. */
const fs=require("fs"),path=require("path");
const ROOT=__dirname;
const read=f=>fs.readFileSync(path.join(ROOT,f));
const b64=buf=>Buffer.from(buf).toString("base64");

let shell=read("index.html").toString("utf8");
const chrome=b64(read("ChromeSchedule.html"));
const refresh=b64(read("RefreshBoard.html"));
const avatar="data:image/jpeg;base64,"+b64(read("assets/ivana-avatar.jpg"));

let count=0;
const rep=(from,to)=>{
  if(!shell.includes(from)) throw new Error("replacement anchor not found: "+from.slice(0,60));
  shell=shell.split(from).join(to); count++;
};

// 1) inline the avatar
rep('src="assets/ivana-avatar.jpg"','src="'+avatar+'"');
// 2) tab-switch lazy loads -> srcdoc from the embedded payloads
rep("if(t==='a'){ const fr=document.getElementById('groundFrame'); if(!fr.src) fr.src='ChromeSchedule.html'; }",
    "if(t==='a'){ const fr=document.getElementById('groundFrame'); if(!fr.dataset.l){fr.srcdoc=EMB_DEC(EMB.chrome);fr.dataset.l=1;} }");
rep("if(t==='refresh'){ const fr=document.getElementById('refreshFrame'); if(!fr.src) fr.src='RefreshBoard.html'; }",
    "if(t==='refresh'){ const fr=document.getElementById('refreshFrame'); if(!fr.dataset.l){fr.srcdoc=EMB_DEC(EMB.refresh);fr.dataset.l=1;} }");
// 3) initial Function-1 load
rep("document.getElementById('groundFrame').src='ChromeSchedule.html';",
    "{const fr=document.getElementById('groundFrame');fr.srcdoc=EMB_DEC(EMB.chrome);fr.dataset.l=1;}");
// 4) inject the payloads before the main script so EMB exists when it runs
const inject='<script>\nconst EMB={chrome:"'+chrome+'",refresh:"'+refresh+'"};\n'+
  'const EMB_DEC=b=>new TextDecoder().decode(Uint8Array.from(atob(b),c=>c.charCodeAt(0)));\n</'+'script>\n';
const at=shell.lastIndexOf("<script>");
shell=shell.slice(0,at)+inject+shell.slice(at);

const out=path.join(ROOT,"ChromeSchedule_Standalone.html");
fs.writeFileSync(out,shell);
console.log("wrote",out,(fs.statSync(out).size/1024).toFixed(0)+" KB,",count,"replacements applied");
