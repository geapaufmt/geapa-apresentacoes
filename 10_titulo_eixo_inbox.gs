/**
 * ============================================================
 * 10_titulo_eixo_inbox.gs
 * ============================================================
 *
 * Processa respostas de título/eixo enviadas por e-mail.
 *
 * REGRA:
 * - considera a resposta válida mais recente do apresentador;
 * - extrai TÍTULO, EIXO e EIXO 2 opcional;
 * - grava na planilha;
 * - registra data/hora de confirmação;
 * - marca a thread como processada;
 * - depois disso, o 09 para automaticamente de cobrar.
 */

/**
 * Retorna/cria a label usada para marcar threads já processadas.
 * @return {GoogleAppsScript.Gmail.GmailLabel}
 */
function apresentacoes_getLabelTituloEixoProcessado_() {
  return GEAPA_CORE.coreGetOrCreateLabel('GEAPA/TituloEixoProcessado');
}

/**
 * Verifica se a thread já foi processada.
 * @param {GoogleAppsScript.Gmail.GmailThread} thread
 * @return {boolean}
 */
function apresentacoes_threadJaProcessadaTituloEixo_(thread) {
  return GEAPA_CORE.coreThreadHasLabel(thread, 'GEAPA/TituloEixoProcessado');
}

/**
 * Extrai e-mail puro de um campo From.
 * Ex.: "Nome <email@x.com>" -> "email@x.com"
 * @param {string} text
 * @return {string}
 */
function apresentacoes_extrairEmailSimples_(text) {
  return GEAPA_CORE.coreExtractEmailAddress(text);
}

/**
 * Extrai um campo do corpo do e-mail.
 * Ex.: TÍTULO: xxx
 *
 * Se singleLine=true:
 * - pega só o valor da mesma linha
 * - ou, se vazio, só a próxima linha útil
 *
 * @param {string} body
 * @param {string} fieldName
 * @param {boolean=} singleLine
 * @return {string}
 */
function apresentacoes_extrairCampoDoCorpo_(body, fieldName, singleLine) {
  if (!body || !fieldName) return '';

  var linhas = String(body).split(/\r?\n/);
  var alvo = apresentacoes_normalizarComparacaoInbox_(fieldName);
  var valor = [];
  var capturando = false;

  function ehCabecalhoLinha(line) {
    var l = apresentacoes_normalizarComparacaoInbox_(line);
    return (
      l.indexOf('titulo:') === 0 ||
      l.indexOf('titulo :') === 0 ||
      l.indexOf('eixo:') === 0 ||
      l.indexOf('eixo :') === 0 ||
      l.indexOf('eixo 2:') === 0 ||
      l.indexOf('eixo 2 :') === 0 ||
      l.indexOf('eixo2:') === 0 ||
      l.indexOf('eixo2 :') === 0
    );
  }

  for (var i = 0; i < linhas.length; i++) {
    var linhaOriginal = linhas[i];
    var linhaNorm = apresentacoes_normalizarComparacaoInbox_(linhaOriginal);

    if (!capturando) {
      if (
        linhaNorm.indexOf(alvo + ':') === 0 ||
        linhaNorm.indexOf(alvo + ' :') === 0
      ) {
        capturando = true;

        var idx = linhaOriginal.indexOf(':');
        var resto = idx >= 0 ? linhaOriginal.substring(idx + 1).trim() : '';

        if (resto) {
          return resto;
        }

        if (singleLine) {
          for (var j = i + 1; j < linhas.length; j++) {
            var prox = linhas[j].trim();
            if (!prox) continue;
            if (ehCabecalhoLinha(prox)) return '';
            return prox;
          }
          return '';
        }
      }
      continue;
    }

    if (ehCabecalhoLinha(linhaOriginal)) {
      break;
    }

    if (linhaOriginal.trim()) {
      valor.push(linhaOriginal.trim());
      if (singleLine) {
        break;
      }
    }
  }

  return valor.join(' ').trim();
}

/**
 * Normaliza texto simples.
 * @param {*} value
 * @return {string}
 */
