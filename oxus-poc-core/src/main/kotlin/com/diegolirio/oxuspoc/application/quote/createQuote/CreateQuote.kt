package com.diegolirio.oxuspoc.application.quote.createQuote

import com.diegolirio.oxuspoc.application.ResultCommand
import com.diegolirio.oxuspoc.application.ResultCommandHandler
import com.diegolirio.oxuspoc.domain.Quote
import com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.OxusClient
import com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.OxusQuoteRequest
import org.springframework.stereotype.Component

/**
 * Cotacao BRL -> moeda da conta de destino, paga por PIX. [amountInCents] e o
 * valor em reais que sai, em centavos. A OXUS valida o valor e devolve
 * VALIDATION_ERROR ou ROUTE_UNAVAILABLE.
 */
data class CreateQuoteCommand(
    val customerId: String,
    val receiverId: String,
    val amountInCents: Long,
) : ResultCommand<Quote>

@Component
class CreateQuoteHandler(private val oxus: OxusClient) : ResultCommandHandler<CreateQuoteCommand, Quote> {
    override fun handle(command: CreateQuoteCommand): Quote =
        oxus.createQuote(
            OxusQuoteRequest(
                customerId = command.customerId,
                receiverId = command.receiverId,
                amount = command.amountInCents,
            ),
        )
}
