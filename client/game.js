const socket = io();

let roomId = null;
let gameState = null;
let phaserGame = null;
let sceneRef = null;

/* ======================
   ENTRAR NA SALA
====================== */

function join() {
  roomId = document.getElementById("room").value;
  if (!roomId) {
    alert("Digite o código da sala");
    return;
  }
  socket.emit("joinRoom", roomId);
}

/* ======================
   FEEDBACK DE ESPERA
====================== */

socket.on("waitingPlayers", count => {
  const status = document.getElementById("status");
  status.innerText =
    `Aguardando jogadores (${count}/3)`;
});

/* ======================
   INÍCIO / ATUALIZAÇÃO
====================== */

socket.on("stateUpdate", state => {
  gameState = state;
  document.getElementById("status").innerText = "";

  if (!phaserGame) {
    startGame();
  } else {
    draw();
  }
});

/* ======================
   PHASER
====================== */

function startGame() {
  phaserGame = new Phaser.Game({
    type: Phaser.AUTO,
    width: 1100,
    height: 360,
    backgroundColor: "#1f1f1f",
    scene: {
      create() {
        sceneRef = this;
        draw();
      }
    }
  });
}

/* ======================
   CORES POR CLASSE
====================== */

function pawnColor(pawn) {
  switch (pawn.class) {
    case "Inocente": return 0xffffff;
    case "Policial": return 0x3b82f6;
    case "Assassino": return 0xef4444;
    case "Medico": return 0x22c55e;
    case "Detetive": return 0xfacc15;
    default: return 0xaaaaaa;
  }
}

/* ======================
   DESENHO
====================== */

function draw() {
  if (!sceneRef || !gameState) return;

  sceneRef.children.removeAll();

  drawHeader();
  drawBoard();
  drawPawns();
}

function drawHeader() {
  const current =
    gameState.players[gameState.currentTurn];

  sceneRef.add.text(
    20,
    10,
    `Turno: ${current.id.slice(0, 5)}`,
    { fontSize: "16px", fill: "#fff" }
  );

  if (gameState.finished) {
    sceneRef.add.text(
      450,
      10,
      "FIM DE JOGO",
      { fontSize: "20px", fill: "#f87171" }
    );
  }
}

function drawBoard() {
  const startX = 40;
  const y = 200;
  const space = 25;

  for (let i = 0; i < 40; i++) {
    sceneRef.add.rectangle(
      startX + i * space,
      y,
      22,
      22,
      0x2d2d2d
    ).setStrokeStyle(1, 0xffffff);
  }
}

function drawPawns() {
  const startX = 40;
  const y = 200;
  const space = 25;

  gameState.players.forEach((player, pi) => {
    if (player.eliminated) return;

    player.pawns.forEach(pawn => {
      if (!pawn.alive) return;

      const x = startX + pawn.position * space;
      const yOff = y - 30 - pi * 18;

      const circle = sceneRef.add.circle(
        x,
        yOff,
        9,
        pawnColor(pawn)
      );

      // interação só no turno correto
      if (
        gameState.players[gameState.currentTurn].id ===
        player.id
      ) {
        circle.setStrokeStyle(2, 0xffffff);
        circle.setInteractive({ useHandCursor: true });

        circle.on("pointerdown", () => {
          socket.emit("playTurn", {
            roomId,
            pawnId: pawn.id
          });
        });
      }

      if (pawn.revealed) {
        sceneRef.add.text(
          x - 4,
          yOff - 20,
          "!",
          { fontSize: "14px", fill: "#ff0000" }
        );
      }

      if (pawn.jailed) {
        sceneRef.add.rectangle(
          x,
          yOff,
          20,
          20,
          0x000000,
          0.5
        );
      }
    });
  });
}

window.join = join;
