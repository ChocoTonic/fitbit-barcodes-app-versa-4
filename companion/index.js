import { outbox } from "file-transfer";
import { settingsStorage as store } from "settings";
import { peerSocket } from "messaging";

var cards = [];
var bright = false;
var logLines = [];

function log(msg) {
  let ts = new Date().toLocaleTimeString();
  logLines.unshift(ts + ": " + msg);
  if (logLines.length > 20) logLines.pop();
  store.setItem("appLog", JSON.stringify(logLines));
}

function trim(s) {
  return s.charAt && s.charAt(0) === '"' ? s.substr(1, s.length - 2) : s;
}

peerSocket.onmessage = (e) => {
  log("Msg from watch: " + JSON.stringify(e.data));
  if (e.data && e.data.getAll) {
    log("Watch requested settings");
    sendAll();
  }
  if (e.data && e.data.error) {
    log("Watch error: " + e.data.error);
    store.setItem("appError", JSON.stringify({ name: e.data.error }));
  }
};

peerSocket.onopen = () => {
  log("peerSocket OPEN");
};

peerSocket.onerror = (err) => {
  log("peerSocket ERROR: " + (err.code || err.message || JSON.stringify(err)));
};

peerSocket.onclose = () => {
  log("peerSocket CLOSED");
};

store.onchange = (e) => {
  setCard(e.key, e.newValue);
  sendAll();
};

function setCard(name, value) {
  let i = name.substr(-1); //e.g., code1,color1
  if (/^\d+$/.test(i)) {
    i = i * 1 - 1;
    if (!cards[i]) cards[i] = {};
    name = name.substr(0, name.length - 1);

    if (name === "name" || name === "code") {
      value = (JSON.parse(value).name || "").replace(/^\s+|\s+$/g, "");
    } else if (name === "color") {
      value = trim(value);
    } else if (name === "type") {
      value = JSON.parse(value).selected[0];
    }
    cards[i][name] = value;
  } else if (name === "bright") {
    bright = value === "true";
  }
}

function init() {
  log("Companion starting");

  for (let i = store.length - 1; i >= 0; i--) {
    let k = store.key(i);
    setCard(k, store.getItem(k));
  }

  // Pre-fill first barcode slot if empty for testing
  if (!store.getItem("code1")) {
    log("No barcodes, adding sample");
    store.setItem("name1", JSON.stringify({ name: "Sample" }));
    store.setItem("code1", JSON.stringify({ name: "12345678" }));
    store.setItem("color1", "#12D612");
    setCard("name1", store.getItem("name1"));
    setCard("code1", store.getItem("code1"));
    setCard("color1", store.getItem("color1"));
  }

  log("Init complete, sending to watch");
  // Always send settings to watch on companion launch
  sendAll();
}

init();

function sendAll() {
  let tmp = [];
  for (let i = 0; i < cards.length; i++) {
    if (cards[i] && cards[i].code) {
      let o = { code: cards[i].code };
      if (cards[i].name) o.name = encodeURIComponent(cards[i].name);
      if (cards[i].color) o.color = cards[i].color;
      if (cards[i].type) o.type = cards[i].type;
      tmp.push(o);
    }
  }
  log("Sending " + tmp.length + " card(s) via file-transfer");
  let payload = { cards: tmp, bright: bright };
  let jsonStr = JSON.stringify(payload);
  let encoder = new TextEncoder();
  let data = encoder.encode(jsonStr);
  outbox
    .enqueue("settings.json", data.buffer)
    .then(() => log("File enqueued OK"))
    .catch((err) => log("Enqueue FAIL: " + err));
}
