const fs = require('fs');
const path = require('path');
const http = require('http');
const gamepad_hub = require('./virtual_gamepad_hub');
var gp_hub = new gamepad_hub();

var port = process.env.PORT || 3000;

var imgBuffer;

var timeoutStream = 3;

var players = [];
var virtGamepads = [];

const gamepadCodes = [0x130, 0x131, 0x133, 0x134, 0x220, 0x221, 0x222, 0x223, 0x13a, 0x13b];
var gamepadBuffer = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
function newGamepad(){
    var gamepad = gp_hub.connectGamepad(function (padId) {
        if (padId == -1) {
            console.log('Could not connect to gamepad');
            return;
        }
        console.log('Connected to gamepad ' + padId);
        virtGamepads.push(padId);
        setInterval(function () {
            const player = players[padId];
            if(player){
                if(player.gamepad){
                    const gp = player.gamepad;
                    for (var i = 0; i < gp.length; i++) {
                        if (gp[i] == 1) {
                            gp_hub.sendEvent(padId, {
                                type: 0x01,
                                code: gamepadCodes[i],
                                value: 1
                            });
                        } else {
                            gp_hub.sendEvent(padId, {
                                type: 0x01,
                                code: gamepadCodes[i],
                                value: 0
                            });
                        }
                    }
                }
            }
        }, 1);
    });
}

function everySecond(){
    timeoutStream--;
    if (timeoutStream <= 0) {
        imgBuffer = null;
        timeoutStream = 3;
    }
    for(var i = 0; i < players.length; i++){
        players[i].timeout--;
        if(players[i].timeout <= 0){
            players.splice(i, 1);
        }
    }
}

setInterval(everySecond, 1000);

function newPlayer (name){
    var player = {
        name: name,
        gamepad: null,
        timeout: 5,
        say: 'Hello!'
    };
    players.push(player);
    return player;
}

function playerReceive(player){
    if(typeof player.name !== 'string'){
        return;
    }
    // check if allowed nickname
    if(player.name.length > 32){
        player.name = player.name.substring(0, 16);
    }
    if(player.name.length < 3){
        return;
    }
    // check if the player is already in the list
    var index = players.findIndex(p => p.name === player.name);
    if(index === -1){
        newPlayer(player.name);
    }
    var index = players.findIndex(p => p.name === player.name);
    // update the player
    players[index].gamepad = player.gamepad || gamepadBuffer;
    players[index].timeout = 5;
    const say = player.say;
    players[index].say = say;
    if(typeof say == 'string'){
        if(say.length > 16){
            players[index].say = say.substring(0, 16);
        }
    }
}

// send files in the folder to the client
function server(req, res){
    var url = req.url;
    // block the access to the parents folders

    // Website you wish to allow to connect
    if(url.indexOf('..') !== -1){
        res.writeHead(403);
        res.end('403 Forbidden');
        return;
    }
    if(url.startsWith('/send')){
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            try {
                const data = JSON.parse(Buffer.concat(chunks).toString());
                playerReceive(data);
            } catch (error) {
                console.log(error);
            }
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(players));
        return;
    }
    if(url == '/stream'){
        timeoutStream = 3;
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            const data = Buffer.concat(chunks);
            imgBuffer = data;
            res.writeHead(200);
            res.end();
        });
    }
    if(url.startsWith('/watch')){
        res.setHeader('Access-Control-Allow-Origin', '*');
        if (imgBuffer){
            res.writeHead(200, {'Content-Type': 'image/jpeg'});
            res.end(imgBuffer);
        }else{
            res.writeHead(404, {
                'Content-type': 'text/html'
            });
            res.end('<h1>404 Not Found</h1>');
        }
        return;
    }
    const filePath = path.join(__dirname, 'public', url === '/' ? 'index.html' : url);
    const fileExt = path.extname(filePath);
    const validExtensions = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.png': 'image/png',
        '.jpg': 'image/jpg'
    };
    fs.readFile(filePath, (err, fileContents) => {
        if (err) {
            res.writeHead(404, {
                'Content-type': 'text/html'
            });
            res.end('<h1>404 Not Found</h1>');
        } else {
            res.writeHead(200, {
                'Content-type': validExtensions[fileExt]
            });
            res.end(fileContents);
        }
    });
}

http.createServer(server).listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

// create four virtual gamepads
for(var i = 0; i < 4; i++){
    newGamepad();
}

// ctrl c to stop
process.on('SIGINT', function () {
    // disconnect all gamepads
    for(var i = 0; i < virtGamepads.length; i++){
        gp_hub.disconnectGamepad(virtGamepads[i], function () {});
    }
    process.exit();
});