/* ==========================================================================
   Locale helpers — shared by both module scopes in this file.
   The active locale lives on <body> as loc-ru / loc-kk; a bare body means en.
   ========================================================================== */
function localeCode(){
  var b = document.body;
  if(!b) return 'en';
  if(b.classList.contains('loc-ru')) return 'ru';
  if(b.classList.contains('loc-kk')) return 'kk';
  return 'en';
}
/* Label lookup: active locale, then en, then the caller's fallback. */
function T(key, fallback){
  var I = window.I18N || {};
  var v = (I[localeCode()] || {})[key];
  if(v == null) v = (I.en || {})[key];
  return v == null ? (fallback == null ? key : fallback) : v;
}
/* Which translation the active locale reads: Kazakh, Russian, or the English
   definition. */
function transSel(){
  var c = localeCode();
  return c === 'kk' ? '.trans-kk' : c === 'ru' ? '.trans-ru' : '.trans-def';
}
/* The alpha filter sorts on the translation in ru/kk, but on the headword
   itself in en — A–Z over English definitions would be useless. */
function alphaAttr(){
  var c = localeCode();
  return c === 'kk' ? 'data-kk' : c === 'ru' ? 'data-ru' : 'data-key';
}
window.localeCode = localeCode;
window.T = T;

(function(){
/* ==========================================================================
   English Base — Application logic
   - Reads the embedded vocabulary table
   - Handles search, filters, audio, study, quiz, exports
   - Keeps UI state in localStorage
   ========================================================================== */
"use strict";
var LS={L:'eng_learned',F:'eng_fam',M:'eng_mode',P:'eng_prefs'};
var lT=document.getElementById('learned-tbody'),lS=document.getElementById('learned-section');
var fT=document.getElementById('fam-tbody'),fS=document.getElementById('fam-section');

/* stamp origin + build wordMap */
/* ===== Word map index (Hanzi -> row) ===== */
var wMap={};
document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody)').forEach(function(tb){
  for(var i=0;i<tb.rows.length;i++){
    var tr=tb.rows[i];tr.dataset.orig=tb.id;
    var z=tr.querySelector('.wd');if(z)wMap[z.textContent.trim()]=tr;
  }
});

/* ===== All rows cache (includes rows moved to learned/fam later) ===== */
var _allRows = Array.prototype.slice.call(
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr')
);
window._allRows = _allRows;
var _allTbodies = Array.prototype.slice.call(
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody)')
);
window._allTbodies = _allTbodies;
function getAllTbodies(){ return _allTbodies.slice(); }
function getMainRows(){
  return _allRows.filter(function(tr){
    var tb = tr.closest('tbody');
    if(!tb) return false;
    return tb.id !== 'learned-tbody' && tb.id !== 'fam-tbody';
  });
}
window.getMainRows = getMainRows;
window.getAllTbodies = getAllTbodies;

/* ── Script loader (lazy deps) ─────────────────────────────────── */
var _cdxScriptPromises = {};
function loadScriptOnce(src){
  if(_cdxScriptPromises[src]) return _cdxScriptPromises[src];
  _cdxScriptPromises[src] = new Promise(function(resolve,reject){
    var s=document.createElement('script');
    s.src=src;
    s.async=true;
    s.onload=function(){ resolve(); };
    s.onerror=function(){ reject(); };
    document.head.appendChild(s);
  });
  return _cdxScriptPromises[src];
}

function renum(tb){for(var i=0;i<tb.rows.length;i++){var c=tb.rows[i].querySelector('.rownum');if(c)c.textContent=i+1;}}
function updVis(){
  lS.style.display=lT.rows.length?'block':'none';
  fS.style.display=fT.rows.length?'block':'none';
  document.getElementById('st-lrn').textContent=lT.rows.length;
  document.getElementById('st-fam').textContent=fT.rows.length;
}
/* ===== Persist learned/familiar state ===== */
function save(){
  var l=[],f=[];
  for(var i=0;i<lT.rows.length;i++){var z=lT.rows[i].querySelector('.wd');if(z)l.push(z.textContent.trim());}
  for(var i=0;i<fT.rows.length;i++){var z=fT.rows[i].querySelector('.wd');if(z)f.push(z.textContent.trim());}
  localStorage.setItem(LS.L,JSON.stringify(l));localStorage.setItem(LS.F,JSON.stringify(f));
  if(typeof updateCefrStats==='function') updateCefrStats();
}

/* ===== Restore state from localStorage ===== */
/* restore */
(function(){
  var l=[],f=[];
  try{l=JSON.parse(localStorage.getItem(LS.L)||'[]');}catch(e){}
  try{f=JSON.parse(localStorage.getItem(LS.F)||'[]');}catch(e){}
  var aff={};
  l.forEach(function(w){var tr=wMap[w];if(!tr)return;var cb=tr.querySelector('.learn-cb');if(cb)cb.checked=true;if(tr.dataset.orig)aff[tr.dataset.orig]=1;lT.appendChild(tr);delete wMap[w];});
  f.forEach(function(w){var tr=wMap[w];if(!tr)return;var cb=tr.querySelector('.fam-cb');if(cb)cb.checked=true;if(tr.dataset.orig)aff[tr.dataset.orig]=1;fT.appendChild(tr);delete wMap[w];});
  Object.keys(aff).forEach(function(id){var tb=document.getElementById(id);if(tb)renum(tb);});
  renum(lT);renum(fT);updVis();
})();

/* ── Finalize initial render (avoid staged flashes) ───────────────────── */
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){
    if(document.body){ document.body.classList.remove('preload'); }
    document.documentElement.classList.remove('preload');
    var pf = document.getElementById('preload-font');
    if(pf && pf.parentNode) pf.parentNode.removeChild(pf);
  }, 0);
});

/* ===== Checkbox delegation (learned/familiar) ===== */
/* checkbox delegation */
document.body.addEventListener('change',function(e){
  var cb=e.target,tr=cb.closest('tr');if(!tr)return;
  var isL=cb.classList.contains('learn-cb'),isF=cb.classList.contains('fam-cb');
  if(!isL&&!isF)return;
  var prev=tr.parentElement,orig=tr.dataset.orig;
  var lcb=tr.querySelector('.learn-cb'),fcb=tr.querySelector('.fam-cb');
  if(isL&&cb.checked){
    if(fcb)fcb.checked=false;
    lT.appendChild(tr);
    if(prev&&prev!==lT)renum(prev);renum(lT);
  }else if(isL){
    var o=orig?document.getElementById(orig):null;
    if(!o && orig) o = _allTbodies.find(function(t){ return t.id === orig; });
    if(o){o.appendChild(tr);renum(o);}renum(lT);
  }else if(isF&&cb.checked){
    if(lcb)lcb.checked=false;
    fT.appendChild(tr);
    if(prev&&prev!==fT)renum(prev);renum(fT);
  }else{
    var o=orig?document.getElementById(orig):null;
    if(!o && orig) o = _allTbodies.find(function(t){ return t.id === orig; });
    if(o){o.appendChild(tr);renum(o);}renum(fT);
  }
  updVis();save();
});

/* stress marking on the IPA */
function capFirstLetter(token){
  for(var i=0;i<token.length;i++){
    var ch = token[i];
    if(/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(ch)){
      return token.slice(0,i) + ch.toLocaleUpperCase() + token.slice(i+1);
    }
  }
  return token;
}
function escHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
/* Highlights the syllable carrying primary stress (the one after ˈ) and dims
   secondary stress (after ˌ), so the accent is readable at a glance. */
function markStress(){
  document.querySelectorAll('.ipa,.ex-ipa').forEach(function(el){
    if(el.dataset.stressed) return;
    var raw = el.textContent.replace(/\s+/g,' ').trim();
    if(!raw){ el.textContent=''; el.dataset.stressed='1'; return; }
    el.innerHTML = escHtml(raw)
      .replace(/ˈ([^ˈˌ\s\/\]]+)/g, 'ˈ<span class="ipa-s1">$1</span>')
      .replace(/ˌ([^ˈˌ\s\/\]]+)/g, 'ˌ<span class="ipa-s2">$1</span>');
    el.dataset.stressed = '1';
  });
}
document.addEventListener('DOMContentLoaded', markStress);
window.markStress = markStress;

/* CEFR level badge in word cells */
var CEFR_LEVELS = ['a1','a2','b1','b2','c1','c2'];
var CEFR_ORDER  = {a1:1, a2:2, b1:3, b2:4, c1:5, c2:6};
var CEFR_COLORS = {a1:'#27ae60', a2:'#2ecc71', b1:'#f39c12',
                   b2:'#e67e22', c1:'#e74c3c', c2:'#8e44ad'};
function cefrOf(tr){ return (tr.getAttribute('data-cefr')||'').toLowerCase(); }
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr').forEach(function(tr){
    var lvl = cefrOf(tr);
    if(!CEFR_ORDER[lvl]) return;
    var wc = tr.querySelector('.wordcell, td[data-col="word"]');
    if(!wc) return;
    var badge = document.createElement('span');
    badge.className = 'cefr-badge cefr-'+lvl;
    badge.textContent = lvl.toUpperCase();
    wc.appendChild(badge);
  });
  updateCefrStats();
});
function updateCefrStats(){
  var stats = {}, lrn = {};
  CEFR_LEVELS.forEach(function(l){ stats[l]=0; lrn[l]=0; });
  _allRows.forEach(function(tr){
    var lvl = cefrOf(tr);
    if(!CEFR_ORDER[lvl]) return;
    stats[lvl]++;
    if(tr.querySelector('.learn-cb:checked')) lrn[lvl]++;
  });
  var bar = document.getElementById('cefr-stats-bar');
  if(!bar) return;
  var html = '';
  CEFR_LEVELS.forEach(function(l){
    if(!stats[l]) return;
    var pct = Math.round(lrn[l]/stats[l]*100);
    var up = l.toUpperCase();
    html += '<span class="cefr-prog" title="'+up+': '+lrn[l]+'/'+stats[l]+' learned ('+pct+'%)">'
      +'<span class="cefr-badge cefr-'+l+'">'+up+'</span>'
      +'<span class="cefr-prog-bar"><span class="cefr-prog-fill" style="width:'+pct+'%;background:'+CEFR_COLORS[l]+'"></span></span>'
      +'<span style="color:#999">'+lrn[l]+'/'+stats[l]+'</span>'
      +'</span>';
  });
  bar.innerHTML = html || '';
}

/* search */
function stripTones(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
var sTimer=null;
function doSearch(){
  var q=document.getElementById('search-input').value.trim();
  var lang=document.getElementById('search-lang').value;
  var qn=lang==='ipa'?stripTones(q):q.toLowerCase();
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr').forEach(function(tr){
    if(!q){tr.classList.remove('sr-hide');return;}
    var txt='',cells=tr.cells;
    if(lang==='wd'){var z=cells[3]&&cells[3].querySelector('.wd');txt=z?z.textContent.trim():'';}
    else if(lang==='ipa'){var p=cells[3]&&cells[3].querySelector('.ipa');txt=p?stripTones(p.textContent.trim()):'';}
    else{txt=cells[4]?cells[4].textContent.toLowerCase():'';}
    tr.classList.toggle('sr-hide',!txt.includes(qn));
  });
}
document.getElementById('search-input').addEventListener('input',function(){clearTimeout(sTimer);sTimer=setTimeout(doSearch,130);});
document.getElementById('search-lang').addEventListener('change',doSearch);
document.getElementById('search-clear').addEventListener('click',function(){document.getElementById('search-input').value='';doSearch();});

/* keyboard shortcuts */
document.addEventListener('keydown', function(e){
  // Don't fire when typing in inputs
  if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='TEXTAREA') return;
  // Don't fire when study overlay is open
  var so = document.getElementById('study-overlay');
  if(so && so.style.display!=='none') return;
  if(e.key==='/' || e.key==='f' && (e.ctrlKey||e.metaKey)){
    e.preventDefault();
    var inp = document.getElementById('search-input');
    if(inp){ inp.focus(); inp.select(); }
  } else if(e.key==='Escape'){
    var inp = document.getElementById('search-input');
    if(inp && inp.value){ inp.value=''; if(typeof cdxDoSearch==='function') cdxDoSearch(); }
  }
});

/* mode */
function setMode(m){
  document.body.className=document.body.className.replace(/\b(light|dark|sepia)\b/g,'').trim();
  if(m!=='light')document.body.classList.add(m);
  document.querySelectorAll('.mode-btn').forEach(function(b){b.classList.toggle('active',b.dataset.mode===m);});
  localStorage.setItem(LS.M,m);
}
document.querySelectorAll('.mode-btn').forEach(function(b){b.addEventListener('click',function(){setMode(this.dataset.mode);});});
setMode(localStorage.getItem(LS.M)||'light');

/* font controls */
var prefs={};try{prefs=JSON.parse(localStorage.getItem(LS.P)||'{}');}catch(e){}
var dynSt=document.createElement('style');dynSt.id='dyn-font';document.head.appendChild(dynSt);
function applyF(){
  var fz=document.getElementById('font-word').value,sz=document.getElementById('size-word').value;
  var fp=document.getElementById('font-ipa').value,sp=document.getElementById('size-ipa').value;
  var fr=document.getElementById('font-trans').value,sr=document.getElementById('size-trans').value;
  document.getElementById('sv-word').textContent=sz+'px';
  document.getElementById('sv-ipa').textContent=sp+'px';
  document.getElementById('sv-trans').textContent=sr+'px';
  var css='';
  if(fz)css+='.wd{font-family:'+fz+',sans-serif!important}';
  css+='.wd{font-size:'+sz+'px!important}';
  if(fp)css+='.ipa,.ex-ipa{font-family:'+fp+',sans-serif!important}';
  css+='.ipa,.ex-ipa{font-size:'+sp+'px!important}';
  if(fr)css+='td.trans-cell{font-family:'+fr+',sans-serif!important}';
  css+='td.trans-cell{font-size:'+sr+'px!important}';
  dynSt.textContent=css;
  prefs={fz:fz,sz:sz,fp:fp,sp:sp,fr:fr,sr:sr};localStorage.setItem(LS.P,JSON.stringify(prefs));
}
if(prefs.sz)document.getElementById('size-word').value=prefs.sz;
if(prefs.sp)document.getElementById('size-ipa').value=prefs.sp;
if(prefs.sr)document.getElementById('size-trans').value=prefs.sr;
if(prefs.fz)document.getElementById('font-word').value=prefs.fz;
if(prefs.fp)document.getElementById('font-ipa').value=prefs.fp;
if(prefs.fr)document.getElementById('font-trans').value=prefs.fr;
applyF();
['font-word','font-ipa','font-trans','size-word','size-ipa','size-trans'].forEach(function(id){
  var el=document.getElementById(id);
  el.addEventListener('change',applyF);el.addEventListener('input',applyF);
});
document.getElementById('font-toggle').addEventListener('click',function(){
  var p=document.getElementById('font-panel');p.style.display=p.style.display==='flex'?'none':'flex';
});

