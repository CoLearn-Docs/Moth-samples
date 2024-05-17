import useBluetooth from "../../../modules/bluetooth.js";
import useMoth from "../../.../../../modules/moth.js";
import { deviceControlMap } from "../../../modules/deviceProfile.js";
import keepWebSocketAlive from "../../.../../../modules/websocket.js";
import { initializeDOMElements, initializeVariables } from "./initialize.js";

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
  robotSelect,
  robotNameInput,
  messageView,
} = initializeDOMElements();

let {
  device,
  websocket,
  networkConfig,
  lastDirection,
  selectedDeviceControlMap,
  writer,
  mediaStreamTrack,
} = initializeVariables();

async function bluetoothPairing() {
  selectedDeviceControlMap = deviceControlMap[robotSelect.value];

  device = await useBluetooth.connectToBluetoothDevice(
    selectedDeviceControlMap.namePrefix ?? undefined,
    selectedDeviceControlMap.serviceUUID
  );
  robotNameInput.value = device.name;
}

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
  websocket.onopen = () => {
    if (device) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("keyup", handleKeyUp);
    }
  };
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

  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(new TextEncoder().encode(JSON.stringify(controlCommand)));
    displayMessage(direction);
  }
}

async function handleKeyUp(e) {
  const direction = selectedDeviceControlMap.stopCommand;
  if (direction === lastDirection) return;
  lastDirection = direction;

  const controlCommand = {
    type: "control",
    direction,
  };

  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(new TextEncoder().encode(JSON.stringify(controlCommand)));
    displayMessage(direction);
  }
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
  sendMediaServerInfoButton.addEventListener("click", sendMediaServerInfo);
  openWebSocketButton.addEventListener("click", openWebSocket);
  stopButton.addEventListener("click", stop);
});

videoElement.onloadedmetadata = () => {
  videoElement.style.width = "100%";
  videoElement.style.height = "100%";
};
