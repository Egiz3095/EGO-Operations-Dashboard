
/* ===== Supplier invoices cross-sheet report — exact 9-column layout ===== */
(function(){
 const SUPPLIER_SHEET_NAME='فواتير الموردين';
 let SI_RAW=[], SI_INVOICES=[], SI_LOADING=false, SI_LAST_ERROR='';
 const invoiceKey=s=>String(s??'').trim().replace(/\.0$/,'').replace(/\s+/g,'').toLowerCase();
 const itemKey=s=>String(s??'').trim().toLowerCase()
   .replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي')
   .replace(/[×xX*]/g,'x').replace(/[^\u0600-\u06FFa-z0-9]+/gi,'');
 function cstr(c){if(!c)return '';if(c.f!==undefined&&c.f!==null&&c.f!=='')return String(c.f).trim();return c.v==null?'':String(c.v).trim()}
 function cnum(c){if(!c)return null;const raw=c.v??c.f;if(raw===null||raw===undefined||raw==='')return null;let s=String(raw).replace(/[^\d.,-]/g,'').replace(/,/g,'');let n=parseFloat(s);return Number.isFinite(n)?n:null}
 function cdate(c){if(!c)return '';if(typeof c.v==='string'){let m=c.v.match(/^Date\((\d+),(\d+),(\d+)/);if(m)return `${m[1]}-${String(+m[2]+1).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`}try{return normalizeDate(cstr(c))||''}catch(e){return cstr(c)}}
 function parseSupplierTable(t){
   if(!t?.rows)return [];
   // ترتيب الأعمدة حسب ورقة Google Sheets كما حدده المستخدم:
   // 0 مسلسل | 1 إسم المورد | 2 رقم الفاتورة | 3 تاريخ الفاتورة | 4 إسم الصنف
   // 5 الكمية | 6 السعر قبل الضريبة | 7 الضريبة | 8 الإجمالي مع الضريبة
   return t.rows.map((r,idx)=>{
     const c=r.c||[];
     const qty=cnum(c[5]), unitBefore=cnum(c[6]), tax=cnum(c[7]), totalWithTax=cnum(c[8]);
     return {
       _row:idx+2,
       serial:cstr(c[0]), supplier:cstr(c[1]), invoice:cstr(c[2]), date:cdate(c[3]), item:cstr(c[4]),
       qty:Number.isFinite(qty)?qty:0, unitBefore, tax, totalWithTax,
       lineBefore:(Number.isFinite(qty)&&Number.isFinite(unitBefore))?qty*unitBefore:null
     };
   }).filter(x=>x.invoice||x.supplier||x.item||x.qty||x.totalWithTax!=null);
 }
 function loadSupplierSheet(){
   return new Promise((resolve,reject)=>{
     const cb='si_g_'+Date.now()+'_'+Math.random().toString(36).slice(2),s=document.createElement('script');let done=false;
     const clean=()=>{try{delete window[cb]}catch(e){};s.remove()};
     window[cb]=r=>{if(done)return;done=true;clean();r?.status==='error'?reject(Error(r?.errors?.[0]?.detailed_message||'خطأ في تبويب فواتير الموردين')):resolve(r)};
     s.onerror=()=>{if(done)return;done=true;clean();reject(Error('فشل الاتصال بتبويب فواتير الموردين'))};
     s.src=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:${cb}&headers=1&sheet=${encodeURIComponent(SUPPLIER_SHEET_NAME)}&t=${Date.now()}`;
     document.head.appendChild(s);setTimeout(()=>{if(!done){done=true;clean();reject(Error('انتهت مهلة تحميل فواتير الموردين'))}},15000);
   });
 }
 function buildItemBreakdown(rows,withdrawals){
   const gm=new Map();
   rows.forEach(r=>{const k=itemKey(r.item)||`__row_${r._row}`;if(!gm.has(k))gm.set(k,{key:k,item:r.item||'غير محدد',qty:0,value:0,rows:[]});const g=gm.get(k);g.qty+=Number(r.qty)||0;g.value+=Number(r.totalWithTax)||0;g.rows.push(r)});
   const groups=[...gm.values()];
   const used=new Set();
   groups.forEach(g=>{
     let matched=[];
     withdrawals.forEach((w,i)=>{if(used.has(i))return;const wk=itemKey(w.tire_type);if(wk&&g.key===wk){matched.push(i)}});
     if(!matched.length && g.key && !g.key.startsWith('__row_')){
       withdrawals.forEach((w,i)=>{if(used.has(i))return;const wk=itemKey(w.tire_type);if(wk&&Math.min(wk.length,g.key.length)>=4&&(wk.includes(g.key)||g.key.includes(wk)))matched.push(i)});
     }
     matched.forEach(i=>used.add(i));
     g.withdrawn=matched.length;g.remaining=g.qty-g.withdrawn;g.withdrawalRows=matched.map(i=>withdrawals[i]);
   });
   return {groups,unmatched:withdrawals.filter((_,i)=>!used.has(i))};
 }
 function getMainFilteredRows(){
   try{return (typeof filters==='function')?filters():((typeof DATA!=='undefined'&&Array.isArray(DATA))?DATA:[])}catch(e){return (typeof DATA!=='undefined'&&Array.isArray(DATA))?DATA:[]}
 }
 function hasMainFilters(){
   try{
     if(window.SOURCE_SHEET_FILTER?.active) return true;
     const ids=['search','from','to','activity','equipment','supplier','invoice','tire','tireId'];
     return ids.some(id=>{const el=document.getElementById(id);return !!(el&&String(el.value||'').trim())});
   }catch(e){return false}
 }
 function buildInvoices(){
   // The supplier-invoice report follows the SAME global filter used by all tire reports.
   // With no global filters it shows all supplier invoices. Once any global filter is active,
   // only invoices referenced by the filtered withdrawal records remain in scope.
   const mainRows=getMainFilteredRows();
   const limitToMain=hasMainFilters();
   const allowedInvoices=new Set(mainRows.map(r=>invoiceKey(r.invoice)).filter(Boolean));
   const invoiceSource=limitToMain ? SI_RAW.filter(r=>allowedInvoices.has(invoiceKey(r.invoice))) : SI_RAW;

   /* Supplier stock is consumed only on the FIRST installation ("جديد").
      Parking, reuse, swap and service-end are lifecycle movements of the same tire
      and must never consume the supplier invoice quantity again. */
   const purchaseIssues=[];
   const seenIssuedTires=new Set();
   mainRows.forEach(r=>{
     if(!window.EGOTireOps?.isPurchaseIssue?.(r))return;
     const tid=String(r.tire_id||'').trim();
     const key=tid?('tire:'+tid.toLowerCase()):('row:'+String(r.id||'')+'|'+String(r.date||'')+'|'+String(r.invoice||''));
     if(seenIssuedTires.has(key))return;
     seenIssuedTires.add(key);
     purchaseIssues.push(r);
   });

   const groups=new Map();
   invoiceSource.forEach(r=>{const k=invoiceKey(r.invoice)||`__row_${r._row}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)});

   // Withdrawals are always taken from the globally-filtered tire records so all quantities,
   // supplier summaries and status calculations react to the main filter immediately.
   const withdrawals=new Map();
   purchaseIssues.forEach(r=>{const k=invoiceKey(r.invoice);if(!k)return;if(!withdrawals.has(k))withdrawals.set(k,[]);withdrawals.get(k).push(r)});

   SI_INVOICES=[...groups.entries()].map(([k,rows])=>{
     const inv=rows.map(x=>x.invoice).find(Boolean)||''; const w=withdrawals.get(invoiceKey(inv))||[];
     const supplier=[...new Set(rows.map(x=>x.supplier).filter(Boolean))].join('، ') || [...new Set(w.map(x=>x.supplier).filter(Boolean))].join('، ');
     const date=rows.map(x=>x.date).filter(Boolean).sort()[0]||'';
     const totalQty=rows.reduce((s,x)=>s+(Number(x.qty)||0),0);
     const invoiceTotal=rows.reduce((s,x)=>s+(Number(x.totalWithTax)||0),0);
     const beforeTotal=rows.reduce((s,x)=>s+(Number(x.lineBefore)||0),0);
     const taxTotal=rows.reduce((s,x)=>s+(Number(x.tax)||0),0);
     const withdrawnQty=w.length, remainingQty=totalQty-withdrawnQty;
     let status='none'; if(totalQty>0){if(remainingQty<0)status='over';else if(Math.abs(remainingQty)<.0001)status='done';else status='open'}
     const bd=buildItemBreakdown(rows,w);
     return {key:k,invoice:inv,supplier,date,totalQty,withdrawnQty,remainingQty,invoiceTotal,beforeTotal,taxTotal,status,rows,withdrawals:w,itemGroups:bd.groups,unmatchedWithdrawals:bd.unmatched};
   });

   // Include filtered withdrawals whose invoice number does not exist in the supplier-invoice tab.
   withdrawals.forEach((w,k)=>{if(SI_INVOICES.some(x=>invoiceKey(x.invoice)===k))return;SI_INVOICES.push({key:k,invoice:w[0]?.invoice||k,supplier:[...new Set(w.map(x=>x.supplier).filter(Boolean))].join('، '),date:w.map(x=>x.date).filter(Boolean).sort()[0]||'',totalQty:0,withdrawnQty:w.length,remainingQty:-w.length,invoiceTotal:0,beforeTotal:0,taxTotal:0,status:'none',rows:[],withdrawals:w,itemGroups:[],unmatchedWithdrawals:w})});
   SI_INVOICES.sort((a,b)=>{const ad=a.date||'',bd=b.date||'';if(ad&&!bd)return -1;if(!ad&&bd)return 1;return ad.localeCompare(bd)||String(a.invoice).localeCompare(String(b.invoice),'ar')});
 }
 function filteredSI(){
   const q=document.getElementById('siSearch')?.value.trim().toLowerCase()||'',sup=document.getElementById('siSupplier')?.value||'',st=document.getElementById('siStatus')?.value||'';
   return SI_INVOICES.filter(x=>{if(sup&&x.supplier!==sup)return false;if(st&&x.status!==st)return false;if(q&&!([x.invoice,x.supplier,...x.rows.map(r=>r.item)].join(' ').toLowerCase().includes(q)))return false;return true});
 }
 function statusLabel(st){return st==='open'?'بها متبقي':st==='done'?'مسحوبة بالكامل':st==='over'?'سحب زائد':'بدون كمية فاتورة'}
 function fmtQty(n){return (Number(n)||0).toLocaleString('en-US',{maximumFractionDigits:2})}
 function renderSupplierOptions(){const el=document.getElementById('siSupplier');if(!el)return;const old=el.value,vals=[...new Set(SI_INVOICES.map(x=>x.supplier).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));el.innerHTML='<option value="">كل الموردين</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(vals.includes(old))el.value=old}
 function renderSIExplanation(a){
   const el=document.getElementById('siExplain');if(!el)return;
   el.classList.add('report-explain-full');
   if(!a.length){el.innerHTML='<div class="explain-empty"><b>التوضيح الكامل:</b> لا توجد فواتير موردين مطابقة للفلاتر الحالية.</div>';return}
   const invoiceValue=a.reduce((s,x)=>s+(Number(x.invoiceTotal)||0),0),totalQty=a.reduce((s,x)=>s+(Number(x.totalQty)||0),0),drawn=a.reduce((s,x)=>s+(Number(x.withdrawnQty)||0),0),remaining=totalQty-drawn;
   const suppliers=[...new Set(a.map(x=>x.supplier).filter(Boolean))];
   const dates=a.map(x=>x.date).filter(Boolean).sort();
   const rate=totalQty?drawn/totalQty*100:0;
   const statusCounts={open:a.filter(x=>x.status==='open').length,done:a.filter(x=>x.status==='done').length,over:a.filter(x=>x.status==='over').length,none:a.filter(x=>x.status==='none').length};
   const topInvoice=[...a].sort((x,y)=>(y.invoiceTotal||0)-(x.invoiceTotal||0))[0];
   const topRemaining=[...a].sort((x,y)=>(y.remainingQty||0)-(x.remainingQty||0))[0];
   const sm=new Map();a.forEach(x=>{const n=x.supplier||'غير محدد',v=sm.get(n)||{value:0,qty:0,drawn:0};v.value+=Number(x.invoiceTotal)||0;v.qty+=Number(x.totalQty)||0;v.drawn+=Number(x.withdrawnQty)||0;sm.set(n,v)});
   const topSupplier=[...sm.entries()].sort((x,y)=>y[1].value-x[1].value)[0]||['—',{value:0,qty:0,drawn:0}];
   const local=[];const q=document.getElementById('siSearch')?.value?.trim();if(q)local.push(`بحث الفواتير: ${q}`);const su=document.getElementById('siSupplier')?.value;if(su)local.push(`مورد التقرير: ${su}`);const st=document.getElementById('siStatus')?.value;if(st)local.push(`الحالة: ${statusLabel(st)}`);
   const globalScope=typeof activeFilterSummaryText==='function'?activeFilterSummaryText():'حسب الفلتر العام';
   const scope=local.length?`${globalScope} | ${local.join(' | ')}`:globalScope;
   const period=dates.length?`${datefmt(dates[0])} ← ${datefmt(dates[dates.length-1])}`:'لا توجد تواريخ';
   el.innerHTML=`<div class="explain-head"><div><h3>التوضيح والتحليل الكامل — فواتير الموردين</h3><p>تسوية كمية وقيمة الفواتير مع المسحوبات المرتبطة بأرقام الفواتير، وتتغير لحظيًا حسب الفلاتر العامة وفلاتر هذا التقرير.</p></div><div class="explain-scope"><b>نطاق الفلترة الحالي:</b><br>${esc(scope)}</div></div>
   ${explanationStatsHtml([['عدد الفواتير',a.length.toLocaleString('en-US')],['عدد الموردين',suppliers.length.toLocaleString('en-US')],['إجمالي الفواتير شامل الضريبة',money(invoiceValue)+' SAR'],['الكمية الواردة',fmtQty(totalQty)],['إجمالي المسحوب',fmtQty(drawn)],['إجمالي المتبقي',fmtQty(remaining)],['نسبة السحب',rate.toFixed(1)+'%'],['فترة الفواتير',period]])}
   <div class="explain-sections"><div class="explain-box"><b>حالة الفواتير والنتائج:</b><ul><li>بها متبقي: <b>${statusCounts.open}</b> فاتورة.</li><li>مسحوبة بالكامل: <b>${statusCounts.done}</b> فاتورة.</li><li>سحب زائد عن كمية الفاتورة: <b>${statusCounts.over}</b> فاتورة.</li><li>بدون كمية فاتورة: <b>${statusCounts.none}</b> فاتورة.</li><li>أعلى فاتورة بالقيمة: <b>${esc(topInvoice?.invoice||'—')}</b> — <b>${money(topInvoice?.invoiceTotal||0)} SAR</b>.</li></ul></div><div class="explain-box"><b>قراءة التسوية:</b><br>المتبقي = الكمية الواردة في الفاتورة − عدد الكفرات التي تم تركيبها لأول مرة بعملية «جديد» لنفس الفاتورة. أعلى مورد بالقيمة هو <b>${esc(topSupplier[0])}</b> بإجمالي <b>${money(topSupplier[1].value)} SAR</b>. وأكبر كمية متبقية حاليًا مرتبطة بالفاتورة <b>${esc(topRemaining?.invoice||'—')}</b> بمقدار <b>${fmtQty(topRemaining?.remainingQty||0)}</b>. الضغط على أي فاتورة يعرض بنودها والمسحوبات المرتبطة بها بالتفصيل.</div></div>`;
 }
 function renderSupplierInvoiceReport(){
   buildInvoices();renderSupplierOptions();const a=filteredSI(); const k=document.getElementById('siKpis'),tb=document.getElementById('siTbody'),count=document.getElementById('siCount'); if(!k||!tb)return;
   const invoiceValue=a.reduce((s,x)=>s+x.invoiceTotal,0),totalQty=a.reduce((s,x)=>s+x.totalQty,0),drawn=a.reduce((s,x)=>s+x.withdrawnQty,0),remaining=totalQty-drawn,open=a.filter(x=>x.status==='open').length;
   k.innerHTML=`<div class="si-kpi"><label>عدد الفواتير</label><strong>${a.length.toLocaleString('en-US')}</strong><small>ضمن الفلتر الحالي</small></div><div class="si-kpi"><label>إجمالي قيمة الفواتير</label><strong>${money(invoiceValue)}</strong><small>SAR شامل الضريبة</small></div><div class="si-kpi"><label>إجمالي الكمية الواردة</label><strong>${fmtQty(totalQty)}</strong><small>كفر / وحدة</small></div><div class="si-kpi"><label>خرج لأول تركيب</label><strong>${fmtQty(drawn)}</strong><small>عملية «جديد» فقط</small></div><div class="si-kpi"><label>إجمالي المتبقي</label><strong>${fmtQty(remaining)}</strong><small>كمية غير مسحوبة</small></div>`;
   if(count)count.textContent=`${a.length} فاتورة${hasMainFilters()?' — حسب الفلتر العام':''}`;
   tb.innerHTML=a.length?a.map(x=>{const cls=x.remainingQty<0?'si-neg':Math.abs(x.remainingQty)<.0001?'si-zero':'si-pos';return `<tr data-si-invoice="${esc(x.invoice)}"><td>${x.date?datefmt(x.date):'—'}</td><td>${esc(x.supplier||'—')}</td><td class="mono">${esc(x.invoice||'—')}</td><td class="si-money">${x.invoiceTotal?money(x.invoiceTotal):'—'}</td><td class="si-money">${fmtQty(x.totalQty)}</td><td class="si-money">${fmtQty(x.withdrawnQty)}</td><td class="si-money ${cls}">${fmtQty(x.remainingQty)}</td><td><span class="si-badge ${x.status}">${statusLabel(x.status)}</span></td></tr>`}).join(''):'<tr><td colspan="8" class="empty">لا توجد فواتير مطابقة</td></tr>';
   const sm=new Map();
   a.forEach(x=>{
     const supplier=x.supplier||'غير محدد';
     const v=sm.get(supplier)||{incoming:0,used:0};
     v.incoming+=Number(x.totalQty)||0;
     v.used+=Number(x.withdrawnQty)||0;
     sm.set(supplier,v);
   });
   const ss=document.getElementById('siSupplierSummary');
   if(ss){
     const rows=[...sm.entries()].sort((x,y)=>
       y[1].incoming-x[1].incoming ||
       y[1].used-x[1].used ||
       String(x[0]).localeCompare(String(y[0]),'ar')
     );
     ss.innerHTML=rows.length?`
       <div class="si-supplier-simple-wrap">
         <table class="si-supplier-simple-table">
           <thead>
             <tr>
               <th>المورد</th>
               <th>الوارد</th>
               <th>خرج لأول تركيب</th>
               <th>المتبقي</th>
             </tr>
           </thead>
           <tbody>
             ${rows.map(([name,v])=>{
               const remaining=v.incoming-v.used;
               return `<tr>
                 <td class="si-supplier-name-cell"><b>${esc(name)}</b></td>
                 <td class="si-num">${fmtQty(v.incoming)}</td>
                 <td class="si-num">${fmtQty(v.used)}</td>
                 <td class="si-num ${remaining<0?'si-neg':'si-pos'}">${fmtQty(remaining)}</td>
               </tr>`;
             }).join('')}
           </tbody>
         </table>
       </div>
     `:'<div class="empty">لا توجد بيانات</div>';
   }
   renderSIExplanation(a);
   if(typeof window.renderHomeSupplierInvoicesMini==='function') window.renderHomeSupplierInvoicesMini(a);
 }
 function showSIDetail(invoice){
   const x=SI_INVOICES.find(r=>String(r.invoice)===String(invoice));const p=document.getElementById('siDetail');if(!x||!p)return;
   const itemRows=x.itemGroups.length?x.itemGroups.map(g=>{
     const unit=g.rows.map(r=>r.unitBefore).find(v=>Number.isFinite(v));
     const tax=g.rows.reduce((s,r)=>s+(Number(r.tax)||0),0),total=g.rows.reduce((s,r)=>s+(Number(r.totalWithTax)||0),0);
     const cls=g.remaining<0?'si-neg':Math.abs(g.remaining)<.0001?'si-zero':'si-pos';
     return `<tr><td>${esc(g.item||'—')}</td><td class="si-money">${fmtQty(g.qty)}</td><td class="si-money">${unit!=null?money(unit):'—'}</td><td class="si-money">${tax?money(tax):'—'}</td><td class="si-money">${total?money(total):'—'}</td><td class="si-money">${fmtQty(g.withdrawn)}</td><td class="si-money ${cls}">${fmtQty(g.remaining)}</td></tr>`;
   }).join(''):'<tr><td colspan="7" class="empty">لا توجد بنود في تبويب فواتير الموردين</td></tr>';
   const wr=x.withdrawals.length?x.withdrawals.map(r=>`<tr><td>${r.date?datefmt(r.date):'—'}</td><td>${esc(r.plate||'—')}</td><td>${esc(r.tire_type||'—')}</td><td>${esc(r.tire_id||'—')}</td><td class="si-money">${r.price!=null?money(r.price):'—'}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">لا توجد عمليات «جديد» مرتبطة بهذه الفاتورة</td></tr>';
   const unmatched=x.unmatchedWithdrawals?.length?`<div class="si-note" style="margin-top:8px">تنبيه: يوجد ${x.unmatchedWithdrawals.length} مسحوب مرتبط برقم الفاتورة لم تتم مطابقة اسم صنفه نصيًا مع «إسم الصنف» في الفاتورة؛ وهو محسوب في إجمالي المسحوبات للفاتورة.</div>`:'';
   p.innerHTML=`<div class="si-detail-head"><div><h3>تفاصيل الفاتورة ${esc(x.invoice||'—')}</h3><div class="hint">${esc(x.supplier||'مورد غير محدد')} ${x.date?' — '+datefmt(x.date):''}</div></div><span class="si-badge ${x.status}">${statusLabel(x.status)}</span></div><div class="si-detail-grid"><div><b>إجمالي الفاتورة مع الضريبة</b><strong>${x.invoiceTotal?money(x.invoiceTotal)+' SAR':'—'}</strong></div><div><b>الكمية الواردة</b><strong>${fmtQty(x.totalQty)}</strong></div><div><b>المسحوب</b><strong>${fmtQty(x.withdrawnQty)}</strong></div><div><b>المتبقي</b><strong>${fmtQty(x.remainingQty)}</strong></div></div><div class="si-detail-cols"><div><div class="si-card-title">بنود الفاتورة والتسوية حسب الصنف</div><div class="si-mini"><table><thead><tr><th>إسم الصنف</th><th>الكمية</th><th>السعر قبل الضريبة</th><th>الضريبة</th><th>الإجمالي مع الضريبة</th><th>المسحوب</th><th>المتبقي</th></tr></thead><tbody>${itemRows}</tbody></table></div>${unmatched}</div><div><div class="si-card-title">تفاصيل أول تركيب المرتبط برقم الفاتورة</div><div class="si-mini"><table><thead><tr><th>التاريخ</th><th>المعدة</th><th>نوع الكفر ومقاسه</th><th>هوية الكفر</th><th>السعر قبل الضريبة</th></tr></thead><tbody>${wr}</tbody></table></div></div></div>`;p.classList.add('show');p.scrollIntoView({behavior:'smooth',block:'nearest'});
 }
 async function refreshSupplierInvoices(){
   if(SI_LOADING)return;SI_LOADING=true;const state=document.getElementById('siState');if(state){state.textContent='جاري تحميل فواتير الموردين...';state.className='si-state'}
   try{const r=await loadSupplierSheet();SI_RAW=parseSupplierTable(r.table);SI_LAST_ERROR='';try{localStorage.setItem('supplierInvoiceDataV2',JSON.stringify(SI_RAW))}catch(e){};if(state){state.textContent=`● متصل — ${SI_RAW.length} بند من فواتير الموردين`;state.className='si-state ok'}}
   catch(e){SI_LAST_ERROR=e.message||String(e);try{const d=JSON.parse(localStorage.getItem('supplierInvoiceDataV2')||'null');if(Array.isArray(d))SI_RAW=d}catch(_e){};if(state){state.textContent=SI_RAW.length?`● آخر بيانات محفوظة — ${SI_RAW.length} بند`:`⚠ ${SI_LAST_ERROR}`;state.className='si-state warn'}}
   finally{
     SI_LOADING=false;
     renderSupplierInvoiceReport();
     try{window.renderInventoryReport?.()}catch(_e){}
     try{window.invalidateDashboardCaches?.()}catch(_e){}
     try{window.refreshInventoryEnhancements?.()}catch(_e){}
     try{window.renderStockForecastNow?.()}catch(_e){}
     try{window.notifyLiveDataChanged?.('supplier-invoices')}catch(_e){}
     try{window.refreshInvoiceSupplierSummary?.()}catch(_e){}
   }
 }
 window.renderSupplierInvoiceReport=renderSupplierInvoiceReport;
 window.getSupplierInvoiceData=()=>SI_INVOICES;
 window.getSupplierInvoiceRawData=()=>SI_RAW;
 window.refreshSupplierInvoiceData=refreshSupplierInvoices;
 function init(){
   try{const d=JSON.parse(localStorage.getItem('supplierInvoiceDataV2')||'null');if(Array.isArray(d))SI_RAW=d}catch(e){}
   document.getElementById('siSearch')?.addEventListener('input',renderSupplierInvoiceReport);document.getElementById('siSupplier')?.addEventListener('change',renderSupplierInvoiceReport);document.getElementById('siStatus')?.addEventListener('change',renderSupplierInvoiceReport);
   document.getElementById('siClear')?.addEventListener('click',()=>{['siSearch','siSupplier','siStatus'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});renderSupplierInvoiceReport()});
   document.getElementById('siTbody')?.addEventListener('click',e=>{const tr=e.target.closest('tr[data-si-invoice]');if(tr)showSIDetail(tr.dataset.siInvoice)});
   document.getElementById('supplierInvoicesJump')?.addEventListener('click',()=>document.getElementById('supplierInvoicesReport')?.scrollIntoView({behavior:'smooth',block:'start'}));
   document.getElementById('refresh')?.addEventListener('click',()=>setTimeout(refreshSupplierInvoices,150));
   const rs=document.getElementById('rowsStatus');if(rs&&window.MutationObserver)new MutationObserver(()=>renderSupplierInvoiceReport()).observe(rs,{childList:true,subtree:true,characterData:true});
   window.addEventListener('beforeprint',()=>renderSupplierInvoiceReport());
   renderSupplierInvoiceReport();
setTimeout(refreshSupplierInvoices,1200);
setInterval(()=>{
  if(document.visibilityState!=='visible')return;
  const active=document.getElementById('supplierInvoicesReport')?.classList.contains('nav-report-active') ||
               document.getElementById('inventoryReport')?.classList.contains('nav-report-active');
  if(active)refreshSupplierInvoices();
},120000);
 }
 init();
})();
