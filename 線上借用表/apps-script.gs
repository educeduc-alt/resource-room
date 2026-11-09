/**
 * 弘光科技大學資源教室・線上借用表 —— Google 試算表資料庫
 *
 * 用法：在 Google 試算表選「擴充功能 → Apps Script」，把這整份貼上取代原本內容，
 * 修改下面的 ADMIN_PASSWORD，然後「部署 → 新增部署作業 → 網頁應用程式」：
 *   執行身分：我　／　誰可以存取：所有人
 * 部署後把「網頁應用程式網址」貼到網頁 index.html 的 API_URL。
 *
 * 學生看不到這份程式碼，所以密碼放在這裡是安全的（不要把試算表分享給學生）。
 */
const ADMIN_PASSWORD = 'HKU14741475';
const STAFF_PASSWORD = 'staff1475';   // 工讀生密碼：只能登記耗材，看不到申請與借用紀錄
const SITE_URL = 'https://educeduc-alt.github.io/resource-room/%E7%B7%9A%E4%B8%8A%E5%80%9F%E7%94%A8%E8%A1%A8/';

const DOCS_SHEET = '_資料（請勿修改）';
const PUBLIC_READ = ['catalog', 'config', 'calendar', 'consumables'];
const OWN = ['requests', 'surveys', 'usage'];   // 每人只能讀寫自己的
const SEED_CONSUMABLES = [{"code": "c01", "name": "A4 影印紙", "unit": "包", "stock": 0, "low": 5, "sort": 1}, {"code": "c02", "name": "彩色印表機墨水", "unit": "盒", "stock": 0, "low": 1, "sort": 2}, {"code": "c03", "name": "影印機碳粉", "unit": "支", "stock": 0, "low": 1, "sort": 3}, {"code": "c04", "name": "護貝膠膜 A4", "unit": "張", "stock": 0, "low": 20, "sort": 4}, {"code": "c05", "name": "3 號電池", "unit": "顆", "stock": 0, "low": 4, "sort": 5}, {"code": "c06", "name": "4 號電池", "unit": "顆", "stock": 0, "low": 4, "sort": 6}, {"code": "c07", "name": "原子筆", "unit": "支", "stock": 0, "low": 5, "sort": 7}, {"code": "c08", "name": "便利貼", "unit": "本", "stock": 0, "low": 3, "sort": 8}];
const SEED_CATALOG = [{"code": "g01", "name": "筆記型電腦", "cat": "general", "qty": 8, "out": 0, "note": "部分規格與機型老舊，116 年預計增購 2 台", "longOk": false, "sort": 1}, {"code": "g02", "name": "投影機", "cat": "general", "qty": 2, "out": 0, "note": "單槍投影機", "longOk": false, "sort": 2}, {"code": "g03", "name": "平板", "cat": "general", "qty": 7, "out": 0, "note": "", "longOk": false, "sort": 3}, {"code": "g05", "name": "數位相機／單眼相機", "cat": "general", "qty": 2, "out": 0, "note": "", "longOk": false, "sort": 5}, {"code": "g06", "name": "攝影機／數位攝影機", "cat": "general", "qty": 3, "out": 0, "note": "", "longOk": false, "sort": 6}, {"code": "g07", "name": "擴視機（桌上型／可攜式）", "cat": "general", "qty": 3, "out": 0, "note": "", "longOk": false, "sort": 7}, {"code": "g08", "name": "簡報筆", "cat": "general", "qty": 1, "out": 0, "note": "", "longOk": false, "sort": 8}, {"code": "g09", "name": "放大滑鼠", "cat": "general", "qty": 1, "out": 0, "note": "", "longOk": false, "sort": 9}, {"code": "g10", "name": "錄音筆", "cat": "general", "qty": 1, "out": 0, "note": "", "longOk": true, "sort": 10}, {"code": "g11", "name": "護貝機", "cat": "general", "qty": 1, "out": 0, "note": "", "longOk": false, "sort": 11}, {"code": "g12", "name": "計算機", "cat": "general", "qty": 1, "out": 0, "note": "", "longOk": false, "sort": 12}, {"code": "g13", "name": "吹風機", "cat": "general", "qty": 1, "out": 0, "note": "", "longOk": false, "sort": 13}, {"code": "g14", "name": "裁紙刀（大）", "cat": "general", "qty": 1, "out": 0, "note": "", "longOk": false, "sort": 14}, {"code": "g15", "name": "裁紙刀（小）", "cat": "general", "qty": 1, "out": 0, "note": "", "longOk": false, "sort": 15}, {"code": "t01", "name": "電子翻譯機（學習翻譯機）", "cat": "general3", "qty": 2, "out": 0, "note": "", "longOk": true, "sort": 16}, {"code": "t02", "name": "延長線", "cat": "general3", "qty": 1, "out": 0, "note": "", "longOk": false, "sort": 17}, {"code": "t04", "name": "鍵盤", "cat": "general3", "qty": 1, "out": 0, "note": "", "longOk": false, "sort": 19}, {"code": "t05", "name": "耳機", "cat": "general3", "qty": 1, "out": 0, "note": "", "longOk": true, "sort": 20}, {"code": "t06", "name": "彩色筆", "cat": "general3", "qty": 1, "out": 0, "note": "", "longOk": false, "sort": 21}, {"code": "t07", "name": "麥克筆", "cat": "general3", "qty": 1, "out": 0, "note": "", "longOk": false, "sort": 22}, {"code": "t08", "name": "熱熔膠槍", "cat": "general3", "qty": 1, "out": 0, "note": "", "longOk": false, "sort": 23}, {"code": "l01", "name": "牌卡", "cat": "leisure", "qty": 1, "out": 0, "note": "", "longOk": false, "sort": 24}, {"code": "l02", "name": "桌遊", "cat": "leisure", "qty": 1, "out": 0, "note": "", "longOk": false, "sort": 25}, {"code": "l03", "name": "手眼協調訓練機", "cat": "leisure", "qty": 1, "out": 0, "note": "須配合家銘學長時間，以利協助架設器材", "longOk": false, "sort": 26}, {"code": "l04", "name": "投影設備（休閒用）", "cat": "leisure", "qty": 1, "out": 0, "note": "限觀賞、遊戲借用", "longOk": false, "sort": 27}, {"code": "s01", "name": "悅讀書房", "cat": "space", "qty": 1, "out": 0, "note": "該空間無人使用才可借用；使用後至資源教室告知完畢、領回證件並填寫滿意度問卷", "longOk": false, "sort": 28}, {"code": "s02", "name": "課輔室", "cat": "space", "qty": 1, "out": 0, "note": "該空間無人使用才可借用；借用當日由工讀生或老師協助開門", "longOk": false, "sort": 29}];

