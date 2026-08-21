
(function(){
  function textOf(el){return (el?.textContent||'').trim()}
  function updatePremiumHome(){
    const user =
      textOf(document.querySelector('.current-user-pill')) ||
      textOf(document.getElementById('currentUserName')) ||
      textOf(document.querySelector('[data-current-user]')) || 'المدير';
    const clean=user.replace(/المستخدم الحالي[:：]?/g,'').replace(/^المستخدم\s*[:：]?\s*/,'').trim() || 'المدير';
    const w=document.getElementById('premiumWelcomeUser');
    const c=document.getElementById('premiumCurrentUser');
    if(w)w.textContent=clean;
    if(c)c.textContent=clean;
    const d=document.getElementById('premiumToday');
    if(d)d.textContent=new Intl.DateTimeFormat('ar-EG',{weekday:'short',year:'numeric',month:'short',day:'numeric'}).format(new Date());
    const lu=document.getElementById('premiumLastUpdate');
    if(lu)lu.textContent=new Intl.DateTimeFormat('ar-EG',{hour:'2-digit',minute:'2-digit'}).format(new Date());
  }
  document.querySelectorAll('[data-premium-target]').forEach(btn=>{
    btn.addEventListener('click',function(){
      const target=this.getAttribute('data-premium-target');
      const existing=document.querySelector('.home-report-card[data-report-target="'+target+'"]');
      if(existing){existing.click();return}
      if(typeof window.openReportView==='function')window.openReportView(target);
    });
  });
  document.getElementById('premiumAlertsBtn')?.addEventListener('click',()=>document.getElementById('alertsOpen')?.click());
  document.getElementById('premiumRefreshBtn')?.addEventListener('click',()=>document.getElementById('smartRefresh')?.click());
  updatePremiumHome();
  setInterval(updatePremiumHome,60000);
})();
