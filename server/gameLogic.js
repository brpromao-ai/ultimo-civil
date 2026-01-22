const { BOARD_SIZE, CLASSES } = require("./constants");

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function createPawn(id, pawnClass) {
  return {
    id,
    class: pawnClass,
    position: 1,
    alive: true,
    jailed: false,
    revealed: false,
    finished: false,
    usedAbility: false,
    skipTurn: false
  };
}

function createInitialGameState(players) {
  return {
    players: players.map((id, i) => ({
      id,
      pawns: [
        createPawn("I" + i, CLASSES.INOCENTE),
        createPawn("P" + i, CLASSES.POLICIAL),
        createPawn("A" + i, CLASSES.ASSASSINO)
      ],
      reserve: [
        createPawn("M" + i, CLASSES.MEDICO),
        createPawn("D" + i, CLASSES.DETETIVE),
        createPawn("I2" + i, CLASSES.INOCENTE)
      ],
      dead: [],
      score: 0,
      eliminated: false
    })),
    currentTurn: 0,
    finished: false,
    log: []
  };
}

function movePawn(pawn, value) {
  pawn.position += value;
  if (pawn.position >= BOARD_SIZE) {
    pawn.finished = true;
    pawn.position = BOARD_SIZE;
  }
}

function resolveEncounters(pawns, owner) {
  const order = [
    CLASSES.DETETIVE,
    CLASSES.MEDICO,
    CLASSES.POLICIAL,
    CLASSES.ASSASSINO
  ];

  order.forEach(type => {
    const actor = pawns.find(
      p => p.class === type && p.alive && !p.jailed && !p.revealed
    );
    if (!actor) return;

    const targets = pawns.filter(
      p => p !== actor && p.alive && !p.jailed
    );
    if (!targets.length) return;

    const target = targets[0];

    if (type === CLASSES.DETETIVE) {
      target.revealed = true;
    }

    if (type === CLASSES.MEDICO && !actor.usedAbility) {
      const deadInnocent = owner.dead.find(
        p => p.class === CLASSES.INOCENTE
      );
      if (deadInnocent) {
        deadInnocent.alive = true;
        deadInnocent.position = 1;
        owner.pawns.push(deadInnocent);
        owner.dead = owner.dead.filter(p => p !== deadInnocent);
        actor.usedAbility = true;
      }
    }

    if (type === CLASSES.POLICIAL) {
      if (target.class !== CLASSES.POLICIAL) {
        target.jailed = true;
      }
    }

    if (type === CLASSES.ASSASSINO) {
      target.alive = false;
      actor.revealed = true;
      actor.skipTurn = true;
    }
  });
}

function cleanup(state) {
  state.players.forEach(player => {
    player.pawns = player.pawns.filter(p => {
      if (!p.alive) {
        player.dead.push(p);
        return false;
      }
      return true;
    });

    player.pawns = player.pawns.filter(p => {
      if (p.finished) {
        if (p.class === CLASSES.INOCENTE) player.score++;
        if (player.reserve.length) {
          player.pawns.push(player.reserve.shift());
        }
        return false;
      }
      return true;
    });

    const hasInnocent = player.pawns.some(
      p => p.class === CLASSES.INOCENTE && p.alive
    );
    const hasMedic = player.pawns.some(
      p => p.class === CLASSES.MEDICO && p.alive
    );

    if (!hasInnocent && !hasMedic) {
      player.eliminated = true;
      player.pawns = [];
    }
  });
}

function nextTurn(state) {
  do {
    state.currentTurn =
      (state.currentTurn + 1) % state.players.length;
  } while (state.players[state.currentTurn].eliminated);
}

function checkLastCivilRule(state) {
  const active = state.players.filter(
    p => !p.eliminated
  );
  if (active.length === 1) {
    active[0].pawns = [];
    state.finished = true;
  }
}

module.exports = {
  rollDice,
  createInitialGameState,
  movePawn,
  resolveEncounters,
  cleanup,
  nextTurn,
  checkLastCivilRule
};
