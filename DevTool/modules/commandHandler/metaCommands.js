commandHelper.commandList.help = {
    name: "help",
    description: 'help about a command.',
    usage: 'commandName',
    options: { c: "to make the ai continue the story" },
    execute: function (args) {
        const optionPrefix = settings.commandHandler.optionPrefix

        if (args && args[0] && args[0].startsWith(optionPrefix)) {
            options = args.shift();
            if (options.indexOf("c") >= 0) {
                this.dontConsume = { input: "deleteInput" };
            }
        }

        const prefix = settings.commandHandler.prefix

        if (!args || args.length == 0) {
            throw `${prefix}help: no argument provided.`
        }

        const targetName = args[0].replace(prefix, "")
        const command = commandHelper.commandList[targetName]
        if (!command || command.deactivated) {
            throw `${prefix}help: command ${prefix}${targetName} does not exist.`
        }

        let resultList = []
        resultList.push(`help on ${prefix}${targetName}:`)
        command.description ? resultList.push(`- description: ${command.description}`) : resultList.push(`- no description provided`)
        command.usage ? resultList.push(`- usage: ${prefix}${targetName} ${command.usage}`) : resultList.push(`- usage: ${prefix}${targetName}`)
        if (command.options) {
            let optionList = []
            for (const opt in command.options) {
                optionList.push(`${optionPrefix}${opt} ${command.options[opt]}`)
            }
            resultList.push(`- option(s): ${optionList.join(" ; ")}`);
        }
        const aliases = []
        for (const alias in commandHelper.aliasList) {
            if (commandHelper.aliasList[alias].command == targetName) {
                if (alias.option) {
                    aliases.push(`${prefix}${alias} : ${prefix}${targetName} ${commandHelper.aliasList[alias].option}`)
                } else {
                    aliases.push(`${prefix}${alias} : ${prefix}${targetName}`)
                }
            }
        }
        if (aliases.length)
            resultList.push(`- alias(es): ${aliases.join(" ; ")}`)
        state.message += `${resultList.join("\n")}\n`;
    },
}

commandHelper.aliasList.h  = { command:"help"}

commandHelper.commandList.aliases = {
    name: "aliases", 
    description: 'List aliases for commands',
    options: { c: "to make the ai continue the story" },
    execute: function(args) {
        if (args && args[0] && args[0].startsWith(settings.commandHandler.optionPrefix)) {
            options = args.shift();
            if (options.indexOf("c") >= 0) {
                this.dontConsume = { input: "deleteInput" };
            }
        }

        const prefix = settings.commandHandler.prefix
        const aliases = commandHelper.aliasList
        const commandList = commandHelper.commandList
        
        let resultList = []
        for (const a in aliases) {
            if (!commandList[aliases[a].command].hide && !commandList[aliases[a].command].deactivate) {
                aliases[a].option ?
                    resultList.push(`${prefix}${a} : ${prefix}${aliases[a].command} ${aliases[a].option}`) :
                    resultList.push(`${prefix}${a} : ${prefix}${aliases[a].command}`)
            }
        }//.forEach(c => resultList.append(prefix + c.name))
        state.message += `List of aliases: \n${resultList.join(", ")}\n`;
    }
}


commandHelper.commandList.redo = {
description: 'redo last command with same argument',
noredo: true,  //if redoing a redo was allowed, it would remove the last commands info... x)
    execute: function(args) {
        const commandList = commandHelper.commandList

        const command = commandList[state.lastCommand]
        let text
        if (command) {
            text = command.execute(state.lastArgs)
            if (command.dontConsume) {
                this.dontConsume = {}

                this.dontConsume.input =
                    command.dontConsume.input ?
                        command.dontConsume.input : commandName
                if (command.dontConsume.inputArgs) {
                    this.dontConsume.inputArgs = command.dontConsume.inputArgs
                }

                this.dontConsume.context =
                    command.dontConsume.context ?
                        command.dontConsume.context : commandName
                if (command.dontConsume.contextArgs) {
                    this.dontConsume.contextArgs = command.dontConsume.contextArgs
                }

                this.dontConsume.output =
                    command.dontConsume.output ?
                        command.dontConsume.output : commandName
                if (command.dontConsume.outputArgs) {
                    this.dontConsume.outputArgs = command.dontConsume.outputArgs
                }
            }else if (command.queryAI){
                this.queryAI = {}

                this.queryAI.context =
                    command.queryAI.context ?
                        command.queryAI.context : commandName
                if (command.queryAI.contextArgs) {
                    this.queryAI.contextArgs = command.queryAI.contextArgs
                }

                this.queryAI.output =
                    command.queryAI.output ?
                        command.queryAI.output : commandName
                if (command.queryAI.outputArgs) {
                    this.queryAI.outputArgs = command.queryAI.outputArgs
                }

            }
        }else {
            throw "nothing to redo.\n"
        }
    }
}