/**
 * ============================================================
 * 11_convites_lembretes.gs
 * ============================================================
 *
 * Envio pós-aprovação:
 * - convite a professores conforme eixo(s)
 * - lembrete aos membros ativos
 *
 * REGRA:
 * - só age quando Status da apresentação = Aprovada
 * - título/eixos já precisam estar confirmados
 * - evita reenvio se já estiver marcado na planilha
 */

/**
 * Verifica se a apresentação está aprovada.
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_estaAprovada_(item) {
  return String(item.status || '').trim() === APRESENTACOES_CFG.STATUS_APRESENTACAO.APROVADA;
}

/**
 * Verifica se já houve confirmação válida de título/eixo.
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
 * Verifica se deve enviar convite aos professores.
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_deveEnviarConviteProfessores_(item) {
  return (
    apresentacoes_estaAprovada_(item) &&
    apresentacoes_temTituloEixoConfirmados_(item) &&
    String(item.conviteProfessoresEnviado || '').trim() !== APRESENTACOES_CFG.VALORES_SIM_NAO.SIM
  );
}

/**
 * Verifica se deve enviar lembrete aos membros.
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_deveEnviarLembreteMembros_(item) {
  return (
    apresentacoes_estaAprovada_(item) &&
    apresentacoes_temTituloEixoConfirmados_(item) &&
    String(item.lembreteMembrosEnviado || '').trim() !== APRESENTACOES_CFG.VALORES_SIM_NAO.SIM
  );
}

/**
 * Lista apresentações elegíveis para convite a professores.
 * @return {Object[]}
 */
function apresentacoes_listarElegiveisConviteProfessores_() {
  return apresentacoes_listarApresentacoesInternas_().filter(function(item) {
    return apresentacoes_deveEnviarConviteProfessores_(item);
  });
}

/**
 * Lista apresentações elegíveis para lembrete aos membros.
 * @return {Object[]}
 */
function apresentacoes_listarElegiveisLembreteMembros_() {
  return apresentacoes_listarApresentacoesInternas_().filter(function(item) {
    return apresentacoes_deveEnviarLembreteMembros_(item);
  });
}

/**
 * Formata data da apresentação para texto amigável.
 * @param {*} value
 * @return {string}
 */
function apresentacoes_formatarDataApresentacaoTexto_(value) {
  if (!value) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'dd/MM/yyyy'
    );
  }

  return String(value).trim();
}

/**
 * Normaliza string para comparação.
 * @param {*} value
 * @return {string}
 */
function apresentacoes_normalizarComparacao_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Lê contatos de professores a partir de PROFS_BASE.
 * Tenta casar eixo principal e eixo secundário com colunas da base.
 *
 * @return {Object[]}
 */
/**
 * Lê contatos de professores a partir de PROFS_BASE.
 * Usa os cabeçalhos reais da planilha:
 * - Nome
 * - E-mail
 * - Eixo temático 1
 * - Eixo temático 2
 *
 * @return {Object[]}
 */
