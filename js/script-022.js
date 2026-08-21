
(function(){
  const REPORT_MAP={
    equipment:'reportEquipment',
    supplier:'reportSupplier',
    invoice:'reportInvoice',
    activity:'reportActivity',
    tire:'reportTire',
    period:'reportMonthly'
  };

  const modal=()=>document.getElementById('comparisonsModal');
  const typeEl=()=>document.getElementById('compareType');
  const aEl=()=>document.getElementById('compareA');
  const bEl=()=>document.getElementById('compareB');

  function allRows(){
    try{return (typeof DATA!=='undefined' && Array.isArray(DATA))?DATA:[]}catch(e){return []}
  }
  function baseRows(){
    return allRows();
  }
  function monthLabel(k){
    if(!k)return '—';
    const [y,m]=String(k).split('-').map(Number);
    if(!y||!m)return k;
    return new Date(y,m-1,1).toLocaleDateString('ar-EG',{month:'long',year:'numeric'});
  }
  function moneyN(v){return (Number(v)||0).toLocaleString('en-US',{maximumFractionDigits:2})}
  function numberN(v){return (Number(v)||0).toLocaleString('en-US',{maximumFractionDigits:2})}
  function uniqSorted(arr){
    return [...new Set(arr.map(x=>String(x??'').trim()).filter(Boolean))]
      .sort((a,b)=>a.localeCompare(b,'ar',{numeric:true,sensitivity:'base'}));
  }
  function optionsFor(type){
    const rows=allRows();
    if(type==='period'){
      return uniqSorted(rows.map(r=>monthKey(r.date))).sort().reverse().map(v=>({value:v,label:monthLabel(v)}));
    }
    const field={equipment:'plate',supplier:'supplier',invoice:'invoice',activity:'activity',tire:'tire_type'}[type];
    return uniqSorted(rows.map(r=>r[field])).map(v=>({value:v,label:v}));
  }
  function labelsFor(type){
    return {
      period:['الفترة الأولى','الفترة الثانية'],
      equipment:['المعدة الأولى','المعدة الثانية'],
      supplier:['المورد الأول','المورد الثاني'],
      invoice:['الفاتورة الأولى','الفاتورة الثانية'],
      activity:['النشاط الأول','النشاط الثاني'],
      tire:['الصنف الأول','الصنف الثاني']
    }[type]||['العنصر الأول','العنصر الثاني'];
  }

  function refreshOptions(keep=true){
    const type=typeEl()?.value||'period',opts=optionsFor(type),[la,lb]=labelsFor(type);
    const al=document.getElementById('compareALabel'),bl=document.getElementById('compareBLabel');
    if(al)al.textContent=la;if(bl)bl.textContent=lb;

    const currentA=keep ? (aEl()?.value||'') : '';
    const currentB=keep ? (bEl()?.value||'') : '';

    [aEl(),bEl()].forEach((el,idx)=>{
      if(!el)return;
      const old=idx===0?currentA:currentB;
      const placeholder=idx===0?`اختر ${la}`:`اختر ${lb}`;
      el.innerHTML=`<option value="">— ${esc(placeholder)} —</option>`+
        (opts.length
          ? opts.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')
          : '<option value="" disabled>لا توجد بيانات متاحة بعد</option>');
      if(old && opts.some(o=>o.value===old)) el.value=old;
      else el.value='';
    });

    renderWaitingState();
  }

  function selectRows(type,value,rows){
    if(type==='period')return rows.filter(r=>monthKey(r.date)===value);
    const field={equipment:'plate',supplier:'supplier',invoice:'invoice',activity:'activity',tire:'tire_type'}[type];
    return rows.filter(r=>String(r[field]??'').trim()===String(value??'').trim());
  }

  function safeDate(r){
    const d=new Date(r.date);
    return Number.isNaN(d.getTime())?null:d;
  }
  function aggregate(rows){
    const values=rows.map(r=>Number(r.price)||0);
    const spend=values.reduce((s,n)=>s+n,0),count=rows.length;
    const avg=count?spend/count:0;
    const sorted=[...values].sort((a,b)=>a-b);
    const median=count?(count%2?sorted[(count-1)/2]:(sorted[count/2-1]+sorted[count/2])/2):0;
    const max=count?Math.max(...values):0,min=count?Math.min(...values):0;
    const dates=rows.map(safeDate).filter(Boolean).sort((a,b)=>a-b);
    return {
      spend,count,avg,median,max,min,
      invoices:new Set(rows.map(r=>String(r.invoice??'').trim()).filter(Boolean)).size,
      equipment:new Set(rows.map(r=>String(r.plate??'').trim()).filter(Boolean)).size,
      suppliers:new Set(rows.map(r=>String(r.supplier??'').trim()).filter(Boolean)).size,
      activities:new Set(rows.map(r=>String(r.activity??'').trim()).filter(Boolean)).size,
      tires:new Set(rows.map(r=>String(r.tire_type??'').trim()).filter(Boolean)).size,
      tireIds:new Set(rows.map(r=>String(r.tire_id??r.tireId??'').trim()).filter(Boolean)).size,
      firstDate:dates[0]||null,lastDate:dates[dates.length-1]||null
    };
  }
  function pctDelta(a,b){
    const A=Number(a)||0,B=Number(b)||0;
    if(B===0)return A===0?0:100;
    return (A-B)/Math.abs(B)*100;
  }
  function topBreakdown(rows,field,limit=50){
    const map={};
    rows.forEach(r=>{
      const k=String(r[field]??'غير محدد').trim()||'غير محدد';
      map[k]=(map[k]||0)+(Number(r.price)||0);
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,limit);
  }
  function countBreakdown(rows,field,limit=50){
    const map={};
    rows.forEach(r=>{
      const k=String(r[field]??'غير محدد').trim()||'غير محدد';
      map[k]=(map[k]||0)+1;
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,limit);
  }

  function dimensionDrivers(aRows,bRows){
    const dims=[
      ['المعدة','plate'],['المورد','supplier'],['النشاط','activity'],
      ['الصنف','tire_type'],['الفاتورة','invoice']
    ];
    const out=[];
    dims.forEach(([label,field])=>{
      const aMap=Object.fromEntries(topBreakdown(aRows,field,100));
      const bMap=Object.fromEntries(topBreakdown(bRows,field,100));
      const keys=new Set([...Object.keys(aMap),...Object.keys(bMap)]);
      [...keys].forEach(k=>{
        const av=aMap[k]||0,bv=bMap[k]||0,d=av-bv;
        if(Math.abs(d)>0)out.push({label,field,key:k,a:av,b:bv,diff:d});
      });
    });
    return out.sort((x,y)=>Math.abs(y.diff)-Math.abs(x.diff)).slice(0,12);
  }

  function commonality(aRows,bRows,field){
    const A=new Set(aRows.map(r=>String(r[field]??'').trim()).filter(Boolean));
    const B=new Set(bRows.map(r=>String(r[field]??'').trim()).filter(Boolean));
    const common=[...A].filter(x=>B.has(x));
    const onlyA=[...A].filter(x=>!B.has(x));
    const onlyB=[...B].filter(x=>!A.has(x));
    return {common,onlyA,onlyB};
  }

  function comparisonScore(a,b){
    const spend=pctDelta(a.spend,b.spend),count=pctDelta(a.count,b.count),avg=pctDelta(a.avg,b.avg);
    const distance=Math.min(100,(Math.abs(spend)*.5+Math.abs(count)*.3+Math.abs(avg)*.2));
    const similarity=Math.max(0,100-distance);
    return {similarity,spend,count,avg};
  }

  function renderTopBars(aName,bName,aRows,bRows){
    const dims=[['المعدات','plate'],['الموردين','supplier'],['الأنشطة','activity'],['الأصناف','tire_type']];
    return dims.map(([title,field])=>{
      const amap=Object.fromEntries(topBreakdown(aRows,field,8));
      const bmap=Object.fromEntries(topBreakdown(bRows,field,8));
      const keys=uniqSorted([...Object.keys(amap),...Object.keys(bmap)]).slice(0,7);
      const max=Math.max(1,...keys.map(k=>Math.max(amap[k]||0,bmap[k]||0)));
      return `<div class="compare-card"><h3>التوزيع حسب ${title}</h3><div class="compare-bars">${
        keys.map(k=>`<div class="compare-bar-row">
          <div class="compare-bar-label">${esc(k)}</div>
          <div>
            <div class="compare-bar-track" title="${esc(aName)}"><div class="compare-bar-fill" style="width:${((amap[k]||0)/max*100).toFixed(1)}%"></div></div>
            <div class="compare-bar-track" title="${esc(bName)}" style="margin-top:3px"><div class="compare-bar-fill alt" style="width:${((bmap[k]||0)/max*100).toFixed(1)}%"></div></div>
          </div>
          <div class="compare-bar-val">${moneyN(amap[k]||0)}<br>${moneyN(bmap[k]||0)}</div>
        </div>`).join('')||'<div class="compare-empty">لا توجد بيانات</div>'
      }</div></div>`;
    }).join('');
  }

  function metricTable(aName,bName,a,b){
    const rows=[
      ['إجمالي الإنفاق',a.spend,b.spend,'money'],
      ['عدد المسحوبات',a.count,b.count,'num'],
      ['متوسط قيمة المسحوب',a.avg,b.avg,'money'],
      ['الوسيط',a.median,b.median,'money'],
      ['أعلى قيمة مسحوب',a.max,b.max,'money'],
      ['أقل قيمة مسحوب',a.min,b.min,'money'],
      ['عدد الفواتير',a.invoices,b.invoices,'num'],
      ['عدد المعدات',a.equipment,b.equipment,'num'],
      ['عدد الموردين',a.suppliers,b.suppliers,'num'],
      ['عدد الأنشطة',a.activities,b.activities,'num'],
      ['عدد الأصناف',a.tires,b.tires,'num'],
      ['هويات الكفرات',a.tireIds,b.tireIds,'num']
    ];
    const fmt=(x,t)=>t==='money'?moneyN(x)+' SAR':numberN(x);
    return `<div class="compare-table-wrap"><table class="compare-table"><thead>
      <tr><th>المؤشر</th><th>${esc(aName)}</th><th>${esc(bName)}</th><th>الفرق</th><th>نسبة الفرق</th></tr>
      </thead><tbody>${rows.map(([label,av,bv,t])=>{
        const d=av-bv,p=pctDelta(av,bv),cls=d>0?'delta-pos':d<0?'delta-neg':'';
        return `<tr><td>${label}</td><td>${fmt(av,t)}</td><td>${fmt(bv,t)}</td><td class="${cls}">${d>0?'+':''}${fmt(d,t)}</td><td class="${cls}">${p>0?'+':''}${p.toFixed(1)}%</td></tr>`;
      }).join('')}</tbody></table></div>`;
  }

  function driverRows(drivers){
    if(!drivers.length)return '<div class="compare-empty">لا توجد فروق جوهرية بين الأبعاد.</div>';
    return `<div class="compare-table-wrap">
      <table class="compare-table compare-drivers-table">
        <thead>
          <tr>
            <th>البعد</th>
            <th>العنصر</th>
            <th>المقارنة الأولى</th>
            <th>المقارنة الثانية</th>
            <th>الفرق</th>
            <th>الاتجاه</th>
          </tr>
        </thead>
        <tbody>
          ${drivers.map(x=>`
            <tr>
              <td>${esc(x.label)}</td>
              <td>${esc(x.key)}</td>
              <td>${moneyN(x.a)} SAR</td>
              <td>${moneyN(x.b)} SAR</td>
              <td class="${x.diff>0?'delta-pos':'delta-neg'}">${x.diff>0?'+':''}${moneyN(x.diff)} SAR</td>
              <td>${x.diff>0?'لصالح الأول':'لصالح الثاني'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }

  function commonalityBox(title,field,aRows,bRows){
    const x=commonality(aRows,bRows,field);
    const maxRows=Math.max(x.common.length,x.onlyA.length,x.onlyB.length,1);
    const rows=Array.from({length:maxRows},(_,i)=>`
      <tr>
        <td>${esc(x.common[i]||'')}</td>
        <td>${esc(x.onlyA[i]||'')}</td>
        <td>${esc(x.onlyB[i]||'')}</td>
      </tr>`).join('');
    return `<div class="compare-detail-box">
      <h4>${title}</h4>
      <div class="compare-table-wrap">
        <table class="compare-table compare-common-table">
          <thead>
            <tr>
              <th>مشترك</th>
              <th>فقط المقارنة الأولى</th>
              <th>فقط المقارنة الثانية</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td>${x.common.length} عنصر</td>
              <td>${x.onlyA.length} عنصر</td>
              <td>${x.onlyB.length} عنصر</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>`;
  }

  function recordsTable(title,rows){
    const sorted=[...rows].sort((a,b)=>(Number(b.price)||0)-(Number(a.price)||0)).slice(0,20);
    return `<div class="compare-detail-box"><h4>${esc(title)} — أعلى 20 سجل</h4>
      <div class="compare-records"><table><thead><tr>
        <th>التاريخ</th><th>الفاتورة</th><th>المعدة</th><th>المورد</th><th>النشاط</th><th>الصنف</th><th>القيمة</th>
      </tr></thead><tbody>${sorted.map(r=>`<tr>
        <td>${esc(r.date||'—')}</td><td>${esc(r.invoice||'—')}</td><td>${esc(r.plate||'—')}</td>
        <td>${esc(r.supplier||'—')}</td><td>${esc(r.activity||'—')}</td><td>${esc(r.tire_type||'—')}</td>
        <td>${moneyN(r.price)} SAR</td>
      </tr>`).join('')||'<tr><td colspan="7">لا توجد سجلات</td></tr>'}</tbody></table></div>
    </div>`;
  }

  function verdict(aName,bName,a,b,drivers,score){
    const spendDir=a.spend>b.spend?'أعلى':a.spend<b.spend?'أقل':'مساوٍ';
    const countDir=a.count>b.count?'أكثر':a.count<b.count?'أقل':'مساوٍ';
    const top=drivers[0];
    let text=`إجمالي الإنفاق في «${aName}» ${spendDir} من «${bName}» بنسبة ${Math.abs(score.spend).toFixed(1)}%، وعدد المسحوبات ${countDir} بنسبة ${Math.abs(score.count).toFixed(1)}%.`;
    if(top)text+=` أكبر محرك للفارق هو ${top.label} «${top.key}» بفارق ${moneyN(Math.abs(top.diff))} SAR ${top.diff>0?'لصالح المقارنة الأولى':'لصالح المقارنة الثانية'}.`;
    if(a.avg>b.avg*1.2)text+=' كما أن متوسط قيمة العملية في المقارنة الأولى أعلى بشكل ملحوظ.';
    else if(b.avg>a.avg*1.2)text+=' كما أن متوسط قيمة العملية في المقارنة الثانية أعلى بشكل ملحوظ.';
    text+=` درجة التشابه التشغيلية بين الطرفين ${score.similarity.toFixed(0)}%.`;
    return text;
  }


  function renderWaitingState(){
    const result=document.getElementById('compareResult');
    if(!result)return;
    const type=typeEl()?.value||'period';
    const [la,lb]=labelsFor(type);
    result.innerHTML=`
      <div class="compare-welcome">
        <div class="compare-welcome-icon">⇄</div>
        <h3>اختر طرفي المقارنة</h3>
        <p>ابدأ باختيار <b>${esc(la)}</b> ثم <b>${esc(lb)}</b>. لن يتم اختيار أي طرف تلقائيًا.</p>
        <div class="compare-welcome-steps">
          <span>1</span><b>${esc(la)}</b>
          <span>2</span><b>${esc(lb)}</b>
          <span>3</span><b>تظهر المقارنة تلقائيًا</b>
        </div>
      </div>`;
  }

  let runTimer=null;
  function scheduleRun(){
    clearTimeout(runTimer);
    runTimer=setTimeout(runComparison,80);
  }

  function runComparison(){
    const result=document.getElementById('compareResult');
    const type=typeEl()?.value||'period',av=aEl()?.value||'',bv=bEl()?.value||'';
    if(!result)return;
    if(!av||!bv){
      renderWaitingState();
      return;
    }
    if(av===bv){
      result.innerHTML='<div class="compare-empty">اختر عنصرين مختلفين. تتحدث المقارنة تلقائيًا بمجرد التغيير.</div>';
      return;
    }

    const rows=baseRows(),ar=selectRows(type,av,rows),br=selectRows(type,bv,rows),opts=optionsFor(type);
    const label=v=>opts.find(o=>o.value===v)?.label||v,aName=label(av),bName=label(bv);
    const a=aggregate(ar),b=aggregate(br),score=comparisonScore(a,b),drivers=dimensionDrivers(ar,br);
    const similarityClass=score.similarity>=75?'good':score.similarity>=45?'warn':'bad';

    result.innerHTML=`
      <div class="compare-section-title"><b>النتيجة الرئيسية</b><small>ملخص مباشر بين الطرفين</small></div>
      <div class="compare-table-wrap">
        <table class="compare-table compare-main-table">
          <thead>
            <tr>
              <th>المؤشر</th>
              <th>${esc(aName)}</th>
              <th>${esc(bName)}</th>
              <th>الفرق</th>
              <th>النسبة</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>إجمالي الإنفاق</td>
              <td>${moneyN(a.spend)} SAR</td>
              <td>${moneyN(b.spend)} SAR</td>
              <td class="${a.spend-b.spend>0?'delta-pos':a.spend-b.spend<0?'delta-neg':''}">${a.spend-b.spend>0?'+':''}${moneyN(a.spend-b.spend)} SAR</td>
              <td class="${score.spend>0?'delta-pos':score.spend<0?'delta-neg':''}">${score.spend>0?'+':''}${score.spend.toFixed(1)}%</td>
            </tr>
            <tr>
              <td>عدد المسحوبات</td>
              <td>${a.count}</td>
              <td>${b.count}</td>
              <td class="${a.count-b.count>0?'delta-pos':a.count-b.count<0?'delta-neg':''}">${a.count-b.count>0?'+':''}${a.count-b.count}</td>
              <td class="${score.count>0?'delta-pos':score.count<0?'delta-neg':''}">${score.count>0?'+':''}${score.count.toFixed(1)}%</td>
            </tr>
            <tr>
              <td>متوسط العملية</td>
              <td>${moneyN(a.avg)} SAR</td>
              <td>${moneyN(b.avg)} SAR</td>
              <td class="${a.avg-b.avg>0?'delta-pos':a.avg-b.avg<0?'delta-neg':''}">${a.avg-b.avg>0?'+':''}${moneyN(a.avg-b.avg)} SAR</td>
              <td>${pctDelta(a.avg,b.avg)>0?'+':''}${pctDelta(a.avg,b.avg).toFixed(1)}%</td>
            </tr>
            <tr>
              <td>درجة التشابه التشغيلية</td>
              <td colspan="2"><div class="compare-score ${similarityClass}">${score.similarity.toFixed(0)}%</div></td>
              <td colspan="2">تشابه الإنفاق والحجم ومتوسط العمليات</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="compare-section-title"><b>الملخص التفصيلي</b><small>عرض منظم للمؤشرات الرئيسية</small></div>
      <div class="compare-table-wrap">
        <table class="compare-table compare-summary-table">
          <thead>
            <tr>
              <th>المؤشر</th>
              <th>${esc(aName)}</th>
              <th>${esc(bName)}</th>
              <th>الفرق</th>
              <th>الملاحظة</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>متوسط قيمة العملية</td>
              <td>${moneyN(a.avg)} SAR</td>
              <td>${moneyN(b.avg)} SAR</td>
              <td class="${a.avg-b.avg>0?'delta-pos':a.avg-b.avg<0?'delta-neg':''}">${a.avg-b.avg>0?'+':''}${moneyN(a.avg-b.avg)} SAR</td>
              <td>${Math.abs(pctDelta(a.avg,b.avg)).toFixed(1)}%</td>
            </tr>
            <tr>
              <td>الوسيط</td>
              <td>${moneyN(a.median)} SAR</td>
              <td>${moneyN(b.median)} SAR</td>
              <td class="${a.median-b.median>0?'delta-pos':a.median-b.median<0?'delta-neg':''}">${a.median-b.median>0?'+':''}${moneyN(a.median-b.median)} SAR</td>
              <td>يعكس القيمة الوسطية للعمليات</td>
            </tr>
            <tr>
              <td>عدد المعدات</td>
              <td>${a.equipment}</td>
              <td>${b.equipment}</td>
              <td>${a.equipment-b.equipment>0?'+':''}${a.equipment-b.equipment}</td>
              <td>تنوع المعدات داخل كل طرف</td>
            </tr>
            <tr>
              <td>عدد الموردين</td>
              <td>${a.suppliers}</td>
              <td>${b.suppliers}</td>
              <td>${a.suppliers-b.suppliers>0?'+':''}${a.suppliers-b.suppliers}</td>
              <td>تنوع الموردين</td>
            </tr>
            <tr>
              <td>عدد الفواتير</td>
              <td>${a.invoices}</td>
              <td>${b.invoices}</td>
              <td>${a.invoices-b.invoices>0?'+':''}${a.invoices-b.invoices}</td>
              <td>عدد الفواتير المرتبطة</td>
            </tr>
            <tr>
              <td>عدد الأصناف</td>
              <td>${a.tires}</td>
              <td>${b.tires}</td>
              <td>${a.tires-b.tires>0?'+':''}${a.tires-b.tires}</td>
              <td>تنوع الأصناف/المقاسات</td>
            </tr>
            <tr>
              <td>النطاق الزمني</td>
              <td>${a.firstDate?a.firstDate.toLocaleDateString('ar-EG'):'—'} → ${a.lastDate?a.lastDate.toLocaleDateString('ar-EG'):'—'}</td>
              <td>${b.firstDate?b.firstDate.toLocaleDateString('ar-EG'):'—'} → ${b.lastDate?b.lastDate.toLocaleDateString('ar-EG'):'—'}</td>
              <td>—</td>
              <td>الفترة الفعلية للسجلات</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="compare-verdict"><b>الخلاصة التنفيذية:</b> ${esc(verdict(aName,bName,a,b,drivers,score))}</div>

      <div class="compare-section-title"><b>المؤشرات التفصيلية</b><small>القيمة، الحجم، المتوسط، التنوع</small></div>
      ${metricTable(aName,bName,a,b)}

      <div class="compare-section-title"><b>أكبر محركات الفارق</b><small>مرتبة حسب أكبر فرق بالقيمة</small></div>
      ${driverRows(drivers)}

      <div class="compare-section-title"><b>التداخل والاختلاف بين الطرفين</b><small>ما هو مشترك وما هو خاص بكل طرف</small></div>
      <div class="compare-detail-grid">
        ${commonalityBox('المعدات المشتركة والمختلفة','plate',ar,br)}
        ${commonalityBox('الموردون المشتركون والمختلفون','supplier',ar,br)}
        ${commonalityBox('الأنشطة المشتركة والمختلفة','activity',ar,br)}
        ${commonalityBox('الأصناف المشتركة والمختلفة','tire_type',ar,br)}
      </div>

      <div class="compare-section-title"><b>التوزيع التفصيلي</b><small>الأول بالبنفسجي • الثاني بالأخضر</small></div>
      <div class="compare-grid">${renderTopBars(aName,bName,ar,br)}</div>

      <div class="compare-section-title"><b>السجلات الأعلى قيمة</b><small>للتدقيق المباشر في مصادر الفرق</small></div>
      <div class="compare-detail-grid">
        ${recordsTable(aName,ar)}
        ${recordsTable(bName,br)}
      </div>

      <div class="compare-actions">
        <button type="button" class="btn" id="compareOpenFirst">فتح التقرير الأول</button>
        <button type="button" class="btn" id="compareOpenSecond">فتح التقرير الثاني</button>
        <button type="button" class="btn gold" id="comparePrint">طباعة المقارنة</button>
      </div>
    `;

    document.getElementById('compareOpenFirst')?.addEventListener('click',()=>openTarget(type,av));
    document.getElementById('compareOpenSecond')?.addEventListener('click',()=>openTarget(type,bv));
    document.getElementById('comparePrint')?.addEventListener('click',()=>printComparison(aName,bName,result.innerHTML));
  }

  function openTarget(type,value){
    const target=REPORT_MAP[type]||'home';
    if(type!=='period'){
      const fieldId={equipment:'equipment',supplier:'supplier',invoice:'invoice',activity:'activity',tire:'tire'}[type];
      const el=document.getElementById(fieldId);
      if(el){
        el.value=value;
        el.dispatchEvent(new Event('change',{bubbles:true}));
        el.dispatchEvent(new Event('input',{bubbles:true}));
      }
    }
    close();
    if(typeof window.openReportView==='function')window.openReportView(target);
    else document.querySelector(`[data-report-target="${cssEscape(target)}"]`)?.click();
  }

  function printComparison(aName,bName,bodyHtml){
    const w=window.open('','_blank','width=1200,height=900');
    if(!w)return;
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>مقارنة ${esc(aName)} و ${esc(bName)}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#111;padding:16px;font-size:10px}h1{font-size:20px}
        .compare-kpis,.compare-deep-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
        .compare-kpi,.compare-deep-card,.compare-detail-box,.compare-card,.compare-verdict{border:1px solid #aaa;padding:7px;margin-bottom:6px}
        .compare-kpi span,.compare-kpi small,.compare-deep-card span,.compare-deep-card small{display:block;font-size:8px;color:#555}
        .compare-kpi b,.compare-deep-card b{font-size:12px}.compare-grid,.compare-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
        table{width:100%;border-collapse:collapse;font-size:8px}th,td{border:1px solid #bbb;padding:4px}
        .compare-driver-row{display:grid;grid-template-columns:80px 1fr 70px 70px 70px;gap:5px;border-bottom:1px solid #ddd;padding:4px}
        .compare-bar-row{display:grid;grid-template-columns:90px 1fr 65px;gap:4px}.compare-bar-track{height:10px;background:#eee}.compare-bar-fill{height:100%;background:#777}.compare-bar-fill.alt{background:#aaa}
        .compare-actions{display:none}.compare-chip{display:inline-block;border:1px solid #bbb;padding:2px 4px;margin:2px}
        .compare-records{max-height:none!important;overflow:visible!important}.compare-records table{font-size:7px}
        @page{size:A4 landscape;margin:7mm}
      </style><style id="comparisonVisualRefinement">

/* ===== COMPARISON CENTER — CLEAR, CALM, INDEPENDENT ===== */
.compare-dialog{
  inset:5vh 6vw!important;
  max-width:1420px!important;
  margin:auto!important;
  background:linear-gradient(180deg,#152630,#111e27)!important;
  border:1px solid #385362!important;
  border-radius:20px!important;
  box-shadow:0 30px 80px rgba(0,0,0,.46)!important;
  padding:18px!important;
}
.compare-head{
  padding:2px 2px 15px!important;
  border-bottom:1px solid #314957!important;
}
.compare-eyebrow{
  color:#a991df!important;
  font-size:9px!important;
  letter-spacing:.2px!important;
}
.compare-head h2{
  font-size:22px!important;
  margin-top:2px!important;
}
.compare-head p{
  max-width:820px!important;
  font-size:10px!important;
  color:#91a4af!important;
}
.compare-toolbar{
  grid-template-columns:1.05fr 1fr 1fr!important;
  gap:12px!important;
  margin-top:14px!important;
  padding:14px!important;
  background:#101e27!important;
  border:1px solid #334d5b!important;
  border-radius:14px!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.02)!important;
}
.compare-toolbar label>span{
  margin-bottom:6px!important;
  font-size:9.5px!important;
  color:#b7c5cd!important;
}
.compare-toolbar select{
  height:46px!important;
  background:#0b171f!important;
  color:#edf4f7!important;
  border:1px solid #3b5665!important;
  border-radius:10px!important;
  padding:0 11px!important;
  font:800 10px Cairo!important;
}
.compare-toolbar select:focus{
  border-color:#806ab2!important;
  box-shadow:0 0 0 3px rgba(128,106,178,.14)!important;
}
.compare-result{
  margin-top:14px!important;
}
.compare-welcome{
  min-height:310px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:7px;
  text-align:center;
  border:1px dashed #425b6a;
  border-radius:15px;
  background:
    radial-gradient(circle at 50% 20%,rgba(128,106,178,.09),transparent 34%),
    #0f1c25;
  padding:28px;
}
.compare-welcome-icon{
  width:58px;height:58px;border-radius:16px;
  display:flex;align-items:center;justify-content:center;
  background:linear-gradient(180deg,#735fa7,#584682);
  color:#fff;font:900 28px Arial;
  box-shadow:0 10px 24px rgba(75,55,120,.25);
}
.compare-welcome h3{
  margin:4px 0 0;
  color:#edf4f7;
  font:900 17px Cairo;
}
.compare-welcome p{
  margin:0;
  max-width:600px;
  color:#8fa2ad;
  font-size:9.5px;
  line-height:1.7;
}
.compare-welcome p b{color:#cbbce9}
.compare-welcome-steps{
  display:grid;
  grid-template-columns:auto auto auto auto auto auto;
  align-items:center;
  gap:7px;
  margin-top:9px;
  padding:8px 10px;
  border:1px solid #324a58;
  border-radius:10px;
  background:#11212a;
}
.compare-welcome-steps span{
  width:22px;height:22px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  background:#6b58a0;color:#fff;
  font:900 9px Arial;
}
.compare-welcome-steps b{
  color:#adbec7;
  font:800 8.5px Cairo;
}
.compare-kpis{
  grid-template-columns:repeat(5,minmax(0,1fr))!important;
  gap:10px!important;
}
.compare-kpi{
  min-height:112px!important;
  padding:12px 13px!important;
  border-radius:12px!important;
  background:linear-gradient(180deg,#142731,#10202a)!important;
  border:1px solid #334e5c!important;
  box-shadow:0 6px 18px rgba(0,0,0,.08)!important;
}
.compare-kpi span{font-size:8.7px!important}
.compare-kpi b{font-size:17px!important}
.compare-section-title{
  margin:16px 0 8px!important;
  padding-bottom:6px;
  border-bottom:1px solid #2f4653;
}
.compare-table-wrap,.compare-records{
  border-color:#324b59!important;
  background:#0f1d26!important;
}
.compare-table th,.compare-records th{
  background:#1b303c!important;
  color:#e3edf1!important;
}
.compare-table td,.compare-records td{
  border-color:#2b424f!important;
}
.compare-driver-row{
  padding:8px 9px!important;
  border-radius:9px!important;
}
.compare-detail-box,.compare-card,.compare-deep-card{
  border-radius:12px!important;
  background:linear-gradient(180deg,#13252f,#102029)!important;
}
.compare-verdict{
  padding:13px 15px!important;
  border-right:4px solid #806ab2!important;
  background:rgba(128,106,178,.08)!important;
  line-height:1.85!important;
}
.compare-actions{
  position:sticky;
  bottom:0;
  z-index:5;
  padding:10px 0 2px;
  margin-top:14px!important;
  background:linear-gradient(180deg,transparent,#111e27 30%);
}
html[data-theme="light"] .compare-welcome{
  background:#f8fbfc!important;
  border-color:#cad8df!important;
}
html[data-theme="light"] .compare-welcome h3{color:#17394c!important}
html[data-theme="light"] .compare-welcome p,
html[data-theme="light"] .compare-welcome-steps b{color:#647a87!important}
@media(max-width:1100px){
  .compare-dialog{inset:3vh 3vw!important}
  .compare-toolbar{grid-template-columns:1fr 1fr!important}
}
@media(max-width:700px){
  .compare-toolbar{grid-template-columns:1fr!important}
  .compare-welcome-steps{grid-template-columns:auto 1fr}
  .compare-kpis{grid-template-columns:1fr 1fr!important}
}
@media(max-width:460px){
  .compare-kpis{grid-template-columns:1fr!important}
}

</style>
<style id="comparisonTableLayoutFix">

/* ===== COMPARISON TABLE-BASED LAYOUT ===== */
.compare-result{
  display:block!important;
  overflow:visible!important;
}
.compare-section-title{
  margin-top:18px!important;
  margin-bottom:8px!important;
  padding:8px 10px!important;
  background:#132630!important;
  border:1px solid #314b59!important;
  border-radius:9px!important;
}
.compare-table-wrap{
  width:100%!important;
  overflow:auto!important;
  border:1px solid #324b59!important;
  border-radius:11px!important;
  background:#0f1d25!important;
  margin-bottom:12px!important;
}
.compare-table{
  width:100%!important;
  min-width:760px!important;
  table-layout:auto!important;
  border-collapse:separate!important;
  border-spacing:0!important;
  font-size:9px!important;
  direction:rtl!important;
}
.compare-table th{
  position:sticky!important;
  top:0!important;
  z-index:2!important;
  padding:9px 10px!important;
  background:#1b303c!important;
  color:#edf4f7!important;
  font:900 9px Cairo!important;
  text-align:center!important;
  white-space:nowrap!important;
  border-bottom:1px solid #3b5665!important;
}
.compare-table td{
  padding:8px 10px!important;
  color:#cbd7dd!important;
  text-align:center!important;
  vertical-align:middle!important;
  border-bottom:1px solid #293f4c!important;
  border-left:1px solid #243944!important;
  white-space:normal!important;
  line-height:1.55!important;
}
.compare-table tbody tr:nth-child(even) td{background:rgba(255,255,255,.018)!important}
.compare-table tbody tr:hover td{background:#172b36!important}
.compare-table td:first-child{
  font-weight:900!important;
  color:#e4edf1!important;
  text-align:right!important;
}
.compare-table tfoot td{
  background:#132630!important;
  color:#91a7b3!important;
  font-weight:900!important;
}
.compare-main-table td:nth-child(2),
.compare-main-table td:nth-child(3),
.compare-main-table td:nth-child(4),
.compare-main-table td:nth-child(5),
.compare-summary-table td:nth-child(2),
.compare-summary-table td:nth-child(3),
.compare-summary-table td:nth-child(4){
  font-family:'IBM Plex Mono',monospace!important;
}
.compare-drivers-table td:nth-child(3),
.compare-drivers-table td:nth-child(4),
.compare-drivers-table td:nth-child(5){
  font-family:'IBM Plex Mono',monospace!important;
}
.compare-detail-grid{
  align-items:start!important;
}
.compare-detail-box{
  overflow:hidden!important;
  padding:10px!important;
}
.compare-detail-box .compare-table{
  min-width:520px!important;
}
.compare-score{
  margin:0 auto!important;
  width:52px!important;
  height:52px!important;
  font-size:12px!important;
}
.compare-verdict{
  margin:14px 0!important;
}
html[data-theme="light"] .compare-section-title,
html[data-theme="light"] .compare-table-wrap,
html[data-theme="light"] .compare-table th,
html[data-theme="light"] .compare-table tfoot td{
  background:#f6fafc!important;
  border-color:#d5e0e6!important;
  color:#1f3b4d!important;
}
html[data-theme="light"] .compare-table td{
  color:#405866!important;
  border-color:#e1e8ec!important;
}
html[data-theme="light"] .compare-table tbody tr:nth-child(even) td{
  background:#fbfdfe!important;
}
@media(max-width:700px){
  .compare-table{min-width:680px!important;font-size:8px!important}
  .compare-table th,.compare-table td{padding:7px!important}
}

</style>
<style id="launcherOrderFourthFinal">

/* ===== DEFINITIVE LAUNCHER ORDER: COMPARISONS IS FOURTH ===== */
#uiLauncherStack{
  display:flex!important;
  flex-direction:column!important;
}
#uiLauncherStack > #reportSidebarToggle{order:1!important}
#uiLauncherStack > #filterSidebarToggle{order:2!important}
#uiLauncherStack > #userAdminOpen{order:3!important}
#uiLauncherStack > #comparisonsOpen{order:4!important}
#uiLauncherStack > #egoLogoutBtn{order:5!important}

#uiLauncherStack > #comparisonsOpen{
  position:static!important;
  inset:auto!important;
  top:auto!important;
  right:auto!important;
  bottom:auto!important;
  left:auto!important;
  transform:none!important;
  margin:0!important;
  flex-shrink:0!important;
}

</style>
<style id="fastDashboardPerformanceStyles">

/* ===== FAST DASHBOARD FIRST PAINT ===== */
body.nav-home .executive-home,
body.nav-home .report-home,
body.nav-home .decision-center{
  content-visibility:auto;
  contain-intrinsic-size:auto 300px;
}
#executiveKpis:empty,#operationalTrendGrid:empty,#decisionPriorityList:empty{min-height:48px}

</style>
<style id="definitiveFastHomeStyles">

/* ===== DEFINITIVE FAST HOME ===== */
#executiveKpis,
#reportHome .report-home-grid,
#decisionCenter,
#executiveInsights{
  animation:none!important;
  transition:none!important;
}
body.nav-home #reportHome,
body.nav-home .executive-home,
body.nav-home .decision-center{
  content-visibility:visible!important;
  contain:none!important;
}
.home-mini-empty,.decision-empty{
  min-height:36px!important;
}

</style>
<style id="liveDataForecastStyles">

/* ===== LIVE DATA STATUS / FORECAST ===== */
.forecast-status{
  display:flex!important;
  flex-direction:column!important;
  align-items:center!important;
  justify-content:center!important;
  gap:1px!important;
  line-height:1.2!important;
}
.forecast-date{
  display:block!important;
  margin-top:2px!important;
  color:inherit!important;
  opacity:.78!important;
  font-size:6.5px!important;
  font-weight:700!important;
  white-space:nowrap!important;
}
#stockForecastList .forecast-row{
  grid-template-columns:minmax(180px,1fr) 86px 105px!important;
}
.live-data-indicator{
  display:inline-flex;align-items:center;gap:5px;
  font-size:7px;color:#88a0ad
}
.live-data-indicator::before{
  content:"";width:6px;height:6px;border-radius:50%;background:#55b389;
  box-shadow:0 0 0 3px rgba(85,179,137,.10)
}
@media(max-width:650px){
  #stockForecastList .forecast-row{grid-template-columns:1fr auto!important}
  #stockForecastList .forecast-status{grid-column:2!important}
}

</style>
<style id="tireLifecycleStyles">

/* ===== TIRE LIFECYCLE REPORT ===== */
.tire-life-report{
  background:linear-gradient(180deg,#152630,#12212a);
  border:1px solid #344d5b;
  border-radius:15px;
  padding:14px;
}
.tire-life-toolbar{
  display:grid;
  grid-template-columns:minmax(220px,.8fr) minmax(280px,1.2fr) auto;
  gap:9px;
  align-items:end;
  margin-bottom:12px;
  padding:11px;
  border:1px solid #334c5a;
  border-radius:11px;
  background:#10202a;
}
.tire-life-toolbar label>span,
.tire-life-quick-search>span{
  display:block;margin-bottom:5px;color:#9eb0ba;font-size:9px;font-weight:900
}
.tire-life-toolbar select,.tire-life-toolbar input{
  width:100%;height:42px;padding:0 10px;border:1px solid #3a5362;border-radius:9px;
  background:#0c171f;color:#eef4f7;font:800 10px Cairo
}
.tire-life-empty{
  min-height:330px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;
  border:1px dashed #3d5664;border-radius:13px;background:#101e27;text-align:center;padding:24px
}
.tire-life-empty-icon{
  width:58px;height:58px;border-radius:16px;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(180deg,#158a89,#0e6668);color:#fff;font:900 28px Arial
}
.tire-life-empty h3{margin:3px 0 0;color:#eff6f8;font:900 16px Cairo}
.tire-life-empty p{max-width:680px;margin:0;color:#8398a4;font-size:9.5px;line-height:1.7}

.tire-life-content{display:block}
.tire-life-hero{
  display:flex;align-items:center;justify-content:space-between;gap:15px;
  padding:14px 16px;border:1px solid #365261;border-radius:13px;
  background:radial-gradient(circle at 100% 0%,rgba(14,165,164,.13),transparent 38%),#11232d
}
.tire-life-identity span{display:block;color:#7f96a3;font-size:8.5px;font-weight:900}
.tire-life-identity strong{display:block;margin-top:2px;color:#f3f8fa;font:900 24px 'IBM Plex Mono',Cairo}
.tire-life-identity small{display:block;margin-top:2px;color:#9bb0bb;font-size:9px}
.tire-life-status-wrap{text-align:left}
.tire-life-status{
  display:inline-flex;align-items:center;justify-content:center;min-width:86px;
  padding:6px 10px;border-radius:999px;border:1px solid #44616f;background:#162b35;
  color:#dfe9ee;font:900 9px Cairo
}
.tire-life-status.installed{background:#17352b;border-color:#396a53;color:#b9e6c9}
.tire-life-status.removed{background:#3a2426;border-color:#75464b;color:#f0b7ba}
.tire-life-status.unknown{background:#332f23;border-color:#6e633f;color:#ead7a3}
.tire-life-status-wrap small{display:block;margin-top:4px;color:#7f929d;font-size:8px}

.tire-life-kpis{
  display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin:10px 0
}
.tire-life-kpi{
  min-height:86px;padding:10px;border:1px solid #324b59;border-radius:10px;background:#10212a
}
.tire-life-kpi span{display:block;color:#8196a2;font-size:8px;font-weight:800}
.tire-life-kpi b{display:block;margin-top:4px;color:#edf5f8;font:900 15px Cairo}
.tire-life-kpi small{display:block;margin-top:2px;color:#708590;font-size:7.5px;line-height:1.45}

.tire-life-grid{display:grid;grid-template-columns:1.25fr .75fr;gap:10px;margin-top:10px}
.tire-life-panel{
  min-width:0;padding:11px;border:1px solid #324b59;border-radius:12px;background:#10212a
}
.tire-life-panel-head{
  display:flex;align-items:flex-start;justify-content:space-between;gap:10px;
  padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid #2d4451
}
.tire-life-panel-head b{display:block;color:#e5eef2;font:900 10.5px Cairo}
.tire-life-panel-head small{display:block;margin-top:2px;color:#778c98;font-size:8px}
.tire-life-panel-head>span{color:#8ca1ac;font:800 8px Cairo}

.tire-life-timeline{position:relative;display:grid;gap:0;padding-right:20px}
.tire-life-timeline::before{
  content:"";position:absolute;right:6px;top:8px;bottom:8px;width:2px;background:#2e4c58
}
.tire-life-event{position:relative;padding:0 10px 12px 0}
.tire-life-event:last-child{padding-bottom:0}
.tire-life-event::before{
  content:"";position:absolute;right:-18px;top:7px;width:10px;height:10px;border-radius:50%;
  background:#4f8e9f;border:2px solid #10212a;box-shadow:0 0 0 2px #31515d
}
.tire-life-event.install::before{background:#54a77a;box-shadow:0 0 0 2px #315f49}
.tire-life-event.remove::before{background:#c4676c;box-shadow:0 0 0 2px #704047}
.tire-life-event-card{
  display:grid;grid-template-columns:95px minmax(0,1fr) auto;gap:9px;align-items:start;
  padding:9px;border:1px solid #2e4754;border-radius:9px;background:#0e1e27
}
.tire-life-event-date{color:#9eb2bc;font:900 8px 'IBM Plex Mono'}
.tire-life-event-main b{display:block;color:#e9f1f4;font:900 9.5px Cairo}
.tire-life-event-main small{display:block;margin-top:2px;color:#788d98;font-size:7.8px;line-height:1.5}
.tire-life-event-duration{
  padding:4px 6px;border-radius:999px;background:#172e39;color:#9eb6c1;font:800 7px Cairo;white-space:nowrap
}

.tire-life-route{display:grid;gap:7px}
.tire-life-route-row{
  display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:8px;align-items:center;
  padding:8px;border:1px solid #2d4552;border-radius:9px;background:#0e1e27
}
.tire-life-route-index{
  width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;
  background:#17333d;color:#8fc7d1;font:900 9px Arial
}
.tire-life-route-row b{display:block;color:#e6eef2;font:900 9px Cairo}
.tire-life-route-row small{display:block;color:#788c98;font-size:7.5px;margin-top:1px}
.tire-life-route-row>span{color:#8fa5b0;font-size:7.5px;white-space:nowrap}

.tire-life-table-panel{margin-top:10px}
.tire-life-table-wrap{overflow:auto;border:1px solid #2f4855;border-radius:9px}
.tire-life-table{width:100%;min-width:1250px;border-collapse:collapse;font-size:8.5px}
.tire-life-table th{
  position:sticky;top:0;z-index:2;padding:8px;background:#1b303b;color:#e5eef2;
  font:900 8px Cairo;white-space:nowrap;border-bottom:1px solid #3a5361;text-align:center
}
.tire-life-table td{
  padding:7px;border-bottom:1px solid #293f4b;border-left:1px solid #243843;
  color:#c6d2d8;text-align:center;vertical-align:middle
}
.tire-life-table tbody tr:nth-child(even) td{background:rgba(255,255,255,.015)}
.tire-life-table tbody tr:hover td{background:#162b35}
.life-action-pill{
  display:inline-flex;padding:3px 6px;border-radius:999px;border:1px solid #3a5462;background:#152b35;color:#c8d8df;
  font:900 7.5px Cairo
}
.life-action-pill.install{background:#18362c;border-color:#3f7258;color:#bce9cc}
.life-action-pill.remove{background:#3d2427;border-color:#78474d;color:#f0b7bb}

.tire-life-insights{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.tire-life-insight{
  padding:9px;border:1px solid #2f4855;border-radius:9px;background:#0e1e27;color:#9db0ba;font-size:8px;line-height:1.65
}
.tire-life-insight b{display:block;margin-bottom:2px;color:#e7eff3;font:900 9px Cairo}
.tire-life-insight.warn{border-color:#6d5539;background:rgba(165,112,48,.07)}
.tire-life-insight.good{border-color:#38664f;background:rgba(65,141,97,.06)}

html[data-theme="light"] .tire-life-report,
html[data-theme="light"] .tire-life-toolbar,
html[data-theme="light"] .tire-life-panel,
html[data-theme="light"] .tire-life-kpi,
html[data-theme="light"] .tire-life-hero,
html[data-theme="light"] .tire-life-event-card,
html[data-theme="light"] .tire-life-route-row,
html[data-theme="light"] .tire-life-insight{
  background:#fff!important;border-color:#d6e1e7!important;color:#294453!important
}
html[data-theme="light"] .tire-life-identity strong,
html[data-theme="light"] .tire-life-panel-head b,
html[data-theme="light"] .tire-life-event-main b,
html[data-theme="light"] .tire-life-route-row b,
html[data-theme="light"] .tire-life-insight b{color:#17394b!important}
html[data-theme="light"] .tire-life-table th{background:#edf4f7!important;color:#234253!important}
html[data-theme="light"] .tire-life-table td{color:#435b68!important;border-color:#e0e8ec!important}

@media(max-width:1050px){
  .tire-life-kpis{grid-template-columns:repeat(3,1fr)}
  .tire-life-grid{grid-template-columns:1fr}
}
@media(max-width:720px){
  .tire-life-toolbar{grid-template-columns:1fr}
  .tire-life-kpis{grid-template-columns:1fr 1fr}
  .tire-life-insights{grid-template-columns:1fr}
  .tire-life-event-card{grid-template-columns:82px 1fr}
  .tire-life-event-duration{grid-column:2}
}
@media(max-width:460px){.tire-life-kpis{grid-template-columns:1fr}}
@media print{
  .tire-life-toolbar{display:none!important}
  .tire-life-report{background:#fff!important;color:#000!important;border:0!important;padding:0!important}
  .tire-life-panel,.tire-life-hero,.tire-life-kpi{background:#fff!important;color:#000!important;border-color:#777!important}
  .tire-life-table{min-width:0!important;font-size:6.5pt!important}
}

</style>
<style id="tireLifecycleProfessionalRedesign">

/* ===== TIRE LIFECYCLE — PROFESSIONAL REDESIGN ===== */
.tire-life-report{
  --life-bg:#0f1d25;
  --life-panel:#13242e;
  --life-panel-2:#102029;
  --life-line:#314a58;
  --life-text:#e9f1f4;
  --life-muted:#8296a2;
  --life-accent:#20a6a2;
  --life-accent-2:#5a8fbb;
  --life-good:#53a574;
  --life-warn:#c48a48;
  --life-bad:#c86468;
  padding:18px!important;
  border-radius:18px!important;
  border:1px solid #35505f!important;
  background:
    radial-gradient(circle at 100% 0%,rgba(32,166,162,.10),transparent 34%),
    linear-gradient(180deg,#152832,#12212a)!important;
  box-shadow:0 18px 42px rgba(0,0,0,.14)!important;
}
.tire-life-report>.section-title{
  display:flex!important;
  align-items:flex-start!important;
  justify-content:space-between!important;
  gap:18px!important;
  margin-bottom:14px!important;
  padding:0 2px 11px!important;
  border-bottom:1px solid #304856!important;
}
.tire-life-report>.section-title>span:first-child{
  font:900 18px Cairo!important;
  color:#f3f8fa!important;
}
.tire-life-report>.section-title .hint{
  max-width:520px!important;
  margin:0!important;
  color:#7e929e!important;
  font-size:9px!important;
  line-height:1.7!important;
  text-align:left!important;
}

/* Toolbar */
.tire-life-toolbar{
  grid-template-columns:minmax(240px,.9fr) minmax(320px,1.3fr) auto!important;
  gap:12px!important;
  padding:14px!important;
  margin-bottom:14px!important;
  border-radius:14px!important;
  border:1px solid #334d5b!important;
  background:linear-gradient(180deg,#11232d,#0e1c24)!important;
}
.tire-life-toolbar label,
.tire-life-quick-search{
  min-width:0!important;
}
.tire-life-toolbar label>span,
.tire-life-quick-search>span{
  margin-bottom:6px!important;
  color:#a6b7c0!important;
  font-size:9px!important;
}
.tire-life-toolbar select,
.tire-life-toolbar input{
  height:46px!important;
  border-radius:10px!important;
  border:1px solid #3a5564!important;
  background:#0b161e!important;
  color:#edf4f7!important;
  padding:0 12px!important;
  font:800 10px Cairo!important;
}
.tire-life-toolbar select:focus,
.tire-life-toolbar input:focus{
  border-color:#35b1ac!important;
  box-shadow:0 0 0 3px rgba(53,177,172,.12)!important;
  outline:none!important;
}
#lifeIndependentNoopRemoved{
  min-height:46px!important;
  align-self:end!important;
  border-color:#3f6170!important;
  background:#17313b!important;
  color:#e8f2f6!important;
}

/* Empty state */
.tire-life-empty{
  min-height:360px!important;
  border-radius:16px!important;
  border:1px dashed #3d5867!important;
  background:
    radial-gradient(circle at 50% 22%,rgba(32,166,162,.08),transparent 33%),
    #0f1c24!important;
}
.tire-life-empty-icon{
  width:64px!important;height:64px!important;
  border-radius:18px!important;
  background:linear-gradient(180deg,#1fa4a1,#147371)!important;
  box-shadow:0 12px 28px rgba(20,115,113,.24)!important;
}
.tire-life-empty h3{font-size:17px!important}
.tire-life-empty p{font-size:9.5px!important;max-width:700px!important}

/* Hero */
.tire-life-hero{
  display:grid!important;
  grid-template-columns:1fr auto!important;
  gap:16px!important;
  padding:17px 18px!important;
  border-radius:14px!important;
  background:
    radial-gradient(circle at 100% 0%,rgba(32,166,162,.14),transparent 42%),
    linear-gradient(180deg,#142934,#11222c)!important;
  border:1px solid #385362!important;
}
.tire-life-identity strong{
  font-size:27px!important;
  letter-spacing:.3px!important;
}
.tire-life-identity small{font-size:9.5px!important}
.tire-life-status-wrap{
  min-width:220px!important;
  padding-right:18px!important;
  border-right:1px solid #2f4855!important;
}
.tire-life-status{
  min-width:125px!important;
  padding:7px 11px!important;
  font-size:9px!important;
}

/* KPIs */
.tire-life-kpis{
  grid-template-columns:repeat(6,minmax(0,1fr))!important;
  gap:10px!important;
  margin:12px 0!important;
}
.tire-life-kpi{
  min-height:96px!important;
  padding:12px!important;
  border-radius:12px!important;
  background:linear-gradient(180deg,#13262f,#102029)!important;
  border:1px solid #334d5b!important;
  box-shadow:0 7px 18px rgba(0,0,0,.07)!important;
}
.tire-life-kpi span{font-size:8.5px!important}
.tire-life-kpi b{font-size:16px!important;line-height:1.35!important}
.tire-life-kpi small{font-size:7.8px!important}

/* Main grid */
.tire-life-grid{
  grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr)!important;
  gap:12px!important;
  margin-top:12px!important;
}
.tire-life-panel{
  padding:13px!important;
  border-radius:13px!important;
  background:linear-gradient(180deg,#12242e,#0f1f28)!important;
  border:1px solid #324b59!important;
}
.tire-life-panel-head{
  align-items:center!important;
  padding-bottom:10px!important;
  margin-bottom:10px!important;
}
.tire-life-panel-head b{font-size:11px!important}
.tire-life-panel-head small{font-size:8px!important}

/* Timeline */
.tire-life-timeline{
  padding-right:26px!important;
  gap:0!important;
}
.tire-life-timeline::before{
  right:8px!important;
  width:2px!important;
  background:linear-gradient(180deg,#3b6570,#2d4651)!important;
}
.tire-life-event{padding:0 14px 14px 0!important}
.tire-life-event::before{
  right:-23px!important;
  top:14px!important;
  width:12px!important;height:12px!important;
}
.tire-life-event-card{
  grid-template-columns:110px minmax(0,1fr) 125px!important;
  gap:12px!important;
  padding:11px 12px!important;
  border-radius:10px!important;
  background:#0d1b23!important;
  border:1px solid #2e4653!important;
}
.tire-life-event-card:hover{
  background:#112630!important;
  border-color:#416273!important;
}
.tire-life-event-date{
  font-size:8.5px!important;
  padding-top:2px!important;
}
.tire-life-event-main b{
  font-size:9.7px!important;
  line-height:1.55!important;
}
.tire-life-event-main small{
  font-size:7.8px!important;
  line-height:1.6!important;
}
.tire-life-event-duration{
  justify-self:end!important;
  text-align:center!important;
  min-width:105px!important;
  padding:5px 7px!important;
  border:1px solid #34515f!important;
  background:#142a34!important;
}

/* Route summary */
.tire-life-route{gap:8px!important}
.tire-life-route-row{
  grid-template-columns:34px minmax(0,1fr) auto!important;
  padding:9px 10px!important;
  border-radius:10px!important;
}
.tire-life-route-index{
  width:34px!important;height:34px!important;
  border-radius:9px!important;
  background:#17343d!important;
  font-size:10px!important;
}
.tire-life-route-row b{font-size:9px!important}
.tire-life-route-row small{font-size:7.6px!important}
.tire-life-route-row>span{
  max-width:135px!important;
  white-space:normal!important;
  text-align:left!important;
  line-height:1.45!important;
}

/* Table */
.tire-life-table-panel{margin-top:12px!important}
.tire-life-table-wrap{
  border-radius:11px!important;
  background:#0d1a22!important;
}
.tire-life-table{
  min-width:1380px!important;
  font-size:8px!important;
}
.tire-life-table th{
  padding:9px 8px!important;
  background:#1a303b!important;
  color:#eef5f8!important;
  font-size:8px!important;
}
.tire-life-table td{
  padding:8px!important;
  color:#c7d3d8!important;
  line-height:1.5!important;
}
.tire-life-table td:nth-child(2),
.tire-life-table td:nth-child(9),
.tire-life-table td:nth-child(10){
  font-family:'IBM Plex Mono',monospace!important;
}
.tire-life-table tbody tr:nth-child(even) td{
  background:rgba(255,255,255,.012)!important;
}
.tire-life-table tbody tr:hover td{
  background:#152a34!important;
}
.life-action-pill{
  min-width:70px!important;
  justify-content:center!important;
  padding:4px 7px!important;
}

/* Insights */
.tire-life-insights{
  grid-template-columns:repeat(3,minmax(0,1fr))!important;
  gap:9px!important;
}
.tire-life-insight{
  min-height:92px!important;
  padding:10px 11px!important;
  border-radius:10px!important;
  background:#0d1c24!important;
  border:1px solid #2e4653!important;
  font-size:8.2px!important;
}
.tire-life-insight b{font-size:9.2px!important}
.tire-life-insight.warn{
  border-right:3px solid #c48a48!important;
}
.tire-life-insight.good{
  border-right:3px solid #53a574!important;
}

/* Light */
html[data-theme="light"] .tire-life-report{
  background:#f5f9fb!important;
  border-color:#d2dfe6!important;
}
html[data-theme="light"] .tire-life-toolbar,
html[data-theme="light"] .tire-life-panel,
html[data-theme="light"] .tire-life-kpi,
html[data-theme="light"] .tire-life-hero,
html[data-theme="light"] .tire-life-event-card,
html[data-theme="light"] .tire-life-route-row,
html[data-theme="light"] .tire-life-insight,
html[data-theme="light"] .tire-life-table-wrap{
  background:#fff!important;
  border-color:#d7e2e8!important;
}
html[data-theme="light"] .tire-life-report>.section-title>span:first-child,
html[data-theme="light"] .tire-life-identity strong,
html[data-theme="light"] .tire-life-panel-head b,
html[data-theme="light"] .tire-life-event-main b,
html[data-theme="light"] .tire-life-route-row b,
html[data-theme="light"] .tire-life-insight b{
  color:#18384a!important;
}
html[data-theme="light"] .tire-life-table th{
  background:#eaf2f6!important;
  color:#234353!important;
}

/* Responsive */
@media(max-width:1200px){
  .tire-life-kpis{grid-template-columns:repeat(3,1fr)!important}
  .tire-life-grid{grid-template-columns:1fr!important}
}
@media(max-width:820px){
  .tire-life-toolbar{grid-template-columns:1fr!important}
  .tire-life-hero{grid-template-columns:1fr!important}
  .tire-life-status-wrap{
    min-width:0!important;
    padding-right:0!important;
    padding-top:10px!important;
    border-right:0!important;
    border-top:1px solid #2f4855!important;
    text-align:right!important;
  }
  .tire-life-event-card{grid-template-columns:1fr!important}
  .tire-life-event-duration{justify-self:start!important}
  .tire-life-insights{grid-template-columns:1fr 1fr!important}
}
@media(max-width:560px){
  .tire-life-report{padding:11px!important}
  .tire-life-kpis{grid-template-columns:1fr 1fr!important}
  .tire-life-insights{grid-template-columns:1fr!important}
  .tire-life-report>.section-title{flex-direction:column!important}
  .tire-life-report>.section-title .hint{text-align:right!important}
}

</style>
<style id="tireLifecycleFinalStructuredLayout">

/* ===== TIRE LIFECYCLE FINAL TABLE LAYOUT ===== */
#tireLifecycleReport{
  max-width:none!important;
  overflow:visible!important;
}
#tireLifecycleReport *{box-sizing:border-box}
.life-overview-card{
  margin-bottom:12px;
  border:1px solid #35505e;
  border-radius:14px;
  overflow:hidden;
  background:#10212a;
}
.life-overview-head{
  display:grid;
  grid-template-columns:minmax(0,1fr) 320px;
  align-items:center;
  gap:18px;
  padding:15px 17px;
  background:linear-gradient(135deg,#17313b,#11242d);
  border-bottom:1px solid #334c59;
}
.life-overview-head>div:first-child>span{
  display:block;color:#8298a4;font-size:8.5px;font-weight:900
}
.life-overview-head>div:first-child>strong{
  display:block;margin:2px 0;color:#f4f8fa;font:900 27px 'IBM Plex Mono',Cairo
}
.life-overview-head>div:first-child>small{color:#a4b5be;font-size:9px}
.life-overview-status{
  padding-right:18px;
  border-right:1px solid #36505d;
}
.life-overview-status>small{
  display:block;margin-top:5px;color:#8da0aa;font-size:8px;line-height:1.6
}
.life-overview-table-wrap{overflow:auto}
.life-overview-table{
  width:100%;
  border-collapse:collapse;
  table-layout:fixed;
}
.life-overview-table td{
  width:33.333%;
  padding:12px 14px;
  border-left:1px solid #2d4551;
  border-bottom:1px solid #2d4551;
  vertical-align:top;
}
.life-overview-table tr:last-child td{border-bottom:0}
.life-overview-table td:last-child{border-left:0}
.life-overview-table span{display:block;color:#8195a1;font-size:8px;font-weight:900}
.life-overview-table b{display:block;margin-top:3px;color:#edf4f7;font:900 15px Cairo}
.life-overview-table small{display:block;margin-top:2px;color:#718690;font-size:7.5px;line-height:1.5}

/* Timeline table */
.life-timeline-table{
  overflow:hidden;
  border:1px solid #304957;
  border-radius:10px;
}
.life-timeline-head,
.life-timeline-row{
  display:grid;
  grid-template-columns:42px 105px 150px minmax(190px,1fr) minmax(220px,1.3fr) 120px;
  align-items:stretch;
}
.life-timeline-head{
  background:#1a303b;
  color:#e6eef2;
  font:900 8px Cairo;
}
.life-timeline-head span,
.life-timeline-row>span{
  padding:8px 9px;
  border-left:1px solid #2c4450;
}
.life-timeline-head span:last-child,
.life-timeline-row>span:last-child{border-left:0}
.life-timeline-row{
  background:#0e1d25;
  border-top:1px solid #293f4b;
  color:#c7d3d8;
  font-size:8px;
}
.life-timeline-row:nth-child(odd){background:#10212a}
.life-timeline-row.install{border-right:3px solid #53a574}
.life-timeline-row.remove{border-right:3px solid #c86468}
.life-timeline-row.move{border-right:3px solid #5d8fb0}
.life-timeline-row b{display:block;color:#eaf1f4;font:900 8.8px Cairo}
.life-timeline-row small{display:block;margin-top:2px;color:#718690;font-size:7.2px}
.life-row-index,.life-row-date,.life-row-duration{
  display:flex!important;
  align-items:center;
  justify-content:center;
  text-align:center;
}
.life-row-date,.life-row-duration{font-family:'IBM Plex Mono',monospace}
.life-row-details{line-height:1.65;color:#93a6b0!important}

/* Generic structured tables */
.life-simple-table-wrap{
  width:100%;
  overflow:auto;
  border:1px solid #304957;
  border-radius:10px;
}
.life-simple-table{
  width:100%;
  min-width:700px;
  border-collapse:collapse;
  font-size:8px;
}
.life-simple-table th{
  padding:8px 9px;
  background:#1a303b;
  color:#e7eff3;
  font:900 8px Cairo;
  text-align:center;
  white-space:nowrap;
}
.life-simple-table td{
  padding:8px 9px;
  border-top:1px solid #293f4b;
  border-left:1px solid #293f4b;
  color:#c7d3d8;
  text-align:center;
  line-height:1.55;
}
.life-simple-table td:last-child{border-left:0}
.life-simple-table tbody tr:nth-child(even) td{background:rgba(255,255,255,.014)}
.life-simple-table tbody tr:hover td{background:#152a34}
.life-analysis-table{min-width:640px}
.life-analysis-table td:first-child{text-align:right;color:#e5edf1}
.life-analysis-table td:nth-child(2){font-weight:900;color:#dfe9ee}

/* Panels and spacing */
.tire-life-grid{
  grid-template-columns:minmax(0,1.45fr) minmax(360px,.55fr)!important;
  align-items:start!important;
}
.tire-life-panel{
  overflow:hidden!important;
}
.tire-life-insights{
  display:block!important;
}
#lifeRouteSummary,#lifeTimeline,#lifeInsights{width:100%;min-width:0}
.tire-life-table-panel .tire-life-table-wrap{margin-top:0}

/* Avoid text collisions */
#tireLifecycleReport b,
#tireLifecycleReport small,
#tireLifecycleReport span,
#tireLifecycleReport td,
#tireLifecycleReport th{
  word-break:normal;
  overflow-wrap:anywhere;
}

/* Light mode */
html[data-theme="light"] .life-overview-card,
html[data-theme="light"] .life-overview-head,
html[data-theme="light"] .life-timeline-row,
html[data-theme="light"] .life-simple-table-wrap{
  background:#fff!important;
  border-color:#d5e0e6!important;
}
html[data-theme="light"] .life-timeline-head,
html[data-theme="light"] .life-simple-table th{
  background:#eaf2f6!important;
  color:#203f50!important;
}
html[data-theme="light"] .life-overview-table td,
html[data-theme="light"] .life-timeline-row>span,
html[data-theme="light"] .life-simple-table td{
  border-color:#e0e8ec!important;
  color:#435a67!important;
}
html[data-theme="light"] .life-overview-head>div:first-child>strong,
html[data-theme="light"] .life-overview-table b,
html[data-theme="light"] .life-timeline-row b{
  color:#17394b!important;
}

/* Responsive */
@media(max-width:1180px){
  .tire-life-grid{grid-template-columns:1fr!important}
}
@media(max-width:850px){
  .life-overview-head{grid-template-columns:1fr!important}
  .life-overview-status{padding-right:0;border-right:0;padding-top:10px;border-top:1px solid #334c59}
  .life-timeline-table{overflow:auto}
  .life-timeline-head,.life-timeline-row{min-width:900px}
}
@media(max-width:620px){
  .life-overview-table{min-width:660px}
  .life-overview-table-wrap{overflow:auto}
}

</style>
<style id="tireLifecycleFinalPolish">

/* ===== FINAL LIFECYCLE POLISH: SPACING + SELECT + FILTER INDEPENDENCE ===== */

/* Strong vertical rhythm between all report blocks */
#tireLifecycleReport .life-overview-card{
  margin-bottom:20px!important;
}
#tireLifecycleReport .tire-life-grid{
  margin-top:0!important;
  margin-bottom:20px!important;
  gap:18px!important;
}
#tireLifecycleReport .tire-life-table-panel{
  margin-top:0!important;
  margin-bottom:20px!important;
}
#tireLifecycleReport .tire-life-panel{
  margin-bottom:0!important;
  padding:15px!important;
}
#tireLifecycleReport .tire-life-panel + .tire-life-panel{
  margin-top:0!important;
}
#tireLifecycleReport .tire-life-panel-head{
  padding-bottom:11px!important;
  margin-bottom:12px!important;
}
#tireLifecycleReport .life-simple-table-wrap,
#tireLifecycleReport .tire-life-table-wrap,
#tireLifecycleReport .life-timeline-table{
  margin-top:2px!important;
  margin-bottom:2px!important;
}
#tireLifecycleReport #lifeInsights{
  margin-top:2px!important;
}
#tireLifecycleReport .life-overview-table td{
  padding:14px 16px!important;
}
#tireLifecycleReport .life-timeline-head span,
#tireLifecycleReport .life-timeline-row>span{
  padding:10px 11px!important;
}
#tireLifecycleReport .life-simple-table th,
#tireLifecycleReport .life-simple-table td{
  padding:10px 11px!important;
}
#tireLifecycleReport .tire-life-table th,
#tireLifecycleReport .tire-life-table td{
  padding:10px 9px!important;
}

/* Toolbar spacing */
#tireLifecycleReport .tire-life-toolbar{
  grid-template-columns:minmax(260px,.95fr) minmax(340px,1.35fr) auto!important;
  gap:14px!important;
  padding:15px 16px!important;
  margin-bottom:20px!important;
  align-items:end!important;
}
#tireLifecycleReport .tire-life-toolbar label>span,
#tireLifecycleReport .tire-life-quick-search>span{
  margin-bottom:7px!important;
  color:#b5c4cc!important;
  font-size:9.2px!important;
}

/* Custom select */
.life-select-shell{
  position:relative!important;
  width:100%!important;
}
.life-select-shell select{
  appearance:none!important;
  -webkit-appearance:none!important;
  -moz-appearance:none!important;
  width:100%!important;
  height:48px!important;
  padding:0 44px 0 13px!important;
  border:1px solid #3b5867!important;
  border-radius:11px!important;
  background:
    linear-gradient(180deg,#0f2029,#0b171f)!important;
  color:#eef5f8!important;
  font:800 10px Cairo!important;
  cursor:pointer!important;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.025),
    0 5px 14px rgba(0,0,0,.08)!important;
  transition:border-color .16s ease,box-shadow .16s ease,background .16s ease!important;
}
.life-select-shell select:hover{
  border-color:#507383!important;
  background:linear-gradient(180deg,#122731,#0d1b24)!important;
}
.life-select-shell select:focus{
  outline:none!important;
  border-color:#27aaa5!important;
  box-shadow:0 0 0 3px rgba(39,170,165,.13)!important;
}
.life-select-shell select option{
  background:#10212a!important;
  color:#eef5f8!important;
}
.life-select-arrow{
  position:absolute!important;
  top:50%!important;
  right:16px!important;
  width:9px!important;
  height:9px!important;
  border-right:2px solid #8fb7bc!important;
  border-bottom:2px solid #8fb7bc!important;
  transform:translateY(-68%) rotate(45deg)!important;
  pointer-events:none!important;
}
.life-select-shell::before{
  content:""!important;
  position:absolute!important;
  top:9px!important;
  bottom:9px!important;
  right:38px!important;
  width:1px!important;
  background:#304b58!important;
  pointer-events:none!important;
}

/* Search input */
#tireLifecycleReport #lifeTireSearch{
  height:48px!important;
  border-radius:11px!important;
  padding:0 14px!important;
  border:1px solid #3b5867!important;
  background:linear-gradient(180deg,#0f2029,#0b171f)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.025)!important;
}
#tireLifecycleReport #lifeTireSearch::placeholder{
  color:#667e8a!important;
}
#tireLifecycleReport #lifeTireSearch:focus{
  border-color:#27aaa5!important;
  box-shadow:0 0 0 3px rgba(39,170,165,.13)!important;
}

/* Independent filter badge */
.life-independent-badge{
  min-height:48px!important;
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:7px!important;
  padding:0 14px!important;
  border:1px solid #315e55!important;
  border-radius:11px!important;
  background:linear-gradient(180deg,#17342f,#122923)!important;
  color:#b7dfce!important;
  font:900 8.8px Cairo!important;
  white-space:nowrap!important;
}
.life-independent-badge span{
  color:#53b486!important;
  font-size:9px!important;
  text-shadow:0 0 10px rgba(83,180,134,.45)!important;
}

/* Improve section separation */
#tireLifecycleReport .tire-life-grid > .tire-life-panel,
#tireLifecycleReport .tire-life-table-panel,
#tireLifecycleReport .tire-life-content > .tire-life-panel:last-child{
  box-shadow:0 8px 22px rgba(0,0,0,.07)!important;
}
#tireLifecycleReport .tire-life-table-panel{
  padding:15px!important;
}
#tireLifecycleReport .tire-life-content > .tire-life-panel:last-child{
  margin-top:0!important;
}

/* Make table headers easier to scan */
#tireLifecycleReport .life-timeline-head,
#tireLifecycleReport .life-simple-table th,
#tireLifecycleReport .tire-life-table th{
  letter-spacing:.15px!important;
}
#tireLifecycleReport .life-simple-table tbody tr,
#tireLifecycleReport .tire-life-table tbody tr,
#tireLifecycleReport .life-timeline-row{
  min-height:40px!important;
}

/* Light mode */
html[data-theme="light"] .life-select-shell select,
html[data-theme="light"] #tireLifecycleReport #lifeTireSearch{
  background:#fff!important;
  color:#233e4e!important;
  border-color:#cbd9e1!important;
}
html[data-theme="light"] .life-select-shell select option{
  background:#fff!important;
  color:#233e4e!important;
}
html[data-theme="light"] .life-select-shell::before{
  background:#d5e0e6!important;
}
html[data-theme="light"] .life-select-arrow{
  border-color:#5d7785!important;
}
html[data-theme="light"] .life-independent-badge{
  background:#eef8f3!important;
  border-color:#bfdccc!important;
  color:#39745b!important;
}

/* Responsive spacing */
@media(max-width:1050px){
  #tireLifecycleReport .tire-life-toolbar{
    grid-template-columns:1fr 1fr!important;
  }
  .life-independent-badge{
    grid-column:1/-1!important;
    justify-self:start!important;
  }
}
@media(max-width:720px){
  #tireLifecycleReport .tire-life-toolbar{
    grid-template-columns:1fr!important;
    gap:11px!important;
  }
  .life-independent-badge{
    grid-column:auto!important;
    width:100%!important;
  }
  #tireLifecycleReport .life-overview-card,
  #tireLifecycleReport .tire-life-grid,
  #tireLifecycleReport .tire-life-table-panel{
    margin-bottom:16px!important;
  }
}

</style>
<style id="tireLifecycleV3Styles">

/* ===== TIRE LIFECYCLE V3 — ISOLATED PROFESSIONAL UI ===== */
#tireLifecycleReport.tlc-report{
  display:none;
  padding:0!important;
  background:transparent!important;
  border:0!important;
  box-shadow:none!important;
  overflow:visible!important;
}
#tireLifecycleReport.nav-report-active{display:block!important}
#tireLifecycleReport .tlc-shell{
  width:100%!important;
  max-width:none!important;
  direction:rtl!important;
  color:#eaf2f5!important;
  font-family:Cairo,Arial,sans-serif!important;
  background:linear-gradient(180deg,#142630,#101e27)!important;
  border:1px solid #344f5d!important;
  border-radius:18px!important;
  padding:18px!important;
  box-shadow:0 18px 44px rgba(0,0,0,.16)!important;
}
#tireLifecycleReport .tlc-header{
  display:flex!important;
  align-items:flex-start!important;
  justify-content:space-between!important;
  gap:20px!important;
  padding:2px 2px 15px!important;
  margin-bottom:16px!important;
  border-bottom:1px solid #304955!important;
}
#tireLifecycleReport .tlc-header h2{
  margin:2px 0 4px!important;
  font:900 21px Cairo!important;
  color:#f5f8fa!important;
}
#tireLifecycleReport .tlc-header p{
  margin:0!important;
  max-width:780px!important;
  color:#8398a4!important;
  font-size:9.5px!important;
  line-height:1.75!important;
}
#tireLifecycleReport .tlc-kicker{display:block!important;color:#38b0aa!important;font-size:8.5px!important;font-weight:900!important}
#tireLifecycleReport .tlc-independent{
  display:inline-flex!important;align-items:center!important;gap:6px!important;
  padding:7px 11px!important;border:1px solid #326655!important;border-radius:999px!important;
  background:#143128!important;color:#b9dfce!important;font:900 8.5px Cairo!important;white-space:nowrap!important
}

#tireLifecycleReport .tlc-controls{
  display:grid!important;
  grid-template-columns:minmax(250px,.9fr) minmax(360px,1.4fr) 150px!important;
  gap:12px!important;
  align-items:end!important;
  margin-bottom:20px!important;
  padding:14px!important;
  border:1px solid #324b58!important;
  border-radius:13px!important;
  background:#0f1e27!important;
}
#tireLifecycleReport .tlc-field{display:block!important;min-width:0!important}
#tireLifecycleReport .tlc-field>span{display:block!important;margin-bottom:6px!important;color:#a6b6bf!important;font-size:9px!important;font-weight:900!important}
#tireLifecycleReport .tlc-select-wrap{position:relative!important}
#tireLifecycleReport .tlc-select-wrap select,
#tireLifecycleReport .tlc-field input{
  width:100%!important;height:46px!important;margin:0!important;padding:0 13px!important;
  border:1px solid #3b5664!important;border-radius:10px!important;
  background:#0a161e!important;color:#eef5f8!important;
  font:800 10px Cairo!important;outline:none!important;box-sizing:border-box!important;
}
#tireLifecycleReport .tlc-select-wrap select{
  appearance:none!important;-webkit-appearance:none!important;padding-left:40px!important
}
#tireLifecycleReport .tlc-select-chevron{
  position:absolute!important;left:14px!important;top:50%!important;transform:translateY(-52%)!important;
  color:#8db0b8!important;font-size:17px!important;pointer-events:none!important
}
#tireLifecycleReport .tlc-select-wrap select:focus,
#tireLifecycleReport .tlc-field input:focus{
  border-color:#32aaa5!important;box-shadow:0 0 0 3px rgba(50,170,165,.12)!important
}
#tireLifecycleReport .tlc-control-stat{
  height:46px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;
  padding:0 12px!important;border:1px solid #34515d!important;border-radius:10px!important;background:#132832!important
}
#tireLifecycleReport .tlc-control-stat span{color:#8297a2!important;font-size:7.5px!important}
#tireLifecycleReport .tlc-control-stat b{color:#eaf2f5!important;font:900 14px 'IBM Plex Mono',Cairo!important}

#tireLifecycleReport .tlc-empty{
  min-height:330px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;
  gap:8px!important;text-align:center!important;padding:28px!important;border:1px dashed #3a5563!important;border-radius:14px!important;background:#0e1c24!important
}
#tireLifecycleReport .tlc-empty[hidden]{display:none!important}
#tireLifecycleReport .tlc-empty-icon{
  width:62px!important;height:62px!important;display:flex!important;align-items:center!important;justify-content:center!important;
  border-radius:17px!important;background:linear-gradient(180deg,#1b9e9a,#146c6b)!important;color:#fff!important;font-size:28px!important
}
#tireLifecycleReport .tlc-empty h3{margin:4px 0 0!important;color:#eef5f8!important;font:900 16px Cairo!important}
#tireLifecycleReport .tlc-empty p{max-width:720px!important;margin:0!important;color:#8095a0!important;font-size:9px!important;line-height:1.8!important}

#tireLifecycleReport .tlc-content{display:block!important}
#tireLifecycleReport .tlc-content[hidden]{display:none!important}
#tireLifecycleReport .tlc-identity-card{
  display:grid!important;grid-template-columns:minmax(0,1fr) 320px!important;gap:18px!important;align-items:center!important;
  margin-bottom:16px!important;padding:16px!important;border:1px solid #36515e!important;border-radius:13px!important;
  background:linear-gradient(135deg,#17313b,#11232c)!important
}
#tireLifecycleReport .tlc-id-main>span{display:block!important;color:#7f95a0!important;font-size:8px!important;font-weight:900!important}
#tireLifecycleReport .tlc-id-main>strong{display:block!important;margin:2px 0!important;color:#f5f8fa!important;font:900 27px 'IBM Plex Mono',Cairo!important}
#tireLifecycleReport .tlc-id-main>small{display:block!important;color:#a2b3bb!important;font-size:9px!important}
#tireLifecycleReport .tlc-id-state{padding-right:18px!important;border-right:1px solid #36505c!important}
#tireLifecycleReport .tlc-id-state>small{display:block!important;margin-top:5px!important;color:#8296a0!important;font-size:8px!important;line-height:1.6!important}
#tireLifecycleReport .tlc-state{
  display:inline-flex!important;min-width:125px!important;align-items:center!important;justify-content:center!important;
  padding:6px 10px!important;border-radius:999px!important;border:1px solid #45606d!important;background:#172b35!important;color:#dfe9ee!important;font:900 8.5px Cairo!important
}
#tireLifecycleReport .tlc-state.installed{background:#17342a!important;border-color:#3e6d55!important;color:#bce5cb!important}
#tireLifecycleReport .tlc-state.removed{background:#3a2326!important;border-color:#75464b!important;color:#efb8bb!important}
#tireLifecycleReport .tlc-state.unknown{background:#332e22!important;border-color:#6b603c!important;color:#e8d39c!important}

#tireLifecycleReport .tlc-kpis{
  display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:10px!important;margin-bottom:20px!important
}
#tireLifecycleReport .tlc-kpi{
  display:block!important;min-width:0!important;min-height:94px!important;padding:11px!important;
  border:1px solid #324b58!important;border-radius:11px!important;background:#10212a!important
}
#tireLifecycleReport .tlc-kpi span{display:block!important;color:#8195a0!important;font-size:8px!important;font-weight:900!important}
#tireLifecycleReport .tlc-kpi strong{display:block!important;margin:4px 0 2px!important;color:#edf4f7!important;font:900 14px Cairo!important;line-height:1.35!important}
#tireLifecycleReport .tlc-kpi small{display:block!important;color:#70848f!important;font-size:7.3px!important;line-height:1.5!important}

#tireLifecycleReport .tlc-card{
  display:block!important;width:100%!important;margin:0 0 20px!important;padding:14px!important;
  border:1px solid #324b58!important;border-radius:13px!important;background:#102029!important;overflow:hidden!important
}
#tireLifecycleReport .tlc-card:last-child{margin-bottom:0!important}
#tireLifecycleReport .tlc-card-head{
  display:flex!important;justify-content:space-between!important;align-items:center!important;gap:12px!important;
  margin-bottom:12px!important;padding-bottom:10px!important;border-bottom:1px solid #2d4450!important
}
#tireLifecycleReport .tlc-card-head h3{margin:0!important;color:#e8f0f3!important;font:900 11px Cairo!important}
#tireLifecycleReport .tlc-card-head p{margin:2px 0 0!important;color:#768b96!important;font-size:7.8px!important}
#tireLifecycleReport .tlc-card-head>span{color:#8499a4!important;font:800 8px Cairo!important}

#tireLifecycleReport .tlc-timeline{
  display:block!important;width:100%!important;overflow:auto!important;border:1px solid #304955!important;border-radius:10px!important
}
#tireLifecycleReport .tlc-event{
  display:grid!important;grid-template-columns:44px 115px 155px 220px minmax(260px,1fr) 110px!important;
  align-items:stretch!important;min-width:980px!important;background:#0d1b23!important;border-top:1px solid #293f4b!important
}
#tireLifecycleReport .tlc-event:first-child{border-top:0!important}
#tireLifecycleReport .tlc-event.install{border-right:3px solid #54a478!important}
#tireLifecycleReport .tlc-event.remove{border-right:3px solid #c86569!important}
#tireLifecycleReport .tlc-event.move{border-right:3px solid #5c8dab!important}
#tireLifecycleReport .tlc-event>div{
  min-width:0!important;padding:9px 10px!important;border-left:1px solid #293f4b!important;display:flex!important;flex-direction:column!important;justify-content:center!important
}
#tireLifecycleReport .tlc-event>div:last-child{border-left:0!important}
#tireLifecycleReport .tlc-event-index,#tireLifecycleReport .tlc-event-date,#tireLifecycleReport .tlc-event-duration{text-align:center!important;align-items:center!important;font-family:'IBM Plex Mono',monospace!important;color:#9db0b9!important}
#tireLifecycleReport .tlc-event-main b,#tireLifecycleReport .tlc-event-location b{color:#e6eef2!important;font:900 8.8px Cairo!important}
#tireLifecycleReport .tlc-event-main small,#tireLifecycleReport .tlc-event-location small{color:#718590!important;font-size:7.2px!important;margin-top:2px!important}
#tireLifecycleReport .tlc-event-extra{color:#91a4ae!important;font-size:7.5px!important;line-height:1.65!important}

#tireLifecycleReport .tlc-table-wrap{
  width:100%!important;overflow:auto!important;border:1px solid #304955!important;border-radius:10px!important
}
#tireLifecycleReport .tlc-table{
  width:100%!important;min-width:1100px!important;border-collapse:collapse!important;table-layout:auto!important;font-size:8px!important
}
#tireLifecycleReport .tlc-table th{
  padding:9px!important;background:#1a303a!important;color:#e8f0f3!important;font:900 8px Cairo!important;text-align:center!important;white-space:nowrap!important
}
#tireLifecycleReport .tlc-table td{
  padding:8px 9px!important;border-top:1px solid #293f4b!important;border-left:1px solid #293f4b!important;color:#c6d2d8!important;text-align:center!important;vertical-align:middle!important;line-height:1.55!important
}
#tireLifecycleReport .tlc-table td:last-child{border-left:0!important}
#tireLifecycleReport .tlc-table tr:nth-child(even) td{background:rgba(255,255,255,.012)!important}
#tireLifecycleReport .tlc-table tr:hover td{background:#152a34!important}
#tireLifecycleReport .tlc-route-table{min-width:760px!important}
#tireLifecycleReport .tlc-pill{
  display:inline-flex!important;min-width:72px!important;justify-content:center!important;padding:4px 7px!important;border-radius:999px!important;border:1px solid #405a67!important;background:#172a34!important;color:#dce8ed!important;font:900 7.5px Cairo!important
}
#tireLifecycleReport .tlc-pill.install{background:#18342b!important;border-color:#3d6d55!important;color:#bce5ca!important}
#tireLifecycleReport .tlc-pill.remove{background:#3b2427!important;border-color:#75474b!important;color:#f0b7ba!important}

#tireLifecycleReport .tlc-analysis{
  display:block!important;width:100%!important;border:1px solid #304955!important;border-radius:10px!important;overflow:hidden!important
}
#tireLifecycleReport .tlc-analysis-row{
  display:grid!important;grid-template-columns:220px 180px minmax(0,1fr)!important;gap:0!important;align-items:stretch!important;
  background:#0d1b23!important;border-top:1px solid #293f4b!important
}
#tireLifecycleReport .tlc-analysis-row:first-child{border-top:0!important}
#tireLifecycleReport .tlc-analysis-row>*{
  margin:0!important;padding:9px 11px!important;border-left:1px solid #293f4b!important;display:flex!important;align-items:center!important
}
#tireLifecycleReport .tlc-analysis-row>*:last-child{border-left:0!important}
#tireLifecycleReport .tlc-analysis-row b{color:#e6eef2!important;font:900 8.5px Cairo!important}
#tireLifecycleReport .tlc-analysis-row strong{color:#bcd0d9!important;font:900 8.5px Cairo!important}
#tireLifecycleReport .tlc-analysis-row span{color:#8196a0!important;font-size:7.6px!important;line-height:1.6!important}

/* Prevent all old report styles from collapsing the layout */
#tireLifecycleReport .tlc-shell div,
#tireLifecycleReport .tlc-shell section,
#tireLifecycleReport .tlc-shell article,
#tireLifecycleReport .tlc-shell header,
#tireLifecycleReport .tlc-shell table{
  float:none!important;
  position:relative;
}
#tireLifecycleReport .tlc-shell strong,
#tireLifecycleReport .tlc-shell b,
#tireLifecycleReport .tlc-shell span,
#tireLifecycleReport .tlc-shell small,
#tireLifecycleReport .tlc-shell p,
#tireLifecycleReport .tlc-shell h2,
#tireLifecycleReport .tlc-shell h3{
  writing-mode:horizontal-tb!important;
  text-orientation:mixed!important;
  transform:none!important;
  white-space:normal!important;
  word-break:normal!important;
}

/* Responsive */
@media(max-width:1100px){
  #tireLifecycleReport .tlc-controls{grid-template-columns:1fr 1fr!important}
  #tireLifecycleReport .tlc-control-stat{grid-column:1/-1!important;width:150px!important}
  #tireLifecycleReport .tlc-kpis{grid-template-columns:repeat(3,1fr)!important}
  #tireLifecycleReport .tlc-identity-card{grid-template-columns:1fr!important}
  #tireLifecycleReport .tlc-id-state{border-right:0!important;border-top:1px solid #36505c!important;padding-right:0!important;padding-top:10px!important}
}
@media(max-width:700px){
  #tireLifecycleReport .tlc-shell{padding:11px!important}
  #tireLifecycleReport .tlc-header{flex-direction:column!important}
  #tireLifecycleReport .tlc-controls{grid-template-columns:1fr!important}
  #tireLifecycleReport .tlc-control-stat{grid-column:auto!important;width:100%!important}
  #tireLifecycleReport .tlc-kpis{grid-template-columns:1fr 1fr!important}
  #tireLifecycleReport .tlc-analysis-row{min-width:680px!important}
  #tireLifecycleReport .tlc-analysis{overflow:auto!important}
}
@media(max-width:460px){
  #tireLifecycleReport .tlc-kpis{grid-template-columns:1fr!important}
}

</style>
<style id="tireLifecycleComparisonsLook">

/* ===== TIRE LIFECYCLE — MATCH COMPARISONS UI ===== */
#tireLifecycleReport{
  padding:0!important;
  background:transparent!important;
  border:0!important;
}
#tireLifecycleReport .tlc-compare-shell{
  padding:16px!important;
  border:1px solid #3a5061!important;
  border-radius:18px!important;
  background:linear-gradient(180deg,#13232e,#101c25)!important;
  box-shadow:0 28px 70px rgba(0,0,0,.24)!important;
}
#tireLifecycleReport .tlc-compare-head{
  margin-bottom:12px!important;
}
#tireLifecycleReport .tlc-independent-pill{
  padding:6px 10px!important;
  border:1px solid #376155!important;
  border-radius:999px!important;
  background:#173128!important;
  color:#b8dfcd!important;
  font:900 8px Cairo!important;
  white-space:nowrap!important;
}
#tireLifecycleReport .tlc-toolbar{
  grid-template-columns:1fr 1.3fr 150px!important;
  align-items:end!important;
  margin-bottom:14px!important;
}
#tireLifecycleReport .tlc-toolbar input{
  width:100%!important;
  height:42px!important;
  background:#0d1720!important;
  color:#fff!important;
  border:1px solid #3b5262!important;
  border-radius:9px!important;
  padding:0 9px!important;
}
#tireLifecycleReport .tlc-toolbar-stat{
  height:42px!important;
  display:flex!important;
  flex-direction:column!important;
  justify-content:center!important;
  padding:0 10px!important;
  border:1px solid #3b5262!important;
  border-radius:9px!important;
  background:#0d1720!important;
}
#tireLifecycleReport .tlc-toolbar-stat span{
  color:#8499a5!important;font-size:7px!important
}
#tireLifecycleReport .tlc-toolbar-stat b{
  color:#edf4f7!important;font:900 13px 'IBM Plex Mono',Cairo!important
}
#tireLifecycleReport .tlc-content{
  display:block!important;
}
#tireLifecycleReport .tlc-content[hidden]{
  display:none!important;
}
#tireLifecycleReport .tlc-empty{
  min-height:250px!important;
}
#tireLifecycleReport .compare-section-title{
  margin-top:16px!important;
}
#tireLifecycleReport .compare-table-wrap{
  margin-bottom:14px!important;
}
#tireLifecycleReport .compare-table td,
#tireLifecycleReport .compare-table th{
  vertical-align:middle!important;
}
#tireLifecycleReport .tlc-summary-table{
  min-width:900px!important;
}
#tireLifecycleReport .tlc-summary-table td:nth-child(odd){
  width:140px!important;
  background:#152934!important;
  color:#9eb2bc!important;
  font-weight:900!important;
}
#tireLifecycleReport .tlc-summary-table td:nth-child(even){
  color:#eef5f8!important;
  font-weight:900!important;
}
#tireLifecycleReport .tlc-kpi-table{
  min-width:760px!important;
}
#tireLifecycleReport .tlc-timeline-table{
  min-width:1100px!important;
}
#tireLifecycleReport .tlc-records-table{
  min-width:1380px!important;
}
#tireLifecycleReport .tlc-route-table{
  min-width:820px!important;
}
#tireLifecycleReport .tlc-analysis-table{
  min-width:760px!important;
}
#tireLifecycleReport .tlc-status,
#tireLifecycleReport .tlc-action{
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  min-width:80px!important;
  padding:4px 7px!important;
  border-radius:999px!important;
  border:1px solid #405a67!important;
  background:#172a34!important;
  color:#dce8ed!important;
  font:900 7.5px Cairo!important;
}
#tireLifecycleReport .tlc-status.installed,
#tireLifecycleReport .tlc-action.install{
  background:#18342b!important;
  border-color:#3d6d55!important;
  color:#bce5ca!important;
}
#tireLifecycleReport .tlc-status.removed,
#tireLifecycleReport .tlc-action.remove{
  background:#3b2427!important;
  border-color:#75474b!important;
  color:#f0b7ba!important;
}
#tireLifecycleReport .tlc-status.unknown,
#tireLifecycleReport .tlc-action.move{
  background:#2f2b22!important;
  border-color:#675d3c!important;
  color:#e4d199!important;
}
#tireLifecycleReport .compare-table td{
  white-space:normal!important;
  line-height:1.65!important;
}
#tireLifecycleReport .compare-table td:first-child{
  text-align:center!important;
}
#tireLifecycleReport .compare-table tbody tr:hover td{
  background:#172b36!important;
}
html[data-theme="light"] #tireLifecycleReport .tlc-compare-shell{
  background:#fff!important;
  border-color:#d6e1e7!important;
}
html[data-theme="light"] #tireLifecycleReport .tlc-toolbar input,
html[data-theme="light"] #tireLifecycleReport .tlc-toolbar-stat{
  background:#f7fafc!important;
  color:#203646!important;
  border-color:#cad7df!important;
}
html[data-theme="light"] #tireLifecycleReport .tlc-summary-table td:nth-child(odd){
  background:#f1f6f8!important;
  color:#56707d!important;
}
html[data-theme="light"] #tireLifecycleReport .tlc-summary-table td:nth-child(even){
  color:#17384b!important;
}
@media(max-width:900px){
  #tireLifecycleReport .tlc-toolbar{
    grid-template-columns:1fr!important;
  }
  #tireLifecycleReport .tlc-toolbar-stat{
    width:100%!important;
  }
}

