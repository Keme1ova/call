let pc = new RTCPeerConnection();
let ws;
let yourId, targetId;

let localVideo = document.getElementById("localVideo");
let remoteVideo = document.getElementById("remoteVideo");

// Запрашиваем доступ к камере и микрофону
navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
  stream.getTracks().forEach(track => pc.addTrack(track, stream));
  localVideo.srcObject = stream;
}).catch(error => {
  console.error("Ошибка доступа к камере/микрофону:", error);
});

// При получении потока от удалённого абонента
pc.ontrack = event => {
  remoteVideo.srcObject = event.streams[0];
};

// ICE-кандидаты отправляются через WebSocket
pc.onicecandidate = event => {
  if (event.candidate) {
    sendMessage({ type: "ice", candidate: event.candidate });
  }
};

// Функция отправки сообщений через WebSocket
function sendMessage(message) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error("WebSocket не готов. readyState:", ws?.readyState);
    return;
  }
  ws.send(JSON.stringify({ to: targetId, data: message }));
}

// Подключение к WebSocket и инициализация соединения
function start() {
  const idInput = document.getElementById("yourId");
  if (!idInput.value) {
    idInput.value = Math.random().toString(36).substr(2, 8);
  }

  yourId = idInput.value;
  targetId = document.getElementById("targetId").value;

  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = `${protocol}://${location.host}/ws/${yourId}`;

  try {
    ws = new WebSocket(wsUrl);
  } catch (err) {
    console.error("Ошибка создания WebSocket:", err);
    return;
  }

  ws.onopen = () => {
    console.log("WebSocket подключён");
    document.getElementById("callButton")?.removeAttribute("disabled");
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

  ws.onerror = err => {
    console.error("WebSocket ошибка:", err);
  };

  ws.onclose = () => {
    console.log("WebSocket соединение закрыто");
  };
}

// Начало звонка (отправка offer)
async function call() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error("WebSocket не подключён. Невозможно позвонить.");
    return;
  }

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  sendMessage(offer);
}

// Делаем функции доступными в глобальном контексте (для HTML onclick)
window.start = start;
window.call = call;
