const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

export const deviceLabels = [
  {
    label: "Lego Cobot",
    value: "COBOT_PRO_001",
  },
  {
    label: "Junbook",
    value: "JUNBOOK",
  },
];

const COBOT_PRO_001 = {
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
  },
  stopCommand: "STOP",
};

const JUNBOOK = {
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

export const deviceControlMap = {
  COBOT_PRO_001,
  JUNBOOK,
};
