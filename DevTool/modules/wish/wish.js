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