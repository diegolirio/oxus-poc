package com.diegolirio.oxuspoc.infrastructure.configuration

import java.net.URI
import java.time.Duration
import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("oxus")
data class OxusProperties(
    val apiUrl: URI,
    val apiKey: String = "",
    val timeout: Duration = Duration.ofSeconds(10),
)
