

var http = require('http');
var fs = require('fs');
var sg = require('./scriptsGenerator')


http.createServer(function (req, res) {

    if (req.url == "/final%20script%20(generated).js")
    {
        sg.createScriptFiles()

        res.write(fs.readFileSync(sg.finalScript));
        res.end();
        return
    }
    if (req.url == "/pageScript.js")
    {
        res.write(fs.readFileSync(sg.pageScript));
        res.end();
        return
    }

    fs.readFile(sg.indexPage, function (err, data) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(data);
        return res.end();
    });
}).listen(8080);
