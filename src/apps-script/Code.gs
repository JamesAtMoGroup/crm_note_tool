// ─────────────────────────────────────────────
//  CRM Note Tool v2 — Apps Script Web App
//  Spreadsheet ID: 1d6jkWDiFNKvoRN-M2Y6GJxS-0aY0ejHpytfwJ72_CFE
// ─────────────────────────────────────────────

var SPREADSHEET_ID = '1d6jkWDiFNKvoRN-M2Y6GJxS-0aY0ejHpytfwJ72_CFE';
var SHEET_LOG      = '特殊申請log';
var SHEET_CATS     = '分類設定';
var SHEET_AUDIT    = '分類異動log';
var OPS_EMAIL      = 'ops@qraft.app';

// ── Entry point ────────────────────────────────
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var token   = PropertiesService.getScriptProperties().getProperty('APPS_SCRIPT_TOKEN');

    if (!token || payload.token !== token) {
      return jsonResponse({ success: false, error: 'Unauthorized' });
    }

    switch (payload.action) {
      case 'append_application':       return appendApplication(payload);
      case 'update_application_status':return updateApplicationStatus(payload);
      case 'save_category':            return saveCategory(payload);
      case 'read_categories':          return readCategories(payload);
      case 'read_applications':        return readApplications(payload);
      case 'send_member_email':        return sendMemberEmail(payload);
      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + payload.action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ── append_application ─────────────────────────
// 新增一筆特殊申請（狀態 = pending）
function appendApplication(p) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_LOG);
  var lock  = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var applicationId = generateApplicationId(sheet);
    var now           = new Date().toISOString();

    sheet.appendRow([
      applicationId,        // A 申請單號
      now,                  // B 送出時間
      p.brandDisplay,       // C 品牌（顯示名）
      p.brandKey,           // D brandKey
      p.applicantName,      // E 申請人姓名
      p.memberName,         // F 學員姓名
      p.memberEmail,        // G 學員 email
      p.memberId,           // H member_id
      p.itemName,           // I 分類項目名稱
      p.categoryId,         // J 分類 ID（CUSTOM = 非既有需求）
      p.deductType,         // K 扣%類型
      p.deductValue != null ? p.deductValue : '', // L 扣%值
      p.purpose,            // M 目的
      p.requirement,        // N 需求
      p.note || '',         // O 備註
      'pending',            // P 狀態
      '',                   // Q 審核時間
      '',                   // R 審核人
      '',                   // S 拒絕原因
      '否',                 // T 是否已寄送
      now,                  // U 最後更新時間
    ]);

    return jsonResponse({ success: true, applicationId: applicationId });
  } finally {
    lock.releaseLock();
  }
}

// ── update_application_status ─────────────────
// 更新申請狀態（核准 / 拒絕），可選發信
function updateApplicationStatus(p) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_LOG);
  var data  = sheet.getDataRange().getValues();
  var now   = new Date().toISOString();

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === p.applicationId) { rowIndex = i + 1; break; }
  }
  if (rowIndex === -1) return jsonResponse({ success: false, error: '找不到申請單: ' + p.applicationId });

  var row = data[rowIndex - 1];

  // 更新狀態相關欄位
  sheet.getRange(rowIndex, 16).setValue(p.decision === 'approved' ? 'approved' : 'rejected'); // P
  sheet.getRange(rowIndex, 17).setValue(now);           // Q 審核時間
  sheet.getRange(rowIndex, 18).setValue(OPS_EMAIL);     // R 審核人
  sheet.getRange(rowIndex, 21).setValue(now);           // U 最後更新時間

  if (p.decision === 'approved') {
    if (p.deductPercent != null) {
      sheet.getRange(rowIndex, 12).setValue(p.deductPercent); // L 扣%值（個案評估補填）
    }
  } else {
    sheet.getRange(rowIndex, 19).setValue(p.rejectReason || ''); // S 拒絕原因
  }

  // 發信（若 ops 選擇發信）
  if (p.decision === 'approved' && p.sendEmail && p.emailContent) {
    try {
      MailApp.sendEmail({
        to:      row[6],         // G 學員 email
        subject: p.emailSubject || '您的特殊申請已核准',
        body:    p.emailContent,
      });
      sheet.getRange(rowIndex, 20).setValue('已寄送'); // T
      sheet.getRange(rowIndex, 21).setValue(new Date().toISOString()); // U
    } catch (mailErr) {
      // 發信失敗不影響審核結果，但回報錯誤
      return jsonResponse({ success: true, emailError: mailErr.message });
    }
  }

  return jsonResponse({ success: true });
}

