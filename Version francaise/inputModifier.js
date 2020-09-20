
// play the scenario at https://play.aidungeon.io/main/scenarioView?publicId=691391a0-fb5a-11ea-8518-3ff568674536

const modifier = (text) => {
  let modifiedText = text
  
  
  if (text.startsWith("\n> You say"))
  {
    modifiedText = modifiedText.replace("You say", "Dire ")
  }
  else if(text.startsWith("\n> You "))
    
  modifiedText = modifiedText.replace("You ", "")
    
    
  let firstCharIndex
  const firstChar = modifiedText.match(/[a-zA-Z]/)
  if(firstChar)
      firstCharIndex = firstChar.index;
      
  if (firstCharIndex){
    let capiatlized = ""
      
    if (firstCharIndex >= 1)
      capiatlized += modifiedText.substring(0, firstCharIndex)
    
    capiatlized += modifiedText.charAt(firstCharIndex).toUpperCase()
    
    if (firstCharIndex < modifiedText.length)
      capiatlized += modifiedText.substring(firstCharIndex + 1, modifiedText.length)
      
    modifiedText = capiatlized
  }
  //modifiedText = modifiedText.charAt(0).toUpperCase() + modifiedText.slice(1)
  
  // You must return an object with the text property defined.
  return { text: modifiedText }
}

// Don't modify this part
modifier(text)
