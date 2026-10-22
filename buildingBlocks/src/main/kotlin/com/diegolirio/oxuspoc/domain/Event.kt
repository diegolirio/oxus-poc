package com.diegolirio.oxuspoc.domain

import java.util.UUID

interface Event {
    val correlationId: UUID
}
