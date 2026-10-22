package com.diegolirio.oxuspoc.presenter.routes

import com.diegolirio.oxuspoc.domain.ProviderResourceNotFoundException
import com.diegolirio.oxuspoc.support.BaseIntegrationTest
import org.junit.jupiter.api.Test

class ListReceiversRouteIT : BaseIntegrationTest() {

    @Test
    fun `lista as contas de destino do cliente`() {
        http.get().uri("/customers/cus_9/receivers").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.receivers[0].customerId").isEqualTo("cus_9")
            .jsonPath("$.receivers[0].displayLabel").isEqualTo("ACH •••• 6789")
    }

    @Test
    fun `cliente que a OXUS nao conhece vira 404 sem repetir o id`() {
        oxus.failure = ProviderResourceNotFoundException()

        http.get().uri("/customers/cus_x/receivers").exchange()
            .expectStatus().isNotFound
            .expectBody()
            .jsonPath("$.detail").isEqualTo("Recurso nao encontrado.")
    }
}