function apresentacoes_listarProfessoresBase_() {
  var sheet = GEAPA_CORE.coreGetSheetByKey('PROFS_BASE');
  var headerMap = apresentacoes_getHeaderMap_(sheet);
  var rows = apresentacoes_getDataRows_(sheet);

  var colNome =
    headerMap['Nome'] !== undefined ? headerMap['Nome'] :
    headerMap['NOME'] !== undefined ? headerMap['NOME'] :
    null;

  var colEmail =
    headerMap['E-mail'] !== undefined ? headerMap['E-mail'] :
    headerMap['Email'] !== undefined ? headerMap['Email'] :
    headerMap['EMAIL'] !== undefined ? headerMap['EMAIL'] :
    null;

  var colEixo1 =
    headerMap['Eixo temático 1'] !== undefined ? headerMap['Eixo temático 1'] :
    headerMap['Eixo tematico 1'] !== undefined ? headerMap['Eixo tematico 1'] :
    headerMap['EIXO TEMÁTICO 1'] !== undefined ? headerMap['EIXO TEMÁTICO 1'] :
    headerMap['EIXO TEMATICO 1'] !== undefined ? headerMap['EIXO TEMATICO 1'] :
    null;

  var colEixo2 =
    headerMap['Eixo temático 2'] !== undefined ? headerMap['Eixo temático 2'] :
    headerMap['Eixo tematico 2'] !== undefined ? headerMap['Eixo tematico 2'] :
    headerMap['EIXO TEMÁTICO 2'] !== undefined ? headerMap['EIXO TEMÁTICO 2'] :
    headerMap['EIXO TEMATICO 2'] !== undefined ? headerMap['EIXO TEMATICO 2'] :
    null;

  if (colNome === null) throw new Error('Coluna "Nome" não encontrada em PROFS_BASE.');
  if (colEmail === null) throw new Error('Coluna "E-mail" não encontrada em PROFS_BASE.');
  if (colEixo1 === null) throw new Error('Coluna "Eixo temático 1" não encontrada em PROFS_BASE.');
  if (colEixo2 === null) throw new Error('Coluna "Eixo temático 2" não encontrada em PROFS_BASE.');

  return rows.map(function(row) {
    return {
      nome: String(row[colNome] || '').trim(),
      email: String(row[colEmail] || '').trim(),
      eixo1: String(row[colEixo1] || '').trim(),
      eixo2: String(row[colEixo2] || '').trim()
    };
  }).filter(function(item) {
    return item.email;
  });
}

/**
 * Retorna professores compatíveis com os eixos da apresentação.
 * @param {Object} item
 * @return {Object[]}
 */
/**
 * Extrai a parte descritiva do eixo, removendo romano inicial.
 * Ex.: "III – Defesa vegetal (fitossanidade)" -> "Defesa vegetal (fitossanidade)"
 *
 * @param {string} eixo
 * @return {string}
 */
function apresentacoes_extrairDescricaoEixo_(eixo) {
  var txt = String(eixo || '').trim();
  if (!txt) return '';

  return txt.replace(/^[IVXLC]+\s*[–—-]\s*/i, '').trim();
}

/**
 * Retorna professores compatíveis com os eixos da apresentação.
 * Faz comparação tanto pelo eixo completo quanto pela descrição sem romano.
 *
 * @param {Object} item
 * @return {Object[]}
 */
function apresentacoes_getProfessoresPorEixos_(item) {
  var professores = apresentacoes_listarProfessoresBase_();
  var vistos = {};

  var eixosAlvo = [
    item.eixoPrincipal || '',
    item.eixoSecundario || ''
  ].filter(Boolean);

  var chavesAlvo = [];

  eixosAlvo.forEach(function(eixo) {
    var completo = apresentacoes_normalizarComparacao_(eixo);
    var descricao = apresentacoes_normalizarComparacao_(apresentacoes_extrairDescricaoEixo_(eixo));

    if (completo) chavesAlvo.push(completo);
    if (descricao && chavesAlvo.indexOf(descricao) === -1) chavesAlvo.push(descricao);
  });

  return professores.filter(function(prof) {
    var candidatos = [
      apresentacoes_normalizarComparacao_(prof.eixo1),
      apresentacoes_normalizarComparacao_(prof.eixo2)
    ].filter(Boolean);

    var match = candidatos.some(function(e) {
      return chavesAlvo.indexOf(e) !== -1;
    });

    if (!match) return false;
    if (vistos[prof.email]) return false;

    vistos[prof.email] = true;
    return true;
  });
}

/**
 * Lista membros ativos a partir de MEMBERS_ATUAIS.
 * Usa os cabeçalhos reais da planilha:
 * - MEMBRO
 * - EMAIL
 * - Status
 *
 * @return {Object[]}
 */
