/* =====================================================================
   OCTOBOT · MÓDULO SUBIR VIDEO
   Sube a Supabase Storage → dispara webhook n8n → consulta estado.
   ===================================================================== */
window.Uploader = (function(){
  const CFG = window.OCTOBOT_CONFIG;
  const $ = id => document.getElementById(id);
  let selectedFile = null;
  let pollTimer = null;
  let started = false;

  const STAGES = [
    { key:'queued',      t:'En cola',               d:'Job creado en Supabase' },
    { key:'transcribing',t:'Transcribiendo audio',  d:'AssemblyAI (español)' },
    { key:'segmenting',  t:'Segmentando escenas',   d:'Gemini divide el guion' },
    { key:'searching',   t:'Buscando material',     d:'Pexels + motion (fal.ai)' },
    { key:'rendering',   t:'Renderizando',          d:'Shotstack arma el video' },
    { key:'done',        t:'Borrador en Metricool', d:'Listo para revisar' },
  ];

  function configOk(){
    return CFG.SUPABASE_URL.startsWith('https://') && !CFG.SUPABASE_URL.includes('TU-PROYECTO')
        && CFG.SUPABASE_ANON_KEY && !CFG.SUPABASE_ANON_KEY.includes('TU_ANON_KEY')
        && CFG.PIPELINE_WEBHOOK.startsWith('http') && !CFG.PIPELINE_WEBHOOK.includes('TU-N8N');
  }

  function init(){
    if(started) return; started = true;
    const drop = $('drop'), fileInput = $('file');
    drop.addEventListener('click', ()=> fileInput.click());
    ['dragover','dragenter'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.add('drag');}));
    ['dragleave','drop'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.remove('drag');}));
    drop.addEventListener('drop', ev=>{ if(ev.dataTransfer.files[0]) setFile(ev.dataTransfer.files[0]); });
    fileInput.addEventListener('change', ()=>{ if(fileInput.files[0]) setFile(fileInput.files[0]); });
    $('go').addEventListener('click', start);
  }

  function setFile(f){
    selectedFile = f;
    $('drop').classList.add('has-file');
    $('dropTitle').innerHTML = '<span class="fname">'+f.name+'</span>';
    $('dropHint').textContent = (f.size/1048576).toFixed(1)+' MB · '+(f.type||'archivo');
    if(f.type.startsWith('audio')) $('t-audio').checked = true;
    else if(f.type.startsWith('video')) $('t-video').checked = true;
    $('go').disabled = !configOk();
    hide($('errNote'));
  }

  function show(el,txt){ if(txt!==undefined) el.innerHTML=txt; el.classList.add('show'); }
  function hide(el){ el.classList.remove('show'); }
  function fail(el,msg){ show(el,msg); $('go').disabled=false; $('go').textContent='Reintentar'; }

  async function start(){
    if(!selectedFile){ fail($('errNote'),'Primero elige un archivo.'); return; }
    if(!configOk()){ fail($('errNote'),'Completa js/config.js antes de subir.'); return; }
    hide($('errNote'));
    $('go').disabled = true; $('go').textContent = 'Procesando…';
    const sType = document.querySelector('input[name=stype]:checked').value;
    try{
      const publicUrl = await uploadToSupabase(selectedFile);
      const jobId = await triggerWebhook(publicUrl, sType, selectedFile.name);
      buildPipeline();
      $('panelProgress').classList.remove('hidden');
      $('jobline').textContent = 'job_id · '+jobId;
      pollStatus(jobId);
    }catch(err){
      console.error(err);
      fail($('errNote'), '<b>No se pudo iniciar.</b> '+err.message);
    }
  }

  function uploadToSupabase(file){
    return new Promise((resolve,reject)=>{
      const safe = file.name.replace(/[^\w.\-]+/g,'_');
      const path = Date.now()+'_'+safe;
      const url  = CFG.SUPABASE_URL.replace(/\/$/,'')
                 + '/storage/v1/object/'+encodeURIComponent(CFG.STORAGE_BUCKET)+'/'+encodeURIComponent(path);
      $('upbar').classList.add('show');
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Authorization','Bearer '+CFG.SUPABASE_ANON_KEY);
      xhr.setRequestHeader('apikey', CFG.SUPABASE_ANON_KEY);
      xhr.setRequestHeader('x-upsert','true');
      if(file.type) xhr.setRequestHeader('Content-Type', file.type);
      xhr.upload.onprogress = e=>{
        if(e.lengthComputable){
          const pct = Math.round(e.loaded/e.total*100);
          $('upfill').style.width = pct+'%';
          $('uppct').textContent = pct+'%';
        }
      };
      xhr.onload = ()=>{
        if(xhr.status>=200 && xhr.status<300){
          $('uplbl').textContent='Archivo subido ✓';
          resolve(CFG.SUPABASE_URL.replace(/\/$/,'')+'/storage/v1/object/public/'+CFG.STORAGE_BUCKET+'/'+path);
        }else{
          let m='Storage devolvió '+xhr.status+'.';
          if(xhr.status===404) m+=' El bucket "'+CFG.STORAGE_BUCKET+'" no existe.';
          if(xhr.status===400||xhr.status===403) m+=' Revisa que el bucket exista y tenga política de subida para la anon key.';
          reject(new Error(m+' '+xhr.responseText));
        }
      };
      xhr.onerror = ()=> reject(new Error('Fallo de red al subir (¿CORS de Supabase o URL incorrecta?).'));
      xhr.send(file);
    });
  }

  async function triggerWebhook(sourceUrl, sourceType, filename){
    const payload = { source_url:sourceUrl, source_type:sourceType, filename:filename, user_id:CFG.USER_ID };
    let res;
    try{
      res = await fetch(CFG.PIPELINE_WEBHOOK, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    }catch(e){
      throw new Error('No se pudo llamar al webhook (CORS). Activa "Allowed Origins (CORS)" en el nodo Webhook de n8n.');
    }
    if(!res.ok) throw new Error('El webhook respondió '+res.status+'. '+(await res.text()).slice(0,200));
    const data = await res.json().catch(()=>({}));
    if(!data.job_id) throw new Error('El webhook no devolvió job_id. Respuesta: '+JSON.stringify(data));
    return data.job_id;
  }

  function buildPipeline(){
    $('pipe').innerHTML = STAGES.map((s,i)=>`
      <div class="stage" id="st-${i}"><div class="dot"></div>
        <div class="t">${s.t}</div><div class="d">${s.d}</div></div>`).join('');
  }
  function paint(status){
    const idx = STAGES.findIndex(s=>s.key===status);
    STAGES.forEach((s,i)=>{
      const el = $('st-'+i); el.classList.remove('active','running','done');
      if(idx===-1) return;
      if(i<idx) el.classList.add('active','done');
      else if(i===idx){ el.classList.add('active'); el.classList.add(status==='done'?'done':'running'); }
    });
  }
  function pollStatus(jobId){
    const base = CFG.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/jobs?id=eq.'+jobId+'&select=status,video_url';
    const headers = { apikey:CFG.SUPABASE_ANON_KEY, Authorization:'Bearer '+CFG.SUPABASE_ANON_KEY };
    const t0 = Date.now();
    async function tick(){
      try{
        const r = await fetch(base,{headers});
        const job = (await r.json())[0];
        if(job){
          if(job.status==='error'){ clearInterval(pollTimer); fail($('progErr'),'<b>El flujo se detuvo con error.</b> Revisa la ejecución en n8n.'); return; }
          paint(job.status);
          if(job.status==='done'){
            clearInterval(pollTimer); show($('result'));
            if(job.video_url) $('resultLink').href=job.video_url; else $('resultLink').classList.add('hidden');
            return;
          }
        }
      }catch(e){}
      if(Date.now()-t0 > 25*60*1000){ clearInterval(pollTimer); fail($('progErr'),'Se agotó el tiempo de espera (25 min). El render puede seguir en n8n.'); }
    }
    paint('queued'); tick(); pollTimer = setInterval(tick, 4000);
  }

  return { init, configOk };
})();
