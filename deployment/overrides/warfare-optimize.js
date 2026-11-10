(function(root){'use strict';
const E=typeof module!=='undefined'&&module.exports?require('./warfare-engine.js'):root.WarfareEngine;
const Seeds=typeof module!=='undefined'&&module.exports?require('./warfare-recommendation-seeds.js'):root.WarfareRecommendationSeeds;
const P=typeof module!=='undefined'&&module.exports?require('./warfare-balance-profile.js'):root.WarfareBalanceProfile;
const R=typeof module!=='undefined'&&module.exports?require('./warfare-recoil.js'):root.WarfareRecoil;
const METRICS={recoil:['평균 반동 배율','×','min'],ads:['조준 시간','ms','min'],adsMove:['조준 이동속도','m/s','max'],walk:['걷기 속도','m/s','max'],sprint:['달리기 속도','m/s','max'],hipSpread:['지향사격 기본 확산','°','min'],hipMaxSpread:['지향사격 최대 확산','°','min'],sprintToFire:['질주 후 사격 지연','ms','min'],breath:['호흡 흔들림','°','min'],holdBreath:['숨 참기 시간','s','max'],reload:['재장전 시간','s','min'],capacity:['탄창 용량','발','max'],range:['유효 사거리','m','max'],velocity:['포구속도','m/s','max'],ttk:['연속 명중 TTK','ms','min'],control:['반동 제어 점수','점','max'],handling:['조작성 점수','점','max'],stability:['안정성 점수','점','max'],accuracy:['지향사격 정확도 점수','점','max']};
Object.assign(METRICS,{cameraHorizontal:['수평 카메라 흔들림 · 원본 계산','×','min'],cameraVertical:['수직 카메라 흔들림 · 원본 계산','×','min'],hitSway:['피격 무기 흔들림 · 원본 계산','×','min'],breathRecoil:['숨 참기 반동 배율','×','min'],autoVertical:['전자동 수직 반동','×','min'],autoHorizontal:['전자동 수평 반동','×','min'],springKick:['발사 시 무기 흔들림','×','min'],moveSway:['이동 흔들림','×','min'],patternClimb:['30발 누적 상승폭','원본','min'],patternWidth:['30발 좌우 이동폭','원본','min'],patternStep:['30발 최대 탄간 이동','원본','min'],patternHorizontalStep:['30발 최대 수평 이동','원본','min'],patternJerk:['30발 수평 변화량','원본','min']});
const PRACTICAL_EXPANSIONS={recoil:{autoVertical:.15,autoHorizontal:.15,springKick:.25,patternClimb:.2,patternWidth:.15,patternStep:.1},control:{autoVertical:.15,autoHorizontal:.15,springKick:.25,patternClimb:.2,patternWidth:.15,patternStep:.1},handling:{ads:.5,sprintToFire:.25,adsMove:.25},stability:{breath:.4,moveSway:.4,holdBreath:.2},accuracy:{hipSpread:.6,hipMaxSpread:.4}};
function practicalPlan(weights){const groups=new Map();for(const [key,weight]of Object.entries(weights)){const family=Object.entries(STAT_GROUPS).find(([,g])=>g.metrics.includes(key))?.[0]||(['range','velocity','ttk'].includes(key)?'ballistics':key);if(!groups.has(family))groups.set(family,{});const terms=groups.get(family);for(const [metric,w]of Object.entries(PRACTICAL_EXPANSIONS[key]||{[key]:1}))terms[metric]=Math.max(terms[metric]||0,w*weight);}return [...groups].map(([family,terms])=>({family,terms}));}
function practicalScore(values,baseline,weights){const groups=practicalPlan(weights).map(g=>{let total=0,sum=0,worst=0;const missing=[];for(const [k,w]of Object.entries(g.terms)){const v=values[k],b=baseline[k];if(k.startsWith('pattern')&&!Number.isFinite(b))continue;if(!Number.isFinite(v)||!Number.isFinite(b)){missing.push(k);continue;}const normal=Math.max(Math.abs(b),k==='ttk'?50:.01),ratio=METRICS[k][2]==='min'?Math.max(0,v)/normal:normal/Math.max(v,.0001),loss=Math.log1p(ratio)/Math.LN2;sum+=w*loss;total+=w;worst=Math.max(worst,loss);}return{family:g.family,loss:missing.length?1e5:total>0?.7*sum/total+.3*worst:1e5,terms:g.terms,missing};});return{loss:groups.reduce((s,g)=>s+g.loss,0)/Math.max(1,groups.length),groups};}
const STAT_GROUPS={control:{label:'반동 제어',metrics:['recoil','control','autoVertical','autoHorizontal','springKick','patternClimb','patternWidth','patternStep','patternHorizontalStep','patternJerk']},handling:{label:'조작성',metrics:['ads','adsMove','walk','sprint','sprintToFire','reload','handling']},stability:{label:'안정성',metrics:['breath','holdBreath','stability','moveSway','cameraHorizontal','cameraVertical','hitSway','breathRecoil']},accuracy:{label:'지향사격 정확도',metrics:['hipSpread','hipMaxSpread','accuracy']}};
function isExcluded(metric,groups=[]){return groups.some(id=>STAT_GROUPS[id]?.metrics.includes(metric));}
function excludedOnlyParts(pack,o){const protectedGroups=new Set((o.constraints||[]).flatMap(c=>Object.entries(STAT_GROUPS).filter(([,g])=>g.metrics.includes(c.metric)).map(([id])=>id))),ignored=new Set((o.excludedStats||[]).filter(id=>!protectedGroups.has(id))),protectedParts=new Set([...Object.values(o.locked||{}),...(o.required||[])]),fieldGroup={3:'control',5:'handling',6:'stability',4:'accuracy'};
 function group(target){const m=target.match(/^(?:DisplayAttrValues|WeaponMainAttribute\.MainAttrValues)\.(\d+)$/);if(m)return fieldGroup[m[1]];if(['GSpread_Hip','GSpread_Hip_Continuous'].includes(target))return 'accuracy';return Object.entries(STAT_GROUPS).find(([,g])=>g.metrics.some(k=>E.detailDefs[k]?.[2]===target))?.[0];}
 return Object.keys(pack.parts).filter(id=>{if(protectedParts.has(id)||pack.assembly.socketProviders[id]?.sockets?.length)return false;const effects=(pack.effectsByItemId[id]?.mp||[]).filter(e=>e.value!==0);if(!effects.length||effects.some(e=>!ignored.has(group(e.target))))return false;return (pack.parts[id].tuneIds||[]).every(tid=>(pack.tunes[tid]?.functions||[]).every(f=>ignored.has(group(f.target))));});}
function effectiveWeights(o){const groups=o.excludedStats??[];if(!Array.isArray(groups)||groups.some(id=>!STAT_GROUPS[id]))throw Error('배제할 스탯을 확인하세요.');const weights=Object.fromEntries(Object.entries(objectiveWeights(o)).filter(([k])=>!isExcluded(k,groups))),total=Object.values(weights).reduce((a,b)=>a+b,0);if(!total)throw Error('선택한 목표가 모두 평가에서 제외되었습니다. 배제를 해제하거나 다른 목표를 추가하세요.');return Object.fromEntries(Object.entries(weights).map(([k,w])=>[k,w/total]));}
const PRESETS={recoil:{recoil:1},ads:{ads:1},adsMove:{adsMove:1},hipSpread:{hipSpread:1},ttk:{ttk:1},balanced:{recoil:.4,ads:.25,adsMove:.2,hipSpread:.15}};
function opticType(pack,id){const p=pack.parts[id]?.opticProfile;if(!p)return null;const zooms=[...(p.magnifications||[]),p.defaultMagnification].filter(Number.isFinite);return zooms.length?(Math.max(...zooms)>=2?'magnified':'unmagnified'):'unknown';}

const tacticalRiser='13210000013',microRisers=new Set(['13210000012','13210000014']);
const TACTICAL_LABELS={any:'제한 없음',none:'미장착',light:'라이트 전용',laser:'레이저 전용',combo:'레이저·라이트 겸용',laserActive:'레이저 장착·활성'};
// Classify the device itself, including grips with an integrated light.
const TACTICAL_TYPES={
 '13140000041':'light','13140000042':'light','13160000007':'light','13160000008':'light',
 '13160000013':'light','13160000015':'light','13160000016':'light','13160000018':'light',
 '13160000020':'laser',
 '13160000005':'combo','13160000006':'combo','13160000009':'combo','13160000010':'combo','13160000014':'combo'
};

function tacticalMatches(type,mode){
 return mode==='laserActive'?type==='laser'||type==='combo':type===mode;
}

function tacticalStatus(mounts,mode){
 const items=mounts.filter(m=>m.source==='selected'&&Object.hasOwn(TACTICAL_TYPES,m.itemId))
  .map(m=>({id:m.itemId,type:TACTICAL_TYPES[m.itemId],path:m.path}));
 const met=mode==='any'||(mode==='none'?items.length===0:items.length===1&&tacticalMatches(items[0].type,mode));
 return{mode,met,items};
}

function opticRiserRank(chosen,lenses){
 let rank=0;
 for(const lens of lenses){
  const slots=lens.path.split('/'),socket=slots.pop();
  if(socket==='31'||socket==='40')continue;
  let hasMicro=false;
  while(slots.length){
   const id=chosen[slots.join('/')];
   if(id===tacticalRiser){rank=Math.max(rank,hasMicro?3:2);break;}
   if(microRisers.has(id)){hasMicro=true;rank=Math.max(rank,1);}
   slots.pop();
  }
 }
 return rank;
}

// Enumerate primary lenses through compatible adapter/platform routes.
// A choice fixes its route as well as the lens, including nested sockets.
function opticChoices(pack,options={}){
 const mode=options.optic||'any',banned=new Set(options.banned||[]),locked=options.locked||{},best=new Map(),seen=new Set();
 if(mode==='none')return[];
 const primary=s=>!['31','40'].includes(String(s.socketId));
 const selectable=id=>pack.display.objects[id]?.playerSelectable===true&&!pack.display.objects[id]?.selectionDisabledReason&&!banned.has(id);
 function leads(id,trail=new Set()){
  if(trail.has(id)||!selectable(id))return false;
  if(opticType(pack,id))return true;
  const next=new Set(trail);next.add(id);
  return(pack.assembly.socketProviders[id]?.sockets||[]).some(s=>primary(s)&&(!s.modes||s.modes.includes('mp'))&&(s.optionItemIds||[]).some(child=>leads(child,next)));
 }
 function visit(chosen,prefix='',depth=0){
  if(depth>8)return;
  const key=JSON.stringify(Object.entries(chosen).sort());if(seen.has(key))return;seen.add(key);
  const state=E.assembly(pack,chosen);
  if(Object.entries(chosen).some(([slot,id])=>state.selected[slot]!==id))return;
  for(const mount of state.mounts){
   const type=opticType(pack,mount.itemId);if(mount.source!=='selected'||!type||!primary(mount)||!selectable(mount.itemId)||(mode!=='any'&&type!==mode))continue;
   const old=best.get(mount.itemId),profile=pack.parts[mount.itemId].opticProfile;
   if(!old||Object.keys(chosen).length<Object.keys(old.chosen).length)best.set(mount.itemId,{id:mount.itemId,type,chosen:{...chosen},path:mount.path,image:pack.display.objects[mount.itemId]?.imagePath||'',magnifications:[...new Set([...(profile.magnifications||[]),profile.defaultMagnification].filter(Number.isFinite))].sort((a,b)=>a-b)});
  }
  for(const socket of state.allSockets||state.sockets){
   const slot=socket.slotPath||String(socket.socketId);
   if(!primary(socket)||(prefix&&!slot.startsWith(prefix+'/'))||locked[slot])continue;
   for(const id of socket.optionItemIds||[]){
    if(chosen[slot]===id||!leads(id))continue;
    const type=opticType(pack,id);if(type&&mode!=='any'&&type!==mode)continue;
    visit({...chosen,[slot]:id},slot,depth+1);
   }
  }
 }
 visit({...locked});
 return [...best.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
function lockSelectedOptic(pack,options){
 if(!options.opticId)return options;
 if(!/^\d{11}$/.test(options.opticId))throw Error('선택한 조준경을 확인하세요.');
 if(options.optic==='none')throw Error('조준경 제외 조건에서는 특정 조준경을 선택할 수 없습니다.');
 const route=opticChoices(pack,options).find(p=>p.id===options.opticId);
 if(!route)throw Error('선택한 조준경을 장착할 수 없습니다. 무기·배율·제외 파츠·고정 파츠 조건을 확인하세요.');
 const required=[...new Set([...(options.required||[]),options.opticId])];
 // In combat mode the selected lens can still use any compatible height.
 if(options.completionMode==='combat')return {...options,required};
 return {...options,locked:{...options.locked,...route.chosen},required,opticRoute:{...route.chosen}};
}

function opticStatus(pack,state,mode='any'){const lenses=state.mounts.filter(m=>m.source==='selected'&&opticType(pack,m.itemId)),primary=lenses.filter(m=>!['31','40'].includes(m.socketId));const allowed=mode==='any'||(mode==='none'?lenses.length===0&&!state.mounts.some(m=>m.source==='selected'&&pack.display.objects[m.itemId]?.categoryId==='scope'):primary.some(m=>opticType(pack,m.itemId)===mode)&&lenses.every(m=>opticType(pack,m.itemId)===mode));return{mode,met:allowed,items:lenses.map(m=>({id:m.itemId,path:m.path,type:opticType(pack,m.itemId)}))};}
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));return value;}
const key=(chosen,tuning={})=>JSON.stringify(stable({chosen,tuning}));
function metrics(pack,base,combat,summary,chosen,tuning,options){const r=E.calculate(pack,base,chosen,tuning,options.laser),c=E.combat(pack,combat,summary,r),v={cameraStability:r.details.cameraStability?.value};for(const k of Object.keys(METRICS))if(r.details[k])v[k]=r.details[k].value;
 v.recoil=(r.details.autoVertical.value+r.details.autoHorizontal.value)/2;Object.assign(v,{capacity:c.capacity,range:c.validDamageRangeMeters,velocity:c.muzzleVelocityMps,control:r.panel[3],handling:r.panel[5],stability:r.panel[6],accuracy:r.panel[4]});
 const ordinary=(summary.scheduleStatus==='ordinary'||!summary.scheduleStatus)&&summary.projectileCount===1&&!Object.values(r.mounted).some(id=>pack.combat?.specialFire?.itemOverrides?.[id]);
 const distance=options.distance??30,hp=options.hp??100,segment=c.damageFalloffSegments.find(s=>distance>=s.fromM&&distance<s.toM)||c.damageFalloffSegments.at(-1),damage=c.baseFleshDamage*(c.hitboxMultipliers.upperChest??1)*(segment?.rate??1);
 v.ttk=ordinary&&damage>0?(Math.ceil(hp/damage)-1)*c.shotIntervalSeconds*1000:null;
 const trace=R.trace(pack,r,30);Object.assign(v,{patternClimb:trace?.climb??null,patternWidth:trace?.width??null,patternStep:trace?.maxStep??null,patternHorizontalStep:trace?.maxHorizontalStep??null,patternJerk:trace?.lateralJerk??null});return{chosen:r.selected,tuning:{...tuning},metrics:v,result:r,combat:c};}
// Simple mode is conservative: a vertical gain cannot conceal lateral/kick risk.
function simpleRecoilRisk(values,baseline){const terms={};for(const k of ['autoVertical','autoHorizontal','springKick','patternClimb','patternWidth','patternHorizontalStep','patternJerk'])if(Number.isFinite(baseline[k])&&baseline[k]>1e-9)terms[k]=Number.isFinite(values[k])?Math.max(0,values[k])/baseline[k]:1e5;const ratios=Object.values(terms),worst=Math.max(...ratios),mean=ratios.reduce((a,b)=>a+b,0)/Math.max(1,ratios.length),imbalance=Math.abs((terms.autoVertical??0)-(terms.autoHorizontal??0));return{loss:.6*worst+.2*mean+.2*imbalance,worst,mean,imbalance,terms};}
function simpleStabilityRisk(values,baseline){const terms={};for(const k of ['breath','moveSway','holdBreath'])if(Number.isFinite(baseline[k])&&baseline[k]>1e-9)terms[k]=Number.isFinite(values[k])?(METRICS[k][2]==='min'?Math.max(0,values[k])/baseline[k]:baseline[k]/Math.max(.0001,values[k])):1e5;const ratios=Object.values(terms),worst=Math.max(...ratios),mean=ratios.reduce((a,b)=>a+b,0)/Math.max(1,ratios.length);return{loss:.7*worst+.3*mean,worst,mean,terms};}
function simpleBalanceRisk(values,baseline,ignored=[]){const recoil=ignored.includes('control')?null:simpleRecoilRisk(values,baseline),stability=ignored.includes('stability')?null:simpleStabilityRisk(values,baseline),risks=[recoil,stability].filter(Boolean);return{loss:risks.length?.6*Math.max(...risks.map(r=>r.loss))+.4*risks.reduce((a,r)=>a+r.loss,0)/risks.length:0,recoil,stability};}
function completionKeys(reference,ignored=[]){return Object.keys(METRICS).filter(k=>!isExcluded(k,ignored)&&Number.isFinite(reference[k]));}
function completionAssessment(values,reference,ignored=[]){const improved=[],regressed=[],keys=completionKeys(reference,ignored);let score=0;for(const k of keys){const v=values[k],b=reference[k],eps=Math.max(1,Math.abs(b))*1e-8;if(!Number.isFinite(v)){regressed.push(k);score+=1e5;continue;}const delta=(v-b)*(METRICS[k][2]==='min'?1:-1);if(delta>eps)regressed.push(k);if(delta<-eps)improved.push(k);const normal=Math.max(.01,Math.abs(b));score+=METRICS[k][2]==='min'?v/normal:normal/Math.max(.0001,v);}return{improved,regressed,protectedMetrics:keys,score:score/Math.max(1,keys.length),strictImprovement:improved.length>0&&regressed.length===0};}
function completionOptions(reference,preferences={}){const ignored=preferences.excludedStats??['accuracy'];if(!Array.isArray(ignored)||ignored.some(g=>!STAT_GROUPS[g]))throw Error('배제할 스탯을 확인하세요.');const objectives=['recoil','handling','stability','accuracy'].filter(k=>!isExcluded(k,ignored)),constraints=completionKeys(reference,ignored).map(metric=>({metric,value:reference[metric],op:METRICS[metric][2]==='min'?'max':'min',source:'currentCompletion'}));return{...preferences,recommendationMode:'simple',completionMode:'preserve',evaluation:'practical',objectives,priorities:Object.fromEntries(objectives.map(k=>[k,1])),excludedStats:[...ignored],constraints,preserveControl:false,locked:{},banned:[...(preferences.banned||[])],required:[],tune:true,distance:preferences.distance??30,hp:preferences.hp??100,simpleTargets:{},completionProtected:constraints.map(c=>c.metric)};}


function ballisticFloors(baseline,reference=baseline){return Object.fromEntries(['range','velocity'].filter(k=>Number.isFinite(baseline[k])||Number.isFinite(reference[k])).map(k=>[k,Math.max(Number.isFinite(baseline[k])?baseline[k]:0,Number.isFinite(reference[k])?reference[k]:0)]));}
function protectSimpleBallistics(o,baseline,reference){const floors=ballisticFloors(baseline,['combat','preserve','feedback'].includes(o.completionMode)?reference:baseline);o.ballisticFloors=floors;for(const [metric,value]of Object.entries(floors)){const existing=o.constraints.find(c=>c.metric===metric&&c.op==='min');if(existing){existing.value=Math.max(existing.value,value);existing.source='simpleBallistics';}else o.constraints.push({metric,value,op:'min',source:'simpleBallistics'});}return o;}

const FEEDBACK={
 range:{label:'사거리가 짧아요',group:'ballistics',metrics:['range']},
 velocity:{label:'포구속도가 느려요',group:'ballistics',metrics:['velocity']},
 stability:{label:'안정성이 부족해요',group:'stability',metrics:['breath','moveSway','holdBreath','cameraHorizontal','cameraVertical','hitSway','breathRecoil']},
 ads:{label:'조준이 느려요',group:'handling',metrics:['ads','sprintToFire']},
 adsMove:{label:'조준 중 이동이 느려요',group:'handling',metrics:['adsMove']},
 recoil:{label:'반동이 커요',group:'control',metrics:['autoVertical','autoHorizontal','springKick','patternClimb','patternWidth','patternStep','patternHorizontalStep','patternJerk']}
};
function feedbackOptions(reference,preferences={}){const targets=[...new Set(preferences.feedbackTargets||[])];if(!targets.length||targets.some(k=>!FEEDBACK[k]))throw Error('개선할 피드백을 하나 이상 선택하세요.');const groups=new Set(targets.map(k=>FEEDBACK[k].group)),ignored=(preferences.excludedStats||[]).filter(g=>!groups.has(g)),o=completionOptions(reference,{...preferences,excludedStats:ignored}),metrics=[...new Set(targets.flatMap(k=>FEEDBACK[k].metrics))].filter(k=>Number.isFinite(reference[k]));if(!metrics.length)throw Error('이 무기에는 선택한 피드백을 비교할 수치가 없습니다.');const tradeoff=preferences.feedbackTradeoff===true?.05:0;return{...o,completionMode:'feedback',feedbackTargets:targets,feedbackMetrics:metrics,feedbackTradeoff:tradeoff>0,objectives:metrics,priorities:Object.fromEntries(metrics.map(k=>[k,1])),constraints:o.constraints.map(c=>({...c,value:metrics.includes(c.metric)||['range','velocity'].includes(c.metric)?c.value:c.value*(c.op==='max'?1+tradeoff:1-tradeoff),source:metrics.includes(c.metric)?'feedbackTarget':'feedbackGuard'}))};}
function feedbackAssessment(values,reference,o){const comparison=completionAssessment(values,reference,o.excludedStats),targetSet=new Set(o.feedbackMetrics),targetRegressed=comparison.regressed.filter(k=>targetSet.has(k)),targetImproved=comparison.improved.filter(k=>targetSet.has(k)&&Math.abs(values[k]-reference[k])>=Math.max(k==='ads'||k==='sprintToFire'?1:1e-6,Math.abs(reference[k])*.001));const families=o.feedbackTargets.map(id=>{const keys=FEEDBACK[id].metrics.filter(k=>Number.isFinite(reference[k]));const ratios=keys.map(k=>{const v=values[k],b=reference[k],n=Math.max(.01,Math.abs(b));return !Number.isFinite(v)?1e5:METRICS[k][2]==='min'?v/n:n/Math.max(.0001,v);});return ratios.length?.7*ratios.reduce((a,b)=>a+b,0)/ratios.length+.3*Math.max(...ratios):0;});return{...comparison,targetImproved,targetRegressed,improved:targetImproved.length>0&&targetRegressed.length===0,score:families.reduce((a,b)=>a+b,0)/families.length};}


function combatOptions(baseline,preferences={},profile=P){
 const o=simpleOptions(baseline,{...preferences,completionMode:'balanced'},profile);
 o.completionMode='combat';
 const kickLimit=o.constraints.find(c=>c.metric==='springKick'&&c.op==='max');
 if(kickLimit){
  kickLimit.value=baseline.springKick*profile.targets.springKick;
  kickLimit.source='combatWeaponSway';
 }
 if(!o.excludedStats.includes('stability'))for(const k of ['breath','moveSway','cameraHorizontal','cameraVertical'])if(Number.isFinite(baseline[k])&&baseline[k]>0){const value=baseline[k]*.6,c=o.constraints.find(c=>c.metric===k&&c.op==='max');if(c){c.value=Math.min(c.value,value);c.source='combatStability';}else o.constraints.push({metric:k,op:'max',value,source:'combatStability'});}
 return o;
}
function combatRisk(v,b,ignored=[],weights,profile){return P.score(v,b,ignored,weights,profile);}

// AKM example supplies a balanced floor, not an asserted universal optimum.
function simpleOptions(baseline,preferences={},profile=P){if(preferences.completionMode==='combat')return combatOptions(baseline,preferences,profile);if(preferences.completionMode==='preserve')return completionOptions(baseline,preferences);const ignored=preferences.excludedStats??['accuracy'];if(!Array.isArray(ignored)||ignored.some(g=>!STAT_GROUPS[g]))throw Error('배제할 스탯을 확인하세요.');const targets={};for(const [metric,gain,ceiling]of profile.panelGoals)if(!isExcluded(metric,ignored))targets[metric]=Math.max(baseline[metric],Math.min(ceiling,baseline[metric]+gain));const constraints=Object.entries(targets).map(([metric,value])=>({metric,value,op:'min',source:'simpleBalance'}));for(const metric of ['walk','sprint','adsMove'])if(!isExcluded(metric,ignored)&&Number.isFinite(baseline[metric]))constraints.push({metric,value:baseline[metric],op:'min',source:'simpleMobility'});for(const metric of ['ads','autoVertical','autoHorizontal','springKick'])if(!isExcluded(metric,ignored)&&Number.isFinite(baseline[metric]))constraints.push({metric,value:baseline[metric],op:'max',source:'simpleControl'});if(!ignored.includes('stability')){for(const metric of ['breath','moveSway'])if(Number.isFinite(baseline[metric]))constraints.push({metric,value:baseline[metric],op:'max',source:'simpleStability'});if(Number.isFinite(baseline.holdBreath))constraints.push({metric:'holdBreath',value:baseline.holdBreath,op:'min',source:'simpleStability'});}return{...preferences,recommendationMode:'simple',evaluation:'practical',objectives:['recoil','handling','stability',...(!ignored.includes('accuracy')?['accuracy']:[])],priorities:{recoil:1,handling:1,stability:1,accuracy:1},excludedStats:[...ignored],constraints,preserveControl:false,locked:{},banned:[...(preferences.banned||[])],required:[],tune:true,distance:30,hp:100,simpleTargets:targets};}
function validate(options){const o={...options,goal:options.goal||'balanced',tactical:options.tactical??'any',constraints:(options.constraints||[]).map(c=>({...c})),locked:options.locked||{},banned:options.banned||[],required:options.required||[],maxEvaluations:Math.max(100,Math.min(20000,Number(options.maxEvaluations)||6000))};if(!['raw','practical'].includes(o.evaluation||'raw'))throw Error('평가 방식을 확인하세요.');if(!['any','none','unmagnified','magnified'].includes(o.optic||'any'))throw Error('조준경 조건을 확인하세요.');if(!Object.hasOwn(TACTICAL_LABELS,o.tactical))throw Error('전술장비 조건을 확인하세요.');if(o.tactical==='none'||o.tactical==='light')o.laser=false;if(options.tactical==='any'&&o.laser)o.tactical='laserActive';if(o.tactical==='laserActive')o.laser=true;if(!PRESETS[o.goal])throw Error('지원하지 않는 최적화 목표');for(const c of o.constraints)if(!METRICS[c.metric]||!['min','max'].includes(c.op)||!Number.isFinite(c.value))throw Error('조건 값을 확인하세요.');if(!Number.isFinite(o.distance)||o.distance<0||o.distance>1000||!Number.isFinite(o.hp)||o.hp<=0)throw Error('거리와 목표 체력을 확인하세요.');return o;}
function objectiveWeights(o){if(o.objectives===undefined)return PRESETS[o.goal];if(!Array.isArray(o.objectives)||!o.objectives.length)throw Error('원하는 목표를 하나 이상 추가하세요.');const keys=[...new Set(o.objectives)];if(keys.some(k=>!METRICS[k]))throw Error('지원하지 않는 최적화 항목입니다.');return Object.fromEntries(keys.map(k=>[k,1/keys.length]));}
function objectiveTiers(weights,priorities={}){if(!priorities||typeof priorities!=='object'||Array.isArray(priorities))throw Error('목표 순위를 확인하세요.');const tiers=new Map();for(const [metric,weight]of Object.entries(weights)){const priority=priorities[metric]??1;if(!Number.isInteger(priority)||priority<1||priority>Object.keys(METRICS).length)throw Error('목표 순위를 확인하세요.');if(!tiers.has(priority))tiers.set(priority,{});tiers.get(priority)[metric]=weight;}return [...tiers].sort((a,b)=>a[0]-b[0]).map(([priority,items])=>{const total=Object.values(items).reduce((a,b)=>a+b,0);return{priority,weights:Object.fromEntries(Object.entries(items).map(([k,w])=>[k,w/total]))};});}
// Hard requirements first; lexicographic objective tiers never exchange a
// higher-priority loss for an improvement in a lower-priority tier.
function compareCandidates(a,b){if(a.feasible!==b.feasible)return a.feasible?-1:1;if(!a.feasible&&a.violation!==b.violation)return a.violation-b.violation;const x=a.priorityLosses||[a.loss],y=b.priorityLosses||[b.loss];for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]??0)-(y[i]??0);if(Math.abs(d)>1e-10)return d;}return Object.keys(a.chosen||{}).length-Object.keys(b.chosen||{}).length;}
function partSignature(chosen={}){return JSON.stringify(Object.values(chosen).sort());}
function partChanges(before={},after={}){return [...new Set([...Object.keys(before),...Object.keys(after)])].sort().filter(slot=>(before[slot]||null)!==(after[slot]||null)).map(slot=>({slot,before:before[slot]||null,after:after[slot]||null}));}
function diverseConfigurations(items,limit=5){const best=new Map();for(const item of [...items].sort(compareCandidates)){const id=partSignature(item.chosen);if(!best.has(id))best.set(id,item);}const ranked=[...best.values()],selected=[],seen=new Set(),core=x=>JSON.stringify(Object.entries(x.chosen||{}).filter(([slot])=>['1','2','3','5','6','8','38','67'].includes(slot.split('/').at(-1))).map(([,id])=>id).sort());for(const item of ranked){const id=core(item);if(!seen.has(id)){selected.push(item);seen.add(id);}if(selected.length===limit)return selected;}for(const item of ranked){if(!selected.includes(item))selected.push(item);if(selected.length===limit)break;}return selected;}
async function run(input,progress=()=>{},cancelled=()=>false){const{pack,base,combat,summary}=input,o=validate(input.options||{}),profile=P.forWeapon(pack),baseline=metrics(pack,base,combat,summary,{}, {},o),reference=metrics(pack,base,combat,summary,input.currentChosen||{},input.currentTuning||{},o).metrics;if(o.recommendationMode==='simple')Object.assign(o,o.completionMode==='feedback'?feedbackOptions(reference,o):simpleOptions(o.completionMode==='preserve'?reference:baseline.metrics,o,profile));if(o.recommendationMode==='simple')protectSimpleBallistics(o,baseline.metrics,reference);Object.assign(o,lockSelectedOptic(pack,o));const weights=effectiveWeights(o),tiers=objectiveTiers(weights,o.priorities);if(weights.ttk&&!Number.isFinite(baseline.metrics.ttk))throw Error('이 무기는 특수 발사·산탄·충전 방식으로 TTK 최적화를 지원하지 않습니다. 다른 목표를 선택하세요.');
 if(o.magazineCapacity!==undefined&&o.magazineCapacity!==null&&o.magazineCapacity!=='any'){const n=o.magazineCapacity==='base'?baseline.metrics.capacity:Number(o.magazineCapacity);if(!Number.isInteger(n)||n<1||n>500)throw Error('탄창 용량을 확인하세요.');o.magazineCapacity=n;o.constraints.push({metric:'capacity',op:'min',value:n,source:'magazineCapacity'});o.constraints.push({metric:'capacity',op:'max',value:n,source:'magazineCapacity'});}
 if(o.preserveControl)for(const metric of ['autoVertical','autoHorizontal','springKick'])o.constraints.push({metric,op:'max',value:reference[metric],source:'currentBuild'});
 const start=Date.now(),cache=new Map(),archive=new Map(),feedbackBank=new Map(),autoExcludedParts=excludedOnlyParts(pack,o),excludedTactical=Object.keys(TACTICAL_TYPES).filter(id=>o.tactical!=='any'&&!tacticalMatches(TACTICAL_TYPES[id],o.tactical)),banned=new Set([...o.banned,...autoExcludedParts,...excludedTactical]),locked=o.locked,required=new Set(o.required),budget=o.maxEvaluations;let evaluations=0,stopped=false,bestFeasible=null,pruning=false;const cleanupReserve=o.excludedStats?.length?Math.min(Math.floor(budget*.25),600):0;
 const preferRaisedOptics=o.completionMode==='combat'&&o.optic!=='none';
 const tacticalSupported=['any','none'].includes(o.tactical)||Object.keys(TACTICAL_TYPES).some(id=>tacticalMatches(TACTICAL_TYPES[id],o.tactical)&&!banned.has(id)&&pack.display.objects[id]?.playerSelectable===true);
 const matchesLens=id=>!preferRaisedOptics||!o.opticId||id===o.opticId;
 const laserMode=o.tactical==='any'?'laserActive':o.tactical;
 function riserLaserSlots(state){
  const slots=[];
  for(const socket of state.allSockets||state.sockets){
   const path=socket.slotPath,parent=path.lastIndexOf('/');
   if(parent<0||state.selected[path.slice(0,parent)]!==tacticalRiser)continue;
   const ids=socket.optionItemIds.filter(id=>tacticalMatches(TACTICAL_TYPES[id],laserMode)&&tacticalMatches(TACTICAL_TYPES[id],'laserActive')&&!banned.has(id)&&
    (!locked[path]||locked[path]===id)&&pack.display.objects[id]?.playerSelectable===true&&!pack.display.objects[id]?.selectionDisabledReason);
   if(ids.length)slots.push({path,ids});
  }
  return slots;
 }
 function evaluate(chosen,tuning={},tryRiser=true){if(evaluations>=(pruning?budget:budget-cleanupReserve)||cancelled()){stopped=true;return null;}const rawKey=key(chosen,tuning);if(cache.has(rawKey))return null;evaluations++;
  let item=metrics(pack,base,combat,summary,chosen,tuning,o);for(let pass=0;pass<3;pass++){const canonical=Object.fromEntries(item.result.mounts.filter(m=>m.source==='selected').map(m=>[m.path,m.itemId]));if(JSON.stringify(stable(canonical))===JSON.stringify(stable(item.chosen)))break;item=metrics(pack,base,combat,summary,canonical,tuning,o);}const selected=Object.values(item.chosen),mounted=Object.values(item.result.mounted);if(selected.some(id=>banned.has(id))||Object.entries(locked).some(([slot,id])=>item.chosen[slot]!==id)){cache.set(rawKey,null);return null;}
  const optic=opticStatus(pack,item.result,o.optic);if(preferRaisedOptics&&o.opticId)optic.met=optic.met&&optic.items.some(m=>m.id===o.opticId&&!['31','40'].includes(m.path.split('/').at(-1)));let violation=optic.met?0:2;item.optic=optic;item.tactical=tacticalStatus(item.result.mounts,o.tactical);if(o.tactical!=='any'&&item.tactical.items.length>1){cache.set(rawKey,null);return null;}if(!item.tactical.met)violation+=2;
  const lasers=item.tactical.items.filter(m=>tacticalMatches(m.type,'laserActive'));
  const movableLasers=lasers.filter(m=>!locked[m.path]);
  const riserSlots=(lasers.length||!item.tactical.met)&&selected.includes(tacticalRiser)?riserLaserSlots(item.result):[];
  const onRiser=lasers.some(laser=>riserSlots.some(socket=>socket.path===laser.path));
  item.tactical.riserMet=onRiser||!riserSlots.length||!movableLasers.length;
  if(!item.tactical.riserMet)violation+=1;
  const checks=o.constraints.map(c=>{const actual=item.metrics[c.metric],gap=Number.isFinite(actual)?Math.max(0,c.op==='min'?c.value-actual:actual-c.value):Infinity;violation+=Number.isFinite(gap)?gap/Math.max(1,Math.abs(c.value),Math.abs(baseline.metrics[c.metric]||0)):100;return{...c,actual,met:Number.isFinite(actual)&&gap<=1e-8};});
  for(const id of required)if(!mounted.includes(id))violation+=2;
  if(o.suppressor&&!mounted.some(id=>(pack.effectsByItemId[id]?.mp||[]).some(e=>e.target==='ShotDistance'&&e.modifier==='Mult_C'&&e.value<1)))violation+=2;
  const loss=Object.entries(weights).reduce((sum,[k,w])=>{const v=item.metrics[k],b=baseline.metrics[k];if(!Number.isFinite(v))return sum+1e5;const normal=Math.max(Math.abs(b||0),k==='ttk'?50:.01);return sum+w*(METRICS[k][2]==='min'?v/normal:normal/Math.max(v,.0001));},0);
  item.priorityLosses=tiers.map(t=>Object.entries(t.weights).reduce((sum,[k,w])=>{const v=item.metrics[k],b=baseline.metrics[k],normal=Math.max(Math.abs(b||0),k==='ttk'?50:.01);return sum+w*(Number.isFinite(v)?(METRICS[k][2]==='min'?v/normal:normal/Math.max(v,.0001)):1e5);},0));
  if(o.evaluation==='practical'){item.practical=practicalScore(item.metrics,baseline.metrics,weights);item.priorityLosses=tiers.map(t=>practicalScore(item.metrics,baseline.metrics,t.weights).loss);}
  if(o.recommendationMode==='simple'&&(!o.excludedStats.includes('control')||!o.excludedStats.includes('stability'))){item.simpleBalanceRisk=simpleBalanceRisk(item.metrics,baseline.metrics,o.excludedStats);if(item.simpleBalanceRisk.recoil)item.simpleRecoilRisk=item.simpleBalanceRisk.recoil;if(item.simpleBalanceRisk.stability)item.simpleStabilityRisk=item.simpleBalanceRisk.stability;item.priorityLosses.unshift(item.simpleBalanceRisk.loss);}
  if(o.completionMode==='combat'){item.combatRisk=combatRisk(item.metrics,baseline.metrics,o.excludedStats,o.combatWeights,profile);item.currentComparison=completionAssessment(item.metrics,reference,o.excludedStats);item.priorityLosses.unshift(item.combatRisk.loss);}
  if(preferRaisedOptics){item.opticRiserRank=opticRiserRank(item.chosen,optic.items.filter(m=>matchesLens(m.id)));item.priorityLosses.unshift(-item.opticRiserRank);}
  if(o.completionMode==='preserve'){item.completion=completionAssessment(item.metrics,reference,o.excludedStats);item.priorityLosses.unshift(item.completion.score);}
  if(o.completionMode==='feedback'){item.feedback=feedbackAssessment(item.metrics,reference,o);item.priorityLosses.unshift(item.feedback.score);}
  const cleanTuning={};for(const id of selected)for(const tid of pack.parts[id]?.tuneIds||[])if(tuning[tid]!==undefined)cleanTuning[tid]=tuning[tid];item.tuning=cleanTuning;item.loss=loss;item.violation=violation;item.feasible=violation<1e-8&&checks.filter(c=>c.source==='simpleBallistics').every(c=>c.met)&&(o.completionMode!=='feedback'||(checks.every(c=>c.met)&&!item.feedback.targetRegressed.length));item.checks=checks;item.rank=loss+violation*1000;item.key=key(item.chosen,cleanTuning);delete item.combat;
  if(o.completionMode==='feedback'&&item.feasible){const signature=partSignature(item.chosen),oldPart=feedbackBank.get(signature);if(!oldPart||compareCandidates(item,oldPart)<0)feedbackBank.set(signature,item);if(feedbackBank.size>100){const keep=diverseConfigurations([...feedbackBank.values()],80);feedbackBank.clear();for(const x of keep)feedbackBank.set(partSignature(x.chosen),x);}}
  const old=archive.get(item.key);if(!old||compareCandidates(item,old)<0)archive.set(item.key,item);cache.set(rawKey,true);if(item.feasible&&(!bestFeasible||compareCandidates(item,bestFeasible)<0))bestFeasible=item;
  if(archive.size>160){const ranked=[...archive.values()].sort(compareCandidates),keep=o.completionMode==='feedback'?[...new Map([...ranked.slice(0,40),...diverseConfigurations(ranked,40)].map(x=>[x.key,x])).values()]:ranked.slice(0,80);archive.clear();for(const candidate of keep)archive.set(candidate.key,candidate);}
  if(evaluations%100===0)progress({evaluations,budget,feasible:[...archive.values()].filter(x=>x.feasible).length,elapsedMs:Date.now()-start});
  // Install the laser and its riser as one candidate so the beam can retain both.
  if(tryRiser&&optic.met&&(!item.tactical.riserMet||!item.tactical.met)&&riserSlots.length){
   const next={...item.chosen};
   for(const laser of movableLasers)delete next[laser.path];
   const {path,ids}=riserSlots[0];
   next[path]=movableLasers.find(laser=>ids.includes(laser.id))?.id||ids[0];
   const routed=evaluate(next,cleanTuning,false);
   if(routed&&compareCandidates(routed,item)<0)return routed;
  }
  return item;
 }
 // Re-evaluate canonical mount paths before scoring/exporting: a candidate must
 // carry exactly the configuration that the builder will apply.
 const ordered=()=>[...new Map([...archive.values(),...feedbackBank.values()].map(x=>[x.key,x])).values()].sort((a,b)=>compareCandidates(a,b)||a.key.localeCompare(b.key));
 // Seed each primary optic route as a compound move, so an adapter with no
 // immediate stat benefit is not discarded before its child lens is explored.
 function expandOptics(chosen,tuning,depth=0,prefix=''){
  if(depth>5||stopped)return;const state=E.assembly(pack,chosen);
  for(const socket of state.allSockets||state.sockets){if(prefix&&!socket.slotPath.startsWith(prefix+'/'))continue;if(['31','40'].includes(String(socket.socketId)))continue;const sid=socket.slotPath;
   if(locked[sid]||(sid===String(socket.socketId)&&locked[String(socket.socketId)]))continue;
   for(const id of socket.optionItemIds){if(banned.has(id)||pack.display.objects[id]?.playerSelectable!==true||pack.display.objects[id]?.selectionDisabledReason)continue;const type=opticType(pack,id),adapter=pack.display.objects[id]?.categoryId==='scope'&&!type&&pack.assembly.socketProviders[id];if(!type&&!adapter)continue;if(o.optic==='none'||(type&&(!matchesLens(id)||(o.optic&&o.optic!=='any'&&type!==o.optic))))continue;
    const next={...chosen,[sid]:id};evaluate(next,tuning);if(adapter)expandOptics(next,tuning,depth+1,sid);if(stopped)return;
   }
  }
 }
 const bareCandidate=evaluate({...locked});const referenceCandidate=evaluate(Object.fromEntries(Object.entries({...input.currentChosen,...locked}).filter(([,id])=>!autoExcludedParts.includes(id))),input.currentTuning||{},false)||(!Object.keys(input.currentChosen||{}).length&&!Object.keys(input.currentTuning||{}).length?bareCandidate:null);
 if(['combat','feedback'].includes(o.completionMode))for(const seed of Seeds?.[pack.weaponId]||[]){
  const chosen={...seed.chosen,...locked};
  if(preferRaisedOptics){
   // Keep the calibrated build and search its optic routes as a combined candidate.
   for(const [slot,id] of Object.entries(chosen)){
    const type=opticType(pack,id);
    if(type&&(!matchesLens(id)||(o.optic&&o.optic!=='any'&&type!==o.optic))&&!locked[slot])delete chosen[slot];
   }
   expandOptics(chosen,seed.tuning);
  }
  evaluate(chosen,seed.tuning);
 }
 if(preferRaisedOptics||(o.optic&&o.optic!=='none'&&o.optic!=='any'))expandOptics({...locked},{});
 if(o.completionMode==='feedback'&&referenceCandidate&&!stopped){const mutations=[];for(const socket of referenceCandidate.result.allSockets||referenceCandidate.result.sockets){const slot=socket.slotPath||String(socket.socketId);if(locked[slot]||['31','40'].includes(String(socket.socketId)))continue;const candidates=[];for(const id of [null,...socket.optionItemIds]){if(id===referenceCandidate.chosen[slot]||(id&&(banned.has(id)||pack.display.objects[id]?.playerSelectable!==true||pack.display.objects[id]?.selectionDisabledReason)))continue;if(id&&o.optic==='none'&&pack.display.objects[id]?.categoryId==='scope')continue;const next={...referenceCandidate.chosen};if(id)next[slot]=id;else delete next[slot];const candidate=evaluate(next,referenceCandidate.tuning);if(candidate)candidates.push({slot,id,candidate});if(stopped||evaluations>=budget*.18)break;}mutations.push(candidates.sort((a,b)=>compareCandidates(a.candidate,b.candidate)).slice(0,3));if(stopped||evaluations>=budget*.18)break;}for(let i=0;i<mutations.length&&!stopped&&evaluations<budget*.4;i++)for(let j=i+1;j<mutations.length&&!stopped&&evaluations<budget*.4;j++)for(const a of mutations[i])for(const b of mutations[j]){if(stopped||evaluations>=budget*.4)break;const next={...referenceCandidate.chosen};for(const x of [a,b]){if(x.id)next[x.slot]=x.id;else delete next[x.slot];}evaluate(next,referenceCandidate.tuning);}}
 if(o.evaluation==='practical'){let randomState=Number.isInteger(o.searchSeed)?o.searchSeed>>>0:43117;const rand=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};for(let trial=0;trial<60&&!stopped&&evaluations<budget*.25;trial++){let next={...locked};for(let depth=0;depth<3;depth++){const state=E.assembly(pack,next);for(const socket of state.allSockets||state.sockets){if(['31','40'].includes(String(socket.socketId)))continue;const sid=socket.slotPath||String(socket.socketId);if(locked[sid]||locked[String(socket.socketId)]||rand()>.55)continue;const allowed=socket.optionItemIds.filter(id=>!banned.has(id)&&pack.display.objects[id]?.playerSelectable===true&&!pack.display.objects[id]?.selectionDisabledReason&&(o.optic!=='none'||pack.display.objects[id]?.categoryId!=='scope')&&(!opticType(pack,id)||(matchesLens(id)&&(!o.optic||o.optic==='any'||opticType(pack,id)===o.optic))));if(allowed.length)next[sid]=allowed[Math.floor(rand()*allowed.length)];}}evaluate(next);}}
 const pickBeam=items=>{if(o.completionMode==='feedback')return diverseConfigurations(items,8);if(o.evaluation!=='practical')return items.slice(0,5);const picked=[],seen=new Set();for(const item of items){const signature=['2','3','8'].map(sid=>item.result.mounts.find(m=>m.socketId===sid)?.itemId||'').join('|');if(!seen.has(signature)){picked.push(item);seen.add(signature);}if(picked.length===8)break;}return picked;};
 // Several deterministic passes revisit slots exposed by handguards/barrels.
 // A bounded beam is a search heuristic, never a proof of a global optimum.
 let beam=pickBeam(ordered());for(let round=0;round<(o.evaluation==='practical'?6:4)&&!stopped;round++){let changed=false;for(const seed of beam){for(const socket of seed.result.allSockets||seed.result.sockets){if(o.evaluation==='practical'&&['31','40'].includes(String(socket.socketId)))continue;const sid=socket.slotPath||String(socket.socketId);if(locked[sid]||(sid===String(socket.socketId)&&locked[String(socket.socketId)]))continue;for(const id of [null,...socket.optionItemIds]){if(id&&(banned.has(id)||pack.display.objects[id]?.playerSelectable!==true||pack.display.objects[id]?.selectionDisabledReason))continue;const type=id&&opticType(pack,id);if(id&&o.optic==='none'&&pack.display.objects[id]?.categoryId==='scope')continue;if(type&&(!matchesLens(id)||(o.optic&&o.optic!=='any'&&type!==o.optic)))continue;const next={...seed.chosen};if(sid===String(socket.socketId)||!(seed.result.allSockets||[]).some(s=>s.slotPath===String(socket.socketId)))delete next[String(socket.socketId)];if(id)next[sid]=id;else delete next[sid];const candidate=evaluate(next,seed.tuning);if(id&&pack.display.objects[id]?.categoryId==='scope'&&!type&&o.optic!=='none')expandOptics(next,seed.tuning,0,sid);if(candidate&&compareCandidates(candidate,seed)<0)changed=true;if(stopped)break;}if(stopped)break;}if(stopped)break;}
  const next=pickBeam(ordered());if(!changed||next.map(x=>x.key).join()===beam.map(x=>x.key).join())break;beam=next;await new Promise(resolve=>setTimeout(resolve,0));}
 if(o.tune&&!stopped){for(const seed of (o.completionMode==='feedback'?diverseConfigurations(ordered(),5):ordered().slice(0,3))){let current=seed;for(let pass=0;pass<2&&!stopped;pass++)for(const mount of current.result.mounts)for(const tid of pack.parts[mount.itemId]?.tuneIds||[]){if(o.lockTuning&&input.currentTuning?.[tid]!==undefined)continue;const t=E.tuneFor(pack,mount,tid);if(!t||t.enabled===false)continue;const r=t.range,values=[r.minValue,r.defaultValue,r.maxValue,(r.minValue+r.defaultValue)/2,(r.defaultValue+r.maxValue)/2];for(let value of values){if(t.sliderType==='Discrete'&&t.notch>0)value=r.defaultValue+Math.round((value-r.defaultValue)/t.notch)*t.notch;value=Math.min(r.maxValue,Math.max(r.minValue,value));const trial=evaluate(current.chosen,{...current.tuning,[tid]:value});if(trial&&compareCandidates(trial,current)<0)current=trial;if(stopped)break;}if(stopped)break;}if(stopped)break;}}
 // Remove optional parts that do not help any remaining objective or requirement.
 // Compare detailed active metrics, never excluded scores, including at tie-breaks.
 pruning=true;stopped=false;const pruningKeys=[...new Set([...(o.evaluation==='practical'?practicalPlan(weights).flatMap(g=>Object.keys(g.terms)):Object.keys(weights)),...o.constraints.map(c=>c.metric),...(o.recommendationMode==='simple'&&!isExcluded('recoil',o.excludedStats)?Object.keys(simpleRecoilRisk(baseline.metrics,baseline.metrics).terms):[])])].filter(k=>Number.isFinite(baseline.metrics[k])),pruned=[];let removedCount=0;
 for(let seed of (o.completionMode==='feedback'?diverseConfigurations(ordered(),12):ordered().slice(0,5))){for(let pass=0;pass<3&&evaluations<budget&&!cancelled();pass++){let changed=false;for(const slot of Object.keys(seed.chosen).sort((a,b)=>b.length-a.length)){if(locked[slot]||required.has(seed.chosen[slot]))continue;const next={...seed.chosen};delete next[slot];cache.delete(key(next,seed.tuning));const candidate=evaluate(next,seed.tuning);if(!candidate||Object.keys(candidate.chosen).length>=Object.keys(seed.chosen).length||candidate.violation>seed.violation+1e-10)continue;const harmless=pruningKeys.every(k=>Number.isFinite(seed.metrics[k])&&Number.isFinite(candidate.metrics[k])&&(METRICS[k][2]==='min'?candidate.metrics[k]<=seed.metrics[k]+1e-9:candidate.metrics[k]>=seed.metrics[k]-1e-9));if(harmless&&compareCandidates(candidate,seed)<=0){removedCount+=Object.keys(seed.chosen).length-Object.keys(candidate.chosen).length;seed=candidate;changed=true;}}if(!changed)break;}pruned.push(seed);}
 const all=pruned.sort(compareCandidates),feasible=all.filter(x=>x.feasible),pool=feasible.length?feasible:all;let unique=[];const signatures=new Set();for(const item of pool){const signature=JSON.stringify(Object.fromEntries(Object.entries(item.metrics).map(([k,v])=>[k,Number.isFinite(v)?Number(v.toFixed(6)):v])));if(!signatures.has(signature)){unique.push(item);signatures.add(signature);}if(unique.length===5)break;}if(o.completionMode==='preserve'&&referenceCandidate?.feasible&&!unique.some(r=>r.feasible&&r.completion?.strictImprovement))unique=[referenceCandidate];if(o.completionMode==='feedback'){const valid=all.filter(r=>r.feasible),improved=diverseConfigurations(valid.filter(r=>r.feedback?.improved),5);unique=improved.length?improved:diverseConfigurations([...(referenceCandidate?.feasible?[referenceCandidate]:[]),...valid.filter(r=>!r.feedback?.regressed.length)],5);if(!unique.length)unique=diverseConfigurations(all,5);for(const item of unique){item.partChanges=partChanges(referenceCandidate?.chosen||input.currentChosen||{},item.chosen);item.partChangeCount=item.partChanges.length;item.feedbackVariant=partSignature(item.chosen)!==partSignature(referenceCandidate?.chosen||input.currentChosen||{})?'parts':item.feedback?.improved?'tuning':'maintained';}}const chosenResults=unique.map(({result,key,...item})=>item);
 progress({evaluations,budget,feasible:feasible.length,elapsedMs:Date.now()-start});return{feedbackDiversity:o.completionMode==='feedback'?{configurationCount:new Set(chosenResults.map(r=>partSignature(r.chosen))).size,partAlternatives:chosenResults.filter(r=>r.feedbackVariant==='parts').length,tuningOnly:chosenResults.filter(r=>r.feedbackVariant==='tuning').length,maximum:5}:null,calibrationPool:o.collectCalibration?[...archive.values()].filter(x=>x.feasible).map(x=>({metrics:x.metrics,chosen:x.chosen,tuning:x.tuning})):undefined,feedbackStatus:o.completionMode==='feedback'?(chosenResults.some(r=>r.feasible&&r.feedback?.improved)?'improved':chosenResults.some(r=>r.feasible)?'maintained':'requirements-conflict'):null,results:chosenResults,evaluations,feasibleCount:feasible.length,elapsedMs:Date.now()-start,budgetReached:evaluations>=budget,cancelled:cancelled(),baseline:baseline.metrics,reference,completionStatus:o.completionMode==='preserve'?(chosenResults.some(r=>r.feasible&&r.completion?.strictImprovement)?'improved':chosenResults.some(r=>r.feasible)?'maintained':'requirements-conflict'):null,autoExcludedParts,tacticalSupported,removedUnhelpfulParts:removedCount,objectiveTiers:tiers,options:o,method:'bounded-beam-and-coordinate-tuning',globalOptimumProven:false};
}
function tacticalComparison(pack,base,chosen,tuning){const off=E.calculate(pack,base,chosen,tuning,false),on=E.calculate(pack,base,chosen,tuning,true),present=off.raw.some(e=>e.scope==='TacticalEffective'&&e.itemId!==pack.weaponId);const rows=[];if(present){for(const id of ['3','5','6','4'])rows.push({key:'panel'+id,label:E.fields[id],unit:'점',off:off.panel[id],on:on.panel[id]});for(const [key,d]of Object.entries(off.details))if(on.details[key]&&Math.abs(d.value-on.details[key].value)>1e-8)rows.push({key,label:d.label,unit:d.unit,off:d.value,on:on.details[key].value});}return{present,rows};}
function magazineOptions(pack,base,combat,summary){const capacities=new Set([metrics(pack,base,combat,summary,{}, {},{laser:false}).metrics.capacity]);for(const socket of E.assembly(pack,{}).allSockets||[]){for(const id of socket.optionItemIds||[]){if(!(pack.effectsByItemId[id]?.mp||[]).some(e=>e.target==='GMagCapacity'))continue;const value=metrics(pack,base,combat,summary,{[socket.slotPath||String(socket.socketId)]:id},{},{laser:false}).metrics.capacity;if(Number.isFinite(value))capacities.add(value);}}return [...capacities].sort((a,b)=>a-b);}
const api={TACTICAL_LABELS,opticChoices,lockSelectedOptic,partSignature,partChanges,diverseConfigurations,tacticalComparison,magazineOptions,combatProfile:P,combatOptions,combatRisk,ballisticFloors,protectSimpleBallistics,FEEDBACK,feedbackOptions,feedbackAssessment,completionOptions,completionKeys,completionAssessment,simpleStabilityRisk,simpleBalanceRisk,simpleRecoilRisk,simpleOptions,PRACTICAL_EXPANSIONS,practicalPlan,practicalScore,STAT_GROUPS,isExcluded,effectiveWeights,excludedOnlyParts,METRICS,PRESETS,run,metrics,key,opticType,opticStatus,compareCandidates,objectiveTiers};root.WarfareOptimize=api;if(typeof module!=='undefined')module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
