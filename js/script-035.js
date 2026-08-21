
(function(){
  const gate=document.getElementById('egoLoginGate');
  if(!gate)return;
  function sync(){
    const busy =
      document.body.classList.contains('ego-auth-checking') ||
      document.documentElement.classList.contains('ego-auth-checking') ||
      !!document.querySelector('#egoLoginForm button[type="submit"][disabled]') ||
      gate.getAttribute('aria-busy')==='true';
    gate.classList.toggle('is-checking',busy);
  }
  const obs=new MutationObserver(sync);
  obs.observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:['class','disabled','aria-busy']});
  document.addEventListener('submit',function(e){
    if(e.target && e.target.id==='egoLoginForm')gate.classList.add('is-checking');
  },true);
  sync();
})();
