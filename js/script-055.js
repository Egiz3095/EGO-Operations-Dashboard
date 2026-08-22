(function(){
'use strict';

const REPORTS=[
 ['reportInvoice','الإنفاق حسب الفاتورة','landscape'],
 ['reportEquipment','الإنفاق حسب المعدة','portrait'],
 ['reportSupplier','الإنفاق حسب المورد','portrait'],
 ['reportTire','نوع / مقاس الكفر','portrait'],
 ['reportActivity','الإنفاق حسب النشاط','portrait'],
 ['reportTireId','تقرير هوية الكفر','portrait'],
 ['tireLifecycleReport','دورة حياة الكفر','landscape'],
 ['tireStatusReport','حالة الكفرات','landscape'],
 ['tirePositionReport','موضع الكفر','portrait'],
 ['reportMonthly','المسحوبات الشهرية','portrait'],
 ['supplierInvoicesReport','فواتير الموردين','landscape'],
 ['inventoryReport','المخزون الحالي','landscape'],
 ['records','جميع السجلات','landscape']
];
const MAP=new Map(REPORTS.map(x=>[x[0],{id:x[0],name:x[1],orientation:x[2]}]));
let previousTheme=null;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const activeId=()=>{const id=document.body.dataset.activeReport||'home';return MAP.has(id)?id:'reportInvoice'};
const nowText=()=>{const n=new Date();return [n.toLocaleDateString('en-GB'),n.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})]};

