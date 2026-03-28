# GEAPA - Módulo de Apresentações

Módulo responsável pelo fluxo operacional das apresentações internas do GEAPA, desde a identificação do apresentador até o histórico público, comunicações por e-mail e recebimento de arquivos/fotos.

---

## Escopo atual

O módulo hoje já cobre:

- leitura e normalização da planilha de processamento;
- autofill de identidade do membro a partir de `MEMBERS_ATUAIS` via `GEAPA-CORE`;
- autofill de semestre com base na vigência institucional;
- diagnóstico e validações das linhas de apresentação;
- sincronização com o histórico público;
- cobrança de título/eixo por e-mail e processamento das respostas;
- envio de convites e lembretes para membros e professores;
- envio de e-mail de agendamento ao membro quando a apresentação é marcada;
- cobrança e processamento do arquivo PDF pós-apresentação;
- identificação e processamento de fotos pendentes;
- instalação de triggers do módulo.

---

## Dependências

### Library

- `GEAPA-CORE`

### Keys esperadas no Registry

- `APRESENTACOES_PROCESSAMENTO`
- `APRESENTACOES_HISTORICO_PUBLICO`
- `MEMBERS_ATUAIS`
- `PROFS_BASE`

Observação:

- parte do acesso a membros e contatos institucionais é feita indiretamente via `GEAPA-CORE`, não por leitura manual isolada.

---

## Fluxos principais

### 1. Leitura e normalização

Arquivos principais:

- `02_registry.gs`
- `03_schema.gs`
- `04_readers.gs`

Responsabilidades:

- abrir as planilhas pelo Registry;
- mapear cabeçalhos da aba de processamento;
- converter cada linha em um objeto operacional padronizado.

### 2. Autofill de identidade e semestre

Arquivos principais:

- `14_identificacao_autofill.gs`
- `14b_semestre_autofill.gs`

Responsabilidades:

- preencher `Nome do membro`, `RGA` e `E-mail do membro` com base em `MEMBERS_ATUAIS`;
- preencher/validar o semestre da apresentação usando a vigência de semestres do core.

### 3. Título e eixo temático

Arquivos principais:

- `09_titulo_eixo_outbox.gs`
- `10_titulo_eixo_inbox.gs`

Responsabilidades:

- identificar apresentações aprovadas sem título/eixo confirmado;
- enviar cobrança por e-mail ao membro;
- ler a resposta mais recente válida;
- interpretar título e eixo;
- registrar os dados confirmados na planilha de processamento.

### 4. Convites e lembretes

Arquivo principal:

- `11_convites_lembretes.gs`

Responsabilidades:

- montar listas de professores e membros convidados;
- enviar convites a professores;
- enviar lembretes a membros e professores;
- gerar anexos de calendário quando aplicável.

### 5. Histórico público

Arquivo principal:

- `07_history_sync.gs`

Responsabilidades:

- identificar apresentações aptas ao histórico;
- evitar duplicidade por `RGA + data`;
- inserir ou atualizar registros no histórico público.

### 6. Arquivo pós-apresentação

Arquivos principais:

- `12_pos_apresentacao_outbox.gs`
- `13_arquivo_drive_inbox.gs`

Responsabilidades:

- cobrar envio do PDF após a apresentação;
- localizar a resposta correta por thread/remetente;
- validar anexos e arquivos;
- registrar resultados na linha correspondente.

### 7. Fotos pendentes

Arquivo principal:

- `13b_fotos_pendentes.gs`

Responsabilidades:

- localizar apresentações pendentes de fotos;
- processar os anexos/imagens disponíveis no fluxo definido pelo módulo.

### 8. E-mail de agendamento

Arquivo principal:

- `14c_agendamento_notificacao.gs`

Responsabilidades:

- identificar linhas com dados mínimos de agendamento;
- enviar o e-mail ao membro;
- marcar data/hora do envio na aba de processamento.

---

## Estrutura do módulo

- `00_module_public_api.gs`: funções públicas do módulo.
- `01_config.gs`: configuração central.
- `02_registry.gs`: acesso a planilhas via `GEAPA-CORE`.
- `03_schema.gs`: cabeçalhos canônicos da aba de processamento e do histórico.
- `04_readers.gs`: leitores e normalização.
- `05_rules.gs`: regras de elegibilidade e validação.
- `06_tests.gs`: testes manuais do módulo.
- `07_history_sync.gs`: sincronização de histórico.
- `09_titulo_eixo_outbox.gs`: cobrança de título/eixo.
- `10_titulo_eixo_inbox.gs`: processamento das respostas de título/eixo.
- `11_convites_lembretes.gs`: convites e lembretes.
- `12_pos_apresentacao_outbox.gs`: cobrança de arquivo.
- `13_arquivo_drive_inbox.gs`: leitura e validação de anexos/arquivos.
- `13b_fotos_pendentes.gs`: fluxo de fotos pendentes.
- `14_identificacao_autofill.gs`: autofill de identidade.
- `14b_semestre_autofill.gs`: autofill de semestre.
- `14c_agendamento_notificacao.gs`: e-mail de agendamento.
- `15_triggers.gs`: instalação e manutenção de triggers.
- `99_on_edit.gs`: respostas automáticas a edições manuais na aba de processamento.

---

## Estado atual do módulo

### Implementado

- integração com `GEAPA-CORE` para Registry, identidade, semestre, contatos e helpers de Gmail;
- sincronização com histórico público;
- cobrança e leitura de respostas de título/eixo;
- convites, lembretes e e-mail de agendamento;
- cobrança e processamento do arquivo pós-apresentação;
- fluxos auxiliares de fotos pendentes e testes manuais.

### Observações de arquitetura

- o módulo trabalha com cabeçalhos dinâmicos, não com colunas fixas;
- a aba de processamento usa cabeçalhos específicos do domínio, por exemplo `Nome do membro` e `E-mail do membro`;
- o autofill de identidade usa o `GEAPA-CORE` com mapeamento explícito desses cabeçalhos;
- parte importante do fluxo depende de Gmail e Drive, então permissões do projeto Apps Script precisam estar completas.