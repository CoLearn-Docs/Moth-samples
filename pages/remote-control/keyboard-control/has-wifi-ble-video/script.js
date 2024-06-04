import useBluetooth from "../../../../modules/bluetooth.js";
import useMoth from "../../../../modules/moth.js";
import { deviceControlMap } from "../../../../modules/deviceProfile.js";
import keepWebSocketAlive from "../../../../modules/websocket.js";
import { initializeDOMElements, initializeVariables } from "./initialize.js";

const {
  pairButton,
  sendMediaServerInfoButton,
  openWebSocketButton,
  stopButton,
  videoElement,
  robotSelect,
  robotNameInput,
  messageView,
  subscribeWebSocketButton,
  advancedSettings,
  connectedRobotName,
} = initializeDOMElements();

let {
  deviceObj,
  websocket,
  networkConfig,
  lastDirection,
  selectedDeviceControlMap,
  writer,
  mediaStreamTrack,
  txCharacteristicObj,
} = initializeVariables();

async function bluetoothPairing() {
  selectedDeviceControlMap = deviceControlMap[robotSelect.value];

  const { device, txCharacteristic } =
    await useBluetooth.connectToBluetoothDevice(
      selectedDeviceControlMap.namePrefix ?? undefined,
      selectedDeviceControlMap.serviceUUID,
      selectedDeviceControlMap.txCharacteristicUUID
    );
  robotNameInput.value = device.name;
  deviceObj = device;
  txCharacteristicObj = txCharacteristic;
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

  if (deviceObj) {
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
        selectedDeviceControlMap.maxTransferSize,
        txCharacteristicObj
      );
    } else {
      useBluetooth.sendTextToDeviceOverBluetooth(
        JSON.stringify(metricData),
        txCharacteristicObj
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
    if (deviceObj) {
      document.addEventListener("keydown", (e) => handleKeyEvent(e, true));
      document.addEventListener("keyup", (e) => handleKeyEvent(e, false));
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
      console.log("isMimeMessage");
      const { parsedMimeType, parsedMimeOptionObj } = useMoth.parseMime(e.data);
      mimeType = parsedMimeType;
      mimeOptionObj = parsedMimeOptionObj;
      const videoDecoderConfig = {
        codec: mimeOptionObj.codecs ?? "avc1.42E03C",
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
      console.log("isEncodedMessage");
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
  useBluetooth.disconnectFromBluetoothDevice(deviceObj);
}

async function handleKeyEvent(e, isKeyDown) {
  selectedDeviceControlMap = deviceControlMap[robotSelect.value];
  const controlCommandMap =
    selectedDeviceControlMap.controlCommandMap.keyboard.direction;
  const direction = isKeyDown
    ? controlCommandMap[e.code]
    : selectedDeviceControlMap.stopCommand;
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

const subscribeWebSocket = async () => {
  const channelInput = document.getElementById("channelInput").value;
  const hostInput = document.getElementById("hostInput").value;
  const portInput = document.getElementById("portInput").value;

  const serverURL = useMoth.setServiceURL({
    type: "sub",
    options: {
      channel: "instant",
      name: channelInput,
      track: "colink",
      mode: "bundle",
    },
    host: hostInput,
    port: portInput,
  });

  websocket = new WebSocket(serverURL);
  websocket.binaryType = "arraybuffer";
  websocket.onopen = () => {
    document.addEventListener("keydown", (e) => handleKeyEvent(e, true));
    document.addEventListener("keyup", (e) => handleKeyEvent(e, false));
  };
  displayMessage("Open WebSocket");

  mediaStreamTrack = new MediaStreamTrackGenerator({
    kind: "video",
  });
  writer = mediaStreamTrack.writable.getWriter();
  await writer.ready;
  videoElement.srcObject = new MediaStream([mediaStreamTrack]);

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
        codec: mimeOptionObj.codecs ?? "avc1.42E03C",
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
};

document.addEventListener("DOMContentLoaded", () => {
  pairButton.addEventListener("click", bluetoothPairing);
  sendMediaServerInfoButton.addEventListener("click", sendMediaServerInfo);
  openWebSocketButton.addEventListener("click", openWebSocket);
  subscribeWebSocketButton.addEventListener("click", subscribeWebSocket);
  stopButton.addEventListener("click", stop);
});

videoElement.onloadedmetadata = () => {
  videoElement.style.width = "100%";
  videoElement.style.height = "100%";
};

document.getElementById("hostSwitch").addEventListener("change", function () {
  if (this.checked) {
    console.log("HOST mode selected");
    advancedSettings.classList.remove("hidden");
    subscribeWebSocketButton.classList.add("hidden");
    openWebSocketButton.classList.remove("hidden");
    pairButton.classList.remove("hidden");
    connectedRobotName.classList.remove("hidden");
    sendMediaServerInfoButton.classList.remove("hidden");
  }
});

document.getElementById("guestSwitch").addEventListener("change", function () {
  if (this.checked) {
    console.log("GUEST mode selected");
    advancedSettings.classList.add("hidden");
    subscribeWebSocketButton.classList.remove("hidden");
    openWebSocketButton.classList.add("hidden");
    pairButton.classList.add("hidden");
    connectedRobotName.classList.add("hidden");
    sendMediaServerInfoButton.classList.add("hidden");
  }
});
