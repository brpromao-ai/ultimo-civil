const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const { rooms, joinRoom } = require("./rooms");
const logic = require("./gameLogic");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

/* ======================
   SERVE O FRONTEND
====================== */

app.use(express.static("../client"));

/* ======================
   SOCKET.IO
====================== */

io.on("connection", socket => {
  console.log("Jogador conectado:", socket.id);

  /* ===== ENTRAR NA SALA ===== */
  socket.on("joinRoom", roomId => {
    if (!roomId) return;

    const ok = joinRoom(roomId, socket.id);
    if (!ok) {
      socket.emit("roomFull");
      return;
    }

    socket.join(roomId);
    console.log(`Jogador ${socket.id} entrou na sala ${roomId}`);

    // Inicia o jogo quando 3 jogadores entrarem
    if (rooms[roomId].players.length === 3) {
      rooms[roomId].started = true;
      rooms[roomId].gameState =
        logic.createInitialGameState(rooms[roomId].players);

      io.to(roomId).emit(
        "stateUpdate",
        rooms[roomId].gameState
      );
    }
  });

  /* ===== JOGAR TURNO ===== */
  socket.on("playTurn", ({ roomId, pawnId }) => {
    const room = rooms[roomId];
    if (!room || !room.started) return;

    const state = room.gameState;
    if (state.finished) return;

    const player = state.players[state.currentTurn];
    if (player.id !== socket.id) return;

    const pawn = player.pawns.find(p => p.id === pawnId);
    if (!pawn) return;

    // Se estiver preso ou perder turno
    if (pawn.jailed || pawn.skipTurn) {
      pawn.skipTurn = false;
      logic.nextTurn(state);
      io.to(roomId).emit("stateUpdate", state);
      return;
    }

    /* ===== ROLAGEM DE DADO ===== */
    const dice = logic.rollDice();
    logic.movePawn(pawn, dice);

    /* ===== ENCONTROS ===== */
    const sameCell = [];

    state.players.forEach(pl =>
      pl.pawns.forEach(p => {
        if (
          p.alive &&
          !p.finished &&
          p.position === pawn.position
        ) {
          sameCell.push(p);
        }
      })
    );

    if (sameCell.length > 1) {
      logic.resolveEncounters(sameCell, player);
    }

    /* ===== LIMPEZA / SUBSTITUIÇÃO ===== */
    logic.cleanup(state);

    /* ===== REGRA O ÚLTIMO CIVIL ===== */
    logic.checkLastCivilRule(state);

    /* ===== PRÓXIMO TURNO ===== */
    logic.nextTurn(state);

    io.to(roomId).emit("stateUpdate", state);
  });

  /* ===== DESCONECTAR ===== */
  socket.on("disconnect", () => {
    console.log("Jogador desconectado:", socket.id);
  });
});

/* ======================
   INICIAR SERVIDOR
====================== */

server.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});
