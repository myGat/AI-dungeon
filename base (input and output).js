    
// Part of this script were taken from script published by other people. 
// The base structure of the command manager was taken from Zynj: https://github.com/Zynj-git/AIDungeon/blob/master/AID-Script-Examples/commandManager/input/commandManager.js
// Some code snippets were taken from cantino: https://github.com/AIDungeon/Scripting

// Feel free to copy, use, alter etc.
// Use those scripts in play on the scenario at this adress: https://play.aidungeon.io/main/scenarioView?publicId=82abe130-f6b4-11ea-a1ae-2f8f54760f13

// commandList contains a list of usable commands
// - they can be used in the script using commandList.<name of the command>.execute(args)
// - they can have a hide property, meaning they can be used by the user but are not displayed in the list of command/aliases etc
// - they can have a deactivate property, meaning they can't be used anymore by the user - but they are still usable in the script.
// - they can have an outputFunction property, sending to the outputScript the name of a function to execute.
// - they can be added in a set of function is the state object, functions in that list is automatically executed each time the inputScript is executed, a bit like a deleguate. 
//        (it's a set to avoid a possible memory leak if some command add something to the list but forget to remove it).
// - each those function should take a text as an argument and send a text as return (each one acts like a small text modifier)

// the actual scenario script is intended to be put in the scenarioScript function

// interesting commands :
// /describeMore <text> to try to force the AI to describe something (use a temporary FrontMemory)
// /describePrompt <text> to try to force the IA to generate a description just by creating a prompt "> Describe <text>." 
//                        It works far, far better than I excepted (although I didn't test it much)
// /updateFront -t <text> to create a temporary frontMemory that will be reverted to it's old state after the AI's answer.
// /updateFront -tn <text> same as above, but encapsulate the text into an author's note for a less agressive behavior.
// /redo to redo one of the above command in case the result wasn't satifying (most command leave the prompt empty, there's no way to redo them)
// /updateRandomFront <probability> <text> create a frontMemory that may appears randomly each turn, with the given probability. 
//                                         eg: "/updateRandomFront 0.33 Your wounds are so painful, you can't act normally."
//                                         Can be useful in a hard scenario, if you want to hamper the ability of the player to act 
//                                         (since the frontMemory has a tendancy to make the AI ignore the player's input) :
//                                         while not preventing him any action (the randomFront doesn't activate each turn),
//                                         sometime the AI will completely ingore what he's doing.
// /updateRandomFront -n <probability> <text> same as above, except the fromtMemory is encapsulated into an author's note for less agressive behavior.

// TODO: allow to enter the command in the middle of the text, so that "<text> \command <args> makes a prompt using <text>


const defaultNote = ''
const defaultBack = ''
const defaultFront = ""
const verbosity = 1 //not really implemented... x) Although I've put a condition "verbosity >= 0" for bug messages: bugs should always be reported and ask the user to copy the error in comment even with no verbosity
const version = "gatScript v1.12\n"

const prefix = "/"
const optionPrefix = "-"


let isCommand //becomes true if a command is detected
let executedCommandName //contains the name of the command once a command is detected (filled after the execution - ie, isCommand = true and no executedCommandName means there was a problem with the command)
let bug //becomes true in catch blocks