/* TTS */
var enVoice=null;
var voicesReady=false;
var fallbackAudio=null;
var ttsVolume=parseFloat(localStorage.getItem('eng-volume'));
if(isNaN(ttsVolume)) ttsVolume=1;
function clampVolume(v){
  v=parseFloat(v);
  if(isNaN(v)) return 1;
  if(v<0) return 0;
  if(v>1) return 1;
  return v;
}
function setTtsVolume(v, save){
  ttsVolume=clampVolume(v);
  var range=document.getElementById('vol-range');
  var val=document.getElementById('vol-val');
  if(range){ range.value=Math.round(ttsVolume*100); }
  if(val){ val.textContent=Math.round(ttsVolume*100)+'%'; }
  if(save) localStorage.setItem('eng-volume', String(ttsVolume));
  if(fallbackAudio){ try{ fallbackAudio.volume=ttsVolume; }catch(e){} }
}
function pickEnVoice(vs){
  return vs.find(function(v){return v.lang==='en-US';})
    || vs.find(function(v){return /^zh/i.test(v.lang);})
    || vs.find(function(v){return /chinese|mandarin|huihui|yaoyao|kangkang/i.test(v.name);});
}
function refreshVoices(){
  if(typeof speechSynthesis==='undefined') return;
  var vs=speechSynthesis.getVoices();
  if(vs && vs.length){
    enVoice=pickEnVoice(vs) || null;
    voicesReady=true;
  }
}
function ensureVoices(cb){
  if(typeof speechSynthesis==='undefined'){ if(cb) cb(); return; }
  refreshVoices();
  if(voicesReady){ if(cb) cb(); return; }
  var tries=0;
  (function tryLoad(){
    var vs=speechSynthesis.getVoices();
    if(vs && vs.length){
      enVoice=pickEnVoice(vs) || null;
      voicesReady=true;
      if(cb) cb();
      return;
    }
    tries++;
    if(tries>=6){ if(cb) cb(); return; }
    setTimeout(tryLoad, 200);
  })();
}
if(typeof speechSynthesis!=='undefined'){
  speechSynthesis.onvoiceschanged=function(){ voicesReady=false; refreshVoices(); };
  refreshVoices();
}
function stopFallback(){
  if(fallbackAudio){
    try{ fallbackAudio.pause(); }catch(e){}
    fallbackAudio = null;
  }
}
function stopAllAudio(){
  try{ if(typeof speechSynthesis!=='undefined') speechSynthesis.cancel(); }catch(e){}
  stopFallback();
  document.querySelectorAll('.tts-btn.on').forEach(function(b){b.classList.remove('on');});
}
function chunkTTS(text, maxLen){
  var clean = String(text||'').replace(/\s+/g,' ').trim();
  if(!clean) return [];
  if(clean.length <= maxLen) return [clean];
  var parts = clean.split(/([!?.;,])/);
  var out = [], cur = '';
  for(var i=0;i<parts.length;i++){
    var p = parts[i];
    if(!p) continue;
    if(cur.length + p.length > maxLen && cur){
      out.push(cur.trim());
      cur = p;
    }else{
      cur += p;
    }
  }
  if(cur.trim()) out.push(cur.trim());
  var final = [];
  out.forEach(function(s){
    if(s.length <= maxLen){ final.push(s); return; }
    for(var j=0;j<s.length;j+=maxLen){ final.push(s.slice(j,j+maxLen)); }
  });
  return final;
}
function playFallbackTTS(text, onDone){
  var chunks = chunkTTS(text, 160);
  var idx = 0;
  stopFallback();
  function next(){
    if(idx >= chunks.length){ if(onDone) onDone(); return; }
    var url = 'https://translate.googleapis.com/translate_tts?client=gtx&tl=en-US&q=' + encodeURIComponent(chunks[idx]);
    var a = new Audio();
    fallbackAudio = a;
    a.volume = ttsVolume;
    a.src = url;
    a.onended = function(){ idx++; next(); };
    a.onerror = function(){ idx++; next(); };
    var p = a.play();
    if(p && p.catch) p.catch(function(){});
  }
  next();
}
function speakEn(text){
  var txt = String(text||'').replace(/\s+/g,' ').trim();
  if(!txt) return;
  var spd = parseFloat((document.getElementById('speed-sel')||{}).value||'1');
  stopAllAudio();
  if(typeof speechSynthesis==='undefined'){
    playFallbackTTS(txt);
    return;
  }
  try{ speechSynthesis.resume(); }catch(e){}
  ensureVoices(function(){
    var u=new SpeechSynthesisUtterance(txt);u.lang='en-US';u.rate=spd||1;u.volume=ttsVolume;
    if(enVoice)u.voice=enVoice;
    var started=false, finished=false;
    u.onstart=function(){ started=true; };
    u.onend=function(){ finished=true; };
    u.onerror=function(){
      if(finished) return;
      finished=true;
      try{ speechSynthesis.cancel(); }catch(e){}
      playFallbackTTS(txt);
    };
    setTimeout(function(){
      if(finished) return;
      if(!started){
        try{ speechSynthesis.cancel(); }catch(e){}
        playFallbackTTS(txt);
      }
    }, 1200);
    setTimeout(function(){ speechSynthesis.speak(u); }, 0);
  });
}
document.body.addEventListener('click',function(e){
  var btn=e.target.closest('.tts-btn');if(!btn)return;
  e.stopPropagation();
  /* Read text at click-time: prefer cached dataset, else find nearest .zh or .ex-zh */
  var txt=(btn.dataset && btn.dataset.t) ? btn.dataset.t : '';
  if(!txt){
    var wc=btn.closest('.wordcell');
    if(wc){
      var zDiv=wc.querySelector('.wd');
      if(zDiv)txt=zDiv.textContent.replace(/\s+/g,'').trim();
    }else{
      var td=btn.closest('td');
      if(td){var ez=td.querySelector('.ex-en');if(ez)txt=ez.textContent.trim();}
    }
  }
  if(!txt)return;
  if(btn.classList.contains('on')){ stopAllAudio(); return; }
  stopAllAudio();

  var spd=parseFloat((document.getElementById('speed-sel')||{}).value||'1');
  btn.classList.add('on');

  if(typeof speechSynthesis==='undefined'){
    playFallbackTTS(txt, function(){ btn.classList.remove('on'); });
    return;
  }

  try{ speechSynthesis.resume(); }catch(e){}
  ensureVoices(function(){
    var u=new SpeechSynthesisUtterance(txt);u.lang='en-US';u.rate=spd||1;u.volume=ttsVolume;
    if(enVoice)u.voice=enVoice;
    var started=false, finished=false;
    u.onstart=function(){ started=true; };
    u.onend=function(){ finished=true; btn.classList.remove('on'); };
    u.onerror=function(){
      if(finished) return;
      finished=true;
      try{ speechSynthesis.cancel(); }catch(e){}
      playFallbackTTS(txt, function(){ btn.classList.remove('on'); });
    };
    setTimeout(function(){
      if(finished) return;
      if(!started){
        try{ speechSynthesis.cancel(); }catch(e){}
        playFallbackTTS(txt, function(){ btn.classList.remove('on'); });
      }
    }, 1200);
    setTimeout(function(){ speechSynthesis.speak(u); }, 0);
  });
});
document.body.addEventListener('click',function(e){
  var edit = e.target.closest('[data-edit-word], .edit-word, .edit-btn');
  if(!edit) return;
  var tr = edit.closest('tr');
  if(!tr) return;
  var zh = tr.querySelector('.wd');
  if(zh) speakEn(zh.textContent);
});
/* inject TTS into wordcells */
document.querySelectorAll('.wordcell').forEach(function(cell){
  var zh=cell.querySelector('.wd');if(!zh)return;
  var txt=zh.textContent.trim();
  var inner=document.createElement('div');inner.className='wc-inner';
  while(cell.firstChild)inner.appendChild(cell.firstChild);
  var btn=document.createElement('button');btn.className='tts-btn';btn.title=T('tts_play','Play');btn.textContent='\u25b6';btn.dataset.t=txt;
  cell.appendChild(btn);cell.appendChild(inner);
});
/* inject TTS into example cells */
document.querySelectorAll('td').forEach(function(td){
  var ez=td.querySelector('.ex-en');if(!ez)return;
  var txt=ez.textContent.trim();
  var inner=document.createElement('div');inner.className='ex-td-inner';
  while(td.firstChild)inner.appendChild(td.firstChild);
  td.classList.add('ex-td');td.appendChild(inner);
  var btn=document.createElement('button');btn.className='tts-btn';btn.title=T('tts_example','Play example');btn.textContent='\u25b6';btn.dataset.t=txt;
  var ezInner = inner.querySelector('.ex-en');
  if(ezInner){ ezInner.insertBefore(btn, ezInner.firstChild); }
  else { inner.insertBefore(btn, inner.firstChild); }
});
/* tag trans cells for font targeting */
document.querySelectorAll('tbody tr').forEach(function(tr){if(tr.cells.length>=6)tr.cells[4].classList.add('trans-cell');});
/* inject drag handles into translation cells */
(function(){
  document.querySelectorAll('tbody tr').forEach(function(tr){
    var td = tr.querySelector('td.trans-cell') || tr.querySelector('td[data-col="trans"]');
    if(!td || td.querySelector('.drag-handle')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'drag-handle';
    btn.title = T('drag_row','Drag row');
    btn.setAttribute('aria-label', btn.title);
    btn.textContent = '\u22ee\u22ee';
    td.insertBefore(btn, td.firstChild);
  });
})();


/* Group collapse */
document.querySelectorAll('h3.root-group').forEach(function(h3){
  var btn=document.createElement('button');btn.className='coll-btn';btn.textContent='\u25bc';h3.appendChild(btn);
  var tbl=h3.nextElementSibling;while(tbl&&tbl.tagName!=='TABLE')tbl=tbl.nextElementSibling;
  if(!tbl)return;
  var wrap=document.createElement('div');wrap.className='grp-wrap';tbl.parentNode.insertBefore(wrap,tbl);wrap.appendChild(tbl);
  btn.addEventListener('click',function(ev){
    ev.stopPropagation();
    var c=wrap.classList.toggle('grp-col');btn.textContent=c?'\u25b6':'\u25bc';
  });
});
document.getElementById('btn-col-all').addEventListener('click',function(){
  document.querySelectorAll('h3.root-group').forEach(function(h3){
    var w=h3.nextElementSibling;if(w&&w.classList.contains('grp-wrap')){w.classList.add('grp-col');var b=h3.querySelector('.coll-btn');if(b)b.textContent='\u25b6';}
  });
});
document.getElementById('btn-exp-all').addEventListener('click',function(){
  document.querySelectorAll('h3.root-group').forEach(function(h3){
    var w=h3.nextElementSibling;if(w&&w.classList.contains('grp-wrap')){w.classList.remove('grp-col');var b=h3.querySelector('.coll-btn');if(b)b.textContent='\u25bc';}
  });
});

/* Column visibility toggle (data cols: #, Word, Translation, Example) */
var colMap={2:'num',3:'word',4:'trans',5:'ex'};
function toggleCol(key){
  var h=document.body.classList.toggle('hide-'+key);
  localStorage.setItem('eng-hide-'+key,h?'1':'');
  var btn=document.querySelector('.col-btn[data-col="'+key+'"]');
  if(btn)btn.classList.toggle('hidden',h);
}
/* Restore hidden cols */
Object.keys(colMap).forEach(function(i){
  var key=colMap[i];
  if(localStorage.getItem('eng-hide-'+key)){
    document.body.classList.add('hide-'+key);
    var btn=document.querySelector('.col-btn[data-col="'+key+'"]');
    if(btn)btn.classList.add('hidden');
  }
});
/* Toolbar col-btn right-clicks */
document.querySelectorAll('.col-btn').forEach(function(btn){
  btn.addEventListener('contextmenu',function(e){
    e.preventDefault();
    toggleCol(this.dataset.col);
  });
});
/* Column header right-click (event delegation — works for all tables) */
document.addEventListener('contextmenu',function(e){
  var th=e.target.closest('thead th');
  if(!th||th.classList.contains('cb-col')||th.classList.contains('fam-col'))return;
  var idx=Array.prototype.indexOf.call(th.parentNode.children,th);
  var key=colMap[idx];
  if(key){
    e.preventDefault();
    toggleCol(key);
  }
},true);
/* Show all columns */
(function(){
  var btn = document.getElementById('btn-show-all-cols');
  if(!btn) return;
  btn.addEventListener('click', function(){
    ['num','word','trans','ex'].forEach(function(key){
      document.body.classList.remove('hide-'+key);
      localStorage.removeItem('eng-hide-'+key);
      var b = document.querySelector('.col-btn[data-col="'+key+'"]');
      if(b) b.classList.remove('hidden');
    });
  });
})();

/* old CSV handler removed — handled by SheetJS below */
(function(){
  var _REMOVED_CSV = true;
  if(_REMOVED_CSV) return;
  var btn = document.getElementById('btn-export-csv');
  if(!btn) return;
  btn.addEventListener('click', function(){
    var lines = [
      ['"#"','"Word"','"IPA"','"'+T('th_trans','Translation')+'"','"Example"','"Example (IPA)"','"CEFR"'].join(',')
    ];
    var n = 0;
    document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr').forEach(function(tr){
      if(tr.classList.contains('sr-hide') || tr.classList.contains('cefr-hide')) return;
      n++;
      function cell(sel){ var el=tr.querySelector(sel); return el ? '"'+el.textContent.trim().replace(/"/g,'""')+'"' : '""'; }
      var trans = cell(transSel());
      lines.push([n, cell('.wd'), cell('.ipa'), trans, cell('.ex-en'), cell('.ex-ipa'), tr.getAttribute('data-cefr')||''].join(','));
    });
    var bom = '\ufeff'; // UTF-8 BOM so Excel reads non-ASCII correctly
    var blob = new Blob([bom + lines.join('\r\n')], {type:'text/csv;charset=utf-8;'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'english_vocabulary.csv'; a.click();
    URL.revokeObjectURL(url);
  });
})();

/* old PDF print handler removed — handled by iframe+print below */

/* Restore speed pref */
var speedSel=document.getElementById('speed-sel');
var savedSpeed=localStorage.getItem('eng-speed');
if(savedSpeed&&speedSel){speedSel.value=savedSpeed;}
speedSel&&speedSel.addEventListener('change',function(){localStorage.setItem('eng-speed',this.value);});

/* Restore volume pref */
var volRange=document.getElementById('vol-range');
var savedVol=localStorage.getItem('eng-volume');
if(volRange){
  if(savedVol!==null){ setTtsVolume(parseFloat(savedVol), false); }
  else { setTtsVolume(ttsVolume, false); }
  volRange.addEventListener('input', function(){
    setTtsVolume(parseFloat(this.value)/100, true);
  });
}

})();

/* ── Capture original row order BEFORE drag-restore runs ────────────── */
window._cdxOrigOrder = {};
(function(){
  _allTbodies.forEach(function(tb){
    var ids = [];
    for(var i=0;i<tb.rows.length;i++){
      var z=tb.rows[i].querySelector('.wd'); if(z) ids.push(z.textContent.trim());
    }
    if(ids.length) window._cdxOrigOrder[tb.id] = ids;
  });
})();

/* Sortable.js lazy-loaded on demand (see ensureSortableInit) */

// ── Drag-and-drop reorder + persistence ──────────────────────────────────────
(function(){
  var KEY = 'eng_row_order';

  // Renumber the # column in a tbody
  function updateNumbers(tb){
    for(var i=0;i<tb.rows.length;i++){
      var c=tb.rows[i].querySelector('.rownum');
      if(c) c.textContent=i+1;
    }
  }

  // Save order of every main tbody (by Chinese word text)
  function saveOrder(){
    var order={};
    _allTbodies.forEach(function(tb){
      var ids=[];
      for(var i=0;i<tb.rows.length;i++){
        var z=tb.rows[i].querySelector('.wd');
        if(z) ids.push(z.textContent.trim());
      }
      if(ids.length) order[tb.id]=ids;
    });
    localStorage.setItem(KEY, JSON.stringify(order));
  }

  // Restore saved order (runs after existing IIFE has already moved learned/fam rows)
  function loadOrder(){
    var order={};
    try{ order=JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){}
    Object.keys(order).forEach(function(tbId){
      var tb=document.getElementById(tbId) || _allTbodies.find(function(t){ return t.id === tbId; });
      if(!tb) return;
      // Map headword → tr for rows currently in this tbody
      var map={};
      for(var i=0;i<tb.rows.length;i++){
        var z=tb.rows[i].querySelector('.wd');
        if(z) map[z.textContent.trim()]=tb.rows[i];
      }
      // Reorder by appending in saved sequence
      order[tbId].forEach(function(w){ var tr=map[w]; if(tr) tb.appendChild(tr); });
      updateNumbers(tb);
    });
  }

  // Init SortableJS on demand (defer heavy setup)
  var _sortableInitDone = false;
  function initSortableNow(){
    if(_sortableInitDone) return;
    if(typeof Sortable === 'undefined') return;
    _sortableInitDone = true;
    window._cdxSortables = [];
    _allTbodies.forEach(function(tb){
      var existing = Sortable.get ? Sortable.get(tb) : null;
      if(existing) try{ existing.destroy(); }catch(e){}
      var s = Sortable.create(tb,{
        animation: 80,
        cursor: 'grab',
        handle: '.drag-handle',
        ghostClass: 'drag-ghost',
        onEnd: function(){
          updateNumbers(tb); saveOrder();
          renumVisible(); updateWordCount(getVisibleRowCount());
        }
      });
      window._cdxSortables.push(s);
    });
    // Also make learned + fam tbodies sortable (order saved via existing save())
    ['learned-tbody','fam-tbody'].forEach(function(id){
      var tb=document.getElementById(id);
      if(!tb) return;
      var existing = Sortable.get ? Sortable.get(tb) : null;
      if(existing) try{ existing.destroy(); }catch(e){}
      var s = Sortable.create(tb,{ animation:80, cursor:'grab',
        handle: '.drag-handle',
        ghostClass: 'drag-ghost',
        onEnd:function(){ updateNumbers(tb); renumVisible(); updateWordCount(getVisibleRowCount()); }
      });
      window._cdxSortables.push(s);
    });
    updateDragState();
  }

  function ensureSortableInit(){
    if(_sortableInitDone) return;
    if(typeof Sortable === 'undefined'){
      loadScriptOnce('sortable.min.js').then(function(){ initSortableNow(); }).catch(function(){});
    } else {
      initSortableNow();
    }
  }

  document.addEventListener('mousedown', function(e){
    if(e.target.closest('.drag-handle')) ensureSortableInit();
  }, true);
  document.addEventListener('touchstart', function(e){
    if(e.target.closest && e.target.closest('.drag-handle')) ensureSortableInit();
  }, {passive:true, capture:true});

  loadOrder();
})();

/* ══════════════════════════════════════════════════════════════
   CODEX ADDITIONS  –  locale switch, palette, snapshots,
                       sort, filtered search, drag integration
   ══════════════════════════════════════════════════════════════ */
(function(){
"use strict";

/* ── Original row order (use pre-drag capture from window._cdxOrigOrder) */
var _origOrder = window._cdxOrigOrder || {};


/* ── Palette ─────────────────────────────────────────────────────────── */

var PALETTES = {
  rose:    ['#e94560','#c73652'],
  ocean:   ['#0077b6','#005f8e'],
  forest:  ['#2d6a4f','#1b4332'],
  ember:   ['#e76f51','#c45436'],
  plum:    ['#7b2d8b','#5c1f69'],
  slate:    ['#546e7a','#37474f'],
  citrus:   ['#f4a261','#d4843d'],
  coral:    ['#ff6b6b','#e85353'],
  midnight: ['#6c63ff','#4a43cc'],
  jade:     ['#00b894','#008f73'],
  sakura:   ['#e91e8c','#c01570'],
  gold:     ['#e6a817','#c48a00'],
  arctic:   ['#2196f3','#1565c0'],
  crimson:  ['#c0392b','#962d22'],
  teal:     ['#00838f','#005f6b']
};

function applyPalette(name){
  var pal = PALETTES[name] || PALETTES.rose;
  document.documentElement.style.setProperty('--pal-accent', pal[0]);
  document.documentElement.style.setProperty('--pal-dark', pal[1]);
  localStorage.setItem('eng_palette', name);
  // Also fix dark mode thead (it overrides)
  var dynPal = document.getElementById('dyn-palette');
  if(!dynPal){ dynPal=document.createElement('style'); dynPal.id='dyn-palette'; document.head.appendChild(dynPal); }
  dynPal.textContent = 'body.dark thead tr{background:'+pal[1]+'!important}';
}

(function initPalette(){
  var saved = localStorage.getItem('eng_palette') || 'rose';
  applyPalette(saved);
  var dd = document.getElementById('palette-dropdown');
  var btn = document.getElementById('btn-palette-dd');
  if(btn) btn.addEventListener('click', function(e){ e.stopPropagation(); dd.classList.toggle('open'); });
  if(dd){
    dd.querySelectorAll('.cdx-dropdown-item').forEach(function(item){
      item.addEventListener('click', function(){
        applyPalette(this.dataset.pal);
        dd.classList.remove('open');
      });
    });
  }
  document.addEventListener('click', function(){ if(dd) dd.classList.remove('open'); });
})();

/* ── Locale switching (en / ru / kk, extensible via i18n.js) ────────────── */
var currentLang = localStorage.getItem('eng_locale') || 'en';

function setLang(code){
  var I = window.I18N || {};
  if(!I[code]) code = 'en';
  var L = I[code];
  currentLang = code;
  localStorage.setItem('eng_locale', code);

  /* body locale class: en is the bare state */
  document.body.classList.remove('loc-ru','loc-kk');
  if(code !== 'en') document.body.classList.add('loc-' + code);
  document.documentElement.setAttribute('lang', code);

  var _wc = document.querySelectorAll('tr[data-key]').length;

  function txt(el, s){ if(el && s != null) el.textContent = s; }
  function ttl(el, s){ if(el && s != null){ el.title = s; el.setAttribute('aria-label', s); } }

  /* generic pass: every element that declares its own key */
  document.querySelectorAll('[data-i18n]').forEach(function(el){
    var v = L[el.getAttribute('data-i18n')];
    if(v != null) el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(function(el){
    var v = L[el.getAttribute('data-i18n-title')];
    if(v != null) el.title = v;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(function(el){
    var v = L[el.getAttribute('data-i18n-ph')];
    if(v != null) el.placeholder = v;
  });

  /* document + heading */
  document.title = L.title;
  txt(document.querySelector('h1'), L.h1);

  var sub = document.querySelector('.subtitle');
  if(sub) sub.innerHTML = _wc + ' ' + L.words + ' &nbsp;&middot;&nbsp; ' + L.grouped_by_pos;

  /* search language dropdown: labels, plus which translation option is offered */
  var _langSel = document.getElementById('search-lang');
  if(_langSel){
    var optMap = {wd:L.search_word, ipa:L.search_ipa, ru:L.search_ru, kk:L.search_kk};
    Object.keys(optMap).forEach(function(k){
      var o = _langSel.querySelector('option[value="'+k+'"]');
      if(o && optMap[k]) o.textContent = optMap[k];
    });
    var optRu = _langSel.querySelector('option[value="ru"]');
    var optKk = _langSel.querySelector('option[value="kk"]');
    var showRu = (code === 'ru'), showKk = (code === 'kk');
    if(optRu){ optRu.style.display = showRu ? '' : 'none'; optRu.disabled = !showRu; }
    if(optKk){ optKk.style.display = showKk ? '' : 'none'; optKk.disabled = !showKk; }
    if((_langSel.value === 'ru' && !showRu) || (_langSel.value === 'kk' && !showKk)){
      _langSel.value = 'wd';
    }
  }

  /* locale button label */
  txt(document.getElementById('btn-lang-toggle'), L._label);

  /* stats bar — rebuilt because it carries live counts */
  var stBar = document.getElementById('stats-bar');
  if(stBar){
    var famVal = (document.getElementById('st-fam')||{textContent:'0'}).textContent;
    var lrnVal = (document.getElementById('st-lrn')||{textContent:'0'}).textContent;
    stBar.innerHTML = L.stats_familiar + ':&nbsp;<b id="st-fam">' + famVal + '</b>&nbsp;&nbsp;'
                    + L.stats_learned  + ':&nbsp;<b id="st-lrn">' + lrnVal + '</b>&nbsp;&nbsp;'
                    + L.stats_total    + ':&nbsp;<b>' + _wc + '</b>';
  }

  /* table of contents */
  txt(document.querySelector('.toc h3'), L.toc_head);
  document.querySelectorAll('.toc a').forEach(function(a){
    var posId = (a.getAttribute('href')||'').replace('#','');
    var name = L['sec_' + posId];
    if(!name) return;
    for(var ni=0; ni<a.childNodes.length; ni++){
      if(a.childNodes[ni].nodeType === 3){ a.childNodes[ni].nodeValue = name + ' '; break; }
    }
    var span = a.querySelector('.toc-count');
    if(span){
      var m = span.textContent.match(/\d+/);
      span.textContent = '(' + (m ? m[0] : '0') + ' ' + L.words + ')';
    }
  });

  if(window.updateNewsLang) window.updateNewsLang();

  /* column visibility buttons */
  document.querySelectorAll('.col-btn').forEach(function(b){
    var name = L['col_' + b.dataset.col];
    if(name){ b.textContent = name; b.title = L.col_toggle_title + ' ' + name; }
  });

  /* POS filter buttons */
  document.querySelectorAll('.pos-btn').forEach(function(b){
    var v = L['posf_' + b.dataset.pos];
    if(v) b.textContent = v;
  });

  /* CEFR "all" button */
  txt(document.querySelector('.cefr-btn[data-cefr="all"]'), L.all);

  /* alpha filter: swap the alphabet panel, reset so nothing shows 0 rows */
  var wraps = {ru:'alpha-ru-wrap', kk:'alpha-kk-wrap', en:'alpha-en-wrap'};
  Object.keys(wraps).forEach(function(k){
    var w = document.getElementById(wraps[k]);
    if(w) w.style.display = (k === code) ? 'flex' : 'none';
  });
  txt(document.getElementById('alpha-filter-label'), L.lbl_alpha);
  if(currentAlpha !== 'all'){ applyAlphaFilter('all'); }

  /* "by section" checkbox — the text node beside the input */
  document.querySelectorAll('.tb-row label').forEach(function(lbl){
    if(lbl.querySelector && lbl.querySelector('#sort-respect-div')){
      for(var i=0; i<lbl.childNodes.length; i++){
        if(lbl.childNodes[i].nodeType === 3){ lbl.childNodes[i].nodeValue = ' ' + L.by_section; break; }
      }
    }
  });

  /* snapshot button keeps its transient "saved" state */
  var btnSave = document.getElementById('btn-save-snap');
  if(btnSave && btnSave.textContent.indexOf('✓') === -1) btnSave.textContent = L.snap_save;

  /* live visible-word count */
  var wcWrap = document.getElementById('word-count-wrap');
  if(wcWrap){
    var countVal = document.getElementById('count-val');
    var n = countVal ? countVal.textContent : '—';
    wcWrap.innerHTML = L.words_label + ': <b id="count-val">' + n + '</b>';
  }

  /* root-group toggle reflects its current state */
  var phBtn = document.getElementById('btn-roots-toggle');
  if(phBtn){
    phBtn.textContent = document.body.classList.contains('ph-hidden') ? L.show_roots : L.hide_roots;
  }

  /* drag handles */
  document.querySelectorAll('.drag-handle').forEach(function(b){ ttl(b, L.drag_row); });

  /* font panel */
  txt(document.getElementById('font-word-label'), L.font_word);
  txt(document.getElementById('font-ipa-label'), L.font_ipa);
  txt(document.getElementById('font-trans-label'), L.font_trans);
  document.querySelectorAll('#font-word option[value=""], #font-ipa option[value=""], #font-trans option[value=""]')
    .forEach(function(o){ o.textContent = L.font_default; });

  /* POS section headings */
  document.querySelectorAll('h2.pos-group').forEach(function(h2){
    var name = L['sec_' + h2.id];
    if(name && h2.childNodes[0]) h2.childNodes[0].textContent = name + ' ';
  });

  /* root group headers */
  document.querySelectorAll('h3.root-group').forEach(function(h3){
    for(var i=0; i<h3.childNodes.length; i++){
      var n = h3.childNodes[i];
      if(n.nodeType !== 3) continue;
      n.nodeValue = h3.hasAttribute('data-standalone') ? L.individual_words : L.root_prefix;
      break;
    }
  });

  /* table headers */
  document.querySelectorAll('thead th[data-col]').forEach(function(th){
    var v = L['th_' + th.dataset.col];
    if(v) th.textContent = v;
  });

  /* learned / familiar section headings */
  txt(document.querySelector('#fam-section > h2'), L.fam_heading);
  txt(document.querySelector('#learned-section > h2'), L.learned_heading);

  /* TTS buttons */
  document.querySelectorAll('.tts-btn').forEach(function(btn){
    btn.title = (btn.closest && btn.closest('.ex-td')) ? L.tts_example : L.tts_play;
  });
}
window.setLang = setLang;


document.addEventListener('DOMContentLoaded', function(){
  setLang(currentLang);
  var btn = document.getElementById('btn-lang-toggle');
  if(btn){
    btn.addEventListener('click', function(){
      var order = (window.I18N && window.I18N._order) || ['en'];
      var i = order.indexOf(currentLang);
      setLang(order[(i + 1) % order.length]);
    });
  }
});

/* ── Search improvements (flat filtered view) ───────────────────────────── */
var searchActive = false;
var filteredView = document.getElementById('filtered-view');

function buildFilteredView(rows, bySect){
  filteredView.innerHTML = '';
  if(!rows.length){ filteredView.style.display='none'; return; }

  function makeTable(rowSet, startNum){
    var tbl = document.createElement('table');
    tbl.style.cssText = 'width:100%;border-collapse:collapse;margin-bottom:8px';
    tbl.className = 'fv-table';
    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th data-col="cb" class="cb-col">&#10004;</th><th data-col="fam" class="fam-col">?</th><th data-col="num" style="width:3%">#</th>'
      +'<th data-col="word" style="width:22%">'+T('th_word','Word')+'</th>'
      +'<th data-col="trans" style="width:30%">'+T('th_trans','Translation')+'</th>'
      +'<th data-col="ex" style="width:45%">'+T('th_ex','Example')+'</th></tr>';
    tbl.appendChild(thead);
    var tbody = document.createElement('tbody');
    rowSet.forEach(function(tr, i){
      var clone = tr.cloneNode(true);
      var rn = clone.querySelector('.rownum'); if(rn) rn.textContent = startNum + i;
      // Highlight search match
      var _q = (document.getElementById('search-input')||{}).value||'';
      var _ql = (document.getElementById('search-lang')||{}).value||'ru';
      if(_q.trim()){
        var _qt = _q.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        var _sel = _ql==='wd'?'.wd':_ql==='ipa'?'.ipa':_ql==='kk'?'.trans-kk':'.trans-ru';
        var _el = clone.querySelector(_sel);
        if(_el){ _el.innerHTML = _el.textContent.replace(new RegExp('('+_qt+')','gi'),'<mark>$1</mark>'); }
      }
      tbody.appendChild(clone);
    });
    tbl.appendChild(tbody);
    return tbl;
  }

  if(bySect){
    var secOrder = ['pos_noun','pos_verb','pos_adj','pos_adv','pos_mw','pos_particle','pos_conj','pos_prep','pos_pron'];
    var secMap = {};
    rows.forEach(function(tr){
      var s = tr.getAttribute('data-section') || 'other';
      if(!secMap[s]) secMap[s] = [];
      secMap[s].push(tr);
    });
    var rowNum = 1;
    secOrder.forEach(function(secId){
      var secRows = secMap[secId];
      if(!secRows || !secRows.length) return;
      var origH2 = document.getElementById(secId);
      if(origH2){
        var h2c = origH2.cloneNode(true);
        h2c.removeAttribute('id');
        h2c.style.cursor = 'default';
        filteredView.appendChild(h2c);
      }
      filteredView.appendChild(makeTable(secRows, rowNum));
      rowNum += secRows.length;
    });
    if(secMap['other'] && secMap['other'].length)
      filteredView.appendChild(makeTable(secMap['other'], rowNum));
  } else {
    filteredView.appendChild(makeTable(rows, 1));
  }
  filteredView.style.display = 'block';
}

// Override old doSearch to no-op; rebuildView() is the single search handler
function doSearch(){}

/* ── Search worker (off-main-thread indexing) ────────────────── */
var _searchWorker = null;
var _searchWorkerReady = false;
var _searchWorkerKey = '';
var _searchPendingKey = '';
var _searchMatchSet = null;

function initSearchWorker(){
  if(_searchWorker) return;
  try{
    _searchWorker = new Worker('search-worker.js');
  }catch(e){
    _searchWorker = null;
    return;
  }
  _searchWorker.onmessage = function(e){
    var data = e.data || {};
    if(data.type === 'ready'){
      _searchWorkerReady = true;
      return;
    }
    if(data.type === 'result'){
      _searchWorkerKey = data.key || '';
      _searchPendingKey = '';
      _searchMatchSet = new Set(data.matches || []);
      if(typeof rebuildView === 'function') rebuildView();
    }
  };
  var rows = _allRows;
  rows.forEach(function(tr, idx){ tr._sidx = idx; });
  var payload = rows.map(function(tr){
    var zhEl = tr.querySelector('.wd');
    var pyEl = tr.querySelector('.ipa');
    return {
      zh: zhEl ? zhEl.textContent.trim() : '',
      py: (tr.getAttribute('data-ipa') || (pyEl ? pyEl.textContent.trim() : '')),
      en: tr.getAttribute('data-kk') || '',
      ru: tr.getAttribute('data-ru') || ''
    };
  });
  _searchWorker.postMessage({ type: 'init', rows: payload });
}

function requestWorkerSearch(key, q, lang){
  if(!_searchWorker || !_searchWorkerReady) return false;
  if(_searchPendingKey === key) return true;
  _searchPendingKey = key;
  _searchWorker.postMessage({ type: 'search', key: key, query: q, lang: lang });
  return true;
}

function cdxDoSearch(){
  initSearchWorker();
  rebuildView();
}

document.addEventListener('DOMContentLoaded', function(){
  function limitTranslationText(txt, maxParts){
    if(!txt) return '';
    var t = String(txt).trim();
    if(!t) return t;
    var parts = t.split(/[;；]/).map(function(p){ return p.trim(); }).filter(Boolean);
    var sep = '; ';
    if(parts.length <= 1){
      parts = t.split(',').map(function(p){ return p.trim(); }).filter(Boolean);
      sep = ', ';
    }
    if(parts.length <= 1) return t;
    return parts.slice(0, maxParts).join(sep);
  }

  // Limit visible translations to max 2 items (RU/EN)
  document.querySelectorAll('.trans-ru, .trans-kk').forEach(function(span){
    span.textContent = limitTranslationText(span.textContent, 2);
  });

  var inp = document.getElementById('search-input');
  var langSel = document.getElementById('search-lang');
  var clr = document.getElementById('search-clear');
  var sTimer = null;
  function debounced(){ clearTimeout(sTimer); sTimer=setTimeout(cdxDoSearch, 130); }
  if(inp){ inp.removeEventListener('input', inp._cdx_handler); inp.addEventListener('input', debounced); inp._cdx_handler = debounced; }
  if(langSel){ langSel.addEventListener('change', cdxDoSearch); }
  if(clr){ clr.addEventListener('click', function(){ if(inp) inp.value=''; cdxDoSearch(); }); }
  // Warm up search worker on idle
  if('requestIdleCallback' in window){
    requestIdleCallback(function(){ initSearchWorker(); }, { timeout: 2000 });
  } else {
    setTimeout(function(){ initSearchWorker(); }, 1600);
  }
});

/* ── Native lazy loading for media ────────────────────────────── */
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('img').forEach(function(img){
    if(!img.hasAttribute('loading')) img.setAttribute('loading','lazy');
  });
  document.querySelectorAll('iframe').forEach(function(fr){
    if(!fr.hasAttribute('loading')) fr.setAttribute('loading','lazy');
  });
});

/* ── On-demand section rendering (POS sections) ───────────────── */
(function(){
  var _lazySections = [];
  var _lazyObserver = null;
  var _lazyInit = false;

  function isInView(el, margin){
    if(!el) return false;
    var m = margin || 0;
    var r = el.getBoundingClientRect();
    return r.bottom > -m && r.top < (window.innerHeight + m);
  }

  function grabVirtPads(tb){
    var prev = tb.previousElementSibling;
    var next = tb.nextElementSibling;
    return {
      top: (prev && prev.classList.contains('virt-pad')) ? prev : null,
      bot: (next && next.classList.contains('virt-pad')) ? next : null
    };
  }

  function collectSection(h2){
    var info = { h2: h2, tbodies: [], tables: [], nodes: [], detached: false };
    var el = h2.nextElementSibling;
    while(el && el.tagName !== 'H2'){
      if(el.tagName === 'H3' && el.classList.contains('root-group')) info.nodes.push(el);
      if(el.classList && el.classList.contains('grp-wrap')) info.nodes.push(el);
      if(el.tagName === 'TABLE' || (el.classList && el.classList.contains('grp-wrap'))){
        var tbl = (el.tagName === 'TABLE') ? el : el.querySelector('table');
        if(tbl){
          info.tables.push(tbl);
          tbl.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody)').forEach(function(tb){
            info.tbodies.push({ tbody: tb, table: tbl, next: tb.nextSibling, pads: null });
          });
        }
      }
      el = el.nextElementSibling;
    }
    // de-dupe tables
    info.tables = info.tables.filter(function(t, i, a){ return a.indexOf(t) === i; });
    return info;
  }

  function applyFiltersToRows(rows){
    if(!rows || !rows.length) return;
    var textSel = window._textFilterSelected || [];
    var textSet = textSel.length ? new Set(textSel) : null;
    rows.forEach(function(tr){
      if(activeCefrLevels && activeCefrLevels.size){
        var h = tr.getAttribute('data-cefr') || '';
        tr.classList.toggle('cefr-hide', !activeCefrLevels.has(h));
      } else tr.classList.remove('cefr-hide');

      if(currentPOS && currentPOS !== 'all'){
        tr.classList.toggle('pos-hide', (tr.getAttribute('data-section')||'') !== currentPOS);
      } else tr.classList.remove('pos-hide');

      if(currentAlpha && currentAlpha !== 'all'){
        var val = tr.getAttribute(alphaAttr())||'';
        var first = val.trim().charAt(0).toUpperCase();
        tr.classList.toggle('alpha-hide', first !== currentAlpha);
      } else tr.classList.remove('alpha-hide');

      if(textSet){
        var t = tr.getAttribute('data-text');
        tr.classList.toggle('text-hide', !t || !textSet.has(t));
      } else tr.classList.remove('text-hide');
    });
  }

  function detachSection(info){
    if(info.detached) return;
    info.detached = true;
    if(info.h2) info.h2.dataset.lazyDetached = '1';
    info.nodes.forEach(function(n){ n.dataset.lazyDetached = '1'; });
    info.tbodies.forEach(function(item){
      var tb = item.tbody;
      if(!tb || !tb.parentNode) return;
      if(typeof unregisterVirtualTbody === 'function') unregisterVirtualTbody(tb);
      item.pads = grabVirtPads(tb);
      if(item.pads.top && item.pads.top.parentNode) item.pads.top.parentNode.removeChild(item.pads.top);
      if(item.pads.bot && item.pads.bot.parentNode) item.pads.bot.parentNode.removeChild(item.pads.bot);
      item.next = tb.nextSibling;
      item.table = tb.closest('table') || item.table;
      if(tb.parentNode) tb.parentNode.removeChild(tb);
    });
  }

  function attachSection(info){
    if(!info.detached) return;
    info.detached = false;
    if(info.h2) info.h2.dataset.lazyDetached = '';
    info.nodes.forEach(function(n){ n.dataset.lazyDetached = ''; });
    var rows = [];
    info.tbodies.forEach(function(item){
      var tb = item.tbody;
      var tbl = item.table;
      if(!tb || !tbl) return;
      if(!tb.parentNode){
        if(item.next && item.next.parentNode === tbl) tbl.insertBefore(tb, item.next);
        else tbl.appendChild(tb);
      }
      rows = rows.concat(Array.prototype.slice.call(tb.rows));
      if(typeof registerVirtualTbody === 'function') registerVirtualTbody(tb);
      renum(tb);
    });
    applyFiltersToRows(rows);
    info.tables.forEach(function(t){ if(typeof wrapHanziInScope === 'function') wrapHanziInScope(t); });
    if(typeof updateEmptyGroups === 'function') updateEmptyGroups();
    if(typeof queueVirtualUpdate === 'function') queueVirtualUpdate(true);
    if(typeof rebuildView === 'function') rebuildView();
  }

  function onIntersect(entries){
    entries.forEach(function(entry){
      var info = entry.target._lazyInfo;
      if(!info) return;
      if(entry.isIntersecting) attachSection(info);
    });
  }

  function initLazySections(){
    if(_lazyInit) return;
    _lazyInit = true;
    var h2s = document.querySelectorAll('h2.pos-group');
    h2s.forEach(function(h2){
      var info = collectSection(h2);
      h2._lazyInfo = info;
      _lazySections.push(info);
    });
    if(!('IntersectionObserver' in window)) return;
    _lazyObserver = new IntersectionObserver(onIntersect, { rootMargin: '600px 0px', threshold: 0.01 });
    _lazySections.forEach(function(info){
      if(info.h2) _lazyObserver.observe(info.h2);
      if(!isInView(info.h2, 600)) detachSection(info);
    });
    _lazySections.forEach(function(info){
      if(!info.detached){
        info.tables.forEach(function(t){ if(typeof wrapHanziInScope === 'function') wrapHanziInScope(t); });
      }
    });
    var lS = document.getElementById('learned-section');
    var fS = document.getElementById('fam-section');
    if(lS && typeof wrapHanziInScope === 'function') wrapHanziInScope(lS);
    if(fS && typeof wrapHanziInScope === 'function') wrapHanziInScope(fS);
  }

  document.addEventListener('DOMContentLoaded', function(){
    function kick(){ initLazySections(); }
    if('requestIdleCallback' in window){
      requestIdleCallback(kick, { timeout: 1500 });
    } else {
      setTimeout(kick, 1200);
    }
  });
})();

/* ── CEFR level filter (multi-select) ─────────────────────────── */
var activeCefrLevels = new Set(); // empty = show all
document.querySelectorAll('.cefr-btn').forEach(function(btn){
  btn.addEventListener('click', function(){
    var h = this.dataset.cefr;
    if(h === 'all'){
      activeCefrLevels.clear();
    } else {
      if(activeCefrLevels.has(h)){ activeCefrLevels.delete(h); }
      else { activeCefrLevels.add(h); }
    }
    var hasSel = activeCefrLevels.size > 0;
    document.querySelector('.cefr-btn[data-cefr="all"]').classList.toggle('active', !hasSel);
    document.querySelectorAll('.cefr-btn:not([data-cefr="all"])').forEach(function(b){
      b.classList.toggle('active', activeCefrLevels.has(b.dataset.cefr));
    });
    applyCefrFilter();
    rebuildView();
  });
});
function applyCefrFilter(){
  getMainRows().forEach(function(tr){
    if(activeCefrLevels.size === 0){
      tr.classList.remove('cefr-hide');
    } else {
      var h = tr.getAttribute('data-cefr') || '';
      tr.classList.toggle('cefr-hide', !activeCefrLevels.has(h));
    }
  });
}

function updateEmptyGroups(){
  function rowVisible(tr){
    return !tr.classList.contains('virt-spacer') &&
           !tr.classList.contains('cefr-hide') &&
           !tr.classList.contains('pos-hide') &&
           !tr.classList.contains('alpha-hide') &&
           !tr.classList.contains('text-hide') &&
           !tr.classList.contains('sr-hide');
  }
  function tableHasVisibleRows(tbl){
    if(!tbl) return false;
    for(var i=0;i<tbl.rows.length;i++){
      if(rowVisible(tbl.rows[i])) return true;
    }
    return false;
  }
  // Hide empty root groups
  document.querySelectorAll('h3.root-group').forEach(function(h3){
    var next = h3.nextElementSibling;
    var wrap = (next && next.classList && next.classList.contains('grp-wrap')) ? next : null;
    var tbl = wrap ? wrap.querySelector('table') : (next && next.tagName === 'TABLE' ? next : null);
    if(h3.dataset.lazyDetached === '1' || (wrap && wrap.dataset.lazyDetached === '1')){
      h3.classList.remove('grp-empty');
      if(wrap) wrap.classList.remove('grp-empty');
      else if(tbl) tbl.classList.remove('grp-empty');
      return;
    }
    var hasRows = tableHasVisibleRows(tbl);
    h3.classList.toggle('grp-empty', !hasRows);
    if(wrap) wrap.classList.toggle('grp-empty', !hasRows);
    else if(tbl) tbl.classList.toggle('grp-empty', !hasRows);
  });
  // Hide empty POS sections
  document.querySelectorAll('h2.pos-group').forEach(function(h2){
    if(h2.dataset.lazyDetached === '1'){
      h2.classList.remove('pos-empty');
      return;
    }
    var el = h2.nextElementSibling;
    var hasRows = false;
    while(el && el.tagName !== 'H2'){
      var tbl = null;
      if(el.classList && el.classList.contains('grp-wrap')) tbl = el.querySelector('table');
      else if(el.tagName === 'TABLE') tbl = el;
      if(tbl && tableHasVisibleRows(tbl)) { hasRows = true; break; }
      el = el.nextElementSibling;
    }
    h2.classList.toggle('pos-empty', !hasRows);
  });
}

/* ── Word count display ────────────────────────────────────────── */
function updateWordCount(n){
  var el = document.getElementById('count-val');
  if(el) el.textContent = n;
}
function getVisibleRowCount(){
  var n = 0;
  getMainRows().forEach(function(tr){
    if(tr.classList.contains('cefr-hide') || tr.classList.contains('pos-hide') ||
       tr.classList.contains('alpha-hide') || tr.classList.contains('text-hide') || tr.classList.contains('sr-hide')) return;
    n++;
  });
  return n;
}

/* ── Continuous row numbering across all visible rows ───────────── */
function renumVisible(){
  var n = 0;
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody)').forEach(function(tb){
    Array.prototype.forEach.call(tb.rows, function(tr){
      if(tr.classList.contains('cefr-hide') || tr.classList.contains('pos-hide') ||
         tr.classList.contains('alpha-hide') || tr.classList.contains('text-hide') || tr.classList.contains('sr-hide')) return;
      var c = tr.querySelector('.rownum');
      if(c) c.textContent = ++n;
    });
  });
}

