const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const state = {
  chips: 100,
  bet: 0,
  deck: [],
  playerHand: [],
  dealerHand: [],
  dealerHiddenCard: null,
  phase: 'betting', // betting | playing | done
  handNumber: 0,
};

const els = {
  chipsValue: document.getElementById('chipsValue'),
  betValue: document.getElementById('betValue'),
  dealerHand: document.getElementById('dealerHand'),
  dealerTotal: document.getElementById('dealerTotal'),
  playerHand: document.getElementById('playerHand'),
  playerTotal: document.getElementById('playerTotal'),
  aceHint: document.getElementById('aceHint'),
  msg: document.getElementById('msg'),
  betRow: document.getElementById('betRow'),
  betInput: document.getElementById('betInput'),
  btnApostar: document.getElementById('btnApostar'),
  playActions: document.getElementById('playActions'),
  btnHit: document.getElementById('btnHit'),
  btnStand: document.getElementById('btnStand'),
  history: document.getElementById('history'),
};

function buildDeck() {
  const deck = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({ rank, suit, aceValue: rank === 'A' ? 11 : null });
    });
  });
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function drawCard() {
  if (state.deck.length === 0) state.deck = buildDeck();
  return state.deck.pop();
}

function baseCardValue(card) {
  if (card.rank === 'A') return 11;
  if (['10', 'J', 'Q', 'K'].includes(card.rank)) return 10;
  return parseInt(card.rank, 10);
}

// Total usando el valor de As que el jugador eligio manualmente para cada carta
function manualTotal(hand) {
  return hand.reduce((sum, c) => sum + (c.rank === 'A' ? c.aceValue : baseCardValue(c)), 0);
}

// Total minimo posible (todos los ases valiendo 1), para detectar un pasarse inevitable
function minTotal(hand) {
  return hand.reduce((sum, c) => sum + (c.rank === 'A' ? 1 : baseCardValue(c)), 0);
}

