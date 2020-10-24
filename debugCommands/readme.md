Scripts for commands for debug purpose: allows to directly enter javascript commands during story mode. 

Crated using my devTool in this project: https://github.com/myGat/AI-dungeon/tree/master/DevTool/modules/debugCommands

Once in story mode on AID in a scenario using those scripts, try this: 

```/hello```

Press enter, in the message zone you see an error message indicating the command doesn't exist.

```/exe -pi commandHelper.commandList.hello = { execute: function(args) { state.message = "Hello world!" }}```

Press enter, nothing seems to happens.

```/hello```

It seems you've created an "hello world!" command! :o :O :o

This is as useless as any other hello world program.
