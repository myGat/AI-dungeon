var state = {memory: {}}
var info={actionCount:0}
var worldEntries = []
var quests = []
memory = ""

function InputModifier(text) {
let targetDummyName={}
debugMode = true //set to false to deactivate the debug commands
debugVerbosity = 0 //send to 1 to have some messages send by debug commands 

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

randomEvents = {
    name: "randomEvents",
    requirements: ["preciseMemory", "eventsHandler"],
	order: [ //place randomEvents before eventsHandler since randomEvents create event
		{
			name: "eventsHandler",
			location: "after" 
		}
	],
    init: function(){
        state.randomEvents.activatedEvents = []
    },
    functions: {
        computeDuration: function(e){
            let duration = e.duration

            if (e.nextEvent){
                if (typeof e.nextEvent === "string"){
                    duration += randomEvents.functions.computeDuration(eventsHandler.utils.eventsDic[e.nextEvent])
                }else{
                    duration += randomEvents.functions.computeDuration(e.nextEvent)
                }
            }
            return duration
        },
        // launchEvent(re){
        //     const activatedEvent = {}

        //     if (typeof re.duration === "function"){
        //         re.duration = re.duration()
        //     }
        //     activatedEvent.duration = re.duration

        //     re.StartAt = info.actionCount
        //     activatedEvent.

        // }
    },
    utils: {
        //proba: 0.3,
        eventsDic: {}
    },
    process: function(script){
        if (script == "input" ){
            state.randomEvents.activatedEvents = state.randomEvents.activatedEvents.filter((ae) => {
                if (info.actionCount < ae.startAt || ae.startAt + ae.duration + 25 <= info.actionCount){
                    eventsHandler.functions.removeModifier(ae.modifierNumber)
                    return false
                }
                return true
            })
        }
    },
    input: function (text) {
        // state.randomEvents.activatedEvents = state.randomEvents.activatedEvents.filter((ae) => {
        //     if (ae.startAt < info.actionCount || ae.startAt + ae.duration >= info.actionCount + 25){
        //         eventsHandler.functions.removeModifier(ae.modifierNumber)
        //         return false
        //     }
        //     return true
        // })
        if(info.actionCount < settings.randomEvents.startAt){
            return text
        }

        index = state.randomEvents.activatedEvents.findIndex((ae) => {
            return (ae.startAt <= info.actionCount &&  info.actionCount < ae.startAt + ae.duration)
        })

        if (index === -1){
            const roll = Math.random()
            if (debugMode){state.message += "randomEvents rolled " + roll + "\n"}

            if (roll <= settings.randomEvents.proba) {
                let sumWeight = 0
                for (const e in randomEvents.utils.eventsDic) {
                    sumWeight += randomEvents.utils.eventsDic[e].weight
                }

                let selected
                let selectedName
                let roll2 = Math.random() * sumWeight
                if (debugMode){state.message += "randomEvents chose event " + roll2 + "\n"}

                for (const e in randomEvents.utils.eventsDic) {
                    if (roll2 <= randomEvents.utils.eventsDic[e].weight) {
                        selected = randomEvents.utils.eventsDic[e]
                        selectedName = e
                        break
                    } else {
                        roll2 -= randomEvents.utils.eventsDic[e].weight
                    }
                }


                if(selected && selected.eventName && eventsHandler.utils.eventsDic[selected.eventName]){
                    const theEvent = eventsHandler.utils.eventsDic[selected.eventName]
                    const modifier = {eventName: selected.eventName}
                    modifier.properties = selected.modifyProperties ? selected.modifyProperties : {}
                    modifier.properties.startAt = info.actionCount

                    const activatedEvent = {
                        modifierNumber: eventsHandler.functions.modifyEvent(modifier, true),
                        startAt: info.actionCount,
                        duration: randomEvents.functions.computeDuration(theEvent)
                    }
                    // activatedEvent.modifierNumber = eventsHandler.functions.modifyEvent({
                        //     eventName: selected.eventName,
                        //     properties: {startAt: info.actionCount}
                        // })
                    // activatedEvent.startAt = info.actionCount
                    // activatedEvent.duration = randomEvents.functions.computeDuration(theEvent)
                    state.randomEvents.activatedEvents.push(activatedEvent)
                    
                    //theEvent.startAt = info.actionCount
                    
                    if (selected.instructionModifier){
                        const activatedEvent2 = {
                            modifierNumber: eventsHandler.functions.addModifier(selected.instructionModifier),
                            startAt: activatedEvent.startAt,
                            duration: activatedEvent.duration
                        }
                        state.randomEvents.activatedEvents.push(selected.instructionModifier)
                    
                        //TODO
                        eventsHandler.functions.applyInstructionModifier(modifier)
                    }
                }
            }
        }

        return text
    },
    settings: [
        {name:"proba", default:0.33},
        {name:"startAt", default:1}
    ],
}


eventsHandler.utils.eventsDic = {
    randomEvent1: {
        duration: 2,
        visibleStart: {
            text: "text displayed at the beginning of randomEvent1 if the last sentence ended.",
            alternateText: "text displayed after the first line break of answer if the last sentence didn't end."
        },
        memory: {
            text: "[Author's note: this is the description of randomEvent1.]",
            position: 1    //fixed position
        },
        nextEvent: "event1Continuation"
    },
    event1Continuation: {
        duration: 1,               //overwrite endAt ; more useful if the event doesn't have a fixed start
        visibleStart: {
            text: function(){
                const roll = Math.random() * 3
                if (roll < 1){
                    return "event1Continuation starting text."
                }else if (roll < 2){
                    return "continuation alternate text."
                }
                return "continuation third text."
            },
            alternateText: function(){return eventsHandler.utils.eventsDic.event1Continuation.visibleStart.text()}
        },
        memory: {
            text: "[Author's note: this is the description of the continuation.]",
            cautious: true,
            alternateText: "[Author's note: this is the description of the continuation.]"
        },
    },
    secondRandomEvent: {
        duration: 3,
        visibleStart: function(){
            possible = [
                "secondEvent",
                "alternate second event"
            ]
            return possible[Math.floor(Math.random() * possible.length)]
        },
        memory: {
            text: "[Author's note: this is the description of the secondEvent.]",
            alternateText: function(){return eventsHandler.utils.eventsDic.secondRandomEvent.memory.text}
        },
    }
}

randomEvents.utils.eventsDic = {
    randomEvent1: {
        weight: 2,
        eventName: "randomEvent1"
    },
    secondRandomEvent: {
        name: "event 2",
        weight: 1,
        eventName: "secondRandomEvent"
    }
}
//requires the commandHelper : https://github.com/myGat/AI-dungeon/blob/master/DevTool/modules/commandHandler/commandHelper.js

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
  		code: "https://github.com/myGat/AI-dungeon/tree/master/DevTool/modules/commandHandler",
  		description: "A module that handle commands (add new commands in commandHelper.commandList"
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
// requires ../../utils.isNullOrWhiteSpace

commandHelper.commandList.describe = {
    name: "describe", 
    description: "Try to force the AI to describe something by temporarily filling the frontMemory",
    usage: 'text',
    execute: function (args) {
        if (!args || args.length == 0) {
            throw `${settings.commandHandler.prefix}describe: no argument provided.`
        }

        if (!isNullOrWhiteSpace(state.memory.frontMemory)){
          this.dontConsume.outputArgs = [state.memory.frontMemory]
        }
        const textToDisplay = args.join(' ');
        state.memory.frontMemory = `[ Author's note: the following paragraphs describe ${textToDisplay}. The text is very descriptive about it. ]`;
    },
    dontConsume: {},
    output: function(output){
        if (state.commandHandler.outputArgs){
          state.memory.frontMemory = state.commandHandler.outputArgs[0]
        }else{
            delete state.memory.frontMemory
        }
        //isNullOrWhitespace(text) ? delete state.memory.frontMemory : state.memory.frontMemory = textToDisplay;
        return output
    }
}

commandHelper.commandList.describePrompt = {
    name: "describePrompt", 
    description: 'Try to force the AI to describe something using a visible prompt',
    usage: 'text',
    noredo: true, //no need to redo it since the prompt stay
    execute: function (args) {
        if (!args || args.length == 0) {
            throw `${settings.commandHandler.prefix}${this.name}: no argument provided.`
        }

        this.dontConsume.inputArgs = args;
    },
    dontConsume: {},
    input: function(input){
        return `\n> Describe ${state.commandHandler.inputArgs.join(' ')}`;
    }
}

commandHelper.aliasList.d = { command:"describe"} 
commandHelper.aliasList.dp = { command:"describePrompt"} 

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
debugMode = true //set to false to deactivate the debug commands
debugVerbosity = 0 //send to 1 to have some messages send by debug commands 

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

randomEvents = {
    name: "randomEvents",
    requirements: ["preciseMemory", "eventsHandler"],
	order: [ //place randomEvents before eventsHandler since randomEvents create event
		{
			name: "eventsHandler",
			location: "after" 
		}
	],
    init: function(){
        state.randomEvents.activatedEvents = []
    },
    functions: {
        computeDuration: function(e){
            let duration = e.duration

            if (e.nextEvent){
                if (typeof e.nextEvent === "string"){
                    duration += randomEvents.functions.computeDuration(eventsHandler.utils.eventsDic[e.nextEvent])
                }else{
                    duration += randomEvents.functions.computeDuration(e.nextEvent)
                }
            }
            return duration
        },
        // launchEvent(re){
        //     const activatedEvent = {}

        //     if (typeof re.duration === "function"){
        //         re.duration = re.duration()
        //     }
        //     activatedEvent.duration = re.duration

        //     re.StartAt = info.actionCount
        //     activatedEvent.

        // }
    },
    utils: {
        //proba: 0.3,
        eventsDic: {}
    },
    process: function(script){
        if (script == "input" ){
            state.randomEvents.activatedEvents = state.randomEvents.activatedEvents.filter((ae) => {
                if (info.actionCount < ae.startAt || ae.startAt + ae.duration + 25 <= info.actionCount){
                    eventsHandler.functions.removeModifier(ae.modifierNumber)
                    return false
                }
                return true
            })
        }
    },
    input: function (text) {
        // state.randomEvents.activatedEvents = state.randomEvents.activatedEvents.filter((ae) => {
        //     if (ae.startAt < info.actionCount || ae.startAt + ae.duration >= info.actionCount + 25){
        //         eventsHandler.functions.removeModifier(ae.modifierNumber)
        //         return false
        //     }
        //     return true
        // })
        if(info.actionCount < settings.randomEvents.startAt){
            return text
        }

        index = state.randomEvents.activatedEvents.findIndex((ae) => {
            return (ae.startAt <= info.actionCount &&  info.actionCount < ae.startAt + ae.duration)
        })

        if (index === -1){
            const roll = Math.random()
            if (debugMode){state.message += "randomEvents rolled " + roll + "\n"}

            if (roll <= settings.randomEvents.proba) {
                let sumWeight = 0
                for (const e in randomEvents.utils.eventsDic) {
                    sumWeight += randomEvents.utils.eventsDic[e].weight
                }

                let selected
                let selectedName
                let roll2 = Math.random() * sumWeight
                if (debugMode){state.message += "randomEvents chose event " + roll2 + "\n"}

                for (const e in randomEvents.utils.eventsDic) {
                    if (roll2 <= randomEvents.utils.eventsDic[e].weight) {
                        selected = randomEvents.utils.eventsDic[e]
                        selectedName = e
                        break
                    } else {
                        roll2 -= randomEvents.utils.eventsDic[e].weight
                    }
                }


                if(selected && selected.eventName && eventsHandler.utils.eventsDic[selected.eventName]){
                    const theEvent = eventsHandler.utils.eventsDic[selected.eventName]
                    const modifier = {eventName: selected.eventName}
                    modifier.properties = selected.modifyProperties ? selected.modifyProperties : {}
                    modifier.properties.startAt = info.actionCount

                    const activatedEvent = {
                        modifierNumber: eventsHandler.functions.modifyEvent(modifier, true),
                        startAt: info.actionCount,
                        duration: randomEvents.functions.computeDuration(theEvent)
                    }
                    // activatedEvent.modifierNumber = eventsHandler.functions.modifyEvent({
                        //     eventName: selected.eventName,
                        //     properties: {startAt: info.actionCount}
                        // })
                    // activatedEvent.startAt = info.actionCount
                    // activatedEvent.duration = randomEvents.functions.computeDuration(theEvent)
                    state.randomEvents.activatedEvents.push(activatedEvent)
                    
                    //theEvent.startAt = info.actionCount
                    
                    if (selected.instructionModifier){
                        const activatedEvent2 = {
                            modifierNumber: eventsHandler.functions.addModifier(selected.instructionModifier),
                            startAt: activatedEvent.startAt,
                            duration: activatedEvent.duration
                        }
                        state.randomEvents.activatedEvents.push(selected.instructionModifier)
                    
                        //TODO
                        eventsHandler.functions.applyInstructionModifier(modifier)
                    }
                }
            }
        }

        return text
    },
    settings: [
        {name:"proba", default:0.33},
        {name:"startAt", default:1}
    ],
}


eventsHandler.utils.eventsDic = {
    randomEvent1: {
        duration: 2,
        visibleStart: {
            text: "text displayed at the beginning of randomEvent1 if the last sentence ended.",
            alternateText: "text displayed after the first line break of answer if the last sentence didn't end."
        },
        memory: {
            text: "[Author's note: this is the description of randomEvent1.]",
            position: 1    //fixed position
        },
        nextEvent: "event1Continuation"
    },
    event1Continuation: {
        duration: 1,               //overwrite endAt ; more useful if the event doesn't have a fixed start
        visibleStart: {
            text: function(){
                const roll = Math.random() * 3
                if (roll < 1){
                    return "event1Continuation starting text."
                }else if (roll < 2){
                    return "continuation alternate text."
                }
                return "continuation third text."
            },
            alternateText: function(){return eventsHandler.utils.eventsDic.event1Continuation.visibleStart.text()}
        },
        memory: {
            text: "[Author's note: this is the description of the continuation.]",
            cautious: true,
            alternateText: "[Author's note: this is the description of the continuation.]"
        },
    },
    secondRandomEvent: {
        duration: 3,
        visibleStart: function(){
            possible = [
                "secondEvent",
                "alternate second event"
            ]
            return possible[Math.floor(Math.random() * possible.length)]
        },
        memory: {
            text: "[Author's note: this is the description of the secondEvent.]",
            alternateText: function(){return eventsHandler.utils.eventsDic.secondRandomEvent.memory.text}
        },
    }
}

randomEvents.utils.eventsDic = {
    randomEvent1: {
        weight: 2,
        eventName: "randomEvent1"
    },
    secondRandomEvent: {
        name: "event 2",
        weight: 1,
        eventName: "secondRandomEvent"
    }
}
//requires the commandHelper : https://github.com/myGat/AI-dungeon/blob/master/DevTool/modules/commandHandler/commandHelper.js

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
  		code: "https://github.com/myGat/AI-dungeon/tree/master/DevTool/modules/commandHandler",
  		description: "A module that handle commands (add new commands in commandHelper.commandList"
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
// requires ../../utils.isNullOrWhiteSpace

commandHelper.commandList.describe = {
    name: "describe", 
    description: "Try to force the AI to describe something by temporarily filling the frontMemory",
    usage: 'text',
    execute: function (args) {
        if (!args || args.length == 0) {
            throw `${settings.commandHandler.prefix}describe: no argument provided.`
        }

        if (!isNullOrWhiteSpace(state.memory.frontMemory)){
          this.dontConsume.outputArgs = [state.memory.frontMemory]
        }
        const textToDisplay = args.join(' ');
        state.memory.frontMemory = `[ Author's note: the following paragraphs describe ${textToDisplay}. The text is very descriptive about it. ]`;
    },
    dontConsume: {},
    output: function(output){
        if (state.commandHandler.outputArgs){
          state.memory.frontMemory = state.commandHandler.outputArgs[0]
        }else{
            delete state.memory.frontMemory
        }
        //isNullOrWhitespace(text) ? delete state.memory.frontMemory : state.memory.frontMemory = textToDisplay;
        return output
    }
}

commandHelper.commandList.describePrompt = {
    name: "describePrompt", 
    description: 'Try to force the AI to describe something using a visible prompt',
    usage: 'text',
    noredo: true, //no need to redo it since the prompt stay
    execute: function (args) {
        if (!args || args.length == 0) {
            throw `${settings.commandHandler.prefix}${this.name}: no argument provided.`
        }

        this.dontConsume.inputArgs = args;
    },
    dontConsume: {},
    input: function(input){
        return `\n> Describe ${state.commandHandler.inputArgs.join(' ')}`;
    }
}

commandHelper.aliasList.d = { command:"describe"} 
commandHelper.aliasList.dp = { command:"describePrompt"} 

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
debugMode = true //set to false to deactivate the debug commands
debugVerbosity = 0 //send to 1 to have some messages send by debug commands 

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

randomEvents = {
    name: "randomEvents",
    requirements: ["preciseMemory", "eventsHandler"],
	order: [ //place randomEvents before eventsHandler since randomEvents create event
		{
			name: "eventsHandler",
			location: "after" 
		}
	],
    init: function(){
        state.randomEvents.activatedEvents = []
    },
    functions: {
        computeDuration: function(e){
            let duration = e.duration

            if (e.nextEvent){
                if (typeof e.nextEvent === "string"){
                    duration += randomEvents.functions.computeDuration(eventsHandler.utils.eventsDic[e.nextEvent])
                }else{
                    duration += randomEvents.functions.computeDuration(e.nextEvent)
                }
            }
            return duration
        },
        // launchEvent(re){
        //     const activatedEvent = {}

        //     if (typeof re.duration === "function"){
        //         re.duration = re.duration()
        //     }
        //     activatedEvent.duration = re.duration

        //     re.StartAt = info.actionCount
        //     activatedEvent.

        // }
    },
    utils: {
        //proba: 0.3,
        eventsDic: {}
    },
    process: function(script){
        if (script == "input" ){
            state.randomEvents.activatedEvents = state.randomEvents.activatedEvents.filter((ae) => {
                if (info.actionCount < ae.startAt || ae.startAt + ae.duration + 25 <= info.actionCount){
                    eventsHandler.functions.removeModifier(ae.modifierNumber)
                    return false
                }
                return true
            })
        }
    },
    input: function (text) {
        // state.randomEvents.activatedEvents = state.randomEvents.activatedEvents.filter((ae) => {
        //     if (ae.startAt < info.actionCount || ae.startAt + ae.duration >= info.actionCount + 25){
        //         eventsHandler.functions.removeModifier(ae.modifierNumber)
        //         return false
        //     }
        //     return true
        // })
        if(info.actionCount < settings.randomEvents.startAt){
            return text
        }

        index = state.randomEvents.activatedEvents.findIndex((ae) => {
            return (ae.startAt <= info.actionCount &&  info.actionCount < ae.startAt + ae.duration)
        })

        if (index === -1){
            const roll = Math.random()
            if (debugMode){state.message += "randomEvents rolled " + roll + "\n"}

            if (roll <= settings.randomEvents.proba) {
                let sumWeight = 0
                for (const e in randomEvents.utils.eventsDic) {
                    sumWeight += randomEvents.utils.eventsDic[e].weight
                }

                let selected
                let selectedName
                let roll2 = Math.random() * sumWeight
                if (debugMode){state.message += "randomEvents chose event " + roll2 + "\n"}

                for (const e in randomEvents.utils.eventsDic) {
                    if (roll2 <= randomEvents.utils.eventsDic[e].weight) {
                        selected = randomEvents.utils.eventsDic[e]
                        selectedName = e
                        break
                    } else {
                        roll2 -= randomEvents.utils.eventsDic[e].weight
                    }
                }


                if(selected && selected.eventName && eventsHandler.utils.eventsDic[selected.eventName]){
                    const theEvent = eventsHandler.utils.eventsDic[selected.eventName]
                    const modifier = {eventName: selected.eventName}
                    modifier.properties = selected.modifyProperties ? selected.modifyProperties : {}
                    modifier.properties.startAt = info.actionCount

                    const activatedEvent = {
                        modifierNumber: eventsHandler.functions.modifyEvent(modifier, true),
                        startAt: info.actionCount,
                        duration: randomEvents.functions.computeDuration(theEvent)
                    }
                    // activatedEvent.modifierNumber = eventsHandler.functions.modifyEvent({
                        //     eventName: selected.eventName,
                        //     properties: {startAt: info.actionCount}
                        // })
                    // activatedEvent.startAt = info.actionCount
                    // activatedEvent.duration = randomEvents.functions.computeDuration(theEvent)
                    state.randomEvents.activatedEvents.push(activatedEvent)
                    
                    //theEvent.startAt = info.actionCount
                    
                    if (selected.instructionModifier){
                        const activatedEvent2 = {
                            modifierNumber: eventsHandler.functions.addModifier(selected.instructionModifier),
                            startAt: activatedEvent.startAt,
                            duration: activatedEvent.duration
                        }
                        state.randomEvents.activatedEvents.push(selected.instructionModifier)
                    
                        //TODO
                        eventsHandler.functions.applyInstructionModifier(modifier)
                    }
                }
            }
        }

        return text
    },
    settings: [
        {name:"proba", default:0.33},
        {name:"startAt", default:1}
    ],
}


eventsHandler.utils.eventsDic = {
    randomEvent1: {
        duration: 2,
        visibleStart: {
            text: "text displayed at the beginning of randomEvent1 if the last sentence ended.",
            alternateText: "text displayed after the first line break of answer if the last sentence didn't end."
        },
        memory: {
            text: "[Author's note: this is the description of randomEvent1.]",
            position: 1    //fixed position
        },
        nextEvent: "event1Continuation"
    },
    event1Continuation: {
        duration: 1,               //overwrite endAt ; more useful if the event doesn't have a fixed start
        visibleStart: {
            text: function(){
                const roll = Math.random() * 3
                if (roll < 1){
                    return "event1Continuation starting text."
                }else if (roll < 2){
                    return "continuation alternate text."
                }
                return "continuation third text."
            },
            alternateText: function(){return eventsHandler.utils.eventsDic.event1Continuation.visibleStart.text()}
        },
        memory: {
            text: "[Author's note: this is the description of the continuation.]",
            cautious: true,
            alternateText: "[Author's note: this is the description of the continuation.]"
        },
    },
    secondRandomEvent: {
        duration: 3,
        visibleStart: function(){
            possible = [
                "secondEvent",
                "alternate second event"
            ]
            return possible[Math.floor(Math.random() * possible.length)]
        },
        memory: {
            text: "[Author's note: this is the description of the secondEvent.]",
            alternateText: function(){return eventsHandler.utils.eventsDic.secondRandomEvent.memory.text}
        },
    }
}

randomEvents.utils.eventsDic = {
    randomEvent1: {
        weight: 2,
        eventName: "randomEvent1"
    },
    secondRandomEvent: {
        name: "event 2",
        weight: 1,
        eventName: "secondRandomEvent"
    }
}
//requires the commandHelper : https://github.com/myGat/AI-dungeon/blob/master/DevTool/modules/commandHandler/commandHelper.js

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
  		code: "https://github.com/myGat/AI-dungeon/tree/master/DevTool/modules/commandHandler",
  		description: "A module that handle commands (add new commands in commandHelper.commandList"
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
// requires ../../utils.isNullOrWhiteSpace

commandHelper.commandList.describe = {
    name: "describe", 
    description: "Try to force the AI to describe something by temporarily filling the frontMemory",
    usage: 'text',
    execute: function (args) {
        if (!args || args.length == 0) {
            throw `${settings.commandHandler.prefix}describe: no argument provided.`
        }

        if (!isNullOrWhiteSpace(state.memory.frontMemory)){
          this.dontConsume.outputArgs = [state.memory.frontMemory]
        }
        const textToDisplay = args.join(' ');
        state.memory.frontMemory = `[ Author's note: the following paragraphs describe ${textToDisplay}. The text is very descriptive about it. ]`;
    },
    dontConsume: {},
    output: function(output){
        if (state.commandHandler.outputArgs){
          state.memory.frontMemory = state.commandHandler.outputArgs[0]
        }else{
            delete state.memory.frontMemory
        }
        //isNullOrWhitespace(text) ? delete state.memory.frontMemory : state.memory.frontMemory = textToDisplay;
        return output
    }
}

commandHelper.commandList.describePrompt = {
    name: "describePrompt", 
    description: 'Try to force the AI to describe something using a visible prompt',
    usage: 'text',
    noredo: true, //no need to redo it since the prompt stay
    execute: function (args) {
        if (!args || args.length == 0) {
            throw `${settings.commandHandler.prefix}${this.name}: no argument provided.`
        }

        this.dontConsume.inputArgs = args;
    },
    dontConsume: {},
    input: function(input){
        return `\n> Describe ${state.commandHandler.inputArgs.join(' ')}`;
    }
}

commandHelper.aliasList.d = { command:"describe"} 
commandHelper.aliasList.dp = { command:"describePrompt"} 

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
