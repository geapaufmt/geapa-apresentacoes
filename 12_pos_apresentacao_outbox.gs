/**
 * ============================================================
 * 12_pos_apresentacao_outbox.gs
 * ============================================================
 *
 * Cobrança diária do arquivo da apresentação dentro da janela
 * de 72 horas após a apresentação.
 */

/**
 * Retorna o horário base da apresentação como Date.
 * Usa data da apresentação + horário da reunião.
 *
 * @param {Object} item
 * @return {Date|null}
 */
function apresentacoes_getDataHoraApresentacao_(item) {
  if (!item || !item.dataApresentacao) return null;

  var dataAp = item.dataApresentacao instanceof Date
    ? item.dataApresentacao
    : new Date(item.dataApresentacao);

  if (!(dataAp instanceof Date) || isNaN(dataAp.getTime())) return null;

  var hora = 18;
  var minuto = 30;

  if (item.horario) {
    var horarioStr = String(item.horario).trim();
    var match = horarioStr.match(/^(\d{1,2})(?:\s*[hH:]\s*(\d{1,2}))?$/);
    if (match) {
      hora = parseInt(match[1], 10);
      minuto = match[2] !== undefined ? parseInt(match[2], 10) : 0;
    }
  }

  return new Date(
    dataAp.getFullYear(),
    dataAp.getMonth(),
    dataAp.getDate(),
    hora,
    minuto,
    0
  );
}

/**
 * Retorna o primeiro horário de cobrança:
 * no mesmo dia da apresentação, às 22:00.
 *
 * @param {Object} item
 * @return {Date|null}
 */
function apresentacoes_getPrimeiraCobrancaArquivo_(item) {
  if (!item || !item.dataApresentacao) return null;

  var dataAp = item.dataApresentacao instanceof Date
    ? item.dataApresentacao
    : new Date(item.dataApresentacao);

  if (!(dataAp instanceof Date) || isNaN(dataAp.getTime())) return null;

  return new Date(
    dataAp.getFullYear(),
    dataAp.getMonth(),
    dataAp.getDate(),
    APRESENTACOES_CFG.COBRANCA_ARQUIVO.HORA_ENVIO_PADRAO,
    APRESENTACOES_CFG.COBRANCA_ARQUIVO.MINUTO_ENVIO_PADRAO,
    0
  );
}

/**
 * Retorna o fim da janela de cobrança (72h após a apresentação).
 *
 * @param {Object} item
 * @return {Date|null}
 */
function apresentacoes_getFimJanelaCobrancaArquivo_(item) {
  var base = apresentacoes_getDataHoraApresentacao_(item);
  if (!base) return null;

  return new Date(
    base.getTime() + (APRESENTACOES_CFG.COBRANCA_ARQUIVO.PRAZO_HORAS * 60 * 60 * 1000)
  );
}

/**
 * Verifica se o arquivo já foi recebido.
 *
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_arquivoJaRecebido_(item) {
  return !!(
    item.linkArquivoDrive ||
    item.dtHrRecebimentoArquivo ||
    String(item.statusEnvioArquivo || '').trim() === APRESENTACOES_CFG.STATUS_ARQUIVO.RECEBIDO
  );
}

/**
 * Verifica se a cobrança de arquivo já foi enviada hoje.
 *
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_jaCobrouArquivoHoje_(item) {
  if (!item.dtHrEmailCobrancaArquivo && !item.dtHrSolicitacaoArquivo) return false;

  var hoje = apresentacoes_toStartOfDay_(new Date());
  var ultima = apresentacoes_toStartOfDay_(item.dtHrEmailCobrancaArquivo || item.dtHrSolicitacaoArquivo);

  if (!hoje || !ultima) return false;

  return hoje.getTime() === ultima.getTime();
}

/**
 * Verifica se o horário atual já passou do primeiro disparo.
 *
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_jaChegouHorarioPrimeiraCobrancaArquivo_(item) {
  var primeira = apresentacoes_getPrimeiraCobrancaArquivo_(item);
  if (!primeira) return false;

  return new Date().getTime() >= primeira.getTime();
}

/**
 * Verifica se ainda está dentro da janela de cobrança de 72h.
 *
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_estaNaJanelaCobrancaArquivo_(item) {
  var agora = new Date();
  var inicio = apresentacoes_getPrimeiraCobrancaArquivo_(item);
  var fim = apresentacoes_getFimJanelaCobrancaArquivo_(item);

  if (!inicio || !fim) return false;

  return agora.getTime() >= inicio.getTime() && agora.getTime() <= fim.getTime();
}

/**
 * Verifica se deve cobrar o arquivo hoje.
 *
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_deveCobrarArquivoHoje_(item) {
  if (!item.email) return false;
  if (!item.dataApresentacao) return false;
  if (!apresentacoes_estaAprovada_(item)) return false;
  if (apresentacoes_arquivoJaRecebido_(item)) return false;
  if (!apresentacoes_jaChegouHorarioPrimeiraCobrancaArquivo_(item)) return false;
  if (!apresentacoes_estaNaJanelaCobrancaArquivo_(item)) return false;
  if (apresentacoes_jaCobrouArquivoHoje_(item)) return false;

  return true;
}

/**
 * Lista apresentações elegíveis para cobrança de arquivo hoje.
 *
 * @return {Object[]}
 */
