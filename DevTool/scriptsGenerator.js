
const buildFiles = {
    sharedLiraryFiles: ['./examples/shared library example.js'],
    inputModFiles: ['./examples/input modifier example.js', './templates/input modifier template.js'],
    contextModFiles: ['./templates/context modifier template.js'],
    outputModFiles: ['./examples/output modifier example.js', './templates/output modifier template.js']
}


var path = require("path")
const generatedScriptsFolder = "generated scripts"
const webpageFolder = "webpage"

const generatedSharedLibrary = path.join(generatedScriptsFolder, "shared library (generated).js")
const generatedInputMod = path.join(generatedScriptsFolder, "input modifier (generated).js")
const generatedContextMod = path.join(generatedScriptsFolder, "context modifier (generated).js")
const generatedOutputMod = path.join(generatedScriptsFolder, "output modifier (generated).js")

const finalScript = path.join(webpageFolder, "final script (generated).js")
const indexPage = path.join(webpageFolder, "index.html")
const pageScript = path.join(webpageFolder, "pageScript.js")


exports.indexPage = indexPage
exports.finalScript = finalScript
exports.pageScript = pageScript
var fs = require('fs');


exports.createScriptFiles = () => {
    
    if(!fs.existsSync(generatedScriptsFolder))
    fs.mkdirSync(generatedScriptsFolder)

    createSharedLibrary()

    createInputModScript()

    createContextModScript()

    createOutputModScript()


    createFinalScript()
}

function createSharedLibrary(){
    fs.writeFileSync(generatedSharedLibrary, "")
    buildFiles.sharedLiraryFiles.forEach(f => {
        fs.appendFileSync(generatedSharedLibrary, fs.readFileSync(f))
    })
}

function createInputModScript(){
    fs.writeFileSync(generatedInputMod, "")
    buildFiles.inputModFiles.forEach(f => {
        fs.appendFileSync(generatedInputMod, fs.readFileSync(f))
    })
}

function createContextModScript(){
    fs.writeFileSync(generatedContextMod, "")
    buildFiles.contextModFiles.forEach(f => {
        fs.appendFileSync(generatedContextMod, fs.readFileSync(f))
    })
}

function createOutputModScript(){
    fs.writeFileSync(generatedOutputMod, "")
    buildFiles.outputModFiles.forEach(f => {
        fs.appendFileSync(generatedOutputMod, fs.readFileSync(f))
    })
}

function createFinalScript(){
    fs.writeFileSync(finalScript, "var state = {memory: {}}\nvar info={actionCount:0}\nvar worldEntries = []\n")
    fs.appendFileSync(finalScript, fs.readFileSync(generatedSharedLibrary))
    fs.appendFileSync(finalScript, "\nfunction InputModifier(text) {\n");
    fs.appendFileSync(finalScript, fs.readFileSync(generatedInputMod))
    fs.appendFileSync(finalScript, "\nreturn modifier(text).text\n}\nfunction ContextModifier(text) {\n");
    fs.appendFileSync(finalScript, fs.readFileSync(generatedContextMod))
    fs.appendFileSync(finalScript, "\nreturn modifier(text).text\n}\nfunction OutputModifier(text) {\n");
    fs.appendFileSync(finalScript, fs.readFileSync(generatedOutputMod))
    fs.appendFileSync(finalScript, "\nreturn modifier(text).text\n}\n");
}
