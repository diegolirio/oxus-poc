package com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus

import com.diegolirio.oxuspoc.domain.Customer
import com.diegolirio.oxuspoc.domain.Quote
import com.diegolirio.oxuspoc.domain.Receiver
import com.diegolirio.oxuspoc.domain.Transfer

/**
 * Porta da API da OXUS (versao 2026-10-01). Os valores sao inteiros em
 * centavos, como na OXUS. Falhas sobem como as excecoes de domain/ProviderExceptions.kt.
 */
interface OxusClient {
    fun listCustomers(): List<Customer>
    fun listReceivers(customerId: String): List<Receiver>
    fun createQuote(request: OxusQuoteRequest): Quote
    fun createTransfer(request: OxusTransferRequest, idempotencyKey: String): Transfer
    fun getTransfer(transferId: String): Transfer
}