function apresentacoes_normalizarTexto_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Procura a linha pendente correspondente ao e-mail do remetente.
 * Usa o registro interno e ignora linhas já confirmadas.
 *
 * @param {string} senderEmail
 * @return {Object|null}
 */
function apresentacoes_encontrarLinhaPendentePorEmail_(senderEmail) {
  var emailNorm = apresentacoes_normalizarTexto_(senderEmail);

  var candidatos = apresentacoes_listarApresentacoesInternas_().filter(function(item) {
    return (
      apresentacoes_normalizarTexto_(item.email) === emailNorm &&
      !apresentacoes_temTituloEixoConfirmados_(item)
    );
  });

  if (!candidatos.length) return null;

  candidatos.sort(function(a, b) {
    var da = apresentacoes_toStartOfDay_(a.dataApresentacao);
    var db = apresentacoes_toStartOfDay_(b.dataApresentacao);

    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;

    return da.getTime() - db.getTime();
  });

  return candidatos[0];
}

/**
 * Verifica se uma mensagem parece conter resposta de título/eixo.
 *
 * @param {GoogleAppsScript.Gmail.GmailMessage} message
 * @return {boolean}
 */
function apresentacoes_mensagemPareceRespostaTituloEixo_(message) {
  var body = message.getPlainBody() || '';
  var bodyNorm = apresentacoes_normalizarTexto_(body);

  var temTitulo = bodyNorm.indexOf('titulo:') !== -1;
  var temEixo =
    bodyNorm.indexOf('eixo:') !== -1 ||
    bodyNorm.indexOf('eixo 1:') !== -1 ||
    bodyNorm.indexOf('eixo1:') !== -1;

  return temTitulo && temEixo;
}

/**
 * Mapa canônico de eixos temáticos.
 */
function apresentacoes_getMapaEixos_() {
  return [
    { romano: 'I', aliases: ['1', 'i', 'solos', 'solos e nutricao de plantas'], canonico: 'I - Solos e nutrição de plantas' },
    { romano: 'II', aliases: ['2', 'ii', 'fitotecnia', 'fitotecnia e manejo de culturas'], canonico: 'II - Fitotecnia e manejo de culturas' },
    { romano: 'III', aliases: ['3', 'iii', 'defesa vegetal', 'fitossanidade', 'defesa vegetal (fitossanidade)'], canonico: 'III - Defesa vegetal (fitossanidade)' },
    { romano: 'IV', aliases: ['4', 'iv', 'maquinas', 'tecnologias', 'agricultura de precisao', 'maquinas tecnologias e agricultura de precisao'], canonico: 'IV - Máquinas, tecnologias e agricultura de precisão' },
    { romano: 'V', aliases: ['5', 'v', 'agroecologia', 'agroecologia e sistemas sustentaveis de producao'], canonico: 'V - Agroecologia e sistemas sustentáveis de produção' },
    { romano: 'VI', aliases: ['6', 'vi'], canonico: 'VI - Melhoramento genético e biotecnologia' },
    { romano: 'VII', aliases: ['7', 'vii'], canonico: 'VII - Economia, extensão, administração e sociologia rural' },
    { romano: 'VIII', aliases: ['8', 'viii', 'temas livres', 'temas livres de relevancia agronomica'], canonico: 'VIII - Temas livres de relevância agronômica' }
  ];
}

/**
 * Limpa e normaliza texto para comparação.
 * @param {*} value
 * @return {string}
 */
function apresentacoes_normalizarComparacaoInbox_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Interpreta o eixo informado pelo usuário e devolve o nome canônico.
 * Aceita romano, número, nome parcial ou nome completo.
 *
 * @param {string} raw
 * @return {string}
 */
function apresentacoes_interpretarEixo_(raw) {
  var txt = apresentacoes_normalizarComparacaoInbox_(raw);
  if (!txt) return '';

  var mapa = apresentacoes_getMapaEixos_();

  for (var i = 0; i < mapa.length; i++) {
    var item = mapa[i];

    if (txt === apresentacoes_normalizarComparacaoInbox_(item.romano)) {
      return item.canonico;
    }

    for (var j = 0; j < item.aliases.length; j++) {
      if (txt === apresentacoes_normalizarComparacaoInbox_(item.aliases[j])) {
        return item.canonico;
      }
    }

    if (txt === apresentacoes_normalizarComparacaoInbox_(item.canonico)) {
      return item.canonico;
    }

    if (apresentacoes_normalizarComparacaoInbox_(item.canonico).indexOf(txt) !== -1) {
      return item.canonico;
    }
  }

  return String(raw || '').trim();
}

