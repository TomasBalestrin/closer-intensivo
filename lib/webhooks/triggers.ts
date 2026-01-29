import { dispararWebhooks } from './outbound-processor'

export async function onParticipanteCriado(participante: any) {
  await dispararWebhooks({
    evento: 'participante.created',
    dados: participante,
    entidade_tipo: 'participante',
    entidade_id: participante.id,
  })
}

export async function onParticipanteAtualizado(participante: any) {
  await dispararWebhooks({
    evento: 'participante.updated',
    dados: participante,
    entidade_tipo: 'participante',
    entidade_id: participante.id,
  })
}

export async function onVendaCriada(venda: any, participante: any) {
  await dispararWebhooks({
    evento: 'venda.created',
    dados: { venda, participante },
    entidade_tipo: 'venda',
    entidade_id: venda.id,
  })
}

export async function onVendaAtualizada(venda: any, participante: any) {
  await dispararWebhooks({
    evento: 'venda.updated',
    dados: { venda, participante },
    entidade_tipo: 'venda',
    entidade_id: venda.id,
  })
}

export async function onCheckinRealizado(participante: any, dia: number) {
  await dispararWebhooks({
    evento: 'credenciamento.checkin',
    dados: { participante, dia, timestamp: new Date().toISOString() },
    entidade_tipo: 'participante',
    entidade_id: participante.id,
  })
}

export async function onCheckoutRealizado(participante: any, dia: number) {
  await dispararWebhooks({
    evento: 'credenciamento.checkout',
    dados: { participante, dia, timestamp: new Date().toISOString() },
    entidade_tipo: 'participante',
    entidade_id: participante.id,
  })
}

export async function onFormularioDISCCompleto(formulario: any, participante: any, resultado: any) {
  await dispararWebhooks({
    evento: 'formulario_disc.completed',
    dados: { formulario, participante, resultado },
    entidade_tipo: 'formulario_disc',
    entidade_id: formulario.id,
  })
}

export async function onQualificacaoAlterada(participante: any, qualificacaoAnterior: string | null) {
  await dispararWebhooks({
    evento: 'qualificacao.changed',
    dados: { participante, qualificacao_anterior: qualificacaoAnterior, qualificacao_nova: participante.qualification },
    entidade_tipo: 'participante',
    entidade_id: participante.id,
  })
}