function apresentacoes_listarMembrosAtivos_() {
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

  var colStatus =
    headerMap['Status'] !== undefined ? headerMap['Status'] :
    headerMap['STATUS'] !== undefined ? headerMap['STATUS'] :
    null;

  if (colNome === null) {
    throw new Error(
      'Coluna de nome não encontrada em MEMBERS_ATUAIS. Cabeçalhos disponíveis: ' +
      Object.keys(headerMap).join(', ')
    );
  }

  if (colEmail === null) {
    throw new Error(
      'Coluna de e-mail não encontrada em MEMBERS_ATUAIS. Cabeçalhos disponíveis: ' +
      Object.keys(headerMap).join(', ')
    );
  }

  if (colStatus === null) {
    throw new Error(
      'Coluna de status não encontrada em MEMBERS_ATUAIS. Cabeçalhos disponíveis: ' +
      Object.keys(headerMap).join(', ')
    );
  }

  return rows.map(function(row) {
    return {
      nome: String(row[colNome] || '').trim(),
      email: String(row[colEmail] || '').trim(),
      status: String(row[colStatus] || '').trim()
    };
  }).filter(function(item) {
    return item.email && apresentacoes_normalizarComparacao_(item.status) === 'ativo';
  });
}

/**
 * Assunto do convite aos professores.
 * @param {Object} item
 * @return {string}
 */
function apresentacoes_buildAssuntoConviteProfessores_(item) {
  var dataTxt = apresentacoes_formatarDataApresentacaoTexto_(item.dataApresentacao);
  return 'GEAPA | Convite para apresentação' + (dataTxt ? ' - ' + dataTxt : '');
}

/**
 * HTML do convite aos professores, personalizado por nome.
 * @param {Object} item
 * @param {Object} prof
 * @return {string}
 */
function apresentacoes_buildHtmlConviteProfessores_(item, prof) {
  var dataFormatada = apresentacoes_formatarDataApresentacaoTexto_(item.dataApresentacao);
  var nomeMembro = item.nome || 'acadêmico(a) do GEAPA';
  var titulo = item.titulo || '';
  var eixos = [item.eixoPrincipal, item.eixoSecundario].filter(Boolean);
  var textoEixos = eixos.length ? eixos.join(' | ') : 'Não informado';
  var primeiroNomeProf = apresentacoes_getPrimeiroNome_(prof && prof.nome ? prof.nome : '');
  primeiroNomeProf = apresentacoes_toTitleCase_(primeiroNomeProf);

  var saudacao = primeiroNomeProf
    ? 'Prezado(a) Professor(a) ' + primeiroNomeProf + ','
    : 'Prezado(a) Professor(a),';

  var linhaHorarioLocal = '';
  if (item.horario) linhaHorarioLocal += '<br><b>Horário:</b> ' + item.horario;
  if (item.local) linhaHorarioLocal += '<br><b>Local:</b> ' + item.local;

  return [
    '<p>', saudacao, '</p>',
    '<p>O Grupo de Estudos de Apoio à Produção Agrícola (GEAPA) realizará uma reunião no dia ',
    dataFormatada,
    ', com a apresentação do(a) acadêmico(a) ',
    nomeMembro,
    ', sobre o tema:</p>',
    '<p><b>"', titulo, '"</b></p>',
    '<p><b>Eixos temáticos:</b> ', textoEixos, '.', linhaHorarioLocal, '</p>',
    '<p>Gostaríamos de convidá-lo(a) para participar da reunião, caso tenha disponibilidade.</p>',
    '<p>Atenciosamente,<br>Diretoria do GEAPA</p>'
  ].join('');
}

/**
 * Assunto do lembrete aos membros.
 * @param {Object} item
 * @return {string}
 */
function apresentacoes_buildAssuntoLembreteMembros_(item) {
  var dataTxt = apresentacoes_formatarDataApresentacaoTexto_(item.dataApresentacao);
  return 'GEAPA | Lembrete de apresentação' + (dataTxt ? ' - ' + dataTxt : '');
}

