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