/* =====================================================================
   OCTOBOT · MÓDULO CALENDARIO METRICOOL
   Lista posts (GET), reprograma/cambia estado (POST update), elimina (POST delete).
   ===================================================================== */
window.Calendar = (function(){
  const CFG = window.OCTOBOT_CONFIG;
  const EP  = CFG.METRICOOL;
  const $ = id => document.getElementById(id);

  let viewDate = new Date();
  let postsByDay = {};
  let current = null;
  let started = false;

  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const DOW = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  function configOk(){ return !CFG.N8N_BASE.includes('TU-N8N'); }

  function init(){
    if(started){ loadMonth(); return; } started = true;
    $('dow').innerHTML = DOW.map(d=>`<div class="dow">${d}</div>`).join('');
    $('prev').onclick  = ()=>{ viewDate.setMonth(viewDate.getMonth()-1); loadMonth(); };
    $('next').onclick  = ()=>{ viewDate.setMonth(viewDate.getMonth()+1); loadMonth(); };
    $('today').onclick = ()=>{ viewDate = new Date(); loadMonth(); };
    $('mClose').onclick = closeModal;
    $('overlay').addEventListener('click', e=>{ if(e.target===$('overlay')) closeModal(); });
    $('mSave').onclick = saveChanges;
    $('mDelete').onclick = deletePost;
    render(); loadMonth();
  }

  /* helpers de fecha */
  function pad(n){return String(n).padStart(2,'0')}
  function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
  function fmtMetricool(d){return ymd(d)+'T'+pad(d.getHours())+':'+pad(d.getMinutes())+':00'}
  function parseDate(s){
    if(!s) return null;
    const m = String(s).match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if(m) return new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5]);
    const d = new Date(s); return isNaN(d)?null:d;
  }
  function extractPosts(json){
    if(!json) return [];
    if(Array.isArray(json)) return json;
    for(const k of ['data','posts','results','items']) if(Array.isArray(json[k])) return json[k];
    if(json.data && Array.isArray(json.data.posts)) return json.data.posts;
    return [];
  }
  function postDate(p){ return parseDate(p?.publicationDate?.dateTime || p?.publicationDate || p?.date); }
  function postIsDraft(p){
    if(typeof p.draft==='boolean') return p.draft;
    if(p.status) return /draft|borrador/i.test(p.status);
    return false;
  }
  function postProviders(p){
    const raw = p.providers || p.networks || [];
    return raw.map(x=> typeof x==='string'?x:(x.network||x.name||x.provider||'')).filter(Boolean);
  }
  function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
  function hide(el){ el.classList.remove('show'); }
  function showErr(html){ $('bannerErr').innerHTML=html; $('bannerErr').classList.add('show'); }

  async function loadMonth(){
    if(!configOk()) return;
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1, 0,0,0);
    const last  = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 0, 23,59,59);
    $('loading').classList.remove('hidden'); hide($('bannerErr'));
    try{
      const url = EP.list + '?start='+encodeURIComponent(fmtMetricool(first)) + '&end='+encodeURIComponent(fmtMetricool(last));
      const r = await fetch(url, { method:'GET' });
      if(!r.ok) throw new Error('El webhook de listar respondió '+r.status);
      const posts = extractPosts(await r.json());
      postsByDay = {};
      posts.forEach(p=>{ const d=postDate(p); if(!d) return; const k=ymd(d); (postsByDay[k]=postsByDay[k]||[]).push(p); });
      render();
    }catch(err){
      if(/Failed to fetch|NetworkError/i.test(err.message)){
        showErr('No se pudo conectar al listar. <b>Activa "Allowed Origins (CORS)" = * en el nodo «Webhook Listar Posts»</b> (es el único sin CORS).');
      }else showErr('Error al cargar: '+err.message);
      render();
    }finally{ $('loading').classList.add('hidden'); }
  }

  function render(){
    $('monthLabel').textContent = MESES[viewDate.getMonth()]+' '+viewDate.getFullYear();
    const y=viewDate.getFullYear(), m=viewDate.getMonth();
    const startDow=(new Date(y,m,1).getDay()+6)%7;
    const days=new Date(y,m+1,0).getDate(), daysPrev=new Date(y,m,0).getDate();
    const todayKey=ymd(new Date());
    let cells='';
    for(let i=startDow-1;i>=0;i--) cells+=dayCell(new Date(y,m-1,daysPrev-i),true,todayKey);
    for(let d=1;d<=days;d++) cells+=dayCell(new Date(y,m,d),false,todayKey);
    const tail=(7-((startDow+days)%7))%7;
    for(let d=1;d<=tail;d++) cells+=dayCell(new Date(y,m+1,d),true,todayKey);
    $('cal').innerHTML=cells;
    document.querySelectorAll('.chip').forEach(c=> c.addEventListener('click',()=>openModal(c.dataset.key,+c.dataset.idx)));
  }
  function dayCell(date,out,todayKey){
    const key=ymd(date), posts=postsByDay[key]||[], isToday=key===todayKey;
    const chips=posts.map((p,i)=>{
      const d=postDate(p), t=d?pad(d.getHours())+':'+pad(d.getMinutes()):'';
      const txt=(p.text||'(sin texto)').slice(0,40);
      return `<div class="chip ${postIsDraft(p)?'draft':''}" data-key="${key}" data-idx="${i}"><span class="time">${t}</span>${escapeHtml(txt)}</div>`;
    }).join('');
    return `<div class="cell ${out?'out':''} ${isToday?'today':''}"><span class="num">${date.getDate()}</span>${chips}</div>`;
  }

  function openModal(key,idx){
    const p=(postsByDay[key]||[])[idx]; if(!p) return;
    current=p; const draft=postIsDraft(p); const d=postDate(p)||new Date();
    $('mBadge').textContent=draft?'Borrador':'Programado';
    $('mBadge').className='badge '+(draft?'draft':'sched');
    $('mTitle').textContent='Publicación · '+(p.id||'').toString().slice(0,8);
    $('mText').textContent=p.text||'(sin texto)';
    const nets=postProviders(p);
    $('mNets').innerHTML=nets.length?nets.map(n=>`<span class="net">${escapeHtml(n)}</span>`).join(''):'<span class="net">sin red</span>';
    $('mDate').value=ymd(d); $('mTime').value=pad(d.getHours())+':'+pad(d.getMinutes());
    $(draft?'st-draft':'st-sched').checked=true;
    hide($('mMsg')); $('mSave').disabled=false; $('mDelete').disabled=false;
    $('overlay').classList.add('show');
  }
  function closeModal(){ $('overlay').classList.remove('show'); current=null; }
  function msg(t,cls){ const e=$('mMsg'); e.textContent=t; e.className='modal-msg show '+cls; }

  async function saveChanges(){
    if(!current) return;
    const dateTime=$('mDate').value+'T'+$('mTime').value+':00';
    const draft=document.querySelector('input[name=mState]:checked').value==='draft';
    $('mSave').disabled=true; msg('Guardando…','');
    try{
      const r=await fetch(EP.update,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postId:current.id,dateTime,timezone:CFG.TIMEZONE,draft})});
      if(!r.ok) throw new Error('Update respondió '+r.status);
      msg('Cambios guardados ✓','ok'); setTimeout(()=>{ closeModal(); loadMonth(); },700);
    }catch(err){ $('mSave').disabled=false; msg(/Failed to fetch/i.test(err.message)?'Error de conexión/CORS con el webhook de update.':('Error: '+err.message),'err'); }
  }
  async function deletePost(){
    if(!current) return;
    if(!confirm('¿Eliminar esta publicación de Metricool? No se puede deshacer.')) return;
    $('mDelete').disabled=true; $('mSave').disabled=true; msg('Eliminando…','');
    try{
      const r=await fetch(EP.delete,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postId:current.id})});
      if(!r.ok) throw new Error('Delete respondió '+r.status);
      msg('Publicación eliminada ✓','ok'); setTimeout(()=>{ closeModal(); loadMonth(); },700);
    }catch(err){ $('mDelete').disabled=false; $('mSave').disabled=false; msg('Error al eliminar: '+err.message,'err'); }
  }

  return { init, configOk };
})();
