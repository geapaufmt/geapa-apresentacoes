/**
 * ============================================================
 * 13b_fotos_pendentes.gs
 * ============================================================
 *
 * Processa fotos adicionadas depois do recebimento do arquivo
 * da apresentação.
 */

/**
 * Extrai o ID de uma pasta do Drive a partir da URL.
 *
 * @param {string} url
 * @return {string}
 */
function apresentacoes_extrairFolderIdDaUrl_(url) {
  var txt = String(url || '').trim();
  if (!txt) return '';

  var m = txt.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m && m[1] ? m[1] : '';
}

/**
 * Abre a pasta final da apresentação a partir do link salvo na planilha.
 *
 * @param {Object} item
 * @return {GoogleAppsScript.Drive.Folder|null}
 */
function apresentacoes_getPastaFinalPorLink_(item) {
  var folderId = apresentacoes_extrairFolderIdDaUrl_(item.linkArquivoDrive);
  if (!folderId) return null;

  return DriveApp.getFolderById(folderId);
}

/**
 * Verifica se a apresentação já tem pasta final registrada.
 *
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_temPastaFinalRegistrada_(item) {
  return !!apresentacoes_extrairFolderIdDaUrl_(item.linkArquivoDrive);
}

/**
 * Verifica se o item pode receber fotos pendentes.
 *
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_deveProcessarFotosPendentes_(item) {
  if (!item.dataApresentacao) return false;
  if (!apresentacoes_temPastaFinalRegistrada_(item)) return false;

  return true;
}

/**
 * Lista apresentações elegíveis para processar fotos pendentes.
 *
 * @return {Object[]}
 */
function apresentacoes_listarElegiveisFotosPendentes_() {
  return apresentacoes_listarApresentacoesInternas_().filter(function(item) {
    return apresentacoes_deveProcessarFotosPendentes_(item);
  });
}

/**
 * Move as fotos pendentes de uma apresentação para a pasta final já existente.
 *
 * @param {Object} item
 * @return {Object}
 */
function apresentacoes_processarFotosPendentesItem_(item) {
  var pastaFinal = apresentacoes_getPastaFinalPorLink_(item);
  if (!pastaFinal) {
    return {
      ok: false,
      action: 'skip',
      reason: 'pasta_final_nao_encontrada',
      rowNumber: item.rowNumber
    };
  }

  var fotos = apresentacoes_listarFotosDaApresentacao_(item);

  if (!fotos.length) {
    return {
      ok: true,
      action: 'skip',
      reason: 'sem_fotos_pendentes',
      rowNumber: item.rowNumber,
      movedCount: 0
    };
  }

  var movidas = [];

  fotos.forEach(function(file) {
    apresentacoes_moverArquivoParaPasta_(file, pastaFinal);
    movidas.push({
      name: file.getName(),
      id: file.getId(),
      url: file.getUrl()
    });
  });

  return {
    ok: true,
    action: 'processed',
    rowNumber: item.rowNumber,
    nome: item.nome,
    folderName: pastaFinal.getName(),
    folderUrl: pastaFinal.getUrl(),
    movedCount: movidas.length,
    fotosMovidas: movidas
  };
}

/**
 * Processa fotos pendentes de todas as apresentações elegíveis.
 *
 * @return {Object}
 */
function apresentacoes_processarFotosPendentes_() {
  var runId = 'APRES-FOTOS-PEND-' + new Date().getTime();
  var itens = apresentacoes_listarElegiveisFotosPendentes_();

  var counters = {
    totalElegiveis: itens.length,
    processed: 0,
    skipped: 0,
    movedFiles: 0,
    errors: 0
  };

  var details = [];

  itens.forEach(function(item) {
    try {
      var res = apresentacoes_processarFotosPendentesItem_(item);
      details.push(res);

      if (res.action === 'processed') {
        counters.processed++;
        counters.movedFiles += Number(res.movedCount || 0);
      } else {
        counters.skipped++;
      }
    } catch (err) {
      counters.errors++;
      details.push({
        ok: false,
        action: 'error',
        rowNumber: item.rowNumber,
        message: err && err.message ? err.message : String(err)
      });
    }
  });

  return {
    ok: counters.errors === 0,
    runId: runId,
    counters: counters,
    details: details.slice(0, 20)
  };
}

/**
 * Processa fotos pendentes de uma linha específica.
 *
 * @param {number} rowNumber
 * @return {Object}
 */
function apresentacoes_processarFotosPendentesPorLinha_(rowNumber) {
  var itens = apresentacoes_listarApresentacoesInternas_();
  var item = null;

  for (var i = 0; i < itens.length; i++) {
    if (itens[i].rowNumber === rowNumber) {
      item = itens[i];
      break;
    }
  }

  if (!item) {
    throw new Error('Linha não encontrada: ' + rowNumber);
  }

  return apresentacoes_processarFotosPendentesItem_(item);
}