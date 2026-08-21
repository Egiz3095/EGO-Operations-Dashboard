
(function(){
  function armLock(){
    try{
      var report=(document.body&&document.body.dataset.activeReport)||'home';
      if(report && report!=='home'){
        window.__EGO_FILTER_REPORT_LOCK={
          report:report,
          until:Date.now()+1600
        };
      }
    }catch(e){}
  }

  function isFilterControl(el){
    if(!el || !el.matches)return false;
    return el.matches(
      '.filters input,.filters select,'+
      '#filterSidebarBody input,#filterSidebarBody select,'+
      '#invoice,#activity,#equipment,#supplier,#tire,#tireId,#position,#from,#to,#search'
    );
  }

  document.addEventListener('pointerdown',function(e){
    if(isFilterControl(e.target))armLock();
  },true);

  document.addEventListener('change',function(e){
    if(isFilterControl(e.target))armLock();
  },true);

  document.addEventListener('input',function(e){
    if(isFilterControl(e.target))armLock();
  },true);

  document.getElementById('filterDrawerDone')?.addEventListener('click',armLock,true);
})();


(function(){
  let tireIdHeightRAF=0;
  function matchTireIdSummaryToChart(){
    cancelAnimationFrame(tireIdHeightRAF);
    tireIdHeightRAF=requestAnimationFrame(function(){
      const report=document.getElementById('reportTireId');
      if(!report)return;
      const chart=report.querySelector('.report-chart');
      const summary=report.querySelector('.report-summary');
      const tableWrap=report.querySelector('#tireIdSummary .tablewrap');
      if(!chart||!summary||!tableWrap)return;

      // On desktop, end the summary exactly at the bottom of the chart.
      if(window.innerWidth>900){
        const h=Math.max(260,Math.round(chart.getBoundingClientRect().height));
        summary.style.height=h+'px';

        const summaryTop=summary.getBoundingClientRect().top;
        const tableTop=tableWrap.getBoundingClientRect().top;
        const headerOffset=Math.max(0,tableTop-summaryTop);
        const tableHeight=Math.max(160,h-headerOffset);

        tableWrap.style.height=tableHeight+'px';
        tableWrap.style.maxHeight=tableHeight+'px';
      }else{
        summary.style.height='420px';
        tableWrap.style.height='100%';
        tableWrap.style.maxHeight='100%';
      }
    });
  }

  window.matchTireIdSummaryToChart=function(){};

  window.addEventListener('resize',matchTireIdSummaryToChart);
  document.addEventListener('click',function(e){
    if(e.target && e.target.closest && (
      e.target.closest('[data-report-target="reportTireId"]') ||
      e.target.closest('[data-nav-report="reportTireId"]') ||
      e.target.closest('#reportTireId')
    )){
      setTimeout(matchTireIdSummaryToChart,40);
      setTimeout(matchTireIdSummaryToChart,220);
    }
  },true);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){
      setTimeout(matchTireIdSummaryToChart,80);
      setTimeout(matchTireIdSummaryToChart,500);
    },{once:true});
  }else{
    setTimeout(matchTireIdSummaryToChart,80);
    setTimeout(matchTireIdSummaryToChart,500);
  }

  if(typeof ResizeObserver!=='undefined'){
    const ro=new ResizeObserver(matchTireIdSummaryToChart);
    setTimeout(function(){
      const chart=document.querySelector('#reportTireId .report-chart');
      if(chart)ro.observe(chart);
    },150);
  }
})();


(function(){
  let _tireExactRAF=0;
  function tireExactChartHeight(){
    cancelAnimationFrame(_tireExactRAF);
    _tireExactRAF=requestAnimationFrame(function(){
      const report=document.getElementById('reportTireId');
      if(!report || window.innerWidth<=900)return;
      const chart=report.querySelector('.report-chart');
      const summary=report.querySelector('.report-summary');
      const wrap=report.querySelector('#tireIdSummary .tablewrap');
      if(!chart||!summary||!wrap)return;

      summary.style.setProperty('height','auto','important');
      summary.style.setProperty('max-height','none','important');
      summary.style.setProperty('min-height','0','important');

      const h=Math.round(chart.getBoundingClientRect().height);
      if(h<100)return;

      summary.style.setProperty('height',h+'px','important');
      summary.style.setProperty('max-height',h+'px','important');
      summary.style.setProperty('min-height',h+'px','important');

      const sr=summary.getBoundingClientRect();
      const wr=wrap.getBoundingClientRect();
      const available=Math.max(120,h-Math.max(0,wr.top-sr.top));
      wrap.style.setProperty('height',available+'px','important');
      wrap.style.setProperty('max-height',available+'px','important');
    });
  }

  window.tireExactChartHeight=tireExactChartHeight;
  window.addEventListener('resize',tireExactChartHeight);
  document.addEventListener('click',function(){
    setTimeout(tireExactChartHeight,50);
    setTimeout(tireExactChartHeight,250);
  },true);
  setTimeout(tireExactChartHeight,100);
  setTimeout(tireExactChartHeight,600);

  if(typeof ResizeObserver!=='undefined'){
    const _tireExactRO=new ResizeObserver(tireExactChartHeight);
    setTimeout(function(){
      const chart=document.querySelector('#reportTireId .report-chart');
      if(chart)_tireExactRO.observe(chart);
    },200);
  }
})();


(function(){
  let _tireRow26RAF=0;
  function tireIdHeightToRow26(){
    cancelAnimationFrame(_tireRow26RAF);
    _tireRow26RAF=requestAnimationFrame(function(){
      const report=document.getElementById('reportTireId');
      if(!report)return;
      const summary=report.querySelector('.report-summary');
      const wrap=report.querySelector('#tireIdSummary .tablewrap');
      const table=wrap&&wrap.querySelector('table');
      if(!summary||!wrap||!table)return;

      const head=table.querySelector('thead');
      const rows=[...table.querySelectorAll('tbody tr')];
      if(!rows.length)return;

      // End the visible area exactly after row 26 (or the final row if fewer).
      const visibleCount=Math.min(26,rows.length);
      let target=(head?head.getBoundingClientRect().height:0);
      for(let i=0;i<visibleCount;i++){
        target+=rows[i].getBoundingClientRect().height;
      }
      // Include table borders without creating an extra visible row.
      target=Math.ceil(target+2);

      wrap.style.setProperty('height',target+'px','important');
      wrap.style.setProperty('max-height',target+'px','important');
      wrap.style.setProperty('overflow-y',rows.length>26?'auto':'hidden','important');

      const sr=summary.getBoundingClientRect();
      const wr=wrap.getBoundingClientRect();
      const summaryHeight=Math.ceil((wr.top-sr.top)+target);
      summary.style.setProperty('height',summaryHeight+'px','important');
      summary.style.setProperty('max-height',summaryHeight+'px','important');
      summary.style.setProperty('min-height',summaryHeight+'px','important');
    });
  }

  window.tireIdHeightToRow26=tireIdHeightToRow26;
  window.addEventListener('resize',tireIdHeightToRow26);
  document.addEventListener('click',function(){
    setTimeout(tireIdHeightToRow26,50);
    setTimeout(tireIdHeightToRow26,250);
  },true);
  setTimeout(tireIdHeightToRow26,120);
  setTimeout(tireIdHeightToRow26,650);

  if(typeof ResizeObserver!=='undefined'){
    const _row26ro=new ResizeObserver(tireIdHeightToRow26);
    setTimeout(function(){
      const table=document.querySelector('#tireIdSummary table');
      if(table)_row26ro.observe(table);
    },200);
  }
})();

