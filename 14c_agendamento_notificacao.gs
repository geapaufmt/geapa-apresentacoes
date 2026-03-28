/**
 * ============================================================
 * 05c_agendamento_notificacao.gs
 * ============================================================
 *
 * Envia e-mail ao membro quando o status da apresentação
 * for alterado manualmente para "Agendada".
 */

/**
 * Verifica se a linha tem dados mínimos para enviar o e-mail de agendamento.
 *
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_temDadosMinimosEmailAgendamento_(item) {
  return !!(
    item.nome &&
    item.email &&
    item.dataApresentacao &&
    item.semestre
  );
}

/**
 * Verifica se o status está manualmente como Agendada.
 *
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_estaAgendada_(item) {
  var status = String(item.status || '').trim();

  return (
    status === 'Agendada' ||
    status === APRESENTACOES_CFG.STATUS_APRESENTACAO.AGENDADA
  );
}

/**
 * Verifica se o e-mail de agendamento já foi enviado.
 *
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_emailAgendamentoJaEnviado_(item) {
  return String(item.emailAgendamentoEnviado || '').trim() === APRESENTACOES_CFG.VALORES_SIM_NAO.SIM;
}

/**
 * Verifica se deve enviar o e-mail de agendamento.
 *
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_deveEnviarEmailAgendamento_(item) {
  return (
    apresentacoes_estaAgendada_(item) &&
    apresentacoes_temDadosMinimosEmailAgendamento_(item) &&
    !apresentacoes_emailAgendamentoJaEnviado_(item)
  );
}

/**
 * Monta assunto do e-mail de agendamento.
 *
 * @param {Object} item
 * @return {string}
 */
function apresentacoes_buildAssuntoAgendamento_(item) {
  var dataTxt = apresentacoes_formatarDataApresentacaoTexto_(item.dataApresentacao);
  return 'GEAPA | Apresentação agendada' + (dataTxt ? ' - ' + dataTxt : '');
}

/**
 * Monta HTML do e-mail de agendamento.
 *
 * @param {Object} item
 * @return {string}
 */
function apresentacoes_buildHtmlAgendamento_(item) {
  var primeiroNome = apresentacoes_toTitleCase_(apresentacoes_getPrimeiroNome_(item.nome));
  var saudacao = primeiroNome ? 'Olá, ' + primeiroNome + ',' : 'Olá,';
  var dataTxt = apresentacoes_formatarDataApresentacaoTexto_(item.dataApresentacao);

  return [
    '<p>', saudacao, '</p>',
    '<p>Sua apresentação no GEAPA foi <b>agendada</b>.</p>',
    '<p>',
      '<b>Data da apresentação:</b> ', (dataTxt || ''), '<br>',
      (item.horario ? '<b>Horário:</b> ' + item.horario + '<br>' : ''),
      (item.local ? '<b>Local:</b> ' + item.local + '<br>' : ''),
      '<b>Semestre da apresentação:</b> ', (item.semestre || '')
    , '</p>',
    '<p>Mais perto da data, você receberá os próximos avisos automáticos do sistema.</p>',
    '<p>Atenciosamente,<br>Diretoria do GEAPA</p>'
  ].join('');
}

/**
 * Marca envio do e-mail de agendamento.
 *
 * @param {number} rowNumber
 */
function apresentacoes_marcarEmailAgendamentoEnviado_(rowNumber) {
  var sheet = apresentacoes_getSheetProcessamento_();
  var headerMap = apresentacoes_getHeaderMap_(sheet);
  var S = APRESENTACOES_SCHEMA.PROCESSAMENTO;

  var colFlag = headerMap[S.EMAIL_AGENDAMENTO_ENVIADO];
  var colData = headerMap[S.DT_HR_EMAIL_AGENDAMENTO];

  if (colFlag === undefined) throw new Error('Coluna "E-mail de agendamento enviado?" não encontrada.');
  if (colData === undefined) throw new Error('Coluna "Data/hora e-mail de agendamento" não encontrada.');

  sheet.getRange(rowNumber, colFlag + 1).setValue(APRESENTACOES_CFG.VALORES_SIM_NAO.SIM);
  sheet.getRange(rowNumber, colData + 1).setValue(new Date());
}

