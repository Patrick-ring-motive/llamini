let compressionFormat;
let pakoReady;
const pakoInit = ()=>{
  pakoReady = import('https://cdn.jsdelivr.net/npm/pretty-pako/pretty-pako.js');
  (async()=>{
    pakoReady = await pakoReady;
  })();
};
const Q = fn =>{
  try{
    return fn();
  }catch{}
};
const pakoInflate = (record) =>{
  const body = record.clone().body;
  return new ReadableStream({
    async start(controller){
      if(!pakoReady){
        pakoInit();
      }
      if(pakoReady instanceof Promise){
        await pakoReady;
      }
      if(!record){
        Q(()=>controller.close());
        return;
      }
      const stream = record.clone().body;
      const inflator = new pako.Inflate();
      inflator.onData = chunk => controller.enqueue(chunk);
      inflator.onEnd = code => {
        if(code !== 0){
          controller.error(new Error(`pako inflate error: ${inflator.msg}`));
        } else {
          Q(()=>controller.close());
        }
      };
      for await (const chunk of stream){
        inflator.push(chunk);
      }
    }
  });
};
const canDecompressFormat = format =>{
  try{
    new DecompressionStream(format);
    return true;
  }catch{
    return false;
  }
};
const br = canDecompressFormat('brotli') && 'brotli';
const gz = canDecompressFormat('gzip') && 'gzip';
compressionFormat = br || gz || 'pako';
if(compressionFormat === 'pako'){
  pakoInit();
}
const decompressStream = (record,format) =>{
  const destream = new DecompressionStream(format);
  return record.clone().body.pipeThrough(destream);
};
export const decompress = Object.assign(record =>{
  switch(compressionFormat){
    case br:
      return decompressStream(record,br);
    case gz:
      return decompressStream(record,gz);  // was br, bug fixed
    default:
      return pakoInflate(record);
  }
},{format:compressionFormat});