const commandList = { // Store a function in state with the intention of being able to call from both input / output script without duplicating code.
    listCommands: 
        {
        description: 'display a list of available commands',
        execute:
            () =>
            {
                let resultList=[]
                for (const c in commandList)
                {
                  if (commandList[c].hide || commandList[c].deactivate)
                    {}
                  else 
                  if (commandList[c].usage)
                    {resultList.push(`${prefix}${c} ${commandList[c].usage}`)}
                  else
                    {resultList.push(`${prefix}${c}`)}
                }//.forEach(c => resultList.append(prefix + c.name))
                state.message += `List of commands: ${resultList.join(", ")}\n`; 

                return "";
            },
        outputFunction: "trash"
        },
    help:
        {
        description: 'help about a command',
        usage: '<commandName>',
        args: true,
        execute:
            (args) =>
            {
                const targetName = args[0].replace(prefix, "")
                const command = commandList[targetName]
                if (!command)
                {
                  state.message += `help: command ${args[0]} does not exist.\n`;
                  commandList.listCommands.execute();
                  return "";
                }
                
                //const command = commandList[targetCommand]
                let resultList=[]
                resultList.push(`help on ${prefix}${targetName}:`)
                command.description ? resultList.push(` - description: ${command.description}`) : resultList.push(` - no description provided`) 
                command.usage ? resultList.push(` - usage: ${prefix}${targetName} ${command.usage}`) : resultList.push(`usage: ${prefix}${targetName}`)
                if (command.options){
                  let optionList =[]
                  for (const opt in command.options){
                    optionList.push(`${optionPrefix}${command.options[opt].name} ${command.options[opt].description}`)
                  }
                  resultList.push(` - option(s): ${optionList.join(" ; ")}`) ;
                }
                let aliasList = []
                for (const alias in aliases){
                  if (aliases[alias].command == targetName){
                    if (aliases[alias].option){
                      aliasList.push(`${prefix}${alias} : ${prefix}${targetName} ${aliases[alias].option}`)
                    }else{
                      aliasList.push(`${prefix}${alias} : ${prefix}${targetName}`)
                    }
                  }
                }
                if (aliasList.length)
                  resultList.push(` - alias(es): ${aliasList.join(" ; ")}`)
                state.message += `${resultList.join("\n")}\n`;

                return "";
            },
        outputFunction: "trash"
        },
    aliases: 
        {
        description: 'List shortcuts for commands',
        execute:
            () =>
            {
                let resultList=[]
                for (const a in aliases)
                {
                  if (!commandList[aliases[a].command].hide && !commandList[aliases[a].command].deactivate){
                    aliases[a].option ?
                      resultList.push(`${prefix}${a} : ${prefix}${aliases[a].command} ${aliases[a].option}`) :
                      resultList.push(`${prefix}${a} : ${prefix}${aliases[a].command}`) 
                  }
                }//.forEach(c => resultList.append(prefix + c.name))
                state.message += `List of shortcuts: ${resultList.join(", ")}\n`; 

                return "";
            },
        outputFunction: "trash"
        },
    updateNote: 
        {
        description: 'Changes authorsNote',
        usage: '<text>',
        options: {c: "to make the ai continue the story",
                  t: "to create a temporary frontMemory (forces the -c option)"
                  },
          //TODO: options -a append, -t temp, -at
        execute:
            (args) =>
            {
                if (args[0] && args[0].startsWith("-")){
                  const options = args.shift();
                  if (options.indexOf("t") >= 0){
                    commandList.updateNote.outputArgs = [state.memory.authorsNote];
                    commandList.updateNote.outputFunction = "revertNote"
                  }
                  else if (options.indexOf("c") >= 0){
                    //-ct: -t takes preseance
                    delete commandList.updateNote.outputFunction;
                  }
                }

                const textToDisplay = args.join(' ');
                if (isNullOrWhitespace(textToDisplay))
                  {delete state.memory.authorsNote;}
                else
                  {state.memory.authorsNote = textToDisplay;}

                return "";
            },
        outputFunction: "trash"
        },
    displayNote: 
        {
        description: 'display authorsNote',
        execute:
            () =>
            {
                state.message += `Current author's note: ${state.memory.authorsNote}\n`; 

                return "";
            },
        outputFunction: "trash"
        },
    clearNote: 
        {
        description: 'clear authorsNote',
        execute:
            () =>
            {
                delete state.memory.authorsNote; 

                return "";
            },
        outputFunction: "trash"
        },
    resetNote: 
        {
        description: "reset authorsNote to its initial's value",
        hide: isNullOrWhitespace(state.defaultNote),
        execute:
            () =>
            {
                commandList.updateNote.execute([state.defaultNote]); 

                return "";
            },
        outputFunction: "trash"
        },
    updateFront: 
        {
        description: 'Changes frontMemory',
        usage: '<text>',
        options: {n: "to encapsulate the frontMemory into an Author's note (less agressive behavior)",
                  c: "to make the ai continue the story",
                  t: "to create a temporary frontMemory (forces the -c option)"
                  },
          //TODO: -a append
        execute:
            (args) =>
            {
                if (args[0] && args[0].startsWith("-")){
                  const options = args.shift();
                  if (options.indexOf("n") >= 0){
                    args.unshift("[ Author's note: ");
                    args.push(" ]");
                  }
                  if (options.indexOf("t") >= 0){
                    commandList.updateFront.outputArgs = [state.memory.frontMemory];
                    commandList.updateFront.outputFunction = "revertFront"
                  }
                  else if (options.indexOf("c") >= 0){
                    //-ct: -t takes preseance
                    delete commandList.updateFront.outputFunction;
                  }
                }
                
                const textToDisplay = args.join(' ');
                if (isNullOrWhitespace(textToDisplay))
                  {delete state.memory.frontMemory;}
                else 
                  {state.memory.frontMemory = textToDisplay;}

                return "";
            },
        outputFunction: "trash"
        },
    displayFront: 
        {
        description: 'display frontMemory',
        execute:
            () =>
            {
                state.message += `Current front memory: ${state.memory.frontMemory}\n`; 

                return "";
            },
        outputFunction: "trash"
        },
    clearFront: 
        {
        description: 'delete frontMemory',
        execute:
            (args) =>
            {
                delete state.memory.frontMemory; 

                return "";
            },
        outputFunction: "trash"
        },
    resetFront: 
        {
        description: 'reset frontMemory',
        hide: isNullOrWhitespace(defaultFront),
        execute:
            () =>
            {
                commandList.updateFront.execute([defaultFront]); 

                return "";
            },
        outputFunction: "trash"
        },
    updateRandomFront: 
        {
        description: "create a random frontMemory; at each player's input it has a probability of being used",
        usage: `{optionPrefix}options <number between 0 and 1> <text>`,
        args: true, 
        options: {n: "to encapsulate the frontMemory into an Author's note (less agressive behavior)",
                  c: "to make the ai continue the story"
                 },
          //TODO: -a append
        execute:
            (args) =>
            {
                let options = ""
                if (args[0] && args[0].startsWith("-")){
                  options = args.shift();
                  if (options.indexOf("c") >= 0){
                    //-ct: -t takes preseance
                    delete commandList.updateRandomFront.outputFunction;
                  }
                }
                
                const probability = Number(args.shift()) //Number more restrictive than other conversion... Intended, since it may be a user's input
                if (isNaN(probability))
                  throw `${prefix}updateRandomFront requires a number as probability\nUsage: ${prefix}updateRandomFront <probability> <text> or ${prefix}updateRandomFront -op <probability> <text>`
                
                if (probability <=0)
                  state.message += "Warning: your random frontMemory has a probability lower than 0 and will never be used"
                else if (probability >= 1)
                  state.message += "Warning: your random frontMemory has a probability greter than 1 and will always be used"
                
                const text = options.indexOf("n") >= 0 ? `[ Author's note: ${args.join(' ')} ]` : args.join(' ') ;
                state.randomFront = {
                  possibleTexts: [text], 
                  probability: probability
                }
                addInputFunction("randomFront")
                
                return "";
            },
        outputFunction: "trash"
        },
    clearRandomFront: 
        {
        description: 'delete the randomFront (see updateRandFront)',
        options: {c: "to make the ai continue the story"},
        execute:
            (args) =>
            {
                if (args[0] && args[0].startsWith("-")){
                  const options = args.shift();
                  if (options.indexOf("c") >= 0){
                    //-ct: -t takes preseance
                    delete commandList.clearRandomFront.outputFunction;
                  }
                }

                delete state.randomFront;
                removeInputFunction("randomFront")
                    
                return "";
            },
        outputFunction: "trash"
        },
    displayRandomFront: 
        {
        description: 'display the randomFront (see updateRandFront)',
        options: {c: "to make the ai continue the story"},
        execute:
            (args) =>
            {
                if (args[0] && args[0].startsWith("-")){
                  const options = args.shift();
                  if (options.indexOf("c") >= 0){
                    //-ct: -t takes preseance
                    delete commandList.displayRandomFront.outputFunction;
                  }
                }

                if (state.randomFront){
                  let texts = [];
                  for (const iText in state.randomFront.possibleTexts){
                    texts.push(`text${iText}: ${state.randomFront.possibleTexts[iText]}`);
                  }
                  state.message += `RandomFront: probability: ${state.randomFront.probability}, ${texts.join(" ; ")}\n`
                }else {
                  state.message += `RandomFront: no randomFront used currently.\n`
                }
                    
                return "";
            },
        outputFunction: "trash"
        },
    addRandomFront: 
        {
        description: "create another randomfront text; when the randomFront activates, it choses randomly between the different randomFront.",
        usage: `{optionPrefix}options <text>`,
        args: true, 
        options: {n: "to encapsulate the frontMemory into an Author's note (less agressive behavior)",
                  c: "to make the ai continue the story"
                 },
        execute:
            (args) =>
            {
                let options = ""
                if (args[0] && args[0].startsWith("-")){
                  options = args.shift();
                  if (options.indexOf("c") >= 0){
                    delete commandList.updateRandomFront.outputFunction;
                  }
                }
                
                if (!state.randomFront)
                  throw `${prefix}pushRandomFront can't be used if there isn't a randomFront already`
                
                const text = options.indexOf("n") >= 0 ? `[ Author's note: ${args.join(' ')} ]` : args.join(' ') ;
                state.randomFront.possibleTexts.push(text)
                
                return "";
            },
        outputFunction: "trash"
        },
    removeRandomFront: 
        {
        description: "destroy the last randomFront text; destroy the randomFront if there isn't any text left.",
        usage: `{optionPrefix}options <text>`,
        options: {c: "to make the ai continue the story"
                 },
        execute:
            (args) =>
            {
                let options = ""
                if (args[0] && args[0].startsWith("-")){
                  options = args.shift();
                  if (options.indexOf("c") >= 0){
                    delete commandList.updateRandomFront.outputFunction;
                  }
                }
                
                if (!state.randomFront)
                //maybe i should send an error. in the other hand, who cares about removing a text from nothing ?
                  return "";
                
                if (state.randomFront.possibleTexts.length >= 2){
                  state.randomFront.possibleTexts.pop(text)
                }else{
                  delete state.randomFront;
                  removeInputFunction("randomFront")
                }
                               
                return "";
            },
        outputFunction: "trash"
        },
    randomFront: 
        {
        description: 'display the randomFront (see updateRandFront)',
        deactivate: true,  //internal purpose
        execute:
            (text) =>
            {
                if (state.outputFunction == "trash")
                  //we'll trash the output... Who cares about the frontMemory ?
                  return text
                if (state.outputFunction == "revertFront")
                  //tricky... our state.args contains the old frontMemory. mustn't fill it once more.
                  return text
                if (state.outputFunction)
                  //anyway, for now the outputfunction isn't a list, so I can't handle any output function here x) x) x)
                  return text
                  
              
                if (Math.random() <= state.randomFront.probability){
                  state.outputArgs = [state.memory.frontMemory];
                  state.outputFunction = "revertFront"
                  // take one text at random
                  state.memory.frontMemory = choseInArray(state.randomFront.possibleTexts)
                  if (verbosity >= 1){
                    state.message += `randomFront has activated!\nTemporary frontMemory: ${state.memory.frontMemory}\n`
                  }
                }
                    
                return text;
            },
        },
    updateBack: 
        {
        description: 'Changes backMemory',
        //deactivate: true,
        usage: '<text>',
        execute:
            (args) =>
            {
                const textToDisplay = args.join(' ');
              
                if (isNullOrWhitespace(textToDisplay)){
                  delete state.backMemory;
                  removeInputFunction("putBack");
                }else{
                  state.backMemory = textToDisplay; 
                  addInputFunction("putBack");
                }
                    
                return "";
            },
        outputFunction: "trash"
        },
    putBack: 
        {
        deactivate: true, //function for interanl use only
        execute:
            (text) =>
            {
                //don't change the text if it's a command...
                if (isCommand)
                  return text
                return `${state.backMemory}\n${text}` ; 
            },
        },
    displayBack: 
        {
        description: 'display backMemory',
        //deactivate: true,
        execute:
            () =>
            {
                state.message += `Current back memory: ${state.backMemory}\n`; 

                return "";
            },
        outputFunction: "trash"
        },
    clearBack: 
        {
        description: 'delete backMemory',
        //deactivate: true,
        execute:
            (args) =>
            {
                delete state.backMemory; 
                removeInputFunction("putBack");

                return "";
            },
        outputFunction: "trash"
        },
    resetBack: 
        {
        description: 'reset backMemory',
        hide: isNullOrWhitespace(defaultBack),
        //deactivate: true,
        execute:
            () =>
            {
                commandList.updateBack.execute([defaultBack]); 

                return "";
            },
        outputFunction: "trash"
        },
    describe: 
        {
        description: "Try to force the AI to describe something by temporarily filling the frontMemory",
        usage: '<text>',
        execute:
            (args) =>
            {
                commandList.describe.outputArgs = [state.memory.frontMemory]
                const textToDisplay = args.join(' ');
                state.memory.frontMemory = `[ Author's note: the following paragraph describes ${textToDisplay} ]`; 
                if (verbosity >= 2)
                  state.message += `Temporary front memory: ${state.memory.frontMemory}\n`; 

                return "";
            },
        outputFunction: "revertFront"
        },
    describeMore: 
        {
        description: 'Try to force the AI to describe something by temporarily filling the frontMemory; more strong than /describe',
        usage: '<text>',
        execute:
            (args) =>
            {
                commandList.describeMore.outputArgs = [state.memory.frontMemory]
                const textToDisplay = args.join(' ');
                state.memory.frontMemory = `[ Author's note: the next few paragraphs describe ${textToDisplay}. The text is very descriptive about it. ]`; 
                if (verbosity >= 2)
                  state.message += `Temporary front memory: ${state.memory.frontMemory}\n`; 
          //TODO: two-turn behavior

                return "";
            },
        outputFunction: "revertFront"
        },
    describeStrong: 
        {
        description: 'Try to force the AI to describe something by temporarily filling the frontMemory; more strong than /describe and /describeMore, more tendency to give weird reusults',
        usage: '<text>',
        hide: true,
        execute:
            (args) =>
            {
                commandList.describeMore.outputArgs = [state.memory.frontMemory]
                const textToDisplay = args.join(' ');
                state.memory.frontMemory = `Description of ${textToDisplay}:`; 
                if (verbosity >= 2)
                  state.message += `Temporary front memory: ${state.memory.frontMemory}\n`; 

                return "";
            },
        outputFunction: "updateFront"
        },
    describePrompt: 
        {
        description: 'Try to force the AI to describe something using a visible prompt',
        usage: '<text>',
        noredo: true, //no need to redo it since the prompt stay
        execute:
            (args) =>
            {
                return `\n\n> Describe ${args.join(' ')}`;
            },
        },
    redo:
        {
        description: 'redo last command; allows to easily redo a describe or a temporary updatefront.',
        noredo: true,  //if redoing a redo was allowed, it would remove the last commands info... x)
        execute:
            () =>
            {
                const command = commandList[state.lastCommand]
                let text
                if (command){
                  text = command.execute(state.lastArgs)
                  commandList.redo.outputFunction = command.outputFunction
                  if (command.outputArgs)
                    commandList.redo.outputArgs = command.outputArgs
                  return text 
                }
                
                states.message += "There's nothing to redo.\n"                
                commandList.redo.outputFunction = "trash";
                return "";
            }
        },
    timer: 
        {
        description: 'timer true to activate a timer on the scripts. Timer false to deactivate it.',
        hide: true, //function for debug purpose. I don't think it's useful to have it in the function list
        usage: '<bool>',
        args: true,
        execute:
            (args) =>
            {
                if (args[0] && args[0] != "false")
                  state.timer = true;
                else
                  delete state.timer;

                return "";
            },
        outputFunction: "trash"
        },
    version: 
        {
        description: 'display version number',
        hide: true, //function for debug purpose. I don't think it's useful to have it in the function list
        execute:
            () =>
            {
                state.message += version ; 

                return "";
            },
        outputFunction: "trash"
        }
    };