</style>
<style id="tireLifecycleDistinctColors">

/* ===== TIRE LIFECYCLE — DISTINCT TABLE COLORS ===== */
#tireLifecycleReport{
  --tlc-c1:#4f86b8;
  --tlc-c2:#5a9a7b;
  --tlc-c3:#8a6bb5;
  --tlc-c4:#b18a50;
  --tlc-c5:#4f9b9a;
  --tlc-c6:#b5656a;
}

/* Professional main title */
#tireLifecycleReport .tlc-compare-head{
  position:relative!important;
  overflow:hidden!important;
  padding:16px 18px 15px!important;
  margin-bottom:16px!important;
  border:1px solid #385463!important;
  border-radius:14px!important;
  background:
    radial-gradient(circle at 100% 0%,rgba(79,134,184,.13),transparent 36%),
    linear-gradient(180deg,#162b36,#12232c)!important;
}
#tireLifecycleReport .tlc-compare-head::before{
  content:"";
  position:absolute;
  top:0;right:0;left:0;height:3px;
  background:linear-gradient(90deg,var(--tlc-c1),var(--tlc-c3),var(--tlc-c5));
}
#tireLifecycleReport .tlc-compare-head .compare-eyebrow{
  color:#83b9dd!important;
  font-size:8.5px!important;
  letter-spacing:.2px!important;
}
#tireLifecycleReport .tlc-compare-head h2{
  margin:3px 0 5px!important;
  color:#f5f9fb!important;
  font:900 22px Cairo!important;
  letter-spacing:-.2px!important;
}
#tireLifecycleReport .tlc-compare-head p{
  max-width:860px!important;
  color:#8fa3ae!important;
  font-size:9.5px!important;
  line-height:1.75!important;
}

