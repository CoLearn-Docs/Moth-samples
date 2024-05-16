import useBluetooth from "./modules/bluetooth.js";
import useMoth from "./modules/moth.js";
import { deviceControlMap } from "./modules/deviceProfile.js";
import keepWebSocketAlive from "./modules/websocket.js";

import {
  GestureRecognizer,
  FilesetResolver,
  DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";

// tmp데이터====================================================
const ssidInput = document.getElementById("ssidInput");
const passwordInput = document.getElementById("passwordInput");
const hostInput = document.getElementById("hostInput");
const portInput = document.getElementById("portInput");

ssidInput.value = "TeamGRITax";
passwordInput.value = "teamgrit8266";
hostInput.value = "cobot.center";
portInput.value = 8286;
// ===========================================================
const {
  pairButton,
  sendMediaServerInfoButton,
  openWebSocketButton,
  stopButton,
  videoElement,
  userVideoElement,
  showCameraButton,
} = initializeDOMElements();
let {
  device,
  websocket,
  networkConfig,
  lastDirection,
  selectedDeviceControlMap,
  writer,
  mediaStreamTrack,
  gestureRecognizer,
  runningMode,
} = initializeVariables();

function initializeDOMElements() {
  const pairButton = document.getElementById("pairButton");
  const sendMediaServerInfoButton = document.getElementById(
    "sendMediaServerInfoButton"
  );
  const openWebSocketButton = document.getElementById("openWebSocketButton");
  const stopButton = document.getElementById("stopButton");
  const videoElement = document.getElementById("videoElement");
  const userVideoElement = document.getElementById("userVideoElement");
  const showCameraButton = document.getElementById("showCamera");

  return {
    pairButton,
    sendMediaServerInfoButton,
    openWebSocketButton,
    stopButton,
    videoElement,
    userVideoElement,
    showCameraButton,
  };
}

function initializeVariables() {
  let device;
  let selectedDeviceControlMap;
  let websocket;
  let networkConfig = {};
  let lastDirection;
  let writer;
  let mediaStreamTrack;
  let gestureRecognizer;
  let runningMode = "IMAGE";

  return {
    device,
    selectedDeviceControlMap,
    websocket,
    networkConfig,
    lastDirection,
    writer,
    mediaStreamTrack,
    gestureRecognizer,
    runningMode,
  };
}

/**
 * create gesture recognizer
 */
async function createGestureRecognizer() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
  );
  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
      delegate: "GPU",
    },
    runningMode: runningMode,
  });
}

async function detectHandGestureFromVideo(gestureRecognizer, stream) {
  if (!gestureRecognizer) return;

  const videoTrack = stream.getVideoTracks()[0];
  const capturedImage = new ImageCapture(videoTrack);
  while (true) {
    await capturedImage.grabFrame().then((imageBitmap) => {
      const detectedGestures = gestureRecognizer.recognize(imageBitmap);

      const { gestures } = detectedGestures;

      if (gestures[0]) {
        const gesture = gestures[0][0].categoryName;
        const controlCommandMap =
          selectedDeviceControlMap.controlCommandMap.handGesture.direction;
        if (Object.keys(controlCommandMap).includes(gesture)) {
          const direction = controlCommandMap[gesture];
          if (direction !== lastDirection) {
            lastDirection = direction;

            const controlCommand = {
              type: "control",
              direction,
            };
            if (websocket && websocket.readyState === WebSocket.OPEN) {
              const encoder = new TextEncoder();
              const encodedCommand = encoder.encode(
                JSON.stringify(controlCommand)
              );
              websocket.send(encodedCommand);
              displayMessage(`Send '${direction}' command`);
            }
          }
        }
      }
    });
  }
}

/**
 * get camera device list and update camera select option
 */
async function findCameraDevice() {
  try {
    await navigator.permissions.query({ name: "camera" });
    const devices = await navigator.mediaDevices.enumerateDevices();
    devices.forEach((device) => {
      if (device.kind === "videoinput") {
        updateCameraSelection(device);
      }
    });
  } catch (err) {
    console.log(err.name + ": " + err.message);
  }
}

function updateCameraSelection(device) {
  const cameraSelect = document.getElementById("cameraSelect");
  const option = document.createElement("option");
  option.value = device.deviceId;
  option.text = device.label;
  cameraSelect.appendChild(option);
}

async function getVideoSrcObject() {
  const cameraSelect = document.getElementById("cameraSelect");
  const cameraId = cameraSelect.value;
  const constraints = {
    audio: false,
    video: {
      deviceId: cameraId,
    },
  };

  const stream = await navigator.mediaDevices
    .getUserMedia(constraints)
    .then(async (stream) => {
      userVideoElement.srcObject = stream;

      await createGestureRecognizer().then(() => {
        detectHandGestureFromVideo(gestureRecognizer, stream);
      });
    })
    .catch((error) => {
      console.log(error);
    });

  return stream;
}

/**
 * connect to bluetooth device and set device control map
 */
