package com.diegolirio.oxuspoc.application.transfer.getTransfer

import com.diegolirio.oxuspoc.application.QueryBase
import com.diegolirio.oxuspoc.application.QueryHandler
import com.diegolirio.oxuspoc.domain.Transfer
import com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.OxusClient
import org.springframework.stereotype.Component

/** Estado atual de uma transferencia, lido da OXUS a cada chamada. */
class GetTransferQuery(val transferId: String) : QueryBase<Transfer>()

@Component
class GetTransferHandler(private val oxus: OxusClient) : QueryHandler<GetTransferQuery, Transfer> {
    override fun handle(query: GetTransferQuery): Transfer = oxus.getTransfer(query.transferId)
}
