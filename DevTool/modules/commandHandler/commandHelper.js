
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
                        this.dontConsume = true;
                        this.input = "deleteInput"
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
    
        //   let initArgs
        //   if (!command.noredo)
        //     initArgs = [...args] //args may be modified by the command... (maybe there's a better way?)
            
        command.execute(args);
        state.commandHandler.currentCommand = commandName

        if (command.forceOutput){
          state.modules.forceOutput = command.forceOutput
        }
        if (command.dontConsume){
          consume = false
          if (command.input)
          {
            state.commandHandler.input = command.input
          }
          if (command.inputArgs){
            state.commandHandler.inputArgs = command.inputArgs
          }
        }
        else if (command.queryAI){
          state.modules.queryAI = true
        }

        if (command.dontConsume || command.queryAI){
          if (command.output)
          {
            state.commandHandler.output = command.output
          }
          if (command.outputArgs){
            state.commandHandler.outputArgs = command.outputArgs
          }
    
          if (command.context)
          {
            state.commandHandler.context = command.context
          }
          if (command.contextArgs){
            state.commandHandler.contextArgs = command.contextArgs
          }
        }
    
    
          //commandHandler.executedCommandName = commandName
          
        //   if (!command.noredo){
        //     state.lastCommand = commandName
        //     state.lastArgs = initArgs
        //   }
      return consume
    }
}
