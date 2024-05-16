import useMoth from "./modules/moth.js";
import keepWebSocketAlive from "./modules/websocket.js";

const host = document.getElementById("hostInput");
const port = document.getElementById("portInput");
host.value = "cobot.center";
port.value = "8286";

const videoWebCodecsMap = {
  h264: "avc1.42002A", // avc1.42E03C avc1.42002A
  vp8: "vp8",
  vp9: "vp09.00.31.08",
  // av1: "av01.0.05M.10",
};

const {
  checkCameraPermissionButton,
  findChannelsButton,
  publishButton,
  subscribeButton,
  stopButton,
} = initializeDOMElements();

function initializeDOMElements() {
  const checkCameraPermissionButton = document.getElementById(
    "checkCameraPermissionButton"
  );
  const findChannelsButton = document.getElementById("findChannelsButton");
  const publishButton = document.getElementById("publishButton");
  const subscribeButton = document.getElementById("subscribeButton");
  const stopButton = document.getElementById("stopButton");

  return {
    checkCameraPermissionButton,
    findChannelsButton,
    publishButton,
    subscribeButton,
    stopButton,
  };
}

function makeResolutionOptions() {
  const resolutionSelect = document.getElementById("resolutionSelect");
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
    const cameraPermissionLabel = document.getElementById(
      "cameraPermissionLabel"
    );
    cameraPermissionLabel.innerHTML = result.state;

    if (result.state === "prompt") {
      try {
        await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        cameraPermissionLabel.innerHTML = result.state;
        console.log("Camera access granted.");
      } catch (error) {
        console.log("Camera access denied.");
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

async function findChannels() {
  const hostInput = document.getElementById("hostInput");
  const portInput = document.getElementById("portInput");

  const url = useMoth.getChannelListURL({
    host: hostInput.value,
    port: portInput.value,
  });

  try {
    const response = await fetch(url);
    const data = await response.json();

    data.forEach((channel) => {
      const channelSelect = document.getElementById("channelSelect");
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
    console.log(error);
  }
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

  const videoElement = document.getElementById("videoElement");
  const stream = await navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      videoElement.srcObject = stream;
      return stream;
    })
    .catch((error) => {
      console.log(error);
    });

  return stream;
}

async function publish() {
  const stream = await getVideoSrcObject();
  const codecSelect = document.getElementById("codecSelect");
  const resolutionSelect = document.getElementById("resolutionSelect");
  const bitrateInput = document.getElementById("bitrateInput");
  const framerateInput = document.getElementById("framerateInput");
  const bitrateModeSelect = document.getElementById("bitrateModeSelect");

  const channelSelect = document.getElementById("channelSelect");
  const hostInput = document.getElementById("hostInput");
  const portInput = document.getElementById("portInput");

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

  const websocket = new WebSocket(serverURL);
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
      websocket.send(chunkData);
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

    const keyframeIntervalInput = document.getElementById(
      "keyframeIntervalInput"
    );

    await encode(
      stream,
      videoEncoderConfig,
      handleVideoChunk,
      keyframeIntervalInput.value
    );
  };

  keepWebSocketAlive(websocket);
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

  if (!(await VideoEncoder.isConfigSupported(videoEncoderConfig))) {
    throw new Error("Unsupported video encoder configuration.");
  }

  let frameCounter = 0;

  const videoEncoder = new VideoEncoder({
    output: handleChunk,
    error: (err) => {
      console.log(err);
    },
  });

  while (true) {
    const { done, value } = await reader.read();

    if (done) return;
    if (videoEncoder.state === "closed") return;

    frameCounter++;

    videoEncoder.configure(videoEncoderConfig);

    videoEncoder.encode(value, {
      keyFrame: frameCounter % keyFrameInterval === 0,
    });
    value.close();
  }
}

async function subscribe() {
  const channelSelect = document.getElementById("channelSelect");
  const hostInput = document.getElementById("hostInput");
  const portInput = document.getElementById("portInput");
  const videoElement = document.getElementById("videoElement");

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

  const websocket = new WebSocket(serverURL);
  websocket.binaryType = "arraybuffer";

  let mediaStreamTrack = new MediaStreamTrackGenerator({
    kind: "video",
  });
  let writer = mediaStreamTrack.writable.getWriter();
  await writer.ready;
  videoElement.srcObject = new MediaStream([mediaStreamTrack]);

  async function handleChunk(frame) {
    if (frame && mediaStreamTrack) {
      await writer.write(frame);
      frame.close();
    }
  }

  const videoDecoder = new VideoDecoder({
    output: handleChunk,
    error: (err) => {
      console.log(err);
    },
  });

  let mimeType;
  let mimeOptionObj;

  websocket.onmessage = async function (e) {
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
      decode(mimeType, e, handleChunk, videoDecoder);
    }
  };
}

function decode(mimeType, e, handleChunk, videoDecoder) {
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

function stop() {
  websocket.close();
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
