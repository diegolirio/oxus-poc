package com.diegolirio.oxuspoc.presenter.routes

import com.diegolirio.oxuspoc.domain.ProviderRejectedException
import com.diegolirio.oxuspoc.support.BaseIntegrationTest
import kotlin.test.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType

class CreateTransferRouteIT : BaseIntegrationTest() {

    @Test
    fun `executa a cotacao e devolve o PIX copia e cola`() {
        http.post().uri("/transfers")
            .header("Idempotency-Key", "chave-1")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"quoteId":"quo_1","purpose":"OWN_ACCOUNT"}""")
            .exchange()
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.status").isEqualTo("PROCESSING")
            .jsonPath("$.paymentInstructions.pixCopyPaste").isEqualTo("000201pix")

        val (pedido, chave) = oxus.transferRequests.single()
        assertEquals("quo_1", pedido.quoteId)
        assertEquals("OWN_ACCOUNT", pedido.purpose)
        assertEquals("chave-1", chave)
    }

    @Test
    fun `sem Idempotency-Key vira 400 sem chamar a OXUS`() {
        http.post().uri("/transfers")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"quoteId":"quo_1","purpose":"OWN_ACCOUNT"}""")
            .exchange()
            .expectStatus().isBadRequest

        assertEquals(0, oxus.transferRequests.size)
    }

    @Test
    fun `cotacao expirada vira 422 com QUOTE_EXPIRED`() {
        oxus.failure = ProviderRejectedException("QUOTE_EXPIRED", "A cotacao expirou.")

        http.post().uri("/transfers")
            .header("Idempotency-Key", "chave-2")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"quoteId":"quo_1","purpose":"OWN_ACCOUNT"}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.errors[0].code").isEqualTo("QUOTE_EXPIRED")
    }
}
