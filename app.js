const $=x=>document.getElementById(x);let stream=null,src=null,det=null,segMask=null,poses=[];let deferredInstall=null;let lastProfile=null;const HISTORY_KEY="asdty-aura-v16-journal";const C={purple:[180,105,255],gold:[255,210,70],blue:[70,170,255],green:[70,230,145],pink:[255,105,205]};const Z=[["Kepala",0,"purple"],["Dada",11,"gold"],["Tangan kiri",15,"blue"],["Tangan kanan",16,"green"],["Pinggul",23,"gold"],["Kaki kiri",27,"pink"],["Kaki kanan",28,"purple"]];async function init(){
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
      const {PoseLandmarker,FilesetResolver}=mod;
      if(!PoseLandmarker || !FilesetResolver) throw new Error("Export MediaPipe tidak ditemukan");

      const wasm=await FilesetResolver.forVisionTasks(loader.wasm);
      const model="https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

      try{
        status.textContent=`⏳ Menyiapkan AI tubuh • GPU…`;
        status.textContent=`⏳ Menyiapkan model • GPU…`;
        det=await PoseLandmarker.createFromOptions(wasm,{
          baseOptions:{modelAssetPath:model,delegate:"GPU"},
          runningMode:"IMAGE",numPoses:3,
          minPoseDetectionConfidence:.45,
          minPosePresenceConfidence:.45,
          minTrackingConfidence:.45,
          outputSegmentationMasks:true
        });
      }catch(gpuError){
        console.warn("AURA GPU gagal, fallback CPU:",gpuError);
        status.textContent="⏳ GPU gagal • mencoba CPU…";
        det=await PoseLandmarker.createFromOptions(wasm,{
          baseOptions:{modelAssetPath:model,delegate:"CPU"},
          runningMode:"IMAGE",numPoses:3,
          minPoseDetectionConfidence:.45,
          minPosePresenceConfidence:.45,
          minTrackingConfidence:.45,
          outputSegmentationMasks:true
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
  if(!det)return alert("Model AI belum siap.");
  $("work").classList.add("scanning");
  $("label").textContent="MEMBUAT SILUET TUBUH…";
  $("status").textContent="⏳ AI sedang membuat segmentation mask dari pose…";
  $("scan").disabled=true;
  setTimeout(async()=>{
    try{
      const result=det.detect(src);
      poses=result.landmarks||[];
      segMask=null;

      // Pose Landmarker can return a per-pixel person likelihood mask.
      // This is exactly the mask we need for the aura silhouette.
      if(result.segmentationMasks && result.segmentationMasks.length){
        const mask=result.segmentationMasks[0];
        const mw=mask.width,mh=mask.height;
        const data=mask.getAsFloat32Array();
        let peak=0,count=0;
        for(let i=0;i<data.length;i++){
          if(data[i]>peak)peak=data[i];
          if(data[i]>.25)count++;
        }
        console.log("AURA V22 segmentation:",{width:mw,height:mh,peak,coveredPixels:count});
        if(peak>.05 && count>100){
          segMask={w:mw,h:mh,data,category:false};
        }
        mask.close();
      }

      if(!segMask){
        throw new Error("Pose segmentation mask tidak tersedia / kosong");
      }

      paint();
      profile();
      $("label").textContent=poses.length?"SILUET & AURA SELESAI":"TIDAK ADA SUBJEK";
      $("status").textContent=poses.length
        ?`✓ ${poses.length} profil + siluet tubuh dibuat`
        :"Subjek tidak terdeteksi";

      if(poses.length){
        lastProfile=makeProfile();
        saveHistory(lastProfile);
        renderAdvancedAnalysis(lastProfile);
        renderComparison();
      }
    }catch(e){
      console.error("AURA V22 SCAN ERROR:",e);
      $("label").textContent="ERROR AI";
      $("status").textContent="Siluet belum tersedia. Lihat Console.";
    }finally{
      $("work").classList.remove("scanning");
      $("scan").disabled=false;
    }
  },100);
};
function bounds(p){let a=p.filter(q=>q.visibility>.35);if(!a.length)return null;let mnx=1,mny=1,mxx=0,mxy=0;a.forEach(q=>{mnx=Math.min(mnx,q.x);mny=Math.min(mny,q.y);mxx=Math.max(mxx,q.x);mxy=Math.max(mxy,q.y)});return{cx:(mnx+mxx)/2,cy:(mny+mxy)/2,rx:(mxx-mnx)/2,ry:(mxy-mny)/2}}function paint(){
  base();
  const c=$("cv"),x=c.getContext("2d"),w=c.width,h=c.height;
  const I=Math.max(.25,+$("int").value/100),R=Math.max(8,+$("rad").value);

  if(!segMask||!segMask.data){
    x.drawImage(src,0,0);
    return;
  }

  // ============================================================
  // AURA ASDTY — MASTER DESIGN V21
  // Person segmentation -> organic silhouette -> multi-field aura.
  // The original photograph is ALWAYS composited last.
  // ============================================================

  const mw=segMask.w,mh=segMask.h,md=segMask.data;
  const mask=document.createElement("canvas");
  mask.width=w;mask.height=h;
  const m=mask.getContext("2d");
  const img=m.createImageData(w,h),d=img.data;

  // Upsample the segmentation mask with a small amount of edge
  // softness. This keeps the aura continuous around the whole body.
  for(let y=0;y<h;y++){
    const sy=Math.min(mh-1,Math.floor(y*mh/h));
    for(let xx=0;xx<w;xx++){
      const sx=Math.min(mw-1,Math.floor(xx*mw/w));
      const raw=md[sy*mw+sx];
      const v=segMask.category ? raw/255 : raw;
      const a=segMask.category ? raw : Math.round(Math.max(0,Math.min(1,v))*255);
      const i=(y*w+xx)*4;
      d[i]=255;d[i+1]=255;d[i+2]=255;
      d[i+3]=v>.34?a:0;
    }
  }
  m.putImageData(img,0,0);

  // Build a clean silhouette for the aura. A blurred source mask makes
  // small segmentation gaps close visually without altering the photo.
  const silhouette=document.createElement("canvas");
  silhouette.width=w;silhouette.height=h;
  const sc=silhouette.getContext("2d");
  sc.filter="blur(1.25px)";
  sc.drawImage(mask,0,0);

  function auraRing(blur){
    const q=document.createElement("canvas");
    q.width=w;q.height=h;
    const qx=q.getContext("2d");
    qx.filter=`blur(${blur}px)`;
    qx.drawImage(silhouette,0,0);
    // Remove the interior so this layer exists outside the body.
    qx.globalCompositeOperation="destination-out";
    qx.filter="none";
    qx.drawImage(mask,0,0);
    return q;
  }

  const tight=auraRing(Math.max(9,R*.90));
  const middle=auraRing(Math.max(20,R*1.90));
  const outer=auraRing(Math.max(38,R*3.20));
  const halo=auraRing(Math.max(62,R*5.10));

  const stops=[
    [0.00,[204,74,255]],
    [0.13,[157,70,255]],
    [0.28,[84,105,255]],
    [0.43,[35,195,255]],
    [0.57,[45,225,170]],
    [0.70,[103,232,78]],
    [0.83,[255,221,58]],
    [0.92,[255,148,48]],
    [1.00,[255,70,70]]
  ];

  function colorize(alphaCanvas,boost=1){
    const out=document.createElement("canvas");
    out.width=w;out.height=h;
    const o=out.getContext("2d");
    const g=o.createLinearGradient(0,0,0,h);
    stops.forEach(s=>g.addColorStop(s[0],`rgb(${s[1][0]},${s[1][1]},${s[1][2]})`));
    o.fillStyle=g;
    o.fillRect(0,0,w,h);
    o.globalCompositeOperation="destination-in";
    o.drawImage(alphaCanvas,0,0);
    o.globalCompositeOperation="source-over";
    if(boost!==1){
      const boosted=document.createElement("canvas");
      boosted.width=w;boosted.height=h;
      const b=boosted.getContext("2d");
      b.globalAlpha=Math.min(1,boost);
      b.drawImage(out,0,0);
      return boosted;
    }
    return out;
  }

  const aura=document.createElement("canvas");
  aura.width=w;aura.height=h;
  const a=aura.getContext("2d");

  // Strong, luminous core + broad atmospheric field.
  a.globalCompositeOperation="screen";
  a.globalAlpha=Math.min(1,.42*I);
  a.drawImage(colorize(halo),0,0);
  a.globalAlpha=Math.min(1,.62*I);
  a.drawImage(colorize(outer),0,0);
  a.globalAlpha=Math.min(1,.82*I);
  a.drawImage(colorize(middle),0,0);
  a.globalAlpha=Math.min(1,1.00*I);
  a.drawImage(colorize(tight),0,0);

  // Vertical energy columns give the aura the luminous "field" appearance
  // of the approved MASTER DESIGN without coloring the subject.
  const b=bounds(poses[0]||[]);
  if(b){
    const cx=b.cx*w, cy=b.cy*h;
    const rx=Math.max(55,b.rx*w), ry=Math.max(75,b.ry*h);

    const field=document.createElement("canvas");
    field.width=w;field.height=h;
    const f=field.getContext("2d");
    const rg=f.createRadialGradient(cx,cy,Math.min(rx,ry)*.30,cx,cy,Math.max(rx,ry)*1.35);
    rg.addColorStop(0,"rgba(170,100,255,.18)");
    rg.addColorStop(.32,"rgba(75,160,255,.13)");
    rg.addColorStop(.58,"rgba(50,230,170,.10)");
    rg.addColorStop(.78,"rgba(255,205,55,.07)");
    rg.addColorStop(1,"rgba(255,70,70,0)");
    f.fillStyle=rg;f.fillRect(0,0,w,h);
    f.globalCompositeOperation="destination-out";
    f.drawImage(mask,0,0);
    a.globalAlpha=.72*I;
    a.drawImage(field,0,0);

    // Fine energy wisps: deterministic waves, clipped outside the body.
    const wisps=document.createElement("canvas");
    wisps.width=w;wisps.height=h;
    const q=wisps.getContext("2d");
    q.globalCompositeOperation="screen";
    for(let k=0;k<18;k++){
      const yy=h*(0.05+k/19);
      q.beginPath();
      for(let xx=0;xx<=w;xx+=Math.max(10,w/90)){
        const wave=Math.sin(xx*.025+k*1.7)*8+Math.sin(xx*.009-k)*13;
        const y=yy+wave;
        if(xx===0) q.moveTo(xx,y); else q.lineTo(xx,y);
      }
      q.strokeStyle=`hsla(${275-k*10},100%,68%,${0.025+0.002*k})`;
      q.lineWidth=Math.max(1,w/900);
      q.stroke();
    }
    q.globalCompositeOperation="destination-out";
    q.drawImage(mask,0,0);
    q.filter=`blur(${Math.max(2,R*.55)}px)`;
    a.globalAlpha=.8*I;
    a.drawImage(wisps,0,0);
  }

  // Tiny ground glow makes the full-body field visually continuous.
  if(b){
    const ground=document.createElement("canvas");
    ground.width=w;ground.height=h;
    const gg=ground.getContext("2d");
    const gy=Math.min(h-1,(b.cy+b.ry*.92)*h);
    const gr=gg.createRadialGradient(b.cx*w,gy,2,b.cx*w,gy,Math.max(80,b.rx*w*1.5));
    gr.addColorStop(0,"rgba(255,110,70,.24)");
    gr.addColorStop(.35,"rgba(255,205,55,.14)");
    gr.addColorStop(1,"rgba(255,205,55,0)");
    gg.fillStyle=gr;gg.fillRect(0,0,w,h);
    a.globalAlpha=.85*I;
    a.drawImage(ground,0,0);
  }

  // MASTER RULE: original photo is last and remains untouched.
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
