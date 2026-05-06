// =========================================================
// ТЕТ-А-ТЕТ — клиентский стор: пользователи, сессия, матчи.
// API повторяет сигнатуру будущего Supabase-слоя: signUp / signIn /
// getMe / signOut / saveMatch / loadMatches / leaderboard / etc.
// Когда подцепим Supabase — тело методов поменяется, а интерфейс нет.
// =========================================================

(function () {
    const KEYS = {
        users: 'tat_users',
        session: 'tat_session',
        matches: 'tat_matches',
        ratings: 'tat_ratings',     // {email: {math: 1200, phys: 1200, ...}}
        subject: 'tat_subject',
        stats: 'tat_stats',         // {email: {wins, losses, streak, lastDelta}}
    };

    const SUBJECTS = ['math', 'phys', 'cs', 'chem'];
    const SUBJECT_LABEL = {
        math: 'математика',
        phys: 'физика',
        cs:   'информатика',
        chem: 'химия',
    };
    const DEFAULT_RATING = 1200;

    // ---------- helpers ----------
    const read = (k, fallback) => {
        try {
            const raw = localStorage.getItem(k);
            return raw ? JSON.parse(raw) : fallback;
        } catch (_) {
            return fallback;
        }
    };
    const write = (k, v) => {
        try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {}
    };

    async function hash(s) {
        if (!window.crypto || !window.crypto.subtle) {
            // фолбэк для совсем старых браузеров
            return 'plain:' + s;
        }
        const buf = new TextEncoder().encode(s);
        const out = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(out))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    function newId() {
        return 'u_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
    }

    function defaultRatings() {
        const r = {};
        SUBJECTS.forEach(s => { r[s] = DEFAULT_RATING; });
        return r;
    }

    // ---------- AUTH ----------

    async function signUp({ email, handle, password }) {
        email = (email || '').trim().toLowerCase();
        handle = (handle || '').trim();
        password = password || '';

        if (!email.includes('@')) return { error: 'неверный e-mail' };
        if (handle.length < 2) return { error: 'псевдоним короче 2 символов' };
        if (password.length < 4) return { error: 'пароль короче 4 символов' };

        const users = read(KEYS.users, {});
        if (users[email]) return { error: 'такой e-mail уже зарегистрирован' };

        const taken = Object.values(users).some(u => u.handle.toLowerCase() === handle.toLowerCase());
        if (taken) return { error: 'псевдоним занят' };

        const user = {
            id: newId(),
            email,
            handle,
            passHash: await hash(password),
            createdAt: new Date().toISOString(),
            avatarSeed: handle,
            bio: '',
        };
        users[email] = user;
        write(KEYS.users, users);

        const ratings = read(KEYS.ratings, {});
        ratings[email] = defaultRatings();
        write(KEYS.ratings, ratings);

        const stats = read(KEYS.stats, {});
        stats[email] = { wins: 0, losses: 0, streak: 0, lastDelta: 0 };
        write(KEYS.stats, stats);

        write(KEYS.session, { email });
        return { user };
    }

    async function signIn({ email, password }) {
        email = (email || '').trim().toLowerCase();
        password = password || '';
        const users = read(KEYS.users, {});
        const u = users[email];
        if (!u) return { error: 'пользователь не найден' };
        const h = await hash(password);
        if (h !== u.passHash) return { error: 'неверный пароль' };
        write(KEYS.session, { email });
        return { user: u };
    }

    function signOut() {
        try { localStorage.removeItem(KEYS.session); } catch (_) {}
    }

    function getMe() {
        const session = read(KEYS.session, null);
        if (!session || !session.email) return null;
        const users = read(KEYS.users, {});
        const u = users[session.email];
        return u || null;
    }

    function requireMe() {
        const me = getMe();
        if (!me) {
            window.location.href = 'index.html';
            return null;
        }
        return me;
    }

    function updateMe(patch) {
        const me = getMe();
        if (!me) return null;
        const users = read(KEYS.users, {});
        users[me.email] = { ...me, ...patch };
        write(KEYS.users, users);
        return users[me.email];
    }

    // ---------- RATING / STATS ----------

    function getRating(email, subject) {
        const ratings = read(KEYS.ratings, {});
        return (ratings[email] && ratings[email][subject]) || DEFAULT_RATING;
    }

    function setRating(email, subject, value) {
        const ratings = read(KEYS.ratings, {});
        if (!ratings[email]) ratings[email] = defaultRatings();
        ratings[email][subject] = Math.max(0, Math.round(value));
        write(KEYS.ratings, ratings);
    }

    function getAllRatings(email) {
        const ratings = read(KEYS.ratings, {});
        return { ...defaultRatings(), ...(ratings[email] || {}) };
    }

    function getStats(email, _subject) {
        const stats = read(KEYS.stats, {});
        return stats[email] || { wins: 0, losses: 0, streak: 0, lastDelta: 0 };
    }

    function bumpStats(email, win, delta) {
        const stats = read(KEYS.stats, {});
        const s = stats[email] || { wins: 0, losses: 0, streak: 0, lastDelta: 0 };
        if (win) {
            s.wins += 1;
            s.streak = s.streak >= 0 ? s.streak + 1 : 1;
        } else {
            s.losses += 1;
            s.streak = s.streak <= 0 ? s.streak - 1 : -1;
        }
        s.lastDelta = delta;
        stats[email] = s;
        write(KEYS.stats, stats);
    }

    // ---------- MATCHES ----------

    function saveMatch(match) {
        const all = read(KEYS.matches, []);
        const m = {
            id: 'm_' + Date.now().toString(36),
            ts: new Date().toISOString(),
            ...match,
        };
        all.unshift(m);
        // оставляем последние 200 матчей
        write(KEYS.matches, all.slice(0, 200));
        return m;
    }

    function loadMatches(email, limit) {
        const all = read(KEYS.matches, []);
        const filtered = email
            ? all.filter(m => m.email === email)
            : all;
        return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
    }

    // Очень простая ELO-подобная модель: K=32, ожидание относительно DEFAULT_RATING противника.
    function computeDelta(myRating, oppRating, win, score) {
        const expected = 1 / (1 + Math.pow(10, (oppRating - myRating) / 400));
        const actual = win ? 1 : 0;
        let delta = 32 * (actual - expected);
        // лёгкая поправка на счёт: 3:0 круче, чем 3:2
        if (score) {
            const diff = (score.my - score.opp);
            delta = delta * (0.9 + Math.max(-0.2, Math.min(0.2, diff * 0.06)));
        }
        return Math.round(delta);
    }

    // ---------- LEADERBOARD ----------

    function leaderboard(subject, limit) {
        const users = read(KEYS.users, {});
        const ratings = read(KEYS.ratings, {});
        const rows = Object.values(users).map(u => ({
            handle: u.handle,
            email: u.email,
            rating: (ratings[u.email] && ratings[u.email][subject]) || DEFAULT_RATING,
        }));
        rows.sort((a, b) => b.rating - a.rating);
        // Возвращаем Promise, чтобы интерфейс совпадал с supabase-стором.
        return Promise.resolve(rows.slice(0, limit || 50));
    }

    // Async-init: для локального стора это no-op, существует только чтобы
    // boot() в app.js мог сделать await store.init() единообразно.
    function init() { return Promise.resolve(); }

    // ---- Заглушки онлайн-MM (в local режиме онлайна нет) ----
    function findMatch() { return Promise.resolve(null); }
    function getMatch() { return Promise.resolve(null); }
    function getProfileById() { return Promise.resolve(null); }
    function matchChannel() { return null; }
    function finishPvpMatch() { return Promise.resolve(false); }
    function loadTaskPool() { return Promise.resolve([]); }

    // ---------- DEMO SEEDING ----------
    // Если стор пустой — посеять немного демо-юзеров, чтобы лидерборд не был мёртвым.
    function seedDemoUsersIfEmpty() {
        const users = read(KEYS.users, {});
        if (Object.keys(users).length > 0) return;

        const demo = [
            ['orlov_a',     'orlov@demo',     1488],
            ['k.tarasov',   'tarasov@demo',   1402],
            ['m_solov',     'solov@demo',     1359],
            ['delta_v',     'delta@demo',     1290],
            ['o.fedorenko', 'fedo@demo',      1260],
            ['kuznetsov.l', 'kuz@demo',       1244],
            ['i.berg',      'berg@demo',      1198],
            ['a.ledov',     'ledov@demo',     1166],
            ['p.vetrov',    'vetrov@demo',    1140],
            ['s.knorr',     'knorr@demo',     1108],
        ];
        const ratings = {};
        const stats = {};
        const u = {};
        demo.forEach(([handle, email, r]) => {
            u[email] = {
                id: newId(), email, handle,
                passHash: 'demo', createdAt: new Date().toISOString(),
                avatarSeed: handle, bio: '', isDemo: true,
            };
            ratings[email] = {
                math: r,
                phys: r - 30 - Math.floor(Math.random() * 60),
                cs:   r - Math.floor(Math.random() * 80),
                chem: r - 80 - Math.floor(Math.random() * 80),
            };
            stats[email] = {
                wins: 10 + Math.floor(Math.random() * 30),
                losses: 5 + Math.floor(Math.random() * 20),
                streak: 0, lastDelta: 0,
            };
        });
        write(KEYS.users, u);
        write(KEYS.ratings, ratings);
        write(KEYS.stats, stats);
    }

    seedDemoUsersIfEmpty();

    // ---------- EXPOSE ----------

    window.store = {
        // const
        SUBJECTS, SUBJECT_LABEL, DEFAULT_RATING,
        // lifecycle
        init,
        // auth
        signUp, signIn, signOut, getMe, requireMe, updateMe,
        // rating / stats
        getRating, setRating, getAllRatings, getStats, bumpStats, computeDelta,
        // matches
        saveMatch, loadMatches,
        // leaderboard (Promise)
        leaderboard,
        // misc
        currentSubject() {
            try { return localStorage.getItem(KEYS.subject) || 'math'; }
            catch (_) { return 'math'; }
        },
        setCurrentSubject(s) {
            try { localStorage.setItem(KEYS.subject, s); } catch (_) {}
        },
        // online MM stubs
        findMatch, getMatch, getProfileById, matchChannel, finishPvpMatch,
        loadTaskPool,
        _mode: 'local',
    };
})();
