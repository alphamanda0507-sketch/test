importScripts('warfare-recoil.js?v=combat-20261106-r9','warfare-engine.js?v=combat-20261106-r9','warfare-optimize.js?v=combat-20261106-r9');
self.onmessage=async event=>{try{const answer=await WarfareOptimize.run(event.data,p=>self.postMessage({type:'progress',...p}));self.postMessage({type:'done',answer});}catch(error){self.postMessage({type:'error',message:error.message});}};
