
let settings = {
  randomEvents: {proba: 0.5}
}

let modules = [
  {name:"modules",init:function(){state.modules.initialized = true; state.modules.contextIsContinue = true}},
  debug,
  commandHandler,
  preciseMemory,
  eventsHandler, 
  randomEvents
]