/* Section titles */
#tireLifecycleReport .compare-section-title{
  position:relative!important;
  overflow:hidden!important;
  display:flex!important;
  align-items:center!important;
  justify-content:space-between!important;
  gap:10px!important;
  margin:20px 0 9px!important;
  padding:10px 13px 10px 16px!important;
  border:1px solid #354d5a!important;
  border-radius:10px!important;
  background:#152731!important;
}
#tireLifecycleReport .compare-section-title::before{
  content:"";
  position:absolute;
  right:0;top:0;bottom:0;
  width:4px;
  background:var(--section-accent,#4f86b8);
}
#tireLifecycleReport .compare-section-title b{
  color:#eef5f8!important;
  font:900 11px Cairo!important;
}
#tireLifecycleReport .compare-section-title small{
  color:#8094a0!important;
  font-size:8px!important;
}

/* 1 — Summary identity table: blue */
#tireLifecycleReport .tlc-summary-table{
  --table-accent:var(--tlc-c1);
}
#tireLifecycleReport .tlc-summary-table th,
#tireLifecycleReport .tlc-summary-table td:nth-child(odd){
  background:rgba(79,134,184,.13)!important;
}
#tireLifecycleReport .tlc-summary-table td:nth-child(odd){
  color:#b8d4e8!important;
}
#tireLifecycleReport .tlc-summary-table{
  border-top:3px solid var(--tlc-c1)!important;
}