/**
 * Converte nome para capitalização simples.
 * @param {string} nome
 * @return {string}
 */
function apresentacoes_toTitleCase_(nome) {
  return String(nome || '')
    .toLowerCase()
    .replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}

/**
 * HTML do lembrete aos membros, personalizado por nome.
 * @param {Object} item
 * @param {Object} membro
 * @return {string}
 */
function apresentacoes_buildHtmlLembreteMembros_(item, membro) {
  var dataFormatada = apresentacoes_formatarDataApresentacaoTexto_(item.dataApresentacao);
  var nomePalestrante = item.nome || 'membro do GEAPA';
  var primeiroNomeDestinatario = apresentacoes_getPrimeiroNome_(membro && membro.nome ? membro.nome : '');
  primeiroNomeDestinatario = apresentacoes_toTitleCase_(primeiroNomeDestinatario);

  var saudacao = primeiroNomeDestinatario
    ? 'Olá, ' + primeiroNomeDestinatario + ','
    : 'Olá, membro(a) do GEAPA,';

  var linhaTema = item.titulo ? '<p><b>Tema:</b> ' + item.titulo + '</p>' : '';
  var linhaHorario = item.horario ? '<p><b>Horário:</b> ' + item.horario + '</p>' : '';
  var linhaLocal = item.local ? '<p><b>Local:</b> ' + item.local + '</p>' : '';

  return [
    '<p>', saudacao, '</p>',
    '<p>Passando para lembrar da nossa próxima reunião do Grupo de Estudos de Apoio à Produção Agrícola (GEAPA).</p>',
    '<p><b>Data:</b> ', dataFormatada, '</p>',
    '<p><b>Palestrante:</b> ', nomePalestrante, '</p>',
    linhaTema,
    linhaHorario,
    linhaLocal,
    '<p>Contamos com a sua presença!</p>',
    '<p>Atenciosamente,<br>Diretoria do GEAPA</p>'
  ].join('');
}

/**
 * Marca envio de convite a professores.
 * @param {number} rowNumber
 */
function apresentacoes_marcarConviteProfessoresEnviado_(rowNumber) {
  var sheet = apresentacoes_getSheetProcessamento_();
  var headerMap = apresentacoes_getHeaderMap_(sheet);
  var S = APRESENTACOES_SCHEMA.PROCESSAMENTO;

  var colFlag = headerMap[S.CONVITE_PROFESSORES_ENVIADO];
  var colData = headerMap[S.DT_HR_ENVIO_CONVITE_PROFESSORES];

  if (colFlag === undefined) throw new Error('Coluna de convite a professores não encontrada.');
  if (colData === undefined) throw new Error('Coluna de data/hora de envio a professores não encontrada.');

  sheet.getRange(rowNumber, colFlag + 1).setValue('SIM');
  sheet.getRange(rowNumber, colData + 1).setValue(new Date());
}

/**
 * Marca envio de lembrete aos membros.
 * @param {number} rowNumber
 */
function apresentacoes_marcarLembreteMembrosEnviado_(rowNumber) {
  var sheet = apresentacoes_getSheetProcessamento_();
  var headerMap = apresentacoes_getHeaderMap_(sheet);
  var S = APRESENTACOES_SCHEMA.PROCESSAMENTO;

  var colFlag = headerMap[S.LEMBRETE_MEMBROS_ENVIADO];
  var colData = headerMap[S.DT_HR_ENVIO_LEMBRETE_MEMBROS];

  if (colFlag === undefined) throw new Error('Coluna de lembrete aos membros não encontrada.');
  if (colData === undefined) throw new Error('Coluna de data/hora de envio aos membros não encontrada.');

  sheet.getRange(rowNumber, colFlag + 1).setValue('SIM');
  sheet.getRange(rowNumber, colData + 1).setValue(new Date());
}

