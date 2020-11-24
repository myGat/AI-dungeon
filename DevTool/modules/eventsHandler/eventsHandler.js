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
