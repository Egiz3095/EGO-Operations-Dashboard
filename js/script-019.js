
(function(){
  function refreshAfterLogin(){
    if(!document.documentElement.classList.contains('ego-authenticated')) return;
    setTimeout(async function(){
      try{
        if(typeof window.refreshSourceSheetFilter==='function'){
          await window.refreshSourceSheetFilter(true);
        }
      }catch(e){}
      try{window.syncFilterButtonFinal?.()}catch(e){}
    },120);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',refreshAfterLogin);
  }else{
    refreshAfterLogin();
  }

  const rootObserver=new MutationObserver(function(mutations){
    for(const m of mutations){
      if(m.type==='attributes' && m.attributeName==='class'){
        if(document.documentElement.classList.contains('ego-authenticated')){
          refreshAfterLogin();
        }else{
          const n=document.getElementById('sourceFilterAppliedNotice');
          if(n){n.classList.remove('show');n.innerHTML='';}
          const w=document.getElementById('sourceFilterWarning');
          if(w){w.classList.remove('open');w.setAttribute('aria-hidden','true');}
        }
      }
    }
  });
  rootObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
})();