/**
 * Envia convite aos professores de uma apresentação.
 * @param {Object} item
 * @param {boolean} dryRun
 * @return {Object}
 */
function apresentacoes_enviarConviteProfessoresItem_(item, dryRun) {
  var professores = apresentacoes_getProfessoresPorEixos_(item);

  if (!professores.length) {
    return {
      ok: false,
      action: 'skip',
      reason: 'sem_professores_compativeis',
      rowNumber: item.rowNumber
    };
  }

  var ics = apresentacoes_gerarICSReuniaoGEAPA_(
    item.dataApresentacao,
    item.horario,
    item.local,
    item.nome,
    item.titulo
  );

  if (!dryRun) {
    professores.forEach(function(prof) {
      var htmlBody = apresentacoes_buildHtmlConviteProfessores_(item, prof);

      GmailApp.sendEmail(
        prof.email,
        apresentacoes_buildAssuntoConviteProfessores_(item),
        'Seu cliente de e-mail não suporta HTML.',
        {
          htmlBody: htmlBody,
          attachments: ics ? [ics] : []
        }
      );
    });

    apresentacoes_marcarConviteProfessoresEnviado_(item.rowNumber);
  }

  return {
    ok: true,
    action: dryRun ? 'preview' : 'sent',
    rowNumber: item.rowNumber,
    professores: professores,
    icsAnexado: !!ics
  };
}

/**
 * Envia lembrete aos membros ativos.
 * @param {Object} item
 * @param {boolean} dryRun
 * @return {Object}
 */
function apresentacoes_enviarLembreteMembrosItem_(item, dryRun) {
  var membros = apresentacoes_listarMembrosAtivos_();

  if (!membros.length) {
    return {
      ok: false,
      action: 'skip',
      reason: 'sem_membros_ativos',
      rowNumber: item.rowNumber
    };
  }

  var ics = apresentacoes_gerarICSReuniaoGEAPA_(
    item.dataApresentacao,
    item.horario,
    item.local,
    item.nome,
    item.titulo
  );

  if (!dryRun) {
    membros.forEach(function(membro) {
      var htmlBody = apresentacoes_buildHtmlLembreteMembros_(item, membro);

      GmailApp.sendEmail(
        membro.email,
        apresentacoes_buildAssuntoLembreteMembros_(item),
        'Seu cliente de e-mail não suporta HTML.',
        {
          htmlBody: htmlBody,
          attachments: ics ? [ics] : []
        }
      );
    });

    apresentacoes_marcarLembreteMembrosEnviado_(item.rowNumber);
  }

  return {
    ok: true,
    action: dryRun ? 'preview' : 'sent',
    rowNumber: item.rowNumber,
    membrosCount: membros.length,
    icsAnexado: !!ics
  };
}

/**
 * Processa convites a professores.
 * @param {boolean} dryRun
 * @return {Object}
 */
