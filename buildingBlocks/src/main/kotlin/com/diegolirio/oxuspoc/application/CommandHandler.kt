package com.diegolirio.oxuspoc.application

interface CommandHandler<in TCommand> where TCommand : Command {
    fun handle(command: TCommand)
}
