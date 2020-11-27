var state = {memory: {}}
var info={actionCount:0}
var worldEntries = []
var quests = []
memory = ""

function InputModifier(text) {
let targetDummyName={}
function isNullOrWhiteSpace( input ) {

    if (typeof input === 'undefined' || input == null) return true;

    return input.replace(/\s/g, '').length < 1;
}
preciseMemory = {
    name: "preciseMemory",
    init: function(){
        state.preciseMemory.memories = []
        state.preciseMemory.nMemories = 0
    },
    functions: {
        sortMemory: function(m1,m2){
            if (m2.position - m1.position != 0){
                return m2.position - m1.position
            }
            return  m2.priority - m1.priority
        },
        setTemporaryMemory: function(object){
            //if it's a cautious front, call setCautiousFront (use alternateText etc)
            if (object.cautious && !object.position)
            {
                return preciseMemory.functions.setTemporaryCautiousFront(object)
            }

            const memory = {
                text: object.text,
                position: object.position ? object.position : 0,
                priority: object.priority ? object.priority : 0,        //high priority = low number
                number: state.preciseMemory.nMemories,
                temporary: true
            }
            state.preciseMemory.memories.push(memory);
        },
        setPreciseMemory: function(object){
            //if it's a cautious front, call setCautiousFront (use alternateText etc)
            if (object.cautious && !object.position)
            {
                return preciseMemory.functions.setCautiousFront(object)
            }

            state.preciseMemory.nMemories++
            const memory = {
                text: object.text,
                position: object.position ? object.position : 0,
                priority: object.priority ? object.priority : 0,        //high priority = low number
                number: state.preciseMemory.nMemories
            }
            if(object.noComeBack){
                memory.noComeBack = true
            }
            
            state.preciseMemory.memories.push(memory);

            return state.preciseMemory.nMemories
        },
        setCautiousFront: function(object){
            state.preciseMemory.nMemories++
            const memory = {
                text: object.text,
                position: 0,
                cautious: true,
                priority: object.priority ? object.priority : 0,        //high priority = low number
                number: state.preciseMemory.nMemories
            }
            if (object.alternateText){
                memory.alternateText = object.alternateText
            }
            if(object.noComeBack){
                memory.noComeBack = true
            }
            state.preciseMemory.memories.push(memory);

            return state.preciseMemory.nMemories
        },
        setTemporaryCautiousFront: function(object){
            const memory = {
                text: object.text,
                position: 0,
                cautious: true, 
                priority: object.priority ? object.priority : 0,        //high priority = low number
                number: state.preciseMemory.nMemories,
                temporary: true
            }
            if (object.alternateText){
                memory.alternateText = object.alternateText
            }
            state.preciseMemory.memories.push(memory);
        },
        removePreciseMemory: function(number){
            const index = state.preciseMemory.memories.findIndex((m) => {return m.number == number})
            if (index >= 0){
                state.preciseMemory.memories.splice(index,1)
            }
        }
    },
    context: function(text){

        //exit quickly if nothing to do
        if (state.preciseMemory.memories.length <= 0){
            return text
        }

        //extract lines (standart mod)
        const contextMemory = info.memoryLength ? text.slice(0, info.memoryLength) : ''
        const context = info.memoryLength ? text.slice(info.memoryLength) : text
        const lines = context.split("\n")

        //if the text ends with a white space (user input), add 1 to position
        const positionDisplacer = isNullOrWhiteSpace(lines[lines.length-1]) ? 1 : 0

        //insert lines
        //sort memories by priority
        state.preciseMemory.memories.sort(this.functions.sortMemory)
        
        for (const memory of state.preciseMemory.memories)
        {
            if (memory.noComeBack && typeof memory.startAt !== undefined && memory.startAt < info.actionCount){
                continue
            }else if (memory.noComeBack && typeof memory.startAt === undefined){
                memory.startAt = info.actionCount
            }

            const position = memory.position
            if ( position + positionDisplacer == 0 ){
                if (memory.cautious){
                    const lastLine = lines[lines.length-1].trim()
                    if (lastLine.endsWith(".") || text.endsWith("?") || text.endsWith("!") || text.endsWith("\"")){
                        lines.push(memory.text)
                    }else if (memory.alternateText){ 
                        lines.splice(-1, 0, memory.alternateText)
                    }
                }else{
                    lines.push(memory.text)
                }
            }else if ( position + positionDisplacer <= lines.length ){
                lines.splice(-(position + positionDisplacer), 0, memory.text)
            }
        }

        //purge old memory
        state.preciseMemory.memories = state.preciseMemory.memories.filter((m) => {
            return !m.temporary
        })

        //reconstruct context
        const combinedLines = lines.join("\n").slice(-(info.maxChars - info.memoryLength))
        const finalText = [contextMemory, combinedLines].join("")
        return finalText
    },
}
eventsHandler = {
    name: "eventsHandler",
	requirements: [ 
		"preciseMemory"
	],
	order: [ //place eventsHandler before preciseMemory since eventsHandler modify context in some edge cases
		{
			name: "preciseMemory",
			location: "after" 
		}
	],
    init: function () {
        state.eventsHandler.modifiers = [],
        state.eventsHandler.nModifiers = 0,
        state.eventsHandler.saMod = {},
        state.eventsHandler.crMod = {}
    },
    utils: {
        eventsDic: {}
    },
    functions: {
        modifyEvent: function (object, apply = false) {
            if (object.eventName) {
                state.eventsHandler.nModifiers++
                const modifier = {
                    eventName: object.eventName,
                    number: state.eventsHandler.nModifiers
                }
                if (object.deleteEvent) {
                    modifier.deleteEvent = true
                } else {
                    if (object.properties){
                        modifier.properties = object.properties
                    }
                    if (object.remove){
                        modifier.remove = object.remove
                    }
                }
                state.eventsHandler.modifiers.push(modifier)

                if(apply){
                    eventsHandler.functions.applyModfifier(modifier)
                }

                return state.eventsHandler.nModifiers
            }
        },
        addModifier: function (instruction, apply = false) {
            state.eventsHandler.nModifiers++
            state.eventsHandler.modifiers.push({
                instruction: instruction,
                number: state.eventsHandler.nModifiers
            })

            if(apply){
                eventsHandler.functions.applyModfifier(modifier)
            }

            return state.eventsHandler.nModifiers
        },
        createEvent: function (object, apply){
            state.eventsHandler.nModifiers++
            if (object.name){
                state.eventsHandler.modifiers.push({
                    eventName: object.name,
                    create: object,
                    number: state.eventsHandler.nModifiers
                })
            }

            if(apply){
                eventsHandler.functions.applyModfifier(modifier)
            }

            return state.eventsHandler.nModifiers
        },
        removeModifier: function (modifierNumber) {
            const index = state.eventsHandler.modifiers.findIndex((m) => { return m.number == modifierNumber })
            if (index >= 0) {
                state.eventsHandler.modifiers.splice(index, 1)
            }
        },
        computeText: function(text){
            if (typeof text === "string"){
                return text
            }
            if (typeof text === "function"){
                return text()
            }
            if (typeof text.text === "string"){
                return text.text
            }
            if (typeof text.text === "function"){
                return text.text()
            }
            return ""
        },
        createStartingText: function(text, e, isContext = false){
            if (text.length == 0 || typeof e.visibleStart === typeof undefined){
                return text
            }

            let modifiedText = text

            const dumText = text.trim()

            if (text.endsWith("\n") || dumText.endsWith(".") || dumText.endsWith("?") ||
                dumText.endsWith("!") || dumText.endsWith("\"")){
                
                // let startingText = ""
                // if (typeof e.visibleStart === "string"){
                //     startingText = text.endsWith("\n") ? 
                //         e.visibleStart : 
                //         "\n" + e.visibleStart
                // }else if (e.visibleStart.text){
                //     startingText = text.endsWith("\n") ? 
                //         eventsHandler.functions.computeText(e.visibleStart.text) : 
                //         "\n" + eventsHandler.functions.computeText(e.visibleStart.text)
                // }
                const startingText = text.endsWith("\n") ? 
                    eventsHandler.functions.computeText(e.visibleStart) : 
                    "\n" + eventsHandler.functions.computeText(e.visibleStart)

                modifiedText += startingText
                if (isContext) {
                    state.modules.addToOut += startingText
                }

            }else if (e.visibleStart.alternateText){
                const startingText = eventsHandler.functions.computeText(e.visibleStart.alternateText)

                if (state.eventsHandler.outputInsert){
                    state.eventsHandler.outputInsert += "\n" + startingText
                }else{
                    state.eventsHandler.outputInsert = startingText
                }

                preciseMemory.functions.setTemporaryMemory({
                    text: startingText,
                    position: 1
                })
            }

            return modifiedText
        },
        applyModfifier: function(modifier){
            if (modifier.instruction) {
                Function('"use strict";' + modifier.instruction)();
            } else if (modifier.create){
                if (modifier.eventName){
                    eventsHandler.utils.eventsDic[modifier.eventName] = modifier.create
                }
            } else if (modifier.eventName && eventsHandler.utils.eventsDic[modifier.eventName]) {
                if (modifier.deleteEvent) {
                    delete eventsHandler.utils.eventsDic[modifier.eventName]
                } else {
                    const targetEvent = eventsHandler.utils.eventsDic[modifier.eventName]
                    if (modifier.properties) {
                        for (const p in modifier.properties) {
                            const value = modifier.properties[p]
                            targetEvent[p] = value
                        }
                    }
                    if (modifier.remove) {
                        for (const p in modifier.remove) {
                            delete targetEvent[p]
                        }
                    }
                }
            }
        }
    },
    process: function (script) {
        if (script == "input" || (script == "context" && state.eventsHandler.contextVisibleStart)) {
            for (const modifier of state.eventsHandler.modifiers) {
                // if (modifier.instruction) {
                //     Function('"use strict";' + modifier.instruction)();
                // } else if (modifier.create){
                //     if (modifier.eventName){
                //         eventsHandler.utils.eventsDic[modifier.eventName] = modifier.create
                //     }
                // } else if (modifier.eventName && eventsHandler.utils.eventsDic[modifier.eventName]) {
                //     if (modifier.deleteEvent) {
                //         delete eventsHandler.utils.eventsDic[modifier.eventName]
                //     } else {
                //         const targetEvent = eventsHandler.utils.eventsDic[modifier.eventName]
                //         if (modifier.properties) {
                //             for (const p in modifier.properties) {
                //                 const value = modifier.properties[p]
                //                 targetEvent[p] = value
                //             }
                //         }
                //         if (modifier.remove) {
                //             for (const p in modifier.remove) {
                //                 delete targetEvent[p]
                //             }
                //         }
                //     }
                // }
                eventsHandler.functions.applyModfifier(modifier)
            }
        }
    },
    input: function (text) {
        let modifiedText = text

        //end event if it ends (change the dic, so do it first)
        const newEventDic = {}
        for (const eventName in eventsHandler.utils.eventsDic){
            const e = eventsHandler.utils.eventsDic[eventName]
            
            if (e.duration && e.startAt){
                e.endAt = e.startAt + e.duration
            }

            if (e.endAt && info.actionCount == e.endAt)
            {
                if (e.nextEvent) {
                    if (typeof e.nextEvent == "string" && this.utils.eventsDic[e.nextEvent]) {
                        const newEvent = this.utils.eventsDic[e.nextEvent]
                        if (!newEvent.startAt || info.actionCount != newEvent.startAt) {
                            newEvent.startAt = info.actionCount
                            if (state.eventsHandler.saMod[e.nextEvent]) {
                                this.functions.removeModifier(state.eventsHandler.saMod[e.nextEvent])
                            }
                            state.eventsHandler.saMod[e.nextEvent] = this.functions.modifyEvent({
                                eventName: e.nextEvent,
                                properties: {startAt: info.actionCount}
                            })
                        }
                    }else{
                        const newEvent = e.nextEvent
                        if (!newEvent.startAt || info.actionCount != newEvent.startAt) {
                            newEvent.startAt = info.actionCount
                        }
                        if (state.eventsHandler.crMod[newEvent.name]) {
                            this.functions.removeModifier(state.eventsHandler.crMod[newEvent.name])
                        }
                        state.eventsHandler.crMod[newEvent.name] = this.functions.createEvent(newEvent)
                        newEventDic[newEvent.name] = newEvent
                    }
                }
            }
        }

        for (const eventName in newEventDic){
            this.utils.eventsDic[eventName] = newEventDic[eventName]
        }


        for (const eventName in eventsHandler.utils.eventsDic) {
            const e = eventsHandler.utils.eventsDic[eventName]

            if (typeof e.startAt === typeof undefined){
                continue
            }

            if (info.actionCount == e.startAt) {
                if (e.visibleStart) {
                    if (text.length == 0){
                        if (!state.eventsHandler.contextVisibleStart){
                            state.eventsHandler.contextVisibleStart = []
                        }
                        state.eventsHandler.contextVisibleStart.push(eventName)
                    }else{
                        modifiedText = eventsHandler.functions.createStartingText(modifiedText, e)
                    }
                    // const startingText = typeof e.visibleStart === "string" ?
                    //     e.visibleStart : 

                    // }else if(typeof e.visibleStart.text === "function"){
                    //     startingText = e.visibleStart.text()
                    // }else{
                    //     startingText = e.visibleStart.text
                    // }
                    // const startingText = typeof e.visibleStart == "string" ? e.visibleStart : e.visibleStart.text
                    // if (text.length == 0){
                    //     if (!state.eventsHandler.contextVisibleStart){
                    //         state.eventsHandler.contextVisibleStart = []
                    //     }
                    //     state.eventsHandler.contextVisibleStart.push(e.visibleStart)
                    // } else if (text.endsWith("\n")) {
                    //     modifiedText += startingText
                    // } else if (text.endsWith(".") || text.endsWith("?") || text.endsWith("!") || text.endsWith("\"")) {
                    //     modifiedText += "\n" + startingText
                    // } else if (e.visibleStart.alternateText) {
                    //     state.eventsHandler.outputInsert = e.visibleStart.alternateText
                    //     preciseMemory.functions.setTemporaryMemory({
                    //         text: e.visibleStart.alternateText,
                    //         position: 1
                    //     })
                    // }
                }
            }

            if (info.actionCount >= e.startAt && e.memory){ 
                if (e.duration){
                    e.endAt = e.startAt + e.duration
                }
                if (!e.endAt || info.actionCount < e.endAt) {
                    const oldPosition = e.memory.position
                    if (typeof e.memory.position === typeof undefined){
                        e.memory.position = info.actionCount - e.startAt
                    }else if(e.memory.position < 0){
                        e.memory.position = info.actionCount - e.startAt - e.memory.position
                    }
                    preciseMemory.functions.setTemporaryMemory(e.memory)
                    if (oldPosition || oldPosition == 0){
                        e.memory.position = oldPosition
                    }else{
                        delete e.memory.position
                    }
                }
            }
        }

        return modifiedText
    },
    context: function(text){
        //has to be done here and not use preciseMemory since it modifies 
        let modifiedText = text

        if (state.eventsHandler.contextVisibleStart){

            for (eventName of state.eventsHandler.contextVisibleStart){
                if (eventsHandler.utils.eventsDic[eventName]){
                    const e = eventsHandler.utils.eventsDic[eventName]
                    modifiedText = eventsHandler.functions.createStartingText(modifiedText, e, true)
                }
                // const startingText = typeof ev == "string" ? ev : ev.text
                // if (text.endsWith("\n")) {
                //     modifiedText += startingText
                //     state.modules.addToOut += startingText
                // } else if (text.endsWith(".") || text.endsWith("?") || text.endsWith("!") || text.endsWith("\"")) {
                //     modifiedText += "\n" + startingText
                //     state.modules.addToOut += "\n" + startingText
                // } else if (ev.alternateText) {
                //     state.eventsHandler.outputInsert = ev.alternateText
                //     preciseMemory.functions.setTemporaryMemory({
                //         text: ev.alternateText,
                //         position: 1
                //     })
                // }
            }

            if (modifiedText.length > info.maxChars){
                modifiedText = modifiedText.slice(0, info.memoryLength) + modifiedText.slice( -(info.maxChars - info.memoryLength) )
            }

            delete state.eventsHandler.contextVisibleStart
        }
        return modifiedText
    },
    output: function(text) {
        if (!state.eventsHandler.outputInsert){
            return text
        }
        
        let modifiedText = text
        const lines = text.split("\n")
        if (lines.length > 0){
            lines.splice(1, 0, state.eventsHandler.outputInsert)
            modifiedText = lines.join("\n")
        }

        delete state.eventsHandler.outputInsert

        return modifiedText
    }
}

wish = {
    name: "wish",
	requirements: [ 
		"eventsHandler"
	],
	order: [ //place eventsHandler before preciseMemory since eventsHandler modify context in some edge cases
		{
			name: "eventsHandler",
			location: "after" 
		}
	],
    init: function(){
        state.wish.eventModifiers = []
    },
    process: function(script){
        if (script == "input" ){
            state.wish.eventModifiers = state.wish.eventModifiers.filter((em) => {
                if (info.actionCount <= em.startAt){
                    eventsHandler.functions.removeModifier(em.modifierNumber)
                    return false
                }
                return true
            })
        }
    },
    input: function(text){
        // state.wish.eventModifiers = state.wish.eventModifiers.filter((em) => {
        //     if (em.startAt >= info.actionCount){
        //         eventsHandler.functions.removeModifier(em.modifierNumber)
        //         return false
        //     }
        //     return true
        // })

        const lowered = text.toLowerCase()
        if (lowered.includes('you wish')) {
            state.wish.eventModifiers.push({
                startAt: info.actionCount,
                modifierNumber: eventsHandler.functions.modifyEvent({
                    eventName: "wish",
                    properties: {
                        startAt: info.actionCount
                    }
                }, true)
            })
        }else if (lowered.includes('you hope')) {
            state.wish.eventModifiers.push({
                startAt: info.actionCount,
                modifierNumber: eventsHandler.functions.modifyEvent({
                    eventName: "hope",
                    properties: {
                        startAt: info.actionCount
                    }
                }, true)
            })
        }

        return text
    }
}

eventsHandler.utils.eventsDic = {
    wish: {
        duration: 3,
        memory: {
            text: "[Author's note: the next paragraphs describes how your wish comes true.]",
            position: -1,
        },
    },
    hope: {
        duration: 3,
        memory: {
            text: "[Author's note: your hope will soon come true! The next paragraphs describe how your hope comes true.]",
            position: -1,
        },
    }
}

let settings = {
  
}

let modules = [
  {name:"modules",init:function(){state.modules.initialized = true; state.modules.contextIsContinue = true}},
  preciseMemory,
  eventsHandler,
  wish
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
  const keyList = ["name","tags","requirements","incompatibles","order","onEnd","init","functions","consume","queryContext","getQuery","input","output","context","process","settings","info","version","minVersion","utils"]
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


const modifier = (text) => {
  state.message = ""

  for(i of state.modules.order) if(modules[i].process) modules[i].process("input")
  
  state.modules.forceOutput = ""
  state.modules.queryAI = false
  for(i of state.modules.order) {
    let module = modules[i]
    if(module.consume && module.consume(text)) {
      state.modules.contextIsContinue = true
      if(state.modules.addToOut){
        state.modules.forceOutput = state.modules.addToOut + state.modules.forceOutput;
        delete state.modules.addToOut
      }
      if(state.modules.queryAI) state.modules.queryModule = module.name
      if(state.memory.authorsNote === "") delete state.memory.authorsNote
      return {text: state.modules.forceOutput, stop: !state.modules.queryAI}
    }
  }
  
  let modifiedText = text
  for(i of state.modules.order) if(modules[i].input) modifiedText = modules[i].input(modifiedText)
  state.modules.contextIsContinue = false
  if(state.modules.addToOut){
    modifiedText = state.modules.addToOut + modifiedText;
    delete state.modules.addToOut
  }
  if(state.memory.authorsNote === "") delete state.memory.authorsNote
  return { text: modifiedText }
}

// Don't modify this part
modifier(text)

  

.objectUtilitarySetterDummyName(targetDummyName)
return targetDummyName
}
function ContextModifier(text) {
let targetDummyName={}
function isNullOrWhiteSpace( input ) {

    if (typeof input === 'undefined' || input == null) return true;

    return input.replace(/\s/g, '').length < 1;
}
preciseMemory = {
    name: "preciseMemory",
    init: function(){
        state.preciseMemory.memories = []
        state.preciseMemory.nMemories = 0
    },
    functions: {
        sortMemory: function(m1,m2){
            if (m2.position - m1.position != 0){
                return m2.position - m1.position
            }
            return  m2.priority - m1.priority
        },
        setTemporaryMemory: function(object){
            //if it's a cautious front, call setCautiousFront (use alternateText etc)
            if (object.cautious && !object.position)
            {
                return preciseMemory.functions.setTemporaryCautiousFront(object)
            }

            const memory = {
                text: object.text,
                position: object.position ? object.position : 0,
                priority: object.priority ? object.priority : 0,        //high priority = low number
                number: state.preciseMemory.nMemories,
                temporary: true
            }
            state.preciseMemory.memories.push(memory);
        },
        setPreciseMemory: function(object){
            //if it's a cautious front, call setCautiousFront (use alternateText etc)
            if (object.cautious && !object.position)
            {
                return preciseMemory.functions.setCautiousFront(object)
            }

            state.preciseMemory.nMemories++
            const memory = {
                text: object.text,
                position: object.position ? object.position : 0,
                priority: object.priority ? object.priority : 0,        //high priority = low number
                number: state.preciseMemory.nMemories
            }
            if(object.noComeBack){
                memory.noComeBack = true
            }
            
            state.preciseMemory.memories.push(memory);

            return state.preciseMemory.nMemories
        },
        setCautiousFront: function(object){
            state.preciseMemory.nMemories++
            const memory = {
                text: object.text,
                position: 0,
                cautious: true,
                priority: object.priority ? object.priority : 0,        //high priority = low number
                number: state.preciseMemory.nMemories
            }
            if (object.alternateText){
                memory.alternateText = object.alternateText
            }
            if(object.noComeBack){
                memory.noComeBack = true
            }
            state.preciseMemory.memories.push(memory);

            return state.preciseMemory.nMemories
        },
        setTemporaryCautiousFront: function(object){
            const memory = {
                text: object.text,
                position: 0,
                cautious: true, 
                priority: object.priority ? object.priority : 0,        //high priority = low number
                number: state.preciseMemory.nMemories,
                temporary: true
            }
            if (object.alternateText){
                memory.alternateText = object.alternateText
            }
            state.preciseMemory.memories.push(memory);
        },
        removePreciseMemory: function(number){
            const index = state.preciseMemory.memories.findIndex((m) => {return m.number == number})
            if (index >= 0){
                state.preciseMemory.memories.splice(index,1)
            }
        }
    },
    context: function(text){

        //exit quickly if nothing to do
        if (state.preciseMemory.memories.length <= 0){
            return text
        }

        //extract lines (standart mod)
        const contextMemory = info.memoryLength ? text.slice(0, info.memoryLength) : ''
        const context = info.memoryLength ? text.slice(info.memoryLength) : text
        const lines = context.split("\n")

        //if the text ends with a white space (user input), add 1 to position
        const positionDisplacer = isNullOrWhiteSpace(lines[lines.length-1]) ? 1 : 0

        //insert lines
        //sort memories by priority
        state.preciseMemory.memories.sort(this.functions.sortMemory)
        
        for (const memory of state.preciseMemory.memories)
        {
            if (memory.noComeBack && typeof memory.startAt !== undefined && memory.startAt < info.actionCount){
                continue
            }else if (memory.noComeBack && typeof memory.startAt === undefined){
                memory.startAt = info.actionCount
            }

            const position = memory.position
            if ( position + positionDisplacer == 0 ){
                if (memory.cautious){
                    const lastLine = lines[lines.length-1].trim()
                    if (lastLine.endsWith(".") || text.endsWith("?") || text.endsWith("!") || text.endsWith("\"")){
                        lines.push(memory.text)
                    }else if (memory.alternateText){ 
                        lines.splice(-1, 0, memory.alternateText)
                    }
                }else{
                    lines.push(memory.text)
                }
            }else if ( position + positionDisplacer <= lines.length ){
                lines.splice(-(position + positionDisplacer), 0, memory.text)
            }
        }

        //purge old memory
        state.preciseMemory.memories = state.preciseMemory.memories.filter((m) => {
            return !m.temporary
        })

        //reconstruct context
        const combinedLines = lines.join("\n").slice(-(info.maxChars - info.memoryLength))
        const finalText = [contextMemory, combinedLines].join("")
        return finalText
    },
}
eventsHandler = {
    name: "eventsHandler",
	requirements: [ 
		"preciseMemory"
	],
	order: [ //place eventsHandler before preciseMemory since eventsHandler modify context in some edge cases
		{
			name: "preciseMemory",
			location: "after" 
		}
	],
    init: function () {
        state.eventsHandler.modifiers = [],
        state.eventsHandler.nModifiers = 0,
        state.eventsHandler.saMod = {},
        state.eventsHandler.crMod = {}
    },
    utils: {
        eventsDic: {}
    },
    functions: {
        modifyEvent: function (object, apply = false) {
            if (object.eventName) {
                state.eventsHandler.nModifiers++
                const modifier = {
                    eventName: object.eventName,
                    number: state.eventsHandler.nModifiers
                }
                if (object.deleteEvent) {
                    modifier.deleteEvent = true
                } else {
                    if (object.properties){
                        modifier.properties = object.properties
                    }
                    if (object.remove){
                        modifier.remove = object.remove
                    }
                }
                state.eventsHandler.modifiers.push(modifier)

                if(apply){
                    eventsHandler.functions.applyModfifier(modifier)
                }

                return state.eventsHandler.nModifiers
            }
        },
        addModifier: function (instruction, apply = false) {
            state.eventsHandler.nModifiers++
            state.eventsHandler.modifiers.push({
                instruction: instruction,
                number: state.eventsHandler.nModifiers
            })

            if(apply){
                eventsHandler.functions.applyModfifier(modifier)
            }

            return state.eventsHandler.nModifiers
        },
        createEvent: function (object, apply){
            state.eventsHandler.nModifiers++
            if (object.name){
                state.eventsHandler.modifiers.push({
                    eventName: object.name,
                    create: object,
                    number: state.eventsHandler.nModifiers
                })
            }

            if(apply){
                eventsHandler.functions.applyModfifier(modifier)
            }

            return state.eventsHandler.nModifiers
        },
        removeModifier: function (modifierNumber) {
            const index = state.eventsHandler.modifiers.findIndex((m) => { return m.number == modifierNumber })
            if (index >= 0) {
                state.eventsHandler.modifiers.splice(index, 1)
            }
        },
        computeText: function(text){
            if (typeof text === "string"){
                return text
            }
            if (typeof text === "function"){
                return text()
            }
            if (typeof text.text === "string"){
                return text.text
            }
            if (typeof text.text === "function"){
                return text.text()
            }
            return ""
        },
        createStartingText: function(text, e, isContext = false){
            if (text.length == 0 || typeof e.visibleStart === typeof undefined){
                return text
            }

            let modifiedText = text

            const dumText = text.trim()

            if (text.endsWith("\n") || dumText.endsWith(".") || dumText.endsWith("?") ||
                dumText.endsWith("!") || dumText.endsWith("\"")){
                
                // let startingText = ""
                // if (typeof e.visibleStart === "string"){
                //     startingText = text.endsWith("\n") ? 
                //         e.visibleStart : 
                //         "\n" + e.visibleStart
                // }else if (e.visibleStart.text){
                //     startingText = text.endsWith("\n") ? 
                //         eventsHandler.functions.computeText(e.visibleStart.text) : 
                //         "\n" + eventsHandler.functions.computeText(e.visibleStart.text)
                // }
                const startingText = text.endsWith("\n") ? 
                    eventsHandler.functions.computeText(e.visibleStart) : 
                    "\n" + eventsHandler.functions.computeText(e.visibleStart)

                modifiedText += startingText
                if (isContext) {
                    state.modules.addToOut += startingText
                }

            }else if (e.visibleStart.alternateText){
                const startingText = eventsHandler.functions.computeText(e.visibleStart.alternateText)

                if (state.eventsHandler.outputInsert){
                    state.eventsHandler.outputInsert += "\n" + startingText
                }else{
                    state.eventsHandler.outputInsert = startingText
                }

                preciseMemory.functions.setTemporaryMemory({
                    text: startingText,
                    position: 1
                })
            }

            return modifiedText
        },
        applyModfifier: function(modifier){
            if (modifier.instruction) {
                Function('"use strict";' + modifier.instruction)();
            } else if (modifier.create){
                if (modifier.eventName){
                    eventsHandler.utils.eventsDic[modifier.eventName] = modifier.create
                }
            } else if (modifier.eventName && eventsHandler.utils.eventsDic[modifier.eventName]) {
                if (modifier.deleteEvent) {
                    delete eventsHandler.utils.eventsDic[modifier.eventName]
                } else {
                    const targetEvent = eventsHandler.utils.eventsDic[modifier.eventName]
                    if (modifier.properties) {
                        for (const p in modifier.properties) {
                            const value = modifier.properties[p]
                            targetEvent[p] = value
                        }
                    }
                    if (modifier.remove) {
                        for (const p in modifier.remove) {
                            delete targetEvent[p]
                        }
                    }
                }
            }
        }
    },
    process: function (script) {
        if (script == "input" || (script == "context" && state.eventsHandler.contextVisibleStart)) {
            for (const modifier of state.eventsHandler.modifiers) {
                // if (modifier.instruction) {
                //     Function('"use strict";' + modifier.instruction)();
                // } else if (modifier.create){
                //     if (modifier.eventName){
                //         eventsHandler.utils.eventsDic[modifier.eventName] = modifier.create
                //     }
                // } else if (modifier.eventName && eventsHandler.utils.eventsDic[modifier.eventName]) {
                //     if (modifier.deleteEvent) {
                //         delete eventsHandler.utils.eventsDic[modifier.eventName]
                //     } else {
                //         const targetEvent = eventsHandler.utils.eventsDic[modifier.eventName]
                //         if (modifier.properties) {
                //             for (const p in modifier.properties) {
                //                 const value = modifier.properties[p]
                //                 targetEvent[p] = value
                //             }
                //         }
                //         if (modifier.remove) {
                //             for (const p in modifier.remove) {
                //                 delete targetEvent[p]
                //             }
                //         }
                //     }
                // }
                eventsHandler.functions.applyModfifier(modifier)
            }
        }
    },
    input: function (text) {
        let modifiedText = text

        //end event if it ends (change the dic, so do it first)
        const newEventDic = {}
        for (const eventName in eventsHandler.utils.eventsDic){
            const e = eventsHandler.utils.eventsDic[eventName]
            
            if (e.duration && e.startAt){
                e.endAt = e.startAt + e.duration
            }

            if (e.endAt && info.actionCount == e.endAt)
            {
                if (e.nextEvent) {
                    if (typeof e.nextEvent == "string" && this.utils.eventsDic[e.nextEvent]) {
                        const newEvent = this.utils.eventsDic[e.nextEvent]
                        if (!newEvent.startAt || info.actionCount != newEvent.startAt) {
                            newEvent.startAt = info.actionCount
                            if (state.eventsHandler.saMod[e.nextEvent]) {
                                this.functions.removeModifier(state.eventsHandler.saMod[e.nextEvent])
                            }
                            state.eventsHandler.saMod[e.nextEvent] = this.functions.modifyEvent({
                                eventName: e.nextEvent,
                                properties: {startAt: info.actionCount}
                            })
                        }
                    }else{
                        const newEvent = e.nextEvent
                        if (!newEvent.startAt || info.actionCount != newEvent.startAt) {
                            newEvent.startAt = info.actionCount
                        }
                        if (state.eventsHandler.crMod[newEvent.name]) {
                            this.functions.removeModifier(state.eventsHandler.crMod[newEvent.name])
                        }
                        state.eventsHandler.crMod[newEvent.name] = this.functions.createEvent(newEvent)
                        newEventDic[newEvent.name] = newEvent
                    }
                }
            }
        }

        for (const eventName in newEventDic){
            this.utils.eventsDic[eventName] = newEventDic[eventName]
        }


        for (const eventName in eventsHandler.utils.eventsDic) {
            const e = eventsHandler.utils.eventsDic[eventName]

            if (typeof e.startAt === typeof undefined){
                continue
            }

            if (info.actionCount == e.startAt) {
                if (e.visibleStart) {
                    if (text.length == 0){
                        if (!state.eventsHandler.contextVisibleStart){
                            state.eventsHandler.contextVisibleStart = []
                        }
                        state.eventsHandler.contextVisibleStart.push(eventName)
                    }else{
                        modifiedText = eventsHandler.functions.createStartingText(modifiedText, e)
                    }
                    // const startingText = typeof e.visibleStart === "string" ?
                    //     e.visibleStart : 

                    // }else if(typeof e.visibleStart.text === "function"){
                    //     startingText = e.visibleStart.text()
                    // }else{
                    //     startingText = e.visibleStart.text
                    // }
                    // const startingText = typeof e.visibleStart == "string" ? e.visibleStart : e.visibleStart.text
                    // if (text.length == 0){
                    //     if (!state.eventsHandler.contextVisibleStart){
                    //         state.eventsHandler.contextVisibleStart = []
                    //     }
                    //     state.eventsHandler.contextVisibleStart.push(e.visibleStart)
                    // } else if (text.endsWith("\n")) {
                    //     modifiedText += startingText
                    // } else if (text.endsWith(".") || text.endsWith("?") || text.endsWith("!") || text.endsWith("\"")) {
                    //     modifiedText += "\n" + startingText
                    // } else if (e.visibleStart.alternateText) {
                    //     state.eventsHandler.outputInsert = e.visibleStart.alternateText
                    //     preciseMemory.functions.setTemporaryMemory({
                    //         text: e.visibleStart.alternateText,
                    //         position: 1
                    //     })
                    // }
                }
            }

            if (info.actionCount >= e.startAt && e.memory){ 
                if (e.duration){
                    e.endAt = e.startAt + e.duration
                }
                if (!e.endAt || info.actionCount < e.endAt) {
                    const oldPosition = e.memory.position
                    if (typeof e.memory.position === typeof undefined){
                        e.memory.position = info.actionCount - e.startAt
                    }else if(e.memory.position < 0){
                        e.memory.position = info.actionCount - e.startAt - e.memory.position
                    }
                    preciseMemory.functions.setTemporaryMemory(e.memory)
                    if (oldPosition || oldPosition == 0){
                        e.memory.position = oldPosition
                    }else{
                        delete e.memory.position
                    }
                }
            }
        }

        return modifiedText
    },
    context: function(text){
        //has to be done here and not use preciseMemory since it modifies 
        let modifiedText = text

        if (state.eventsHandler.contextVisibleStart){

            for (eventName of state.eventsHandler.contextVisibleStart){
                if (eventsHandler.utils.eventsDic[eventName]){
                    const e = eventsHandler.utils.eventsDic[eventName]
                    modifiedText = eventsHandler.functions.createStartingText(modifiedText, e, true)
                }
                // const startingText = typeof ev == "string" ? ev : ev.text
                // if (text.endsWith("\n")) {
                //     modifiedText += startingText
                //     state.modules.addToOut += startingText
                // } else if (text.endsWith(".") || text.endsWith("?") || text.endsWith("!") || text.endsWith("\"")) {
                //     modifiedText += "\n" + startingText
                //     state.modules.addToOut += "\n" + startingText
                // } else if (ev.alternateText) {
                //     state.eventsHandler.outputInsert = ev.alternateText
                //     preciseMemory.functions.setTemporaryMemory({
                //         text: ev.alternateText,
                //         position: 1
                //     })
                // }
            }

            if (modifiedText.length > info.maxChars){
                modifiedText = modifiedText.slice(0, info.memoryLength) + modifiedText.slice( -(info.maxChars - info.memoryLength) )
            }

            delete state.eventsHandler.contextVisibleStart
        }
        return modifiedText
    },
    output: function(text) {
        if (!state.eventsHandler.outputInsert){
            return text
        }
        
        let modifiedText = text
        const lines = text.split("\n")
        if (lines.length > 0){
            lines.splice(1, 0, state.eventsHandler.outputInsert)
            modifiedText = lines.join("\n")
        }

        delete state.eventsHandler.outputInsert

        return modifiedText
    }
}

wish = {
    name: "wish",
	requirements: [ 
		"eventsHandler"
	],
	order: [ //place eventsHandler before preciseMemory since eventsHandler modify context in some edge cases
		{
			name: "eventsHandler",
			location: "after" 
		}
	],
    init: function(){
        state.wish.eventModifiers = []
    },
    process: function(script){
        if (script == "input" ){
            state.wish.eventModifiers = state.wish.eventModifiers.filter((em) => {
                if (info.actionCount <= em.startAt){
                    eventsHandler.functions.removeModifier(em.modifierNumber)
                    return false
                }
                return true
            })
        }
    },
    input: function(text){
        // state.wish.eventModifiers = state.wish.eventModifiers.filter((em) => {
        //     if (em.startAt >= info.actionCount){
        //         eventsHandler.functions.removeModifier(em.modifierNumber)
        //         return false
        //     }
        //     return true
        // })

        const lowered = text.toLowerCase()
        if (lowered.includes('you wish')) {
            state.wish.eventModifiers.push({
                startAt: info.actionCount,
                modifierNumber: eventsHandler.functions.modifyEvent({
                    eventName: "wish",
                    properties: {
                        startAt: info.actionCount
                    }
                }, true)
            })
        }else if (lowered.includes('you hope')) {
            state.wish.eventModifiers.push({
                startAt: info.actionCount,
                modifierNumber: eventsHandler.functions.modifyEvent({
                    eventName: "hope",
                    properties: {
                        startAt: info.actionCount
                    }
                }, true)
            })
        }

        return text
    }
}

eventsHandler.utils.eventsDic = {
    wish: {
        duration: 3,
        memory: {
            text: "[Author's note: the next paragraphs describes how your wish comes true.]",
            position: -1,
        },
    },
    hope: {
        duration: 3,
        memory: {
            text: "[Author's note: your hope will soon come true! The next paragraphs describe how your hope comes true.]",
            position: -1,
        },
    }
}

let settings = {
  
}

let modules = [
  {name:"modules",init:function(){state.modules.initialized = true; state.modules.contextIsContinue = true}},
  preciseMemory,
  eventsHandler,
  wish
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
  const keyList = ["name","tags","requirements","incompatibles","order","onEnd","init","functions","consume","queryContext","getQuery","input","output","context","process","settings","info","version","minVersion","utils"]
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

.objectUtilitarySetterDummyName(targetDummyName)
return targetDummyName
}
function OutputModifier(text) {
let targetDummyName={}
function isNullOrWhiteSpace( input ) {

    if (typeof input === 'undefined' || input == null) return true;

    return input.replace(/\s/g, '').length < 1;
}
preciseMemory = {
    name: "preciseMemory",
    init: function(){
        state.preciseMemory.memories = []
        state.preciseMemory.nMemories = 0
    },
    functions: {
        sortMemory: function(m1,m2){
            if (m2.position - m1.position != 0){
                return m2.position - m1.position
            }
            return  m2.priority - m1.priority
        },
        setTemporaryMemory: function(object){
            //if it's a cautious front, call setCautiousFront (use alternateText etc)
            if (object.cautious && !object.position)
            {
                return preciseMemory.functions.setTemporaryCautiousFront(object)
            }

            const memory = {
                text: object.text,
                position: object.position ? object.position : 0,
                priority: object.priority ? object.priority : 0,        //high priority = low number
                number: state.preciseMemory.nMemories,
                temporary: true
            }
            state.preciseMemory.memories.push(memory);
        },
        setPreciseMemory: function(object){
            //if it's a cautious front, call setCautiousFront (use alternateText etc)
            if (object.cautious && !object.position)
            {
                return preciseMemory.functions.setCautiousFront(object)
            }

            state.preciseMemory.nMemories++
            const memory = {
                text: object.text,
                position: object.position ? object.position : 0,
                priority: object.priority ? object.priority : 0,        //high priority = low number
                number: state.preciseMemory.nMemories
            }
            if(object.noComeBack){
                memory.noComeBack = true
            }
            
            state.preciseMemory.memories.push(memory);

            return state.preciseMemory.nMemories
        },
        setCautiousFront: function(object){
            state.preciseMemory.nMemories++
            const memory = {
                text: object.text,
                position: 0,
                cautious: true,
                priority: object.priority ? object.priority : 0,        //high priority = low number
                number: state.preciseMemory.nMemories
            }
            if (object.alternateText){
                memory.alternateText = object.alternateText
            }
            if(object.noComeBack){
                memory.noComeBack = true
            }
            state.preciseMemory.memories.push(memory);

            return state.preciseMemory.nMemories
        },
        setTemporaryCautiousFront: function(object){
            const memory = {
                text: object.text,
                position: 0,
                cautious: true, 
                priority: object.priority ? object.priority : 0,        //high priority = low number
                number: state.preciseMemory.nMemories,
                temporary: true
            }
            if (object.alternateText){
                memory.alternateText = object.alternateText
            }
            state.preciseMemory.memories.push(memory);
        },
        removePreciseMemory: function(number){
            const index = state.preciseMemory.memories.findIndex((m) => {return m.number == number})
            if (index >= 0){
                state.preciseMemory.memories.splice(index,1)
            }
        }
    },
    context: function(text){

        //exit quickly if nothing to do
        if (state.preciseMemory.memories.length <= 0){
            return text
        }

        //extract lines (standart mod)
        const contextMemory = info.memoryLength ? text.slice(0, info.memoryLength) : ''
        const context = info.memoryLength ? text.slice(info.memoryLength) : text
        const lines = context.split("\n")

        //if the text ends with a white space (user input), add 1 to position
        const positionDisplacer = isNullOrWhiteSpace(lines[lines.length-1]) ? 1 : 0

        //insert lines
        //sort memories by priority
        state.preciseMemory.memories.sort(this.functions.sortMemory)
        
        for (const memory of state.preciseMemory.memories)
        {
            if (memory.noComeBack && typeof memory.startAt !== undefined && memory.startAt < info.actionCount){
                continue
            }else if (memory.noComeBack && typeof memory.startAt === undefined){
                memory.startAt = info.actionCount
            }

            const position = memory.position
            if ( position + positionDisplacer == 0 ){
                if (memory.cautious){
                    const lastLine = lines[lines.length-1].trim()
                    if (lastLine.endsWith(".") || text.endsWith("?") || text.endsWith("!") || text.endsWith("\"")){
                        lines.push(memory.text)
                    }else if (memory.alternateText){ 
                        lines.splice(-1, 0, memory.alternateText)
                    }
                }else{
                    lines.push(memory.text)
                }
            }else if ( position + positionDisplacer <= lines.length ){
                lines.splice(-(position + positionDisplacer), 0, memory.text)
            }
        }

        //purge old memory
        state.preciseMemory.memories = state.preciseMemory.memories.filter((m) => {
            return !m.temporary
        })

        //reconstruct context
        const combinedLines = lines.join("\n").slice(-(info.maxChars - info.memoryLength))
        const finalText = [contextMemory, combinedLines].join("")
        return finalText
    },
}
eventsHandler = {
    name: "eventsHandler",
	requirements: [ 
		"preciseMemory"
	],
	order: [ //place eventsHandler before preciseMemory since eventsHandler modify context in some edge cases
		{
			name: "preciseMemory",
			location: "after" 
		}
	],
    init: function () {
        state.eventsHandler.modifiers = [],
        state.eventsHandler.nModifiers = 0,
        state.eventsHandler.saMod = {},
        state.eventsHandler.crMod = {}
    },
    utils: {
        eventsDic: {}
    },
    functions: {
        modifyEvent: function (object, apply = false) {
            if (object.eventName) {
                state.eventsHandler.nModifiers++
                const modifier = {
                    eventName: object.eventName,
                    number: state.eventsHandler.nModifiers
                }
                if (object.deleteEvent) {
                    modifier.deleteEvent = true
                } else {
                    if (object.properties){
                        modifier.properties = object.properties
                    }
                    if (object.remove){
                        modifier.remove = object.remove
                    }
                }
                state.eventsHandler.modifiers.push(modifier)

                if(apply){
                    eventsHandler.functions.applyModfifier(modifier)
                }

                return state.eventsHandler.nModifiers
            }
        },
        addModifier: function (instruction, apply = false) {
            state.eventsHandler.nModifiers++
            state.eventsHandler.modifiers.push({
                instruction: instruction,
                number: state.eventsHandler.nModifiers
            })

            if(apply){
                eventsHandler.functions.applyModfifier(modifier)
            }

            return state.eventsHandler.nModifiers
        },
        createEvent: function (object, apply){
            state.eventsHandler.nModifiers++
            if (object.name){
                state.eventsHandler.modifiers.push({
                    eventName: object.name,
                    create: object,
                    number: state.eventsHandler.nModifiers
                })
            }

            if(apply){
                eventsHandler.functions.applyModfifier(modifier)
            }

            return state.eventsHandler.nModifiers
        },
        removeModifier: function (modifierNumber) {
            const index = state.eventsHandler.modifiers.findIndex((m) => { return m.number == modifierNumber })
            if (index >= 0) {
                state.eventsHandler.modifiers.splice(index, 1)
            }
        },
        computeText: function(text){
            if (typeof text === "string"){
                return text
            }
            if (typeof text === "function"){
                return text()
            }
            if (typeof text.text === "string"){
                return text.text
            }
            if (typeof text.text === "function"){
                return text.text()
            }
            return ""
        },
        createStartingText: function(text, e, isContext = false){
            if (text.length == 0 || typeof e.visibleStart === typeof undefined){
                return text
            }

            let modifiedText = text

            const dumText = text.trim()

            if (text.endsWith("\n") || dumText.endsWith(".") || dumText.endsWith("?") ||
                dumText.endsWith("!") || dumText.endsWith("\"")){
                
                // let startingText = ""
                // if (typeof e.visibleStart === "string"){
                //     startingText = text.endsWith("\n") ? 
                //         e.visibleStart : 
                //         "\n" + e.visibleStart
                // }else if (e.visibleStart.text){
                //     startingText = text.endsWith("\n") ? 
                //         eventsHandler.functions.computeText(e.visibleStart.text) : 
                //         "\n" + eventsHandler.functions.computeText(e.visibleStart.text)
                // }
                const startingText = text.endsWith("\n") ? 
                    eventsHandler.functions.computeText(e.visibleStart) : 
                    "\n" + eventsHandler.functions.computeText(e.visibleStart)

                modifiedText += startingText
                if (isContext) {
                    state.modules.addToOut += startingText
                }

            }else if (e.visibleStart.alternateText){
                const startingText = eventsHandler.functions.computeText(e.visibleStart.alternateText)

                if (state.eventsHandler.outputInsert){
                    state.eventsHandler.outputInsert += "\n" + startingText
                }else{
                    state.eventsHandler.outputInsert = startingText
                }

                preciseMemory.functions.setTemporaryMemory({
                    text: startingText,
                    position: 1
                })
            }

            return modifiedText
        },
        applyModfifier: function(modifier){
            if (modifier.instruction) {
                Function('"use strict";' + modifier.instruction)();
            } else if (modifier.create){
                if (modifier.eventName){
                    eventsHandler.utils.eventsDic[modifier.eventName] = modifier.create
                }
            } else if (modifier.eventName && eventsHandler.utils.eventsDic[modifier.eventName]) {
                if (modifier.deleteEvent) {
                    delete eventsHandler.utils.eventsDic[modifier.eventName]
                } else {
                    const targetEvent = eventsHandler.utils.eventsDic[modifier.eventName]
                    if (modifier.properties) {
                        for (const p in modifier.properties) {
                            const value = modifier.properties[p]
                            targetEvent[p] = value
                        }
                    }
                    if (modifier.remove) {
                        for (const p in modifier.remove) {
                            delete targetEvent[p]
                        }
                    }
                }
            }
        }
    },
    process: function (script) {
        if (script == "input" || (script == "context" && state.eventsHandler.contextVisibleStart)) {
            for (const modifier of state.eventsHandler.modifiers) {
                // if (modifier.instruction) {
                //     Function('"use strict";' + modifier.instruction)();
                // } else if (modifier.create){
                //     if (modifier.eventName){
                //         eventsHandler.utils.eventsDic[modifier.eventName] = modifier.create
                //     }
                // } else if (modifier.eventName && eventsHandler.utils.eventsDic[modifier.eventName]) {
                //     if (modifier.deleteEvent) {
                //         delete eventsHandler.utils.eventsDic[modifier.eventName]
                //     } else {
                //         const targetEvent = eventsHandler.utils.eventsDic[modifier.eventName]
                //         if (modifier.properties) {
                //             for (const p in modifier.properties) {
                //                 const value = modifier.properties[p]
                //                 targetEvent[p] = value
                //             }
                //         }
                //         if (modifier.remove) {
                //             for (const p in modifier.remove) {
                //                 delete targetEvent[p]
                //             }
                //         }
                //     }
                // }
                eventsHandler.functions.applyModfifier(modifier)
            }
        }
    },
    input: function (text) {
        let modifiedText = text

        //end event if it ends (change the dic, so do it first)
        const newEventDic = {}
        for (const eventName in eventsHandler.utils.eventsDic){
            const e = eventsHandler.utils.eventsDic[eventName]
            
            if (e.duration && e.startAt){
                e.endAt = e.startAt + e.duration
            }

            if (e.endAt && info.actionCount == e.endAt)
            {
                if (e.nextEvent) {
                    if (typeof e.nextEvent == "string" && this.utils.eventsDic[e.nextEvent]) {
                        const newEvent = this.utils.eventsDic[e.nextEvent]
                        if (!newEvent.startAt || info.actionCount != newEvent.startAt) {
                            newEvent.startAt = info.actionCount
                            if (state.eventsHandler.saMod[e.nextEvent]) {
                                this.functions.removeModifier(state.eventsHandler.saMod[e.nextEvent])
                            }
                            state.eventsHandler.saMod[e.nextEvent] = this.functions.modifyEvent({
                                eventName: e.nextEvent,
                                properties: {startAt: info.actionCount}
                            })
                        }
                    }else{
                        const newEvent = e.nextEvent
                        if (!newEvent.startAt || info.actionCount != newEvent.startAt) {
                            newEvent.startAt = info.actionCount
                        }
                        if (state.eventsHandler.crMod[newEvent.name]) {
                            this.functions.removeModifier(state.eventsHandler.crMod[newEvent.name])
                        }
                        state.eventsHandler.crMod[newEvent.name] = this.functions.createEvent(newEvent)
                        newEventDic[newEvent.name] = newEvent
                    }
                }
            }
        }

        for (const eventName in newEventDic){
            this.utils.eventsDic[eventName] = newEventDic[eventName]
        }


        for (const eventName in eventsHandler.utils.eventsDic) {
            const e = eventsHandler.utils.eventsDic[eventName]

            if (typeof e.startAt === typeof undefined){
                continue
            }

            if (info.actionCount == e.startAt) {
                if (e.visibleStart) {
                    if (text.length == 0){
                        if (!state.eventsHandler.contextVisibleStart){
                            state.eventsHandler.contextVisibleStart = []
                        }
                        state.eventsHandler.contextVisibleStart.push(eventName)
                    }else{
                        modifiedText = eventsHandler.functions.createStartingText(modifiedText, e)
                    }
                    // const startingText = typeof e.visibleStart === "string" ?
                    //     e.visibleStart : 

                    // }else if(typeof e.visibleStart.text === "function"){
                    //     startingText = e.visibleStart.text()
                    // }else{
                    //     startingText = e.visibleStart.text
                    // }
                    // const startingText = typeof e.visibleStart == "string" ? e.visibleStart : e.visibleStart.text
                    // if (text.length == 0){
                    //     if (!state.eventsHandler.contextVisibleStart){
                    //         state.eventsHandler.contextVisibleStart = []
                    //     }
                    //     state.eventsHandler.contextVisibleStart.push(e.visibleStart)
                    // } else if (text.endsWith("\n")) {
                    //     modifiedText += startingText
                    // } else if (text.endsWith(".") || text.endsWith("?") || text.endsWith("!") || text.endsWith("\"")) {
                    //     modifiedText += "\n" + startingText
                    // } else if (e.visibleStart.alternateText) {
                    //     state.eventsHandler.outputInsert = e.visibleStart.alternateText
                    //     preciseMemory.functions.setTemporaryMemory({
                    //         text: e.visibleStart.alternateText,
                    //         position: 1
                    //     })
                    // }
                }
            }

            if (info.actionCount >= e.startAt && e.memory){ 
                if (e.duration){
                    e.endAt = e.startAt + e.duration
                }
                if (!e.endAt || info.actionCount < e.endAt) {
                    const oldPosition = e.memory.position
                    if (typeof e.memory.position === typeof undefined){
                        e.memory.position = info.actionCount - e.startAt
                    }else if(e.memory.position < 0){
                        e.memory.position = info.actionCount - e.startAt - e.memory.position
                    }
                    preciseMemory.functions.setTemporaryMemory(e.memory)
                    if (oldPosition || oldPosition == 0){
                        e.memory.position = oldPosition
                    }else{
                        delete e.memory.position
                    }
                }
            }
        }

        return modifiedText
    },
    context: function(text){
        //has to be done here and not use preciseMemory since it modifies 
        let modifiedText = text

        if (state.eventsHandler.contextVisibleStart){

            for (eventName of state.eventsHandler.contextVisibleStart){
                if (eventsHandler.utils.eventsDic[eventName]){
                    const e = eventsHandler.utils.eventsDic[eventName]
                    modifiedText = eventsHandler.functions.createStartingText(modifiedText, e, true)
                }
                // const startingText = typeof ev == "string" ? ev : ev.text
                // if (text.endsWith("\n")) {
                //     modifiedText += startingText
                //     state.modules.addToOut += startingText
                // } else if (text.endsWith(".") || text.endsWith("?") || text.endsWith("!") || text.endsWith("\"")) {
                //     modifiedText += "\n" + startingText
                //     state.modules.addToOut += "\n" + startingText
                // } else if (ev.alternateText) {
                //     state.eventsHandler.outputInsert = ev.alternateText
                //     preciseMemory.functions.setTemporaryMemory({
                //         text: ev.alternateText,
                //         position: 1
                //     })
                // }
            }

            if (modifiedText.length > info.maxChars){
                modifiedText = modifiedText.slice(0, info.memoryLength) + modifiedText.slice( -(info.maxChars - info.memoryLength) )
            }

            delete state.eventsHandler.contextVisibleStart
        }
        return modifiedText
    },
    output: function(text) {
        if (!state.eventsHandler.outputInsert){
            return text
        }
        
        let modifiedText = text
        const lines = text.split("\n")
        if (lines.length > 0){
            lines.splice(1, 0, state.eventsHandler.outputInsert)
            modifiedText = lines.join("\n")
        }

        delete state.eventsHandler.outputInsert

        return modifiedText
    }
}

wish = {
    name: "wish",
	requirements: [ 
		"eventsHandler"
	],
	order: [ //place eventsHandler before preciseMemory since eventsHandler modify context in some edge cases
		{
			name: "eventsHandler",
			location: "after" 
		}
	],
    init: function(){
        state.wish.eventModifiers = []
    },
    process: function(script){
        if (script == "input" ){
            state.wish.eventModifiers = state.wish.eventModifiers.filter((em) => {
                if (info.actionCount <= em.startAt){
                    eventsHandler.functions.removeModifier(em.modifierNumber)
                    return false
                }
                return true
            })
        }
    },
    input: function(text){
        // state.wish.eventModifiers = state.wish.eventModifiers.filter((em) => {
        //     if (em.startAt >= info.actionCount){
        //         eventsHandler.functions.removeModifier(em.modifierNumber)
        //         return false
        //     }
        //     return true
        // })

        const lowered = text.toLowerCase()
        if (lowered.includes('you wish')) {
            state.wish.eventModifiers.push({
                startAt: info.actionCount,
                modifierNumber: eventsHandler.functions.modifyEvent({
                    eventName: "wish",
                    properties: {
                        startAt: info.actionCount
                    }
                }, true)
            })
        }else if (lowered.includes('you hope')) {
            state.wish.eventModifiers.push({
                startAt: info.actionCount,
                modifierNumber: eventsHandler.functions.modifyEvent({
                    eventName: "hope",
                    properties: {
                        startAt: info.actionCount
                    }
                }, true)
            })
        }

        return text
    }
}

eventsHandler.utils.eventsDic = {
    wish: {
        duration: 3,
        memory: {
            text: "[Author's note: the next paragraphs describes how your wish comes true.]",
            position: -1,
        },
    },
    hope: {
        duration: 3,
        memory: {
            text: "[Author's note: your hope will soon come true! The next paragraphs describe how your hope comes true.]",
            position: -1,
        },
    }
}

let settings = {
  
}

let modules = [
  {name:"modules",init:function(){state.modules.initialized = true; state.modules.contextIsContinue = true}},
  preciseMemory,
  eventsHandler,
  wish
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
  const keyList = ["name","tags","requirements","incompatibles","order","onEnd","init","functions","consume","queryContext","getQuery","input","output","context","process","settings","info","version","minVersion","utils"]
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


const modifier = (text) => {
  if(state.modules.queryAI) for(module of modules) if(module.name === state.modules.queryModule && module.getQuery) {
    state.modules.forceOutput = ""
    module.getQuery(text)
    if(state.memory.authorsNote === "") delete state.memory.authorsNote
    return {text: state.modules.forceOutput}
  }

  for(i of state.modules.order) if(modules[i].process) modules[i].process("output")
  let modifiedText = text
  for(i of state.modules.order) if(modules[i].output) modifiedText = modules[i].output(modifiedText)
  state.modules.contextIsContinue = true
  if(state.modules.addToOut){
    modifiedText = state.modules.addToOut + modifiedText;
    delete state.modules.addToOut
  }
  if(state.memory.authorsNote === "") delete state.memory.authorsNote
  return { text: modifiedText }
}

// Don't modify this part
modifier(text)
  
.objectUtilitarySetterDummyName(targetDummyName)
return targetDummyName
}
