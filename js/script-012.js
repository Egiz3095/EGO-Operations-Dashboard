
(function(){
  function mountProfessionalLaunchers(){
    var reportToggle=document.getElementById('reportSidebarToggle');
    var filterToggle=document.getElementById('filterSidebarToggle');
    var userToggle=document.getElementById('userAdminOpen');
    var compareToggle=document.getElementById('comparisonsOpen');
    var logoutToggle=document.getElementById('egoLogoutBtn');
    var reportDrawer=document.getElementById('reportSidebar');
    var filterDrawer=document.getElementById('filterSidebar');
    if(!reportToggle||!filterToggle||!userToggle||!compareToggle||!logoutToggle||!reportDrawer||!filterDrawer)return;

    /* Start from a guaranteed closed state before exposing the independent launchers. */
    reportDrawer.classList.remove('open');
    filterDrawer.classList.remove('open');

    var stack=document.getElementById('uiLauncherStack');
    if(!stack){
      stack=document.createElement('div');
      stack.id='uiLauncherStack';
      stack.setAttribute('aria-label','أدوات التقارير والفلاتر');
      document.body.appendChild(stack);
    }

    /* Move the real buttons (with their existing listeners) into an independent fixed stack. */
    stack.appendChild(reportToggle);
    stack.appendChild(filterToggle);
    stack.appendChild(userToggle);
    stack.appendChild(compareToggle);
    stack.appendChild(logoutToggle);

    reportToggle.title='فتح قائمة التقارير';
    filterToggle.title='فتح الفلاتر';
    userToggle.title='إدارة المستخدمين والصلاحيات';
    compareToggle.title='مركز المقارنات';

    function sync(){
      var ro=reportDrawer.classList.contains('open');
      var fo=filterDrawer.classList.contains('open');
      reportToggle.classList.toggle('launcher-open',ro);
      filterToggle.classList.toggle('launcher-open',fo);
      reportToggle.setAttribute('aria-expanded',ro?'true':'false');
      filterToggle.setAttribute('aria-expanded',fo?'true':'false');
      reportToggle.title=ro?'إغلاق قائمة التقارير':'فتح قائمة التقارير';
      filterToggle.title=fo?'إغلاق الفلاتر':'فتح الفلاتر';
    }

    new MutationObserver(sync).observe(reportDrawer,{attributes:true,attributeFilter:['class']});
    new MutationObserver(sync).observe(filterDrawer,{attributes:true,attributeFilter:['class']});

    /* Safety: only one panel can stay open at a time. */
    reportToggle.addEventListener('click',function(){
      setTimeout(function(){
        if(reportDrawer.classList.contains('open') && filterDrawer.classList.contains('open') && typeof window.closeFilterDrawer==='function'){
          window.closeFilterDrawer();
        }
        sync();
      },0);
    });
    filterToggle.addEventListener('click',function(){
      setTimeout(function(){
        if(filterDrawer.classList.contains('open') && reportDrawer.classList.contains('open') && typeof window.closeReportDrawer==='function'){
          window.closeReportDrawer();
        }
        sync();
      },0);
    });

    sync();
  }
  /* This script is placed at the end of BODY, so mount immediately to avoid any startup flicker. */
  if(document.getElementById('reportSidebarToggle')&&document.getElementById('filterSidebarToggle')) mountProfessionalLaunchers();
  else document.addEventListener('DOMContentLoaded',mountProfessionalLaunchers);
})();
