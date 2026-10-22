package com.diegolirio.oxuspoc.support

import com.diegolirio.oxuspoc.domain.Customer
import com.diegolirio.oxuspoc.domain.Fees
import com.diegolirio.oxuspoc.domain.Kyc
import com.diegolirio.oxuspoc.domain.PaymentInstructions
import com.diegolirio.oxuspoc.domain.Quote
import com.diegolirio.oxuspoc.domain.Receiver
import com.diegolirio.oxuspoc.domain.ReceiverHolder
import com.diegolirio.oxuspoc.domain.Routing
import com.diegolirio.oxuspoc.domain.Stage
import com.diegolirio.oxuspoc.domain.Transfer
import com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.OxusClient
import com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.OxusQuoteRequest
import com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.OxusTransferRequest

/**
 * Duble da OXUS: devolve dados fixos e guarda o que recebeu. Um teste faz uma
 * chamada falhar pondo a excecao em [failure]. O estado e limpo pelo
 * BaseIntegrationTest antes de cada teste.
 */
class FakeOxusClient : OxusClient {

    var failure: RuntimeException? = null
    val quoteRequests = mutableListOf<OxusQuoteRequest>()
    val transferRequests = mutableListOf<Pair<OxusTransferRequest, String>>()

    fun reset() {
        failure = null
        quoteRequests.clear()
        transferRequests.clear()
    }

    override fun listCustomers(): List<Customer> = answer { listOf(CUSTOMER) }

    override fun listReceivers(customerId: String): List<Receiver> =
        answer { listOf(RECEIVER.copy(customerId = customerId)) }

    override fun createQuote(request: OxusQuoteRequest): Quote = answer {
        quoteRequests += request
        QUOTE.copy(sourceAmount = request.amount)
    }

    override fun createTransfer(request: OxusTransferRequest, idempotencyKey: String): Transfer = answer {
        transferRequests += request to idempotencyKey
        TRANSFER.copy(quoteId = request.quoteId, purpose = request.purpose)
    }

    override fun getTransfer(transferId: String): Transfer = answer { TRANSFER.copy(id = transferId) }

    private fun <T> answer(block: () -> T): T = failure?.let { throw it } ?: block()

    companion object {
        val FEES = Fees(oxusFee = 600, payoutFee = 82, total = 682, currency = "BRL")

        val CUSTOMER = Customer(
            id = "cus_1",
            name = "Lucas Fernandes",
            email = "lucas@exemplo.com.br",
            status = "ACTIVE",
            kyc = Kyc(status = "ATTESTED", level = "STANDARD"),
        )

        val RECEIVER = Receiver(
            id = "rcv_1",
            customerId = "cus_1",
            rail = "ACH",
            currency = "USD",
            displayLabel = "ACH •••• 6789",
            status = "VALIDATED",
            holder = ReceiverHolder(name = "Carlos Oliveira", relationship = "FAMILY", country = "USA"),
        )

        val QUOTE = Quote(
            id = "quo_1",
            sourceAmount = 100000,
            sourceCurrency = "BRL",
            destinationAmount = 18361,
            destinationCurrency = "USD",
            exchangeRate = "0.183610",
            effectiveRate = "0.182358",
            fees = FEES,
            routing = Routing(evaluatedRoutes = 5, estimatedDelivery = "SAME_DAY"),
            expiresAt = "2026-10-22T12:05:00Z",
        )

        val TRANSFER = Transfer(
            id = "trf_1",
            status = "PROCESSING",
            quoteId = "quo_1",
            purpose = "OWN_ACCOUNT",
            sourceAmount = 100000,
            sourceCurrency = "BRL",
            destinationAmount = 18361,
            destinationCurrency = "USD",
            exchangeRate = "0.183610",
            fees = FEES,
            paymentInstructions = PaymentInstructions(
                method = "PIX",
                amount = 100000,
                currency = "BRL",
                pixCopyPaste = "000201pix",
                expiresAt = "2026-10-22T12:30:00Z",
            ),
            stages = listOf(Stage(stage = "CREATION", status = "COMPLETED"), Stage(stage = "PAYMENT", status = "WAITING_PAYMENT")),
            createdAt = "2026-10-22T12:00:00Z",
            updatedAt = "2026-10-22T12:00:00Z",
        )
    }
}
