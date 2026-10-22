package com.diegolirio.oxuspoc.presenter.routes.customer.listCustomers

import com.diegolirio.oxuspoc.application.customer.listCustomers.ListCustomersHandler
import com.diegolirio.oxuspoc.application.customer.listCustomers.ListCustomersQuery
import com.diegolirio.oxuspoc.application.customer.listCustomers.ListCustomersResult
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class ListCustomersRoute(private val handler: ListCustomersHandler) {

    @GetMapping("/customers")
    fun list(): ListCustomersResult = handler.handle(ListCustomersQuery())
}
