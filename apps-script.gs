/**
 * 資源教室庫存 — 雲端同步（Google Apps Script）
 *
 * 安裝方式（約 5 分鐘）：
 * 1. 新增一份 Google 試算表（例如命名「資源教室庫存紀錄」）
 * 2. 上方選單「擴充功能」→「Apps Script」，把這整份程式碼貼上，取代原本內容
 * 3. 修改下面兩個密碼，按「儲存」
 * 4. 右上「部署」→「新增部署作業」→ 類型選「網頁應用程式」
 *      執行身分：我　／　誰可以存取：所有人
 *    按「部署」，第一次會要求授權，請允許
 * 5. 複製「網頁應用程式」網址（https://script.google.com/macros/s/.../exec），
 *    貼到網站「管理」→「☁ 雲端同步」設定裡
 *
 * 之後如果修改了這份程式碼：「部署」→「管理部署作業」→ 編輯（鉛筆）→ 版本選「新版本」→ 部署
 * （網址不會變）
 */

const STAFF_CODE = '1234';          // 工讀生代碼：給工讀生，在手機上輸入一次即可
const ADMIN_KEY  = 'change-me-2026'; // 管理密碼：只有管理者知道，可進入內部管理頁、修改所有資料

const DATA_FILE = 'resource-room-data.json';
const MAX_LOG = 5000;

function doGet(e){ return handle_(e && e.parameter || {}); }
function doPost(e){
  let p = {};
  try{ p = JSON.parse(e.postData.contents); }catch(_){}
  return handle_(p);
}
function out_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function role_(p){
  if(p.key && String(p.key) === ADMIN_KEY) return 'admin';
  if(p.code && String(p.code) === String(STAFF_CODE)) return 'staff';
  return null;
}

function handle_(p){
  if(p.op === 'ping') return out_({ok:true});
  // 瀏覽頁：不用登入就能看品項與數量（看不到紀錄）
  if(p.op === 'browse'){ const b = read_(); return out_({ok:true, ver:b.ver, state:{ver:b.ver, items:b.items}}); }
  const role = role_(p);
  if(!role) return out_({ok:false, err: p.key ? '管理密碼錯誤' : '工讀生代碼錯誤'});
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try{
    const s = read_();
    switch(p.op){
      case 'auth':  return out_({ok:true, role});
      case 'get':   return out_({ok:true, role, ver:s.ver, state: view_(s, role)});
      case 'order': return out_(order_(s, p, role));
      case 'count': return out_(count_(s, p, role));
      case 'additem': return out_(addItem_(s, p, role));
      case 'save':
        if(role !== 'admin') return out_({ok:false, err:'需要管理密碼'});
        return out_(save_(s, p));
    }
    return out_({ok:false, err:'未知的操作'});
  }catch(err){
    return out_({ok:false, err:String(err && err.message || err)});
  }finally{
    lock.releaseLock();
  }
}

/* ---------- 資料檔（存在你的 Google 雲端硬碟） ---------- */
function file_(){
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FILE_ID');
  if(id){ try{ return DriveApp.getFileById(id); }catch(_){} }
  const f = DriveApp.createFile(DATA_FILE, JSON.stringify({ver:0, items:null, log:[], lib:null}), 'application/json');
  props.setProperty('FILE_ID', f.getId());
  return f;
}
function read_(){ const s = JSON.parse(file_().getBlob().getDataAsString('UTF-8')); s.log = s.log || []; s.ver = s.ver || 0; return s; }
function write_(s){ s.savedAt = new Date().toISOString(); if(s.log.length > MAX_LOG) s.log.length = MAX_LOG; file_().setContent(JSON.stringify(s)); }

// 工讀生只拿得到品項與數量，看不到紀錄、圖書資料
function view_(s, role){
  if(role === 'admin') return s;
  return {ver:s.ver, items:s.items};
}

