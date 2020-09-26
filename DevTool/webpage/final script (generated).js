var state = {memory: {}}
var info={actionCount:0}
var worldEntries = []
function kingModifier(text){
    let modifiedText = text
    const lowered = text.toLowerCase()
    
    //this is the example of script given on AID
    // Checkout the repo examples to get an idea of other ways you can use scripting 
    // https://github.com/AIDungeon/Scripting/blob/master/examples
      
    // The text passed in is either the user's input or players output to modify.
    if(lowered.includes('you become king') || lowered.includes('you are now king')) {    
        // You can modify the state variable to keep track of state throughout the adventure
        state.isKing = true
        
        // Setting state.memory.context will cause that to be used instead of the user set memory
        state.memory = { context: 'You are now the king.' }
    
        // You can modify world info entries using the below commands
        // addWorldEntry(keys, entry)
        // removeWorldEntry(index)
        // updateWorldEntry(index, keys, entry)
    
        // You can read world info keys with worldEntries 
        const entries = worldEntries
        
        // Setting state.message will set an info message that will be displayed in the game
        // This can be useful for debugging
        state.message = JSON.stringify(entries)
        
        // You can log things to the side console when testing with console.log
        console.log('Player is now king')
        
        modifiedText = text + '\nYou are now the king!'
    }

    return modifiedText
}
function InputModifier(text) {
function myInputMod(text){
    
    let modifiedText = kingModifier(text)

    return modifiedText
}
const modifier = (text) => {
    let modifiedText = text
    

    //either put your code here, either call another function
    // do nothing if the function isn't defined
    if (typeof myInputMod === "function")
        modifiedText = myInputMod(modifiedText)
    //end of the part where you put your code


    // You must return an object with the text property defined.
    return { text: modifiedText }
  }
  
  // Don't modify this part
  modifier(text)
  
return modifier(text).text
}
function ContextModifier(text) {

//this is the example of script given on AID
// Checkout the repo examples to get an idea of other ways you can use scripting
// https://github.com/AIDungeon/Scripting/blob/master/examples

// info.memoryLength is the length of the memory section of text.
// info.maxChars is the maximum length that text can be. The server will truncate the text you return to this length.

// This modifier re-implements Author's Note as an example.
const modifier = (text) => {
    const memory = info.memoryLength ? text.slice(0, info.memoryLength) : ''
    const context = info.memoryLength ? text.slice(info.memoryLength + 1) : text

    let modifiedContext = context


    //either put your code here, either call another function
    // do nothing if the function isn't defined
    if (typeof myContextMod === "function")
        modifiedContext = myContextMod(modifiedContext)
    //end of the part where you put your code


    const finalText = [memory, modifiedContext].join("")
    return { text: finalText }
  }
  
  // Don't modify this part
  modifier(text)
  
return modifier(text).text
}
function OutputModifier(text) {
function myOutputMod(text) {
    
    let modifiedText = kingModifier(text)

    return modifiedText

}


const modifier = (text) => {
    let modifiedText = text
    const lowered = text.toLowerCase()
    
    //either put your code here, either call another function
    // do nothing if the function isn't defined
    if (typeof myOutputMod === "function")
        modifiedText = myOutputMod(modifiedText)
    //end of the part where you put your code

    
    // You must return an object with the text property defined.
    return { text: modifiedText }
}
  
// Don't modify this part
modifier(text)
  
return modifier(text).text
}
