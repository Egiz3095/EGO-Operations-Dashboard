
(function(){
  'use strict';

  const norm=v=>String(v??'').trim().replace(/\.0$/,'').replace(/\s+/g,'').toLowerCase();

  function rowsNow(){
    try{return typeof filters==='function'?filters():(Array.isArray(DATA)?DATA:[])}
    catch(e){return Array.isArray(DATA)?DATA:[]}
  }
  function supplierInvoices(){
    try{
      const a=typeof window.getSupplierInvoiceData==='function'?window.getSupplierInvoiceData():[];
      return Array.isArray(a)?a:[];
    }catch(e){return []}
  }
  function esc2(v){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmt(v){
    const n=Number(v)||0;
    return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  }

  function dataset(rows){
    const movement=new Map();
    rows.forEach(r=>{
      const k=norm(r.invoice); if(!k)return;
      let o=movement.get(k);
      if(!o){o={invoice:String(r.invoice||''),supplier:String(r.supplier||''),value:0};movement.set(k,o)}
      o.value+=Number(r.price)||0;
      if(!o.supplier&&r.supplier)o.supplier=String(r.supplier);
    });

    const all=new Map();
    supplierInvoices().forEach(x=>{
      const k=norm(x.invoice);if(!k)return;
      if(!all.has(k))all.set(k,{
        invoice:String(x.invoice||''),
        supplier:String(x.supplier||''),
        value:0
      });
    });
    movement.forEach((m,k)=>{
      let o=all.get(k);
      if(!o){o={invoice:m.invoice,supplier:m.supplier,value:0};all.set(k,o)}
      o.value=m.value;
      if(!o.supplier)o.supplier=m.supplier;
    });

    return [...all.values()]
      .sort((a,b)=>b.value-a.value || String(a.invoice).localeCompare(String(b.invoice),'ar',{numeric:true}));
  }

  window.renderProfessionalInvoiceChart=function(rows){
    const el=document.getElementById('invoiceChart');
    if(!el)return;
    const data=dataset(Array.isArray(rows)?rows:rowsNow());
    const max=Math.max(...data.map(x=>Number(x.value)||0),1);
    const zeroCount=data.filter(x=>(Number(x.value)||0)===0).length;

    el.innerHTML=`
      <div class="invoice-professional-chart">
        <div class="invoice-chart-head">
          <strong>مقارنة الإنفاق حسب الفاتورة</strong>
          <small>${data.length} فاتورة — ${zeroCount} بدون حركة</small>
        </div>
        ${data.map((x,i)=>{
          const val=Number(x.value)||0;
          const width=val>0?Math.max(2,(val/max)*100):0;
          const label=x.supplier?`فاتورة ${x.supplier} رقم ${x.invoice}`:`فاتورة رقم ${x.invoice}`;
          const cls=val===0?'zero':(i===0?'top1':i===1?'top2':i===2?'top3':'');
          return `<div class="invoice-pro-row ${cls}">
            <div class="invoice-pro-label"><span class="invoice-pro-rank">${i+1}</span>${esc2(label)}</div>
            <div class="invoice-pro-track"><div class="invoice-pro-bar" style="width:${width}%"></div></div>
            <div class="invoice-pro-value ${val===0?'zero':''}">${val===0?'0.00':fmt(val)}</div>
          </div>`;
        }).join('')}
        <div class="invoice-chart-legend">
          <span class="active"><i></i> عليها حركة</span>
          <span class="inactive"><i></i> بدون حركة</span>
        </div>
      </div>`;
  };

  function refresh(){
    if((document.body?.dataset?.activeReport||'')==='reportInvoice'){
      window.renderProfessionalInvoiceChart(rowsNow());
    }
  }

  const target=document.getElementById('invoiceChart');
  if(target && window.MutationObserver){
    let busy=false;
    new MutationObserver(()=>{
      if(busy || (document.body?.dataset?.activeReport||'')!=='reportInvoice')return;
      busy=true;
      requestAnimationFrame(()=>{
        window.renderProfessionalInvoiceChart(rowsNow());
        setTimeout(()=>busy=false,0);
      });
    }).observe(target,{childList:true});
  }
  setTimeout(refresh,1000);
  window.addEventListener('focus',()=>setTimeout(refresh,60));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(refresh,60)});
})();