function activeFilters(){
 const out=[];
 const ids=['from','to','activity','equipment','supplier','invoice','tire','tireId','position','search'];
 const labels={from:'من',to:'إلى',activity:'النشاط',equipment:'المعدة',supplier:'المورد',invoice:'الفاتورة',tire:'نوع/مقاس الكفر',tireId:'هوية الكفر',position:'موضع الكفر',search:'بحث'};
 ids.forEach(id=>{const el=document.getElementById(id);if(!el)return;let v=String(el.value||'').trim();if(!v)return;if(el.tagName==='SELECT')v=el.options[el.selectedIndex]?.textContent?.trim()||v;out.push([labels[id]||id,v])});
 return out;
}
function filterText(){const f=activeFilters();return f.length?f.map(x=>x[0]+': '+x[1]).join(' | '):'جميع البيانات - لا توجد فلاتر نشطة'}
function openModal(){
 const m=$('#egoOutputModal');if(!m)return;m.classList.add('open');m.setAttribute('aria-hidden','false');
 const cur=$('#egoOutputCurrent');if(cur)cur.innerHTML='<b>التقرير الحالي:</b> '+esc(MAP.get(activeId())?.name||'التقرير الحالي')+'<br><small>نطاق البيانات: '+esc(filterText())+'</small>';
 const grid=$('#egoOutputReportGrid');if(grid){grid.innerHTML=REPORTS.map(([id,name])=>'<label><input type="checkbox" value="'+id+'"> <span>'+esc(name)+'</span></label>').join('');grid.querySelector('input[value="'+activeId()+'"]')?.setAttribute('checked','checked')}
 const r=document.querySelector('input[name="egoOutputScope"][value="current"]');if(r)r.checked=true;updateScopeUI();
}
function closeModal(){const m=$('#egoOutputModal');if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true')}}
function updateScopeUI(){const s=document.querySelector('input[name="egoOutputScope"]:checked')?.value||'current';const e=$('#egoOutputSelection');if(e)e.hidden=s!=='selected'}
function selectedIds(){const s=document.querySelector('input[name="egoOutputScope"]:checked')?.value||'current';if(s==='current')return[activeId()];if(s==='all')return REPORTS.map(x=>x[0]);return[...document.querySelectorAll('#egoOutputReportGrid input:checked')].map(x=>x.value).filter(x=>MAP.has(x))}

function prepareData(){
 try{window.prepareCompletePrintData?.()}catch(e){}
 try{window.flushHeavyDashboardRender?.()}catch(e){}
 ['renderTireLifecycleReport','renderTireStatusReport','renderTirePositionReport','renderSupplierInvoiceReport','renderInventoryReport','refreshInventoryEnhancements'].forEach(n=>{try{window[n]?.()}catch(e){}});
}
async function settle(){
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 try{await document.fonts?.ready}catch(e){}
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 await new Promise(r=>setTimeout(r,120));
}
function copyCanvasPixels(sourceRoot,cloneRoot){
 const src=[...sourceRoot.querySelectorAll('canvas')],dst=[...cloneRoot.querySelectorAll('canvas')];
 dst.forEach((c,i)=>{const s=src[i];if(!s)return;try{const img=document.createElement('img');img.src=s.toDataURL('image/png');img.className=c.className;img.style.cssText=c.style.cssText;img.style.maxWidth='100%';img.style.height='auto';c.replaceWith(img)}catch(e){}})
}
function cleanClone(node){
 if(!node)return null;const c=node.cloneNode(true);copyCanvasPixels(node,c);
 c.hidden=false;c.removeAttribute('hidden');c.classList.add('ego-output-live-clone','nav-report-active');
 Object.assign(c.style,{display:'block',visibility:'visible',opacity:'1',height:'auto',maxHeight:'none',overflow:'visible'});
 c.querySelectorAll('[hidden]').forEach(x=>{x.hidden=false;x.removeAttribute('hidden');x.style.display='block';x.style.visibility='visible'});
 c.querySelectorAll('button,.report-breadcrumb,.si-filters,.inventory-linked-filter,.filter-chips,.sheet-filter-bridge-box,.source-filter-warning,.global-search-open,.single-report-print-btn,.single-report-pdf-btn,.actions').forEach(x=>x.remove());
 c.querySelectorAll('[class*="table-wrap"],.tablewrap,.safe-extra-scroll,.records-direct-table-wrap').forEach(x=>{x.style.height='auto';x.style.maxHeight='none';x.style.overflow='visible'});
 c.querySelectorAll('table').forEach(t=>{t.style.width='100%';t.style.maxWidth='100%'});
 return c;
}
function reportNode(id){
 if(id==='records'){const w=document.createElement('div');['recordsTitle','recordsTable','recordsExplain'].forEach(x=>{const e=document.getElementById(x);if(e)w.appendChild(cleanClone(e))});return w}
 return cleanClone(document.getElementById(id));
}
function reportHeader(name){
 const [d,t]=nowText(),h=document.createElement('header');h.className='ego-output-brand-head';const logo=document.querySelector('.brand img,.report-sidebar-brand img')?.getAttribute('src')||'';
 h.innerHTML='<div class="ego-output-brand">'+(logo?'<img src="'+logo+'" alt="">':'')+'<div><b>مجموعة العساف</b><small>متابعة استهلاك الكفرات والزيوت</small></div></div><div class="ego-output-title"><strong>'+esc(name)+'</strong><span>تقرير إداري وفق نطاق البيانات الحالي</span></div><div class="ego-output-meta"><b>تاريخ الإصدار</b><br>'+d+'<br><b>الوقت</b><br>'+t+'</div>';
 return h;
}
function filterStrip(){const b=document.createElement('div');b.className='ego-output-filter-strip';const f=activeFilters();b.innerHTML='<b>نطاق التقرير:</b> '+(f.length?f.map(x=>'<span class="ego-output-filter-chip">'+esc(x[0])+': '+esc(x[1])+'</span>').join(''):'<span>جميع البيانات المتاحة</span>');return b}
function footer(name){const[d,t]=nowText(),f=document.createElement('footer');f.className='ego-output-footer';f.innerHTML='<span><b>EGO</b> - متابعة استهلاك الكفرات والزيوت</span><span>'+esc(name)+'</span><span>'+d+' - '+t+'</span>';return f}

function createPageShell(def,continued=false){
 const page=document.createElement('section');page.className='ego-output-page ego-page-'+def.orientation;page.dataset.outputReport=def.id;
 const inner=document.createElement('div');inner.className='ego-output-page-inner';inner.appendChild(reportHeader(def.name+(continued?' - متابعة':'')));inner.appendChild(filterStrip());
 const content=document.createElement('div');content.className='ego-output-content ego-manual-content';inner.appendChild(content);page.appendChild(inner);page.appendChild(footer(def.name));return{page,content};
}
function isTitle(el){return !!el?.matches?.('.section-title,.compare-section-title,.tire-status-section-title,.inventory-card-title,.tlc-compare-head,.safe-extra-head')}
function isStructuralWrapper(el){return !!el && el.children.length>1 && !el.querySelector(':scope > table') && !el.matches('.report-chart,.invoice-chart-full,.tire-status-chart,.dashboard-summary,.report-summary,.tire-status-kpis,.tire-status-operation-grid,.inventory-kpis,.home-mini-kpis')}
function semanticBlocks(root){
 const kids=[...root.children].filter(x=>!x.matches('.report-breadcrumb'));
 const out=[];
 for(let i=0;i<kids.length;i++){
   const el=kids[i];
   if(isTitle(el)&&kids[i+1]){const b=document.createElement('div');b.className='ego-manual-block ego-title-pair';b.append(el.cloneNode(true),kids[++i].cloneNode(true));out.push(b)}
   else{const b=document.createElement('div');b.className='ego-manual-block';b.appendChild(el.cloneNode(true));out.push(b)}
 }
 return out;
}
function tableIn(block){return block.querySelector('table')}
function makeTableChunk(block,start,end,continued){
 const original=tableIn(block),rows=[...(original.tBodies?.[0]?.rows||[])];const chunk=block.cloneNode(true),t=tableIn(chunk);if(!t)return chunk;
 const body=t.tBodies?.[0];if(body)body.innerHTML='';rows.slice(start,end).forEach(r=>body.appendChild(r.cloneNode(true)));
 if(t.tFoot){const isFinal=end>=rows.length;if(!isFinal)t.tFoot.remove()}
 if(continued){const title=chunk.querySelector('.section-title,.compare-section-title,.tire-status-section-title,.inventory-card-title,.tlc-compare-head,.safe-extra-head');if(title){const sm=title.querySelector('small,.hint');if(sm)sm.textContent='متابعة الجدول';else title.append(' - متابعة')}}
 return chunk;
}
function scratch(def){
 let st=document.getElementById('egoPaginationScratch');if(st)st.remove();st=document.createElement('div');st.id='egoPaginationScratch';st.className='ego-pagination-scratch';const sh=createPageShell(def);st.appendChild(sh.page);document.body.appendChild(st);return{root:st,page:sh.page,content:sh.content};
}
function contentCapacity(s){return s.content.getBoundingClientRect().height}
function fits(s,node){s.content.appendChild(node);const ok=s.content.scrollHeight<=s.content.clientHeight+1;node.remove();return ok}
function measureOnEmpty(def,node){const s=scratch(def);s.content.appendChild(node.cloneNode(true));const h=s.content.scrollHeight,cap=s.content.clientHeight;s.root.remove();return{h,cap,fits:h<=cap+1}}
function explodeOversize(block,def){
 const m=measureOnEmpty(def,block);if(m.fits)return[block];
 const table=tableIn(block);if(table)return splitTableByMeasurement(block,def);
 const inner=block.firstElementChild;
 if(inner&&isStructuralWrapper(inner)){
   const subs=semanticBlocks(inner);if(subs.length>1){const out=[];subs.forEach(x=>out.push(...explodeOversize(x,def)));return out}
 }
 const ratio=Math.max(.55,Math.min(1,(m.cap-4)/Math.max(1,m.h)));block.style.zoom=String(ratio);block.dataset.egoAutoScale=ratio.toFixed(3);return[block];
}
function splitTableByMeasurement(block,def){
 const table=tableIn(block),rows=[...(table.tBodies?.[0]?.rows||[])];if(!rows.length)return[block];
 const chunks=[];let start=0;
 while(start<rows.length){
   const s=scratch(def);let best=start;
   for(let end=start+1;end<=rows.length;end++){
     const candidate=makeTableChunk(block,start,end,start>0);s.content.innerHTML='';s.content.appendChild(candidate);
     let ok=s.content.scrollHeight<=s.content.clientHeight+1;
     /* If this is the final chunk, include tfoot. If tfoot makes it overflow,
        keep at least one data row with the total by backing up one row. */
     if(ok)best=end;else break;
   }
   s.root.remove();
   if(best===start)best=Math.min(start+1,rows.length);
   /* Never leave a final tfoot-only continuation; if the next chunk would contain
      no data row, move one row forward. */
   if(best===rows.length && start===rows.length){best=rows.length}
   chunks.push(makeTableChunk(block,start,best,start>0));start=best;
 }
 return chunks;
}



function invoiceMeasurePage(page){
 const host=document.createElement('div');
 host.className='ego-pagination-measure ego-invoice-measure-host';
 host.style.cssText='position:fixed;left:-20000px;top:0;visibility:hidden;pointer-events:none;z-index:-1;';
 host.appendChild(page);
 document.body.appendChild(host);
 const content=page.querySelector('.ego-output-content');
 const result={
   host,
   page,
   content,
   fits:()=>content ? content.scrollHeight<=content.clientHeight+1 : true,
   remaining:()=>content ? Math.max(0,content.clientHeight-content.scrollHeight) : 0
 };
 return result;
}
function invoiceNodeFitsOnPage(page,node){
 const clone=node.cloneNode(true);
 const m=invoiceMeasurePage(page);
 m.content.appendChild(clone);
 const ok=m.fits();
 clone.remove();
 m.host.remove();
 return ok;
}
function invoiceAppendIfFits(page,node){
 const m=invoiceMeasurePage(page);
 const clone=node.cloneNode(true);
 m.content.appendChild(clone);
 const ok=m.fits();
 if(ok){
   /* Move the actual node to the real page only after successful measurement. */
   clone.remove();
   m.host.remove();
   page.querySelector('.ego-output-content').appendChild(node);
   return true;
 }
 clone.remove();
 m.host.remove();
 return false;
}
function invoicePrintShell(title,continued=false){
 const def=MAP.get('reportInvoice');
 const sh=createPageShell(def,continued);
 sh.page.classList.add('ego-invoice-final-page');
 const strong=sh.page.querySelector('.ego-output-title strong');
 if(strong)strong.textContent=title;
 return sh;
}
function invoiceSectionHead(title,sub=''){
 const h=document.createElement('div');
 h.className='ego-invoice-final-section-head';
 h.innerHTML='<b>'+esc(title)+'</b>'+(sub?'<small>'+esc(sub)+'</small>':'');
 return h;
}

function invoiceSummaryBlock(live){
 const source=live.querySelector('#invoiceSummary');
 if(!source)return null;
 const table=source.querySelector('table');
 if(!table)return null;

 const block=document.createElement('div');
 block.className='ego-invoice-summary-inline-block';
 block.appendChild(invoiceSectionHead(
   'الإنفاق حسب الفاتورة',
   (source.querySelector('.summary-head small')?.textContent||'ملخص الفواتير').trim()
 ));
 const wrap=document.createElement('div');
 wrap.className='ego-invoice-summary-table-final';
 wrap.appendChild(table.cloneNode(true));
 block.appendChild(wrap);
 return block;
}
function invoiceAnalysisData(){
 let rows=[];
 try{
   const a=typeof filters==='function'?(filters()||[]):[];
   rows=window.EGOTireOps?.operationalRows?.(a)||a;
 }catch(e){}
 const byInvoice=new Map();
 rows.forEach(r=>{
   const k=String(r.invoice||'غير محدد').trim()||'غير محدد';
   const o=byInvoice.get(k)||{invoice:k,amount:0,count:0};
   o.amount+=Number(r.price)||0;o.count++;byInvoice.set(k,o);
 });
 const groups=[...byInvoice.values()].sort((a,b)=>b.amount-a.amount);
 const total=rows.reduce((s,r)=>s+(Number(r.price)||0),0);
 const vat=total*.15,after=total+vat;
 const avg=rows.length?total/rows.length:0;
 const avgInv=groups.length?total/groups.length:0;
 const top=groups[0]||{invoice:'—',amount:0,count:0};
 const low=groups[groups.length-1]||top;
 const dates=rows.map(r=>String(r.date||'')).filter(Boolean).sort();
 return {rows,groups,total,vat,after,avg,avgInv,top,low,dates};
}
function invoiceAnalysisGuaranteedBlock(){
 const m=invoiceAnalysisData();
 const money=v=>{
   try{return new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(v)||0)+' SAR'}
   catch(e){return String(v||0)+' SAR'}
 };
 const block=document.createElement('div');
 block.className='ego-invoice-analysis-final-block ego-invoice-analysis-guaranteed';
 block.appendChild(invoiceSectionHead(
   'التوضيح والتحليل الكامل — فاتورة',
   'قراءة مباشرة من بيانات التقرير الحالية، وتُحدّث مع الفلاتر.'
 ));
 const body=document.createElement('div');
 body.className='ego-invoice-analysis-print-block ego-invoice-analysis-built';

 const range=m.dates.length?(m.dates[0]+' — '+m.dates[m.dates.length-1]):'لا توجد تواريخ';
 const topPct=m.total?m.top.amount/m.total*100:0;
 const lowPct=m.total?m.low.amount/m.total*100:0;
 body.innerHTML=
   '<div class="ego-invoice-analysis-kpis">'+
   [
     ['عدد السجلات',m.rows.length.toLocaleString('en-US')],
     ['عدد الفواتير',m.groups.length.toLocaleString('en-US')],
     ['الفترة الزمنية',range],
     ['قبل الضريبة',money(m.total)],
     ['VAT 15%',money(m.vat)],
     ['شامل الضريبة',money(m.after)],
     ['متوسط السجل',money(m.avg)],
     ['متوسط الفاتورة',money(m.avgInv)]
   ].map(x=>'<div><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>').join('')+
   '</div>'+
   '<div class="ego-invoice-analysis-grid">'+
     '<div class="ego-invoice-analysis-box"><h3>قراءة النتائج</h3><ul>'+
       '<li>أعلى فاتورة: <b>'+esc(m.top.invoice)+'</b> بقيمة <b>'+money(m.top.amount)+'</b> ونسبة <b>'+topPct.toFixed(1)+'%</b>.</li>'+
       '<li>أقل فاتورة: <b>'+esc(m.low.invoice)+'</b> بقيمة <b>'+money(m.low.amount)+'</b> ونسبة <b>'+lowPct.toFixed(1)+'%</b>.</li>'+
       '<li>الفارق بين الأعلى والأقل: <b>'+money(Math.max(0,m.top.amount-m.low.amount))+'</b>.</li>'+
       '<li>الإجمالي بعد الضريبة: <b>'+money(m.after)+'</b>.</li>'+
     '</ul></div>'+
     '<div class="ego-invoice-analysis-box"><h3>ماذا يعني هذا التقرير؟</h3>'+
       '<p>يوضح توزيع الإنفاق حسب رقم الفاتورة داخل نطاق الفلاتر الحالي، ويُظهر تركّز الإنفاق والفارق بين الفواتير الأعلى والأقل.</p>'+
       '<p>يتم احتساب القيم من المسحوبات الفعلية الظاهرة في التقرير وقت الطباعة.</p>'+
     '</div>'+
   '</div>';
 block.appendChild(body);
 return block;
}
function invoiceChartPage(live){
 const sh=invoicePrintShell('الإنفاق حسب الفاتورة');
 sh.page.classList.add('ego-invoice-chart-page','ego-invoice-chart-summary-page');

 const chart=live.querySelector('#invoiceChart')?.closest('.invoice-chart-full') ||
             live.querySelector('.invoice-chart-full');

 sh.content.appendChild(invoiceSectionHead(
   'مقارنة الإنفاق حسب الفاتورة',
   'الرسم والجدول الملخص في صفحة واحدة متى اتسعا فعليًا.'
 ));

 if(chart){
   const c=cleanClone(chart);
   c.querySelectorAll('.section-title,.hint').forEach(x=>x.remove());
   c.classList.add('ego-invoice-chart-print-block');
   sh.content.appendChild(c);
 }else{
   const empty=document.createElement('div');
   empty.className='ego-invoice-print-empty';
   empty.textContent='لا توجد بيانات للرسم ضمن الفلاتر الحالية';
   sh.content.appendChild(empty);
 }

 const summary=invoiceSummaryBlock(live);
 if(summary)sh.content.appendChild(summary);
 return sh.page;
}
function invoiceSummaryTablePage(live){
 const sh=invoicePrintShell('الإنفاق حسب الفاتورة — ملخص الفواتير',true);
 sh.page.classList.add('ego-invoice-summary-final-page','ego-table-dedicated-page');

 const source=live.querySelector('#invoiceSummary');
 sh.content.appendChild(invoiceSectionHead(
   'الإنفاق حسب الفاتورة',
   (source?.querySelector('.summary-head .hint')?.textContent||'').trim()
 ));

 if(!source)return [sh.page];

 const table=source.querySelector('table');
 if(!table)return [sh.page];

 const wrap=document.createElement('div');
 wrap.className='ego-invoice-summary-table-final';
 const full=table.cloneNode(true);
 wrap.appendChild(full);

 /* Measure THEAD + TBODY + TFOOT as one real DOM unit inside an A4 shell.
    If it fits, it must remain one page and Chrome never gets a chance to split tfoot. */
 const probe=invoicePrintShell('الإنفاق حسب الفاتورة — ملخص الفواتير',true);
 probe.page.classList.add('ego-invoice-summary-final-page','ego-table-dedicated-page');
 probe.content.appendChild(invoiceSectionHead('الإنفاق حسب الفاتورة',''));
 probe.content.appendChild(wrap.cloneNode(true));
 const measured=invoiceMeasurePage(probe.page);
 const fits=measured.fits();
 measured.host.remove();

 if(fits){
   sh.content.appendChild(wrap);
   return [sh.page];
 }

 /* Only if the complete summary genuinely exceeds one A4 page do we split it.
    Reuse the existing pixel-measured table splitter so THEAD repeats and TFOOT
    stays on the final chunk only. */
 const block=document.createElement('div');
 block.className='ego-manual-block ego-title-pair';
 block.appendChild(invoiceSectionHead('الإنفاق حسب الفاتورة',''));
 const holder=document.createElement('div');
 holder.className='ego-invoice-summary-table-final';
 holder.appendChild(table.cloneNode(true));
 block.appendChild(holder);

 const def=MAP.get('reportInvoice');
 const chunks=splitTableByMeasurement(block,def);
 return chunks.map((chunk,index)=>{
   const pg=invoicePrintShell(
     index===0?'الإنفاق حسب الفاتورة — ملخص الفواتير':'الإنفاق حسب الفاتورة — ملخص الفواتير — متابعة',
     index>0
   );
   pg.page.classList.add('ego-invoice-summary-final-page','ego-table-dedicated-page');
   if(index>0)pg.page.classList.add('ego-table-continuation-page');
   pg.content.appendChild(chunk);
   return pg.page;
 });
}
function invoiceDetailChunkPage(table,rows,start,end,title,sub,pageNo,totalPages){
 const sh=invoicePrintShell(
   totalPages>1 ? 'تفاصيل المسحوبات لكل فاتورة — '+pageNo+' / '+totalPages : 'تفاصيل المسحوبات لكل فاتورة',
   true
 );
 sh.page.classList.add('ego-invoice-details-final-page','ego-table-dedicated-page');
 if(pageNo>1)sh.page.classList.add('ego-table-continuation-page');

 sh.content.appendChild(invoiceSectionHead(
   pageNo>1 ? title+' — متابعة' : title,
   sub
 ));

 const wrap=document.createElement('div');
 wrap.className='ego-invoice-details-table-final';
 const chunk=table.cloneNode(false);
 if(table.tHead)chunk.appendChild(table.tHead.cloneNode(true));
 const body=document.createElement('tbody');
 rows.slice(start,end).forEach(r=>body.appendChild(r.cloneNode(true)));
 chunk.appendChild(body);
 if(table.tFoot && end>=rows.length)chunk.appendChild(table.tFoot.cloneNode(true));
 wrap.appendChild(chunk);
 sh.content.appendChild(wrap);
 return sh.page;
}
function invoiceDetailsPages(live){
 const source=live.querySelector('#invoiceExtraDetails');
 const table=source?.querySelector('table');
 if(!source||!table)return[];

 const rows=[...(table.tBodies?.[0]?.rows||[])];
 const title=(source.querySelector('.safe-extra-title')?.textContent||'تفاصيل المسحوبات لكل فاتورة').trim();
 const sub=(source.querySelector('.safe-extra-sub')?.textContent||'الجدول مرتبط بجميع فلاتر الصفحة بما فيها المورد ورقم الفاتورة.').trim();

 if(!rows.length){
   const sh=invoicePrintShell(title,true);
   sh.page.classList.add('ego-invoice-details-final-page','ego-table-dedicated-page');
   sh.content.appendChild(invoiceSectionHead(title,sub));
   const e=document.createElement('div');e.className='ego-invoice-print-empty';e.textContent='لا توجد تفاصيل ضمن الفلاتر الحالية';
   sh.content.appendChild(e);
   return[sh.page];
 }

 /* 13 rows deliberately: keeps the 8-column table readable on A4 landscape
    and guarantees no row reaches the footer. */
 const cap=13;
 const total=Math.ceil(rows.length/cap);
 const pages=[];
 for(let i=0;i<total;i++){
   const start=i*cap,end=Math.min(rows.length,start+cap);
   pages.push(invoiceDetailChunkPage(table,rows,start,end,title,sub,i+1,total));
 }
 return pages;
}
function invoiceAnalysisPage(live){
 return invoiceAnalysisGuaranteedBlock();
}
async function paginateInvoiceReport(){
 try{
   const rows=typeof filters==='function'?filters():[];
   const usage=window.EGOTireOps?.operationalRows?.(rows)||rows;
   if(typeof renderBars==='function'&&typeof sumBy==='function')renderBars('#invoiceChart',sumBy(usage,'invoice'),'invoice');
   if(typeof renderCompactSummary==='function')renderCompactSummary('#invoiceSummary',usage,'invoice','الفاتورة');
   if(typeof window.__refreshInvoiceWithdrawalDetails==='function')window.__refreshInvoiceWithdrawalDetails(usage);
   if(typeof renderDashboardExplanation==='function')renderDashboardExplanation('#invoiceExplain',usage,'invoice','فاتورة');
 }catch(e){console.warn('Invoice print refresh:',e)}

 await settle();
 const live=document.getElementById('reportInvoice');
 if(!live)return[];

 const pages=[];
 const combined=invoiceChartPage(live);

 /* The preferred layout is chart + complete summary table on page 1.
    Only fall back to a separate summary page if the measured A4 content
    genuinely overflows. */
 const probe=invoiceMeasurePage(combined);
 const combinedFits=probe.fits();
 probe.host.remove();

 if(combinedFits){
   pages.push(combined);
 }else{
   /* remove inline summary and keep chart page, then use measured summary pages */
   combined.querySelector('.ego-invoice-summary-inline-block')?.remove();
   pages.push(combined);
   pages.push(...invoiceSummaryTablePage(live));
 }

 const detailPages=invoiceDetailsPages(live);
 pages.push(...detailPages);

 const analysisBlock=invoiceAnalysisPage(live);
 if(analysisBlock){
   const lastDetail=detailPages.length?detailPages[detailPages.length-1]:null;
   if(lastDetail && invoiceAppendIfFits(lastDetail,analysisBlock)){
     lastDetail.classList.add('ego-invoice-details-with-analysis');
   }else{
     const sh=invoicePrintShell('التوضيح والتحليل الكامل — فاتورة',true);
     sh.page.classList.add('ego-invoice-analysis-final-page');
     sh.content.appendChild(analysisBlock);
     pages.push(sh.page);
   }
 }
 return pages;
}

