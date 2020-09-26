
//this is the example of script given on AID
// Checkout the repo examples to get an idea of other ways you can use scripting
// https://github.com/AIDungeon/Scripting/blob/master/examples

// info.memoryLength is the length of the memory section of text.
// info.maxChars is the maximum length that text can be. The server will truncate the text you return to this length.

// This modifier re-implements Author's Note as an example.
const modifier = (text) => {
    const memory = info.memoryLength ? text.slice(0, info.memoryLength) : ''
    const context = info.memoryLength ? text.slice(info.memoryLength + 1) : text

    let modifiedContext = context


    //either put your code here, either call another function
    // do nothing if the function isn't defined
    if (typeof myContextMod === "function")
        modifiedContext = myContextMod(modifiedContext)
    //end of the part where you put your code


    const finalText = [memory, modifiedContext].join("")
    return { text: finalText }
  }
  
  // Don't modify this part
  modifier(text)
  