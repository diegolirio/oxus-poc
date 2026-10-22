package com.diegolirio.oxuspoc.support

import com.diegolirio.oxuspoc.OxusPocApiApplication
import org.junit.jupiter.api.BeforeEach
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.boot.testcontainers.service.connection.ServiceConnection
import org.springframework.context.annotation.Import
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.test.web.servlet.client.RestTestClient
import org.testcontainers.postgresql.PostgreSQLContainer

/**
 * Base de todo teste de integracao: toda classe terminada em IT a estende.
 *
 * Um container de banco para a suite inteira, iniciado na mao e sem @Container:
 * o ciclo do @Container e por classe e reiniciaria o banco a cada IT. O Ryuk do
 * Testcontainers derruba o container no fim do build.
 */
@SpringBootTest(
    classes = [OxusPocApiApplication::class],
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
)
@Import(TestConfig::class)
abstract class BaseIntegrationTest {

    @LocalServerPort
    private var port: Int = 0

    protected lateinit var http: RestTestClient

    @Autowired
    protected lateinit var oxus: FakeOxusClient

    @BeforeEach
    fun limparDubles() {
        oxus.reset()
    }

    @BeforeEach
    fun prepararCliente() {
        // O JdkClientHttpRequestFactory vai explicito porque bindToServer() sem
        // argumento escolhe o cliente HTTP pelo classpath: uma dependencia nova
        // pode trocar o transporte do teste -- e o retry dele -- sem aviso.
        http = RestTestClient.bindToServer(JdkClientHttpRequestFactory())
            .baseUrl("http://localhost:$port")
            .build()
    }

    companion object {
        // O @field: manda a anotacao para o campo estatico que o Spring
        // inspeciona, e nao para a property, qualquer que seja o
        // -Xannotation-default-target do modulo.
        @JvmStatic
        @field:ServiceConnection
        val database: PostgreSQLContainer = PostgreSQLContainer("postgres:17-alpine").also { it.start() }
    }
}
