const DOM_ELEMENTS = {
  pairButton: "pairButton",
  sendMediaServerInfoButton: "sendMediaServerInfoButton",
  openWebSocketButton: "openWebSocketButton",
  stopButton: "stopButton",
  robotSelect: "robotSelect",
  robotNameInput: "robotNameInput",
  messageView: "messageView",
  subscribeWebSocketButton: "subscribeWebSocketButton",
  advancedSettings: "advancedSettings",
  connectedRobotName: "connectedRobotName",
};

export function initializeDOMElements() {
  return Object.keys(DOM_ELEMENTS).reduce((elements, key) => {
    elements[key] = document.getElementById(DOM_ELEMENTS[key]);
    return elements;
  }, {});
}

const VARIABLES = {
  deviceObj: null,
  selectedDeviceControlMap: null,
  websocket: null,
  networkConfig: {},
  lastDirection: null,
  txCharacteristicObj: null,
};

export function initializeVariables() {
  return { ...VARIABLES };
}