function doGet(e) {
  // 也可用 GET 呼叫：?q=<JSON>（POST 被擋時的備援）
  if (e && e.parameter && e.parameter.q) return safe(() => handle(e.parameter.q));
  return out({ ok: true, service: '資源教室線上借用表', time: new Date() });
}

function doPost(e) { return safe(() => handle(e && e.postData ? e.postData.contents : '')); }

/* 不論哪裡出錯都回傳 JSON，避免瀏覽器只看到 CORS 錯誤 */
function safe(fn) {
  try { return fn(); }
  catch (x) { return out({ ok: false, code: 'unavailable', message: '伺服器錯誤：' + (x && x.message ? x.message : String(x)) }); }
}

function handle(body) {
  let req;
  try { req = JSON.parse(body); } catch (x) { return out({ ok: false, code: 'invalid_argument', message: 'bad json' }); }
  const admin = !!req.pw && req.pw === ADMIN_PASSWORD;
  const staff = !admin && !!req.pw && req.pw === STAFF_PASSWORD;
  const uid = /^u[0-9a-f]{64}$/.test(req.uid || '') ? req.uid : null;
  if (req.op === 'login') return out({ ok: admin || staff, role: admin ? 'admin' : staff ? 'staff' : '', code: admin || staff ? '' : 'denied' });
  if (req.pw && !admin && !staff) return out({ ok: false, code: 'denied', message: '密碼不正確' });
  STAFF_NOW = staff;
  const write = ['set', 'update', 'delete', 'batch', 'arr', 'consume'].includes(req.op);
  const lock = write ? LockService.getScriptLock() : null;
  if (write) lock.waitLock(25000);
  try {
    const st = load();
    if (req.op === 'read') {
      return out({ ok: true, results: (req.reads || []).map(r => r.kind === 'doc'
        ? { data: canRead(r.path, admin, uid) && st.m[r.path] !== undefined ? st.m[r.path] : null }
        : { docs: listCol(st, r.path, admin, uid) }) });
    }
    if (req.op === 'get') return out({ ok: true, data: canRead(req.path, admin, uid) && st.m[req.path] !== undefined ? st.m[req.path] : null });
    if (req.op === 'consume') {   // 耗材領用／補貨／盤點：一次處理多項，伺服器計算庫存
      if (!admin && !staff) return out({ ok: false, code: 'invalid_argument', message: '請先登入工讀生或老師帳號' });
      const type = req.type;
      if (!['out', 'in', 'adjust'].includes(type)) return out({ ok: false, code: 'invalid_argument', message: 'bad type' });
      if (type === 'adjust' && !admin) return out({ ok: false, code: 'invalid_argument', message: '只有老師可以盤點調整' });
      const items = [];
      for (const it of (req.items || [])) {
        const path = 'consumables/' + it.code, c = st.m[path];
        const q = Math.floor(Number(it.qty));
        if (!c) return out({ ok: false, code: 'invalid_argument', message: '找不到耗材：' + it.code });
        if (!(q >= 0) || q > 100000 || (type !== 'adjust' && q === 0)) continue;
        const before = Number(c.stock) || 0, after = type === 'out' ? before - q : type === 'in' ? before + q : q;
        putDoc(st, path, Object.assign({}, c, { stock: after }));
        items.push({ code: it.code, name: c.name, unit: c.unit, qty: q, before: before, after: after });
      }
      if (!items.length) return out({ ok: false, code: 'invalid_argument', message: '沒有要登記的數量' });
      const id = String(req.id || Utilities.getUuid()).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
      putDoc(st, 'cons_log/' + id, { id: id, type: type, items: items, by: String(req.by || '').slice(0, 30), note: String(req.note || '').slice(0, 200), at: req.at || '', role: admin ? '老師' : '工讀生' });
      SpreadsheetApp.flush(); rebuild(st, 'consumables'); rebuild(st, 'cons_log');
      return out({ ok: true, items: items });
    }
    if (req.op === 'arr') {   // 只改陣列裡的一筆，傳送的資料量很小
      const FIELD = { requests: 'list', surveys: 'responses', usage: 'entries' };
      const root = String(req.path).split('/')[0], field = FIELD[root];
      if (!field || !validPath(req.path)) return out({ ok: false, code: 'invalid_argument', message: 'bad path' });
      if (!canWrite(req.path, admin, uid)) return out({ ok: false, code: 'invalid_argument', message: '沒有寫入權限' });
      const old = st.m[req.path];
      let doc = old ? JSON.parse(JSON.stringify(old)) : {};
      const arr = doc[field] || [];
      if (req.add) arr.push(req.add);
      else {
        const i = arr.findIndex(x => x && x.id === req.id);
        if (i < 0) return out({ ok: false, code: 'invalid_argument', message: '找不到這筆資料' });
        if (req.remove) { if (!admin) return out({ ok: false, code: 'invalid_argument', message: '沒有刪除權限' }); arr.splice(i, 1); }
        else arr[i] = Object.assign({}, arr[i], req.patch || {});
      }
      doc[field] = arr; doc.updatedAt = req.at || '';
      if (!admin) doc = sanitize(req.path, old, doc);
      putDoc(st, req.path, doc);
      SpreadsheetApp.flush(); rebuild(st, root);
      return out({ ok: true });
    }
    if (write) {
      const ops = req.op === 'batch' ? (req.writes || []) : [{ op: req.op, path: req.path, data: req.data }];
      const roots = {};
      for (const w of ops) {
        if (!validPath(w.path)) return out({ ok: false, code: 'invalid_argument', message: 'bad path ' + w.path });
        if (!canWrite(w.path, admin, uid)) return out({ ok: false, code: 'invalid_argument', message: '沒有寫入權限' });
        const old = st.m[w.path];
        if (w.op === 'delete') { if (!admin) return out({ ok: false, code: 'invalid_argument', message: '沒有刪除權限' }); delDoc(st, w.path); }
        else {
          let data = w.data || {};
          if (w.op === 'update') { if (old === undefined) return out({ ok: false, code: 'invalid_argument', message: 'missing' }); data = merge(JSON.parse(JSON.stringify(old)), data); }
          if (!admin) data = sanitize(w.path, old, data);
          putDoc(st, w.path, data);
        }
        roots[w.path.split('/')[0]] = true;
      }
      SpreadsheetApp.flush();
      Object.keys(roots).forEach(r => rebuild(st, r));
      return out({ ok: true });
    }
    return out({ ok: false, code: 'invalid_argument', message: 'unknown op' });
  } catch (x) {
    return out({ ok: false, code: 'unavailable', message: String(x) });
  } finally { if (write) try { lock.releaseLock(); } catch (x) {} }
}

