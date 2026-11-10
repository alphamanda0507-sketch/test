(function(root){'use strict';
// In-game AKM reference. Use only values with a numeric baseline in the reference.
const targets={
 autoVertical:.76,autoHorizontal:.76,springKick:.64,
 cameraStability:.23,moveSway:.58,breath:.23/.4,holdBreath:38.8/20,breathRecoil:.82/.95,
 ads:242/327,sprintToFire:108/209,adsMove:3.04/2.254208
};
const families={
 recoil:['autoVertical','autoHorizontal'],
 kick:['springKick'],
 stability:['cameraStability','moveSway','breath','holdBreath','breathRecoil'],
 handling:['ads','sprintToFire','adsMove']
};
const weights={recoil:.2,kick:.2,stability:.4,handling:.2};
const akm={name:'인게임 AKM',targets,families,weights,panelGoals:[['control',16,55],['handling',12,66],['stability',11,66]]};
const thompson={
 name:'인게임 톰슨 (SMG)',
 targets:{autoVertical:.57,autoHorizontal:.57,springKick:.87,cameraStability:.25,moveSway:.62/1.035,
  breath:.25/.44,holdBreath:36.82/20,breathRecoil:.83/.95,ads:233/244,sprintToFire:115/109,
  adsMove:3.3/3.02252,velocity:638/450},
 families:{...families,ballistics:['velocity']},
 weights:{recoil:.2,kick:.1,stability:.2,handling:.25,ballistics:.25},
 panelGoals:[['control',20,60],['handling',4,71],['stability',10,58]]
};
const groups={recoil:'control',kick:'control',stability:'stability',handling:'handling'};
const higher=new Set(['holdBreath','adsMove','velocity']);

function forWeapon(pack){
 return pack.display.objects[pack.weaponId]?.categoryId==='submachineGun'?thompson:akm;
}

function score(values,base,ignored=[],custom,profile=akm){
 const terms={},shortfalls={},ratios={},activeWeights=custom??profile.weights;
 for(const [family,keys] of Object.entries(profile.families)){
  if(ignored.includes(groups[family]))continue;
  const deficits=[];
  for(const key of keys){
   if(!Number.isFinite(base[key])||base[key]<=1e-9)continue;
   const ratio=values[key]/base[key],target=profile.targets[key];
   ratios[key]=ratio;
   const deficit=!Number.isFinite(ratio)?1e3:Math.max(0,higher.has(key)?target/Math.max(.00001,ratio)-1:ratio/target-1);
   shortfalls[key]=deficit;deficits.push(deficit);
  }
  if(deficits.length)terms[family]=.65*Math.max(...deficits)+.35*deficits.reduce((a,b)=>a+b,0)/deficits.length;
 }
 const total=Object.keys(terms).reduce((n,k)=>n+(activeWeights[k]??0),0);
 const loss=total?Object.entries(terms).reduce((n,[k,v])=>n+v*(activeWeights[k]??0),0)/total:0;
 return {loss,terms,shortfalls,ratios};
}
const api={...akm,forWeapon,score};root.WarfareBalanceProfile=api;if(typeof module!=='undefined')module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
