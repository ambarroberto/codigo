const state = {
  playerScore: 0,
  computerScore: 0,
  currentPlayer: 'player',
  diceAvailable: 6,
  currentRoll: [],
  keptThisRoll: [],
  turnScore: 0,
  selected: [],
  gameOver: false,
  turnNumber: 0,
};

const els = {
  playerScore: document.getElementById('playerScore'),
  computerScore: document.getElementById('computerScore'),
  cardPlayer: document.getElementById('cardPlayer'),
  cardComputer: document.getElementById('cardComputer'),
  turnLabel: document.getElementById('turnLabel'),
  turnScoreLabel: document.getElementById('turnScoreLabel'),
  diceRow: document.getElementById('diceRow'),
  msg: document.getElementById('msg'),
  btnRoll: document.getElementById('btnRoll'),
  btnBank: document.getElementById('btnBank'),
  history: document.getElementById('history'),
};

function addHistoryEntry(player, type, points, totalAfter) {
  const row = document.createElement('div');
  row.className = 'hist-row ' + (type === 'farkle' ? 'farkle' : 'bank');
  const who = player === 'player' ? 'Vos' : 'Computadora';
  const text = type === 'farkle'
    ? `Turno ${state.turnNumber} - ${who}: Farkle, pierde ${points}`
    : `Turno ${state.turnNumber} - ${who}: se planta con +${points}`;
  row.innerHTML = `<span class="who">${text}</span><span>Total: ${totalAfter}</span>`;
  els.history.appendChild(row);
  els.history.scrollTop = els.history.scrollHeight;
}

document.getElementById('rulesLink').addEventListener('click', () => {
  document.getElementById('rulesBox').classList.toggle('show');
});

function rollDice(n) {
  const r = [];
  for (let i = 0; i < n; i++) r.push(1 + Math.floor(Math.random() * 6));
  return r;
}
function pipPositions(value) {
  const positions = {
    1: [[2,2]],
    2: [[1,1],[3,3]],
    3: [[1,1],[2,2],[3,3]],
    4: [[1,1],[1,3],[3,1],[3,3]],
    5: [[1,1],[1,3],[2,2],[3,1],[3,3]],
    6: [[1,1],[1,3],[2,1],[2,3],[3,1],[3,3]],
  };
  return positions[value] || [];
}

// Evalua si un conjunto de valores (subset) forma una combinacion valida y su puntaje.
// Devuelve {valid, score}. Debe consumir TODOS los dados del subset.
function scoreSubset(values) {
  const counts = [0,0,0,0,0,0,0];
  values.forEach(v => counts[v]++);
  const n = values.length;

  if (n === 6) {
    if (counts.slice(1).every(c => c === 1)) return { valid: true, score: 1500 };
    const pairCount = counts.slice(1).filter(c => c === 2).length;
    if (pairCount === 3) return { valid: true, score: 750 };
  }

  let score = 0;
  const c = counts.slice();
  for (let v = 1; v <= 6; v++) {
    if (c[v] >= 3) {
      const base = v === 1 ? 1000 : v * 100;
      const extra = c[v] - 3;
      score += base * Math.pow(2, extra);
      c[v] = 0;
    }
  }
  score += c[1] * 100; c[1] = 0;
  score += c[5] * 50; c[5] = 0;

  const leftover = c[2] + c[3] + c[4] + c[6];
  if (leftover > 0) return { valid: false, score: 0 };
  return { valid: true, score };
}

// Chequea si UNA tirada completa tiene al menos alguna combinacion que puntue (para detectar Farkle)
function hasAnyScore(values) {
  if (values.includes(1) || values.includes(5)) return true;
  const counts = [0,0,0,0,0,0,0];
  values.forEach(v => counts[v]++);
  if (counts.some(c => c >= 3)) return true;
  if (values.length === 6) {
    if (counts.slice(1).every(c => c === 1)) return true;
    if (counts.slice(1).filter(c => c === 2).length === 3) return true;
  }
  return false;
}

