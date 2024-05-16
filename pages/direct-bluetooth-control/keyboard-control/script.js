import useBluetooth from "./modules/bluetooth.js";
import { deviceControlMap } from "./modules/deviceProfile.js";

const { pairButton, stopButton } = initializeDOMElements();
let { device, lastDirection, selectedDeviceControlMap } = initializeVariables();

function initializeDOMElements() {
  const pairButton = document.getElementById("pairButton");
  const stopButton = document.getElementById("stopButton");
  return {
    pairButton,
    stopButton,
  };
}

function initializeVariables() {
  let device;
  let selectedDeviceControlMap;
  let lastDirection;
  return {
    device,
    selectedDeviceControlMap,
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
      device,
      selectedDeviceControlMap.maxTransferSize,
      selectedDeviceControlMap.serviceUUID,
      selectedDeviceControlMap.txCharacteristicUUID
    );
  } else {
    useBluetooth.sendTextToDeviceOverBluetooth(
      JSON.stringify(controlCommand),
      device,
      selectedDeviceControlMap.serviceUUID,
      selectedDeviceControlMap.txCharacteristicUUID
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
      device,
      selectedDeviceControlMap.maxTransferSize,
      selectedDeviceControlMap.serviceUUID,
      selectedDeviceControlMap.txCharacteristicUUID
    );
  } else {
    useBluetooth.sendTextToDeviceOverBluetooth(
      JSON.stringify(controlCommand),
      device,
      selectedDeviceControlMap.serviceUUID,
      selectedDeviceControlMap.txCharacteristicUUID
    );
  }

  displayMessage(direction);
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
  stopButton.addEventListener("click", stop);
});
