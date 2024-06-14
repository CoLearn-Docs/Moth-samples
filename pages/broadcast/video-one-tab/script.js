import useMoth from "../../../modules/moth.js";
import keepWebSocketAlive from "../../../modules/websocket.js";
import { initializeDOMElements, initializeVariables } from "./initialize.js";

const videoWebCodecsMap = {
  h264: "avc1.42E03C",
  vp8: "vp8",
  vp9: "vp09.00.31.08",
  // av1: "av01",
};

const {
  checkCameraPermissionButton,
  cameraPermissionLabel,
  findChannelsButton,
  publishButton,
  subscribeButton,
  stopButton,
  resolutionSelect,
  codecSelect,
  bitrateInput,
  framerateInput,
  bitrateModeSelect,
  channelSelect,
  hostInput,
  portInput,
  videoElement,
  keyframeIntervalInput,
  pairSection,
} = initializeDOMElements();

let { websocket } = initializeVariables();

function makeResolutionOptions() {
  const resolutionOptions = ["640x480", "1280x720", "1920x1080"];
  for (let i = 0; i < resolutionOptions.length; i++) {
    const option = document.createElement("option");
    option.value = resolutionOptions[i];
    option.text = resolutionOptions[i];
    resolutionSelect.appendChild(option);
  }
}

async function checkCameraPermission() {
  try {
    const result = await navigator.permissions.query({ name: "camera" });
    cameraPermissionLabel.innerHTML = result.state;

    if (result.state === "prompt") {
      try {
        await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        cameraPermissionLabel.innerHTML = result.state;
        console.log("Camera access granted.");
      } catch (error) {
        console.error("Camera access denied.");
      }
    }
    await findCameraDevice();
  } catch (error) {
    console.error("Error checking camera permission:", error);
  }
}

async function findCameraDevice() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    devices.forEach((device) => {
      if (device.kind === "videoinput") {
        updateCameraSelection(device);
      }
    });
  } catch (err) {
    console.error(err.name + ": " + err.message);
  }
}

function updateCameraSelection(device) {
  const option = document.createElement("option");
  option.value = device.deviceId;
  option.text = device.label;
  cameraSelect.appendChild(option);
}

async function findChannels() {
  const url = useMoth.getChannelListURL({
    host: hostInput.value,
    port: portInput.value,
  });

  try {
    const response = await fetch(url);
    const data = await response.json();

    data.forEach((channel) => {
      const option = document.createElement("option");

      if (channel.state == 1) {
        option.text = `${channel.name} (live)`;
      } else if (channel.blocked === true) {
        option.text = `${channel.name} (blocked)`;
      } else {
        option.text = channel.name;
      }
      option.value = channel.id;

      channelSelect.appendChild(option);
    });
  } catch (error) {
    console.error(error);
  }
}

async function getVideoSrcObject() {
  const cameraId = cameraSelect.value;
  const constraints = {
    audio: false,
    video: {
      deviceId: cameraId,
    },
  };

  const stream = await navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      videoElement.srcObject = stream;
      return stream;
    })
    .catch((error) => {
      console.error(error);
    });

  return stream;
}

async function publish() {
  const stream = await getVideoSrcObject();
  const serverURL = useMoth.setServiceURL({
    type: "pub",
    options: {
      channel: channelSelect.value,
      track: "video",
      mode: "single",
    },
    host: hostInput.value,
    port: portInput.value,
  });

  websocket = new WebSocket(serverURL);
  websocket.binaryType = "arraybuffer";

  const codecs = codecSelect.value;
  const codecsValue = videoWebCodecsMap[codecSelect.value];
  const videoWidth = resolutionSelect.value.split("x")[0];
  const videoHeight = resolutionSelect.value.split("x")[1];

  websocket.onopen = async function () {
    const mime = `video/${codecs};codecs=${codecsValue};width=${videoWidth};height=${videoHeight};`;
    websocket.send(mime);

    function handleVideoChunk(chunk) {
      const chunkData = new Uint8Array(chunk.byteLength);
      chunk.copyTo(chunkData);
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(chunkData);
      }
    }

    const videoEncoderConfig = {
      codec: codecsValue,
      width: videoWidth,
      height: videoHeight,
      bitrate: bitrateInput.value,
      framerate: framerateInput.value,
      bitrateMode: bitrateModeSelect.value,
      latencyMode: "realtime",
      avc: { format: "annexb" },
    };

    await encode(
      stream,
      videoEncoderConfig,
      handleVideoChunk,
      keyframeIntervalInput.value
    );
    keepWebSocketAlive(websocket);
  };

  websocket.onclose = function () {
    console.log("websocket closed");
  };
}

