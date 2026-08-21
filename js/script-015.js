
(function(){
  const USERS_KEY='ego-dashboard-users-v3'; // legacy cache only; no longer the source of truth
  const CURRENT_KEY='ego-dashboard-current-v3';
  const REMEMBER_KEY='ego-dashboard-remember-v3';
  const USERS_API_URL='https://script.google.com/macros/s/AKfycbzYriC6QyutbQghxfUmk9RVqHrMhA4-0u7LQaY39DR2wEC71NSAo5LQ50oJzBK_nv2_/exec';
  const SYSTEM_PERMS=['filters','print','pdf','manageUsers'];
  const cssEscape=(window.CSS&&typeof CSS.escape==='function')
    ? CSS.escape.bind(CSS)
    : (v=>String(v).replace(/[^a-zA-Z0-9_-]/g,ch=>'\\'+ch));
  let ALL_PERMS=[
    'reportInvoice','reportEquipment','reportSupplier','reportTire','reportActivity',
    'reportTireId','tireLifecycleReport','tirePositionReport','reportMonthly','supplierInvoicesReport','inventoryReport','records',
    ...SYSTEM_PERMS
  ];

  function discoverReportPermissions(){
    const defs=new Map();
    document.querySelectorAll('.report-nav-item[data-report-target], [data-nav-report]').forEach(el=>{
      const id=el.getAttribute('data-report-target')||el.getAttribute('data-nav-report');
      if(!id||id==='home')return;
      let label=id;
      const launcher=document.querySelector('.report-nav-item[data-report-target="'+cssEscape(id)+'"]');
      if(launcher)label=(launcher.querySelector('b')?.textContent||launcher.textContent||id).trim();
      else label=(el.getAttribute('aria-label')||el.querySelector('.section-title')?.textContent||id).trim();
      defs.set(id,label.replace(/\s+/g,' '));
    });
    return defs;
  }

  function syncDynamicReportPermissions(){
    const defs=discoverReportPermissions();
    defs.forEach((label,id)=>{
      if(!ALL_PERMS.includes(id))ALL_PERMS.splice(Math.max(0,ALL_PERMS.length-SYSTEM_PERMS.length),0,id);
    });

    const grid=document.querySelector('#userAdminForm .permissions-grid:not(.system-perms)');
    if(grid){
      defs.forEach((label,id)=>{
        if(grid.querySelector('[data-perm="'+cssEscape(id)+'"]'))return;
        const item=document.createElement('label');
        item.setAttribute('data-auto-report-permission',id);
        const input=document.createElement('input');
        input.type='checkbox';
        input.dataset.perm=id;
        item.appendChild(input);
        item.append(' '+label);
        grid.appendChild(item);
      });
    }
    return defs;
  }

  try{syncDynamicReportPermissions()}catch(err){console.warn('Initial permission discovery skipped:',err)}

  let USERS_CACHE=[];
  let USERS_REMOTE_READY=false;
  let USERS_REMOTE_ERROR='';

  function passwordHash(s){
    s=String(s||''); let h1=0x811c9dc5,h2=0x9e3779b9;
    for(let i=0;i<s.length;i++){
      h1^=s.charCodeAt(i); h1=Math.imul(h1,16777619);
      h2^=(s.charCodeAt(i)+(i<<8)); h2=Math.imul(h2,2246822519);
    }
    return (h1>>>0).toString(16).padStart(8,'0')+(h2>>>0).toString(16).padStart(8,'0');
  }
  function fullPerms(){const o={};ALL_PERMS.forEach(p=>o[p]=true);return o}
  function defaultUsers(){
    return [{username:'EGO',passwordHash:passwordHash('3095'),permissions:fullPerms(),isAdmin:true,active:true}];
  }
  function permissionsToObject(v){
    if(v && !Array.isArray(v) && typeof v==='object'){
      const o={};ALL_PERMS.forEach(p=>o[p]=!!v[p]);return o;
    }
    const set=new Set(Array.isArray(v)?v:[]);
    const o={};ALL_PERMS.forEach(p=>o[p]=set.has(p));return o;
  }
  function permissionsToArray(v){
    const o=permissionsToObject(v);
    return ALL_PERMS.filter(p=>!!o[p]);
  }
  function normalizeRemoteUser(u){
    if(!u)return null;
    return {
      username:String(u.username||'').trim(),
      passwordHash:String(u.passwordHash||''),
      permissions:u.isAdmin?fullPerms():permissionsToObject(u.permissions),
      isAdmin:!!u.isAdmin,
      active:u.active!==false,
      updatedAt:u.updatedAt||''
    };
  }
  function getUsers(){ return USERS_CACHE.slice(); }
  function cacheUsers(a){
    /* SECURITY:
       User metadata may be cached locally, but password hashes must never be
       restored from a previous browser cache. Password validation is central-only. */
    USERS_CACHE=(Array.isArray(a)?a:[]).map(raw=>{
      const u=normalizeRemoteUser(raw);
      if(!u)return null;
      u.passwordHash=''; // never persist reusable credentials in browser cache
      return u;
    }).filter(u=>u&&u.username);

    try{
      const safe=USERS_CACHE.map(u=>({
        username:u.username,
        passwordHash:'',
        permissions:u.permissions,
        isAdmin:u.isAdmin,
        active:u.active,
        updatedAt:u.updatedAt||''
      }));
      localStorage.setItem(USERS_KEY,JSON.stringify(safe));
    }catch(e){}
    return USERS_CACHE;
  }

  function purgeCachedCredentials(username){
    const wanted=String(username||'').trim().toLowerCase();
    try{
      const stored=JSON.parse(localStorage.getItem(USERS_KEY)||'[]');
      if(Array.isArray(stored)){
        stored.forEach(u=>{
          if(!wanted || String(u?.username||'').trim().toLowerCase()===wanted){
            if(u)u.passwordHash='';
          }
        });
        localStorage.setItem(USERS_KEY,JSON.stringify(stored));
      }
    }catch(e){}
    USERS_CACHE.forEach(u=>{
      if(!wanted || String(u?.username||'').trim().toLowerCase()===wanted){
        u.passwordHash='';
      }
    });
  }

  async function fetchWithTimeout(url,options={},timeoutMs=7000){
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),timeoutMs);
    try{
      return await fetch(url,{...options,signal:ctrl.signal});
    }finally{
      clearTimeout(timer);
    }
  }
  async function apiGetUsers(){
    const url=USERS_API_URL+(USERS_API_URL.includes('?')?'&':'?')+'action=users&_='+Date.now();
    const res=await fetchWithTimeout(url,{method:'GET',cache:'no-store',redirect:'follow'},7000);
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    if(!data||data.ok!==true)throw new Error(data?.error||'تعذر قراءة المستخدمين');
    USERS_REMOTE_READY=true;USERS_REMOTE_ERROR='';

    const remote=Array.isArray(data.users)?data.users.slice():[];
    if(!remote.some(u=>String(u?.username||'').toLowerCase()==='ego')){
      remote.unshift(defaultUsers()[0]);
    }
    const cached=cacheUsers(remote);
    try{window.__EGO_RECHECK_USERNAME_VISUAL?.()}catch(e){}
    return cached;
  }

  async function apiGetUsersRaw(){
    const url=USERS_API_URL+(USERS_API_URL.includes('?')?'&':'?')+'action=users&_='+Date.now();
    const res=await fetchWithTimeout(url,{method:'GET',cache:'no-store',redirect:'follow'},7000);
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    if(!data||data.ok!==true)throw new Error(data?.error||'تعذر قراءة المستخدمين');
    return Array.isArray(data.users)?data.users.slice():[];
  }

  function latestAuthoritativeUser(rawUsers,username){
    const wanted=String(username||'').trim().toLowerCase();
    const matches=(Array.isArray(rawUsers)?rawUsers:[])
      .map((u,index)=>({u,index}))
      .filter(x=>String(x.u?.username||'').trim().toLowerCase()===wanted);

    if(!matches.length)return null;

    /* If the Google Sheet contains duplicate rows for the same username,
       ONLY the newest row is authoritative.
       updatedAt wins when present; otherwise the last row in the sheet wins. */
    matches.sort((a,b)=>{
      const at=Date.parse(a.u?.updatedAt||'')||0;
      const bt=Date.parse(b.u?.updatedAt||'')||0;
      if(at!==bt)return at-bt;
      return a.index-b.index;
    });
    return matches[matches.length-1].u||null;
  }

  async function apiPost(payload){
    const res=await fetchWithTimeout(USERS_API_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(payload),
      cache:'no-store',
      redirect:'follow'
    },8000);
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    if(!data||data.ok!==true)throw new Error(data?.error||'فشل الاتصال بخدمة المستخدمين');
    return data;
  }
  async function ensureCentralAdmin(){
    let users=await apiGetUsers();
    if(users.length)return users;
    const admin=defaultUsers()[0];
    await apiPost({
      action:'saveUser',
      user:{
        username:'EGO',
        originalUsername:'EGO',
        passwordHash:admin.passwordHash,
        active:true,
        permissions:ALL_PERMS.slice(),
        isAdmin:true
      }
    });
    users=await apiGetUsers();
    return users;
  }
  async function refreshUsersRemote(){
    try{
      const users=await apiGetUsers();
      if(!users.length){
        // Metadata-only fallback. Login remains central-only.
        cacheUsers(defaultUsers());
      }
      return getUsers();
    }catch(err){
      USERS_REMOTE_ERROR=err?.name==='AbortError'
        ? 'انتهت مهلة الاتصال بخدمة المستخدمين'
        : (err?.message||String(err));
      USERS_REMOTE_READY=false;
      try{
        const old=JSON.parse(localStorage.getItem(USERS_KEY)||'[]');
        if(Array.isArray(old)&&old.length)cacheUsers(old);
      }catch(e){}
      if(!USERS_CACHE.length)cacheUsers(defaultUsers());
      return USERS_CACHE;
    }
  }
  function getCurrentName(){
    return sessionStorage.getItem(CURRENT_KEY)||localStorage.getItem(REMEMBER_KEY)||'';
  }
  function getCurrentUser(){
    const n=getCurrentName().toLowerCase();
    return getUsers().find(u=>u.username.toLowerCase()===n)||null;
  }
  function hasPerm(p){
    const u=getCurrentUser();
    return !!(u&&u.active!==false&&(u.isAdmin||u.permissions?.[p]));
  }
  window.EGOAccess={hasPerm,getCurrentUser,getUsers,refreshUsers:refreshUsersRemote,apiUrl:USERS_API_URL,passwordValidation:'central-login'};
  let reportPermissionSyncTimer=0;
  const reportPermissionObserver=new MutationObserver(()=>{
    clearTimeout(reportPermissionSyncTimer);
    reportPermissionSyncTimer=setTimeout(()=>{
      try{
        const before=ALL_PERMS.length;
        syncDynamicReportPermissions();
        if(ALL_PERMS.length!==before && getCurrentUser())applyPermissions();
      }catch(err){
        console.warn('Dynamic permission sync skipped:',err);
      }
    },80);
  });
  function startPermissionObserver(){
    try{
      if(document.body)reportPermissionObserver.observe(document.body,{childList:true,subtree:true});
    }catch(err){console.warn('Permission observer unavailable:',err)}
  }
  if(document.body)startPermissionObserver();
  else document.addEventListener('DOMContentLoaded',startPermissionObserver,{once:true});


  function setCurrent(user,remember){
    window.__EGO_EXPLICIT_LOGOUT=false;
    sessionStorage.setItem(CURRENT_KEY,user.username);
    if(remember)localStorage.setItem(REMEMBER_KEY,user.username);
    else localStorage.removeItem(REMEMBER_KEY);
    const loginGate=document.getElementById('egoLoginGate');
    document.documentElement.classList.add('ego-authenticated');
    loginGate?.classList.remove('natural-login-exit');

    try{
      applyPermissions();
    }catch(err){
      console.error('Permission UI error after login:',err);
      /* Authentication is already valid. Never return the user to a broken login screen
         just because a report permission element has a UI problem. */
      document.documentElement.classList.add('ego-authenticated');
    }

    /* بعد نجاح تسجيل الدخول يبدأ كل مستخدم من الصفحة الرئيسية دائماً،
       ولا تتم استعادة آخر تقرير كان مفتوحاً قبل تسجيل الخروج. */
    try{
      localStorage.setItem('tireReportActiveView','home');
      if(location.hash && location.hash!=='#home'){
        history.replaceState(null,'',location.pathname+location.search+'#home');
      }
      if(typeof window.openReportView==='function'){
        window.openReportView('home',{noScroll:true,noHash:false});
      }else{
        document.body.classList.add('nav-home');
        document.body.dataset.activeReport='home';
      }
      setTimeout(function(){
        try{
          if(typeof window.openReportView==='function'){
            window.openReportView('home',{noScroll:true,noHash:false});
          }
          window.scrollTo({top:0,left:0,behavior:'auto'});
        }catch(_e){}
      },0);
    }catch(navErr){
      console.warn('Home redirect after login:',navErr);
    }

    /* Natural, quick transition: no loader scene, no progress, no smoke. */
    requestAnimationFrame(()=>{
      loginGate?.classList.add('natural-login-exit');
      setTimeout(()=>{
        loginGate?.classList.add('is-hidden');
        loginGate?.classList.remove('natural-login-exit');
      },260);
    });
  }
  function performLogout(){
    window.__EGO_EXPLICIT_LOGOUT=true;
    sessionStorage.removeItem(CURRENT_KEY);localStorage.removeItem(REMEMBER_KEY);
    document.documentElement.classList.remove('ego-authenticated');
    const loginGate=document.getElementById('egoLoginGate');
    loginGate?.classList.remove('natural-login-exit');
    loginGate?.classList.remove('is-hidden');
    try{window.dispatchEvent(new Event('ego-login-gate-shown'))}catch(e){}
    document.querySelector('.current-user-pill')?.remove();
    document.getElementById('egoUsername').value='';
    document.getElementById('egoPassword').value='';
    try{updateUsernameVisualState()}catch(e){}
    setTimeout(()=>document.getElementById('egoUsername')?.focus(),40);
  }
  function setHidden(el,hide){if(el)el.classList.toggle('permission-hidden',!!hide)}
  function applyPermissions(){
    const u=getCurrentUser();if(!u)return;
    document.querySelector('.current-user-pill')?.remove();
    const status=document.querySelector('.status');
    if(status){
      const p=document.createElement('span');p.className='pill current-user-pill';
      p.textContent='المستخدم: '+u.username;status.prepend(p);
    }
    const reportDefs=syncDynamicReportPermissions();
    reportDefs.forEach((label,target)=>{
      document.querySelectorAll('[data-report-target="'+cssEscape(target)+'"]').forEach(x=>setHidden(x,!hasPerm(target)));
      setHidden(document.getElementById(target),!hasPerm(target));
      document.querySelectorAll('[data-nav-report="'+cssEscape(target)+'"]').forEach(x=>setHidden(x,!hasPerm(target)));
    });
    setHidden(document.getElementById('filterSidebar'),!hasPerm('filters'));
    setHidden(document.getElementById('filterSidebarBackdrop'),!hasPerm('filters'));
    setHidden(document.querySelector('.filters'),!hasPerm('filters'));
    setHidden(document.getElementById('print'),!hasPerm('print'));
    document.querySelectorAll('[data-print-report]').forEach(x=>setHidden(x,!hasPerm('print')));
    setHidden(document.getElementById('exportPdf'),!hasPerm('pdf'));
    document.querySelectorAll('[data-export-pdf]').forEach(x=>setHidden(x,!hasPerm('pdf')));
    setHidden(document.getElementById('userAdminOpen'),!hasPerm('manageUsers'));
    setHidden(document.getElementById('egoLogoutBtn'),false);

    /* Do not force-navigation away from the current report while permissions UI refreshes.
       Unauthorized navigation is already blocked by guardClicks and hidden controls. */
    const active=document.body.dataset.activeReport;
    if(active&&active!=='home'&&!hasPerm(active)){
      console.warn('Active report permission is not currently available:',active);
    }
  }

  function guardClicks(e){
    const btn=e.target.closest('[data-report-target],#print,[data-print-report],#exportPdf,[data-export-pdf],#userAdminOpen');
    if(!btn)return;
    let perm='';
    const target=btn.getAttribute('data-report-target');
    if(target&&target!=='home')perm=target;
    else if(btn.matches('#print,[data-print-report]'))perm='print';
    else if(btn.matches('#exportPdf,[data-export-pdf]'))perm='pdf';
    else if(btn.id==='userAdminOpen')perm='manageUsers';
    if(perm&&!hasPerm(perm)){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      alert('ليس لديك صلاحية لاستخدام هذا الجزء.');
    }
  }

  // User admin UI
  let selectedUser='';
  async function openAdmin(){
    if(!hasPerm('manageUsers'))return;
    document.getElementById('userAdminModal')?.classList.add('open');
    const msg=document.getElementById('userAdminMsg');
    if(msg)msg.textContent='جاري تحميل المستخدمين من Google Sheets...';
    try{
      let remote=await apiGetUsers();
      if(!remote.length){
        if(msg)msg.textContent='جاري إنشاء مدير النظام المركزي لأول مرة...';
        const admin=defaultUsers()[0];
        await apiPost({
          action:'saveUser',
          user:{
            username:'EGO',
            originalUsername:'EGO',
            passwordHash:admin.passwordHash,
            active:true,
            permissions:ALL_PERMS.slice(),
            isAdmin:true
          }
        });
        remote=await apiGetUsers();
      }
      renderUsers();newUser();
      if(msg)msg.textContent='تم تحميل المستخدمين من Google Sheets.';
    }catch(err){
      renderUsers();newUser();
      if(msg)msg.textContent='تعذر الاتصال المركزي الآن: '+(err?.message||String(err));
    }
  }
  function closeAdmin(){document.getElementById('userAdminModal')?.classList.remove('open')}
  function renderUsers(){
    const box=document.getElementById('userAdminList');if(!box)return;
    box.innerHTML=getUsers().map(u=>'<button type="button" class="user-row '+(selectedUser===u.username?'active':'')+'" data-edit-user="'+escapeHtml(u.username)+'"><span><b>'+escapeHtml(u.username)+'</b><br><small>'+(u.isAdmin?'مدير النظام':'مستخدم')+'</small></span><span>›</span></button>').join('');
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function fillForm(u){
    selectedUser=u?.username||'';
    document.getElementById('editUserOriginal').value=u?.username||'';
    document.getElementById('editUsername').value=u?.username||'';
    document.getElementById('editPassword').value='';
    document.querySelectorAll('#userAdminForm [data-perm]').forEach(c=>c.checked=!!(u?.isAdmin||u?.permissions?.[c.dataset.perm]));
    const adminLock=!!u?.isAdmin;
    document.querySelectorAll('#userAdminForm [data-perm]').forEach(c=>c.disabled=adminLock);
    document.getElementById('deleteUserBtn').disabled=adminLock;
    renderUsers();
  }
  function newUser(){
    selectedUser='';
    document.getElementById('editUserOriginal').value='';
    document.getElementById('editUsername').value='';
    document.getElementById('editPassword').value='';
    document.querySelectorAll('#userAdminForm [data-perm]').forEach(c=>{c.checked=false;c.disabled=false});
    ['reportInvoice','reportEquipment','reportSupplier','reportTire','reportActivity','reportTireId','tireLifecycleReport','reportMonthly','supplierInvoicesReport','inventoryReport'].forEach(p=>{
      const c=document.querySelector('#userAdminForm [data-perm="'+p+'"]');if(c)c.checked=true;
    });
    document.getElementById('deleteUserBtn').disabled=true;
    renderUsers();
  }
  async function saveUser(e){
    e.preventDefault();
    const msg=document.getElementById('userAdminMsg');
    const original=document.getElementById('editUserOriginal').value.trim();
    const username=document.getElementById('editUsername').value.trim();
    const password=document.getElementById('editPassword').value;
    if(!username){msg.textContent='اكتب اسم المستخدم.';return}

    await refreshUsersRemote();
    const users=getUsers();
    const duplicate=users.some(u=>u.username.toLowerCase()===username.toLowerCase()&&u.username!==original);
    if(duplicate){msg.textContent='اسم المستخدم موجود بالفعل.';return}

    const perms={};
    document.querySelectorAll('#userAdminForm [data-perm]').forEach(c=>perms[c.dataset.perm]=c.checked);
    const existing=original?users.find(x=>x.username===original):null;
    if(!existing && !password){msg.textContent='اكتب كلمة مرور للمستخدم الجديد.';return}

    const isAdmin=!!existing?.isAdmin;
    const finalUsername=isAdmin?'EGO':username;
    const finalPerms=isAdmin?fullPerms():perms;
    const oldCachedHash=String(existing?.passwordHash||'');
    const newPasswordHash=password?passwordHash(password):'';

    msg.textContent='جاري الحفظ في Google Sheets...';
    try{
      await apiPost({
        action:'saveUser',
        user:{
          username:finalUsername,
          originalUsername:original||finalUsername,
          passwordHash:newPasswordHash,
          active:true,
          permissions:permissionsToArray(finalPerms),
          isAdmin:isAdmin
        }
      });

      /* Immediately invalidate every browser-side copy of the old credential. */
      if(password)purgeCachedCredentials(finalUsername);

      await apiGetUsers();
      selectedUser=finalUsername;
      const saved=getUsers().find(x=>x.username===finalUsername);
      if(saved)fillForm(saved);else renderUsers();

      if(password){
        /* Verify the exact newest row in Google Sheets, not the backend login action,
           because a backend that scans duplicate rows may accept both old and new hashes. */
        const rawUsers=await apiGetUsersRaw();
        const latest=latestAuthoritativeUser(rawUsers,finalUsername);
        if(!latest || String(latest.passwordHash||'')!==newPasswordHash){
          throw new Error('لم يتم اعتماد كلمة المرور الجديدة في أحدث سجل للمستخدم.');
        }

        purgeCachedCredentials(finalUsername);
        msg.textContent='تم تغيير كلمة المرور بنجاح. أحدث سجل فقط هو المعتمد للدخول.';
        msg.style.color='';

        if(getCurrentName().toLowerCase()===finalUsername.toLowerCase()){
          try{localStorage.removeItem(REMEMBER_KEY)}catch(e){}
        }
      }else{
        msg.textContent='تم حفظ المستخدم والصلاحيات في Google Sheets بنجاح.';
        msg.style.color='';
      }
      applyPermissions();
    }catch(err){
      msg.textContent='فشل الحفظ المركزي: '+(err?.message||String(err));
      msg.style.color='';
    }
  }
  async function deleteSelected(){
    const original=document.getElementById('editUserOriginal').value.trim();
    if(!original)return;
    await refreshUsersRemote();
    const u=getUsers().find(x=>x.username===original);
    if(!u||u.isAdmin)return;
    if(!confirm('حذف المستخدم '+u.username+'؟'))return;
    const msg=document.getElementById('userAdminMsg');
    msg.textContent='جاري حذف المستخدم من Google Sheets...';
    try{
      await apiPost({action:'deleteUser',username:original});
      await apiGetUsers();
      newUser();
      msg.textContent='تم حذف المستخدم من Google Sheets.';
    }catch(err){
      msg.textContent='فشل الحذف المركزي: '+(err?.message||String(err));
    }
  }

  function openLogoutConfirm(){
    const modal=document.getElementById('logoutConfirmModal');
    if(!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
  }

  function closeLogoutConfirm(){
    const modal=document.getElementById('logoutConfirmModal');
    if(!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
  }

  function setLoginLoading(on){
    const err=document.getElementById('egoLoginError');
    const button=document.querySelector('#egoLoginForm button[type="submit"]');
    const label=button?.querySelector('span:last-child');

    if(on){
      if(err)err.textContent='';
      button?.setAttribute('aria-busy','true');
      button?.classList.add('login-busy');
      if(label && !button.dataset.originalLabel){
        button.dataset.originalLabel=label.textContent||'تسجيل الدخول';
        label.textContent='جاري الدخول...';
      }
    }else{
      button?.removeAttribute('aria-busy');
      button?.classList.remove('login-busy');
      if(label && button?.dataset.originalLabel){
        label.textContent=button.dataset.originalLabel;
        delete button.dataset.originalLabel;
      }
    }
  }
  function setLoginMessage(message){
    const err=document.getElementById('egoLoginError');
    if(!err)return;
    err.classList.remove('login-loading');
    err.textContent=message||'';
  }

  let liveCredentialTimer=0;
  let liveCredentialSeq=0;

  function applyLiveCredentialVisual(state,credentialState='neutral'){
    const username=document.getElementById('egoUsername');
    const password=document.getElementById('egoPassword');
    const gate=document.getElementById('egoLoginGate');
    const button=document.querySelector('#egoLoginForm button[type="submit"]');
    if(!gate)return;

    window.__EGO_FLUID_AUTH_STATE=state;
    gate.dataset.usernameState=state;
    gate.dataset.credentialState=credentialState;
    if(username)username.dataset.usernameState=state;
    if(password)password.dataset.passwordState=credentialState;
    if(button){
      /* Button mirrors the Fluid:
         username-only valid/invalid already affects it;
         once password is typed the combined credential state wins. */
      const buttonState =
        credentialState==='valid' || credentialState==='invalid'
          ? credentialState
          : (credentialState==='checking' ? 'checking' : state);
      button.dataset.credentialState=buttonState;
    }

    try{
      window.dispatchEvent(new CustomEvent('ego-fluid-auth-state',{detail:{state}}));
    }catch(e){
      try{window.dispatchEvent(new Event('ego-fluid-auth-state'))}catch(_e){}
    }
  }

  function updateUsernameVisualState(){
    clearTimeout(liveCredentialTimer);

    const username=document.getElementById('egoUsername');
    const password=document.getElementById('egoPassword');
    if(!username||!password)return;

    const typed=String(username.value||'').trim();
    const pass=String(password.value||'');

    if(!typed){
      applyLiveCredentialVisual('neutral','neutral');
      return;
    }

    const wanted=typed.toLowerCase();
    const localUser=getUsers().find(u=>
      u && u.active!==false &&
      String(u.username||'').trim().toLowerCase()===wanted
    );

    if(!localUser){
      applyLiveCredentialVisual('invalid',pass?'invalid':'neutral');
      return;
    }

    /* Correct username alone = green Fluid.
       Once a password is typed, the final green/red state is based on BOTH fields. */
    if(!pass){
      applyLiveCredentialVisual('valid','neutral');
      return;
    }

    /* While typing, keep the username indication but don't flash on every keystroke.
       Verification is debounced and uses the newest authoritative Google Sheet row. */
    applyLiveCredentialVisual('valid','checking');
    const seq=++liveCredentialSeq;

    liveCredentialTimer=setTimeout(async()=>{
      try{
        /* IMPORTANT:
           action=users may intentionally omit passwordHash, so comparing hashes from
           the users list can mark a correct password as wrong.
           The live preview now uses the SAME central login check as the real Login button. */
        const data=await apiPost({
          action:'login',
          username:typed,
          passwordHash:passwordHash(pass)
        });
        if(seq!==liveCredentialSeq)return;

        const user=normalizeRemoteUser(data?.user);
        const valid=!!(user && user.active!==false);

        applyLiveCredentialVisual(valid?'valid':'invalid',valid?'valid':'invalid');
      }catch(err){
        if(seq!==liveCredentialSeq)return;

        /* A normal rejected login = wrong credentials (red).
           Connectivity/timeout = neutral, not falsely red. */
        if(err?.name==='AbortError' || /HTTP\s*5\d\d|network|fetch/i.test(String(err?.message||err))){
          applyLiveCredentialVisual('valid','neutral');
        }else{
          applyLiveCredentialVisual('invalid','invalid');
        }
      }
    },520);
  }
  window.__EGO_RECHECK_USERNAME_VISUAL=updateUsernameVisualState;

  async function init(){
    const gate=document.getElementById('egoLoginGate');
    const loginErr=document.getElementById('egoLoginError');

    const usernameInput=document.getElementById('egoUsername');
    if(usernameInput && usernameInput.dataset.liveUserCheckBound!=='1'){
      usernameInput.dataset.liveUserCheckBound='1';
      usernameInput.addEventListener('input',updateUsernameVisualState,{passive:true});
      usernameInput.addEventListener('change',updateUsernameVisualState,{passive:true});
      usernameInput.addEventListener('focus',updateUsernameVisualState,{passive:true});
    }
    const passwordInput=document.getElementById('egoPassword');
    if(passwordInput && passwordInput.dataset.livePasswordCheckBound!=='1'){
      passwordInput.dataset.livePasswordCheckBound='1';
      passwordInput.addEventListener('input',updateUsernameVisualState,{passive:true});
      passwordInput.addEventListener('change',updateUsernameVisualState,{passive:true});
      passwordInput.addEventListener('focus',updateUsernameVisualState,{passive:true});
    }
    updateUsernameVisualState();

    /* فتح الصفحة فورًا وعدم انتظار API. */
    document.documentElement.classList.remove('ego-authenticated');
    gate?.classList.remove('is-hidden');
    if(loginErr)loginErr.textContent='';

    /* Cache محلي فوري كاحتياط فقط. */
    try{
      const old=JSON.parse(localStorage.getItem(USERS_KEY)||'[]');
      if(Array.isArray(old)&&old.length)cacheUsers(old);
    }catch(e){}
    if(!USERS_CACHE.length)cacheUsers(defaultUsers());

    const remembered=getCurrentUser();
    if(remembered && remembered.active!==false){
      setCurrent(remembered,!!localStorage.getItem(REMEMBER_KEY));
    }

    /* مزامنة مركزية في الخلفية. */
    setTimeout(async()=>{
      try{
        await refreshUsersRemote();
        const currentName=getCurrentName();
        if(currentName){
          const fresh=getCurrentUser();
          if(fresh && fresh.active!==false){
            setCurrent(fresh,!!localStorage.getItem(REMEMBER_KEY));
          }else if(USERS_REMOTE_READY){
            /* Never terminate a valid active browser session because a background
               sync returned a temporary/stale user list. Explicit logout remains
               the only action that opens the login screen during this session. */
            console.warn('Central user sync did not return the current user; keeping the active session.');
            document.documentElement.classList.add('ego-authenticated');
            gate?.classList.add('is-hidden');
          }
        }
      }catch(e){}
    },120);

    document.getElementById('egoLoginForm')?.addEventListener('submit',async function(e){
      e.preventDefault();

      const n=document.getElementById('egoUsername').value.trim();
      const p=document.getElementById('egoPassword').value;

      if(!n||!p){
        setLoginMessage('اكتب اسم المستخدم وكلمة المرور.');
        return;
      }

      setLoginLoading(true);
      try{
        const data=await apiPost({
          action:'login',
          username:n,
          passwordHash:passwordHash(p)
        });

        const user=normalizeRemoteUser(data?.user);
        if(!user){
          setLoginMessage('اسم المستخدم أو كلمة المرور غير صحيحة.');
          return;
        }
        if(user.active===false){
          setLoginMessage('هذا المستخدم غير نشط.');
          return;
        }

        /* Cache metadata only; authentication itself remains central. */
        user.passwordHash='';
        const others=getUsers().filter(
          x=>x.username.toLowerCase()!==user.username.toLowerCase()
        );
        cacheUsers([user,...others]);

        setLoginMessage('');
        setCurrent(user,document.getElementById('egoRemember').checked);
        setTimeout(()=>refreshUsersRemote().catch(()=>{}),250);
      }catch(ex){
        setLoginMessage(
          ex?.name==='AbortError'
            ? 'تعذر الاتصال بنظام المستخدمين. تحقق من الإنترنت ثم حاول مرة أخرى.'
            : (ex?.message||'اسم المستخدم أو كلمة المرور غير صحيحة.')
        );
      }finally{
        setLoginLoading(false);
      }
    });

    document.getElementById('egoLogoutBtn')?.addEventListener('click',openLogoutConfirm);
    document.getElementById('logoutConfirmYes')?.addEventListener('click',function(){
      closeLogoutConfirm();
      performLogout();
    });
    document.querySelectorAll('[data-logout-cancel]').forEach(x=>x.addEventListener('click',closeLogoutConfirm));

    document.addEventListener('click',guardClicks,true);
    document.getElementById('userAdminOpen')?.addEventListener('click',openAdmin);
    document.querySelectorAll('[data-user-admin-close]').forEach(x=>x.addEventListener('click',closeAdmin));
    document.getElementById('newUserBtn')?.addEventListener('click',newUser);
    document.getElementById('userAdminForm')?.addEventListener('submit',saveUser);
    document.getElementById('deleteUserBtn')?.addEventListener('click',deleteSelected);
    document.getElementById('userAdminList')?.addEventListener('click',e=>{
      const b=e.target.closest('[data-edit-user]');
      if(!b)return;
      const u=getUsers().find(x=>x.username===b.dataset.editUser);
      if(u)fillForm(u);
    });

    document.addEventListener('keydown',function(e){
      if(e.key!=='Escape')return;
      closeLogoutConfirm();
      closeAdmin();
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();
