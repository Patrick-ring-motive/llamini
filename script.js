(async () => {
  async function clearAllClientStorage() {
    try {
        // 1. Clear Local Storage
        localStorage.clear();
        console.log("✔️ LocalStorage cleared.");

        // 2. Clear Session Storage
        sessionStorage.clear();
        console.log("✔️ SessionStorage cleared.");

        // 3. Clear Cache Storage (Cache API)
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            console.log("✔️ Cache Storage cleared.");
        } else {
            console.log("⚠️ Cache Storage API not supported in this browser.");
        }

        // 4. Unregister Service Workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(
                registrations.map(registration => registration.unregister())
            );
            console.log(`✔️ Unregistered ${registrations.length} Service Worker(s).`);
        } else {
            console.log("⚠️ Service Workers are not supported in this browser.");
        }

        // 5. Clear Cookies
        const cookies = document.cookie.split("; ");
        for (let c = 0; c < cookies.length; c++) {
            const d = window.location.hostname.split(".");
            while (d.length > 0) {
                const cookieBase = encodeURIComponent(cookies[c].split(";")[0].split("=")[0]) + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=' + d.join('.') + ' ;path=';
                document.cookie = cookieBase + '/';
                d.shift();
            }
        }
        console.log("✔️ Cookies cleared.");
        
        console.log("🚀 All client-side storage and Service Workers have been purged.");
    } catch (error) {
        console.error("❌ Error clearing storage:", error);
    }
}




  
  const env = /dev/i.test(location.href) ? 'DEV' : 'PROD';
  if(env === 'DEV'){
    await clearAllClientStorage();
  }
  await import('./client-router.js?' + (env == 'DEV' ? new Date().getTime() : ''));
  await import('./llamini.js?' + (env == 'DEV' ? new Date().getTime() : ''));
})();