/* ---------- 權限 ---------- */
let STAFF_NOW = false;
function canRead(p, admin, uid) {
  if (admin) return true;
  const s = String(p).split('/');
  if (s[0] === 'cons_log') return STAFF_NOW;
  if (PUBLIC_READ.includes(s[0])) return true;
  if (OWN.includes(s[0])) return !!uid && s[1] === uid;
  return false;
}
function canWrite(p, admin, uid) {
  if (admin) return true;
  const s = String(p).split('/');
  return OWN.includes(s[0]) && s.length === 2 && !!uid && s[1] === uid;
}
function validPath(p) { return typeof p === 'string' && /^[A-Za-z0-9_\-.~:@+]+(\/[A-Za-z0-9_\-.~:@+]+)*$/.test(p) && p.split('/').length % 2 === 0; }

/* 學生只能新增「待審核」申請、取消、確認歸還、標記已填問卷；審核結果由老師決定 */
function sanitize(path, oldDoc, doc) {
  const root = path.split('/')[0];
  if (root === 'surveys' || root === 'usage') {   // 只能新增，不能改或刪舊的
    const f = root === 'surveys' ? 'responses' : 'entries';
    const old = (oldDoc && oldDoc[f]) || [], ids = {};
    old.forEach(r => ids[r.id] = true);
    const o = { updatedAt: doc.updatedAt || '' };
    o[f] = old.concat((doc[f] || []).filter(r => r && r.id && !ids[r.id]));
    return o;
  }
  const old = (oldDoc && oldDoc.list) || [], byId = {};
  old.forEach(r => byId[r.id] = r);
  const allow = { pending: ['cancelled'], approved: ['cancelled'], out: ['returning'] };
  const list = [];
  (doc.list || []).forEach(r => {
    if (!r || !r.id) return;
    const o = byId[r.id];
    if (!o) {
      const n = Object.assign({}, r, { status: 'pending' });
      ['reviewNote', 'reviewedAt', 'loanId', 'outAt', 'due', 'assetNo', 'returnedAt', 'receiver', 'returnNote', 'abnormal', 'surveyed', 'surveyedAt'].forEach(k => delete n[k]);
      list.push(n); return;
    }
    const n = Object.assign({}, o);
    if (r.status !== o.status && (allow[o.status] || []).includes(r.status)) {
      n.status = r.status;
      if (r.cancelledAt) n.cancelledAt = r.cancelledAt;
      if (r.returnRequestedAt) n.returnRequestedAt = r.returnRequestedAt;
    }
    if (o.status === 'returned' && r.surveyed) { n.surveyed = true; n.surveyedAt = r.surveyedAt || ''; }
    list.push(n); delete byId[r.id];
  });
  Object.keys(byId).forEach(k => list.push(byId[k]));
  return { list: list, updatedAt: doc.updatedAt || '' };
}

