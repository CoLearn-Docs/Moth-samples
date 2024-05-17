const DOM_ELEMENTS = {
  pairButton: "pairButton",
  sendMediaServerInfoButton: "sendMediaServerInfoButton",
  openWebSocketButton: "openWebSocketButton",
  stopButton: "stopButton",
  videoElement: "videoElement",
  userVideoElement: "userVideoElement",
  showCameraButton: "showCameraButton",
  cameraSelect: "cameraSelect",
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
  device: null,
  selectedDeviceControlMap: null,
  websocket: null,
  networkConfig: {},
  lastDirection: null,
  writer: null,
  mediaStreamTrack: null,
  gestureRecognizer: null,
  runningMode: "IMAGE",
};

export function initializeVariables() {
  return { ...VARIABLES };
}
