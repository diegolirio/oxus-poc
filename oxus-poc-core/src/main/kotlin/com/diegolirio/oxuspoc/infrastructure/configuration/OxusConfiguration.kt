package com.diegolirio.oxuspoc.infrastructure.configuration

import com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.OxusClient
import com.diegolirio.oxuspoc.infrastructure.data.anticorruptionLayer.oxus.impl.OxusClientImpl
import java.net.http.HttpClient
import org.slf4j.LoggerFactory
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpHeaders
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter
import org.springframework.web.client.RestClient

@Configuration
@EnableConfigurationProperties(OxusProperties::class)
class OxusConfiguration {

    private val log = LoggerFactory.getLogger(javaClass)

    @Bean
    fun oxusClient(properties: OxusProperties): OxusClient {
        if (properties.apiKey.isBlank()) {
            log.warn("OXUS_API_KEY esta vazia: as chamadas a OXUS vao responder 502")
        }
        val jsonMapper = OxusClientImpl.jsonMapper()
        val requestFactory = JdkClientHttpRequestFactory(
            HttpClient.newBuilder().connectTimeout(properties.timeout).build(),
        ).apply { setReadTimeout(properties.timeout) }
        val restClient = RestClient.builder()
            .baseUrl(properties.apiUrl.toString())
            .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer ${properties.apiKey}")
            .requestFactory(requestFactory)
            .configureMessageConverters { it.withJsonConverter(JacksonJsonHttpMessageConverter(jsonMapper)) }
            .build()
        return OxusClientImpl(restClient, jsonMapper)
    }
}
