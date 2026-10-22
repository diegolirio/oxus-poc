package com.diegolirio.oxuspoc.presenter.routes.quote.createQuote

import com.diegolirio.oxuspoc.application.quote.createQuote.CreateQuoteCommand
import com.diegolirio.oxuspoc.application.quote.createQuote.CreateQuoteHandler
import com.diegolirio.oxuspoc.domain.Quote
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
class CreateQuoteRoute(private val handler: CreateQuoteHandler) {

    @PostMapping("/quotes")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@RequestBody request: CreateQuoteRequest): Quote =
        handler.handle(
            CreateQuoteCommand(
                customerId = request.customerId,
                receiverId = request.receiverId,
                amountInCents = request.amountInCents,
            ),
        )
}

data class CreateQuoteRequest(
    val customerId: String,
    val receiverId: String,
    val amountInCents: Long,
)
