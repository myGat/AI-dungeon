
const fs = require('fs');
const path = require("path")
const zlib = require('zlib');

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

const projectGeneratedFolder = path.join(project, config.generatedFolder)
const generatedZip = path.join(projectGeneratedFolder, config.zipName)

const projectGeneratedScriptsFolder = path.join(projectGeneratedFolder, config.generatedScriptsSubFolder)
const generatedSharedLibrary = path.join(projectGeneratedScriptsFolder, config.generatedSharedLibraryFile)
const generatedInputMod = path.join(projectGeneratedScriptsFolder, config.generatedInputModFile)
const generatedContextMod = path.join(projectGeneratedScriptsFolder, config.generatedContextModFile)
const generatedOutputMod = path.join(projectGeneratedScriptsFolder, config.generatedOutputModFile)

const finalScript = path.join(config.webpageFolder, config.finalScriptFile)
const indexPage = path.join(config.webpageFolder, config.indexPageFile)
const pageScript = path.join(config.webpageFolder, config.pageScriptFile)


exports.indexPage = indexPage
exports.finalScript = finalScript
exports.pageScript = pageScript


exports.createScriptFiles = () => {
    setBuildFiles()

    if (!fs.existsSync(projectGeneratedFolder))
        fs.mkdirSync(projectGeneratedFolder)
    if (!fs.existsSync(projectGeneratedScriptsFolder))
        fs.mkdirSync(projectGeneratedScriptsFolder)

    createSharedLibrary()

    createInputModScript()

    createContextModScript()

    createOutputModScript()


    createFinalScript()
    
    createZip()
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
        fs.appendFileSync(generatedSharedLibrary, "\n")
    })
}

function createInputModScript(){
    fs.writeFileSync(generatedInputMod, "")
    buildFiles.inputModFiles.forEach(f => {
        const fileName = path.join(project, f)
        fs.appendFileSync(generatedInputMod, fs.readFileSync(fileName))
        fs.appendFileSync(generatedInputMod, "\n")
    })
}

function createContextModScript(){
    fs.writeFileSync(generatedContextMod, "")
    buildFiles.contextModFiles.forEach(f => {
        const fileName = path.join(project, f)
        fs.appendFileSync(generatedContextMod, fs.readFileSync(fileName))
        fs.appendFileSync(generatedContextMod, "\n")
    })
}

function createOutputModScript(){
    fs.writeFileSync(generatedOutputMod, "")
    buildFiles.outputModFiles.forEach(f => {
        const fileName = path.join(project, f)
        fs.appendFileSync(generatedOutputMod, fs.readFileSync(fileName))
        fs.appendFileSync(generatedOutputMod, "\n")
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

function createZip(){
    try{
        const archiver = require('archiver');
        
        const output = fs.createWriteStream(generatedZip);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        output.on('close', function() {
          //console.log(archive.pointer() + ' total bytes');
          console.log('archiver has been finalized and the output file descriptor has closed.');
        });

        // archive.on('warning', function (err) {
        //     if (err.code === 'ENOENT') {
        //         // log warning
        //     } else {
        //         // throw error
        //         throw err;
        //     }
        // });

        archive.on('error', function (err) {
            throw err;
        });
  
        archive.pipe(output);

        archive.directory(projectGeneratedScriptsFolder, false);

        archive.finalize();

    }catch (err) {
        console.log("zip not created: " + err)
    }
}
