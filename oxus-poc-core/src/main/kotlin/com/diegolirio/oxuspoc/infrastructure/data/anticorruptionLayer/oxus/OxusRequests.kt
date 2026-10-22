package com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus

// Corpos de pedido da OXUS. Sem campo opcional nulo: a OXUS recusa
// `"campo": null` com VALIDATION_ERROR, em vez de tratar como ausente.

data class OxusQuoteRequest(
    val customerId: String,
    val receiverId: String,
    val amount: Long,
    val paymentMethod: String = "PIX",
    val sourceCurrency: String = "BRL",
    val amountType: String = "SOURCE",
)

data class OxusTransferRequest(
    val quoteId: String,
    val purpose: String,
)
