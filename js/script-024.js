
(function(){
  let lastSig='', lastSnapshot=null, enrichTimer=0;

  function rows(){
    try{
      const a=typeof filters==='function'?filters():(Array.isArray(DATA)?DATA:[]);
      return window.EGOTireOps?.operationalRows?.(a)||a;
    }catch(e){
      const a=Array.isArray(DATA)?DATA:[];
      return window.EGOTireOps?.operationalRows?.(a)||a;
    }
  }
  function mkey(v){return String(v||'').slice(0,7)}
  function n(v){return Number(v)||0}
  function fmt(v){return n(v).toLocaleString('en-US',{maximumFractionDigits:0})}
  function escH(v){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
  }
  function sig(a){
    const f=typeof dashboardFilterSignature==='function'?dashboardFilterSignature():'';
    return `${f}|${a.length}`;
  }

  // One loop builds everything needed by the executive summary,
  // report-destination context, quality and attention center.
  function snapshot(a){
    const now=new Date();
    const cur=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const pd=new Date(now.getFullYear(),now.getMonth()-1,1);
    const prev=`${pd.getFullYear()}-${String(pd.getMonth()+1).padStart(2,'0')}`;

    let total=0,curVal=0,prevVal=0,curCount=0,prevCount=0,missing=0;
    const equipment=new Map(),supplier=new Map(),invoice=new Map(),activity=new Map(),tire=new Map();
    const invoices=new Set(), equipments=new Set(), suppliers=new Set();

    for(const r of a){
      const price=n(r.price), mk=mkey(r.date);
      total+=price;
      if(mk===cur){curVal+=price;curCount++}
      else if(mk===prev){prevVal+=price;prevCount++}

      const eq=String(r.plate||'غير محدد'), su=String(r.supplier||'غير محدد'),
            iv=String(r.invoice||'').trim(), ac=String(r.activity||'غير محدد'),
            tr=String(r.tire_type||'غير محدد');

      equipment.set(eq,(equipment.get(eq)||0)+price);
      supplier.set(su,(supplier.get(su)||0)+price);
      activity.set(ac,(activity.get(ac)||0)+price);
      tire.set(tr,(tire.get(tr)||0)+price);
      if(iv){invoice.set(iv,(invoice.get(iv)||0)+price);invoices.add(iv)}
      if(String(r.plate||'').trim())equipments.add(String(r.plate).trim());
      if(String(r.supplier||'').trim())suppliers.add(String(r.supplier).trim());

      if(!iv || !String(r.plate||'').trim() || !String(r.tire_type||'').trim())missing++;
    }

    const top=(map)=>[...map.entries()].sort((x,y)=>y[1]-x[1])[0]||['—',0];
    return {
      count:a.length,total,curVal,prevVal,curCount,prevCount,missing,
      invoices:invoices.size,equipments:equipments.size,suppliers:suppliers.size,
      topEq:top(equipment),topSup:top(supplier),topInv:top(invoice),topAct:top(activity),topTire:top(tire)
    };
  }

  function renderExecutiveFast(s){
    const k=document.getElementById('executiveKpis');
    if(k){
      k.innerHTML=[
        ['استهلاك الشهر',s.curCount,'عملية'],
        ['قيمة الشهر',fmt(s.curVal)+' SAR','قبل الضريبة'],
        ['إجمالي السجلات',s.count,'ضمن النطاق الحالي'],
        ['عدد المعدات',s.equipments,'معدة'],
        ['أعلى معدة',s.topEq[0],s.topEq[1]?fmt(s.topEq[1])+' SAR':'—'],
        ['الفواتير',s.invoices,'ضمن النطاق']
      ].map(([l,v,x])=>`<div class="executive-kpi"><span>${escH(l)}</span><b>${escH(v)}</b><small>${escH(x)}</small></div>`).join('');
    }
    const change=s.prevVal?((s.curVal-s.prevVal)/s.prevVal*100):0;
    const c=document.getElementById('executiveCompare');
    if(c)c.innerHTML=`مقارنة بالشهر السابق: <b>${change>=0?'▲':'▼'} ${Math.abs(change).toFixed(1)}%</b> في قيمة الاستهلاك. الشهر الحالي: <b>${fmt(s.curVal)} SAR</b> مقابل <b>${fmt(s.prevVal)} SAR</b>.`;
  }

  function renderInsightsFast(s){
    const qp=s.count?Math.max(0,100-s.missing/s.count*100):100;
    const q=document.getElementById('insightDataQuality');
    const qn=document.getElementById('insightDataQualityNote');
    if(q)q.textContent=qp.toFixed(0)+'%';
    if(qn)qn.textContent=s.missing?`${s.missing} سجل يحتاج استكمال بيانات أساسية`:'الحقول الأساسية مكتملة';

    const ti=document.getElementById('insightTopInvoice');
    const tin=document.getElementById('insightTopInvoiceNote');
    if(ti)ti.textContent=s.topInv[0];
    if(tin)tin.textContent=s.topInv[1]?`${fmt(s.topInv[1])} SAR قبل الضريبة`:'لا توجد قيمة';

    const ts=document.getElementById('insightTopSupplier');
    const tsn=document.getElementById('insightTopSupplierNote');
    if(ts)ts.textContent=s.topSup[0];
    if(tsn)tsn.textContent=s.topSup[1]?`${fmt(s.topSup[1])} SAR ضمن النطاق`:'لا توجد قيمة';

    // Stock is intentionally non-blocking.
    const sh=document.getElementById('insightStockHealth');
    const shn=document.getElementById('insightStockHealthNote');
    if(sh&&!sh.dataset.enriched)sh.textContent='يتم التحقق';
    if(shn&&!shn.dataset.enriched)shn.textContent='المخزون يُستكمل دون تعطيل الصفحة';

    const hr=document.getElementById('homeContextRows');
    const hf=document.getElementById('homeContextFilters');
    const hc=document.getElementById('homeContextConnection');
    if(hr)hr.textContent=`${s.count.toLocaleString('en-US')} سجل`;
    if(hf)hf.textContent=String(typeof activeFilterCount==='function'?activeFilterCount():0);
    if(hc)hc.textContent=document.getElementById('conn')?.textContent?.replace(/^●\s*/,'')||'—';
  }

  function renderAttentionFast(s){
    const list=document.getElementById('decisionPriorityList');
    const count=document.getElementById('decisionPriorityCount');
    const health=document.getElementById('decisionHealth');
    const items=[];

    const spendChange=s.prevVal?((s.curVal-s.prevVal)/s.prevVal*100):0;
    if(spendChange>25)items.push({
      cls:'warning',title:'ارتفاع ملحوظ في الاستهلاك الشهري',
      detail:`قيمة الشهر أعلى من السابق بنسبة ${spendChange.toFixed(1)}%.`,target:'reportMonthly'
    });
    if(s.missing)items.push({
      cls:'warning',title:'سجلات تحتاج استكمال بيانات',
      detail:`${s.missing} سجل به رقم فاتورة أو معدة أو صنف ناقص.`,target:'records'
    });
    if(s.total && s.topEq[1]/s.total>.30)items.push({
      cls:'info',title:`تركيز مرتفع على المعدة ${s.topEq[0]}`,
      detail:`تمثل ${(s.topEq[1]/s.total*100).toFixed(1)}% من قيمة النطاق الحالي.`,target:'reportEquipment'
    });
    if(s.total && s.topSup[1]/s.total>.45)items.push({
      cls:'info',title:`اعتماد مرتفع على المورد ${s.topSup[0]}`,
      detail:`يمثل ${(s.topSup[1]/s.total*100).toFixed(1)}% من قيمة النطاق الحالي.`,target:'reportSupplier'
    });
    if(!items.length)items.push({
      cls:'success',title:'لا توجد مؤشرات تشغيلية حرجة حاليًا',
      detail:'البيانات الأساسية مستقرة ضمن النطاق الحالي.',target:'home'
    });

    if(list)list.innerHTML=items.map(x=>`
      <button type="button" class="decision-item ${x.cls}" data-decision-target="${escH(x.target)}">
        <span class="decision-dot"></span>
        <span class="decision-item-main"><b>${escH(x.title)}</b><small>${escH(x.detail)}</small></span>
        <span class="decision-arrow">‹</span>
      </button>`).join('');
    if(count)count.textContent=String(items.filter(x=>x.cls!=='success').length);
    if(health){
      const warn=items.some(x=>x.cls==='warning');
      health.className='decision-health '+(warn?'warn':'good');
      health.textContent=warn?'يحتاج متابعة':'الحالة مستقرة';
    }

    // Lightweight trends, no inventory/supplier invoice calculations.
    const tg=document.getElementById('operationalTrendGrid');
    if(tg){
      const countChange=s.prevCount?((s.curCount-s.prevCount)/s.prevCount*100):0;
      const spendChange2=s.prevVal?((s.curVal-s.prevVal)/s.prevVal*100):0;
      tg.innerHTML=[
        ['قيمة الشهر',`${spendChange2>=0?'▲':'▼'} ${Math.abs(spendChange2).toFixed(1)}%`,`${fmt(s.curVal)} SAR مقابل ${fmt(s.prevVal)} SAR`],
        ['عدد المسحوبات',`${countChange>=0?'▲':'▼'} ${Math.abs(countChange).toFixed(1)}%`,`${s.curCount} مقابل ${s.prevCount}`],
        ['أعلى معدة',s.topEq[0],`${fmt(s.topEq[1])} SAR`],
        ['أعلى مورد',s.topSup[0],`${fmt(s.topSup[1])} SAR`]
      ].map(([l,v,note])=>`<div class="trend-card neutral"><span>${escH(l)}</span><b>${escH(v)}</b><small>${escH(note)}</small></div>`).join('');
    }

    // Forecast/anomaly blocks no longer block initial entry.
    const fl=document.getElementById('stockForecastList');
    if(fl&&!fl.children.length)fl.innerHTML='<div class="decision-empty">جاري حساب توقع نفاد المخزون…</div>';
    const an=document.getElementById('anomalyList');
    if(an)an.innerHTML='<div class="decision-empty">التحليل المتقدم متاح عند فتح تقارير التشغيل.</div>';

    const ha=document.getElementById('homeContextAlerts');
    if(ha)ha.textContent=String(items.filter(x=>x.cls!=='success').length);
    const badge=document.getElementById('alertsCountBadge');
    if(badge){
      const v=items.filter(x=>x.cls!=='success').length;
      badge.textContent=v?String(v):'';
      badge.hidden=!v;
    }
  }

  function renderNow(force=false){
    const a=rows(), key=sig(a);
    if(!force && key===lastSig && lastSnapshot)return;
    lastSig=key;
    lastSnapshot=snapshot(a);
    renderExecutiveFast(lastSnapshot);
    renderInsightsFast(lastSnapshot);
    renderAttentionFast(lastSnapshot);

    // Save only tiny computed snapshot for instant next startup.
    try{localStorage.setItem('ego-fast-home-snapshot-v1',JSON.stringify(lastSnapshot))}catch(e){}
  }

  function restoreInstant(){
    try{
      const s=JSON.parse(localStorage.getItem('ego-fast-home-snapshot-v1')||'null');
      if(!s)return;
      renderExecutiveFast(s);
      renderInsightsFast(s);
      renderAttentionFast(s);
    }catch(e){}
  }

  // Optional enrichment runs only after the page is already responsive.
  function scheduleEnrichment(){
    clearTimeout(enrichTimer);
    enrichTimer=setTimeout(()=>{
      if(document.visibilityState!=='visible' || !document.body.classList.contains('nav-home'))return;
      const run=()=>{
        try{
          const inv=typeof buildInventory==='function'?buildInventory():[];
          const low=inv.filter(x=>typeof stockStatus==='function'&&['low','out','over'].includes(stockStatus(x)[0])).length;
          const stock=inv.reduce((s,x)=>s+n(x.remain),0);

          const sh=document.getElementById('insightStockHealth');
          const shn=document.getElementById('insightStockHealthNote');
          if(sh){sh.textContent=low?`${low} تنبيه`:'مستقر';sh.dataset.enriched='1'}
          if(shn){shn.textContent=`المتبقي ${fmt(stock)} وحدة`;shn.dataset.enriched='1'}

          // Forecast is rendered by the live stock-forecast renderer.
          try{window.renderStockForecastNow?.()}catch(e){}
        }catch(e){}
      };
      if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:1200});
      else setTimeout(run,250);
    },1200);
  }

  window.renderCriticalHomeFast=function(force=false){
    renderNow(force);
    scheduleEnrichment();
  };

  // Override the previous heavy fast-dashboard renderer decisively.
  window.renderFastDashboard=function(){
    window.renderCriticalHomeFast();
  };

  if(document.readyState==='loading'){
    restoreInstant();
    document.addEventListener('DOMContentLoaded',()=>{restoreInstant();setTimeout(()=>renderNow(true),0)});
  }else{
    restoreInstant();
    setTimeout(()=>renderNow(true),0);
  }
})();
