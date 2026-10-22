package com.diegolirio.oxuspoc.domain

// Remessa BRL -> exterior como o projeto a enxerga. Hoje espelha o contrato
// da OXUS (versao 2026-10-01): valores inteiros em centavos, taxas e status
// como strings dela. O cliente em anticorruptionLayer/oxus traduz para estes tipos.

data class Customer(
    val id: String,
    val name: String,
    val email: String,
    val status: String,
    val kyc: Kyc,
)

data class Kyc(
    val status: String,
    val level: String? = null,
)

data class Receiver(
    val id: String,
    val customerId: String,
    val rail: String,
    val currency: String,
    val displayLabel: String,
    val status: String,
    val holder: ReceiverHolder,
)

data class ReceiverHolder(
    val name: String,
    val relationship: String,
    val country: String,
)

data class Quote(
    val id: String,
    val sourceAmount: Long,
    val sourceCurrency: String,
    val destinationAmount: Long,
    val destinationCurrency: String,
    val exchangeRate: String,
    val effectiveRate: String,
    val fees: Fees,
    val routing: Routing,
    val expiresAt: String,
)

data class Fees(
    val oxusFee: Long,
    val payoutFee: Long,
    val total: Long,
    val currency: String,
)

data class Routing(
    val evaluatedRoutes: Int,
    val estimatedDelivery: String,
)

data class Transfer(
    val id: String,
    val status: String,
    val quoteId: String,
    val purpose: String,
    val sourceAmount: Long,
    val sourceCurrency: String,
    val destinationAmount: Long,
    val destinationCurrency: String,
    val exchangeRate: String,
    val fees: Fees,
    val paymentInstructions: PaymentInstructions? = null,
    val stages: List<Stage>,
    val failureReason: String? = null,
    val refund: Refund? = null,
    val createdAt: String,
    val updatedAt: String,
)

data class PaymentInstructions(
    val method: String,
    val amount: Long,
    val currency: String,
    val pixCopyPaste: String? = null,
    val expiresAt: String? = null,
)

data class Stage(
    val stage: String,
    val status: String,
    val updatedAt: String? = null,
    val reference: String? = null,
)

data class Refund(
    val status: String,
    val reason: String,
    val amount: Long,
    val currency: String,
)