/* ==========================================================
   FULL-DETAIL PRINT ROOT
   Same index.html, same report components, no Shadow DOM, no new page.
   Non-invoice reports are cloned in full and manually paginated.
   ========================================================== */
function fullDetailNormalize(node){
 if(!node)return node;
 node.style.setProperty('display','block','important');
 node.style.setProperty('visibility','visible','important');
 node.style.setProperty('opacity','1','important');
 node.style.setProperty('height','auto','important');
 node.style.setProperty('max-height','none','important');
 node.style.setProperty('overflow','visible','important');
 node.querySelectorAll('[hidden]').forEach(x=>{x.hidden=false;x.removeAttribute('hidden');x.style.setProperty('display','block','important');x.style.setProperty('visibility','visible','important')});
 node.querySelectorAll('[class*="table-wrap"],.tablewrap,.safe-extra-scroll,.records-direct-table-wrap,.si-layout,.inventory-layout,.tp-card,.report-layout').forEach(x=>{
   x.style.setProperty('height','auto','important');x.style.setProperty('max-height','none','important');x.style.setProperty('overflow','visible','important');
 });
 node.querySelectorAll('table').forEach(t=>{t.style.setProperty('width','100%','important');t.style.setProperty('max-width','100%','important');t.style.setProperty('table-layout','fixed','important')});
 node.querySelectorAll('canvas,img,svg').forEach(x=>{x.style.setProperty('max-width','100%','important');x.style.setProperty('height','auto','important')});
 return node;
}
function fullDetailIsHeading(el){
 return !!el?.matches?.('.section-title,.compare-section-title,.tire-status-section-title,.inventory-card-title,.tlc-compare-head,.safe-extra-head,.si-head,.tp-card-head');
}
function fullDetailBlocks(root){
 const kids=[...root.children].filter(x=>!x.matches('.report-breadcrumb,.si-filters,.inventory-linked-filter'));
 const out=[];
 for(let i=0;i<kids.length;i++){
   const el=fullDetailNormalize(kids[i].cloneNode(true));
   if(fullDetailIsHeading(el)&&kids[i+1]){
     const b=document.createElement('div');b.className='ego-full-detail-block ego-full-detail-pair';
     b.appendChild(el);b.appendChild(fullDetailNormalize(kids[++i].cloneNode(true)));out.push(b);
   }else{
     const b=document.createElement('div');b.className='ego-full-detail-block';b.appendChild(el);out.push(b);
   }
 }
 return out;
}
function fullDetailFitsEmpty(def,block){
 const sh=createPageShell(def,false);
 const host=document.createElement('div');host.className='ego-pagination-measure';host.appendChild(sh.page);document.body.appendChild(host);
 sh.content.appendChild(block.cloneNode(true));
 const ok=sh.content.scrollHeight<=sh.content.clientHeight+1;
 host.remove();return ok;
}
function fullDetailScaleToFit(def,block){
 const sh=createPageShell(def,false);
 const host=document.createElement('div');host.className='ego-pagination-measure';host.appendChild(sh.page);document.body.appendChild(host);
 const c=block.cloneNode(true);sh.content.appendChild(c);
 const h=sh.content.scrollHeight,cap=sh.content.clientHeight;host.remove();
 if(h>cap){const ratio=Math.max(.60,Math.min(1,(cap-3)/Math.max(1,h)));block.style.setProperty('zoom',String(ratio),'important');block.dataset.printScale=ratio.toFixed(3)}
 return block;
}
function fullDetailExplode(block,def){
 const table=tableIn(block);
 if(table){
   if(fullDetailFitsEmpty(def,block))return[block];
   return splitTableByMeasurement(block,def);
 }
 if(fullDetailFitsEmpty(def,block))return[block];
 const only=block.children.length===1?block.firstElementChild:null;
 const source=(only&&only.children.length>1)?only:block;
 const children=[...source.children];
 if(children.length>1){
   const out=[];
   for(let i=0;i<children.length;i++){
     const b=document.createElement('div');b.className='ego-full-detail-block';
     const c=fullDetailNormalize(children[i].cloneNode(true));
     if(fullDetailIsHeading(c)&&children[i+1]){b.appendChild(c);b.appendChild(fullDetailNormalize(children[++i].cloneNode(true)))}else b.appendChild(c);
     if(tableIn(b)&&!fullDetailFitsEmpty(def,b))out.push(...splitTableByMeasurement(b,def));
     else if(fullDetailFitsEmpty(def,b))out.push(b);
     else out.push(fullDetailScaleToFit(def,b));
   }
   return out;
 }
 return[fullDetailScaleToFit(def,block)];
}
async function paginateFullDetailReport(id){
 const def=MAP.get(id);if(!def)return[];
 const root=reportNode(id);if(!root)return[];
 fullDetailNormalize(root);
 const prepared=[];
 fullDetailBlocks(root).forEach(b=>prepared.push(...fullDetailExplode(b,def)));
 const pages=[];let sh=createPageShell(def,false);sh.page.classList.add('ego-full-detail-page');pages.push(sh.page);
 for(const block of prepared){
   const candidate=block.cloneNode(true);sh.content.appendChild(candidate);
   if(sh.content.scrollHeight<=sh.content.clientHeight+1)continue;
   candidate.remove();
   if(sh.content.children.length===0){sh.content.appendChild(block.cloneNode(true));continue}
   sh=createPageShell(def,true);sh.page.classList.add('ego-full-detail-page');pages.push(sh.page);sh.content.appendChild(block.cloneNode(true));
 }
 return pages.filter(p=>p.querySelector('.ego-output-content')?.children.length);
}

