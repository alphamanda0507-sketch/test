importScripts('warfare-recoil.js?v=stability-20261106-r10','warfare-engine.js?v=stability-20261106-r10','warfare-optimize.js?v=stability-20261106-r10');
self.onmessage=async event=>{try{const answer=await WarfareOptimize.run(event.data,p=>self.postMessage({type:'progress',...p}));self.postMessage({type:'done',answer});}catch(error){self.postMessage({type:'error',message:error.message});}};