/**
 * Extrai dados estruturados do corpo da mensagem.
 * Aceita:
 * - TÍTULO / TITULO
 * - EIXO / EIXO 1 / EIXO1
 * - EIXO 2 / EIXO2
 *
 * @param {GoogleAppsScript.Gmail.GmailMessage} message
 * @return {Object}
 */
function apresentacoes_extrairDadosTituloEixoDaMensagem_(message) {
  var body = message.getPlainBody() || '';

  var titulo =
    apresentacoes_extrairCampoDoCorpo_(body, 'TÍTULO', true) ||
    apresentacoes_extrairCampoDoCorpo_(body, 'TITULO', true);

  var eixoBruto =
    apresentacoes_extrairCampoDoCorpo_(body, 'EIXO', true) ||
    apresentacoes_extrairCampoDoCorpo_(body, 'EIXO 1', true) ||
    apresentacoes_extrairCampoDoCorpo_(body, 'EIXO1', true);

  var eixo2Bruto =
    apresentacoes_extrairCampoDoCorpo_(body, 'EIXO 2', true) ||
    apresentacoes_extrairCampoDoCorpo_(body, 'EIXO2', true);

  return {
    titulo: String(titulo || '').trim(),
    eixo: apresentacoes_interpretarEixo_(eixoBruto),
    eixo2: apresentacoes_interpretarEixo_(eixo2Bruto)
  };
}

/**
 * Verifica se os dados extraídos são suficientes.
 * @param {Object} dados
 * @return {boolean}
 */
function apresentacoes_dadosTituloEixoValidos_(dados) {
  return !!(
    dados &&
    String(dados.titulo || '').trim() &&
    String(dados.eixo || '').trim()
  );
}

/**
 * Retorna a mensagem válida mais recente de uma thread,
 * enviada pelo apresentador esperado.
 *
 * @param {GoogleAppsScript.Gmail.GmailThread} thread
 * @param {string} senderEmail
 * @return {GoogleAppsScript.Gmail.GmailMessage|null}
 */
function apresentacoes_getMensagemValidaMaisRecenteDaThread_(thread, senderEmail) {
  var targetEmail = apresentacoes_normalizarTexto_(senderEmail);
  var messages = thread.getMessages();
  var validas = [];

  messages.forEach(function(msg) {
    var from = apresentacoes_extrairEmailSimples_(msg.getFrom());
    if (apresentacoes_normalizarTexto_(from) !== targetEmail) return;
    if (!apresentacoes_mensagemPareceRespostaTituloEixo_(msg)) return;

    var dados = apresentacoes_extrairDadosTituloEixoDaMensagem_(msg);
    if (!apresentacoes_dadosTituloEixoValidos_(dados)) return;

    validas.push(msg);
  });

  if (!validas.length) return null;

  validas.sort(function(a, b) {
    return b.getDate().getTime() - a.getDate().getTime();
  });

  return validas[0];
}

/**
 * Atualiza a linha da planilha com título/eixo confirmados
 * e marca o status como Confirmada.
 *
 * @param {number} rowNumber
 * @param {Object} dados
 * @param {Date} confirmedAt
 */
