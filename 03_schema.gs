/**
 * Schema canônico da aba de processamento de apresentações.
 */

var APRESENTACOES_SCHEMA = Object.freeze({
  PROCESSAMENTO: {
    NOME_MEMBRO: 'Nome do membro',
    RGA: 'RGA',
    EMAIL_MEMBRO: 'E-mail do membro',
    DATA_APRESENTACAO: 'Data da apresentação',
    SEMESTRE_APRESENTACAO: 'Semestre da apresentação',
    HORARIO_REUNIAO: 'Horário da reunião',
    LOCAL_REUNIAO: 'Local da reunião',
    TITULO_APRESENTACAO: 'Título da apresentação',
    EIXO_PRINCIPAL: 'Eixo temático principal',
    EIXO_SECUNDARIO: 'Eixo Temático Secundário',
    STATUS_APRESENTACAO: 'Status da apresentação',
    NOTIFICACAO_SECRETARIOS_ENVIADA: 'Notificação aos secretários enviada?',
    DT_HR_NOTIFICACAO_SECRETARIOS: 'Data/hora notificação aos secretários',
    LEMBRETE_4_DIAS_ENVIADO: 'Lembrete (4 dias antes) enviado?',
    DT_HR_ENVIO_LEMBRETE_4_DIAS: 'Data/hora envio lembrete (4 dias antes)',
    DT_COBRANCA_TITULO_EIXO: 'Data cobrança título/eixo',
    QTD_COBRANCAS_TITULO_EIXO: 'Qtd cobranças título/eixo',
    DT_HR_CONFIRMACAO_TITULO_EIXO: 'Data/hora confirmação título/eixo',
    CONVITE_PROFESSORES_ENVIADO: 'Convite a professores enviado?',
    DT_HR_ENVIO_CONVITE_PROFESSORES: 'Data/hora envio convite a professores',
    LEMBRETE_MEMBROS_ENVIADO: 'Lembrete aos membros enviado?',
    DT_HR_ENVIO_LEMBRETE_MEMBROS: 'Data/hora envio lembrete aos membros',
    STATUS_ENVIO_ARQUIVO: 'Status de envio do arquivo',
    DT_HR_SOLICITACAO_ARQUIVO: 'Data/hora solicitação do arquivo',
    QTD_COBRANCAS_ARQUIVO: 'Qtd cobranças arquivo',
    LINK_ARQUIVO_DRIVE: 'Link do arquivo no Drive',
    DT_HR_EMAIL_COBRANCA_ARQUIVO: 'Data/hora e-mail de cobrança',
    DT_HR_RECEBIMENTO_ARQUIVO: 'Data/hora recebimento do arquivo',
    PROFESSORES_CONVIDADOS: 'Professores convidados (lista)',
    OBSERVACOES: 'Observações'
  },

  HISTORICO: {
    TITULO: 'Título',
    EIXO_TEMATICO: 'Eixo Temático',
    PALESTRANTE: 'Palestrante',
    RGA: 'RGA',
    DATA: 'Data',
    SEMESTRE: 'Semestre',
    LINK: 'Link'
  }
});