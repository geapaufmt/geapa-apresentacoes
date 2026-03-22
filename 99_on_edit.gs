/**
 * ============================================================
 * 99_on_edit.gs
 * ============================================================
 */

/**
 * onEdit principal do módulo de apresentações.
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e
 */
function onEditApresentacoes(e) {
  apresentacoes_onEditAutofillIdentificacao_(e);
}

function apresentacoes_onEditAutofillIdentificacao_(e) {
  if (!e || !e.range) return;

  var sheet = e.range.getSheet();
  var sheetProcessamento = apresentacoes_getSheetProcessamento_();

  if (sheet.getSheetId() !== sheetProcessamento.getSheetId()) return;
  if (e.range.getRow() <= 1) return;

  var headerMap = apresentacoes_getHeaderMap_(sheetProcessamento);
  var S = APRESENTACOES_SCHEMA.PROCESSAMENTO;

  var colNome = headerMap[S.NOME_MEMBRO];
  var colRga = headerMap[S.RGA];
  var colEmail = headerMap[S.EMAIL_MEMBRO];

  var colsMonitoradas = [colNome, colRga, colEmail]
    .filter(function(v) { return v !== undefined; })
    .map(function(v) { return v + 1; });

  if (colsMonitoradas.indexOf(e.range.getColumn()) === -1) return;

  apresentacoes_preencherIdentificacaoLinha_(e.range.getRow());
}