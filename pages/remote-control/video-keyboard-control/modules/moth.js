function getChannelListURL({ host, port }) {
  const protocol = window.location.protocol.slice(0, -1);
  const urlWithParams = new URL(
    `${protocol}://${host}:${port}/monitor/http/cmd?format=json&op=show&obj=channel`
  );
  return urlWithParams;
}

function setServiceURL({ type, options, host, port }) {
  const protocol =
    window.location.protocol.replace(/:$/, "") === "http" ? "ws" : "wss";
  const pathname = `pang/ws/${type}`;

  const urlWithParams = new URL(
    `${protocol}://${host}:${String(port)}/${pathname}`
  );

  Object.entries(options).forEach(([key, value]) => {
    if (value) urlWithParams.searchParams.append(key, String(value));
  });

  return urlWithParams;
}

function isMimeMessage(message) {
  return typeof message === "string";
}

function isEncodedMessage(message) {
  return typeof message === "object";
}

function parseMime(mime) {
  const [parsedMimeType, ...mimeOption] = mime.split(";");
  const parsedMimeOptionObj = mimeOption.reduce((acc, option) => {
    const [key, value] = option.trim().split("=");
    acc[key] = value;
    return acc;
  }, {});

  return {
    parsedMimeType,
    parsedMimeOptionObj,
  };
}

const useMoth = {
  isMimeMessage,
  isEncodedMessage,
  parseMime,
  setServiceURL,
  getChannelListURL,
};
export default useMoth;