// ── save_category ─────────────────────────────
// 新增 / 編輯 / 停用 / 啟用分類
function saveCategory(p) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_CATS);
  var audit = ss.getSheetByName(SHEET_AUDIT);
  var now   = new Date().toISOString();

  var op = p.operation; // create | update | disable | enable
  var d  = p.data || {};

  if (op === 'create') {
    var newId = 'cat_' + Utilities.getUuid().split('-')[0];
    sheet.appendRow([
      newId,                        // A 分類 ID
      d.brandDisplay,               // B 品牌顯示名
      d.brandKey,                   // C brandKey
      d.itemName,                   // D 項目名稱
      d.deductType,                 // E 扣%類型
      d.deductValue != null ? d.deductValue : '', // F 扣%值
      d.emailTemplate || '',        // G 寄信模板（選填）
      true,                         // H 是否啟用
      d.sort || 99,                 // I 排序
      d.note || '',                 // J 備註
      now,                          // K 建立時間
      now,                          // L 最後更新時間
      OPS_EMAIL,                    // M 最後更新人
    ]);
    audit.appendRow([now, OPS_EMAIL, '新增', newId, d.brandDisplay, d.itemName, '—', '—', '—']);
    return jsonResponse({ success: true, categoryId: newId });
  }

  // 找到對應列
  var data     = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === p.categoryId) { rowIndex = i + 1; break; }
  }
  if (rowIndex === -1) return jsonResponse({ success: false, error: '找不到分類: ' + p.categoryId });

  var old = data[rowIndex - 1];

  if (op === 'disable') {
    sheet.getRange(rowIndex, 8).setValue(false);  // H
    sheet.getRange(rowIndex, 12).setValue(now);   // L
    sheet.getRange(rowIndex, 13).setValue(OPS_EMAIL); // M
    audit.appendRow([now, OPS_EMAIL, '停用', old[0], old[1], old[3], 'is_active', 'TRUE', 'FALSE']);
    return jsonResponse({ success: true });
  }

  if (op === 'enable') {
    sheet.getRange(rowIndex, 8).setValue(true);
    sheet.getRange(rowIndex, 12).setValue(now);
    sheet.getRange(rowIndex, 13).setValue(OPS_EMAIL);
    audit.appendRow([now, OPS_EMAIL, '啟用', old[0], old[1], old[3], 'is_active', 'FALSE', 'TRUE']);
    return jsonResponse({ success: true });
  }

  if (op === 'update') {
    var fieldMap = {
      2: ['brandDisplay',  'B 品牌'],
      3: ['brandKey',      'C brandKey'],
      4: ['itemName',      'D 項目名稱'],
      5: ['deductType',    'E 扣%類型'],
      6: ['deductValue',   'F 扣%值'],
      7: ['emailTemplate', 'G 寄信模板'],
      9: ['sort',          'I 排序'],
      10:['note',          'J 備註'],
    };
    Object.keys(fieldMap).forEach(function(colNum) {
      var key   = fieldMap[colNum][0];
      var label = fieldMap[colNum][1];
      if (d[key] === undefined) return;
      var newVal = d[key];
      var oldVal = old[parseInt(colNum) - 1];
      if (String(newVal) !== String(oldVal)) {
        sheet.getRange(rowIndex, parseInt(colNum)).setValue(newVal);
        audit.appendRow([now, OPS_EMAIL, '編輯', old[0], old[1], old[3], label, oldVal, newVal]);
      }
    });
    sheet.getRange(rowIndex, 12).setValue(now);
    sheet.getRange(rowIndex, 13).setValue(OPS_EMAIL);
    return jsonResponse({ success: true });
  }

  return jsonResponse({ success: false, error: 'Unknown operation: ' + op });
}

// ── read_categories ───────────────────────────
// 讀取分類設定（預設只回啟用中，?all=true 回全部）
function readCategories(p) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_CATS);
  var data  = sheet.getDataRange().getValues();
  var onlyActive = !(p && p.all);

  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (onlyActive && row[7] !== true) continue;
    result.push({
      id:            row[0],
      brandDisplay:  row[1],
      brandKey:      row[2],
      itemName:      row[3],
      deductType:    row[4],
      deductValue:   row[5] !== '' ? row[5] : null,
      emailTemplate: row[6] || null,
      isActive:      row[7],
      sort:          row[8],
      note:          row[9],
    });
  }
  result.sort(function(a, b) { return a.sort - b.sort; });
  return jsonResponse({ success: true, data: result });
}

