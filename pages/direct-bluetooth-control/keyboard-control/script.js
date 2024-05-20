import useBluetooth from "../../../modules/bluetooth.js";
import { deviceControlMap } from "../../../modules/deviceProfile.js";
import { initializeDOMElements, initializeVariables } from "./initialize.js";

const { pairButton, stopButton, robotSelect, robotNameInput, messageView } =
  initializeDOMElements();
let {
  deviceObj,
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

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
}

function stop() {
  useBluetooth.disconnectFromBluetoothDevice(device);
  robotNameInput.value = "";
  document.removeEventListener("keyup", handleKeyUp);
  document.removeEventListener("keydown", handleKeyDown);
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

  displayMessage(direction);
}

async function handleKeyUp(e) {
  const direction = selectedDeviceControlMap.stopCommand;
  if (direction === lastDirection) return;
  lastDirection = direction;

  const controlCommand = {
    type: "control",
    direction,
  };

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

  displayMessage(direction);
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
  stopButton.addEventListener("click", stop);
});
