package com.diegolirio.oxuspoc.application.customer.listCustomers

import com.diegolirio.oxuspoc.application.QueryBase
import com.diegolirio.oxuspoc.application.QueryHandler
import com.diegolirio.oxuspoc.domain.Customer
import com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.OxusClient
import org.springframework.stereotype.Component

/** Clientes cadastrados na OXUS. A OXUS e a fonte da verdade: nada e guardado aqui. */
class ListCustomersQuery : QueryBase<ListCustomersResult>()

data class ListCustomersResult(val customers: List<Customer>)

@Component
class ListCustomersHandler(private val oxus: OxusClient) : QueryHandler<ListCustomersQuery, ListCustomersResult> {
    override fun handle(query: ListCustomersQuery) = ListCustomersResult(oxus.listCustomers())
}
