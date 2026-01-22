const { MAX_PLAYERS } = require("./constants");

const rooms = {};

function createRoom(roomId) {
  rooms[roomId] = {
    players: [],
    currentTurn: 0,
    started: false,
    gameState: null
  };
}

function joinRoom(roomId, playerId) {
  if (!rooms[roomId]) createRoom(roomId);
  if (rooms[roomId].players.length >= MAX_PLAYERS) return false;

  rooms[roomId].players.push(playerId);
  return true;
}

module.exports = { rooms, createRoom, joinRoom };
