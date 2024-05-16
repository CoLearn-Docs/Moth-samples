import useBluetooth from "./modules/bluetooth.js";
import useMoth from "./modules/moth.js";
import { deviceControlMap } from "./modules/deviceProfile.js";
import keepWebSocketAlive from "./modules/websocket.js";

// tmp데이터====================================================
const ssidInput = document.getElementById("ssidInput");
const passwordInput = document.getElementById("passwordInput");
const hostInput = document.getElementById("hostInput");
const portInput = document.getElementById("portInput");

ssidInput.value = "TeamGRITax";
passwordInput.value = "teamgrit8266";
hostInput.value = "cobot.center";
portInput.value = 8286;
// ===========================================================
const {
  pairButton,
  sendMediaServerInfoButton,
  openWebSocketButton,
  stopButton,
} = initializeDOMElements();
let {
  device,
  websocket,
  networkConfig,
  lastDirection,
  selectedDeviceControlMap,
} = initializeVariables();

function initializeDOMElements() {
  const pairButton = document.getElementById("pairButton");
  const sendMediaServerInfoButton = document.getElementById(
    "sendMediaServerInfoButton"
  );
  const openWebSocketButton = document.getElementById("openWebSocketButton");
  const stopButton = document.getElementById("stopButton");

  return {
    pairButton,
    sendMediaServerInfoButton,
    openWebSocketButton,
    stopButton,
  };
}

function initializeVariables() {
  let device;
  let selectedDeviceControlMap;
  let websocket;
  let networkConfig = {};
  let lastDirection;

  return {
    device,
    selectedDeviceControlMap,
    websocket,
    networkConfig,
    lastDirection,
  };
}

async function bluetoothPairing() {
  const robotSelect = document.getElementById("robotSelect");
  const robotNameInput = document.getElementById("robotNameInput");
  selectedDeviceControlMap = deviceControlMap[robotSelect.value];
  device = await useBluetooth.connectToBluetoothDevice(
    selectedDeviceControlMap.namePrefix ?? undefined,
    selectedDeviceControlMap.serviceUUID
  );
  robotNameInput.value = device.name;
}

async function sendMediaServerInfo() {
  const robotSelect = document.getElementById("robotSelect");

  networkConfig = {
    ssid: ssidInput.value,
    password: passwordInput.value,
    host: hostInput.value,
    port: portInput.value,
    channel: "instant",
    channel_name: channelInput.value,
  };

  const devicePort =
    window.location.protocol.replace(/:$/, "") === "http"
      ? networkConfig.port
      : networkConfig.port - 1;

  if (device) {
    const metricData = {
      type: "metric",
      data: {
        server: {
          ssid: networkConfig.ssid,
          password: networkConfig.password,
          host: networkConfig.host,
          port: devicePort,
          path: `pang/ws/pub?channel=instant&name=${networkConfig.channel_name}&track=colink&mode=bundle`,
        },
        profile: robotSelect.value,
      },
    };
    console.log(selectedDeviceControlMap);
    if (selectedDeviceControlMap.maxTransferSize) {
      useBluetooth.sendMessageToDeviceOverBluetooth(
        JSON.stringify(metricData),
        device,
        selectedDeviceControlMap.maxTransferSize,
        selectedDeviceControlMap.serviceUUID,
        selectedDeviceControlMap.txCharacteristicUUID
      );
    } else {
      useBluetooth.sendTextToDeviceOverBluetooth(
        JSON.stringify(metricData),
        device,
        selectedDeviceControlMap.serviceUUID,
        selectedDeviceControlMap.txCharacteristicUUID
      );
    }
  }
}

async function openWebSocket() {
  const serverURL = useMoth.setServiceURL({
    type: "sub",
    options: {
      channel: networkConfig.channel,
      name: networkConfig.channel_name,
      track: "colink",
      mode: "bundle",
    },
    host: networkConfig.host,
    port: networkConfig.port,
  });

  websocket = new WebSocket(serverURL);
  websocket.binaryType = "arraybuffer";
  websocket.onopen = () => {
    if (device) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("keyup", handleKeyUp);
    }
  };
  displayMessage("Open WebSocket");

  keepWebSocketAlive(websocket);
}

function stop() {
  websocket.close();
  useBluetooth.disconnectFromBluetoothDevice(device);
}

async function handleKeyDown(e) {
  const controlCommandMap =
    selectedDeviceControlMap.controlCommandMap.keyboard.direction;
  const direction = controlCommandMap[e.code];
  if (direction === lastDirection) return;
  lastDirection = direction;

  const controlCommand = {
    type: "control",
    direction,
  };

  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(new TextEncoder().encode(JSON.stringify(controlCommand)));
    displayMessage(direction);
  }
}

async function handleKeyUp(e) {
  const direction = selectedDeviceControlMap.stopCommand;
  if (direction === lastDirection) return;
  lastDirection = direction;

  const controlCommand = {
    type: "control",
    direction,
  };

  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(new TextEncoder().encode(JSON.stringify(controlCommand)));
    displayMessage(direction);
  }
}

function displayMessage(messageContent) {
  const messageView = document.getElementById("messageView");

  if (typeof messageContent == "object") {
    messageContent = JSON.stringify(messageContent);
  }
  messageView.innerHTML += `${messageContent}\n`;
  messageView.scrollTop = messageView.scrollHeight;
}

document.addEventListener("DOMContentLoaded", () => {
  pairButton.addEventListener("click", bluetoothPairing);
  sendMediaServerInfoButton.addEventListener("click", sendMediaServerInfo);
  openWebSocketButton.addEventListener("click", openWebSocket);
  stopButton.addEventListener("click", stop);
});
