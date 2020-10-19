
const fs = require('fs');
const path = require("path")

const project = process.argv[2] ? process.argv[2] : "."

const buildFilesName = "buildFiles.json"

const configFile = "config.json"
const rawConfig = fs.readFileSync(configFile)
const config = JSON.parse(rawConfig)

let buildFiles = { 
    sharedLiraryFiles: [],
    inputModFiles: [],
    contextModFiles: [],
    outputModFiles: []
}

const projectGeneratedScriptsFolder = path.join(project, config.generatedScriptsFolder)
const generatedSharedLibrary = path.join(project, config.generatedScriptsFolder, config.generatedSharedLibraryFile)
const generatedInputMod = path.join(project, config.generatedScriptsFolder, config.generatedInputModFile)
const generatedContextMod = path.join(project, config.generatedScriptsFolder, config.generatedContextModFile)
const generatedOutputMod = path.join(project, config.generatedScriptsFolder, config.generatedOutputModFile)

const finalScript = path.join(config.webpageFolder, config.finalScriptFile)
const indexPage = path.join(config.webpageFolder, config.indexPageFile)
const pageScript = path.join(config.webpageFolder, config.pageScriptFile)


exports.indexPage = indexPage
exports.finalScript = finalScript
exports.pageScript = pageScript


exports.createScriptFiles = () => {
    setBuildFiles()

    if(!fs.existsSync(projectGeneratedScriptsFolder))
        fs.mkdirSync(projectGeneratedScriptsFolder)

    createSharedLibrary()

    createInputModScript()

    createContextModScript()

    createOutputModScript()


    createFinalScript()
}

function setBuildFiles(){
    buildFilesFile = path.join(project, buildFilesName)

    const rawBuildFiles = fs.readFileSync(buildFilesFile)
    buildFiles = JSON.parse(rawBuildFiles)
}

function createSharedLibrary(){
    fs.writeFileSync(generatedSharedLibrary, "")
    buildFiles.sharedLiraryFiles.forEach(f => {
        const fileName = path.join(project, f)
        fs.appendFileSync(generatedSharedLibrary, fs.readFileSync(fileName))
    })
}

function createInputModScript(){
    fs.writeFileSync(generatedInputMod, "")
    buildFiles.inputModFiles.forEach(f => {
        const fileName = path.join(project, f)
        fs.appendFileSync(generatedInputMod, fs.readFileSync(fileName))
    })
}

function createContextModScript(){
    fs.writeFileSync(generatedContextMod, "")
    buildFiles.contextModFiles.forEach(f => {
        const fileName = path.join(project, f)
        fs.appendFileSync(generatedContextMod, fs.readFileSync(fileName))
    })
}

function createOutputModScript(){
    fs.writeFileSync(generatedOutputMod, "")
    buildFiles.outputModFiles.forEach(f => {
        const fileName = path.join(project, f)
        fs.appendFileSync(generatedOutputMod, fs.readFileSync(fileName))
    })
}

function createFinalScript(){
    fs.writeFileSync(finalScript, "var state = {memory: {}}\nvar info={actionCount:0}\nvar worldEntries = []\nvar quests = []\nmemory = \"\"\n")
    fs.appendFileSync(finalScript, "\nfunction InputModifier(text) {\nlet targetDummyName={}\n");
    fs.appendFileSync(finalScript, fs.readFileSync(generatedSharedLibrary))
    fs.appendFileSync(finalScript, "\n");
    fs.appendFileSync(finalScript, fs.readFileSync(generatedInputMod))
    fs.appendFileSync(finalScript, "\n.objectUtilitarySetterDummyName(targetDummyName)\nreturn targetDummyName\n}\nfunction ContextModifier(text) {\nlet targetDummyName={}\n");
    fs.appendFileSync(finalScript, fs.readFileSync(generatedSharedLibrary))
    fs.appendFileSync(finalScript, "\n");
    fs.appendFileSync(finalScript, fs.readFileSync(generatedContextMod))
    fs.appendFileSync(finalScript, ".objectUtilitarySetterDummyName(targetDummyName)\nreturn targetDummyName\n}\nfunction OutputModifier(text) {\nlet targetDummyName={}\n");
    fs.appendFileSync(finalScript, fs.readFileSync(generatedSharedLibrary))
    fs.appendFileSync(finalScript, "\n");
    fs.appendFileSync(finalScript, fs.readFileSync(generatedOutputMod))
    fs.appendFileSync(finalScript, ".objectUtilitarySetterDummyName(targetDummyName)\nreturn targetDummyName\n}\n");
}
