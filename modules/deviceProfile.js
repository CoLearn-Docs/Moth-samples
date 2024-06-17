const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const HM10_SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
const HM10_CHARACTERISTIC_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";

export const deviceLabels = [
  {
    label: "CoBot-Pro",
    value: "CoBot_Pro",
  },
  {
    label: "CoBot-ESP32",
    value: "CoBot_ESP32",
  },
];

const CoBot_Pro = {
  namePrefix: "BBC",
  controlType: ["direction"],
  hasBluetoothSetting: true,
  hasWifiSetting: true,
  serviceUUID: UART_SERVICE_UUID,
  rxCharacteristicUUID: UART_RX_CHARACTERISTIC_UUID,
  txCharacteristicUUID: UART_TX_CHARACTERISTIC_UUID,
  maxTransferSize: 15,
  controlCommandMap: {
    keyboard: {
      direction: {
        KeyW: "N",
        KeyA: "CCW",
        KeyS: "S",
        KeyD: "CW",
      },
    },
    handGesture: {
      direction: {
        Closed_Fist: "N",
        Open_Palm: "CCW",
        Pointing_Up: "S",
        Thumb_Up: "CW",
        Victory: "STOP",
      },
    },
  },
  stopCommand: "STOP",
};

const CoBot_ESP32 = {
  namePrefix: "CoPlay",
  controlType: ["direction"],
  hasBluetoothSetting: true,
  hasWifiSetting: true,
  serviceUUID: UART_SERVICE_UUID,
  rxCharacteristicUUID: UART_RX_CHARACTERISTIC_UUID,
  txCharacteristicUUID: UART_TX_CHARACTERISTIC_UUID,
  controlCommandMap: {
    keyboard: {
      direction: {
        KeyW: "N",
        KeyA: "CCW",
        KeyS: "S",
        KeyD: "CW",
      },
    },
  },
  stopCommand: "STOP",
};

const XROVER_DOT = {
  namePrefix: "HMSoft",
  controlType: ["direction"],
  hasBluetoothSetting: true,
  hasWifiSetting: false,
  serviceUUID: HM10_SERVICE_UUID,
  rxCharacteristicUUID: HM10_CHARACTERISTIC_UUID,
  txCharacteristicUUID: HM10_CHARACTERISTIC_UUID,
  controlCommandMap: {
    keyboard: {
      direction: {
        KeyW: "F",
        KeyA: "L",
        KeyS: "B",
        KeyD: "R",
        KeyH: "H", // 하트
      },
    },
  },
  stopCommand: "S",
};

const XROVER_GRIPPER = {
  namePrefix: "HM-10",
  controlType: ["direction"],
  hasBluetoothSetting: true,
  hasWifiSetting: false,
  serviceUUID: HM10_SERVICE_UUID,
  rxCharacteristicUUID: HM10_CHARACTERISTIC_UUID,
  txCharacteristicUUID: HM10_CHARACTERISTIC_UUID,
  controlCommandMap: {
    keyboard: {
      direction: {
        KeyW: "F",
        KeyA: "L",
        KeyS: "B",
        KeyD: "R",
        KeyK: "O",
        KeyL: "C",
      },
    },
  },
  stopCommand: "S",
};

export const deviceControlMap = {
  CoBot_Pro,
  CoBot_ESP32,
  XROVER_DOT,
  XROVER_GRIPPER,
};
