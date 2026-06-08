(async()=>{
  await import('./client-router.js?'+new Date().getTIme());
  await import('./llamini.js?'+new Date().getTIme());
})();
