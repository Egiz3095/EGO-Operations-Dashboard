
const SHEET_ID='1zS953o00zxuTDJt1usLoBDtYMd0EZ-xNWA5khKmZKWc';
const VAT=.15, AUTO=10000;
let DATA=[{"id":1,"date":"2026-05-01","plate":"ا ص ق 5282","vehicle":"وايت فوسو","driver":"بلال أختر","activity":"مصنع الباحة","position":"دنقل خلفي يمين خارجي","operation":"جديد","tire_type":"315/80/22.5 صيني خلفي","tire_id":"10001","odometer":"67773","photo_status":"لم يتم التصوير"},{"id":2,"date":"2026-05-01","plate":"ا ص ق 5282","vehicle":"وايت فوسو","driver":"بلال أختر","activity":"مصنع الباحة","position":"دنقل خلفي يمين داخلي","operation":"جديد","tire_type":"315/80/22.5 صيني خلفي","tire_id":"10002","odometer":"67773","photo_status":"لم يتم التصوير"},{"id":3,"date":"2026-05-01","plate":"ا ص ق 5282","vehicle":"وايت فوسو","driver":"بلال أختر","activity":"مصنع الباحة","position":"دنقل خلفي يسار خارجي","operation":"جديد","tire_type":"315/80/22.5 صيني خلفي","tire_id":"10003","odometer":"67773","photo_status":"لم يتم التصوير"},{"id":4,"date":"2026-05-01","plate":"ا ص ق 5282","vehicle":"وايت فوسو","driver":"بلال أختر","activity":"مصنع الباحة","position":"دنقل خلفي يسار داخلي","operation":"جديد","tire_type":"315/80/22.5 صيني خلفي","tire_id":"10004","odometer":"67773","photo_status":"لم يتم التصوير"},{"id":5,"date":"2026-05-09","plate":"أ ن ب 3004","vehicle":"خلاطة افيكو","driver":"ياسين","activity":"مصنع زحل","position":"دنقل خلفي يمين خارجي","operation":"جديد","tire_type":"315/80/22.5 صيني خلفي","tire_id":"10005","odometer":"466434","photo_status":"تم التصوير"}], loading=false, lastGood=null;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const num=x=>{let n=Number(String(x??'').replace(/,/g,''));return Number.isFinite(n)?n:0};
const money=x=>num(x).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const sar=x=>money(x)+' SAR';
const uniq=a=>[...new Set(a.filter(Boolean).map(String))];
const datefmt=x=>x?new Date(x+'T00:00:00').toLocaleDateString('en-GB'):'—';

function normalizeDate(raw){
 if(!raw)return null;let s=String(raw).trim(),m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
 if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
 m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return `${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
 let d=new Date(s);return isNaN(d)?s:d.toISOString().slice(0,10)
}
function cellStr(c){if(!c)return '';if(c.f!==undefined&&c.f!==null&&c.f!=='')return String(c.f).trim();return c.v==null?'':String(c.v).trim()}
function cellDate(c){if(!c)return null;if(typeof c.v==='string'){let m=c.v.match(/^Date\((\d+),(\d+),(\d+)/);if(m)return `${m[1]}-${String(+m[2]+1).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`}return normalizeDate(cellStr(c))}
function findCol(cols,cands){let n=s=>String(s||'').replace(/\s+/g,'').trim();for(let c of cands){let i=cols.findIndex(h=>n(h)===n(c));if(i>=0)return i}return -1}
function parsePrice(v){let s=String(v??'').replace(/[^\d.,-]/g,'').replace(/,/g,'');let n=parseFloat(s);return Number.isFinite(n)?n:null}
function parseTable(t){
 if(!t?.cols||!t?.rows)return [];
 const cols=t.cols.map(c=>(c.label||'').trim());
 const I={
  m:findCol(cols,['م']),date:findCol(cols,['التاريخ']),plate:findCol(cols,['رقم اللوحة - التعريف']),
  vehicle:findCol(cols,['المعدة/السيارة']),driver:findCol(cols,['السائق']),activity:findCol(cols,['النشاط']),
  position:findCol(cols,['موضع الكفر']),operation:findCol(cols,['العملية']),type:findCol(cols,['نوع الكفر ومقاسه']),
  tire:findCol(cols,['هوية الكفر','هوية للكفر','هويةالكفر','رقم هوية الكفر','رقم الكفر']),odo:findCol(cols,['قراءة العداد']),photo:findCol(cols,['حالة التصوير']),
  supplier:findCol(cols,['المورد','اسم المورد','رقم المورد','كود المورد']),
  invoice:findCol(cols,['رقم الفاتورة','الفاتورة','رقم فاتورة']),
  price:findCol(cols,['سعر الكفر ( ق.ض.م)','سعر الكفر (ق.ض.م)','سعر الكفر ق.ض.م','السعر','سعر الوحدة','سعر الكفر'])
 };
 return t.rows.map((r,i)=>{let c=r.c||[];return {
  id:cellStr(c[I.m])||String(i+1),date:cellDate(c[I.date]),plate:cellStr(c[I.plate]),vehicle:cellStr(c[I.vehicle]),
  driver:cellStr(c[I.driver]),activity:cellStr(c[I.activity]),position:cellStr(c[I.position]),operation:cellStr(c[I.operation]),
  tire_type:cellStr(c[I.type]),tire_id:cellStr(c[I.tire]),odometer:cellStr(c[I.odo]),photo_status:cellStr(c[I.photo]),
  supplier:I.supplier>=0?cellStr(c[I.supplier]):'',invoice:I.invoice>=0?cellStr(c[I.invoice]):'',
  price:I.price>=0?parsePrice(c[I.price]?.v??c[I.price]?.f):null
 }}).filter(x=>x.date||x.plate)
}
function loadSheet(){
 return new Promise((resolve,reject)=>{const cb='g_'+Date.now()+'_'+Math.random().toString(36).slice(2),s=document.createElement('script');let done=false;
  const clean=()=>{delete window[cb];s.remove()};
  window[cb]=r=>{if(done)return;done=true;clean();r?.status==='error'?reject(Error('خطأ في الشيت')):resolve(r)};
  s.onerror=()=>{if(done)return;done=true;clean();reject(Error('فشل الاتصال'))};
  s.src=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:${cb}&headers=1&t=${Date.now()}`;
  document.head.appendChild(s);setTimeout(()=>{if(!done){done=true;clean();reject(Error('انتهت المهلة'))}},15000)
 })
}
let __FILTER_CACHE={sig:'',rows:[]};
function dashboardFilterSignature(){
 const ids=['search','from','to','activity','equipment','supplier','invoice','tire','tireId','position'];
 const vals=ids.map(id=>String(document.getElementById(id)?.value||'')).join('\u001f');
 const sf=window.SOURCE_SHEET_FILTER||{};
 const sourceSig=[sf.active?1:0,sf.visibleIdsSet?.size||0,sf.checkedAt||sf.time||''].join(':');
 const first=DATA?.[0]?.id||'',last=DATA?.[DATA.length-1]?.id||'';
 return `${DATA?.length||0}|${first}|${last}|${sourceSig}|${vals}`;
}
function invalidateDashboardCaches(){
 __FILTER_CACHE.sig='';
 if(window.__EGO_PERF_CACHE){
   window.__EGO_PERF_CACHE.inventorySig='';
   window.__EGO_PERF_CACHE.alertSig='';
 }
}
window.invalidateDashboardCaches=invalidateDashboardCaches;


function normalizeOperationText(v){
 return String(v??'').trim().toLowerCase()
  .replace(/[\u064B-\u065F\u0670]/g,'')
  .replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي')
  .replace(/\s+/g,' ').trim();
}
function tireOperationKind(v){
 const s=normalizeOperationText(v);
 if(s==='جديد')return 'new';
 if(s==='تبديل')return 'swap';
 if(s==='ركن')return 'park';
 if(s==='اعاده استخدام' || s==='اعادة استخدام')return 'reuse';
 if(s==='انهاء خدمه' || s==='انتهاء خدمه')return 'service_end';
 return 'other';
}
function isOperationalWithdrawal(row){
 const k=tireOperationKind(row?.operation);
 return k==='new'||k==='swap'||k==='reuse';
}
function isPurchaseIssue(row){
 return tireOperationKind(row?.operation)==='new';
}
function isStockReturn(row){
 return tireOperationKind(row?.operation)==='park';
}
function isServiceEnd(row){
 return tireOperationKind(row?.operation)==='service_end';
}
function operationalRows(rows){
 return (Array.isArray(rows)?rows:[]).filter(isOperationalWithdrawal);
}
window.EGOTireOps={
 normalizeOperationText,tireOperationKind,isOperationalWithdrawal,isPurchaseIssue,isStockReturn,isServiceEnd,operationalRows
};

function filters(){
 const sig=dashboardFilterSignature();
 if(__FILTER_CACHE.sig===sig)return __FILTER_CACHE.rows;

 const s=$('#search').value.trim().toLowerCase(),f=$('#from').value,t=$('#to').value,a=$('#activity').value,e=$('#equipment').value,
 sup=$('#supplier').value,inv=$('#invoice').value,tr=$('#tire').value,tid=$('#tireId').value,pos=$('#position')?.value||'';

 const rows=DATA.filter(r=>{
  if(window.SOURCE_SHEET_FILTER?.active && window.SOURCE_SHEET_FILTER?.visibleIdsSet){
    if(!window.SOURCE_SHEET_FILTER.visibleIdsSet.has(String(r.id||'').trim())) return false;
  }
  if(f&&r.date<f)return false;
  if(t&&r.date>t)return false;
  if(a&&r.activity!==a)return false;
  if(e&&r.plate!==e)return false;
  if(sup&&r.supplier!==sup)return false;
  if(inv&&String(r.invoice||'')!==inv)return false;
  if(tr&&r.tire_type!==tr)return false;
  if(tid&&r.tire_id!==tid)return false;
  if(pos&&String(r.position||'').trim()!==String(pos).trim())return false;
  if(s&&!([r.plate,r.vehicle,r.driver,r.activity,r.position,r.operation,r.tire_type,r.tire_id,r.supplier,r.invoice].join(' ').toLowerCase().includes(s)))return false;
  return true
 });
 __FILTER_CACHE={sig,rows};
 return rows;
}
function metrics(a){let before=a.reduce((s,r)=>s+(r.price||0),0),vat=before*VAT;return {
 before,vat,after:before+vat,rows:a.length,equip:uniq(a.map(r=>r.plate)).length,inv:uniq(a.map(r=>r.invoice)).length,avg:a.length?before/a.length:0
}}
function sumBy(a,key){let m=new Map();a.forEach(r=>{let k=String(typeof key==='function'?key(r):r[key]||'غير محدد');m.set(k,(m.get(k)||0)+(r.price||0))});return [...m.entries()].sort((x,y)=>y[1]-x[1])}
function tireIdGroupsAsc(a){
 const groups=sumBy((Array.isArray(a)?a:[]).filter(r=>String(r.tire_id||'').trim()),'tire_id');
 return groups.sort((x,y)=>{
   const ax=String(x[0]||'').trim(), ay=String(y[0]||'').trim();
   const nx=Number(ax), ny=Number(ay);
   if(Number.isFinite(nx)&&Number.isFinite(ny)&&nx!==ny)return nx-ny;
   return ax.localeCompare(ay,'ar',{numeric:true,sensitivity:'base'});
 });
}
function equipmentActivityLabel(plate,rows){
 const p=String(plate??'').trim();
 if(!p)return 'غير محدد';
 const source=Array.isArray(rows)?rows:(typeof filters==='function'?filters():(Array.isArray(DATA)?DATA:[]));
 const acts=uniq(source.filter(r=>String(r.plate??'').trim()===p).map(r=>String(r.activity??'').trim()).filter(Boolean));
 return acts.length?`${p} - ${acts.join(' / ')}`:p;
}
function rowEquipmentActivityLabel(r){
 const p=String(r?.plate??'').trim();
 const a=String(r?.activity??'').trim();
 return p?(a?`${p} - ${a}`:p):'—';
}
function equipmentFullLabel(plate,rows){
 const p=String(plate??'').trim();
 if(!p)return 'غير محدد';
 const source=Array.isArray(rows)?rows:(typeof filters==='function'?filters():(Array.isArray(DATA)?DATA:[]));
 const rs=source.filter(r=>String(r.plate??'').trim()===p);
 const vehicles=uniq(rs.map(r=>String(r.vehicle??'').trim()).filter(Boolean));
 const activities=uniq(rs.map(r=>String(r.activity??'').trim()).filter(Boolean));
 return [p,vehicles.join(' / '),activities.join(' / ')].filter(Boolean).join(' - ');
}
function invoiceFullLabel(invoice,rows){
 const inv=String(invoice??'').trim();
 if(!inv)return 'غير محدد';
 const source=Array.isArray(rows)?rows:(typeof filters==='function'?filters():(Array.isArray(DATA)?DATA:[]));
 const suppliers=uniq(source
   .filter(r=>String(r.invoice??'').trim()===inv)
   .map(r=>String(r.supplier??'').trim())
   .filter(Boolean));
 const supplier=suppliers.join(' / ');
 return supplier?`فاتورة ${supplier} رقم ${inv}`:`فاتورة رقم ${inv}`;
}
function reportDisplayName(name,key,rows){
 if(key==='plate')return equipmentFullLabel(name,rows);
 if(key==='invoice')return invoiceFullLabel(name,rows);
 return String(name??'غير محدد');
}

