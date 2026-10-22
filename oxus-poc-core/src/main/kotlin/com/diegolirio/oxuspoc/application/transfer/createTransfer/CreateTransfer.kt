package com.diegolirio.oxuspoc.application.transfer.createTransfer

import com.diegolirio.oxuspoc.application.ResultCommand
import com.diegolirio.oxuspoc.application.ResultCommandHandler
import com.diegolirio.oxuspoc.domain.Transfer
import com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.OxusClient
import com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.OxusTransferRequest
import org.springframework.stereotype.Component

/**
 * Executa uma cotacao. A [idempotencyKey] vem de quem chama, uma por
 * cotacao: repetir o pedido com a mesma chave nao cria outra transferencia.
 */
data class CreateTransferCommand(
    val quoteId: String,
    val purpose: String,
    val idempotencyKey: String,
) : ResultCommand<Transfer>

@Component
class CreateTransferHandler(private val oxus: OxusClient) : ResultCommandHandler<CreateTransferCommand, Transfer> {
    override fun handle(command: CreateTransferCommand): Transfer =
        oxus.createTransfer(
            OxusTransferRequest(quoteId = command.quoteId, purpose = command.purpose),
            command.idempotencyKey,
        )
}