/* 2 — KPI table: green */
#tireLifecycleReport .tlc-kpi-table{
  border-top:3px solid var(--tlc-c2)!important;
}
#tireLifecycleReport .tlc-kpi-table th{
  background:rgba(90,154,123,.17)!important;
}
#tireLifecycleReport .tlc-kpi-table tbody tr:hover td{
  background:rgba(90,154,123,.08)!important;
}

/* 3 — Timeline table: purple */
#tireLifecycleReport .tlc-timeline-table{
  border-top:3px solid var(--tlc-c3)!important;
}
#tireLifecycleReport .tlc-timeline-table th{
  background:rgba(138,107,181,.18)!important;
}
#tireLifecycleReport .tlc-timeline-table tbody tr:hover td{
  background:rgba(138,107,181,.08)!important;
}

/* 4 — Route table: gold */
#tireLifecycleReport .tlc-route-table{
  border-top:3px solid var(--tlc-c4)!important;
}
#tireLifecycleReport .tlc-route-table th{
  background:rgba(177,138,80,.18)!important;
}
#tireLifecycleReport .tlc-route-table tbody tr:hover td{
  background:rgba(177,138,80,.08)!important;
}

/* 5 — Full records table: teal */
#tireLifecycleReport .tlc-records-table{
  border-top:3px solid var(--tlc-c5)!important;
}
#tireLifecycleReport .tlc-records-table th{
  background:rgba(79,155,154,.18)!important;
}
#tireLifecycleReport .tlc-records-table tbody tr:hover td{
  background:rgba(79,155,154,.08)!important;
}