aliases = {
  lc  : { command:"listCommands"},
  h   : { command:"help"},
  al  : { command:"aliases"}, 
  un  : { command:"updateNote"},
  unc : { command:"updateNote", option: "-c"},
  unt : { command:"updateNote", option: "-t"},
  dn  : { command:"displayNote"},
  cn  : { command:"clearNote"},
  rn  : { command:"resetNote"},
  uf  : { command:"updateFront"},
  ufn : { command:"updateFront", option: "-n"}, 
  ufc : { command:"updateFront", option: "-c"}, 
  uft : { command:"updateFront", option: "-t"}, 
  ufnc: { command:"updateFront", option: "-nc"}, 
  ufnt: { command:"updateFront", option: "-nt"}, 
  df  : { command:"displayFront"},
  cf  : { command:"clearFront"},
  rf  : { command:"resetFront"},
  urf : { command:"updateRandomFront"}, 
  urfn: { command:"updateRandomFront", option: "-n"}, 
  crf : { command:"clearRandomFront"}, 
  drf : { command:"displayRandomFront"}, 
  arf : { command:"addRandomFront"}, 
  arfn: { command:"addRandomFront", option: "-n"}, 
  rrf : { command:"removeRandomFront"}, 
  //ub  : { command:"updateBack"},
  //db  : { command:"displayBack"},
  //cb  : { command:"clearBack"},
  rb  : { command:"resetBack"},
  d   : { command:"describe"},
  dm  : { command:"describeMore"},
  //ds  : { command:"describeStrong"},
  dp  : { command:"describePrompt"}
}  

