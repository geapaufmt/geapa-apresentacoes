/**
 * ============================================================
 * 14_triggers.gs
 * ============================================================
 *
 * Instala e gerencia os triggers do módulo de apresentações.
 */

/* ============================================================
 * WRAPPERS DE TRIGGER
 * ============================================================ */

/**
 * Preenche automaticamente identificação pendente.
 */
function apresentacoes_autofillIdentificacaoPendentes() {
  return apresentacoes_autofillPendenciasGerais_();
}

function trigger_apresentacoes_emailsAgendamento() {
  return apresentacoes_processarEmailsAgendamentoPendentes_();
}

/**
 * Envia cobranças de título/eixo (envio real).
 */
function trigger_apresentacoes_cobrancaTituloEixo() {
  return apresentacoes_enviarCobrancaTituloEixo_(false);
}

/**
 * Processa inbox de título/eixo.
 */
function trigger_apresentacoes_inboxTituloEixo() {
  return apresentacoes_processarInboxTituloEixo_();
}

/**
 * Processa convites a professores.
 */
function trigger_apresentacoes_convitesProfessores() {
  return apresentacoes_processarConvitesProfessores_(false);
}

/**
 * Processa lembretes aos membros.
 */
function trigger_apresentacoes_lembretesMembros() {
  return apresentacoes_processarLembretesMembros_(false);
}

/**
 * Processa cobranças de arquivo.
 */
function trigger_apresentacoes_cobrancasArquivo() {
  return apresentacoes_processarCobrancasArquivo_(false);
}

/**
 * Processa inbox de arquivos.
 */
function trigger_apresentacoes_inboxArquivo() {
  return apresentacoes_processarInboxArquivo_();
}

/**
 * Processa fotos pendentes.
 */
function trigger_apresentacoes_fotosPendentes() {
  return apresentacoes_processarFotosPendentes_();
}

/**
 * Sincronização extra do histórico, se a função existir.
 * Descomente no instalador se quiser ativar.
 */
// function trigger_apresentacoes_syncHistorico() {
//   return apresentacoes_sincronizarHistorico_();
// }

/* ============================================================
 * HELPERS
 * ============================================================ */

/**
 * Lista os nomes dos handlers de trigger do módulo.
 *
 * @return {string[]}
 */
function apresentacoes_getTriggerHandlerNames_() {
  return [
    'trigger_apresentacoes_autofillIdentificacaoPendentes',
    'trigger_apresentacoes_emailsAgendamento',
    'trigger_apresentacoes_cobrancaTituloEixo',
    'trigger_apresentacoes_inboxTituloEixo',
    'trigger_apresentacoes_convitesProfessores',
    'trigger_apresentacoes_lembretesMembros',
    'trigger_apresentacoes_cobrancasArquivo',
    'trigger_apresentacoes_inboxArquivo',
    'trigger_apresentacoes_fotosPendentes'
    // 'trigger_apresentacoes_syncHistorico'
  ];
}

/**
 * Remove somente os triggers do módulo de apresentações.
 *
 * @return {Object}
 */
function apresentacoes_removerTriggers() {
  var handlers = apresentacoes_getTriggerHandlerNames_();
  var triggers = ScriptApp.getProjectTriggers();
  var removidos = [];

  triggers.forEach(function(trigger) {
    var fn = trigger.getHandlerFunction();
    if (handlers.indexOf(fn) !== -1) {
      ScriptApp.deleteTrigger(trigger);
      removidos.push(fn);
    }
  });

  Logger.log(JSON.stringify({
    ok: true,
    removedCount: removidos.length,
    removed: removidos
  }, null, 2));

  return {
    ok: true,
    removedCount: removidos.length,
    removed: removidos
  };
}

/**
 * Lista os triggers atuais do projeto.
 *
 * @return {Object[]}
 */
function apresentacoes_listarTriggers() {
  var triggers = ScriptApp.getProjectTriggers();

  var out = triggers.map(function(t) {
    return {
      handler: t.getHandlerFunction(),
      eventType: String(t.getEventType()),
      triggerSource: String(t.getTriggerSource())
    };
  });

  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

/* ============================================================
 * INSTALAÇÃO
 * ============================================================ */

/**
 * Instala todos os triggers do módulo de apresentações.
 *
 * Estratégia:
 * - autofill: a cada 5 min
 * - inboxes: a cada 5 min
 * - convites/lembretes: a cada 15 min
 * - cobranças diárias/janelas: a cada 1 hora
 * - fotos pendentes: a cada 4 horas
 *
 * @return {Object}
 */
function apresentacoes_instalarTriggers() {
  var criados = [];

  ScriptApp.newTrigger('trigger_apresentacoes_autofillIdentificacaoPendentes')
    .timeBased()
    .everyMinutes(5)
    .create();
  criados.push('trigger_apresentacoes_autofillIdentificacaoPendentes');

  ScriptApp.newTrigger('trigger_apresentacoes_emailsAgendamento')
    .timeBased()
    .everyMinutes(15)
    .create();
  criados.push('trigger_apresentacoes_autofillIdentificacaoPendentes');

  ScriptApp.newTrigger('trigger_apresentacoes_cobrancaTituloEixo')
    .timeBased()
    .everyHours(1)
    .create();
  criados.push('trigger_apresentacoes_cobrancaTituloEixo');

  ScriptApp.newTrigger('trigger_apresentacoes_inboxTituloEixo')
    .timeBased()
    .everyMinutes(5)
    .create();
  criados.push('trigger_apresentacoes_inboxTituloEixo');

  ScriptApp.newTrigger('trigger_apresentacoes_convitesProfessores')
    .timeBased()
    .everyMinutes(15)
    .create();
  criados.push('trigger_apresentacoes_convitesProfessores');

  ScriptApp.newTrigger('trigger_apresentacoes_lembretesMembros')
    .timeBased()
    .everyMinutes(15)
    .create();
  criados.push('trigger_apresentacoes_lembretesMembros');

  ScriptApp.newTrigger('trigger_apresentacoes_cobrancasArquivo')
    .timeBased()
    .everyHours(1)
    .create();
  criados.push('trigger_apresentacoes_cobrancasArquivo');

  ScriptApp.newTrigger('trigger_apresentacoes_inboxArquivo')
    .timeBased()
    .everyMinutes(5)
    .create();
  criados.push('trigger_apresentacoes_inboxArquivo');

  ScriptApp.newTrigger('trigger_apresentacoes_fotosPendentes')
    .timeBased()
    .everyHours(4)
    .create();
  criados.push('trigger_apresentacoes_fotosPendentes');

  // Opcional:
  // ScriptApp.newTrigger('trigger_apresentacoes_syncHistorico')
  //   .timeBased()
  //   .everyHours(6)
  //   .create();
  // criados.push('trigger_apresentacoes_syncHistorico');

  Logger.log(JSON.stringify({
    ok: true,
    createdCount: criados.length,
    created: criados
  }, null, 2));

  return {
    ok: true,
    createdCount: criados.length,
    created: criados
  };
}

/**
 * Remove os triggers do módulo e instala novamente.
 *
 * @return {Object}
 */
function apresentacoes_reinstalarTriggers() {
  var removed = apresentacoes_removerTriggers();
  var installed = apresentacoes_instalarTriggers();

  return {
    ok: true,
    removed: removed,
    installed: installed
  };
}