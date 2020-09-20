
// Play the scenario at: https://play.aidungeon.io/main/scenarioView?publicId=691391a0-fb5a-11ea-8518-3ff568674536

// info.memoryLength is the length of the memory section of text.
// info.maxChars is the maximum length that text can be. The server will truncate the text you return to this length.

const modifier = (text) => {
  const memory = info.memoryLength ? text.slice(0, info.memoryLength) : ''
  const context = info.memoryLength ? text.slice(info.memoryLength + 1) : text
  const lines = context.split("\n")
  for (const iLine in lines){
    lines[iLine] = lines[iLine].replace(/Author's note/, "Note de l'Auteur")
  }
  // Make sure the new context isn't too long, or it will get truncated by the server.
  const combinedLines = lines.join("\n").slice(-(info.maxChars - info.memoryLength))
  const finalText = [memory, combinedLines].join("")
  return { text: finalText }
}

// Don't modify this part
modifier(text)
