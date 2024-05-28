import useBluetooth from "../../../modules/bluetooth.js";
import { deviceControlMap } from "../../../modules/deviceProfile.js";
import { initializeDOMElements, initializeVariables } from "./initialize.js";

// HTML 요소들을 가져옵니다.
const { pairButton, stopButton, robotSelect, robotNameInput, messageView } =
  initializeDOMElements();
let {
  deviceObj,
  lastDirection,
  selectedDeviceControlMap,
  txCharacteristicObj,
} = initializeVariables();

// 블루투스 연결을 설정하는 함수입니다.
async function bluetoothPairing() {
  // 선택한 로봇의 제어 맵을 가져옵니다.
  selectedDeviceControlMap = deviceControlMap[robotSelect.value];

  // 블루투스 장치에 연결합니다.
  const { device, txCharacteristic } =
    await useBluetooth.connectToBluetoothDevice(
      selectedDeviceControlMap.namePrefix ?? undefined,
      selectedDeviceControlMap.serviceUUID,
      selectedDeviceControlMap.txCharacteristicUUID
    );

  // 연결된 장치의 이름을 입력란에 표시합니다.
  robotNameInput.value = device.name;
  deviceObj = device;
  txCharacteristicObj = txCharacteristic;

  // 키보드 이벤트를 감지합니다.
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
}

// 블루투스 연결을 끊는 함수입니다.
function stop() {
  // 블루투스 장치 연결을 해제합니다.
  useBluetooth.disconnectFromBluetoothDevice(deviceObj);
  robotNameInput.value = "";
  // 키보드 이벤트 감지를 중지합니다.
  document.removeEventListener("keyup", handleKeyUp);
  document.removeEventListener("keydown", handleKeyDown);
}

// 로봇 제어 명령을 생성하는 함수입니다.
function createControlCommand(robot, direction) {
  if (robot === "XROVER_DOT" || robot === "XROVER_GRIPPER") {
    return direction; // 특정 로봇의 경우 방향만 반환합니다.
  } else {
    return {
      type: "control",
      direction,
    }; // 다른 로봇의 경우 제어 명령 객체를 반환합니다.
  }
}

// 키를 눌렀을 때 실행되는 함수입니다.
async function handleKeyDown(e) {
  // 키보드 입력에 따른 방향을 가져옵니다.
  const controlCommandMap =
    selectedDeviceControlMap.controlCommandMap.keyboard.direction;
  const direction = controlCommandMap[e.code];
  if (direction === lastDirection) return; // 같은 방향이면 무시합니다.
  lastDirection = direction;

  // 제어 명령을 생성합니다.
  const controlCommand = createControlCommand(robotSelect.value, direction);

  // 블루투스로 명령을 전송합니다.
  if (selectedDeviceControlMap.maxTransferSize) {
    useBluetooth.sendMessageToDeviceOverBluetooth(
      JSON.stringify(controlCommand),
      selectedDeviceControlMap.maxTransferSize,
      txCharacteristicObj
    );
  } else {
    useBluetooth.sendTextToDeviceOverBluetooth(
      JSON.stringify(controlCommand),
      txCharacteristicObj
    );
  }

  // 메시지를 화면에 표시합니다.
  displayMessage(direction);
}

// 키를 뗐을 때 실행되는 함수입니다.
async function handleKeyUp(e) {
  // 정지 명령을 가져옵니다.
  const direction = selectedDeviceControlMap.stopCommand;
  if (direction === lastDirection) return; // 같은 방향이면 무시합니다.
  lastDirection = direction;

  // 제어 명령을 생성합니다.
  const controlCommand = createControlCommand(robotSelect.value, direction);

  // 블루투스로 명령을 전송합니다.
  if (selectedDeviceControlMap.maxTransferSize) {
    useBluetooth.sendMessageToDeviceOverBluetooth(
      JSON.stringify(controlCommand),
      selectedDeviceControlMap.maxTransferSize,
      txCharacteristicObj
    );
  } else {
    useBluetooth.sendTextToDeviceOverBluetooth(
      JSON.stringify(controlCommand),
      txCharacteristicObj
    );
  }

  // 메시지를 화면에 표시합니다.
  displayMessage(direction);
}

// 메시지를 화면에 표시하는 함수입니다.
function displayMessage(messageContent) {
  if (typeof messageContent == "object") {
    messageContent = JSON.stringify(messageContent);
  }
  messageView.innerHTML += `${messageContent}\n`;
  messageView.scrollTop = messageView.scrollHeight;
}

// 페이지가 로드되면 실행되는 함수입니다.
document.addEventListener("DOMContentLoaded", () => {
  // 페어 버튼 클릭 시 블루투스 페어링을 시작합니다.
  pairButton.addEventListener("click", bluetoothPairing);
  // 정지 버튼 클릭 시 블루투스 연결을 중지합니다.
  stopButton.addEventListener("click", stop);
});
