(function(root){'use strict';
// Ratios from the user's preferred AKM example; soft goals, not game physics.
const targets={autoVertical:.61,autoHorizontal:.61,springKick:.84,patternClimb:.75,patternWidth:.75,patternStep:.75,patternHorizontalStep:.75,patternJerk:.75,cameraHorizontal:.12,cameraVertical:.12,moveSway:.22,breath:.35,holdBreath:2.368,ads:.8135,sprintToFire:.517,adsMove:1.1};
const families={recoil:['autoVertical','autoHorizontal','patternClimb','patternWidth','patternStep','patternHorizontalStep','patternJerk'],kick:['springKick'],stability:['cameraHorizontal','cameraVertical','moveSway','breath','holdBreath'],handling:['ads','sprintToFire','adsMove']};
const weights={recoil:.2,kick:.2,stability:.4,handling:.2};
const groups={recoil:'control',kick:'control',stability:'stability',handling:'handling'},higher=new Set(['holdBreath','adsMove']);
function score(values,base,ignored=[],custom=weights){const terms={},shortfalls={},ratios={};for(const [family,keys]of Object.entries(families)){if(ignored.includes(groups[family]))continue;const deficits=[];for(const k of keys){if(!Number.isFinite(base[k])||base[k]<=1e-9)continue;const ratio=values[k]/base[k];ratios[k]=ratio;const deficit=!Number.isFinite(ratio)?1e3:Math.max(0,higher.has(k)?targets[k]/Math.max(.00001,ratio)-1:ratio/targets[k]-1);shortfalls[k]=deficit;deficits.push(deficit);}if(deficits.length)terms[family]=.65*Math.max(...deficits)+.35*deficits.reduce((a,b)=>a+b,0)/deficits.length;}
const total=Object.keys(terms).reduce((n,k)=>n+(custom[k]??0),0);return{loss:total?Object.entries(terms).reduce((n,[k,v])=>n+v*(custom[k]??0),0)/total:0,terms,shortfalls,ratios};}
const api={targets,families,weights,score};root.WarfareBalanceProfile=api;if(typeof module!=='undefined')module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
