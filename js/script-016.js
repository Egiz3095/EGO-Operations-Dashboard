
(function(){
 const LOG_KEY='ego-dashboard-activity-log-v1';
 const BACKUP_VERSION=1;
 const LOW_STOCK_THRESHOLD=5;

 function currentUser(){try{return window.EGOAccess?.getCurrentUser?.()?.username||'غير معروف'}catch(e){return 'غير معروف'}}
 function logActivity(action,detail=''){
   const a=JSON.parse(localStorage.getItem(LOG_KEY)||'[]');
   a.unshift({ts:new Date().toISOString(),user:currentUser(),action,detail});
   localStorage.setItem(LOG_KEY,JSON.stringify(a.slice(0,300)));
   renderActivityLog();
 }
 window.EGOLogActivity=logActivity;

 function renderActivityLog(){
   const box=document.getElementById('activityLogList');if(!box)return;
   let a=[];try{a=JSON.parse(localStorage.getItem(LOG_KEY)||'[]')}catch(e){}
   box.innerHTML=a.length?a.slice(0,80).map(x=>`<div class="activity-row"><small>${new Date(x.ts).toLocaleString('ar-EG')}</small><b>${esc(x.user)} — ${esc(x.action)}</b><span>${esc(x.detail||'')}</span></div>`).join(''):'<div class="empty">لا يوجد نشاط مسجل بعد</div>';
 }
 function mountAdminExtras(){
   const a=document.getElementById('activityLogMount'),p=document.getElementById('activityLogPanel');if(a&&p&&!a.firstChild)a.appendChild(p);
   const b=document.getElementById('backupMount'),q=document.getElementById('backupPanel');if(b&&q&&!b.firstChild)b.appendChild(q);
   renderActivityLog();
 }

 // Role presets
 const presets={
  admin:{reportInvoice:1,reportEquipment:1,reportSupplier:1,reportTire:1,reportActivity:1,reportTireId:1,tireLifecycleReport:1,tirePositionReport:1,reportMonthly:1,supplierInvoicesReport:1,inventoryReport:1,records:1,filters:1,print:1,pdf:1,manageUsers:1},
  supervisor:{reportInvoice:1,reportEquipment:1,reportSupplier:1,reportTire:1,reportActivity:1,reportTireId:1,tireLifecycleReport:1,tirePositionReport:1,reportMonthly:1,supplierInvoicesReport:1,inventoryReport:1,records:1,filters:1,print:1,pdf:1,manageUsers:0},
  viewer:{reportInvoice:1,reportEquipment:1,reportSupplier:1,reportTire:1,reportActivity:1,reportTireId:1,tireLifecycleReport:1,tirePositionReport:1,reportMonthly:1,supplierInvoicesReport:1,inventoryReport:1,records:0,filters:1,print:0,pdf:0,manageUsers:0},
  entry:{reportInvoice:0,reportEquipment:0,reportSupplier:0,reportTire:0,reportActivity:0,reportTireId:0,tireLifecycleReport:0,tirePositionReport:0,reportMonthly:0,supplierInvoicesReport:0,inventoryReport:0,records:0,filters:0,print:0,pdf:0,manageUsers:0}
 };
 function applyPreset(){
   const role=document.getElementById('rolePreset')?.value;if(!role||role==='custom')return;
   if(typeof syncDynamicReportPermissions==='function')syncDynamicReportPermissions();
   const p=presets[role];
   document.querySelectorAll('#userAdminForm [data-perm]').forEach(c=>{
     const perm=c.dataset.perm;
     if(Object.prototype.hasOwnProperty.call(p,perm))c.checked=!!p[perm];
     else c.checked=!SYSTEM_PERMS.includes(perm) && role!=='entry';
   });
 }

 // Inventory computation — direct, reliable reconciliation
 function supplierInvoiceRawRows(){
   try{return window.getSupplierInvoiceRawData?.()||[]}catch(e){return []}
 }
 function normalizeInvItem(s){
   return String(s??'').trim().toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي')
    .replace(/[×xX*]/g,'x').replace(/\s+/g,' ').replace(/[^\u0600-\u06FFa-z0-9x ]+/gi,'').trim();
 }
 function normalizeInvNo(s){
   return String(s??'').trim().replace(/\.0$/,'').replace(/\s+/g,'').toLowerCase();
 }
 function inventoryWithdrawalRows(){
   try{
     // Respect the global dashboard filter, including Google Sheets source filter.
     return typeof filters==='function' ? filters() : (Array.isArray(DATA)?DATA:[]);
   }catch(e){
     return Array.isArray(DATA)?DATA:[];
   }
 }
 window.__EGO_PERF_CACHE=window.__EGO_PERF_CACHE||{inventorySig:'',inventory:[],alertSig:'',alerts:[]};

 function buildInventory(){
   const raw=supplierInvoiceRawRows();
   const withdrawals=inventoryWithdrawalRows();
   const filterSig=typeof dashboardFilterSignature==='function'?dashboardFilterSignature():String(withdrawals.length);
   const rawLast=raw[raw.length-1]||{};
   const sig=[filterSig,raw.length,rawLast.invoice||'',rawLast.item||'',rawLast.qty||''].join('|');

   const perf=window.__EGO_PERF_CACHE;
   if(perf.inventorySig===sig)return perf.inventory;

   const map=new Map(),invoiceBuckets=new Map();

   raw.forEach(r=>{
     const invNorm=normalizeInvNo(r.invoice);
     const item=String(r.item||'غير محدد').trim()||'غير محدد';
     /* الجرد يكون حسب الصنف نفسه وليس حسب الصنف + رقم الفاتورة.
        لذلك الصنف المتطابق في عدة فواتير يظهر كسطر مخزون واحد. */
     const itemNorm=normalizeInvItem(item)||'غير محدد';
     const key=itemNorm;
     let o=map.get(key);
     if(!o){
       o={key,item,invoice:String(r.invoice||'').trim(),incoming:0,used:0,remain:0,
          invoices:new Set(),suppliers:new Set(),unmatched:false,sourceRows:[]};
       map.set(key,o);
     }
     o.incoming+=Number(r.qty)||0;
     o.invoices.add(String(r.invoice||'').trim());
     if(r.supplier)o.suppliers.add(r.supplier);
     o.sourceRows.push(r);

     /* نفس الصنف قد يكون تابعاً لأكثر من فاتورة؛ نربطه بكل فاتورة
        حتى تتم مطابقة المسحوبات مع الفاتورة الصحيحة دون تكرار الصنف في الجرد. */
     if(!invoiceBuckets.has(invNorm))invoiceBuckets.set(invNorm,[]);
     const bucket=invoiceBuckets.get(invNorm);
     if(!bucket.includes(o))bucket.push(o);
   });

   const unmatchedMap=new Map();
   withdrawals.forEach(w=>{
     const invNorm=normalizeInvNo(w.invoice);
     if(!invNorm)return;
     const tireNorm=normalizeInvItem(w.tire_type);
     let target=null;
     const bucket=invoiceBuckets.get(invNorm)||[];
     target=bucket.find(x=>normalizeInvItem(x.item)===tireNorm)||null;

     if(!target){
       target=bucket.find(x=>{
         const k=normalizeInvItem(x.item);
         return tireNorm&&k&&Math.min(tireNorm.length,k.length)>=4&&(tireNorm.includes(k)||k.includes(tireNorm));
       })||null;
     }

     if(target){target.used+=1;return}

     const inv=String(w.invoice||'').trim()||'بدون فاتورة';
     const item=String(w.tire_type||'صنف غير محدد').trim()||'صنف غير محدد';
     const key='__unmatched__'+invNorm+'||'+tireNorm;
     let u=unmatchedMap.get(key);
     if(!u){
       u={key,item:`${item} — غير مطابق`,invoice:inv,incoming:0,used:0,remain:0,
          invoices:new Set([inv]),suppliers:new Set(w.supplier?[w.supplier]:[]),
          unmatched:true,sourceRows:[]};
       unmatchedMap.set(key,u);
     }
     u.used+=1;
   });

   const rows=[...map.values(),...unmatchedMap.values()].map(o=>{
     o.remain=(Number(o.incoming)||0)-(Number(o.used)||0);
     o.invoices.delete('');
     return o;
   }).sort((a,b)=>{
     if(a.unmatched!==b.unmatched)return a.unmatched?1:-1;
     return a.remain-b.remain||a.item.localeCompare(b.item,'ar');
   });

   perf.inventorySig=sig;
   perf.inventory=rows;
   return rows;
 }
 function stockStatus(x){
   if(x.unmatched)return ['over','غير مطابق'];
   if(x.remain<0)return ['over','سحب زائد'];
   if(Math.abs(x.remain)<.0001)return ['out','نفد'];
   if(x.remain<=LOW_STOCK_THRESHOLD)return ['low','مخزون منخفض'];
   return ['ok','متوفر'];
 }
 function inventoryFilteredData(){
   const data=buildInventory();
   const q=(document.getElementById('search')?.value||'').trim().toLowerCase();
   const st=document.getElementById('inventoryStatus')?.value||'';
   const tire=document.getElementById('tire')?.value||'';
   const sup=document.getElementById('supplier')?.value||'';
   const invoice=document.getElementById('invoice')?.value||'';

   return data.filter(x=>{
     const status=stockStatus(x)[0];
     if(st&&status!==st)return false;
     if(tire && normalizeInvItem(x.item).indexOf(normalizeInvItem(tire))<0)return false;
     if(sup && !x.suppliers.has(sup))return false;
     if(invoice && !x.invoices.has(String(invoice)))return false;
     if(q){
       const hay=[x.item,x.invoice,...x.invoices,...x.suppliers].join(' ').toLowerCase();
       if(!hay.includes(q))return false;
     }
     return true;
   });
 }
 function renderInventory(){
   const raw=supplierInvoiceRawRows();
   const data=buildInventory();
   const a=inventoryFilteredData();

   const state=document.getElementById('inventoryState');
   if(!raw.length){
     if(state)state.textContent='جاري تحميل بيانات فواتير الموردين…';
     const k=document.getElementById('inventoryKpis');
     if(k)k.innerHTML=[
       ['عدد الأصناف','…'],['إجمالي الوارد','…'],['إجمالي المسحوب','…'],['إجمالي المتبقي','…']
     ].map(([l,v])=>`<div class="inventory-kpi"><span>${l}</span><b>${v}</b></div>`).join('');
     const bars=document.getElementById('inventoryBars');
     if(bars)bars.innerHTML='<div class="empty">جاري تحميل بيانات المخزون…</div>';
     return;
   }

   const incoming=a.reduce((s,x)=>s+(Number(x.incoming)||0),0);
   const used=a.reduce((s,x)=>s+(Number(x.used)||0),0);
   const total=a.reduce((s,x)=>s+(Number(x.remain)||0),0);
   const low=a.filter(x=>['low','out','over'].includes(stockStatus(x)[0])).length;

   const k=document.getElementById('inventoryKpis');
   if(k)k.innerHTML=[
     ['عدد الأصناف',a.filter(x=>!x.unmatched).length],
     ['إجمالي الوارد',incoming],
     ['إجمالي المسحوب',used],
     ['إجمالي المتبقي',total]
   ].map(([l,v])=>`<div class="inventory-kpi"><span>${l}</span><b>${Number(v).toLocaleString('en-US',{maximumFractionDigits:2})}</b></div>`).join('');

   const positive=a.filter(x=>x.remain>0&&!x.unmatched);
   const mx=Math.max(1,...positive.map(x=>x.remain));
   const bars=document.getElementById('inventoryBars');
   if(bars)bars.innerHTML=positive.slice().sort((x,y)=>y.remain-x.remain).slice(0,15).map(x=>
     `<div class="inventory-bar-row">
       <div class="inventory-bar-name">${esc(x.item)}</div>
       <div class="inventory-bar-track"><div class="inventory-bar-fill" style="width:${Math.max(2,x.remain/mx*100)}%"></div></div>
       <div class="inventory-bar-val">${x.remain.toLocaleString('en-US',{maximumFractionDigits:2})}</div>
     </div>`
   ).join('')||'<div class="empty">لا توجد أرصدة موجبة ضمن الفلتر الحالي</div>';

   const tb=document.getElementById('inventoryTbody');
   if(tb)tb.innerHTML=a.map(x=>{
     const [c,l]=stockStatus(x);
     return `<tr>
       <td>${esc(x.item)}</td>
       <td>${x.incoming.toLocaleString('en-US',{maximumFractionDigits:2})}</td>
       <td>${x.used.toLocaleString('en-US',{maximumFractionDigits:2})}</td>
       <td>${x.remain.toLocaleString('en-US',{maximumFractionDigits:2})}</td>
       <td><span class="stock-badge ${c}">${l}</span></td>
       <td>${[...x.invoices].filter(Boolean).length}</td>
     </tr>`;
   }).join('')||'<tr><td colspan="6" class="empty">لا توجد بيانات مطابقة للفلاتر العامة</td></tr>';

   const ex=document.getElementById('inventoryExplain');
   if(ex){
     const allIncoming=data.reduce((s,x)=>s+(Number(x.incoming)||0),0);
     const allUsed=data.reduce((s,x)=>s+(Number(x.used)||0),0);
     const allRemain=data.reduce((s,x)=>s+(Number(x.remain)||0),0);
     const unmatched=data.filter(x=>x.unmatched).reduce((s,x)=>s+x.used,0);
     const over=data.filter(x=>!x.unmatched&&x.remain<0).length;
     ex.innerHTML=`<b>مراجعة المخزون:</b> الوارد من ورقة «فواتير الموردين» <b>${allIncoming.toLocaleString('en-US',{maximumFractionDigits:2})}</b>،
       والمسحوب من ورقة «الكفرات» <b>${allUsed.toLocaleString('en-US',{maximumFractionDigits:2})}</b>،
       والمتبقي <b>${allRemain.toLocaleString('en-US',{maximumFractionDigits:2})}</b>.
       ${unmatched?` يوجد <b>${unmatched}</b> مسحوب غير مطابق لصنف/فاتورة في ورقة الموردين.`:'لا توجد مسحوبات غير مطابقة.'}
       ${over?` ويوجد <b>${over}</b> صنف بسحب أكبر من الوارد.`:''}`;
   }

   if(state)state.textContent=`${a.length} بند مخزون — ${low} حالة تحتاج انتباه`;
   setTimeout(()=>window.refreshInventoryEnhancements?.(),0);
 }
 window.renderInventoryReport=renderInventory;
 window.addEventListener('inventory-rendered',()=>window.refreshInventoryEnhancements?.());

 // Executive summary
 function monthKey(d){return String(d||'').slice(0,7)}
 function renderExecutive(){
   const a=typeof filters==='function'?filters():DATA, now=new Date(), cur=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`, prevDate=new Date(now.getFullYear(),now.getMonth()-1,1), prev=`${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,'0')}`;
   const base=Array.isArray(a)?a:DATA, curRows=base.filter(r=>monthKey(r.date)===cur),prevRows=base.filter(r=>monthKey(r.date)===prev);
   const sum=r=>r.reduce((s,x)=>s+(Number(x.price)||0),0),curVal=sum(curRows),prevVal=sum(prevRows),chg=prevVal?((curVal-prevVal)/prevVal*100):0;
   const inv=buildInventory(),stock=inv.reduce((s,x)=>s+x.remain,0),low=inv.filter(x=>['low','out','over'].includes(stockStatus(x)[0])).length;
   const top=[...a].reduce((m,r)=>{const k=r.plate||'غير محدد';m[k]=(m[k]||0)+(r.price||0);return m},{});
   const topEq=Object.entries(top).sort((x,y)=>y[1]-x[1])[0]||['—',0];
   const k=document.getElementById('executiveKpis');if(k)k.innerHTML=[
    ['استهلاك الشهر',curRows.length,'عملية'],['قيمة الشهر',curVal.toLocaleString('en-US',{maximumFractionDigits:0})+' SAR','قبل الضريبة'],['المخزون المتبقي',stock,'وحدة'],['تنبيهات المخزون',low,'حالة'],['أعلى معدة',topEq[0],topEq[1]?topEq[1].toLocaleString('en-US')+' SAR':'—'],['الفواتير',new Set(a.map(r=>r.invoice).filter(Boolean)).size,'ضمن الفلتر']
   ].map(([l,v,s])=>`<div class="executive-kpi"><span>${l}</span><b>${esc(v)}</b><small>${s}</small></div>`).join('');
   const c=document.getElementById('executiveCompare');if(c)c.innerHTML=`مقارنة بالشهر السابق: <b>${chg>=0?'▲':'▼'} ${Math.abs(chg).toFixed(1)}%</b> في قيمة الاستهلاك. الشهر الحالي: <b>${money(curVal)} SAR</b> مقابل <b>${money(prevVal)} SAR</b> في الشهر السابق.`;
 }

 // Smart alerts
 function alerts(){
   const perf=window.__EGO_PERF_CACHE||(window.__EGO_PERF_CACHE={});
   const sig=(typeof dashboardFilterSignature==='function'?dashboardFilterSignature():'')+'|'+
     (window.getSupplierInvoiceRawData?.()?.length||0);
   if(perf.alertSig===sig&&Array.isArray(perf.alerts))return perf.alerts;

   const arr=[],inv=buildInventory();
   inv.forEach(x=>{
     const [s,l]=stockStatus(x);
     if(s!=='ok')arr.push({type:s,title:`${l}: ${x.item}`,detail:`المتبقي ${x.remain} من أصل ${x.incoming}.`,target:'inventoryReport'});
   });

   supplierInvoices().filter(x=>x.status==='over').forEach(x=>arr.push({
     type:'over',title:`سحب زائد — فاتورة ${x.invoice}`,detail:`المتبقي ${x.remainingQty}.`,target:'supplierInvoicesReport'
   }));

   const nowKey=monthKey(new Date().toISOString().slice(0,10));
   const prevD=new Date();prevD.setMonth(prevD.getMonth()-1);
   const prevKey=`${prevD.getFullYear()}-${String(prevD.getMonth()+1).padStart(2,'0')}`;
   let cv=0,pv=0;
   DATA.forEach(r=>{
     const k=monthKey(r.date),v=Number(r.price)||0;
     if(k===nowKey)cv+=v;
     else if(k===prevKey)pv+=v;
   });
   if(pv&&cv>pv*1.25)arr.unshift({
     type:'low',title:'ارتفاع ملحوظ في الاستهلاك الشهري',
     detail:`الاستهلاك أعلى من الشهر السابق بنسبة ${((cv-pv)/pv*100).toFixed(1)}%.`,target:'reportMonthly'
   });

   perf.alertSig=sig;perf.alerts=arr;
   return arr;
 }
 function renderAlerts(){
   const a=alerts(),b=document.getElementById('alertsCountBadge');if(b)b.textContent=a.length;
   const box=document.getElementById('alertsList');if(box)box.innerHTML=a.length?a.map((x,i)=>`<div class="alert-item" data-alert-target="${x.target}"><b>${esc(x.title)}</b><small>${esc(x.detail)}</small></div>`).join(''):'<div class="empty">لا توجد تنبيهات حاليًا</div>';
 }

 function ymFromDate(d){
   const x=d instanceof Date?d:new Date(d);
   if(Number.isNaN(x.getTime()))return '';
   return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`;
 }
 function previousMonthKey(base,n=1){
   const d=new Date(base.getFullYear(),base.getMonth()-n,1);
   return ymFromDate(d);
 }
 function normalizeAnalyticsItem(v){
   return String(v||'').trim().toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g,'')
    .replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي')
    .replace(/[×xX*]/g,'x').replace(/\s+/g,' ')
    .replace(/[^\u0600-\u06FFa-z0-9x ]+/gi,'').trim();
 }
 function matchInventoryUsageItem(invItem,rowItem){
   const a=normalizeAnalyticsItem(invItem),b=normalizeAnalyticsItem(rowItem);
   if(!a||!b)return false;
   return a===b || (Math.min(a.length,b.length)>=5 && (a.includes(b)||b.includes(a)));
 }
 function moneyCompact(v){
   const n=Number(v)||0;
   if(Math.abs(n)>=1e6)return (n/1e6).toFixed(1)+'M';
   if(Math.abs(n)>=1e3)return (n/1e3).toFixed(1)+'K';
   return n.toLocaleString('en-US',{maximumFractionDigits:0});
 }

 function buildOperationalTrends(){
   const base=(typeof filters==='function'?filters():DATA)||[];
   const now=new Date();
   const cur=ymFromDate(now), prev=previousMonthKey(now,1);
   const current=base.filter(r=>monthKey(r.date)===cur);
   const previous=base.filter(r=>monthKey(r.date)===prev);
   const sum=x=>x.reduce((s,r)=>s+(Number(r.price)||0),0);
   const curVal=sum(current),prevVal=sum(previous);
   const spendPct=prevVal?((curVal-prevVal)/prevVal*100):0;
   const countPct=previous.length?((current.length-previous.length)/previous.length*100):0;

   const eq={};base.forEach(r=>{const k=r.plate||'غير محدد';eq[k]=(eq[k]||0)+(Number(r.price)||0)});
   const eqSorted=Object.entries(eq).sort((a,b)=>b[1]-a[1]);
   const total=sum(base),eqShare=total&&eqSorted[0]?eqSorted[0][1]/total*100:0;

   const sup={};base.forEach(r=>{const k=r.supplier||'غير محدد';sup[k]=(sup[k]||0)+(Number(r.price)||0)});
   const supSorted=Object.entries(sup).sort((a,b)=>b[1]-a[1]);
   const supShare=total&&supSorted[0]?supSorted[0][1]/total*100:0;

   return [
     {label:'قيمة الشهر',value:`${spendPct>=0?'▲':'▼'} ${Math.abs(spendPct).toFixed(1)}%`,note:`${moneyCompact(curVal)} SAR مقابل ${moneyCompact(prevVal)} SAR`,cls:spendPct>5?'up':spendPct<-5?'down':'neutral'},
     {label:'عدد المسحوبات',value:`${countPct>=0?'▲':'▼'} ${Math.abs(countPct).toFixed(1)}%`,note:`${current.length} عملية هذا الشهر مقابل ${previous.length}`,cls:countPct>10?'up':countPct<-10?'down':'neutral'},
     {label:'تركيز أعلى معدة',value:`${eqShare.toFixed(1)}%`,note:eqSorted[0]?`${eqSorted[0][0]} من إجمالي الإنفاق`:'لا توجد بيانات',cls:eqShare>30?'up':'neutral'},
     {label:'تركيز أعلى مورد',value:`${supShare.toFixed(1)}%`,note:supSorted[0]?`${supSorted[0][0]} من إجمالي الإنفاق`:'لا توجد بيانات',cls:supShare>45?'up':'neutral'}
   ];
 }

 function buildStockForecast(){
   const inv=(typeof buildInventory==='function'?buildInventory():[])||[];
   const base=(typeof filters==='function'?filters():(Array.isArray(DATA)?DATA:[]))||[];
   if(!inv.length || !base.length)return [];

   const normalize=normalizeAnalyticsItem;
   const now=new Date();
   const cutoff90=new Date(now);cutoff90.setDate(cutoff90.getDate()-90);

   const usage90=new Map(), usageAll=new Map(), monthsByItem=new Map();
   let globalMin=null,globalMax=null;

   base.forEach(r=>{
     const key=normalize(r.tire_type);
     if(!key)return;
     const d=new Date(r.date);
     if(Number.isNaN(d.getTime()))return;

     if(!globalMin||d<globalMin)globalMin=d;
     if(!globalMax||d>globalMax)globalMax=d;

     usageAll.set(key,(usageAll.get(key)||0)+1);
     const mk=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
     if(!monthsByItem.has(key))monthsByItem.set(key,new Set());
     monthsByItem.get(key).add(mk);
     if(d>=cutoff90)usage90.set(key,(usage90.get(key)||0)+1);
   });

   const allKeys=[...usageAll.keys()];
   const matchUsage=(itemKey,map)=>{
     let n=map.get(itemKey)||0;
     if(n)return n;
     for(const k of allKeys){
       if(Math.min(itemKey.length,k.length)>=5&&(itemKey.includes(k)||k.includes(itemKey))){
         n+=(map.get(k)||0);
       }
     }
     return n;
   };
   const observedMonths=globalMin&&globalMax
     ? Math.max(1,(globalMax.getFullYear()-globalMin.getFullYear())*12+(globalMax.getMonth()-globalMin.getMonth())+1)
     : 1;

   return inv
     .filter(x=>!x.unmatched && Number(x.remain)>0)
     .map(x=>{
       const itemKey=normalize(x.item);
       const used90=matchUsage(itemKey,usage90);
       const usedAll=matchUsage(itemKey,usageAll);

       let monthlyRate=0,rateSource='';
       if(used90>0){
         monthlyRate=used90/3;
         rateSource='آخر 90 يوم';
       }else if(usedAll>0){
         const ownMonths=monthsByItem.get(itemKey)?.size||observedMonths;
         monthlyRate=usedAll/Math.max(1,ownMonths);
         rateSource='متوسط التاريخ المتاح';
       }

       const remain=Number(x.remain)||0;
       const months=monthlyRate>0?remain/monthlyRate:null;
       const days=months!==null?Math.max(0,Math.round(months*30.44)):null;
       const expectedDate=days!==null?new Date(Date.now()+days*86400000):null;
       const status=months===null?'no-rate':months<=1?'urgent':months<=2.5?'watch':'stable';

       return {...x,used90,usedAll,monthlyRate,months,days,expectedDate,status,rateSource};
     })
     .sort((a,b)=>{
       const am=a.months===null?999999:a.months;
       const bm=b.months===null?999999:b.months;
       return am-bm || Number(a.remain)-Number(b.remain);
     })
     .slice(0,12);
 }

 function renderStockForecastNow(){
   const box=document.getElementById('stockForecastList');
   if(!box)return;

   const raw=window.getSupplierInvoiceRawData?.()||[];
   if(!raw.length){
     box.innerHTML='<div class="decision-empty">جاري مزامنة فواتير الموردين لحساب توقع النفاد…</div>';
     return;
   }

   const forecast=buildStockForecast();
   if(!forecast.length){
     box.innerHTML='<div class="decision-empty">لا توجد أرصدة موجبة مع حركة سحب كافية لحساب توقع النفاد ضمن البيانات الحالية.</div>';
     return;
   }

   box.dataset.enriched='1';
   box.innerHTML=forecast.map(x=>{
     const remain=Number(x.remain)||0;
     const rate=Number(x.monthlyRate)||0;
     const date=x.expectedDate&&!Number.isNaN(x.expectedDate.getTime())
       ? x.expectedDate.toLocaleDateString('ar-EG',{year:'numeric',month:'short',day:'numeric'})
       : 'لا يوجد تاريخ متوقع';
     const time=x.months===null
       ? 'لا يوجد معدل سحب'
       : x.days<=45?`${x.days} يوم`
       : `${x.months.toFixed(1)} شهر`;
     const label=x.status==='urgent'?'عاجل':x.status==='watch'?'مراقبة':x.status==='stable'?'مستقر':'بدون معدل';
     const cls=x.status==='no-rate'?'stable':x.status;
     return `<div class="forecast-row" data-forecast-item="${esc(x.item)}" title="فتح تقرير المخزون">
       <div class="forecast-name">
         <b>${esc(x.item)}</b>
         <small>الرصيد ${remain.toLocaleString('en-US',{maximumFractionDigits:2})} • السحب ${rate.toFixed(2)} / شهر • ${esc(x.rateSource||'—')}</small>
       </div>
       <div class="forecast-months">${time}</div>
       <div class="forecast-status ${cls}">${label}<small class="forecast-date">${date}</small></div>
     </div>`;
   }).join('');
 }
 window.renderStockForecastNow=renderStockForecastNow;

 function buildEquipmentAnomalies(){
   const base=filters(),now=new Date(),cur=ymFromDate(now);
   const prevKeys=[1,2,3].map(n=>previousMonthKey(now,n));
   const wanted=new Set([cur,...prevKeys]),stats=new Map();

   base.forEach(r=>{
     const eq=String(r.plate||'').trim(),mk=monthKey(r.date);
     if(!eq||!wanted.has(mk))return;
     if(!stats.has(eq))stats.set(eq,{counts:new Map(),value:0});
     const s=stats.get(eq);
     s.counts.set(mk,(s.counts.get(mk)||0)+1);
     if(mk===cur)s.value+=Number(r.price)||0;
   });

   const result=[];
   stats.forEach((s,eq)=>{
     const current=s.counts.get(cur)||0;
     const avg=prevKeys.reduce((n,k)=>n+(s.counts.get(k)||0),0)/3;
     if(current>=3&&(avg===0?current>=4:current>=avg*1.75)){
       const ratio=avg?((current-avg)/avg*100):100;
       result.push({eq,current,avg,ratio,value:s.value});
     }
   });
   return result.sort((a,b)=>b.ratio-a.ratio).slice(0,6);
 }

 function buildDecisionPriorities(){
   const arr=[];
   const al=alerts();
   al.slice(0,6).forEach(x=>{
     arr.push({
       severity:x.type==='over'||x.type==='out'?'critical':x.type==='low'?'warning':'info',
       title:x.title,
       detail:x.detail,
       target:x.target
     });
   });

   // Add data-quality warning only when material.
   const base=(typeof filters==='function'?filters():DATA)||[];
   const missing=base.filter(r=>!String(r.invoice||'').trim()||!String(r.plate||'').trim()||!String(r.tire_type||'').trim()).length;
   if(base.length && missing/base.length>.05){
     arr.push({
       severity:'warning',
       title:'جودة البيانات تحتاج مراجعة',
       detail:`${missing} سجل ضمن النطاق الحالي به حقول أساسية ناقصة.`,
       target:'records'
     });
   }

   const an=buildEquipmentAnomalies();
   if(an[0]){
     arr.push({
       severity:'warning',
       title:`استهلاك غير معتاد — ${an[0].eq}`,
       detail:`${an[0].current} عملية هذا الشهر مقابل متوسط ${an[0].avg.toFixed(1)} خلال 3 أشهر.`,
       target:'reportEquipment'
     });
   }

   if(!arr.length){
     arr.push({
       severity:'success',
       title:'لا توجد حالات حرجة حاليًا',
       detail:'المؤشرات الرئيسية مستقرة ضمن البيانات والفلاتر الحالية.',
       target:'home'
     });
   }
   return arr.slice(0,8);
 }

 window.renderDecisionCenter=function renderDecisionCenter(){
   const priorities=buildDecisionPriorities();
   const plist=document.getElementById('decisionPriorityList');
   const pc=document.getElementById('decisionPriorityCount');
   if(pc)pc.textContent=String(priorities.filter(x=>x.severity!=='success').length);
   if(plist)plist.innerHTML=priorities.map((x,i)=>`
     <button type="button" class="decision-item ${x.severity}" data-decision-target="${esc(x.target||'home')}">
       <span class="decision-dot"></span>
       <span class="decision-item-main"><b>${esc(x.title)}</b><small>${esc(x.detail)}</small></span>
       <span class="decision-arrow">‹</span>
     </button>`).join('');

   const health=document.getElementById('decisionHealth');
   const critical=priorities.filter(x=>x.severity==='critical').length;
   const warnings=priorities.filter(x=>x.severity==='warning').length;
   if(health){
     health.className='decision-health '+(critical?'danger':warnings?'warn':'good');
     health.textContent=critical?`${critical} حالة حرجة`:warnings?`${warnings} حالة تحتاج متابعة`:'الحالة مستقرة';
   }

   const trends=buildOperationalTrends();
   const tg=document.getElementById('operationalTrendGrid');
   if(tg)tg.innerHTML=trends.map(t=>`
     <div class="trend-card ${t.cls}">
       <span>${esc(t.label)}</span><b>${esc(t.value)}</b><small>${esc(t.note)}</small>
     </div>`).join('');

   const forecasts=buildStockForecast();
   const fl=document.getElementById('stockForecastList');
   if(fl)fl.innerHTML=forecasts.length?forecasts.map(x=>`
     <div class="forecast-row" data-forecast-item="${esc(x.item)}" title="فتح تقرير المخزون">
       <div class="forecast-name"><b>${esc(x.item)}</b><small>الرصيد ${Number(x.remain).toLocaleString('en-US',{maximumFractionDigits:1})} • معدل ${x.monthlyRate.toFixed(1)} / شهر</small></div>
       <div class="forecast-months">${x.months<0.1?'<0.1':x.months.toFixed(1)} شهر</div>
       <div class="forecast-status ${x.status}">${x.status==='urgent'?'عاجل':x.status==='watch'?'مراقبة':'مستقر'}</div>
     </div>`).join(''):'<div class="decision-empty">لا توجد بيانات كافية لحساب توقع النفاد من آخر 90 يومًا.</div>';

   const anomalies=buildEquipmentAnomalies();
   const al=document.getElementById('anomalyList');
   if(al)al.innerHTML=anomalies.length?anomalies.map(x=>`
     <div class="anomaly-row" data-anomaly-equipment="${esc(x.eq)}" title="فتح تقرير المعدة">
       <div class="anomaly-name"><b>${esc(x.eq)}</b><small>${x.current} عملية هذا الشهر • متوسط 3 أشهر ${x.avg.toFixed(1)}</small></div>
       <div class="anomaly-metric"><b>+${x.ratio.toFixed(0)}%</b><small>فوق المتوسط</small></div>
       <div class="forecast-status watch">${moneyCompact(x.value)} SAR</div>
     </div>`).join(''):'<div class="decision-empty">لا توجد معدات باستهلاك غير معتاد وفق البيانات الحالية.</div>';
 }

 document.addEventListener('click',function(e){
   const d=e.target.closest('[data-decision-target]');
   if(d){
     const target=d.dataset.decisionTarget||'home';
     if(typeof window.openReportView==='function')window.openReportView(target);
     else document.querySelector(`[data-report-target="${cssEscape(target)}"]`)?.click();
     return;
   }
   const f=e.target.closest('[data-forecast-item]');
   if(f){
     if(typeof window.openReportView==='function')window.openReportView('inventoryReport');
     else document.querySelector('[data-report-target="inventoryReport"]')?.click();
     const q=document.getElementById('inventoryLocalSearch');
     if(q){q.value=f.dataset.forecastItem||'';q.dispatchEvent(new Event('input',{bubbles:true}))}
     return;
   }
   const a=e.target.closest('[data-anomaly-equipment]');
   if(a){
     const sel=document.getElementById('equipment');
     if(sel){
       sel.value=a.dataset.anomalyEquipment||'';
       sel.dispatchEvent(new Event('change',{bubbles:true}));
     }
     if(typeof window.openReportView==='function')window.openReportView('reportEquipment');
     else document.querySelector('[data-report-target="reportEquipment"]')?.click();
   }
 });


 // Global search
 function searchAll(q){
   q=String(q||'').trim().toLowerCase();if(!q)return [];
   const res=[];
   DATA.forEach(r=>{const hay=[r.invoice,r.plate,r.tire_id,r.supplier,r.tire_type,r.vehicle,r.driver].join(' ').toLowerCase();if(hay.includes(q))res.push({title:`${r.plate||'—'} — ${r.tire_type||'—'}`,detail:`فاتورة ${r.invoice||'—'} | هوية ${r.tire_id||'—'} | ${r.date||'—'}`,target:'records',search:q})});
   supplierInvoices().forEach(x=>{const hay=[x.invoice,x.supplier,...(x.rows||[]).map(r=>r.item)].join(' ').toLowerCase();if(hay.includes(q))res.push({title:`فاتورة ${x.invoice||'—'} — ${x.supplier||'—'}`,detail:`وارد ${x.totalQty} | مسحوب ${x.withdrawnQty} | متبقي ${x.remainingQty}`,target:'supplierInvoicesReport',invoice:x.invoice})});
   buildInventory().forEach(x=>{if([x.item,...x.invoices,...x.suppliers].join(' ').toLowerCase().includes(q))res.push({title:`مخزون: ${x.item}`,detail:`متبقي ${x.remain}`,target:'inventoryReport',search:x.item})});
   return res.slice(0,80);
 }
 function renderSearch(){
   const q=document.getElementById('globalSearchInput')?.value||'',a=searchAll(q),box=document.getElementById('globalSearchResults');if(!box)return;
   box.innerHTML=q?(a.length?a.map((x,i)=>`<div class="search-result" data-search-index="${i}"><b>${esc(x.title)}</b><small>${esc(x.detail)}</small></div>`).join(''):'<div class="empty">لا توجد نتائج</div>'):'<div class="empty">ابدأ بكتابة رقم فاتورة أو لوحة أو هوية كفر…</div>';
   box._results=a;
 }

 function openModal(id){const m=document.getElementById(id);if(m){m.classList.add('open');m.setAttribute('aria-hidden','false')}}
 function closeModal(id){const m=document.getElementById(id);if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true')}}

 // Backup
 function exportBackup(){
   const payload={version:BACKUP_VERSION,createdAt:new Date().toISOString(),users:JSON.parse(localStorage.getItem('ego-dashboard-users-v3')||'[]'),activity:JSON.parse(localStorage.getItem(LOG_KEY)||'[]'),theme:document.documentElement.getAttribute('data-theme')||'dark'};
   const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='EGO-dashboard-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);logActivity('تصدير نسخة احتياطية');
 }
 function importBackup(file){
   const rd=new FileReader();rd.onload=()=>{try{const x=JSON.parse(rd.result);if(Array.isArray(x.users))localStorage.setItem('ego-dashboard-users-v3',JSON.stringify(x.users));if(Array.isArray(x.activity))localStorage.setItem(LOG_KEY,JSON.stringify(x.activity));if(x.theme)document.documentElement.setAttribute('data-theme',x.theme);alert('تم استيراد النسخة الاحتياطية. أعد تحميل الصفحة لتطبيق كل الإعدادات.');logActivity('استيراد نسخة احتياطية')}catch(e){alert('ملف النسخة الاحتياطية غير صالح')}};rd.readAsText(file);
 }

 // Enhanced invoice detail trigger from global invoice filter.
 function enhanceInvoiceFilter(){
   const inv=document.getElementById('invoice');if(!inv)return;
   inv.addEventListener('change',()=>{if(inv.value){const x=supplierInvoices().find(s=>String(s.invoice)===String(inv.value));if(x){document.querySelector('[data-report-target="supplierInvoicesReport"]')?.click();setTimeout(()=>document.querySelector(`#siTbody tr[data-si-invoice="${CSS.escape(inv.value)}"]`)?.click(),120)}}});
 }


 const CHIP_FILTERS=[
   ['search','بحث'],['from','من'],['to','إلى'],['activity','النشاط'],['equipment','المعدة'],
   ['supplier','المورد'],['invoice','الفاتورة'],['tire','نوع/مقاس الكفر'],['tireId','هوية الكفر'],['position','موضع الكفر'],['inventoryStatus','حالة المخزون']
 ];
 function filterDisplayValue(id,el){
   if(id==='inventoryStatus')return ({ok:'متوفر',low:'مخزون منخفض',out:'نفد',over:'سحب زائد'}[el.value]||el.value);
   if(el.tagName==='SELECT')return el.options[el.selectedIndex]?.text||el.value;
   return el.value;
 }
 function renderFilterChips(){
   const box=document.getElementById('activeFilterChips');if(!box)return;
   const active=CHIP_FILTERS.map(([id,label])=>{const el=document.getElementById(id);const v=el&&String(el.value||'').trim();return v?{id,label,value:filterDisplayValue(id,el)}:null}).filter(Boolean);
   box.innerHTML=active.length
    ? `<div class="filter-chip-title"><span>✓ تمت إضافة ${active.length} فلتر</span><button type="button" class="filter-chip-clear-all" id="filterChipClearAll">مسح الكل</button></div><div class="filter-chip-list">${active.map(x=>`<button type="button" class="filter-chip" data-remove-filter="${x.id}" title="إزالة هذا الفلتر"><span>${esc(x.label)}: ${esc(x.value)}</span><b>×</b></button>`).join('')}</div>`
    : '<div class="filter-chip-empty">لا توجد فلاتر مضافة</div>';
 }
 function removeOneFilter(id){
   const el=document.getElementById(id);if(!el)return;
   el.value='';
   el.dispatchEvent(new Event('change',{bubbles:true}));
   el.dispatchEvent(new Event('input',{bubbles:true}));
   try{if(typeof render==='function')render()}catch(e){}
   renderInventory();renderFilterChips();
 }

 function smartRefresh(){
   logActivity('تحديث البيانات');
   try{document.getElementById('refresh')?.click()}catch(e){}
   try{window.refreshSupplierInvoiceData?.()}catch(e){}
   const b=document.getElementById('smartRefresh');if(b){const old=b.textContent;b.textContent='جاري التحديث…';setTimeout(()=>{b.textContent=old;renderAll()},1100)}
 }


 function activeDashboardFilterCount(){
   const ids=['search','from','to','activity','equipment','supplier','invoice','tire','tireId','position','inventoryStatus'];
   const local=ids.reduce((n,id)=>{
     const el=document.getElementById(id);
     return n+(el&&String(el.value||'').trim()?1:0);
   },0);
   return local+(window.SOURCE_SHEET_FILTER?.active?1:0);
 }

 window.renderProfessionalInsights=function renderProfessionalInsights(){
   const rows=(typeof filters==='function'?filters():DATA)||[];
   const allRows=Array.isArray(rows)?rows:[];
   const inv=(typeof buildInventory==='function'?buildInventory():[])||[];

   // Data quality: focus on fields that drive traceability.
   const qualityIssues=allRows.filter(r=>!String(r.invoice||'').trim() || !String(r.tire_type||'').trim() || !String(r.plate||'').trim()).length;
   const qualityPct=allRows.length?Math.max(0,100-(qualityIssues/allRows.length*100)):100;
   const q=document.getElementById('insightDataQuality');
   const qn=document.getElementById('insightDataQualityNote');
   if(q)q.textContent=qualityPct.toFixed(0)+'%';
   if(qn)qn.textContent=qualityIssues?`${qualityIssues} سجل يحتاج استكمال بيانات أساسية`:'الحقول الأساسية مكتملة ضمن النطاق الحالي';

   // Stock health.
   const healthy=inv.filter(x=>stockStatus(x)[0]==='ok').length;
   const issues=inv.filter(x=>stockStatus(x)[0]!=='ok').length;
   const sh=document.getElementById('insightStockHealth');
   const shn=document.getElementById('insightStockHealthNote');
   if(sh)sh.textContent=issues?`${issues} تنبيه`:`مستقر`;
   if(shn)shn.textContent=inv.length?`${healthy} بند بحالة متوفرة من أصل ${inv.length}`:'بانتظار بيانات فواتير الموردين';

   // Highest invoice by spending.
   const invSpend={};
   allRows.forEach(r=>{
     const key=String(r.invoice||'').trim();
     if(key)invSpend[key]=(invSpend[key]||0)+(Number(r.price)||0);
   });
   const topInv=Object.entries(invSpend).sort((a,b)=>b[1]-a[1])[0]||['—',0];
   const ti=document.getElementById('insightTopInvoice');
   const tin=document.getElementById('insightTopInvoiceNote');
   if(ti)ti.textContent=topInv[0];
   if(tin)tin.textContent=topInv[1]?`${money(topInv[1])} SAR قبل الضريبة`:'لا توجد قيمة متاحة ضمن النطاق';

   // Highest supplier by spending.
   const supplierSpend={};
   allRows.forEach(r=>{
     const key=String(r.supplier||'').trim();
     if(key)supplierSpend[key]=(supplierSpend[key]||0)+(Number(r.price)||0);
   });
   const topSupplier=Object.entries(supplierSpend).sort((a,b)=>b[1]-a[1])[0]||['—',0];
   const ts=document.getElementById('insightTopSupplier');
   const tsn=document.getElementById('insightTopSupplierNote');
   if(ts)ts.textContent=topSupplier[0];
   if(tsn)tsn.textContent=topSupplier[1]?`${money(topSupplier[1])} SAR ضمن الفلاتر الحالية`:'لا توجد قيمة متاحة ضمن النطاق';

   // Home context.
   const hr=document.getElementById('homeContextRows');
   const hf=document.getElementById('homeContextFilters');
   const ha=document.getElementById('homeContextAlerts');
   const hc=document.getElementById('homeContextConnection');
   if(hr)hr.textContent=`${allRows.length.toLocaleString('en-US')} سجل`;
   if(hf)hf.textContent=String(activeDashboardFilterCount());
   let alertCount=0;
   try{alertCount=(typeof alerts==='function'?alerts():[]).length}catch(e){}
   if(ha)ha.textContent=String(alertCount);
   const conn=document.getElementById('conn');
   if(hc)hc.textContent=conn?.textContent?.replace(/^●\s*/,'')||'—';

   // Alert badge should disappear at zero.
   const badge=document.getElementById('alertsCountBadge');
   if(badge){
     badge.textContent=alertCount?String(alertCount):'';
     badge.hidden=!alertCount;
   }

   const ft=document.getElementById('footerDataTime');
   if(ft)ft.textContent='آخر عرض: '+new Date().toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'});
 }

 window.renderFastDashboard=function(){
   renderExecutive();
   renderAlerts();
   renderProfessionalInsights();
   renderDecisionCenter();
 };
 function renderAll(){
   renderFilterChips();
   window.renderCriticalHomeFast?.();
 }

 function init(){
   mountAdminExtras();
   document.getElementById('applyRolePreset')?.addEventListener('click',applyPreset);
   document.getElementById('inventoryStatus')?.addEventListener('change',()=>{renderInventory();renderFilterChips();try{updateClearFilterButton()}catch(e){}});
   document.getElementById('globalSearchOpen')?.addEventListener('click',()=>{openModal('globalSearchModal');setTimeout(()=>document.getElementById('globalSearchInput')?.focus(),60)});
   document.getElementById('alertsOpen')?.addEventListener('click',()=>openModal('alertsModal'));
   document.querySelectorAll('[data-ops-close]').forEach(x=>x.addEventListener('click',()=>closeModal(x.dataset.opsClose)));
   document.getElementById('globalSearchInput')?.addEventListener('input',renderSearch);
   document.getElementById('globalSearchResults')?.addEventListener('click',e=>{const row=e.target.closest('[data-search-index]');if(!row)return;const x=e.currentTarget._results?.[+row.dataset.searchIndex];if(!x)return;closeModal('globalSearchModal');document.querySelector(`[data-report-target="${x.target}"]`)?.click();if(x.target==='records'&&x.search){const s=document.getElementById('search');if(s){s.value=x.search;s.dispatchEvent(new Event('input',{bubbles:true}))}}if(x.target==='inventoryReport'&&x.search){const s=document.getElementById('search');if(s){s.value=x.search;s.dispatchEvent(new Event('input',{bubbles:true}));renderInventory();renderFilterChips()}}if(x.invoice)setTimeout(()=>document.querySelector(`#siTbody tr[data-si-invoice="${CSS.escape(x.invoice)}"]`)?.click(),120);logActivity('بحث شامل',x.title)});
   document.getElementById('alertsList')?.addEventListener('click',e=>{const row=e.target.closest('[data-alert-target]');if(row){closeModal('alertsModal');document.querySelector(`[data-report-target="${row.dataset.alertTarget}"]`)?.click()}});
   document.getElementById('smartRefresh')?.addEventListener('click',smartRefresh);
   document.getElementById('clearActivityLog')?.addEventListener('click',()=>{if(confirm('مسح سجل النشاط؟')){localStorage.removeItem(LOG_KEY);renderActivityLog()}});
   document.getElementById('exportBackup')?.addEventListener('click',exportBackup);
   document.getElementById('importBackup')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)importBackup(f)});
   document.getElementById('launcherCollapse')?.addEventListener('click',()=>document.getElementById('uiLauncherStack')?.classList.toggle('launcher-collapsed'));
   document.addEventListener('click',e=>{const nav=e.target.closest('[data-report-target]');if(nav)logActivity('فتح تقرير',nav.dataset.reportTarget);if(e.target.closest('#print,[data-print-report]'))logActivity('طباعة تقرير');if(e.target.closest('.input-page-btn'))logActivity('فتح صفحة الإدخال')},true);

   const generalFilterBox=document.querySelector('.filters');
   if(generalFilterBox){
     const onGeneralFilter=()=>{
       try{invalidateDashboardCaches()}catch(e){}
       renderFilterChips();
       if(document.getElementById('inventoryReport')?.classList.contains('nav-report-active'))renderInventory();
       setTimeout(()=>window.renderFastDashboard?.(),0);
     };
     generalFilterBox.addEventListener('input',onGeneralFilter,true);
     generalFilterBox.addEventListener('change',onGeneralFilter,true);
   }
   document.getElementById('activeFilterChips')?.addEventListener('click',e=>{
     const b=e.target.closest('[data-remove-filter]');if(b){removeOneFilter(b.dataset.removeFilter);return}if(e.target.closest('#filterChipClearAll'))document.getElementById('clear')?.click();
   });
   document.getElementById('clear')?.addEventListener('click',()=>setTimeout(()=>{renderInventory();renderFilterChips()},0));
   renderFilterChips();

   enhanceInvoiceFilter();
   let fastDashTimer=0;
   const requestFastDashboard=()=>{
     clearTimeout(fastDashTimer);
     fastDashTimer=setTimeout(()=>{try{renderAll()}catch(e){}},35);
   };
   const rs=document.getElementById('rowsStatus');
   if(rs&&window.MutationObserver)new MutationObserver(requestFastDashboard).observe(rs,{childList:true,subtree:true,characterData:true});
   setTimeout(requestFastDashboard,60);
   /* replaced by full-page 15s reload */
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