const possibleStarts=[
  {start: prefix, nCharEnd: 0}, 
  {start: `\n> You say "${prefix}`, nCharEnd: 3}, 
  {start: `\n> You ${prefix}`, nCharEnd: 2}, 
  {start: `\n${prefix}`, nCharEnd: 1}
]  

function isNullOrWhitespace( input ) {
// taken from https://gist.github.com/pinalbhatt/d7cb74b2ecdb0cbc9705
    if (typeof input === 'undefined' || input == null) return true;

    return input.replace(/\s/g, '').length < 1;
}

const choseInArray = (array) => {
  const l = array.length;
  if (l <= 0)
    return;
  
  if (l == 1)
    return array[0];
  
  const i = Math.floor(Math.random() * l);
  return array[i];
}


// i only allow every input function to be added once.
// may force to create a second function just redoing the same stuff as another one... 
// In the other hand, may prevent a memory leak in the "state", which is send on the net.
const addInputFunction = (functionName) => {
  if (!state.inputFunction){
    state.inputFunction = [functionName];
  }else if (!(functionName in state.inputFunction)){
    state.inputFunction.push[functionName];
  }
}

const removeInputFunction = (functionName) => {
  if (state.inputFunction){
    const index = state.inputFunction.indexOf(functionName)
    if (index >= 0)
      state.inputFunction.splice(index,1);
    if (!state.inputFunction.length)
      delete state.inputFunction;
  }
}


