
(function(){
  const REF_INDEX={
    reportInvoice:0,reportEquipment:1,reportSupplier:2,reportTire:3,
    reportActivity:4,reportTireId:5,reportMonthly:6
  };

  function removeStages(){
    ['singlePrintStage','fullPrintStage'].forEach(function(id){var el=document.getElementById(id);if(el)el.remove()});
  }
  function clearModes(){
    document.body.classList.remove('print-mode-full','print-mode-single');
    document.body.removeAttribute('data-print-target');
    removeStages();
  }
  function prepareFilteredPrintData(){
    try{
      if(typeof render==='function')render();
      if(typeof updatePrintCover==='function')updatePrintCover();

      /* Dedicated analytical print pages for the five requested reports. */
      if(typeof renderReferencePrintReports==='function' && typeof filters==='function'){
        renderReferencePrintReports(filters());
      }

      /* Force the two requested operational reports to be current before cloning. */
      if(typeof window.renderSupplierInvoiceReport==='function')window.renderSupplierInvoiceReport();
      if(typeof window.renderInventoryReport==='function')window.renderInventoryReport();
      if(typeof window.refreshInventoryEnhancements==='function')window.refreshInventoryEnhancements();

      /* Make sure records reflect current filter state. */
      if(typeof renderTable==='function' && typeof filters==='function')renderTable(filters());
      if(typeof renderRecordsExplanation==='function' && typeof filters==='function')renderRecordsExplanation(filters());
    }catch(e){console.warn('Preparing filtered print data:',e)}
  }
  function cleanClone(node){
    if(!node)return null;
    var c=node.cloneNode(true);
    c.querySelectorAll('.report-breadcrumb,.single-report-print-btn').forEach(function(x){x.remove()});
    return c;
  }
  function buildRecordsBlock(){
    var w=document.createElement('section');w.className='stage-records';
    ['recordsTitle','recordsTable','recordsExplain'].forEach(function(id){var el=document.getElementById(id);if(el)w.appendChild(cleanClone(el))});
    return w;
  }
  function buildSingleStage(target){
    removeStages();
    var stage=document.createElement('main');stage.id='singlePrintStage';stage.setAttribute('aria-hidden','true');
    if(Object.prototype.hasOwnProperty.call(REF_INDEX,target)){
      var refs=document.querySelectorAll('#referencePrintReports .ref-print-page');
      var page=refs[REF_INDEX[target]];
      if(page)stage.appendChild(cleanClone(page));
    }else if(target==='supplierInvoicesReport'){
      var s=document.getElementById('supplierInvoicesReport');
      if(s){var sc=cleanClone(s);sc.classList.add('supplier-print-clone');stage.appendChild(sc)}
    }else if(target==='records'){
      stage.appendChild(buildRecordsBlock());
    }else{
      var any=document.getElementById(target);
      if(any && any.matches('[data-nav-report]')){
        var ac=cleanClone(any);if(ac){var ap=document.createElement('section');ap.className='auto-print-report-page';ap.appendChild(ac);stage.appendChild(ap)}
      }
    }
    document.body.appendChild(stage);
    return stage.childElementCount>0;
  }
  function buildProfessionalClonePage(sourceId,title,subtitle,pageClass){
    var source=document.getElementById(sourceId);
    if(!source)return null;
    var clone=cleanClone(source);
    if(!clone)return null;

    /* Remove interactive-only controls from package printing. */
    clone.querySelectorAll(
      'button,.report-breadcrumb,.single-report-print-btn,.inventory-linked-filter,.si-filters,'+
      '.sheet-filter-bridge-box,.source-filter-warning,.filter-chips,.global-search-open'
    ).forEach(function(x){x.remove()});

    var page=document.createElement('section');
    page.className='package-print-page '+(pageClass||'');
    page.dataset.packageReport=sourceId;

    var head=document.createElement('header');
    head.className='package-print-head';
    head.innerHTML='<div><h2>'+title+'</h2><p>'+subtitle+'</p></div>'+
      '<div class="package-print-meta">'+new Date().toLocaleDateString('en-GB')+
      '<br>'+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+'</div>';

    var body=document.createElement('div');
    body.className='package-print-body';
    body.appendChild(clone);

    page.appendChild(head);
    page.appendChild(body);
    return page;
  }



  function refSafe(v){
    return String(v??'').replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
    });
  }
  function refNum(v){
    var n=Number(v)||0;
    return n.toLocaleString('en-US',{maximumFractionDigits:2});
  }
  function refMoney(v){
    return refNum(v)+' SAR';
  }
  function refBarRows(items,total){
    var max=Math.max.apply(null,[1].concat(items.map(function(x){return Number(x[1])||0})));
    return items.slice(0,10).map(function(x){
      var value=Number(x[1])||0;
      var pct=total?value/total*100:0;
      var width=Math.max(2,value/max*100);
      return '<div class="ref-bar-row">'+
        '<div class="ref-bar-name">'+refSafe(x[0])+'</div>'+
        '<div class="ref-bar-track"><div class="ref-bar-fill" style="width:'+width.toFixed(1)+'%"></div></div>'+
        '<div class="ref-bar-value">'+pct.toFixed(1)+'%</div>'+
      '</div>';
    }).join('');
  }

  function buildProfessionalSuppliersPage(){
    var raw=[];
    try{raw=(window.getSupplierInvoiceRawData?.()||[]).slice()}catch(e){raw=[]}
    if(!raw.length){
      try{
        var cached=JSON.parse(localStorage.getItem('supplierInvoiceDataV2')||'[]');
        if(Array.isArray(cached))raw=cached;
      }catch(e){}
    }

    var main=[];
    try{main=(typeof filters==='function'?filters():(Array.isArray(DATA)?DATA:[]))||[]}catch(e){main=[]}

    var invNorm=function(v){return String(v??'').trim().replace(/\.0$/,'').replace(/\s+/g,'').toLowerCase()};
    var withdrawals=new Map(),seenIssued=new Set();
    main.forEach(function(r){
      if(!window.EGOTireOps?.isPurchaseIssue?.(r))return;
      var tid=String(r.tire_id||'').trim();
      var u=tid?('tire:'+tid.toLowerCase()):('row:'+String(r.id||'')+'|'+String(r.date||'')+'|'+String(r.invoice||''));
      if(seenIssued.has(u))return;
      seenIssued.add(u);
      var k=invNorm(r.invoice); if(!k)return;
      withdrawals.set(k,(withdrawals.get(k)||0)+1);
    });

    var supplierMap=new Map(), invoiceSet=new Set();
    raw.forEach(function(r){
      var name=String(r.supplier||'غير محدد').trim()||'غير محدد';
      var inv=String(r.invoice||'').trim(), key=invNorm(inv);
      var o=supplierMap.get(name)||{value:0,qty:0,used:0,remain:0,invoices:new Set()};
      o.value+=(Number(r.totalWithTax)||0);
      o.qty+=(Number(r.qty)||0);
      if(inv)o.invoices.add(inv);
      supplierMap.set(name,o);
      if(key)invoiceSet.add(key);
    });

    supplierMap.forEach(function(o){
      var used=0;
      o.invoices.forEach(function(inv){used+=(withdrawals.get(invNorm(inv))||0)});
      o.used=used;
      o.remain=o.qty-o.used;
    });

    var suppliers=[...supplierMap.entries()].sort(function(a,b){return b[1].value-a[1].value});
    var totalInvoice=suppliers.reduce(function(s,x){return s+x[1].value},0);
    var totalQty=suppliers.reduce(function(s,x){return s+x[1].qty},0);
    var totalUsed=suppliers.reduce(function(s,x){return s+x[1].used},0);
    var totalRemain=suppliers.reduce(function(s,x){return s+x[1].remain},0);
    var chartItems=suppliers.map(function(x){return [x[0],x[1].value]});
    var top=suppliers[0]||['—',{value:0,qty:0,used:0,remain:0,invoices:new Set()}];

    var page=document.createElement('section');
    page.className='ref-print-page professional-reference-page package-suppliers-page ref-unified-operational';
    page.style.setProperty('--ref-accent','#c39a31');

    page.innerHTML=
      '<div class="ref-title-band">'+
        '<div><h2>تقرير الموردين</h2><p>الفواتير والكميات والمسحوبات والأرصدة حسب المورد</p></div>'+
        '<div class="ref-date">'+new Date().toLocaleDateString('en-GB')+'<br>'+
          new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+'</div>'+
      '</div>'+
      '<div class="ref-kpis">'+
        '<div><strong>'+suppliers.length+'</strong><span>عدد الموردين</span></div>'+
        '<div><strong>'+invoiceSet.size+'</strong><span>عدد الفواتير</span></div>'+
        '<div><strong>'+refNum(totalQty)+'</strong><span>إجمالي الكمية</span></div>'+
        '<div><strong>'+refNum(totalRemain)+'</strong><span>إجمالي المتبقي</span></div>'+
      '</div>'+
      '<div class="ref-main">'+
        '<div class="ref-chart-panel">'+
          '<h3>توزيع قيمة الفواتير حسب المورد</h3>'+
          '<div class="ref-bars">'+(chartItems.length?refBarRows(chartItems,totalInvoice):
            '<div style="padding:12mm;text-align:center;color:#687080">لا توجد بيانات موردين متاحة حاليًا</div>')+'</div>'+
        '</div>'+
        '<div class="ref-table-panel">'+
          '<table><thead><tr>'+
            '<th>المورد</th><th>الفواتير</th><th>الكمية</th><th>المسحوب</th><th>المتبقي</th><th>القيمة</th>'+
          '</tr></thead><tbody>'+
          suppliers.slice(0,20).map(function(x){
            var n=x[0],o=x[1];
            return '<tr>'+
              '<td>'+refSafe(n)+'</td>'+
              '<td>'+o.invoices.size+'</td>'+
              '<td>'+refNum(o.qty)+'</td>'+
              '<td>'+refNum(o.used)+'</td>'+
              '<td>'+refNum(o.remain)+'</td>'+
              '<td>'+refMoney(o.value)+'</td>'+
            '</tr>';
          }).join('')+
          '</tbody></table>'+
        '</div>'+
      '</div>'+
      '<div class="ref-comment"><b>توضيح شامل:</b> يشمل التقرير <b>'+suppliers.length+
        '</b> موردًا و<b>'+invoiceSet.size+'</b> فاتورة. إجمالي الكمية <b>'+refNum(totalQty)+
        '</b>، والمسحوب <b>'+refNum(totalUsed)+'</b>، والمتبقي <b>'+refNum(totalRemain)+
        '</b>. أعلى مورد حسب قيمة الفواتير هو <b>'+refSafe(top[0])+'</b> بقيمة <b>'+refMoney(top[1].value)+
        '</b>.</div>'+
      '<div class="ref-footer">EGO — تقرير الموردين</div>';

    return page;
  }

  function buildProfessionalInventoryPage(){
    try{window.invalidateDashboardCaches?.()}catch(e){}

    var data=[];
    try{
      data=(typeof window.buildInventory==='function'?window.buildInventory():[])||[];
    }catch(e){data=[]}

    /* Fallback: build print inventory directly from supplier raw rows. */
    if(!data.length){
      var raw=[];
      try{raw=(window.getSupplierInvoiceRawData?.()||[]).slice()}catch(e){raw=[]}
      if(!raw.length){
        try{
          var cached=JSON.parse(localStorage.getItem('supplierInvoiceDataV2')||'[]');
          if(Array.isArray(cached))raw=cached;
        }catch(e){}
      }

      var main=[];
      try{main=(typeof filters==='function'?filters():(Array.isArray(DATA)?DATA:[]))||[]}catch(e){main=[]}

      var normInv=function(v){return String(v??'').trim().replace(/\.0$/,'').replace(/\s+/g,'').toLowerCase()};
      var normItem=function(v){
        return String(v??'').trim().toLowerCase()
          .replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي')
          .replace(/[×xX*]/g,'x').replace(/\s+/g,' ').replace(/[^\u0600-\u06FFa-z0-9x ]+/gi,'').trim()
      };

      var map=new Map();
      raw.forEach(function(r){
        var item=String(r.item||'غير محدد').trim()||'غير محدد';
        var inv=String(r.invoice||'').trim();
        var key=normInv(inv)+'||'+normItem(item);
        var o=map.get(key);
        if(!o){
          o={item:item,invoice:inv,incoming:0,used:0,remain:0,invoices:new Set(),suppliers:new Set(),unmatched:false};
          map.set(key,o);
        }
        o.incoming+=(Number(r.qty)||0);
        if(inv)o.invoices.add(inv);
        if(r.supplier)o.suppliers.add(r.supplier);
      });

      var seenNew=new Set();
      main.forEach(function(w){
        if(!window.EGOTireOps?.isPurchaseIssue?.(w))return;
        var tid=String(w.tire_id||'').trim();
        var uk=tid?('tire:'+tid.toLowerCase()):('row:'+String(w.id||'')+'|'+String(w.date||'')+'|'+String(w.invoice||''));
        if(seenNew.has(uk))return;
        seenNew.add(uk);
        var inv=normInv(w.invoice), tire=normItem(w.tire_type);
        if(!inv)return;
        var target=null;
        map.forEach(function(o,k){
          if(target)return;
          var parts=k.split('||'), itemKey=parts.slice(1).join('||');
          if(parts[0]===inv && (itemKey===tire || (tire&&itemKey&&Math.min(tire.length,itemKey.length)>=4&&(tire.includes(itemKey)||itemKey.includes(tire)))))target=o;
        });
        if(target)target.used+=1;
      });

      data=[...map.values()].map(function(o){o.remain=o.incoming-o.used;return o});
    }

    var cleanData=data.filter(function(x){return !x.unmatched});
    var incoming=cleanData.reduce(function(s,x){return s+(Number(x.incoming)||0)},0);
    var used=cleanData.reduce(function(s,x){return s+(Number(x.used)||0)},0);
    var parked=cleanData.reduce(function(s,x){return s+(Number(x.parkedUsed)||0)},0);
    var remain=cleanData.reduce(function(s,x){return s+(Number(x.remain)||0)},0);
    var critical=cleanData.filter(function(x){
      try{return ['low','out','over'].includes(stockStatus(x)[0])}
      catch(e){return Number(x.remain)<=0}
    }).length;

    var chartItems=cleanData.slice().sort(function(a,b){
      return Number(b.remain||0)-Number(a.remain||0)
    }).map(function(x){return [x.item||'غير محدد',Math.max(0,Number(x.remain)||0)]});
    var positiveTotal=chartItems.reduce(function(s,x){return s+x[1]},0);

    var page=document.createElement('section');
    page.className='ref-print-page professional-reference-page package-inventory-page ref-unified-operational';
    page.style.setProperty('--ref-accent','#c39a31');

    page.innerHTML=
      '<div class="ref-title-band">'+
        '<div><h2>تقرير المخزون الحالي</h2><p>الوارد والمسحوب والمتبقي وحالة المخزون حسب الصنف</p></div>'+
        '<div class="ref-date">'+new Date().toLocaleDateString('en-GB')+'<br>'+
          new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+'</div>'+
      '</div>'+
      '<div class="ref-kpis">'+
        '<div><strong>'+cleanData.length+'</strong><span>عدد الأصناف</span></div>'+
        '<div><strong>'+refNum(incoming)+'</strong><span>إجمالي الوارد</span></div>'+
        '<div><strong>'+refNum(used)+'</strong><span>خرج أول مرة</span></div>'+
        '<div><strong>'+refNum(parked)+'</strong><span>مركون مستخدم</span></div>'+
        '<div><strong>'+refNum(remain)+'</strong><span>إجمالي المتاح</span></div>'+
      '</div>'+
      '<div class="ref-main">'+
        '<div class="ref-chart-panel">'+
          '<h3>توزيع الرصيد الحالي حسب الصنف</h3>'+
          '<div class="ref-bars">'+(chartItems.length?refBarRows(chartItems,positiveTotal):
            '<div style="padding:12mm;text-align:center;color:#687080">لا توجد بيانات مخزون متاحة حاليًا</div>')+'</div>'+
        '</div>'+
        '<div class="ref-table-panel">'+
          '<table><thead><tr>'+
            '<th>الصنف</th><th>الوارد</th><th>خرج أول مرة</th><th>مركون مستخدم</th><th>إجمالي المتاح</th><th>الحالة</th>'+
          '</tr></thead><tbody>'+
          cleanData.slice().sort(function(a,b){return Number(a.remain||0)-Number(b.remain||0)})
            .slice(0,14).map(function(x){
              var st=['','—'];try{st=stockStatus(x)}catch(e){
                st=[Number(x.remain)<=0?'out':'ok',Number(x.remain)<=0?'نفد':'متوفر']
              }
              return '<tr>'+
                '<td>'+refSafe(x.item||'—')+'</td>'+
                '<td>'+refNum(x.incoming)+'</td>'+
                '<td>'+refNum(x.used)+'</td>'+
                '<td>'+refNum(x.parkedUsed||0)+'</td>'+
                '<td>'+refNum(x.remain)+'</td>'+
                '<td>'+refSafe(st[1]||'—')+'</td>'+
              '</tr>';
            }).join('')+
          '</tbody></table>'+
        '</div>'+
      '</div>'+
      '<div class="ref-comment"><b>توضيح شامل:</b> يحتوي المخزون على <b>'+cleanData.length+
        '</b> صنفًا. إجمالي الوارد <b>'+refNum(incoming)+'</b>، والذي خرج لأول تركيب <b>'+refNum(used)+
        '</b>، والمركون المستخدم <b>'+refNum(parked)+'</b>، وإجمالي المتاح <b>'+refNum(remain)+'</b>. عدد الحالات التي تحتاج انتباه حاليًا <b>'+critical+
        '</b>.</div>'+
      '<div class="ref-footer">EGO — تقرير المخزون الحالي</div>';

    return page;
  }

  function buildProfessionalRecordsPage(){
    var page=document.createElement('section');
    page.className='package-print-page package-records-page records-direct-print';
    page.dataset.packageReport='records';

    var head=document.createElement('header');
    head.className='package-print-head';
    head.innerHTML='<div><h2>جميع السجلات</h2><p>السجل التفصيلي الكامل للبيانات ضمن نطاق التقرير الحالي</p></div>'+
      '<div class="package-print-meta">'+new Date().toLocaleDateString('en-GB')+
      '<br>'+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+'</div>';
    page.appendChild(head);

    var body=document.createElement('div');
    body.className='package-print-body records-direct-body';
    var rows=[];try{rows=(typeof filters==='function'?filters():DATA)||[]}catch(e){rows=[]}

    var meta=document.createElement('div');
    meta.className='records-print-meta';
    var equipment=new Set(rows.map(function(r){return String(r.plate||'').trim()}).filter(Boolean)).size;
    var invoices=new Set(rows.map(function(r){return String(r.invoice||'').trim()}).filter(Boolean)).size;
    meta.innerHTML='<span><b>'+rows.length.toLocaleString('en-US')+'</b> سجل</span>'+
      '<span><b>'+equipment.toLocaleString('en-US')+'</b> معدة</span>'+
      '<span><b>'+invoices.toLocaleString('en-US')+'</b> فاتورة</span>';
    body.appendChild(meta);

    var wrap=document.createElement('div');
    wrap.className='records-direct-table-wrap';
    var table=document.createElement('table');
    table.className='records-direct-table';
    table.innerHTML='<thead><tr>'+
      '<th>التاريخ</th><th>اللوحة</th><th>المعدة</th><th>السائق</th><th>النشاط</th><th>الموضع</th>'+
      '<th>العملية</th><th>نوع/مقاس الكفر</th><th>هوية الكفر</th><th>العداد</th><th>المورد</th><th>رقم الفاتورة</th><th>قبل الضريبة</th>'+
      '</tr></thead><tbody></tbody>';
    var tb=table.querySelector('tbody');
    rows.forEach(function(r){
      var tr=document.createElement('tr');
      var vals=[r.date,r.plate,r.vehicle,r.driver,r.activity,r.position,r.operation,r.tire_type,r.tire_id,r.odometer,r.supplier,r.invoice,
                (Number(r.price)||0).toLocaleString('en-US',{maximumFractionDigits:2})];
      tr.innerHTML=vals.map(function(v){return '<td>'+String(v??'—').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})+'</td>'}).join('');
      tb.appendChild(tr);
    });
    if(!rows.length)tb.innerHTML='<tr><td colspan="13">لا توجد سجلات مطابقة لنطاق التقرير الحالي.</td></tr>';
    wrap.appendChild(table);
    body.appendChild(wrap);
    page.appendChild(body);
    return page;
  }

  function buildFullStage(){
    removeStages();
    var stage=document.createElement('main');
    stage.id='fullPrintStage';
    stage.className='professional-print-package';
    stage.setAttribute('aria-hidden','true');

    /* 1 — Cover */
    var cover=document.querySelector('.print-cover');
    if(cover){
      var cc=cleanClone(cover);
      cc.className='stage-cover professional-cover-page';
      stage.appendChild(cc);
    }

    /* 2..6 — Only the requested analytical reports. */
    var refs=Array.from(document.querySelectorAll('#referencePrintReports .ref-print-page'));
    [2,3,4,5,6].forEach(function(index){
      var page=refs[index];
      if(page){
        var clone=cleanClone(page);
        clone.classList.add('professional-reference-page');
        stage.appendChild(clone);
      }
    });

    /* 7 — Supplier invoices / suppliers report */
    var supplierPage=buildProfessionalSuppliersPage();
    if(supplierPage)stage.appendChild(supplierPage);

    /* 8 — Current inventory */
    var inventoryPage=buildProfessionalInventoryPage();
    if(inventoryPage)stage.appendChild(inventoryPage);

    /* 9 — All records */
    stage.appendChild(buildProfessionalRecordsPage());

    document.body.appendChild(stage);
    return stage.childElementCount>0;
  }
  function doPrint(mode,target){
    clearModes();
    prepareFilteredPrintData();
    var ok=false;
    if(mode==='single'){
      ok=buildSingleStage(target);
      if(ok){document.body.classList.add('print-mode-single');document.body.dataset.printTarget=target||''}
    }else{
      ok=buildFullStage();
      if(ok)document.body.classList.add('print-mode-full');
    }
    if(!ok){console.error('Print stage could not be built for',mode,target);return}
    /* Do not clear on focus: some browsers focus the print preview while it is still rendering. */
    requestAnimationFrame(function(){requestAnimationFrame(function(){setTimeout(function(){window.print()},40)})});
  }

  window.printFullReportPackage=function(){doPrint('full','')};
  window.printCurrentReportOnly=function(){
    var target=document.body.dataset.activeReport||'home';
    if(!target||target==='home'){window.printFullReportPackage();return}
    doPrint('single',target);
  };
  document.addEventListener('click',function(e){
    var btn=e.target.closest('[data-print-report]');if(!btn)return;
    e.preventDefault();e.stopPropagation();window.printCurrentReportOnly();
  });
  window.addEventListener('afterprint',clearModes);
})();
