/**
 * Regras de negócio puras.
 */

/**
 * Verifica se a apresentação possui identificação mínima.
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_toStartOfDay_(value) {
  if (!value) return null;

  var d = value instanceof Date ? value : new Date(value);
  if (!(d instanceof Date) || isNaN(d.getTime())) return null;

  return GEAPA_CORE.coreStartOfDay(d);
}

function apresentacoes_formatarDataApresentacaoTexto_(value) {
  var d = value instanceof Date ? value : new Date(value);
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    return String(value || '').trim();
  }

  return GEAPA_CORE.coreFormatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

function apresentacoes_normalizarComparacao_(value) {
  return GEAPA_CORE.coreNormalizeText(value, {
    removeAccents: true,
    collapseWhitespace: true,
    caseMode: 'lower'
  }).replace(/[–—-]/g, ' ');
}

function apresentacoes_temIdentificacaoMinima_(item) {
  return !!(item.nome && item.email && item.semestre);
}

/**
 * Verifica se título/eixo já estão confirmados.
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_temTituloEixoConfirmados_(item) {
  return !!(
    item.titulo &&
    item.eixoPrincipal &&
    item.dtHrConfirmacaoTituloEixo
  );
}

/**
 * Verifica se a linha está aprovada.
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_estaAprovada_(item) {
  return String(item.status || '').trim() === APRESENTACOES_CFG.STATUS_APRESENTACAO.APROVADA;
}

/**
 * Lista apresentações pendentes de título/eixo.
 * @return {Object[]}
 */
function apresentacoes_listarPendentesTituloEixo_() {
  return apresentacoes_listarApresentacoesInternas_().filter(function(item) {
    return (
      apresentacoes_temIdentificacaoMinima_(item) &&
      apresentacoes_estaAprovada_(item) &&
      !apresentacoes_temTituloEixoConfirmados_(item)
    );
  });
}

/**
 * Lista apresentações aptas para sincronização com o histórico.
 * @return {Object[]}
 */
function apresentacoes_listarAptasHistorico_() {
  return apresentacoes_listarApresentacoesInternas_().filter(function(item) {
    return apresentacoes_estaAptaHistorico_(item);
  });
}

/**
 * Gera um diagnóstico resumido do módulo.
 * @return {Object}
 */
function apresentacoes_gerarDiagnostico_() {
  var itens = apresentacoes_listarApresentacoesInternas_();

  var diagnostico = {
    total: itens.length,
    aprovadas: 0,
    pendentesTituloEixo: 0,
    aptasHistorico: 0,
    comLinkDrive: 0,
    semDataApresentacao: 0
  };

  itens.forEach(function(item) {
    if (apresentacoes_estaAprovada_(item)) diagnostico.aprovadas++;
    if (!apresentacoes_temTituloEixoConfirmados_(item) && apresentacoes_estaAprovada_(item)) {
      diagnostico.pendentesTituloEixo++;
    }
    if (apresentacoes_estaAptaHistorico_(item)) diagnostico.aptasHistorico++;
    if (item.linkArquivoDrive) diagnostico.comLinkDrive++;
    if (!item.dataApresentacao) diagnostico.semDataApresentacao++;
  });

  return diagnostico;
}
