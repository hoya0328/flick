/* Static-only offline support. Never cache account pages, API, images or signed media. */
const CACHE='flick-public-__BUILD_ID__';
const OFFLINE='/offline.html';
function publicAsset(url){return url.origin===self.location.origin&&(
  url.pathname.startsWith('/_expo/static/')||url.pathname.startsWith('/fonts/')||
  url.pathname.startsWith('/icons/')||url.pathname===OFFLINE
)&&!url.search;}
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.add(OFFLINE)));});
// No skipWaiting or forced reload: an unfinished editor must not be interrupted.
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('flick-public-')&&key!==CACHE).map(key=>caches.delete(key)))));});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(()=>caches.match(OFFLINE).then(result=>result||new Response('연결을 확인해 주세요.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}))));return;
  }
  if(publicAsset(url))event.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(request);if(cached)return cached;
    const response=await fetch(request);
    if(response.ok&&response.type==='basic')await cache.put(request,response.clone());
    return response;
  }));
});
