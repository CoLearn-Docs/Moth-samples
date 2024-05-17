const DOM_ELEMENTS = {
  checkCameraPermissionButton: "checkCameraPermissionButton",
  cameraPermissionLabel: "cameraPermissionLabel",
  findChannelsButton: "findChannelsButton",
  publishButton: "publishButton",
  subscribeButton: "subscribeButton",
  stopButton: "stopButton",
  codecSelect: "codecSelect",
  resolutionSelect: "resolutionSelect",
  cameraSelect: "cameraSelect",
  bitrateModeSelect: "bitrateModeSelect",
  channelSelect: "channelSelect",
  hostInput: "hostInput",
  portInput: "portInput",
  bitrateInput: "bitrateInput",
  framerateInput: "framerateInput",
  videoElement: "videoElement",
  keyframeIntervalInput: "keyframeIntervalInput",
};

export function initializeDOMElements() {
  return Object.keys(DOM_ELEMENTS).reduce((elements, key) => {
    elements[key] = document.getElementById(DOM_ELEMENTS[key]);
    return elements;
  }, {});
}

const VARIABLES = {
  websocket: null,
};

export function initializeVariables() {
  return { ...VARIABLES };
}