/*
const findCommandName = (commandName) => {
  if (commandName in commandList)
  {
    if (commandList[commandName].deactivate)
      return; //shouldn't be another command with same name x)
    return commandName;
  }
  if (commandName in aliases) 
  {
    aliases[commandName].command
    if (aliases[commandName].shortcut == commandName)
    {
      if (!commandList[commandName].deactivate) 
        return commandName; //I can easily make a mistake and give the same shortcut to two command... So, don't leave if the command is deactivated.
    }
  }
}
*/

const analyseAndExecuteCommand = (text, start) => {
  //TODO: not transform the text into list, so all functions in commadList can take a text as argument and return a text. 
  const args = text.slice(start.length).split(/ +/); // Create a list of the words provided.
  const commandNameOrAlias = args.shift(); // Fetch and remove the actual command from the list.
  //state.message += text
  
  //const commandName = findCommandName(commandNameOrShortcut)
  let commandName, command
  if (commandNameOrAlias in commandList)
  {
    if (!commandList[commandNameOrAlias].deactivate){
      commandName = commandNameOrAlias;
      command = commandList[commandNameOrAlias];
    }
  } else if (commandNameOrAlias in aliases) {
    commandName = aliases[commandNameOrAlias].command
    if (!commandList[commandName].deactivate){
      command = commandList[commandName] 
      if (aliases[commandNameOrAlias].option) 
        args.unshift(aliases[commandNameOrAlias].option)
    }
  }

  if (!command) 
  {
    commandList.listCommands.execute()
    throw `Invalid Command\nCommand ${prefix}${commandNameOrAlias} do not exist.\n`;
  } // Command is not in the list, lets exit early.
  
  if (command.args && !args.length) //If the command expects to be passed arguments, but none are present then
  {
    let reply = `${prefix}${commandName}: You didn't provide any arguments\n`
    if (command.usage) {reply += `Example: \`${prefix}${commandName} ${command.usage}\`\n`;} // Provide instructions for how to use the command if provided.
    //state.message += reply
    throw reply;
  }
  
  let initArgs
  if (!command.noredo)
    initArgs = [...args] //args may be modified by the command... (maybe there's a better way?)
  
  const modifiedText = command.execute(args);
  if (command.outputFunction)
  {
    state.outputFunction = command.outputFunction
    if (command.outputArgs)
      {state.outputArgs = command.outputArgs}
  }

  executedCommandName = commandName
  
  if (!command.noredo){
    state.lastCommand = commandName
    state.lastArgs = initArgs
  }
  
  if (verbosity >= 3)
    state.message += `Command ${prefix}${commandName} successfully executed.\n`
  return modifiedText
}

