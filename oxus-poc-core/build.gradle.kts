plugins {
    `java-library`
    kotlin("jvm")
    kotlin("plugin.spring")
    kotlin("plugin.jpa")
    id("io.spring.dependency-management")
    id("info.solidsoft.pitest")
}

group = "com.diegolirio"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

repositories {
    mavenCentral()
}

// O -core nao aplica o plugin org.springframework.boot: nao gera bootJar,
// continua biblioteca. Mas precisa do BOM para resolver as versoes dos
// starters sem escreve-las a mao. Sem versao aqui: os plugins do Kotlin e o
// io.spring.dependency-management herdam a versao declarada no
// build.gradle.kts da raiz.
dependencyManagement {
    imports {
        mavenBom("org.springframework.boot:spring-boot-dependencies:4.1.1")
    }
}

dependencies {
    api(project(":buildingBlocks"))

    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    // spring-boot-starter-flyway existe a partir do Boot 4.x; em Boot 3.x
    // troque por "org.flywaydb:flyway-core" direto.
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("org.springframework.boot:spring-boot-starter-mail")
    // Spring, Jackson e Hibernate leem classe Kotlin via reflexao; sem isso
    // alguns caminhos (serializacao, proxy de metodo) falham em runtime.
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    runtimeOnly("org.postgresql:postgresql")

    testImplementation(platform("org.junit:junit-bom:5.11.4"))
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict")
    }
}

// domain/ e infrastructure/ nao sao module boundaries do Gradle -- sao pastas
// do mesmo modulo. Sem allOpen, uma classe Kotlin e final por padrao e nem
// o Hibernate (proxy de @Entity) nem o Spring (proxy de @Configuration)
// conseguem estender ela em runtime.
allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
    annotation("org.springframework.context.annotation.Configuration")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

// Sem org.pitest:pitest-kotlin-plugin: ele nunca saiu de 0.1-SNAPSHOT e nao
// resolve na maioria dos repositorios. O Pitest roda sem ele, com mutantes um
// pouco piores em data class, elvis e safe-call. O aviso "Project uses kotlin,
// but the Arcmutate kotlin plugin is not present" no log e esperado.
pitest {
    junit5PluginVersion = "1.2.3"
    targetClasses = setOf("com.diegolirio.oxuspoc.application.*", "com.diegolirio.oxuspoc.domain.*")
    // Mesma exclusao do JaCoCo: ponto de entrada e configuracao.
    excludedClasses = setOf("*Application*", "com.diegolirio.oxuspoc.configuration.*")
    // So os unitarios: os *IT nao terminam em Test e ficam de fora.
    targetTests = setOf("*Test")
    outputFormats = setOf("HTML", "XML")
    timestampedReports = false
    // Projeto recem-criado ainda nao tem classe de logica: zero mutantes nao e erro.
    failWhenNoMutations = false
    // Sem mutationThreshold de proposito: o mutation score e diagnostico, nao
    // gate. Um limiar e ajuste manual do time, depois de revisar os mutantes
    // equivalentes.
}
