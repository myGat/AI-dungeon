A module to handle commands.

Commands are properties of commandHelper.commandlist. 
By default, it contains only the command /listCommands - because the command is need 
to provide a list of commands when a command is not recognized. 

### Format of a command:

```javascript
commandHelper.commandlist.myCommand = { // this create the command /myCommand
    hidden: false,             // if true, the command won't be displayed by /listCommands - but still usable. 
    deactivate: false,         // if true, the command is deactivated for the user.
    execute: function(args){}, // the function called when the command is called
                               // for now, args is an array containing the words following the command 
                               // (intended to change in the future: I intend to send the text given by the user)
                               // eg "/myCommand my arguments" will invoke commandHelper.commandlist.myCommand.execute(["my", "arguments"])
    dontConsume: undefined,    // by default, the command "consume" (see module documentation) the input. 
                               // If dontConsume is true, it won't consume the input
                               // dontConsume can be an object to describe more complexe behavior
    input: function(text){return text}, // only useful when dontConsume is evaluated to false. Allow the command to perform some task at input phase (see explanation below).
    queryAI: undefined,        // only useful when dontConsume is false (or undefined). 
                               // Allow the command to consume, but make a query to the AI anyway.
                               // queryAI can be an object to describe more complexe behavior
    context: function(text){return text}, // only useful when dontConsume or queryAI is true. Allow the command to perform some task at context phase (see explanation below).
    ouput: function(text){return text},   // only useful when dontConsume or queryAI is true. Allow the command to perform some task at output phase (see explanation below).
    forceoutput: ""            // Set state.module.forceoutput (see module documentation)
}
```

### Aliases

commandHelper contains a dictionnary of aliases for function. eg /listCommands can be called by typing /lc. 

```javascript
commandHelper.aliasList.mcc = { // this create the alias /mcc
    command: "myCommand"  ,      // required; /mcc will call /myCommand
    option: "-c"               // optional. In that exemple, /mcc is equivalent to "/myCommand -c"
}
```

### Usage

#### Normal (easy)

Just put the code you want the command to do in its "execute" function. 

#### Advanced

##### dontConsume object

For more complex behaviors with a command that queries the AI, you can use dontConsume or QueryAI. 

dontConsume can be an object: 
```javascript
dontConsume = {
    input: "commandName",   // the input function of the command commandName will be called at input phase
    inputArgs: undefined,   // this will be stored in state.commandHandler.inputArgs, then destroyed at end of input phase - can be used in the input function
    context: "commandName", // the context function of the command commandName will be called at context phase
    contextArgs: undefined, // this will be stored in state.commandHandler.contextArgs, then destroyed at end of context phase - can be used in the context function
    output: "commandName",  // the output function of the command commandName will be called at output phase
    outputArgs: undefined,  // this will be stored in state.commandHandler.outputArgs, then destroyed at end of output phase - can be used in the output function
}
```
If dontConsume.input, dontConsume.context or dontConsume.output isn't defined, the commandHandler will 
try to call the command itself - hence, you can just set dontConsume to true and put the relevant 
functions in the command.

##### queryAI object

queryAI can be an object:
```javascript
queryAI = {
    context: "commandName", // the context function of the command commandName will be called at context phase
    contextArgs: undefined, // this will be stored in state.commandHandler.contextArgs, then destroyed at end of context phase - can be used in the context function
    output: "commandName",  // the output function of the command commandName will be called at output phase
    outputArgs: undefined,  // this will be stored in state.commandHandler.outputArgs, then destroyed at end of output phase - can be used in the output function
}
```
If queryAI.context or queryAI.output isn't defined, the commandHandler will 
try to call the function in the command itself - hence, you can just set queryAI to true and put the relevant 
functions in the command.

##### state.commandHandler.currentCommand

state.commandHandler.currentCommand contains the name of the current command. It is set after the command execution, 
and destroyed at the beginning of the consume function - this may allow to know if there's an active command and its name 
in the case of a dontConsume or queryAI command.
 

### Example

```javascript
commandHelper.commandlist.listCommands = {
    name: "listCommands",                                // useless
    description: 'display a list of available commands', // will be used in the future by a /help command
    options: {c: "to make the ai continue the story"},   // will be used in the future by a /help command
    execute: function(args) {                            
        if (args && args[0] && args[0].startsWith("-")){
          if (args[0].indexOf("c") >= 0){
             this.dontConsume = {input: "deleteInput"};  // /listCommands -c makes the ai continue the story
                                                         // so the command modify its own attributes not to consume the text and to destroy the text at input.
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
        }
        state.message += `List of commands: ${resultList.join(", ")}\n`; 
      }
}
commandHelper.commandlist.deleteInput = { // utilitary for some commands which want to allow the story to continue (eg /listCommands -c )
    deactivate: true,                     // not callable by user
    input: (input) => {return ""}         // when a command with the attributes dontConsume = {input: "deleteInput"}, it will not consume but destroy the input
}
```