// ── read_applications ─────────────────────────
// 讀取特殊申請（支援狀態/品牌/日期篩選）
function readApplications(p) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_LOG);
  var data  = sheet.getDataRange().getValues();

  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row    = data[i];
    var status = row[15]; // P

    if (p.status && p.status !== 'all' && status !== p.status) continue;
    if (p.brand  && row[3] !== p.brand) continue;
    if (p.startDate) {
      var created = new Date(row[1]);
      if (created < new Date(p.startDate)) continue;
    }
    if (p.endDate) {
      var created2 = new Date(row[1]);
      var end      = new Date(p.endDate);
      end.setHours(23, 59, 59);
      if (created2 > end) continue;
    }

    result.push({
      applicationId: row[0],
      createdAt:     row[1],
      brandDisplay:  row[2],
      brandKey:      row[3],
      applicantName: row[4],
      memberName:    row[5],
      memberEmail:   row[6],
      memberId:      row[7],
      itemName:      row[8],
      categoryId:    row[9],
      deductType:    row[10],
      deductValue:   row[11] !== '' ? row[11] : null,
      purpose:       row[12],
      requirement:   row[13],
      note:          row[14],
      status:        row[15],
      reviewedAt:    row[16] || null,
      reviewedBy:    row[17] || null,
      rejectReason:  row[18] || null,
      emailSent:     row[19],
      updatedAt:     row[20],
    });
  }

  // 最新的排最前
  result.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  return jsonResponse({ success: true, data: result });
}

// ── send_member_email ─────────────────────────
// 直接發信給學員（備用入口，update_application_status 已整合）
function sendMemberEmail(p) {
  try {
    MailApp.sendEmail({
      to:      p.memberEmail,
      subject: p.subject || '您的特殊申請已核准',
      body:    p.body,
    });
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ── 申請單號生成 ───────────────────────────────
// 格式：#YYYY-MMDD-NNN（當日流水號，跨品牌共用）
function generateApplicationId(sheet) {
  var today    = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MMdd');
  var prefix   = '#' + today + '-';
  var data     = sheet.getDataRange().getValues();
  var maxSeq   = 0;

  for (var i = 1; i < data.length; i++) {
    var id = String(data[i][0]);
    if (id.startsWith(prefix)) {
      var seq = parseInt(id.replace(prefix, ''), 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }

  var seq = String(maxSeq + 1).padStart(3, '0');
  return prefix + seq;
}

// ── JSON helper ───────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═════════════════════════════════════════════
//  初始化 Sheet（只需執行一次）
//  在 Apps Script 編輯器手動執行 initializeSheets()
// ═════════════════════════════════════════════
function initializeSheets() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // ── 特殊申請log ────────────────────────────
  var logSheet = ss.getSheetByName(SHEET_LOG);
  if (!logSheet) {
    logSheet = ss.insertSheet(SHEET_LOG);
  }
  if (logSheet.getLastRow() === 0) {
    logSheet.appendRow([
      '申請單號','送出時間','品牌','brandKey','申請人姓名',
      '學員姓名','學員email','member_id','分類項目名稱','分類ID',
      '扣%類型','扣%值','目的','需求','備註',
      '狀態','審核時間','審核人','拒絕原因','是否已寄送','最後更新時間'
    ]);
    logSheet.getRange(1, 1, 1, 21).setFontWeight('bold').setBackground('#f0f0f0');
    logSheet.setFrozenRows(1);
    logSheet.setColumnWidth(1, 160);
    logSheet.setColumnWidth(2, 160);
    logSheet.setColumnWidth(6, 120);
    logSheet.setColumnWidth(7, 180);
    logSheet.setColumnWidth(13, 200);
    logSheet.setColumnWidth(14, 200);
  }

  // ── 分類設定 ───────────────────────────────
  var catSheet = ss.getSheetByName(SHEET_CATS);
  if (!catSheet) {
    catSheet = ss.insertSheet(SHEET_CATS);
  }
  if (catSheet.getLastRow() === 0) {
    catSheet.appendRow([
      '分類ID','品牌顯示名','brandKey','項目名稱',
      '扣%類型','扣%值','寄信模板（選填）','是否啟用','排序','備註',
      '建立時間','最後更新時間','最後更新人'
    ]);
    catSheet.getRange(1, 1, 1, 13).setFontWeight('bold').setBackground('#f0f0f0');
    catSheet.setFrozenRows(1);
    catSheet.setColumnWidth(4, 250);
    catSheet.setColumnWidth(7, 300);
  }

  // ── 分類異動log ───────────────────────────
  var auditSheet = ss.getSheetByName(SHEET_AUDIT);
  if (!auditSheet) {
    auditSheet = ss.insertSheet(SHEET_AUDIT);
  }
  if (auditSheet.getLastRow() === 0) {
    auditSheet.appendRow([
      '時間戳記','操作人','操作類型','分類ID','品牌','項目名稱','變更欄位','舊值','新值'
    ]);
    auditSheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#f0f0f0');
    auditSheet.setFrozenRows(1);
  }

  SpreadsheetApp.flush();
  Logger.log('✅ 三個分頁初始化完成：' + SHEET_LOG + ' / ' + SHEET_CATS + ' / ' + SHEET_AUDIT);
}
