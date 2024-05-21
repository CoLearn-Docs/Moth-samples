import useBluetooth from "../../../../modules/bluetooth.js";
import useMoth from "../../../../modules/moth.js";
import { deviceControlMap } from "../../../../modules/deviceProfile.js";
import keepWebSocketAlive from "../../../../modules/websocket.js";
import { initializeDOMElements, initializeVariables } from "./initialize.js";

const {
  pairButton,
  openWebSocketButton,
  stopButton,
  robotSelect,
  robotNameInput,
  messageView,
  hostInput,
  portInput,
  channelInput,
} = initializeDOMElements();

let {
  deviceObj,
  pubWebsocket,
  subWebsocket,
  lastDirection,
  selectedDeviceControlMap,
  txCharacteristicObj,
} = initializeVariables();

async function bluetoothPairing() {
  selectedDeviceControlMap = deviceControlMap[robotSelect.value];
  const { device, txCharacteristic } =
    await useBluetooth.connectToBluetoothDevice(
      selectedDeviceControlMap.namePrefix ?? undefined,
      selectedDeviceControlMap.serviceUUID,
      selectedDeviceControlMap.txCharacteristicUUID
    );
  robotNameInput.value = device.name;
  deviceObj = device;
  txCharacteristicObj = txCharacteristic;
}

async function openWebSocket() {
  const pubServerURL = useMoth.setServiceURL({
    type: "pub",
    options: {
      channel: "instant",
      name: channelInput.value,
      track: "colink",
      mode: "single",
    },
    host: hostInput.value,
    port: portInput.value,
  });

  pubWebsocket = new WebSocket(pubServerURL);
  pubWebsocket.binaryType = "arraybuffer";

  const subServerURL = useMoth.setServiceURL({
    type: "sub",
    options: {
      channel: "instant",
      name: channelInput.value,
      track: "colink",
      mode: "single",
    },
    host: hostInput.value,
    port: portInput.value,
  });

  subWebsocket = new WebSocket(subServerURL);
  subWebsocket.binaryType = "arraybuffer";

  pubWebsocket.onopen = () => {
    if (deviceObj) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("keyup", handleKeyUp);
    }
  };
  displayMessage("Open WebSocket");

  keepWebSocketAlive(pubWebsocket);

  subWebsocket.onmessage = (command) => {
    const controlCommand = new TextDecoder().decode(command.data);
    useBluetooth.sendTextToDeviceOverBluetooth(
      controlCommand,
      txCharacteristicObj
    );
  };
}

function stop() {
  pubWebsocket.close();
  subWebsocket.close();
  useBluetooth.disconnectFromBluetoothDevice(deviceObj);
}

function createControlCommand(robot, direction) {
  if (robot === "XROVER_DOT" || robot === "XROVER_GRIPPER") {
    return direction;
  } else {
    return {
      type: "control",
      direction,
    };
  }
}

async function handleKeyDown(e) {
  const controlCommandMap =
    selectedDeviceControlMap.controlCommandMap.keyboard.direction;
  const direction = controlCommandMap[e.code];
  if (direction === lastDirection) return;
  lastDirection = direction;

  const controlCommand = createControlCommand(robotSelect.value, direction);

  if (pubWebsocket && pubWebsocket.readyState === WebSocket.OPEN) {
    pubWebsocket.send(new TextEncoder().encode(JSON.stringify(controlCommand)));
    displayMessage(direction);
  }
}

async function handleKeyUp(e) {
  const direction = selectedDeviceControlMap.stopCommand;
  if (direction === lastDirection) return;
  lastDirection = direction;

  const controlCommand = createControlCommand(robotSelect.value, direction);

  if (pubWebsocket && pubWebsocket.readyState === WebSocket.OPEN) {
    pubWebsocket.send(new TextEncoder().encode(JSON.stringify(controlCommand)));
    displayMessage(direction);
  }
}

function displayMessage(messageContent) {
  if (typeof messageContent == "object") {
    messageContent = JSON.stringify(messageContent);
  }
  messageView.innerHTML += `${messageContent}\n`;
  messageView.scrollTop = messageView.scrollHeight;
}

document.addEventListener("DOMContentLoaded", () => {
  pairButton.addEventListener("click", bluetoothPairing);
  openWebSocketButton.addEventListener("click", openWebSocket);
  stopButton.addEventListener("click", stop);
});