document.addEventListener('DOMContentLoaded', function(){
  var rows = (typeof getMainRows === 'function') ? getMainRows() : (window.getMainRows ? window.getMainRows() : []);
  var total = rows.length || 0;
  updateWordCount(total);
  renumVisible();
});

/* ── Mark first table in each POS section (to show only one header) ─── */
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('h2.pos-group').forEach(function(h2){
    var el = h2.nextElementSibling;
    while(el && el.tagName !== 'H2'){
      if(el.tagName === 'TABLE'){
        el.classList.add('pos-first-table');
        break;
      }
      if(el.classList && el.classList.contains('grp-wrap')){
        var t = el.querySelector('table');
        if(t){ t.classList.add('pos-first-table'); break; }
      }
      el = el.nextElementSibling;
    }
  });
});

/* ── Merge small root groups (< 3 words) into a standalone-words group ─── */
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('h2.pos-group').forEach(function(h2){
    // Collect all (h3, table) pairs until next h2
    var groups = [];
    var el = h2.nextElementSibling;
    while(el && el.tagName !== 'H2'){
      if(el.tagName === 'H3' && el.classList.contains('root-group')){
        var tbl = el.nextElementSibling;
        if(tbl && tbl.tagName === 'TABLE'){
          var tb = tbl.querySelector('tbody[id]');
          groups.push({h3: el, table: tbl, tbody: tb, count: tb ? tb.rows.length : 0});
        }
      }
      el = el.nextElementSibling;
    }

    // Find groups with 0 < count < 3 that are not already "Other"
    var small = groups.filter(function(g){
      return g.count > 0 && g.count < 3 && !g.h3.hasAttribute('data-standalone');
    });
    if(small.length === 0) return;

    // Find the existing standalone-words group, or create one
    var otherGroup = groups.find(function(g){
      return g.h3.hasAttribute('data-standalone');
    });
    if(!otherGroup){
      var lastGroup = groups[groups.length - 1];
      var h3New = document.createElement('h3');
      h3New.className = 'root-group';
      h3New.innerHTML = '\u25c6 \u0424\u043e\u043d\u0435\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442 <span class="comp">\u5176\u4ed6 Other</span>';
      var tblNew = document.createElement('table');
      var origThead = lastGroup.table.querySelector('thead');
      if(origThead) tblNew.appendChild(origThead.cloneNode(true));
      var tbNew = document.createElement('tbody');
      tbNew.id = 'tb_other_' + h2.id;
      tblNew.appendChild(tbNew);
      var parent = lastGroup.table.parentNode;
      var insertRef = lastGroup.table.nextSibling;
      parent.insertBefore(h3New, insertRef);
      parent.insertBefore(tblNew, insertRef);
      otherGroup = {h3: h3New, table: tblNew, tbody: tbNew};
    }

    // Move rows from small groups into Other, remove their h3+table
    small.forEach(function(g){
      while(g.tbody && g.tbody.firstChild){
        otherGroup.tbody.appendChild(g.tbody.firstChild);
      }
      if(g.h3.parentNode) g.h3.parentNode.removeChild(g.h3);
      if(g.table.parentNode) g.table.parentNode.removeChild(g.table);
    });
  });
});

