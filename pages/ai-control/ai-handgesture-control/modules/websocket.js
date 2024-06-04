export default function keepWebSocketAlive(webSocket, interval) {
  const pingInterval = interval ?? 10000;
  let pingTimer;

  function sendPing() {
    if (webSocket.readyState === WebSocket.OPEN) {
      webSocket.send(new TextEncoder().encode("ping"));
    }
  }

  function schedulePing() {
    pingTimer = setInterval(sendPing, pingInterval);
  }

  function sendPong() {
    if (webSocket.readyState === WebSocket.OPEN) {
      webSocket.send(new TextEncoder().encode("pong"));
    }
  }

  function handleWebSocketClose() {
    clearInterval(pingTimer);
  }

  webSocket.addEventListener("open", () => {
    schedulePing();
  });

  webSocket.addEventListener("message", (event) => {
    if (event.data === "ping") {
      sendPong();
    }
  });

  webSocket.addEventListener("close", () => {
    handleWebSocketClose();
  });
}
