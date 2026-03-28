/**
 * ============================================================
 * 05b_semestre_autofill.gs
 * ============================================================
 *
 * Preenche automaticamente o semestre da apresentacao
 * com base na data da apresentacao.
 */

function apresentacoes_descobrirSemestrePorData_(dataApresentacao) {
  if (!dataApresentacao) return '';
  return String(GEAPA_CORE.coreGetSemesterIdForDate(dataApresentacao) || '').trim();
}

function apresentacoes_preencherSemestreLinha_(rowNumber) {
  var sheet = apresentacoes_getSheetProcessamento_();
  var headerMap = apresentacoes_getHeaderMap_(sheet);
  var S = APRESENTACOES_SCHEMA.PROCESSAMENTO;

  var colData = headerMap[S.DATA_APRESENTACAO];
  var colSemestre = headerMap[S.SEMESTRE_APRESENTACAO];

  if (colData === undefined) throw new Error('Coluna de data da apresentacao nao encontrada.');
  if (colSemestre === undefined) throw new Error('Coluna de semestre da apresentacao nao encontrada.');

  var dataAp = sheet.getRange(rowNumber, colData + 1).getValue();
  var semestreAtual = String(sheet.getRange(rowNumber, colSemestre + 1).getValue() || '').trim();

  if (!dataAp) {
    return {
      ok: false,
      action: 'skip',
      reason: 'sem_data_apresentacao',
      rowNumber: rowNumber
    };
  }

  var semestreCalculado = apresentacoes_descobrirSemestrePorData_(dataAp);

  if (!semestreCalculado) {
    return {
      ok: false,
      action: 'skip',
      reason: 'semestre_nao_encontrado_nas_vigencias',
      rowNumber: rowNumber,
      dataApresentacao: dataAp
    };
  }

  if (semestreAtual === semestreCalculado) {
    return {
      ok: true,
      action: 'unchanged',
      rowNumber: rowNumber,
      semestre: semestreCalculado
    };
  }

  sheet.getRange(rowNumber, colSemestre + 1).setValue(semestreCalculado);

  return {
    ok: true,
    action: 'filled',
    rowNumber: rowNumber,
    semestre: semestreCalculado
  };
}

function apresentacoes_preencherSemestresPendentes_() {
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
      var res = apresentacoes_preencherSemestreLinha_(rowNumber);
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

function apresentacoes_autofillPendenciasGerais_() {
  var resIdent = apresentacoes_preencherIdentificacaoPendentes_();
  var resSem = apresentacoes_preencherSemestresPendentes_();

  return {
    ok: !!(resIdent.ok && resSem.ok),
    identificacao: resIdent,
    semestre: resSem
  };
}
