package com.diegolirio.oxuspoc.presenter.routes.transfer.getTransfer

import com.diegolirio.oxuspoc.application.transfer.getTransfer.GetTransferHandler
import com.diegolirio.oxuspoc.application.transfer.getTransfer.GetTransferQuery
import com.diegolirio.oxuspoc.domain.Transfer
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController

@RestController
class GetTransferRoute(private val handler: GetTransferHandler) {

    @GetMapping("/transfers/{transferId}")
    fun get(@PathVariable transferId: String): Transfer = handler.handle(GetTransferQuery(transferId))
}