/* ---------- 儲存 ---------- */
function load() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(DOCS_SHEET), fresh = false;
  if (!sh) { sh = ss.insertSheet(DOCS_SHEET); sh.getRange(1, 1, 1, 3).setValues([['path', 'json', 'updated']]); fresh = true; }
  const st = { sh: sh, m: {}, row: {} };
  const n = sh.getLastRow();
  if (n > 1) sh.getRange(2, 1, n - 1, 2).getValues().forEach((r, i) => { if (r[0]) { try { st.m[r[0]] = JSON.parse(r[1]); st.row[r[0]] = i + 2; } catch (x) {} } });
  if (!Object.keys(st.m).some(k => k.indexOf('catalog/') === 0)) {
    SEED_CATALOG.forEach(c => putDoc(st, 'catalog/' + c.code, c));
    if (!st.m['config/site']) putDoc(st, 'config/site', { url: SITE_URL, semesterStart: '', office: '', eventDays: [] });
    SpreadsheetApp.flush(); rebuild(st, 'catalog');
  }
  if (!Object.keys(st.m).some(k => k.indexOf('consumables/') === 0)) {
    SEED_CONSUMABLES.forEach(c => putDoc(st, 'consumables/' + c.code, c));
    SpreadsheetApp.flush(); rebuild(st, 'consumables');
  }
  if (fresh) try { sh.hideSheet(); } catch (x) {}
  return st;
}
function putDoc(st, p, data) {
  const json = JSON.stringify(data);
  if (json.length > 49000) throw new Error('資料太大（單筆超過 49,000 字元）');
  if (st.row[p]) st.sh.getRange(st.row[p], 2, 1, 2).setValues([[json, new Date()]]);
  else { st.sh.appendRow([p, json, new Date()]); st.row[p] = st.sh.getLastRow(); }
  st.m[p] = data;
}
function delDoc(st, p) {
  const r = st.row[p];
  if (r) { st.sh.deleteRow(r); Object.keys(st.row).forEach(k => { if (st.row[k] > r) st.row[k]--; }); delete st.row[p]; }
  delete st.m[p];
}
function listCol(st, col, admin, uid) {
  const n = col.split('/').length + 1;
  return Object.keys(st.m).filter(k => k.indexOf(col + '/') === 0 && k.split('/').length === n && canRead(k, admin, uid)).sort()
    .map(k => ({ id: k.split('/').pop(), data: st.m[k] }));
}
function merge(t, s) {
  Object.keys(s).forEach(k => { const v = s[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && t[k] && typeof t[k] === 'object' && !Array.isArray(t[k])) merge(t[k], v); else t[k] = v; });
  return t;
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------- 給老師看的分頁（每次寫入自動更新） ---------- */
const TYPES = { item: '一般性器材', leisure: '休閒性器材', space: '空間借用', long: '長期借用' };
const STATUS = { pending: '待審核', approved: '已核准・待領取', rejected: '不同意', out: '借出中', returning: '已確認歸還・待點收', returned: '已歸還', cancelled: '已取消' };
function rebuild(st, root) {
  const docs = k => Object.keys(st.m).filter(p => p.indexOf(k + '/') === 0 && p.split('/').length === 2).map(p => st.m[p]);
  let name, head, rows;
  if (root === 'requests') {
    name = '申請紀錄';
    head = ['申請時間', '狀態', '類別', '品項', '使用日期', '時段', '預計歸還', '身分', '學號／員工編號', '姓名', '系級／單位', '電話', '用途', '老師備註', '確認歸還時間', '歸還日期', '滿意度問卷'];
    rows = [];
    docs('requests').forEach(d => (d.list || []).forEach(r => rows.push([r.createdAt, STATUS[r.status] || r.status, TYPES[r.type] || r.type, r.itemName, r.date, (r.periods && r.periods.length ? r.periods.map(p => p === '午' ? '午休' : '第' + p + '節').join('、') + ' ' : '') + (r.start ? r.start + '–' + r.end : ''), r.due || r.endDate || '', r.role, r.no, r.name, r.dept, r.phone, r.purpose, r.reviewNote || '', r.returnRequestedAt || '', r.returnedAt || '', r.role === '教職員' ? '不需' : r.surveyed ? '已填' : r.status === 'returned' ? '未填' : ''])));
    rows.sort((a, b) => String(b[0]).localeCompare(String(a[0])));
  } else if (root === 'loans') {
    name = '設備借用紀錄';
    head = ['申請日', '使用日期', '借用人', '學號', '系級', '借用品項', '財產/物品編號', '經手人', '抵押證件', '出借時間', '應還日期', '歸還日期', '簽收人', '狀態', '歸還狀況', '來源'];
    rows = docs('loans').map(l => [l.applyDate, l.date, l.name, l.no, l.dept, l.item, l.assetNo, l.handler, l.idHeld, l.outAt, l.due, l.returnedAt, l.receiver, l.status === 'returned' ? (l.abnormal ? '已歸還・異常' : '已歸還') : '借出中', l.returnNote || '', ({ online: '線上', walkin: '現場', import: '匯入' })[l.source] || '']);
    rows.sort((a, b) => String(b[1]).localeCompare(String(a[1])));
  } else if (root === 'surveys') {
    name = '滿意度問卷';
    head = ['填寫時間', '使用項目', '借用品項', '空間環境', '器材設備', '借用流程', '協助態度', '整體滿意度', '建議'];
    rows = [];
    const room = [], AG = ['', '非常不同意', '不同意', '普通', '同意', '非常同意'];
    docs('surveys').forEach(d => (d.responses || []).forEach(x => {
      if (x.kind === 'space') room.push([x.at, x.useDate, x.target, x.gender, x.program, x.college === '其他' ? '其他：' + (x.collegeOther || '') : x.college, x.grade, x.rc,
        (x.purposes || []).map(p => p === '其他' ? '其他：' + (x.purposeOther || '') : p).join('、'), AG[x.s1] || '', AG[x.s2] || '', AG[x.s3] || '', AG[x.s4] || '', AG[x.s5] || '', AG[x.s6] || '', x.comment || '']);
      else rows.push([x.at, x.target, x.itemName || '', x.q1, x.q2, x.q3, x.q4, x.q5, x.comment || '']);
    }));
    room.sort((a, b) => String(b[0]).localeCompare(String(a[0])));
    writeSheet('悅讀書房問卷', ['填寫時間', '使用日期', '使用空間', '性別', '學制', '學院', '年級', '資源教室學生', '主要目的',
      '1.使用規則簡單容易', '2.空間大小適切', '3.滿意設備規劃', '4.較不受外界干擾', '5.比較能提高效率', '6.整體滿意規劃', '其他建議'], room);
    rows.sort((a, b) => String(b[0]).localeCompare(String(a[0])));
  } else if (root === 'usage') {
    name = '設備使用登記簿';
    head = ['序號', '日期時間', '學制', '科系', '姓名', '使用設備', '紙張張數', '使用原因'];
    const list = [];
    docs('usage').forEach(d => (d.entries || []).forEach(e => list.push(e)));
    list.sort((a, b) => String(a.at).localeCompare(String(b.at)));
    rows = list.map((e, i) => [i + 1, e.at, e.shift, e.dept, e.name,
      [e.pc ? '電腦 ' + e.pc : '', e.print ? '印表機（彩色）' : '', e.copy ? '影印機（黑白）' : '', e.scan ? '掃描資料' : ''].filter(String).join('、'),
      e.paper || '', e.reason === '其他' ? '其他：' + (e.reasonNote || '') : e.reason]);
  } else if (root === 'consumables') {
    name = '耗材庫存';
    head = ['代碼', '名稱', '單位', '目前庫存', '安全庫存', '狀態'];
    rows = docs('consumables').sort((a, b) => (a.sort || 0) - (b.sort || 0)).map(c => [c.code, c.name, c.unit, c.stock, c.low, (Number(c.stock) || 0) <= (Number(c.low) || 0) ? '快用完，請補貨' : '']);
  } else if (root === 'cons_log') {
    name = '耗材登記紀錄';
    head = ['時間', '類型', '品項', '數量', '單位', '登記前', '登記後', '登記人', '身分', '備註'];
    const T = { out: '領用', in: '補貨', adjust: '盤點調整' };
    rows = [];
    docs('cons_log').forEach(l => (l.items || []).forEach(i => rows.push([l.at, T[l.type] || l.type, i.name, i.qty, i.unit, i.before, i.after, l.by, l.role || '', l.note || ''])));
    rows.sort((a, b) => String(b[0]).localeCompare(String(a[0])));
  } else if (root === 'roster') {
    name = '借用名單';
    head = ['學號', '姓名', '系級', '類別', '證明有效期限', '備註'];
    rows = docs('roster').map(r => [r.no, r.name, r.dept, r.category, r.validUntil, r.note]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  } else if (root === 'catalog') {
    name = '器材清單';
    head = ['代碼', '名稱', '類別', '數量', '借出中', '可長期借用', '說明'];
    const C = { general: '一般性・當天', general3: '一般性・3 天內', leisure: '休閒性', space: '空間' };
    rows = docs('catalog').sort((a, b) => (a.sort || 0) - (b.sort || 0)).map(c => [c.code, c.name, C[c.cat] || c.cat, c.qty, c.out, c.longOk ? '可' : '', c.note]);
  } else return;
  writeSheet(name, head, rows);
}
function writeSheet(name, head, rows) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clearContents();
  const data = [head].concat(rows.map(r => r.map(v => v === undefined || v === null ? '' : v)));
  sh.getRange(1, 1, data.length, head.length).setValues(data);
  sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#dcebe4');
  sh.setFrozenRows(1);
}

/* 手動執行一次可建立所有分頁、確認權限 */
function 初始化() { const st = load(); ['catalog', 'requests', 'loans', 'surveys', 'usage', 'roster', 'consumables', 'cons_log'].forEach(r => rebuild(st, r)); }
