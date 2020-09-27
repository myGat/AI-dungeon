info.nemoryLength = 0 
info.maxChars = 15000

// object to avoid conflicts.
// there's probably a better way.
pageBehavior = {}

pageBehavior.runInput = () => {
    pageBehavior.updateState(true)

    var text = pageBehavior.getInputText()
    
    if (text){
        text = InputModifier(text)
    }
    pageBehavior.writeText(text)
    pageBehavior.writeSentText(text)

    pageBehavior.writeState()

}

pageBehavior.runContext = () => {
    pageBehavior.updateState(true)

    //var text = pageBehavior.getHistoryText()
    var text = pageBehavior.createContextText("")
    
    var sentText = ContextModifier(text)
    
    pageBehavior.writeText(text.slice(-(info.maxChars - info.memoryLength)))
    pageBehavior.writeSentText(sentText)

    pageBehavior.writeState()
}

pageBehavior.runOutput = () => {
    pageBehavior.updateState(true)
    
    var text = pageBehavior.getOutputText()
    
    text = OutputModifier(text)
    
    pageBehavior.writeText(text)
    pageBehavior.writeSentText(text)
    
    pageBehavior.writeState()
} 

pageBehavior.runInputContext = () => {
    pageBehavior.updateState(true)

    var text = pageBehavior.getInputText()
    if (text){
        text = InputModifier(text)
    }

    pageBehavior.updateState(false)

    var sentText = pageBehavior.createContextText(text)
    sentText = ContextModifier(sentText)

    text = `${pageBehavior.getHistoryText()}\n${text}`
    
    pageBehavior.writeText(text)
    pageBehavior.writeSentText(sentText)
    pageBehavior.writeState()
}

pageBehavior.runInputContextOutput = () => {
    pageBehavior.updateState(true)

    var text = pageBehavior.getInputText()
    if (text){
        text = InputModifier(text)
    }

    pageBehavior.updateState(false)

    var sentText = pageBehavior.createContextText(text)
    sentText = ContextModifier(sentText)

    text = `${pageBehavior.getHistoryText()}\n${text}`

    pageBehavior.updateState(false)

    var outPutText = pageBehavior.getOutputText()
    outPutText = OutputModifier(outPutText)

    text = `${text}\n${outPutText}`
    pageBehavior.writeText(text)
    pageBehavior.writeSentText(sentText)
    pageBehavior.writeState()
}



pageBehavior.updateState = (allowUserChange) => {
    if (allowUserChange && document.getElementById("useUserState").checked){
        try{
            state = JSON.parse(document.getElementById("state").value)
        }catch(error){

            alert(`error in your 'state' box: ${error}`)
            //throw `error in your 'state' box: ${error}`
        }

        if (!state.memory)
        {
            state.memory = {}
        }
    }else{
        //reproduce AID behavior - no functions stored in state :p
        state = JSON.parse(JSON.stringify(state))
    }

    //Always create a memory - the script may need it
    if (!state.memory)
    {
        state.memory = {}
    }
}

pageBehavior.isNullOrWhitespace = (text) => {
    if (typeof text === 'undefined' || text == null) return true;
    return text.replace(/\s/g, '').length < 1;
}

pageBehavior.getInputText = () => {
    var text = document.getElementById("inputText").value

    if (pageBehavior.isNullOrWhitespace(text)) return

    let baseModifier = document.getElementById("baseModifier").value
    if (baseModifier == "none"){
        return text
    }else if (baseModifier == "do"){
        text = text.trim()
        //add a trailing dot
        if (!text.endsWith(".")) text += "."
        //unCapitalize first character
        text = text.charAt(0).toLowerCase() + text.slice(1)

        return `\n> You ${text}` 
    }else{ //baseModifier == "say"
        text = text.trim()
        //add a trailing dot
        if (!text.endsWith(".")) text += "."

        return `\n> You say: "${text}"` 
    } 
}

pageBehavior.getHistoryText = () => {
    return document.getElementById("historyText").value
}

pageBehavior.getOutputText = () => {
    return document.getElementById("outputText").value
}

pageBehavior.createContextText = (text) => {
    //receive text modified by inputmod
    //send full context
    var memory = ""
    if (!state.memory.context){
        info.nemoryLength = 0 
    }else if (pageBehavior.isNullOrWhitespace(state.memory.context)){
        info.nemoryLength = 0 
    }else{
        memory = state.memory.context.endsWith("\n") ? state.memory.context : state.memory.context+"\n"
        info.nemoryLength = memory.length
    }

    var history = pageBehavior.getHistoryText()
    const lines = history.split("\n")
    if (state.memory.authorsNote && lines.length > 2)
    {
        lines.splice(-3, 0, `[Author's note: ${state.memory.authorsNote}]`)
    }
    
    if(state.memory.frontMemory)
    {
        text = (text.endsWith("\n") || state.memory.frontMemory.startsWith("\n")) ?
                `${text}${state.memory.frontMemory}` :
                `${text}\n${state.memory.frontMemory}` 
    }

    history = `${lines.join("\n")}\n${text}`.slice(-(info.maxChars - info.memoryLength))
    
    return [memory, history].join("")

}

pageBehavior.writeState = () => {
    document.getElementById("finalState").value = JSON.stringify(state)
}

pageBehavior.writeText = (text) => {
    document.getElementById("finalText").value = text
}

pageBehavior.writeSentText = (text) => {
    // cut a text too long
    document.getElementById("AItext").value = text.slice(-(info.maxChars - info.memoryLength))
}


// -----------------------------------
// emulate basic world info
// didn't test those functions on AID, so... Maybe they don't do that at all x)
// This is just intended to prevent a script using those functions to crash
function addWorldEntry(keys, entry){
    worldEntries.push({keys: keys, entry:entry})
}

function removeWorldEntry(index){
    worldEntries.splice(index,1)
}

function updateWorldEntry(index, keys, entry){
    worldEntries[index].keys = keys
    worldEntries[index].entry = entry
}