/* ==========================================================
   TARGETED PRINT FIXES — only reports that were still problematic
   ========================================================== */
function makeSimpleBlock(nodes,className='ego-target-block'){
 const b=document.createElement('div');b.className=className;
 nodes.filter(Boolean).forEach(n=>b.appendChild(fullDetailNormalize(cleanClone(n))));
 return b;
}
function appendMeasured(pages,sh,def,block){
 const c=block.cloneNode(true);sh.content.appendChild(c);
 if(sh.content.scrollHeight<=sh.content.clientHeight+1)return sh;
 c.remove();
 if(!sh.content.children.length){sh.content.appendChild(block.cloneNode(true));return sh}
 sh=createPageShell(def,true);sh.page.classList.add('ego-target-page');pages.push(sh.page);sh.content.appendChild(block.cloneNode(true));return sh;
}
function tableBlockFromLive(titleNode,tableNode,extraClass=''){
 if(!tableNode)return null;
 const b=document.createElement('div');b.className='ego-target-table-block '+extraClass;
 if(titleNode)b.appendChild(fullDetailNormalize(cleanClone(titleNode)));
 const wrap=document.createElement('div');wrap.className='ego-target-table-wrap';
 wrap.appendChild(cleanClone(tableNode));b.appendChild(wrap);fullDetailNormalize(b);return b;
}
function splitTargetTable(def,block){
 return fullDetailFitsEmpty(def,block)?[block]:splitTableByMeasurement(block,def);
}

