var APRESENTACOES_RUNTIME_CACHE = {
  sheets: {}
};

function apresentacoes_assertCoreLibrary_() {
  if (typeof GEAPA_CORE === 'undefined' || !GEAPA_CORE) {
    throw new Error('A Library GEAPA-CORE não está disponível neste projeto.');
  }

  if (typeof GEAPA_CORE.coreGetSheetByKey !== 'function') {
    throw new Error('A função pública coreGetSheetByKey não está disponível na Library GEAPA-CORE.');
  }
}

function apresentacoes_getSheetByKeyCached_(key) {
  apresentacoes_assertCoreLibrary_();

  if (!APRESENTACOES_RUNTIME_CACHE.sheets[key]) {
    APRESENTACOES_RUNTIME_CACHE.sheets[key] = GEAPA_CORE.coreGetSheetByKey(key);
  }

  return APRESENTACOES_RUNTIME_CACHE.sheets[key];
}

function apresentacoes_getSheetProcessamento_() {
  return apresentacoes_getSheetByKeyCached_(APRESENTACOES_CFG.REGISTRY_KEYS.PROCESSAMENTO);
}

function apresentacoes_getSheetHistoricoPublico_() {
  return apresentacoes_getSheetByKeyCached_(APRESENTACOES_CFG.REGISTRY_KEYS.HISTORICO_PUBLICO);
}