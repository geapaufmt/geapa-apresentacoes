/**
 * ============================================================
 * 07_history_sync.gs
 * ============================================================
 *
 * Sincronização entre a planilha interna de processamento
 * e a planilha pública de histórico de apresentações.
 *
 * REGRA ADOTADA:
 * - Só entra no histórico público quando a apresentação estiver
 *   apta e com LINK do Drive preenchido.
 */

/**
 * Converte item interno em objeto canônico do histórico.
 * @param {Object} item
 * @return {Object}
 */
function apresentacoes_toHistoricoObj_(item) {
  return {
    titulo: item.titulo,
    eixoTematico: item.eixoPrincipal,
    palestrante: item.nome,
    rga: item.rga,
    data: item.dataApresentacao,
    semestre: item.semestre,
    link: item.linkArquivoDrive
  };
}

/**
 * Normaliza data para chave estável.
 * @param {*} value
 * @return {string}
 */
function apresentacoes_keyDate_(value) {
  if (!value) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'yyyy-MM-dd'
    );
  }

  return String(value).trim();
}

/**
 * Gera chave única de comparação para histórico.
 * Critério: RGA + data da apresentação
 * @param {Object} hist
 * @return {string}
 */
function apresentacoes_buildHistoricoKey_(hist) {
  return [hist.rga || '', apresentacoes_keyDate_(hist.data)].join('||');
}

/**
 * Retorna contexto completo da aba de histórico.
 * Carrega sheet, headerMap, linhas existentes e índice em memória uma única vez.
 * @return {Object}
 */
function apresentacoes_buildHistoricoContext_() {
  var sheet = apresentacoes_getSheetHistoricoPublico_();
  var headerMap = apresentacoes_getHeaderMap_(sheet);
  var rows = apresentacoes_getDataRows_(sheet);
  var H = APRESENTACOES_SCHEMA.HISTORICO;

  var existingItems = rows.map(function(row, idx) {
    var item = {
      rowNumber: idx + 2,
      titulo: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, H.TITULO)),
      eixoTematico: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, H.EIXO_TEMATICO)),
      palestrante: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, H.PALESTRANTE)),
      rga: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, H.RGA)),
      data: apresentacoes_getCellByHeader_(row, headerMap, H.DATA),
      semestre: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, H.SEMESTRE)),
      link: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, H.LINK))
    };

    item.key = apresentacoes_buildHistoricoKey_(item);
    return item;
  }).filter(function(item) {
    return item.rga || item.data || item.titulo;
  });

  var existingMap = {};
  existingItems.forEach(function(item) {
    if (item.key) existingMap[item.key] = item;
  });

  return {
    sheet: sheet,
    headerMap: headerMap,
    existingItems: existingItems,
    existingMap: existingMap
  };
}

/**
 * Converte objeto canônico do histórico em array na ordem dos cabeçalhos.
 * @param {Object} hist
 * @param {Object<string, number>} headerMap
 * @return {Array}
 */
function apresentacoes_toHistoricoRow_(hist, headerMap) {
  var H = APRESENTACOES_SCHEMA.HISTORICO;
  var maxIndex = Math.max.apply(null, Object.keys(headerMap).map(function(k) {
    return headerMap[k];
  }));

  var row = new Array(maxIndex + 1).fill('');

  row[headerMap[H.TITULO]] = hist.titulo || '';
  row[headerMap[H.EIXO_TEMATICO]] = hist.eixoTematico || '';
  row[headerMap[H.PALESTRANTE]] = hist.palestrante || '';
  row[headerMap[H.RGA]] = hist.rga || '';
  row[headerMap[H.DATA]] = hist.data || '';
  row[headerMap[H.SEMESTRE]] = hist.semestre || '';
  row[headerMap[H.LINK]] = hist.link || '';

  return row;
}

/**
 * Verifica se o item interno está apto para histórico público.
 * REGRA A: exige link do Drive.
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_estaAptaHistorico_(item) {
  return !!(
    item.titulo &&
    item.eixoPrincipal &&
    item.nome &&
    item.rga &&
    item.dataApresentacao &&
    item.semestre &&
    item.linkArquivoDrive
  );
}

/**
 * Lista apresentações aptas para sincronização no histórico.
 * @return {Object[]}
 */
function apresentacoes_listarAptasHistorico_() {
  return apresentacoes_listarApresentacoesInternas_().filter(function(item) {
    return apresentacoes_estaAptaHistorico_(item);
  });
}

