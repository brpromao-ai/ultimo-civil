const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const { rooms, joinRoom } = require("./rooms");
const logic = require("./gameLogic");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("../client"));

io.on("connection", socket => {
  console.log("Conectado:", socket.id);

  socket.on("joinRoom", roomId => {
    if (!roomId) return;

    const ok = joinRoom(roomId, socket.id);
    if (!ok) {
      socket.emit("roomFull");
      return;
    }

    socket.join(roomId);

    const room = rooms[roomId];

    // feedback de espera
    io.to(roomId).emit(
      "waitingPlayers",
      room.players.length
    );

    // inicia jogo com 3 jogadores
    if (room.players.length === 3) {
      room.started = true;
      room.gameState =
        logic.createInitialGameState(room.players);

      io.to(roomId).emit(
        "stateUpdate",
        room.gameState
      );
    }
  });

  socket.on("playTurn", ({ roomId, pawnId }) => {
    const room = rooms[roomId];
    if (!room || !room.started) return;

    const state = room.gameState;
    if (state.finished) return;

    const player = state.players[state.currentTurn];
    if (player.id !== socket.id) return;

    const pawn = player.pawns.find(p => p.id === pawnId);
    if (!pawn) return;

    if (pawn.jailed || pawn.skipTurn) {
      pawn.skipTurn = false;
      logic.nextTurn(state);
      io.to(roomId).emit("stateUpdate", state);
      return;
    }

    const dice = logic.rollDice();
    logic.movePawn(pawn, dice);

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

    logic.cleanup(state);
    logic.checkLastCivilRule(state);
    logic.nextTurn(state);

    io.to(roomId).emit("stateUpdate", state);
  });

  socket.on("disconnect", () => {
    console.log("Desconectado:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});