/* Equipment: chart ONCE + entire summary on same first page whenever it fits. */
async function paginateEquipmentTarget(){
 const id='reportEquipment',def=MAP.get(id),live=document.getElementById(id);if(!def||!live)return[];
 const title=live.querySelector('.section-title');
 const chart=live.querySelector('.report-chart');
 const summary=live.querySelector('.report-summary');
 const explain=live.querySelector('#equipmentExplain');
 const pages=[];let sh=createPageShell(def,false);sh.page.classList.add('ego-target-page','ego-equipment-target');pages.push(sh.page);
 const first=makeSimpleBlock([title,chart,summary],'ego-target-block ego-equipment-first');
 fullDetailNormalize(first);
 /* Compact only the first composition as a unit if needed. */
 if(!fullDetailFitsEmpty(def,first))fullDetailScaleToFit(def,first);
 sh.content.appendChild(first);
 if(explain){
   const e=makeSimpleBlock([explain],'ego-target-block ego-target-analysis');
   sh=appendMeasured(pages,sh,def,e);
 }
 return pages;
}

/* Tire ID: table only, exactly as requested. */

function denseTableChunk(block,start,end,continued){
 const original=tableIn(block),rows=[...(original?.tBodies?.[0]?.rows||[])];
 const chunk=block.cloneNode(true),t=tableIn(chunk);if(!t)return chunk;
 const body=t.tBodies?.[0];if(body)body.innerHTML='';
 rows.slice(start,end).forEach(r=>body.appendChild(r.cloneNode(true)));
 if(t.tFoot && end<rows.length)t.tFoot.remove();
 if(continued){
   const title=chunk.querySelector('.section-title,.tire-status-section-title,.tp-card-head,.inventory-card-title');
   if(title)title.classList.add('ego-continuation-title');
 }
 return chunk;
}
function denseTableFits(def,block,pageClass){
 const sh=createPageShell(def,false);sh.page.classList.add('ego-target-page',pageClass);
 const host=document.createElement('div');host.className='ego-pagination-measure';host.appendChild(sh.page);document.body.appendChild(host);
 sh.content.appendChild(block.cloneNode(true));
 /* Use the actual footer boundary. This avoids stopping early and leaving
    half a page empty in Tire ID / Records / Status detail tables. */
 const footer=sh.page.querySelector('.ego-output-footer');
 const last=sh.content.lastElementChild;
 const safeBottom=footer?footer.getBoundingClientRect().top-8:sh.page.getBoundingClientRect().bottom-20;
 const actualBottom=last?last.getBoundingClientRect().bottom:sh.content.getBoundingClientRect().top;
 const ok=actualBottom<=safeBottom+1;
 host.remove();return ok;
}
function splitDenseTable(def,block,pageClass){
 const table=tableIn(block),rows=[...(table?.tBodies?.[0]?.rows||[])];if(!rows.length)return[block];
 const out=[];let start=0;
 while(start<rows.length){
   let best=start;
   for(let end=start+1;end<=rows.length;end++){
     const c=denseTableChunk(block,start,end,start>0);
     if(denseTableFits(def,c,pageClass))best=end;else break;
   }
   if(best===start)best=Math.min(rows.length,start+1);
   out.push(denseTableChunk(block,start,best,start>0));
   start=best;
 }
 return out;
}
function positionPrintChartFromTable(){
 const table=document.querySelector('#tpDetailTable');if(!table)return null;
 const data=[...table.querySelectorAll('tbody tr')].map(tr=>{
   const c=[...tr.cells].map(td=>String(td.textContent||'').trim());
   return {name:c[0]||'—',count:Number(String(c[1]||'0').replace(/[^\d.-]/g,''))||0};
 }).filter(x=>x.name);
 if(!data.length)return null;
 data.sort((a,b)=>b.count-a.count);
 const max=Math.max(1,...data.map(x=>x.count));
 const box=document.createElement('div');box.className='ego-position-print-chart';
 box.innerHTML='<div class="tp-card-head"><div><h3>ترتيب مواضع الكفر حسب الاستبدال / التلف</h3><p>مخطط مخصص للطباعة مبني من نفس بيانات جدول المواضع.</p></div></div>'+
 '<div class="ego-position-print-bars">'+data.slice(0,12).map((x,i)=>
   '<div class="ego-position-print-row"><span>'+(i+1)+'</span><b>'+esc(x.name)+'</b><i><em style="width:'+Math.max(3,x.count/max*100).toFixed(1)+'%"></em></i><strong>'+x.count+'</strong></div>'
 ).join('')+'</div>';
 return box;
}
function statusPrintChartFromSummary(){
 const table=document.querySelector('#tireStatusReport .tire-status-table');
 if(!table)return null;
 const data=[...table.querySelectorAll('tbody tr')].map(tr=>{
   const c=[...tr.cells].map(td=>String(td.textContent||'').trim());
   return {name:c[0]||'—',count:Number(String(c[1]||'0').replace(/[^\d.-]/g,''))||0};
 });
 if(!data.length)return null;
 const max=Math.max(1,...data.map(x=>x.count));
 const box=document.createElement('div');box.className='ego-status-print-chart';
 box.innerHTML='<div class="tire-status-section-title"><b>توزيع العمليات</b><small>مخطط مخصص للطباعة من نفس بيانات جدول العمليات</small></div>'+
 '<div class="ego-status-print-bars">'+data.map((x,i)=>
   '<div class="ego-status-print-row"><span>'+(i+1)+'</span><b>'+esc(x.name)+'</b><i><em style="width:'+Math.max(2,x.count/max*100).toFixed(1)+'%"></em></i><strong>'+x.count+'</strong></div>'
 ).join('')+'</div>';
 return box;
}
async function paginateTireIdTarget(){
 const id='reportTireId',base=MAP.get(id),live=document.getElementById(id);if(!base||!live)return[];
 const def={...base,orientation:'portrait'};
 const table=live.querySelector('#tireIdSummary table');
 if(!table)return paginateFullDetailReport(id);
 const title=document.createElement('div');title.className='section-title';title.textContent='جدول هوية الكفر';
 const block=tableBlockFromLive(title,table,'ego-tireid-table-only');
 const chunks=splitDenseTable(def,block,'ego-tireid-only-page');
 return chunks.map((part,i)=>{
   const sh=createPageShell(def,i>0);sh.page.classList.add('ego-target-page','ego-tireid-only-page');
   sh.content.appendChild(part);return sh.page;
 });
}
/* Lifecycle: discard toolbar/gaps, then paginate each table by real rows. */
async function paginateLifecycleTarget(){
 const id='tireLifecycleReport',def=MAP.get(id),live=document.getElementById(id);if(!def||!live)return[];
 const content=live.querySelector('#lifeContent');if(!content)return paginateFullDetailReport(id);
 const pages=[];let sh=createPageShell(def,false);sh.page.classList.add('ego-target-page','ego-lifecycle-target');pages.push(sh.page);
 const children=[...content.children].filter(x=>!x.classList.contains('tlc-physical-gap'));
 for(let i=0;i<children.length;i++){
   const el=children[i];
   if(el.matches('.compare-section-title') && children[i+1]){
     const next=children[++i];
     let block=makeSimpleBlock([el,next],'ego-target-block ego-lifecycle-section');
     const table=block.querySelector('table');
     if(table){
       const parts=splitTargetTable(def,block);
       for(const part of parts)sh=appendMeasured(pages,sh,def,part);
     }else{
       if(!fullDetailFitsEmpty(def,block))fullDetailScaleToFit(def,block);
       sh=appendMeasured(pages,sh,def,block);
     }
   }else if(!el.matches('.compare-empty,.compare-toolbar')){
     let block=makeSimpleBlock([el],'ego-target-block');
     if(!fullDetailFitsEmpty(def,block))fullDetailScaleToFit(def,block);
     sh=appendMeasured(pages,sh,def,block);
   }
 }
 return pages;
}