/* ── Show/Hide root group headers ──────────────────────────────── */
(function(){
  var btn = document.getElementById('btn-roots-toggle');
  if(!btn) return;
  var hidden = localStorage.getItem('ph_hidden') !== '0';
  var mergeData = null; // saved structure for restoration

  /* Apply initial state after full DOM is ready */
  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('h3.root-group').forEach(function(h3){
      h3.style.display = hidden ? 'none' : '';
    });
    btn.textContent = hidden ? T('show_roots','Show roots') : T('hide_roots','Hide roots');
    if(hidden){ mergeGroups(); }
  });

  function getVirtualPads(tb){
    var prev = tb.previousElementSibling;
    var next = tb.nextElementSibling;
    return {
      top: (prev && prev.classList.contains('virt-pad')) ? prev : null,
      bot: (next && next.classList.contains('virt-pad')) ? next : null
    };
  }

  function mergeGroups(){
    mergeData = [];
    document.querySelectorAll('h2.pos-group').forEach(function(h2){
      // Collect all grp-wraps in this POS section (until next h2)
      var wraps = [];
      var el = h2.nextElementSibling;
      while(el && el.tagName !== 'H2'){
        if(el.classList && el.classList.contains('grp-wrap')) wraps.push(el);
        el = el.nextElementSibling;
      }
      if(wraps.length < 2) return;

      var masterTbl = wraps[0].querySelector('table');
      var moves = [];
      for(var i = 1; i < wraps.length; i++){
        var tb = wraps[i].querySelector('tbody[id]');
        if(tb){
          var pads = getVirtualPads(tb);
          moves.push({ tbody: tb, wrap: wraps[i], pads: pads });
          if(pads.top) masterTbl.appendChild(pads.top);
          masterTbl.appendChild(tb); // move tbody into master table
          if(pads.bot) masterTbl.appendChild(pads.bot);
        }
        wraps[i].style.display = 'none'; // hide the now-empty wrapper
      }
      if(moves.length) mergeData.push({ masterTbl: masterTbl, moves: moves });
    });
    if(typeof markVirtualDirty === 'function') markVirtualDirty();
    if(typeof queueVirtualUpdate === 'function') queueVirtualUpdate(true);
  }

  function unmergeGroups(){
    if(!mergeData) return;
    mergeData.forEach(function(g){
      g.moves.forEach(function(m){
        var tbl = m.wrap.querySelector('table');
        if(tbl){
          if(m.pads && m.pads.top) tbl.appendChild(m.pads.top);
          tbl.appendChild(m.tbody); // move tbody back to its original table
          if(m.pads && m.pads.bot) tbl.appendChild(m.pads.bot);
        }
        m.wrap.style.display = ''; // restore wrapper (CSS grp-col handles collapse state)
      });
    });
    mergeData = null;
    if(typeof markVirtualDirty === 'function') markVirtualDirty();
    if(typeof queueVirtualUpdate === 'function') queueVirtualUpdate(true);
  }

  btn.addEventListener('click', function(){
    hidden = !hidden;
    // Hide/show h3 phoneme headers
    document.querySelectorAll('h3.root-group').forEach(function(h3){
      h3.style.display = hidden ? 'none' : '';
    });
    if(hidden){ mergeGroups(); }
    else       { unmergeGroups(); }

    btn.textContent = hidden ? T('show_roots','Show roots') : T('hide_roots','Hide roots');
    localStorage.setItem('ph_hidden', hidden ? '1' : '0');
    renumVisible();
  });
})();

/* ── Sort modes ───────────────────────────────────────────────────────────── */
var currentSort = 'default';

function getTbodiesForSort(){
  return getAllTbodies();
}

function sortRows(rows, key){
  return rows.slice().sort(function(a,b){
    var va = (a.getAttribute(key)||'').toLowerCase();
    var vb = (b.getAttribute(key)||'').toLowerCase();
    if(!va && vb) return 1;
    if(va && !vb) return -1;
    if(!va && !vb) return 0;
    return va < vb ? -1 : va > vb ? 1 : 0;
  });
}
function sortRowsByCefr(rows, desc){
  var dir = desc ? -1 : 1;
  return rows.slice().sort(function(a,b){
    var va = CEFR_ORDER[cefrOf(a)] || null;
    var vb = CEFR_ORDER[cefrOf(b)] || null;
    if(va === null && vb !== null) return 1;
    if(va !== null && vb === null) return -1;
    if(va !== vb) return dir * (va - vb);
    var pa = (a.getAttribute('data-key')||'').toLowerCase();
    var pb = (b.getAttribute('data-key')||'').toLowerCase();
    if(pa < pb) return -1;
    if(pa > pb) return 1;
    return 0;
  });
}