/**
 * Processa uma linha específica para envio do e-mail de agendamento.
 *
 * @param {number} rowNumber
 * @return {Object}
 */
function apresentacoes_processarEmailAgendamentoLinha_(rowNumber) {
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

  if (!apresentacoes_deveEnviarEmailAgendamento_(item)) {
    return {
      ok: false,
      action: 'skip',
      reason: 'linha_nao_elegivel_para_email_agendamento',
      rowNumber: rowNumber,
      status: item.status
    };
  }

  var icsBlob = apresentacoes_gerarICSAgendamento_(item);

  GEAPA_CORE.coreSendHtmlEmail({
    to: item.email,
    subject: apresentacoes_buildAssuntoAgendamento_(item),
    body: 'Seu cliente de e-mail nao suporta HTML.',
    htmlBody: apresentacoes_buildHtmlAgendamento_(item),
    attachments: icsBlob ? [icsBlob] : []
  });

  apresentacoes_marcarEmailAgendamentoEnviado_(rowNumber);

  return {
    ok: true,
    action: 'sent',
    rowNumber: rowNumber,
    nome: item.nome,
    email: item.email
  };
}

/**
 * Processa em lote os e-mails de agendamento pendentes.
 *
 * @return {Object}
 */
function apresentacoes_processarEmailsAgendamentoPendentes_() {
  var itens = apresentacoes_listarApresentacoesInternas_();

  var counters = {
    totalLinhas: itens.length,
    sent: 0,
    skipped: 0,
    errors: 0
  };

  var details = [];

  itens.forEach(function(item) {
    try {
      if (!apresentacoes_deveEnviarEmailAgendamento_(item)) {
        counters.skipped++;
        details.push({
          ok: false,
          action: 'skip',
          reason: 'linha_nao_elegivel_para_email_agendamento',
          rowNumber: item.rowNumber
        });
        return;
      }

  var icsBlob = apresentacoes_gerarICSAgendamento_(item);

      GEAPA_CORE.coreSendHtmlEmail({
        to: item.email,
        subject: apresentacoes_buildAssuntoAgendamento_(item),
        body: 'Seu cliente de e-mail nao suporta HTML.',
        htmlBody: apresentacoes_buildHtmlAgendamento_(item),
        attachments: icsBlob ? [icsBlob] : []
      });

      apresentacoes_marcarEmailAgendamentoEnviado_(item.rowNumber);

      counters.sent++;
      details.push({
        ok: true,
        action: 'sent',
        rowNumber: item.rowNumber,
        nome: item.nome,
        email: item.email
      });
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
    details: details.slice(0, 30)
  };
}

/**
 * Gera arquivo .ics da apresentação agendada.
 *
 * @param {Object} item
 * @return {GoogleAppsScript.Base.Blob|null}
 */
function apresentacoes_gerarICSAgendamento_(item) {
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

  var resumo = 'GEAPA | Apresentação - ' + (item.nome || 'Membro');
  var descricao = [
    'Apresentação agendada no GEAPA.',
    'Membro: ' + (item.nome || ''),
    'Semestre: ' + (item.semestre || ''),
    'Título: ' + (item.titulo || 'A definir')
  ].join('\\n');

  var localStr = item.local || '';

  var conteudo =
    'BEGIN:VCALENDAR\r\n' +
    'VERSION:2.0\r\n' +
    'PRODID:-//GEAPA//Apresentacoes//PT-BR\r\n' +
    'BEGIN:VEVENT\r\n' +
    'SUMMARY:' + resumo + '\r\n' +
    'DTSTART:' + dtStart + '\r\n' +
    'DTEND:' + dtEnd + '\r\n' +
    'DESCRIPTION:' + descricao + '\r\n' +
    'LOCATION:' + localStr + '\r\n' +
    'END:VEVENT\r\n' +
    'END:VCALENDAR';

  return Utilities.newBlob(conteudo, 'text/calendar', 'agendamento-apresentacao-geapa.ics');
}
