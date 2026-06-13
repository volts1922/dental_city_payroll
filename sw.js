const CACHE_VERSION = 'dcpayroll-v16';
const ASSETS=['./', './index.html', './manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_VERSION).then(c=>c.addAll(ASSETS).catch(()=>{})).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(url.hostname.includes('supabase')||url.pathname.includes('/rest/')||url.pathname.includes('/auth/')) return;
  if(e.request.mode==='navigate'||url.pathname.endsWith('.html')){
    e.respondWith(fetch(e.request).then(res=>{const clone=res.clone();caches.open(CACHE_VERSION).then(c=>c.put(e.request,clone));return res;}).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{
    if(res&&res.status===200&&res.type!=='opaque'){const clone=res.clone();caches.open(CACHE_VERSION).then(c=>c.put(e.request,clone));}
    return res;
  })));
});
self.addEventListener('message',e=>{if(e.data==='skipWaiting'||(e.data&&e.data.type==='SKIP_WAITING'))self.skipWaiting();});