/**
 * Insere uma nova linha no histórico usando contexto já carregado.
 * @param {Object} hist
 * @param {Object} ctx
 * @return {number} rowNumber inserido
 */
function apresentacoes_inserirNoHistoricoComContext_(hist, ctx) {
  var row = apresentacoes_toHistoricoRow_(hist, ctx.headerMap);
  ctx.sheet.appendRow(row);

  var rowNumber = ctx.sheet.getLastRow();
  var indexed = {
    rowNumber: rowNumber,
    titulo: hist.titulo,
    eixoTematico: hist.eixoTematico,
    palestrante: hist.palestrante,
    rga: hist.rga,
    data: hist.data,
    semestre: hist.semestre,
    link: hist.link,
    key: apresentacoes_buildHistoricoKey_(hist)
  };

  ctx.existingMap[indexed.key] = indexed;
  ctx.existingItems.push(indexed);

  return rowNumber;
}

/**
 * Atualiza uma linha existente no histórico usando contexto já carregado.
 * @param {number} rowNumber
 * @param {Object} hist
 * @param {Object} ctx
 */
function apresentacoes_atualizarLinhaHistoricoComContext_(rowNumber, hist, ctx) {
  var row = apresentacoes_toHistoricoRow_(hist, ctx.headerMap);
  ctx.sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);

  var key = apresentacoes_buildHistoricoKey_(hist);
  if (ctx.existingMap[key]) {
    ctx.existingMap[key].titulo = hist.titulo;
    ctx.existingMap[key].eixoTematico = hist.eixoTematico;
    ctx.existingMap[key].palestrante = hist.palestrante;
    ctx.existingMap[key].rga = hist.rga;
    ctx.existingMap[key].data = hist.data;
    ctx.existingMap[key].semestre = hist.semestre;
    ctx.existingMap[key].link = hist.link;
  }
}

/**
 * Sincroniza uma apresentação específica usando contexto já carregado.
 * @param {Object} item
 * @param {Object} ctx
 * @return {Object}
 */
function apresentacoes_sincronizarItemNoHistoricoComContext_(item, ctx) {
  if (!apresentacoes_estaAptaHistorico_(item)) {
    return {
      ok: false,
      action: 'skip',
      reason: 'item_nao_apto_historico',
      rowNumber: item.rowNumber || null
    };
  }

  var hist = apresentacoes_toHistoricoObj_(item);
  var key = apresentacoes_buildHistoricoKey_(hist);
  var existing = ctx.existingMap[key];

  if (existing) {
    apresentacoes_atualizarLinhaHistoricoComContext_(existing.rowNumber, hist, ctx);
    return {
      ok: true,
      action: 'update',
      key: key,
      rowNumber: existing.rowNumber
    };
  }

  var insertedRow = apresentacoes_inserirNoHistoricoComContext_(hist, ctx);
  return {
    ok: true,
    action: 'insert',
    key: key,
    rowNumber: insertedRow
  };
}

/**
 * Sincroniza todas as apresentações aptas no histórico público.
 * @return {Object}
 */
function apresentacoes_sincronizarHistorico_() {
  var runId = 'APRES-HIST-' + new Date().getTime();
  var startedAt = new Date();
  var aptas = apresentacoes_listarAptasHistorico_();
  var ctx = apresentacoes_buildHistoricoContext_();

  var counters = {
    totalAptas: aptas.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };

  var details = [];

  aptas.forEach(function(item) {
    try {
      var res = apresentacoes_sincronizarItemNoHistoricoComContext_(item, ctx);
      details.push(res);

      if (res.action === 'insert') counters.inserted++;
      else if (res.action === 'update') counters.updated++;
      else counters.skipped++;
    } catch (err) {
      counters.errors++;
      details.push({
        ok: false,
        action: 'error',
        rowNumber: item.rowNumber || null,
        message: err && err.message ? err.message : String(err)
      });
    }
  });

  return {
    ok: counters.errors === 0,
    runId: runId,
    startedAt: startedAt,
    counters: counters,
    details: details
  };
}

/**
 * Função pública de conveniência.
 * @return {Object}
 */
function apresentacoes_syncHistorico() {
  return apresentacoes_sincronizarHistorico_();
}

/**
 * Lista itens já existentes no histórico público.
 * Reaproveita o contexto carregado do histórico.
 * @return {Object[]}
 */
function apresentacoes_listarHistoricoExistente_() {
  return apresentacoes_buildHistoricoContext_().existingItems;
}