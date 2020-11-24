eventsHandler.utils.eventsDic.eventTemplate = {
    name: "eventTemplate",
    startAt: 2,             //turn at which the event starts (included)
    endAt: 5,               //turn at which the event end (excluded)
    visibleStart: {
        text: "text displayed at the beginning of the event if the last sentence ended.",
        alternateText: "text displayed after the first line break of answer if the last sentence didn't end."
    },
    memory: {
        text: "[Author's note: this is the description of the event. The text is very descriptive.]",
        position: 1    //fixed position
    },
    nextEvent: "nextEventName"
}

eventsHandler.utils.eventsDic.nextEventName = {
    name: "nextEventName",
    duration: 2,               //overwrite endAt ; more useful if the event doesn't have a fixed start
    visibleStart: {
        text: "nextEvent starting text.",
        alternateText: function(){return eventsHandler.utils.eventsDic.nextEventName.visibleStart.text}
    },
    memory: {
        text: "[Author's note: this is the description of the next event.]",
        cautious: true,
        alternateText: "[Author's note: this is the description of the next event.]"
    },
    nextEvent: {
        name: "finalEvent",
        // no end
        // no visibleStrat
        memory: {
            text: "[Author's note: this is the final permanent event.]",
            position: -2  //negative : moving, start at 2
        }
    }
}
