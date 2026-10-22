package com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.impl

import com.diegolirio.oxuspoc.domain.Customer
import com.diegolirio.oxuspoc.domain.ProviderRejectedException
import com.diegolirio.oxuspoc.domain.ProviderResourceNotFoundException
import com.diegolirio.oxuspoc.domain.ProviderUnavailableException
import com.diegolirio.oxuspoc.domain.Quote
import com.diegolirio.oxuspoc.domain.Receiver
import com.diegolirio.oxuspoc.domain.Transfer
import com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.OxusClient
import com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.OxusQuoteRequest
import com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.OxusTransferRequest
import org.slf4j.LoggerFactory
import org.springframework.core.ParameterizedTypeReference
import org.springframework.http.MediaType
import org.springframework.web.client.ResourceAccessException
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientResponseException
import tools.jackson.databind.DeserializationFeature
import tools.jackson.databind.json.JsonMapper
import tools.jackson.module.kotlin.KotlinModule

/**
 * Cliente HTTP da OXUS. O RestClient chega pronto do OxusConfiguration, com a
 * base, a chave (Authorization: Bearer) e os timeouts.
 */
class OxusClientImpl(
    private val restClient: RestClient,
    private val jsonMapper: JsonMapper,
) : OxusClient {

    private val log = LoggerFactory.getLogger(javaClass)

    override fun listCustomers(): List<Customer> = call {
        restClient.get().uri("/v1/customers")
            .retrieve()
            .body(object : ParameterizedTypeReference<OxusPage<Customer>>() {})!!
            .data
    }

    override fun listReceivers(customerId: String): List<Receiver> = call {
        restClient.get().uri("/v1/customers/{customerId}/receivers", customerId)
            .retrieve()
            .body(object : ParameterizedTypeReference<OxusPage<Receiver>>() {})!!
            .data
    }

    override fun createQuote(request: OxusQuoteRequest): Quote = call {
        restClient.post().uri("/v1/quotes")
            .contentType(MediaType.APPLICATION_JSON)
            .body(request)
            .retrieve()
            .body(Quote::class.java)!!
    }

    override fun createTransfer(request: OxusTransferRequest, idempotencyKey: String): Transfer = call {
        restClient.post().uri("/v1/transfers")
            .header("Idempotency-Key", idempotencyKey)
            .contentType(MediaType.APPLICATION_JSON)
            .body(request)
            .retrieve()
            .body(Transfer::class.java)!!
    }

    override fun getTransfer(transferId: String): Transfer = call {
        restClient.get().uri("/v1/transfers/{transferId}", transferId)
            .retrieve()
            .body(Transfer::class.java)!!
    }

    private fun <T> call(block: () -> T): T =
        try {
            block()
        } catch (e: RestClientResponseException) {
            throw translate(e)
        } catch (e: ResourceAccessException) {
            log.warn("OXUS indisponivel ({})", e.javaClass.simpleName)
            throw ProviderUnavailableException("falha de rede ao chamar a OXUS", e)
        }

    private fun translate(e: RestClientResponseException): RuntimeException {
        val status = e.statusCode.value()
        val error = readError(e.responseBodyAsString)
        return when (status) {
            400, 409, 422 -> ProviderRejectedException(
                code = error?.code ?: "VALIDATION_ERROR",
                message = error?.message ?: "A OXUS recusou o pedido.",
            )
            404 -> ProviderResourceNotFoundException()
            else -> {
                // requestId ajuda o suporte da OXUS; a chave nunca entra no log.
                log.warn("OXUS respondeu {} ({}, requestId={})", status, error?.code, error?.requestId)
                ProviderUnavailableException("OXUS respondeu $status")
            }
        }
    }

    private fun readError(body: String): OxusErrorDetail? =
        try {
            jsonMapper.readValue(body, OxusErrorBody::class.java).error
        } catch (_: Exception) {
            null
        }

    companion object {
        /** Kotlin e tolerante a campo novo: a OXUS pode acrescentar campos sem quebrar a leitura. */
        fun jsonMapper(): JsonMapper =
            JsonMapper.builder()
                .addModule(KotlinModule.Builder().build())
                .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .build()
    }

    private data class OxusPage<T>(val data: List<T>)

    private data class OxusErrorBody(val error: OxusErrorDetail?)

    private data class OxusErrorDetail(val code: String?, val message: String?, val requestId: String?)
}
