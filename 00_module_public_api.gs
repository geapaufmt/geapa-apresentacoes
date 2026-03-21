/**
 * GEAPA Apresentações - API pública do módulo
 * Este arquivo funciona como mapa/localizador das funções públicas.
 */

/**
 * Retorna apresentações internas normalizadas.
 * @return {Object[]}
 */
function apresentacoes_listarInternas() {
  return apresentacoes_listarApresentacoesInternas_();
}

/**
 * Retorna apresentações que precisam de cobrança de título/eixo.
 * @return {Object[]}
 */
function apresentacoes_listarPendentesTituloEixo() {
  return apresentacoes_listarPendentesTituloEixo_();
}

/**
 * Retorna apresentações aptas para sincronização com o histórico público.
 * @return {Object[]}
 */
function apresentacoes_listarAptasHistorico() {
  return apresentacoes_listarAptasHistorico_();
}

/**
 * Função de diagnóstico rápido.
 * @return {Object}
 */
function apresentacoes_diagnostico() {
  return apresentacoes_gerarDiagnostico_();
}

/**
 * Sincroniza apresentações aptas com o histórico público.
 * @return {Object}
 */
function apresentacoes_sincronizarHistoricoPublico() {
  return apresentacoes_sincronizarHistorico_();
}

/**
 * Executa validação estrutural do módulo.
 * @return {Object}
 */
function apresentacoes_validarModulo() {
  return apresentacoes_validarModulo_();
}

/**
 * Retorna prévia das cobranças de título/eixo elegíveis hoje.
 * @return {Object[]}
 */
function apresentacoes_previewCobrancaTituloEixo() {
  return apresentacoes_previewCobrancaTituloEixo_();
}

/**
 * Envia cobranças de título/eixo.
 * Passe true para dryRun.
 * @param {boolean} dryRun
 * @return {Object}
 */
function apresentacoes_enviarCobrancaTituloEixo(dryRun) {
  return apresentacoes_enviarCobrancaTituloEixo_(dryRun);
}

/**
 * Processa respostas de título/eixo recebidas por e-mail.
 * @return {Object}
 */
function apresentacoes_processarInboxTituloEixo() {
  return apresentacoes_processarInboxTituloEixo_();
}

/**
 * Preview dos envios pós-aprovação.
 * @return {Object}
 */
function apresentacoes_previewPosAprovacao() {
  return apresentacoes_previewPosAprovacao_();
}

/**
 * Processa convites a professores.
 * @param {boolean} dryRun
 * @return {Object}
 */
function apresentacoes_processarConvitesProfessores(dryRun) {
  return apresentacoes_processarConvitesProfessores_(dryRun);
}

/**
 * Processa lembretes aos membros.
 * @param {boolean} dryRun
 * @return {Object}
 */
function apresentacoes_processarLembretesMembros(dryRun) {
  return apresentacoes_processarLembretesMembros_(dryRun);
}

/**
 * Processa cobranças de arquivo.
 * @param {boolean} dryRun
 * @return {Object}
 */
function apresentacoes_processarCobrancasArquivo(dryRun) {
  return apresentacoes_processarCobrancasArquivo_(dryRun);
}

function apresentacoes_processarInboxArquivo() {
  return apresentacoes_processarInboxArquivo_();
}