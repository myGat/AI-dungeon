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