// Seleccion automatica optima simple para la computadora: toma todos los dados que puntuan.
function autoSelectAll(values) {
  const counts = [0,0,0,0,0,0,0];
  values.forEach(v => counts[v]++);

  if (values.length === 6) {
    if (counts.slice(1).every(c => c === 1)) return values.map((_, i) => i);
    if (counts.slice(1).filter(c => c === 2).length === 3) return values.map((_, i) => i);
  }

  const takeIdx = [];
  const c = counts.slice();
  for (let v = 1; v <= 6; v++) {
    if (c[v] >= 3) {
      let toTake = c[v];
      values.forEach((val, i) => { if (val === v && toTake > 0) { takeIdx.push(i); toTake--; } });
      c[v] = 0;
    }
  }
  values.forEach((val, i) => {
    if ((val === 1 || val === 5) && !takeIdx.includes(i)) takeIdx.push(i);
  });
  return takeIdx;
}

function updateScoreCards() {
  els.playerScore.textContent = state.playerScore;
  els.computerScore.textContent = state.computerScore;
  els.cardPlayer.classList.toggle('active', state.currentPlayer === 'player');
  els.cardComputer.classList.toggle('active', state.currentPlayer === 'computer');
}

function renderDice() {
  els.diceRow.innerHTML = '';
  state.currentRoll.forEach((val, i) => {
       const d = document.createElement('div');
    d.className = 'die';
    pipPositions(val).forEach(([row, col]) => {
      const pip = document.createElement('span');
      pip.className = 'pip';
      pip.style.gridRow = row;
      pip.style.gridColumn = col;
      d.appendChild(pip);
    });
    if (state.selected.includes(i)) d.classList.add('selected');
    if (state.currentPlayer === 'player' && !state.gameOver) {
      d.addEventListener('click', () => toggleSelect(i));
    } else {
      d.classList.add('locked');
    }
    els.diceRow.appendChild(d);
  });
}

function toggleSelect(i) {
  const idx = state.selected.indexOf(i);
  if (idx >= 0) state.selected.splice(idx, 1);
  else state.selected.push(i);
  renderDice();
  updateButtonsForSelection();
}

function updateButtonsForSelection() {
  if (state.selected.length === 0) {
    els.msg.textContent = 'Elegí uno o más dados que puntúen para apartarlos.';
    els.msg.className = 'msg';
    els.btnRoll.disabled = true;
    els.btnBank.disabled = true;
    return;
  }
  const values = state.selected.map(i => state.currentRoll[i]);
  const result = scoreSubset(values);
  if (!result.valid) {
    els.msg.textContent = 'Esa combinación no puntúa. Elegí otra selección.';
    els.msg.className = 'msg farkle';
    els.btnRoll.disabled = true;
    els.btnBank.disabled = true;
  } else {
    els.msg.textContent = `Esa selección suma ${result.score} puntos. Confirmá tirando de nuevo o plantándote.`;
    els.msg.className = 'msg';
    els.btnRoll.disabled = false;
    els.btnBank.disabled = false;
  }
}

function confirmSelection() {
  const values = state.selected.map(i => state.currentRoll[i]);
  const result = scoreSubset(values);
  state.turnScore += result.score;
  state.diceAvailable -= state.selected.length;
  if (state.diceAvailable === 0) state.diceAvailable = 6; // hot dice
  state.selected = [];
  state.currentRoll = [];
  els.turnScoreLabel.textContent = state.turnScore;
}

function startTurnUI(player) {
  state.turnNumber++;
  state.currentPlayer = player;
  state.diceAvailable = 6;
  state.turnScore = 0;
  state.currentRoll = [];
  state.selected = [];
  els.turnScoreLabel.textContent = 0;
  els.turnLabel.textContent = player === 'player' ? 'Vos' : 'Computadora';
  updateScoreCards();
  els.btnBank.disabled = true;
  els.btnRoll.disabled = false;
  els.diceRow.innerHTML = '';
  if (player === 'player') {
    els.msg.textContent = 'Presioná "Tirar dados" para empezar tu turno.';
    els.msg.className = 'msg';
  } else {
    els.msg.textContent = 'Turno de la computadora...';
    els.msg.className = 'msg';
    els.btnRoll.disabled = true;
    setTimeout(computerTurnStep, 700);
  }
}

