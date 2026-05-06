// =========================================================
// ТЕТ-А-ТЕТ — экран дуэли. Сезон I: код вместо ответа.
//
// Юзер пишет Python в редакторе. Жмёт «отправить» → код прогоняется через
// Pyodide, stdout перехватывается и сравнивается с эталонным выводом.
// Совпало → +1 балл (◆), кадр взят. Не совпало → 0 баллов, кадр упущен.
//
// 5 раундов, 5 «засылов» — по одной отправке за раунд.
// После 5 раундов: у кого больше очков — выиграл; ничья — драм.
// =========================================================

(() => {
    const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
    const ROUND_SECONDS = 90;

    // ---- Пул задач (Python, школьный уровень). expected — то что ждём в stdout. ----
    const TASKS = [
        {
            tag: 'информатика · циклы',
            body: 'Дано N = 10. Выведите сумму всех целых от 1 до N включительно.',
            expected: '55',
            starter: 'n = 10\n# выведите сумму 1..n\n',
        },
        {
            tag: 'информатика · условия',
            body: 'Дано число n = 8. Выведите "yes" если число чётное, иначе "no".',
            expected: 'yes',
            starter: 'n = 8\n# yes если чётное, иначе no\n',
        },
        {
            tag: 'информатика · циклы',
            body: 'Выведите квадраты чисел от 1 до 5 в одну строку через пробел.',
            expected: '1 4 9 16 25',
            starter: '# выведите: 1 4 9 16 25\n',
        },
        {
            tag: 'информатика · функции',
            body: 'Даны три числа: a = 5, b = 3, c = 7. Выведите минимальное.',
            expected: '3',
            starter: 'a, b, c = 5, 3, 7\n# минимум из трёх\n',
        },
        {
            tag: 'информатика · строки',
            body: 'Дана строка s = "программа". Выведите её в обратном порядке.',
            expected: 'аммаргорп',
            starter: 's = "программа"\n# выведите перевёрнутую строку\n',
        },
        {
            tag: 'информатика · строки',
            body: 'Дана строка s = "informatics". Сколько в ней гласных (a, e, i, o, u)? Выведите число.',
            expected: '4',
            starter: 's = "informatics"\nvowels = "aeiou"\n# посчитайте гласные\n',
        },
        {
            tag: 'информатика · теорчисел',
            body: 'Дано N = 11. Выведите "yes" если число простое, иначе "no".',
            expected: 'yes',
            starter: 'n = 11\n# простое ли число\n',
        },
        {
            tag: 'информатика · циклы',
            body: 'Дано N = 5. Выведите факториал N (5! = 120).',
            expected: '120',
            starter: 'n = 5\n# выведите n!\n',
        },
        {
            tag: 'информатика · алгоритм Евклида',
            body: 'Даны два числа: a = 48, b = 18. Выведите их НОД.',
            expected: '6',
            starter: 'a, b = 48, 18\n# НОД(a, b)\n',
        },
        {
            tag: 'информатика · списки',
            body: 'Дан список arr = [3, 1, 4, 1, 5, 9, 2, 6]. Выведите его максимум.',
            expected: '9',
            starter: 'arr = [3, 1, 4, 1, 5, 9, 2, 6]\n# выведите max\n',
        },
        {
            tag: 'информатика · списки',
            body: 'Дан список arr = [1, 2, 3, 4, 5]. Выведите сумму его элементов.',
            expected: '15',
            starter: 'arr = [1, 2, 3, 4, 5]\n# выведите сумму\n',
        },
        {
            tag: 'информатика · базы счисления',
            body: 'Дано число n = 13. Выведите его в двоичной записи (без префикса 0b).',
            expected: '1101',
            starter: 'n = 13\n# выведите двоичную запись\n',
        }
    ];

    // Состояние юзера получаем ПОСЛЕ store.init() — иначе в supabase-режиме
    // requireMe() сработает до того, как сессия загрузится из cookie/localStorage,
    // и нас выкинет на лендинг.
    let me = null;
    let subject = 'cs';

    // Онлайн-матч — параметр ?match=X в URL.
    const URL_PARAMS = new URLSearchParams(window.location.search);
    const ONLINE_MATCH_ID = URL_PARAMS.get('match');
    let online = null; // {matchId, iAmA, oppId, oppHandle, channel}

    function pickOpp() {
        const list = ['orlov_a', 'k.tarasov', 'm_solov', 'delta_v',
            'o.fedorenko', 'kuznetsov.l', 'i.berg', 'a.ledov',
            'p.vetrov', 's.knorr'];
        return list[Math.floor(Math.random() * list.length)];
    }

    // Берём 5 случайных задач без повторов.
    function pickRoundTasks(n) {
        const pool = TASKS.slice();
        const out = [];
        while (out.length < n && pool.length) {
            const idx = Math.floor(Math.random() * pool.length);
            out.push(pool.splice(idx, 1)[0]);
        }
        return out;
    }

    // Простой PRNG (mulberry32) — из seed получаем воспроизводимую последовательность.
    function rngFrom(seed) {
        let h = 0;
        for (let i = 0; i < seed.length; i++) {
            h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
        }
        let t = h >>> 0;
        return function () {
            t |= 0; t = t + 0x6D2B79F5 | 0;
            let r = Math.imul(t ^ t >>> 15, 1 | t);
            r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r;
            return ((r ^ r >>> 14) >>> 0) / 4294967296;
        };
    }
    // Детерминированный пул задач для PvP (оба игрока получат одинаковые).
    function pickRoundTasksDeterministic(seed, n) {
        const rng = rngFrom(seed);
        const pool = TASKS.slice();
        const out = [];
        while (out.length < n && pool.length) {
            const idx = Math.floor(rng() * pool.length);
            out.push(pool.splice(idx, 1)[0]);
        }
        return out;
    }

    // myRating и oppRating инициализируются в boot() после получения me.
    let myRating = 1200;

    const state = {
        myScore: 0,
        oppScore: 0,
        round: 1,
        maxRounds: 5,
        rounds: pickRoundTasks(5),
        roundDeadlineSec: ROUND_SECONDS,
        remaining: ROUND_SECONDS,
        oppName: pickOpp(),
        oppRating: 1200,
        currentTask: null,
        timer: null,
        oppTimer: null,
        decided: false,
        finished: false,
        accepting: false,
        pyodide: null,
        pyodideReady: false,
    };

    const els = {
        oppName: document.getElementById('opp-name'),
        oppHandle: document.getElementById('opp-handle'),
        myHandle: document.getElementById('my-handle'),
        roundNum: document.getElementById('round-num'),
        clock: document.getElementById('clock'),
        taskTag: document.getElementById('task-tag'),
        taskBody: document.getElementById('task-body'),
        taskCard: document.getElementById('task-card'),
        editor: document.getElementById('code-editor'),
        output: document.getElementById('code-output'),
        btnRun: document.getElementById('btn-run'),
        btnSubmit: document.getElementById('btn-submit'),
        duelStatus: document.getElementById('duel-status'),
        roundOverlay: document.getElementById('round-overlay'),
        roundResult: document.getElementById('round-result'),
        countdownOverlay: document.getElementById('countdown-overlay'),
        countdownNum: document.getElementById('countdown-num'),
        countdownLabel: document.getElementById('countdown-label'),
        strikeOverlay: document.getElementById('strike-overlay'),
        scoreMe: document.getElementById('score-me'),
        scoreOpp: document.getElementById('score-opp'),
        figMe: document.getElementById('fighter-me'),
        figOpp: document.getElementById('fighter-opp'),
    };

    if (els.oppName) els.oppName.textContent = state.oppName;
    if (els.oppHandle) els.oppHandle.textContent = state.oppName;
    // myHandle проставляется в boot() когда me будет известен.

    // ---------- Pyodide ----------
    async function ensurePyodide() {
        if (state.pyodideReady) return state.pyodide;
        if (typeof window.loadPyodide !== 'function') {
            throw new Error('pyodide-js не загрузился');
        }
        if (els.duelStatus) els.duelStatus.textContent = 'грузим Python (один раз)...';
        state.pyodide = await window.loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
        });
        state.pyodideReady = true;
        return state.pyodide;
    }

    async function runPython(code) {
        const py = await ensurePyodide();
        // Перехватываем stdout / stderr через io.StringIO.
        const wrap = `
import sys, io, traceback
__buf_out = io.StringIO()
__buf_err = io.StringIO()
__sys_out, __sys_err = sys.stdout, sys.stderr
sys.stdout, sys.stderr = __buf_out, __buf_err
try:
${code.split('\n').map(l => '    ' + l).join('\n')}
except Exception:
    traceback.print_exc()
sys.stdout, sys.stderr = __sys_out, __sys_err
__result = (__buf_out.getvalue(), __buf_err.getvalue())
__result
`;
        try {
            const res = await py.runPythonAsync(wrap);
            const stdout = res.get(0);
            const stderr = res.get(1);
            res.destroy();
            return { stdout: stdout || '', stderr: stderr || '' };
        } catch (e) {
            return { stdout: '', stderr: String(e && e.message || e) };
        }
    }

    function normalizeOutput(s) {
        return String(s || '')
            .replace(/\r\n/g, '\n')
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0)
            .join('\n')
            .toLowerCase();
    }

    // ---------- UI helpers ----------
    function setClock() {
        const m = String(Math.floor(state.remaining / 60)).padStart(2, '0');
        const s = String(state.remaining % 60).padStart(2, '0');
        if (els.clock) els.clock.textContent = `${m}:${s}`;
    }

    function clearTimers() {
        if (state.timer) { clearInterval(state.timer); state.timer = null; }
        if (state.oppTimer) { clearTimeout(state.oppTimer); state.oppTimer = null; }
    }

    function setScores() {
        const fill = (container, n) => {
            if (!container) return;
            Array.from(container.children).forEach((el, i) => {
                const filled = i < n;
                el.classList.toggle('filled', filled);
                el.classList.toggle('empty', !filled);
                el.textContent = filled ? '◆' : '◇';
            });
        };
        fill(els.scoreMe, state.myScore);
        fill(els.scoreOpp, state.oppScore);
    }

    function setEditorEnabled(enabled) {
        if (els.editor) els.editor.disabled = !enabled;
        if (els.btnRun) els.btnRun.disabled = !enabled;
        if (els.btnSubmit) els.btnSubmit.disabled = !enabled;
    }

    function setOutput(text, kind) {
        if (!els.output) return;
        els.output.textContent = text || '';
        els.output.classList.remove('ok', 'err', 'info');
        if (kind) els.output.classList.add(kind);
    }

    // ---------- Countdown ----------
    function showCountdown(label) {
        return new Promise((resolve) => {
            if (!els.countdownOverlay) { resolve(); return; }
            els.countdownLabel.textContent = label;
            els.countdownOverlay.classList.add('show');

            const seq = ['3', '2', '1', '!'];
            let i = 0;
            const showNext = () => {
                if (i >= seq.length) {
                    els.countdownOverlay.classList.remove('show');
                    setTimeout(resolve, 120);
                    return;
                }
                els.countdownNum.classList.remove('animate');
                els.countdownNum.offsetWidth;
                els.countdownNum.textContent = seq[i];
                els.countdownNum.classList.toggle('final', seq[i] === '!');
                els.countdownNum.classList.add('animate');
                i++;
                setTimeout(showNext, seq[i - 1] === '!' ? 600 : 850);
            };
            showNext();
        });
    }

    function showStrike(target) {
        return new Promise((resolve) => {
            if (els.strikeOverlay) {
                els.strikeOverlay.classList.remove('show');
                els.strikeOverlay.offsetWidth;
                els.strikeOverlay.classList.add('show');
                setTimeout(() => els.strikeOverlay.classList.remove('show'), 400);
            }
            const fig = target === 'me' ? els.figMe : els.figOpp;
            if (fig) {
                fig.classList.remove('shake');
                fig.offsetWidth;
                fig.classList.add('shake');
                setTimeout(() => fig.classList.remove('shake'), 600);
            }
            setTimeout(resolve, 700);
        });
    }

    // ---------- Round ----------
    async function startRound() {
        state.decided = false;
        state.accepting = false;
        state.currentTask = state.rounds[state.round - 1];
        state.remaining = state.roundDeadlineSec;

        if (els.taskTag) els.taskTag.textContent = state.currentTask.tag;
        if (els.taskBody) els.taskBody.textContent = state.currentTask.body;
        if (els.editor) els.editor.value = state.currentTask.starter || '';
        setOutput('', null);
        setEditorEnabled(false);
        if (els.duelStatus) els.duelStatus.textContent = '';
        if (els.roundNum) els.roundNum.textContent = ROMAN[state.round] || String(state.round);

        setClock();
        await showCountdown(`кадр ${ROMAN[state.round] || state.round}`);

        // Активируем редактор
        state.accepting = true;
        setEditorEnabled(true);
        if (els.editor) els.editor.focus();
        if (els.duelStatus) els.duelStatus.textContent = 'соперник пишет...';

        // Тикалка раунда
        state.timer = setInterval(() => {
            state.remaining -= 1;
            setClock();
            if (state.remaining <= 0) {
                clearInterval(state.timer); state.timer = null;
                if (!state.decided) finishRound(false, 'время вышло');
            }
        }, 1000);

        // В оффлайн-режиме соперник — бот.
        if (!online) {
            const oppDelay = (30 + Math.random() * 50) * 1000;
            state.oppTimer = setTimeout(() => {
                if (state.decided) return;
                const oppCorrect = Math.random() < 0.45;
                if (oppCorrect) finishRound(false, 'соперник был быстрее');
                else if (els.duelStatus) els.duelStatus.textContent = 'соперник промахнулся — у вас есть время';
            }, oppDelay);
        }
        // В онлайн-режиме раунд завершается по приходу broadcast от соперника
        // (см. handleOpponentBroadcast) или когда мы сами отправили верный ответ.
    }

    async function finishRound(myWin, reason) {
        if (state.decided) return;
        state.decided = true;
        state.accepting = false;
        clearTimers();
        setEditorEnabled(false);

        if (myWin) state.myScore += 1; else state.oppScore += 1;
        if (els.duelStatus) els.duelStatus.textContent = reason || '';

        await showStrike(myWin ? 'opp' : 'me');
        setScores();

        if (els.roundResult) {
            els.roundResult.textContent = myWin ? 'кадр взят' : 'кадр упущен';
            els.roundResult.classList.toggle('win', myWin);
            els.roundResult.classList.toggle('loss', !myWin);
        }
        if (els.roundOverlay) {
            els.roundOverlay.classList.add('show');
            setTimeout(() => els.roundOverlay.classList.remove('show'), 1500);
        }

        await new Promise(r => setTimeout(r, 1700));

        if (state.round >= state.maxRounds) {
            finishMatch();
            return;
        }
        state.round += 1;
        startRound();
    }

    async function finishMatch() {
        if (state.finished) return;
        state.finished = true;
        clearTimers();

        const win = state.myScore > state.oppScore;
        const score = { my: state.myScore, opp: state.oppScore };
        const draw = state.myScore === state.oppScore;

        const delta = draw ? 0 : window.store.computeDelta(myRating, state.oppRating, win, score);
        const newR = Math.max(0, myRating + delta);

        if (online) {
            // PvP-финал: один RPC всё пересчитает на сервере (idempotent).
            const aScore = online.iAmA ? state.myScore : state.oppScore;
            const bScore = online.iAmA ? state.oppScore : state.myScore;
            try { await window.store.finishPvpMatch(online.matchId, aScore, bScore); } catch (e) {}
            try { if (online.channel) await online.channel.unsubscribe(); } catch (e) {}
        } else {
            // Бот: пишем рейтинг + матч локально / в стор как обычно.
            try {
                const r1 = window.store.setRating(me.email, subject, newR);
                if (r1 && typeof r1.then === 'function') await r1;
            } catch (e) {}
            try { window.store.bumpStats(me.email, win, delta); } catch (e) {}
            try {
                const p = window.store.saveMatch({
                    email: me.email,
                    subject,
                    opponent: state.oppName,
                    oppRating: state.oppRating,
                    win,
                    score,
                    delta,
                });
                if (p && typeof p.then === 'function') await p;
            } catch (e) {}
        }

        if (els.taskTag) {
            els.taskTag.textContent = draw
                ? 'занавес · ничья'
                : (win ? 'занавес · победа' : 'занавес · поражение');
        }
        if (els.taskBody) {
            els.taskBody.innerHTML = draw
                ? `<em>занавес.</em> равная сила. <span class="final-delta">${state.myScore} : ${state.oppScore}</span>`
                : (win
                    ? `<em>занавес.</em> кадр ваш — ${state.myScore} : ${state.oppScore}. <span class="final-delta win">+${delta}</span>`
                    : `<em>занавес.</em> ${state.myScore} : ${state.oppScore}. <span class="final-delta loss">${delta}</span>`);
        }
        setEditorEnabled(false);
        if (els.duelStatus) els.duelStatus.textContent = 'возврат через 4 секунды...';
        if (els.taskCard) els.taskCard.classList.add(win ? 'final-win' : (draw ? '' : 'final-loss'));

        setTimeout(() => { window.location.href = 'cabinet.html'; }, 4000);
    }

    // ---------- Code submission ----------
    async function runCode() {
        if (!state.accepting) return;
        const code = (els.editor && els.editor.value) || '';
        setOutput('идёт прогон...', 'info');
        const { stdout, stderr } = await runPython(code);
        if (stderr.trim()) {
            setOutput('ошибка:\n' + stderr.trim(), 'err');
            return null;
        }
        setOutput(stdout || '(пусто)', 'ok');
        return stdout;
    }

    async function submitCode() {
        if (!state.accepting || state.decided) return;
        // Прогон + сравнение с эталоном.
        const code = (els.editor && els.editor.value) || '';
        setOutput('проверяем...', 'info');
        const { stdout, stderr } = await runPython(code);

        if (stderr.trim()) {
            setOutput('ошибка:\n' + stderr.trim(), 'err');
            broadcastSubmit({ correct: false });
            finishRound(false, 'ошибка в коде');
            return;
        }

        const got = normalizeOutput(stdout);
        const want = normalizeOutput(state.currentTask.expected);

        if (got === want) {
            setOutput('верно: ' + (stdout || '(пусто)'), 'ok');
            broadcastSubmit({ correct: true });
            finishRound(true, 'верно');
        } else {
            setOutput(
                `неверно. ваш вывод:\n${stdout || '(пусто)'}\n— ожидался ${state.currentTask.expected}`,
                'err'
            );
            broadcastSubmit({ correct: false });
            finishRound(false, 'неверный ответ');
        }
    }

    // Сообщить сопернику о своей попытке (только в онлайне).
    function broadcastSubmit({ correct }) {
        if (!online || !online.channel) return;
        try {
            online.channel.send({
                type: 'broadcast',
                event: 'submit',
                payload: {
                    round: state.round,
                    correct,
                    by: me ? me.id : null,
                    ts: Date.now(),
                },
            });
        } catch (e) { console.warn('[tat] broadcast failed', e); }
    }

    // Соперник прислал результат своей попытки.
    function handleOpponentBroadcast(msg) {
        if (!online) return;
        if (state.decided) return;
        const p = (msg && msg.payload) || {};
        if (p.round !== state.round) return;
        if (p.by && me && p.by === me.id) return; // эхо своего сообщения
        if (p.correct) {
            // Соперник ответил верно раньше нас → мы проиграли раунд.
            finishRound(false, 'соперник был быстрее');
        } else {
            if (els.duelStatus) els.duelStatus.textContent = 'соперник промахнулся — у вас есть время';
        }
    }

    // ---------- Wire UI ----------
    if (els.btnRun) els.btnRun.addEventListener('click', () => { runCode(); });
    if (els.btnSubmit) els.btnSubmit.addEventListener('click', () => { submitCode(); });

    // Tab в редакторе вставляет 4 пробела, не уводит фокус.
    if (els.editor) {
        els.editor.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const el = els.editor;
                const start = el.selectionStart, endd = el.selectionEnd;
                el.value = el.value.slice(0, start) + '    ' + el.value.slice(endd);
                el.selectionStart = el.selectionEnd = start + 4;
            }
            // Cmd/Ctrl+Enter — отправка
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submitCode();
            }
        });
    }

    // ---------- Boot ----------
    (async function () {
        setEditorEnabled(false);
        setScores();

        // 1. Дожидаемся пока store подтянет сессию (Supabase или local).
        if (typeof window.store.init === 'function') {
            try { await window.store.init(); }
            catch (e) { console.warn('[tat] store.init failed', e); }
        }

        // 2. Теперь требуем юзера. Если нет сессии — уйдём на лендинг.
        me = window.store.getMe();
        if (!me) {
            window.location.href = 'index.html';
            return;
        }

        // 3. Сезон I — только информатика. Рейтинг.
        window.store.setCurrentSubject('cs');
        subject = 'cs';
        myRating = window.store.getRating(me.email, subject);
        if (els.myHandle) els.myHandle.textContent = me.handle;

        // 4а. Онлайн-режим: подгружаем матч, фигурируем соперника, подписываемся.
        if (ONLINE_MATCH_ID && window.store._mode === 'supabase') {
            try {
                const match = await window.store.getMatch(ONLINE_MATCH_ID);
                if (!match || (match.a_id !== me.id && match.b_id !== me.id)) {
                    if (els.duelStatus) els.duelStatus.textContent = 'этот матч не ваш';
                    setTimeout(() => { window.location.href = 'cabinet.html'; }, 2000);
                    return;
                }
                if (match.status === 'finished') {
                    if (els.duelStatus) els.duelStatus.textContent = 'матч уже завершён';
                    setTimeout(() => { window.location.href = 'cabinet.html'; }, 1500);
                    return;
                }
                const iAmA = match.a_id === me.id;
                const oppId = iAmA ? match.b_id : match.a_id;
                const oppProfile = await window.store.getProfileById(oppId);
                const oppHandle = (oppProfile && oppProfile.handle) || 'соперник';

                // Детерминированный пул задач (общий seed = match_id).
                state.rounds = pickRoundTasksDeterministic(match.id, 5);
                state.oppName = oppHandle;
                if (els.oppName) els.oppName.textContent = oppHandle;
                if (els.oppHandle) els.oppHandle.textContent = oppHandle;

                // Подписка на канал матча.
                const chan = window.store.matchChannel(match.id);
                chan.on('broadcast', { event: 'submit' }, handleOpponentBroadcast);
                await chan.subscribe();

                online = {
                    matchId: match.id,
                    iAmA,
                    oppId,
                    oppHandle,
                    channel: chan,
                };
                state.oppRating = myRating; // не критично, будет пересчитан в RPC
            } catch (e) {
                console.warn('[tat] online init failed', e);
            }
        }
        // 4б. Оффлайн-режим: бот и случайный пул.
        if (!online) {
            state.oppRating = Math.max(800, myRating + Math.round((Math.random() - 0.5) * 300));
        }

        // 4. Грузим Python и начинаем кадр I.
        try {
            await ensurePyodide();
            if (els.duelStatus) els.duelStatus.textContent = '';
            startRound();
        } catch (e) {
            if (els.duelStatus) els.duelStatus.textContent = 'не удалось загрузить интерпретатор';
            console.error('[tat] pyodide error', e);
        }
    })();
})();
