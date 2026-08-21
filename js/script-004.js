
(function(){
  const hmEsc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const hmNum=n=>Number(n)||0;
  const hmCompact=n=>{
    n=hmNum(n);const a=Math.abs(n);
    if(a>=1e6)return (n/1e6).toFixed(a>=1e7?0:1)+'M';
    if(a>=1e3)return (n/1e3).toFixed(a>=1e4?0:1)+'K';
    return n.toLocaleString('en-US',{maximumFractionDigits:1});
  };
  const hmMoney=n=>hmCompact(n)+' SAR';
  function kpis(target, items){
    const el=document.getElementById('homeMiniKpis_'+target);if(!el)return;
    el.innerHTML=items.map(([l,v])=>`<div class="home-mini-kpi"><span>${hmEsc(l)}</span><strong title="${hmEsc(v)}">${hmEsc(v)}</strong></div>`).join('');
  }
  function bars(target,items,{money=true,limit=4}={}){
    const el=document.getElementById('homeMiniChart_'+target);if(!el)return;
    const a=(items||[]).filter(x=>Number.isFinite(Number(x[1]))).slice(0,limit);
    if(!a.length){el.innerHTML='<div class="home-mini-empty">لا توجد بيانات ضمن الفلتر الحالي</div>';return}
    const max=Math.max(...a.map(x=>hmNum(x[1])),1);
    el.innerHTML='<div class="home-mini-bars">'+a.map(([name,val])=>`<div class="home-mini-row"><span class="home-mini-label" title="${hmEsc(name)}">${hmEsc(name)}</span><div class="home-mini-track"><div class="home-mini-fill" style="width:${Math.max(3,hmNum(val)/max*100)}%"></div></div><strong class="home-mini-value">${money?hmMoney(val):hmCompact(val)}</strong></div>`).join('')+'</div>';
  }
  function columns(target,items,{money=true,limit=7}={}){
    const el=document.getElementById('homeMiniChart_'+target);if(!el)return;
    const a=(items||[]).slice(-limit).filter(x=>Number.isFinite(Number(x[1])));
    if(!a.length){el.innerHTML='<div class="home-mini-empty">لا توجد بيانات ضمن الفلتر الحالي</div>';return}
    const max=Math.max(...a.map(x=>hmNum(x[1])),1);
    el.innerHTML='<div class="home-mini-columns">'+a.map(([name,val])=>`<div class="home-mini-col" title="${hmEsc(name)} — ${money?hmMoney(val):hmCompact(val)}"><i style="height:${Math.max(5,hmNum(val)/max*100)}%"></i><span>${hmEsc(name)}</span></div>`).join('')+'</div>';
  }
  function monthPairs(rows,mode='value'){
    const m=new Map();
    (rows||[]).forEach(r=>{if(!r.date)return;const d=String(r.date).slice(0,7);if(!/^\d{4}-\d{2}$/.test(d))return;m.set(d,(m.get(d)||0)+(mode==='count'?1:hmNum(r.price)))});
    return [...m.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>{const [y,mo]=k.split('-');return [`${mo}/${String(y).slice(-2)}`,v]});
  }
  function renderDimension(target,rows,key,label){
    const groups=typeof sumBy==='function'?sumBy(rows,key):[];
    const total=(rows||[]).reduce((s,r)=>s+hmNum(r.price),0);
    kpis(target,[[label,hmCompact(groups.length)],['السجلات',hmCompact((rows||[]).length)],['القيمة',hmMoney(total)]]);
    bars(target,groups,{money:true,limit:4});
  }
  window.renderHomeMiniSummaries=function(rows){
    rows=Array.isArray(rows)?rows:[];
    const maps={
      reportInvoice:new Map(),reportEquipment:new Map(),reportSupplier:new Map(),
      reportTire:new Map(),reportActivity:new Map(),reportTireId:new Map()
    };
    const fields={
      reportInvoice:'invoice',reportEquipment:'plate',reportSupplier:'supplier',
      reportTire:'tire_type',reportActivity:'activity',reportTireId:'tire_id'
    };
    const monthVal=new Map(),monthCount=new Map(),equip=new Set();
    let total=0;

    rows.forEach(r=>{
      const price=hmNum(r.price);total+=price;
      for(const [target,key] of Object.entries(fields)){
        const name=String(r[key]||'غير محدد');
        const map=maps[target];map.set(name,(map.get(name)||0)+price);
      }
      const p=String(r.plate||'').trim();if(p)equip.add(p);
      const d=String(r.date||'').slice(0,7);
      if(/^\d{4}-\d{2}$/.test(d)){
        monthVal.set(d,(monthVal.get(d)||0)+price);
        monthCount.set(d,(monthCount.get(d)||0)+1);
      }
    });

    const labels={
      reportInvoice:'الفواتير',reportEquipment:'المعدات',reportSupplier:'الموردون',
      reportTire:'الأنواع',reportActivity:'الأنشطة',reportTireId:'الهويات'
    };
    for(const target of Object.keys(fields)){
      const groups=[...maps[target].entries()].sort((a,b)=>b[1]-a[1]);
      kpis(target,[[labels[target],hmCompact(groups.length)],['السجلات',hmCompact(rows.length)],['القيمة',hmMoney(total)]]);
      bars(target,groups,{money:true,limit:4});
    }

    const pairs=map=>[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>{
      const [y,mo]=k.split('-');return [`${mo}/${String(y).slice(-2)}`,v];
    });
    const mv=pairs(monthVal);
    kpis('reportMonthly',[["الأشهر",hmCompact(mv.length)],["المسحوبات",hmCompact(rows.length)],["القيمة",hmMoney(total)]]);
    columns('reportMonthly',mv,{money:true,limit:7});

    const mc=pairs(monthCount);
    kpis('records',[["السجلات",hmCompact(rows.length)],["المعدات",hmCompact(equip.size)],["القيمة",hmMoney(total)]]);
    columns('records',mc,{money:false,limit:7});

    const scope=document.getElementById('homeMiniScope');
    if(scope){
      let text='جميع البيانات — لا توجد فلاتر نشطة';
      try{if(typeof activeFilterSummaryText==='function')text=activeFilterSummaryText()}catch(e){}
      scope.innerHTML='<b>الملخصات المصغرة حسب الفلترة الحالية:</b> '+hmEsc(text);
    }
  };

  window.renderHomeSupplierInvoicesMini=function(a){
    a=Array.isArray(a)?a:[];
    const totalValue=a.reduce((s,x)=>s+hmNum(x.invoiceTotal),0),incoming=a.reduce((s,x)=>s+hmNum(x.totalQty),0),drawn=a.reduce((s,x)=>s+hmNum(x.withdrawnQty),0),remaining=incoming-drawn;
    kpis('supplierInvoicesReport',[["الفواتير",hmCompact(a.length)],["القيمة",hmMoney(totalValue)],["المتبقي",hmCompact(remaining)]]);
    const el=document.getElementById('homeMiniChart_supplierInvoicesReport');if(!el)return;
    const vals=[['الوارد',incoming,'in'],['المسحوب',drawn,'out'],['المتبقي',Math.max(remaining,0),'rem']];
    const max=Math.max(...vals.map(x=>hmNum(x[1])),1);
    el.innerHTML='<div class="home-mini-bars si-mini-bars">'+vals.map(([name,val,cls])=>`<div class="home-mini-row"><span class="home-mini-label">${name}</span><div class="home-mini-track"><div class="home-mini-fill ${cls}" style="width:${Math.max(3,hmNum(val)/max*100)}%"></div></div><strong class="home-mini-value">${hmCompact(val)}</strong></div>`).join('')+'</div>';
  };

  function openLogoutConfirm(){
    const modal=document.getElementById('logoutConfirmModal');
    if(modal){
      modal.classList.add('open');
      modal.setAttribute('aria-hidden','false');
    }
  }
  function closeLogoutConfirm(){
    const modal=document.getElementById('logoutConfirmModal');
    if(modal){
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden','true');
    }
  }

  function init(){
    try{if(typeof filters==='function')window.renderHomeMiniSummaries(filters())}catch(e){console.warn('Home mini summaries:',e)}
    /* Supplier mini will be updated by renderSupplierInvoiceReport; keep a meaningful placeholder meanwhile. */
    const e=document.getElementById('homeMiniChart_supplierInvoicesReport');if(e&&!e.querySelector('.home-mini-row'))e.innerHTML='<div class="home-mini-empty">يتم تحميل بيانات فواتير الموردين…</div>';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
