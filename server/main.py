from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from typing import Dict
import json

app = FastAPI()
app.mount("/", StaticFiles(directory="frontend", html=True), name="static")

connections: Dict[str, WebSocket] = {}

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()
    connections[user_id] = websocket
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            to = msg.get("to")
            if to in connections:
                await connections[to].send_text(json.dumps({"from": user_id, "data": msg["data"]}))
    except WebSocketDisconnect:
        connections.pop(user_id, None)