async function encode(
  stream,
  videoEncoderConfig,
  handleChunk,
  keyFrameInterval = 1
) {
  const videoTrack = stream.getVideoTracks()[0];
  const trackProcessor = new MediaStreamTrackProcessor(videoTrack);
  const reader = trackProcessor.readable.getReader();
  let frameCounter = 0;

  if (!(await VideoEncoder.isConfigSupported(videoEncoderConfig))) {
    console.error("Unsupported video encoder configuration.");
    return;
  }

  const videoEncoder = new VideoEncoder({
    output: handleChunk,
    error: (err) => {
      console.error(err);
    },
  });

  videoEncoder.configure(videoEncoderConfig);

  while (websocket.OPEN) {
    const { done, value } = await reader.read();

    if (done) return;
    if (videoEncoder === null || videoEncoder.state === "closed") {
      value.close();
      return;
    }

    frameCounter++;

    videoEncoder.encode(value, {
      keyFrame: frameCounter % keyFrameInterval === 0,
    });

    value.close();
  }
}

async function subscribe() {
  const serverURL = useMoth.setServiceURL({
    type: "sub",
    options: {
      channel: channelSelect.value,
      track: "video",
      mode: "single",
    },
    host: hostInput.value,
    port: portInput.value,
  });

  websocket = new WebSocket(serverURL);
  websocket.binaryType = "arraybuffer";

  let mediaStreamTrack = new MediaStreamTrackGenerator({
    kind: "video",
  });
  let writer = mediaStreamTrack.writable.getWriter();
  await writer.ready;
  videoElement.srcObject = new MediaStream([mediaStreamTrack]);

  const handleChunk = function (frame) {
    if (frame && mediaStreamTrack) {
      writer.write(frame);
      frame.close();
    }
  };

  const videoDecoder = new VideoDecoder({
    output: handleChunk,
    error: (err) => {
      console.error("VideoDecoder error:", err);
    },
  });

  let mimeType;
  let mimeOptionObj;

  websocket.onopen = function () {
    keepWebSocketAlive(websocket);
  };

  websocket.onmessage = async function (e) {
    if (useMoth.isMimeMessage(e.data)) {
      const { parsedMimeType, parsedMimeOptionObj } = useMoth.parseMime(e.data);
      mimeType = parsedMimeType;
      mimeOptionObj = parsedMimeOptionObj;
      const videoDecoderConfig = {
        codec: mimeOptionObj.codecs ?? "avc1.42E03C",
      };

      if (videoDecoderConfig.codec.includes("jpeg")) return;

      if (await VideoDecoder.isConfigSupported(videoDecoderConfig)) {
        console.log("video decoder configuring...", videoDecoderConfig.codec);
        videoDecoder.configure(videoDecoderConfig);
      } else {
        console.log("unsupported video decoder configuration");
      }
    } else {
      const encodedChunk = new EncodedVideoChunk({
        type: "key",
        data: e.data,
        timestamp: e.timeStamp,
        duration: 0,
      });

      videoDecoder.decode(encodedChunk);
    }
  };
}

function stop() {
  websocket.close();
  websocket = null;
  videoElement.srcObject = null;

  const isHost = document.getElementById("hostSwitch").checked;
  if (isHost) {
    publishButton.classList.remove("hidden");
  } else {
    subscribeButton.classList.remove("hidden");
  }
  stopButton.classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  makeResolutionOptions();
  checkCameraPermissionButton.addEventListener("click", checkCameraPermission);
  findChannelsButton.addEventListener("click", findChannels);
  publishButton.addEventListener("click", publish);
  subscribeButton.addEventListener("click", subscribe);
  stopButton.addEventListener("click", stop);
});

videoElement.onloadedmetadata = () => {
  videoElement.style.width = "100%";
  videoElement.style.height = "100%";
};

document.getElementById("hostSwitch").addEventListener("change", function () {
  if (this.checked) {
    console.log("HOST mode selected");
    subscribeButton.classList.add("hidden");
    publishButton.classList.remove("hidden");
    pairSection.classList.remove("hidden");
    channelSectionTitle.innerHTML = "1. Select the channel to use";
    publishSubscribeSectionTitle.innerHTML =
      "2. Publish and subscribe the video";
  }
});

document.getElementById("guestSwitch").addEventListener("change", function () {
  if (this.checked) {
    console.log("GUEST mode selected");
    subscribeButton.classList.remove("hidden");
    publishButton.classList.add("hidden");
    pairSection.classList.add("hidden");
    channelSectionTitle.innerHTML = "1. Select the channel to use";
    publishSubscribeSectionTitle.innerHTML =
      "2. Publish and subscribe the video";
  }
});

publishButton.addEventListener("click", () => {
  publishButton.classList.add("hidden");
  stopButton.classList.remove("hidden");
});

subscribeButton.addEventListener("click", () => {
  subscribeButton.classList.add("hidden");
  stopButton.classList.remove("hidden");
});
