//require to set debugMode and debugVerbosity beforehand - see https://github.com/myGat/AI-dungeon/blob/master/DevTool/modules/debugCommands/debugMode.js

commandHelper.commandList.execute = {
    name: "execute", 
    description: `Execute some javascript instructions. eg /execute state.message = "Hello world!". NB: don't start your javascript with "-", or it will be interpreted as an option of the "esecute" command.`,
    usage: "javascriptInstruction", 
    deactivate: !debugMode,
    options: {
        c: "to make the ai continue the story",
        pi: "to create a permanent instruction executed each input phase",
        pt: "to create a permanent instruction executed each context phase",
        po: "to create a permanent instruction executed each output phase",
        pito: "to create a permanent instruction executed each phase"
    },
    execute: function(args) {
        let options
        if (args && args[0] && args[0].startsWith(settings.commandHandler.optionPrefix)){
            options = args.shift();
        }

        if (!args || args.length == 0){
            throw `${settings.commandHandler.prefix}execute: no argument provided.`
        }

        if (options){
            if (options.indexOf("c") >= 0){
                this.dontConsume = {input: "deleteInput"};
            }
            if (options.indexOf("p") >= 0){
                const phases = []
                if (options.indexOf("i") >= 0){
                    phases.push("input")
                }
                if (options.indexOf("t") >= 0){
                    phases.push("context")
                }
                if (options.indexOf("o") >= 0){
                    phases.push("output")
                }
                if (phases.length == 0){
                    throw `${settings.commandHandler.prefix}execute: p option requires at least the option i, t or o.`
                }
                state.debug.instructions.push({ text: args.join(" "), phases: phases })

                if (debugVerbosity >= 1){
                    state.message += `${args.join(" ")} added to phase ${phases.join(", ")}\n`; 
                }
                return
            }
        }

        let instructions = args.join(" ")
        Function('"use strict";' + instructions )();

        if (debugVerbosity >= 1){
            state.message += `${instructions} executed\n`; 
        }
    }
}

commandHelper.commandList.display = {
    name: "display", 
    description: `display a variable in message. eg /display state.memory.context\nUnfortunaztely I can't decide the timing of the display, so it's at the beginning of eact script.`,
    usage: "variableName",
    deactivate: !debugMode,
    options: {
        c: "to make the ai continue the story",
        i: "display only during input phase",
        t: "display only during context phase",
        o: "display only during output phase"
    },
    execute: function(args) {
        let phases = []
        if (args && args[0] && args[0].startsWith(settings.commandHandler.optionPrefix)){
            options = args.shift();

            if (options.indexOf("c") >= 0){
                this.dontConsume = {input: "deleteInput"};
            }

            if (options.indexOf("i") >= 0){
                phases.push("input")
            }
            if (options.indexOf("t") >= 0){
                phases.push("context")
            }
            if (options.indexOf("o") >= 0){
                phases.push("output")
            }
        }

        if (!args || args.length == 0){
            throw `${settings.commandHandler.prefix}${this.name}: no argument provided.`
        }

        if (phases.length == 0){
            phases = ["input", "context", "output"]
        }

        const varPath = args.join(" ")
        const body = "state.message += `" + varPath + ", ${phase} phase: ${JSON.stringify(" + varPath + ")}\\n`"
        state.debug.instructions.push({ text: body, phases: phases })

        if (debugVerbosity >= 1){
            state.message += `${varPath} added in display\n`; 
        }
    }
}

commandHelper.commandList.debugTips = {
    name: "debugTips", 
    description: `display few debug tips`,
    deactivate: !debugMode,
    options: {
        c: "to make the ai continue the story",
    },
    execute: function(args) {
        let phases = []
        if (args && args[0] && args[0].startsWith(settings.commandHandler.optionPrefix)){
            options = args.shift();

            if (options.indexOf("c") >= 0){
                this.dontConsume = {input: "deleteInput"};
            }
        }

        state.message += `Create a Hello world command:\n`
        state.message += `/exe -pi commandHelper.commandList.hello = { execute: function(args) { state.message = "Hello world!" }}\n`
        state.message += `Call your Hello world command:\n`
        state.message += `/hello \n`
        state.message += `Destroy your Hello world command:\n`
        state.message += `/exe state.debug.instructions.splice(0,1)\n`
        state.message += `There's no command to destroy a permanent debug instruction or a display command, but those are stored in state.debug.instructions; destroy them by manipulating the array as above.\n`
    }
}

debug = {
    name: "debug", 
    // onEnd: true, //maybe I should activate this, so I have "process()" at the start of scripts and "input()/output()/context()" at the end ?
    init: function(){
		state.debug.instructions = []
	}, 
	functions: {
		execute: function(phase){
            for (const instruction of state.debug.instructions) {
                if (instruction.phases.includes(phase)) {
                    try {
                        let evaluation = Function("phase", '"use strict";' + instruction.text)(phase);

                        if (debugVerbosity >= 1){
                            state.message += `${instruction.text} executed in ${phase}\n`; 
                        }
                    } catch (error) {
                        state.message += `debug, phase ${phase}: cannot execute ${instruction.text}: ${error}\n`
                    }
                }
            }
        }
	},
	// consume: function(input){
    //     this.functions.execute("input");
    //     return false}, 
    /*
     * unfortunately this won't work: 
     * only the module asking for a query is called
     * have to find another way to output stuff during context and output :/
	queryContext: function(context){
        this.functions.execute("context");
        return context
    }, 
	getQuery: function(output){
        this.functions.execute("output");
    }, 
    */

    /*
     * for now, only process is activated.
	input: function(input){
        this.functions.execute("input");
        return input
    }, 
	output: function(output){
        this.functions.execute("output");
        return output
    }, 
	context: function(context){
        this.functions.execute("context");
        return context
    }, 
    */
	process: function(type){
        this.functions.execute(type);
    }, 
	info: {
		code: "https://github.com/myGat/AI-dungeon/blob/master/DevTool/modules/debugCommands/debug.js",
		description: "A module for debug purpose, to execute some command from the story." 
	},
	version: "0.1.4", 
	minVersion: "0.1.4" 
}

commandHelper.aliasList.exe = { command:"execute"} 
