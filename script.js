(() => {
  'use strict';

  const ACTIVE_KEY = 'terra-media.active.v1';
  const BEST_KEY = 'terra-media.best.v1';
  const LEVELS = {
    facil: { title: 'Fácil', blurb: 'Personagens, lugares e a grande aventura.' },
    medio: { title: 'Médio', blurb: 'Encontros, objetos e acontecimentos.' },
    dificil: { title: 'Difícil', blurb: 'Detalhes dos livros e eventos decisivos.' },
    insano: { title: 'Insano', blurb: 'Genealogias, histórias e pormenores.' }
  };
  const SAGAS = { todos: 'As duas obras', hobbit: 'O Hobbit', lotr: 'O Senhor dos Anéis' };
  const root = document.querySelector('#app');
  const bank = new Map(QUESTIONS.map(q => [q.id, q]));
  let scope = 'todos';
  let session = readJSON(ACTIVE_KEY);
  let best = readJSON(BEST_KEY) || {};
  let reviewOpen = false;

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* armazenamento indisponível */ }
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }
  function shuffle(input) {
    const arr = [...input];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function isValidSession(s) {
    return Boolean(s && LEVELS[s.level] && SAGAS[s.scope] && Array.isArray(s.ids)
      && s.ids.length > 0 && s.ids.length <= 20 && Number.isInteger(s.index)
      && s.index >= 0 && s.index <= s.ids.length && s.ids.every(id => bank.has(id)
      && bank.get(id).level === s.level && (s.scope === 'todos' || bank.get(id).saga === s.scope))
      && s.orders && typeof s.orders === 'object' && s.answers && typeof s.answers === 'object');
  }
  if (!isValidSession(session)) session = null;
  if (!best || typeof best !== 'object' || Array.isArray(best)) best = {};

  function footer() {
    return `<footer class="footer"><span>Inspirado nos livros de J. R. R. Tolkien.</span><span>Funciona offline · Progresso salvo neste navegador</span></footer>`;
  }
  function header() {
    return `<header class="topbar container">
      <span class="brand-icon" aria-hidden="true">✦</span>
      <span class="brand-name">TERRA<span class="brand-dash">—</span>MÉDIA</span>
      <span class="topbar-label">QUIZ <span class="hide-mobile">/ TOLKIEN</span></span>
    </header>`;
  }
  function render() {
    const main = session && (session.index < session.ids.length || session.index === session.ids.length)
      ? (screen === 'home' ? renderHome() : screen === 'result' || session.index === session.ids.length ? renderResult() : renderQuestion())
      : renderHome();
    root.innerHTML = header() + `<main class="container">${main}${footer()}</main>`;
    document.title = (screen === 'home' ? 'Terra-média — Quiz Tolkien' : `${LEVELS[session.level].title} — Quiz Terra-média`);
  }
  let screen = session ? (session.index === session.ids.length ? 'result' : 'quiz') : 'home';

  function getCurrentScore(s = session) {
    return s.ids.reduce((score, id) => score + (Number.isInteger(s.answers[id]) && s.answers[id] === bank.get(id).answer ? 1 : 0), 0);
  }
  function renderHome() {
    const active = session && session.index < session.ids.length;
    const resumed = active ? `<section class="resume" aria-label="Partida em andamento">
      <div><div class="eyebrow">SUA JORNADA CONTINUA</div>
      <div class="resume-title">${LEVELS[session.level].title} · ${escapeHTML(SAGAS[session.scope])}</div>
      <div class="resume-sub">Questão ${Math.min(session.index + 1, session.ids.length)} de ${session.ids.length} · ${getCurrentScore()} acerto(s) até agora</div></div>
      <button class="resume-btn" data-action="resume">Retomar →</button>
    </section>` : '';
    const levels = Object.entries(LEVELS).map(([id, level], i) => {
      const count = QUESTIONS.filter(q => q.level === id && (scope === 'todos' || q.saga === scope)).length;
      const record = best[`${id}:${scope}`];
      const bestText = Number.isInteger(record) ? `Recorde ${record}/${count}` : 'Não jogado';
      return `<button class="level-card" data-level="${id}" aria-label="Jogar no nível ${level.title}, ${count} questões">
        <div class="level-card-top"><span class="level-index">NÍVEL 0${i + 1}</span><span class="level-arrow" aria-hidden="true">↗</span></div>
        <h3>${level.title}</h3><p>${level.blurb}</p>
        <div class="level-bottom"><span>${count} perguntas</span><span class="${Number.isInteger(record) ? 'level-best' : ''}">${bestText}</span></div>
      </button>`;
    }).join('');
    return `<section class="hero"><div class="hero-inner">
      <div class="eyebrow">UM DESAFIO NA TERRA-MÉDIA</div>
      <h1>Até onde vai seu <em>conhecimento?</em></h1>
      <p>De Bolsão a Mordor. Teste o que sabe sobre <strong>O Hobbit</strong> e <strong>O Senhor dos Anéis</strong>, dos fatos mais conhecidos aos detalhes que só os leitores atentos recordam.</p>
      <div class="stat-line"><span><i class="stat-dot"></i>80 perguntas originais</span><span><i class="stat-dot"></i>4 dificuldades</span><span><i class="stat-dot"></i>Sem cronômetro</span></div>
    </div></section>
    ${resumed}
    <section aria-label="Escolha sua partida">
      <div class="section-label"><h2>Escolha seu desafio</h2><span>Selecione uma obra</span></div>
      <div class="filterbar" role="group" aria-label="Filtrar obra">
        ${Object.entries(SAGAS).map(([key, label]) => `<button class="filter ${scope === key ? 'is-active' : ''}" data-scope="${key}" aria-pressed="${scope === key}">${escapeHTML(label)}</button>`).join('')}
      </div>
      <div class="level-grid">${levels}</div>
    </section>`;
  }
  function renderQuestion() {
    const q = bank.get(session.ids[session.index]);
    const chosen = session.answers[q.id];
    const answered = Number.isInteger(chosen);
    const order = session.orders[q.id];
    const score = getCurrentScore();
    const choices = order.map((originalIndex, displayIndex) => {
      const correct = q.answer === originalIndex;
      const pickedWrong = answered && chosen === originalIndex && !correct;
      const mark = answered && correct ? ' is-correct' : pickedWrong ? ' is-wrong' : '';
      const icon = answered && correct ? '<span class="choice-icon" aria-hidden="true">✓</span>' : pickedWrong ? '<span class="choice-icon" aria-hidden="true">×</span>' : '';
      return `<button class="choice${mark}" data-answer="${originalIndex}" ${answered ? 'disabled' : ''} ${answered && correct ? 'aria-label="Resposta correta: ' + escapeHTML(q.options[originalIndex]) + '"' : ''}>
        <span class="choice-key" aria-hidden="true">${'ABCD'[displayIndex]}</span>
        <span class="choice-text">${escapeHTML(q.options[originalIndex])}</span>${icon}</button>`;
    }).join('');
    const correct = chosen === q.answer;
    const feedback = answered ? `<section class="feedback" aria-live="polite">
      <div class="feedback-head ${correct ? '' : 'bad'}">${correct ? 'Resposta correta.' : 'Não foi desta vez.'}</div>
      <p>${escapeHTML(q.explanation)}</p>
      <button class="primary-btn" data-action="next">${session.index === session.ids.length - 1 ? 'Ver meu resultado' : 'Próxima pergunta'} <span aria-hidden="true">→</span></button>
    </section>` : '';
    return `<div class="quiz-shell">
      <button class="back-link" data-action="home"><span aria-hidden="true">←</span> Voltar aos níveis</button>
      <div class="progress-head"><strong>Questão ${session.index + 1} <span>de ${session.ids.length}</span></strong><span>${score} acerto${score === 1 ? '' : 's'}</span></div>
      <div class="progress-track" role="progressbar" aria-label="Progresso do quiz" aria-valuemin="0" aria-valuemax="${session.ids.length}" aria-valuenow="${session.index + (answered ? 1 : 0)}"><div class="progress-fill" style="width:${((session.index + (answered ? 1 : 0)) / session.ids.length) * 100}%"></div></div>
      <article class="question-panel">
        <div class="question-meta"><span class="pill">${SAGAS[q.saga]}</span><span class="pill alt">${LEVELS[q.level].title}</span></div>
        <h2>${escapeHTML(q.question)}</h2>
        <div class="choices" role="group" aria-label="Alternativas">${choices}</div>
        ${feedback}
      </article>
      <div class="quiz-hint">${answered ? 'Use Enter para avançar.' : 'Dica: use as teclas 1, 2, 3 ou 4 para responder.'}</div>
    </div>`;
  }
  function renderResult() {
    if (!session) return renderHome();
    const score = getCurrentScore();
    const total = session.ids.length;
    const percent = Math.round(100 * score / total);
    const failures = session.ids.filter(id => session.answers[id] !== bank.get(id).answer);
    const slogan = percent === 100 ? 'Você conhece cada trilha.' : percent >= 80 ? 'Uma jornada memorável.' : percent >= 55 ? 'Você percorreu um bom caminho.' : 'Ainda há histórias por descobrir.';
    const subtitle = percent === 100 ? 'Resultado perfeito. Nem os arquivos de Valfenda guardariam surpresas para você.' : 'Confira as explicações e tente novamente para melhorar sua pontuação.';
    const reviews = session.ids.map((id, i) => ({ q: bank.get(id), index: i, chosen: session.answers[id] }))
      .filter(item => item.chosen !== item.q.answer).map(({q, index, chosen}) => `<section class="review-item">
        <div class="review-number">Questão ${index + 1} · ${escapeHTML(SAGAS[q.saga])}</div>
        <div class="review-question">${escapeHTML(q.question)}</div>
        <p class="review-line mine"><strong>Sua resposta:</strong> ${escapeHTML(q.options[chosen] ?? 'Sem resposta')}</p>
        <p class="review-line right"><strong>Resposta correta:</strong> ${escapeHTML(q.options[q.answer])}</p>
        <p class="review-explanation">${escapeHTML(q.explanation)}</p>
      </section>`).join('');
    return `<div class="result-shell">
      <button class="back-link" data-action="home"><span aria-hidden="true">←</span> Voltar aos níveis</button>
      <section class="result-panel" aria-label="Resultado final">
        <div class="eyebrow">JORNADA CONCLUÍDA · ${escapeHTML(LEVELS[session.level].title.toUpperCase())}</div>
        <h1>${slogan}</h1><p class="result-subtitle">${subtitle}</p>
        <div class="score-circle" style="--score: ${percent}%"><div class="score-inner"><span class="score-value">${percent}%</span><span class="score-small">aproveitamento</span></div></div>
        <div class="result-summary"><div><strong>${score}</strong><span>Acertos</span></div><div><strong>${total - score}</strong><span>Erros</span></div><div><strong>${total}</strong><span>Questões</span></div></div>
        <div class="result-actions"><button class="primary-btn" data-action="retry">Jogar novamente <span aria-hidden="true">↗</span></button><button class="secondary-btn" data-action="home">Escolher outro nível</button></div>
      </section>
      <section class="review-panel">
        <button class="review-toggle" aria-expanded="${reviewOpen}" data-action="review">Revisar meus erros (${failures.length}) <span aria-hidden="true">${reviewOpen ? '−' : '+'}</span></button>
        ${reviewOpen ? `<div class="review-body">${reviews || '<div class="empty-review">Nenhum erro. Você acertou todas as perguntas!</div>'}</div>` : ''}
      </section>
    </div>`;
  }
  function showHome() { screen = 'home'; reviewOpen = false; render(); window.scrollTo({ top: 0, behavior: 'auto' }); }
  function startGame(level, saga, force = false) {
    if (!LEVELS[level] || !SAGAS[saga]) return;
    if (!force && session && session.index < session.ids.length
      && !window.confirm('Você tem uma partida em andamento. Iniciar outra partida substituirá esse progresso. Continuar?')) return;
    const ids = shuffle(QUESTIONS.filter(q => q.level === level && (saga === 'todos' || saga === q.saga)).map(q => q.id));
    if (!ids.length) return;
    session = { level, scope: saga, ids, index: 0,
      answers: {}, orders: Object.fromEntries(ids.map(id => [id, shuffle([0, 1, 2, 3])])) };
    saveJSON(ACTIVE_KEY, session);
    screen = 'quiz'; reviewOpen = false; render(); window.scrollTo({ top: 0, behavior: 'auto' });
  }
  function selectAnswer(answerIndex) {
    if (screen !== 'quiz' || !session || session.index >= session.ids.length) return;
    const q = bank.get(session.ids[session.index]);
    if (Number.isInteger(session.answers[q.id]) || ![0,1,2,3].includes(answerIndex)) return;
    session.answers[q.id] = answerIndex;
    saveJSON(ACTIVE_KEY, session);
    render();
  }
  function nextQuestion() {
    if (!session || screen !== 'quiz' || session.index >= session.ids.length) return;
    const id = session.ids[session.index];
    if (!Number.isInteger(session.answers[id])) return;
    session.index++;
    saveJSON(ACTIVE_KEY, session);
    if (session.index === session.ids.length) {
      const key = `${session.level}:${session.scope}`;
      const value = getCurrentScore();
      best[key] = Math.max(Number(best[key]) || 0, value);
      saveJSON(BEST_KEY, best);
      screen = 'result';
    }
    render(); window.scrollTo({ top: 0, behavior: 'auto' });
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.dataset.scope) { scope = button.dataset.scope; render(); return; }
    if (button.dataset.level) { startGame(button.dataset.level, scope); return; }
    if (button.dataset.answer !== undefined) { selectAnswer(Number(button.dataset.answer)); return; }
    switch (button.dataset.action) {
      case 'home': showHome(); break;
      case 'resume': screen = 'quiz'; render(); window.scrollTo({ top: 0, behavior: 'auto' }); break;
      case 'next': nextQuestion(); break;
      case 'retry': startGame(session.level, session.scope, true); break;
      case 'review': reviewOpen = !reviewOpen; render(); break;
    }
  });
  document.addEventListener('keydown', event => {
    if (screen !== 'quiz' || !session || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    if (event.key === 'Escape') { showHome(); return; }
    if (session.index >= session.ids.length) return;
    const q = bank.get(session.ids[session.index]);
    if (Number.isInteger(session.answers[q.id])) {
      if (event.key === 'Enter' && (event.target === document.body || !event.target.closest('button'))) { event.preventDefault(); nextQuestion(); }
      return;
    }
    if (/^[1-4]$/.test(event.key)) { event.preventDefault(); selectAnswer(session.orders[q.id][Number(event.key) - 1]); }
  });
  // Checagem do banco: 80 perguntas, metade de cada obra, 20 em cada dificuldade.
  const expected = Object.keys(LEVELS).every(level => QUESTIONS.filter(q => q.level === level).length === 20
    && QUESTIONS.filter(q => q.level === level && q.saga === 'hobbit').length === 10
    && QUESTIONS.filter(q => q.level === level && q.saga === 'lotr').length === 10);
  if (QUESTIONS.length !== 80 || !expected || bank.size !== 80 || QUESTIONS.some(q => q.options.length !== 4 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3)) {
    console.error('O banco de perguntas está inconsistente.');
    root.innerHTML = '<p class="loading">Não foi possível carregar o banco de perguntas.</p>';
    return;
  }
  render();
})();
