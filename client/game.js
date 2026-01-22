const socket = io();

let gameState = null;
let roomId = null;
let phaserGame = null;
let sceneRef = null;

/* ======================
   CONEXÃO / SALA
====================== */

function join() {
  roomId = document.getElementById("room").value;
  if (!roomId) {
    alert("Digite o código da sala");
    return;
  }
  socket.emit("joinRoom", roomId);
}

socket.on("stateUpdate", state => {
  gameState = state;

  if (!phaserGame) {
    startGame();
  } else {
    draw();
  }
});

/* ======================
   INICIALIZA PHASER
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
    case "Inocente":
      return 0xffffff;
    case "Policial":
      return 0x3b82f6;
    case "Assassino":
      return 0xef4444;
    case "Medico":
      return 0x22c55e;
    case "Detetive":
      return 0xfacc15;
    default:
      return 0xaaaaaa;
  }
}

/* ======================
   DESENHO PRINCIPAL
====================== */

function draw() {
  if (!sceneRef || !gameState) return;

  sceneRef.children.removeAll();

  drawHeader();
  drawBoard();
  drawPawns();
}

/* ======================
   CABEÇALHO / STATUS
====================== */

function drawHeader() {
  const currentPlayer =
    gameState.players[gameState.currentTurn];

  sceneRef.add.text(
    20,
    10,
    `Turno do jogador: ${currentPlayer.id.substring(0, 5)}`,
    { fontSize: "16px", fill: "#ffffff" }
  );

  if (gameState.finished) {
    sceneRef.add.text(
      400,
      10,
      "FIM DE JOGO",
      { fontSize: "20px", fill: "#f87171" }
    );
  }
}

/* ======================
   TABULEIRO (40 CASAS)
====================== */

function drawBoard() {
  const startX = 40;
  const y = 200;
  const spacing = 25;

  for (let i = 0; i < 40; i++) {
    sceneRef.add.rectangle(
      startX + i * spacing,
      y,
      22,
      22,
      0x2d2d2d
    ).setStrokeStyle(1, 0xffffff);
  }
}

/* ======================
   PEÕES / INTERAÇÃO
====================== */

function drawPawns() {
  const startX = 40;
  const y = 200;
  const spacing = 25;

  gameState.players.forEach((player, playerIndex) => {
    if (player.eliminated) return;

    player.pawns.forEach(pawn => {
      if (!pawn.alive) return;

      const x =
        startX + pawn.position * spacing;
      const yOffset = y - 30 - playerIndex * 18;

      const circle = sceneRef.add.circle(
        x,
        yOffset,
        9,
        pawnColor(pawn)
      );

      // Destaque se for o turno do jogador dono do peão
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

      // Indicadores visuais
      if (pawn.revealed) {
        sceneRef.add.text(
          x - 5,
          yOffset - 22,
          "!",
          { fontSize: "14px", fill: "#ff0000" }
        );
      }

      if (pawn.jailed) {
        sceneRef.add.rectangle(
          x,
          yOffset,
          20,
          20,
          0x000000,
          0.5
        );
      }
    });
  });
}

/* ======================
   EXPÕE join() PARA HTML
====================== */

window.join = join;

