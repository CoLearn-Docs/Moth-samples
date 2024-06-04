const DOM_ELEMENTS = {
  pairButton: "pairButton",
  sendMediaServerInfoButton: "sendMediaServerInfoButton",
  openWebSocketButton: "openWebSocketButton",
  stopButton: "stopButton",
  robotSelect: "robotSelect",
  robotNameInput: "robotNameInput",
  messageView: "messageView",
  hostInput: "hostInput",
  portInput: "portInput",
  channelInput: "channelInput",
  subscribeWebSocketButton: "subscribeWebSocketButton",
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
  pubWebsocket: null,
  subWebsocket: null,
  networkConfig: {},
  lastDirection: null,
  txCharacteristicObj: null,
};

export function initializeVariables() {
  return { ...VARIABLES };
}
