
(function(){
  const $id=id=>document.getElementById(id);
  const clean=v=>String(v??'').trim();
  const escLife=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const allRows=()=>{try{return Array.isArray(DATA)?DATA:[]}catch(e){return []}};
  const unique=a=>[...new Set(a.map(clean).filter(Boolean))];

  function parseDate(v){const d=new Date(v);return Number.isNaN(d.getTime())?null:d}
  function dateText(v){const d=parseDate(v);return d?d.toLocaleDateString('ar-EG',{year:'numeric',month:'2-digit',day:'2-digit'}):clean(v)||'—'}
  function daysBetween(a,b){const A=parseDate(a),B=parseDate(b);return(!A||!B)?null:Math.max(0,Math.round((B-A)/86400000))}
  function durationText(days){
    if(days===null||days===undefined)return '—';
    if(days<31)return `${days} يوم`;
    if(days<365)return `${(days/30.44).toFixed(1)} شهر`;
    return `${(days/365.25).toFixed(1)} سنة`;
  }
  function normalizeLifeText(v){
    return clean(v).toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي');
  }
  function isInstallationStart(op){
    const k=window.EGOTireOps?.tireOperationKind?.({operation:op}.operation) || '';
    return k==='new'||k==='swap'||k==='reuse';
  }

  function meterNumber(v){
    const arabic='٠١٢٣٤٥٦٧٨٩', eastern='۰۱۲۳۴۵۶۷۸۹';
    let s=clean(v);
    /* Empty / missing odometer is missing data — never convert it to 0.
       This is critical for identities such as 10027 where the first "جديد"
       movement has no installation reading. */
    if(!s)return null;
    s=s.replace(/[٠-٩]/g,d=>String(arabic.indexOf(d))).replace(/[۰-۹]/g,d=>String(eastern.indexOf(d)));
    s=s.replace(/,/g,'').replace(/[^\d.-]/g,'');
    if(!s || s==='-' || s==='.' || s==='-.')return null;
    const n=Number(s);
    return Number.isFinite(n)?n:null;
  }
  function kmText(v){
    return v===null||v===undefined?'—':`${Math.round(v).toLocaleString('en-US')} كم`;
  }
  function distanceByEvent(rows){
    /* المسافة تخص المرحلة المنتهية عند الحركة الحالية:
       قراءة العداد الحالية - قراءة العداد في الحركة السابقة لنفس هوية الكفر.
       عمليات التركيب (جديد / إعادة استخدام) تبدأ مرحلة جديدة، لذلك لا تعرض مسافة. */
    return rows.map((r,i)=>{
      const kind=window.EGOTireOps?.tireOperationKind?.(r.operation)||'other';
      const current=meterNumber(r.odometer);

      if(kind==='new' || kind==='reuse'){
        return {
          distance:null,
          note: current===null
            ? 'قراءة العداد عند التركيب مفقودة'
            : 'بداية تركيب — لا توجد مسافة بعد'
        };
      }

      if(i===0){
        return {
          distance:null,
          note:'لا توجد حركة سابقة لنفس هوية الكفر لحساب المسافة'
        };
      }

      const prev=rows[i-1];
      const prevMeter=meterNumber(prev.odometer);
      const prevKind=window.EGOTireOps?.tireOperationKind?.(prev.operation)||'other';

      if(current===null){
        return {
          distance:null,
          note:'قراءة العداد في الحركة الحالية مفقودة'
        };
      }

      if(prevMeter===null){
        return {
          distance:null,
          note:(prevKind==='new'||prevKind==='reuse')
            ? 'قراءة العداد عند التركيب مفقودة'
            : 'قراءة العداد في العملية السابقة مفقودة'
        };
      }

      const d=current-prevMeter;
      if(d<0){
        return {
          distance:null,
          note:'قراءة العداد الحالية أقل من القراءة السابقة — يحتاج مراجعة'
        };
      }

      return {
        distance:d,
        note:`${Math.round(current).toLocaleString('en-US')} − ${Math.round(prevMeter).toLocaleString('en-US')}`
      };
    });
  }

  function totalServiceDistance(rows){
    const events=distanceByEvent(rows);
    const valid=events.map(x=>x.distance).filter(v=>v!==null&&v!==undefined&&v>=0);
    return valid.length?valid.reduce((s,v)=>s+v,0):null;
  }
  function lifeEquipmentLabel(r){
    const plate=clean(r.plate)||'—',activity=clean(r.activity);
    return activity&&plate!=='—'?`${plate} - ${activity}`:plate;
  }
  function classify(op){
    const k=window.EGOTireOps?.tireOperationKind?.(op)||'other';
    if(k==='park')return {kind:'remove',subkind:'park',label:'ركن / عودة للمخزن'};
    if(k==='service_end')return {kind:'remove',subkind:'service_end',label:'إنهاء خدمة / تالف'};
    if(k==='new')return {kind:'install',subkind:'new',label:'أول تركيب'};
    if(k==='reuse')return {kind:'install',subkind:'reuse',label:'إعادة استخدام'};
    if(k==='swap')return {kind:'install',subkind:'swap',label:'تبديل / استمرار بالخدمة'};
    return {kind:'move',subkind:'other',label:'حركة مسجلة'};
  }

  function history(id){
    return allRows().filter(r=>clean(r.tire_id)===clean(id)).sort((a,b)=>{
      const ad=parseDate(a.date)?.getTime()||0,bd=parseDate(b.date)?.getTime()||0;
      if(ad!==bd)return ad-bd;
      return (Number(a.id)||0)-(Number(b.id)||0);
    });
  }
  function statusFor(rows){
    if(!rows.length)return {kind:'unknown',label:'غير معروف',note:'لا توجد حركات'};
    const last=rows[rows.length-1],c=classify(last.operation);
    if(c.subkind==='park')return {kind:'parked',label:'مركون — مستخدم سابقًا',note:`عاد للمخزن بتاريخ ${dateText(last.date)} ومتاح لإعادة الاستخدام`};
    if(c.subkind==='service_end')return {kind:'ended',label:'منتهي الخدمة — تالف',note:`تم إنهاء الخدمة بتاريخ ${dateText(last.date)} ولا يعود للمخزون المتاح`};
    if(c.kind==='install')return {kind:'installed',label:'مركب / قيد الاستخدام',note:`${lifeEquipmentLabel(last)} • ${clean(last.position)||'موضع غير محدد'}`};
    return {kind:'unknown',label:'حالة غير محسومة',note:`آخر حركة: ${clean(last.operation)||'غير محددة'}`};
  }

  function installCount(rows){return rows.filter(r=>classify(r.operation).kind==='install').length}
  function removeCount(rows){return rows.filter(r=>classify(r.operation).kind==='remove').length}
  function serviceDays(rows){
    let total=0,open=null;
    rows.forEach(r=>{
      const c=classify(r.operation);
      if(c.kind==='install'){
        if(open){const d=daysBetween(open.date,r.date);if(d!==null)total+=d}
        open=r;
      }else if(c.kind==='remove'&&open){
        const d=daysBetween(open.date,r.date);if(d!==null)total+=d;
        open=null;
      }
    });
    if(open){
      const d=daysBetween(open.date,new Date().toISOString().slice(0,10));
      if(d!==null)total+=d;
    }
    return total;
  }

  function populate(keep=true,q=''){
    const sel=$id('lifeTireSelect');if(!sel)return;
    const prev=keep?sel.value:'',query=clean(q).toLowerCase();
    const rows=allRows().filter(r=>{
      if(!clean(r.tire_id))return false;
      if(!query)return true;
      return [r.tire_id,r.plate,r.vehicle,r.tire_type,r.invoice,r.supplier].join(' ').toLowerCase().includes(query);
    });
    const ids=unique(rows.map(r=>r.tire_id)).sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));
    sel.innerHTML='<option value="">— اختر هوية الكفر —</option>'+ids.map(v=>`<option value="${escLife(v)}">${escLife(v)}</option>`).join('');
    if(prev&&ids.includes(prev))sel.value=prev;
    $id('tlcTotalIds').textContent=ids.length.toLocaleString('en-US');
  }

  function renderKpis(rows){
    const first=rows[0],last=rows[rows.length-1],eq=unique(rows.map(r=>lifeEquipmentLabel(r))),totalKm=totalServiceDistance(rows);
    const items=[
      ['أول ظهور',dateText(first.date),'بداية السجل المتاح'],
      ['آخر حركة',dateText(last.date),clean(last.operation)||'غير محددة'],
      ['مرات التركيب',installCount(rows),'حسب وصف العملية'],
      ['مرات الفك',removeCount(rows),'حسب وصف العملية'],
      ['عدد المعدات',eq.length,eq.slice(0,4).join('، ')||'—'],
      ['المسافة المقطوعة المسجلة',kmText(totalKm),'مجموع الفروق الصحيحة بين قراءة كل حركة والقراءة السابقة لنفس الهوية؛ ولا تُحسب مسافة في حركة التركيب'],
      ['مدة الخدمة التقديرية',durationText(serviceDays(rows)),'محسوبة من تسلسل الحركات']
    ];
    $id('lifeKpis').innerHTML=items.map(([a,b,c])=>`<tr><td>${escLife(a)}</td><td><b>${escLife(b)}</b></td><td>${escLife(c)}</td></tr>`).join('');
  }

  function renderTimeline(rows){
    const distances=distanceByEvent(rows);
    $id('lifeTimeline').innerHTML=rows.map((r,i)=>{
      const c=classify(r.operation),next=rows[i+1],d=distances[i];
      const duration=next?durationText(daysBetween(r.date,next.date)):durationText(daysBetween(r.date,new Date().toISOString().slice(0,10)));
      const extra=[clean(r.vehicle),clean(r.activity),clean(r.odometer)?'العداد '+clean(r.odometer):''].filter(Boolean).join(' • ');
      return `<tr>
        <td>${i+1}</td>
        <td>${escLife(dateText(r.date))}</td>
        <td><span class="tlc-action ${c.kind}">${escLife(clean(r.operation)||'غير محدد')}</span></td>
        <td>${escLife(c.label)}</td>
        <td><b>${escLife(lifeEquipmentLabel(r))}</b></td>
        <td>${escLife(clean(r.position)||'—')}</td>
        <td>${escLife(extra||'—')}</td>
        <td><b>${escLife(kmText(d.distance))}</b></td>
        <td class="tlc-distance-note">${escLife(d.note||'—')}</td>
        <td>${escLife(duration)}</td>
      </tr>`;
    }).join('');
  }

  function renderRoute(rows){
    const seg=[];
    rows.forEach(r=>{
      const key=`${clean(r.plate)}|${clean(r.activity)}|${clean(r.position)}`;
      let last=seg[seg.length-1];
      if(!last||last.key!==key){
        last={key,plate:lifeEquipmentLabel(r),vehicle:clean(r.vehicle)||'—',position:clean(r.position)||'—',start:r.date,end:r.date,count:1};
        seg.push(last);
      }else{last.end=r.date;last.count++}
    });
    $id('lifeRouteSummary').innerHTML=`<div class="compare-table-wrap"><table class="compare-table tlc-route-table">
      <thead><tr><th>#</th><th>المعدة</th><th>المركبة</th><th>الموضع</th><th>من</th><th>إلى</th><th>الحركات</th></tr></thead>
      <tbody>${seg.map((s,i)=>`<tr><td>${i+1}</td><td><b>${escLife(s.plate)}</b></td><td>${escLife(s.vehicle)}</td><td>${escLife(s.position)}</td><td>${escLife(dateText(s.start))}</td><td>${escLife(dateText(s.end))}</td><td>${s.count}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }

  function renderRecords(rows){
    const distances=distanceByEvent(rows);
    $id('lifeTableBody').innerHTML=rows.map((r,i)=>{
      const c=classify(r.operation),next=rows[i+1],d=distances[i];
      return `<tr>
        <td>${i+1}</td><td>${escLife(dateText(r.date))}</td>
        <td><span class="tlc-action ${c.kind}">${escLife(clean(r.operation)||'غير محدد')}</span></td>
        <td>${escLife(c.label)}</td>
        <td>${escLife(lifeEquipmentLabel(r))}</td><td>${escLife(clean(r.vehicle)||'—')}</td>
        <td>${escLife(clean(r.position)||'—')}</td><td>${escLife(clean(r.activity)||'—')}</td>
        <td>${escLife(clean(r.odometer)||((c.subkind==='new'||c.subkind==='reuse')?'مفقودة عند التركيب':'—'))}</td>
        <td><b>${escLife(kmText(d.distance))}</b></td>
        <td class="tlc-distance-note">${escLife(d.note||'—')}</td>
        <td>${escLife(next?durationText(daysBetween(r.date,next.date)):'آخر حركة')}</td>
        <td>${escLife(clean(r.invoice)||'—')}</td><td>${escLife(clean(r.supplier)||'—')}</td>
      </tr>`;
    }).join('');
  }

  function renderAnalysis(rows){
    const eq=unique(rows.map(r=>lifeEquipmentLabel(r))),pos=unique(rows.map(r=>r.position)),totalKm=totalServiceDistance(rows);
    const gaps=rows.slice(1).map((r,i)=>daysBetween(rows[i].date,r.date)).filter(v=>v!==null);
    const shortest=gaps.length?Math.min(...gaps):null,longest=gaps.length?Math.max(...gaps):null;
    const installs=installCount(rows),removes=removeCount(rows);
    const items=[
      ['اتساق التركيب والفك',`${installs} تركيب / ${removes} فك`,Math.abs(installs-removes)<=1?'متوازن وفق البيانات':'يحتاج مراجعة'],
      ['المعدات المستخدمة',`${eq.length} معدة`,eq.join('، ')||'لا توجد بيانات'],
      ['مدة الخدمة التقديرية',durationText(serviceDays(rows)),'محسوبة من تسلسل الحركات'],
      ['المسافة المقطوعة المسجلة',kmText(totalKm),'مجموع المسافات بين الحركات المتتالية لنفس الهوية، مع استبعاد حركة التركيب نفسها'],
      ['المواضع المستخدمة',`${pos.length} موضع`,pos.join('، ')||'لا توجد بيانات'],
      ['أقصر فترة بين حركتين',shortest===null?'—':durationText(shortest),shortest!==null&&shortest<7?'قصيرة وتحتاج مراجعة':'ضمن النمط المسجل'],
      ['أطول فترة بين حركتين',longest===null?'—':durationText(longest),'بين حركتين متتاليتين']
    ];
    $id('lifeInsights').innerHTML=items.map(([a,b,c])=>`<tr><td><b>${escLife(a)}</b></td><td>${escLife(b)}</td><td>${escLife(c)}</td></tr>`).join('');
  }

  function renderSelected(id){
    const rows=history(id),empty=$id('lifeEmptyState'),content=$id('lifeContent');
    if(!id||!rows.length){empty.hidden=false;content.hidden=true;return}
    empty.hidden=true;content.hidden=false;

    const st=statusFor(rows),last=rows[rows.length-1];
    $id('lifeHeroId').textContent=id;
    $id('lifeHeroType').textContent=clean(last.tire_type)||'—';
    const status=$id('lifeHeroStatus');
    status.textContent=st.label;
    status.className='tlc-status '+st.kind;
    $id('lifeHeroStatusNote').textContent=st.note;
    $id('lifeEventCount').textContent=`${rows.length} حركة`;

    renderKpis(rows);
    renderTimeline(rows);
    renderRoute(rows);
    renderRecords(rows);
    renderAnalysis(rows);
  }

  function renderHomeMini(){
    const rows=allRows().filter(r=>clean(r.tire_id)),ids=unique(rows.map(r=>r.tire_id));
    const k=$id('homeMiniKpis_tireLifecycleReport');
    if(k)k.innerHTML=[['الهويات',ids.length],['التقرير','جاهز'],['المصدر','كامل']].map(([a,b])=>`<div class="home-mini-kpi"><span>${a}</span><strong>${b}</strong></div>`).join('');
    const c=$id('homeMiniChart_tireLifecycleReport');
    if(c)c.innerHTML=`<div class="home-mini-empty">${ids.length} هوية متاحة للتحليل</div>`;
  }

  function init(){
    populate(false);
    renderHomeMini();
    $id('lifeTireSelect')?.addEventListener('change',e=>renderSelected(e.target.value));
    $id('lifeTireSearch')?.addEventListener('input',e=>populate(true,e.target.value));
  }

  window.renderTireLifecycleReport=function(){
    populate(true,$id('lifeTireSearch')?.value||'');
    renderHomeMini();
    const id=$id('lifeTireSelect')?.value;
    if(id)renderSelected(id);
  };
  window.renderTireLifecycleHomeMini=renderHomeMini;

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
