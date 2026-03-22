/**
 * Testes manuais rápidos.
 */

function test_apresentacoes_diagnostico() {
  var res = apresentacoes_diagnostico();
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_listarPendentesTituloEixo() {
  var res = apresentacoes_listarPendentesTituloEixo();
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_listarAptasHistorico() {
  var res = apresentacoes_listarAptasHistorico();
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_sincronizarHistorico() {
  var res = apresentacoes_sincronizarHistorico_();
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_validarModulo() {
  var res = apresentacoes_validarModulo_();
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_previewCobrancaTituloEixo() {
  var res = apresentacoes_previewCobrancaTituloEixo_();
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_enviarCobrancaTituloEixo_dryRun() {
  var res = apresentacoes_enviarCobrancaTituloEixo_(true);
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_debugCobrancaTituloEixo() {
  var itens = apresentacoes_listarApresentacoesInternas_();

  var debug = itens.map(function(item) {
    return {
      rowNumber: item.rowNumber,
      nome: item.nome,
      email: item.email,
      semestre: item.semestre,
      status: item.status,
      dataApresentacao: item.dataApresentacao,
      diffDias: apresentacoes_diffDiasPara_(item.dataApresentacao),
      dtCobrancaTituloEixo: item.dtCobrancaTituloEixo,
      qtdCobrancasTituloEixo: item.qtdCobrancasTituloEixo,
      temIdentificacaoMinima: apresentacoes_temIdentificacaoMinima_(item),
      temTituloEixoConfirmados: apresentacoes_temTituloEixoConfirmados_(item),
      estaNaJanela: apresentacoes_estaNaJanelaCobrancaTituloEixo_(item),
      jaCobrouHoje: apresentacoes_jaCobrouHojeTituloEixo_(item),
      deveCobrarHoje: apresentacoes_deveEnviarCobrancaTituloEixo_(item)
    };
  });

  Logger.log(JSON.stringify(debug, null, 2));
}

function test_apresentacoes_processarInboxTituloEixo() {
  var res = apresentacoes_processarInboxTituloEixo_();
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_previewPosAprovacao() {
  var res = apresentacoes_previewPosAprovacao_();
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_processarConvitesProfessores_dryRun() {
  var res = apresentacoes_processarConvitesProfessores_(true);
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_processarLembretesMembros_dryRun() {
  var res = apresentacoes_processarLembretesMembros_(true);
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_previewConviteProfessoresPorLinha() {
  var rowNumber = 10; // ajuste para a tua linha
  var itens = apresentacoes_listarApresentacoesInternas_();
  var item = itens.filter(function(x) { return x.rowNumber === rowNumber; })[0];

  if (!item) {
    Logger.log('Linha não encontrada.');
    return;
  }

  var professores = apresentacoes_getProfessoresPorEixos_(item);

  Logger.log(JSON.stringify({
    rowNumber: item.rowNumber,
    nome: item.nome,
    status: item.status,
    titulo: item.titulo,
    eixoPrincipal: item.eixoPrincipal,
    eixoSecundario: item.eixoSecundario,
    conviteProfessoresEnviado: item.conviteProfessoresEnviado,
    elegivel: apresentacoes_deveEnviarConviteProfessores_(item),
    professoresCount: professores.length,
    professores: professores
  }, null, 2));
}

function test_apresentacoes_previewLembreteMembrosPorLinha() {
  var rowNumber = 10; // ajuste para a tua linha
  var itens = apresentacoes_listarApresentacoesInternas_();
  var item = itens.filter(function(x) { return x.rowNumber === rowNumber; })[0];

  if (!item) {
    Logger.log('Linha não encontrada.');
    return;
  }

  var membros = apresentacoes_listarMembrosAtivos_();

  Logger.log(JSON.stringify({
    rowNumber: item.rowNumber,
    nome: item.nome,
    status: item.status,
    titulo: item.titulo,
    eixoPrincipal: item.eixoPrincipal,
    lembreteMembrosEnviado: item.lembreteMembrosEnviado,
    elegivel: apresentacoes_deveEnviarLembreteMembros_(item),
    membrosCount: membros.length,
    primeirosMembros: membros.slice(0, 10)
  }, null, 2));
}

function test_apresentacoes_processarCobrancasArquivo_dryRun() {
  var res = apresentacoes_processarCobrancasArquivo_(true);
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_debugCobrancasArquivo() {
  var itens = apresentacoes_listarApresentacoesInternas_();

  var debug = itens.map(function(item) {
    return {
      rowNumber: item.rowNumber,
      nome: item.nome,
      email: item.email,
      status: item.status,
      dataApresentacao: item.dataApresentacao,
      horario: item.horario,
      dtHrSolicitacaoArquivo: item.dtHrSolicitacaoArquivo,
      dtHrEmailCobrancaArquivo: item.dtHrEmailCobrancaArquivo,
      dtHrRecebimentoArquivo: item.dtHrRecebimentoArquivo,
      linkArquivoDrive: item.linkArquivoDrive,
      qtdCobrancasArquivo: item.qtdCobrancasArquivo,
      primeiraCobranca: apresentacoes_getPrimeiraCobrancaArquivo_(item),
      fimJanela: apresentacoes_getFimJanelaCobrancaArquivo_(item),
      jaRecebido: apresentacoes_arquivoJaRecebido_(item),
      jaCobrouHoje: apresentacoes_jaCobrouArquivoHoje_(item),
      estaNaJanela: apresentacoes_estaNaJanelaCobrancaArquivo_(item),
      deveCobrarHoje: apresentacoes_deveCobrarArquivoHoje_(item)
    };
  });

  Logger.log(JSON.stringify(debug, null, 2));
}

function test_apresentacoes_forcarCobrancaArquivo_real() {
  var rowNumber = 9; // ajuste para a tua linha real
  var itens = apresentacoes_listarApresentacoesInternas_();
  var item = itens.filter(function(x) {
    return x.rowNumber === rowNumber;
  })[0];

  if (!item) {
    throw new Error('Linha não encontrada: ' + rowNumber);
  }

  var res = apresentacoes_enviarCobrancaArquivoItem_(item, false);
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_debugInboxTituloEixo() {
  var threads = apresentacoes_buscarThreadsTituloEixo_();

  var out = threads.map(function(thread) {
    var msgs = thread.getMessages();

    return {
      subject: thread.getFirstMessageSubject(),
      jaProcessada: apresentacoes_threadJaProcessadaTituloEixo_(thread),
      messages: msgs.map(function(msg) {
        var from = apresentacoes_extrairEmailSimples_(msg.getFrom());
        var body = msg.getPlainBody() || '';
        var dados = apresentacoes_extrairDadosTituloEixoDaMensagem_(msg);

        return {
          from: from,
          date: msg.getDate(),
          pareceResposta: apresentacoes_mensagemPareceRespostaTituloEixo_(msg),
          tituloExtraido: dados.titulo,
          eixoExtraido: dados.eixo,
          eixo2Extraido: dados.eixo2,
          bodyPreview: body.substring(0, 500)
        };
      })
    };
  });

  Logger.log(JSON.stringify(out, null, 2));
}

function test_apresentacoes_processarInboxArquivo() {
  var res = apresentacoes_processarInboxArquivo_();
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_debug_registry_keys() {
  Logger.log(JSON.stringify(APRESENTACOES_CFG.REGISTRY_KEYS, null, 2));
  Logger.log('PASTA_RAIZ_APRESENTACOES = ' + APRESENTACOES_CFG.REGISTRY_KEYS.PASTA_RAIZ_APRESENTACOES);
  Logger.log('PASTA_UPLOAD_FOTOS = ' + APRESENTACOES_CFG.REGISTRY_KEYS.PASTA_UPLOAD_FOTOS);
}

function test_apresentacoes_debug_registry_lookup_pasta_raiz() {
  var key = APRESENTACOES_CFG.REGISTRY_KEYS.PASTA_RAIZ_APRESENTACOES;
  var registry = GEAPA_CORE.coreGetRegistry();

  Logger.log('KEY usada: ' + key);
  Logger.log('Existe no registry? ' + (!!registry[key]));
  Logger.log('Keys disponíveis: ' + Object.keys(registry).join(', '));
}

function test_apresentacoes_processarFotosPendentes() {
  var res = apresentacoes_processarFotosPendentes_();
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_processarFotosPendentesPorLinha() {
  var rowNumber = 9; // ajuste conforme necessário
  var res = apresentacoes_processarFotosPendentesPorLinha_(rowNumber);
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_preencherIdentificacaoPendentes() {
  var res = apresentacoes_preencherIdentificacaoPendentes_();
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_preencherIdentificacaoLinha() {
  var rowNumber = 10; // ajuste conforme necessário
  var res = apresentacoes_preencherIdentificacaoLinha_(rowNumber);
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_preencherSemestresPendentes() {
  var res = apresentacoes_preencherSemestresPendentes_();
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_preencherSemestreLinha() {
  var rowNumber = 10; // ajuste
  var res = apresentacoes_preencherSemestreLinha_(rowNumber);
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_autofillPendenciasGerais() {
  var res = apresentacoes_autofillPendenciasGerais_();
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_processarEmailsAgendamentoPendentes() {
  var res = apresentacoes_processarEmailsAgendamentoPendentes_();
  Logger.log(JSON.stringify(res, null, 2));
}

function test_apresentacoes_processarEmailAgendamentoLinha() {
  var rowNumber = 10; // ajuste
  var res = apresentacoes_processarEmailAgendamentoLinha_(rowNumber);
  Logger.log(JSON.stringify(res, null, 2));
}

