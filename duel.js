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
    const ROUND_SECONDS = 60;

    // ---- Пул задач (Python, 9 класс, функция solve(...) с набором тестов). ----
    // Каждый input в test — это список аргументов для solve(*input).
    // expected — что должно вернуть solve(*input).
    // Источники: kpolyakov.spb.ru, Босова 9 класс, sdamgia (адаптация).
    const TASKS = [
        {
            tag: 'списки · сортировка',
            body: 'Напишите функцию solve(arr): возвращает список arr, отсортированный по возрастанию.',
            example: 'solve([3, 1, 2]) → [1, 2, 3]',
            starter: 'def solve(arr):\n    # верните отсортированный список\n    return arr\n',
            tests: [
                { input: [[3, 1, 2]],            expected: [1, 2, 3] },
                { input: [[]],                   expected: [] },
                { input: [[5]],                  expected: [5] },
                { input: [[-3, 1, -1, 0]],       expected: [-3, -1, 0, 1] },
                { input: [[2, 2, 1, 3, 1]],      expected: [1, 1, 2, 2, 3] },
            ],
        },
        {
            tag: 'списки · фильтр',
            body: 'Напишите solve(arr): вернуть только чётные элементы списка, сохранив их порядок.',
            example: 'solve([1, 2, 3, 4, 5]) → [2, 4]',
            starter: 'def solve(arr):\n    # верните только чётные\n    return []\n',
            tests: [
                { input: [[1, 2, 3, 4, 5]],      expected: [2, 4] },
                { input: [[2, 4, 6]],            expected: [2, 4, 6] },
                { input: [[1, 3, 5]],            expected: [] },
                { input: [[]],                   expected: [] },
                { input: [[-2, -1, 0, 1, 2]],    expected: [-2, 0, 2] },
            ],
        },
        {
            tag: 'списки · преобразование',
            body: 'Напишите solve(arr): вернуть список, где каждый элемент удвоен.',
            example: 'solve([1, 2, 3]) → [2, 4, 6]',
            starter: 'def solve(arr):\n    return arr\n',
            tests: [
                { input: [[1, 2, 3]],            expected: [2, 4, 6] },
                { input: [[]],                   expected: [] },
                { input: [[0, -1, 5]],           expected: [0, -2, 10] },
                { input: [[100]],                expected: [200] },
            ],
        },
        {
            tag: 'списки · агрегация',
            body: 'Напишите solve(arr): вернуть сумму всех элементов списка (число).',
            example: 'solve([1, 2, 3]) → 6',
            starter: 'def solve(arr):\n    return 0\n',
            tests: [
                { input: [[1, 2, 3]],            expected: 6 },
                { input: [[]],                   expected: 0 },
                { input: [[-1, 1]],              expected: 0 },
                { input: [[10, 20, 30, 40]],     expected: 100 },
                { input: [[5]],                  expected: 5 },
            ],
        },
        {
            tag: 'списки · уникальность',
            body: 'Напишите solve(arr): вернуть список без повторов, сохранив порядок первого появления.',
            example: 'solve([1, 2, 2, 3, 1]) → [1, 2, 3]',
            starter: 'def solve(arr):\n    return arr\n',
            tests: [
                { input: [[1, 2, 2, 3, 1]],      expected: [1, 2, 3] },
                { input: [[]],                   expected: [] },
                { input: [[5, 5, 5]],            expected: [5] },
                { input: [[3, 1, 2]],            expected: [3, 1, 2] },
                { input: [['a', 'b', 'a', 'c']], expected: ['a', 'b', 'c'] },
            ],
        },
        {
            tag: 'списки · реверс',
            body: 'Напишите solve(arr): вернуть список в обратном порядке.',
            example: 'solve([1, 2, 3]) → [3, 2, 1]',
            starter: 'def solve(arr):\n    return arr\n',
            tests: [
                { input: [[1, 2, 3]],            expected: [3, 2, 1] },
                { input: [[]],                   expected: [] },
                { input: [[7]],                  expected: [7] },
                { input: [['a', 'b', 'c', 'd']], expected: ['d', 'c', 'b', 'a'] },
            ],
        },
        {
            tag: 'строки · реверс',
            body: 'Напишите solve(s): вернуть строку s, развёрнутую в обратном порядке.',
            example: 'solve("abc") → "cba"',
            starter: 'def solve(s):\n    return s\n',
            tests: [
                { input: ['abc'],                expected: 'cba' },
                { input: [''],                   expected: '' },
                { input: ['a'],                  expected: 'a' },
                { input: ['привет'],             expected: 'тевирп' },
                { input: ['hello world'],        expected: 'dlrow olleh' },
            ],
        },
        {
            tag: 'строки · палиндром',
            body: 'Напишите solve(s): вернуть True если s — палиндром, иначе False.',
            example: 'solve("шалаш") → True',
            starter: 'def solve(s):\n    return False\n',
            tests: [
                { input: ['шалаш'],              expected: true },
                { input: ['abcba'],              expected: true },
                { input: ['hello'],              expected: false },
                { input: [''],                   expected: true },
                { input: ['a'],                  expected: true },
                { input: ['ab'],                 expected: false },
            ],
        },
        {
            tag: 'строки · подсчёт',
            body: 'Напишите solve(s): вернуть число гласных букв (a, e, i, o, u, A, E, I, O, U) в строке s.',
            example: 'solve("informatics") → 4',
            starter: 'def solve(s):\n    return 0\n',
            tests: [
                { input: ['informatics'],        expected: 4 },
                { input: ['HELLO'],              expected: 2 },
                { input: ['xyz'],                expected: 0 },
                { input: [''],                   expected: 0 },
                { input: ['aeiou'],              expected: 5 },
            ],
        },
        {
            tag: 'теорчисел · простота',
            body: 'Напишите solve(n): вернуть True если n — простое число, иначе False. Считать что n ≥ 2 в тестах.',
            example: 'solve(7) → True',
            starter: 'def solve(n):\n    return False\n',
            tests: [
                { input: [2],                    expected: true },
                { input: [3],                    expected: true },
                { input: [4],                    expected: false },
                { input: [11],                   expected: true },
                { input: [25],                   expected: false },
                { input: [97],                   expected: true },
                { input: [100],                  expected: false },
            ],
        },
        {
            tag: 'теорчисел · алгоритм Евклида',
            body: 'Напишите solve(a, b): вернуть НОД двух натуральных чисел.',
            example: 'solve(48, 18) → 6',
            starter: 'def solve(a, b):\n    return 1\n',
            tests: [
                { input: [48, 18],               expected: 6 },
                { input: [100, 75],              expected: 25 },
                { input: [7, 13],                expected: 1 },
                { input: [10, 10],               expected: 10 },
                { input: [1, 999],               expected: 1 },
            ],
        },
        {
            tag: 'теорчисел · факториал',
            body: 'Напишите solve(n): вернуть n! (для n ≥ 0). 0! = 1.',
            example: 'solve(5) → 120',
            starter: 'def solve(n):\n    return 1\n',
            tests: [
                { input: [0],                    expected: 1 },
                { input: [1],                    expected: 1 },
                { input: [5],                    expected: 120 },
                { input: [7],                    expected: 5040 },
                { input: [10],                   expected: 3628800 },
            ],
        },
        {
            tag: 'теорчисел · Фибоначчи',
            body: 'Напишите solve(n): вернуть n-ое число Фибоначчи. F(0)=0, F(1)=1, F(2)=1, ...',
            example: 'solve(7) → 13',
            starter: 'def solve(n):\n    return 0\n',
            tests: [
                { input: [0],                    expected: 0 },
                { input: [1],                    expected: 1 },
                { input: [2],                    expected: 1 },
                { input: [7],                    expected: 13 },
                { input: [10],                   expected: 55 },
                { input: [15],                   expected: 610 },
            ],
        },
        {
            tag: 'числа · сумма цифр',
            body: 'Напишите solve(n): вернуть сумму цифр натурального числа.',
            example: 'solve(123) → 6',
            starter: 'def solve(n):\n    return 0\n',
            tests: [
                { input: [123],                  expected: 6 },
                { input: [9],                    expected: 9 },
                { input: [10],                   expected: 1 },
                { input: [9999],                 expected: 36 },
                { input: [100000],               expected: 1 },
            ],
        },
        {
            tag: 'числа · реверс',
            body: 'Напишите solve(n): развернуть число (1234 → 4321). Ведущие нули отбросить (1200 → 21).',
            example: 'solve(1234) → 4321',
            starter: 'def solve(n):\n    return n\n',
            tests: [
                { input: [1234],                 expected: 4321 },
                { input: [9],                    expected: 9 },
                { input: [10],                   expected: 1 },
                { input: [1200],                 expected: 21 },
                { input: [123456],               expected: 654321 },
            ],
        },
        {
            tag: 'базы счисления',
            body: 'Напишите solve(n): вернуть строку — двоичную запись числа n без префикса. Например 5 → "101".',
            example: 'solve(5) → "101"',
            starter: 'def solve(n):\n    return ""\n',
            tests: [
                { input: [0],                    expected: '0' },
                { input: [1],                    expected: '1' },
                { input: [5],                    expected: '101' },
                { input: [13],                   expected: '1101' },
                { input: [255],                  expected: '11111111' },
                { input: [1024],                 expected: '10000000000' },
            ],
        },
        {
            tag: 'списки · слияние',
            body: 'Напишите solve(a, b): даны два отсортированных списка. Вернуть один отсортированный список из всех элементов.',
            example: 'solve([1, 3, 5], [2, 4]) → [1, 2, 3, 4, 5]',
            starter: 'def solve(a, b):\n    return []\n',
            tests: [
                { input: [[1, 3, 5], [2, 4]],    expected: [1, 2, 3, 4, 5] },
                { input: [[], [1, 2]],           expected: [1, 2] },
                { input: [[1, 2], []],           expected: [1, 2] },
                { input: [[], []],               expected: [] },
                { input: [[1, 1], [1, 1]],       expected: [1, 1, 1, 1] },
                { input: [[-3, 0], [-1, 5]],     expected: [-3, -1, 0, 5] },
            ],
        },
        {
            tag: 'списки · подсчёт',
            body: 'Напишите solve(arr, x): вернуть сколько раз x встречается в arr.',
            example: 'solve([1, 2, 1, 3, 1], 1) → 3',
            starter: 'def solve(arr, x):\n    return 0\n',
            tests: [
                { input: [[1, 2, 1, 3, 1], 1],   expected: 3 },
                { input: [[1, 2, 3], 5],         expected: 0 },
                { input: [[], 0],                expected: 0 },
                { input: [[7, 7, 7], 7],         expected: 3 },
                { input: [['a', 'b', 'a'], 'a'], expected: 2 },
            ],
        },
        {
            tag: 'строки · подстрока',
            body: 'Напишите solve(s, sub): вернуть сколько раз подстрока sub встречается в s (с пересечениями НЕ считать).',
            example: 'solve("ababa", "ab") → 2',
            starter: 'def solve(s, sub):\n    return 0\n',
            tests: [
                { input: ['ababa', 'ab'],        expected: 2 },
                { input: ['hello', 'l'],         expected: 2 },
                { input: ['aaaa', 'aa'],         expected: 2 },
                { input: ['abc', 'd'],           expected: 0 },
                { input: ['', 'x'],              expected: 0 },
            ],
        },
        {
            tag: 'списки · поиск',
            body: 'Напишите solve(arr): вернуть второй по величине уникальный элемент. Если такого нет, вернуть None.',
            example: 'solve([5, 1, 3, 5, 2]) → 3',
            starter: 'def solve(arr):\n    return None\n',
            tests: [
                { input: [[5, 1, 3, 5, 2]],      expected: 3 },
                { input: [[1, 2]],               expected: 1 },
                { input: [[7, 7, 7]],            expected: null },
                { input: [[]],                   expected: null },
                { input: [[10, 20, 30, 40]],     expected: 30 },
            ],
        },
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

    // Просто прогнать код пользователя, перехватив stdout (для кнопки «прогнать»).
    async function runPythonStdout(code) {
        const py = await ensurePyodide();
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

    // Прогнать код пользователя на наборе тестов.
    // Возвращает {ok, total, passed, results: [{ok, input_repr, got, want}], loadError}.
    async function runTests(code, tests) {
        const py = await ensurePyodide();
        // Кодируем тесты в JSON для встраивания в Python-источник.
        const testsJson = JSON.stringify(tests);
        // ВАЖНО: в Python тройные кавычки могут конфликтовать с пользовательским кодом.
        // Поэтому пользовательский код прокидываем через globals.set, а не подстановкой.
        py.globals.set('__USER_CODE__', code);
        py.globals.set('__TESTS_JSON__', testsJson);

        const wrap = `
import sys, io, json, traceback

__user_buf = io.StringIO()
__sys_out, __sys_err = sys.stdout, sys.stderr

# 1. Загружаем пользовательский код в namespace.
__ns = {}
sys.stdout, sys.stderr = __user_buf, __user_buf
__load_err = None
try:
    exec(__USER_CODE__, __ns)
except Exception:
    __load_err = traceback.format_exc()
sys.stdout, sys.stderr = __sys_out, __sys_err

__results = []
if __load_err is None:
    if 'solve' not in __ns or not callable(__ns['solve']):
        __load_err = "функция solve(...) не определена"
    else:
        __solve = __ns['solve']
        for __t in json.loads(__TESTS_JSON__):
            __input = __t['input']
            __expected = __t['expected']
            __input_repr = ', '.join(repr(x) for x in __input)
            try:
                # Глушим stdout пользователя на время прогона тестов.
                sys.stdout = io.StringIO()
                __got = __solve(*__input)
            except Exception:
                __got = None
                __exc = traceback.format_exc().strip().split('\\n')[-1]
                sys.stdout = __sys_out
                __results.append({
                    'ok': False,
                    'input_repr': __input_repr,
                    'got': __exc,
                    'want': repr(__expected),
                    'is_error': True,
                })
                continue
            sys.stdout = __sys_out
            __ok = (__got == __expected)
            __results.append({
                'ok': bool(__ok),
                'input_repr': __input_repr,
                'got': repr(__got),
                'want': repr(__expected),
                'is_error': False,
            })

__out_payload = {
    'load_error': __load_err,
    'user_stdout': __user_buf.getvalue(),
    'results': __results,
    'passed': sum(1 for r in __results if r['ok']),
    'total': len(__results),
}
json.dumps(__out_payload, ensure_ascii=False)
`;

        try {
            const jsonText = await py.runPythonAsync(wrap);
            const data = JSON.parse(jsonText);
            data.allOk = data.total > 0 && data.passed === data.total;
            return data;
        } catch (e) {
            return {
                allOk: false,
                load_error: String((e && e.message) || e),
                user_stdout: '',
                results: [],
                passed: 0,
                total: tests.length,
            };
        }
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

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
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
        if (els.taskBody) {
            const ex = state.currentTask.example;
            els.taskBody.innerHTML =
                escapeHtml(state.currentTask.body) +
                (ex ? `<div class="task-example">пример: <code>${escapeHtml(ex)}</code></div>` : '');
        }
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

    // Форматирование результата тестов в человеческий вид.
    function formatTestResults(data) {
        if (data.load_error) {
            return 'ошибка загрузки кода:\n' + data.load_error.trim();
        }
        const lines = [];
        lines.push(`тесты: ${data.passed} из ${data.total} ${data.allOk ? '· все прошли' : ''}`);

        // Краткий ряд ✓/✗ по всем тестам
        const dots = data.results.map(r => r.ok ? '✓' : '✗').join(' ');
        if (dots) lines.push(dots);

        // Подробности по упавшим (до 3-х)
        const fails = data.results.filter(r => !r.ok).slice(0, 3);
        if (fails.length) {
            lines.push('');
            for (const f of fails) {
                lines.push(`  solve(${f.input_repr})`);
                if (f.is_error) {
                    lines.push(`    → исключение: ${f.got}`);
                } else {
                    lines.push(`    получено:  ${f.got}`);
                    lines.push(`    ожидалось: ${f.want}`);
                }
            }
        }

        if (data.user_stdout && data.user_stdout.trim()) {
            lines.push('');
            lines.push('вывод print():');
            lines.push(data.user_stdout.trim());
        }
        return lines.join('\n');
    }

    async function runCode() {
        if (!state.accepting) return;
        const code = (els.editor && els.editor.value) || '';
        setOutput('идёт прогон тестов...', 'info');
        const data = await runTests(code, state.currentTask.tests);
        setOutput(formatTestResults(data), data.allOk ? 'ok' : 'err');
        return data;
    }

    async function submitCode() {
        if (!state.accepting || state.decided) return;
        const code = (els.editor && els.editor.value) || '';
        setOutput('проверяем тесты...', 'info');
        const data = await runTests(code, state.currentTask.tests);
        setOutput(formatTestResults(data), data.allOk ? 'ok' : 'err');

        if (data.allOk) {
            broadcastSubmit({ correct: true });
            finishRound(true, 'все тесты прошли');
        } else {
            broadcastSubmit({ correct: false });
            const reason = data.load_error
                ? 'ошибка в коде'
                : `провалено ${data.total - data.passed} из ${data.total}`;
            finishRound(false, reason);
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
