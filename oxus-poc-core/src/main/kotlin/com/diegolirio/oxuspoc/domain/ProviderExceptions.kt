package com.diegolirio.oxuspoc.domain

/**
 * O provedor de remessa recusou o pedido por algo que quem chama pode corrigir:
 * cotacao expirada, rota indisponivel, campo invalido. O [code] e o do
 * provedor (por exemplo QUOTE_EXPIRED) e a [message] e a dele.
 */
class ProviderRejectedException(val code: String, override val message: String) : RuntimeException(message)

/** O provedor nao encontrou o recurso pedido. */
class ProviderResourceNotFoundException : RuntimeException("recurso nao encontrado no provedor")

/**
 * O provedor nao atendeu por um motivo que nao e do pedido: chave recusada,
 * limite de requisicoes, erro dele ou falha de rede.
 */
class ProviderUnavailableException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)
