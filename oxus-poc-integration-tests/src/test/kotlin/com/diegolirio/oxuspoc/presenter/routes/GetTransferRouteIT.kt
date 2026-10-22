package com.diegolirio.oxuspoc.presenter.routes

import com.diegolirio.oxuspoc.domain.ProviderResourceNotFoundException
import com.diegolirio.oxuspoc.support.BaseIntegrationTest
import org.junit.jupiter.api.Test

class GetTransferRouteIT : BaseIntegrationTest() {

    @Test
    fun `devolve o estado atual da transferencia`() {
        http.get().uri("/transfers/trf_7").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").isEqualTo("trf_7")
            .jsonPath("$.stages[1].stage").isEqualTo("PAYMENT")
            .jsonPath("$.stages[1].status").isEqualTo("WAITING_PAYMENT")
    }

    @Test
    fun `transferencia que nao existe vira 404`() {
        oxus.failure = ProviderResourceNotFoundException()

        http.get().uri("/transfers/trf_x").exchange()
            .expectStatus().isNotFound
    }
}
