import { me } from "appbit";
import { display } from "display";
import document from "document";
import { inbox } from "file-transfer";
import fs from "fs";
import { vibration } from "haptics";
import { peerSocket } from "messaging";
import {
    getCheckDigit,
    isEAN13,
    toCode128,
    toCode39,
    toEAN13,
} from "./barcode.js";

var settings = {};
var lastClearedBars = 0;
var selected = 0;
var keepOpenUntil = Date.now() + 180000;

var frgd = document.getElementById("frgd");
var barname = document.getElementById("caption");
var barcode = document.getElementById("barcode");
var bartext = document.getElementById("bartext");
var cNodes = new Array(15 * 11);
const WIDTH = document.getElementById("main").width;

function init() {
    for (let i = 0; i < 15; i++) {
        let n = document.getElementById(`n${i}`);
        for (let j = 0; j < 11; j++) {
            cNodes[i * 11 + j] = n.getElementById(`b${j}`);
        }
    }

    try {
        settings = fs.readFileSync("settings.txt", "json");
    } catch (e) {
        peerSocket.onopen = () => {
            for (let o in settings) return;
            peerSocket.send({ getAll: true });
        };
    }

    pendingFiles();
    inbox.onnewfile = pendingFiles;

    settingsChanged();

    document.onkeydown = onKeyDown;
    document.getElementById("up-btn").onclick = () => flipDeck(-1);
    document.getElementById("down-btn").onclick = () => flipDeck(1);
    //document.getElementById("up-btn").onactivate = () => flipDeck(-1);
    //document.getElementById("down-btn").onactivate = () => flipDeck(1);
    display.onchange = () => {
        if (!display.on && Date.now() < keepOpenUntil) display.poke();
    };
}

init();

function onKeyDown(e) {
    if (e.key === "up") {
        flipDeck(-1);
    } else if (e.key === "down") {
        flipDeck(1);
    }
}

function settingsChanged() {
    let empty = !settings.cards || settings.cards.length === 0;
    if (empty) {
        barname.text = "Barcodes";
        //display.autoOff = true;
        keepOpenUntil = 0;
        me.appTimeoutEnabled = true;
    } else {
        let item = settings.cards[0];
        barname.text = item.name || "";
        frgd.style.fill = item.color || "#12D612";
        bartext.text = setBarcode(item.code, item.type);
        //display.autoOff = false;
        keepOpenUntil = Date.now() + 180000;
        me.appTimeoutEnabled = false;
        //setTimeout(() => {display.autoOff = true}, 180000);
        display.brightnessOverride = settings.bright ? "max" : undefined;
    }
    barcode.style.display = empty ? "none" : "inline";
    bartext.style.display = empty ? "none" : "inline";
    document.getElementById("intro").style.display = empty ? "inline" : "none";
}

var clickTimer;

function flipDeck(dir) {
    if (settings.cards) {
        let max = settings.cards.length;
        if (dir === -1) {
            selected--;
            if (selected < 0) selected = max - 1;
        } else if (dir === 1) {
            selected++;
            if (selected >= max) selected = 0;
        } else return;

        let item = settings.cards[selected];

        barname.text = item.name || "";
        frgd.style.fill = item.color || "#12D612";

        if (clickTimer) clearTimeout(clickTimer);

        clickTimer = setTimeout(() => {
            clickTimer = null;
            bartext.text = setBarcode(item.code, item.type);
        }, 350);
    }
}

function pendingFiles() {
    let temp;
    while ((temp = inbox.nextFile())) {
        vibration.start("nudge");
        display.poke();
        settings = fs.readFileSync(temp, "json");
        fs.unlinkSync(temp);
        if (settings.cards) {
            for (let i = 0; i < settings.cards.length; i++) {
                let card = settings.cards[i];
                if (card.name) card.name = decodeURIComponent(card.name);
            }
        }
        fs.writeFileSync("settings.txt", settings, "json");
        settingsChanged();
    }
}

function setBarcode(str, type) {
    let data;
    try {
        if (type === 2) {
            data = toCode39(str);
        } else if (type === 1) {
            data = toCode128(str);
        } else if (isEAN13(str)) {
            switch (str.length) {
                case 11:
                    data = toEAN13("0" + str + getCheckDigit(str));
                    break;
                case 12:
                    data = toEAN13("0" + str);
                    break;
                default:
                    data = toEAN13(str);
            }
        } else {
            data = toCode128(str);
        }
    } catch (e) {
        barcode.style.display = "none";
        return e;
    }

    let arr = data.arr;
    let sizes = data.sizes;
    let length = data.length;

    if (length > cNodes.length || length * 2 > WIDTH - 20) {
        barcode.style.display = "none";
        return "Code too long!";
    }

    barcode.style.display = "inline";

    let w = Math.max(2, Math.floor(WIDTH / (length + 20)));

    if (length < lastClearedBars) {
        for (let i = lastClearedBars - 1; i >= length; i--) {
            cNodes[i].style.display = "none";
        }
    }
    lastClearedBars = length;

    let index = length - 1;

    for (let i = arr.length - 1; i >= 0; i--) {
        let block = arr[i];
        for (let j = sizes[i] - 1; j >= 0; j--) {
            let node = cNodes[index];
            if ((block & 1) === 1) {
                node.style.display = "inline";
                node.width = w;
                node.x = index * w;
            } else {
                node.style.display = "none";
            }
            block >>= 1;
            index--;
        }
    }

    barcode.x = Math.floor((WIDTH - w * length) / 2);
    return str;
}
