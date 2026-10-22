package com.diegolirio.oxuspoc.presenter.routes.customer.listReceivers

import com.diegolirio.oxuspoc.application.customer.listReceivers.ListReceiversHandler
import com.diegolirio.oxuspoc.application.customer.listReceivers.ListReceiversQuery
import com.diegolirio.oxuspoc.application.customer.listReceivers.ListReceiversResult
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController

@RestController
class ListReceiversRoute(private val handler: ListReceiversHandler) {

    @GetMapping("/customers/{customerId}/receivers")
    fun list(@PathVariable customerId: String): ListReceiversResult =
        handler.handle(ListReceiversQuery(customerId))
}
