/**
 * ============================================================
 * 13_arquivo_drive_inbox.gs
 * ============================================================
 *
 * Processa resposta com arquivo da apresentação
 * e move também as fotos da reunião com base na data.
 */

/**
 * Retorna/cria a label usada para marcar threads já processadas
 * do fluxo de arquivo.
 *
 * @return {GoogleAppsScript.Gmail.GmailLabel}
 */
function apresentacoes_getLabelArquivoProcessado_() {
  var name = 'GEAPA/ArquivoApresentacaoProcessado';
  var label = GmailApp.getUserLabelByName(name);
  if (!label) {
    label = GmailApp.createLabel(name);
  }
  return label;
}

/**
 * Verifica se a thread já foi processada para arquivo.
 *
 * @param {GoogleAppsScript.Gmail.GmailThread} thread
 * @return {boolean}
 */
function apresentacoes_threadJaProcessadaArquivo_(thread) {
  var target = 'GEAPA/ArquivoApresentacaoProcessado';
  var labels = thread.getLabels();

  for (var i = 0; i < labels.length; i++) {
    if (labels[i].getName() === target) {
      return true;
    }
  }
  return false;
}

/**
 * Marca thread como processada para arquivo.
 *
 * @param {GoogleAppsScript.Gmail.GmailThread} thread
 */
function apresentacoes_marcarThreadArquivoProcessada_(thread) {
  var label = apresentacoes_getLabelArquivoProcessado_();
  thread.addLabel(label);
}

/**
 * Converte data para prefixo YYYY-MM-DD.
 *
 * @param {*} value
 * @return {string}
 */