function apresentacoes_processarConvitesProfessores_(dryRun) {
  var itens = apresentacoes_listarElegiveisConviteProfessores_();
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
      var res = apresentacoes_enviarConviteProfessoresItem_(item, dryRun);
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

/**
 * Processa lembretes aos membros.
 * @param {boolean} dryRun
 * @return {Object}
 */
function apresentacoes_processarLembretesMembros_(dryRun) {
  var itens = apresentacoes_listarElegiveisLembreteMembros_();
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
      var res = apresentacoes_enviarLembreteMembrosItem_(item, dryRun);
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

/**
 * Preview geral dos envios pós-aprovação.
 * @return {Object}
 */
function apresentacoes_previewPosAprovacao_() {
  return {
    convitesProfessores: apresentacoes_processarConvitesProfessores_(true),
    lembretesMembros: apresentacoes_processarLembretesMembros_(true)
  };
}

/**
 * Retorna o primeiro nome de uma pessoa.
 * @param {string} nomeCompleto
 * @return {string}
 */
function apresentacoes_getPrimeiroNome_(nomeCompleto) {
  var nome = String(nomeCompleto || '').trim();
  if (!nome) return '';
  return nome.split(/\s+/)[0];
}

/**
 * Gera arquivo .ics da reunião/apresentação do GEAPA.
 *
 * Usa a data e o horário vindos da planilha de processamento.
 *
 * @param {Date} dataAp
 * @param {*} horarioReuniao
 * @param {string} localReuniao
 * @param {string} nomePalestrante
 * @param {string} titulo
 * @return {GoogleAppsScript.Base.Blob|null}
 */
function apresentacoes_gerarICSReuniaoGEAPA_(dataAp, horarioReuniao, localReuniao, nomePalestrante, titulo) {
  if (!(dataAp instanceof Date) || isNaN(dataAp.getTime())) {
    dataAp = new Date(dataAp);
  }

  if (!(dataAp instanceof Date) || isNaN(dataAp.getTime())) {
    Logger.log('Data inválida para gerar ICS, abortando.');
    return null;
  }

  var hora = 18;
  var minuto = 30;

  if (horarioReuniao instanceof Date && !isNaN(horarioReuniao.getTime())) {
    hora = horarioReuniao.getHours();
    minuto = horarioReuniao.getMinutes();
  } else if (horarioReuniao !== null && horarioReuniao !== undefined && horarioReuniao !== '') {
    var horarioStr = String(horarioReuniao).trim();

    // aceita 18h30, 18H30, 18:30, 18h, 18H, 18
    var match = horarioStr.match(/^(\d{1,2})(?:\s*[hH:]\s*(\d{1,2}))?$/);

    if (match) {
      hora = parseInt(match[1], 10);
      minuto = match[2] !== undefined ? parseInt(match[2], 10) : 0;
    }
  }

  // saneamento
  if (isNaN(hora) || hora < 0 || hora > 23) hora = 18;
  if (isNaN(minuto) || minuto < 0 || minuto > 59) minuto = 30;

  var tz = Session.getScriptTimeZone();

  var inicio = new Date(
    dataAp.getFullYear(),
    dataAp.getMonth(),
    dataAp.getDate(),
    hora,
    minuto,
    0
  );

  var fim = new Date(inicio.getTime() + 2 * 60 * 60 * 1000);

  var dtStart = Utilities.formatDate(inicio, tz, "yyyyMMdd'T'HHmmss");
  var dtEnd = Utilities.formatDate(fim, tz, "yyyyMMdd'T'HHmmss");

  var resumo = 'Reunião GEAPA – Apresentação de ' + (nomePalestrante || 'membro');
  var desc =
    'Reunião do Grupo de Estudos e Apoio à Produção Agrícola (GEAPA).' +
    (titulo ? (' Tema: ' + titulo) : '');
  var localStr = localReuniao || '';

  function esc(v) {
    return String(v || '')
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  }

  var conteudo =
    'BEGIN:VCALENDAR\r\n' +
    'VERSION:2.0\r\n' +
    'PRODID:-//GEAPA//Reuniao//PT-BR\r\n' +
    'CALSCALE:GREGORIAN\r\n' +
    'METHOD:PUBLISH\r\n' +
    'BEGIN:VEVENT\r\n' +
    'UID:' + new Date().getTime() + '-geapa@ufmt\r\n' +
    'DTSTAMP:' + Utilities.formatDate(new Date(), 'UTC', "yyyyMMdd'T'HHmmss'Z'") + '\r\n' +
    'DTSTART:' + dtStart + '\r\n' +
    'DTEND:' + dtEnd + '\r\n' +
    'SUMMARY:' + esc(resumo) + '\r\n' +
    'DESCRIPTION:' + esc(desc) + '\r\n' +
    'LOCATION:' + esc(localStr) + '\r\n' +
    'END:VEVENT\r\n' +
    'END:VCALENDAR';

  return Utilities.newBlob(conteudo, 'text/calendar', 'reuniao-geapa.ics');
}