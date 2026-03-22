/**
 * ============================================================
 * 05b_semestre_autofill.gs
 * ============================================================
 *
 * Preenche automaticamente o semestre da apresentação
 * com base na data da apresentação e na planilha VIGENCIA_SEMESTRES.
 */

/**
 * Converte valor em Date válido.
 *
 * @param {*} value
 * @return {Date|null}
 */
function apresentacoes_toDateSafe_(value) {
  if (!value) return null;

  var d = value instanceof Date ? value : new Date(value);
  if (!(d instanceof Date) || isNaN(d.getTime())) return null;

  return d;
}

/**
 * Normaliza para início do dia.
 *
 * @param {*} value
 * @return {Date|null}
 */
function apresentacoes_toStartOfDaySafe_(value) {
  var d = apresentacoes_toDateSafe_(value);
  if (!d) return null;

  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Lê VIGENCIA_SEMESTRES e devolve os períodos cadastrados.
 *
 * Cabeçalhos esperados:
 * - ID_Semestre
 * - Início
 * - Fim
 * - ID_Período
 *
 * @return {Object[]}
 */
function apresentacoes_listarVigenciasSemestres_() {
  var sheet = GEAPA_CORE.coreGetSheetByKey('VIGENCIA_SEMESTRES');
  var headerMap = apresentacoes_getHeaderMap_(sheet);
  var rows = apresentacoes_getDataRows_(sheet);

  var colSemestre = headerMap['ID_Semestre'];
  var colInicio = headerMap['Início'];
  var colFim = headerMap['Fim'];
  var colPeriodo = headerMap['ID_Período'];

  if (colSemestre === undefined) {
    throw new Error('Coluna "ID_Semestre" não encontrada em VIGENCIA_SEMESTRES.');
  }
  if (colInicio === undefined) {
    throw new Error('Coluna "Início" não encontrada em VIGENCIA_SEMESTRES.');
  }
  if (colFim === undefined) {
    throw new Error('Coluna "Fim" não encontrada em VIGENCIA_SEMESTRES.');
  }
  if (colPeriodo === undefined) {
    throw new Error('Coluna "ID_Período" não encontrada em VIGENCIA_SEMESTRES.');
  }

  return rows.map(function(row) {
    return {
      semestre: String(row[colSemestre] || '').trim(),
      inicio: apresentacoes_toStartOfDaySafe_(row[colInicio]),
      fim: apresentacoes_toStartOfDaySafe_(row[colFim]),
      periodo: String(row[colPeriodo] || '').trim()
    };
  }).filter(function(item) {
    return item.semestre && item.inicio && item.fim;
  });
}

/**
 * Descobre o semestre da apresentação a partir da data,
 * usando a planilha de vigências.
 *
 * @param {*} dataApresentacao
 * @return {string}
 */
function apresentacoes_descobrirSemestrePorData_(dataApresentacao) {
  var data = apresentacoes_toStartOfDaySafe_(dataApresentacao);
  if (!data) return '';

  var vigencias = apresentacoes_listarVigenciasSemestres_();

  for (var i = 0; i < vigencias.length; i++) {
    var item = vigencias[i];

    if (data.getTime() >= item.inicio.getTime() && data.getTime() <= item.fim.getTime()) {
      return item.semestre;
    }
  }

  return '';
}

/**
 * Preenche o semestre da apresentação de uma linha específica,
 * com base na data da apresentação.
 *
 * @param {number} rowNumber
 * @return {Object}
 */
function apresentacoes_preencherSemestreLinha_(rowNumber) {
  var sheet = apresentacoes_getSheetProcessamento_();
  var headerMap = apresentacoes_getHeaderMap_(sheet);
  var S = APRESENTACOES_SCHEMA.PROCESSAMENTO;

  var colData = headerMap[S.DATA_APRESENTACAO];
  var colSemestre = headerMap[S.SEMESTRE_APRESENTACAO];

  if (colData === undefined) throw new Error('Coluna de data da apresentação não encontrada.');
  if (colSemestre === undefined) throw new Error('Coluna de semestre da apresentação não encontrada.');

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

/**
 * Preenche em lote os semestres pendentes/ajustáveis.
 *
 * @return {Object}
 */
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

/**
 * Processo unificado:
 * - preenche identificação
 * - preenche semestre
 *
 * @return {Object}
 */
function apresentacoes_autofillPendenciasGerais_() {
  var resIdent = apresentacoes_preencherIdentificacaoPendentes_();
  var resSem = apresentacoes_preencherSemestresPendentes_();

  return {
    ok: !!(resIdent.ok && resSem.ok),
    identificacao: resIdent,
    semestre: resSem
  };
}