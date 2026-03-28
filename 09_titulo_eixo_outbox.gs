/**
 * ============================================================
 * 09_titulo_eixo_outbox.gs
 * ============================================================
 *
 * Cobrança diária de título/eixo dentro da janela final.
 *
 * REGRA:
 * - enquanto faltar entre 1 e 4 dias para a apresentação;
 * - se ainda não houver confirmação de título/eixo;
 * - e se ainda não tiver sido cobrado hoje;
 * => envia 1 e-mail no dia.
 *
 * A contagem de cobranças é acumulada em planilha.
 */

/**
 * Converte data para início do dia.
 * @param {*} value
 * @return {Date|null}
 */
function apresentacoes_toStartOfDayLocal_(value) {
  if (!value) return null;

  var d = value;
  if (Object.prototype.toString.call(d) !== '[object Date]' || isNaN(d.getTime())) {
    d = new Date(value);
  }

  if (isNaN(d.getTime())) return null;

  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Diferença em dias entre hoje e a data-alvo.
 * @param {*} dataAlvo
 * @return {number|null}
 */
function apresentacoes_diffDiasPara_(dataAlvo) {
  var hoje = apresentacoes_toStartOfDayLocal_(new Date());
  var alvo = apresentacoes_toStartOfDayLocal_(dataAlvo);

  if (!hoje || !alvo) return null;

  var msPorDia = 24 * 60 * 60 * 1000;
  return Math.round((alvo.getTime() - hoje.getTime()) / msPorDia);
}

/**
 * Verifica se está na janela final de cobrança.
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_estaNaJanelaCobrancaTituloEixo_(item) {
  var diff = apresentacoes_diffDiasPara_(item.dataApresentacao);
  if (diff === null) return false;

  return (
    diff >= APRESENTACOES_CFG.COBRANCA_TITULO_EIXO.JANELA_DIAS_ANTES_MIN &&
    diff <= APRESENTACOES_CFG.COBRANCA_TITULO_EIXO.JANELA_DIAS_ANTES_MAX
  );
}

/**
 * Verifica se já houve confirmação válida de título/eixo.
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_temTituloEixoConfirmadosOutbox_(item) {
  return apresentacoes_temTituloEixoConfirmados_(item);
}

/**
 * Verifica se a cobrança já foi enviada hoje.
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_jaCobrouHojeTituloEixo_(item) {
  if (!item.dtCobrancaTituloEixo) return false;

  var hoje = apresentacoes_toStartOfDayLocal_(new Date());
  var ultima = apresentacoes_toStartOfDayLocal_(item.dtCobrancaTituloEixo);

  if (!hoje || !ultima) return false;

  return hoje.getTime() === ultima.getTime();
}

/**
 * Verifica se o item deve receber cobrança hoje.
 * @param {Object} item
 * @return {boolean}
 */
function apresentacoes_deveEnviarCobrancaTituloEixo_(item) {
  if (!apresentacoes_temIdentificacaoMinima_(item)) return false;
  if (!item.dataApresentacao) return false;
  if (apresentacoes_temTituloEixoConfirmadosOutbox_(item)) return false;
  if (!apresentacoes_estaNaJanelaCobrancaTituloEixo_(item)) return false;
  if (apresentacoes_jaCobrouHojeTituloEixo_(item)) return false;

  return true;
}

/**
 * Lista apresentações elegíveis para cobrança hoje.
 * @return {Object[]}
 */
function apresentacoes_listarElegiveisCobrancaTituloEixo_() {
  return apresentacoes_listarApresentacoesInternas_().filter(function(item) {
    return apresentacoes_deveEnviarCobrancaTituloEixo_(item);
  });
}

/**
 * Formata data da apresentação para texto amigável.
 * @param {*} value
 * @return {string}
 */
function apresentacoes_formatarDataApresentacaoTextoOutbox_(value) {
  return apresentacoes_formatarDataApresentacaoTexto_(value);
}

/**
 * Monta assunto do e-mail.
 * @param {Object} item
 * @return {string}
 */
function apresentacoes_buildAssuntoCobrancaTituloEixo_(item) {
  var dataTxt = apresentacoes_formatarDataApresentacaoTextoOutbox_(item.dataApresentacao);
  return 'GEAPA | Envio de título e eixo da apresentação' + (dataTxt ? ' - ' + dataTxt : '');
}

/**
 * Monta HTML do e-mail de cobrança.
 * @param {Object} item
 * @return {string}
 */
function apresentacoes_buildHtmlCobrancaTituloEixo_(item) {
  var nome = item.nome || 'membro';
  var dataTxt = apresentacoes_formatarDataApresentacaoTextoOutbox_(item.dataApresentacao);
  var horario = item.horario || '';
  var local = item.local || '';
  var qtdJaEnviada = Number(item.qtdCobrancasTituloEixo || 0);

  var detalhes = [];
  if (dataTxt) detalhes.push('<b>Data:</b> ' + dataTxt);
  if (horario) detalhes.push('<b>Horário:</b> ' + horario);
  if (local) detalhes.push('<b>Local:</b> ' + local);

  return [
    '<p>Olá, <b>' + nome + '</b>.</p>',
    '<p>Este é um lembrete referente à sua apresentação no GEAPA.</p>',
    detalhes.length ? '<p>' + detalhes.join('<br>') + '</p>' : '',
    '<p>Até o momento, ainda não identificamos o envio do <b>título</b> e do <b>eixo temático principal</b> da sua apresentação.</p>',
    '<p>Por favor, responda este e-mail informando:</p>',
    '<p><b>TÍTULO:</b> ...<br><b>EIXO:</b> ...</p>',
    '<p>Se desejar, você também pode informar um <b>EIXO 2</b> opcional.</p>',
    '<p>Exemplo de resposta:</p>',
    '<p><b>TÍTULO:</b> Seletividade de herbicidas em espécies cultivadas<br><b>EIXO:</b> III – Defesa vegetal (fitossanidade)<br><b>EIXO 2:</b> II – Fitotecnia e manejo de culturas</p>',
    '<p><i>Registro interno: esta é a cobrança nº ' + (qtdJaEnviada + 1) + ' enviada para esta apresentação.</i></p>',
    '<p>Atenciosamente,<br>GEAPA</p>'
  ].join('');
}

/**
 * Monta payload do e-mail.
 * @param {Object} item
 * @return {Object}
 */
function apresentacoes_buildPayloadCobrancaTituloEixo_(item) {
  return {
    to: item.email,
    subject: apresentacoes_buildAssuntoCobrancaTituloEixo_(item),
    htmlBody: apresentacoes_buildHtmlCobrancaTituloEixo_(item),
    item: item
  };
}

/**
 * Retorna preview dos e-mails elegíveis de hoje.
 * @return {Object[]}
 */
function apresentacoes_previewCobrancaTituloEixo_() {
  return apresentacoes_listarElegiveisCobrancaTituloEixo_().map(function(item) {
    var payload = apresentacoes_buildPayloadCobrancaTituloEixo_(item);

    return {
      rowNumber: item.rowNumber,
      nome: item.nome,
      to: payload.to,
      subject: payload.subject,
      dataApresentacao: item.dataApresentacao,
      diffDias: apresentacoes_diffDiasPara_(item.dataApresentacao),
      qtdCobrancasTituloEixo: Number(item.qtdCobrancasTituloEixo || 0),
      htmlBody: payload.htmlBody
    };
  });
}

/**
 * Marca data/hora da última cobrança e incrementa contador.
 * @param {number} rowNumber
 */
function apresentacoes_marcarCobrancaTituloEixoEnviada_(rowNumber) {
  var sheet = apresentacoes_getSheetProcessamento_();
  var headerMap = apresentacoes_getHeaderMap_(sheet);
  var S = APRESENTACOES_SCHEMA.PROCESSAMENTO;

  var colData = headerMap[S.DT_COBRANCA_TITULO_EIXO];
  var colQtd = headerMap[S.QTD_COBRANCAS_TITULO_EIXO];

  if (colData === undefined) {
    throw new Error('Coluna "Data cobrança título/eixo" não encontrada.');
  }

  if (colQtd === undefined) {
    throw new Error('Coluna "Qtd cobranças título/eixo" não encontrada.');
  }

  var rangeData = sheet.getRange(rowNumber, colData + 1);
  var rangeQtd = sheet.getRange(rowNumber, colQtd + 1);

  var qtdAtual = Number(rangeQtd.getValue() || 0);

  rangeData.setValue(new Date());
  rangeQtd.setValue(qtdAtual + 1);
}

/**
 * Envia cobrança diária de título/eixo.
 * @param {boolean} dryRun Quando true, não envia; só simula.
 * @return {Object}
 */
function apresentacoes_enviarCobrancaTituloEixo_(dryRun) {
  var runId = 'APRES-TIT-' + new Date().getTime();
  var elegiveis = apresentacoes_listarElegiveisCobrancaTituloEixo_();

  var counters = {
    totalElegiveis: elegiveis.length,
    sent: 0,
    previewed: 0,
    errors: 0
  };

  var details = [];

  elegiveis.forEach(function(item) {
    try {
      var payload = apresentacoes_buildPayloadCobrancaTituloEixo_(item);

      if (dryRun) {
        counters.previewed++;
        details.push({
          ok: true,
          action: 'preview',
          rowNumber: item.rowNumber,
          nome: item.nome,
          to: payload.to,
          subject: payload.subject,
          diffDias: apresentacoes_diffDiasPara_(item.dataApresentacao),
          qtdCobrancasAntes: Number(item.qtdCobrancasTituloEixo || 0)
        });
        return;
      }

      GEAPA_CORE.coreSendHtmlEmail({
        to: payload.to,
        subject: payload.subject,
        htmlBody: payload.htmlBody
      });

      apresentacoes_marcarCobrancaTituloEixoEnviada_(item.rowNumber);

      counters.sent++;
      details.push({
        ok: true,
        action: 'sent',
        rowNumber: item.rowNumber,
        nome: item.nome,
        to: payload.to,
        subject: payload.subject,
        diffDias: apresentacoes_diffDiasPara_(item.dataApresentacao),
        qtdCobrancasAntes: Number(item.qtdCobrancasTituloEixo || 0),
        qtdCobrancasDepois: Number(item.qtdCobrancasTituloEixo || 0) + 1
      });
    } catch (err) {
      counters.errors++;
      details.push({
        ok: false,
        action: 'error',
        rowNumber: item.rowNumber || null,
        nome: item.nome || '',
        message: err && err.message ? err.message : String(err)
      });
    }
  });

  return {
    ok: counters.errors === 0,
    runId: runId,
    counters: counters,
    details: details
  };
}
