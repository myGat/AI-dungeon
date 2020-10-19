
commandHelper = {
    commandList: {
        // requires at least listCommand (to send error messages)
        listCommands: {
            name: "listCommands",
            description: 'display a list of available commands',
            options: {c: "to make the ai continue the story"},
            execute: function(args) {
                if (args && args[0] && args[0].startsWith("-")){
                    if (args[0].indexOf("c") >= 0){
                        this.dontConsume = {input: "deleteInput"};
                    }
                }

                let resultList=[]
                const prefix = settings.commandHandler.prefix
                for (const c in commandHelper.commandList){
                  const command = commandHelper.commandList[c]
                  if (command.hide || command.deactivate || !command.execute)
                    {}
                  else if (command.usage)
                    {resultList.push(`${prefix}${c} ${command.usage}`)}
                  else
                    {resultList.push(`${prefix}${c}`)}
                }//.forEach(c => resultList.append(prefix + c.name))
                state.message += `List of commands: ${resultList.join(", ")}\n`; 
            },
        },
        //utilitary for some commands with -c option
        deleteInput: {
            deactivate: true,
            input: (input) => {return ""}
        }
    }, 
    aliasList: {
        lc  : { command:"listCommands"},
    },
    
    analyseAndExecuteCommand: (text) => {
        //TODO: not transform the text into list, so all functions in commadList can take a text as argument and return a text. 
        const args = text.split(/ +/); // Create a list of the words provided.
        const commandNameOrAlias = args.shift(); // Fetch and remove the actual command from the list.
        //state.message += text

        let consume = true 
          
        let commandName, command
        if (commandNameOrAlias in commandHelper.commandList)
        {
          if (!commandHelper.commandList[commandNameOrAlias].deactivate
              && commandHelper.commandList[commandNameOrAlias].execute){
            commandName = commandNameOrAlias;
            command = commandHelper.commandList[commandNameOrAlias];
          }
        } else if (commandNameOrAlias in commandHelper.aliasList) {
          commandName = commandHelper.aliasList[commandNameOrAlias].command
          if (commandHelper.commandList[commandName] 
              && !commandHelper.commandList[commandName].deactivate
              && commandHelper.commandList[commandName].execute){
            command = commandHelper.commandList[commandName] 
            if (commandHelper.aliasList[commandNameOrAlias].option) 
              args.unshift(commandHelper.aliasList[commandNameOrAlias].option)
          }
        }
    
        if (!command) 
        {
            commandHelper.commandList.listCommands.execute()
            throw `Invalid Command\nCommand ${settings.commandHandler.prefix}${commandNameOrAlias} do not exist.\n`;
        } // Command is not in the list, lets exit early.
    
        let initArgs
        if (!command.noredo)
          initArgs = [...args] //args may be modified by the command... (maybe there's a better way?)
            
        command.execute(args);
        state.commandHandler.currentCommand = commandName

        if (command.forceOutput){
          state.modules.forceOutput = command.forceOutput
        }
        if (command.dontConsume){
          consume = false

          state.commandHandler.input = command.dontConsume.input ?
              command.dontConsume.input : commandName
          // if (command.dontConsume.input){
          //   state.commandHandler.input = command.dontConsume.input
          // }
          if (command.dontConsume.inputArgs){
            state.commandHandler.inputArgs = command.dontConsume.inputArgs
          }
    
          state.commandHandler.context = command.dontConsume.context ?
              command.dontConsume.context : commandName
          // if (command.dontConsume.context){
          //   state.commandHandler.context = command.dontConsume.context
          // }
          if (command.dontConsume.contextArgs){
            state.commandHandler.contextArgs = command.dontConsume.contextArgs
          }

          state.commandHandler.output = command.dontConsume.output ?
              command.dontConsume.output : commandName
          // if (command.dontConsume.output){
          //   state.commandHandler.output = command.dontConsume.output
          // }
          if (command.dontConsume.outputArgs){
            state.commandHandler.outputArgs = command.dontConsume.outputArgs
          }
        }
        else if (command.queryAI){
          state.modules.queryAI = true

          state.commandHandler.output = command.queryAI.output ?
              command.queryAI.output : commandName
          // if (command.queryAI.output){
          //   state.commandHandler.output = command.queryAI.output
          // }
          if (command.queryAI.outputArgs){
            state.commandHandler.outputArgs = command.queryAI.outputArgs
          }
    
          state.commandHandler.context = command.queryAI.context ?
              command.queryAI.context : commandName
          // if (command.queryAI.context){
          //   state.commandHandler.context = command.queryAI.context
          // }
          if (command.queryAI.contextArgs){
            state.commandHandler.contextArgs = command.queryAI.contextArgs
          }
        }
          
        if (!command.noredo){
          state.commandHandler.lastCommand = commandName
          state.commandHandler.lastArgs = initArgs
        }
      return consume
    }
}