/* ── POS filter ──────────────────────────────────────────────── */
var currentPOS = 'all';
function applyPOSFilter(pos){
  currentPOS = pos;
  document.querySelectorAll('.pos-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.pos===pos); });
  getMainRows().forEach(function(tr){
    if(pos==='all'){ tr.classList.remove('pos-hide'); }
    else { tr.classList.toggle('pos-hide', (tr.getAttribute('data-section')||'')!==pos); }
  });
  rebuildView();
}
document.querySelectorAll('.pos-btn').forEach(function(btn){
  btn.addEventListener('click', function(){ applyPOSFilter(this.dataset.pos); });
});

/* ── Alpha filter ────────────────────────────────────────────── */
var currentAlpha = 'all';
function applyAlphaFilter(letter){
  currentAlpha = letter;
  // sync active state across every alpha-btn set
  document.querySelectorAll('.alpha-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.alpha===letter); });
  getMainRows().forEach(function(tr){
    if(letter==='all'){ tr.classList.remove('alpha-hide'); return; }
    var val = tr.getAttribute(alphaAttr())||'';
    var first = val.trim().charAt(0).toUpperCase();
    tr.classList.toggle('alpha-hide', first!==letter);
  });
  rebuildView();
}
document.querySelectorAll('.alpha-btn').forEach(function(btn){
  btn.addEventListener('click', function(){ applyAlphaFilter(this.dataset.alpha); });
});

/* ── rebuildView: single source of truth for what is shown ──────────────── */
function rebuildView(){
  var inp     = document.getElementById('search-input');
  var langSel = document.getElementById('search-lang');
  var rd      = document.getElementById('sort-respect-div');
  var q       = inp ? inp.value.trim() : '';
  var lang    = langSel ? langSel.value : 'ru';
  var bySection = !rd || rd.checked;
  var textFilterActive = !!window._textFilterActive;
  var forceFlat = (activeCefrLevels && activeCefrLevels.size > 0) || textFilterActive;
  if(forceFlat) bySection = false;

  // Use flat filtered view when:
  //   • a non-default sort is active (always global A-Z regardless of bySection), OR
  //   • bySection is off (user explicitly wants flat view), OR
  //   • a search query is active
  var useFlat = currentSort !== 'default' || !bySection || !!q || forceFlat;

  function stripTones(s){ return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
  var qn = (lang==='ipa') ? stripTones(q) : q.toLowerCase();

  var allRows = [];
  getMainRows().forEach(function(tr){
    if(!tr.classList.contains('cefr-hide') && !tr.classList.contains('pos-hide') && !tr.classList.contains('alpha-hide') && !tr.classList.contains('text-hide')) allRows.push(tr);
  });

  if(!useFlat){
    // Default sort + bySection on + no search: restore normal section view
    document.body.classList.remove('flat-view');
    document.body.classList.remove('searching');
    searchActive = false;
    filteredView.style.display = 'none';
    filteredView.innerHTML = '';
    allRows.forEach(function(tr){ tr.classList.remove('sr-hide'); });
    updateWordCount(allRows.length);
    renumVisible();
    updateEmptyGroups();
    if(typeof queueVirtualUpdate === 'function') queueVirtualUpdate(true);
    updateDragState();
    return;
  }

  document.body.classList.add('flat-view');
  searchActive = !!q;
  document.body.classList.toggle('searching', searchActive);
  updateDragState();

  // Filter by search query if one exists
  var matched = allRows;
  if(q){
    var effLang = lang;
    if(lang !== 'wd' && lang !== 'ipa' && lang !== 'kk' && lang !== 'ru' && lang !== 'def'){
      effLang = localeCode() === 'en' ? 'def' : localeCode();
    }
    var workerKey = qn + '|' + effLang;
    if(_searchWorkerReady){
      requestWorkerSearch(workerKey, q, effLang);
      if(_searchWorkerKey === workerKey && _searchMatchSet){
        matched = allRows.filter(function(tr){ return _searchMatchSet.has(tr._sidx); });
      } else {
        matched = [];
      }
    } else {
      matched = allRows.filter(function(tr){
        // Always search the headword and its IPA
        var zhTxt = (tr.getAttribute('data-key')||'').toLowerCase();
        var pyTxt = stripTones(tr.getAttribute('data-ipa')||'');
        var transTxt = '';
        if(effLang==='wd')      { return zhTxt.includes(qn); }
        else if(effLang==='ipa') { return pyTxt.includes(qn); }
        else if(effLang==='kk') { transTxt = (tr.getAttribute('data-kk')||'').toLowerCase(); }
        else if(effLang==='ru') { transTxt = (tr.getAttribute('data-ru')||'').toLowerCase(); }
        return zhTxt.includes(qn) || pyTxt.includes(qn) || transTxt.includes(qn);
      });
    }
  }

  if(textFilterActive && currentSort === 'default'){
    matched = sortRowsByCefr(matched, false);
  }

  // Apply global sort to matched rows when a non-default sort is active
  if(currentSort !== 'default'){
    if(currentSort === 'cefr-asc' || currentSort === 'cefr-desc'){
      matched = sortRowsByCefr(matched, currentSort === 'cefr-desc');
    }else{
      var keyAttr = {word:'data-key', root:'data-root-key', affix:'data-affix-key'}[currentSort];
      if(keyAttr) matched = sortRows(matched, keyAttr);
    }
  }

  matched.forEach(function(tr){ tr.classList.remove('sr-hide'); });
  allRows.filter(function(tr){ return matched.indexOf(tr)===-1; })
         .forEach(function(tr){ tr.classList.add('sr-hide'); });

  buildFilteredView(matched, bySection);
  updateWordCount(matched.length);
  updateEmptyGroups();
  if(typeof queueVirtualUpdate === 'function') queueVirtualUpdate(true);
}

/* ── Virtualized rows (manual windowing) ──────────────────────── */
var _virtTables = [];
var _virtDirty = true;
var _virtTick = false;
var _virtInitDone = false;
var VIRT_BUFFER_PX = 1200;
var VIRT_MIN_ROWS = 80;

function isRowFiltered(tr){
  return tr.classList.contains('cefr-hide') ||
         tr.classList.contains('pos-hide') ||
         tr.classList.contains('alpha-hide') ||
         tr.classList.contains('text-hide') ||
         tr.classList.contains('sr-hide');
}

function makeSpacerTbody(colCount){
  var tb = document.createElement('tbody');
  tb.className = 'virt-pad';
  var tr = document.createElement('tr');
  tr.className = 'virt-spacer';
  var td = document.createElement('td');
  td.colSpan = colCount;
  td.style.height = '0px';
  td.style.padding = '0';
  td.style.border = '0';
  tr.appendChild(td);
  tb.appendChild(tr);
  return { tbody: tb, cell: td };
}

function markVirtualDirty(){ _virtDirty = true; }

function registerVirtualTbody(tb){
  if(!_virtInitDone) return;
  if(!tb) return;
  if(_virtTables.some(function(info){ return info.tbody === tb; })) return;
  var rows = Array.prototype.slice.call(tb.rows);
  if(!rows.length || rows.length < VIRT_MIN_ROWS) return;
  var table = tb.closest('table');
  if(!table) return;
  rows.forEach(function(r,i){ r._virtIndex = i; });
  var defaultHeight = rows[0].getBoundingClientRect().height || 28;
  var colCount = rows[0].children.length || (table.querySelectorAll('thead th').length || 6);
  var top = makeSpacerTbody(colCount);
  var bottom = makeSpacerTbody(colCount);
  table.insertBefore(top.tbody, tb);
  if(tb.nextSibling) table.insertBefore(bottom.tbody, tb.nextSibling);
  else table.appendChild(bottom.tbody);
  var heights = new Array(rows.length);
  for(var i=0;i<rows.length;i++) heights[i] = defaultHeight;
  _virtTables.push({
    tbody: tb,
    table: table,
    rows: rows,
    heights: heights,
    defaultHeight: defaultHeight,
    topPad: top,
    botPad: bottom,
    visible: [],
    prefix: [],
    total: 0
  });
  markVirtualDirty();
  queueVirtualUpdate(true);
}

function unregisterVirtualTbody(tb){
  if(!tb) return;
  for(var i=_virtTables.length-1;i>=0;i--){
    if(_virtTables[i].tbody === tb){
      _virtTables.splice(i,1);
      break;
    }
  }
}

function recalcVirtualHeights(){
  _virtTables.forEach(function(info){
    var h = info.defaultHeight || 28;
    info.heights = new Array(info.rows.length);
    for(var i=0;i<info.rows.length;i++) info.heights[i] = h;
  });
  markVirtualDirty();
}

function buildVisible(info){
  var vis = [];
  var heights = [];
  var prefix = [0];
  var total = 0;
  for(var i=0;i<info.rows.length;i++){
    var r = info.rows[i];
    if(isRowFiltered(r)){
      r.classList.remove('virt-hidden');
      continue;
    }
    vis.push(r);
    var h = info.heights[i] || info.defaultHeight || 28;
    heights.push(h);
    total += h;
    prefix.push(total);
  }
  info.visible = vis;
  info.visHeights = heights;
  info.prefix = prefix;
  info.total = total;
}

function findIndex(prefix, y){
  var lo = 0, hi = prefix.length - 1;
  while(lo < hi){
    var mid = Math.floor((lo + hi) / 2);
    if(prefix[mid] <= y) lo = mid + 1;
    else hi = mid;
  }
  var idx = lo - 1;
  if(idx < 0) idx = 0;
  if(idx > prefix.length - 2) idx = prefix.length - 2;
  return idx;
}

function updateVirtual(){
  if(document.body.classList.contains('flat-view')) return;
  var viewTop = window.scrollY - VIRT_BUFFER_PX;
  var viewBot = window.scrollY + window.innerHeight + VIRT_BUFFER_PX;
  _virtTables.forEach(function(info){
    if(_virtDirty) buildVisible(info);
    var vis = info.visible;
    var total = info.total;
    if(!vis.length){
      info.topPad.cell.style.height = '0px';
      info.botPad.cell.style.height = '0px';
      return;
    }
    var listTop = info.topPad.tbody.getBoundingClientRect().top + window.scrollY;
    var relTop = viewTop - listTop;
    var relBot = viewBot - listTop;
    if(relBot < 0 || relTop > total){
      vis.forEach(function(r){ r.classList.add('virt-hidden'); });
      info.topPad.cell.style.height = total + 'px';
      info.botPad.cell.style.height = '0px';
      return;
    }
    var start = findIndex(info.prefix, Math.max(0, relTop));
    var end = findIndex(info.prefix, Math.max(0, relBot));
    if(end < start) end = start;
    var topH = info.prefix[start];
    var bottomH = total - info.prefix[end + 1];
    info.topPad.cell.style.height = topH + 'px';
    info.botPad.cell.style.height = bottomH + 'px';
    for(var i=0;i<vis.length;i++){
      if(i >= start && i <= end) vis[i].classList.remove('virt-hidden');
      else vis[i].classList.add('virt-hidden');
    }
  });
  _virtDirty = false;
}

function queueVirtualUpdate(force){
  if(force) _virtDirty = true;
  if(_virtTick) return;
  _virtTick = true;
  requestAnimationFrame(function(){
    _virtTick = false;
    updateVirtual();
  });
}

function initVirtualTables(){
  if(_virtInitDone) return;
  _virtInitDone = true;
  var tbodies = document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody)');
  tbodies.forEach(function(tb){
    var rows = Array.prototype.slice.call(tb.rows);
    if(!rows.length || rows.length < VIRT_MIN_ROWS) return;
    var table = tb.closest('table');
    if(!table) return;
    rows.forEach(function(r,i){ r._virtIndex = i; });
    var defaultHeight = rows[0].getBoundingClientRect().height || 28;
    var colCount = rows[0].children.length || (table.querySelectorAll('thead th').length || 6);
    var top = makeSpacerTbody(colCount);
    var bottom = makeSpacerTbody(colCount);
    table.insertBefore(top.tbody, tb);
    if(tb.nextSibling) table.insertBefore(bottom.tbody, tb.nextSibling);
    else table.appendChild(bottom.tbody);
    var heights = new Array(rows.length);
    for(var i=0;i<rows.length;i++) heights[i] = defaultHeight;
    _virtTables.push({
      tbody: tb,
      table: table,
      rows: rows,
      heights: heights,
      defaultHeight: defaultHeight,
      topPad: top,
      botPad: bottom,
      visible: [],
      prefix: [],
      total: 0
    });
  });
  markVirtualDirty();
  queueVirtualUpdate(true);
  window.addEventListener('scroll', queueVirtualUpdate, {passive:true});
  window.addEventListener('resize', function(){ recalcVirtualHeights(); queueVirtualUpdate(true); });
  ['size-word','size-ipa','size-trans'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.addEventListener('input', function(){ recalcVirtualHeights(); queueVirtualUpdate(true); });
  });
}

document.addEventListener('DOMContentLoaded', function(){
  function kick(){
    initVirtualTables();
  }
  if('requestIdleCallback' in window){
    requestIdleCallback(kick, { timeout: 1500 });
  } else {
    setTimeout(kick, 1500);
  }
  var firstScroll = function(){
    kick();
    window.removeEventListener('scroll', firstScroll);
  };
  window.addEventListener('scroll', firstScroll, { passive: true });
});

function applySort(mode){
  currentSort = mode;
  updateDragState();

  // Update sort buttons
  document.querySelectorAll('.sort-btn').forEach(function(b){ b.classList.remove('active'); });
  var activeBtn = {default:'sort-default',word:'sort-word',root:'sort-root',affix:'sort-affix','cefr-asc':'sort-cefr-asc','cefr-desc':'sort-cefr-desc'}[mode];
  if(activeBtn){ var ab=document.getElementById(activeBtn); if(ab) ab.classList.add('active'); }

  if(mode === 'default'){
    // Restore original HTML order captured on page load
    getTbodiesForSort().forEach(function(tb){
      var saved = _origOrder[tb.id];
      if(!saved || !saved.length) return;
      var map = {};
      for(var i=0;i<tb.rows.length;i++){
        var z=tb.rows[i].querySelector('.wd'); if(z) map[z.textContent.trim()]=tb.rows[i];
      }
      saved.forEach(function(w){ var tr=map[w]; if(tr) tb.appendChild(tr); });
      renum(tb);
    });
    rebuildView();
    return;
  }

  // Sort within each section's tbody (NEVER move rows between tbodies –
  // bySection=false flat view is handled by rebuildView/filteredView).
  if(mode === 'cefr-asc' || mode === 'cefr-desc'){
    getTbodiesForSort().forEach(function(tb){
      var rows = Array.prototype.slice.call(tb.rows);
      var sorted = sortRowsByCefr(rows, mode === 'cefr-desc');
      sorted.forEach(function(tr){ tb.appendChild(tr); });
      renum(tb);
    });
    rebuildView();
    return;
  }
  var keyAttr = {word:'data-key', root:'data-root-key', affix:'data-affix-key'}[mode];
  if(!keyAttr) return;

  getTbodiesForSort().forEach(function(tb){
    var rows = Array.prototype.slice.call(tb.rows);
    var sorted = sortRows(rows, keyAttr);
    sorted.forEach(function(tr){ tb.appendChild(tr); });
    renum(tb);
  });

  rebuildView();
}

function renum(tb){ for(var i=0;i<tb.rows.length;i++){ var c=tb.rows[i].querySelector('.rownum'); if(c) c.textContent=i+1; } }

function updateDragState(){
  // Disable/enable sortable drag based on search/sort state
  if(typeof window._cdxSortables !== 'undefined'){
    var disable = searchActive || currentSort !== 'default';
    window._cdxSortables.forEach(function(s){ if(s) try{ s.option('disabled', disable); }catch(e){} });
  }
}

/* ── Flashcard study mode ──────────────────────────────────────── */
(function(){
  var deck=[], pos=0, known=0, learning=0, unknown=0;
  var overlay = document.getElementById('study-overlay');
  if(!overlay) return;

  function rowVisible(tr){
    return !tr.classList.contains('sr-hide') &&
           !tr.classList.contains('cefr-hide') &&
           !tr.classList.contains('pos-hide') &&
           !tr.classList.contains('alpha-hide') &&
           !tr.classList.contains('text-hide');
  }

  function buildDeck(){
    deck = [];
    getMainRows().forEach(function(tr){
      if(!rowVisible(tr)) return;
      deck.push(tr);
    });
    // shuffle
    for(var i=deck.length-1;i>0;i--){
      var j=Math.floor(Math.random()*(i+1));
      var tmp=deck[i];deck[i]=deck[j];deck[j]=tmp;
    }
  }

  function showCard(idx){
    if(!deck.length) return;
    var tr = deck[idx];
    var zh = tr.querySelector('.wd'); var py = tr.querySelector('.ipa');
    var trans = tr.querySelector(transSel());
    var ex = tr.querySelector('.ex-en');
    document.getElementById('study-wd').textContent = zh ? zh.textContent : '';
    document.getElementById('study-ipa').textContent = py ? py.textContent : '';
    document.getElementById('study-trans').textContent = trans ? trans.textContent : '';
    document.getElementById('study-ex').textContent = ex ? ex.textContent : '';
    document.getElementById('study-pos').textContent = idx+1;
    document.getElementById('study-total').textContent = deck.length;
    document.getElementById('study-known').textContent = known;
    document.getElementById('study-learning').textContent = learning;
    document.getElementById('study-unknown').textContent = unknown;
    document.getElementById('study-back').style.display='none';
    document.getElementById('study-front').style.display='flex';
    document.getElementById('study-show').style.display='';
    document.getElementById('study-know').style.display='none';
    document.getElementById('study-learning').style.display='none';
    document.getElementById('study-dont').style.display='none';
    document.getElementById('study-summary').style.display='none';
    var pb = document.getElementById('study-prog-bar');
    if(pb && deck.length) pb.style.width = (idx/deck.length*100)+'%';
  }

  function showAnswer(){
    document.getElementById('study-back').style.display='flex';
    document.getElementById('study-show').style.display='none';
    document.getElementById('study-know').style.display='';
    document.getElementById('study-learning').style.display='';
    document.getElementById('study-dont').style.display='';
    speakEn(document.getElementById('study-wd').textContent);
  }

  function markRow(tr, status){
    if(!tr) return;
    var lcb = tr.querySelector('.learn-cb');
    var fcb = tr.querySelector('.fam-cb');
    if(status === 'learned' && lcb){
      lcb.checked = true;
      lcb.dispatchEvent(new Event('change', {bubbles:true}));
    } else if(status === 'fam' && fcb){
      fcb.checked = true;
      fcb.dispatchEvent(new Event('change', {bubbles:true}));
    }
  }

  function applyStatus(kind){
    var tr = deck[pos];
    if(kind === 'learned'){ known++; markRow(tr, 'learned'); }
    else if(kind === 'learning'){ learning++; markRow(tr, 'fam'); }
    else { unknown++; }
    pos++;
    if(pos >= deck.length){ showSummary(); return; }
    showCard(pos);
  }

  function showSummary(){
    document.getElementById('study-front').style.display='none';
    document.getElementById('study-back').style.display='none';
    document.getElementById('study-show').style.display='none';
    document.getElementById('study-know').style.display='none';
    document.getElementById('study-learning').style.display='none';
    document.getElementById('study-dont').style.display='none';
    document.getElementById('study-summary').style.display='flex';
    var pct = deck.length ? Math.round(known/deck.length*100) : 0;
    document.getElementById('study-summary-text').innerHTML =
      '<b>' + T('study_known','Known') + ':</b> ' + known + '/' + deck.length + ' (' + pct + '%)'
      + '  &nbsp; <b>' + T('study_learning','Learning') + ':</b> ' + learning
      + '  &nbsp; <b>' + T('study_unknown','Don\'t know') + ':</b> ' + unknown;
  }

  function openStudy(){
    buildDeck();
    pos=0; known=0; learning=0; unknown=0;
    if(!deck.length){ alert(T('no_cards','No cards to study!')); return; }
    overlay.style.display='flex';
    showCard(0);
  }

  function closeStudy(){
    overlay.style.display='none';
    stopAllAudio();
  }

  document.getElementById('btn-study').addEventListener('click', openStudy);
  document.getElementById('study-close').addEventListener('click', closeStudy);
  document.getElementById('study-close2').addEventListener('click', closeStudy);
  document.getElementById('study-show').addEventListener('click', showAnswer);
  document.getElementById('study-know').addEventListener('click', function(){ applyStatus('learned'); });
  document.getElementById('study-learning').addEventListener('click', function(){ applyStatus('learning'); });
  document.getElementById('study-dont').addEventListener('click', function(){ applyStatus('dont'); });
  document.getElementById('study-again').addEventListener('click', function(){
    pos=0; known=0; learning=0; unknown=0;
    for(var i=deck.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=deck[i];deck[i]=deck[j];deck[j]=tmp; }
    showCard(0);
  });
  document.getElementById('study-wd').addEventListener('click', function(){
    speakEn(this.textContent);
  });
  document.addEventListener('keydown', function(e){
    if(overlay.style.display==='none') return;
    if(e.key==='Escape'){ closeStudy(); return; }
    var back = document.getElementById('study-back');
    if(e.key===' '||e.key==='Enter'){
      if(back.style.display==='none') showAnswer(); else applyStatus('learned');
      e.preventDefault();
    }
    if(e.key==='ArrowRight' && back.style.display!=='none') applyStatus('learned');
    if(e.key==='ArrowDown' && back.style.display!=='none') applyStatus('learning');
    if(e.key==='ArrowLeft' && back.style.display!=='none') applyStatus('dont');
  });
})();
/* ── Multiple-choice quiz ──────────────────────────────────────── */
(function(){
  var deck=[], qPos=0, score=0, answered=false, statusChosen=false;
  var overlay = document.getElementById('quiz-overlay');
  if(!overlay) return;
  var setup = document.getElementById('quiz-setup');
  var main = document.getElementById('quiz-main');
  var quizLevels = new Set();
  var hideIpa = false;

  function rowVisible(tr){
    return !tr.classList.contains('sr-hide') &&
           !tr.classList.contains('cefr-hide') &&
           !tr.classList.contains('pos-hide') &&
           !tr.classList.contains('alpha-hide') &&
           !tr.classList.contains('text-hide');
  }

  function getRows(){
    var rows=[];
    getMainRows().forEach(function(tr){
      if(!rowVisible(tr)) return;
      if(quizLevels.size){
        var h = tr.getAttribute('data-cefr') || '';
        if(!quizLevels.has(h)) return;
      }
      rows.push(tr);
    });
    return rows;
  }

  function shuffle(arr){
    for(var i=arr.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=arr[i];arr[i]=arr[j];arr[j]=t;}
    return arr;
  }

  function getText(tr, type){
    if(type==='wd') return (tr.querySelector('.wd')||{}).textContent||'';
    if(type==='ipa') return (tr.querySelector('.ipa')||{}).textContent||'';
    if(type==='trans') return (tr.querySelector(transSel())||{}).textContent||'';
    return '';
  }

  function updateIpaVisibility(){
    var py = document.getElementById('quiz-ipa');
    if(py) py.style.display = hideIpa ? 'none' : '';
    var card = document.getElementById('quiz-card');
    if(card) card.classList.toggle('quiz-hide-ipa', hideIpa);
    var btn = document.getElementById('quiz-toggle-ipa');
    if(btn) btn.textContent = hideIpa ? T('ipa_show','IPA: show') : T('ipa_hide','IPA: hide');
  }

  function buildQuiz(){
    var all=shuffle(getRows().slice());
    var qs = parseInt((document.getElementById('quiz-size')||{value:'50'}).value)||50;
    deck=all.slice(0,Math.min(qs,all.length));
    qPos=0; score=0;
  }

  function showQuestion(idx){
    if(idx>=deck.length){showSummary();return;}
    answered=false; statusChosen=false;
    var tr=deck[idx];
    document.getElementById('quiz-pos').textContent=idx+1;
    document.getElementById('quiz-total').textContent=deck.length;
    document.getElementById('quiz-score').textContent=score;
    document.getElementById('quiz-wd').textContent=getText(tr,'wd');
    document.getElementById('quiz-ipa').textContent=getText(tr,'ipa');
    updateIpaVisibility();
    document.getElementById('quiz-feedback').style.display='none';
    document.getElementById('quiz-feedback').className='';
    document.getElementById('quiz-summary').style.display='none';
    var qa = document.getElementById('quiz-actions');
    if(qa) qa.style.display='none';
    var nextBtn = document.getElementById('quiz-next');
    if(nextBtn) nextBtn.disabled = true;

    var all=getRows();
    var wrong=shuffle(all.filter(function(r){return r!==tr;})).slice(0,3);
    var choices=shuffle([tr].concat(wrong));
    var qc=document.getElementById('quiz-choices');
    qc.innerHTML='';
    choices.forEach(function(c){
      var btn=document.createElement('button');
      btn.className='quiz-choice';
      btn.textContent=getText(c,'trans');
      btn.addEventListener('click',function(){
        if(answered) return;
        answered=true;
        var isCorrect=c===tr;
        btn.classList.add(isCorrect?'correct':'wrong');
        if(!isCorrect){
          qc.querySelectorAll('.quiz-choice').forEach(function(b){
            if(b.textContent===getText(tr,'trans')) b.classList.add('reveal');
          });
        }
        var fb=document.getElementById('quiz-feedback');
        fb.style.display='block';
        if(isCorrect){
          score++;
          document.getElementById('quiz-score').textContent=score;
          fb.textContent='✓ '+T('quiz_right','Correct!');fb.className='ok';
        } else {
          fb.textContent='✗ '+T('quiz_wrong','Wrong');fb.className='err';
        }
                if(qa){ qa.style.display='flex'; qa.style.visibility='visible'; }
        try{ speakEn(getText(tr,'wd')); }catch(e){}
      });
      qc.appendChild(btn);
    });
  }

  function markRow(tr, status){
    if(!tr) return;
    var lcb = tr.querySelector('.learn-cb');
    var fcb = tr.querySelector('.fam-cb');
    if(status === 'learned' && lcb){
      lcb.checked = true;
      lcb.dispatchEvent(new Event('change', {bubbles:true}));
    } else if(status === 'fam' && fcb){
      fcb.checked = true;
      fcb.dispatchEvent(new Event('change', {bubbles:true}));
    }
  }

  function applyStatus(kind){
    if(statusChosen) return;
    statusChosen = true;
    var tr = deck[qPos];
    if(kind === 'learned') markRow(tr, 'learned');
    else if(kind === 'learning') markRow(tr, 'fam');
    var nextBtn = document.getElementById('quiz-next');
    if(nextBtn) nextBtn.disabled = false;
  }

  function showSummary(){
    document.getElementById('quiz-choices').innerHTML='';
    document.getElementById('quiz-feedback').style.display='none';
    var qa = document.getElementById('quiz-actions');
    if(qa) qa.style.display='none';
    var pct=deck.length?Math.round(score/deck.length*100):0;
    var emoji = pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪';
    document.getElementById('quiz-summary-text').innerHTML =
      emoji + ' ' + T('quiz_score','Score') + ': <b>' + score + '/' + deck.length
      + '</b><br>' + T('quiz_grade','Grade') + ': <b>' + pct + '/100</b>';
    document.getElementById('quiz-summary').style.display='block';
  }

  function openSetup(){
    if(setup) setup.style.display='flex';
    if(main) main.style.display='none';
    document.getElementById('quiz-summary').style.display='none';
  }

  function open(){
    overlay.style.display='flex';
    openSetup();
  }

  function startQuiz(){
    hideIpa = !!(document.getElementById('quiz-hide-ipa')||{}).checked;
    updateIpaVisibility();
    buildQuiz();
    if(!deck.length){ alert('Нет слов для теста!'); return; }
    if(setup) setup.style.display='none';
    if(main) main.style.display='flex';
    showQuestion(0);
  }

  function close(){
    overlay.style.display='none';
    stopAllAudio();
  }

  function nextQuestion(){
    if(!answered || !statusChosen) return;
    qPos++; showQuestion(qPos);
  }

  var levelWrap = document.getElementById('quiz-levels');
  if(levelWrap){
    levelWrap.querySelectorAll('.quiz-level-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var lvl = this.getAttribute('data-level');
        if(lvl === 'all'){
          quizLevels.clear();
        } else {
          if(quizLevels.has(lvl)) quizLevels.delete(lvl); else quizLevels.add(lvl);
        }
        var hasSel = quizLevels.size > 0;
        levelWrap.querySelectorAll('.quiz-level-btn').forEach(function(b){
          var l = b.getAttribute('data-level');
          b.classList.toggle('active', l === 'all' ? !hasSel : quizLevels.has(l));
        });
      });
    });
  }

  document.getElementById('btn-quiz').addEventListener('click', open);
  document.getElementById('quiz-start').addEventListener('click', startQuiz);
  document.getElementById('quiz-exit').addEventListener('click', close);
  document.getElementById('quiz-setup-close').addEventListener('click', close);
  document.getElementById('quiz-close').addEventListener('click', close);
  document.getElementById('quiz-close2').addEventListener('click', close);
  document.getElementById('quiz-again').addEventListener('click', startQuiz);
  document.getElementById('quiz-next').addEventListener('click', nextQuestion);
  document.getElementById('quiz-know').addEventListener('click', function(){ applyStatus('learned'); });
  document.getElementById('quiz-learning').addEventListener('click', function(){ applyStatus('learning'); });
  document.getElementById('quiz-dont').addEventListener('click', function(){ applyStatus('dont'); });
  document.getElementById('quiz-toggle-ipa').addEventListener('click', function(){ hideIpa = !hideIpa; updateIpaVisibility(); });
  document.getElementById('quiz-wd').addEventListener('click', function(){
    var tr=deck[qPos];
    if(tr) speakEn(getText(tr,'wd'));
  });
  document.addEventListener('keydown',function(e){
    if(overlay.style.display==='none') return;
    if(e.key==='Escape') close();
    if(e.key>='1'&&e.key<='4'){
      var btns=document.querySelectorAll('.quiz-choice');
      var idx=parseInt(e.key)-1;
      if(btns[idx]&&!answered) btns[idx].click();
    }
    if((e.key==='Enter' || e.key===' ') && answered && statusChosen){
      e.preventDefault();
      nextQuestion();
    }
  });
})();
document.addEventListener('DOMContentLoaded', function(){
  var btns = {
    'sort-default': 'default',
    'sort-word': 'word',
    'sort-root': 'root',
    'sort-affix': 'affix',
    'sort-cefr-asc': 'cefr-asc',
    'sort-cefr-desc': 'cefr-desc'
  };
  Object.keys(btns).forEach(function(id){
    var btn = document.getElementById(id);
    if(btn) btn.addEventListener('click', function(){ applySort(btns[id]); });
  });
  var rd = document.getElementById('sort-respect-div');
  if(rd) rd.addEventListener('change', function(){
    if(currentSort !== 'default') applySort(currentSort);
    else rebuildView();
  });
});

