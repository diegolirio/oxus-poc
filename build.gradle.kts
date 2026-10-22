// Versoes dos plugins declaradas uma vez so, na raiz.
// Os subprojetos (buildingBlocks, oxus-poc-core, oxus-poc-api)
// aplicam sem versao -- o Kotlin Gradle Plugin nao suporta ser carregado com
// versao explicita em mais de um subprojeto, e um subprojeto so pode aplicar
// um plugin sem versao se ele ja estiver no classpath do buildscript herdado
// da raiz.
plugins {
    kotlin("jvm") version "2.3.21" apply false
    kotlin("plugin.spring") version "2.3.21" apply false
    kotlin("plugin.jpa") version "2.3.21" apply false
    id("org.springframework.boot") version "4.1.1" apply false
    id("io.spring.dependency-management") version "1.1.7" apply false
}
