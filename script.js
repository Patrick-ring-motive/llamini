(async()=>{
  await import('./client-router.js?'+new Date().getTime());
  await import('./llamini.js?'+new Date().getTime());
})();
