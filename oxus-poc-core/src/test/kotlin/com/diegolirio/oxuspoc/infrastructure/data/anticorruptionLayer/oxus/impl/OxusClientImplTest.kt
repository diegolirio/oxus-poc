package com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.impl

import com.diegolirio.oxuspoc.domain.ProviderRejectedException
import com.diegolirio.oxuspoc.domain.ProviderResourceNotFoundException
import com.diegolirio.oxuspoc.domain.ProviderUnavailableException
import com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.OxusQuoteRequest
import com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.OxusTransferRequest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.header
import org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withStatus
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.web.client.RestClient

class OxusClientImplTest {

    private val builder = RestClient.builder()
        .baseUrl(BASE)
        .configureMessageConverters { it.withJsonConverter(JacksonJsonHttpMessageConverter(OxusClientImpl.jsonMapper())) }
    private val server = MockRestServiceServer.bindTo(builder).build()
    private val client = OxusClientImpl(builder.build(), OxusClientImpl.jsonMapper())

    @Test
    fun `le a lista de clientes ignorando campos que nao usa`() {
        server.expect(requestTo("$BASE/v1/customers")).andRespond(
            withSuccess(
                """{"data":[{"id":"cus_1","externalId":"x","type":"INDIVIDUAL","name":"Lucas","email":"l@x.com",
                   "status":"ACTIVE","kyc":{"status":"ATTESTED","level":"STANDARD"}}],"nextCursor":null}""",
                MediaType.APPLICATION_JSON,
            ),
        )

        val customers = client.listCustomers()

        assertEquals("cus_1", customers.single().id)
        assertEquals("ATTESTED", customers.single().kyc.status)
    }

    @Test
    fun `cota em BRL por PIX com o valor em centavos`() {
        server.expect(requestTo("$BASE/v1/quotes"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(jsonPath("$.amount").value(100000))
            .andExpect(jsonPath("$.paymentMethod").value("PIX"))
            .andExpect(jsonPath("$.sourceCurrency").value("BRL"))
            .andExpect(jsonPath("$.amountType").value("SOURCE"))
            .andExpect(jsonPath("$.sourceNetwork").doesNotExist())
            .andRespond(withStatus(HttpStatus.CREATED).contentType(MediaType.APPLICATION_JSON).body(QUOTE))

        val quote = client.createQuote(OxusQuoteRequest("cus_1", "rcv_1", 100000))

        assertEquals("quo_1", quote.id)
        assertEquals(18361, quote.destinationAmount)
    }

    @Test
    fun `manda a Idempotency-Key na transferencia`() {
        server.expect(requestTo("$BASE/v1/transfers"))
            .andExpect(header("Idempotency-Key", "chave-1"))
            // Corpo exato: um campo a mais com null e recusado pela OXUS.
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$.quoteId").value("quo_1"))
            .andExpect(jsonPath("$.purpose").value("OWN_ACCOUNT"))
            .andRespond(withStatus(HttpStatus.CREATED).contentType(MediaType.APPLICATION_JSON).body(TRANSFER))

        val transfer = client.createTransfer(OxusTransferRequest("quo_1", "OWN_ACCOUNT"), "chave-1")

        assertEquals("PROCESSING", transfer.status)
        assertEquals("000201pix", transfer.paymentInstructions?.pixCopyPaste)
    }

    @Test
    fun `422 da OXUS vira recusa com o code dela`() {
        server.expect(requestTo("$BASE/v1/quotes")).andRespond(
            withStatus(HttpStatus.UNPROCESSABLE_CONTENT).contentType(MediaType.APPLICATION_JSON)
                .body("""{"error":{"code":"ROUTE_UNAVAILABLE","message":"Sem rota.","requestId":"req_1"}}"""),
        )

        val e = assertFailsWith<ProviderRejectedException> { client.createQuote(OxusQuoteRequest("c", "r", 100099)) }

        assertEquals("ROUTE_UNAVAILABLE", e.code)
        assertEquals("Sem rota.", e.message)
    }

    @Test
    fun `409 da OXUS tambem vira recusa`() {
        server.expect(requestTo("$BASE/v1/transfers")).andRespond(
            withStatus(HttpStatus.CONFLICT).contentType(MediaType.APPLICATION_JSON)
                .body("""{"error":{"code":"IDEMPOTENCY_CONFLICT","message":"Chave reutilizada.","requestId":"r"}}"""),
        )

        val e = assertFailsWith<ProviderRejectedException> {
            client.createTransfer(OxusTransferRequest("quo_1", "OWN_ACCOUNT"), "k")
        }

        assertEquals("IDEMPOTENCY_CONFLICT", e.code)
    }

    @Test
    fun `404 da OXUS vira nao encontrado`() {
        server.expect(requestTo("$BASE/v1/transfers/trf_x")).andRespond(withStatus(HttpStatus.NOT_FOUND))

        assertFailsWith<ProviderResourceNotFoundException> { client.getTransfer("trf_x") }
    }

    @Test
    fun `401 da OXUS vira indisponivel, mesmo com corpo que nao e JSON`() {
        server.expect(requestTo("$BASE/v1/customers")).andRespond(withStatus(HttpStatus.UNAUTHORIZED).body("nope"))

        assertFailsWith<ProviderUnavailableException> { client.listCustomers() }
    }

    @Test
    fun `5xx da OXUS vira indisponivel`() {
        server.expect(requestTo("$BASE/v1/customers")).andRespond(withStatus(HttpStatus.BAD_GATEWAY))

        assertFailsWith<ProviderUnavailableException> { client.listCustomers() }
    }

    private companion object {
        const val BASE = "https://oxus.test"

        const val FEES = """{"oxusFee":600,"payoutFee":82,"total":682,"currency":"BRL"}"""

        const val QUOTE = """{"id":"quo_1","type":"REMITTANCE","customerId":"cus_1","receiverId":"rcv_1",
            "sourceAmount":100000,"sourceCurrency":"BRL","destinationAmount":18361,"destinationCurrency":"USD",
            "exchangeRate":"0.183610","effectiveRate":"0.182358","fees":$FEES,
            "routing":{"evaluatedRoutes":5,"selectedRouteId":"r","estimatedDelivery":"SAME_DAY"},
            "expiresAt":"2026-10-22T12:05:00Z","createdAt":"2026-10-22T12:00:00Z"}"""

        const val TRANSFER = """{"id":"trf_1","type":"REMITTANCE","status":"PROCESSING","customerId":"cus_1",
            "receiverId":"rcv_1","quoteId":"quo_1","purpose":"OWN_ACCOUNT","sourceAmount":100000,
            "sourceCurrency":"BRL","destinationAmount":18361,"destinationCurrency":"USD","exchangeRate":"0.183610",
            "fees":$FEES,
            "paymentInstructions":{"method":"PIX","amount":100000,"currency":"BRL","pixCopyPaste":"000201pix",
              "expiresAt":"2026-10-22T12:30:00Z"},
            "stages":[{"stage":"CREATION","status":"COMPLETED"},{"stage":"PAYMENT","status":"WAITING_PAYMENT"}],
            "createdAt":"2026-10-22T12:00:00Z","updatedAt":"2026-10-22T12:00:00Z"}"""
    }
}