/* ── Drag integration — patch existing SortableJS init ──────────────────── */
// Override the existing SortableJS init to store references and use new options
document.addEventListener('DOMContentLoaded', function(){
  if(!window._cdxSortables) window._cdxSortables = [];
});

/* ── Snapshots ────────────────────────────────────────────────────────────── */
var SNAP_KEY = 'eng_snapshots';

function getSnapshots(){
  try{ return JSON.parse(localStorage.getItem(SNAP_KEY)||'[]'); }catch(e){ return []; }
}
function saveSnapshots(snaps){
  localStorage.setItem(SNAP_KEY, JSON.stringify(snaps));
}

function captureSnapshot(){
  var snap = {};
  snap.ts = Date.now();
  snap.isoDate = new Date().toISOString().slice(0,16).replace('T',' ');

  // learned
  var lT = document.getElementById('learned-tbody');
  var fT = document.getElementById('fam-tbody');
  var learned = [], fam = [];
  if(lT) for(var i=0;i<lT.rows.length;i++){ var z=lT.rows[i].querySelector('.wd'); if(z) learned.push(z.textContent.trim()); }
  if(fT) for(var i=0;i<fT.rows.length;i++){ var z=fT.rows[i].querySelector('.wd'); if(z) fam.push(z.textContent.trim()); }
  snap.learned = learned;
  snap.fam = fam;
  snap.total = _wc;

  // row orders
  var order = {};
  _allTbodies.forEach(function(tb){
    var ids=[];
    for(var i=0;i<tb.rows.length;i++){ var z=tb.rows[i].querySelector('.wd'); if(z) ids.push(z.textContent.trim()); }
    if(ids.length) order[tb.id]=ids;
  });
  snap.order = order;

  // hidden cols
  snap.hiddenCols = ['num','word','trans','ex'].filter(function(c){ return document.body.classList.contains('hide-'+c); });
  snap.mode = localStorage.getItem('eng_mode') || 'light';

  return snap;
}

function renderSnapshotDropdown(){
  var dd = document.getElementById('snap-dropdown');
  if(!dd) return;
  var snaps = getSnapshots();
  if(!snaps.length){
    dd.innerHTML = '<div class="cdx-dropdown-item" style="color:#999">'+T('no_snapshots','No snapshots')+'</div>';
    return;
  }
  dd.innerHTML = '';
  snaps.slice().reverse().forEach(function(snap, ri){
    var i = snaps.length - 1 - ri;
    var item = document.createElement('div');
    item.className = 'cdx-dropdown-item';
    var lCount = (snap.learned||[]).length;
    var fCount = (snap.fam||[]).length;
    var toLearn = snap.total - lCount;
    item.innerHTML = '<b>' + snap.isoDate + '</b><br><small>'
      + T('snap_total','Total') + ': ' + snap.total + ' | '
      + T('snap_learned','Learned') + ': ' + lCount + ' | '
      + T('snap_left','Left') + ': ' + toLearn + '</small>';
    item.addEventListener('click', (function(idx){ return function(){
      dd.classList.remove('open');
      cdxConfirm(
        T('snap_restore_q','Restore snapshot from') + ' ' + snaps[idx].isoDate + '?\n'
          + T('snap_restore_warn','All current changes will be replaced.'),
        function(){ restoreSnapshot(snaps[idx]); },
        T('restore','Restore'),
        T('cancel','Cancel')
      );
    }; })(i));
    // Delete button
    var del = document.createElement('span');
    del.textContent = ' ✕';
    del.style.cssText = 'color:#e94560;cursor:pointer;float:right;font-size:.9em';
    del.addEventListener('click', (function(idx){ return function(e){
      e.stopPropagation();
      var s = getSnapshots(); s.splice(idx,1); saveSnapshots(s); renderSnapshotDropdown();
    }; })(i));
    item.appendChild(del);
    dd.appendChild(item);
  });
}

