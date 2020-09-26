
const modifier = (text) => {
    let modifiedText = text
    

    //either put your code here, either call another function
    // do nothing if the function isn't defined
    if (typeof myInputMod === "function")
        modifiedText = myInputMod(modifiedText)
    //end of the part where you put your code


    // You must return an object with the text property defined.
    return { text: modifiedText }
  }
  
  // Don't modify this part
  modifier(text)
  