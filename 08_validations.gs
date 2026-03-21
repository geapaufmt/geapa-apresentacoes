/**
 * ============================================================
 * 08_validations.gs
 * ============================================================
 *
 * Validações estruturais do módulo de apresentações.
 */

/**
 * Garante que a library do core está disponível.
 * @return {Object}
 */
function apresentacoes_validarCoreLibrary_() {
  var issues = [];

  if (typeof GEAPA_CORE === 'undefined' || !GEAPA_CORE) {
    issues.push('Library GEAPA_CORE não está disponível.');
  } else {
    if (typeof GEAPA_CORE.coreGetSheetByKey !== 'function') {
      issues.push('Função GEAPA_CORE.coreGetSheetByKey não está disponível.');
    }
    if (typeof GEAPA_CORE.coreGetRegistry !== 'function') {
      issues.push('Função GEAPA_CORE.coreGetRegistry não está disponível.');
    }
  }

  return {
    ok: issues.length === 0,
    issues: issues
  };
}

/**
 * Valida se uma lista de cabeçalhos obrigatórios existe.
 * @param {Object<string, number>} headerMap
 * @param {string[]} requiredHeaders
 * @return {Object}
 */
function apresentacoes_validarHeadersObrigatorios_(headerMap, requiredHeaders) {
  var missing = requiredHeaders.filter(function(header) {
    return headerMap[header] === undefined;
  });

  return {
    ok: missing.length === 0,
    missing: missing
  };
}

/**
 * Valida a estrutura da aba de processamento.
 * @return {Object}
 */
function apresentacoes_validarEstruturaProcessamento_() {
  var issues = [];
  var warnings = [];

  try {
    var sheet = apresentacoes_getSheetProcessamento_();
    var headerMap = apresentacoes_getHeaderMap_(sheet);
    var S = APRESENTACOES_SCHEMA.PROCESSAMENTO;

    var requiredHeaders = [
      S.NOME_MEMBRO,
      S.RGA,
      S.EMAIL_MEMBRO,
      S.DATA_APRESENTACAO,
      S.SEMESTRE_APRESENTACAO,
      S.TITULO_APRESENTACAO,
      S.EIXO_PRINCIPAL,
      S.STATUS_APRESENTACAO,
      S.QTD_COBRANCAS_TITULO_EIXO,
      S.LINK_ARQUIVO_DRIVE,
      S.NOTIFICACAO_SECRETARIOS_ENVIADA,
      S.DT_HR_NOTIFICACAO_SECRETARIOS
    ];

    var res = apresentacoes_validarHeadersObrigatorios_(headerMap, requiredHeaders);
    if (!res.ok) {
      issues.push(
        'Cabeçalhos obrigatórios ausentes na aba de processamento: ' +
        res.missing.join(', ')
      );
    }

    return {
      ok: issues.length === 0,
      sheetName: sheet.getName(),
      issues: issues,
      warnings: warnings
    };
  } catch (err) {
    return {
      ok: false,
      sheetName: null,
      issues: [err.message || String(err)],
      warnings: warnings
    };
  }
}

/**
 * Valida a estrutura da aba de histórico público.
 * @return {Object}
 */
function apresentacoes_validarEstruturaHistorico_() {
  var issues = [];
  var warnings = [];

  try {
    var sheet = apresentacoes_getSheetHistoricoPublico_();
    var headerMap = apresentacoes_getHeaderMap_(sheet);
    var H = APRESENTACOES_SCHEMA.HISTORICO;

    var requiredHeaders = [
      H.TITULO,
      H.EIXO_TEMATICO,
      H.PALESTRANTE,
      H.RGA,
      H.DATA,
      H.SEMESTRE,
      H.LINK
    ];

    var res = apresentacoes_validarHeadersObrigatorios_(headerMap, requiredHeaders);
    if (!res.ok) {
      issues.push(
        'Cabeçalhos obrigatórios ausentes na aba de histórico: ' +
        res.missing.join(', ')
      );
    }

    return {
      ok: issues.length === 0,
      sheetName: sheet.getName(),
      issues: issues,
      warnings: warnings
    };
  } catch (err) {
    return {
      ok: false,
      sheetName: null,
      issues: [err.message || String(err)],
      warnings: warnings
    };
  }
}

/**
 * Valida duplicatas no histórico com base em RGA + data.
 * @return {Object}
 */
function apresentacoes_validarDuplicatasHistorico_() {
  var duplicates = [];
  var seen = {};
  var itens = apresentacoes_listarHistoricoExistente_();

  itens.forEach(function(item) {
    var key = item.key;
    if (!key) return;

    if (!seen[key]) {
      seen[key] = [];
    }

    seen[key].push(item.rowNumber);
  });

  Object.keys(seen).forEach(function(key) {
    if (seen[key].length > 1) {
      duplicates.push({
        key: key,
        rows: seen[key]
      });
    }
  });

  return {
    ok: duplicates.length === 0,
    duplicates: duplicates
  };
}

/**
 * Valida as keys mínimas da configuração do módulo.
 * @return {Object}
 */
function apresentacoes_validarConfiguracao_() {
  var issues = [];

  if (!APRESENTACOES_CFG || !APRESENTACOES_CFG.REGISTRY_KEYS) {
    issues.push('APRESENTACOES_CFG.REGISTRY_KEYS não está definido.');
  } else {
    var keys = APRESENTACOES_CFG.REGISTRY_KEYS;

    if (!keys.PROCESSAMENTO) issues.push('REGISTRY_KEYS.PROCESSAMENTO não definido.');
    if (!keys.HISTORICO_PUBLICO) issues.push('REGISTRY_KEYS.HISTORICO_PUBLICO não definido.');
  }

  return {
    ok: issues.length === 0,
    issues: issues
  };
}

/**
 * Executa validação geral do módulo.
 * @return {Object}
 */
function apresentacoes_validarModulo_() {
  var core = apresentacoes_validarCoreLibrary_();
  var config = apresentacoes_validarConfiguracao_();
  var processamento = apresentacoes_validarEstruturaProcessamento_();
  var historico = apresentacoes_validarEstruturaHistorico_();
  var duplicatas = historico.ok ? apresentacoes_validarDuplicatasHistorico_() : {
    ok: false,
    duplicates: []
  };

  var ok = (
    core.ok &&
    config.ok &&
    processamento.ok &&
    historico.ok &&
    duplicatas.ok
  );

  return {
    ok: ok,
    checks: {
      core: core,
      config: config,
      processamento: processamento,
      historico: historico,
      duplicatasHistorico: duplicatas
    }
  };
}