/* 6 — Analysis table: muted red */
#tireLifecycleReport .tlc-analysis-table{
  border-top:3px solid var(--tlc-c6)!important;
}
#tireLifecycleReport .tlc-analysis-table th{
  background:rgba(181,101,106,.16)!important;
}
#tireLifecycleReport .tlc-analysis-table tbody tr:hover td{
  background:rgba(181,101,106,.07)!important;
}

/* Matching colored section titles */
#tireLifecycleReport .compare-section-title:nth-of-type(1){--section-accent:var(--tlc-c1)}
#tireLifecycleReport .compare-section-title:nth-of-type(2){--section-accent:var(--tlc-c2)}
#tireLifecycleReport .compare-section-title:nth-of-type(3){--section-accent:var(--tlc-c3)}
#tireLifecycleReport .compare-section-title:nth-of-type(4){--section-accent:var(--tlc-c4)}
#tireLifecycleReport .compare-section-title:nth-of-type(5){--section-accent:var(--tlc-c5)}
#tireLifecycleReport .compare-section-title:nth-of-type(6){--section-accent:var(--tlc-c6)}

/* More breathing room */
#tireLifecycleReport .compare-table-wrap{
  margin-bottom:18px!important;
  border-radius:11px!important;
  overflow:auto!important;
}
#tireLifecycleReport .compare-table th{
  padding:10px 11px!important;
}
#tireLifecycleReport .compare-table td{
  padding:9px 11px!important;
}

/* Light mode */
html[data-theme="light"] #tireLifecycleReport .tlc-compare-head{
  background:#fff!important;
  border-color:#d5e1e7!important;
}
html[data-theme="light"] #tireLifecycleReport .tlc-compare-head h2{
  color:#17384b!important;
}
html[data-theme="light"] #tireLifecycleReport .compare-section-title{
  background:#f6fafc!important;
  border-color:#d7e2e8!important;
}
html[data-theme="light"] #tireLifecycleReport .compare-section-title b{
  color:#1e3b4d!important;
}
html[data-theme="light"] #tireLifecycleReport .tlc-summary-table th,
html[data-theme="light"] #tireLifecycleReport .tlc-summary-table td:nth-child(odd),
html[data-theme="light"] #tireLifecycleReport .tlc-kpi-table th,
html[data-theme="light"] #tireLifecycleReport .tlc-timeline-table th,
html[data-theme="light"] #tireLifecycleReport .tlc-route-table th,
html[data-theme="light"] #tireLifecycleReport .tlc-records-table th,
html[data-theme="light"] #tireLifecycleReport .tlc-analysis-table th{
  color:#234252!important;
}

</style>
<style id="tireLifecycleTripleSpacing">

/* ===== TIRE LIFECYCLE — 3X SECTION SPACING ===== */
#tireLifecycleReport .compare-section-title{
  margin-top:54px!important;
  margin-bottom:14px!important;
}
#tireLifecycleReport .compare-table-wrap{
  margin-bottom:54px!important;
}
#tireLifecycleReport .compare-table-wrap:last-child{
  margin-bottom:0!important;
}
#tireLifecycleReport .tlc-content > .compare-section-title:first-child{
  margin-top:24px!important;
}
#tireLifecycleReport .tlc-toolbar{
  margin-bottom:34px!important;
}
#tireLifecycleReport .tlc-summary-table,
#tireLifecycleReport .tlc-kpi-table,
#tireLifecycleReport .tlc-timeline-table,
#tireLifecycleReport .tlc-route-table,
#tireLifecycleReport .tlc-records-table,
#tireLifecycleReport .tlc-analysis-table{
  margin-bottom:0!important;
}
@media(max-width:700px){
  #tireLifecycleReport .compare-section-title{
    margin-top:40px!important;
  }
  #tireLifecycleReport .compare-table-wrap{
    margin-bottom:40px!important;
  }
}

</style>
<style id="seamlessNoFlickerStyles">

/* ===== SEAMLESS DATA REFRESH — NO FLICKER ===== */
html,body,#wrap,.wrap,.report-home,.dashboard-report,.nav-report-view{
  scroll-behavior:auto!important;
}
#executiveKpis,
#reportHome,
#decisionCenter,
#tireLifecycleReport,
#tireLifecycleReport .compare-table-wrap,
#tireLifecycleReport .compare-table tbody{
  animation:none!important;
  transition:none!important;
}
#tireLifecycleReport,
#reportHome,
.executive-home,
.decision-center{
  opacity:1!important;
  visibility:visible!important;
}
.refreshing,
.is-loading,
.loading{
  opacity:1!important;
}

