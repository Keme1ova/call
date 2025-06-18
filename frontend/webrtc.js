let pc = new RTCPeerConnection();
let ws;
let yourId, targetId;

let localVideo = document.getElementById("localVideo");
let remoteVideo = document.getElementById("remoteVideo");

// Получение медиа и добавление в peer connection
navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
  stream.getTracks().forEach(track => pc.addTrack(track, stream));
  localVideo.srcObject = stream;
});

// Получение медиапотока от собеседника
pc.ontrack = (event) => {
  remoteVideo.srcObject = event.streams[0];
};

// ICE кандидаты
pc.onicecandidate = event => {
  if (event.candidate) {
    sendMessage({ type: "ice", candidate: event.candidate });
  }
};

// Отправка сообщения через WebSocket с проверками
function sendMessage(message) {
  if (!ws) {
    console.error("WebSocket не создан");
    return;
  }
  if (ws.readyState !== WebSocket.OPEN) {
    console.error("WebSocket не открыт. readyState =", ws.readyState);
    return;
  }
  ws.send(JSON.stringify({ to: targetId, data: message }));
}

// Старт соединения WebSocket
function start() {
  const idInput = document.getElementById("yourId");
  if (!idInput.value) {
    idInput.value = Math.random().toString(36).substr(2, 8);
  }

  yourId = idInput.value;
  targetId = document.getElementById("targetId").value;

  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = `${protocol}://${location.host}/ws/${yourId}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("WebSocket соединение установлено");
    document.getElementById("callButton").disabled = false; // включаем кнопку звонка
  };

  ws.onmessage = async ({ data }) => {
    const msg = JSON.parse(data).data;

    if (msg.type === "offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(msg));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendMessage(answer);
    } else if (msg.type === "answer") {
      await pc.setRemoteDescription(new RTCSessionDescription(msg));
    } else if (msg.type === "ice") {
      await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
    }
  };

  ws.onerror = (err) => {
    console.error("Ошибка WebSocket:", err);
  };

  ws.onclose = () => {
    console.log("WebSocket соединение закрыто");
  };
}

// Начало вызова
async function call() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error("Нельзя начать звонок — WebSocket не подключён");
    return;
  }

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  sendMessage(offer);
}
