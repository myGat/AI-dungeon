const modifier = (text) => {
  let modifiedContext = text

  if(state.modules.queryAI) for(module of modules) if(module.name === state.modules.queryModule && module.queryContext) {
    if(state.memory.authorsNote === "") delete state.memory.authorsNote
    return {text: module.queryContext(text)}
  }
  
  if(state.modules.contextIsContinue){
    state.message = ""
    
    if(state.modules.addToOut === undefined) state.modules.addToOut = ""
    
    for(i of state.modules.order) if(modules[i].process) modules[i].process("input")
    
    
    let modifiedText = ""
    for(i of state.modules.order) {
      let module = modules[i]
      if(module.consume && module.consume(modifiedText)) {
        state.modules.contextIsContinue = true
        state.modules.addToOut += state.modules.forceOutput
        if(state.memory.authorsNote === "") delete state.memory.authorsNote
        return {text, stop: true}
      }
    }
    
    for(i of state.modules.order) if(modules[i].input) modifiedText = modules[i].input(modifiedText)
    
    modifiedContext += modifiedText
    if (modifiedContext.length > info.maxChars){
      modifiedContext = modifiedContext.slice(0, info.memoryLength) + modifiedContext.slice( -(info.maxChars - info.memoryLength) )
    }
    state.modules.addToOut += modifiedText
    
    //state.message = ""
    state.memory.context = memory
    state.memory.frontMemory = ""
  }
  for(i of state.modules.order) if(modules[i].process) modules[i].process("context")
  for(i of state.modules.order) if(modules[i].context) modifiedContext = modules[i].context(modifiedContext)
  if(state.memory.authorsNote === "") delete state.memory.authorsNote
  return { text: modifiedContext }
}

// Don't modify this part
modifier(text)

