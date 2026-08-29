/* English Base — search worker (off-main-thread filtering) */
var _rows = [];

function stripDiacritics(s){
  try{
    return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  }catch(e){
    return String(s||'').toLowerCase();
  }
}

function prepRow(r){
  return {
    wd:  String(r.wd  || '').trim().toLowerCase(),
    ipa: stripDiacritics(String(r.ipa || '').trim()),
    ru:  String(r.ru  || '').trim().toLowerCase(),
    kk:  String(r.kk  || '').trim().toLowerCase(),
    def: String(r.def || '').trim().toLowerCase()
  };
}

function doSearch(query, lang){
  var q = String(query || '').trim();
  if(!q) return [];
  var qn = (lang === 'ipa') ? stripDiacritics(q) : q.toLowerCase();
  var field = (lang === 'wd' || lang === 'ipa' || lang === 'ru' || lang === 'kk' || lang === 'def')
    ? lang : 'def';
  var out = [];
  for(var i=0;i<_rows.length;i++){
    var r = _rows[i];
    if(!r) continue;
    if(r[field].indexOf(qn) !== -1) out.push(i);
  }
  return out;
}

self.onmessage = function(e){
  var data = e.data || {};
  if(data.type === 'init'){
    var rows = data.rows || [];
    _rows = new Array(rows.length);
    for(var i=0;i<rows.length;i++) _rows[i] = prepRow(rows[i]);
    self.postMessage({ type: 'ready' });
    return;
  }
  if(data.type === 'search'){
    var key = data.key || '';
    var matches = doSearch(data.query, data.lang);
    self.postMessage({ type: 'result', key: key, matches: matches });
  }
};
