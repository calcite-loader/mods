/**
 * @name Mooned
 */

import Peer, { DataConnection } from "peerjs";

type Packet = [
  number, /** x */
  number, /** y */
  number, /** angle */
];

let started = false;

const baseUrl = BUILD_MODE === "debug"
  ? "http://localhost:9000"
  : "https://mooned.grady.link";

const peer = new Peer({
  host: BUILD_MODE == "debug" ? "localhost" : "mooned.grady.link",
  port: BUILD_MODE == "debug" ? 9000 : 443,
  path: "/",
  secure: BUILD_MODE == "release",
});

const connections: Record<string, DataConnection> = {};
const players: Record<string, Phaser.GameObjects.Image> = {};

const groundBoundsY = 460;

const setupConnection = (connection: DataConnection) => {
  const id = connection.peer;

  connections[id] = connection;
  players[id] = window.createImageFromAtlas(
    window.gdScene,
    0,
    0,
    "player_01_001.png",
  );
  if (!started) players[id].visible = false;

  connection.on("data", (data) => {
    const packet = data as Packet;
    players[id]!.x = packet[0] - window.gdScene._cameraX;
    players[id]!.y = groundBoundsY - (packet[1] - window.gdScene._cameraY);
    players[id]!.angle = packet[2];
  });

  connection.on("close", () => {
    delete connections[id];
    delete players[id];
  });
};

peer.on("open", async () => {
  console.log("Connected: " + peer.id);

  const response = await fetch(baseUrl + "/peerjs/peers");
  const peerList = await response.json() as string[];

  for (const id of peerList) {
    if (id != peer.id && !connections[id]) {
      setupConnection(peer.connect(id, { reliable: false }));
    }
  }
});

peer.on("connection", (connection) => setupConnection(connection));

const sendPacket = (packet: Packet) => {
  Object.values(connections).forEach((connection) => {
    if (connection.open) connection.send(packet);
  });
};

const sendFrame = 3;
let frameCounter = 0;

api.onUpdate(() => {
  frameCounter++;

  if (frameCounter >= sendFrame) {
    frameCounter = 0;

    sendPacket([
      window.gdScene._playerWorldX,
      window.gdScene._state.y,
      window.gdScene._player.playerSprite.angle,
    ]);
  }
});

api.onStart(() => {
  started = true;
  Object.values(players).forEach((player) => player.visible = true);
});