function restoreSnapshot(snap){
  // restore order first
  if(snap.order){
    Object.keys(snap.order).forEach(function(tbId){
      var tb = document.getElementById(tbId) || _allTbodies.find(function(t){ return t.id === tbId; });
      if(!tb) return;
      var map={};
      for(var i=0;i<tb.rows.length;i++){ var z=tb.rows[i].querySelector('.wd'); if(z) map[z.textContent.trim()]=tb.rows[i]; }
      snap.order[tbId].forEach(function(w){ var tr=map[w]; if(tr) tb.appendChild(tr); });
    });
    localStorage.setItem('eng_row_order', JSON.stringify(snap.order));
  }
  // restore learned / fam checkboxes
  var lT = document.getElementById('learned-tbody');
  var fT = document.getElementById('fam-tbody');
  // Uncheck all first (move back to original tbody)
  if(lT) while(lT.rows.length){
    var tr=lT.rows[0]; var cb=tr.querySelector('.learn-cb'); if(cb) cb.checked=false;
    var orig=tr.dataset.orig; var o=orig?document.getElementById(orig):null;
    if(!o && orig) o = _allTbodies.find(function(t){ return t.id === orig; });
    if(o){ o.appendChild(tr); } else { lT.removeChild(tr); }
  }
  if(fT) while(fT.rows.length){
    var tr=fT.rows[0]; var cb=tr.querySelector('.fam-cb'); if(cb) cb.checked=false;
    var orig=tr.dataset.orig; var o=orig?document.getElementById(orig):null;
    if(!o && orig) o = _allTbodies.find(function(t){ return t.id === orig; });
    if(o){ o.appendChild(tr); } else { fT.removeChild(tr); }
  }
  // Build word map
  var wMap={};
  _allRows.forEach(function(tr){
    var z=tr.querySelector('.wd'); if(z) wMap[z.textContent.trim()]=tr;
  });
  (snap.learned||[]).forEach(function(w){
    var tr=wMap[w]; if(!tr) return;
    var cb=tr.querySelector('.learn-cb'); if(cb) cb.checked=true;
    if(lT) lT.appendChild(tr);
  });
  (snap.fam||[]).forEach(function(w){
    var tr=wMap[w]; if(!tr) return;
    var cb=tr.querySelector('.fam-cb'); if(cb) cb.checked=true;
    if(fT) fT.appendChild(tr);
  });
  // save LS
  localStorage.setItem('eng_learned', JSON.stringify(snap.learned||[]));
  localStorage.setItem('eng_fam', JSON.stringify(snap.fam||[]));
  // renum
  document.querySelectorAll('tbody[id]').forEach(function(tb){ renum(tb); });
  // update vis
  var lS=document.getElementById('learned-section'), fS=document.getElementById('fam-section');
  if(lS) lS.style.display=lT&&lT.rows.length?'block':'none';
  if(fS) fS.style.display=fT&&fT.rows.length?'block':'none';
  var stl=document.getElementById('st-lrn'), stf=document.getElementById('st-fam');
  if(stl) stl.textContent=lT?lT.rows.length:0;
  if(stf) stf.textContent=fT?fT.rows.length:0;
  // hidden cols
  ['num','word','trans','ex'].forEach(function(c){ document.body.classList.remove('hide-'+c); });
  (snap.hiddenCols||[]).forEach(function(c){ document.body.classList.add('hide-'+c); });
  // persist hidden col state + update toolbar button visuals (Bug 5)
  ['num','word','trans','ex'].forEach(function(c){
    var h = document.body.classList.contains('hide-'+c);
    localStorage.setItem('eng-hide-'+c, h ? '1' : '');
    var btn = document.querySelector('.col-btn[data-col="'+c+'"]');
    if(btn) btn.classList.toggle('hidden', h);
  });
  // restore display mode (Bug 6)
  if(snap.mode){
    document.body.classList.remove('light','dark','sepia');
    if(snap.mode !== 'light') document.body.classList.add(snap.mode);
    localStorage.setItem('eng_mode', snap.mode);
    document.querySelectorAll('.mode-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.mode===snap.mode); });
  }
}

document.addEventListener('DOMContentLoaded', function(){
  var btnSave = document.getElementById('btn-save-snap');
  var btnDd = document.getElementById('btn-snap-dd');
  var snapDd = document.getElementById('snap-dropdown');

  if(btnSave) btnSave.addEventListener('click', function(){
    var snap = captureSnapshot();
    var snaps = getSnapshots();
    snaps.push(snap);
    if(snaps.length > 50) snaps = snaps.slice(-50);
    saveSnapshots(snaps);
    renderSnapshotDropdown();
    // Visual feedback
    var orig = btnSave.textContent;
    btnSave.textContent = '✓ ' + T('saved','Saved');
    setTimeout(function(){ btnSave.textContent = orig; }, 1500);
  });

  if(btnDd) btnDd.addEventListener('click', function(e){
    e.stopPropagation();
    renderSnapshotDropdown();
    if(snapDd) snapDd.classList.toggle('open');
  });

  document.addEventListener('click', function(){
    if(snapDd) snapDd.classList.remove('open');
  });
  if(snapDd) snapDd.addEventListener('click', function(e){ e.stopPropagation(); });
});

document.addEventListener('DOMContentLoaded', function(){
  var toolsBtn = document.getElementById('btn-tools-toggle');
  var tools = document.getElementById('tb-tools');
  if(toolsBtn && tools){
    toolsBtn.addEventListener('click', function(){
      tools.classList.toggle('open');
      toolsBtn.classList.toggle('active', tools.classList.contains('open'));
    });
  }
});

/* ── Reset Everything ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function(){
  var btnReset = document.getElementById('btn-reset-all');
  if(btnReset) btnReset.addEventListener('click', function(){
    cdxConfirm(
      T('reset_q','Reset everything and return to the original state?') + '\n'
        + T('reset_warn','All progress, snapshots and settings will be removed.'),
      function(){
        var keys = [];
        for(var i=0;i<localStorage.length;i++){
          var k=localStorage.key(i);
          if(k && k.startsWith('eng')) keys.push(k);
        }
        keys.push('eng_snapshots','eng_palette','eng_locale');
        keys.forEach(function(k){ localStorage.removeItem(k); });
        location.reload();
      }
    );
  });
});

/* ── Confirmation popup helper ────────────────────────────────────────────── */
function cdxConfirm(msg, onOk, okLabel, cancelLabel){
  var overlay = document.getElementById('cdx-confirm');
  var msgEl = document.getElementById('cdx-confirm-msg');
  var cancelBtn = document.getElementById('cdx-conf-cancel');
  var okBtn = document.getElementById('cdx-conf-ok');
  if(!overlay) return;
  msgEl.textContent = msg;
  overlay.classList.add('open');
  function close(){ overlay.classList.remove('open'); }
  cancelBtn.textContent = cancelLabel || T('cancel','Cancel');
  okBtn.textContent = okLabel || T('confirm','Confirm');
  cancelBtn.onclick = close;
  okBtn.onclick = function(){ close(); onOk(); };
}

/* ── Sortable init now runs on-demand (see initSortableNow) ───── */

})();


