const $=x=>document.getElementById(x);let stream=null,src=null,det=null,seg=null,segMask=null,poses=[];let deferredInstall=null;let lastProfile=null;const HISTORY_KEY="asdty-aura-v16-journal";const C={purple:[180,105,255],gold:[255,210,70],blue:[70,170,255],green:[70,230,145],pink:[255,105,205]};const Z=[["Kepala",0,"purple"],["Dada",11,"gold"],["Tangan kiri",15,"blue"],["Tangan kanan",16,"green"],["Pinggul",23,"gold"],["Kaki kiri",27,"pink"],["Kaki kanan",28,"purple"]];async function init(){
  const status=$("status");
  status.textContent="⏳ Memuat library AI…";

  const loaders=[
    {
      name:"jsDelivr",
      module:"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304",
      wasm:"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
    },
    {
      name:"esm.sh",
      module:"https://unpkg.com/@mediapipe/tasks-vision@0.10.22-rc.20250304",
      wasm:"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
    }
  ];

  let lastError=null;

  for(const loader of loaders){
    try{
      status.textContent=`⏳ Memuat AI • ${loader.name}…`;
      const mod=await import(loader.module);
      const {PoseLandmarker,ImageSegmenter,FilesetResolver}=mod;
      if(!PoseLandmarker || !FilesetResolver) throw new Error("Export MediaPipe tidak ditemukan");

      const wasm=await FilesetResolver.forVisionTasks(loader.wasm);
      const model="https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

      try{
        status.textContent=`⏳ Menyiapkan AI tubuh • GPU…`;
        const segModel="https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite";
        // V20: force ImageSegmenter to CPU. The browser console showed
        // "segmentation_postprocessor ... NONE activation function chosen on GPU",
        // so the GPU path can initialize but fail to produce a usable mask.
        seg=await ImageSegmenter.createFromOptions(wasm,{
          baseOptions:{modelAssetPath:segModel,delegate:"CPU"},
          runningMode:"IMAGE",
          outputCategoryMask:true,
          outputConfidenceMasks:false
        });

        status.textContent=`⏳ Menyiapkan model • GPU…`;
        det=await PoseLandmarker.createFromOptions(wasm,{
          baseOptions:{modelAssetPath:model,delegate:"GPU"},
          runningMode:"IMAGE",numPoses:3,
          minPoseDetectionConfidence:.45,
          minPosePresenceConfidence:.45,
          minTrackingConfidence:.45
        });
      }catch(gpuError){
        console.warn("AURA GPU gagal, fallback CPU:",gpuError);
        status.textContent="⏳ GPU gagal • mencoba CPU…";
        det=await PoseLandmarker.createFromOptions(wasm,{
          baseOptions:{modelAssetPath:model,delegate:"CPU"},
          runningMode:"IMAGE",numPoses:3,
          minPoseDetectionConfidence:.45,
          minPosePresenceConfidence:.45,
          minTrackingConfidence:.45
        });
      }

      status.textContent="✓ AI siap • profil zona tubuh aktif";
      return;
    }catch(e){
      lastError=e;
      console.error(`AURA AI loader gagal (${loader.name}):`,e);
    }
  }

  console.error("AURA AI INIT FINAL ERROR:",lastError);
  status.textContent="✕ AI belum siap • tekan MUAT ULANG";
  let b=$("retryAI");
  if(!b){
    b=document.createElement("button");
    b.id="retryAI"; b.className="main";
    b.textContent="↻ MUAT ULANG AI";
    b.onclick=()=>{b.remove();init()};
    status.parentNode?.appendChild(b);
  }
}init();renderHistory();renderJournal();
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;const b=$("installBox");if(b)b.classList.remove("hidden");});
const ib=$("installBox");if(ib)ib.onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;ib.classList.add("hidden")};
window.addEventListener("appinstalled",()=>{if(ib)ib.classList.add("hidden")});$("cam").onclick=async()=>{try{if(!navigator.mediaDevices?.getUserMedia)throw new Error("Kamera tidak tersedia pada browser/context ini");stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});$("video").srcObject=stream;$("camera").classList.remove("hidden");$("work").classList.add("hidden")}catch(e){alert("Izin kamera diperlukan.")}};$("close").onclick=stop;function stop(){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$("camera").classList.add("hidden")}$("shot").onclick=()=>{let c=document.createElement("canvas");c.width=$("video").videoWidth;c.height=$("video").videoHeight;c.getContext("2d").drawImage($("video"),0,0);stop();prep(c)};$("gal").onclick=()=>{const f=$("file");f.value="";f.click()};$("file").onchange=()=>{let f=$("file").files[0];if(!f)return;let im=new Image();im.onload=()=>{let c=document.createElement("canvas");c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext("2d").drawImage(im,0,0);prep(c)};im.src=URL.createObjectURL(f)};function prep(c){let s=Math.min(1,1400/c.width);src=document.createElement("canvas");src.width=c.width*s;src.height=c.height*s;src.getContext("2d").drawImage(c,0,0,src.width,src.height);poses=[];$("work").classList.remove("hidden");$("profile").innerHTML="";$("label").textContent="SIAP";base()}function base(){let c=$("cv"),x=c.getContext("2d");c.width=src.width;c.height=src.height;x.drawImage(src,0,0)}$("scan").onclick=()=>{
  if(!det||!seg)return alert("Model AI belum siap.");
  $("work").classList.add("scanning");
  $("label").textContent="MEMBUAT SILUET TUBUH…";
  $("status").textContent="⏳ AI sedang memisahkan tubuh dari background…";
  $("scan").disabled=true;
  setTimeout(async()=>{
    try{
      poses=det.detect(src).landmarks||[];
      await new Promise((resolve,reject)=>{
        seg.segment(src,(result)=>{
          try{
            if(!result.categoryMask) throw new Error("Category mask tubuh tidak tersedia");
            const mask=result.categoryMask;
            const mw=mask.width,mh=mask.height;
            const raw=mask.getAsUint8Array();
            const person=new Uint8Array(raw.length);
            let personCount=0;
            for(let i=0;i<raw.length;i++){
              if(raw[i]===1){ person[i]=255; personCount++; }
            }
            if(personCount<Math.max(100,mw*mh*.005))
              throw new Error("Siluet orang tidak ditemukan pada category mask");
            segMask={w:mw,h:mh,data:person,category:true};
            mask.close();
            resolve();
          }catch(e){reject(e)}
        });
      });
      paint();
      profile();
      $("label").textContent=poses.length?"SILUET & AURA SELESAI":"TIDAK ADA SUBJEK";
      $("status").textContent=poses.length?`✓ ${poses.length} profil + siluet tubuh dibuat`:"Subjek tidak terdeteksi";
      if(poses.length){
        lastProfile=makeProfile();
        saveHistory(lastProfile);
        renderAdvancedAnalysis(lastProfile);
        renderComparison();
      }
    }catch(e){
      console.error("AURA V18 SCAN ERROR:",e);
      $("label").textContent="ERROR AI";
      $("status").textContent="Terjadi kesalahan saat membuat siluet tubuh. Lihat Console.";
    }finally{
      $("work").classList.remove("scanning");
      $("scan").disabled=false;
    }
  },150);
};
function bounds(p){let a=p.filter(q=>q.visibility>.35);if(!a.length)return null;let mnx=1,mny=1,mxx=0,mxy=0;a.forEach(q=>{mnx=Math.min(mnx,q.x);mny=Math.min(mny,q.y);mxx=Math.max(mxx,q.x);mxy=Math.max(mxy,q.y)});return{cx:(mnx+mxx)/2,cy:(mny+mxy)/2,rx:(mxx-mnx)/2,ry:(mxy-mny)/2}}function paint(){
  base();
  const c=$("cv"),x=c.getContext("2d"),w=c.width,h=c.height;
  const I=Math.max(.25,+$("int").value/100),R=Math.max(8,+$("rad").value);

  if(!segMask||!segMask.data){
    x.drawImage(src,0,0);
    return;
  }

  // V20: TRUE BODY SILHOUETTE — CPU CATEGORY MASK.
  // MediaPipe SelfieSegmenter supplies a per-pixel person confidence mask.
  // The aura is generated ONLY from that silhouette; the original photo is
  // then drawn last, so no aura color can leak into skin/clothing.

  const mask=document.createElement("canvas");
  mask.width=w;mask.height=h;
  const m=mask.getContext("2d");
  const img=m.createImageData(w,h);
  const d=img.data;
  const mw=segMask.w,mh=segMask.h,md=segMask.data;
  const threshold=.42;

  for(let y=0;y<h;y++){
    const sy=Math.min(mh-1,Math.floor(y*mh/h));
    for(let xx=0;xx<w;xx++){
      const sx=Math.min(mw-1,Math.floor(xx*mw/w));
      const raw=md[sy*mw+sx];
      const v=segMask.category ? raw/255 : raw;
      const a=segMask.category ? raw : Math.max(0,Math.min(255,Math.round(v*255)));
      const i=(y*w+xx)*4;
      d[i]=255;d[i+1]=255;d[i+2]=255;
      d[i+3]=v>threshold?a:0;
    }
  }
  m.putImageData(img,0,0);

  // Slightly soften the silhouette edge.
  const soft=document.createElement("canvas");
  soft.width=w;soft.height=h;
  const sm=soft.getContext("2d");
  sm.filter="blur(1.5px)";
  sm.drawImage(mask,0,0);

  function ring(blur){
    const q=document.createElement("canvas");
    q.width=w;q.height=h;
    const qc=q.getContext("2d");
    qc.filter=`blur(${blur}px)`;
    qc.drawImage(soft,0,0);
    qc.globalCompositeOperation="destination-out";
    qc.filter="none";
    qc.drawImage(mask,0,0);
    return q;
  }

  // Three contour expansions.
  const tight=ring(Math.max(7,R*.8));
  const mid=ring(Math.max(16,R*1.65));
  const wide=ring(Math.max(30,R*2.75));

  function colorLayer(alphaCanvas,stops){
    const out=document.createElement("canvas");
    out.width=w;out.height=h;
    const o=out.getContext("2d");
    const g=o.createLinearGradient(0,0,0,h);
    stops.forEach(s=>g.addColorStop(s[0],`rgb(${s[1][0]},${s[1][1]},${s[1][2]})`));
    o.fillStyle=g;o.fillRect(0,0,w,h);
    o.globalCompositeOperation="destination-in";
    o.drawImage(alphaCanvas,0,0);
    return out;
  }

  const stops=[
    [0.00,[190,60,255]],
    [0.18,[145,75,255]],
    [0.38,[60,145,255]],
    [0.56,[40,220,175]],
    [0.73,[100,230,95]],
    [0.87,[255,205,55]],
    [1.00,[255,105,70]]
  ];

  const aura=document.createElement("canvas");
  aura.width=w;aura.height=h;
  const a=aura.getContext("2d");

  a.globalAlpha=.82*I;
  a.drawImage(colorLayer(wide,stops),0,0);
  a.globalAlpha=.94*I;
  a.drawImage(colorLayer(mid,stops),0,0);
  a.globalAlpha=1;
  a.drawImage(colorLayer(tight,stops),0,0);

  // Soft outer atmosphere from the exact silhouette bounds.
  const b=bounds(poses[0]||[]);
  if(b){
    const mist=document.createElement("canvas");
    mist.width=w;mist.height=h;
    const mm=mist.getContext("2d");
    const cx=b.cx*w,cy=b.cy*h,rx=Math.max(50,b.rx*w),ry=Math.max(70,b.ry*h);
    const g=mm.createRadialGradient(cx,cy,Math.min(rx,ry)*.35,cx,cy,Math.max(rx,ry)+R*5);
    g.addColorStop(0,"rgba(145,85,255,.14)");
    g.addColorStop(.55,"rgba(70,150,255,.08)");
    g.addColorStop(1,"rgba(255,255,255,0)");
    mm.fillStyle=g;mm.fillRect(0,0,w,h);
    mm.globalCompositeOperation="destination-out";
    mm.drawImage(soft,0,0);
    a.globalAlpha=.7*I;
    a.drawImage(mist,0,0);
    a.globalAlpha=1;
  }

  // CRITICAL: aura behind the untouched original photo.
  x.clearRect(0,0,w,h);
  x.drawImage(aura,0,0);
  x.drawImage(src,0,0);
}
function profile(){let b=$("profile");b.innerHTML="";poses.forEach((p,i)=>{let vals=Z.map(([n,id,k])=>({n,id,k,q:p[id]})).filter(z=>z.q&&z.q.visibility>.45);let score=Math.min(99,Math.round(vals.length/Z.length*100));b.insertAdjacentHTML("beforeend",`<article class="card"><div class="head"><h3>Profil Aura • Subjek ${i+1}</h3><span class="tag">${score}% terbaca</span></div><p>Zona visual yang terpetakan: ${vals.map(z=>z.n).join(", ")}.</p><div>${vals.map(z=>`<span class="chip">${z.n}</span>`).join("")}</div><p>Indeks visualisasi cakupan pose</p><div class="meter"><i style="width:${score}%"></i></div></article>`)})}
function makeProfile(){
  const zones=Z.map(([name,id,key])=>{
    const q=poses[0]?.[id];
    return {name,key,visible:!!q&&q.visibility>.45,confidence:q?Math.round(q.visibility*100):0};
  });
  const coverage=Math.round(zones.filter(z=>z.visible).length/Z.length*100);
  return {id:Date.now(),name:$("sessionName").value.trim()||"Scan "+new Date().toLocaleDateString("id-ID"),date:new Date().toLocaleString("id-ID"),coverage,zones,image:$("cv").toDataURL("image/jpeg",.82)};
}
function saveHistory(item){
  let h=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");
  h.unshift(item);h=h.slice(0,12);localStorage.setItem(HISTORY_KEY,JSON.stringify(h));$("sessionName").value="";renderHistory();
}
function renderJournal(){
 const el=$("journal"); if(!el)return;
 const h=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");
 $("journalCount").textContent=h.length+" sesi";
 if(!h.length){el.innerHTML='<div class="card"><p>Belum ada sessão no journal.</p></div>';return}
 el.innerHTML=h.map((it,i)=>`<article class="historyItem"><div class="historyTop"><b>${escapeHtml(it.name)}</b><span>${escapeHtml(it.date)}</span></div><p>Subjek ${i+1} • Cakupan visual ${it.coverage||0}%</p></article>`).join("");
}
function renderHistory(){
  const el=$("history");if(!el)return;
  const h=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");
  if(!h.length){el.innerHTML='<div class="card"><p>Belum ada riwayat scan. Hasil berikutnya akan muncul di sini.</p></div>';return}
  el.innerHTML=h.map((it,i)=>{
    const prev=h[i+1];const d=prev?it.coverage-prev.coverage:0;
    return `<article class="historyItem"><div class="historyTop"><b>${escapeHtml(it.name)}</b><span>${escapeHtml(it.date)}</span></div>
    <img class="historyImg" src="${it.image}" alt="Hasil ${escapeHtml(it.name)}">
    <div class="compare"><div class="compareBox">Cakupan pose<div class="delta">${it.coverage}%</div></div>
    <div class="compareBox">${prev?"Perubahan vs scan sebelumnya":"Status"}<div class="delta">${prev?(d>0?"+":"")+d+"%":"Baseline"}</div></div></div></article>`
  }).join("");
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
$("clearHistory").onclick=()=>{if(confirm("Hapus seluruh riwayat scan?")){localStorage.removeItem(HISTORY_KEY);renderHistory()}}
$("int").oninput=()=>poses.length&&paint();$("rad").oninput=()=>poses.length&&paint();
function renderComparison(){
 const el=$("comparison"); if(!el)return;
 const h=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");
 if(h.length<2){el.innerHTML='<div class="card"><p>Butuh minimal 2 sesi untuk melihat perbandingan Before → After.</p></div>';return}
 const a=h[1],b=h[0],d=(b.coverage||0)-(a.coverage||0);
 el.innerHTML=`<div class="compareBox"><b>${escapeHtml(a.name)}</b><small>${escapeHtml(a.date)}</small><div class="delta">${a.coverage||0}%</div></div><div class="compareBox"><b>${escapeHtml(b.name)}</b><small>${escapeHtml(b.date)}</small><div class="delta">${b.coverage||0}%</div></div><div class="card" style="grid-column:1/-1"><p>Perubahan cakupan visual: <b>${d>0?"+":""}${d}%</b></p></div>`;
}
function renderAdvancedAnalysis(item){
 const p=$("analysisPanel"); if(!p)return;
 p.classList.remove("hidden");
 const zones=item.zones||[];
 const visible=zones.filter(z=>z.visible);
 const avg=visible.length?Math.round(visible.reduce((a,z)=>a+z.confidence,0)/visible.length):0;
 const strongest=zones.slice().sort((a,b)=>b.confidence-a.confidence)[0];
 const weakest=zones.slice().sort((a,b)=>a.confidence-b.confidence)[0];
 p.innerHTML=`<article class="card"><h3>Analisis Visual Otomatis</h3><p><b>Cakupan pose:</b> ${item.coverage||0}%</p><p><b>Rata-rata keterbacaan zona:</b> ${avg}%</p><p><b>Zona paling jelas:</b> ${strongest?escapeHtml(strongest.name):"-"} (${strongest?.confidence||0}%)</p><p><b>Zona paling rendah:</b> ${weakest?escapeHtml(weakest.name):"-"} (${weakest?.confidence||0}%)</p><p class="note">Analisis ini hanya menggambarkan kualitas keterbacaan visual/pose pada foto.</p></article>`;
}
$("report").onclick=()=>{
  if(!poses.length){alert("Lakukan scan terlebih dahulu.");return}
  const item=lastProfile||makeProfile();
  const panel=$("reportPanel");
  panel.classList.remove("hidden");
  const zones=item.zones||[];
  panel.innerHTML=`<div class="reportHead"><div class="reportBrand">AURA VISUALIZER<br>ASDTY</div><div class="reportMeta">V13 • AURA REPORT</div></div>
  <div class="reportTitle">${escapeHtml(item.name||"Aura Report")}</div>
  <div class="reportMeta">${escapeHtml(item.date||new Date().toLocaleString("id-ID"))} • Cakupan pose ${item.coverage||0}%</div>
  <img class="reportImage" src="${item.image||$("cv").toDataURL("image/jpeg",.88)}">
  <h3>Profil Zona Tubuh</h3><div class="reportGrid">${zones.map(z=>`<div class="reportZone"><b>${escapeHtml(z.name)}</b><small>${z.visible?"Terbaca":"Belum terbaca"} • ${z.confidence||0}%</small><div class="reportBar"><i style="width:${z.confidence||0}%"></i></div></div>`).join("")}</div>
  <div class="reportFoot"><b>Catatan:</b> Laporan ini merupakan visualisasi interpretatif berbasis foto dan pose AI. Warna/halo tidak merupakan pengukuran aura, energi astral, kondisi organ, atau diagnosis medis. Untuk kebutuhan ASDTY, laporan dapat digunakan sebagai dokumentasi visual sesi.</div>`;
  panel.scrollIntoView({behavior:"smooth",block:"start"});
};
$("save").onclick=()=>{let a=document.createElement("a");a.download="aura-visualizer-asdty-v11-profile.png";a.href=$("cv").toDataURL("image/png");a.click()};$("new").onclick=()=>{$("work").classList.add("hidden");$("file").value="";poses=[]};
// V16 PWA FINAL TEST BUILD: network/install/readiness status
let deferredInstallPrompt=null;
const netStatus=document.getElementById("netStatus");
const installBtn=document.getElementById("installBtn");
const installHint=document.getElementById("installHint");
function updateNetworkStatus(){
  if(navigator.onLine){
    netStatus.textContent="● ONLINE";
    netStatus.classList.remove("offline");
    installHint.textContent="Online • aplikasi siap digunakan.";
  }else{
    netStatus.textContent="● OFFLINE";
    netStatus.classList.add("offline");
    installHint.textContent="Offline • fitur aplikasi lokal tetap tersedia.";
  }
}
window.addEventListener("online",updateNetworkStatus);
window.addEventListener("offline",updateNetworkStatus);
updateNetworkStatus();
(async()=>{
  const el=document.getElementById("pwaReady");
  if(!el)return;
  const checks=[];
  checks.push(("serviceWorker"in navigator)?"SW ✓":"SW ✕");
  checks.push(location.protocol==="https:"||location.hostname==="localhost"?"SECURE ✓":"HTTPS/LOCALHOST ✕");
  checks.push(matchMedia("(display-mode: standalone)").matches?"INSTALLED ✓":"BROWSER MODE");
  el.textContent="PWA CHECK • "+checks.join(" • ");
  el.classList.add("ok");
})();
window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault(); deferredInstallPrompt=e;
  installBtn.classList.remove("hidden");
});
installBtn?.addEventListener("click",async()=>{
  if(!deferredInstallPrompt)return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt=null;
  installBtn.classList.add("hidden");
});
window.addEventListener("appinstalled",()=>{
  installBtn.classList.add("hidden");
  installHint.textContent="✓ AURA VISUALIZER terpasang sebagai PWA.";
});

if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js",{scope:"./"});
