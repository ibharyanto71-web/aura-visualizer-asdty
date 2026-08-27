const $=x=>document.getElementById(x);let stream=null,src=null,det=null,poses=[];let deferredInstall=null;let lastProfile=null;const HISTORY_KEY="asdty-aura-v16-journal";const C={purple:[180,105,255],gold:[255,210,70],blue:[70,170,255],green:[70,230,145],pink:[255,105,205]};const Z=[["Kepala",0,"purple"],["Dada",11,"gold"],["Tangan kiri",15,"blue"],["Tangan kanan",16,"green"],["Pinggul",23,"gold"],["Kaki kiri",27,"pink"],["Kaki kanan",28,"purple"]];async function init(){
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
window.addEventListener("appinstalled",()=>{if(ib)ib.classList.add("hidden")});$("cam").onclick=async()=>{try{if(!navigator.mediaDevices?.getUserMedia)throw new Error("Kamera tidak tersedia pada browser/context ini");stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});$("video").srcObject=stream;$("camera").classList.remove("hidden");$("work").classList.add("hidden")}catch(e){alert("Izin kamera diperlukan.")}};$("close").onclick=stop;function stop(){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$("camera").classList.add("hidden")}$("shot").onclick=()=>{let c=document.createElement("canvas");c.width=$("video").videoWidth;c.height=$("video").videoHeight;c.getContext("2d").drawImage($("video"),0,0);stop();prep(c)};$("gal").onclick=()=>{const f=$("file");f.value="";f.click()};$("file").onchange=()=>{let f=$("file").files[0];if(!f)return;let im=new Image();im.onload=()=>{let c=document.createElement("canvas");c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext("2d").drawImage(im,0,0);prep(c)};im.src=URL.createObjectURL(f)};function prep(c){let s=Math.min(1,1400/c.width);src=document.createElement("canvas");src.width=c.width*s;src.height=c.height*s;src.getContext("2d").drawImage(c,0,0,src.width,src.height);poses=[];$("work").classList.remove("hidden");$("profile").innerHTML="";$("label").textContent="SIAP";base()}function base(){let c=$("cv"),x=c.getContext("2d");c.width=src.width;c.height=src.height;x.drawImage(src,0,0)}$("scan").onclick=()=>{if(!det)return alert("Model AI belum siap.");$("work").classList.add("scanning");$("label").textContent="MEMBUAT PROFIL…";$("scan").disabled=true;setTimeout(()=>{poses=det.detect(src).landmarks||[];paint();profile();$("work").classList.remove("scanning");$("scan").disabled=false;$("label").textContent=poses.length?"PROFIL SELESAI":"TIDAK ADA SUBJEK";$("status").textContent=poses.length?`✓ ${poses.length} profil subjek dibuat`:"Subjek tidak terdeteksi";if(poses.length){lastProfile=makeProfile();saveHistory(lastProfile);renderAdvancedAnalysis(lastProfile);renderComparison()}},1500)};function bounds(p){let a=p.filter(q=>q.visibility>.35);if(!a.length)return null;let mnx=1,mny=1,mxx=0,mxy=0;a.forEach(q=>{mnx=Math.min(mnx,q.x);mny=Math.min(mny,q.y);mxx=Math.max(mxx,q.x);mxy=Math.max(mxy,q.y)});return{cx:(mnx+mxx)/2,cy:(mny+mxy)/2,rx:(mxx-mnx)/2,ry:(mxy-mny)/2}}function paint(){
  base();
  const c=$("cv"),x=c.getContext("2d"),w=c.width,h=c.height;
  const I=Math.max(.25,+$("int").value/100),R=Math.max(10,+$("rad").value);
  const keys=Object.keys(C);

  // AURA FIELD V4
  // Deliberately NO lines, polygons, hulls, or joint-to-joint strokes.
  // The aura is built only from diffuse radial fields so it reads as a soft
  // luminous atmosphere around the detected person.

  function field(cx,cy,rx,ry,stops,alpha=1){
    x.save();
    x.globalCompositeOperation="screen";
    x.filter=`blur(${Math.max(3,R*.20)}px)`;
    const g=x.createRadialGradient(cx,cy,Math.min(rx,ry)*.08,cx,cy,Math.max(rx,ry));
    for(const s of stops) g.addColorStop(s[0],`rgba(${s[1][0]},${s[1][1]},${s[1][2]},${s[2]*alpha})`);
    x.fillStyle=g;
    x.beginPath();x.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);x.fill();
    x.restore();
  }

  poses.forEach((p,pi)=>{
    const vis=p.filter(q=>q&&q.visibility>.30);
    if(vis.length<3)return;

    const b=bounds(p);
    if(b){
      const cx=b.cx*w,cy=b.cy*h;
      const rx=Math.max(42,b.rx*w),ry=Math.max(55,b.ry*h);

      // Large outer atmospheric field.
      field(cx,cy,rx+R*3.0,ry+R*3.0,[
        [0,[170,95,255],.11*I],
        [.24,[80,165,255],.10*I],
        [.48,[65,225,165],.075*I],
        [.68,[255,205,70],.045*I],
        [.84,[255,125,90],.018*I],
        [1,[255,255,255],0]
      ]);

      // A second, slightly tighter field creates depth without an edge.
      field(cx,cy,rx+R*1.65,ry+R*1.65,[
        [0,[185,100,255],.075*I],
        [.30,[75,175,255],.075*I],
        [.60,[75,230,155],.050*I],
        [.82,[255,210,80],.022*I],
        [1,[255,255,255],0]
      ]);
    }

    // Diffuse clouds at pose landmarks. No strokes between them.
    x.save();
    x.globalCompositeOperation="screen";
    x.filter=`blur(${Math.max(4,R*.12)}px)`;
    p.forEach((q,i)=>{
      if(!q||q.visibility<.30)return;
      const cc=C[keys[(i+pi)%keys.length]];
      const rr=Math.max(24,R*(.72+(i%3)*.12)+20);
      const g=x.createRadialGradient(q.x*w,q.y*h,0,q.x*w,q.y*h,rr);
      g.addColorStop(0,`rgba(${cc[0]},${cc[1]},${cc[2]},${.20*I})`);
      g.addColorStop(.28,`rgba(${cc[0]},${cc[1]},${cc[2]},${.105*I})`);
      g.addColorStop(.68,`rgba(${cc[0]},${cc[1]},${cc[2]},${.025*I})`);
      g.addColorStop(1,"rgba(255,255,255,0)");
      x.fillStyle=g;x.beginPath();x.arc(q.x*w,q.y*h,rr,0,Math.PI*2);x.fill();
    });
    x.restore();

    // Larger zone fields: these are the analytical color anchors.
    Z.forEach(([name,id,key])=>{
      const q=p[id];
      if(!q||q.visibility<.35)return;
      const px=q.x*w,py=q.y*h;
      const r=Math.max(42,R*1.55+26),cc=C[key];

      x.save();
      x.globalCompositeOperation="screen";
      x.filter=`blur(${Math.max(4,R*.10)}px)`;
      const g=x.createRadialGradient(px,py,0,px,py,r*2.5);
      g.addColorStop(0,`rgba(${cc[0]},${cc[1]},${cc[2]},${.30*I})`);
      g.addColorStop(.22,`rgba(${cc[0]},${cc[1]},${cc[2]},${.17*I})`);
      g.addColorStop(.52,`rgba(${cc[0]},${cc[1]},${cc[2]},${.065*I})`);
      g.addColorStop(.80,`rgba(${cc[0]},${cc[1]},${cc[2]},${.015*I})`);
      g.addColorStop(1,"rgba(255,255,255,0)");
      x.fillStyle=g;x.beginPath();x.arc(px,py,r*2.5,0,Math.PI*2);x.fill();
      x.restore();
    });
  });
}function profile(){let b=$("profile");b.innerHTML="";poses.forEach((p,i)=>{let vals=Z.map(([n,id,k])=>({n,id,k,q:p[id]})).filter(z=>z.q&&z.q.visibility>.45);let score=Math.min(99,Math.round(vals.length/Z.length*100));b.insertAdjacentHTML("beforeend",`<article class="card"><div class="head"><h3>Profil Aura • Subjek ${i+1}</h3><span class="tag">${score}% terbaca</span></div><p>Zona visual yang terpetakan: ${vals.map(z=>z.n).join(", ")}.</p><div>${vals.map(z=>`<span class="chip">${z.n}</span>`).join("")}</div><p>Indeks visualisasi cakupan pose</p><div class="meter"><i style="width:${score}%"></i></div></article>`)})}
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