function endTurnFarkle(player) {
  els.msg.textContent = '¡Farkle! Se perdieron los puntos de este turno.';
  els.msg.className = 'msg farkle';
  els.btnRoll.disabled = true;
  els.btnBank.disabled = true;
  const totalAfter = player === 'player' ? state.playerScore : state.computerScore;
  addHistoryEntry(player, 'farkle', state.turnScore, totalAfter);
  setTimeout(() => {
    checkWinOrNext(player === 'player' ? 'computer' : 'player');
  }, 1400);
}

function bankAndEndTurn(player) {
  if (player === 'player') state.playerScore += state.turnScore;
  else state.computerScore += state.turnScore;
  updateScoreCards();
  const totalAfter = player === 'player' ? state.playerScore : state.computerScore;
  addHistoryEntry(player, 'bank', state.turnScore, totalAfter);
  checkWinOrNext(player === 'player' ? 'computer' : 'player');
}

function checkWinOrNext(nextPlayer) {
  if (state.playerScore >= 10000 || state.computerScore >= 10000) {
    state.gameOver = true;
    const winner = state.playerScore >= 10000 ? 'Vos ganaste' : 'Ganó la computadora';
    els.msg.textContent = `${winner} con ${state.playerScore >= 10000 ? state.playerScore : state.computerScore} puntos.`;
    els.msg.className = 'msg win';
    els.btnRoll.disabled = true;
    els.btnBank.disabled = true;
    els.diceRow.innerHTML = '';
    return;
  }
  startTurnUI(nextPlayer);
}

// --- Turno del jugador ---
els.btnRoll.addEventListener('click', () => {
  if (state.selected.length > 0) confirmSelection();
  const roll = rollDice(state.diceAvailable);
  state.currentRoll = roll;
  state.selected = [];
  renderDice();
  els.btnBank.disabled = true;
  els.btnRoll.disabled = true;

  if (!hasAnyScore(roll)) {
    endTurnFarkle('player');
    return;
  }
  els.msg.textContent = 'Elegí uno o más dados que puntúen para apartarlos.';
  els.msg.className = 'msg';
});

els.btnBank.addEventListener('click', () => {
  if (state.selected.length > 0) confirmSelection();
  bankAndEndTurn('player');
});

// --- Turno de la computadora (regla simple: sigue si acumulado < 300) ---
function computerTurnStep() {
  const roll = rollDice(state.diceAvailable);
  state.currentRoll = roll;
  renderDice();

  if (!hasAnyScore(roll)) {
    endTurnFarkle('computer');
    return;
  }

  const takeIdx = autoSelectAll(roll);
  state.selected = takeIdx;
  renderDice();
  const values = takeIdx.map(i => roll[i]);
  const result = scoreSubset(values);

  setTimeout(() => {
    state.turnScore += result.score;
    state.diceAvailable -= takeIdx.length;
    if (state.diceAvailable === 0) state.diceAvailable = 6;
    els.turnScoreLabel.textContent = state.turnScore;
    state.selected = [];
    state.currentRoll = [];
    renderDice();

    const shouldContinue = state.turnScore < 300 && state.diceAvailable > 0;
    if (shouldContinue) {
      els.msg.textContent = `Computadora suma ${result.score}, sigue tirando...`;
      setTimeout(computerTurnStep, 900);
    } else {
      els.msg.textContent = `Computadora suma ${result.score} y se planta.`;
      setTimeout(() => bankAndEndTurn('computer'), 900);
    }
  }, 700);
}

// Inicio
updateScoreCards();