
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
                        this.queryAI = true;
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
    
                return "";
            },
        },
    }, 
    aliasList: {
        lc  : { command:"listCommands"},
    },
    
    analyseAndExecuteCommand: (text) => {
        //TODO: not transform the text into list, so all functions in commadList can take a text as argument and return a text. 
        const args = text.split(/ +/); // Create a list of the words provided.
        const commandNameOrAlias = args.shift(); // Fetch and remove the actual command from the list.
        //state.message += text
          
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
            
        const modifiedText = command.execute(args);
        if (command.forceOutput){
          state.modules.forceOutput = command.forceOutput
        }
        if (command.queryAI){
          state.modules.queryAI = true
    
          if (command.queryAI.output)
          {
            state.commandHandler.output = command.queryAI.output
          }
          if (command.queryAI.outputArgs){
            state.commandHandler.outputArgs = command.queryAI.outputArgs
          }
    
          if (command.queryAI.context)
          {
            state.commandHandler.context = command.queryAI.context
          }
          if (command.queryAI.contextArgs){
            state.commandHandler.contextArgs = command.queryAI.contextArgs
          }
        }
    
    
          //commandHandler.executedCommandName = commandName
          
        //   if (!command.noredo){
        //     state.lastCommand = commandName
        //     state.lastArgs = initArgs
        //   }
      
    }
}
