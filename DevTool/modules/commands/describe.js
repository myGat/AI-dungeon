// requires ../../utils.isNullOrWhiteSpace

commandHelper.commandList.describe = {
    name: "describe", 
    description: "Try to force the AI to describe something by temporarily filling the frontMemory",
    usage: 'text',
    execute: function (args) {
        if (!args || args.length == 0) {
            throw `${settings.commandHandler.prefix}describe: no argument provided.`
        }

        if (!isNullOrWhiteSpace(state.memory.frontMemory)){
          this.dontConsume.outputArgs = [state.memory.frontMemory]
        }
        const textToDisplay = args.join(' ');
        state.memory.frontMemory = `[ Author's note: the following paragraphs describe ${textToDisplay}. The text is very descriptive about it. ]`;
    },
    dontConsume: {},
    output: function(output){
        if (state.commandHandler.outputArgs){
          state.memory.frontMemory = state.commandHandler.outputArgs[0]
        }else{
            delete state.memory.frontMemory
        }
        //isNullOrWhitespace(text) ? delete state.memory.frontMemory : state.memory.frontMemory = textToDisplay;
        return output
    }
}

commandHelper.commandList.describePrompt = {
    name: "describePrompt", 
    description: 'Try to force the AI to describe something using a visible prompt',
    usage: 'text',
    noredo: true, //no need to redo it since the prompt stay
    execute: function (args) {
        if (!args || args.length == 0) {
            throw `${settings.commandHandler.prefix}${this.name}: no argument provided.`
        }

        this.dontConsume.inputArgs = args;
    },
    dontConsume: {},
    input: function(input){
        return `\n> Describe ${state.commandHandler.inputArgs.join(' ')}`;
    }
}

commandHelper.aliasList.d = { command:"describe"} 
commandHelper.aliasList.dp = { command:"describePrompt"} 