function apresentacoes_formatarDataPrefixoArquivo_(value) {
  var d = value instanceof Date ? value : new Date(value);
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';

  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/**
 * Retorna referência da pasta de upload de fotos.
 * Espera uma key na Registry apontando para a pasta.
 *
 * @return {GoogleAppsScript.Drive.Folder}
 */
function apresentacoes_getPastaUploadFotos_() {
  var registry = GEAPA_CORE.coreGetRegistry();
  var key = APRESENTACOES_CFG.REGISTRY_KEYS.PASTA_UPLOAD_FOTOS;
  var ref = registry[key];

  if (!ref) {
    throw new Error('Registry não possui a key de pasta de upload de fotos: ' + key);
  }

  var folderId =
    ref.FOLDER_ID ||
    ref.folderId ||
    ref.ID ||
    ref.id ||
    ref.SPREADSHEET_ID;

  if (!folderId) {
    throw new Error('Não foi possível determinar o ID da pasta de upload de fotos.');
  }

  return DriveApp.getFolderById(folderId);
}

/**
 * Retorna a pasta pai onde serão criadas as pastas finais das apresentações.
 * Por padrão, usa a pasta pai da pasta de upload de fotos.
 *
 * @return {GoogleAppsScript.Drive.Folder}
 */
function apresentacoes_getPastaPaiApresentacoes_() {
  var pastaUpload = apresentacoes_getPastaUploadFotos_();
  var parents = pastaUpload.getParents();

  if (!parents.hasNext()) {
    throw new Error('A pasta de upload de fotos não possui pasta pai acessível.');
  }

  return parents.next();
}

/**
 * Procura todas as fotos da data da apresentação.
 * Critério:
 * - nome começa com YYYY-MM-DD
 *
 * @param {Object} item
 * @return {GoogleAppsScript.Drive.File[]}
 */
function apresentacoes_listarFotosDaApresentacao_(item) {
  var pastaUpload = apresentacoes_getPastaUploadFotos_();
  var prefixo = apresentacoes_formatarDataPrefixoArquivo_(item.dataApresentacao);
  var files = pastaUpload.getFiles();
  var fotos = [];

  while (files.hasNext()) {
    var file = files.next();
    var nome = file.getName() || '';
    var mime = file.getMimeType() || '';

    var ehImagem =
      mime.indexOf('image/') === 0 ||
      /\.(jpg|jpeg|png|webp)$/i.test(nome);

    if (!ehImagem) continue;
    if (nome.indexOf(prefixo) !== 0) continue;

    fotos.push(file);
  }

  return fotos;
}

/**
 * Move arquivo para pasta destino.
 *
 * @param {GoogleAppsScript.Drive.File} file
 * @param {GoogleAppsScript.Drive.Folder} folder
 */
function apresentacoes_moverArquivoParaPasta_(file, folder) {
  folder.addFile(file);

  var parents = file.getParents();
  while (parents.hasNext()) {
    var parent = parents.next();
    try {
      parent.removeFile(file);
    } catch (e) {
      // ignora pasta sem permissão/remoção
    }
  }
}

/**
 * Verifica se um anexo é um arquivo PDF válido da apresentação.
 *
 * @param {GoogleAppsScript.Gmail.GmailAttachment} att
 * @return {boolean}
 */
function apresentacoes_anexoEhArquivoApresentacao_(att) {
  if (!att) return false;

  var nome = String(att.getName() || '');
  var mime = String(att.getContentType() || '');

  // ignora convite de agenda
  if (/\.ics$/i.test(nome)) return false;

  // ignora imagens
  if (mime.indexOf('image/') === 0) return false;

  // aceita somente PDF
  return (
    /\.pdf$/i.test(nome) ||
    mime === 'application/pdf' ||
    mime.indexOf('pdf') !== -1
  );
}

/**
 * Busca threads candidatas de envio de arquivo.
 *
 * @return {GoogleAppsScript.Gmail.GmailThread[]}
 */
function apresentacoes_buscarThreadsArquivo_() {
  var query =
    'newer_than:30d -in:trash -in:spam subject:"GEAPA | Envio do arquivo da apresentação em PDF"';

  return GmailApp.search(query, 0, 50);
}

/**
 * Retorna a linha pendente de arquivo para um e-mail.
 *
 * @param {string} senderEmail
 * @return {Object|null}
 */
function apresentacoes_encontrarLinhaPendenteArquivoPorEmail_(senderEmail) {
  var emailNorm = apresentacoes_normalizarTexto_(senderEmail);
  var agora = new Date();

  var candidatos = apresentacoes_listarApresentacoesInternas_().filter(function(item) {
    if (apresentacoes_normalizarTexto_(item.email) !== emailNorm) return false;
    if (apresentacoes_arquivoJaRecebido_(item)) return false;
    if (!item.dtHrSolicitacaoArquivo) return false;

    var dtSolic = new Date(item.dtHrSolicitacaoArquivo);
    if (isNaN(dtSolic.getTime())) return false;

    return dtSolic.getTime() <= agora.getTime();
  });

  if (!candidatos.length) return null;

  candidatos.sort(function(a, b) {
    var da = new Date(a.dtHrSolicitacaoArquivo);
    var db = new Date(b.dtHrSolicitacaoArquivo);

    return db.getTime() - da.getTime();
  });

  return candidatos[0];
}

/**
 * Faz upload de um anexo para a pasta destino.
 *
 * @param {GoogleAppsScript.Gmail.GmailAttachment} att
 * @param {GoogleAppsScript.Drive.Folder} folder
 * @return {GoogleAppsScript.Drive.File}
 */
function apresentacoes_salvarAnexoNaPasta_(att, folder) {
  var blob = att.copyBlob();
  blob.setName(att.getName());
  return folder.createFile(blob);
}

/**
 * Marca recebimento do arquivo na planilha.
 *
 * @param {number} rowNumber
 * @param {string} folderUrl
 */
function apresentacoes_marcarArquivoRecebido_(rowNumber, folderUrl) {
  var sheet = apresentacoes_getSheetProcessamento_();
  var headerMap = apresentacoes_getHeaderMap_(sheet);
  var S = APRESENTACOES_SCHEMA.PROCESSAMENTO;

  var colStatus = headerMap[S.STATUS_ENVIO_ARQUIVO];
  var colLink = headerMap[S.LINK_ARQUIVO_DRIVE];
  var colData = headerMap[S.DT_HR_RECEBIMENTO_ARQUIVO];

  if (colStatus === undefined) throw new Error('Coluna de status de envio do arquivo não encontrada.');
  if (colLink === undefined) throw new Error('Coluna de link do arquivo no Drive não encontrada.');
  if (colData === undefined) throw new Error('Coluna de data/hora recebimento do arquivo não encontrada.');

  sheet.getRange(rowNumber, colStatus + 1).setValue(APRESENTACOES_CFG.STATUS_ARQUIVO.RECEBIDO);
  sheet.getRange(rowNumber, colLink + 1).setValue(folderUrl || '');
  sheet.getRange(rowNumber, colData + 1).setValue(new Date());
}

/**
 * Processa uma thread de arquivo.
 *
 * Regras importantes:
 * - só considera mensagens do apresentador correto
 * - só considera mensagens posteriores à solicitação atual do arquivo
 * - só aceita PDF
 * - se houver anexo, mas não PDF, responde avisando
 *
 * @param {GoogleAppsScript.Gmail.GmailThread} thread
 * @return {Object}
 */
function apresentacoes_processarThreadArquivo_(thread) {
  var messages = thread.getMessages();
  if (!messages.length) {
    return { ok: false, action: 'skip', reason: 'thread_sem_mensagens' };
  }

  for (var i = messages.length - 1; i >= 0; i--) {
    var msg = messages[i];
    var from = apresentacoes_extrairEmailSimples_(msg.getFrom());
    var item = apresentacoes_encontrarLinhaPendenteArquivoPorEmail_(from);

    if (!item) continue;

    // Blindagem importante:
    // ignora mensagens anteriores à solicitação atual do arquivo
    var dtSolic = item.dtHrSolicitacaoArquivo ? new Date(item.dtHrSolicitacaoArquivo) : null;
    if (dtSolic && !isNaN(dtSolic.getTime()) && msg.getDate().getTime() < dtSolic.getTime()) {
      continue;
    }

    var anexos = msg.getAttachments({ includeInlineImages: false, includeAttachments: true }) || [];
    var anexosValidos = anexos.filter(apresentacoes_anexoEhArquivoApresentacao_);

    // Caso válido: há PDF
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

      // Se a sync do histórico existir no teu projeto, mantém:
      if (typeof apresentacoes_sincronizarHistorico_ === 'function') {
        apresentacoes_sincronizarHistorico_();
      }

      apresentacoes_responderArquivoRecebidoComSucesso_(msg, item);
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

    // Caso inválido: há anexo, mas não há PDF
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
 * Processa inbox de arquivos da apresentação.
 *
 * @return {Object}
 */
function apresentacoes_processarInboxArquivo_() {
  var runId = 'APRES-INBOX-ARQ-' + new Date().getTime();
  var threads = apresentacoes_buscarThreadsArquivo_();

  var counters = {
    totalThreads: threads.length,
    processed: 0,
    skipped: 0,
    errors: 0
  };

  var details = [];

  threads.forEach(function(thread) {
    try {
      if (apresentacoes_threadJaProcessadaArquivo_(thread)) {
        counters.skipped++;
        details.push({
          ok: false,
          action: 'skip',
          reason: 'thread_ja_processada'
        });
        return;
      }

      var res = apresentacoes_processarThreadArquivo_(thread);
      details.push(res);

      if (res.action === 'processed') counters.processed++;
      else counters.skipped++;
    } catch (err) {
      counters.errors++;
      details.push({
        ok: false,
        action: 'error',
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
 * Retorna a pasta raiz das apresentações.
 * A key deve apontar para a pasta "Histórico de apresentações".
 *
 * @return {GoogleAppsScript.Drive.Folder}
 */
function apresentacoes_getPastaRaizApresentacoes_() {
  var registry = GEAPA_CORE.coreGetRegistry();
  var key = APRESENTACOES_CFG.REGISTRY_KEYS.PASTA_RAIZ_APRESENTACOES;
  var ref = registry[key];

  if (!ref) {
    throw new Error('Registry não possui a key da pasta raiz das apresentações: ' + key);
  }

  var folderId =
    ref.FOLDER_ID ||
    ref.folderId ||
    ref.ID ||
    ref.id ||
    ref.SPREADSHEET_ID;

  if (!folderId) {
    throw new Error('Não foi possível determinar o ID da pasta raiz das apresentações.');
  }

  return DriveApp.getFolderById(folderId);
}

/**
 * Valida e normaliza o semestre para nome de pasta.
 * Mantém no formato completo: 2026/1, 2026/2
 *
 * @param {string} semestre
 * @return {string}
 */
function apresentacoes_normalizarSemestrePasta_(semestre) {
  var txt = String(semestre || '').trim();

  if (!txt) {
    throw new Error('Semestre da apresentação está vazio.');
  }

  if (/^\d{4}\/[12]$/.test(txt)) {
    return txt;
  }

  throw new Error('Semestre em formato inesperado: ' + txt);
}

/**
 * Retorna ou cria a pasta do semestre.
 * Ex.: "Apresentações GEAPA 2026/1"
 *
 * @param {Object} item
 * @return {GoogleAppsScript.Drive.Folder}
 */
function apresentacoes_getOuCriarPastaSemestre_(item) {
  var raiz = apresentacoes_getPastaRaizApresentacoes_();
  var semestre = apresentacoes_normalizarSemestrePasta_(item.semestre);
  var nomePasta = 'Apresentações GEAPA ' + semestre;

  var it = raiz.getFoldersByName(nomePasta);
  if (it.hasNext()) {
    return it.next();
  }

  return raiz.createFolder(nomePasta);
}

/**
 * Retorna ou cria a pasta final da apresentação dentro da pasta do semestre.
 * Ex.: "2026-03-23 - Luis Marciano Toniazzo Putton"
 *
 * @param {Object} item
 * @return {GoogleAppsScript.Drive.Folder}
 */
function apresentacoes_getOuCriarPastaFinalApresentacao_(item) {
  var prefixoData = apresentacoes_formatarDataPrefixoArquivo_(item.dataApresentacao);
  var nomeBase = prefixoData + ' - ' + (item.nome || 'Apresentacao');

  var pastaSemestre = apresentacoes_getOuCriarPastaSemestre_(item);
  var it = pastaSemestre.getFoldersByName(nomeBase);

  if (it.hasNext()) {
    return it.next();
  }

  return pastaSemestre.createFolder(nomeBase);
}

/**
 * Verifica se a mensagem possui anexos.
 *
 * @param {GoogleAppsScript.Gmail.GmailMessage} msg
 * @return {boolean}
 */
function apresentacoes_mensagemTemAnexos_(msg) {
  var anexos = msg.getAttachments({ includeInlineImages: false, includeAttachments: true }) || [];
  return anexos.length > 0;
}

/**
 * Verifica se a mensagem tem algum anexo inválido para apresentação,
 * isto é: possui anexos, mas nenhum PDF válido.
 *
 * @param {GoogleAppsScript.Gmail.GmailMessage} msg
 * @return {boolean}
 */
function apresentacoes_mensagemTemSomenteAnexoInvalido_(msg) {
  var anexos = msg.getAttachments({ includeInlineImages: false, includeAttachments: true }) || [];
  if (!anexos.length) return false;

  var validos = anexos.filter(apresentacoes_anexoEhArquivoApresentacao_);
  return validos.length === 0;
}

/**
 * Monta HTML da resposta automática quando o arquivo enviado não é PDF.
 *
 * @param {Object} item
 * @return {string}
 */
function apresentacoes_buildHtmlRespostaArquivoInvalido_(item) {
  var primeiroNome = apresentacoes_toTitleCase_(apresentacoes_getPrimeiroNome_(item.nome));
  var saudacao = primeiroNome ? 'Olá, ' + primeiroNome + ',' : 'Olá,';

  return [
    '<p>', saudacao, '</p>',
    '<p>Recebemos sua resposta, mas o arquivo enviado <b>não está em formato PDF</b>.</p>',
    '<p>Por favor, responda novamente este e-mail anexando a apresentação em <b>PDF</b>.</p>',
    '<p>Enquanto o arquivo em PDF não for recebido, o sistema continuará considerando a entrega como pendente.</p>',
    '<p>Atenciosamente,<br>Diretoria do GEAPA</p>'
  ].join('');
}

/**
 * Envia resposta automática informando que o arquivo recebido não é PDF.
 *
 * @param {GoogleAppsScript.Gmail.GmailMessage} msg
 * @param {Object} item
 */
function apresentacoes_responderArquivoInvalido_(msg, item) {
  var subject = 'Re: ' + String(msg.getSubject() || 'GEAPA | Envio do arquivo da apresentação em PDF');
  var htmlBody = apresentacoes_buildHtmlRespostaArquivoInvalido_(item);

  GmailApp.sendEmail(
    item.email,
    subject,
    'Seu cliente de e-mail não suporta HTML.',
    {
      htmlBody: htmlBody
    }
  );
}

/**
 * Monta HTML da resposta automática de sucesso no recebimento do arquivo.
 *
 * @param {Object} item
 * @return {string}
 */
function apresentacoes_buildHtmlRespostaArquivoRecebido_(item) {
  var primeiroNome = apresentacoes_toTitleCase_(apresentacoes_getPrimeiroNome_(item.nome));
  var saudacao = primeiroNome ? 'Olá, ' + primeiroNome + ',' : 'Olá,';
  var dataTxt = apresentacoes_formatarDataApresentacaoTexto_(item.dataApresentacao);

  return [
    '<p>', saudacao, '</p>',
    '<p>Recebemos com sucesso o arquivo em <b>PDF</b> da sua apresentação.</p>',
    '<p>',
      '<b>Data da apresentação:</b> ', (dataTxt || ''), '<br>',
      '<b>Título:</b> ', (item.titulo || '—'),
    '</p>',
    '<p>Sua apresentação já foi registrada corretamente no sistema e já consta no <b>histórico de apresentações</b>.</p>',
    '<p>Obrigado pela colaboração.</p>',
    '<p>Atenciosamente,<br>Diretoria do GEAPA</p>'
  ].join('');
}

/**
 * Envia resposta automática de sucesso quando o arquivo é recebido corretamente.
 *
 * @param {GoogleAppsScript.Gmail.GmailMessage} msg
 * @param {Object} item
 */
function apresentacoes_responderArquivoRecebidoComSucesso_(msg, item) {
  var subject = 'Re: ' + String(msg.getSubject() || 'GEAPA | Envio do arquivo da apresentação em PDF');
  var htmlBody = apresentacoes_buildHtmlRespostaArquivoRecebido_(item);

  GmailApp.sendEmail(
    item.email,
    subject,
    'Seu cliente de e-mail não suporta HTML.',
    {
      htmlBody: htmlBody
    }
  );
}