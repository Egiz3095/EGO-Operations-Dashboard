
(function(){
  window.addEventListener('error',function(e){console.error('Page runtime error:',e.error||e.message||e)});
  window.addEventListener('unhandledrejection',function(e){console.error('Unhandled promise:',e.reason||e)});
})();
