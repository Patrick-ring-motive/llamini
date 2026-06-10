(async () => {
  const env = /dev/i.test(location.href) ? 'DEV' : 'PROD';
  await import('./client-router.js?' + (env == 'DEV' ? new Date().getTime() : ''));
  await import('./llamini.js?' + (env == 'DEV' ? new Date().getTime() : ''));
})();
