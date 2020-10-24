This is a tool helping you to create and debug scripts for AID.

- It concatenates several file to create the 4 files you can copy/paste on AID 
(the shared library, the input modifier, the context modifier and the output modifer).

- When creating the files, if you have archiver (a node extension: https://www.archiverjs.com/) installed, it will creat the zip file.
You can directly upload this zip on AID. (It you don't have archiver, it shouldn't crash... not tested).

- Then it creates a webpage you can open on your computer to test and debug the scripts. 
This allows you to make some basic debug, and correct the bugs directly on your local computer -
instead of correcting on AID and then backcopy the corrections on your local computer.

You'll still have to debug some parts on AID; at least, you'll have to test the AI's reaction on AID. 
Moreover, the way I emulate AID cripting is far from perfect, and there may be some difference on the actual AID
(eg, you may use a deactivated function).

This require node.js (an extension of js intended to create servers). Even if you only intend to use the offline 
version, you'll need node.js: vanilla js can't read or write file (and that's necessary to concatenate files).


# Disclaimer (important)

I am in no way a js specialist, and even less a server specialist. The server created by the localServer.js script 
has probabibly some security issue... 

/!\ If you can't understand the localServer.js script, you shouldn't use it and use only the offlineVersion.js. Or maybe you should not use my work at all. /!\

Use my work at your own risk.


# Usage


## Server version

- create a new working directory. 

- copy localServer.js, ScriptGenerator.js, config.json and buildFiles.json in your working directory. 
Copy the folder 'webpage' with its content in your working directory.

- open buildFiles.json: it's a json file with the lists sharedLiraryFiles, inputModFiles, contextModFiles, and outputModFiles.
those are the list of files that will be concatenated to create the 4 scripts. Modify those lists to suit your need. Note: the default values are the files given here 
in the templates and examples folders. 

- open a terminal in your working directory (if you use Visual Studio Code, you have a terminal at the bottom of the window). 
Type: ```node localServer.js``` . This create a server on the port 8080 of your computer.

- /!\ You should get a message from your firewall, asking if it should open open port 8080. /!\ 
Tell it **you don't want to open the port**: you don't want other people to mess with this server.

- open a browser and type http://localhost:8080/ in the adress bar: you're connected to the server you just created!

- each time to connected to the server (ie, at first connection, but when you reload the page as well), 
the script are re-concatenated. This means, you can test your scripts, make corrections on your local versions, 
and just press "f5" to reload your page to test if the corrections work (... and this is, actually, the 
only interest of the server version. It's convenient but it's maybe an overkill).

- once you're satisfied, kill the server you created: ctrl+c in the terminal (or kill the terminal).

- in your working directory, there's now a "generated/scripts" folder, containing the files "shared.js",
"inputModifier.js", "contextModifier.js" and "outputModifier.js". You can open those 
files and copy/paste their content in the corresponding scripts on AID.

- if you have archiver (a node extension: https://www.archiverjs.com/) installed, you have 
an archive "scripts.zip" in the folder "generated". You can directly upload it on AID. 

- You're done!


## No-server version

- create a new working directory. 

- copy offlineVersion.js, ScriptGenerator.js, config.json and buildFiles.json in your working directory. Copy the folder 'webpage' with its content in your working directory.

- open buildFiles.json: it's a json file with the lists sharedLiraryFiles, inputModFiles, contextModFiles, and outputModFiles.
those are the list of files that will be concatenated to create the 4 scripts. Modify those list to suit your need. Note: the default values are the files given here 
in the templates and examples folders. 

- open a terminal in your working directory (if you use Visual Studio Code, you have a terminal at the bottom of the window). 
Type ```node offlineVersion.js``` . This concatenate the script.

- go into the 'webpage' folder and open 'index.html' in a browser.

- You can test your scripts. Correct the local version of the scripts, and each time, re-run "node offlineVersion.js" on the terminal
to re-create the script, then re-actualize index.html in your browser.

- Once you're satisfied, you'll find a "generated" folder in your working directory, containing the files "shared.js",
"inputModifier.js", "contextModifier.js" and "outputModifier.js". You can open those 
files and copy/paste their content in the corresponding scripts on AID.

- if you have archiver (a node extension: https://www.archiverjs.com/) installed, you have 
an archive "scripts.zip" in the folder "generated". You can directly upload it on AID. 

- You're done!


## Handle several projects

When you call node in the terminal, there's a second optional argument: if you give it a folder name, 
the script will search for the buildFile.json file in this folder, and create in this folder a subfolder 
"generated scripts" to put the generated scripts. This allow you to work in separate folders, with different
fils to concatenate, and without destroying the generated scripts for this project.

Eg : 

```node localServer.js "my subfolder"```

```node offlineVersion.js "my subfolder"```


# Changelog

- 10/10/20 
    - Handle several projects
    - better emulation of AID: now the shared library is copied in the three modifier, 
hence it's hidden from the outside and it can't be used to save stuff outside of the state.

- 19/10/20
    - correction of a big bug which was preventing a good emulation of AID.
    - handle memory object
    - added the folders modules with:
        - folder modules/base containing the work of Devon on module (available at https://github.com/Devon7925/AID-Scripting)
        - folder modules/commandHandler with a module to handle commands (not debugged)
        - folder modules/debugCommands with... No module for now, but the buildFiles.jon file concatening 
        the commandHandler and the module to obtain scripts that can directly be copied on AID.
        type "node offlineVersion.js "modules/debugCommands" to obtain the generated files.
        
- 20/10/20
    - change name of generated files for direct upload. 
    
- 24/10/20
    - create the zip files.
    - some corrections.
    - a box containing state.message in the debug page.
    - debugCommand finished.


# TODO (...Maybe one day)

when creating scripts:

- [x] create the zip file.

In the debug page:

- [x] handle the quests object

- [x] emulate the way state.memory.frontMemory, state.memory.context and state.memory.authorsNote are used to create the text sent to the context modifier

- [ ] spinbox to set the info.actionCount

- [ ] spinbox to set info.maxChars (it's easier to test if the context modifier cuts text properly if info.maxChars is low)

- [ ] emulate the memory box.

- [ ] emulate the author's note box.

- [ ] emulate quest system.

- [ ] emulate world infos...
