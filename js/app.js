/* =====================================================================
   OCTOBOT · APP SHELL
   Maneja la navegación entre vistas e inicializa cada módulo.
   ===================================================================== */
(function(){
  const CFG = window.OCTOBOT_CONFIG;
  const initialized = { upload:false, calendar:false };

  function switchView(view){
    document.querySelectorAll('.view').forEach(v=> v.classList.toggle('active', v.id==='view-'+view));
    document.querySelectorAll('.nav-item').forEach(b=> b.classList.toggle('active', b.dataset.view===view));
    document.querySelectorAll('.tn').forEach(b=> b.classList.toggle('active', b.dataset.view===view));

    if(view==='upload' && !initialized.upload){ window.Uploader.init(); initialized.upload=true; }
    if(view==='calendar'){
      if(!initialized.calendar){ window.Calendar.init(); initialized.calendar=true; }
      else window.Calendar.init(); // refresca el mes al volver
    }
  }

  // listeners de navegación (sidebar + topbar)
  document.querySelectorAll('[data-view]').forEach(btn=>{
    btn.addEventListener('click', ()=> switchView(btn.dataset.view));
  });

  // indicador de conexión
  function checkConn(){
    const dot=document.getElementById('connDot'), txt=document.getElementById('connTxt');
    const upOk = window.Uploader.configOk(), calOk = window.Calendar.configOk();
    if(upOk && calOk){ dot.className='conn ok'; txt.textContent='Configurado'; }
    else if(!upOk && !calOk){ dot.className='conn bad'; txt.textContent='Falta configurar'; }
    else { dot.className='conn'; txt.textContent='Configuración parcial'; }
  }

  // arranque
  window.Uploader.init(); initialized.upload=true;
  checkConn();
  switchView('upload');
})();
