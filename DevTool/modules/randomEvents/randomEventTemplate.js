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