/* Status: clean first page + two well-formatted tables, details split by rows. */
async function paginateStatusTarget(){
 const id='tireStatusReport',def=MAP.get(id),live=document.getElementById(id);if(!def||!live)return[];
 const pages=[];
 let sh=createPageShell(def,false);sh.page.classList.add('ego-target-page','ego-status-overview-page');pages.push(sh.page);
 const overview=makeSimpleBlock([
   live.querySelector('.tire-status-head'),
   live.querySelector('#tireStatusCurrentKpis'),
   live.querySelector('#tireStatusOperationGrid'),
   statusPrintChartFromSummary()
 ],'ego-target-block ego-status-overview');
 sh.content.appendChild(overview);

 const summaryTable=live.querySelector('.tire-status-table');
 if(summaryTable){
   const wrap=summaryTable.closest('.tire-status-table-wrap');
   const summaryBlock=tableBlockFromLive(wrap?.previousElementSibling,summaryTable,'ego-status-summary-table');
   if(invoiceNodeFitsOnPage(sh.page,summaryBlock))sh.content.appendChild(summaryBlock);
   else{
     const p=createPageShell(def,true);p.page.classList.add('ego-target-page','ego-status-summary-page');p.content.appendChild(summaryBlock);pages.push(p.page);
   }
 }

 const detailsTable=live.querySelector('.tire-status-details-table');
 if(detailsTable){
   const wrap=detailsTable.closest('.tire-status-table-wrap');
   const detailsBlock=tableBlockFromLive(wrap?.previousElementSibling,detailsTable,'ego-status-details-table-block');
   const chunks=splitDenseTable(def,detailsBlock,'ego-status-details-page');
   chunks.forEach(part=>{
     const p=createPageShell(def,true);p.page.classList.add('ego-target-page','ego-status-details-page');p.content.appendChild(part);pages.push(p.page);
   });
 }
 return pages;
}
/* Position: intentionally compose page one instead of cloning arbitrary cards. */
async function paginatePositionTarget(){
 const id='tirePositionReport',def=MAP.get(id),live=document.getElementById(id);if(!def||!live)return[];
 const pages=[];let sh=createPageShell(def,false);sh.page.classList.add('ego-target-page','ego-position-target');pages.push(sh.page);
 const first=makeSimpleBlock([
   live.querySelector('.section-title'),
   live.querySelector('#tpKpis'),
   positionPrintChartFromTable()
 ],'ego-target-block ego-position-first');
 sh.content.appendChild(first);
 const cards=[...live.querySelectorAll(':scope > .tp-card')];
 if(cards[1]){
   const table=cards[1].querySelector('table');
   const block=tableBlockFromLive(cards[1].querySelector('.tp-card-head'),table,'ego-position-detail-table');
   for(const part of splitDenseTable(def,block,'ego-position-table-page')){
     if(!invoiceAppendIfFits(sh.page,part)){
       sh=createPageShell(def,true);sh.page.classList.add('ego-target-page','ego-position-table-page');pages.push(sh.page);sh.content.appendChild(part);
     }
   }
 }
 if(cards[2]){
   const b=makeSimpleBlock([cards[2]],'ego-target-block ego-position-heatmap');
   if(!invoiceAppendIfFits(sh.page,b)){sh=createPageShell(def,true);sh.page.classList.add('ego-target-page','ego-position-target');pages.push(sh.page);sh.content.appendChild(b)}
 }
 const explain=live.querySelector('#tpExplain');
 if(explain){const b=makeSimpleBlock([explain],'ego-target-block ego-target-analysis');if(!invoiceAppendIfFits(sh.page,b)){sh=createPageShell(def,true);sh.page.classList.add('ego-target-page','ego-position-target');pages.push(sh.page);sh.content.appendChild(b)}}
 return pages;
}
/* Inventory: light print blocks, chart only once, tables separated and split. */
async function paginateInventoryTarget(){
 const id='inventoryReport',def=MAP.get(id),live=document.getElementById(id);if(!def||!live)return[];
 const pages=[];let sh=createPageShell(def,false);sh.page.classList.add('ego-target-page','ego-inventory-target');pages.push(sh.page);
 const title=live.querySelector('.section-title'),kpis=live.querySelector('#inventoryKpis'),chart=live.querySelector('.inventory-chart-card');
 let first=makeSimpleBlock([title,kpis,chart],'ego-target-block ego-inventory-first');
 if(!fullDetailFitsEmpty(def,first))fullDetailScaleToFit(def,first);
 sh.content.appendChild(first);

 for(const card of [live.querySelector('.inventory-table-card'),live.querySelector('.inventory-parked-card')]){
   if(!card)continue;
   const table=card.querySelector('table'),head=card.querySelector('.inventory-card-title');
   const block=tableBlockFromLive(head,table,'ego-inventory-table-block');
   for(const part of splitTargetTable(def,block))sh=appendMeasured(pages,sh,def,part);
 }
 for(const el of [live.querySelector('#inventoryProblemPanel'),live.querySelector('#inventoryExplain')]){
   if(!el)continue;
   let b=makeSimpleBlock([el],'ego-target-block ego-target-analysis');
   if(!fullDetailFitsEmpty(def,b))fullDetailScaleToFit(def,b);
   sh=appendMeasured(pages,sh,def,b);
 }
 return pages;
}

