// IRON-RULE SELF-TEST — "statutory holidays are non-working" (owner discipline, 2026-07-17).
// Run with:  node holiday_selftest.js   — MUST be executed after EVERY engine change.
// Audits Function 1 (ChromeSchedule.html) and Function 2 (RefreshBoard.html):
//   1. no task START on a weekend/holiday (per each function's own weekend rule);
//   2. no GATE (CFZ/RTM/PLD/FW/G.O./FCS) on a weekend/holiday;
//   3. no RANGE task END on a statutory holiday (spans extend across holidays);
//   4. F1: DVT-test→PVT G.O. ≥ 4 weeks (28d exact unless the gate was holiday-deferred);
//      F2: DVT-test→PVT G.O. exactly 40 working days;
//   5. F1 golden stays byte-exact (goldenMode exemption intact).
const fs=require("fs");
function core(file){
  const html=fs.readFileSync(__dirname+"/"+file,"utf8");
  return html.slice(html.indexOf("const MS=86400000;"), html.lastIndexOf("/*",html.indexOf("   RENDER")));
}
let FAILS=0;
const fail=m=>{FAILS++;console.log("   ✗ "+m);};

/* ---------- Function 1 ---------- */
(new Function("__fail",core("ChromeSchedule.html")+`
  const dd=(a,b)=>Math.round((b-a)/86400000);
  // golden must stay byte-exact (goldenMode exemption)
  const v=validate(build("2026-08-25"),"2026-08-25");
  console.log("F1 golden:",(v.pass&&v.wkAll===38)?"PASS":"FAIL");
  if(!(v.pass&&v.wkAll===38)) __fail("F1 golden broken: miss="+v.miss.length+" wk="+v.wkAll);
  ["2026-02-24","2026-04-01","2026-11-18","2027-03-03","2026-12-19"].forEach(sr=>{
    _nomCache={key:"",val:null};
    const m=build(sr);
    let bad=0;
    m.rows.forEach(r=>{
      if(!r.s)return;
      const hol=r.site==="VN"?REGIONHOL:LEADHOL;
      // starts (tasks AND gates): never Sat/Sun/holiday under the F1 v3 rule
      if(dow(r.s)===0||dow(r.s)===6||isHol(r.s,hol)){bad++;__fail(sr+" F1 start "+r.ph+"/"+r.nm+" "+iso(r.s));}
      // range ends: never a statutory holiday (span-extension rule). FW Testing end = window edge.
      if(!r.mile&&r.nm!=="FW Candidate Testing"&&isHol(r.e,hol)){bad++;__fail(sr+" F1 span-end "+r.ph+"/"+r.nm+" "+iso(r.e));}
    });
    const gv=m.rows.find(r=>r.ph==="PV"&&r.nm==="Google dogfooding");
    const go=m.rows.find(r=>r.nm==="MV Gerber release");
    const gap=dd(gv.s,go.s);
    if(gap<28)__fail(sr+" F1 DVT-test→PVT G.O. gap "+gap+"d < 28");
    console.log("F1 SR "+sr+": holiday-clean="+(bad===0)+", gap="+gap+"d"+(gap>28?" (holiday-deferred)":""));
  });
`))(fail);

/* ---------- Function 2 ---------- */
(new Function("__fail",core("RefreshBoard.html")+`
  const wd=(a,b)=>{let c=new Date(+a),n=0;while(+c<+b){c=addCal(c,1);if(!(dow(c)===0||dow(c)===6||isHol(c,HOL.KS)))n++;}return n;};
  const isBuild=nm=>/SMT|Pre-?Build|Main.?build|OOBIP|PCB FAB|Bring Up|Regression/i.test(nm);
  [["2026-12-03","VN"],["2026-08-25","VN"],["2026-09-08","TH"]].forEach(([sr,rg])=>{
    REGIONNAME=rg; REGIONHOL=rg==="TH"?HOL.TH:HOL.VN;
    const m=build(sr,deriveKickFromSR(sr));
    let bad=0;
    m.rows.forEach(r=>{
      if(!r.s||r.nm==="Kick-off"||r.nm==="FW Candidate Testing")return;
      const hol=r.site==="VN"?REGIONHOL:HOL.KS;
      if(isHol(r.s,hol)){bad++;__fail(sr+" F2 start(HOL) "+r.ph+"/"+r.nm+" "+iso(r.s));}
      else if(dow(r.s)===0||(dow(r.s)===6&&!isBuild(r.nm))){bad++;__fail(sr+" F2 start(wknd) "+r.ph+"/"+r.nm+" "+iso(r.s));}
      if(!r.mile&&isHol(r.e,hol)){bad++;__fail(sr+" F2 span-end "+r.ph+"/"+r.nm+" "+iso(r.e));}
    });
    const dvt=m.rows.find(r=>r.ph==="PV"&&r.nm==="Google dogfooding");
    const go=m.rows.find(r=>r.nm==="MV Gerber release");
    const w=wd(dvt.s,go.s);
    if(w!==40)__fail(sr+" F2 DVT-test→PVT G.O. "+w+" wd ≠ 40");
    console.log("F2 SR "+sr+" ("+rg+"): holiday-clean="+(bad===0)+", gap="+w+" wd");
  });
`))(fail);

console.log(FAILS===0?"\nIRON-RULE SELF-TEST: ALL PASS ✓":"\nIRON-RULE SELF-TEST: "+FAILS+" FAILURE(S) ✗");
process.exit(FAILS===0?0:1);
