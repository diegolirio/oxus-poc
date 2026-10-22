package com.diegolirio.oxuspoc.presenter.routes

import com.diegolirio.oxuspoc.domain.ProviderUnavailableException
import com.diegolirio.oxuspoc.support.BaseIntegrationTest
import org.junit.jupiter.api.Test

class ListCustomersRouteIT : BaseIntegrationTest() {

    @Test
    fun `lista os clientes da OXUS`() {
        http.get().uri("/customers").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.customers[0].id").isEqualTo("cus_1")
            .jsonPath("$.customers[0].kyc.status").isEqualTo("ATTESTED")
    }

    @Test
    fun `OXUS fora do ar vira 502 generico`() {
        oxus.failure = ProviderUnavailableException("OXUS respondeu 401")

        http.get().uri("/customers").exchange()
            .expectStatus().isEqualTo(502)
            .expectBody()
            .jsonPath("$.detail").isEqualTo("Servico de cambio indisponivel.")
    }
}
