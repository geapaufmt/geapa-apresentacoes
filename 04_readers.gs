/**
 * Leitura e normalizacao da planilha.
 */

/**
 * Retorna mapa cabecalho -> indice.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @return {Object<string, number>}
 */
function apresentacoes_getHeaderMap_(sheet) {
  var data = GEAPA_CORE.coreReadSheetData(sheet, { headerRow: 1 });
  if (!data.headers.length) {
    throw new Error('A aba esta vazia ou sem cabecalhos.');
  }

  return GEAPA_CORE.coreBuildHeaderIndexMap(data.headers, {
    normalize: false,
    oneBased: false,
    keepFirst: true
  });
}

/**
 * Le todas as linhas uteis de uma aba.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @return {Array[]}
 */
function apresentacoes_getDataRows_(sheet) {
  return GEAPA_CORE.coreReadSheetData(sheet, {
    headerRow: 1,
    startRow: 2
  }).rows;
}

/**
 * Le valor por nome do cabecalho.
 * @param {Array} row
 * @param {Object<string, number>} headerMap
 * @param {string} headerName
 * @return {*}
 */
function apresentacoes_getCellByHeader_(row, headerMap, headerName) {
  return GEAPA_CORE.coreGetCellByHeader(row, headerMap, headerName, {
    normalize: false,
    defaultValue: ''
  });
}

/**
 * Normaliza uma linha da aba de processamento em objeto canonico.
 * @param {Array} row
 * @param {Object<string, number>} headerMap
 * @param {number} rowNumber
 * @return {Object}
 */
function apresentacoes_normalizarLinhaProcessamento_(row, headerMap, rowNumber) {
  var S = APRESENTACOES_SCHEMA.PROCESSAMENTO;

  return {
    rowNumber: rowNumber,
    nome: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.NOME_MEMBRO)),
    rga: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.RGA)),
    email: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.EMAIL_MEMBRO)),
    dataApresentacao: apresentacoes_getCellByHeader_(row, headerMap, S.DATA_APRESENTACAO),
    semestre: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.SEMESTRE_APRESENTACAO)),
    horario: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.HORARIO_REUNIAO)),
    local: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.LOCAL_REUNIAO)),
    titulo: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.TITULO_APRESENTACAO)),
    eixoPrincipal: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.EIXO_PRINCIPAL)),
    eixoSecundario: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.EIXO_SECUNDARIO)),
    status: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.STATUS_APRESENTACAO)),
    emailAgendamentoEnviado: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.EMAIL_AGENDAMENTO_ENVIADO)),
    dtHrEmailAgendamento: apresentacoes_getCellByHeader_(row, headerMap, S.DT_HR_EMAIL_AGENDAMENTO),
    notificacaoSecretariosEnviada: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.NOTIFICACAO_SECRETARIOS_ENVIADA)),
    dtHrNotificacaoSecretarios: apresentacoes_getCellByHeader_(row, headerMap, S.DT_HR_NOTIFICACAO_SECRETARIOS),
    lembrete4DiasEnviado: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.LEMBRETE_4_DIAS_ENVIADO)),
    dtHrEnvioLembrete4Dias: apresentacoes_getCellByHeader_(row, headerMap, S.DT_HR_ENVIO_LEMBRETE_4_DIAS),
    dtCobrancaTituloEixo: apresentacoes_getCellByHeader_(row, headerMap, S.DT_COBRANCA_TITULO_EIXO),
    qtdCobrancasTituloEixo: apresentacoes_getCellByHeader_(row, headerMap, S.QTD_COBRANCAS_TITULO_EIXO),
    dtHrConfirmacaoTituloEixo: apresentacoes_getCellByHeader_(row, headerMap, S.DT_HR_CONFIRMACAO_TITULO_EIXO),
    conviteProfessoresEnviado: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.CONVITE_PROFESSORES_ENVIADO)),
    dtHrEnvioConviteProfessores: apresentacoes_getCellByHeader_(row, headerMap, S.DT_HR_ENVIO_CONVITE_PROFESSORES),
    lembreteMembrosEnviado: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.LEMBRETE_MEMBROS_ENVIADO)),
    dtHrEnvioLembreteMembros: apresentacoes_getCellByHeader_(row, headerMap, S.DT_HR_ENVIO_LEMBRETE_MEMBROS),
    statusEnvioArquivo: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.STATUS_ENVIO_ARQUIVO)),
    dtHrSolicitacaoArquivo: apresentacoes_getCellByHeader_(row, headerMap, S.DT_HR_SOLICITACAO_ARQUIVO),
    qtdCobrancasArquivo: apresentacoes_getCellByHeader_(row, headerMap, S.QTD_COBRANCAS_ARQUIVO),
    linkArquivoDrive: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.LINK_ARQUIVO_DRIVE)),
    dtHrEmailCobrancaArquivo: apresentacoes_getCellByHeader_(row, headerMap, S.DT_HR_EMAIL_COBRANCA_ARQUIVO),
    dtHrRecebimentoArquivo: apresentacoes_getCellByHeader_(row, headerMap, S.DT_HR_RECEBIMENTO_ARQUIVO),
    professoresConvidados: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.PROFESSORES_CONVIDADOS)),
    observacoes: apresentacoes_toStr_(apresentacoes_getCellByHeader_(row, headerMap, S.OBSERVACOES))
  };
}

/**
 * Lista apresentacoes internas normalizadas.
 * @return {Object[]}
 */
function apresentacoes_listarApresentacoesInternas_() {
  var sheet = apresentacoes_getSheetProcessamento_();
  var headerMap = apresentacoes_getHeaderMap_(sheet);
  var rows = apresentacoes_getDataRows_(sheet);

  return rows
    .map(function(row, i) {
      return apresentacoes_normalizarLinhaProcessamento_(row, headerMap, i + 2);
    })
    .filter(function(item) {
      return item.nome || item.rga || item.email || item.dataApresentacao || item.semestre;
    });
}

/**
 * Converte valor em string tratada.
 * @param {*} value
 * @return {string}
 */
function apresentacoes_toStr_(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}