const modifier = (text) => {
  
  let timer, initialTime
  if (state.timer){
    timer = true
    initialTime = Date.now()
  }
  
  state.message = ""
  
  //if (state.first)
  //{
  //  commandList.resetNote.execute();
  //  commandList.resetFront.execute();
  //  commandList.resetBack.execute();
  //}
  
  //state.message = `test: "${text.replace(" ", ".").replace("  ", "->").replace("\n", "|>").replace("\r", "<|").replace("\r", "<|")}"\n`
  if (!state.setup) {
    if (verbosity >= 1)
      state.message = version
      
    state.setup = true
    if (isNullOrWhitespace(defaultNote)){
      //script definition stronger than definition in the scenario - my personnal preference
      isNullOrWhitespace(state.memory.authorsNote) ? commandList.resetNote.hide = true : state.defaultNote = state.memory.authorsNote ;
    }else{
      state.defaultNote = defaultNote
      commandList.resetNote.execute()
    }
    isNullOrWhitespace(defaultFront) ? commandList.resetFront.hide = true : commandList.resetFront.execute()
    isNullOrWhitespace(defaultBack) ? commandList.resetBack.hide = true : commandList.resetBack.execute()
    //actually, it may be better to activate the defaultFront only after a few pass...
    //state.first = true
    commandList.listCommands.execute();
  }
  let modifiedText = text
  

  let start = ""
  let nCharEnd = 0
  for (const ps in possibleStarts)
  {
    if (text.startsWith(possibleStarts[ps].start))
    {
      //state.message += `detected as case ${ps}`
      start = possibleStarts[ps].start
      nCharEnd = possibleStarts[ps].nCharEnd
      isCommand = true
      break
    }
  }
  if (isCommand)
  {
    if (verbosity >= 3)
      {state.message += `Text startsWith: ${start}\n`}
      
    let success = false
    try
    {
      //TODO: better handling of the end of the "do/say" than a substring...
      modifiedText = analyseAndExecuteCommand(text.substring(0, text.length - nCharEnd), start)
    }
    catch (error) 
    {
      state.message += `Error: ${error}\n`
      modifiedText = ""
      state.outputFunction = ["trash"]  
    }
    //finally{}
 
  }
  
  if (state.inputFunction)
  {
    //right now I don't execute inputFunction if i identified a command.
    // ... this could/should be changed, setting a commandName global variable taking the name of the command
    //     this would allow each inputfunction to chose what it does depending on the command...
    
    //inputFunctions don't have any other args than the text! 
    //conceive them to use stuff stored in state
    //inputFunctions can (and should!) change their behavior if a command is identified, ising isCommand and executedCommandName global variables 
    try{
      state.inputFunction.forEach( (func) => modifiedText = commandList[func].execute(modifiedText))
    }catch (error){
      bug = true
      if (verbosity >= 0)
        state.message += `bug in inputFunction: ${error}\nPlease copy this message in the comment section of the scenario.`
        
      if (!isCommand)
        //if it's not a command we revert the message back...
        //probably less frustrating for the player than having his messages partially modified by some functions but not others x) )
        modifiedText = text
    }
  }
  
  try{
    //scenario executed after all commands...
    modifiedText = scenarioScript(modifiedText)
  }catch (error){
    bug = true
    if (verbosity >= 0)
      state.message += `bug in scenarioScript: ${error}\nPlease copy this message in the comment section of the scenario.`
  }
  
  
  if (timer)
    state.message += `input script execution time: ${initialTime - Date.now()}\n`
  
  return {text: modifiedText}
}

