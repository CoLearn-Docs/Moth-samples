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
  subscribeWebSocketButton,
  connectedRobotName,
} = initializeDOMElements();

let {
  deviceObj,
  subWebsocket,
  pubWebsocket,
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
  const subServerURL = useMoth.setServiceURL({
    type: "sub",
    options: {
      channel: "instant",
      name: channelInput.value,
      track: "colink",
      mode: "bundle",
    },
    host: hostInput.value,
    port: portInput.value,
  });

  subWebsocket = new WebSocket(subServerURL);
  subWebsocket.binaryType = "arraybuffer";

  const pubServerURL = useMoth.setServiceURL({
    type: "pub",
    options: {
      channel: "instant",
      name: channelInput.value,
      track: "colink",
      mode: "bundle",
    },
    host: hostInput.value,
    port: portInput.value,
  });

  pubWebsocket = new WebSocket(pubServerURL);
  pubWebsocket.binaryType = "arraybuffer";

  subWebsocket.onopen = () => {
    if (deviceObj) {
      document.addEventListener("keydown", (e) => handleKeyEvent(e, true));
      document.addEventListener("keyup", (e) => handleKeyEvent(e, false));
    }
  };
  displayMessage("Open WebSocket");

  keepWebSocketAlive(subWebsocket);

  pubWebsocket.onmessage = (command) => {
    const controlCommand = new TextDecoder().decode(command.data);
    useBluetooth.sendTextToDeviceOverBluetooth(
      controlCommand,
      txCharacteristicObj
    );
  };
}

function stop() {
  subWebsocket.close();
  pubWebsocket.close();
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

async function handleKeyEvent(e, isKeyDown) {
  selectedDeviceControlMap = deviceControlMap[robotSelect.value];
  const controlCommandMap =
    selectedDeviceControlMap.controlCommandMap.keyboard.direction;
  const direction = isKeyDown
    ? controlCommandMap[e.code]
    : selectedDeviceControlMap.stopCommand;
  if (direction === lastDirection) return;
  lastDirection = direction;

  const controlCommand = createControlCommand(robotSelect.value, direction);

  if (subWebsocket && subWebsocket.readyState === WebSocket.OPEN) {
    subWebsocket.send(new TextEncoder().encode(JSON.stringify(controlCommand)));
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

function subscribeWebSocket() {
  const subServerURL = useMoth.setServiceURL({
    type: "sub",
    options: {
      channel: "instant",
      name: channelInput.value,
      track: "colink",
      mode: "bundle",
    },
    host: hostInput.value,
    port: portInput.value,
  });

  subWebsocket = new WebSocket(subServerURL);
  subWebsocket.binaryType = "arraybuffer";

  subWebsocket.onopen = () => {
    document.addEventListener("keydown", (e) => handleKeyEvent(e, true));
    document.addEventListener("keyup", (e) => handleKeyEvent(e, false));
  };

  displayMessage("Open WebSocket");
}

document.addEventListener("DOMContentLoaded", () => {
  pairButton.addEventListener("click", bluetoothPairing);
  openWebSocketButton.addEventListener("click", openWebSocket);
  stopButton.addEventListener("click", stop);
  subscribeWebSocketButton.addEventListener("click", subscribeWebSocket);
});

document.getElementById("hostSwitch").addEventListener("change", function () {
  if (this.checked) {
    console.log("HOST mode selected");
    subscribeWebSocketButton.classList.add("hidden");
    openWebSocketButton.classList.remove("hidden");
    pairButton.classList.remove("hidden");
    connectedRobotName.classList.remove("hidden");
  }
});

document.getElementById("guestSwitch").addEventListener("change", function () {
  if (this.checked) {
    console.log("GUEST mode selected");
    subscribeWebSocketButton.classList.remove("hidden");
    openWebSocketButton.classList.add("hidden");
    pairButton.classList.add("hidden");
    connectedRobotName.classList.add("hidden");
  }
});
