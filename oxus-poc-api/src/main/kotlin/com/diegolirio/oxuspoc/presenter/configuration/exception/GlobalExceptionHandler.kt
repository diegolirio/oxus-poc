package com.diegolirio.oxuspoc.presenter.configuration.exception

import com.diegolirio.oxuspoc.domain.BusinessRulesBrokenException
import com.diegolirio.oxuspoc.domain.ProviderRejectedException
import com.diegolirio.oxuspoc.domain.ProviderResourceNotFoundException
import com.diegolirio.oxuspoc.domain.ProviderUnavailableException
import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

/**
 * Traduz as excecoes do -core em ProblemDetail (RFC 9457), o corpo de erro do
 * projeto (INSTRUCTIONS.md, "Falha e corpo de erro").
 */
@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(BusinessRulesBrokenException::class)
    fun businessRules(e: BusinessRulesBrokenException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_CONTENT, "Regra de negocio violada.").apply {
            setProperty("errors", e.brokenRules.map { mapOf("code" to it.id, "message" to it.message) })
        }

    /** Recusa do provedor que quem chama pode corrigir: repassa o code e a mensagem dele. */
    @ExceptionHandler(ProviderRejectedException::class)
    fun providerRejected(e: ProviderRejectedException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_CONTENT, e.message).apply {
            setProperty("errors", listOf(mapOf("code" to e.code, "message" to e.message)))
        }

    @ExceptionHandler(ProviderResourceNotFoundException::class)
    fun notFound(): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "Recurso nao encontrado.")

    /** Generico de proposito: o motivo (chave, rede, 5xx) fica no log do -core. */
    @ExceptionHandler(ProviderUnavailableException::class)
    fun unavailable(): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.BAD_GATEWAY, "Servico de cambio indisponivel.")
}