function apresentacoes_listarElegiveisCobrancaArquivo_() {
  return apresentacoes_listarApresentacoesInternas_().filter(function(item) {
    return apresentacoes_deveCobrarArquivoHoje_(item);
  });
}

/**
 * Monta assunto do e-mail de cobrança do arquivo.
 *
 * @param {Object} item
 * @return {string}
 */
function apresentacoes_buildAssuntoCobrancaArquivo_(item) {
  var dataTxt = apresentacoes_formatarDataApresentacaoTexto_(item.dataApresentacao);
  return 'GEAPA | Envio do arquivo da apresentação em PDF' + (dataTxt ? ' - ' + dataTxt : '');
}

/**
 * Monta HTML do e-mail de cobrança do arquivo.
 *
 * @param {Object} item
 * @return {string}
 */
function apresentacoes_buildHtmlCobrancaArquivo_(item) {
  var primeiroNome = apresentacoes_toTitleCase_(apresentacoes_getPrimeiroNome_(item.nome));
  var saudacao = primeiroNome ? 'Olá, ' + primeiroNome + ',' : 'Olá,';
  var dataTxt = apresentacoes_formatarDataApresentacaoTexto_(item.dataApresentacao);
  var qtd = Number(item.qtdCobrancasArquivo || 0) + 1;
  var fimJanela = apresentacoes_getFimJanelaCobrancaArquivo_(item);
  var prazoTxt = fimJanela
    ? Utilities.formatDate(fimJanela, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')
    : '72 horas após a apresentação';

  return [
    '<p>', saudacao, '</p>',
    '<p>Parabéns pela apresentação realizada no GEAPA.</p>',
    '<p>Pedimos que envie, em resposta a este e-mail, o <b>arquivo da sua apresentação em formato PDF</b>.</p>',
    '<p>',
      '<b>Data da apresentação:</b> ', (dataTxt || ''), '<br>',
      '<b>Título:</b> ', (item.titulo || '—'), '<br>',
      '<b>Prazo final para envio:</b> ', prazoTxt,
    '</p>',
    '<p><b>Importante:</b> apenas arquivos em <b>PDF</b> serão aceitos pelo sistema.</p>',
    '<p>Se você enviar outro formato, o envio continuará pendente até o recebimento do PDF correto.</p>',
    '<p><i>Registro interno: esta é a cobrança nº ', String(qtd), ' para esta apresentação.</i></p>',
    '<p>Atenciosamente,<br>Diretoria do GEAPA</p>'
  ].join('');
}

/**
 * Processa uma thread de arquivo.
 *
 * @param {GoogleAppsScript.Gmail.GmailThread} thread
 * @return {Object}
 */
function apresentacoes_processarThreadArquivoLegacy_(thread) {
  var messages = thread.getMessages();
  if (!messages.length) {
    return { ok: false, action: 'skip', reason: 'thread_sem_mensagens' };
  }

  for (var i = messages.length - 1; i >= 0; i--) {
    var msg = messages[i];
    var from = apresentacoes_extrairEmailSimples_(msg.getFrom());
    var item = apresentacoes_encontrarLinhaPendenteArquivoPorEmail_(from);

    if (!item) continue;

    var anexos = msg.getAttachments({ includeInlineImages: false, includeAttachments: true }) || [];
    var anexosValidos = anexos.filter(apresentacoes_anexoEhArquivoApresentacao_);

    if (anexosValidos.length > 0) {
      var pastaFinal = apresentacoes_getOuCriarPastaFinalApresentacao_(item);
      var arquivosSalvos = [];

      anexosValidos.forEach(function(att) {
        var file = apresentacoes_salvarAnexoNaPasta_(att, pastaFinal);
        arquivosSalvos.push({
          name: file.getName(),
          id: file.getId(),
          url: file.getUrl()
        });
      });

      var fotos = apresentacoes_listarFotosDaApresentacao_(item);
      var fotosMovidas = [];

      fotos.forEach(function(file) {
        apresentacoes_moverArquivoParaPasta_(file, pastaFinal);
        fotosMovidas.push({
          name: file.getName(),
          id: file.getId(),
          url: file.getUrl()
        });
      });

      apresentacoes_marcarArquivoRecebido_(item.rowNumber, pastaFinal.getUrl());
      apresentacoes_marcarThreadArquivoProcessada_(thread);

      return {
        ok: true,
        action: 'processed',
        rowNumber: item.rowNumber,
        nome: item.nome,
        email: item.email,
        folderName: pastaFinal.getName(),
        folderUrl: pastaFinal.getUrl(),
        arquivosSalvos: arquivosSalvos,
        fotosMovidas: fotosMovidas
      };
    }

    if (apresentacoes_mensagemTemSomenteAnexoInvalido_(msg)) {
      apresentacoes_responderArquivoInvalido_(msg, item);

      return {
        ok: false,
        action: 'skip',
        reason: 'anexo_invalido_sem_pdf',
        rowNumber: item.rowNumber,
        nome: item.nome,
        email: item.email
      };
    }
  }

  return {
    ok: false,
    action: 'skip',
    reason: 'sem_pdf_valido_ou_sem_linha_compativel'
  };
}

/**
 * Marca cobrança de arquivo como enviada.
 *
 * @param {number} rowNumber
 */
function apresentacoes_marcarCobrancaArquivoEnviada_(rowNumber) {
  var sheet = apresentacoes_getSheetProcessamento_();
  var headerMap = apresentacoes_getHeaderMap_(sheet);
  var S = APRESENTACOES_SCHEMA.PROCESSAMENTO;

  var colStatus = headerMap[S.STATUS_ENVIO_ARQUIVO];
  var colSolic = headerMap[S.DT_HR_SOLICITACAO_ARQUIVO];
  var colUltima = headerMap[S.DT_HR_EMAIL_COBRANCA_ARQUIVO];
  var colQtd = headerMap[S.QTD_COBRANCAS_ARQUIVO];

  if (colStatus === undefined) throw new Error('Coluna "Status de envio do arquivo" não encontrada.');
  if (colSolic === undefined) throw new Error('Coluna "Data/hora solicitação do arquivo" não encontrada.');
  if (colUltima === undefined) throw new Error('Coluna "Data/hora e-mail de cobrança" não encontrada.');
  if (colQtd === undefined) throw new Error('Coluna "Qtd cobranças arquivo" não encontrada.');

  var agora = new Date();
  var rangeSolic = sheet.getRange(rowNumber, colSolic + 1);
  var rangeUltima = sheet.getRange(rowNumber, colUltima + 1);
  var rangeQtd = sheet.getRange(rowNumber, colQtd + 1);

  var qtdAtual = Number(rangeQtd.getValue() || 0);

  if (!rangeSolic.getValue()) {
    rangeSolic.setValue(agora);
  }

  sheet.getRange(rowNumber, colStatus + 1).setValue(APRESENTACOES_CFG.STATUS_ARQUIVO.SOLICITADO);
  rangeUltima.setValue(agora);
  rangeQtd.setValue(qtdAtual + 1);
}

/**
 * Envia cobrança de arquivo para um item.
 *
 * @param {Object} item
 * @param {boolean} dryRun
 * @return {Object}
 */
function apresentacoes_enviarCobrancaArquivoItem_(item, dryRun) {
  var subject = apresentacoes_buildAssuntoCobrancaArquivo_(item);
  var htmlBody = apresentacoes_buildHtmlCobrancaArquivo_(item);

  if (!dryRun) {
    GEAPA_CORE.coreSendHtmlEmail({
      to: item.email,
      subject: subject,
      body: 'Seu cliente de e-mail nao suporta HTML.',
      htmlBody: htmlBody
    });

    apresentacoes_marcarCobrancaArquivoEnviada_(item.rowNumber);
  }

  return {
    ok: true,
    action: dryRun ? 'preview' : 'sent',
    rowNumber: item.rowNumber,
    to: item.email,
    subject: subject,
    qtdCobrancasAntes: Number(item.qtdCobrancasArquivo || 0),
    qtdCobrancasDepois: Number(item.qtdCobrancasArquivo || 0) + 1
  };
}

/**
 * Processa cobranças de arquivo.
 *
 * @param {boolean} dryRun
 * @return {Object}
 */
function apresentacoes_processarCobrancasArquivo_(dryRun) {
  var itens = apresentacoes_listarElegiveisCobrancaArquivo_();
  var counters = {
    totalElegiveis: itens.length,
    sent: 0,
    previewed: 0,
    skipped: 0,
    errors: 0
  };
  var details = [];

  itens.forEach(function(item) {
    try {
      var res = apresentacoes_enviarCobrancaArquivoItem_(item, dryRun);
      details.push(res);

      if (res.action === 'sent') counters.sent++;
      else if (res.action === 'preview') counters.previewed++;
      else counters.skipped++;
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
    counters: counters,
    details: details
  };
}
