commandHandler = {
    name:"commandHandler",
    // init:function(){
    //   state.commandHandler.commandList = {},
    //   state.commandHandler.aliasList = {}
    // },
    consume:function(input){
      const possibleTextStarts=[
        {start: "", end: ""}, 
        {start: "\n> You say \"", end: "\"\n"}, 
        {start: "\n> You ", end: ".\n"}, 
        {start: "\n", end: ""}
      ]

      currentStart = possibleTextStarts.find( 
        (pts) => input.startsWith(pts.start + settings.commandHandler.prefix)
      )

      if (currentStart){
        try
        {
          //TODO: better handling of the end of the "do/say" than a substring...
          modifiedText = commandHelper.analyseAndExecuteCommand(
            input.substring(currentStart.start.length + settings.commandHandler.prefix.length, 
                            input.length - currentStart.end.length)
          )
        }
        catch (error) 
        {
          state.message += `Error: ${error}\n`
          state.message += `Your message: ${input}`
          state.modules.queryAI = false
          modifiedText = ""
        }
        return true
      }
        // if (input.startsWith(pts.start + settings.commandHandler.prefix)) {
        //   const args = text.slice(settings.commandHandler.prefix.length).split(/ +/); // Create a list of the words provided.
        //   const commandName = args.shift(); // Fetch and remove the actual command from the list.
        //   if (!(commandName in state.commandHandler.commandList)) {state.message += "Invalid Command!"; return true;} // Command is not in the list, lets exist early.
        //   const command = state.commandHandler.commandList[commandName];
        
        // if (command.args && !args.length) {//If the command expects to be passed arguments, but none are present then
        //   let reply = `You didn't provide any arguments!\n`
        //   if (command.usage) {reply += `Example: \`${settings.commandHandler.prefix}${command.name} ${command.usage}\``;} // Provide instructions for how to use the command if provided.
        //   state.message += reply;
        //   return true;
        // }
        
        
    //     try{functions[command.module][command.name](args);}
    //     catch (error) {state.message = `There was an error!\n${error}`;}
    //     return true
    //   }
      return false
    },
    queryContext: function(context){
      let modifiedContext = context
      if (state.commandHandler) {
        if (state.commandHandler.context) {
          if (state.commandHandler.context in commandHelper.commandList
              && commandHelper.commandList[state.commandHandler.context].context) {
            try {
              modifiedContext = commandHelper.commandList[state.commandHandler.context].context(context)
            }
            catch (error) {
              state.message += `Bug in context: ${error}\n`
            }
          }
        }

        delete state.commandHandler.context
        delete state.commandHandler.contextArgs

      }
      return modifiedContext
    },
    getQuery: function(output){
      let modifiedOutput = output
      if (state.commandHandler){
        if (state.commandHandler.output){
          if (state.commandHandler.output in commandHelper.commandList
              && commandHelper.commandList[state.commandHandler.output].output) {
            try
            {
              modifiedOutput = commandHelper.commandList[state.commandHandler.context].context(context)
            }
            catch(error)
            {
              state.message += `Bug in output: ${error}\n`
            }
          }
        }

        delete state.commandHandler.output
        delete state.commandHandler.outputArgs

      }
      state.modules.forceOutput = modifiedOutput
    },
    settings:[{name:"prefix", default:"/"}],
    info: {
  		code: "",
  		description: "An module that handle commands (add commands in commandHelper.commandList"
	  },
    version:"1.0.0",
    minVersion:"0.1.4",

  }