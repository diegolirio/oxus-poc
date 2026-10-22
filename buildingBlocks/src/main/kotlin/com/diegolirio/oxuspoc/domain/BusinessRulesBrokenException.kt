package com.diegolirio.oxuspoc.domain

class BusinessRulesBrokenException(val brokenRules: List<BusinessRule>) : Exception() {
    override val message: String
        get() = brokenRules.joinToString { "${it.id}: ${it.message}" }
}