</style>
<style id="lifecycleDefinitiveSpacing">

/* ===== DEFINITIVE LIFECYCLE SECTION SPACING ===== */
#tireLifecycleReport .tlc-content{
  display:block!important;
}
#tireLifecycleReport .tlc-content > .compare-section-title{
  margin-top:72px!important;
  margin-bottom:16px!important;
}
#tireLifecycleReport .tlc-content > .compare-section-title:first-child{
  margin-top:28px!important;
}
#tireLifecycleReport .tlc-content > .compare-table-wrap,
#tireLifecycleReport .tlc-content > #lifeRouteSummary{
  margin-bottom:72px!important;
}
#tireLifecycleReport .tlc-content > #lifeRouteSummary .compare-table-wrap{
  margin-bottom:0!important;
}
#tireLifecycleReport .tlc-content > .compare-table-wrap:last-of-type{
  margin-bottom:0!important;
}

/* Add a visual separator zone so sections cannot visually merge */
#tireLifecycleReport .tlc-content > .compare-section-title:not(:first-child)::after{
  content:"";
  position:absolute;
  top:-38px;
  right:0;
  left:0;
  height:1px;
  background:linear-gradient(90deg,transparent,#2f4855 20%,#2f4855 80%,transparent);
  opacity:.7;
}

/* Increase the whitespace after each table itself */
#tireLifecycleReport .compare-table-wrap{
  padding-bottom:0!important;
}
#tireLifecycleReport .compare-table{
  margin-bottom:0!important;
}

/* Keep spacing proportional on smaller screens */
@media(max-width:900px){
  #tireLifecycleReport .tlc-content > .compare-section-title{
    margin-top:56px!important;
  }
  #tireLifecycleReport .tlc-content > .compare-table-wrap,
  #tireLifecycleReport .tlc-content > #lifeRouteSummary{
    margin-bottom:56px!important;
  }
}
@media(max-width:600px){
  #tireLifecycleReport .tlc-content > .compare-section-title{
    margin-top:44px!important;
  }
  #tireLifecycleReport .tlc-content > .compare-table-wrap,
  #tireLifecycleReport .tlc-content > #lifeRouteSummary{
    margin-bottom:44px!important;
  }
}

</style>
<style id="tireLifecyclePhysicalGaps">

/* ===== TRUE PHYSICAL GAPS BETWEEN LIFECYCLE TABLES ===== */
#tireLifecycleReport .tlc-physical-gap{
  display:block!important;
  width:100%!important;
  height:84px!important;
  min-height:84px!important;
  flex:0 0 84px!important;
  clear:both!important;
  position:relative!important;
  pointer-events:none!important;
}
#tireLifecycleReport .tlc-physical-gap::after{
  content:"";
  position:absolute;
  left:8%;
  right:8%;
  top:50%;
  height:1px;
  background:linear-gradient(90deg,transparent,rgba(106,139,154,.30),transparent);
}

/* Margins are intentionally neutralized; spacing comes from the physical gap element */
#tireLifecycleReport .tlc-content > .compare-section-title{
  margin-top:0!important;
  margin-bottom:14px!important;
}
#tireLifecycleReport .tlc-content > .compare-table-wrap,
#tireLifecycleReport .tlc-content > #lifeRouteSummary{
  margin-bottom:0!important;
}

@media(max-width:900px){
  #tireLifecycleReport .tlc-physical-gap{
    height:64px!important;
    min-height:64px!important;
    flex-basis:64px!important;
  }
}
@media(max-width:600px){
  #tireLifecycleReport .tlc-physical-gap{
    height:48px!important;
    min-height:48px!important;
    flex-basis:48px!important;
  }
}

</style>
<style id="fixedProfessionalHomePrintPackage">

/* ===== HOME FULL PRINT PACKAGE — FIXED REPORT SET / UNIFIED STYLE ===== */
@media print{
  @page{size:A4 landscape;margin:9mm}

  body.print-mode-full > *:not(#fullPrintStage){
    display:none!important;
  }
  body.print-mode-full #fullPrintStage{
    display:block!important;
    width:100%!important;
    margin:0!important;
    padding:0!important;
    direction:rtl!important;
    color:#111!important;
    background:#fff!important;
    font-family:Cairo,Arial,sans-serif!important;
  }

  /* Exactly one professional report section at a time. */
  #fullPrintStage > .professional-cover-page,
  #fullPrintStage > .professional-reference-page,
  #fullPrintStage > .package-print-page{
    width:100%!important;
    box-sizing:border-box!important;
    background:#fff!important;
    color:#111!important;
    page-break-after:always!important;
    break-after:page!important;
  }
  #fullPrintStage > :last-child{
    page-break-after:auto!important;
    break-after:auto!important;
  }

  /* Cover */
  #fullPrintStage .professional-cover-page{
    min-height:188mm!important;
    display:flex!important;
    flex-direction:column!important;
    justify-content:center!important;
    box-shadow:none!important;
    border:0!important;
  }

  /* Common header for operational reports. */
  #fullPrintStage .package-print-page{
    min-height:188mm!important;
    padding:0!important;
  }
  #fullPrintStage .package-print-head{
    display:flex!important;
    align-items:flex-end!important;
    justify-content:space-between!important;
    gap:12mm!important;
    padding:0 0 4mm!important;
    margin:0 0 5mm!important;
    border-bottom:1.5pt solid #397ea9!important;
  }
  #fullPrintStage .package-print-head h2{
    margin:0!important;
    color:#111!important;
    font:900 15pt Cairo!important;
  }
  #fullPrintStage .package-print-head p{
    margin:1mm 0 0!important;
    color:#4a4a4a!important;
    font-size:7.5pt!important;
    line-height:1.5!important;
  }
  #fullPrintStage .package-print-meta{
    direction:ltr!important;
    text-align:left!important;
    white-space:nowrap!important;
    color:#333!important;
    font:700 7pt Arial!important;
  }
  #fullPrintStage .package-print-body{
    width:100%!important;
    color:#111!important;
  }

  /* Strip dashboard chrome from cloned operational reports. */
  #fullPrintStage .package-print-body .nav-report-view,
  #fullPrintStage .package-print-body #supplierInvoicesReport,
  #fullPrintStage .package-print-body #inventoryReport{
    display:block!important;
    margin:0!important;
    padding:0!important;
    border:0!important;
    border-radius:0!important;
    box-shadow:none!important;
    background:#fff!important;
    color:#111!important;
  }
  #fullPrintStage .package-print-body .section-title,
  #fullPrintStage .package-print-body .si-head,
  #fullPrintStage .package-print-body .inventory-head{
    margin:0 0 3mm!important;
    color:#111!important;
  }

  /* KPIs share one style in supplier/inventory/records. */
  #fullPrintStage .si-kpis,
  #fullPrintStage .inventory-kpis{
    display:grid!important;
    grid-template-columns:repeat(5,minmax(0,1fr))!important;
    gap:2mm!important;
    margin:0 0 4mm!important;
  }
  #fullPrintStage .si-kpi,
  #fullPrintStage .inventory-kpi{
    min-height:18mm!important;
    padding:2.5mm!important;
    border:.6pt solid #8797a3!important;
    border-radius:1.5mm!important;
    background:#f7f9fa!important;
    color:#111!important;
    box-shadow:none!important;
  }
  #fullPrintStage .si-kpi:before{display:none!important}
  #fullPrintStage .si-kpi label,
  #fullPrintStage .inventory-kpi span{
    color:#555!important;
    font-size:6.5pt!important;
  }
  #fullPrintStage .si-kpi strong,
  #fullPrintStage .inventory-kpi b{
    color:#111!important;
    font-size:11pt!important;
  }

  /* All tables use the same high-clarity treatment. */
  #fullPrintStage table{
    width:100%!important;
    border-collapse:collapse!important;
    border-spacing:0!important;
    background:#fff!important;
    color:#111!important;
    font-size:6.8pt!important;
    table-layout:auto!important;
  }
  #fullPrintStage thead{
    display:table-header-group!important;
  }
  #fullPrintStage th{
    padding:1.7mm 1.3mm!important;
    background:#243b4a!important;
    color:#fff!important;
    border:.45pt solid #172b36!important;
    font-weight:900!important;
    text-align:center!important;
    white-space:normal!important;
    line-height:1.35!important;
  }
  #fullPrintStage td{
    padding:1.45mm 1.2mm!important;
    background:#fff!important;
    color:#111!important;
    border:.35pt solid #9ba5ac!important;
    text-align:center!important;
    vertical-align:middle!important;
    line-height:1.35!important;
  }
  #fullPrintStage tbody tr:nth-child(even) td{
    background:#f3f6f7!important;
  }
  #fullPrintStage tr{
    break-inside:avoid!important;
    page-break-inside:avoid!important;
  }

  /* Supplier report layout: stack wide tables rather than squeeze side-by-side. */
  #fullPrintStage .package-suppliers-page .si-layout{
    display:block!important;
  }
  #fullPrintStage .package-suppliers-page .si-card{
    margin-bottom:4mm!important;
    padding:0!important;
    border:0!important;
    background:#fff!important;
  }
  #fullPrintStage .package-suppliers-page .si-card-title{
    margin:0 0 2mm!important;
    color:#111!important;
    font:900 9pt Cairo!important;
  }

  /* Inventory: keep diagnostic information readable. */
  #fullPrintStage .inventory-problem-panel{
    margin-top:4mm!important;
    padding:3mm!important;
    border:.7pt solid #a8a8a8!important;
    background:#fafafa!important;
    color:#111!important;
  }
  #fullPrintStage .inventory-problem-row{
    display:grid!important;
    grid-template-columns:25mm 32mm 1fr 1fr!important;
    gap:1.5mm!important;
    margin-bottom:1.5mm!important;
    padding:2mm!important;
    border:.4pt solid #aaa!important;
    background:#fff!important;
    color:#111!important;
    font-size:6.5pt!important;
  }
  #fullPrintStage .inventory-problem-row *{
    color:#111!important;
  }

  /* Records can span as many pages as needed, with repeated header. */
  #fullPrintStage .package-records-page{
    min-height:auto!important;
    break-inside:auto!important;
    page-break-inside:auto!important;
  }
  #fullPrintStage .package-records-page .tablewrap{
    max-height:none!important;
    height:auto!important;
    overflow:visible!important;
    break-before:auto!important;
    page-break-before:auto!important;
  }
  #fullPrintStage .package-records-page table{
    font-size:6.2pt!important;
  }

  /* Dedicated reference pages keep their own chart/table layout but share typography. */
  #fullPrintStage .professional-reference-page{
    min-height:188mm!important;
    padding:0!important;
    color:#111!important;
    background:#fff!important;
  }
  #fullPrintStage .professional-reference-page *{
    box-shadow:none!important;
  }
  #fullPrintStage .professional-reference-page h2{
    color:#111!important;
  }

  /* Nothing interactive or screen-only appears in package. */
  #fullPrintStage button,
  #fullPrintStage input,
  #fullPrintStage select,
  #fullPrintStage .report-breadcrumb,
  #fullPrintStage .single-report-print-btn,
  #fullPrintStage .inventory-linked-filter,
  #fullPrintStage .si-filters,
  #fullPrintStage .filter-chips,
  #fullPrintStage .source-filter-warning,
  #fullPrintStage .sheet-filter-bridge-box{
    display:none!important;
  }
}

</style>
<style id="inventoryAndRecordsPrintFix">

/* ===== PRINT FIX: INVENTORY LIKE MONTHLY + RECORDS WHITE LANDSCAPE ===== */
@media print{
  /* Inventory report adopts the same clean report language as monthly/reference reports */
  #fullPrintStage .package-inventory-page{
    background:#fff!important;
    color:#111!important;
  }
  #fullPrintStage .package-inventory-page .package-print-head{
    border-bottom:1.5pt solid #397ea9!important;
    margin-bottom:4mm!important;
  }
  #fullPrintStage .package-inventory-page .package-print-head h2{
    color:#111!important;
    font:900 15pt Cairo!important;
  }
  #fullPrintStage .package-inventory-page .package-print-head p{
    color:#4d4d4d!important;
  }

  #fullPrintStage .package-inventory-page .inventory-kpis{
    display:grid!important;
    grid-template-columns:repeat(4,minmax(0,1fr))!important;
    gap:2.5mm!important;
    margin:0 0 4mm!important;
  }
  #fullPrintStage .package-inventory-page .inventory-kpi{
    min-height:19mm!important;
    padding:2.5mm!important;
    border:.7pt solid #8da2ae!important;
    border-radius:1.5mm!important;
    background:#f7fafb!important;
    color:#111!important;
    box-shadow:none!important;
  }
  #fullPrintStage .package-inventory-page .inventory-kpi span{
    color:#5b6770!important;
    font-size:6.5pt!important;
  }
  #fullPrintStage .package-inventory-page .inventory-kpi b{
    color:#111!important;
    font-size:11pt!important;
  }

  /* Inventory table: same professional structure as monthly tables */
  #fullPrintStage .package-inventory-page table{
    width:100%!important;
    table-layout:auto!important;
    border-collapse:collapse!important;
    font-size:6.8pt!important;
  }
  #fullPrintStage .package-inventory-page thead{
    display:table-header-group!important;
  }
  #fullPrintStage .package-inventory-page th{
    background:#243b4a!important;
    color:#fff!important;
    border:.45pt solid #172b36!important;
    padding:1.8mm 1.2mm!important;
    font-weight:900!important;
    text-align:center!important;
    white-space:normal!important;
    line-height:1.35!important;
  }
  #fullPrintStage .package-inventory-page td{
    background:#fff!important;
    color:#111!important;
    border:.35pt solid #9aa6ad!important;
    padding:1.55mm 1.2mm!important;
    text-align:center!important;
    line-height:1.35!important;
  }
  #fullPrintStage .package-inventory-page tbody tr:nth-child(even) td{
    background:#f4f7f8!important;
  }
  #fullPrintStage .package-inventory-page tr{
    break-inside:avoid!important;
    page-break-inside:avoid!important;
  }

  /* Inventory status chips are readable in print */
  #fullPrintStage .package-inventory-page .stock-badge,
  #fullPrintStage .package-inventory-page .inventory-status,
  #fullPrintStage .package-inventory-page [class*="stock-"]{
    box-shadow:none!important;
    text-shadow:none!important;
  }
  #fullPrintStage .package-inventory-page .stock-badge.ok{
    background:#e9f5ee!important;
    color:#1d5d3b!important;
    border:1px solid #9ec8ad!important;
  }
  #fullPrintStage .package-inventory-page .stock-badge.low{
    background:#fff5df!important;
    color:#7a5719!important;
    border:1px solid #d4b067!important;
  }
  #fullPrintStage .package-inventory-page .stock-badge.out,
  #fullPrintStage .package-inventory-page .stock-badge.over{
    background:#fdebec!important;
    color:#8a2f35!important;
    border:1px solid #d58f94!important;
  }

  /* Hide screen-only charts/controls that make inventory print cluttered */
  #fullPrintStage .package-inventory-page .inventory-bars,
  #fullPrintStage .package-inventory-page canvas,
  #fullPrintStage .package-inventory-page svg{
    max-height:58mm!important;
  }

  /* Problem panel becomes a clean appendix block */
  #fullPrintStage .package-inventory-page .inventory-problem-panel{
    margin-top:5mm!important;
    padding:3mm!important;
    border:.6pt solid #a7afb4!important;
    border-radius:1.5mm!important;
    background:#fafafa!important;
    color:#111!important;
    break-inside:avoid!important;
  }
  #fullPrintStage .package-inventory-page .inventory-problem-panel h3,
  #fullPrintStage .package-inventory-page .inventory-problem-panel b,
  #fullPrintStage .package-inventory-page .inventory-problem-panel span,
  #fullPrintStage .package-inventory-page .inventory-problem-panel small{
    color:#111!important;
  }

  /* ALL RECORDS: force pure white background and black text */
  #fullPrintStage .package-records-page,
  #fullPrintStage .package-records-page *{
    background-color:#fff!important;
    color:#000!important;
    box-shadow:none!important;
    text-shadow:none!important;
  }
  #fullPrintStage .package-records-page{
    width:100%!important;
    max-width:none!important;
    min-height:auto!important;
    padding:0!important;
  }
  #fullPrintStage .package-records-page .package-print-head{
    background:#fff!important;
    border-bottom:1.5pt solid #000!important;
  }
  #fullPrintStage .package-records-page .package-print-head h2,
  #fullPrintStage .package-records-page .package-print-head p,
  #fullPrintStage .package-records-page .package-print-meta{
    color:#000!important;
  }

  /* Use entire landscape printable width */
  #fullPrintStage .package-records-page .package-print-body,
  #fullPrintStage .package-records-page .tablewrap,
  #fullPrintStage .package-records-page #recordsTable{
    width:100%!important;
    max-width:none!important;
    min-width:0!important;
    margin:0!important;
    padding:0!important;
    overflow:visible!important;
  }
  #fullPrintStage .package-records-page table{
    width:100%!important;
    max-width:100%!important;
    min-width:0!important;
    table-layout:fixed!important;
    border-collapse:collapse!important;
    font-size:5.45pt!important;
  }
  #fullPrintStage .package-records-page thead{
    display:table-header-group!important;
  }
  #fullPrintStage .package-records-page th{
    background:#fff!important;
    color:#000!important;
    border:.5pt solid #000!important;
    padding:1.25mm .65mm!important;
    font-size:5.35pt!important;
    font-weight:900!important;
    line-height:1.2!important;
    white-space:normal!important;
    word-break:break-word!important;
    overflow-wrap:anywhere!important;
    text-align:center!important;
  }
  #fullPrintStage .package-records-page td{
    background:#fff!important;
    color:#000!important;
    border:.4pt solid #555!important;
    padding:1.1mm .6mm!important;
    font-size:5.35pt!important;
    line-height:1.25!important;
    white-space:normal!important;
    word-break:break-word!important;
    overflow-wrap:anywhere!important;
    text-align:center!important;
    vertical-align:middle!important;
  }
  #fullPrintStage .package-records-page tbody tr:nth-child(even) td{
    background:#fff!important;
  }
  #fullPrintStage .package-records-page tr{
    break-inside:avoid!important;
    page-break-inside:avoid!important;
  }

  /* Give important columns a little more room while still fitting one landscape width */
  #fullPrintStage .package-records-page th:nth-child(1),
  #fullPrintStage .package-records-page td:nth-child(1){width:4%!important}
  #fullPrintStage .package-records-page th:nth-child(2),
  #fullPrintStage .package-records-page td:nth-child(2){width:7%!important}
  #fullPrintStage .package-records-page th:nth-child(3),
  #fullPrintStage .package-records-page td:nth-child(3){width:8%!important}
  #fullPrintStage .package-records-page th:nth-child(4),
  #fullPrintStage .package-records-page td:nth-child(4){width:9%!important}
  #fullPrintStage .package-records-page th:nth-child(5),
  #fullPrintStage .package-records-page td:nth-child(5){width:9%!important}
  #fullPrintStage .package-records-page th:nth-child(6),
  #fullPrintStage .package-records-page td:nth-child(6){width:8%!important}
  #fullPrintStage .package-records-page th:nth-child(7),
  #fullPrintStage .package-records-page td:nth-child(7){width:9%!important}
  #fullPrintStage .package-records-page th:nth-child(8),
  #fullPrintStage .package-records-page td:nth-child(8){width:9%!important}
  #fullPrintStage .package-records-page th:nth-child(9),
  #fullPrintStage .package-records-page td:nth-child(9){width:8%!important}
  #fullPrintStage .package-records-page th:nth-child(10),
  #fullPrintStage .package-records-page td:nth-child(10){width:8%!important}
  #fullPrintStage .package-records-page th:nth-child(n+11),
  #fullPrintStage .package-records-page td:nth-child(n+11){width:auto!important}

  /* Records explanation also white/black */
  #fullPrintStage .package-records-page #recordsExplain,
  #fullPrintStage .package-records-page #recordsExplain *{
    background:#fff!important;
    color:#000!important;
    border-color:#999!important;
  }
}

</style>
<style id="inventorySameLayoutLightPrint">