async function bluetoothPairing() {
  const robotSelect = document.getElementById("robotSelect");
  const robotNameInput = document.getElementById("robotNameInput");
  selectedDeviceControlMap = deviceControlMap[robotSelect.value];
  device = await useBluetooth.connectToBluetoothDevice(
    selectedDeviceControlMap.namePrefix ?? undefined,
    selectedDeviceControlMap.serviceUUID
  );
  robotNameInput.value = device.name;
}

/**
 * send media server info to device
 */
async function sendMediaServerInfo() {
  mediaStreamTrack = new MediaStreamTrackGenerator({
    kind: "video",
  });
  writer = mediaStreamTrack.writable.getWriter();
  await writer.ready;
  videoElement.srcObject = new MediaStream([mediaStreamTrack]);

  networkConfig = {
    ssid: ssidInput.value,
    password: passwordInput.value,
    host: hostInput.value,
    port: portInput.value,
    channel: "instant",
    channel_name: channelInput.value,
  };

  const devicePort =
    window.location.protocol.replace(/:$/, "") === "http"
      ? networkConfig.port
      : networkConfig.port - 1;

  if (device) {
    const metricData = {
      type: "metric",
      data: {
        server: {
          ssid: networkConfig.ssid,
          password: networkConfig.password,
          host: networkConfig.host,
          port: devicePort,
          path: `pang/ws/pub?channel=instant&name=${networkConfig.channel_name}&track=colink&mode=bundle`,
        },
        profile: robotSelect.value,
      },
    };

    if (selectedDeviceControlMap.maxTransferSize) {
      useBluetooth.sendMessageToDeviceOverBluetooth(
        JSON.stringify(metricData),
        device,
        selectedDeviceControlMap.maxTransferSize,
        selectedDeviceControlMap.serviceUUID,
        selectedDeviceControlMap.txCharacteristicUUID
      );
    } else {
      useBluetooth.sendTextToDeviceOverBluetooth(
        JSON.stringify(metricData),
        device,
        selectedDeviceControlMap.serviceUUID,
        selectedDeviceControlMap.txCharacteristicUUID
      );
    }
  }
}

async function handleChunk(frame) {
  if (frame && mediaStreamTrack) {
    await writer.write(frame);
    frame.close();
  }
}

async function openWebSocket() {
  const serverURL = useMoth.setServiceURL({
    type: "sub",
    options: {
      channel: networkConfig.channel,
      name: networkConfig.channel_name,
      track: "colink",
      mode: "bundle",
    },
    host: networkConfig.host,
    port: networkConfig.port,
  });

  websocket = new WebSocket(serverURL);
  websocket.binaryType = "arraybuffer";

  displayMessage("Open Video WebSocket");

  const videoDecoder = new VideoDecoder({
    output: handleChunk,
    error: (err) => {
      console.log(err);
    },
  });

  let mimeType;
  let mimeOptionObj;

  websocket.onmessage = (e) => {
    if (useMoth.isMimeMessage(e.data)) {
      const { parsedMimeType, parsedMimeOptionObj } = useMoth.parseMime(e.data);
      mimeType = parsedMimeType;
      mimeOptionObj = parsedMimeOptionObj;
      const videoDecoderConfig = {
        codec: mimeOptionObj.codec ?? "avc1.42E03C",
      };

      if (videoDecoderConfig.codec.includes("jpeg")) return;

      async function configureVideoDecoder() {
        if (await VideoDecoder.isConfigSupported(videoDecoderConfig)) {
          console.log("video decoder configuring...");
          videoDecoder.configure(videoDecoderConfig);
        }
      }
      configureVideoDecoder();
    }

    if (useMoth.isEncodedMessage(e.data)) {
      if (mimeType.includes("jpeg")) {
        const blob = new Blob([e.data], { type: "image/jpeg" });
        createImageBitmap(blob).then((imageBitmap) => {
          const decodedChunk = new VideoFrame(imageBitmap, {
            timestamp: e.timeStamp,
          });
          handleChunk(decodedChunk);
        });
      }
      if (videoDecoder.state === "configured") {
        const encodedChunk = new EncodedVideoChunk({
          type: "key",
          data: e.data,
          timestamp: e.timeStamp,
          duration: 0,
        });
        videoDecoder.decode(encodedChunk);
      }
    }
  };

  keepWebSocketAlive(websocket);
}

function stop() {
  websocket.close();
  useBluetooth.disconnectFromBluetoothDevice(device);
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
  sendMediaServerInfoButton.addEventListener("click", sendMediaServerInfo);
  openWebSocketButton.addEventListener("click", openWebSocket);
  stopButton.addEventListener("click", stop);
  checkCameraPermissionButton.addEventListener("click", findCameraDevice);
  showCameraButton.addEventListener("click", getVideoSrcObject);
});

videoElement.onloadedmetadata = () => {
  videoElement.style.width = "100%";
  videoElement.style.height = "100%";
};
