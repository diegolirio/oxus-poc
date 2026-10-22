package com.diegolirio.oxuspoc.presenter.routes.transfer.createTransfer

import com.diegolirio.oxuspoc.application.transfer.createTransfer.CreateTransferCommand
import com.diegolirio.oxuspoc.application.transfer.createTransfer.CreateTransferHandler
import com.diegolirio.oxuspoc.domain.Transfer
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
class CreateTransferRoute(private val handler: CreateTransferHandler) {

    /** Sem o header Idempotency-Key o Spring responde 400 antes de chegar aqui. */
    @PostMapping("/transfers")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @RequestHeader("Idempotency-Key") idempotencyKey: String,
        @RequestBody request: CreateTransferRequest,
    ): Transfer =
        handler.handle(
            CreateTransferCommand(
                quoteId = request.quoteId,
                purpose = request.purpose,
                idempotencyKey = idempotencyKey,
            ),
        )
}

data class CreateTransferRequest(
    val quoteId: String,
    val purpose: String,
)
