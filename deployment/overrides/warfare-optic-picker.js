(function(root){'use strict';
let api=null,weapon=null,selection='',choices=[],cacheKey='',cachedRoutes=[];
const $=id=>document.getElementById(id);
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
function snapshot(){try{return api.snapshot();}catch{return null;}}
function selected(){return $('opt-optic')?.value==='none'?'':selection;}
function change(message){api.changed(message||'조준경 선택을 변경했습니다. 다시 추천하세요.');}
function render(){
 const host=$('optic-choice-list'),s=snapshot();if(!s?.pack)return;
 const restoreFocus=host.contains(document.activeElement)&&document.activeElement.type==='radio';
 host.replaceChildren();
 const query=$('optic-choice-search').value.trim().toLowerCase();
 const automatic=make('label','optic-choice-card optic-choice-auto'+(!selection?' selected':''));
 const autoInput=make('input');autoInput.type='radio';autoInput.name='exact-optic';autoInput.value='';autoInput.checked=!selection;
 autoInput.onchange=()=>{selection='';render();change();};
 automatic.append(autoInput,make('span','optic-auto-symbol','↻'),make('strong','','자동 선택'),make('small','','조건에 맞는 조준경 탐색'));host.append(automatic);
 const visible=choices.filter(choice=>(s.name(choice.id)+' '+choice.id+' '+(root.WarfareKO?.search(choice.id)||'')+' '+choice.magnifications.map(v=>v+'× '+v+'x '+v+'배').join(' ')).toLowerCase().includes(query));
 visible.forEach(choice=>{
  const card=make('label','optic-choice-card'+(selection===choice.id?' selected':''));
  const radio=make('input');radio.type='radio';radio.name='exact-optic';radio.value=choice.id;radio.checked=selection===choice.id;radio.setAttribute('aria-label',s.name(choice.id));
  radio.onchange=()=>{selection=choice.id;render();change(s.name(choice.id)+' 조준경을 고정했습니다. 다시 추천하세요.');};
  const photo=make('span','optic-choice-photo');
  if(choice.image){const img=make('img');img.src=choice.image;img.alt=s.name(choice.id);img.loading='lazy';img.onerror=()=>{photo.replaceChildren(make('span','optic-photo-unavailable','사진 없음'));};photo.append(img);}else photo.append(make('span','optic-photo-unavailable','사진 없음'));
  const zoom=choice.magnifications.length?choice.magnifications.map(v=>Number(v.toFixed(2))+'×').join(' / '):'배율 정보 없음';
  card.append(radio,photo,make('strong','',s.name(choice.id)),make('small','',zoom+(Object.keys(choice.chosen).length>1?' · 장착대 포함':'')));
  host.append(card);
 });
 $('optic-choice-count').textContent=visible.length+'종';
 const choice=choices.find(c=>c.id===selection);
 $('optic-choice-selected').textContent=choice?'고정할 조준경: '+s.name(choice.id):'자동 선택 · 원하는 조준경을 누르면 해당 제품과 필요한 장착대를 고정합니다.';
 $('optic-choice-empty').hidden=visible.length>0;
 if(restoreFocus)host.querySelector('input:checked')?.focus({preventScroll:true});
}
function refresh(){
 if(!api)return;const s=snapshot();if(!s?.pack)return;
 const mode=$('opt-optic').value;
 $('optic-choice-panel').hidden=mode==='none';
 if(weapon!==s.pack.weaponId){weapon=s.pack.weaponId;selection='';$('optic-choice-search').value='';cacheKey='';}
 if(mode==='none')return;
 const banned=api.banned();
 const key=JSON.stringify([weapon,mode,[...banned].sort()]);
 if(cacheKey!==key){cachedRoutes=root.WarfareOptimize.opticChoices(s.pack,{optic:mode,banned});cacheKey=key;}
 choices=cachedRoutes;
 if(selection&&!choices.some(c=>c.id===selection)){selection='';change('선택한 조준경을 현재 조건에서 사용할 수 없어 자동 선택으로 변경했습니다.');}
 render();
}
function mount(context){
 api=context;
 const panel=make('fieldset','optic-choice-panel');panel.id='optic-choice-panel';panel.hidden=true;
 panel.innerHTML='<legend>사진으로 조준경 선택 <span id="optic-choice-count"></span></legend><p id="optic-choice-selected" class="tiny" role="status"></p><label class="optic-search-label">조준경 검색<input id="optic-choice-search" type="search" placeholder="이름 / 배율로 검색"></label><div id="optic-choice-list" class="optic-choice-list"></div><p id="optic-choice-empty" class="tiny" hidden>조건에 맞는 조준경이 없습니다.</p>';
 $('opt-optic').closest('.auto-fields').after(panel);
 $('optic-choice-search').oninput=render;
 $('opt-optic').addEventListener('change',()=>{refresh();change('조준경 조건을 변경했습니다. 사진에서 원하는 조준경을 선택할 수 있습니다.');});
}
root.WarfareOpticPicker={mount,refresh,selected};
})(window);
