
(function(){
  function setDeviceClass(){
    var w=window.innerWidth||document.documentElement.clientWidth||1200;
    var c=w<=520?'device-mobile':(w<=768?'device-tablet-portrait':(w<=1200?'device-tablet':'device-desktop'));
    document.documentElement.classList.remove('device-mobile','device-tablet-portrait','device-tablet','device-desktop');
    document.documentElement.classList.add(c);
  }
  setDeviceClass();
  window.addEventListener('resize', setDeviceClass, {passive:true});
  window.addEventListener('orientationchange', setDeviceClass, {passive:true});
})();