/* ---------- 領出／補進（工讀生與管理者都可） ---------- */
function order_(s, p, role){
  if(!s.items) return {ok:false, err:'雲端還沒有庫存資料，請管理者先在管理頁完成第一次上傳'};
  const dir = Number(p.dir) === 1 ? 1 : -1;
  const lines = Array.isArray(p.lines) ? p.lines : [];
  if(!lines.length) return {ok:false, err:'沒有任何品項'};
  const byId = {}; s.items.forEach(function(it){ byId[it.id] = it; });

  // 先全部檢查（同一品項同地點合併計算），任何一項不足就整張單都不送出
  const need = {}, rows = [], errs = [];
  lines.forEach(function(l){
    const it = byId[l.id];
    if(!it){ errs.push('找不到品項（可能已被管理者刪除）'); return; }
    const sized = l.size != null && it.sizes;
    const obj = sized ? it.sizes[l.size] : it;
    if(!obj){ errs.push(it.name + ' 的尺寸已變更'); return; }
    const qty = Math.floor(Number(l.qty) || 0);
    if(qty < 1) return;
    const from = l.from === 'wh' ? 'wh' : 'room';
    const k = it.id + '|' + (sized ? l.size : '') + '|' + from;
    need[k] = (need[k] || 0) + qty;
    rows.push({it:it, obj:obj, from:from, qty:qty, size: sized ? Number(l.size) : null, k:k,
               label: it.name + (sized ? '（' + obj.s + '）' : '')});
  });
  if(dir < 0) rows.forEach(function(r){
    const cur = Number(r.obj[r.from]) || 0;
    if(need[r.k] > cur && !r.reported){ errs.push(r.label + '：' + (r.from==='wh'?'Q棟倉庫':'悅讀書房') + '只剩 ' + cur + ' 件'); rows.forEach(function(x){ if(x.k===r.k) x.reported = true; }); }
  });
  if(errs.length) return {ok:false, err: errs.join('\n'), ver:s.ver, state: view_(s, role)};
  if(!rows.length) return {ok:false, err:'沒有任何數量'};

  s.ver++;
  const ts = new Date().toISOString(), entries = [];
  rows.forEach(function(r){
    r.obj[r.from] = (Number(r.obj[r.from]) || 0) + dir * r.qty;
    entries.push({ts:ts, itemId:r.it.id, name:r.label, size:r.size, from:r.from, qty:r.qty, dir:dir,
                  person: String(p.person || '').slice(0,60), purpose: String(p.purpose || '').slice(0,120),
                  by: String(p.by || '').slice(0,30), src: role, remain: r.obj[r.from], ver: s.ver});
  });
  s.log = entries.concat(s.log);
  write_(s);
  sheetLog_(entries); sheetStock_(s);
  return {ok:true, ver:s.ver, state: view_(s, role)};
}

/* ---------- 盤點：直接改成點算出來的數量（工讀生與管理者都可），差額記進紀錄 ---------- */
function count_(s, p, role){
  if(!s.items) return {ok:false, err:'雲端還沒有庫存資料'};
  const lines = Array.isArray(p.lines) ? p.lines : [];
  const byId = {}; s.items.forEach(function(it){ byId[it.id] = it; });
  const ts = new Date().toISOString(), entries = [];
  s.ver++;
  lines.forEach(function(l){
    const it = byId[l.id]; if(!it) return;
    const sized = l.size != null && it.sizes;
    const obj = sized ? it.sizes[l.size] : it; if(!obj) return;
    const from = l.from === 'wh' ? 'wh' : 'room';
    const now = Math.max(0, Math.floor(Number(l.qty) || 0)), prev = Number(obj[from]) || 0;
    if(now === prev) return;
    obj[from] = now;
    entries.push({ts:ts, itemId:it.id, name: it.name + (sized ? '（' + obj.s + '）' : ''), size: sized ? Number(l.size) : null, from:from,
                  qty: Math.abs(now - prev), dir: now > prev ? 1 : -1, kind:'count', prev:prev,
                  person:'', purpose:'盤點調整（' + prev + ' → ' + now + '）' + (p.purpose ? '：' + String(p.purpose).slice(0,80) : ''),
                  by: String(p.by || '').slice(0,30), src: role, remain: now, ver: s.ver});
  });
  if(!entries.length){ s.ver--; return {ok:false, err:'沒有任何數量變動'}; }
  s.log = entries.concat(s.log);
  write_(s); sheetLog_(entries); sheetStock_(s);
  return {ok:true, ver:s.ver, n:entries.length, state: view_(s, role)};
}

/* ---------- 新增品項（工讀生與管理者都可） ---------- */
function addItem_(s, p, role){
  if(!s.items) return {ok:false, err:'雲端還沒有庫存資料'};
  const x = p.item || {};
  const name = String(x.name || '').trim().slice(0,60);
  if(!name) return {ok:false, err:'請填寫品名'};
  if(s.items.some(function(it){ return it.name === name; })) return {ok:false, err:'已經有「' + name + '」這個品項了'};
  const id = s.items.reduce(function(m, it){ return Math.max(m, Number(it.id) || 0); }, 0) + 1;
  const it = {id:id, cat: String(x.cat || '宣導品').slice(0,20), name:name, price: Math.max(0, Number(x.price) || 0),
              note: String(x.note || '').slice(0,120), room: Math.max(0, Math.floor(Number(x.room) || 0)), wh: Math.max(0, Math.floor(Number(x.wh) || 0)), loc:[]};
  // 放在同類別的最後面
  let pos = -1; s.items.forEach(function(o, i){ if(o.cat === it.cat) pos = i; });
  s.items.splice(pos < 0 ? s.items.length : pos + 1, 0, it);
  s.ver++;
  const ts = new Date().toISOString(), entries = [];
  ['room','wh'].forEach(function(f){ if(it[f]) entries.push({ts:ts, itemId:id, name:name, size:null, from:f, qty:it[f], dir:1, kind:'add',
    person:'', purpose:'新增品項', by:String(p.by || '').slice(0,30), src:role, remain:it[f], ver:s.ver}); });
  // 沒有數量也留一筆紀錄，管理者儲存時才會把新品項併回去
  if(!entries.length) entries.push({ts:ts, itemId:id, name:name, size:null, from:'room', qty:0, dir:1, kind:'add', person:'', purpose:'新增品項',
    by:String(p.by || '').slice(0,30), src:role, remain:0, ver:s.ver});
  entries[0].item = JSON.parse(JSON.stringify(it));
  s.log = entries.concat(s.log);
  write_(s); sheetLog_(entries); sheetStock_(s);
  return {ok:true, ver:s.ver, id:id, state: view_(s, role)};
}