const scenarioScript = (text) => {
  modifiedText = text
  
  //can use isCommand and executedCommandName global variables to change its behavior when a command is detected
  
  return modifiedText
}

// Don't modify this part
modifier(text)


/* ------------------------------------------------------------
Now output modifier
/* ------------------------------------------------------------

const verbosity = 1 //not really implemented... x) Although I've put a condition "verbosity >= 0" for bug messages: bugs should always be reported and ask the user to copy the error in comment even with no verbosity

let bug // becomes true in catch blocks

const commandList = { // Store a function in state with the intention of being able to call from both input / output script without duplicating code.
    trash: // Identifier and name of function
        {
        //remove the output
        execute:
            (text) => {return "";}
        },
    revertFront: 
        {
        //fills frontMemory with outputArgs
        execute:
            (text) =>
            {
                const textToDisplay = state.outputArgs.join(' ');
                isNullOrWhitespace(textToDisplay) ? delete state.memory.frontMemory : state.memory.frontMemory = textToDisplay;
                return text;
            },
        },
    revertNote: 
        {
        //fills frontMemory with outputArgs
        execute:
            (text) =>
            {
                const textToDisplay = state.outputArgs.join(' ');
                isNullOrWhitespace(textToDisplay) ? delete state.memory.authorsNote : state.memory.authorsNote = textToDisplay;
                return text;
            },
        },
    }
    

function isNullOrWhitespace( input ) {

    if (typeof input === 'undefined' || input == null) return true;

    return input.replace(/\s/g, '').length < 1;
}
    
const modifier = (text) => {
  
  let timer, initialTime
  if (state.timer){
    timer = true
    initialTime = Date.now()
  }
  
  let modifiedText = text
  if (state.outputFunction)
  {
    command = state.outputFunction
    if (!(command in commandList)) 
    {
      modifiedText = commandList.trash.execute(modifiedText)
      
      bug = true
      if (verbosity >= 0)
        state.message += `Bug: unknown outputFunction ${command}\nPlease copy this message in the comment section of the scenario.`
    }else{
      modifiedText = commandList[command].execute(modifiedText)
    }
    delete state.outputFunction
    delete state.outputArgs
  }



  if (timer)
    state.message += `output script execution time: ${initialTime - Date.now()}\n`
  
  return {text: modifiedText}
}

modifier(text)




