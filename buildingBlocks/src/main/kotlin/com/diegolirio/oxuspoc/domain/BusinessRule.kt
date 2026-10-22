package com.diegolirio.oxuspoc.domain

abstract class BusinessRule(
    val message: String,
    val id: String,
) {
    abstract fun isBroken(): Boolean
}
