
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