/* Records: only the table + analysis. Split table using maximum real page capacity,
   so each continuation starts immediately after the header and fills the sheet. */
async function paginateRecordsTarget(){
 const id='records',base=MAP.get(id),table=document.querySelector('#recordsTable table');if(!base||!table)return[];
 const def={...base,orientation:'portrait'};
 const block=tableBlockFromLive(document.getElementById('recordsTitle'),table,'ego-records-table-block');
 const chunks=splitDenseTable(def,block,'ego-records-target');
 const pages=chunks.map((part,i)=>{
   const sh=createPageShell(def,i>0);sh.page.classList.add('ego-target-page','ego-records-target');sh.content.appendChild(part);return sh.page;
 });
 const explain=document.getElementById('recordsExplain');
 if(explain&&pages.length){
   const b=makeSimpleBlock([explain],'ego-target-block ego-target-analysis');
   if(!invoiceAppendIfFits(pages[pages.length-1],b)){const sh=createPageShell(def,true);sh.page.classList.add('ego-target-page','ego-records-target');sh.content.appendChild(b);pages.push(sh.page)}
 }
 return pages;
}
async function paginateReport(id){
 /* GOOD REPORTS — keep their existing/stable print paths unchanged */
 if(id==='reportInvoice')return await paginateInvoiceReport();

 /* ONLY the reports explicitly reported as problematic use targeted handlers */
 if(id==='reportEquipment')return await paginateEquipmentTarget();
 if(id==='reportTireId')return await paginateTireIdTarget();
 if(id==='tireLifecycleReport')return await paginateLifecycleTarget();
 if(id==='tireStatusReport')return await paginateStatusTarget();
 if(id==='tirePositionReport')return await paginatePositionTarget();
 if(id==='inventoryReport')return await paginateInventoryTarget();
 if(id==='records')return await paginateRecordsTarget();

 /* GOOD REPORTS:
    reportSupplier, reportTire, reportActivity, reportMonthly,
    supplierInvoicesReport — untouched */
 return await paginateFullDetailReport(id);
}
function makeCover(count){const p=document.createElement('section');p.className='ego-output-page ego-page-portrait ego-output-cover';const i=document.createElement('div');i.className='ego-output-page-inner';const logo=document.querySelector('.brand img,.report-sidebar-brand img')?.getAttribute('src')||'';const[d]=nowText();let rows=0;try{rows=(typeof filters==='function'?(filters()||[]):[]).length}catch(e){}i.innerHTML=(logo?'<img class="ego-output-cover-logo" src="'+logo+'" alt="">':'')+'<h1>EGO - نظام المتابعة</h1><h2>التقرير الشامل</h2><p>متابعة استهلاك الكفرات والزيوت</p><div class="ego-output-cover-scope"><div class="d2-cover-stat"><b>'+d+'</b><span>تاريخ الإصدار</span></div><div class="d2-cover-stat"><b>'+rows.toLocaleString('en-US')+'</b><span>السجلات ضمن النطاق</span></div><div class="d2-cover-stat"><b>'+count+'</b><span>عدد التقارير</span></div></div>';p.appendChild(i);return p}
function makeExecutivePage(ids){const p=document.createElement('section');p.className='ego-output-page ego-page-portrait ego-output-executive';const i=document.createElement('div');i.className='ego-output-page-inner';let rows=[];try{rows=typeof filters==='function'?(filters()||[]):[]}catch(e){}const uniq=new Set(rows.map(r=>String(r.tire_id||'').trim()).filter(Boolean)).size;const k=x=>rows.filter(r=>window.EGOTireOps?.tireOperationKind?.(r.operation)===x).length;const vals=[['إجمالي السجلات',rows.length],['هويات الكفر',uniq],['جديد',k('new')],['تبديل',k('swap')],['ركن',k('park')],['إعادة استخدام',k('reuse')],['إنهاء خدمة',k('service_end')],['عدد التقارير',ids.length]];i.innerHTML='<h1>الملخص التنفيذي</h1><p>ملخص لأهم مؤشرات نطاق التقرير الحالي.</p><div class="ego-output-summary-grid">'+vals.map(x=>'<div class="ego-output-summary-card"><span>'+x[0]+'</span><b>'+Number(x[1]).toLocaleString('en-US')+'</b></div>').join('')+'</div>';p.appendChild(i);return p}
function removeStage(){document.getElementById('egoPrintRoot')?.remove()}
async function buildStage(ids){
 removeStage();prepareData();await settle();
 const stage=document.createElement('main');stage.id='egoPrintRoot';stage.className='ego-manual-stage';document.body.appendChild(stage);
 if(ids.length>1){stage.appendChild(makeCover(ids.length));stage.appendChild(makeExecutivePage(ids))}
 for(const id of ids){const ps=await paginateReport(id);ps.forEach(p=>stage.appendChild(p))}
 const all=[...stage.querySelectorAll('.ego-output-page')];all.forEach((p,i)=>{p.dataset.pageNumber=String(i+1);const f=p.querySelector('.ego-output-footer');if(f){const n=document.createElement('span');n.className='ego-output-page-number';n.textContent='صفحة '+(i+1)+' من '+all.length;f.appendChild(n)}});return stage;
}
function beginLight(){previousTheme=document.documentElement.getAttribute('data-theme');document.documentElement.setAttribute('data-theme','light')}
function restoreTheme(){if(previousTheme===null)document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',previousTheme);previousTheme=null}
async function doPrint(ids){
 if(!ids.length)return;
 closeModal();
 beginLight();
 try{
   await buildStage(ids);
   await settle();
   document.body.classList.add('ego-unified-printing');
   setTimeout(()=>window.print(),80);
 }catch(e){
   console.error('EGO print error:',e);
   document.body.classList.remove('ego-unified-printing');
   removeStage();
   restoreTheme();
   alert('تعذر تجهيز الطباعة: '+(e?.message||e));
 }
}
async function ensureLibraries(){function load(src,test){return new Promise((res,rej)=>{if(test())return res();const old=[...document.scripts].find(s=>s.src===src);if(old){old.addEventListener('load',()=>test()?res():rej(new Error('library load failed')),{once:true});old.addEventListener('error',rej,{once:true});return}const sc=document.createElement('script');sc.src=src;sc.onload=()=>test()?res():rej(new Error('library load failed'));sc.onerror=rej;document.head.appendChild(sc)})}await load('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',()=>!!window.html2canvas);await load('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',()=>!!window.jspdf?.jsPDF)}
async function pageCanvas(page,width){
 const prevWidth=page.style.width;
 const prevMaxWidth=page.style.maxWidth;
 page.style.width=width+'px';
 page.style.maxWidth=width+'px';
 page.style.display='block';
 await settle();
 const canvas=await html2canvas(page,{
   scale:2.25,
   backgroundColor:'#ffffff',
   useCORS:true,
   allowTaint:true,
   logging:false,
   scrollX:0,
   scrollY:0,
   width:page.scrollWidth,
   height:page.scrollHeight,
   windowWidth:Math.max(width,page.scrollWidth),
   windowHeight:Math.max(window.innerHeight,page.scrollHeight)
 });
 page.style.width=prevWidth;
 page.style.maxWidth=prevMaxWidth;
 return canvas;
}
async function doPdf(ids){
 if(!ids.length)return;
 closeModal();
 beginLight();
 const stage=await buildStage(ids);
 document.body.classList.add('ego-unified-pdf-rendering');
 try{
   await ensureLibraries();
   await settle();
   const {jsPDF}=window.jspdf;
   const pages=[...stage.querySelectorAll('.ego-output-page')];
   if(!pages.length)throw new Error('لا توجد صفحات');

   /* PDF export is deliberately Landscape for report readability. */
   const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
   let first=true;
   for(const page of pages){
     page.classList.add('ego-pdf-landscape-render');
     const c=await pageCanvas(page,1123);
     const w=297,h=210;
     if(!first)pdf.addPage([w,h],'landscape');
     const maxW=w-10,maxH=h-10;
     const scale=Math.min(maxW/c.width,maxH/c.height);
     const dw=c.width*scale,dh=c.height*scale;
     pdf.addImage(c.toDataURL('image/jpeg',0.985),'JPEG',(w-dw)/2,(h-dh)/2,dw,dh,undefined,'MEDIUM');
     page.classList.remove('ego-pdf-landscape-render');
     first=false;
   }
   const stamp=new Date().toISOString().slice(0,10);
   const name=ids.length===1?MAP.get(ids[0]).name:'التقرير الشامل';
   pdf.save((name+'_'+stamp).replace(/[\\/:*?\"<>|]/g,'_')+'.pdf');
 }catch(e){
   console.error('EGO PDF export error:',e);
   alert('تعذر إنشاء PDF: '+(e?.message||e));
 }finally{
   stage.querySelectorAll('.ego-pdf-landscape-render').forEach(x=>x.classList.remove('ego-pdf-landscape-render'));
   document.body.classList.remove('ego-unified-pdf-rendering');
   removeStage();
   restoreTheme();
 }
}
let outputBusy=false;
async function run(type){
 if(outputBusy)return;
 const ids=selectedIds();
 if(!ids.length){alert('اختر تقريرًا واحدًا على الأقل');return}
 outputBusy=true;
 const p=document.getElementById('egoOutputPrint'),d=document.getElementById('egoOutputPdf');
 if(p)p.disabled=true;if(d)d.disabled=true;
 try{
   if(type==='pdf')await doPdf(ids);else await doPrint(ids);
 }finally{
   outputBusy=false;
   if(p)p.disabled=false;if(d)d.disabled=false;
 }
}
function intercept(e){const b=e.target.closest('#print,#exportPdf,[data-print-report],[data-export-pdf],.single-report-print-btn,.single-report-pdf-btn');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openModal()}
document.addEventListener('click',intercept,true);document.addEventListener('pointerdown',e=>{const b=e.target.closest('#print,#exportPdf,[data-print-report],[data-export-pdf],.single-report-print-btn,.single-report-pdf-btn');if(b){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}},true);
document.addEventListener('change',e=>{if(e.target.name==='egoOutputScope')updateScopeUI()});document.addEventListener('click',e=>{if(e.target.closest('[data-output-close]'))closeModal();if(e.target.closest('[data-output-select-all]'))document.querySelectorAll('#egoOutputReportGrid input').forEach(x=>x.checked=true);if(e.target.closest('[data-output-clear-all]'))document.querySelectorAll('#egoOutputReportGrid input').forEach(x=>x.checked=false);if(e.target.closest('#egoOutputPrint'))run('print');if(e.target.closest('#egoOutputPdf'))run('pdf')});
window.addEventListener('afterprint',()=>{
 document.body.classList.remove('ego-unified-printing');
 removeStage();
 restoreTheme();
 outputBusy=false;
 const p=document.getElementById('egoOutputPrint'),d=document.getElementById('egoOutputPdf');
 if(p)p.disabled=false;if(d)d.disabled=false;
});
window.EGOManualPagination={buildStage,paginateReport,reportNode,semanticBlocks,splitTableByMeasurement,settle,MAP};
})();
