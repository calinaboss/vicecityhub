// Generated per release; never cache external analytics, APIs, or private data.
const CACHE="atlas-88a947c9-88b0b8565a27", PREFIX="atlas-88a947c9-", BASE="/interactive-map/";
const CORE=["/interactive-map/","/interactive-map/index.html","/interactive-map/favicon.svg","/interactive-map/assets/BackupDialog-BZPvTKzO.js","/interactive-map/assets/gtadb-mx_UyCIg.js","/interactive-map/assets/index-CjJGueeH.js","/interactive-map/assets/index-CwbeIiBn.css","/interactive-map/assets/inter-cyrillic-400-normal-obahsSVq.woff2","/interactive-map/assets/inter-cyrillic-600-normal-CWCymEST.woff2","/interactive-map/assets/inter-cyrillic-ext-400-normal-BQZuk6qB.woff2","/interactive-map/assets/inter-cyrillic-ext-600-normal-Dfes3d0z.woff2","/interactive-map/assets/inter-greek-400-normal-B4URO6DV.woff2","/interactive-map/assets/inter-greek-600-normal-plRanbMR.woff2","/interactive-map/assets/inter-greek-ext-400-normal-DGGRlc-M.woff2","/interactive-map/assets/inter-greek-ext-600-normal-DRtmH8MT.woff2","/interactive-map/assets/inter-latin-400-normal-C38fXH4l.woff2","/interactive-map/assets/inter-latin-600-normal-LgqL8muc.woff2","/interactive-map/assets/inter-latin-ext-400-normal-C1nco2VV.woff2","/interactive-map/assets/inter-latin-ext-600-normal-D2bJ5OIk.woff2","/interactive-map/assets/inter-vietnamese-400-normal-DMkecbls.woff2","/interactive-map/assets/inter-vietnamese-600-normal-Cc8MFFhd.woff2","/interactive-map/assets/jsx-runtime-DyZJNswf.js","/interactive-map/assets/leonida-coordinates-CXGuqbYF.js","/interactive-map/assets/leonida-evidence-BTSqoURv.js","/interactive-map/assets/MarkerEditor-Brh5zI0D.js","/interactive-map/assets/Modal-CjteFUQ0.js","/interactive-map/assets/oswald-cyrillic-500-normal-Dz4ZC46J.woff2","/interactive-map/assets/oswald-cyrillic-ext-500-normal-DngHVvy4.woff2","/interactive-map/assets/oswald-latin-500-normal-B-eyT0Dw.woff2","/interactive-map/assets/oswald-latin-ext-500-normal-QdEKgtiz.woff2","/interactive-map/assets/oswald-vietnamese-500-normal-hXcn5ojQ.woff2","/interactive-map/assets/PlaceDetails-DfpqYJDA.js","/interactive-map/assets/ProjectPage-7AQEYhSh.js","/interactive-map/assets/public-path-80QdDwOa.js","/interactive-map/assets/RegionalResearch-BhRApGhg.css","/interactive-map/assets/RegionalResearch-C24-O0bA.js","/interactive-map/assets/SettingsDialog-DqjsSh8_.js","/interactive-map/assets/gta6-leonida-atlas/basemap.svg","/interactive-map/assets/street-leonida/maps/gtadb-landmarks-5c1d69f.json"];
const APP_FILES=CORE.concat(["/interactive-map/assets/ExplorerView-3OXNalMG.js","/interactive-map/assets/ExplorerView-CPZbGovK.css","/interactive-map/assets/walk-overlays-BTC9nnNs.js","/interactive-map/assets/walk-world-Czceg1CE.js"]);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(BASE))return;
  if(url.pathname===BASE+'analytics.html'||url.pathname===BASE+'analytics-bootstrap.js')return;
  const navigation=request.mode==='navigate';
  const publicOptional=url.pathname.startsWith(BASE+'assets/street-leonida/')&&/\.(?:webp|jpg|png|svg|json)$/.test(url.pathname);
  const asset=APP_FILES.includes(url.pathname)||publicOptional;
  if(request.headers.has('authorization')||(!navigation&&url.search))return;
  if(!navigation&&!asset)return;
  if(navigation){event.respondWith(fetch(request).catch(()=>caches.match(BASE+'index.html')));return;}
  event.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(request);if(cached)return cached;
    const response=await fetch(request);
    if(response.ok&&response.type==='basic'&&!/private|no-store/i.test(response.headers.get('cache-control')||'')){
      // Bound optional 3D asset caching; the app shell and public data remain pinned.
      try {
        if(publicOptional&&!APP_FILES.includes(url.pathname)){
          const keys=await cache.keys();const extras=keys.filter(key=>!APP_FILES.includes(new URL(key.url).pathname));
          if(extras.length>=200)await cache.delete(extras[0]);
        }
        await cache.put(request,response.clone());
      } catch { /* Cache quota must not discard a successful network response. */ }
    }
    return response;
  }).catch(()=>fetch(request)));
});
