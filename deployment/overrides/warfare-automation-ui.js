(function(root){'use strict';let api,worker=null,runSerial=0,resultSnapshot=null,results=[],shareSnapshot=null;const $=id=>document.getElementById(id),O=()=>WarfareOptimize,S=()=>WarfareShare;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=n=>Number.isFinite(n)?String(Number(n.toFixed(3))):'계산 불가';let banned=new Set();try{const saved=JSON.parse(localStorage.getItem('dflab-unavailable-parts')||'[]');if(Array.isArray(saved))banned=new Set(saved.filter(x=>typeof x==='string'));}catch{}
function partBenefits(s,id,ignored=[]){const fields={3:'반동',5:'조작성',6:'안정성',4:'지향사격'},sums={};for(const e of s.pack.effectsByItemId[id]?.mp||[]){const m=e.target.match(/^DisplayAttrValues\.(3|4|5|6)$/);if(m&&e.scope==='NONE'&&e.modifier==='Addend'&&Number.isFinite(e.value))sums[m[1]]=(sums[m[1]]||0)+e.value;}return Object.entries(sums).filter(([,v])=>v!==0).map(([k,v])=>fields[k]+' '+(v>0?'+':'')+fmt(v)+(ignored.includes(({3:'control',5:'handling',6:'stability',4:'accuracy'})[k])?' (평가 제외)':'')).join(' · ');}
const build=s=>({version:1,sourceVersion:s.version,mode:'mp',weapon:s.pack.weaponId,chosen:{...s.chosen},tuning:{...s.tuning},laser:s.laser});
function laserActive(){return !$('opt-laser').disabled&&$('opt-laser').checked;}
function snapshot(){const s=api.snapshot();if(!s?.pack)throw Error('무기 데이터를 먼저 불러오세요.');return s;}
function status(text,error=false){$('opt-status').textContent=text;$('opt-status').classList.toggle('error',error);}
let simpleExcludedStats=new Set(['accuracy']);
function renderSimpleExclusions(){$('opt-simple-exclusions').innerHTML=Object.entries(O().STAT_GROUPS).map(([id,g])=>`<label><input type="checkbox" data-simple-exclude="${id}" ${simpleExcludedStats.has(id)?'checked':''}>${g.label}</label>`).join('');document.querySelectorAll('[data-simple-exclude]').forEach(el=>el.onchange=()=>{el.checked?simpleExcludedStats.add(el.dataset.simpleExclude):simpleExcludedStats.delete(el.dataset.simpleExclude);renderSimpleTargets();});}
let objectives=['recoil','handling','stability'],priorities={recoil:1,handling:1,stability:1},excludedStats=new Set();
function renderExclusions(){$('opt-exclusions').innerHTML=Object.entries(O().STAT_GROUPS).map(([id,g])=>`<label><input type="checkbox" data-exclude-stat="${id}" ${excludedStats.has(id)?'checked':''}>${g.label}</label>`).join('');document.querySelectorAll('[data-exclude-stat]').forEach(el=>el.onchange=()=>{if(el.checked)excludedStats.add(el.dataset.excludeStat);else excludedStats.delete(el.dataset.excludeStat);renderObjectives();});}
const excluded=k=>O().isExcluded(k,[...excludedStats]);
function renderObjectives(){const picker=$('opt-goal');picker.innerHTML=Object.entries(O().METRICS).filter(([k])=>!objectives.includes(k)&&!excluded(k)).map(([k,[n,u,d]])=>`<option value="${k}">${n} · ${d==='min'?'최소':'최대'}</option>`).join('');$('opt-add-goal').disabled=!picker.options.length;$('opt-objectives').innerHTML=[...objectives].sort((a,b)=>(priorities[a]??1)-(priorities[b]??1)).map(k=>`<span class="opt-goal-chip ${excluded(k)?'is-excluded':''}"><select ${excluded(k)?'disabled':''} data-goal-priority="${k}" aria-label="${O().METRICS[k][0]} 우선순위">${Array.from({length:Object.keys(O().METRICS).length},(_,i)=>`<option value="${i+1}" ${(priorities[k]??1)===i+1?'selected':''}>${i+1}순위</option>`).join('')}</select>${O().METRICS[k][0]} <b>${excluded(k)?'평가 제외':O().METRICS[k][2]==='min'?'↓ 최소':'↑ 최대'}</b><button data-remove-goal="${k}" aria-label="${O().METRICS[k][0]} 목표 삭제">×</button></span>`).join('')||'<p class="tiny">목표를 하나 이상 추가하세요.</p>';document.querySelectorAll('[data-remove-goal]').forEach(b=>b.onclick=()=>{objectives=objectives.filter(k=>k!==b.dataset.removeGoal);delete priorities[b.dataset.removeGoal];renderObjectives();});document.querySelectorAll('[data-goal-priority]').forEach(el=>el.onchange=()=>{priorities[el.dataset.goalPriority]=Number(el.value);renderObjectives();});}
function addConstraint(metric='ads',op='max',value=''){const row=document.createElement('div');row.className='opt-constraint';row.innerHTML=`<select aria-label="조건 항목">${Object.entries(O().METRICS).map(([k,[n,u]])=>`<option value="${k}">${n} (${u})</option>`).join('')}</select><select aria-label="조건 방향"><option value="min">이상</option><option value="max">이하</option></select><input aria-label="조건 값" type="number" step="any" placeholder="값"><button aria-label="조건 삭제">×</button>`;row.children[0].value=metric;row.children[1].value=op;row.children[2].value=value;row.children[3].onclick=()=>row.remove();$('opt-constraints').append(row);}
let magazineWeapon=null;
function refreshMagazine(){const s=snapshot();if(magazineWeapon===s.pack.weaponId)return;magazineWeapon=s.pack.weaponId;const sizes=O().magazineOptions(s.pack,s.base,s.combat,s.summary);$('opt-magazine').innerHTML='<option value="any">제한 없음</option><option value="base">기본 탄창 용량</option>'+sizes.map(n=>'<option value="'+n+'">'+n+'발 · 정확히</option>').join('');}
function laserComparison(s,r){const pair=O().tacticalComparison(s.pack,s.base,r.chosen,r.tuning);if(!pair.present)return '';const handling=pair.rows.find(r=>r.key==='panel5');return '<details class="laser-state-pair"><summary>레이저 OFF / ON · 조작성 '+fmt(handling.off)+' / '+fmt(handling.on)+'점</summary><table><thead><tr><th>항목</th><th>OFF</th><th>ON</th></tr></thead><tbody>'+pair.rows.map(d=>'<tr><td>'+esc(d.label)+'</td><td>'+fmt(d.off)+' '+d.unit+'</td><td>'+fmt(d.on)+' '+d.unit+'</td></tr>').join('')+'</tbody></table></details>';}
function refresh(){if(!api)return;try{const s=snapshot();if(resultSnapshot&&resultSnapshot.pack.weaponId!==s.pack.weaponId){stop();results=[];lastAnswer=null;feedbackHistory=[];renderFeedbackHistory();$('opt-results').innerHTML='<p class="empty">무기가 바뀌었습니다.</p>';}$('opt-weapon').textContent=s.name(s.pack.weaponId);$('opt-locks').innerHTML=Object.entries(s.chosen).map(([slot,id])=>`<label><input type="checkbox" data-lock="${slot}" value="${id}">${esc(s.socketLabels[slot.split('/').at(-1)]||slot)} · ${esc(s.name(id))}</label>`).join('')||'<p class="tiny">현재 장착 파츠가 없습니다.</p>';renderBans();refreshMagazine();WarfareOpticPicker.refresh();renderSimpleTargets();}catch(e){status(e.message,true);}}
function renderBans(){$('opt-bans-count').textContent='제외 중: '+banned.size+'종';const s=snapshot(),q=$('opt-ban-search').value.toLowerCase(),parts=Object.entries(s.pack.display.objects).filter(([id,p])=>p.playerSelectable===true&&(!q||(s.name(id)+' '+id).toLowerCase().includes(q)));$('opt-bans').innerHTML=parts.map(([id])=>`<label><input type="checkbox" data-ban="${id}" ${banned.has(id)?'checked':''}>${esc(s.name(id))}</label>`).join('');document.querySelectorAll('[data-ban]').forEach(el=>el.onchange=()=>{el.checked?banned.add(el.dataset.ban):banned.delete(el.dataset.ban);localStorage.setItem('dflab-unavailable-parts',JSON.stringify([...banned]));$('opt-bans-count').textContent='제외 중: '+banned.size+'종';WarfareOpticPicker.refresh();});}
let recommendationMode='simple';
function renderSimpleTargets(){
 try{
  const s=snapshot(),options={laser:laserActive()};
  const base=O().metrics(s.pack,s.base,s.combat,s.summary,{}, {},options).metrics;
  const current=O().metrics(s.pack,s.base,s.combat,s.summary,s.chosen,s.tuning,options).metrics;
  const mode=$('opt-simple-strategy').value,excludedStats=[...simpleExcludedStats];
  const profile=O().combatProfile.forWeapon(s.pack);
  const settings=mode==='preserve'?O().completionOptions(current,{excludedStats}):O().combatOptions(base,{excludedStats},profile);
  O().protectSimpleBallistics(settings,base,current);
  const rows=settings.constraints.map(c=>{
   const [name,unit]=O().METRICS[c.metric];
   return `<li>${name} <b>${c.op==='max'?'≤':'≥'} ${fmt(c.value)} ${unit}</b></li>`;
  });
  $('opt-simple-targets').innerHTML='<ul class="opt-criteria">'+rows.join('')+'</ul>';
 }catch{}
}
function setRecommendationMode(mode){
 stop();recommendationMode=mode;feedbackHistory=[];renderFeedbackHistory();
 const simple=mode==='simple';
 $('opt-simple-intro').hidden=!simple;$('opt-expert-controls').hidden=simple;$('opt-tune').disabled=simple;
 $('opt-mode-simple').setAttribute('aria-pressed',String(simple));
 $('opt-mode-advanced').setAttribute('aria-pressed',String(!simple));
 $('opt-results').innerHTML='<p class="empty">추천 결과가 여기에 표시됩니다.</p>';
 results=[];status('');renderSimpleTargets();
}
function config(){if(recommendationMode==='simple')return{recommendationMode:'simple',completionMode:$('opt-simple-strategy').value,magazineCapacity:$('opt-magazine').value,excludedStats:[...simpleExcludedStats],banned:[...banned],optic:$('opt-optic').value,opticId:WarfareOpticPicker.selected(),tactical:$('opt-tactical').value,laser:laserActive(),suppressor:$('opt-suppressor').checked,maxEvaluations:Number($('opt-budget').value),distance:30,hp:100};const locked=Object.fromEntries([...document.querySelectorAll('[data-lock]:checked')].map(el=>[el.dataset.lock,el.value]));const constraints=[...document.querySelectorAll('.opt-constraint')].map(row=>{const value=row.children[2].value;if(value==='')throw Error('빈 조건 값을 입력하거나 해당 조건을 삭제하세요.');return{metric:row.children[0].value,op:row.children[1].value,value:Number(value)};});if(!objectives.length)throw Error('원하는 목표를 하나 이상 추가하세요.');if(objectives.every(excluded))throw Error('선택한 목표가 모두 평가에서 제외되었습니다. 배제를 해제하거나 다른 목표를 추가하세요.');return{preserveControl:$('opt-preserve-control').checked,evaluation:$('opt-evaluation').value,excludedStats:[...excludedStats],optic:$('opt-optic').value,opticId:WarfareOpticPicker.selected(),objectives:[...objectives],priorities:Object.fromEntries(objectives.map(k=>[k,priorities[k]??1])),constraints,locked,banned:[...banned],tune:$('opt-tune').checked,tactical:$('opt-tactical').value,laser:laserActive(),suppressor:$('opt-suppressor').checked,maxEvaluations:Number($('opt-budget').value),distance:Number($('opt-distance').value),hp:Number($('opt-hp').value)};}
function stop(){runSerial++;worker?.terminate();worker=null;$('opt-start').disabled=false;$('opt-cancel').disabled=true;$('opt-cancel').hidden=true;$('opt-progress').hidden=true;$('opt-results').querySelector('[data-opt-pending]')?.remove();}

let lastAnswer=null,feedbackHistory=[];
function renderFeedbackHistory(){const host=$('opt-feedback-history');if(!host)return;host.hidden=!feedbackHistory.length;host.innerHTML=feedbackHistory.length?'<button id="opt-feedback-back">← 이전 추천</button><span class="tiny"> 최근 '+feedbackHistory.length+'단계</span>':'';if(feedbackHistory.length)$('opt-feedback-back').onclick=()=>{stop();const old=feedbackHistory.pop();resultSnapshot=old.snapshot;lastAnswer=old.answer;results=old.answer.results;renderResults(old.answer);renderFeedbackHistory();status('이전 추천을 복원했습니다.');};}
function feedbackPanel(r,i,answer){
 if(answer.options.recommendationMode!=='simple'||!r.feasible)return '';
 const selected=answer.options.feedbackTargets||[];
 return `<details class="opt-disclosure opt-feedback" data-feedback-panel="${i}">
  <summary>피드백으로 다시 추천</summary>
  <div class="opt-feedback-choices">${Object.entries(O().FEEDBACK).map(([id,f])=>`<label><input type="checkbox" data-feedback-target="${id}" ${selected.includes(id)?'checked':''}>${f.label}</label>`).join('')}</div>
  <label class="opt-feedback-tradeoff"><input type="checkbox" data-feedback-tradeoff ${answer.options.feedbackTradeoff?'checked':''}> 다른 성능 최대 5% 손해 허용 (사거리·포구속도 보호)</label>
  <button data-feedback-run="${i}" ${selected.length?'':'disabled'}>다시 추천</button>
 </details>`;
}
function feedbackPartComparison(r,s){
 const changes=r.partChanges||[];
 if(!changes.length)return '';
 return `<details class="opt-disclosure"><summary>변경된 파츠 ${changes.length}개</summary><ul>${changes.map(c=>`<li>${esc(s.socketLabels[c.slot.split('/').at(-1)]||c.slot)} · ${esc(c.before?s.name(c.before):'미장착')} → ${esc(c.after?s.name(c.after):'미장착')}</li>`).join('')}</ul></details>`;
}
function feedbackComparison(r,answer){
 if(!r.feedback)return '';
 const keys=[...new Set([...answer.options.feedbackMetrics,...r.feedback.regressed])];
 return `<details class="opt-disclosure opt-feedback-comparison"><summary>피드백 전후 수치</summary><div class="auto-metrics">${keys.map(k=>`<span class="${r.feedback.regressed.includes(k)?'bad':''}">${O().METRICS[k][0]}<b>${fmt(answer.reference[k])} → ${fmt(r.metrics[k])} ${O().METRICS[k][1]}</b></span>`).join('')}</div></details>`;
}
function startFeedback(index){try{const r=results[index],s=resultSnapshot,previous=lastAnswer,panel=document.querySelector('[data-feedback-panel="'+index+'"]');if(!r?.feasible||!previous||!panel)throw Error('추천 결과를 먼저 선택하세요.');const targets=[...panel.querySelectorAll('[data-feedback-target]:checked')].map(el=>el.dataset.feedbackTarget);if(!targets.length)throw Error('아쉬운 점을 하나 이상 선택하세요.');const next={...s,chosen:{...r.chosen},tuning:{...r.tuning},laser:previous.options.laser},options={...previous.options,recommendationMode:'simple',completionMode:'feedback',feedbackTargets:targets,feedbackTradeoff:panel.querySelector('[data-feedback-tradeoff]').checked,banned:[...banned],optic:$('opt-optic').value,opticId:WarfareOpticPicker.selected(),tactical:$('opt-tactical').value,laser:laserActive(),maxEvaluations:Number($('opt-budget').value)};feedbackHistory.push({snapshot:s,answer:previous});if(feedbackHistory.length>5)feedbackHistory.shift();start({snapshot:next,options});}catch(e){status(e.message,true);}}

function start(request=null){
 try{
  request=request?.snapshot&&request?.options?request:null;stop();
  if(!request)feedbackHistory=[];
  renderFeedbackHistory();
  const s=request?.snapshot||snapshot(),options=request?.options||config(),serial=runSerial;
  resultSnapshot=s;results=[];$('opt-results').innerHTML='<p class="empty" data-opt-pending>탐색 중…</p>';
  $('opt-start').disabled=true;$('opt-cancel').disabled=false;$('opt-cancel').hidden=false;
  $('opt-progress').hidden=false;$('opt-progress').value=0;status('탐색 중…');
  worker=new Worker('warfare-optimize-worker.js?v=thompson-smg-laser-20261110-r25');
  worker.onmessage=event=>{
   if(serial!==runSerial)return;
   const msg=event.data;
   if(msg.type==='progress'){
    $('opt-progress').value=msg.evaluations/msg.budget*100;
    status(`${msg.evaluations.toLocaleString()}회 계산`);
   }else if(msg.type==='done'){
    lastAnswer=msg.answer;results=msg.answer.results;renderResults(msg.answer);stop();
    status('');
   }else if(msg.type==='error'){stop();status(msg.message,true);}
  };
  worker.onerror=()=>{stop();status('탐색을 실행할 수 없습니다.',true);};
  worker.postMessage({pack:s.pack,base:s.base,combat:s.combat,summary:s.summary,currentChosen:s.chosen,currentTuning:s.tuning,options});
 }catch(e){stop();status(e.message,true);}
}
function balanceComparison(answer,r,s){
 if(!r.combatRisk)return '';
 const profile=O().combatProfile.forWeapon(s.pack);
 const rows=Object.keys(r.combatRisk.shortfalls).map(k=>{
  const [label,unit]=k==='cameraStability'?['사격 카메라 흔들림 평균','×']:O().METRICS[k];
  return '<tr><td>'+esc(label)+'</td><td>'+fmt(answer.baseline[k]*profile.targets[k])+' '+unit+'</td><td>'+fmt(r.metrics[k])+' '+unit+'</td></tr>';
 });
 return '<details class="laser-state-pair"><summary>'+profile.name+' 기준과 세부 수치 비교</summary><table><thead><tr><th>항목</th><th>균형 목표</th><th>후보</th></tr></thead><tbody>'+rows.join('')+'</tbody></table></details>';
}
const compactStats=[
 ['recoil','평균 반동'],['springKick','발사 흔들림'],['ads','조준 시간'],['adsMove','조준 이동'],
 ['stability','안정성'],['cameraStability','카메라 흔들림'],['range','사거리'],['velocity','포구속도']
];
function resultCard(r,i,answer,s){
 const Ometrics=O().METRICS;
 const title=r.feasible?(r.feedback?(r.feedback.improved?'피드백 개선':r.partChangeCount?'대안':'기존 후보 유지'):
  r.completion?(r.completion.strictImprovement?'성능 개선':'현재 성능 유지'):'조건 충족'):'조건 미충족';
 const badges=`<span class="opt-result-tag ${r.feasible?'good':'bad'}">${title}</span>`;
 const main=compactStats.map(([key,label])=>`<div><dt>${label}</dt><dd>${fmt(r.metrics[key])} <small>${Ometrics[key]?.[1]||'×'}</small></dd></div>`).join('');
 const checks=r.checks.map(c=>({met:c.met,text:`${Ometrics[c.metric][0]} ${c.op==='min'?'≥':'≤'} ${fmt(c.value)} · 결과 ${fmt(c.actual)}`}));
 if(!r.optic?.met)checks.push({met:false,text:'조준경 조건 미충족'});
 if(r.tactical&&!r.tactical.met)checks.push({met:false,text:answer.tacticalSupported===false?'호환 전술장비 없음':'전술장비 조건 미충족'});
 if(answer.options.suppressor){
  const mounted=WarfareEngine.assembly(s.pack,r.chosen).mounted;
  const met=Object.values(mounted).some(id=>(s.pack.effectsByItemId[id]?.mp||[]).some(e=>e.target==='ShotDistance'&&e.modifier==='Mult_C'&&e.value<1));
  checks.push({met,text:met?'총성 감소 충족':'총성 감소 파츠 필요'});
 }
 const failed=checks.filter(c=>!c.met);
 const losses=(r.feedback?.regressed||r.currentComparison?.regressed||[]).map(k=>Ometrics[k][0]);
 const opticRoutes=(r.optic?.items||[]).map(m=>m.path.split('/').map((_,j,path)=>r.chosen[path.slice(0,j+1).join('/')]).filter(Boolean).map(id=>esc(s.name(id))).join(' → '));
 const gear=(r.tactical?.items||[]).map(m=>esc(s.name(m.id)));
 const details=[...new Set([...(answer.objectiveTiers||[]).flatMap(t=>Object.keys(t.weights)),
  ...Object.keys(O().STAT_GROUPS),'autoVertical','autoHorizontal','patternClimb','patternWidth','patternStep',
  'patternHorizontalStep','patternJerk','cameraHorizontal','cameraVertical','moveSway','breath','holdBreath','breathRecoil',
  'sprintToFire','walk','sprint','hipSpread','capacity','ttk'])]
  .filter(k=>Ometrics[k]&&Number.isFinite(r.metrics[k])&&!compactStats.some(([key])=>key===k));
 const detailMetrics=details.map(k=>`<span>${Ometrics[k][0]}<b>${fmt(r.metrics[k])} ${Ometrics[k][1]}</b>${answer.options.excludedStats?.includes(k)?'<small class="opt-baseline">평가 제외</small>':''}</span>`).join('');
 const parts=Object.entries(r.chosen).map(([slot,id])=>`<li>${esc(s.socketLabels[slot.split('/').at(-1)]||slot)} · ${esc(s.name(id))}<small class="opt-part-benefits">${esc(partBenefits(s,id,answer.options.excludedStats))}</small></li>`).join('');
 const tuning=Object.entries(r.tuning).map(([tid,value])=>`<li>${esc(WarfareKO.text(s.pack.tunes[tid]?.labels?.mainLocId?.replace('authoring:','')||tid))} · ${fmt(value)}</li>`).join('');
 return `<article class="opt-result ${i===0?'opt-result-first':''}">
  <div class="opt-result-heading"><h3>${i+1}. ${esc(s.name(s.pack.weaponId))}</h3>${badges}</div>
  <dl class="opt-card-stats">${main}</dl>
  ${opticRoutes.length?`<p class="opt-card-route">${opticRoutes.join(' · ')}</p>`:''}
  ${gear.length?`<p class="opt-card-route">${gear.join(' · ')}</p>`:''}
  ${failed.length?`<ul class="opt-card-warning">${failed.map(c=>`<li>${esc(c.text)}</li>`).join('')}</ul>`:!r.feasible?'<p class="opt-card-warning">필수 조건 미충족</p>':''}
  ${losses.length?`<details class="opt-disclosure opt-losses"><summary>${r.feedback?'피드백 전보다 악화':'현재 모딩 대비 악화'} ${losses.length}개</summary><p>${esc(losses.join(' · '))}</p></details>`:''}
  <div class="build-tools opt-result-actions"><button class="${r.feasible?'primary':''}" data-opt-apply="${i}">${r.feasible?'적용':'미충족 후보 적용'}</button><button data-opt-share="${i}">저장·공유</button></div>
  ${feedbackPanel(r,i,answer)}${feedbackComparison(r,answer)}${feedbackPartComparison(r,s)}
  <details class="opt-disclosure"><summary>상세 수치</summary><div class="auto-metrics">${detailMetrics}</div></details>
  <details class="opt-disclosure"><summary>파츠 ${Object.keys(r.chosen).length}개 · 보정 ${Object.keys(r.tuning).length}개</summary><ul>${parts}</ul>${tuning?`<h4>정밀 보정</h4><ul>${tuning}</ul>`:''}</details>
  ${checks.length?`<details class="opt-disclosure"><summary>조건 확인</summary><ul class="opt-criteria">${checks.map(c=>`<li class="${c.met?'good':'bad'}">${c.met?'✓':'✕'} ${esc(c.text)}</li>`).join('')}</ul></details>`:''}
  ${balanceComparison(answer,r,s)}${laserComparison(s,r)}
 </article>`;
}
function renderResults(answer){
 const s=resultSnapshot;
 $('opt-results').innerHTML=results.map((r,i)=>resultCard(r,i,answer,s)).join('')||'<p class="empty">조건에 맞는 후보를 찾지 못했습니다.</p>';
 document.querySelectorAll('[data-feedback-run]').forEach(button=>button.onclick=()=>startFeedback(Number(button.dataset.feedbackRun)));document.querySelectorAll('[data-feedback-panel]').forEach(panel=>panel.querySelectorAll('[data-feedback-target]').forEach(el=>el.onchange=()=>{panel.querySelector('[data-feedback-run]').disabled=!panel.querySelector('[data-feedback-target]:checked');}));
 document.querySelectorAll('[data-opt-apply]').forEach(button=>button.onclick=async()=>{try{const r=results[Number(button.dataset.optApply)];await api.apply(build({...s,chosen:r.chosen,tuning:r.tuning,laser:answer.options.laser}));api.view('builder');if(!r.feasible)api.message('조건 미충족 후보를 적용했습니다. 미충족 수치는 그대로 반영됩니다.');}catch(e){status(e.message,true);}});
 document.querySelectorAll('[data-opt-share]').forEach(button=>button.onclick=()=>{const r=results[Number(button.dataset.optShare)];openShare({...s,chosen:r.chosen,tuning:r.tuning,laser:answer.options.laser});});}
function checklist(s){return[`${s.name(s.pack.weaponId)} · 전면전`,...Object.entries(s.chosen).map(([slot,id])=>`${s.socketLabels[slot]||slot}: ${s.name(id)} [${id}]`),'','정밀 보정:',...Object.entries(s.tuning).map(([tid,value])=>{const t=s.pack.tunes[tid];return`${WarfareKO.text(t?.labels?.mainLocId?.replace('authoring:','')||tid)}: ${value} (${tid})`;}),`전술 효과 계산 조건: ${s.laser?'활성':'비활성'}`,`데이터: ${s.version}`,'게임용 공유 코드는 게임의 장비 공유에서 발급하세요.'].join('\n');}
async function copy(text){try{await navigator.clipboard.writeText(text);$('share-status').textContent='복사했습니다.';}catch{$('share-status').textContent='자동 복사가 제한되어 있습니다. 텍스트를 선택해 복사하세요.';}}
function registry(){try{return JSON.parse(localStorage.getItem('dflab-game-code-registry')||'{}');}catch{return{};}}
function gameKey(){return S().fingerprint(build(shareSnapshot),$('game-platform').value);}
function gameStatus(){const saved=registry()[gameKey()];$('game-code').value=saved?.code||'';$('game-confirm').checked=false;$('game-copy').disabled=!saved?.userConfirmed;$('game-code-status').textContent=saved?'현재 세팅에 연결된 사용자 확인 코드입니다. 게임 서버 유효성은 별도입니다.':'이 세팅·플랫폼·데이터 버전에 등록된 게임 코드가 없습니다.';}
function openShare(s=snapshot()){shareSnapshot={...s,chosen:{...s.chosen},tuning:{...s.tuning}};$('share-build-name').textContent=s.name(s.pack.weaponId)+' · 전면전';$('lab-code').value=S().encode(build(s));$('lab-import').value='';$('share-checklist').textContent=checklist(s);$('share-status').textContent='';gameStatus();$('share-dialog').showModal();}
function mount(context){api=context;WarfareOpticPicker.mount({snapshot,banned:()=>[...banned],changed:text=>{stop();status(text);}});$('opt-magazine').onchange=()=>{stop();status('탄창 조건이 변경됐습니다.');};const updateTacticalControls=()=>{$('opt-laser').disabled=['none','light'].includes($('opt-tactical').value);};
updateTacticalControls();$('opt-tactical').onchange=()=>{stop();updateTacticalControls();renderSimpleTargets();status('전술장비 조건이 변경됐습니다.');};$('opt-laser').onchange=()=>{stop();renderSimpleTargets();status('레이저 조건이 변경됐습니다.');};const feedbackHost=document.createElement('div');feedbackHost.id='opt-feedback-history';feedbackHost.hidden=true;$('opt-results').before(feedbackHost);$('opt-simple-strategy').onchange=()=>{stop();renderSimpleTargets();status('완성 기준이 변경됐습니다.');};$('opt-mode-simple').onclick=()=>setRecommendationMode('simple');$('opt-mode-advanced').onclick=()=>setRecommendationMode('advanced');setRecommendationMode('simple');$('opt-add').onclick=()=>addConstraint();$('opt-add-goal').onclick=()=>{const k=$('opt-goal').value;if(k&&!objectives.includes(k)){priorities[k]=Math.min(Object.keys(O().METRICS).length,Math.max(0,...objectives.map(id=>priorities[id]??1))+1);objectives.push(k);}renderObjectives();};renderExclusions();renderSimpleExclusions();renderObjectives();$('opt-ban-search').oninput=()=>{try{renderBans();}catch{}};$('opt-start').onclick=start;$('opt-cancel').onclick=()=>{stop();$('opt-results').innerHTML='<p class="empty">탐색이 취소됐습니다.</p>';status('');};$('opt-preset-balanced').onclick=()=>{objectives=['recoil','handling','stability'];priorities={recoil:1,handling:1,stability:1};$('opt-evaluation').value='practical';renderObjectives();};$('opt-preset-control').onclick=()=>{objectives=['recoil','springKick','handling','stability'];priorities={recoil:1,springKick:1,handling:2,stability:2};$('opt-evaluation').value='practical';renderObjectives();};$('opt-open-share').onclick=()=>{try{openShare();}catch(e){status(e.message,true);}};$('share-current').onclick=()=>{try{openShare();}catch(e){api.message(e.message,true);}};$('auto-current').onclick=()=>{api.view('optimizer');refresh();};$('share-close').onclick=()=>$('share-dialog').close();$('lab-copy').onclick=()=>copy($('lab-code').value);$('checklist-copy').onclick=()=>copy($('share-checklist').textContent);$('lab-restore').onclick=async()=>{try{const b=S().decode($('lab-import').value.trim());await api.apply(b);$('share-dialog').close();api.view('builder');}catch(e){$('share-status').textContent=e.message;}};$('game-platform').onchange=gameStatus;$('game-register').onclick=()=>{try{const code=$('game-code').value.trim();if(!$('game-confirm').checked)throw Error('게임에서 현재 조합과 일치하는 코드인지 확인한 후 체크하세요.');if(code.length<8||code.length>240||code.startsWith('DFLAB1.')||/[\u0000-\u001f]/.test(code))throw Error('게임에서 복사한 무기명·모드·코드 전체를 입력하세요.');const all=registry();all[gameKey()]={code,userConfirmed:true,platform:$('game-platform').value,savedAt:new Date().toISOString()};localStorage.setItem('dflab-game-code-registry',JSON.stringify(all));gameStatus();$('share-status').textContent='현재 조합에 게임 코드를 연결했습니다.';}catch(e){$('share-status').textContent=e.message;}};$('game-copy').onclick=()=>{const entry=registry()[gameKey()];if(entry?.userConfirmed)copy(entry.code);};}
root.WarfareAutomation={mount,refresh,stop};
})(window);