/* ── Back to top ──────────────────────────────────────────────── */
(function(){
  var btn = document.getElementById('back-to-top');
  if(!btn) return;
  window.addEventListener('scroll', function(){
    btn.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });
  btn.addEventListener('click', function(){
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* ── Mobile hamburger ────────────────────────────────────────── */
(function(){
  var hbBtn = document.getElementById('hamburger-btn');
  var toolbar = document.getElementById('toolbar');
  var overlay = document.getElementById('mobile-overlay');
  var mSearch = document.getElementById('mobile-search-input');
  var mainSearch = document.getElementById('search-input');
  if(!hbBtn || !toolbar) return;

  hbBtn.addEventListener('click', function(){
    var open = toolbar.classList.toggle('mobile-open');
    if(overlay) overlay.style.display = open ? 'block' : 'none';
  });

  if(mSearch && mainSearch){
    mSearch.addEventListener('input', function(){
      mainSearch.value = this.value;
      mainSearch.dispatchEvent(new Event('input'));
    });
    mainSearch.addEventListener('input', function(){
      if(mSearch.value !== this.value) mSearch.value = this.value;
    });
  }
})();

/* ── Excel Export (SheetJS) ──────────────────────────────────────── */
(function(){
  var btn = document.getElementById('btn-export-csv');
  if(!btn) return;
  btn.addEventListener('click', function(){
    var today = new Date().toISOString().slice(0,10);
    var rows = [['Word','IPA','Definition','Translation','POS','CEFR','Example','Example (IPA)']];
    document.querySelectorAll('tr[data-key]').forEach(function(tr){
      if(tr.offsetParent === null) return;
      rows.push([
        tr.getAttribute('data-key') || '',
        tr.getAttribute('data-ipa') || '',
        tr.getAttribute('data-kk') || '',
        tr.getAttribute('data-ru') || '',
        (tr.getAttribute('data-section') || '').replace('pos_',''),
        tr.getAttribute('data-cefr') || '',
        (tr.querySelector('.ex-en') || {}).textContent || '',
        (tr.querySelector('.ex-ipa') || {}).textContent || ''
      ]);
    });
    if(typeof XLSX !== 'undefined'){
      var ws = XLSX.utils.aoa_to_sheet(rows);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'HSK Dictionary');
      XLSX.writeFile(wb, 'HSK_Dictionary_' + today + '.xlsx');
    } else {
      // CSV fallback
      var csv = rows.map(function(r){
        return r.map(function(c){ return '"' + String(c).replace(/"/g,'""') + '"'; }).join(',');
      }).join('\n');
      var a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
      a.download = 'HSK_Dictionary_' + today + '.csv';
      a.click();
    }
  });
})();







/* ── Anki Export (tab-separated .txt) ──────────────────────────── */
(function(){
  var btn = document.getElementById('btn-export-anki');
  if(!btn) return;
  btn.addEventListener('click', function(){
    var today = new Date().toISOString().slice(0,10);
    var lines = [];
    document.querySelectorAll('tr[data-key]').forEach(function(tr){
      if(tr.offsetParent === null) return;
      var zh  = tr.getAttribute('data-key') || '';
      var py  = tr.getAttribute('data-ipa')  || '';
      var en  = tr.getAttribute('data-kk')  || '';
      var ru  = tr.getAttribute('data-ru')  || '';
      var hsk = tr.getAttribute('data-cefr') || '';
      var pos = (tr.getAttribute('data-section') || '').replace('pos_','');
      var exZh = (tr.querySelector('.ex-en') || {}).textContent || '';
      var exPy = (tr.querySelector('.ex-ipa') || {}).textContent || '';
      // Front: word + IPA; Back: translation + example
      var front = zh + '<br>' + py;
      var back  = ru + (en ? '<br>' + en : '');
      if(exZh) back += '<br><br>' + exZh + '<br>' + exPy;
      var tags  = 'HSK' + hsk + ' ' + pos;
      // Escape tabs/newlines in content
      function esc(s){ return s.replace(/\t/g,' ').replace(/\r?\n/g,' '); }
      lines.push(esc(front) + '\t' + esc(back) + '\t' + tags);
    });
    // UTF-8 BOM + tab-separated
    var bom = '\ufeff';
    var blob = new Blob([bom + lines.join('\n')], {type:'text/plain;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'HSK_Anki_' + today + '.txt'; a.click();
    URL.revokeObjectURL(url);
  });
})();

/* ── Channels Player ─────────────────────────────────────────── */
(function(){
  var TV_CHANNELS = window.TV_CHANNELS || window.ALL_CHANNELS || [];
  var RADIO_CHANNELS = window.RADIO_CHANNELS || [];
  var NAME_MAP = window.CHANNEL_NAME_MAP || {};

  function translateName(name){
    if(NAME_MAP && NAME_MAP[name]) return NAME_MAP[name];
    if(/^CCTV[-\s]?(\d+)$/i.test(name)) return 'CCTV-' + RegExp.$1;
    return name;
  }

  function qualityRank(label){
    var t = String(label || '').toLowerCase().trim();
    if(t === 'auto') return -1;
    if(t === 'best') return 10000;
    var m = t.match(/(\d+)\s*p/);
    if(m) return parseInt(m[1],10);
    return 9999;
  }

  function getSelectLabel(){
    var typeSel = document.getElementById('news-type');
    var type = typeSel ? typeSel.value : 'tv';
    if(type === 'radio') return T('select_station','Select station');
    return T('select_channel','Select channel');
  }

  function getSourceList(type){
    if(type === 'radio' && RADIO_CHANNELS && RADIO_CHANNELS.length){ return RADIO_CHANNELS; }
    return TV_CHANNELS || [];
  }

  function buildChannelMap(list){
    var map = Object.create(null);
    var seen = Object.create(null);
    for(var i=0;i<list.length;i++){
      var row = list[i];
      if(!row || row.length < 2) continue;
      var name = String(row[0] || '').trim();
      var url = String(row[1] || '').trim();
      var label = String(row[2] || 'auto').trim();
      if(!name || !url) continue;
      var key = name + '||' + url + '||' + label;
      if(seen[key]) continue;
      seen[key] = true;
      if(!map[name]) map[name] = { display: translateName(name), items: [] };
      map[name].items.push({ label: label || 'auto', url: url });
    }
    var names = Object.keys(map);
    names.sort(function(a,b){ return a.localeCompare(b); });
    names.forEach(function(n){
      var items = map[n].items || [];
      var nonAuto = items.filter(function(it){ return String(it.label||'').toLowerCase().trim() !== 'auto'; });
      if(nonAuto.length){
        items = nonAuto;
      } else if(items.length) {
        items = [{ label: 'best', url: items[0].url }];
      }
      map[n].items = items;
      map[n].items.sort(function(a,b){
        var ra = qualityRank(a.label), rb = qualityRank(b.label);
        if(ra !== rb) return ra - rb;
        return a.label.localeCompare(b.label);
      });
    });
    return { map: map, names: names };
  }

  function initNews(){
    var typeSel = document.getElementById('news-type');
    var chanSel = document.getElementById('news-channel');
    var qualSel = document.getElementById('news-quality');
    var openBtn = document.getElementById('btn-news-open');
    var overlay = document.getElementById('news-overlay');
    var closeBtn = document.getElementById('news-close');
    var player = document.getElementById('news-player');
    var audio = document.getElementById('news-audio');
    var volumeInput = document.getElementById('news-volume');
    var volumeValue = document.getElementById('news-vol-val');
    var ccBtn = document.getElementById('news-cc');
    var pyBtn = document.getElementById('news-py');
    var trBtn = document.getElementById('news-tr');
    var capBox = document.getElementById('news-captions');
    var capEn = capBox ? capBox.querySelector('.cap-en') : null;
    var subBox = document.getElementById('news-subtitles');
    var capIpa = subBox ? subBox.querySelector('.cap-ipa') : null;
    var capTr = subBox ? subBox.querySelector('.cap-tr') : null;
    if(!chanSel || !qualSel || !openBtn || !overlay || !player) return;

    var map = Object.create(null);
    var names = [];
    var optionsRendered = false;
    var captionDict = null;
    var trackListenerAttached = false;
    var captionState = { cc: true, py: true, tr: true };
    var currentIndex = 0;

    if(ccBtn) ccBtn.classList.add('active');
    if(pyBtn) pyBtn.classList.add('active');
    if(trBtn) trBtn.classList.add('active');

    function updateCaptionVisibility(){
      if(capBox) capBox.classList.toggle('hidden', !captionState.cc);
      if(capIpa) capIpa.style.display = captionState.py ? '' : 'none';
      if(capTr) capTr.style.display = captionState.tr ? '' : 'none';
    }

    function toggleCaption(btn, key){
      if(!btn) return;
      btn.addEventListener('click', function(){
        captionState[key] = !captionState[key];
        btn.classList.toggle('active', captionState[key]);
        updateCaptionVisibility();
      });
    }

    toggleCaption(ccBtn, 'cc');
    toggleCaption(pyBtn, 'py');
    toggleCaption(trBtn, 'tr');
    updateCaptionVisibility();

    function isRadioMode(){
      return typeSel && typeSel.value === 'radio';
    }

    function updateActionLabel(){
      if(!openBtn) return;
      var radio = isRadioMode();
      openBtn.textContent = radio ? T('listen','Listen') : T('watch','Watch');
    }

    function updateTypeLabels(){
      if(!typeSel) return;
      var tvLabel = T('tv','TV');
      var radioLabel = T('radio','Radio');
      for(var i=0;i<typeSel.options.length;i++){
        var opt = typeSel.options[i];
        if(opt.value === 'tv') opt.textContent = tvLabel;
        if(opt.value === 'radio') opt.textContent = radioLabel;
      }
    }

    function setModeUI(){
      if(!overlay) return;
      overlay.classList.toggle('radio-mode', isRadioMode());
    }

    function applyVolume(){
      var v = 1;
      if(volumeInput){
        var raw = parseInt(volumeInput.value, 10);
        if(isNaN(raw)) raw = 100;
        raw = Math.max(0, Math.min(100, raw));
        v = raw / 100;
      }
      if(player) player.volume = v;
      if(audio) audio.volume = v;
      if(volumeValue) volumeValue.textContent = Math.round(v * 100) + '%';
    }

    if(volumeInput){
      volumeInput.addEventListener('input', applyVolume);
    }
    applyVolume();

    function buildCaptionDict(){
      if(captionDict) return captionDict;
      var map = Object.create(null);
      var maxLen = 1;
      document.querySelectorAll('tbody tr').forEach(function(tr){
        var zh = tr.querySelector('.wd');
        if(!zh) return;
        var word = zh.textContent.trim();
        if(!word) return;
        var ipa = tr.querySelector('.ipa');
        var kk = tr.querySelector('.trans-kk');
        var ru = tr.querySelector('.trans-ru');
        var def = tr.querySelector('.trans-def');
        map[word.toLowerCase()] = {
          ipa: ipa ? ipa.textContent.trim() : '',
          kk:  kk  ? kk.textContent.trim()  : '',
          ru:  ru  ? ru.textContent.trim()  : '',
          def: def ? def.textContent.trim() : ''
        };
        if(word.length > maxLen) maxLen = word.length;
      });
      captionDict = { map: map, maxLen: maxLen };
      return captionDict;
    }

    function isPunct(ch){
      return /[\\s\\u3000\\u3002\\uff0c\\uff1f\\uff01\\uff1b\\uff1a.,!?;:"'()\\[\\]{}]/.test(ch);
    }

    /* English is whitespace-delimited, so splitting on word boundaries is
       enough — no maximum-match segmentation needed. */
    function tokenizeWords(text){
      return String(text||'').split(/([^A-Za-z'\u2019-]+)/).filter(Boolean);
    }

    function buildCaptionLines(text){
      var dict = buildCaptionDict();
      var tokens = tokenizeWords(text);
      var pyParts = [];
      var trParts = [];
      tokens.forEach(function(tok){
        var entry = dict.map[tok.toLowerCase()];
        if(entry){
          if(entry.ipa) pyParts.push(entry.ipa);
          var tr = entry[localeCode()] || entry.def || entry.ru || '';
          if(tr) trParts.push(tr);
        }
      });
      return { zh: text, py: pyParts.join(' '), tr: trParts.join(' ') };
    }

    function setCaption(text){
      if(!capEn) return;
      if(!text){
        capEn.textContent = '';
        if(capIpa) capIpa.textContent = '';
        if(capTr) capTr.textContent = '';
        return;
      }
      var lines = buildCaptionLines(text);
      capEn.textContent = lines.en;
      if(capIpa) capIpa.textContent = lines.ipa;
      if(capTr) capTr.textContent = lines.tr;
    }

    function clearCaptions(){
      if(capEn) capEn.textContent = '';
      if(capIpa) capIpa.textContent = '';
      if(capTr) capTr.textContent = '';
    }

    function hookTrack(track){
      if(!track || track._hskHooked) return;
      track._hskHooked = true;
      try{ track.mode = 'hidden'; }catch(e){}
      track.oncuechange = function(){
        var cueText = '';
        if(track.activeCues && track.activeCues.length){
          var parts = [];
          for(var i=0;i<track.activeCues.length;i++){
            if(track.activeCues[i] && track.activeCues[i].text){
              parts.push(track.activeCues[i].text);
            }
          }
          cueText = parts.join(' ');
        }
        setCaption(cueText);
      };
    }

    function hookTracks(){
      var list = player.textTracks;
      if(!list) return;
      for(var i=0;i<list.length;i++){
        hookTrack(list[i]);
      }
      if(list.addEventListener && !trackListenerAttached){
        list.addEventListener('addtrack', function(e){
          hookTrack(e.track);
        });
        trackListenerAttached = true;
      }
    }

    function clearTracks(){
      var tracks = player.querySelectorAll('track');
      for(var i=0;i<tracks.length;i++){
        tracks[i].parentNode.removeChild(tracks[i]);
      }
    }

    function resolveUrl(base, rel){
      try { return new URL(rel, base).toString(); } catch(e){ return rel; }
    }

    function getAttr(line, key){
      var re = new RegExp(key + '=\"([^\"]+)\"');
      var m = line.match(re);
      return m ? m[1] : '';
    }

    function attachSubtitleTrackFromManifest(url){
      if(!url || url.indexOf('.m3u8') === -1) return;
      fetch(url).then(function(r){ return r.text(); }).then(function(text){
        var lines = text.split(/\\r?\\n/);
        var sub = null;
        lines.forEach(function(line){
          if(line.indexOf('EXT-X-MEDIA') === -1) return;
          if(line.indexOf('TYPE=SUBTITLES') === -1) return;
          if(sub) return;
          var uri = getAttr(line, 'URI');
          if(!uri) return;
          sub = {
            uri: resolveUrl(url, uri),
            name: getAttr(line, 'NAME') || 'Subtitles',
            lang: getAttr(line, 'LANGUAGE') || 'zh'
          };
        });
        if(!sub) return;
        clearTracks();
        var t = document.createElement('track');
        t.kind = 'subtitles';
        t.label = sub.name;
        t.srclang = sub.lang;
        t.src = sub.uri;
        t.default = true;
        player.appendChild(t);
        hookTracks();
      }).catch(function(){});
    }

    function renderOptions(){
      if(optionsRendered) return;
      optionsRendered = true;
      chanSel.innerHTML = '';
      placeholderOpt = document.createElement('option');
      placeholderOpt.value = '';
      placeholderOpt.textContent = getSelectLabel();
      chanSel.appendChild(placeholderOpt);
      var frag = document.createDocumentFragment();
      for(var i=0;i<names.length;i++){
        var opt = document.createElement('option');
        opt.value = names[i];
        opt.textContent = map[names[i]].display || names[i];
        frag.appendChild(opt);
      }
      chanSel.appendChild(frag);
    }

    function rebuildChannels(){
      var type = typeSel ? typeSel.value : 'tv';
      var built = buildChannelMap(getSourceList(type));
      map = built.map;
      names = built.names;
      optionsRendered = false;
      renderOptions();
      syncQuality();
      updateNewsTitle();
      updateActionLabel();
      updateTypeLabels();
      setModeUI();
      if(!names.length){
        chanSel.disabled = true;
        qualSel.disabled = true;
        openBtn.disabled = true;
      } else {
        chanSel.disabled = false;
        openBtn.disabled = false;
      }
    }

    var placeholderOpt = null;

    function syncQuality(){
      var name = chanSel.value || names[0];
      var idx = names.indexOf(name);
      if(idx >= 0) currentIndex = idx;
      var list = map[name] ? map[name].items : [];
      if(!list.length){
        qualSel.innerHTML = '';
        var o = document.createElement('option');
        o.value = '';
        o.textContent = '—';
        qualSel.appendChild(o);
        qualSel.disabled = true;
        return;
      }
      qualSel.innerHTML = '';
      list.forEach(function(q, idx){
        var o = document.createElement('option');
        o.value = String(idx);
        o.textContent = q.label;
        qualSel.appendChild(o);
      });
      qualSel.disabled = list.length <= 1;
      var bestIdx = 0;
      var bestRank = -1;
      for(var bi=0; bi<list.length; bi++){
        var r = qualityRank(list[bi].label);
        if(r > bestRank){
          bestRank = r;
          bestIdx = bi;
        }
      }
      qualSel.value = String(bestIdx);
    }

    function getSelectedUrl(){
      var name = chanSel.value || names[0];
      var list = map[name] ? map[name].items : [];
      var idx = parseInt(qualSel.value, 10);
      if(isNaN(idx)) idx = 0;
      var q = list[idx] || list[0];
      return q ? q.url : '';
    }

    function updateNewsTitle(){
      var titleEl = document.getElementById('news-title');
      if(!titleEl) return;
      var name = chanSel.value || names[0];
      var display = map[name] ? map[name].display : name;
      titleEl.textContent = display || 'Chinese News';
    }

    function stopMedia(el){
      if(!el) return;
      try{ el.pause(); }catch(e){}
      el.removeAttribute('src');
      el.load();
    }

    function openPlayer(){
      var url = getSelectedUrl();
      if(!url) return;
      updateNewsTitle();
      overlay.style.display = 'flex';
      setModeUI();
      clearCaptions();
      clearTracks();
      var useRadio = isRadioMode();
      if(useRadio && audio){
        stopMedia(player);
        audio.src = url;
        audio.load();
        applyVolume();
        var ap = audio.play();
        if(ap && typeof ap.catch === 'function'){ ap.catch(function(){}); }
        return;
      }
      stopMedia(audio);
      player.src = url;
      player.load();
      applyVolume();
      hookTracks();
      attachSubtitleTrackFromManifest(url);
      var p = player.play();
      if(p && typeof p.catch === 'function'){ p.catch(function(){}); }
    }

    function closePlayer(){
      overlay.style.display = 'none';
      stopMedia(player);
      stopMedia(audio);
      clearCaptions();
      clearTracks();
    }

    chanSel.addEventListener('focus', renderOptions);
    chanSel.addEventListener('mousedown', renderOptions);
    if(typeSel){
      typeSel.addEventListener('change', function(){
        rebuildChannels();
        if(overlay.style.display === 'flex'){ openPlayer(); }
      });
    }
    chanSel.addEventListener('change', function(){
      syncQuality();
      updateNewsTitle();
      if(overlay.style.display === 'flex'){ openPlayer(); }
    });
    openBtn.addEventListener('click', function(){
      renderOptions();
      if(!chanSel.value) chanSel.value = names[0];
      syncQuality();
      updateNewsTitle();
      openPlayer();
    });
    if(closeBtn) closeBtn.addEventListener('click', closePlayer);
    overlay.addEventListener('click', function(e){
      if(e.target === overlay) closePlayer();
    });

    function setChannelByIndex(idx){
      if(!names.length) return;
      if(idx < 0) idx = names.length - 1;
      if(idx >= names.length) idx = 0;
      currentIndex = idx;
      renderOptions();
      chanSel.value = names[currentIndex];
      syncQuality();
      updateNewsTitle();
      if(overlay.style.display === 'flex'){ openPlayer(); }
    }

    var prevBtn = document.getElementById('news-prev');
    var nextBtn = document.getElementById('news-next');
    if(prevBtn) prevBtn.addEventListener('click', function(e){
      e.stopPropagation();
      setChannelByIndex(currentIndex - 1);
    });
    if(nextBtn) nextBtn.addEventListener('click', function(e){
      e.stopPropagation();
      setChannelByIndex(currentIndex + 1);
    });

    window.updateNewsLang = function(){
      if(placeholderOpt){
        placeholderOpt.textContent = getSelectLabel();
      } else if(chanSel && chanSel.options && chanSel.options.length){
        chanSel.options[0].textContent = getSelectLabel();
      }
      updateNewsTitle();
      updateActionLabel();
      updateTypeLabels();
      setModeUI();
    };

    rebuildChannels();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initNews);
  } else {
    initNews();
  }
})();





/* ?? News reader (static) ??????????????????????????????????? */
(function(){
  var btn = document.getElementById('btn-news-read');
  var overlay = document.getElementById('news-read-overlay');
  if(!btn || !overlay) return;

  var DATA_URL = 'news_data.json';
  var closeBtn = document.getElementById('news-read-close');
  var channelSel = document.getElementById('news-read-channel');
  var articlesBox = document.getElementById('news-read-articles');
  var linesBox = document.getElementById('news-read-lines');
  var titleEl = document.getElementById('news-read-article-title');
  var statusEl = document.getElementById('news-read-status');
  var pyBtn = document.getElementById('news-read-py');
  var trBtn = document.getElementById('news-read-tr');
  var audioBtn = document.getElementById('news-read-audio');
  var headerTitle = document.getElementById('news-read-title');

  var audio = new Audio();
  audio.preload = 'none';

  var data = null;
  var channels = [];
  var channelMap = Object.create(null);
  var articles = [];
  var currentLines = [];
  var lineEls = [];
  var audioIndex = -1;
  var audioPlaying = false;
  var playToken = 0;

  /* News-reader strings are not in the locale table yet: Russian has its own
     wording, every other locale falls back to English. */
  function t(en, ru){ return (localeCode() === 'ru' && ru != null) ? ru : en; }

  function setStatus(msg){ if(statusEl) statusEl.textContent = msg || ''; }

  function updateHeaderTitle(){
    if(!headerTitle) return;
    headerTitle.textContent = t('News Reader', '\u0427\u0442\u0435\u043d\u0438\u0435 \u043d\u043e\u0432\u043e\u0441\u0442\u0435\u0439');
  }

  function updateAudioBtnLabel(){
    if(!audioBtn) return;
    audioBtn.textContent = audioPlaying ? t('Stop', '\u0421\u0442\u043e\u043f') : t('Play', '\u0421\u043b\u0443\u0448\u0430\u0442\u044c');
  }

  function loadData(){
    if(data) return Promise.resolve(data);
    if(window.NEWS_DATA){
      data = window.NEWS_DATA || {};
      channels = data.channels || [];
      channelMap = Object.create(null);
      channels.forEach(function(ch){ channelMap[ch.id] = ch; });
      return Promise.resolve(data);
    }
    return fetch(DATA_URL, { cache: 'no-store' }).then(function(r){
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function(d){
      data = d || {};
      channels = data.channels || [];
      channelMap = Object.create(null);
      channels.forEach(function(ch){ channelMap[ch.id] = ch; });
      return data;
    });
  }

  function openOverlay(){
    overlay.style.display = 'flex';
    updateHeaderTitle();
    updateAudioBtnLabel();
    setStatus(t('Loading channels...', '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043a\u0430\u043d\u0430\u043b\u043e\u0432...'));
    loadData().then(function(){
      renderChannels();
      setStatus(t('Select a channel to load articles.', '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043a\u0430\u043d\u0430\u043b \u0434\u043b\u044f \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0441\u0442\u0430\u0442\u0435\u0439.'));
    }).catch(function(){
      setStatus(t('news_data.json not found. Run the news build script first.', '\u041d\u0435\u0442 news_data.json. \u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0437\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u0435 news_build.py.'));
    });
  }

  function closeOverlay(){
    overlay.style.display = 'none';
    stopAudio();
  }

  btn.addEventListener('click', openOverlay);
  if(closeBtn) closeBtn.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', function(e){ if(e.target === overlay) closeOverlay(); });

  function toggleReadOption(btnEl, cls){
    if(!btnEl) return;
    btnEl.addEventListener('click', function(){
      btnEl.classList.toggle('active');
      overlay.classList.toggle(cls, !btnEl.classList.contains('active'));
    });
  }

  toggleReadOption(pyBtn, 'hide-ipa');
  toggleReadOption(trBtn, 'hide-translation');

  function renderChannels(){
    if(!channelSel) return;
    channelSel.innerHTML = '';
    var ph = document.createElement('option');
    ph.value = '';
    ph.textContent = t('Select channel', '\u0412\u044b\u0431\u043e\u0440 \u043a\u0430\u043d\u0430\u043b\u0430');
    channelSel.appendChild(ph);
    channels.forEach(function(ch){
      var opt = document.createElement('option');
      opt.value = ch.id;
      opt.textContent = ch.name || ch.id;
      channelSel.appendChild(opt);
    });
  }

  function renderArticles(){
    if(!articlesBox) return;
    articlesBox.innerHTML = '';
    if(!articles.length){
      var empty = document.createElement('div');
      empty.textContent = t('No articles found.', '\u0421\u0442\u0430\u0442\u0435\u0439 \u043d\u0435\u0442.');
      empty.style.fontSize = '.85em';
      empty.style.color = '#777';
      articlesBox.appendChild(empty);
      return;
    }
    articles.forEach(function(a, idx){
      var item = document.createElement('div');
      item.className = 'news-article-item';
      item.dataset.idx = String(idx);
      item.textContent = a.title || a.link || ('Article ' + (idx + 1));
      item.addEventListener('click', function(){
        articlesBox.querySelectorAll('.news-article-item').forEach(function(el){ el.classList.remove('active'); });
        item.classList.add('active');
        loadArticle(a);
      });
      articlesBox.appendChild(item);
    });
  }

  function renderLines(lines){
    if(!linesBox) return;
    linesBox.innerHTML = '';
    currentLines = lines || [];
    lineEls = [];
    currentLines.forEach(function(line, idx){
      var wrap = document.createElement('div');
      wrap.className = 'news-line';
      wrap.dataset.idx = String(idx);
      var zh = document.createElement('div');
      zh.className = 'line-zh';
      zh.textContent = line.en || '';
      wrap.appendChild(zh);
      var py = document.createElement('div');
      py.className = 'line-py';
      py.textContent = line.ipa || '';
      wrap.appendChild(py);
      var en = document.createElement('div');
      en.className = 'line-tr-en';
      en.textContent = line.en || '';
      wrap.appendChild(en);
      var ru = document.createElement('div');
      ru.className = 'line-tr-ru';
      ru.textContent = line.ru || '';
      wrap.appendChild(ru);
      linesBox.appendChild(wrap);
      lineEls.push(wrap);
    });
  }

  function clearLines(){
    if(linesBox) linesBox.innerHTML = '';
    if(titleEl) titleEl.textContent = '';
    currentLines = [];
    lineEls = [];
  }

  function highlightLine(idx){
    lineEls.forEach(function(el, i){
      el.classList.toggle('is-reading', i === idx);
    });
  }

  function stopAudio(){
    audioPlaying = false;
    playToken += 1;
    audioIndex = -1;
    try{ audio.pause(); }catch(e){}
    audio.removeAttribute('src');
    audio.load();
    if(window.speechSynthesis){ window.speechSynthesis.cancel(); }
    highlightLine(-1);
    updateAudioBtnLabel();
  }

  function startAudio(){
    if(audioPlaying) return;
    if(!currentLines.length){
      setStatus(t('Load an article first.', '\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0441\u0442\u0430\u0442\u044c\u044e.'));
      return;
    }
    audioPlaying = true;
    audioIndex = -1;
    playToken += 1;
    updateAudioBtnLabel();
    playNext(playToken);
  }

  function playLine(line, done){
    if(line.audio){
      audio.onended = done;
      audio.onerror = done;
      audio.src = line.audio;
      audio.play().catch(function(){ done(); });
      return;
    }
    if(window.speechSynthesis){
      var u = new SpeechSynthesisUtterance(line.en || '');
      u.lang = 'en-US';
      u.rate = 1;
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      return;
    }
    setTimeout(done, 300);
  }

  function playNext(token){
    if(!audioPlaying || token !== playToken) return;
    audioIndex += 1;
    if(audioIndex >= currentLines.length){
      stopAudio();
      return;
    }
    var line = currentLines[audioIndex];
    if(!line || !line.en){
      playNext(token);
      return;
    }
    highlightLine(audioIndex);
    playLine(line, function(){
      playNext(token);
    });
  }

  if(audioBtn){
    audioBtn.addEventListener('click', function(){
      if(audioPlaying){
        stopAudio();
        return;
      }
      startAudio();
    });
  }

  if(channelSel){
    channelSel.addEventListener('change', function(){
      var id = channelSel.value;
      if(!id) return;
      loadArticles(id);
    });
  }

  function loadArticles(channelId){
    clearLines();
    var ch = channelMap[channelId];
    articles = ch && ch.articles ? ch.articles : [];
    renderArticles();
    setStatus(articles.length ? '' : t('No articles found.', '\u0421\u0442\u0430\u0442\u0435\u0439 \u043d\u0435\u0442.'));
  }

  function loadArticle(article){
    if(!article) return;
    stopAudio();
    if(titleEl) titleEl.textContent = article.title || '';
    renderLines(article.lines || []);
    setStatus('');
    startAudio();
  }

  var prevUpdate = window.updateNewsLang;
  window.updateNewsLang = function(){
    if(prevUpdate) prevUpdate();
    updateHeaderTitle();
    updateAudioBtnLabel();
    renderChannels();
  };
})();
