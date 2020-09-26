function myContextMod(context){

    const lines = context.split("\n")
    if (lines.length > 2) {
      // Uncomment to use this!
      // const authorsNote = "Everyone in this story is an AI programmer."
      // lines.splice(-3, 0, `[Author's note: ${authorsNote}]`)
    }
    // Make sure the new context isn't too long, or it will get truncated by the server.
    return lines.join("\n").slice(-(info.maxChars - info.memoryLength))

}