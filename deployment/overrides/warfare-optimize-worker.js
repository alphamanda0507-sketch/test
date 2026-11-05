importScripts('warfare-recoil.js?v=ballistics-20261106-r8','warfare-engine.js?v=ballistics-20261106-r8','warfare-optimize.js?v=ballistics-20261106-r8');
self.onmessage=async event=>{try{const answer=await WarfareOptimize.run(event.data,p=>self.postMessage({type:'progress',...p}));self.postMessage({type:'done',answer});}catch(error){self.postMessage({type:'error',message:error.message});}};