/* ===== INVENTORY PRINT = SAME SEPARATE REPORT LAYOUT, LIGHT THEME ===== */
@media print{
  /* ---------- Inventory: preserve screen structure ---------- */
  #fullPrintStage .package-inventory-page{
    background:#fff!important;
    color:#15232d!important;
  }
  #fullPrintStage .package-inventory-page .package-print-body{
    width:100%!important;
    overflow:visible!important;
  }
  #fullPrintStage .package-inventory-page #inventoryReport{
    display:block!important;
    width:100%!important;
    max-width:none!important;
    margin:0!important;
    padding:0!important;
    background:#fff!important;
    color:#15232d!important;
    border:0!important;
    box-shadow:none!important;
    overflow:visible!important;
  }

  /* Keep original inventory report containers/grids instead of forcing a new print layout */
  #fullPrintStage .package-inventory-page .inventory-shell,
  #fullPrintStage .package-inventory-page .inventory-dashboard,
  #fullPrintStage .package-inventory-page .inventory-content,
  #fullPrintStage .package-inventory-page .inventory-grid,
  #fullPrintStage .package-inventory-page .inventory-main,
  #fullPrintStage .package-inventory-page .inventory-section,
  #fullPrintStage .package-inventory-page .inventory-card,
  #fullPrintStage .package-inventory-page .inventory-panel{
    visibility:visible!important;
    color:#15232d!important;
    box-shadow:none!important;
  }

  /* Light version of the same cards */
  #fullPrintStage .package-inventory-page .inventory-card,
  #fullPrintStage .package-inventory-page .inventory-panel,
  #fullPrintStage .package-inventory-page .inventory-section,
  #fullPrintStage .package-inventory-page .inventory-problem-panel{
    background:#f8fbfc!important;
    border-color:#c8d6dd!important;
    color:#15232d!important;
  }

  /* Preserve KPI arrangement from inventory page, only recolor it */
  #fullPrintStage .package-inventory-page .inventory-kpis{
    display:grid!important;
    grid-template-columns:repeat(3,minmax(0,1fr))!important;
    gap:3mm!important;
    margin:0 0 5mm!important;
  }
  #fullPrintStage .package-inventory-page .inventory-kpi{
    min-height:21mm!important;
    padding:3mm!important;
    background:#f3f8fa!important;
    border:.7pt solid #b8cbd4!important;
    border-radius:2mm!important;
    color:#15232d!important;
    box-shadow:none!important;
  }
  #fullPrintStage .package-inventory-page .inventory-kpi span,
  #fullPrintStage .package-inventory-page .inventory-kpi small,
  #fullPrintStage .package-inventory-page .inventory-kpi label{
    color:#60747f!important;
  }
  #fullPrintStage .package-inventory-page .inventory-kpi b,
  #fullPrintStage .package-inventory-page .inventory-kpi strong{
    color:#102733!important;
  }

  /* Preserve inventory bars / visual indicators but convert them to light print */
  #fullPrintStage .package-inventory-page .inventory-bars,
  #fullPrintStage .package-inventory-page .inventory-bars *{
    color:#243a46!important;
  }
  #fullPrintStage .package-inventory-page .inventory-bars{
    background:#f8fbfc!important;
    border-color:#c8d6dd!important;
  }

  /* Inventory tables: light and clear */
  #fullPrintStage .package-inventory-page .tablewrap,
  #fullPrintStage .package-inventory-page [class*="table-wrap"]{
    width:100%!important;
    max-width:none!important;
    overflow:visible!important;
    background:#fff!important;
    border-color:#bdcbd2!important;
  }
  #fullPrintStage .package-inventory-page table{
    width:100%!important;
    max-width:100%!important;
    table-layout:auto!important;
    border-collapse:collapse!important;
    background:#fff!important;
    color:#172832!important;
    font-size:6.8pt!important;
  }
  #fullPrintStage .package-inventory-page thead{
    display:table-header-group!important;
  }
  #fullPrintStage .package-inventory-page th{
    background:#e7f0f4!important;
    color:#163443!important;
    border:.55pt solid #9eb3be!important;
    padding:1.8mm 1.2mm!important;
    font-weight:900!important;
    text-align:center!important;
  }
  #fullPrintStage .package-inventory-page td{
    background:#fff!important;
    color:#172832!important;
    border:.4pt solid #b3c0c6!important;
    padding:1.55mm 1.2mm!important;
    text-align:center!important;
  }
  #fullPrintStage .package-inventory-page tbody tr:nth-child(even) td{
    background:#f5f8fa!important;
  }

  /* Light section headings */
  #fullPrintStage .package-inventory-page h2,
  #fullPrintStage .package-inventory-page h3,
  #fullPrintStage .package-inventory-page h4,
  #fullPrintStage .package-inventory-page .section-title,
  #fullPrintStage .package-inventory-page [class*="title"]{
    color:#163443!important;
  }

  /* ---------- Records: light report theme, not stark black/white ---------- */
  #fullPrintStage .package-records-page{
    background:#fff!important;
    color:#172832!important;
  }
  #fullPrintStage .package-records-page .package-print-head{
    background:#f5f9fb!important;
    border:1px solid #c3d2d9!important;
    border-right:4px solid #5f93ad!important;
    border-radius:2mm!important;
    padding:3mm 4mm!important;
    margin-bottom:4mm!important;
  }
  #fullPrintStage .package-records-page .package-print-head h2{
    color:#173746!important;
  }
  #fullPrintStage .package-records-page .package-print-head p,
  #fullPrintStage .package-records-page .package-print-meta{
    color:#60737d!important;
  }

  #fullPrintStage .package-records-page,
  #fullPrintStage .package-records-page .package-print-body,
  #fullPrintStage .package-records-page .tablewrap,
  #fullPrintStage .package-records-page #recordsTable{
    width:100%!important;
    max-width:none!important;
    background:#fff!important;
    overflow:visible!important;
  }
  #fullPrintStage .package-records-page table{
    width:100%!important;
    max-width:100%!important;
    min-width:0!important;
    table-layout:fixed!important;
    border-collapse:collapse!important;
    background:#fff!important;
    color:#172832!important;
    font-size:5.45pt!important;
  }
  #fullPrintStage .package-records-page thead{
    display:table-header-group!important;
  }
  #fullPrintStage .package-records-page th{
    background:#e7f0f4!important;
    color:#173746!important;
    border:.55pt solid #9fb3bd!important;
    padding:1.3mm .65mm!important;
    font-size:5.4pt!important;
    font-weight:900!important;
    line-height:1.2!important;
    white-space:normal!important;
    word-break:break-word!important;
    overflow-wrap:anywhere!important;
    text-align:center!important;
  }
  #fullPrintStage .package-records-page td{
    background:#fff!important;
    color:#172832!important;
    border:.4pt solid #b5c1c7!important;
    padding:1.1mm .6mm!important;
    font-size:5.35pt!important;
    line-height:1.25!important;
    white-space:normal!important;
    word-break:break-word!important;
    overflow-wrap:anywhere!important;
    text-align:center!important;
    vertical-align:middle!important;
  }
  #fullPrintStage .package-records-page tbody tr:nth-child(even) td{
    background:#f5f8fa!important;
  }

  /* Records explanation follows same light palette */
  #fullPrintStage .package-records-page #recordsExplain,
  #fullPrintStage .package-records-page #recordsExplain *{
    background:#f8fbfc!important;
    color:#263b46!important;
    border-color:#c3d1d8!important;
  }

  /* Do not print interactive controls in either report */
  #fullPrintStage .package-inventory-page button,
  #fullPrintStage .package-inventory-page input,
  #fullPrintStage .package-inventory-page select,
  #fullPrintStage .package-records-page button,
  #fullPrintStage .package-records-page input,
  #fullPrintStage .package-records-page select{
    display:none!important;
  }
}

</style>
<style id="definitiveInventoryRecordsPrint">

/* ===== DEFINITIVE INVENTORY + RECORDS PRINT ===== */
@media print{
  @page{size:A4 landscape;margin:8mm}

  /* INVENTORY */
  #fullPrintStage .inventory-direct-print{
    background:#fff!important;
    color:#17313e!important;
  }
  #fullPrintStage .inventory-direct-body{
    width:100%!important;
  }
  #fullPrintStage .inventory-print-kpis{
    display:grid!important;
    grid-template-columns:repeat(5,1fr)!important;
    gap:2.5mm!important;
    margin:0 0 5mm!important;
  }
  #fullPrintStage .inventory-print-kpi{
    min-height:18mm!important;
    padding:2.8mm!important;
    border:.6pt solid #b3c7d1!important;
    border-radius:1.6mm!important;
    background:#f3f8fa!important;
    color:#17313e!important;
  }
  #fullPrintStage .inventory-print-kpi span{
    display:block!important;color:#667b86!important;font-size:6.5pt!important;
  }
  #fullPrintStage .inventory-print-kpi b{
    display:block!important;margin-top:1.5mm!important;color:#153442!important;font:900 11pt Cairo!important;
  }
  #fullPrintStage .inventory-print-kpi small{
    display:block!important;color:#728690!important;font-size:6pt!important;
  }

  #fullPrintStage .inventory-print-layout{
    display:grid!important;
    grid-template-columns:.72fr 1.28fr!important;
    gap:4mm!important;
    align-items:start!important;
    margin-bottom:5mm!important;
  }
  #fullPrintStage .inventory-print-card{
    min-width:0!important;
    padding:3mm!important;
    border:.7pt solid #b9c9d1!important;
    border-radius:1.8mm!important;
    background:#fff!important;
    color:#17313e!important;
    break-inside:avoid!important;
  }
  #fullPrintStage .inventory-print-card h3,
  #fullPrintStage .inventory-print-diagnostics h3{
    margin:0 0 3mm!important;
    padding-bottom:2mm!important;
    border-bottom:.7pt solid #a8bec8!important;
    color:#173b4b!important;
    font:900 9.5pt Cairo!important;
  }
  #fullPrintStage .inventory-print-bars{display:grid!important;gap:1.5mm!important}
  #fullPrintStage .inventory-print-bar-row{
    display:grid!important;
    grid-template-columns:35mm 1fr 16mm!important;
    gap:2mm!important;
    align-items:center!important;
    font-size:6.3pt!important;
  }
  #fullPrintStage .inventory-print-bar-name{
    color:#2b424d!important;
    white-space:normal!important;
  }
  #fullPrintStage .inventory-print-bar-track{
    height:4mm!important;
    border:.4pt solid #b7c8d0!important;
    border-radius:2mm!important;
    background:#edf3f6!important;
    overflow:hidden!important;
  }
  #fullPrintStage .inventory-print-bar-track i{
    display:block!important;height:100%!important;background:#5a9caf!important;border-radius:2mm!important;
  }
  #fullPrintStage .inventory-print-bar-row b{
    color:#173746!important;font:900 6.4pt Arial!important;text-align:left!important;
  }

  #fullPrintStage .inventory-print-table,
  #fullPrintStage .inventory-print-diagnostics-table{
    width:100%!important;
    border-collapse:collapse!important;
    background:#fff!important;
    color:#172832!important;
    font-size:6.4pt!important;
  }
  #fullPrintStage .inventory-print-table thead,
  #fullPrintStage .inventory-print-diagnostics-table thead{
    display:table-header-group!important;
  }
  #fullPrintStage .inventory-print-table th,
  #fullPrintStage .inventory-print-diagnostics-table th{
    padding:1.6mm 1mm!important;
    background:#e5eef2!important;
    color:#173746!important;
    border:.5pt solid #9fb4be!important;
    font-weight:900!important;
    text-align:center!important;
  }
  #fullPrintStage .inventory-print-table td,
  #fullPrintStage .inventory-print-diagnostics-table td{
    padding:1.4mm 1mm!important;
    background:#fff!important;
    color:#172832!important;
    border:.4pt solid #b5c2c8!important;
    text-align:center!important;
  }
  #fullPrintStage .inventory-print-table tbody tr:nth-child(even) td,
  #fullPrintStage .inventory-print-diagnostics-table tbody tr:nth-child(even) td{
    background:#f5f8fa!important;
  }
  #fullPrintStage .inventory-print-status{
    display:inline-block!important;
    min-width:18mm!important;
    padding:1mm 1.5mm!important;
    border:.5pt solid #a8b7be!important;
    border-radius:10mm!important;
    background:#f0f4f6!important;
    color:#344d59!important;
    font-weight:900!important;
  }
  #fullPrintStage .inventory-print-status.ok{background:#eaf5ef!important;color:#286244!important;border-color:#9ec6ad!important}
  #fullPrintStage .inventory-print-status.low{background:#fff5df!important;color:#78571b!important;border-color:#d0ae67!important}
  #fullPrintStage .inventory-print-status.out,
  #fullPrintStage .inventory-print-status.over{background:#fdebec!important;color:#892f35!important;border-color:#d48f94!important}

  #fullPrintStage .inventory-print-diagnostics{
    padding:3mm!important;
    border:.7pt solid #c0cdd3!important;
    border-radius:1.8mm!important;
    background:#f8fbfc!important;
    color:#17313e!important;
    margin-bottom:4mm!important;
  }
  #fullPrintStage .inventory-print-explanation{
    padding:3mm!important;
    border-right:2.5pt solid #5b96ae!important;
    background:#f4f8fa!important;
    color:#263d48!important;
    font-size:6.8pt!important;
    line-height:1.55!important;
  }

  /* RECORDS — fully light and fit landscape width */
  #fullPrintStage .records-direct-print{
    background:#fff!important;
    color:#172832!important;
  }
  #fullPrintStage .records-direct-body{
    width:100%!important;
  }
  #fullPrintStage .records-print-meta{
    display:flex!important;
    gap:3mm!important;
    margin-bottom:4mm!important;
  }
  #fullPrintStage .records-print-meta span{
    min-width:28mm!important;
    padding:2mm 3mm!important;
    border:.6pt solid #b6c8d1!important;
    border-radius:1.5mm!important;
    background:#f3f8fa!important;
    color:#516872!important;
    font-size:6.3pt!important;
  }
  #fullPrintStage .records-print-meta b{
    color:#173746!important;
    font-size:8.5pt!important;
  }
  #fullPrintStage .records-direct-table-wrap{
    width:100%!important;
    max-width:none!important;
    overflow:visible!important;
  }
  #fullPrintStage .records-direct-table{
    width:100%!important;
    max-width:100%!important;
    min-width:0!important;
    table-layout:fixed!important;
    border-collapse:collapse!important;
    background:#fff!important;
    color:#111!important;
    font-size:5.2pt!important;
  }
  #fullPrintStage .records-direct-table thead{
    display:table-header-group!important;
  }
  #fullPrintStage .records-direct-table th{
    padding:1.15mm .55mm!important;
    background:#e5eef2!important;
    color:#173746!important;
    border:.5pt solid #9db2bc!important;
    font-size:5.2pt!important;
    font-weight:900!important;
    line-height:1.15!important;
    white-space:normal!important;
    word-break:break-word!important;
    overflow-wrap:anywhere!important;
    text-align:center!important;
  }
  #fullPrintStage .records-direct-table td{
    padding:1mm .5mm!important;
    background:#fff!important;
    color:#111!important;
    border:.35pt solid #b0bdc3!important;
    font-size:5.1pt!important;
    line-height:1.2!important;
    white-space:normal!important;
    word-break:break-word!important;
    overflow-wrap:anywhere!important;
    text-align:center!important;
    vertical-align:middle!important;
  }
  #fullPrintStage .records-direct-table tbody tr:nth-child(even) td{
    background:#f7f9fa!important;
  }
  #fullPrintStage .records-direct-table tr{
    break-inside:avoid!important;
    page-break-inside:avoid!important;
  }

  /* Allocate the landscape width deliberately across 13 columns. */
  #fullPrintStage .records-direct-table th:nth-child(1),#fullPrintStage .records-direct-table td:nth-child(1){width:7%!important}
  #fullPrintStage .records-direct-table th:nth-child(2),#fullPrintStage .records-direct-table td:nth-child(2){width:6%!important}
  #fullPrintStage .records-direct-table th:nth-child(3),#fullPrintStage .records-direct-table td:nth-child(3){width:8%!important}
  #fullPrintStage .records-direct-table th:nth-child(4),#fullPrintStage .records-direct-table td:nth-child(4){width:7%!important}
  #fullPrintStage .records-direct-table th:nth-child(5),#fullPrintStage .records-direct-table td:nth-child(5){width:7%!important}
  #fullPrintStage .records-direct-table th:nth-child(6),#fullPrintStage .records-direct-table td:nth-child(6){width:8%!important}
  #fullPrintStage .records-direct-table th:nth-child(7),#fullPrintStage .records-direct-table td:nth-child(7){width:7%!important}
  #fullPrintStage .records-direct-table th:nth-child(8),#fullPrintStage .records-direct-table td:nth-child(8){width:11%!important}
  #fullPrintStage .records-direct-table th:nth-child(9),#fullPrintStage .records-direct-table td:nth-child(9){width:7%!important}
  #fullPrintStage .records-direct-table th:nth-child(10),#fullPrintStage .records-direct-table td:nth-child(10){width:7%!important}
  #fullPrintStage .records-direct-table th:nth-child(11),#fullPrintStage .records-direct-table td:nth-child(11){width:9%!important}
  #fullPrintStage .records-direct-table th:nth-child(12),#fullPrintStage .records-direct-table td:nth-child(12){width:7%!important}
  #fullPrintStage .records-direct-table th:nth-child(13),#fullPrintStage .records-direct-table td:nth-child(13){width:9%!important}
}

</style>
<style id="unifiedOperationalReferencePrint">

/* ===== SUPPLIERS + INVENTORY = EXACT REFERENCE REPORT VISUAL SYSTEM ===== */
@media print{
  #fullPrintStage .ref-unified-operational{
    width:100%!important;
    height:198mm!important;
    box-sizing:border-box!important;
    padding:7mm 8mm 6mm!important;
    background:#fff!important;
    color:#202634!important;
    page-break-after:always!important;
    break-after:page!important;
    page-break-inside:avoid!important;
    break-inside:avoid-page!important;
    overflow:hidden!important;
    position:relative!important;
    font-family:'IBM Plex Sans Arabic',sans-serif!important;
  }

  /* Neutralize all older package-specific supplier/inventory print styles. */
  #fullPrintStage .ref-unified-operational .ref-title-band{
    display:flex!important;
    justify-content:space-between!important;
    align-items:center!important;
    gap:8mm!important;
    background:#1f2c67!important;
    color:#fff!important;
    padding:5mm 6mm!important;
    border-radius:3mm!important;
    margin:0 0 5mm!important;
    border:0!important;
  }
  #fullPrintStage .ref-unified-operational .ref-title-band h2{
    margin:0!important;color:#fff!important;font:900 17pt Cairo!important
  }
  #fullPrintStage .ref-unified-operational .ref-title-band p{
    margin:1mm 0 0!important;color:#dce3f5!important;font-size:7.5pt!important
  }
  #fullPrintStage .ref-unified-operational .ref-date{
    direction:ltr!important;text-align:left!important;color:#d6b75b!important;
    font:800 8pt 'IBM Plex Mono'!important
  }

  #fullPrintStage .ref-unified-operational .ref-kpis{
    display:grid!important;
    grid-template-columns:repeat(4,1fr)!important;
    gap:4mm!important;
    margin:0 0 5mm!important;
  }
  #fullPrintStage .ref-unified-operational .ref-kpis div{
    background:#f1f4fb!important;
    border:.7pt solid #cfd6e4!important;
    border-radius:2.5mm!important;
    padding:4mm!important;
    text-align:center!important;
    min-height:28mm!important;
  }
  #fullPrintStage .ref-unified-operational .ref-kpis strong{
    display:block!important;color:#c39a31!important;
    font:900 17pt 'IBM Plex Mono'!important;margin-bottom:2mm!important
  }
  #fullPrintStage .ref-unified-operational .ref-kpis span{
    color:#303746!important;font-size:7pt!important;font-weight:700!important
  }

  #fullPrintStage .ref-unified-operational .ref-main{
    display:grid!important;
    grid-template-columns:1.15fr .85fr!important;
    gap:5mm!important;
    height:103mm!important;
    margin:0 0 4mm!important;
  }
  #fullPrintStage .ref-unified-operational .ref-chart-panel,
  #fullPrintStage .ref-unified-operational .ref-table-panel{
    background:#f7f8fc!important;
    border:.7pt solid #cfd6e4!important;
    border-radius:2.5mm!important;
    padding:4mm!important;
    overflow:hidden!important;
  }
  #fullPrintStage .ref-unified-operational .ref-chart-panel h3{
    margin:0 0 4mm!important;color:#1f2c67!important;font:900 10pt Cairo!important
  }

  #fullPrintStage .ref-unified-operational .ref-table-panel table{
    width:100%!important;border-collapse:collapse!important;font-size:6pt!important
  }
  #fullPrintStage .ref-unified-operational .ref-table-panel th{
    background:#1f2c67!important;color:#fff!important;padding:1.6mm!important;
    text-align:center!important;border:.5pt solid #fff!important
  }
  #fullPrintStage .ref-unified-operational .ref-table-panel td{
    background:#fff!important;color:#222!important;padding:1.5mm!important;
    border:.45pt solid #d4d9e5!important;text-align:center!important
  }
  #fullPrintStage .ref-unified-operational .ref-table-panel tbody tr:nth-child(even) td{
    background:#eef1f7!important
  }

  #fullPrintStage .ref-unified-operational .ref-comment{
    min-height:17mm!important;
    background:#fff!important;color:#000!important;
    border:.8pt solid #7d8592!important;border-right:3pt solid #1f2c67!important;
    border-radius:1.5mm!important;padding:3mm 4mm!important;
    font-size:7pt!important;line-height:1.55!important;overflow:hidden!important
  }
  #fullPrintStage .ref-unified-operational .ref-comment b{color:#000!important}
  #fullPrintStage .ref-unified-operational .ref-footer{
    position:absolute!important;bottom:2.5mm!important;right:8mm!important;
    color:#687080!important;font-size:5.5pt!important
  }
}

