    (()=>{
      const routes = {
        'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.0/dist/ort-wasm-simd-threaded.jsep.wasm':{
          url: './ort-wasm-simd-threaded.jsep.gz',
          headers : {
            'content-type':'application/wasm'
          }
        },
        'https://huggingface.co/Xenova/LaMini-T5-61M/resolve/main/config.json':'./llamini-config.json',
        'https://huggingface.co/Xenova/LaMini-T5-61M/resolve/main/tokenizer.json':'./llamini-tokenizer.json',
        'https://huggingface.co/Xenova/LaMini-T5-61M/resolve/main/tokenizer_config.json':'./llamini-tokenizer-config.json'
      };
      const _fetch = globalThis.fetch;
      globalThis.fetch = Object.setPrototypeOf(async function fetch(...args){
        try{
          const url = String(args[0].url ?? args[0]);
          if(routes[url]){
            const routesURL = routes[url].url ?? routes[url];
            const res = await _fetch(routesURL);
            if(routes[url].headers){
              const value = new Headers(res.headers.entries());
              for(header in routes[url].headers){
                value.set(key,routes[url].headers[key]);
              }
              Object.defineProptery(res,'headers',{value});
            }
            if(routesURL.endsWith('.gz')){
                const ds = new DecompressionStream("gzip");
                return new Response(res.body.pipeThrough(new DecompressionStream("gzip")),res);
            }
            return res;
          }
          return await _fetch.apply(this,args);
        }catch(e){
          const statusText = String(e);
          return new Response(statusText,{staus:500,statusText});
        }
      },_fetch);
    })();
