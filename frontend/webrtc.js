let pc = new RTCPeerConnection();
let ws;
let yourId, targetId;

let localVideo = document.getElementById("localVideo");
let remoteVideo = document.getElementById("remoteVideo");

navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
  stream.getTracks().forEach(track => pc.addTrack(track, stream));
  localVideo.srcObject = stream;
});

pc.ontrack = (event) => {
  remoteVideo.srcObject = event.streams[0];
};

pc.onicecandidate = event => {
  if (event.candidate) {
    sendMessage({ type: "ice", candidate: event.candidate });
  }
};

function sendMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ to: targetId, data: message }));
  } else {
    console.error("WebSocket не подключён или ещё не открыт");
  }
}

function start() {
  // Автоматическая генерация ID, если не введено
  const idInput = document.getElementById("yourId");
  if (!idInput.value) {
    idInput.value = Math.random().toString(36).substr(2, 8);
  }

  yourId = idInput.value;
  targetId = document.getElementById("targetId").value;

  const protocol = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${protocol}://${location.host}/ws/${yourId}`);

  ws.onmessage = async ({ data }) => {
    let msg = JSON.parse(data).data;
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
}

async function call() {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  sendMessage(offer);
}
