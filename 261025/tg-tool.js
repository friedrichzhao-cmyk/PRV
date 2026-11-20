#!/usr/bin/env node
// Truth Global data tool. Usage:
//   node tg-tool.js list                 -> compact list of current rows (idx|date|topic|src|title)
//   node tg-tool.js apply plan.json      -> rewrite data.js (validated)
// plan.json: { "keep":[idx,...], "add":[row,...], "SIG":[...], "ED":[en,de,zh], "SRC":{CODE:{name,url,lean}}, "ICON":[["regex-source","iconKey"],...], "today":"YYYY-MM-DD" }
// Final N = kept rows + added rows; every date must be within 3 days of "today" (Bangkok date), max 30 rows.
const fs=require('fs'),vm=require('vm'),path=require('path');
const F=path.join(__dirname,'data.js');
function load(){const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync(F,'utf8'),c);return c.window.TG}
const TOPICS='US GP FIN TEC CN ME FAITH NATURE JOB GER EU KEYS'.split(' '),REGS=['AME','EUR','MEA','ASIA'];
const cmd=process.argv[2];
if(cmd==='list'){const T=load();T.N.forEach((r,i)=>console.log([i,r[1],r[2],r[0],(r[5][0]||'').slice(0,90)].join('|')));
  console.log('SRC codes:',Object.keys(T.SRC).join(' '));console.log('SIG topics:',T.SIG.map(s=>s.k).join(' '));process.exit()}
if(cmd==='apply'){
  const T=load(),P=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
  const N=(P.keep||[]).map(i=>{if(!T.N[i])throw 'bad keep idx '+i;return T.N[i]}).concat(P.add||[]);
  const SRC=Object.assign({},T.SRC,P.SRC||{});
  const ICON=T.ICON_BY_URL.concat((P.ICON||[]).map(a=>[new RegExp(a[0]),a[1]]));
  const SIG=P.SIG||T.SIG, ED=P.ED||T.ED;
  const today=new Date(P.today+'T00:00:00Z'); if(isNaN(today))throw 'need today';
  const min=new Date(today-3*864e5).toISOString().slice(0,10);
  const err=[];
  if(N.length<1||N.length>30)err.push('N.length '+N.length);
  N.forEach((r,i)=>{
    if(!Array.isArray(r)||r.length!==8)return err.push('row '+i+' length');
    if(!SRC[r[0]])err.push('row '+i+' unknown src '+r[0]);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(r[1])||r[1]<min||r[1]>P.today)err.push('row '+i+' date '+r[1]);
    if(!TOPICS.includes(r[2]))err.push('row '+i+' topic '+r[2]);
    if(!REGS.includes(r[3]))err.push('row '+i+' region '+r[3]);
    if(!/^https?:/.test(r[4]))err.push('row '+i+' url');
    for(let k=5;k<8;k++)if(!Array.isArray(r[k])||r[k].length!==2||typeof r[k][0]!=='string'||typeof r[k][1]!=='string')err.push('row '+i+' text '+k);
  });
  if(!Array.isArray(ED)||ED.length!==3)err.push('ED');
  if(JSON.stringify([N,SIG,ED,SRC]).includes('中共'))err.push('forbidden word');
  if(err.length){console.error('VALIDATION FAILED:\n'+err.join('\n'));process.exit(2)}
  const out='window.TG = {\nED: '+JSON.stringify(ED)+',\nSRC: '+JSON.stringify(SRC,null,1).replace(/\n\s*/g,' ').replace(/^\{ /,'{\n ').replace(/\}, "/g,'},\n "')+',\nICON_BY_URL: [\n'+ICON.map(a=>'['+a[0].toString()+', '+JSON.stringify(a[1])+']').join(',\n')+'\n],\nN: [\n'+N.map(r=>JSON.stringify(r)).join(',\n')+'\n],\nSIG: [\n'+SIG.map(s=>JSON.stringify(s)).join(',\n')+'\n]\n};\n';
  fs.writeFileSync(F,out);console.log('data.js written: rows',N.length,'bytes',out.length);process.exit()}
console.error('usage: list | apply plan.json');process.exit(1);
