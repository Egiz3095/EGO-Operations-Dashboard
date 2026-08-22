
(function(){
  'use strict';

  function q(id){return document.getElementById(id)}
  function escx(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function rowsNow(){
    try{if(typeof filters==='function'){var a=filters();if(Array.isArray(a))return window.EGOTireOps?.operationalRows?.(a)||a}}catch(e){}
    try{if(typeof DATA!=='undefined'&&Array.isArray(DATA))return window.EGOTireOps?.operationalRows?.(DATA)||DATA}catch(e){}
    return [];
  }
  function n(v){var x=Number(v||0);return Number.isFinite(x)?x:0}
  function fmt(v){try{return new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n(v))}catch(e){return String(v||0)}}
  function plateActivity(plate,activity){plate=String(plate||'غير محدد').trim()||'غير محدد';activity=String(activity||'').trim();return activity?plate+' - '+activity:plate}
  function grouped(rows,keys){
    var m=new Map();
    rows.forEach(function(r){
      var vals=keys.map(function(k){return String(r[k]||'غير محدد').trim()||'غير محدد'});
      var id=vals.join('\u001f'),o=m.get(id);
      if(!o){o={vals:vals,qty:0,amount:0,rows:[]};m.set(id,o)}
      o.qty++;o.amount+=n(r.price);o.rows.push(r);
    });
    return Array.from(m.values());
  }
  function shell(el,title,sub,heads,body){
    if(!el)return;
    el.innerHTML='<h3 class="safe-extra-title">'+escx(title)+'</h3><p class="safe-extra-sub">'+escx(sub)+'</p>'+
      '<div class="safe-extra-scroll"><table class="safe-extra-table"><thead><tr>'+
      heads.map(function(h){return '<th>'+escx(h)+'</th>'}).join('')+
      '</tr></thead><tbody>'+(body||'<tr><td colspan="'+heads.length+'"><div class="empty">لا توجد بيانات</div></td></tr>')+
      '</tbody></table></div>';
  }

  function invoiceDetails(rows){
    var el=q('invoiceExtraDetails');if(!el)return;

    /*
      IMPORTANT:
      rows comes from rowsNow() -> filters(), so this table always uses
      the exact same filtered dataset as the rest of the dashboard.
      If invoice 497 is selected, only rows from invoice 497 are rendered.
    */
    var arr=grouped(rows,['supplier','invoice','plate','vehicle','activity']).sort(function(a,b){
      var supplierOrder=String(a.vals[0]).localeCompare(String(b.vals[0]),'ar');
      if(supplierOrder)return supplierOrder;
      var invoiceOrder=String(a.vals[1]).localeCompare(String(b.vals[1]),'ar',{numeric:true});
      return invoiceOrder || b.amount-a.amount || b.qty-a.qty ||
        String(a.vals[2]).localeCompare(String(b.vals[2]),'ar',{numeric:true});
    });

    var visibleInvoices=[];
    rows.forEach(function(r){
      var inv=String(r.invoice||'').trim();
      if(inv && !visibleInvoices.includes(inv))visibleInvoices.push(inv);
    });

    var context=visibleInvoices.length===1
      ? 'الفاتورة المحددة: '+visibleInvoices[0]+' — الجدول مفلتر تلقائيًا على هذه الفاتورة.'
      : 'الجدول مرتبط بجميع الفلاتر الحالية، بما فيها فلتر رقم الفاتورة.';

    var total=arr.reduce(function(s,g){return s+g.amount},0)||1;

    shell(el,'تفاصيل المسحوبات لكل فاتورة',context,
      ['المورد','رقم الفاتورة','رقم السيارة','المعدة','النشاط','الكمية','المبلغ قبل الضريبة','نسبة الفاتورة'],
      arr.map(function(g){
        var supplier=g.vals[0]||'غير محدد';
        var invoice=g.vals[1]||'غير محدد';
        var plate=g.vals[2]||'غير محدد';
        var vehicle=g.vals[3]||'غير محدد';
        var activity=g.vals[4]||'غير محدد';
        return '<tr>'+
          '<td><b>'+escx(supplier)+'</b></td>'+
          '<td class="mono"><b>'+escx(invoice)+'</b></td>'+
          '<td class="mono"><b>'+escx(plate)+'</b></td>'+
          '<td><b>'+escx(vehicle)+'</b></td>'+
          '<td>'+escx(activity)+'</td>'+
          '<td>'+g.qty+'</td>'+
          '<td class="money">'+fmt(g.amount)+'</td>'+
          '<td class="money">'+((g.amount/total)*100).toFixed(1)+'%</td>'+
        '</tr>';
      }).join('')
    );
  }

  window.__refreshInvoiceWithdrawalDetails=function(rows){
    invoiceDetails(Array.isArray(rows)?rows:rowsNow());
  };

  function supplierDetails(rows){
    var el=q('supplierExtraDetails');if(!el)return;

    /* Same logic as the equipment summary:
       every name in its own column, and show all matching rows vertically. */
    var arr=grouped(rows,['supplier','plate','vehicle','activity']).sort(function(a,b){
      var supplierOrder=String(a.vals[0]).localeCompare(String(b.vals[0]),'ar');
      if(supplierOrder)return supplierOrder;
      var plateOrder=String(a.vals[1]).localeCompare(String(b.vals[1]),'ar',{numeric:true});
      return plateOrder || b.amount-a.amount;
    });

    shell(
      el,
      'تفاصيل الإنفاق حسب المورد',
      'يعرض جميع السيارات والمعدات والأنشطة المرتبطة بكل مورد ضمن الفلاتر الحالية.',
      ['المورد','رقم السيارة','المعدة','النشاط','الكمية','المبلغ قبل الضريبة'],
      arr.map(function(g){
        return '<tr>'+
          '<td><b>'+escx(g.vals[0]||'غير محدد')+'</b></td>'+
          '<td class="mono"><b>'+escx(g.vals[1]||'غير محدد')+'</b></td>'+
          '<td>'+escx(g.vals[2]||'غير محدد')+'</td>'+
          '<td>'+escx(g.vals[3]||'غير محدد')+'</td>'+
          '<td>'+g.qty+'</td>'+
          '<td class="money">'+fmt(g.amount)+'</td>'+
        '</tr>';
      }).join('')
    );
  }

  function top(rows,key){
    var m=new Map();
    rows.forEach(function(r){var k=String(r[key]||'غير محدد').trim()||'غير محدد',o=m.get(k)||{qty:0,amount:0};o.qty++;o.amount+=n(r.price);m.set(k,o)});
    var a=Array.from(m.entries()).sort(function(x,y){return y[1].qty-x[1].qty || y[1].amount-x[1].amount});
    return a[0]||['—',{qty:0,amount:0}];
  }
  function tireInsights(rows){
    var el=q('tireExtraInsights');if(!el)return;
    var types=[];
    rows.forEach(function(r){var t=String(r.tire_type||'').trim();if(t&&!types.includes(t))types.push(t)});
    var data=types.map(function(t){
      var rs=rows.filter(function(r){return String(r.tire_type||'')===t});
      return {t:t,rs:rs,act:top(rs,'activity'),car:top(rs,'plate'),amount:rs.reduce(function(s,r){return s+n(r.price)},0)};
    }).sort(function(a,b){return b.rs.length-a.rs.length || b.amount-a.amount});
    shell(el,'مؤشرات الاستهلاك حسب نوع / مقاس الكفر','أكثر نشاط وأكثر سيارة استهلاكًا لكل نوع.',
      ['نوع الكفر','الكمية','أكثر الأنشطة استهلاكًا','أكثر السيارات استهلاكًا','المبلغ'],
      data.map(function(x){return '<tr><td><b>'+escx(x.t)+'</b></td><td>'+x.rs.length+'</td><td>'+escx(x.act[0])+'<span class="safe-note">'+x.act[1].qty+' كفر</span></td><td>'+escx(x.car[0])+'<span class="safe-note">'+x.car[1].qty+' كفر</span></td><td class="money">'+fmt(x.amount)+'</td></tr>'}).join('')
    );
  }

  function dateValue(v){var d=new Date(String(v||'')+'T00:00:00');return Number.isNaN(d.getTime())?8640000000000000:d.getTime()}
  function equipmentSummary(rows){
    if(typeof renderCompactSummary==='function'){
      renderCompactSummary('#equipmentSummary',rows,'plate','المعدة');
    }
  }

  function renderExtras(){
    var rows=rowsNow();
    invoiceDetails(rows);supplierDetails(rows);tireInsights(rows);equipmentSummary(rows);
  }

  document.addEventListener('click',function(e){
    var item=e.target.closest&&e.target.closest('#alertsList .alert-item');
    if(item){
      document.querySelectorAll('#alertsList .alert-item').forEach(function(x){x.classList.remove('safe-selected')});
      item.classList.add('safe-selected');
      var title=(item.querySelector('b')&&item.querySelector('b').textContent||'تنبيه').trim();
      var detail=(item.querySelector('small')&&item.querySelector('small').textContent||'').trim();
      var target=item.getAttribute('data-alert-target')||'home';
      var box=q('safeAlertDetails');
      if(box)box.innerHTML='<div class="safe-alert-card"><span class="safe-label">تفاصيل المشكلة</span><h3>'+escx(title)+'</h3><span class="safe-label">الوصف</span><p>'+escx(detail||'لا توجد تفاصيل إضافية.')+'</p><span class="safe-label">الإجراء المقترح</span><p>راجع التقرير المرتبط لمعرفة السجلات المسببة للتنبيه.</p><button type="button" class="btn gold" data-safe-alert-report="'+escx(target)+'">فتح التقرير المرتبط</button></div>';
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    var open=e.target.closest&&e.target.closest('[data-safe-alert-report]');
    if(open){
      var target=open.getAttribute('data-safe-alert-report')||'home';
      var nav=document.querySelector('.report-nav-item[data-report-target="'+target+'"]');
      if(nav)nav.click();
    }
  },true);

  document.addEventListener('change',function(e){
    if(!e.target)return;
    if(e.target.matches && (
      e.target.matches('.filters select,.filters input') ||
      e.target.closest('#filterSidebarBody') ||
      (e.target.id||'')==='invoice' ||
      (e.target.id||'')==='filterInvoice' ||
      e.target.name==='invoice'
    )){
      try{if(typeof invalidateDashboardCaches==='function')invalidateDashboardCaches()}catch(_){}
      var activeBefore=(document.body.dataset.activeReport||'home');
      if(activeBefore!=='home'){
        window.__EGO_FILTER_REPORT_LOCK={report:activeBefore,until:Date.now()+1600};
      }
      setTimeout(function(){invoiceDetails(rowsNow())},20);
      setTimeout(function(){invoiceDetails(rowsNow())},180);
      setTimeout(function(){
        /* Final guard after delayed observers/permission refreshes finish. */
        if(activeBefore!=='home' &&
           document.body.dataset.activeReport!==activeBefore &&
           typeof window.openReportView==='function'){
          window.openReportView(activeBefore,{noScroll:true,noHash:true});
        }
      },700);
    }
  },true);

  document.addEventListener('input',function(e){
    if(!e.target || !e.target.matches)return;
    if(e.target.matches('.filters input,.filters select,#filterSidebarBody input,#filterSidebarBody select')){
      try{if(typeof invalidateDashboardCaches==='function')invalidateDashboardCaches()}catch(_){}
      setTimeout(function(){invoiceDetails(rowsNow())},80);
    }
  },true);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){
      setTimeout(renderExtras,700);
      setTimeout(renderExtras,1800);
    });
  }else{
    setTimeout(renderExtras,700);
    setTimeout(renderExtras,1800);
  }
})();
