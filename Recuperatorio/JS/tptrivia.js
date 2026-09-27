const API_URL = 'https://opentdb.com/api.php?amount=10&category=11&difficulty=medium&type=boolean&encode=url3986';

const state = {
  questions: [],
  currentIndex: 0,
  playerScore: 0,
  computerScore: 0,
  answered: false,
  gameOver: false,
};

const els = {
  playerScore: document.getElementById('playerScore'),
  computerScore: document.getElementById('computerScore'),
  questionMeta: document.getElementById('questionMeta'),
  questionText: document.getElementById('questionText'),
  btnTrue: document.getElementById('btnTrue'),
  btnFalse: document.getElementById('btnFalse'),
  feedback: document.getElementById('feedback'),
  history: document.getElementById('history'),
};

document.getElementById('rulesLink').addEventListener('click', () => {
  document.getElementById('rulesBox').classList.toggle('show');
});

function decode(str) {
  return decodeURIComponent(str);
}

async function loadQuestions() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    if (data.response_code !== 0 || !data.results.length) {
      els.questionMeta.textContent = 'No se pudieron cargar las preguntas.';
      return;
    }

    state.questions = data.results.map(q => ({
      category: decode(q.category),
      question: decode(q.question),
      correctAnswer: decode(q.correct_answer),
    }));

    showQuestion();
  } catch (err) {
    els.questionMeta.textContent = 'Error al conectar con la API de trivia.';
  }
}

function updateScores() {
  els.playerScore.textContent = state.playerScore;
  els.computerScore.textContent = state.computerScore;
}

function addHistoryEntry(index, playerCorrect, computerCorrect) {
  const row = document.createElement('div');
  row.className = 'hist-row';
  const playerText = playerCorrect ? 'acierta' : 'falla';
  const computerText = computerCorrect ? 'acierta' : 'falla';
  row.innerHTML = `<span>Pregunta ${index + 1}</span><span>Vos ${playerText} - Computadora ${computerText}</span>`;
  els.history.prepend(row);
}

function showQuestion() {
  if (state.currentIndex >= state.questions.length) {
    endGame();
    return;
  }

  state.answered = false;
  const q = state.questions[state.currentIndex];
  els.questionMeta.textContent = `Pregunta ${state.currentIndex + 1} de ${state.questions.length} - Categoria: ${q.category}`;
  els.questionText.textContent = q.question;
  els.feedback.textContent = '';
  els.feedback.className = 'feedback';
  els.btnTrue.disabled = false;
  els.btnFalse.disabled = false;
}

function computerAnswer(correctAnswer) {
  const willBeCorrect = Math.random() < 0.7;
  return willBeCorrect ? correctAnswer : (correctAnswer === 'True' ? 'False' : 'True');
}

function handleAnswer(playerAnswer) {
  if (state.answered || state.gameOver) return;
  state.answered = true;
  els.btnTrue.disabled = true;
  els.btnFalse.disabled = true;

  const q = state.questions[state.currentIndex];
  const playerCorrect = playerAnswer === q.correctAnswer;
  const compAnswer = computerAnswer(q.correctAnswer);
  const computerCorrect = compAnswer === q.correctAnswer;

  if (playerCorrect) state.playerScore++;
  if (computerCorrect) state.computerScore++;
  updateScores();

  els.feedback.textContent = playerCorrect
    ? `Correcto! La respuesta era ${q.correctAnswer}.`
    : `Incorrecto. La respuesta era ${q.correctAnswer}.`;
  els.feedback.className = 'feedback ' + (playerCorrect ? 'ok' : 'fail');

  addHistoryEntry(state.currentIndex, playerCorrect, computerCorrect);

  state.currentIndex++;
  setTimeout(showQuestion, 1600);
}

function endGame() {
  state.gameOver = true;
  els.btnTrue.disabled = true;
  els.btnFalse.disabled = true;

  let resultText;
  if (state.playerScore > state.computerScore) resultText = `Ganaste vos con ${state.playerScore} aciertos.`;
  else if (state.computerScore > state.playerScore) resultText = `Gano la computadora con ${state.computerScore} aciertos.`;
  else resultText = `Empate con ${state.playerScore} aciertos cada uno.`;

  els.questionMeta.textContent = 'Juego terminado';
  els.questionText.textContent = resultText;
  els.feedback.textContent = '';
}

els.btnTrue.addEventListener('click', () => handleAnswer('True'));
els.btnFalse.addEventListener('click', () => handleAnswer('False'));

updateScores();
loadQuestions();