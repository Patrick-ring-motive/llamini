let compressionFormat;
let pakoReady;

const pakoInit = async()=>{
  await import('https://cdn.jsdelivr.net/npm/pretty-pako/pretty-pako.js');
};

const pakoInflate = async(record) =>{
  if(!pakoReady){
    pakoReady = pakoInit();
  }
  if(pakoReady intanceof Promise){
    pakoReady = await pakoReady;
  }
  if(!record)return;
  const stream = record.clone().body;
  const inflator = new pako.Inflate();
  const decoder = new TextDecoder();
  for await (const chunk of stream) {
    inflator.push(chunk);
  }
  const output = inflator.result;
  return output;
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
  pakoInflate();
}

const decompressStream = (record,format) =>{
  const destream = new DecompressionStream(format);
  return record.clone().body.pipeThrough(destream);
};

export const decompress = record =>{
  switch (compressionFormat) {
    case br:
      return decompressStream(record,br);
    case gz:
      return decompressStream(record,br);
    default:
      return pakoInflate(record);
  }
};





