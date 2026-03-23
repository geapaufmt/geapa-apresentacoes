# geapa-apresentacoes

Módulo do sistema GEAPA responsável por estruturar e automatizar o fluxo de apresentações do grupo.

---

## 🎯 Objetivo

Este módulo centraliza a lógica relacionada às apresentações dos membros do GEAPA, incluindo:

- Leitura da planilha interna de processamento.
- Normalização dos registros de apresentação.
- Diagnóstico das apresentações cadastradas.
- Identificação de registros aptos ao histórico público.
- Sincronização com a planilha pública de histórico de apresentações.

A proposta é integrar progressivamente a antiga automação baseada em planilha a uma arquitetura modular conectada ao `GEAPA-CORE`.

---

## 🔍 Escopo Atual

Na versão atual, o módulo já implementa:

- **Integração com GEAPA-CORE**: Utilizado como Library.
- **Leitura via Registry**: Acesso às planilhas `APRESENTACOES_PROCESSAMENTO` e `APRESENTACOES_HISTORICO_PUBLICO`.
- **Mapeamento Dinâmico**: Identificação de colunas por cabeçalho.
- **Normalização**: Conversão de linhas da planilha interna em objetos.
- **Regras de Elegibilidade**: Diagnóstico para sincronização.
- **Sincronização**: Atualização do histórico público.

### Regra de Histórico
- A apresentação pode entrar no histórico **mesmo sem link do Drive**.
- Se o link for adicionado posteriormente, a linha correspondente é atualizada.
- A correspondência é feita via `RGA` e `Data`.

---

## 📂 Estrutura do Módulo

### Arquivos (`src/`)
* `00_module_public_api.gs`: Expõe as funções públicas do módulo.
* `01_config.gs`: Centraliza constantes e chaves de configuração.
* `02_registry.gs`: Ponte com o GEAPA-CORE para abertura de planilhas.
* `03_schema.gs`: Define os cabeçalhos canônicos esperados.
* `04_readers.gs`: Converte linhas das planilhas em objetos normalizados.
* `05_rules.gs`: Contém regras puras de negócio (diagnóstico e filtragem).
* `06_tests.gs`: Funções de teste manual para conferência rápida.
* `07_history_sync.gs`: Responsável por inserir/atualizar registros no histórico público.

---

## 🛠️ Dependências e Configuração

### Requisitos
- **GEAPA-CORE** instalado como Library no Apps Script.
- Chaves válidas na **Registry** do sistema.

### Keys Esperadas na Registry
- `APRESENTACOES_PROCESSAMENTO`
- `APRESENTACOES_HISTORICO_PUBLICO`
- *(Futuras)*: `MEMBERS_ATUAIS`, `PROFS_BASE`.

---

## 🚀 Funções Públicas Atuais

| Função | Descrição |
| :--- | :--- |
| `apresentacoes_listarInternas()` | Retorna apresentações internas normalizadas. |
| `apresentacoes_listarPendentesTituloEixo()` | Lista apresentações aprovadas sem título/eixo confirmado. |
| `apresentacoes_listarAptasHistorico()` | Filtra registros com dados mínimos para o histórico. |
| `apresentacoes_diagnostico()` | Gera um resumo do estado da planilha interna. |
| `apresentacoes_sincronizarHistoricoPublico()` | Executa a sincronização completa das apresentações aptas. |

---

## 📋 Critérios de Elegibilidade (Histórico)

Para ser considerada **apta**, a apresentação deve possuir:
- Título e Eixo Temático Principal.
- Nome do palestrante e RGA.
- Data da apresentação e Semestre.
- *Nota: O campo de link é opcional nesta etapa.*

---

## 📈 Estado do Módulo

### ✅ Implementado
- Leitura de planilha interna e integração com Registry.
- Normalização de dados e diagnóstico.
- Sincronização com histórico público.

### 📅 Planejado (Backlog)
- Envio de lembretes e cobrança de título/eixo.
- Convites a professores e cobrança de arquivos pós-apresentação.
- Processamento de anexos e integração direta com Drive/Gmail.
- Configuração de triggers automatizados.

---

## 📝 Observações de Arquitetura e Convenções

- **Modularidade**: O `GEAPA-CORE` concentra funções compartilhadas.
- **Nomenclatura**: Funções públicas (sem sufixo `_`), funções internas (com sufixo `_`).
- **Flexibilidade**: Uso de cabeçalhos dinâmicos em vez de colunas fixas.
- **Governança**: As funções de "Diretoria Vigente" (Core) devem ser mantidas para suporte à governança (assinaturas, permissões), mas não são dependências obrigatórias para o funcionamento inicial deste módulo.

---

## 🕒 Changelog
### v0.1.0
- Criação da estrutura inicial e integração com GEAPA-CORE.
- Implementação de diagnóstico e sincronização de histórico.