/**
 * ============================================================
 * 14_identificacao_autofill.gs
 * ============================================================
 */

function apresentacoes_preencherIdentificacaoLinha_(rowNumber) {
  var sheet = apresentacoes_getSheetProcessamento_();
  var res = GEAPA_CORE.coreAutofillIdentityRowInSheet(sheet, rowNumber, {
    nameHeaders: ['Nome do membro'],
    rgaHeaders: ['RGA'],
    emailHeaders: ['E-mail do membro']
  });

  if (!res || !res.ok) {
    return {
      ok: false,
      action: 'skip',
      reason: res && res.reason ? res.reason : 'membro_nao_encontrado',
      rowNumber: rowNumber,
      identity: res && res.identity ? res.identity : ''
    };
  }

  return {
    ok: true,
    action: res.updated && res.updated.length ? 'filled' : 'unchanged',
    rowNumber: rowNumber,
    resolved: res.found || null,
    updated: res.updated || []
  };
}

function apresentacoes_preencherIdentificacaoPendentes_() {
  var sheet = apresentacoes_getSheetProcessamento_();
  var lastRow = sheet.getLastRow();

  var counters = {
    totalLinhas: Math.max(0, lastRow - 1),
    filled: 0,
    unchanged: 0,
    skipped: 0,
    errors: 0
  };

  var details = [];

  for (var rowNumber = 2; rowNumber <= lastRow; rowNumber++) {
    try {
      var res = apresentacoes_preencherIdentificacaoLinha_(rowNumber);
      details.push(res);

      if (res.action === 'filled') counters.filled++;
      else if (res.action === 'unchanged') counters.unchanged++;
      else counters.skipped++;
    } catch (err) {
      counters.errors++;
      details.push({
        ok: false,
        action: 'error',
        rowNumber: rowNumber,
        message: err && err.message ? err.message : String(err)
      });
    }
  }

  return {
    ok: counters.errors === 0,
    counters: counters,
    details: details.slice(0, 30)
  };
}
