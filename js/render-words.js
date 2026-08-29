/* ==========================================================================
   Builds the word tables from window.EN_WORDS + window.EN_GROUPS.

   Runs before en.js, which then scans the DOM it produced. With no data it
   leaves the mount empty and every downstream feature degrades to a clean
   empty state.

   EN_WORDS record:
     { id, word, ipa, ru, kk, def, pos, group, root, affix, cefr,
       ex, ex_ipa, ex_ru, ex_kk, ex_def }

   EN_GROUPS record:
     { id, root, root_key, affix, affix_key, standalone,
       pos_heading_before: 'pos_noun' | null }
   ========================================================================== */
(function(){
  var mount = document.getElementById('word-tables-mount');
  if(!mount) return;

  var WORDS  = window.EN_WORDS  || [];
  var GROUPS = window.EN_GROUPS || [];

  /* Labels come from the locale table; en.js re-applies them on every locale
     change, so the initial pass only needs the base locale. */
  var L = (window.I18N && window.I18N.en) || {};
  function label(key, fallback){ return L[key] != null ? L[key] : fallback; }

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  /* First letter uppercased, skipping any leading punctuation. */
  function capFirst(s){
    var t = String(s || '');
    for(var i=0;i<t.length;i++){
      if(/[A-Za-zÀ-ÖØ-öø-ÿА-Яа-яЁёӘҒҚҢӨҰҮҺІ]/.test(t[i])){
        return t.slice(0,i) + t[i].toLocaleUpperCase() + t.slice(i+1);
      }
    }
    return t;
  }

  function thead(){
    return '<thead><tr>'
      + '<th data-col="cb" class="cb-col">&#10004;</th>'
      + '<th data-col="fam" class="fam-col" title="Familiar / to review">?</th>'
      + '<th data-col="num" style="width:3%">#</th>'
      + '<th data-col="word" style="width:22%">'  + esc(label('th_word','Word')) + '</th>'
      + '<th data-col="trans" style="width:30%">' + esc(label('th_trans','Translation')) + '</th>'
      + '<th data-col="ex" style="width:45%">'    + esc(label('th_ex','Example')) + '</th>'
      + '</tr></thead>';
  }

  function transSpans(w){
    return '<span class="trans-def">' + esc(w.def || '') + '</span>'
         + '<span class="trans-ru">'  + esc(w.ru  || '') + '</span>'
         + '<span class="trans-kk">'  + esc(w.kk  || '') + '</span>';
  }

  /* Only emit spans that have content, so the :has() rules in en.css can hide
     an otherwise empty wrapper. */
  function exampleCell(w){
    if(!w.ex) return '<td data-col="ex"></td>';
    var html = '<td data-col="ex"><div class="ex-en">' + esc(w.ex) + '</div>';
    if(w.ex_ipa) html += '<div class="ex-ipa">' + esc(w.ex_ipa) + '</div>';
    var parts = '';
    if(w.ex_def) parts += '<span class="ex-trans-def">' + esc(capFirst(w.ex_def)) + '</span>';
    if(w.ex_ru)  parts += '<span class="ex-trans-ru">'  + esc(capFirst(w.ex_ru))  + '</span>';
    if(w.ex_kk)  parts += '<span class="ex-trans-kk">'  + esc(capFirst(w.ex_kk))  + '</span>';
    if(parts) html += '<div class="ex-trans">' + parts + '</div>';
    return html + '</td>';
  }

  function row(w, n, groupId){
    return '<tr data-key="' + esc(w.word) + '"'
      + ' data-ipa="'   + esc(w.ipa   || '') + '"'
      + ' data-ru="'    + esc(w.ru    || '') + '"'
      + ' data-kk="'    + esc(w.kk    || '') + '"'
      + ' data-def="'   + esc(w.def   || '') + '"'
      + ' data-section="' + esc(w.pos || '') + '"'
      + ' data-tbody="'   + esc(groupId)     + '"'
      + ' data-root="'  + esc(w.root  || '') + '"'
      + ' data-affix="' + esc(w.affix || '') + '"'
      + ' data-root-key="'  + esc((w.root  || '').toLowerCase()) + '"'
      + ' data-affix-key="' + esc((w.affix || '').toLowerCase()) + '"'
      + ' data-cefr="'  + esc((w.cefr || '').toLowerCase()) + '">'
      + '<td data-col="cb" class="cb-cell"><input type="checkbox" class="learn-cb"></td>'
      + '<td data-col="fam" class="fam-cell"><input type="checkbox" class="fam-cb"></td>'
      + '<td data-col="num" class="rownum">' + n + '</td>'
      + '<td data-col="word" class="wordcell">'
        + '<div class="wd">' + esc(w.word) + '</div>'
        + '<div class="ipa">' + esc(w.ipa || '') + '</div>'
      + '</td>'
      + '<td data-col="trans" class="trans-cell">' + transSpans(w) + '</td>'
      + exampleCell(w)
      + '</tr>';
  }

  /* index words by their group so each tbody is filled in one pass */
  var byGroup = Object.create(null);
  WORDS.forEach(function(w){
    var g = w.group || '_ungrouped';
    (byGroup[g] || (byGroup[g] = [])).push(w);
  });

  var html = '';
  var tocCounts = Object.create(null);

  GROUPS.forEach(function(g){
    var words = byGroup[g.id] || [];
    if(g.pos_heading_before){
      html += '<h2 class="pos-group" id="' + esc(g.pos_heading_before) + '">'
            + esc(label('sec_' + g.pos_heading_before, g.pos_heading_before)) + ' </h2>';
    }
    html += '<h3 class="root-group"' + (g.standalone ? ' data-standalone' : '') + '>'
          + (g.standalone
              ? esc(label('individual_words','◆ Standalone words'))
              : esc(label('root_prefix','◆ Root ')) + '<span class="comp">' + esc(g.root || '') + '</span>')
          + '</h3>';
    html += '<table>' + thead() + '<tbody id="' + esc(g.id) + '">';
    words.forEach(function(w, i){
      html += row(w, i + 1, g.id);
      if(w.pos) tocCounts[w.pos] = (tocCounts[w.pos] || 0) + 1;
    });
    html += '</tbody></table>';
  });

  mount.innerHTML = html;

  /* table of contents, one entry per POS section that actually has words */
  var toc = document.querySelector('.toc');
  if(toc){
    var links = '';
    ['pos_noun','pos_verb','pos_adj','pos_adv','pos_det',
     'pos_interj','pos_conj','pos_prep','pos_pron'].forEach(function(id){
      if(!tocCounts[id]) return;
      links += '<a href="#' + id + '">' + esc(label('sec_' + id, id))
             + ' <span class="toc-count">(' + tocCounts[id] + ' '
             + esc(tocCounts[id] === 1 ? label('words_one','word') : label('words','words'))
             + ')</span></a>\n';
    });
    toc.innerHTML = '<h3>' + esc(label('toc_head','Contents')) + '</h3>' + links;
    toc.style.display = links ? '' : 'none';
  }

  /* subtitle count — setLang refreshes this too, but not before first paint */
  var sub = document.querySelector('.subtitle');
  if(sub){
    sub.innerHTML = WORDS.length + ' '
                  + esc(WORDS.length === 1 ? label('words_one','word') : label('words','words'))
                  + ' &nbsp;&middot;&nbsp; ' + esc(label('grouped_by_pos',''));
  }
})();
