
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const clean=v=>String(v??'').trim();
 const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=v=>clean(v).toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ');
 let sortKey='count',sortDir=-1;

 function rowsNow(){
   try{return typeof filters==='function'?filters():(Array.isArray(DATA)?DATA:[])}
   catch(e){return Array.isArray(DATA)?DATA:[]}
 }
 function isReplacement(r){
   const s=norm(r?.operation);
   if(!s)return false;
   return ['فك','استبدال','تبديل','تغيير','تالف','تلف','استبعاد','خرد','ازاله','إزاله','الغاء'].some(x=>s.includes(norm(x)));
 }
 function replacementRows(rows){
   /* كل سجل مسحوب وله «موضع كفر» يعتبر حركة مرتبطة بهذا الموضع.
      لا نعتمد على نص عمود العملية لأن صياغته تختلف بين السجلات
      وقد تكون «جديد / تركيب / صرف» وغيرها، وهو ما كان يجعل التقرير فارغًا. */
   return (Array.isArray(rows)?rows:[]).filter(r=>clean(r.position));
 }
 function lastDate(rows){
   return rows.map(r=>clean(r.date)).filter(Boolean).sort().at(-1)||'';
 }
 function fmtDate(v){
   if(!v)return '—';
   const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleDateString('ar-EG',{year:'numeric',month:'2-digit',day:'2-digit'});
 }
 function money(v){
   return (Number(v)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 }
 function groups(rows){
   const events=replacementRows(rows),m=new Map();
   events.forEach(r=>{
     const p=clean(r.position)||'غير محدد';
     if(!m.has(p))m.set(p,[]);
     m.get(p).push(r);
   });
   const total=events.length||1;
   return [...m.entries()].map(([position,rs])=>{
     const priced=rs.filter(r=>Number.isFinite(Number(r.price)));
     const cost=priced.reduce((s,r)=>s+(Number(r.price)||0),0);
     return {position,rows:rs,count:rs.length,pct:rs.length/total*100,cost,
       avg:priced.length?cost/priced.length:0,last:lastDate(rs)};
   });
 }
 function sortedGroups(rows){
   const a=groups(rows);
   a.sort((x,y)=>{
     let av=x[sortKey],bv=y[sortKey];
     if(sortKey==='position')return sortDir*String(av).localeCompare(String(bv),'ar',{numeric:true});
     if(sortKey==='last')return sortDir*String(av||'').localeCompare(String(bv||''));
     return sortDir*((Number(av)||0)-(Number(bv)||0));
   });
   return a;
 }
 function riskColor(count,max){
   const ratio=max?Math.max(0,Math.min(1,count/max)):0;
   const hue=120-(ratio*112);
   const sat=58+(ratio*18);
   const light=43+(ratio*5);
   return `hsl(${hue} ${sat}% ${light}%)`;
 }
 function applyPosition(position,equipment){
   const el=$('position');if(el){
     el.value=position;
     el.dispatchEvent(new Event('change',{bubbles:true}));
     el.dispatchEvent(new Event('input',{bubbles:true}));
   }
   if(equipment){
     const eq=$('equipment');if(eq){
       eq.value=equipment;
       eq.dispatchEvent(new Event('change',{bubbles:true}));
     }
   }
   window.__EGO_FILTER_REPORT_LOCK={report:'tirePositionReport',until:Date.now()+1800};
   try{if(typeof render==='function')render()}catch(e){}
   try{window.renderFilterChips?.()}catch(e){}
   try{window.refreshActiveScreen?.('tirePositionReport',true)}catch(e){}
 }
 function renderKpis(rows,g){
   const box=$('tpKpis');if(!box)return;
   const events=replacementRows(rows),top=[...g].sort((a,b)=>b.count-a.count)[0];
   const top3=[...g].sort((a,b)=>b.count-a.count).slice(0,3).reduce((s,x)=>s+x.count,0);
   const concentration=events.length?top3/events.length*100:0;
   box.innerHTML=[
     ['الموضع الأكثر استبدالًا',top?.position||'—',top?`${top.count} استبدال / تلف`:'لا توجد بيانات'],
     ['عدد المواضع المختلفة',g.length,'ضمن الفلتر الحالي'],
     ['تركز أعلى 3 مواضع',events.length?concentration.toFixed(1)+'%':'—',`${top3} من ${events.length} حركة`],
     ['تكلفة أكثر موضع تضررًا',top?money(top.cost)+' SAR':'—',top?.position||'—']
   ].map(([a,b,c])=>`<div class="tp-kpi"><span>${esc(a)}</span><b>${esc(b)}</b><small>${esc(c)}</small></div>`).join('');
 }
 function renderChart(rows,g){
   const el=$('tpChart'),state=$('tpState');if(!el)return;
   const events=replacementRows(rows);
   if(state)state.textContent=`${events.length} حركة مسجلة • ${g.length} موضع`;
   if(events.length<3){
     el.innerHTML='<div class="tp-empty">لا توجد بيانات كافية لعرض هذا التحليل — يلزم 3 سجلات موضع على الأقل.</div>';
     return;
   }
   const ranked=[...g].sort((a,b)=>b.count-a.count||b.cost-a.cost);
   const max=Math.max(...ranked.map(x=>x.count),1);
   el.innerHTML=`<div class="tp-ranking">${ranked.map((x,i)=>`
    <div class="tp-rank-row" data-position="${esc(x.position)}" title="اضغط لتصفية الداشبورد على هذا الموضع">
      <div class="tp-rank-name"><b>${i+1}</b>${esc(x.position)}</div>
      <div class="tp-rank-track"><div class="tp-rank-bar" style="width:${Math.max(3,x.count/max*100)}%;background:${riskColor(x.count,max)}"></div></div>
      <div class="tp-rank-value">${x.count}</div>
    </div>`).join('')}</div>`;
   el.querySelectorAll('[data-position]').forEach(x=>x.onclick=()=>applyPosition(x.dataset.position));
 }
 function renderTable(rows){
   const body=$('tpDetailBody'),foot=$('tpDetailFoot');if(!body||!foot)return;
   const a=sortedGroups(rows),total=replacementRows(rows).length;
   if(!a.length){
     body.innerHTML='<tr><td colspan="6" class="tp-empty">لا توجد بيانات موضع كفر مرتبطة بعمليات استبدال / تلف ضمن الفلاتر الحالية.</td></tr>';
     foot.innerHTML='';return;
   }
   body.innerHTML=a.map(x=>`<tr class="tp-clickable" data-position="${esc(x.position)}">
     <td><b>${esc(x.position)}</b></td><td>${x.count}</td><td>${x.pct.toFixed(1)}%</td>
     <td>${money(x.cost)} SAR</td><td>${money(x.avg)} SAR</td><td>${esc(fmtDate(x.last))}</td>
   </tr>`).join('');
   foot.innerHTML=`<tr><td><b>الإجمالي</b></td><td><b>${total}</b></td><td><b>${total?'100.0%':'0.0%'}</b></td>
     <td><b>${money(a.reduce((s,x)=>s+x.cost,0))} SAR</b></td><td>—</td><td>—</td></tr>`;
   body.querySelectorAll('[data-position]').forEach(x=>x.onclick=()=>applyPosition(x.dataset.position));
   document.querySelectorAll('#tpDetailTable th[data-tp-sort]').forEach(th=>{
     th.classList.toggle('tp-sort-active',th.dataset.tpSort===sortKey);
     th.onclick=()=>{
       const k=th.dataset.tpSort;
       if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=k==='position'?1:-1}
       renderTable(rows);
     };
   });
 }
 function equipmentLabel(r){
   const p=clean(r.plate)||'غير محدد',v=clean(r.vehicle);
   return v?`${p} - ${v}`:p;
 }
 function renderHeatmap(rows){
   const el=$('tpHeatmap');if(!el)return;
   const events=replacementRows(rows);
   if(events.length<3){el.innerHTML='<div class="tp-empty">لا توجد بيانات كافية لبناء مصفوفة الموضع × المعدة.</div>';return}
   const positions=[...new Set(events.map(r=>clean(r.position)))].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));
   const equips=[...new Set(events.map(r=>clean(r.plate)||'غير محدد'))].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));
   const labels=new Map(equips.map(p=>{
     const rs=events.filter(r=>(clean(r.plate)||'غير محدد')===p);
     return [p,equipmentLabel(rs[0]||{plate:p})];
   }));
   const matrix=new Map(),counts=[];
   events.forEach(r=>{
     const p=clean(r.position),e=clean(r.plate)||'غير محدد',k=p+'\u001f'+e;
     const n=(matrix.get(k)||0)+1;matrix.set(k,n);
   });
   matrix.forEach(v=>counts.push(v));
   const max=Math.max(...counts,1);
   el.innerHTML=`<table class="tp-heatmap"><thead><tr><th>موضع الكفر</th>${equips.map(e=>`<th>${esc(labels.get(e)||e)}</th>`).join('')}<th>الإجمالي</th></tr></thead>
    <tbody>${positions.map(p=>{
      let rowTotal=0;
      const cells=equips.map(e=>{
        const n=matrix.get(p+'\u001f'+e)||0;rowTotal+=n;
        const alpha=n?(.12+.68*n/max):.025;
        return `<td class="tp-heat-cell" data-position="${esc(p)}" data-equipment="${esc(e)}" style="background:rgba(226,88,62,${alpha.toFixed(3)})">${n||'—'}</td>`;
      }).join('');
      return `<tr><td class="tp-clickable" data-position="${esc(p)}"><b>${esc(p)}</b></td>${cells}<td><b>${rowTotal}</b></td></tr>`;
    }).join('')}</tbody></table>
    <div class="tp-data-note">انقر على اسم الموضع لتطبيق فلتر الموضع، أو على خلية لتطبيق الموضع والمعدة معًا.</div>`;
   el.querySelectorAll('td[data-position]').forEach(td=>td.onclick=()=>applyPosition(td.dataset.position,td.dataset.equipment||''));
 }
 function renderExplain(rows,g){
   const el=$('tpExplain');if(!el)return;
   const events=replacementRows(rows),ranked=[...g].sort((a,b)=>b.count-a.count),top=ranked[0];
   const concentration=events.length&&top?top.count/events.length*100:0;
   el.innerHTML=`<div class="explain-head"><div><h3>قراءة إدارية — نقاط التلف</h3>
     <p>يعتمد التقرير على جميع سجلات المسحوبات التي تحتوي على قيمة في عمود «موضع الكفر» ضمن الفلاتر الحالية، ويهمل المواضع الفارغة.</p></div></div>
     <div class="explain-body">
       <div><b>النطاق الحالي:</b> ${events.length} حركة مسجلة في ${g.length} موضع مختلف.</div>
       <div><b>أعلى موضع:</b> ${top?`${esc(top.position)} بعدد ${top.count} حركة (${concentration.toFixed(1)}%)`:'لا توجد بيانات كافية'}.</div>
       <div><b>الاستخدام المقترح:</b> إذا تكرر نفس الموضع عبر معدات متعددة فقد تكون ظاهرة تشغيلية عامة؛ وإذا تركز على معدة واحدة فراجع المحاذاة، الحمولة، ضغط الهواء ونمط التشغيل.</div>
     </div>`;
 }
 function renderHomeMini(rows){
   const k=$('homeMiniKpis_tirePositionReport'),c=$('homeMiniChart_tirePositionReport');
   if(!k&&!c)return;
   const g=groups(rows),events=replacementRows(rows),top=[...g].sort((a,b)=>b.count-a.count)[0];
   if(k)k.innerHTML=[
     ['المواضع',g.length],['الحركات',events.length],['الأعلى',top?.count||0]
   ].map(([a,b])=>`<div class="home-mini-kpi"><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join('');
   if(c)c.innerHTML=top?`<div class="home-mini-empty">الأكثر تكرارًا: ${esc(top.position)} — ${top.count} حركة</div>`:
      '<div class="home-mini-empty">لا توجد بيانات كافية حتى الآن</div>';
 }
 function renderDecisionAlert(rows){
   if((document.body?.dataset?.activeReport||'home')!=='home')return;
   const list=$('decisionPriorityList');if(!list)return;
   list.querySelectorAll('[data-tp-decision-alert]').forEach(x=>x.remove());
   const g=groups(rows),events=replacementRows(rows),top=[...g].sort((a,b)=>b.count-a.count)[0];
   if(!top||events.length<4)return;
   const pct=top.count/events.length*100;
   if(pct<60)return;
   const item=document.createElement('button');
   item.type='button';item.className='decision-item';item.dataset.tpDecisionAlert='1';
   item.innerHTML=`<b>تركيز استبدال في موضع الكفر</b><small>${pct.toFixed(0)}% من السجلات المرتبطة بالموضع في «${esc(top.position)}» — يستحق فحص المحاذاة والحمولة.</small>`;
   item.onclick=()=>{try{window.openReportView?.('tirePositionReport')}catch(e){}};
   list.prepend(item);
 }
 function render(rows){
   rows=Array.isArray(rows)?rows:rowsNow();
   const g=groups(rows);
   renderKpis(rows,g);renderChart(rows,g);renderTable(rows);renderHeatmap(rows);renderExplain(rows,g);renderHomeMini(rows);
   return g;
 }
 window.renderTirePositionReport=render;
 window.renderTirePositionHomeMini=function(rows){rows=Array.isArray(rows)?rows:rowsNow();renderHomeMini(rows);renderDecisionAlert(rows)};

 function init(){
   const pos=$('position');
   if(pos){
     pos.addEventListener('change',()=>setTimeout(()=>{
       try{window.renderFilterChips?.()}catch(e){}
       if((document.body?.dataset?.activeReport||'')==='tirePositionReport')render();
     },0));
   }
   document.querySelector('.filters')?.addEventListener('change',()=>setTimeout(()=>{
     const r=rowsNow();if((document.body?.dataset?.activeReport||'')==='tirePositionReport')render(r);else{renderHomeMini(r);renderDecisionAlert(r)}
   },60),true);
   document.querySelector('.filters')?.addEventListener('input',()=>setTimeout(()=>{
     const r=rowsNow();if((document.body?.dataset?.activeReport||'')==='tirePositionReport')render(r);else{renderHomeMini(r);renderDecisionAlert(r)}
   },100),true);
   setTimeout(()=>{const r=rowsNow();renderHomeMini(r);renderDecisionAlert(r)},1100);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
