let compressionFormat;
let pakoReady;
const pakoInit = async()=>{
  await import('https://cdn.jsdelivr.net/npm/pretty-pako/pretty-pako.js');
};
const pakoInflate = (record) =>{
  return new ReadableStream({
    async start(controller){
      if(!pakoReady){
        pakoReady = pakoInit();
      }
      if(pakoReady instanceof Promise){
        pakoReady = await pakoReady;
      }
      if(!record){
        controller.close();
        return;
      }
      const stream = record.clone().body;
      const inflator = new pako.Inflate();
      inflator.onData = chunk => controller.enqueue(chunk);
      inflator.onEnd = code => {
        if(code !== 0){
          controller.error(new Error(`pako inflate error: ${inflator.msg}`));
        } else {
          controller.close();
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
export const decompress = record =>{
  switch(compressionFormat){
    case br:
      return decompressStream(record,br);
    case gz:
      return decompressStream(record,gz);  // was br, bug fixed
    default:
      return pakoInflate(record);
  }
};
