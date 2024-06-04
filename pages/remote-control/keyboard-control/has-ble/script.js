import useBluetooth from "../../../../modules/bluetooth.js";
// import useMoth from "../../../../modules/moth.js";
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

// 블루투스 연결을 설정하는 함수입니다.
async function bluetoothPairing() {
  // 전역변수에 선택한 로봇의 제어 맵을 가져옵니다.
  selectedDeviceControlMap = deviceControlMap[robotSelect.value];
  // 선택한 로봇의 블루투스 장치와 송신 특성에 연결합니다.
  const { device, txCharacteristic } =
    await useBluetooth.connectToBluetoothDevice(
      selectedDeviceControlMap.namePrefix ?? undefined,
      selectedDeviceControlMap.serviceUUID,
      selectedDeviceControlMap.txCharacteristicUUID
    );
  // 연결된 장치의 이름을 입력란에 표시합니다.
  robotNameInput.value = device.name;

  // 전역 변수에 연결된 장치와 송신 특성을 저장합니다.
  deviceObj = device;
  txCharacteristicObj = txCharacteristic;
}

async function openWebSocket() {
  // 웹소켓 서버에 연결합니다.
  const subServerURL = `ws://${hostInput.value}:${portInput.value}/pang/ws/sub?channel=instant&name=${channelInput.value}&track=colink&mode=bundle`;
  subWebsocket = new WebSocket(subServerURL);
  subWebsocket.binaryType = "arraybuffer";

  // 웹소켓 서버에 연결합니다.
  const pubServerURL = `ws://${hostInput.value}:${portInput.value}/pang/ws/pub?channel=instant&name=${channelInput.value}&track=colink&mode=bundle`;
  pubWebsocket = new WebSocket(pubServerURL);
  pubWebsocket.binaryType = "arraybuffer";

  subWebsocket.onopen = () => {
    if (deviceObj) {
      // 키보드 이벤트를 처리하는 함수를 등록합니다.
      document.addEventListener("keydown", (e) => handleKeyEvent(e, true));
      document.addEventListener("keyup", (e) => handleKeyEvent(e, false));
    }
  };
  displayMessage("Open WebSocket");

  // 웹소켓이 연결되었을 때 유지하는 함수를 호출합니다.
  keepWebSocketAlive(subWebsocket);
  keepWebSocketAlive(pubWebsocket);

  pubWebsocket.onmessage = (command) => {
    // 웹소켓으로 받은 데이터를 문자열로 변환합니다.
    const controlCommand = new TextDecoder().decode(command.data);
    // 블루투스로 제어 명령을 전송합니다.
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

// 키 이벤트를 처리하는 비동기 함수입니다.
async function handleKeyEvent(e, isKeyDown) {
  // 키보드 방향 제어 명령을 가져옵니다.
  const controlCommandMap =
    selectedDeviceControlMap.controlCommandMap.keyboard.direction;
  // 키가 눌렸는지에 따라 방향을 결정하거나 정지 명령을 사용합니다.
  const direction = isKeyDown
    ? controlCommandMap[e.code]
    : selectedDeviceControlMap.stopCommand;
  // 이전 방향과 같으면 아무 작업도 수행하지 않습니다.
  if (direction === lastDirection) return;
  // 마지막 방향을 업데이트합니다.
  lastDirection = direction;

  // 제어 명령을 생성합니다.
  const controlCommand = createControlCommand(robotSelect.value, direction);

  // 웹소켓이 열려 있으면 제어 명령을 전송합니다.
  if (subWebsocket && subWebsocket.readyState === WebSocket.OPEN) {
    subWebsocket.send(new TextEncoder().encode(JSON.stringify(controlCommand)));
    // 메시지를 표시합니다.
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
  // 웹소켓 서버에 연결합니다.
  const subServerURL = `ws://${hostInput.value}:${portInput.value}/pang/ws/sub?channel=instant&name=${channelInput.value}&track=colink&mode=bundle`;
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
