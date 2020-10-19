commandHandler = {
    name:"commandHandler",
    // init:function(){
    //   state.commandHandler.commandList = {},
    //   state.commandHandler.aliasList = {}
    // },
    consume:function(input){
      delete state.commandHandler.isExecutingCommand
      delete state.commandHandler.currentCommand

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
        let consume = true
        state.commandHandler.isExecutingCommand = true
        try
        {
          //TODO: better handling of the end of the "do/say" than a substring...
          consume = commandHelper.analyseAndExecuteCommand(
            input.substring(currentStart.start.length + settings.commandHandler.prefix.length, 
                            input.length - currentStart.end.length)
          )
        }
        catch (error) 
        {
          state.message += `Error: ${error}\n`
          state.message += `Your message: ${input}`
          state.modules.queryAI = false
          consume = true
        }
        
        return consume
      }
      return false
    },
    input: function(input){
      let modifiedInput = input
      if (state.commandHandler) {
        if (state.commandHandler.input) {
          if (state.commandHandler.input in commandHelper.commandList
              && commandHelper.commandList[state.commandHandler.input].input) {
            try {
              modifiedInput = commandHelper.commandList[state.commandHandler.input].input(modifiedInput)
            }
            catch (error) {
              state.message += `commandHandler: bug in input: ${error}\n`
            }
          }
        }

        delete state.commandHandler.input
        delete state.commandHandler.inputArgs

      }
      return modifiedInput
    },
    context: function(context){
      let modifiedContext = context
      if (state.commandHandler) {
        if (state.commandHandler.context) {
          if (state.commandHandler.context in commandHelper.commandList
              && commandHelper.commandList[state.commandHandler.context].context) {
            try {
              modifiedContext = commandHelper.commandList[state.commandHandler.context].context(modifiedContext)
            }
            catch (error) {
              state.message += `commandHandler: bug in context: ${error}\n`
            }
          }
        }

        delete state.commandHandler.context
        delete state.commandHandler.contextArgs

      }
      return modifiedContext
    },
    output: function(output){
      let modifiedOutput = output
      if (state.commandHandler) {
        if (state.commandHandler.output) {
          if (state.commandHandler.output in commandHelper.commandList
              && commandHelper.commandList[state.commandHandler.output].output) {
            try {
              modifiedOutput = commandHelper.commandList[state.commandHandler.output].output(modifiedOutput)
            }
            catch (error) {
              state.message += `commandHandler: bug in output: ${error}\n`
            }
          }
        }

        delete state.commandHandler.output
        delete state.commandHandler.outputArgs

      }
      return modifiedOutput
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
              state.message += `commandHandler: bug in context: ${error}\n`
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
              state.message += `commandHandler: bug in output: ${error}\n`
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