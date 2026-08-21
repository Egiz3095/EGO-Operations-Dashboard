
(function(){
  'use strict';

  const pass=document.getElementById('egoPassword');
  const eye=document.getElementById('c4TogglePassword');
  if(eye && pass && eye.dataset.bound!=='1'){
    eye.dataset.bound='1';
    eye.addEventListener('click',function(){
      const show=pass.type==='password';
      pass.type=show?'text':'password';
      eye.textContent=show?'◌':'◉';
      eye.setAttribute('aria-label',show?'إخفاء كلمة المرور':'إظهار كلمة المرور');
    });
  }
})();
