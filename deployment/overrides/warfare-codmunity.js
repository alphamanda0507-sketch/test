(function(root){'use strict';
let api=null,activeBuild=null,busy=false;
const $=id=>document.getElementById(id);
const canonical=obj=>JSON.stringify(Object.entries(obj||{}).sort(([a],[b])=>a.localeCompare(b)));
function sameParts(snapshot,build){return !!snapshot?.pack&&snapshot.pack.weaponId===build.weaponId&&canonical(snapshot.chosen)===canonical(build.chosen)&&!Object.keys(snapshot.tuning||{}).length;}
function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
const styles={'Long Range':'장거리','Close Range':'근거리','Sniper':'저격','Secondary':'보조 무기','Sniper Support':'저격 지원'};
function current(){try{return api?.snapshot();}catch{return null;}}
function note(text,error=false){$('cm-status').textContent=text;$('cm-status').classList.toggle('cm-warning',error);}
async function copy(code){try{await navigator.clipboard.writeText(code);note('CODMunity 원본 게임 공유 코드를 복사했습니다.');}catch{const input=$('cm-code');input.value=code;input.focus();input.select();let copied=false;try{copied=document.execCommand('copy');}catch{}note(copied?'CODMunity 원본 게임 공유 코드를 복사했습니다.':'선택된 코드를 Ctrl+C로 복사하세요.');}}
async function apply(build){
 if(busy)return;
 busy=true;refresh();note('추천 모딩을 장착하는 중…');
 try{
  await api.apply({version:1,weapon:build.weaponId,mode:'mp',sourceVersion:build.sourceVersion,chosen:{...build.chosen},tuning:{},laser:false});
  if(!sameParts(current(),build))throw Error('일부 부품을 장착하지 못했습니다. 원본 구성과 현재 부품을 확인하세요.');
  activeBuild=build;api.view('builder');note(build.weaponKo+' 추천 모딩 '+build.attachments.length+'개 부품을 장착했습니다. 정밀 보정은 기본값입니다.');
 }catch(error){note(error.message,true);}finally{busy=false;refresh();}
}
function refresh(){
 if(!api||!$('cm-builds'))return;
 const snapshot=current();if(!snapshot?.pack)return;
 const data=root.CodmunityLoadoutData;
 const builds=(data?.builds||[]).filter(build=>build.weaponId===snapshot.pack.weaponId);
 $('cm-weapon').textContent=snapshot.name(snapshot.pack.weaponId)+' · 전면전';
 $('cm-count').textContent=builds.length+'개 추천';
 const host=$('cm-builds');host.replaceChildren();
 builds.forEach(build=>{
  const selected=!!activeBuild&&activeBuild.id===build.id&&sameParts(snapshot,build);
  const card=node('article','cm-card'+(selected?' cm-selected':''));
  const heading=node('div','panel-title');
  heading.append(node('h3','',styles[build.playstyle]||build.playstyle||'추천 구성'),node('small','',build.attachments.length+'개 부품'));
  const controls=node('div','build-tools');
  const button=node('button',selected?'active':'primary',selected?'✓ 장착됨':'이 모딩 장착');button.type='button';button.disabled=busy||!build.compatible;button.dataset.cmApply=build.id;button.setAttribute('aria-pressed',String(selected));button.onclick=()=>apply(build);controls.append(button);
  const details=node('details');details.append(node('summary','','추천 부품 목록'));
  const list=node('ul','cm-parts');build.attachments.forEach(part=>{const li=node('li','',part.nameKo);li.title=part.name;list.append(li);});details.append(list);
  const origin=node('a','','CODMunity 원본 ↗');origin.href=build.source;origin.target='_blank';origin.rel='noopener';origin.className='cm-origin';
  card.append(heading,controls,details,origin);host.append(card);
 });
 if(!builds.length)host.append(node('p','tiny','이 무기에 수집된 CODMunity 추천 모딩이 없습니다. 간편 추천 기능을 이용할 수 있습니다.'));
 const visible=!!activeBuild&&activeBuild.weaponId===snapshot.pack.weaponId;
 $('cm-code-box').hidden=!visible;
 if(visible){
  const match=sameParts(snapshot,activeBuild);
  $('cm-code').value=activeBuild.code;
  $('cm-copy').disabled=busy;
  $('cm-copy').onclick=()=>copy(activeBuild.code);
  $('cm-match').textContent=match?'추천 부품 구성 적용됨 · 원본 코드':'현재 부품·보정이 변경되었습니다. 아래 코드는 선택했던 원본 추천 구성입니다.';
  $('cm-match').classList.toggle('cm-warning',!match);
 }
}
function mount(context){
 api=context;
 const section=node('section','panel cm-panel');section.id='codmunity-panel';section.setAttribute('aria-label','CODMunity 추천 모딩');
 section.innerHTML='<div class="panel-title"><h2>해외 추천 모딩</h2><span id="cm-count"></span></div><p id="cm-weapon" class="tiny"></p><div id="cm-builds" class="cm-builds"></div><div id="cm-code-box" hidden><div class="panel-title"><h3>게임 공유 코드 · CODMunity 원본</h3><button id="cm-copy" type="button">원본 코드 복사</button></div><label class="cm-label" for="cm-code">선택한 추천 모딩의 게임 공유 코드</label><textarea id="cm-code" rows="2" readonly></textarea><p id="cm-match" class="tiny"></p></div><p id="cm-status" role="status" aria-live="polite"></p><details class="cm-info"><summary>추천 데이터 안내</summary><p class="tiny">공개된 부품 목록을 계산기에 적용합니다. 정밀 보정값은 원본 페이지에 없어 기본값으로 적용하며, 원본 게임 코드에는 다른 보정값이 포함되어 있을 수 있습니다. 코드 원문을 유지하며 게임 내 유효성이나 중국 서버 호환을 확인한 것은 아닙니다.</p><p id="cm-date" class="tiny"></p></details>';
 document.querySelector('.weapon-stage').after(section);
 const date=root.CodmunityLoadoutData?.fetchedAt;
 $('cm-date').textContent=date?'출처 CODMunity · 수집 '+new Date(date).toLocaleDateString('ko-KR'):'추천 데이터를 불러오지 못했습니다.';
 refresh();
}
const exported={mount,refresh,sameParts};root.WarfareCodmunity=exported;if(typeof module!=='undefined')module.exports=exported;
})(typeof window!=='undefined'?window:globalThis);
