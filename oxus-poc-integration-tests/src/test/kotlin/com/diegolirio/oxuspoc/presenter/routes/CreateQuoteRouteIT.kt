package com.diegolirio.oxuspoc.presenter.routes

import com.diegolirio.oxuspoc.domain.ProviderRejectedException
import com.diegolirio.oxuspoc.support.BaseIntegrationTest
import kotlin.test.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType

class CreateQuoteRouteIT : BaseIntegrationTest() {

    @Test
    fun `cota o valor em centavos para o cliente e a conta`() {
        http.post().uri("/quotes")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"customerId":"cus_1","receiverId":"rcv_1","amountInCents":250000}""")
            .exchange()
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.id").isEqualTo("quo_1")
            .jsonPath("$.sourceAmount").isEqualTo(250000)
            .jsonPath("$.fees.total").isEqualTo(682)

        val pedido = oxus.quoteRequests.single()
        assertEquals("cus_1", pedido.customerId)
        assertEquals("rcv_1", pedido.receiverId)
        assertEquals(250000, pedido.amount)
    }

    @Test
    fun `recusa da OXUS vira 422 com o code dela`() {
        oxus.failure = ProviderRejectedException("ROUTE_UNAVAILABLE", "Nenhuma rota disponivel.")

        http.post().uri("/quotes")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"customerId":"cus_1","receiverId":"rcv_1","amountInCents":100099}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.errors[0].code").isEqualTo("ROUTE_UNAVAILABLE")
            .jsonPath("$.errors[0].message").isEqualTo("Nenhuma rota disponivel.")
    }

    @Test
    fun `corpo sem o valor vira 400 sem chamar a OXUS`() {
        http.post().uri("/quotes")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"customerId":"cus_1","receiverId":"rcv_1"}""")
            .exchange()
            .expectStatus().isBadRequest

        assertEquals(0, oxus.quoteRequests.size)
    }
}
