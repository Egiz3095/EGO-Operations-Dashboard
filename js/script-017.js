
(function(){
 const SHEET_FILTER_MAX_KEY='ego-sheet-max-row-count-v1';
 const SHEET_FILTER_WARN_KEY='ego-sheet-filter-warning-dismissed-session';

 function activeGeneralFilterCount(){
   const ids=['search','from','to','activity','equipment','supplier','invoice','tire','tireId','inventoryStatus'];
   return ids.reduce((n,id)=>{const e=document.getElementById(id);return n+(e&&String(e.value||'').trim()?1:0)},0);
 }
 function updateFilterGlow(){
   const btn=document.getElementById('filterSidebarToggle');if(!btn)return;
   const count=activeGeneralFilterCount();
   btn.classList.toggle('filters-active',count>0);
   btn.removeAttribute('data-filter-count');
   btn.title=count?`الفلاتر — ${count} فلتر نشط`:'فتح الفلاتر';
 }

 function openSourceWarning(text){
   if(!document.documentElement.classList.contains('ego-authenticated')) return;
   if(window.SOURCE_SHEET_FILTER?.connected) return;
   if(sessionStorage.getItem(SHEET_FILTER_WARN_KEY)==='1')return;
   const m=document.getElementById('sourceFilterWarning'),p=document.getElementById('sourceFilterWarningText');
   if(p&&text)p.textContent=text;
   if(m){m.classList.add('open');m.setAttribute('aria-hidden','false')}
 }
 function closeSourceWarning(){
   const m=document.getElementById('sourceFilterWarning');
   if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true')}
   sessionStorage.setItem(SHEET_FILTER_WARN_KEY,'1');
 }
 document.querySelectorAll('[data-source-warning-close]').forEach(x=>x.addEventListener('click',closeSourceWarning));

 /* Google Sheets filtering cannot be read reliably by the public GViz endpoint.
    We still monitor suspicious row-count drops; if direct verification is blocked,
    the user receives the requested center-screen warning. */
 async function checkSourceFilterState(rowCount){
   let oldMax=Number(localStorage.getItem(SHEET_FILTER_MAX_KEY)||0);
   if(rowCount>oldMax){oldMax=rowCount;localStorage.setItem(SHEET_FILTER_MAX_KEY,String(rowCount))}
   if(oldMax>0 && rowCount>0 && rowCount<oldMax*.82){
     openSourceWarning(`تنبيه: تم تحميل ${rowCount} سجل فقط بينما سبق أن وصل التقرير إلى ${oldMax} سجل. قد يكون هناك فلتر نشط في صفحة الإدخال Google Sheets. افتح صفحة الإدخال وأزل الفلتر ثم حدّث البيانات.`);
     return;
   }
   try{
     const url=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/htmlview?cacheBust=${Date.now()}`;
     const r=await fetch(url,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store'});
     if(!r.ok)throw new Error('status');
     const txt=await r.text();
     const likely=/filter-view|waffle-filter|filterMenu|فلتر/i.test(txt);
     if(likely)openSourceWarning('تنبيه: توجد مؤشرات على وجود فلتر في صفحة الإدخال. التقرير سيحاول تحميل البيانات المتاحة، لكن يفضل إزالة فلتر Google Sheets لضمان ظهور كل السجلات.');
   }catch(e){
     openSourceWarning('تعذر على التقرير قراءة حالة فلتر صفحة الإدخال مباشرة بسبب قيود Google Sheets. إذا كان هناك فلتر نشط في صفحة الإدخال، قم بإزالته ثم اضغط «تحديث البيانات» لضمان مزامنة جميع السجلات.');
   }
 }

 function syncLocalFromGlobal(){
   const pairs=[['inventoryLocalSearch','search'],['inventoryLocalStatus','inventoryStatus'],['inventoryLocalSupplier','supplier'],['inventoryLocalInvoice','invoice']];
   pairs.forEach(([l,g])=>{const le=document.getElementById(l),ge=document.getElementById(g);if(le&&ge&&le.value!==ge.value)le.value=ge.value});
 }
 function syncGlobalFromLocal(localId,globalId){
   const l=document.getElementById(localId),g=document.getElementById(globalId);if(!l||!g)return;
   g.value=l.value;
   g.dispatchEvent(new Event(g.tagName==='INPUT'?'input':'change',{bubbles:true}));
   try{if(typeof render==='function')render()}catch(e){}
   try{window.renderInventoryReport?.()}catch(e){}
   try{window.syncAllFilterBadges?.()}catch(e){}
   updateFilterGlow();
 }
 function fillInventoryLocalOptions(){
   [['inventoryLocalSupplier','supplier'],['inventoryLocalInvoice','invoice']].forEach(([local,global])=>{
     const l=document.getElementById(local),g=document.getElementById(global);if(!l||!g)return;
     const old=g.value;
     l.innerHTML=[...g.options].map(o=>`<option value="${String(o.value).replace(/"/g,'&quot;')}">${o.textContent}</option>`).join('');
     l.value=old;
   });
   syncLocalFromGlobal();
 }

 function getInventoryIssues(){
   const a=window.getSupplierInvoiceData?.()||[],issues=[];
   a.forEach(x=>{
     (x.unmatchedWithdrawals||[]).forEach(w=>issues.push({
       invoice:x.invoice||w.invoice||'—',supplier:x.supplier||w.supplier||'—',
       item:w.tire_type||'غير محدد',
       reason:x.rows?.length?'اسم صنف المسحوب لا يطابق «إسم الصنف» المسجل في الفاتورة':'رقم الفاتورة موجود في المسحوبات وغير موجود في ورقة فواتير الموردين',
       fix:x.rows?.length?'وحّد كتابة اسم الصنف في ورقة «الكفرات» مع اسم الصنف في «فواتير الموردين» لنفس رقم الفاتورة.':'أضف الفاتورة وكميتها في ورقة «فواتير الموردين» أو صحح رقم الفاتورة في المسحوب.'
     }));
     (x.itemGroups||[]).filter(g=>Number(g.remaining)<0).forEach(g=>issues.push({
       invoice:x.invoice||'—',supplier:x.supplier||'—',item:g.item||'غير محدد',
       reason:`المسحوبات (${g.withdrawn}) أكبر من الكمية الواردة (${g.qty})`,
       fix:'راجع كمية الفاتورة أو رقم الفاتورة المرتبط بالمسحوبات، ثم صحح الكمية/الربط في Google Sheets.'
     }));
   });
   return issues;
 }
 function renderInventoryIssues(){
   const box=document.getElementById('inventoryProblemList');if(!box)return;
   const issues=getInventoryIssues();
   box.innerHTML=issues.length?issues.slice(0,50).map(x=>`<div class="inventory-problem-row"><div><b>الفاتورة</b><br><span>${esc(x.invoice)}</span></div><div><b>المورد</b><br><span>${esc(x.supplier)}</span></div><div><b>مصدر المشكلة</b><br><span>${esc(x.item)} — ${esc(x.reason)}</span></div><div><b>الإجراء المقترح</b><br><span>${esc(x.fix)}</span></div></div>`).join(''):'<div class="inventory-problem-ok">✓ لا توجد حاليًا مشاكل مطابقة أو سحب زائد في المخزون ضمن البيانات المحملة.</div>';
 }

 function renderInventoryHomeMini(){
   const raw=window.getSupplierInvoiceRawData?.()||[];
   const data=(typeof inventoryFilteredData==='function'?inventoryFilteredData():(typeof buildInventory==='function'?buildInventory():[]))||[];
   if(!raw.length){
     const k=document.getElementById('homeMiniKpis_inventoryReport');
     if(k)k.innerHTML=[['الأصناف','…'],['المتبقي','…'],['تنبيهات','…']].map(([l,v])=>`<div class="home-mini-kpi"><span>${l}</span><strong>${v}</strong></div>`).join('');
     const c=document.getElementById('homeMiniChart_inventoryReport');
     if(c)c.innerHTML='<div class="home-mini-empty">جاري تحميل بيانات المخزون…</div>';
     return;
   }
   const incoming=data.reduce((s,x)=>s+(Number(x.incoming)||0),0);
   const used=data.reduce((s,x)=>s+(Number(x.used)||0),0);
   const remain=data.reduce((s,x)=>s+(Number(x.remain)||0),0);
   const alerts=data.filter(x=>{const s=stockStatus(x)[0];return s!=='ok'}).length;
   const k=document.getElementById('homeMiniKpis_inventoryReport');
   if(k)k.innerHTML=[
     ['الأصناف',data.length],['المتبقي',remain.toLocaleString('en-US',{maximumFractionDigits:1})],['تنبيهات',alerts]
   ].map(([l,v])=>`<div class="home-mini-kpi"><span>${l}</span><strong>${v}</strong></div>`).join('');
   const c=document.getElementById('homeMiniChart_inventoryReport');if(c){
     const vals=[['الوارد',incoming,'inv-in'],['المسحوب',used,'inv-out'],['المتبقي',Math.max(0,remain),'inv-rem']],mx=Math.max(1,...vals.map(x=>x[1]));
     c.innerHTML='<div class="home-mini-bars">'+vals.map(([n,v,cl])=>`<div class="home-mini-row"><span class="home-mini-label">${n}</span><div class="home-mini-track"><div class="home-mini-fill ${cl}" style="width:${Math.max(3,v/mx*100)}%"></div></div><strong class="home-mini-value">${Number(v).toLocaleString('en-US',{maximumFractionDigits:1})}</strong></div>`).join('')+'</div>';
   }
 }

 function refreshEnhancements(){
   updateFilterGlow();syncLocalFromGlobal();fillInventoryLocalOptions();renderInventoryIssues();renderInventoryHomeMini();
 }

 function init(){
   document.querySelector('.filters')?.addEventListener('input',()=>setTimeout(refreshEnhancements,0),true);
   document.querySelector('.filters')?.addEventListener('change',()=>setTimeout(refreshEnhancements,0),true);
   document.getElementById('inventoryLocalSearch')?.addEventListener('input',()=>syncGlobalFromLocal('inventoryLocalSearch','search'));
   document.getElementById('inventoryLocalStatus')?.addEventListener('change',()=>syncGlobalFromLocal('inventoryLocalStatus','inventoryStatus'));
   document.getElementById('inventoryLocalSupplier')?.addEventListener('change',()=>syncGlobalFromLocal('inventoryLocalSupplier','supplier'));
   document.getElementById('inventoryLocalInvoice')?.addEventListener('change',()=>syncGlobalFromLocal('inventoryLocalInvoice','invoice'));
   document.getElementById('inventoryLocalClear')?.addEventListener('click',()=>{
     ['search','supplier','invoice','inventoryStatus'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});
     try{if(typeof render==='function')render()}catch(e){}
     try{window.renderInventoryReport?.()}catch(e){}
     try{window.syncAllFilterBadges?.()}catch(e){}
     refreshEnhancements();
   });
   const state=document.getElementById('rowsStatus');
   if(state&&window.MutationObserver)new MutationObserver(()=>setTimeout(()=>{
     const m=(state.textContent||'').match(/(\d+)\s*سجل/);
     if(m)checkSourceFilterState(Number(m[1]));
     updateFilterGlow();
   },120)).observe(state,{childList:true,subtree:true,characterData:true});
   setTimeout(()=>{
     updateFilterGlow();
     checkSourceFilterState(Array.isArray(DATA)?DATA.length:0);
     if(document.getElementById('inventoryReport')?.classList.contains('nav-report-active'))refreshEnhancements();
   },900);
 }
 window.refreshInventoryEnhancements=refreshEnhancements;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