function renderBars(sel,items,type){
 let el=$(sel),a=items.slice(0,12),mx=Math.max(...a.map(x=>Number(x[1])||0),1),total=a.reduce((s,x)=>s+x[1],0)||1;
 if(!a.length){el.innerHTML='<div class="empty">لا توجد بيانات</div>';return}
 el.innerHTML=`<div class="hchart">
   ${a.map(([k,v],i)=>`
     <div class="hrow" data-type="${type}" data-value="${esc(k)}" title="${esc(k)}">
       <div class="hmeta">
         <span class="hrank">${i+1}</span>
         <span class="hname">${esc(type==='equipment'?equipmentFullLabel(k):type==='invoice'?invoiceFullLabel(k):k)}</span>
         <span class="hpercent">${(v/total*100).toFixed(1)}%</span>
         <strong class="hvalue">${money(v)} SAR</strong>
       </div>
       <div class="htrack">
         <div class="hbar" style="width:${Math.max(2,(v/mx*100))}%">
           <span class="hbarlabel">${esc(type==='equipment'?equipmentFullLabel(k):type==='invoice'?invoiceFullLabel(k):k)}</span>
         </div>
       </div>
     </div>`).join('')}
 </div>`;
 el.querySelectorAll('.hrow').forEach(x=>x.onclick=()=>{
   if(x.dataset.type==='invoice'){
     const activeReport=document.body?.dataset?.activeReport||'home';
     if(activeReport!=='home')window.__EGO_FILTER_REPORT_LOCK={report:activeReport,until:Date.now()+1600};
     $('#invoice').value=x.dataset.value;
     $('#invoice').dispatchEvent(new Event('change',{bubbles:true}));
   }
   if(x.dataset.type==='equipment') $('#equipment').value=x.dataset.value;
   if(x.dataset.type==='supplier') $('#supplier').value=x.dataset.value;
   if(x.dataset.type==='tire') $('#tire').value=x.dataset.value;
   if(x.dataset.type==='activity') $('#activity').value=x.dataset.value;
   if(x.dataset.type==='tireId') $('#tireId').value=x.dataset.value;
   render();
 });
}
function fillOptions(){
 const set=(id,vals,label)=>{let el=$(id),cur=el.value;el.innerHTML=`<option value="">${label}</option>`+uniq(vals).sort((a,b)=>a.localeCompare(b,'ar',{numeric:true})).map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');if([...el.options].some(o=>o.value===cur))el.value=cur};
 set('#activity',DATA.map(r=>r.activity),'كل الأنشطة');set('#equipment',DATA.map(r=>r.plate),'كل المعدات');set('#supplier',DATA.map(r=>r.supplier),'كل الموردين');
 {
   const el=$('#invoice'),cur=el?.value||'';
   if(el){
     const vals=uniq(DATA.map(r=>r.invoice)).sort((a,b)=>String(a).localeCompare(String(b),'ar',{numeric:true}));
     el.innerHTML='<option value="">كل أرقام الفواتير</option>'+vals.map(x=>`<option value="${esc(x)}">${esc(invoiceFullLabel(x,DATA))}</option>`).join('');
     if([...el.options].some(o=>o.value===cur))el.value=cur;
   }
 }
 set('#tire',DATA.map(r=>r.tire_type),'كل أنواع/مقاسات الكفرات');set('#tireId',DATA.map(r=>r.tire_id),'كل هويات الكفرات');set('#position',DATA.map(r=>r.position),'كل مواضع الكفر');
}
function clearExceptInvoice(){
 $('#search').value='';$('#from').value='';$('#to').value='';$('#activity').value='';$('#equipment').value='';$('#supplier').value='';$('#tire').value='';if($('#position'))$('#position').value='';
}
function renderInvoice(a){
 const inv=$('#invoice').value,p=$('#invoicePanel');if(!inv){p.classList.remove('show');p.innerHTML='';return}
 const m=metrics(a),sup=uniq(a.map(r=>r.supplier)),eq=uniq(a.map(r=>rowEquipmentActivityLabel(r))),drivers=uniq(a.map(r=>r.driver)),acts=uniq(a.map(r=>r.activity)),dates=a.map(r=>r.date).filter(Boolean).sort();
 p.classList.add('show');p.innerHTML=`
 <div class="invoice-head"><div><h2>تقرير الفاتورة — جميع المسحوبات</h2><div style="color:#66717d;font-size:11px">كل البيانات المرتبطة بالفاتورة المحددة في نفس الشاشة</div></div><div class="invoice-no">${esc(inv)}</div></div>
 <div class="invoice-kpis">
  <div><b>المورد</b><strong>${esc(sup.join('، ')||'—')}</strong></div><div><b>عدد المسحوبات</b><strong>${a.length}</strong></div>
  <div><b>قبل الضريبة</b><strong>${sar(m.before)}</strong></div><div><b>شامل الضريبة</b><strong>${sar(m.after)}</strong></div>
 </div>
 <div style="font-size:11px;color:#5d6771;margin-bottom:8px">
 المعدات: ${esc(eq.join('، ')||'—')} &nbsp; | &nbsp; السائقون: ${esc(drivers.join('، ')||'—')} &nbsp; | &nbsp; الأنشطة: ${esc(acts.join('، ')||'—')} &nbsp; | &nbsp; الفترة: ${datefmt(dates[0])}${dates.length&&dates.at(-1)!==dates[0]?' — '+datefmt(dates.at(-1)):''}
 </div>`
}
function renderTable(a){
 const sorted=[...a].sort((x,y)=>{
   const dx=String(x.date||''), dy=String(y.date||'');
   if(dx!==dy)return dx.localeCompare(dy);
   // عند تساوي التاريخ: نحافظ على ترتيب مستقر ومفهوم.
   const ix=Number(x.id), iy=Number(y.id);
   if(Number.isFinite(ix)&&Number.isFinite(iy)&&ix!==iy)return ix-iy;
   return String(x.plate||'').localeCompare(String(y.plate||''),'ar',{numeric:true,sensitivity:'base'});
 });
 $('#tbody').innerHTML=sorted.length?sorted.map(r=>`<tr>
  <td>${datefmt(r.date)}</td><td>${esc(rowEquipmentActivityLabel(r))}</td><td>${esc(r.vehicle)}</td><td>${esc(r.driver)}</td><td>${esc(r.activity)}</td>
  <td>${esc(r.position)}</td><td>${esc(r.operation)}</td><td>${esc(r.tire_type)}</td><td class="mono">${esc(r.tire_id)}</td><td class="mono">${esc(r.odometer)}</td>
  <td>${esc(r.supplier)}</td><td class="mono">${esc(r.invoice)}</td><td class="money">${r.price==null?'—':money(r.price)}</td>
 </tr>`).join(''):`<tr><td colspan="13" class="empty">لا توجد نتائج</td></tr>`;
 $('#tableHint').textContent=`عرض ${sorted.length} من أصل ${DATA.length} سجل — مرتب حسب التاريخ من الأقدم إلى الأحدث`
}

function updateDynamicReportTitle(){
 const parts=[];
 const inv=$('#invoice')?.value||'';
 const eq=$('#equipment')?.value||'';
 const act=$('#activity')?.value||'';
 const sup=$('#supplier')?.value||'';
 const tire=$('#tire')?.value||'';
 const tireId=$('#tireId')?.value||'';
 const from=$('#from')?.value||'';
 const to=$('#to')?.value||'';
 const search=$('#search')?.value?.trim()||'';

 let title='متابعة إستهلاك الكفرات والزيوت';

 // Give the most important business filter priority in the title.
 if(inv) title=`تقرير مسحوبات الفاتورة رقم ${inv}`;
 else if(eq) title=`تقرير الكفرات للمعدة رقم ${eq}`;
 else if(sup) title=`تقرير الكفرات للمورد: ${sup}`;
 else if(act) title=`تقرير الكفرات للنشاط: ${act}`;
 else if(tireId) title=`تقرير هوية الكفر رقم ${tireId}`;
 else if(tire) title=`تقرير الكفرات — ${tire}`;
 else if(search) title=`نتائج البحث: ${search}`;

 if(from && to) parts.push(`من ${datefmt(from)} إلى ${datefmt(to)}`);
 else if(from) parts.push(`من ${datefmt(from)}`);
 else if(to) parts.push(`حتى ${datefmt(to)}`);

 // Add secondary filters so the printed title describes the exact report scope.
 if(inv){
   if(eq) parts.push(`المعدة ${eq}`);
   if(sup) parts.push(`المورد ${sup}`);
   if(act) parts.push(`النشاط ${act}`);
   if(tire) parts.push(tire);
 } else {
   if(eq && !title.includes(eq)) parts.push(`المعدة ${eq}`);
   if(sup && !title.includes(sup)) parts.push(`المورد ${sup}`);
   if(act && !title.includes(act)) parts.push(`النشاط ${act}`);
   if(tire && !title.includes(tire)) parts.push(tire);
   if(tireId && !title.includes(tireId)) parts.push(`هوية الكفر ${tireId}`);
 }
 const finalTitle=parts.length ? `${title} — ${parts.join(' | ')}` : title;
 const el=$('#reportTitle');
 if(el) el.textContent=finalTitle;
 document.title=finalTitle;
}


function activeFilterCount(){
 return [
  $('#search')?.value?.trim(), $('#from')?.value, $('#to')?.value,
  $('#activity')?.value, $('#equipment')?.value, $('#supplier')?.value,
  $('#invoice')?.value, $('#tire')?.value, $('#tireId')?.value, $('#position')?.value, $('#inventoryStatus')?.value
 ].filter(Boolean).length;
}

function updateClearFilterButton(){
 const count=activeFilterCount();
 const btn=$('#clear'), badge=$('#clearFilterCount');
 if(!btn||!badge)return;
 badge.textContent=count.toLocaleString('en-US');
 badge.hidden=count===0;
 btn.classList.toggle('has-active-filters',count>0);
 btn.title=count?`مسح ${count} فلتر نشط`:'لا توجد فلاتر نشطة';
 btn.setAttribute('aria-label',count?`مسح الفلاتر — ${count} فلتر نشط`:'مسح الفلاتر');
}


function renderActivitySummary(a){
 const el=$('#activitySummary');
 if(!el)return;

 const rows=Array.isArray(a)?a:[];
 const groups=sumBy(rows,'activity');

 if(!groups.length){
   el.innerHTML='<div class="empty">لا توجد بيانات إنفاق حسب النشاط ضمن الفلاتر الحالية</div>';
   return;
 }

 const total=groups.reduce((s,x)=>s+x[1],0)||1;

 function topVehicleByTireCount(rs){
   const m=new Map();
   rs.forEach(r=>{
     const plate=String(r.plate||'غير محدد').trim()||'غير محدد';
     const vehicle=String(r.vehicle||'غير محدد').trim()||'غير محدد';
     const key=plate+'\u001f'+vehicle;
     const o=m.get(key)||{plate:plate,vehicle:vehicle,count:0,value:0};
     o.count+=1;
     o.value+=Number(r.price)||0;
     m.set(key,o);
   });
   return [...m.values()].sort((x,y)=>
     y.count-x.count ||
     y.value-x.value ||
     x.plate.localeCompare(y.plate,'ar',{numeric:true})
   )[0] || {plate:'—',vehicle:'—',count:0,value:0};
 }

 const items=groups.map(([name,value])=>{
   const rs=rows.filter(r=>String(r.activity||'غير محدد')===String(name));
   const plates=uniq(rs.map(r=>String(r.plate||'').trim()).filter(Boolean));
   const topVehicle=topVehicleByTireCount(rs);
   return {
     name:String(name||'غير محدد'),
     value,
     rows:rs,
     plates,
     topVehicle
   };
 }).sort((x,y)=>y.value-x.value || y.rows.length-x.rows.length || x.name.localeCompare(y.name,'ar'));

 el.innerHTML=`
   <div class="summary-head activity-summary-head">
     <span>ملخص الأنشطة</span>
     <small>${items.length} نشاط — مرتبة من الأعلى إنفاقًا إلى الأقل</small>
   </div>
   <div class="activity-summary-wrap">
    <table class="activity-summary-table activity-summary-clean">
      <thead>
        <tr>
          <th>مسلسل</th>
          <th>النشاط</th>
          <th>عدد السيارات</th>
          <th>عدد الكفرات</th>
          <th>أعلى استهلاك</th>
          <th>قبل الضريبة</th>
          <th>النسبة</th>
        </tr>
      </thead>
      <tbody>
      ${items.map((x,i)=>`
        <tr class="activity-row" data-activity="${esc(x.name)}">
          <td class="activity-rank">${i+1}</td>
          <td class="activity-name"><b>${esc(x.name)}</b></td>
          <td>${x.plates.length}</td>
          <td>${x.rows.length}</td>
          <td class="activity-top-vehicle">
            <b>${esc(x.topVehicle.plate)} - ${esc(x.topVehicle.vehicle)}</b>
            <small>${x.topVehicle.count} كفر</small>
          </td>
          <td class="money">${money(x.value)}</td>
          <td class="money activity-pct">${(x.value/total*100).toFixed(1)}%</td>
        </tr>
      `).join('')}
      </tbody>
    </table>
   </div>`;

 el.querySelectorAll('.activity-row').forEach(tr=>tr.onclick=()=>{
   const activity=$('#activity');
   if(activity){
     activity.value=tr.dataset.activity;
     activity.dispatchEvent(new Event('input',{bubbles:true}));
     activity.dispatchEvent(new Event('change',{bubbles:true}));
   }else{
     render();
   }
 });
}


function buildPrintReportPage(title, subtitle, groups, rows, keyName){
  const top=groups.slice(0,10);
  const max=top[0]?.[1]||1;
  const total=groups.reduce((s,x)=>s+x[1],0);
  const topNameRaw=top[0]?.[0]||'—';
  const topName=reportDisplayName(topNameRaw,keyName,rows);
  const topValue=top[0]?.[1]||0;
  const topPct=total?topValue/total*100:0;

  const tableRows=top.map(([name,value],i)=>{
    const rs=rows.filter(r=>String(r[keyName]||'غير محدد')===String(name));
    return `<tr>
      <td>${i+1}</td>
      <td>${esc(name)}</td>
      <td>${rs.length}</td>
      <td class="money">${money(value)}</td>
      <td class="money">${money(value*VAT)}</td>
      <td class="money">${money(value*(1+VAT))}</td>
      <td class="money">${total?(value/total*100).toFixed(1):'0.0'}%</td>
    </tr>`;
  }).join('');

  const bars=top.map(([name,value])=>`
    <div class="pr-baritem">
      <div class="pr-value">${money(value)}</div>
      <div class="pr-bar" style="height:${Math.max(8,Math.round(value/max*72))}mm">
        <div class="pr-bar-label">${esc(reportDisplayName(name,keyName,rows))}</div>
      </div>
    </div>`).join('');

  const filtersText=[
    $('#from').value?`من ${datefmt($('#from').value)}`:'',
    $('#to').value?`إلى ${datefmt($('#to').value)}`:'',
    $('#activity').value?`النشاط: ${$('#activity').value}`:'',
    $('#equipment').value?`المعدة: ${$('#equipment').value}`:'',
    $('#supplier').value?`المورد: ${$('#supplier').value}`:'',
    $('#invoice').value?`الفاتورة: ${$('#invoice').value}`:'',
    $('#tire').value?`الكفر: ${$('#tire').value}`:'',
    $('#position')?.value?`موضع الكفر: ${$('#position').value}`:''
  ].filter(Boolean).join(' | ')||'جميع البيانات';

  return `<section class="print-report-page">
    <div class="pr-head">
      <div>
        <h2>${title}</h2>
        <div class="pr-sub">${subtitle}</div>
      </div>
      <div class="pr-meta">${filtersText}<br>${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}</div>
    </div>
    <div class="pr-body">
      <div class="pr-chart">
        <div class="pr-chart-title">${title}</div>
        <div class="pr-bars">${bars||'<div>لا توجد بيانات</div>'}</div>
      </div>
      <div class="pr-tablebox">
        <table>
          <thead><tr><th>#</th><th>العنصر</th><th>السجلات</th><th>قبل الضريبة</th><th>VAT 15%</th><th>شامل</th><th>النسبة</th></tr></thead>
          <tbody>${tableRows||'<tr><td colspan="7">لا توجد بيانات</td></tr>'}</tbody>
        </table>
      </div>
    </div>
    <div class="pr-analysis">
      <h3>توضيح شامل</h3>
      <p>إجمالي الإنفاق قبل الضريبة في نطاق التقرير هو <b>${sar(total)}</b>. أعلى عنصر هو <b>${esc(topName)}</b> بقيمة <b>${sar(topValue)}</b> ويمثل <b>${topPct.toFixed(1)}%</b> من إجمالي الإنفاق في هذا المحور. الجدول يوضح عدد السجلات، القيمة قبل الضريبة، ضريبة القيمة المضافة 15%، الإجمالي شامل الضريبة، ونسبة مساهمة كل عنصر. جميع القيم تتغير تلقائيًا حسب الفلاتر النشطة.</p>
    </div>
  </section>`;
}


function buildMonthlyPrintPage(rows){
  const groups=monthlyGroups(rows);
  const totalAll=rows.reduce((s,r)=>s+(r.price||0),0)||1;
  const topMonth=[...groups].sort((a,b)=>{
    const at=a[1].reduce((s,r)=>s+(r.price||0),0);
    const bt=b[1].reduce((s,r)=>s+(r.price||0),0);
    return bt-at;
  })[0];
  const topName=topMonth?monthLabel(topMonth[0]):'—';
  const topValue=topMonth?topMonth[1].reduce((s,r)=>s+(r.price||0),0):0;

  return `<section class="print-report-page">
    <div class="pr-head">
      <div>
        <h2>تقرير المسحوبات الشهرية</h2>
        <div class="pr-sub">توزيع المسحوبات حسب كل شهر داخل نطاق التقرير</div>
      </div>
      <div class="pr-meta">${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}</div>
    </div>
    <div class="pr-body">
      <div class="pr-chart">
        <div class="pr-chart-title">المسحوبات حسب الشهر</div>
        <div class="pr-bars">
          ${groups.map(([k,rs])=>{
            const value=rs.reduce((s,r)=>s+(r.price||0),0);
            const max=Math.max(...groups.map(([_,x])=>x.reduce((s,r)=>s+(r.price||0),0)),1);
            return `<div class="pr-baritem">
              <div class="pr-value">${money(value)}</div>
              <div class="pr-bar" style="height:${Math.max(8,Math.round(value/max*72))}mm">
                <div class="pr-bar-label">${esc(monthLabel(k))}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="pr-tablebox">
        <table>
          <thead><tr><th>الشهر</th><th>المسحوبات</th><th>المعدات</th><th>الفواتير</th><th>قبل الضريبة</th><th>متوسط المسحوب</th><th>النسبة</th></tr></thead>
          <tbody>
            ${groups.map(([k,rs])=>{
              const total=rs.reduce((s,r)=>s+(r.price||0),0);
              return `<tr>
                <td>${esc(monthLabel(k))}</td>
                <td>${rs.length}</td>
                <td>${uniq(rs.map(r=>r.plate).filter(Boolean)).length}</td>
                <td>${uniq(rs.map(r=>r.invoice).filter(Boolean)).length}</td>
                <td class="money">${money(total)}</td>
                <td class="money">${money(rs.length?total/rs.length:0)}</td>
                <td class="money">${(total/totalAll*100).toFixed(1)}%</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="pr-analysis">
      <h3>توضيح شامل</h3>
      <p>${groups.length>1
        ? `يشمل التقرير <b>${groups.length}</b> أشهر. تم فصل مسحوبات كل شهر بصورة مستقلة. أعلى شهر في الإنفاق هو <b>${esc(topName)}</b> بقيمة <b>${sar(topValue)}</b>، وتمثل ${(topValue/totalAll*100).toFixed(1)}% من إجمالي الإنفاق خلال الفترة.`
        : `الفترة الحالية تقع داخل شهر واحد فقط وهو <b>${esc(groups[0]?monthLabel(groups[0][0]):'—')}</b>.`}</p>
    </div>
  </section>`;
}

function renderPrintReports(rows){
  rows=operationalRows(rows);
  const box=$('#printReports');
  if(!box)return;
  box.innerHTML=[
    buildPrintReportPage('تقرير الإنفاق حسب الفاتورة','تحليل قيمة المسحوبات المرتبطة بكل فاتورة',sumBy(rows,'invoice'),rows,'invoice'),
    buildPrintReportPage('تقرير الإنفاق حسب المعدة','تحليل تكلفة الكفرات لكل معدة / لوحة',sumBy(rows,'plate'),rows,'plate'),
    buildPrintReportPage('تقرير الإنفاق حسب المورد','تحليل الإنفاق والمساهمة المالية لكل مورد',sumBy(rows,'supplier'),rows,'supplier'),
    buildPrintReportPage('تقرير الإنفاق حسب نوع ومقاس الكفر','مقارنة الإنفاق حسب تركيبة نوع ومقاس الكفر',sumBy(rows,'tire_type'),rows,'tire_type'),
    buildPrintReportPage('تقرير الإنفاق حسب النشاط','تحليل توزيع الإنفاق بين الأنشطة والمواقع التشغيلية',sumBy(rows,'activity'),rows,'activity'),
    buildPrintReportPage('تقرير هوية الكفر','تحليل السجلات والتكلفة المرتبطة بكل هوية كفر',sumBy(rows,'tire_id'),rows,'tire_id'),
    buildMonthlyPrintPage(rows)
  ].join('');
}


function renderTireIdSummary(a){
 const el=$('#tireIdSummary');
 if(!el)return;
 const groups=tireIdGroupsAsc(a);
 if(!groups.length){
   el.innerHTML='<div class="empty">لا توجد بيانات لهوية الكفر ضمن الفلاتر الحالية</div>';
   return;
 }
 const total=groups.reduce((s,x)=>s+x[1],0)||1;
 el.innerHTML=`
   <div class="tablewrap" style="max-height:310px">
    <table style="min-width:0">
      <thead><tr>
        <th>هوية الكفر</th><th>السجلات</th><th>المعدة</th><th>نوع/مقاس الكفر</th>
        <th>آخر قراءة عداد</th><th>قبل الضريبة</th><th>نسبة الإنفاق</th>
      </tr></thead>
      <tbody>
      ${groups.map(([name,value])=>{
        const rs=a.filter(r=>(r.tire_id||'غير محدد')===name);
        const odo=rs.map(r=>num(r.odometer)).filter(Boolean).sort((x,y)=>y-x)[0]||0;
        return `<tr class="tire-id-row" data-tire-id="${esc(name)}" style="cursor:pointer">
          <td class="mono">${esc(name)}</td>
          <td>${rs.length}</td>
          <td>${esc(uniq(rs.map(r=>rowEquipmentActivityLabel(r)).filter(Boolean)).join('، ')||'—')}</td>
          <td>${esc(uniq(rs.map(r=>r.tire_type).filter(Boolean)).join('، ')||'—')}</td>
          <td class="mono">${odo?odo.toLocaleString('en-US'):'—'}</td>
          <td class="money">${money(value)}</td>
          <td class="money">${(value/total*100).toFixed(1)}%</td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>
   </div>`;
 el.querySelectorAll('.tire-id-row').forEach(tr=>tr.onclick=()=>{
   $('#tireId').value=tr.dataset.tireId;
   render();
 });
}


function monthKey(date){
  return String(date||'').slice(0,7);
}
function monthLabel(key){
  if(!key || !/^\d{4}-\d{2}$/.test(key)) return key || 'غير محدد';
  const [y,m]=key.split('-').map(Number);
  return new Date(y,m-1,1).toLocaleDateString('ar-EG',{year:'numeric',month:'long'});
}
function monthlyGroups(rows){
  const m=new Map();
  rows.forEach(r=>{
    const k=monthKey(r.date);
    if(!k)return;
    if(!m.has(k))m.set(k,[]);
    m.get(k).push(r);
  });
  return [...m.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
}
function renderMonthlyReport(rows){
  rows=operationalRows(rows);
  const chart=$('#monthlyChart'), summary=$('#monthlySummary');
  if(!chart || !summary)return;

  const groups=monthlyGroups(rows);
  if(!groups.length){
    chart.innerHTML='<div class="empty">لا توجد بيانات شهرية ضمن الفلاتر الحالية</div>';
    summary.innerHTML='<div class="empty">لا توجد بيانات شهرية</div>';
    return;
  }

  const totals=groups.map(([k,rs])=>[k,rs.reduce((s,r)=>s+(r.price||0),0)]);
  const grandTotal=rows.reduce((s,r)=>s+(r.price||0),0);
  const max=Math.max(...totals.map(x=>x[1]),1);

  function topByCount(rs,key,labelFn){
    const m=new Map();
    rs.forEach(r=>{
      const raw=String(r[key]||'').trim();
      if(!raw)return;
      const k=raw;
      m.set(k,(m.get(k)||0)+1);
    });
    const arr=[...m.entries()].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]),'ar',{numeric:true}));
    if(!arr.length)return {name:'—',count:0};
    return {name:labelFn?labelFn(arr[0][0],rs):arr[0][0],count:arr[0][1]};
  }

  function vehicleLabel(plate,rs){
    const match=rs.find(r=>String(r.plate||'').trim()===String(plate).trim());
    const vehicle=String(match?.vehicle||'').trim();
    return vehicle?`${plate} - ${vehicle}`:plate;
  }

  const analytics=groups.map(([k,rs])=>{
    const topTire=topByCount(rs,'tire_type');
    const topActivity=topByCount(rs,'activity');
    const topVehicle=topByCount(rs,'plate',(plate,list)=>vehicleLabel(plate,list));
    const distinctItems=uniq(rs.map(r=>String(r.tire_type||'').trim()).filter(Boolean)).length;
    return {k,rs,topTire,topActivity,topVehicle,distinctItems};
  });

  chart.innerHTML=`<div class="hchart monthly-hchart">${totals.map(([k,v],i)=>`
    <div class="hrow" data-month="${esc(k)}">
      <div class="hmeta">
        <span class="hrank">${i+1}</span>
        <span class="hname">${esc(monthLabel(k))}</span>
        <span class="hpercent">${(v/(grandTotal||1)*100).toFixed(1)}%</span>
        <strong class="hvalue">${money(v)} SAR</strong>
      </div>
      <div class="htrack">
        <div class="hbar" style="width:${Math.max(2,(v/max*100))}%">
          <span class="hbarlabel">${esc(monthLabel(k))}</span>
        </div>
      </div>
    </div>`).join('')}</div>`;

  const totalWithdrawals=rows.length;
  const totalEquipment=uniq(rows.map(r=>r.plate).filter(Boolean)).length;
  const totalInvoices=uniq(rows.map(r=>r.invoice).filter(Boolean)).length;
  const overallAvg=totalWithdrawals?grandTotal/totalWithdrawals:0;

  summary.innerHTML=`
    <div class="monthly-main-table-title">الملخص الشهري</div>
    <div class="tablewrap monthly-primary-wrap">
      <table class="monthly-primary-table">
        <thead>
          <tr>
            <th>الشهر</th><th>عدد المسحوبات</th><th>عدد المعدات</th><th>عدد الفواتير</th>
            <th>قبل الضريبة</th><th>متوسط المسحوب</th><th>نسبة الشهر</th>
          </tr>
        </thead>
        <tbody>
          ${groups.map(([k,rs])=>{
            const total=rs.reduce((s,r)=>s+(r.price||0),0);
            return `<tr class="monthly-row" data-month="${esc(k)}" style="cursor:pointer">
              <td>${esc(monthLabel(k))}</td>
              <td>${rs.length}</td>
              <td>${uniq(rs.map(r=>r.plate).filter(Boolean)).length}</td>
              <td>${uniq(rs.map(r=>r.invoice).filter(Boolean)).length}</td>
              <td class="money">${money(total)}</td>
              <td class="money">${money(rs.length?total/rs.length:0)}</td>
              <td class="money">${(total/(grandTotal||1)*100).toFixed(1)}%</td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr class="monthly-total-row">
            <td><b>الإجمالي</b></td>
            <td><b>${totalWithdrawals}</b></td>
            <td><b>${totalEquipment}</b></td>
            <td><b>${totalInvoices}</b></td>
            <td class="money"><b>${money(grandTotal)}</b></td>
            <td class="money"><b>${money(overallAvg)}</b></td>
            <td class="money"><b>${grandTotal? '100.0%':'0.0%'}</b></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="monthly-analysis-title">تحليل الاستخدام الشهري</div>
    <div class="tablewrap monthly-analysis-wrap">
      <table class="monthly-analysis-table">
        <thead>
          <tr>
            <th>الشهر</th>
            <th>أكثر الأصناف استخدامًا</th>
            <th>أكثر الأنشطة سحبًا</th>
            <th>أكثر السيارات سحبًا</th>
            <th>عدد الأصناف المسحوبة</th>
          </tr>
        </thead>
        <tbody>
          ${analytics.map(x=>`
            <tr class="monthly-row" data-month="${esc(x.k)}">
              <td><b>${esc(monthLabel(x.k))}</b></td>
              <td>${esc(x.topTire.name)}${x.topTire.count?`<span class="monthly-sub-count">${x.topTire.count} سحب</span>`:''}</td>
              <td>${esc(x.topActivity.name)}${x.topActivity.count?`<span class="monthly-sub-count">${x.topActivity.count} سحب</span>`:''}</td>
              <td>${esc(x.topVehicle.name)}${x.topVehicle.count?`<span class="monthly-sub-count">${x.topVehicle.count} سحب</span>`:''}</td>
              <td><b>${x.distinctItems}</b></td>
            </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td><b>إجمالي الفترة</b></td>
            <td colspan="3">ملخص لأعلى استخدام داخل كل شهر</td>
            <td><b>${uniq(rows.map(r=>String(r.tire_type||'').trim()).filter(Boolean)).length}</b></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="monthly-note">
      ${groups.length>1
        ? `الفترة الحالية تشمل <b>${groups.length}</b> أشهر، وتم فصل مسحوبات كل شهر على حدة للمقارنة الواضحة.`
        : `الفترة الحالية تقع داخل شهر واحد: <b>${esc(monthLabel(groups[0][0]))}</b>.`}
    </div>`;

  chart.querySelectorAll('[data-month]').forEach(el=>el.onclick=()=>{
    const [y,m]=el.dataset.month.split('-').map(Number);
    const first=`${y}-${String(m).padStart(2,'0')}-01`;
    const last=new Date(y,m,0).toISOString().slice(0,10);
    $('#from').value=first; $('#to').value=last; render();
  });
  summary.querySelectorAll('.monthly-row').forEach(el=>el.onclick=()=>{
    const [y,m]=el.dataset.month.split('-').map(Number);
    $('#from').value=`${y}-${String(m).padStart(2,'0')}-01`;
    $('#to').value=new Date(y,m,0).toISOString().slice(0,10);
    render();
  });
}

function renderCompactSummary(selector, rows, key, label){
 const el=$(selector);
 if(!el)return;
 const groups=sumBy(rows,key);
 if(!groups.length){
   el.innerHTML='<div class="empty">لا توجد بيانات ضمن الفلاتر الحالية</div>';
   return;
 }
 const total=groups.reduce((s,x)=>s+x[1],0)||1;

 /* Equipment summary is intentionally different:
    - show ALL cars/equipment, not only top 8
    - split plate, equipment name and activity into separate columns
    - keep chronological order from oldest to newest */
 if(key==='plate'){
   const items=groups.map(([plate,value])=>{
     const rs=rows.filter(r=>String(r.plate||'غير محدد')===String(plate));
     const dates=rs.map(r=>r.date).filter(Boolean).sort();
     const vehicles=uniq(rs.map(r=>String(r.vehicle||'').trim()).filter(Boolean));
     const activities=uniq(rs.map(r=>String(r.activity||'').trim()).filter(Boolean));
     return {
       plate:String(plate||'غير محدد'),
       value,
       rs,
       first:dates[0]||'',
       vehicles,
       activities
     };
   }).sort((a,b)=>{
     const ad=a.first?new Date(String(a.first)+'T00:00:00').getTime():Number.MAX_SAFE_INTEGER;
     const bd=b.first?new Date(String(b.first)+'T00:00:00').getTime():Number.MAX_SAFE_INTEGER;
     return ad-bd || a.plate.localeCompare(b.plate,'ar',{numeric:true});
   });

   el.innerHTML=`
    <div class="summary-head">
      <span>ملخص المعدات</span>
      <small>${items.length} سيارة / معدة — جميع السيارات ضمن الفلاتر الحالية</small>
    </div>
    <div class="summary-table-wrap">
      <table class="summary-table equipment-separated-summary">
        <thead>
          <tr>
            <th>رقم السيارة</th>
            <th>المعدة</th>
            <th>النشاط</th>
            <th>أول تاريخ</th>
            <th>السجلات</th>
            <th>قبل الضريبة</th>
            <th>النسبة</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(x=>`
            <tr data-summary-key="plate" data-summary-value="${esc(x.plate)}">
              <td class="mono"><b>${esc(x.plate)}</b></td>
              <td>${esc(x.vehicles.join(' / ')||'غير محدد')}</td>
              <td>${esc(x.activities.join(' / ')||'غير محدد')}</td>
              <td class="mono">${esc(x.first?datefmt(x.first):'—')}</td>
              <td>${x.rs.length}</td>
              <td class="money">${money(x.value)}</td>
              <td class="money">${(x.value/total*100).toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;

   el.querySelectorAll('tbody tr').forEach(tr=>tr.onclick=()=>{
     const value=tr.dataset.summaryValue;
     $('#equipment').value=value;
     render();
   });
   return;
 }

 if(key==='invoice'){
     const normalizeInvoiceKey=v=>String(v??'').trim().replace(/\.0$/,'').replace(/\s+/g,'').toLowerCase();
     const supplierInvoices=(typeof window.getSupplierInvoiceData==='function')?(window.getSupplierInvoiceData()||[]):[];

     /* مهم: نبني القائمة من اتحاد فواتير الموردين + المسحوبات.
        بذلك تظهر الفاتورة الجديدة حتى لو لم تسحب منها أي قطعة. */
     const movementMap=new Map();
     rows.forEach(r=>{
       const k=normalizeInvoiceKey(r.invoice);if(!k)return;
       let o=movementMap.get(k);
       if(!o){o={invoice:String(r.invoice||''),supplier:String(r.supplier||''),value:0,count:0};movementMap.set(k,o)}
       o.value+=Number(r.price)||0;o.count++;
       if(!o.supplier&&r.supplier)o.supplier=String(r.supplier);
     });

     const invoiceMap=new Map();
     supplierInvoices.forEach(x=>{
       const k=normalizeInvoiceKey(x.invoice);if(!k)return;
       let o=invoiceMap.get(k);
       if(!o){o={invoice:String(x.invoice||''),supplier:String(x.supplier||''),incoming:0,withdrawn:0,remaining:0,value:0,count:0,invoiceTotal:0,linked:true};invoiceMap.set(k,o)}
       o.incoming+=Number(x.totalQty)||0;
       o.invoiceTotal+=Number(x.invoiceTotal)||0;
       o.withdrawn+=Number(x.withdrawnQty)||0;
       o.remaining+=Number(x.remainingQty ?? ((Number(x.totalQty)||0)-(Number(x.withdrawnQty)||0)))||0;
       if(!o.supplier&&x.supplier)o.supplier=String(x.supplier);
     });
     movementMap.forEach((m,k)=>{
       let o=invoiceMap.get(k);
       if(!o){o={invoice:m.invoice,supplier:m.supplier,incoming:0,withdrawn:m.count,remaining:-m.count,value:0,count:0,invoiceTotal:0,linked:false};invoiceMap.set(k,o)}
       o.value+=m.value;o.count+=m.count;
       if(!o.supplier)o.supplier=m.supplier;
       /* إذا كانت بيانات فواتير الموردين لم تحسب المسحوب لأي سبب، لا نفقد حركة السحب الموجودة */
       if(o.linked && !o.withdrawn && m.count){o.withdrawn=m.count;o.remaining=o.incoming-m.count}
     });

     const items=[...invoiceMap.values()].sort((a,b)=>{
       const na=Number(String(a.invoice).replace(/[^\d.]/g,'')),nb=Number(String(b.invoice).replace(/[^\d.]/g,''));
       if(Number.isFinite(na)&&Number.isFinite(nb)&&na!==nb)return na-nb;
       return String(a.invoice).localeCompare(String(b.invoice),'ar',{numeric:true});
     });
     const reportTotal=items.reduce((s,x)=>s+x.value,0)||1;
     const noMove=items.filter(x=>Number(x.withdrawn)===0).length;

     el.innerHTML=`
       <div class="summary-head">
         <span>الإنفاق حسب الفاتورة</span>
         <small>${items.length} فاتورة — منها ${noMove} بدون حركة — المصدر: فواتير الموردين + المسحوبات</small>
       </div>
       <div class="summary-table-wrap invoice-stock-summary-wrap">
        <table class="summary-table invoice-stock-summary invoice-summary-fit">
         <thead><tr>
          <th>المورد</th>
          <th>رقم الفاتورة</th>
          <th>الوارد</th>
          <th>المسحوب</th>
          <th>المتبقي</th>
          <th>إجمالي قيمة الفاتورة</th>
          <th>الحالة</th>
         </tr></thead>
         <tbody>
          ${items.map(x=>`<tr data-summary-key="invoice" data-summary-value="${esc(x.invoice)}">
           <td><b>${esc(x.supplier||'غير محدد')}</b></td>
           <td><b>${esc(x.invoice||'—')}</b></td>
           <td>${x.linked?Number(x.incoming||0).toLocaleString('en-US'):'—'}</td>
           <td>${Number(x.withdrawn||0).toLocaleString('en-US')}</td>
           <td class="${x.remaining<0?'si-neg':x.remaining===0?'si-zero':'si-pos'}">${x.linked?Number(x.remaining||0).toLocaleString('en-US'):'—'}</td>
           <td class="money">${x.linked?money(Number(x.invoiceTotal||0)):'—'}</td>
           <td class="${x.withdrawn===0?'si-zero':x.remaining<0?'si-neg':'si-pos'}"><b>${x.withdrawn===0?'لا توجد حركة':x.remaining<0?'سحب أكبر من الوارد':'عليها حركة'}</b></td>
          </tr>`).join('')}
         </tbody>
         <tfoot><tr>
          <td colspan="2"><b>الإجمالي</b></td>
          <td><b>${items.reduce((s,x)=>s+(x.linked?Number(x.incoming||0):0),0).toLocaleString('en-US')}</b></td>
          <td><b>${items.reduce((s,x)=>s+Number(x.withdrawn||0),0).toLocaleString('en-US')}</b></td>
          <td><b>${items.reduce((s,x)=>s+(x.linked?Number(x.remaining||0):0),0).toLocaleString('en-US')}</b></td>
          <td class="money"><b>${money(items.reduce((s,x)=>s+(x.linked?Number(x.invoiceTotal||0):0),0))}</b></td>
          <td><b>${items.filter(x=>Number(x.withdrawn||0)===0).length} بدون حركة</b></td>
         </tr></tfoot>
        </table>
       </div>`;
     el.querySelectorAll('tbody tr').forEach(tr=>tr.onclick=()=>{$('#invoice').value=tr.dataset.summaryValue;render();});
     return;
   }

   if(key==='supplier'){
     const supplierInvoices=(typeof window.getSupplierInvoiceData==='function')?(window.getSupplierInvoiceData()||[]):[];
     const map=new Map();
     const get=name=>{
       name=String(name||'غير محدد').trim()||'غير محدد';
       if(!map.has(name))map.set(name,{
         supplier:name,incoming:0,withdrawn:0,remaining:0,
         invoices:new Set(),movementCount:0
       });
       return map.get(name);
     };

     /* المصدر الأساسي للكميات وعدد الفواتير هو ورقة فواتير الموردين */
     supplierInvoices.forEach(x=>{
       const o=get(x.supplier);
       o.incoming+=Number(x.totalQty)||0;
       o.withdrawn+=Number(x.withdrawnQty)||0;
       o.remaining+=Number(x.remainingQty ?? ((Number(x.totalQty)||0)-(Number(x.withdrawnQty)||0)))||0;
       if(x.invoice)o.invoices.add(String(x.invoice));
     });

     /* نحتفظ بأي مورد موجود في المسحوبات حتى لو كان ناقصاً في ورقة الفواتير */
     rows.forEach(r=>{
       const o=get(r.supplier);
       o.movementCount++;
       if(r.invoice)o.invoices.add(String(r.invoice));
     });

     /* عند عدم وصول withdrawnQty من بيانات الموردين، لا نفقد حركة المسحوبات */
     map.forEach(o=>{
       if(!o.withdrawn && o.movementCount){
         o.withdrawn=o.movementCount;
         if(o.incoming)o.remaining=o.incoming-o.withdrawn;
       }
     });

     const items=[...map.values()].sort((a,b)=>
       b.withdrawn-a.withdrawn || b.incoming-a.incoming || a.supplier.localeCompare(b.supplier,'ar')
     );
     const totalWithdrawn=items.reduce((s,x)=>s+(Number(x.withdrawn)||0),0);
     const totalIncoming=items.reduce((s,x)=>s+(Number(x.incoming)||0),0);
     const totalRemaining=items.reduce((s,x)=>s+(Number(x.remaining)||0),0);

     el.innerHTML=`
      <div class="summary-head supplier-summary-head">
       <span>ملخص الموردين</span>
       <small>${items.length} مورد — النسبة محسوبة من إجمالي المسحوب لجميع الموردين</small>
      </div>
      <div class="supplier-kpis-inline">
       <div><span>عدد الموردين</span><b>${items.length}</b></div>
       <div><span>إجمالي الفواتير</span><b>${items.reduce((s,x)=>s+x.invoices.size,0)}</b></div>
       <div><span>إجمالي الوارد</span><b>${totalIncoming.toLocaleString('en-US')}</b></div>
       <div><span>إجمالي المسحوب</span><b>${totalWithdrawn.toLocaleString('en-US')}</b></div>
       <div><span>إجمالي المتبقي</span><b>${totalRemaining.toLocaleString('en-US')}</b></div>
      </div>
      <div class="summary-table-wrap supplier-summary-table-wrap">
       <table class="summary-table supplier-summary-table">
        <thead><tr>
         <th>المورد</th>
         <th>عدد الفواتير</th>
         <th>الوارد</th>
         <th>المسحوب</th>
         <th>المتبقي</th>
         <th>النسبة من الإجمالي</th>
        </tr></thead>
        <tbody>
         ${items.map(x=>{
           const pct=totalWithdrawn>0?(x.withdrawn/totalWithdrawn*100):0;
           return `<tr data-summary-key="supplier" data-summary-value="${esc(x.supplier)}">
            <td><b>${esc(x.supplier)}</b></td>
            <td>${x.invoices.size}</td>
            <td>${Number(x.incoming||0).toLocaleString('en-US')}</td>
            <td>${Number(x.withdrawn||0).toLocaleString('en-US')}</td>
            <td class="${x.remaining<0?'si-neg':x.remaining===0?'si-zero':'si-pos'}">${Number(x.remaining||0).toLocaleString('en-US')}</td>
            <td class="money"><b>${pct.toFixed(1)}%</b></td>
           </tr>`;
         }).join('')}
        </tbody>
        <tfoot><tr>
         <td><b>الإجمالي</b></td>
         <td><b>${items.reduce((s,x)=>s+x.invoices.size,0)}</b></td>
         <td><b>${totalIncoming.toLocaleString('en-US')}</b></td>
         <td><b>${totalWithdrawn.toLocaleString('en-US')}</b></td>
         <td><b>${totalRemaining.toLocaleString('en-US')}</b></td>
         <td><b>${totalWithdrawn>0?'100.0%':'0.0%'}</b></td>
        </tr></tfoot>
       </table>
      </div>`;
     el.querySelectorAll('tbody tr').forEach(tr=>tr.onclick=()=>{
       $('#supplier').value=tr.dataset.summaryValue;
       render();
     });
     return;
   }

   const top=groups.slice(0,8);
 el.innerHTML=`
   <div class="summary-head">
     <span>ملخص ${label}</span>
     <small>${groups.length} عنصر</small>
   </div>
   <div class="summary-table-wrap">
    <table class="summary-table">
      <thead><tr><th>${label}</th><th>السجلات</th><th>قبل الضريبة</th><th>النسبة</th></tr></thead>
      <tbody>
        ${top.map(([name,value])=>{
          const count=rows.filter(r=>String(r[key]||'غير محدد')===String(name)).length;
          return `<tr data-summary-key="${key}" data-summary-value="${esc(name)}">
            <td>${esc(reportDisplayName(name,key,rows))}</td>
            <td>${count}</td>
            <td class="money">${money(value)}</td>
            <td class="money">${(value/total*100).toFixed(1)}%</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
   </div>`;
 el.querySelectorAll('tbody tr').forEach(tr=>tr.onclick=()=>{
   const key=tr.dataset.summaryKey, value=tr.dataset.summaryValue;
   if(key==='invoice') $('#invoice').value=value;
   if(key==='plate') $('#equipment').value=value;
   if(key==='supplier') $('#supplier').value=value;
   if(key==='tire_type') $('#tire').value=value;
   render();
 });
}


window.refreshInvoiceSupplierSummary=function(){
  try{
    const el=document.getElementById('invoiceSummary');
    if(!el || typeof filters!=='function')return;
    renderCompactSummary('#invoiceSummary',filters(),'invoice','الفاتورة');
  }catch(e){
    console.warn('Invoice supplier summary refresh:',e);
  }
};


function activeFilterSummaryText(){
 const parts=[];
 const add=(id,label,fmt=v=>v)=>{const el=$(id);if(el&&el.value)parts.push(`${label}: ${fmt(el.value)}`)};
 add('#from','من',datefmt);add('#to','إلى',datefmt);add('#activity','النشاط');add('#equipment','المعدة');add('#supplier','المورد');add('#invoice','الفاتورة');add('#tire','نوع/مقاس الكفر');add('#tireId','هوية الكفر');add('#inventoryStatus','حالة المخزون',v=>({ok:'متوفر',low:'مخزون منخفض',out:'نفد',over:'سحب زائد'}[v]||v));
 const q=$('#search')?.value?.trim();if(q)parts.push(`بحث: ${q}`);
 return parts.length?parts.join(' | '):'جميع البيانات — لا توجد فلاتر نشطة';
}
function rowsDateRange(rows){
 const ds=rows.map(r=>r.date).filter(Boolean).sort();
 return ds.length?`${datefmt(ds[0])} ← ${datefmt(ds[ds.length-1])}`:'لا توجد تواريخ';
}
function explanationMeaning(key,label){
 const map={
  invoice:'يجمع قيمة المسحوبات قبل الضريبة حسب رقم الفاتورة، لذلك يوضح أي الفواتير استُخدم منها أكبر إنفاق ضمن النطاق الحالي.',
  plate:'يجمع تكلفة المسحوبات حسب لوحة / المعدة، ويبين المعدات الأعلى استهلاكًا للكفرات من حيث القيمة.',
  supplier:'يجمع قيمة المسحوبات حسب المورد المسجل في تقرير الكفرات، ويقارن مساهمة كل مورد في إجمالي الإنفاق.',
  tire_type:'يجمع تكلفة المسحوبات حسب نوع ومقاس الكفر، ويكشف الأنواع والمقاسات الأعلى تكلفة أو تكرارًا.',
  activity:'يوزع قيمة المسحوبات بين الأنشطة التشغيلية، لتحديد الأنشطة التي استحوذت على النسبة الأكبر من تكلفة الكفرات.',
  tire_id:'يجمع السجلات والقيمة المرتبطة بكل هوية كفر، ليسهل تتبع الهويات الأعلى ظهورًا أو تكلفة داخل الفترة المفلترة.'
 };
 return map[key]||`يوضح توزيع الإنفاق حسب ${label} داخل نطاق الفلترة الحالي.`;
}
function explanationStatsHtml(stats){
 return `<div class="explain-grid">${stats.map(([l,v])=>`<div class="explain-stat"><span>${l}</span><strong>${v}</strong></div>`).join('')}</div>`;
}
function renderDashboardExplanation(selector, rows, key, label){
 const el=$(selector); if(!el)return;
 const groups=sumBy(rows,key), m=metrics(rows);
 if(!groups.length){el.classList.add('report-explain-full');el.innerHTML='<div class="explain-empty"><b>التوضيح الكامل:</b> لا توجد بيانات ضمن الفلاتر الحالية لإعداد تحليل هذا التقرير.</div>';return}
 el.classList.add('report-explain-full');
 const total=m.before||1, top=groups[0], low=groups[groups.length-1], avgGroup=m.before/groups.length;
 const groupCount=name=>rows.filter(r=>String(r[key]||'غير محدد')===String(name)).length;
 const top3=groups.slice(0,3).map(([n,v],i)=>`<span class="explain-chip">${i+1}. ${esc(n)} — ${sar(v)} (${(v/total*100).toFixed(1)}%)</span>`).join('');
 const topCount=groupCount(top[0]), lowCount=groupCount(low[0]);
 const scope=activeFilterSummaryText();
 el.innerHTML=`
  <div class="explain-head"><div><h3>التوضيح والتحليل الكامل — ${esc(label)}</h3><p>قراءة تلقائية لكل الأرقام الظاهرة في الرسم والملخص، ويتم تحديثها مع كل تغيير في الفلاتر.</p></div><div class="explain-scope"><b>نطاق الفلترة الحالي:</b><br>${esc(scope)}</div></div>
  ${explanationStatsHtml([
    ['عدد السجلات',rows.length.toLocaleString('en-US')],['عدد '+label,groups.length.toLocaleString('en-US')],['الفترة الزمنية',rowsDateRange(rows)],['قبل الضريبة',sar(m.before)],
    ['VAT 15%',sar(m.vat)],['شامل الضريبة',sar(m.after)],['متوسط السجل',sar(m.avg)],['متوسط '+label,sar(avgGroup)]
  ])}
  <div class="explain-sections">
   <div class="explain-box"><b>قراءة النتائج:</b><ul>
    <li>أعلى ${esc(label)}: <b>${esc(top[0])}</b> بقيمة <b>${sar(top[1])}</b>، بنسبة <b>${(top[1]/total*100).toFixed(1)}%</b>، عبر <b>${topCount}</b> سجل.</li>
    <li>أقل ${esc(label)}: <b>${esc(low[0])}</b> بقيمة <b>${sar(low[1])}</b>، بنسبة <b>${(low[1]/total*100).toFixed(1)}%</b>، عبر <b>${lowCount}</b> سجل.</li>
    <li>الفارق بين الأعلى والأقل: <b>${sar(Math.max(0,top[1]-low[1]))}</b>.</li>
    <li>إجمالي التقرير قبل الضريبة <b>${sar(m.before)}</b>، وبعد إضافة VAT يصبح <b>${sar(m.after)}</b>.</li>
   </ul><div class="explain-top3">${top3}</div></div>
   <div class="explain-box"><b>ماذا يعني هذا التقرير؟</b><br>${explanationMeaning(key,label)}<br><br><b>كيفية القراءة:</b> طول/مساحة الرسم تمثل قيمة الإنفاق قبل الضريبة، والجدول يوضح عدد السجلات والقيمة والنسبة من إجمالي البيانات المفلترة. اختيار أي عنصر من الرسم أو الملخص يطبّق فلتره ويعيد حساب التقرير والتوضيح فورًا.</div>
  </div>`;
}
function renderMonthlyExplanation(rows){
 rows=operationalRows(rows);
 const el=$('#monthlyExplain'); if(!el)return;el.classList.add('report-explain-full');
 const groups=monthlyGroups(rows),m=metrics(rows);
 if(!groups.length){el.innerHTML='<div class="explain-empty"><b>التوضيح الكامل:</b> لا توجد بيانات شهرية ضمن الفلاتر الحالية.</div>';return}
 const vals=groups.map(([k,rs])=>[k,rs.reduce((s,r)=>s+(r.price||0),0),rs.length]);
 const sorted=[...vals].sort((a,b)=>b[1]-a[1]),top=sorted[0],low=sorted[sorted.length-1],total=m.before||1,avgMonth=m.before/groups.length;
 const latest=vals[vals.length-1],prev=vals.length>1?vals[vals.length-2]:null;
 const change=prev&&prev[1]!==0?((latest[1]-prev[1])/prev[1]*100):null;
 const top3=sorted.slice(0,3).map(([k,v],i)=>`<span class="explain-chip">${i+1}. ${esc(monthLabel(k))} — ${sar(v)} (${(v/total*100).toFixed(1)}%)</span>`).join('');
 el.innerHTML=`
  <div class="explain-head"><div><h3>التوضيح والتحليل الكامل — المسحوبات الشهرية</h3><p>تحليل زمني للمسحوبات والتكلفة داخل الفترة والفلترة الحالية.</p></div><div class="explain-scope"><b>نطاق الفلترة الحالي:</b><br>${esc(activeFilterSummaryText())}</div></div>
  ${explanationStatsHtml([['عدد الأشهر',groups.length.toLocaleString('en-US')],['عدد المسحوبات',rows.length.toLocaleString('en-US')],['الفترة الزمنية',rowsDateRange(rows)],['إجمالي قبل الضريبة',sar(m.before)],['VAT 15%',sar(m.vat)],['شامل الضريبة',sar(m.after)],['متوسط الشهر',sar(avgMonth)],['متوسط المسحوب',sar(m.avg)]])}
  <div class="explain-sections">
   <div class="explain-box"><b>قراءة النتائج:</b><ul><li>أعلى شهر: <b>${esc(monthLabel(top[0]))}</b> بقيمة <b>${sar(top[1])}</b> وبنسبة <b>${(top[1]/total*100).toFixed(1)}%</b>.</li><li>أقل شهر: <b>${esc(monthLabel(low[0]))}</b> بقيمة <b>${sar(low[1])}</b> وبنسبة <b>${(low[1]/total*100).toFixed(1)}%</b>.</li><li>أحدث شهر ظاهر: <b>${esc(monthLabel(latest[0]))}</b> بقيمة <b>${sar(latest[1])}</b>${change==null?'':`، والتغير عن الشهر السابق <b>${change>=0?'+':''}${change.toFixed(1)}%</b>`}.</li></ul><div class="explain-top3">${top3}</div></div>
   <div class="explain-box"><b>ماذا يعني هذا التقرير؟</b><br>يعرض اتجاه قيمة مسحوبات الكفرات شهرًا بعد شهر. الرسم يوضح الحركة الزمنية، والملخص يعرض عدد المسحوبات والمعدات والفواتير والقيمة والمتوسط لكل شهر. الضغط على شهر يحدد بدايته ونهايته في الفلاتر ويعيد حساب جميع التقارير.</div>
  </div>`;
}
function renderRecordsExplanation(rows){
 const el=$('#recordsExplain');if(!el)return;el.classList.add('report-explain-full');
 const m=metrics(rows);
 if(!rows.length){el.innerHTML='<div class="explain-empty"><b>التوضيح الكامل:</b> لا توجد سجلات مطابقة للفلاتر الحالية.</div>';return}
 const topOf=key=>sumBy(rows,key)[0]||['—',0];
 const sup=topOf('supplier'),eq=topOf('plate'),act=topOf('activity'),inv=topOf('invoice');
 el.innerHTML=`
  <div class="explain-head"><div><h3>التوضيح والتحليل الكامل — جميع السجلات</h3><p>ملخص وصفي لكل الصفوف الظاهرة حاليًا في جدول السجلات فقط.</p></div><div class="explain-scope"><b>نطاق الفلترة الحالي:</b><br>${esc(activeFilterSummaryText())}</div></div>
  ${explanationStatsHtml([['السجلات',rows.length.toLocaleString('en-US')],['المعدات',uniq(rows.map(r=>r.plate)).length.toLocaleString('en-US')],['الفواتير',uniq(rows.map(r=>r.invoice)).length.toLocaleString('en-US')],['الموردون',uniq(rows.map(r=>r.supplier)).length.toLocaleString('en-US')],['قبل الضريبة',sar(m.before)],['VAT 15%',sar(m.vat)],['شامل الضريبة',sar(m.after)],['الفترة الزمنية',rowsDateRange(rows)]])}
  <div class="explain-sections"><div class="explain-box"><b>أبرز البيانات في الجدول:</b><ul><li>أعلى مورد بالقيمة: <b>${esc(sup[0])}</b> — <b>${sar(sup[1])}</b>.</li><li>أعلى معدة بالقيمة: <b>${esc(eq[0])}</b> — <b>${sar(eq[1])}</b>.</li><li>أعلى نشاط بالقيمة: <b>${esc(act[0])}</b> — <b>${sar(act[1])}</b>.</li><li>أعلى فاتورة بالقيمة: <b>${esc(inv[0])}</b> — <b>${sar(inv[1])}</b>.</li></ul></div><div class="explain-box"><b>معنى الأعمدة:</b><br>كل صف يمثل عملية مسحوب/استبدال مرتبطة بتاريخ ومعدة وسائق ونشاط وموضع وعملية ونوع/مقاس وهوية كفر ومورد ورقم فاتورة وسعر قبل الضريبة. الأرقام هنا محسوبة من الصفوف الظاهرة بعد تطبيق جميع الفلاتر، لذلك أي فلتر يغير الجدول وهذا التوضيح معًا.</div></div>`;
}


function chartColor(type){
 const colors={invoice:'#3b82f6',equipment:'#22c55e',supplier:'#eab308',tire:'#06b6d4',activity:'#f97316',tireId:'#8b5cf6',monthly:'#ef4444'};
 return colors[type]||'#3b82f6';
}
function renderDonut(sel,items,type){
 const el=$(sel), a=items.slice(0,7), total=a.reduce((s,x)=>s+x[1],0)||1;
 if(!a.length){el.innerHTML='<div class="empty">لا توجد بيانات</div>';return}
 const palette=['#f97316','#3b82f6','#22c55e','#eab308','#8b5cf6','#06b6d4','#ef4444'];
 let acc=0;
 const stops=a.map((x,i)=>{const p=x[1]/total*100,s=acc;acc+=p;return `${palette[i%palette.length]} ${s}% ${acc}%`}).join(',');
 el.innerHTML=`<div class="donut-wrap">
   <div class="donut" style="background:conic-gradient(${stops})">
     <div class="donut-hole"><strong>${money(total)}</strong><span>SAR</span></div>
   </div>
   <div class="donut-legend">${a.map(([k,v],i)=>`<div class="legend-row" data-type="${type}" data-value="${esc(k)}">
     <i style="background:${palette[i%palette.length]}"></i><span>${esc(k)}</span><b>${(v/total*100).toFixed(1)}%</b>
   </div>`).join('')}</div>
 </div>`;
 el.querySelectorAll('.legend-row').forEach(x=>x.onclick=()=>{
   if(type==='activity')$('#activity').value=x.dataset.value;
   if(type==='supplier')$('#supplier').value=x.dataset.value;
   render();
 });
}
function renderLollipop(sel,items,type){
 const el=$(sel),a=items.slice(0,12),mx=a[0]?.[1]||1,total=a.reduce((s,x)=>s+x[1],0)||1,c=chartColor(type);
 if(!a.length){el.innerHTML='<div class="empty">لا توجد بيانات</div>';return}
 el.innerHTML=`<div class="lollipop-chart">${a.map(([k,v])=>`
   <div class="lolli-row" data-value="${esc(k)}">
    <div class="lolli-name">${esc(type==='equipment'?equipmentFullLabel(k):k)}</div>
    <div class="lolli-track"><div class="lolli-line" style="width:${v/mx*100}%;background:${c}"><i style="background:${c}"></i></div></div>
    <div class="lolli-value">${money(v)} <small>${(v/total*100).toFixed(1)}%</small></div>
   </div>`).join('')}</div>`;
 el.querySelectorAll('.lolli-row').forEach(x=>x.onclick=()=>{
   if(type==='tire')$('#tire').value=x.dataset.value;
   if(type==='equipment')$('#equipment').value=x.dataset.value;
   render();
 });
}
function renderTreemap(sel,items,type){
 const el=$(sel),a=items.slice(0,10),total=a.reduce((s,x)=>s+x[1],0)||1;
 if(!a.length){el.innerHTML='<div class="empty">لا توجد بيانات</div>';return}
 const palette=['#eab308','#f59e0b','#22c55e','#3b82f6','#06b6d4','#8b5cf6','#f97316','#14b8a6','#ef4444','#64748b'];
 el.innerHTML=`<div class="treemap">${a.map(([k,v],i)=>`
  <div class="tree-item" data-value="${esc(k)}" style="flex-grow:${Math.max(v,1)};background:${palette[i%palette.length]}">
   <b>${esc(k)}</b><span>${money(v)} SAR</span><small>${(v/total*100).toFixed(1)}%</small>
  </div>`).join('')}</div>`;
 el.querySelectorAll('.tree-item').forEach(x=>x.onclick=()=>{
   if(type==='supplier')$('#supplier').value=x.dataset.value;
   render();
 });
}
function renderMonthlyArea(rows){
 rows=operationalRows(rows);
 const el=$('#monthlyChart'), groups=monthlyGroups(rows);
 if(!el || !groups.length)return;
 const vals=groups.map(([k,rs])=>[k,rs.reduce((s,r)=>s+(r.price||0),0)]);
 const max=Math.max(...vals.map(x=>x[1]),1), W=760,H=230,pad=35;
 const pts=vals.map((x,i)=>{
   const px=vals.length===1?W/2:pad+i*(W-2*pad)/(vals.length-1);
   const py=H-pad-(x[1]/max)*(H-2*pad);
   return [px,py,x];
 });
 const line=pts.map(p=>`${p[0]},${p[1]}`).join(' ');
 const area=`${pad},${H-pad} ${line} ${pts[pts.length-1][0]},${H-pad}`;
 el.innerHTML=`<div class="area-chart">
  <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="اتجاه المسحوبات الشهرية">
   <defs><linearGradient id="monthArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ef4444" stop-opacity=".42"/><stop offset="100%" stop-color="#ef4444" stop-opacity=".03"/></linearGradient></defs>
   <polyline points="${area}" fill="url(#monthArea)" stroke="none"/>
   <polyline points="${line}" fill="none" stroke="#ef4444" stroke-width="4" vector-effect="non-scaling-stroke"/>
   ${pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#fff" stroke="#ef4444" stroke-width="3" vector-effect="non-scaling-stroke"/>`).join('')}
  </svg>
  <div class="area-labels">${vals.map(([k,v])=>`<div><b>${esc(monthLabel(k))}</b><span>${money(v)} SAR</span></div>`).join('')}</div>
 </div>`;
}


function buildReferencePrintPage(title, subtitle, rows, key, accent){
  const allGroups=sumBy(rows,key);
  const chartGroups=allGroups.slice(0,10);
  const groups=allGroups;
  const total=groups.reduce((s,x)=>s+x[1],0)||1;
  const max=groups[0]?.[1]||1;
  const top=groups[0]||['—',0];
  const low=groups[groups.length-1]||['—',0];
  const count=rows.length;
  const distinct=groups.length;
  const avg=count?total/count:0;
  const scope=typeof activeFilterSummaryText==='function'?activeFilterSummaryText():'جميع البيانات';

  return `<section class="ref-print-page" style="--ref-accent:${accent}">
    <div class="ref-title-band">
      <div>
        <h2>${title}</h2>
        <p>${subtitle}</p>
      </div>
      <div class="ref-date">${new Date().toLocaleDateString('en-GB')}<br>${new Date().toLocaleTimeString('en-GB')}</div>
    </div>

    <div class="ref-kpis">
      <div><strong>${count.toLocaleString('en-US')}</strong><span>عدد السجلات</span></div>
      <div><strong>${distinct.toLocaleString('en-US')}</strong><span>عدد العناصر</span></div>
      <div><strong>${money(total)}</strong><span>إجمالي الإنفاق قبل الضريبة (SAR)</span></div>
      <div><strong>${(top[1]/total*100).toFixed(1)}%</strong><span>نسبة أعلى عنصر</span></div>
    </div>

    <div class="ref-main">
      <div class="ref-chart-panel">
        <h3>${title}</h3>
        <div class="ref-bars">
          ${chartGroups.map(([name,val])=>`
            <div class="ref-bar-row">
              <div class="ref-bar-name">${esc(name)}</div>
              <div class="ref-bar-track"><div class="ref-bar-fill" style="width:${Math.max(2,val/max*100)}%"></div></div>
              <div class="ref-bar-value">${money(val)}</div>
            </div>`).join('')}
        </div>
      </div>

      <div class="ref-table-panel">
        <table>
          <thead><tr><th>#</th><th>العنصر</th><th>السجلات</th><th>القيمة</th><th>النسبة</th></tr></thead>
          <tbody>
            ${groups.map(([name,val],i)=>{
              const n=rows.filter(r=>String(r[key]||'غير محدد')===String(name)).length;
              return `<tr><td>${i+1}</td><td>${esc(name)}</td><td>${n}</td><td>${money(val)}</td><td>${(val/total*100).toFixed(1)}%</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="ref-comment">
      <b>التوضيح الكامل:</b> إجمالي الإنفاق قبل الضريبة <b>${sar(total)}</b>، ومتوسط السجل <b>${sar(avg)}</b>.
      أعلى عنصر <b>${esc(top[0])}</b> بقيمة <b>${sar(top[1])}</b> (${(top[1]/total*100).toFixed(1)}%)،
      وأقل عنصر <b>${esc(low[0])}</b> بقيمة <b>${sar(low[1])}</b> (${(low[1]/total*100).toFixed(1)}%).
      عدد السجلات <b>${count}</b> وعدد العناصر <b>${distinct}</b>. نطاق الفلترة: <b>${esc(scope)}</b>.
    </div>

    
  </section>`;
}
function buildReferenceMonthlyPage(rows){
  const groups=monthlyGroups(rows);
  const total=rows.reduce((s,r)=>s+(r.price||0),0)||1;
  const vals=groups.map(([k,rs])=>[monthLabel(k),rs.reduce((s,r)=>s+(r.price||0),0),rs.length]);
  const max=Math.max(...vals.map(x=>x[1]),1);
  const top=[...vals].sort((a,b)=>b[1]-a[1])[0]||['—',0,0];

  return `<section class="ref-print-page" style="--ref-accent:#8c3030">
    <div class="ref-title-band">
      <div><h2>تقرير المسحوبات الشهرية</h2><p>توزيع الإنفاق حسب كل شهر ضمن نطاق التقرير</p></div>
      <div class="ref-date">${new Date().toLocaleDateString('en-GB')}<br>${new Date().toLocaleTimeString('en-GB')}</div>
    </div>
    <div class="ref-kpis">
      <div><strong>${groups.length}</strong><span>عدد الأشهر</span></div>
      <div><strong>${rows.length}</strong><span>عدد المسحوبات</span></div>
      <div><strong>${money(total)}</strong><span>إجمالي الإنفاق (SAR)</span></div>
      <div><strong>${(top[1]/total*100).toFixed(1)}%</strong><span>أعلى شهر</span></div>
    </div>
    <div class="ref-main">
      <div class="ref-chart-panel">
        <h3>المسحوبات حسب الشهر</h3>
        <div class="ref-bars">
          ${vals.map(([name,val])=>`<div class="ref-bar-row"><div class="ref-bar-name">${esc(name)}</div><div class="ref-bar-track"><div class="ref-bar-fill" style="width:${Math.max(2,val/max*100)}%"></div></div><div class="ref-bar-value">${money(val)}</div></div>`).join('')}
        </div>
      </div>
      <div class="ref-table-panel">
        <table><thead><tr><th>#</th><th>الشهر</th><th>المسحوبات</th><th>القيمة</th><th>النسبة</th></tr></thead>
        <tbody>${vals.map(([name,val,c],i)=>`<tr><td>${i+1}</td><td>${esc(name)}</td><td>${c}</td><td>${money(val)}</td><td>${(val/total*100).toFixed(1)}%</td></tr>`).join('')}</tbody></table>
      </div>
    </div>
    <div class="ref-comment"><b>التوضيح الكامل:</b> الفترة تشمل <b>${groups.length}</b> شهر/أشهر و<b>${rows.length}</b> مسحوبًا بإجمالي <b>${sar(total)}</b>. أعلى شهر هو <b>${esc(top[0])}</b> بقيمة <b>${sar(top[1])}</b> (${(top[1]/total*100).toFixed(1)}%). متوسط الشهر <b>${sar(groups.length?total/groups.length:0)}</b>. جميع القيم محسوبة وفق نطاق الفلترة الحالي: <b>${esc(typeof activeFilterSummaryText==='function'?activeFilterSummaryText():'جميع البيانات')}</b>.</div>
    
  </section>`;
}
function renderReferencePrintReports(rows){
  rows=operationalRows(rows);
  const box=document.getElementById('referencePrintReports');
  if(!box)return;
  box.innerHTML=[
    buildReferencePrintPage('الإنفاق حسب الفاتورة','تحليل المسحوبات المرتبطة بكل فاتورة',rows,'invoice','#1f2c67'),
    buildReferencePrintPage('الإنفاق حسب المعدة','تحليل تكلفة الكفرات لكل معدة / لوحة',rows,'plate','#2d5f47'),
    buildReferencePrintPage('الإنفاق حسب المورد','تحليل الإنفاق حسب الموردين',rows,'supplier','#8a6a17'),
    buildReferencePrintPage('الإنفاق حسب نوع ومقاس الكفر','مقارنة الإنفاق بين أنواع ومقاسات الكفرات',rows,'tire_type','#236977'),
    buildReferencePrintPage('الإنفاق حسب النشاط','توزيع الإنفاق بين الأنشطة التشغيلية',rows,'activity','#874718'),
    buildReferencePrintPage('تقرير هوية الكفر','تحليل السجلات المرتبطة بكل هوية كفر',rows,'tire_id','#5a3f86'),
    buildReferenceMonthlyPage(rows)
  ].join('');
}

let __heavyRenderTimer=0,__heavyRenderIdle=0,__heavyRenderRows=null,__heavyRenderSeq=0;

function runHeavyDashboardRender(a,seq){
 if(seq!==__heavyRenderSeq)return;
 const allRows=Array.isArray(a)?a:filters();
 a=operationalRows(allRows);

 renderPrintReports(a);
 renderMonthlyReport(a);
 renderMonthlyArea(a);
 renderReferencePrintReports(a);

 renderBars('#invoiceChart',sumBy(a,'invoice'),'invoice');
 renderBars('#equipmentChart',sumBy(a,'plate'),'equipment');
 renderTreemap('#supplierChart',sumBy(a,'supplier'),'supplier');
 renderLollipop('#tireChart',sumBy(a,'tire_type'),'tire');
 renderCompactSummary('#invoiceSummary',a,'invoice','الفاتورة');
 if(typeof equipmentSummary==='function')equipmentSummary(a);else renderCompactSummary('#equipmentSummary',a,'plate','المعدة');
 renderCompactSummary('#supplierSummary',a,'supplier','المورد');
 renderCompactSummary('#tireSummary',a,'tire_type','نوع/مقاس الكفر');

 renderDashboardExplanation('#invoiceExplain',a,'invoice','فاتورة');
 renderDashboardExplanation('#equipmentExplain',a,'plate','معدة');
 renderDashboardExplanation('#supplierExplain',a,'supplier','مورد');
 renderDashboardExplanation('#tireExplain',a,'tire_type','نوع/مقاس كفر');
 renderDashboardExplanation('#activityExplain',a,'activity','نشاط');
 renderDashboardExplanation('#tireIdExplain',a,'tire_id','هوية كفر');

 renderMonthlyExplanation(a);
 renderDonut('#activityChart',sumBy(a,'activity'),'activity');
 renderActivitySummary(a);
 renderBars('#tireIdChart',tireIdGroupsAsc(a),'tireId');
 renderTireIdSummary(a);
 renderInvoice(a);
 renderTable(allRows);
 renderRecordsExplanation(allRows);

 if(typeof window.renderSupplierInvoiceReport==='function')window.renderSupplierInvoiceReport();

 if(document.getElementById('inventoryReport')?.classList.contains('nav-report-active')){
   try{window.renderInventoryReport?.()}catch(e){}
   try{window.refreshInventoryEnhancements?.()}catch(e){}
 }
}
function scheduleHeavyDashboardRender(a,delay=90){
 __heavyRenderRows=a;
 __heavyRenderSeq++;
 const seq=__heavyRenderSeq;
 clearTimeout(__heavyRenderTimer);
 if(__heavyRenderIdle && 'cancelIdleCallback' in window){
   try{cancelIdleCallback(__heavyRenderIdle)}catch(e){}
 }
 __heavyRenderTimer=setTimeout(()=>{
   const run=()=>runHeavyDashboardRender(__heavyRenderRows,seq);
   if('requestIdleCallback' in window)__heavyRenderIdle=requestIdleCallback(run,{timeout:350});
   else run();
 },delay);
}
window.flushHeavyDashboardRender=function(){
 clearTimeout(__heavyRenderTimer);
 __heavyRenderSeq++;
 const seq=__heavyRenderSeq;
 runHeavyDashboardRender(__heavyRenderRows||filters(),seq);
};

function render(){
 invalidateDashboardCaches();
 const allRows=filters(),a=operationalRows(allRows),m=metrics(a);
 updateDynamicReportTitle();

 $('#kpis').innerHTML=[
 ['السجلات',m.rows,'كل العمليات المطابقة'],['المعدات',m.equip,'عدد اللوحات المختلفة'],['الفواتير',m.inv,'ضمن النتائج'],
 ['قبل الضريبة',sar(m.before),'سعر الكفر قبل VAT'],['VAT 15%',sar(m.vat),'ضريبة القيمة المضافة'],['شامل الضريبة',sar(m.after),'الإجمالي النهائي']
 ].map(([l,v,s])=>`<div class="card kpi"><label>${l}</label><strong>${v}</strong><small>${s}</small></div>`).join('');

 updateClearFilterButton();
 $('#filteredStatus').textContent=allRows.length.toLocaleString('en-US')+' نتيجة | '+activeFilterCount()+' فلتر نشط';

 if(typeof window.renderHomeMiniSummaries==='function')window.renderHomeMiniSummaries(a);

 // Render the three important home areas as soon as the browser can paint.
 setTimeout(()=>{try{window.renderFastDashboard?.()}catch(e){}},0);

 // Update only the screen currently visible; hidden reports are not rebuilt.
 setTimeout(()=>{try{window.refreshActiveScreen?.()}catch(e){}},0);

 // Keep invoice withdrawal details synchronized with the EXACT filtered dataset.
 try{
   if(typeof window.__refreshInvoiceWithdrawalDetails==='function'){
     window.__refreshInvoiceWithdrawalDetails(a);
   }
 }catch(e){console.warn('Invoice withdrawal details refresh:',e)}
}
async function refresh(){
 if(loading)return;loading=true;$('#conn').textContent='جاري التحديث...';
 try{let r=await loadSheet(),d=parseTable(r.table);if(d.length){DATA=d;lastGood=new Date();localStorage.setItem('unifiedTireData',JSON.stringify(DATA));$('#conn').textContent='● متصل — مباشر';$('#conn').className='pill ok'}}
 catch(e){try{let d=JSON.parse(localStorage.getItem('unifiedTireData')||'null');if(Array.isArray(d)&&d.length)DATA=d}catch{}$('#conn').textContent='● آخر بيانات محفوظة';$('#conn').className='pill'}
 finally{loading=false;$('#rowsStatus').textContent=DATA.length.toLocaleString('en-US')+' سجل';{
  const now=new Date();
  $('#updated').textContent='آخر تحديث: '+now.toLocaleDateString('en-GB')+' — '+now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}fillOptions();render();setTimeout(()=>window.notifyLiveDataChanged?.('main-sheet'),0)}
}
let __filterRenderTimer=0;
function requestMainRender(){
 clearTimeout(__filterRenderTimer);
 __filterRenderTimer=setTimeout(()=>{
   render();
   setTimeout(()=>window.notifyLiveDataChanged?.('local-filter'),0);
 },35);
}
['search','from','to','activity','equipment','supplier','tire','tireId'].forEach(id=>$('#'+id).addEventListener('input',requestMainRender));
$('#invoice').addEventListener('change',requestMainRender);
$('#clear').onclick=()=>{
 ['search','from','to','activity','equipment','supplier','invoice','tire','tireId','position','inventoryStatus'].forEach(id=>{const e=$('#'+id);if(e)e.value=''});
 render();
 setTimeout(()=>window.notifyLiveDataChanged?.('clear-filters'),0);
};
$('#refresh').onclick=refresh;$('#print').onclick=()=>{if(typeof window.printFullReportPackage==='function')window.printFullReportPackage();else window.print();};
try{let d=JSON.parse(localStorage.getItem('unifiedTireData')||'null');if(Array.isArray(d)&&d.length)DATA=d}catch{}
fillOptions();render();
setTimeout(refresh,DATA.length?900:40);
setInterval(()=>{if(document.visibilityState==='visible')refresh()},Math.max(typeof AUTO==='number'?AUTO:10000,60000));

function updateHeaderDateTime(){
  const now=new Date();
  const d=document.getElementById('headerDate');
  const t=document.getElementById('headerTime');
  if(d) d.textContent=now.toLocaleDateString('en-GB');
  if(t) t.textContent=now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
updateHeaderDateTime();
setInterval(updateHeaderDateTime,1000);


function updatePrintCover(){
  const now=new Date();
  const d=document.getElementById('coverDate');
  const t=document.getElementById('coverTime');
  const s=document.getElementById('coverScope');
  if(d) d.textContent=now.toLocaleDateString('en-GB');
  if(t) t.textContent=now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  if(s){
    const parts=[];
    if($('#from')?.value) parts.push(`من ${datefmt($('#from').value)}`);
    if($('#to')?.value) parts.push(`إلى ${datefmt($('#to').value)}`);
    if($('#activity')?.value) parts.push(`النشاط: ${$('#activity').value}`);
    if($('#equipment')?.value) parts.push(`المعدة: ${$('#equipment').value}`);
    if($('#supplier')?.value) parts.push(`المورد: ${$('#supplier').value}`);
    if($('#invoice')?.value) parts.push(`الفاتورة: ${$('#invoice').value}`);
    if($('#tire')?.value) parts.push(`الكفر: ${$('#tire').value}`);
    if($('#tireId')?.value) parts.push(`هوية الكفر: ${$('#tireId').value}`);
    if($('#search')?.value?.trim()) parts.push(`بحث: ${$('#search').value.trim()}`);
    if(window.SOURCE_SHEET_FILTER?.active) parts.push(`فلتر صفحة الإدخال: ${window.SOURCE_SHEET_FILTER.visibleRows} صف ظاهر`);
    s.textContent='نطاق التقرير: '+(parts.length?parts.join(' | '):'جميع البيانات');
  }
}
document.addEventListener('beforeprint',updatePrintCover);
updatePrintCover();


function applyTheme(theme){
  const safeTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', safeTheme);
  try{ localStorage.setItem('tireReportTheme', safeTheme); }catch(e){}
  const icon=document.getElementById('themeIcon');
  const text=document.getElementById('themeText');
  const btn=document.getElementById('themeToggle');
  if(icon) icon.textContent = safeTheme === 'dark' ? '☀️' : '🌙';
  if(text) text.textContent = safeTheme === 'dark' ? 'الوضع الفاتح' : 'الوضع الغامق';
  if(btn) btn.title = safeTheme === 'dark' ? 'التحويل إلى الوضع الفاتح' : 'التحويل إلى الوضع الغامق';
}
function initThemeToggle(){
  let saved='dark';
  try{ saved=localStorage.getItem('tireReportTheme') || 'dark'; }catch(e){}
  applyTheme(saved);
  const btn=document.getElementById('themeToggle');
  if(btn) btn.addEventListener('click',()=>{
    const current=document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}
initThemeToggle();

