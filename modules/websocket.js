export default function keepWebSocketAlive(webSocket, interval = 10000) {
  let pingTimer;

  const sendPing = () => {
    if (webSocket.readyState === WebSocket.OPEN) {
      webSocket.send(new TextEncoder().encode("ping"));
    }
  };

  const schedulePing = () => {
    pingTimer = setInterval(sendPing, interval);
  };

  const sendPong = () => {
    if (webSocket.readyState === WebSocket.OPEN) {
      webSocket.send(new TextEncoder().encode("pong"));
    }
  };

  const handleWebSocketClose = () => {
    clearInterval(pingTimer);
  };

  webSocket.addEventListener("open", schedulePing);
  webSocket.addEventListener("message", (event) => {
    if (event.data === "ping") {
      sendPong();
    }
  });
  webSocket.addEventListener("close", handleWebSocketClose);
}
