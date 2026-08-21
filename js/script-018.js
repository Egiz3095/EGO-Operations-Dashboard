
(function(){
  const API_STORAGE='ego-google-filter-api-url-v1';
  const SHEET_NAME='الكفرات';
  const TIMEOUT=12000;

  window.SOURCE_SHEET_FILTER={
    connected:false,
    active:false,
    visibleIds:[],
    visibleIdsSet:null,
    criteria:[],
    range:'',
    visibleRows:0,
    hiddenRows:0,
    checkedAt:null,
    error:''
  };

  function esc2(s){
    return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function getApiUrl(){
    try{
      const saved=String(localStorage.getItem(API_STORAGE)||'').trim();
      return saved || 'https://script.google.com/macros/s/AKfycbzYriC6QyutbQghxfUmk9RVqHrMhA4-0u7LQaY39DR2wEC71NSAo5LQ50oJzBK_nv2_/exec';
    }catch(e){return 'https://script.google.com/macros/s/AKfycbzYriC6QyutbQghxfUmk9RVqHrMhA4-0u7LQaY39DR2wEC71NSAo5LQ50oJzBK_nv2_/exec'}
  }
  function setApiUrl(v){
    try{localStorage.setItem(API_STORAGE,String(v||'').trim())}catch(e){}
  }
  async function fetchFilterState(url){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),TIMEOUT);
    try{
      const sep=url.includes('?')?'&':'?';
      const finalUrl=url+sep+'action=filterState&sheet='+encodeURIComponent(SHEET_NAME)+'&_='+Date.now();
      const r=await fetch(finalUrl,{
        method:'GET',
        cache:'no-store',
        credentials:'omit',
        redirect:'follow',
        signal:controller.signal
      });
      if(!r.ok) throw new Error('HTTP '+r.status);
      const text=await r.text();
      let data;
      try{data=JSON.parse(text)}catch(e){throw new Error('استجابة Apps Script ليست JSON صالحًا')}
      return data;
    }finally{
      clearTimeout(timer);
    }
  }
  function criteriaText(c){
    const bits=[];
    if(c.hiddenValues?.length){
      const shown=c.hiddenValues.filter(v=>String(v).trim()!=='').slice(0,5);
      if(shown.length)bits.push('قيم مخفية: '+shown.join('، ')+(c.hiddenValues.length>shown.length?'…':''));
      if(c.hiddenValues.some(v=>String(v).trim()===''))bits.push('القيم الفارغة مخفية');
    }
    if(c.criteriaType)bits.push(String(c.criteriaType).replace(/^BooleanCriteria\./,''));
    if(c.condition?.type)bits.push('شرط: '+String(c.condition.type));
    return bits.join(' — ')||'فلتر نشط على هذا العمود';
  }
  function updateStatus(){
    const st=document.getElementById('sheetFilterBridgeStatus');
    const tx=document.getElementById('sheetFilterBridgeText');
    const f=window.SOURCE_SHEET_FILTER;
    if(!st||!tx)return;
    st.classList.remove('connected','active','error');
    if(f.error){st.classList.add('error');tx.textContent='فلتر صفحة الإدخال: تعذر الاتصال';return}
    if(!f.connected){tx.textContent='فلتر صفحة الإدخال: غير مربوط';return}
    if(f.active){
      st.classList.add('active');
      const cols=(f.criteria||[]).map(c=>c.header).filter(Boolean);
      tx.textContent=`فلتر صفحة الإدخال: نشط — ${f.visibleRows} ظاهر / ${f.hiddenRows} مخفي${cols.length?' — الأعمدة: '+cols.join('، '):''}`;
    }else{
      st.classList.add('connected');
      tx.textContent='فلتر صفحة الإدخال: متصل — لا يوجد فلتر نشط';
    }
  }
  function updateSourceNotice(){
    const el=document.getElementById('sourceFilterAppliedNotice');
    const f=window.SOURCE_SHEET_FILTER;
    if(!el)return;
    const loggedIn=document.documentElement.classList.contains('ego-authenticated');
    if(!loggedIn || !f?.connected || !f?.active){el.classList.remove('show');el.innerHTML='';return}
    const criteria=(f.criteria||[]);
    el.classList.add('show');
    const details=criteria.length
      ? '<div class="source-filter-columns">'+criteria.map(c=>`<span><b>${esc2(c.header||'عمود')}</b><small>${esc2(criteriaText(c))}</small></span>`).join('')+'</div>'
      : '';
    el.innerHTML=`<b>فلتر صفحة الإدخال نشط</b> — تم اكتشاف فلتر في Google Sheets سواء كان مفعّلًا قبل تسجيل الدخول أو أثناء استخدام التقرير. السجلات الظاهرة: <b>${f.visibleRows}</b>، المخفية: <b>${f.hiddenRows}</b>${details}`;
  }
  function updateLauncher(){
    const btn=document.getElementById('filterSidebarToggle');
    if(!btn)return;
    btn.classList.toggle('source-filter-active',!!window.SOURCE_SHEET_FILTER.active);
    try{window.syncFilterButtonFinal?.()}catch(e){}
  }
  function appendSourceChip(){
    const box=document.getElementById('activeFilterChips');if(!box)return;
    box.querySelectorAll('.source-sheet-filter-chip').forEach(x=>x.remove());
    const f=window.SOURCE_SHEET_FILTER;
    if(!f.active)return;
    const chip=document.createElement('div');
    chip.className='source-sheet-filter-chip';
    const criteria=(f.criteria||[]).map(c=>`${c.header}: ${criteriaText(c)}`).join(' | ');
    chip.innerHTML=`<b>فلتر صفحة الإدخال</b><span>${f.visibleRows} صف ظاهر</span><small>${esc2(criteria||f.range||'فلتر Google Sheets نشط')}</small>`;
    const list=box.querySelector('.filter-chip-list');
    if(list)list.prepend(chip);else box.appendChild(chip);
  }
  function rerender(){
    try{if(typeof render==='function')render()}catch(e){}
    try{window.renderInventoryReport?.()}catch(e){}
    try{window.refreshInventoryEnhancements?.()}catch(e){}
    setTimeout(()=>{appendSourceChip();updateLauncher();updateStatus();updateSourceNotice()},0);
  }
  async function refreshSourceFilterState(silent=false){
    const url=getApiUrl();
    if(!url){
      Object.assign(window.SOURCE_SHEET_FILTER,{connected:false,active:false,visibleIds:[],visibleIdsSet:null,criteria:[],error:''});
      updateStatus();updateLauncher();appendSourceChip();
      return false;
    }
    try{
      const data=await fetchFilterState(url);
      if(!data?.ok)throw new Error(data?.error||'رد غير صالح');
      const ids=(data.visibleIds||[]).map(x=>String(x).trim()).filter(Boolean);
      const meaningfulCriteria=(data.criteria||[]).some(c=>{
        const hidden=(c.hiddenValues||[]).some(v=>String(v??'').trim()!=='') ||
                     (c.hiddenValues||[]).some(v=>String(v??'').trim()==='');
        const condition=!!(c.condition && (c.condition.type || Object.keys(c.condition||{}).length));
        const criteriaType=!!c.criteriaType;
        return hidden || condition || criteriaType;
      });
      const trulyActive=Number(data.hiddenRows||0)>0 || meaningfulCriteria;
      Object.assign(window.SOURCE_SHEET_FILTER,{
        connected:true,
        active:trulyActive,
        visibleIds:ids,
        visibleIdsSet:trulyActive?new Set(ids):null,
        criteria:data.criteria||[],
        range:data.range||'',
        visibleRows:Number(data.visibleRows||0),
        hiddenRows:Number(data.hiddenRows||0),
        checkedAt:data.checkedAt||null,
        error:''
      });
      rerender();
      setTimeout(()=>window.notifyLiveDataChanged?.('source-filter'),0);
      return true;
    }catch(e){
      Object.assign(window.SOURCE_SHEET_FILTER,{connected:false,active:false,visibleIds:[],visibleIdsSet:null,criteria:[],error:String(e?.message||e)});
      updateStatus();updateLauncher();appendSourceChip();
      if(!silent){
        const msg=document.getElementById('sheetFilterSetupMessage');
        if(msg){msg.className='sheet-filter-setup-message error';msg.textContent='فشل الاتصال: '+window.SOURCE_SHEET_FILTER.error}
      }
      return false;
    }
  }
  window.refreshSourceSheetFilter=refreshSourceFilterState;

  function openSetup(){
    const modal=document.getElementById('sheetFilterSetupModal');
    const input=document.getElementById('sheetFilterApiUrlInput');
    if(input)input.value=getApiUrl();
    modal?.classList.add('open');modal?.setAttribute('aria-hidden','false');
    setTimeout(()=>input?.focus(),50);
  }
  function closeSetup(){
    const modal=document.getElementById('sheetFilterSetupModal');
    modal?.classList.remove('open');modal?.setAttribute('aria-hidden','true');
  }
  async function saveSetup(){
    const input=document.getElementById('sheetFilterApiUrlInput');
    const msg=document.getElementById('sheetFilterSetupMessage');
    const v=String(input?.value||'').trim();
    if(!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/i.test(v)){
      if(msg){msg.className='sheet-filter-setup-message error';msg.textContent='الصق رابط Web App الذي ينتهي بـ /exec.'}
      return;
    }
    setApiUrl(v);
    const diag=document.getElementById('sheetFilterDiagUrl');if(diag)diag.textContent=v;
    if(msg){msg.className='sheet-filter-setup-message';msg.textContent='جاري اختبار الاتصال…'}
    const ok=await refreshSourceFilterState(true);
    if(ok){
      if(msg){msg.className='sheet-filter-setup-message ok';msg.textContent=window.SOURCE_SHEET_FILTER.active?'تم الربط واكتشاف فلتر نشط بنجاح.':'تم الربط بنجاح، ولا يوجد فلتر نشط حاليًا.'}
      setTimeout(closeSetup,900);
    }else{
      if(msg){msg.className='sheet-filter-setup-message error';msg.textContent='تعذر الاتصال. تأكد أن النشر Web App وأن الوصول مسموح للمستخدمين المناسبين.'}
    }
  }

  function hookExistingFilterChips(){
    const old=window.renderFilterChips;
    if(typeof old==='function' && !old.__egoSourceWrapped){
      const wrapped=function(){const r=old.apply(this,arguments);setTimeout(appendSourceChip,0);return r};
      wrapped.__egoSourceWrapped=true;
      window.renderFilterChips=wrapped;
    }
  }
  function hookRefreshButton(){
    document.getElementById('refresh')?.addEventListener('click',()=>setTimeout(()=>refreshSourceFilterState(true),150),true);
    document.getElementById('smartRefresh')?.addEventListener('click',()=>setTimeout(()=>refreshSourceFilterState(true),150),true);
  }

  function init(){
    try{if(!localStorage.getItem(API_STORAGE))localStorage.setItem(API_STORAGE,'https://script.google.com/macros/s/AKfycbzYriC6QyutbQghxfUmk9RVqHrMhA4-0u7LQaY39DR2wEC71NSAo5LQ50oJzBK_nv2_/exec')}catch(e){}
    hookExistingFilterChips();
    hookRefreshButton();
    document.getElementById('sheetFilterBridgeSetup')?.addEventListener('click',openSetup);
    document.getElementById('sheetFilterApiSave')?.addEventListener('click',saveSetup);
    document.querySelectorAll('[data-sheet-filter-setup-close]').forEach(x=>x.addEventListener('click',closeSetup));
    const diag=document.getElementById('sheetFilterDiagUrl');if(diag)diag.textContent=getApiUrl();
    updateStatus();
    refreshSourceFilterState(true);
    setInterval(()=>{if(document.visibilityState==='visible')refreshSourceFilterState(true)},30000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