function apresentacoes_gravarTituloEixoNaLinha_(rowNumber, dados, confirmedAt) {
  var sheet = apresentacoes_getSheetProcessamento_();
  var headerMap = apresentacoes_getHeaderMap_(sheet);
  var S = APRESENTACOES_SCHEMA.PROCESSAMENTO;

  var colTitulo = headerMap[S.TITULO_APRESENTACAO];
  var colEixo1 = headerMap[S.EIXO_PRINCIPAL];
  var colEixo2 = headerMap[S.EIXO_SECUNDARIO];
  var colConfirm = headerMap[S.DT_HR_CONFIRMACAO_TITULO_EIXO];
  var colStatus = headerMap[S.STATUS_APRESENTACAO];

  if (colTitulo === undefined) throw new Error('Coluna de título não encontrada.');
  if (colEixo1 === undefined) throw new Error('Coluna de eixo principal não encontrada.');
  if (colEixo2 === undefined) throw new Error('Coluna de eixo secundário não encontrada.');
  if (colConfirm === undefined) throw new Error('Coluna de confirmação título/eixo não encontrada.');
  if (colStatus === undefined) throw new Error('Coluna de status da apresentação não encontrada.');

  sheet.getRange(rowNumber, colTitulo + 1).setValue(dados.titulo || '');
  sheet.getRange(rowNumber, colEixo1 + 1).setValue(dados.eixo || '');
  sheet.getRange(rowNumber, colEixo2 + 1).setValue(dados.eixo2 || '');
  sheet.getRange(rowNumber, colConfirm + 1).setValue(confirmedAt || new Date());
  sheet.getRange(rowNumber, colStatus + 1).setValue(
    APRESENTACOES_CFG.STATUS_APRESENTACAO.CONFIRMADA
  );
}

/**
 * Marca uma thread como processada.
 * @param {GoogleAppsScript.Gmail.GmailThread} thread
 */
function apresentacoes_marcarThreadTituloEixoProcessada_(thread) {
  thread.addLabel(apresentacoes_getLabelTituloEixoProcessado_());
}

/**
 * Busca threads recentes candidatas a resposta de título/eixo.
 * @return {GoogleAppsScript.Gmail.GmailThread[]}
 */
function apresentacoes_buscarThreadsTituloEixo_() {
  var query =
    'in:anywhere newer_than:30d subject:"GEAPA | Envio de título e eixo da apresentação"';

  return GEAPA_CORE.coreSearchThreads(query, 0, 50);
}

/**
 * Processa uma thread e retorna resultado.
 * @param {GoogleAppsScript.Gmail.GmailThread} thread
 * @return {Object}
 */
function apresentacoes_processarThreadTituloEixo_(thread) {
  var messages = thread.getMessages();
  if (!messages.length) {
    return { ok: false, action: 'skip', reason: 'thread_sem_mensagens' };
  }

  var remetentes = {};
  messages.forEach(function(msg) {
    var email = apresentacoes_extrairEmailSimples_(msg.getFrom());
    if (email) remetentes[email] = true;
  });

  var candidatos = apresentacoes_listarApresentacoesInternas_().filter(function(item) {
    var email = apresentacoes_normalizarTexto_(item.email);
    return email && remetentes[email] && !apresentacoes_temTituloEixoConfirmados_(item);
  });

  if (!candidatos.length) {
    return { ok: false, action: 'skip', reason: 'sem_linha_pendente_compativel' };
  }

  candidatos.sort(function(a, b) {
    var da = apresentacoes_toStartOfDay_(a.dataApresentacao);
    var db = apresentacoes_toStartOfDay_(b.dataApresentacao);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  });

  for (var i = 0; i < candidatos.length; i++) {
    var item = candidatos[i];
    var msg = apresentacoes_getMensagemValidaMaisRecenteDaThread_(thread, item.email);
    if (!msg) continue;

    var dados = apresentacoes_extrairDadosTituloEixoDaMensagem_(msg);
    if (!apresentacoes_dadosTituloEixoValidos_(dados)) continue;

    apresentacoes_gravarTituloEixoNaLinha_(item.rowNumber, dados, msg.getDate());
    apresentacoes_enviarAvisoSecretariosConfirmacao_(item, dados, msg.getDate());
    apresentacoes_marcarNotificacaoSecretariosEnviada_(item.rowNumber);
    apresentacoes_marcarThreadTituloEixoProcessada_(thread);

    return {
      ok: true,
      action: 'processed',
      rowNumber: item.rowNumber,
      nome: item.nome,
      email: item.email,
      titulo: dados.titulo,
      eixo: dados.eixo,
      eixo2: dados.eixo2 || '',
      confirmedAt: msg.getDate()
    };
  }

  return { ok: false, action: 'skip', reason: 'sem_mensagem_valida' };
}

