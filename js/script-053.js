
(function(){
'use strict';

const states = new WeakMap();

function clean(v){
  return String(v ?? '').replace(/\s+/g,' ').trim();
}
function arabicDigitsToLatin(s){
  return String(s).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}
function numeric(v){
  const s=arabicDigitsToLatin(clean(v))
    .replace(/,/g,'')
    .replace(/[^\d.+-]/g,'');
  if(!s)return null;
  const n=Number(s);
  return Number.isFinite(n)?n:null;
}
function dateValue(v){
  const s=arabicDigitsToLatin(clean(v));
  if(!s)return null;

  let m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m){
    const t=Date.parse(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`);
    return Number.isFinite(t)?t:null;
  }
  m=s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if(m){
    const t=Date.parse(`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`);
    return Number.isFinite(t)?t:null;
  }
  return null;
}
function compare(a,b){
  const an=numeric(a), bn=numeric(b);
  if(an!==null && bn!==null) return an-bn;

  const ad=dateValue(a), bd=dateValue(b);
  if(ad!==null && bd!==null) return ad-bd;

  return clean(a).localeCompare(clean(b),'ar',{
    numeric:true,
    sensitivity:'base'
  });
}
function cellText(row,col){
  return clean(row.cells?.[col]?.innerText || row.cells?.[col]?.textContent || '');
}
function eligible(table){
  if(!table || table.dataset.egoSortOff==='1') return false;
  if(table.closest('#egoLoginGate,.user-admin-modal')) return false;
  return !!(table.tHead?.rows?.[0]?.cells?.length && table.tBodies?.[0]);
}
function sortTable(table,col){
  const tbody=table.tBodies[0];
  const rows=[...tbody.rows];
  if(rows.length<2)return;

  let st=states.get(table);
  if(!st){st={col:-1,dir:1};states.set(table,st)}

  if(st.col===col) st.dir*=-1;
  else {st.col=col;st.dir=1}

  const indexed=rows.map((row,index)=>({row,index}));
  indexed.sort((a,b)=>{
    const c=compare(cellText(a.row,col),cellText(b.row,col));
    return c ? st.dir*c : a.index-b.index;
  });

  const frag=document.createDocumentFragment();
  indexed.forEach(x=>frag.appendChild(x.row));
  tbody.appendChild(frag);

  [...table.tHead.rows[0].cells].forEach((th,i)=>{
    th.classList.toggle('ego-sort-active',i===st.col);
    th.dataset.egoSortDir=i===st.col?(st.dir>0?'asc':'desc'):'';
    th.setAttribute('aria-sort',
      i!==st.col?'none':(st.dir>0?'ascending':'descending')
    );
  });
}
function enhance(table){
  if(!eligible(table))return;
  [...table.tHead.rows[0].cells].forEach((th,col)=>{
    if(th.dataset.egoSortReady==='1')return;
    th.dataset.egoSortReady='1';
    th.classList.add('ego-sortable-th');

    // Tire Position already has its own sorting logic; leave it intact.
    if(th.hasAttribute('data-tp-sort'))return;

    th.addEventListener('click',()=>{
      sortTable(table,col);
    });
    th.setAttribute('aria-sort','none');
  });
}
function scan(root=document){
  root.querySelectorAll?.('table').forEach(enhance);
}
let queued=false;
function queueScan(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{
    queued=false;
    scan(document);
  });
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>scan(document),{once:true});
}else{
  scan(document);
}

new MutationObserver(queueScan).observe(document.documentElement,{
  childList:true,
  subtree:true
});

window.EGOSortAllTables=()=>scan(document);
})();
