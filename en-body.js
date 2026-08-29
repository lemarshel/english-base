/* ==========================================================================
   Body preloader
   - Applies locale + column visibility before content paint
   ========================================================================== */
(function(){
  try{
    var body=document.body;
    var mode=localStorage.getItem('eng_mode')||'light';
    if(mode&&mode!=='light')body.classList.add(mode);
    /* en is the bare state; only ru/kk carry a class */
    var loc=localStorage.getItem('eng_locale')||'en';
    if(loc!=='en')body.classList.add('loc-'+loc);
    ['num','word','trans','ex'].forEach(function(key){
      if(localStorage.getItem('eng-hide-'+key))body.classList.add('hide-'+key);
    });
    if(localStorage.getItem('ph_hidden')!=='0')body.classList.add('ph-hidden');
  }catch(e){}
})();
