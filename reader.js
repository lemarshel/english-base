/* ==========================================================================
   English Base — reader
   --------------------------------------------------------------------------
   Renders one part of one text as interlinear lines: the English words in a
   row, each word's gloss directly beneath it, then the whole sentence in the
   active locale, and the part's new vocabulary at the bottom.

   Reads window.EN_TEXTS for content and window.TEXT_TOPIC_NAMES for the list
   of forty topics, so topics without a text yet still appear and are marked
   unavailable.
   ========================================================================== */
(function(){
"use strict";

var TEXTS  = window.EN_TEXTS || [];
var TOPICS = window.TEXT_TOPIC_NAMES || {};
var TOTAL_TEXTS = 40;
var PARTS_PER_TEXT = 4;

var state = {
  textId: parseInt(localStorage.getItem('eng_reader_text') || '1', 10) || 1,
  part:   parseInt(localStorage.getItem('eng_reader_part') || '1', 10) || 1,
  showGloss: localStorage.getItem('eng_reader_gloss') !== '0',
  showTrans: localStorage.getItem('eng_reader_trans') !== '0'
};

function byId(id){ return document.getElementById(id); }
function textById(id){
  for(var i=0;i<TEXTS.length;i++) if(TEXTS[i].id === id) return TEXTS[i];
  return null;
}

/* ── locale ─────────────────────────────────────────────────────────────── */

function localeCode(){
  var b = document.body;
  if(b.classList.contains('loc-ru')) return 'ru';
  if(b.classList.contains('loc-kk')) return 'kk';
  return 'en';
}
function T(key, fallback){
  var I = window.I18N || {};
  var v = (I[localeCode()] || {})[key];
  if(v == null) v = (I.en || {})[key];
  return v == null ? (fallback == null ? key : fallback) : v;
}
/* Which gloss column the reader shows. In the en locale there is no gloss to
   show under the words, so the glosses collapse and only the English remains. */
function glossIndex(){ return localeCode() === 'ru' ? 1 : localeCode() === 'kk' ? 2 : -1; }

function applyLocale(code){
  var I = window.I18N || {};
  if(!I[code]) code = 'en';
  var L = I[code];
  document.body.classList.remove('loc-ru','loc-kk');
  if(code !== 'en') document.body.classList.add('loc-' + code);
  document.documentElement.setAttribute('lang', code);
  localStorage.setItem('eng_locale', code);

  document.querySelectorAll('[data-i18n]').forEach(function(el){
    var v = L[el.getAttribute('data-i18n')];
    if(v != null) el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(function(el){
    var v = L[el.getAttribute('data-i18n-title')];
    if(v != null) el.title = v;
  });

  document.title = T('reader_title','English Base — Reader');
  var h1 = document.querySelector('h1');
  if(h1) h1.textContent = T('reader_h1','Reader');
  var btn = byId('btn-lang-toggle');
  if(btn) btn.textContent = L._label || code.toUpperCase();

  render();
}

/* ── speech ─────────────────────────────────────────────────────────────── */

var enVoice = null, voicesReady = false, speaking = false;

/* Prefer a natural en-US voice, and a male one where the name gives it away.
   The system locale here is Russian, so the browser default would otherwise
   read English text with a Russian voice. */
function pickVoice(vs){
  var en = vs.filter(function(v){ return /^en(-|_)?US/i.test(v.lang); });
  if(!en.length) en = vs.filter(function(v){ return /^en/i.test(v.lang); });
  if(!en.length) return null;
  return en.find(function(v){ return /natural/i.test(v.name) && /guy|andrew|brian|eric|roger|steffan|christopher/i.test(v.name); })
      || en.find(function(v){ return /natural/i.test(v.name); })
      || en.find(function(v){ return /guy|david|mark|george|james/i.test(v.name); })
      || en[0];
}
function refreshVoices(){
  if(typeof speechSynthesis === 'undefined') return;
  var vs = speechSynthesis.getVoices();
  if(vs && vs.length){ enVoice = pickVoice(vs); voicesReady = true; }
}
if(typeof speechSynthesis !== 'undefined'){
  refreshVoices();
  speechSynthesis.onvoiceschanged = function(){ voicesReady = false; refreshVoices(); };
}
function ensureVoices(cb){
  if(typeof speechSynthesis === 'undefined'){ cb(); return; }
  refreshVoices();
  if(voicesReady){ cb(); return; }
  var tries = 0;
  (function again(){
    refreshVoices();
    if(voicesReady || ++tries >= 6){ cb(); return; }
    setTimeout(again, 200);
  })();
}
function stopSpeech(){
  try{ if(typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); }catch(e){}
  speaking = false;
  document.querySelectorAll('.rd-line.speaking').forEach(function(el){ el.classList.remove('speaking'); });
  var b = byId('btn-read-all');
  if(b) b.textContent = T('read_aloud','▶ Read aloud');
}
function speak(text, opts){
  opts = opts || {};
  if(typeof speechSynthesis === 'undefined'){ if(opts.onend) opts.onend(); return; }
  ensureVoices(function(){
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = parseFloat((byId('speed-sel')||{}).value || '1') || 1;
    u.volume = (parseFloat((byId('vol-range')||{}).value || '100') || 100) / 100;
    if(enVoice) u.voice = enVoice;
    u.onend = function(){ if(opts.onend) opts.onend(); };
    u.onerror = function(){ if(opts.onend) opts.onend(); };
    speechSynthesis.speak(u);
  });
}
/* Reads the part sentence by sentence so the current line can be highlighted. */
function readPart(){
  var lines = Array.prototype.slice.call(document.querySelectorAll('.rd-line'));
  if(!lines.length) return;
  stopSpeech();
  speaking = true;
  var b = byId('btn-read-all');
  if(b) b.textContent = T('stop_reading','■ Stop');
  var i = 0;
  (function next(){
    if(!speaking || i >= lines.length){ stopSpeech(); return; }
    var line = lines[i];
    lines.forEach(function(l){ l.classList.remove('speaking'); });
    line.classList.add('speaking');
    line.scrollIntoView({block:'center', behavior:'smooth'});
    speak(line.getAttribute('data-en') || '', { onend: function(){ i++; next(); } });
  })();
}

/* ── rendering ──────────────────────────────────────────────────────────── */

function buildTextPicker(){
  var sel = byId('text-sel');
  if(!sel) return;
  var html = '';
  for(var i = 1; i <= TOTAL_TEXTS; i++){
    var name = TOPICS[i] || ('Text ' + i);
    var has = !!textById(i);
    html += '<option value="' + i + '"' + (has ? '' : ' disabled')
          + (i === state.textId ? ' selected' : '') + '>'
          + i + '. ' + name + (has ? '' : ' — ' + T('not_ready','not ready yet'))
          + '</option>';
  }
  sel.innerHTML = html;
}

function buildPartTabs(){
  var wrap = byId('part-tabs');
  if(!wrap) return;
  var text = textById(state.textId);
  var html = '';
  for(var n = 1; n <= PARTS_PER_TEXT; n++){
    var has = !!(text && text.parts && text.parts.some(function(p){ return p.n === n; }));
    html += '<button class="part-btn' + (n === state.part ? ' active' : '') + '"'
          + ' data-part="' + n + '"' + (has ? '' : ' disabled')
          + '>' + T('part','Part') + ' ' + n + '</button>';
  }
  wrap.innerHTML = html;
  wrap.querySelectorAll('.part-btn').forEach(function(b){
    b.addEventListener('click', function(){
      if(this.disabled) return;
      state.part = parseInt(this.getAttribute('data-part'), 10);
      localStorage.setItem('eng_reader_part', String(state.part));
      stopSpeech();
      render();
    });
  });
}

function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderPart(text, part){
  var gi = glossIndex();
  var loc = localeCode();
  var html = '';

  part.sentences.forEach(function(sent, si){
    var plain = sent.t.map(function(tok){ return tok[0]; }).join(' ');
    html += '<div class="rd-line" data-en="' + esc(plain) + '" data-i="' + si + '">'
          + '<button class="rd-play" title="' + esc(T('tts_play','Play')) + '">▶</button>'
          + '<div class="rd-body">'
          + '<div class="rd-tokens">';
    sent.t.forEach(function(tok){
      var gloss = gi > 0 ? (tok[gi] || '') : '';
      html += '<span class="rd-tok">'
            + '<span class="rd-w">' + esc(tok[0]) + '</span>'
            + '<span class="rd-g">' + esc(gloss) + '</span>'
            + '</span>';
    });
    html += '</div>';
    var full = loc === 'ru' ? sent.ru : loc === 'kk' ? sent.kk : '';
    if(full) html += '<div class="rd-trans">' + esc(full) + '</div>';
    html += '</div></div>';
  });

  /* the part's new words, at the foot of the text */
  if(part.vocab && part.vocab.length){
    html += '<div class="rd-vocab">'
          + '<h3>' + esc(T('new_words','New words')) + ' <span class="rd-count">('
          + part.vocab.length + ')</span></h3>'
          + '<table class="rd-vocab-table"><tbody>';
    part.vocab.forEach(function(v){
      var tr = loc === 'ru' ? v[2] : loc === 'kk' ? v[3] : '';
      html += '<tr>'
            + '<td class="rd-v-play"><button class="rd-play rd-play-word" title="'
              + esc(T('tts_play','Play')) + '">▶</button></td>'
            + '<td class="rd-v-word">' + esc(v[0]) + '</td>'
            + '<td class="rd-v-ipa">' + esc(v[1] ? '/' + v[1] + '/' : '') + '</td>'
            + '<td class="rd-v-tr">' + esc(tr) + '</td>'
            + '</tr>';
    });
    html += '</tbody></table></div>';
  }
  return html;
}

function render(){
  buildTextPicker();
  buildPartTabs();

  var text = textById(state.textId);
  var body = byId('rd-content');
  var titleEl = byId('rd-title');
  var subEl = byId('rd-subtitle');
  var loc = localeCode();

  if(!text){
    if(titleEl) titleEl.textContent = TOPICS[state.textId] || ('Text ' + state.textId);
    if(subEl) subEl.textContent = '';
    body.innerHTML = '<div class="rd-empty"><b>' + esc(T('text_missing','This text is not written yet'))
                   + '</b>' + esc(T('text_missing_hint','Texts are added to data/texts.js one at a time.'))
                   + '</div>';
    document.body.classList.add('no-text');
    return;
  }
  document.body.classList.remove('no-text');

  var part = null;
  for(var i=0;i<text.parts.length;i++) if(text.parts[i].n === state.part) part = text.parts[i];
  if(!part){ part = text.parts[0]; state.part = part.n; buildPartTabs(); }

  if(titleEl) titleEl.textContent = (text.title && (text.title[loc] || text.title.en)) || '';
  if(subEl){
    subEl.textContent = T('text','Text') + ' ' + text.id + ' · ' + (TOPICS[text.id] || '')
                      + ' · ' + T('part','Part') + ' ' + part.n + '/' + PARTS_PER_TEXT;
  }

  body.innerHTML = renderPart(text, part);

  body.querySelectorAll('.rd-play').forEach(function(b){
    b.addEventListener('click', function(e){
      e.stopPropagation();
      stopSpeech();
      if(this.classList.contains('rd-play-word')){
        var row = this.closest('tr');
        var w = row && row.querySelector('.rd-v-word');
        if(w) speak(w.textContent);
      } else {
        var line = this.closest('.rd-line');
        if(line) speak(line.getAttribute('data-en') || '');
      }
    });
  });

  applyDisplayToggles();
}

function applyDisplayToggles(){
  document.body.classList.toggle('hide-gloss', !state.showGloss);
  document.body.classList.toggle('hide-trans', !state.showTrans);
  var g = byId('btn-toggle-gloss'), t = byId('btn-toggle-trans');
  if(g) g.classList.toggle('active', state.showGloss);
  if(t) t.classList.toggle('active', state.showTrans);
}

/* ── wiring ─────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', function(){
  /* theme buttons, same behaviour as the word list */
  document.querySelectorAll('.mode-btn').forEach(function(b){
    b.addEventListener('click', function(){
      var m = this.dataset.mode;
      document.body.className = document.body.className.replace(/\b(light|dark|sepia)\b/g,'').trim();
      if(m !== 'light') document.body.classList.add(m);
      document.querySelectorAll('.mode-btn').forEach(function(x){
        x.classList.toggle('active', x.dataset.mode === m);
      });
      localStorage.setItem('eng_mode', m);
    });
  });
  var mode = localStorage.getItem('eng_mode') || 'light';
  document.querySelectorAll('.mode-btn').forEach(function(x){
    x.classList.toggle('active', x.dataset.mode === mode);
  });

  var sel = byId('text-sel');
  if(sel) sel.addEventListener('change', function(){
    state.textId = parseInt(this.value, 10);
    state.part = 1;
    localStorage.setItem('eng_reader_text', String(state.textId));
    localStorage.setItem('eng_reader_part', '1');
    stopSpeech();
    render();
  });

  var prev = byId('btn-prev-text'), next = byId('btn-next-text');
  function step(dir){
    var id = state.textId;
    for(var i=0;i<TOTAL_TEXTS;i++){
      id += dir;
      if(id < 1) id = TOTAL_TEXTS;
      if(id > TOTAL_TEXTS) id = 1;
      if(textById(id)) break;
    }
    state.textId = id; state.part = 1;
    localStorage.setItem('eng_reader_text', String(id));
    localStorage.setItem('eng_reader_part', '1');
    stopSpeech();
    render();
  }
  if(prev) prev.addEventListener('click', function(){ step(-1); });
  if(next) next.addEventListener('click', function(){ step(1); });

  var readBtn = byId('btn-read-all');
  if(readBtn) readBtn.addEventListener('click', function(){
    if(speaking) stopSpeech(); else readPart();
  });

  var g = byId('btn-toggle-gloss');
  if(g) g.addEventListener('click', function(){
    state.showGloss = !state.showGloss;
    localStorage.setItem('eng_reader_gloss', state.showGloss ? '1' : '0');
    applyDisplayToggles();
  });
  var t = byId('btn-toggle-trans');
  if(t) t.addEventListener('click', function(){
    state.showTrans = !state.showTrans;
    localStorage.setItem('eng_reader_trans', state.showTrans ? '1' : '0');
    applyDisplayToggles();
  });

  var vol = byId('vol-range'), volVal = byId('vol-val');
  if(vol) vol.addEventListener('input', function(){
    if(volVal) volVal.textContent = this.value + '%';
    localStorage.setItem('eng-volume', String(this.value / 100));
  });
  var savedVol = parseFloat(localStorage.getItem('eng-volume'));
  if(vol && !isNaN(savedVol)){
    vol.value = Math.round(savedVol * 100);
    if(volVal) volVal.textContent = vol.value + '%';
  }
  var spd = byId('speed-sel');
  if(spd){
    var savedSpd = localStorage.getItem('eng-speed');
    if(savedSpd) spd.value = savedSpd;
    spd.addEventListener('change', function(){ localStorage.setItem('eng-speed', this.value); });
  }

  var langBtn = byId('btn-lang-toggle');
  if(langBtn) langBtn.addEventListener('click', function(){
    var order = (window.I18N && window.I18N._order) || ['en'];
    var cur = localeCode();
    var i = order.indexOf(cur);
    applyLocale(order[(i + 1) % order.length]);
  });

  window.addEventListener('beforeunload', stopSpeech);

  applyLocale(localStorage.getItem('eng_locale') || 'en');
  document.body.classList.remove('preload');
});
})();
