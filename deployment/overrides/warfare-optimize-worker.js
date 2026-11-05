importScripts('warfare-recoil.js?v=feedback-20261106-r7','warfare-engine.js?v=feedback-20261106-r7','warfare-optimize.js?v=feedback-20261106-r7');
self.onmessage=async event=>{try{const answer=await WarfareOptimize.run(event.data,p=>self.postMessage({type:'progress',...p}));self.postMessage({type:'done',answer});}catch(error){self.postMessage({type:'error',message:error.message});}};
