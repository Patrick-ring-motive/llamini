try{
  console.log((Function('return import.meta.url'))());
}catch(e){
  console.warn(e);
}
