const DOM_ELEMENTS = {
  pairButton: "pairButton",
  stopButton: "stopButton",
  robotSelect: "robotSelect",
  robotNameInput: "robotNameInput",
  messageView: "messageView",
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
  lastDirection: null,
  txCharacteristicObj: null,
};

export function initializeVariables() {
  return { ...VARIABLES };
}
