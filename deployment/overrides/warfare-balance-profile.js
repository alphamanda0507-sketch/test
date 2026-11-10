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
const groups={recoil:'control',kick:'control',stability:'stability',handling:'handling'},higher=new Set(['holdBreath','adsMove']);
function score(values,base,ignored=[],custom=weights){const terms={},shortfalls={},ratios={};for(const [family,keys]of Object.entries(families)){if(ignored.includes(groups[family]))continue;const deficits=[];for(const k of keys){if(!Number.isFinite(base[k])||base[k]<=1e-9)continue;const ratio=values[k]/base[k];ratios[k]=ratio;const deficit=!Number.isFinite(ratio)?1e3:Math.max(0,higher.has(k)?targets[k]/Math.max(.00001,ratio)-1:ratio/targets[k]-1);shortfalls[k]=deficit;deficits.push(deficit);}if(deficits.length)terms[family]=.65*Math.max(...deficits)+.35*deficits.reduce((a,b)=>a+b,0)/deficits.length;}
const total=Object.keys(terms).reduce((n,k)=>n+(custom[k]??0),0);return{loss:total?Object.entries(terms).reduce((n,[k,v])=>n+v*(custom[k]??0),0)/total:0,terms,shortfalls,ratios};}
const api={targets,families,weights,score};root.WarfareBalanceProfile=api;if(typeof module!=='undefined')module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
