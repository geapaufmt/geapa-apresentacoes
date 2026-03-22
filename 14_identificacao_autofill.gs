/**
 * ============================================================
 * 14_identificacao_autofill.gs
 * ============================================================
 */

/**
 * Normaliza texto para comparação.
 *
 * @param {*} value
 * @return {string}
 */
function apresentacoes_normLookup_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Lê MEMBERS_ATUAIS e monta índices por nome, RGA e e-mail.
 *
 * @return {Object}
 */
function apresentacoes_buildMembersLookup_() {
  var sheet = GEAPA_CORE.coreGetSheetByKey(APRESENTACOES_CFG.REGISTRY_KEYS.MEMBERS);
  var headerMap = apresentacoes_getHeaderMap_(sheet);
  var rows = apresentacoes_getDataRows_(sheet);

  var colNome =
    headerMap['MEMBRO'] !== undefined ? headerMap['MEMBRO'] :
    headerMap['Nome'] !== undefined ? headerMap['Nome'] :
    headerMap['NOME'] !== undefined ? headerMap['NOME'] :
    null;

  var colRga =
    headerMap['RGA'] !== undefined ? headerMap['RGA'] :
    null;

  var colEmail =
    headerMap['EMAIL'] !== undefined ? headerMap['EMAIL'] :
    headerMap['E-mail'] !== undefined ? headerMap['E-mail'] :
    headerMap['Email'] !== undefined ? headerMap['Email'] :
    null;

  if (colNome === null) throw new Error('Coluna de nome não encontrada em MEMBERS_ATUAIS.');
  if (colRga === null) throw new Error('Coluna de RGA não encontrada em MEMBERS_ATUAIS.');
  if (colEmail === null) throw new Error('Coluna de e-mail não encontrada em MEMBERS_ATUAIS.');

  var byNome = {};
  var byRga = {};
  var byEmail = {};

  rows.forEach(function(row) {
    var item = {
      nome: String(row[colNome] || '').trim(),
      rga: String(row[colRga] || '').trim(),
      email: String(row[colEmail] || '').trim()
    };

    if (!item.nome && !item.rga && !item.email) return;

    if (item.nome) byNome[apresentacoes_normLookup_(item.nome)] = item;
    if (item.rga) byRga[apresentacoes_normLookup_(item.rga)] = item;
    if (item.email) byEmail[apresentacoes_normLookup_(item.email)] = item;
  });

  return {
    byNome: byNome,
    byRga: byRga,
    byEmail: byEmail
  };
}

/**
 * Tenta localizar membro por nome, RGA ou e-mail.
 *
 * @param {Object} lookup
 * @param {Object} dados
 * @return {Object|null}
 */
function apresentacoes_findMemberByAny_(lookup, dados) {
  var rga = apresentacoes_normLookup_(dados.rga);
  var email = apresentacoes_normLookup_(dados.email);
  var nome = apresentacoes_normLookup_(dados.nome);

  if (rga && lookup.byRga[rga]) return lookup.byRga[rga];
  if (email && lookup.byEmail[email]) return lookup.byEmail[email];
  if (nome && lookup.byNome[nome]) return lookup.byNome[nome];

  return null;
}

/**
 * Preenche Nome/RGA/E-mail de uma linha específica da planilha de processamento.
 *
 * @param {number} rowNumber
 * @return {Object}
 */
function apresentacoes_preencherIdentificacaoLinha_(rowNumber) {
  var sheet = apresentacoes_getSheetProcessamento_();
  var headerMap = apresentacoes_getHeaderMap_(sheet);
  var S = APRESENTACOES_SCHEMA.PROCESSAMENTO;

  var colNome = headerMap[S.NOME_MEMBRO];
  var colRga = headerMap[S.RGA];
  var colEmail = headerMap[S.EMAIL_MEMBRO];

  if (colNome === undefined) throw new Error('Coluna de nome do membro não encontrada.');
  if (colRga === undefined) throw new Error('Coluna de RGA não encontrada.');
  if (colEmail === undefined) throw new Error('Coluna de e-mail do membro não encontrada.');

  var lastCol = sheet.getLastColumn();
  var row = sheet.getRange(rowNumber, 1, 1, lastCol).getValues()[0];

  var atual = {
    nome: String(row[colNome] || '').trim(),
    rga: String(row[colRga] || '').trim(),
    email: String(row[colEmail] || '').trim()
  };

  if (!atual.nome && !atual.rga && !atual.email) {
    return {
      ok: false,
      action: 'skip',
      reason: 'linha_sem_identificacao',
      rowNumber: rowNumber
    };
  }

  var lookup = apresentacoes_buildMembersLookup_();
  var found = apresentacoes_findMemberByAny_(lookup, atual);

  if (!found) {
    return {
      ok: false,
      action: 'skip',
      reason: 'membro_nao_encontrado',
      rowNumber: rowNumber,
      atual: atual
    };
  }

  var mudou = false;

  if (!atual.nome && found.nome) {
    sheet.getRange(rowNumber, colNome + 1).setValue(found.nome);
    mudou = true;
  }

  if (!atual.rga && found.rga) {
    sheet.getRange(rowNumber, colRga + 1).setValue(found.rga);
    mudou = true;
  }

  if (!atual.email && found.email) {
    sheet.getRange(rowNumber, colEmail + 1).setValue(found.email);
    mudou = true;
  }

  return {
    ok: true,
    action: mudou ? 'filled' : 'unchanged',
    rowNumber: rowNumber,
    resolved: found
  };
}

function apresentacoes_preencherIdentificacaoPendentes_() {
  var sheet = apresentacoes_getSheetProcessamento_();
  var lastRow = sheet.getLastRow();

  var counters = {
    totalLinhas: Math.max(0, lastRow - 1),
    filled: 0,
    unchanged: 0,
    skipped: 0,
    errors: 0
  };

  var details = [];

  for (var rowNumber = 2; rowNumber <= lastRow; rowNumber++) {
    try {
      var res = apresentacoes_preencherIdentificacaoLinha_(rowNumber);
      details.push(res);

      if (res.action === 'filled') counters.filled++;
      else if (res.action === 'unchanged') counters.unchanged++;
      else counters.skipped++;
    } catch (err) {
      counters.errors++;
      details.push({
        ok: false,
        action: 'error',
        rowNumber: rowNumber,
        message: err && err.message ? err.message : String(err)
      });
    }
  }

  return {
    ok: counters.errors === 0,
    counters: counters,
    details: details.slice(0, 30)
  };
}