</style>
<style id="finalReferenceA4FitNoClipping">

/* ===== FINAL A4 LANDSCAPE FIT — NO HIDDEN INFORMATION ===== */
@media print{
  @page{
    size:A4 landscape;
    margin:6mm;
  }

  /* Give every reference-style report the full printable area without clipping. */
  #fullPrintStage .ref-print-page,
  #fullPrintStage .professional-reference-page,
  #fullPrintStage .ref-unified-operational{
    width:100%!important;
    height:auto!important;
    min-height:194mm!important;
    max-height:none!important;
    padding:5mm 6mm 5mm!important;
    overflow:visible!important;
    box-sizing:border-box!important;
  }

  /* Header: same design, more compact. */
  #fullPrintStage .ref-title-band,
  #fullPrintStage .ref-unified-operational .ref-title-band{
    padding:3.6mm 4.5mm!important;
    margin-bottom:3mm!important;
    border-radius:2.2mm!important;
    gap:5mm!important;
  }
  #fullPrintStage .ref-title-band h2,
  #fullPrintStage .ref-unified-operational .ref-title-band h2{
    font-size:14pt!important;
    line-height:1.15!important;
  }
  #fullPrintStage .ref-title-band p,
  #fullPrintStage .ref-unified-operational .ref-title-band p{
    font-size:6.8pt!important;
    line-height:1.35!important;
  }
  #fullPrintStage .ref-date,
  #fullPrintStage .ref-unified-operational .ref-date{
    font-size:7pt!important;
  }

  /* KPIs: shorter, so more of the page remains for actual information. */
  #fullPrintStage .ref-kpis,
  #fullPrintStage .ref-unified-operational .ref-kpis{
    gap:2.5mm!important;
    margin-bottom:3mm!important;
  }
  #fullPrintStage .ref-kpis div,
  #fullPrintStage .ref-unified-operational .ref-kpis div{
    min-height:19mm!important;
    padding:2.5mm!important;
    border-radius:1.8mm!important;
  }
  #fullPrintStage .ref-kpis strong,
  #fullPrintStage .ref-unified-operational .ref-kpis strong{
    font-size:12.5pt!important;
    margin-bottom:1mm!important;
    line-height:1.05!important;
  }
  #fullPrintStage .ref-kpis span,
  #fullPrintStage .ref-unified-operational .ref-kpis span{
    font-size:6.2pt!important;
    line-height:1.2!important;
  }

  /* Main analytical area: no fixed height and no clipping. */
  #fullPrintStage .ref-main,
  #fullPrintStage .ref-unified-operational .ref-main{
    display:grid!important;
    grid-template-columns:1.05fr .95fr!important;
    gap:3mm!important;
    height:auto!important;
    min-height:0!important;
    max-height:none!important;
    margin-bottom:3mm!important;
    align-items:start!important;
    overflow:visible!important;
  }
  #fullPrintStage .ref-chart-panel,
  #fullPrintStage .ref-table-panel,
  #fullPrintStage .ref-unified-operational .ref-chart-panel,
  #fullPrintStage .ref-unified-operational .ref-table-panel{
    min-width:0!important;
    height:auto!important;
    min-height:0!important;
    max-height:none!important;
    padding:2.5mm!important;
    border-radius:1.7mm!important;
    overflow:visible!important;
  }
  #fullPrintStage .ref-chart-panel h3,
  #fullPrintStage .ref-unified-operational .ref-chart-panel h3{
    margin:0 0 2.3mm!important;
    font-size:8.5pt!important;
  }

  /* Bars: more compact, but fully visible. */
  #fullPrintStage .ref-bars{
    gap:1.25mm!important;
  }
  #fullPrintStage .ref-bar-row{
    grid-template-columns:31mm 1fr 18mm!important;
    gap:1.3mm!important;
    min-height:4.6mm!important;
  }
  #fullPrintStage .ref-bar-name{
    font-size:5.5pt!important;
    line-height:1.2!important;
  }
  #fullPrintStage .ref-bar-track{
    height:3.6mm!important;
  }
  #fullPrintStage .ref-bar-value{
    font-size:5.3pt!important;
  }

  /* Tables: shrink just enough to fit all visible rows without hiding them. */
  #fullPrintStage .ref-table-panel table,
  #fullPrintStage .ref-unified-operational .ref-table-panel table{
    width:100%!important;
    table-layout:fixed!important;
    font-size:5.2pt!important;
  }
  #fullPrintStage .ref-table-panel thead,
  #fullPrintStage .ref-unified-operational .ref-table-panel thead{
    display:table-header-group!important;
  }
  #fullPrintStage .ref-table-panel th,
  #fullPrintStage .ref-unified-operational .ref-table-panel th{
    padding:1.05mm .7mm!important;
    font-size:5.1pt!important;
    line-height:1.15!important;
    white-space:normal!important;
    word-break:break-word!important;
    overflow-wrap:anywhere!important;
  }
  #fullPrintStage .ref-table-panel td,
  #fullPrintStage .ref-unified-operational .ref-table-panel td{
    padding:.9mm .7mm!important;
    font-size:5.05pt!important;
    line-height:1.18!important;
    white-space:normal!important;
    word-break:break-word!important;
    overflow-wrap:anywhere!important;
  }
  #fullPrintStage .ref-table-panel tr,
  #fullPrintStage .ref-unified-operational .ref-table-panel tr{
    break-inside:avoid!important;
    page-break-inside:avoid!important;
  }

  /* Commentary block is compact but fully readable. */
  #fullPrintStage .ref-comment,
  #fullPrintStage .ref-unified-operational .ref-comment{
    min-height:0!important;
    height:auto!important;
    max-height:none!important;
    padding:2mm 3mm!important;
    font-size:6.2pt!important;
    line-height:1.38!important;
    overflow:visible!important;
    margin-bottom:3mm!important;
  }

  /* Footer stays visible but no longer overlaps content. */
  #fullPrintStage .ref-footer,
  #fullPrintStage .ref-unified-operational .ref-footer{
    position:static!important;
    display:block!important;
    margin-top:2mm!important;
    text-align:right!important;
    font-size:5pt!important;
  }

  /* Critical: remove any inherited height/max-height clipping. */
  #fullPrintStage .ref-print-page *,
  #fullPrintStage .professional-reference-page *,
  #fullPrintStage .ref-unified-operational *{
    max-height:none!important;
  }

  /* Supplier and inventory tables can have long names; allocate width sensibly. */
  #fullPrintStage .package-suppliers-page .ref-table-panel th:nth-child(1),
  #fullPrintStage .package-suppliers-page .ref-table-panel td:nth-child(1){
    width:25%!important;
  }
  #fullPrintStage .package-suppliers-page .ref-table-panel th:nth-child(6),
  #fullPrintStage .package-suppliers-page .ref-table-panel td:nth-child(6){
    width:18%!important;
  }

  #fullPrintStage .package-inventory-page .ref-table-panel th:nth-child(1),
  #fullPrintStage .package-inventory-page .ref-table-panel td:nth-child(1){
    width:34%!important;
  }

  /* Records remain landscape full-width and light; reduce vertical waste. */
  #fullPrintStage .records-direct-print{
    min-height:auto!important;
    height:auto!important;
    overflow:visible!important;
  }
  #fullPrintStage .records-direct-print .package-print-head{
    padding:2.2mm 3mm!important;
    margin-bottom:2.5mm!important;
  }
  #fullPrintStage .records-print-meta{
    margin-bottom:2.5mm!important;
  }
  #fullPrintStage .records-direct-table{
    font-size:4.9pt!important;
  }
  #fullPrintStage .records-direct-table th{
    font-size:4.9pt!important;
    padding:.9mm .45mm!important;
  }
  #fullPrintStage .records-direct-table td{
    font-size:4.8pt!important;
    padding:.8mm .45mm!important;
  }

  /* Avoid browser scaling surprises in Edge/Chrome. */
  #fullPrintStage{
    zoom:1!important;
    transform:none!important;
  }
}

</style>
<style id="onePagePerReportCompactComprehensive">

/* ===== ONE PAGE PER REPORT — PRESERVE DESIGN, INCREASE COVERAGE ===== */
@media print{
  @page{
    size:A4 landscape;
    margin:5.5mm;
  }

  /* Each analytical report = exactly one printed page */
  #fullPrintStage > .ref-print-page,
  #fullPrintStage > .professional-reference-page,
  #fullPrintStage > .ref-unified-operational{
    width:100%!important;
    height:198mm!important;
    min-height:198mm!important;
    max-height:198mm!important;
    box-sizing:border-box!important;
    padding:4.5mm 5.5mm 4mm!important;
    overflow:hidden!important;
    page-break-after:always!important;
    break-after:page!important;
    page-break-inside:avoid!important;
    break-inside:avoid-page!important;
    display:flex!important;
    flex-direction:column!important;
  }

  /* Keep the same title-band visual identity */
  #fullPrintStage .ref-title-band{
    flex:0 0 auto!important;
    padding:3.2mm 4.2mm!important;
    margin-bottom:2.5mm!important;
    border-radius:2.2mm!important;
  }
  #fullPrintStage .ref-title-band h2{
    font-size:13pt!important;
    line-height:1.12!important;
  }
  #fullPrintStage .ref-title-band p{
    font-size:6.2pt!important;
    line-height:1.25!important;
  }
  #fullPrintStage .ref-date{
    font-size:6.5pt!important;
    line-height:1.2!important;
  }

  /* KPIs stay visually identical, just more compact */
  #fullPrintStage .ref-kpis{
    flex:0 0 auto!important;
    gap:2.1mm!important;
    margin-bottom:2.5mm!important;
  }
  #fullPrintStage .ref-kpis div{
    min-height:16.5mm!important;
    padding:2mm!important;
  }
  #fullPrintStage .ref-kpis strong{
    font-size:11.5pt!important;
    margin-bottom:.7mm!important;
  }
  #fullPrintStage .ref-kpis span{
    font-size:5.8pt!important;
  }

  /* Main body uses remaining page height and never spills */
  #fullPrintStage .ref-main{
    flex:1 1 auto!important;
    display:grid!important;
    grid-template-columns:1fr 1fr!important;
    gap:2.5mm!important;
    height:auto!important;
    min-height:0!important;
    max-height:none!important;
    margin-bottom:2.2mm!important;
    overflow:hidden!important;
  }

  #fullPrintStage .ref-chart-panel,
  #fullPrintStage .ref-table-panel{
    height:100%!important;
    min-height:0!important;
    overflow:hidden!important;
    padding:2.2mm!important;
    border-radius:1.6mm!important;
  }
  #fullPrintStage .ref-chart-panel h3{
    margin:0 0 1.7mm!important;
    font-size:7.8pt!important;
  }

  /* More comprehensive bars: squeeze rows vertically */
  #fullPrintStage .ref-bars{
    gap:.8mm!important;
  }
  #fullPrintStage .ref-bar-row{
    grid-template-columns:29mm 1fr 17mm!important;
    gap:1mm!important;
    min-height:3.5mm!important;
  }
  #fullPrintStage .ref-bar-name{
    font-size:5pt!important;
    line-height:1.05!important;
  }
  #fullPrintStage .ref-bar-track{
    height:2.8mm!important;
  }
  #fullPrintStage .ref-bar-value{
    font-size:4.8pt!important;
  }

  /* More comprehensive tables, but still readable */
  #fullPrintStage .ref-table-panel table{
    width:100%!important;
    table-layout:fixed!important;
    font-size:4.7pt!important;
  }
  #fullPrintStage .ref-table-panel th{
    padding:.75mm .45mm!important;
    font-size:4.7pt!important;
    line-height:1.05!important;
    white-space:normal!important;
    word-break:break-word!important;
    overflow-wrap:anywhere!important;
  }
  #fullPrintStage .ref-table-panel td{
    padding:.62mm .45mm!important;
    font-size:4.6pt!important;
    line-height:1.05!important;
    white-space:normal!important;
    word-break:break-word!important;
    overflow-wrap:anywhere!important;
  }

  /* Commentary remains, but compact enough to guarantee one page */
  #fullPrintStage .ref-comment{
    flex:0 0 auto!important;
    min-height:0!important;
    max-height:18mm!important;
    padding:1.5mm 2.4mm!important;
    font-size:5.5pt!important;
    line-height:1.25!important;
    overflow:hidden!important;
    margin-bottom:1.5mm!important;
  }

  #fullPrintStage .ref-footer{
    flex:0 0 auto!important;
    position:static!important;
    margin-top:auto!important;
    font-size:4.5pt!important;
    line-height:1!important;
  }

  /* Keep supplier and inventory long names readable */
  #fullPrintStage .package-suppliers-page .ref-table-panel th:nth-child(1),
  #fullPrintStage .package-suppliers-page .ref-table-panel td:nth-child(1){
    width:23%!important;
  }
  #fullPrintStage .package-suppliers-page .ref-table-panel th:nth-child(6),
  #fullPrintStage .package-suppliers-page .ref-table-panel td:nth-child(6){
    width:18%!important;
  }
  #fullPrintStage .package-inventory-page .ref-table-panel th:nth-child(1),
  #fullPrintStage .package-inventory-page .ref-table-panel td:nth-child(1){
    width:33%!important;
  }

  /* Remove anything that can cause accidental extra pages */
  #fullPrintStage .ref-print-page *,
  #fullPrintStage .professional-reference-page *,
  #fullPrintStage .ref-unified-operational *{
    page-break-before:auto!important;
    page-break-after:auto!important;
    break-before:auto!important;
    break-after:auto!important;
  }
}

</style>

<style id="smartLauncherExclusiveHoverStyles">
/* Smart launcher interaction: strong but elegant illumination on hover/open */
#uiLauncherStack > button{
  position:relative;
  transition:transform .18s ease, filter .18s ease, box-shadow .22s ease, border-color .22s ease!important;
  will-change:transform,filter;
}
#uiLauncherStack > button:hover,
#uiLauncherStack > button:focus-visible{
  transform:translateX(-3px) scale(1.035)!important;
  filter:brightness(1.18) saturate(1.12)!important;
  box-shadow:0 0 0 1px rgba(255,255,255,.32),0 0 18px rgba(106,220,255,.48),0 8px 22px rgba(0,0,0,.32)!important;
  z-index:5!important;
}
#uiLauncherStack > button.launcher-active{
  transform:translateX(-3px)!important;
  filter:brightness(1.14) saturate(1.08)!important;
  box-shadow:0 0 0 1px rgba(255,255,255,.30),0 0 20px rgba(96,218,255,.52),0 8px 24px rgba(0,0,0,.34)!important;
}
#uiLauncherStack > button:hover .launcher-icon,
#uiLauncherStack > button:focus-visible .launcher-icon,
#uiLauncherStack > button.launcher-active .launcher-icon{
  filter:drop-shadow(0 0 6px rgba(255,255,255,.78));
}
#uiLauncherStack > button:hover .launcher-label,
#uiLauncherStack > button:focus-visible .launcher-label,
#uiLauncherStack > button.launcher-active .launcher-label{
  text-shadow:0 0 8px rgba(255,255,255,.42);
}
@media (prefers-reduced-motion:reduce){#uiLauncherStack > button{transition:none!important}}
</style>

<style id="strongSidebarGlow">

/* ===== Strong, clearly visible sidebar hover/active glow ===== */
.sidebar button,
.sidebar .nav-btn,
.side-nav button,
.side-nav .nav-btn,
#sidebar button,
#sidebar .nav-btn{
  transition:
    transform .18s ease,
    filter .18s ease,
    box-shadow .18s ease,
    border-color .18s ease !important;
}

.sidebar button:hover,
.sidebar .nav-btn:hover,
.side-nav button:hover,
.side-nav .nav-btn:hover,
#sidebar button:hover,
#sidebar .nav-btn:hover{
  transform: translateY(-2px) scale(1.055) !important;
  filter: brightness(1.30) saturate(1.22) !important;
  border-color: rgba(255,255,255,.95) !important;
  box-shadow:
    0 0 0 2px rgba(255,255,255,.82),
    0 0 12px 4px rgba(255,255,255,.48),
    0 0 28px 8px rgba(87,204,255,.58),
    0 8px 24px rgba(0,0,0,.38) !important;
  z-index: 20 !important;
}

/* Keep the currently opened button strongly illuminated too */
.sidebar button.active,
.sidebar .nav-btn.active,
.side-nav button.active,
.side-nav .nav-btn.active,
#sidebar button.active,
#sidebar .nav-btn.active,
.sidebar button[aria-expanded="true"],
.side-nav button[aria-expanded="true"],
#sidebar button[aria-expanded="true"]{
  filter: brightness(1.22) saturate(1.18) !important;
  border-color: #fff !important;
  box-shadow:
    0 0 0 2px rgba(255,255,255,.92),
    0 0 14px 4px rgba(255,255,255,.50),
    0 0 30px 8px rgba(82,214,255,.62),
    0 8px 24px rgba(0,0,0,.36) !important;
}

/* Stronger icon/text illumination without changing each button's base color */
.sidebar button:hover *,
.sidebar .nav-btn:hover *,
.side-nav button:hover *,
.side-nav .nav-btn:hover *,
#sidebar button:hover *,
#sidebar .nav-btn:hover *{
  text-shadow:
    0 0 4px rgba(255,255,255,1),
    0 0 10px rgba(255,255,255,.82) !important;
}

</style>

<style id="definitiveOneLauncherCSS">

/* ===== DEFINITIVE ONE-BUTTON MODE ===== */
#uiLauncherStack > button.ego-one-only-selected{
  filter:brightness(1.32) saturate(1.28)!important;
  border-color:#fff!important;
  box-shadow:
    0 0 0 2px rgba(255,255,255,.98),
    0 0 18px 6px rgba(255,255,255,.62),
    0 0 38px 11px rgba(82,214,255,.72),
    0 10px 28px rgba(0,0,0,.44)!important;
  transform:scale(1.045)!important;
  z-index:60!important;
}

</style>
<style id="centralUsersStatusStyle">

/* ===== Central Google Sheets users status ===== */
#userAdminMsg{
  min-height:22px;
  line-height:1.6;
}

</style>
</head><body><h1>مركز المقارنات — ${esc(aName)} مقابل ${esc(bName)}</h1>${bodyHtml}</body></html>`);
    w.document.close();w.focus();setTimeout(()=>w.print(),300);
  }

  function open(){
    modal()?.classList.add('open');
    modal()?.setAttribute('aria-hidden','false');
    refreshOptions(false);
    try{
      if(!allRows().length && typeof refresh==='function'){
        Promise.resolve(refresh()).finally(()=>setTimeout(()=>refreshOptions(false),150));
      }
    }catch(e){}
  }
  function close(){
    modal()?.classList.remove('open');
    modal()?.setAttribute('aria-hidden','true');
  }

  document.getElementById('comparisonsOpen')?.addEventListener('click',open);
  document.querySelectorAll('[data-compare-close]').forEach(x=>x.addEventListener('click',close));

  typeEl()?.addEventListener('change',()=>refreshOptions(false));
  aEl()?.addEventListener('change',scheduleRun);
  bEl()?.addEventListener('change',scheduleRun);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal()?.classList.contains('open'))close()});

  window.openComparisonsCenter=open;
  window.refreshComparisonsCenter=()=>{if(modal()?.classList.contains('open'))refreshOptions(true)};
})();
