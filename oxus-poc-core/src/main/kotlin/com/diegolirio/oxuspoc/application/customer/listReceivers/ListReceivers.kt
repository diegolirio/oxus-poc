package com.diegolirio.oxuspoc.application.customer.listReceivers

import com.diegolirio.oxuspoc.application.QueryBase
import com.diegolirio.oxuspoc.application.QueryHandler
import com.diegolirio.oxuspoc.domain.Receiver
import com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.OxusClient
import org.springframework.stereotype.Component

/** Contas de destino de um cliente na OXUS. */
class ListReceiversQuery(val customerId: String) : QueryBase<ListReceiversResult>()

data class ListReceiversResult(val receivers: List<Receiver>)

@Component
class ListReceiversHandler(private val oxus: OxusClient) : QueryHandler<ListReceiversQuery, ListReceiversResult> {
    override fun handle(query: ListReceiversQuery) = ListReceiversResult(oxus.listReceivers(query.customerId))
}
