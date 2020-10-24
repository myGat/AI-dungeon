debugMode = true //set to false to deactivate the debug commands
debugVerbosity = 0 //send to 1 to have some messages send by debug commands 

// /exe -pi commandHelper.commandList.hello = { execute: function(args) { state.message = "Hello world!" }}
// /exe state.debug.instructions.splice(0,1)

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
          state.message += `Your message: ${input}\n`
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
    settings:[{name:"prefix", default:"/"}, {name:"optionPrefix", default:"-"}],
    info: {
  		code: "",
  		description: "An module that handle commands (add new commands in commandHelper.commandList"
	  },
    version:"0.1.4",
    minVersion:"0.1.4",

  }

commandHelper = {
    commandList: {
        // requires at least listCommand (to send error messages)
        listCommands: {
            name: "listCommands",
            description: 'display a list of available commands',
            options: {c: "to make the ai continue the story"},
            execute: function(args) {
                if (args && args[0] && args[0].startsWith(settings.commandHandler.optionPrefix)){
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
          if (command.dontConsume.inputArgs){
            state.commandHandler.inputArgs = command.dontConsume.inputArgs
          }
    
          state.commandHandler.context = command.dontConsume.context ?
              command.dontConsume.context : commandName
          if (command.dontConsume.contextArgs){
            state.commandHandler.contextArgs = command.dontConsume.contextArgs
          }

          state.commandHandler.output = command.dontConsume.output ?
              command.dontConsume.output : commandName
          if (command.dontConsume.outputArgs){
            state.commandHandler.outputArgs = command.dontConsume.outputArgs
          }
        }
        else if (command.queryAI){
          state.modules.queryAI = true

          state.commandHandler.output = command.queryAI.output ?
              command.queryAI.output : commandName
          if (command.queryAI.outputArgs){
            state.commandHandler.outputArgs = command.queryAI.outputArgs
          }
    
          state.commandHandler.context = command.queryAI.context ?
              command.queryAI.context : commandName
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
		code: "",
		description: "A module for debug purpose, to execute some command from the story." 
	},
	version: "0.1.4", 
	minVersion: "0.1.4" 
}

commandHelper.aliasList.exe = { command:"execute"} 

let settings = {
  
}

let modules = [
  {name:"modules",init:function(){state.modules.initialized = true; state.modules.contextIsContinue = true}},
  debug,
  commandHandler
]


const version = "0.1.4"
const breakVersion = "0.1.0"

function versionGreater(version1, version2){
  const split1 = version1.split(".")
  const split2 = version2.split(".")
  for(let i = 0; i <= 3; i++){
    if(Number(split1[i])>Number(split2[i])) return true
    if(Number(split1[i])<Number(split2[i])) return false
  }
  return false
}

function error(errorText){
  state.message += '\n' + errorText;
  console.log(errorText)
  state.modules.errored = true;
}

function checkRequirements(module){
  if(module.requirements) for(requirement of module.requirements) {
    let requirementFufilled = false
    if(typeof requirement === "string" && requirement.startsWith("#")){
      let tag = requirement.substring(1)
      for(module2 of modules) if(module2 !== module && module2.tags) for(tag2 of module2.tags){
        if(tag === tag2) requirementFufilled = true
      }
    }else{
      for(module2 of modules) {
        if(requirement === module2.name){
          requirementFufilled = true
        }else if(requirement.name && requirement.name === module2.name){
          requirementFufilled = true
        }
      }
    }
    if(!requirementFufilled){
      let errorText = "requirement " + (requirement.name?requirement.name:requirement) + " is unsatisfied"
      if(requirement.url) errorText += ", but it can be found at " + requirement.url
      error(errorText)
    }
  }
}

function checkIncompatibilities(module){
  if(module.incompatibles) for(incompatible of module.incompatibles) {
    let incompatibility = false
    if(incompatible.startsWith("#")){
      let tag = incompatible.substring(1)
      for(module2 of modules) if(module2 !== module && module2.tags) for(tag2 of module2.tags){
        if(tag === tag2) incompatibility = true
      }
    }else{
      for(module2 of modules) {
        if(incompatible === module2.name) incompatibility = true
      }
    }
    if(incompatibility){
      error("module " + module.name + " is incompatible with " + incompatible)
    }
  }
}

function uniqBy(a, key) {
    var seen = {};
    return a.filter(function(item) {
        var k = key(item);
        return seen.hasOwnProperty(k) ? false : (seen[k] = true);
    })
}

function calculateOrder(){
  for(module of modules) if(module.order) for(orderElem of module.order){
      let inScript = false
      for(module2 of modules) if(orderElem.name === module2.name) inScript = true
      if(!inScript) module.order.splice(module.order.indexOf(orderElem), 1)
    }
    
  for(module of modules) if(module.order) for(orderElem of module.order){
      if(orderElem.location === "after"){
        for(module2 of modules) if(orderElem.name === module2.name) {
          if(!module2.order) module2.order = []
          module2.order.push({name:module.name,location:"before"})
        }
        module.order.splice(module.order.indexOf(orderElem), 1)
      }
    }
  for(module of modules) if(module.order) module.order = uniqBy(module.order, JSON.stringify)
  for(module of modules) module.level = 0
  
  let settled = true
  let maxLevel = 0;
  do {
    settled = true
    for(module of modules) if(module.order) for(orderElem of module.order) for(module2 of modules) if(module2.name === orderElem.name){
      if(module2.level >= module.level){
        module.level = module2.level + 1
        if(module.level > maxLevel) maxLevel = module.level
        settled = false
      }
    }
    
  }while(!settled)
  
  state.modules.order = []
  for(let level = 0; level <= maxLevel; level++){
    for(module of modules) if(module.level == level && module.onEnd === false) state.modules.order.push(modules.indexOf(module))
    for(module of modules) if(module.level == level && module.onEnd === undefined) state.modules.order.push(modules.indexOf(module))
    for(module of modules) if(module.level == level && module.onEnd === true) state.modules.order.push(modules.indexOf(module))
  }
}

// initialize state.module_name and settings.module_name for you
for(module of modules) if(state[module.name] === undefined) state[module.name] = {}
for(module of modules) if(settings[module.name] === undefined && module.settings) settings[module.name] = []

if(!state.modules.initialized){
  const keyList = ["name","tags","requirements","incompatibles","order","onEnd","init","functions","consume","queryContext","getQuery","input","output","context","process","settings","info","version","minVersion"]
  for(module of modules) if(module.version && versionGreater(breakVersion, module.version)) error("There has been a breaking change since module " + module.name + " was developed")
  for(module of modules) if(module.minVersion && versionGreater(module.minVersion, version)) error("Your module version is too out of date for " + module.name + ", please update")
  
  for(module of modules) {
    for(module2 of modules) if(module.name === module2.name && module !== module2){
      error('Two modules cannot have the same name but there are multiple modules with the name "' + module.name + '"')
      break
    }
    for(var key in module){
      if(!keyList.includes(key)) error("Property " + key + " in module " + module.name + " is not valid in the current schema")
    }
    checkRequirements(module)
    checkIncompatibilities(module)
    if(module.settings) for(setting of module.settings) {
      if(settings[module.name][setting.name] === undefined){
        if(setting.default === undefined){
          error('Setting ' + setting.name + ' is required because it does not have a default value, but it is not included')
        }
      }
    }
  }
  calculateOrder()
}

for(module of modules) {
  if(module.settings) for(setting of module.settings) {
    if(settings[module.name][setting.name] === undefined){
      settings[module.name][setting.name] = setting.default
    }
  }
}

let functions = []
for(module of modules) {
  if(module.functions) functions[module.name] = module.functions
}

if(!state.modules.initialized){
  for(i of state.modules.order) if(modules[i].init) modules[i].init()
}

if (!state.message){
  state.message = ""
}
state.memory.context = memory
state.memory.frontMemory = ""
state.memory.authorsNote = ""

