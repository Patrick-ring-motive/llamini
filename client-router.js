    (() => {
        const routes = {
            'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.0/dist/ort-wasm-simd-threaded.jsep.wasm': {
                url: './ort-wasm-simd-threaded.jsep.gz',
                headers: {
                    'content-type': 'application/wasm'
                }
            },
            'https://huggingface.co/Xenova/LaMini-T5-61M/resolve/main/config.json': './llamini-config.json',
            'https://huggingface.co/Xenova/LaMini-T5-61M/resolve/main/tokenizer.json': './llamini-tokenizer.json',
            'https://huggingface.co/Xenova/LaMini-T5-61M/resolve/main/tokenizer_config.json': './llamini-tokenizer-config.json'
        };
        (()=>{
            const _parse = JSON.parse;
            JSON.parse = Object.setPrototypeOf(function parse(...args){
                try{
                    return _parse.apply(this,args);
                }catch(e){
                    console.warn(e,...args);
                    throw e;
                }
            },_parse);
        })();
        (()=>{
            const _json = Response.prototype.json;
            Response.prototype.json = Object.setPrototypeOf(async function json(...args){
                try{
                    return await _json.apply(this,args);
                }catch(e){
                    console.warn(e,this,...args);
                    throw e;
                }
            },_json);
        })();
        (() => {
            const _fetch = globalThis.fetch;
            globalThis.fetch = Object.setPrototypeOf(async function fetch(...args) {
                try {
                    console.log(...args);
                    const url = String(args[0].url ?? args[0]);
                    if (routes[url]) {
                        const routesURL = String(routes[url].url ?? routes[url]);
                        const res = await _fetch(`${routesURL}?${new Date().getTime()}`);
                        if (routes[url].headers) {
                            const value = new Headers(res.headers.entries());
                            for (header in routes[url].headers) {
                                value.set(header, routes[url].headers[header]);
                            }
                            Object.defineProperty(res, 'headers', {
                                value
                            });
                        }
                        if (routesURL.endsWith('.gz')) {
                            const ds = new DecompressionStream("gzip");
                            return new Response(res.body.pipeThrough(new DecompressionStream("gzip")), res);
                        }
                        return res;
                    }
                    return await _fetch.apply(this, args);
                } catch (e) {
                    console.warn(e, ...args);
                    const statusText = String(e);
                    return new Response(statusText, {
                        staus: 500,
                        statusText
                    });
                }
            }, _fetch);
        })();
    })();
