package com.diegolirio.oxuspoc.application

interface QueryHandler<in TQuery, TResult> where TQuery : Query<TResult> {
    fun handle(query: TQuery): TResult
}