/**
 * Processa inbox de título/eixo.
 * @return {Object}
 */
function apresentacoes_processarInboxTituloEixo_() {
  var runId = 'APRES-INBOX-TIT-' + new Date().getTime();
  var threads = apresentacoes_buscarThreadsTituloEixo_();

  var counters = {
    totalThreads: threads.length,
    processed: 0,
    skipped: 0,
    errors: 0
  };

  var details = [];

  threads.forEach(function(thread) {
    try {
      if (apresentacoes_threadJaProcessadaTituloEixo_(thread)) {
        details.push({
          ok: false,
          action: 'skip',
          reason: 'thread_ja_processada'
        });
        counters.skipped++;
        return;
      }

      var res = apresentacoes_processarThreadTituloEixo_(thread);
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
 * Retorna contatos atuais da secretaria a partir de MEMBERS_ATUAIS.
 * Depende da coluna de função/cargo atual estar correta e atualizada.
 *
 * @return {Object[]}
 */
function apresentacoes_getSecretaryContacts_() {
  return GEAPA_CORE.coreGetCurrentOccupantsByEmailGroup('SECRETARIA').map(function(item) {
    return {
      nome: String(item.nome || item.memberName || '').trim(),
      email: String(item.email || '').trim(),
      funcaoAtual: String(item.publicName || item.roleName || '').trim()
    };
  }).filter(function(item) {
    return item.email;
  });

  var sheet = GEAPA_CORE.coreGetSheetByKey('MEMBERS_ATUAIS');
  var headerMap = apresentacoes_getHeaderMap_(sheet);
  var rows = apresentacoes_getDataRows_(sheet);

  var colNome =
    headerMap['MEMBRO'] !== undefined ? headerMap['MEMBRO'] :
    headerMap['Nome'] !== undefined ? headerMap['Nome'] :
    headerMap['NOME'] !== undefined ? headerMap['NOME'] :
    null;

  var colEmail =
    headerMap['EMAIL'] !== undefined ? headerMap['EMAIL'] :
    headerMap['E-mail'] !== undefined ? headerMap['E-mail'] :
    headerMap['Email'] !== undefined ? headerMap['Email'] :
    null;

  var colFuncaoAtual =
    headerMap['Cargo/função atual'] !== undefined ? headerMap['Cargo/função atual'] :
    headerMap['Cargo/funcao atual'] !== undefined ? headerMap['Cargo/funcao atual'] :
    headerMap['CARGO/FUNÇÃO ATUAL'] !== undefined ? headerMap['CARGO/FUNÇÃO ATUAL'] :
    headerMap['CARGO/FUNCAO ATUAL'] !== undefined ? headerMap['CARGO/FUNCAO ATUAL'] :
    headerMap['Função atual'] !== undefined ? headerMap['Função atual'] :
    headerMap['Funcao atual'] !== undefined ? headerMap['Funcao atual'] :
    null;

  if (colNome === null) throw new Error('Coluna de nome não encontrada em MEMBERS_ATUAIS.');
  if (colEmail === null) throw new Error('Coluna de e-mail não encontrada em MEMBERS_ATUAIS.');
  if (colFuncaoAtual === null) throw new Error('Coluna de função atual não encontrada em MEMBERS_ATUAIS.');

  var contatos = [];
  var vistos = {};

  rows.forEach(function(row) {
    var nome = String(row[colNome] || '').trim();
    var email = String(row[colEmail] || '').trim();
    var funcao = String(row[colFuncaoAtual] || '').trim();
    var funcaoNorm = apresentacoes_normalizarComparacaoInbox_(funcao);

    var ehSecretaria = funcaoNorm.indexOf('secretari') !== -1;

    if (!ehSecretaria) return;
    if (!email) return;
    if (vistos[email]) return;

    vistos[email] = true;
    contatos.push({
      nome: nome,
      email: email,
      funcaoAtual: funcao
    });
  });

  return contatos;
}

/**
 * Retorna apenas os e-mails da secretaria.
 * @return {string[]}
 */
function apresentacoes_getSecretaryEmails_() {
  return apresentacoes_getSecretaryContacts_().map(function(item) {
    return item.email;
  });
}

/**
 * Monta assunto do aviso aos secretários.
 * @param {Object} item
 * @return {string}
 */
function apresentacoes_buildAssuntoAvisoSecretarios_(item) {
  var dataTxt = apresentacoes_formatarDataApresentacaoTexto_(item.dataApresentacao);
  return 'GEAPA | Apresentação confirmada para revisão' + (dataTxt ? ' - ' + dataTxt : '');
}

/**
 * Monta HTML do aviso aos secretários.
 * @param {Object} item
 * @param {Object} dados
 * @param {Date} confirmedAt
 * @return {string}
 */
function apresentacoes_buildHtmlAvisoSecretarios_(item, dados, confirmedAt) {
  var dataTxt = apresentacoes_formatarDataApresentacaoTexto_(item.dataApresentacao);
  var confirmTxt = confirmedAt
    ? Utilities.formatDate(confirmedAt, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')
    : '';

  return [
    '<p>Olá.</p>',
    '<p>Uma apresentação do GEAPA teve <b>título/eixo confirmados</b> pelo apresentador e agora precisa de revisão da secretaria/diretoria.</p>',
    '<p>',
      '<b>Membro:</b> ', (item.nome || ''), '<br>',
      '<b>E-mail:</b> ', (item.email || ''), '<br>',
      '<b>RGA:</b> ', (item.rga || ''), '<br>',
      '<b>Data da apresentação:</b> ', (dataTxt || ''), '<br>',
      '<b>Horário:</b> ', (item.horario || ''), '<br>',
      '<b>Local:</b> ', (item.local || ''), '<br>',
      '<b>Título:</b> ', (dados.titulo || ''), '<br>',
      '<b>Eixo principal:</b> ', (dados.eixo || ''), '<br>',
      '<b>Eixo secundário:</b> ', (dados.eixo2 || '—'), '<br>',
      '<b>Confirmado em:</b> ', (confirmTxt || ''),
    '</p>',
    '<p>Por favor, revisem as informações e alterem o status da apresentação para <b>Aprovada</b> quando estiver tudo certo.</p>',
    '<p>Atenciosamente,<br>GEAPA</p>'
  ].join('');
}

/**
 * Marca na planilha que a notificação aos secretários foi enviada.
 * @param {number} rowNumber
 */
function apresentacoes_marcarNotificacaoSecretariosEnviada_(rowNumber) {
  var sheet = apresentacoes_getSheetProcessamento_();
  var headerMap = apresentacoes_getHeaderMap_(sheet);
  var S = APRESENTACOES_SCHEMA.PROCESSAMENTO;

  var colFlag = headerMap[S.NOTIFICACAO_SECRETARIOS_ENVIADA];
  var colData = headerMap[S.DT_HR_NOTIFICACAO_SECRETARIOS];

  if (colFlag === undefined) {
    throw new Error('Coluna "Notificação aos secretários enviada?" não encontrada.');
  }
  if (colData === undefined) {
    throw new Error('Coluna "Data/hora notificação aos secretários" não encontrada.');
  }

  sheet.getRange(rowNumber, colFlag + 1).setValue('SIM');
  sheet.getRange(rowNumber, colData + 1).setValue(new Date());
}

/**
 * Envia aviso aos secretários sobre apresentação confirmada.
 * @param {Object} item
 * @param {Object} dados
 * @param {Date} confirmedAt
 */
function apresentacoes_enviarAvisoSecretariosConfirmacao_(item, dados, confirmedAt) {
  var emails = apresentacoes_getSecretaryEmails_();

  if (!emails.length) {
    throw new Error('Nenhum e-mail de secretário foi encontrado em MEMBERS_ATUAIS.');
  }

  GEAPA_CORE.coreSendHtmlEmail({
    to: emails.join(','),
    subject: apresentacoes_buildAssuntoAvisoSecretarios_(item),
    htmlBody: apresentacoes_buildHtmlAvisoSecretarios_(item, dados, confirmedAt)
  });
}