// Total automatico "optimo" que usa el dealer: ases en 11 salvo que eso pase de 21
function autoTotal(hand) {
  let total = hand.reduce((sum, c) => sum + baseCardValue(c), 0);
  let aces = hand.filter(c => c.rank === 'A').length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function isRed(card) { return card.suit === '♥' || card.suit === '♦'; }

function renderCard(card, { hidden = false, interactive = false } = {}) {
  const div = document.createElement('div');
  div.className = 'card' + (hidden ? ' hidden' : '') + (isRed(card) && !hidden ? ' red' : !hidden ? ' black' : '');
  if (hidden) return div;

  const isAce = card.rank === 'A';
  div.classList.toggle('ace', isAce && interactive);
  const label = isAce ? `A(${card.aceValue})` : card.rank;
  div.innerHTML = `<span class="rank-top">${label}</span><span class="suit">${card.suit}</span><span class="rank-bottom">${label}</span>`;

  if (isAce && interactive) {
    div.addEventListener('click', () => {
      card.aceValue = card.aceValue === 11 ? 1 : 11;
      renderHands();
    });
  }
  return div;
}

function renderHands() {
  els.playerHand.innerHTML = '';
  state.playerHand.forEach(card => els.playerHand.appendChild(renderCard(card, { interactive: state.phase === 'playing' })));
  els.playerTotal.textContent = manualTotal(state.playerHand);

  els.dealerHand.innerHTML = '';
  state.dealerHand.forEach((card, i) => {
    const hidden = state.phase === 'playing' && i === 1;
    els.dealerHand.appendChild(renderCard(card, { hidden }));
  });
  els.dealerTotal.textContent = state.phase === 'playing' ? '?' : autoTotal(state.dealerHand);

  const hasAce = state.playerHand.some(c => c.rank === 'A');
  els.aceHint.style.display = (hasAce && state.phase === 'playing') ? 'block' : 'none';

  els.chipsValue.textContent = state.chips;
  els.betValue.textContent = state.bet;
}

function addHistoryEntry(text, chipsAfter) {
  const row = document.createElement('div');
  row.className = 'hist-row';
  row.innerHTML = `<span class="who">Mano ${state.handNumber}: ${text}</span><span>Fichas: ${chipsAfter}</span>`;
  els.history.appendChild(row);
  els.history.scrollTop = els.history.scrollHeight;
}

function startBettingPhase() {
  state.phase = 'betting';
  state.playerHand = [];
  state.dealerHand = [];
  state.bet = 0;
  els.playerTotal.textContent = '-';
  els.dealerTotal.textContent = '-';
  els.playerHand.innerHTML = '';
  els.dealerHand.innerHTML = '';
  els.aceHint.style.display = 'none';
  els.betRow.style.display = 'flex';
  els.playActions.style.display = 'none';
  els.betInput.max = state.chips;
  els.betInput.value = Math.min(parseInt(els.betInput.value, 10) || 10, state.chips);

  if (state.chips <= 0) {
    els.msg.textContent = 'Te quedaste sin fichas.';
    els.betRow.innerHTML = '<button class="primary" id="btnReset" style="flex:1;">Reiniciar fichas (100)</button>';
    document.getElementById('btnReset').addEventListener('click', () => {
      state.chips = 100;
      startBettingPhase();
    });
  } else {
    els.msg.textContent = 'Ingresá tu apuesta para empezar la mano.';
  }
  els.chipsValue.textContent = state.chips;
  els.betValue.textContent = 0;
}

function startHand() {
  const bet = parseInt(els.betInput.value, 10);
  if (!bet || bet < 1 || bet > state.chips) {
    els.msg.textContent = 'Ingresá una apuesta válida (entre 1 y tus fichas disponibles).';
    return;
  }
  state.bet = bet;
  state.chips -= bet;
  state.handNumber++;
  state.deck = buildDeck();
  state.playerHand = [drawCard(), drawCard()];
  state.dealerHand = [drawCard(), drawCard()];
  state.phase = 'playing';

  els.betRow.style.display = 'none';
  els.playActions.style.display = 'flex';
  els.msg.textContent = 'Pedí carta o plantate.';
  renderHands();
}

function endHand(resultText, chipsDelta) {
  state.chips += chipsDelta;
  state.phase = 'done';
  renderHands();
  addHistoryEntry(resultText, state.chips);
  els.playActions.style.display = 'none';
  setTimeout(startBettingPhase, 1800);
}

function dealerPlay() {
  els.msg.textContent = 'El dealer juega...';
  const step = () => {
    if (autoTotal(state.dealerHand) < 17) {
      state.dealerHand.push(drawCard());
      renderHands();
      setTimeout(step, 700);
    } else {
      resolveHand();
    }
  };
  setTimeout(step, 700);
}

function resolveHand() {
  const player = manualTotal(state.playerHand);
  const dealer = autoTotal(state.dealerHand);

  if (player > 21) {
    els.msg.textContent = `Te pasaste con ${player}. Perdiste tu apuesta.`;
    endHand(`Te pasaste (${player}) - perdiste ${state.bet}`, 0);
    return;
  }
  if (dealer > 21) {
    els.msg.textContent = `El dealer se pasó con ${dealer}. ¡Ganaste!`;
    endHand(`Ganaste, dealer se pasó (${dealer})`, state.bet * 2);
    return;
  }
  if (player > dealer) {
    els.msg.textContent = `Vos ${player}, dealer ${dealer}. ¡Ganaste!`;
    endHand(`Ganaste ${player} vs ${dealer}`, state.bet * 2);
  } else if (player < dealer) {
    els.msg.textContent = `Vos ${player}, dealer ${dealer}. Perdiste.`;
    endHand(`Perdiste ${player} vs ${dealer}`, 0);
  } else {
    els.msg.textContent = `Empate en ${player}. Se devuelve tu apuesta.`;
    endHand(`Empate en ${player}`, state.bet);
  }
}

els.btnApostar.addEventListener('click', startHand);

els.btnHit.addEventListener('click', () => {
  state.playerHand.push(drawCard());
  renderHands();
  if (minTotal(state.playerHand) > 21) {
    els.msg.textContent = 'Te pasaste, no hay forma de salvar la mano.';
    state.phase = 'playing'; // se revela todo en resolveHand via endHand
    resolveHandForcedBust();
  } else {
    els.msg.textContent = 'Pedí otra carta o plantate.';
  }
});

function resolveHandForcedBust() {
  state.phase = 'done';
  renderHands();
  const total = manualTotal(state.playerHand);
  addHistoryEntry(`Te pasaste (${total}) - perdiste ${state.bet}`, state.chips);
  els.playActions.style.display = 'none';
  setTimeout(startBettingPhase, 1800);
}

els.btnStand.addEventListener('click', () => {
  state.phase = 'dealer';
  renderHands();
  dealerPlay();
});

// Inicio
startBettingPhase();