/* ---------- 管理者整份儲存：把管理者沒看過的工讀生登記補算回去，不會互相覆蓋 ---------- */
function save_(s, p){
  const st = p.state || {};
  if(!Array.isArray(st.items)) return {ok:false, err:'資料格式錯誤'};
  const base = Number(p.baseVer) || 0;
  const missed = s.items ? s.log.filter(function(e){ return e.ver && e.ver > base; }) : [];
  // 管理者還沒看過的新品項：先加回去（編號撞到就換一個）
  missed.slice().reverse().forEach(function(e){
    if(e.kind !== 'add' || !e.item) return;
    if(st.items.some(function(x){ return x.name === e.item.name; })) return;
    const item = JSON.parse(JSON.stringify(e.item)); item.room = 0; item.wh = 0;
    if(st.items.some(function(x){ return x.id == item.id; })){
      const nid = st.items.reduce(function(m, x){ return Math.max(m, Number(x.id) || 0); }, 0) + 1;
      missed.forEach(function(m){ if(m.itemId == item.id) m.itemId = nid; });
      item.id = nid;
    }
    st.items.push(item);
  });
  missed.slice().reverse().forEach(function(e){
    const it = st.items.filter(function(x){ return x.id == e.itemId; })[0]; if(!it) return;
    const obj = (e.size != null && it.sizes) ? it.sizes[e.size] : it; if(!obj) return;
    obj[e.from] = Math.max(0, (Number(obj[e.from]) || 0) + e.dir * e.qty);
  });
  const own = (Array.isArray(st.log) ? st.log : []).filter(function(e){ return !(e.ver && e.ver > base); });
  s.ver++;
  s.items = st.items;
  s.log = missed.concat(own);
  if(st.lib) s.lib = st.lib;
  write_(s);
  sheetStock_(s);
  return {ok:true, ver:s.ver, merged:missed.length, state:s};
}

/* ---------- 試算表（方便直接在 Google 試算表查看） ---------- */
function sheet_(name, header){
  let ss; try{ ss = SpreadsheetApp.getActive(); }catch(_){}
  if(!ss) return null;
  let sh = ss.getSheetByName(name);
  if(!sh){ sh = ss.insertSheet(name); sh.appendRow(header); sh.setFrozenRows(1); }
  return sh;
}
function sheetLog_(entries){
  const sh = sheet_('領用紀錄', ['時間','動作','品項','地點','數量','剩餘(該地點)','領用人／單位','用途','登記人','身分']);
  if(!sh) return;
  const rows = entries.map(function(e){
    return [new Date(e.ts), e.kind==='count' ? '盤點' : (e.kind==='add' ? '新增品項' : (e.dir < 0 ? '領出' : '補進')), e.name, e.from==='wh'?'Q棟倉庫':'悅讀書房', e.qty, e.remain,
            e.person, e.purpose, e.by, e.src==='admin'?'管理者':'工讀生'];
  });
  sh.getRange(sh.getLastRow()+1, 1, rows.length, rows[0].length).setValues(rows);
}
function sheetStock_(s){
  const sh = sheet_('目前庫存', ['類別','品項','尺寸','悅讀書房','Q棟倉庫','合計']);
  if(!sh || !s.items) return;
  const rows = [];
  s.items.forEach(function(it){
    if(it.sizes) it.sizes.forEach(function(z){ const r = Number(z.room)||0, w = Number(z.wh)||0; rows.push([it.cat||'', it.name, z.s, r, w, r+w]); });
    else { const r = Number(it.room)||0, w = Number(it.wh)||0; rows.push([it.cat||'', it.name, '', r, w, r+w]); }
  });
  sh.getRange(2, 1, Math.max(sh.getLastRow()-1, 1), 6).clearContent();
  if(rows.length) sh.getRange(2, 1, rows.length, 6).setValues(rows);
}
