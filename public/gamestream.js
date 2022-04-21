var capture, video, canvas, ctx, screen, bar, display;
var btnFullscreen, nicknameDisplay, opDivs, changeNickname, gamepadOverlay, overlay, sayBtn;
var streamType = 'image/jpeg';
var height = 270;
var width = 480;
var host = false;
var renderType = 'canvas';
var hqCanvas = true;
var droppedFrames = 0;
var askBox = null;

var sizeCanvas = 1;
var imgBuffer;
var noSignal = {
    x: -1,
    y: -1,
    oX: -1,
    oY: -1
};
var mouse = {
    pressed: false,
};

var gamepadBuffer = [0,0,0,0,0,0,0,0,0,0];
var nickname = 'Player' + Math.floor(Math.random() * 100);
var say = "I connected!";
const keyboardProfile = ['KeyZ', 'KeyX', 'KeyA', 'KeyS', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Enter'];

function setgamepadBuffer(i, value){
    gamepadBuffer[i] = value;
    sendGamedata();
}

function setKeyboardToGamepadBuffer(e, data) {
    for (let i = 0; i < keyboardProfile.length; i++) {
        const key = keyboardProfile[i];
        if (e.code.indexOf(key) > -1){
            setgamepadBuffer(i, data);
            return;
        }
    }
}

if (localStorage.getItem('nickname')){
    nickname = localStorage.getItem('nickname');
}else{
    localStorage.setItem('nickname', nickname);
}
async function startCapture(displayMediaOptions) {
    let captureStream = null;

    try {
        captureStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
    } catch (err) {
        console.error("Error: " + err);
    }
    return captureStream;
}

function resize(){
    var scaleX = window.innerWidth / width;
    var scaleY = window.innerHeight / height;
    var scaleToFit = Math.min(scaleX, scaleY);
    var scaleToCover = Math.max(scaleX, scaleY);
    display.style.transformOrigin = '0 0'; //scale from top left
    display.style.transform = 'scale(' + scaleToFit + ')';
    display.style.top = (window.innerHeight - (height * scaleToFit)) / 2 + 'px';
    if(hqCanvas){
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        sizeCanvas = window.innerWidth / width;
        canvas.style.transform = 'none';
        canvas.style.left = '0px';
    }else{
        sizeCanvas = 1;
        canvas.width = width;
        canvas.height = height;
        canvas.style.transformOrigin = '0 0'; //scale from top left
        canvas.style.transform = 'scale(' + scaleToFit + ')';
        canvas.style.left = (window.innerWidth - canvas.width * scaleToFit) / 2 + 'px';
    }

    // center
    if(isFullscreen()){
        btnFullscreen.innerText = '⇲';
    }else{
        btnFullscreen.innerText = '⇱';
    }
}

function sendGamedata(){
    var xhr = new XMLHttpRequest();
    var url = location.protocol + '//' + location.host + '/send';
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    var obj = {
        name: nickname,
        gamepad: gamepadBuffer,
        say: say
    };
    xhr.onerror = function(e){
        console.log(e);
    };
    xhr.onload = function(e) {
        if (this.status == 200) {
            var res = this.response;
            try {
                var array = JSON.parse(res);
                var array2 = [];
                for (let i = 0; i < array.length; i++) {
                    const e = array[i];
                    array2.push('👤 ' + e.name + ' / 💬 ' + e.say);
                }
                list(array2);
            } catch (error) {
                console.log(error);
            }
        }else{
            console.log(e);
        }
    };
    xhr.send(JSON.stringify(obj));
}
function renderNoSignal(){
    var textHeight = Math.floor(sizeCanvas * 25);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    
    var info = ['Control'];

    ctx.font = 'bold ' + textHeight / 2 + 'px Arial';
    for(var i = 0; i < info.length; i++){
        ctx.fillStyle = '#fff';
        ctx.fillText(info[i], canvas.width / 2, textHeight / 2 * (i + 1) + (textHeight * 2));
    }
    
    var control = ['🎮A = Z⌨', '🎮B = X⌨', '🎮X = A⌨', '🎮Y = S⌨', '🎮↑ = ↑⌨', '🎮↓ = ↓⌨', '🎮← = ←⌨', '🎮→ = →⌨', '🎮Select = Shift⌨', '🎮Start = Enter⌨'];

    for (var i = 0; i < control.length; i++) {
        if (gamepadBuffer[i]){
            ctx.fillStyle = '#0f0';
        }else{
            ctx.fillStyle = '#ffffffcc';
        }
        ctx.fillText(control[i], canvas.width / 2, textHeight / 2 * (i + 1) + (textHeight * 4));
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + textHeight + 'px Arial';
    if(noSignal.x === -1 && noSignal.y === -1){
        noSignal.x = canvas.width / 2;
        noSignal.y = canvas.height / 2;
    }
    var text = 'No Signal';
    var textWidth = ctx.measureText(text).width;
    ctx.fillText(text, noSignal.x, noSignal.y + textHeight / 4);
    // draw border around text
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = sizeCanvas * 2;
    ctx.strokeRect(noSignal.x - textWidth / 2 - 2, noSignal.y - textHeight / 2 - 2, textWidth + 4, textHeight + 4);
    // move it like DVD logo 
    noSignal.x += noSignal.oX * sizeCanvas;
    noSignal.y += noSignal.oY * sizeCanvas;
    if(noSignal.x > canvas.width - (textWidth / 2)){
        noSignal.oX = -1;
    }
    if(noSignal.y > canvas.height - (textHeight / 2)){
        noSignal.oY = -1;
    }
    if(noSignal.x < textWidth / 2){
        noSignal.oX = 1;
    }
    if(noSignal.y < textHeight / 2){
        noSignal.oY = 1;
    }
}

function sendImage (image) {
    var xhr = new XMLHttpRequest();
    var url = location.protocol + '//' + location.host + '/stream';
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', streamType);
    xhr.send(image);
}

function receiveImage(image){
    if(renderType == 'img'){
        display.src = '/watch?t=' + new Date().getTime();
    }
    if(renderType.startsWith('canvas')){
        if(renderType == 'canvas'){
            var xhr = new XMLHttpRequest();
            var url = '/watch';
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onerror = function(e){
                imgBuffer = null;
            }
            xhr.onload = function(e) {
                if (this.status == 200) {
                    imgBuffer = new Uint8Array(this.response);
                }else{
                    imgBuffer = null;
                }
            }
            xhr.send();
        }
        if(renderType == 'canvas+'){
            img.src = '/watch?t=' + Math.random();
            img.onload = function(){
                imgBuffer = img.src;
            }
            img.onerror = function(e){
                imgBuffer = null;
            }
        }
    }
}
var img = new Image();
var t = 0;

function changeCanvasQuality(hq){
    if (hqCanvas == hq){
        return;
    }
    hqCanvas = hq;
    resize();
}

function render(){
    if(host){
        if (!(this.video.paused || this.video.ended)) {
            changeCanvasQuality(false);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            if (host) {
                canvas.toBlob(function (blob) {
                    sendImage(blob);
                }, streamType, 0.6);
            }
        } else {
            changeCanvasQuality(true);
            renderNoSignal();
        }
    }else {
        receiveImage();
        if (imgBuffer) {
            if(renderType == 'img'){
                display.style.display = 'block';
            }
            if(renderType.startsWith('canvas')){
                changeCanvasQuality(false);
                resize();
                if(renderType == 'canvas'){
                    var blob = new Blob([imgBuffer], { 'type': streamType });
                    var url = URL.createObjectURL(blob);

                    img.src = url;
                }
                ctx.fillStyle = '#111';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
        }else{
            display.style.display = 'none';
            changeCanvasQuality(true);
            renderNoSignal();
        }
    }
    window.requestAnimationFrame(render);
}

function isFullscreen(){
    return document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement || false;
}

function isTouchDevice(){
    return 'ontouchstart' in window || navigator.maxTouchPoints;
}

function vibrate(time){
    if(navigator.vibrate){
        navigator.vibrate(time);
    }
}
function loadDOM(){
    capture = document.getElementById('capture');
    display = document.getElementById('display');
    display.onerror = function () {
        imgBuffer = null;
    }
    display.onload = function () {
        imgBuffer = true;
    }
    bar = document.getElementById('bar');
    sayBtn = document.getElementById('sayBtn');
    opDivs = document.getElementsByClassName('op');
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    screen = document.getElementById('screen');
    btnFullscreen = document.getElementById('btnFullscreen');
    nicknameDisplay = document.getElementById('nicknameDisplay');
    changeNickname = document.getElementById('changeNickname');
    gamepadOverlay = {
        gamepadOverlay: document.getElementById('gamepadOverlay'),
        gamepadEdit: document.getElementById('gamepadEdit'),
        gamepadReset: document.getElementById('gamepadReset'),
        editingMode: false,
        reset: function(){
            localStorage.setItem('gamepadOverlay', JSON.stringify(gamepadOverlay.defaultConfig));
            gamepadOverlay.load();
        },
        defaultConfig: [["70%","70%"],["80%","70%"],["70%","50%"],["80%","50%"],["10%","40%"],["10%","80%"],["0%","60%"],["20%","60%"],["40%","80%"],["40%","60%"]]
    };
    if (!isTouchDevice()){
        gamepadOverlay.gamepadOverlay.style.display = 'none';
    }
    // get child elements
    gamepadOverlay.buttons = document.body.querySelectorAll('#gamepadOverlay *');
    for(var i = 0; i < gamepadOverlay.buttons.length; i++){
        const e = gamepadOverlay.buttons[i];
        const z = i;
        e.ontouchstart = function(event){
            if(gamepadOverlay.editingMode){
                return;
            }
            event.preventDefault();
            e.classList.add('pressed');
            vibrate(50);
            setgamepadBuffer(z, 1);
        }
        e.ontouchend = function (event){
            if (gamepadOverlay.editingMode) {
                return;
            }
            event.preventDefault();
            e.classList.remove('pressed');
            vibrate(30);
            setgamepadBuffer(z, 0);
        }
    }
    gamepadOverlay.load = function (data){
        var data = data;
        if(typeof data != 'object'){
            if (!localStorage.getItem('gamepadOverlay')) {
                return;
            }
            data = JSON.parse(localStorage.getItem('gamepadOverlay'));
        }
        for(var i = 0; i < gamepadOverlay.buttons.length; i++){
            gamepadOverlay.buttons[i].style.left = data[i][0];
            gamepadOverlay.buttons[i].style.top = data[i][1];
        }
    }
    if(localStorage.getItem('gamepadOverlay') == null){
        gamepadOverlay.reset();
    }
    gamepadOverlay.gamepadReset.onclick = function(){
        gamepadOverlay.reset();
    }
    gamepadOverlay.gamepadEdit.onclick = function(){
        gamepadOverlay.editingMode = !gamepadOverlay.editingMode;
        if(gamepadOverlay.editingMode){
            gamepadOverlay.gamepadEdit.innerHTML = '🎮☑️';
        }else{
            gamepadOverlay.gamepadEdit.innerHTML = '🎮✏️';
        }
    }

    gamepadOverlay.save = function (){
        var data = [];
        for(var i = 0; i < gamepadOverlay.buttons.length; i++){
            data.push([
                gamepadOverlay.buttons[i].style.left,
                gamepadOverlay.buttons[i].style.top
            ]);
        }
        localStorage.setItem('gamepadOverlay', JSON.stringify(data));
        return data;
    }
    askBox = {
        askBox: document.getElementById('askBox'),
        askBoxText: document.getElementById('askBoxText'),
        askBoxInput: document.getElementById('askBoxInput'),
        askBoxBtn: document.getElementById('askBoxBtn')
    };
    overlay = document.getElementById('overlay');
}

function list(array){
    // remove element from overlay
    var arr = overlay.querySelectorAll('*');
    for(var i = 0; i < arr.length; i++){
        var e = arr[i];
        e.parentNode.removeChild(e);
    }
    // add
    for(var i = 0; i < array.length; i++){
        const t = array[i];
        var e = document.createElement('p');
        e.innerText = t;
        overlay.appendChild(e);
    }
}

function onload(){
    loadDOM();
    gamepadOverlay.load();
    askBox.askBox.style.display = 'none';
    askBox.ask = function(name, onclick, value){
        askBoxText.innerText = name;
        askBox.askBox.style.display = '';
        askBoxInput.value = value;
        askBox.askBoxInput.focus();
        askBox.askBoxBtn.onclick = function(){
            var o = onclick(askBox.askBoxInput.value);
            if(o){
                askBoxText.innerText = o;
                setTimeout(function(){
                    askBoxText.innerText = name;
                }, 2000);
            }else{
                askBox.askBox.style.display = 'none';
            }
        }
    }
    if (location.hostname === 'localhost' || location.hostname.startsWith('127.')) {
        host = true;
    }
    if(!host){
        for(var i = 0; i < opDivs.length; i++){
            opDivs[i].style.display = 'none';
        }
    }
    nicknameDisplay.innerText = nickname;
    changeNickname.onclick = function(){
        askBox.ask('Enter new nickname', function(name){
            if(name.length > 3){
                if (name.length > 16){
                    return 'Nickname too long';
                }
                nickname = name;
                nicknameDisplay.innerText = nickname;
                localStorage.setItem('nickname', nickname);
                return;
            }else{
                return 'Nickname short';
            }
        }, nickname);
    }
    sayBtn.onclick = function () {
        askBox.ask('Enter message', function (msg) {
            if (msg.length > 32) {
                return 'Message too long';
            }
            if(msg.length == 0){
                return 'Message empty';
            }
            say = msg;
            return;
        }, say);
    }
    ctx = canvas.getContext('2d', { alpha: false });
    capture.addEventListener('click', function(){
        startCapture({
            video: {
                cursor: 'always',
                width: width,
                height: height,
                frameRate: 60
            },
            audio: false
        }).then(function(stream){
            var video = document.getElementById('video');
            video.srcObject = stream;
            video.play();
        });
    });
    resize();
    render();
    window.onkeydown = function(e){
        setKeyboardToGamepadBuffer(e, 1);
    }
    window.onkeyup = function (e) {
        setKeyboardToGamepadBuffer(e, 0);
    }
    btnFullscreen.addEventListener('click', function(){
        if(isFullscreen()){
            if(document.exitFullscreen){
                document.exitFullscreen();
            }else if(document.mozCancelFullScreen){
                document.mozCancelFullScreen();
            }else if(document.webkitExitFullscreen){
                document.webkitExitFullscreen();
            }
        }else{
            if (document.body.requestFullscreen){
                document.body.requestFullscreen();
            } else if (document.body.mozRequestFullScreen){
                document.body.mozRequestFullScreen();
            } else if (document.body.webkitRequestFullscreen){
                document.body.webkitRequestFullscreen();
            } else if (document.body.msRequestFullscreen){
                document.body.msRequestFullscreen();
            }
        }
    });
    var active = true;
    window.onpointerup = function(e){
        mouse.pressed = false;
        for (var i = 0; i < gamepadOverlay.buttons.length; i++) {
            gamepadOverlay.buttons[i].dragging = false;
        }
        pointermove(e);
    }
    window.onpointerdown = function(e){
        mouse.pressed = true;
        mouse.startX = e.clientX;
        mouse.startY = e.clientY;
        pointermove(e);
    }
    function pointermove(e){
        if (e.clientY < (window.innerHeight / 100) * 30) {
            active = true;
            if (bar.style.display == 'none') {
                bar.style.display = '';
            }
        }
    }
    window.onpointermove = function(e){
        // if pointer on the bar
        pointermove(e);

        if(gamepadOverlay.editingMode){
            // dragging buttons
            if(e.target.parentElement.id == 'gamepadOverlay'){
                var btn = e.target;
                if (mouse.pressed){
                    btn.dragging = true;
                }
            }
            for(var i = 0; i < gamepadOverlay.buttons.length; i++){
                var btn = gamepadOverlay.buttons[i];
                if(btn.dragging){
                    // set position in percent
                    var mouseXinPercent = (e.clientX) / window.innerWidth;
                    var mouseYinPercent = (e.clientY) / window.innerHeight;
                    var x = Math.round(mouseXinPercent * 100);
                    var y = Math.round(mouseYinPercent * 100);
                    x = Math.floor(x / 5) * 5;
                    y = Math.floor(y / 5) * 5;
                    if (x > 90){
                        x = 90;
                    }
                    if(y > 85){
                        y = 85;
                    }
                    btn.style.left = x + '%';
                    btn.style.top = y + '%';
                    gamepadOverlay.save();
                }
            }
        }
    }
    setInterval(function(){
        if(!active){
            if (bar.style.display != 'none') {
                bar.style.display = 'none';
            }
         }
        active = false;
    }, 3000);
    setInterval(sendGamedata, 1000);
}

document.addEventListener('DOMContentLoaded', onload);
window.addEventListener('resize', resize);