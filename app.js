// =========================================================
// ТЕТ-А-ТЕТ — общий клиент. Один файл на все страницы.
// Определяет роутинг по data-route у активной ссылки в .nav.
// =========================================================

(() => {
    const $ = (s, root) => (root || document).querySelector(s);
    const $$ = (s, root) => Array.from((root || document).querySelectorAll(s));

    // ---------- Подсветка активного раздела навигации ----------
    function highlightNav() {
        const path = (window.location.pathname.split('/').pop() || 'index.html')
            .replace('.html', '');
        const map = {
            'cabinet': 'cabinet',
            'archive': 'archive',
            'leaderboard': 'leaderboard',
            'rules': 'rules',
            'profile': 'profile',
        };
        const route = map[path];
        if (!route) return;
        $$('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.route === route);
        });
    }

    // ---------- Шапка с инфо о юзере ----------
    function renderNavUser() {
        const me = window.store && window.store.getMe();
        const nameEl = $('#nav-user-name');
        const rateEl = $('#nav-user-rating');
        if (!me) return;
        const subj = window.store.currentSubject();
        const rating = window.store.getRating(me.email, subj);
        if (nameEl) nameEl.textContent = me.handle;
        if (rateEl) rateEl.textContent = rating;

        const out = $('#nav-signout');
        if (out) {
            out.addEventListener('click', () => {
                window.store.signOut();
                window.location.href = 'index.html';
            });
        }
    }

    // ---------- LANDING / SIGNUP ----------

    function bindLogin() {
        const form = $('#login-form');
        if (!form) return;
        const errEl = $('#li-error');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errEl.textContent = '';
            const email = $('#li-email').value;
            const password = $('#li-password').value;
            const { user, error } = await window.store.signIn({ email, password });
            if (error) { errEl.textContent = error; return; }
            window.location.href = 'cabinet.html';
        });
    }

    function bindSignup() {
        const form = $('#signup-form');
        if (!form) return;
        const errEl = $('#su-error');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errEl.textContent = '';
            errEl.classList.remove('is-info');
            const handle = $('#su-handle').value;
            const email = $('#su-email').value;
            const password = $('#su-password').value;
            const { user, error, info } = await window.store.signUp({ email, handle, password });
            if (error) { errEl.textContent = error; return; }
            if (info) {
                errEl.textContent = info;
                errEl.classList.add('is-info');
                return;
            }
            window.location.href = 'cabinet.html';
        });
    }

    // ---------- CABINET ----------

    function renderSubjects() {
        const grid = $('#subjects-grid');
        if (!grid) return;
        const me = window.store.requireMe();
        if (!me) return;
        // Сезон I: открыта только информатика. Остальные карточки — «соon».
        window.store.setCurrentSubject('cs');
        const all = window.store.getAllRatings(me.email);
        const subs = [
            { code: 'cs',   num: '①', name: 'информатика', soon: false },
            { code: 'math', num: '②', name: 'математика',  soon: true  },
            { code: 'phys', num: '③', name: 'физика',      soon: true  },
            { code: 'chem', num: '④', name: 'химия',       soon: true  },
        ];
        grid.innerHTML = subs.map(s => `
            <button class="subject ${s.code === 'cs' ? 'active' : ''} ${s.soon ? 'soon' : ''}"
                    data-subject="${s.code}" ${s.soon ? 'disabled aria-disabled="true"' : ''}>
                <span class="subj-num">${s.num}</span>
                <span class="subj-name">${s.name}</span>
                <span class="subj-rating">${s.soon ? 'скоро' : 'рейтинг ' + all[s.code]}</span>
            </button>
        `).join('');
    }

    function weekDelta(matches, subject) {
        const weekAgo = Date.now() - 7 * 86400 * 1000;
        return matches
            .filter(m => m.subject === subject && new Date(m.ts).getTime() >= weekAgo)
            .reduce((acc, m) => acc + (m.delta || 0), 0);
    }

    function renderHero() {
        const me = window.store.getMe();
        if (!me) return;
        const subj = window.store.currentSubject();
        const rating = window.store.getRating(me.email, subj);
        const stats = window.store.getStats(me.email);
        const matches = window.store.loadMatches(me.email);
        const dw = weekDelta(matches, subj);

        const setText = (sel, v) => { const el = $(sel); if (el) el.textContent = v; };
        setText('#hero-rating', rating);
        setText('#hero-subject-label', `показатель · ${window.store.SUBJECT_LABEL[subj]}`);
        setText('#hero-delta', `${dw === 0 ? '±' : (dw > 0 ? '+' : '')}${dw} за неделю`);
        setText('#rec-wins', stats.wins);
        setText('#rec-losses', stats.losses);
        setText('#rec-streak', Math.abs(stats.streak));
    }

    function fmtTime(iso) {
        const d = new Date(iso);
        const now = new Date();
        const sameDay = d.toDateString() === now.toDateString();
        const yest = new Date(now); yest.setDate(now.getDate() - 1);
        const isYest = d.toDateString() === yest.toDateString();
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        if (sameDay) return `сегодня · ${hh}:${mm}`;
        if (isYest) return `вчера · ${hh}:${mm}`;
        return `${d.getDate()} ${['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'][d.getMonth()]} · ${hh}:${mm}`;
    }

    function renderArchiveRow(m) {
        const cls = m.win ? 'win' : 'loss';
        const letter = m.win ? 'W' : 'L';
        const delta = (m.delta > 0 ? '+' : '') + m.delta;
        return `
            <li class="archive-row ${cls}">
                <span class="archive-result">${letter}</span>
                <span class="archive-opp">${m.opponent}</span>
                <span class="archive-score">${m.score.my} : ${m.score.opp}</span>
                <span class="archive-subj">${window.store.SUBJECT_LABEL[m.subject] || m.subject}</span>
                <span class="archive-delta">${delta}</span>
                <span class="archive-time">${fmtTime(m.ts)}</span>
            </li>
        `;
    }

    function renderRecentMatches() {
        const list = $('#archive-list');
        if (!list) return;
        const me = window.store.getMe();
        const matches = window.store.loadMatches(me.email, 5);
        if (!matches.length) {
            list.innerHTML = '<li class="archive-empty">архив пуст. начните первую дуэль.</li>';
            return;
        }
        list.innerHTML = matches.map(renderArchiveRow).join('');
    }

    // ---------- ARCHIVE PAGE ----------

    function renderFullArchive() {
        const list = $('#archive-list-full');
        if (!list) return;
        const me = window.store.requireMe();
        if (!me) return;

        let activeWL = 'all';
        let activeSubj = 'all';

        const draw = () => {
            let m = window.store.loadMatches(me.email);
            if (activeWL === 'win') m = m.filter(x => x.win);
            if (activeWL === 'loss') m = m.filter(x => !x.win);
            if (activeSubj !== 'all') m = m.filter(x => x.subject === activeSubj);
            list.innerHTML = m.length
                ? m.map(renderArchiveRow).join('')
                : '<li class="archive-empty">по этим фильтрам ничего нет.</li>';
        };

        $$('.filter-pill', $('#archive-filter')).forEach(p => {
            p.addEventListener('click', () => {
                const f = p.dataset.filter;
                if (['win', 'loss', 'all'].includes(f)) {
                    activeWL = f;
                    $$('.filter-pill', $('#archive-filter'))
                        .filter(x => ['win','loss','all'].includes(x.dataset.filter))
                        .forEach(x => x.classList.toggle('active', x === p));
                } else {
                    activeSubj = (activeSubj === f) ? 'all' : f;
                    $$('.filter-pill', $('#archive-filter'))
                        .filter(x => !['win','loss','all'].includes(x.dataset.filter))
                        .forEach(x => x.classList.toggle('active', x.dataset.filter === activeSubj));
                }
                draw();
            });
        });

        draw();
    }

    // ---------- LEADERBOARD PAGE ----------

    function renderLeaderboard() {
        const list = $('#lb-list');
        const filter = $('#lb-filter');
        if (!list || !filter) return;
        window.store.requireMe();

        let subj = window.store.currentSubject();

        const draw = async () => {
            list.innerHTML = '<li class="archive-empty">грузим...</li>';
            const me = window.store.getMe();
            const rows = await window.store.leaderboard(subj, 50);
            list.innerHTML = rows.map((r, i) => {
                const isMe = me && (
                    (r.email && r.email === me.email) ||
                    (r.handle === me.handle)
                );
                return `
                    <li class="lb-row ${isMe ? 'is-me' : ''}">
                        <span class="lb-rank">${String(i + 1).padStart(2, '0')}</span>
                        <span class="lb-handle">${r.handle}${isMe ? ' <em class="lb-you">— вы</em>' : ''}</span>
                        <span class="lb-rating">${r.rating}</span>
                    </li>
                `;
            }).join('') || '<li class="archive-empty">пусто.</li>';
        };

        $$('.filter-pill', filter).forEach(p => {
            p.addEventListener('click', () => {
                subj = p.dataset.subject;
                $$('.filter-pill', filter).forEach(x => x.classList.toggle('active', x === p));
                window.store.setCurrentSubject(subj);
                draw();
                renderNavUser();
            });
            if (p.dataset.subject === subj) p.classList.add('active');
            else p.classList.remove('active');
        });

        draw();
    }

    // ---------- PROFILE PAGE ----------

    function renderProfile() {
        const form = $('#profile-form');
        if (!form) return;
        const me = window.store.requireMe();
        if (!me) return;

        const handleEl = $('#pf-handle');
        const bioEl = $('#pf-bio');
        const errEl = $('#pf-error');
        const okEl = $('#pf-ok');

        const portraitMark = $('#portrait-mark');
        const portraitHandle = $('#portrait-handle');
        const portraitEmail = $('#portrait-email');

        const apply = () => {
            const u = window.store.getMe();
            handleEl.value = u.handle;
            bioEl.value = u.bio || '';
            portraitMark.textContent = (u.handle || '?').slice(0, 1).toUpperCase();
            portraitHandle.textContent = u.handle;
            portraitEmail.textContent = u.email;
        };
        apply();

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            errEl.textContent = '';
            okEl.textContent = '';
            const newHandle = handleEl.value.trim();
            if (newHandle.length < 2) { errEl.textContent = 'псевдоним короче 2 символов'; return; }
            window.store.updateMe({ handle: newHandle, bio: bioEl.value.trim() });
            okEl.textContent = 'сохранено.';
            apply();
            renderNavUser();
        });

        const list = $('#profile-ratings-list');
        const all = window.store.getAllRatings(me.email);
        list.innerHTML = ['math', 'phys', 'cs', 'chem'].map(s => `
            <li class="profile-rating-row">
                <span class="pr-subj">${window.store.SUBJECT_LABEL[s]}</span>
                <span class="pr-val">${all[s]}</span>
            </li>
        `).join('');

        const out = $('#profile-signout');
        if (out) out.addEventListener('click', () => {
            window.store.signOut();
            window.location.href = 'index.html';
        });
    }

    // ---------- MATCHMAKING ----------

    function bindMatchmaking() {
        const findBtn = $('#find-match');
        const overlay = $('#mm-overlay');
        const elapsed = $('#mm-elapsed');
        const cancel = $('#mm-cancel');
        const sub = overlay && overlay.querySelector('.mm-sub');
        if (!findBtn || !overlay) return;

        const fmt = (sec) => `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;

        const isOnlineMode = window.store._mode === 'supabase';

        let cancelToken = { cancelled: false };
        let fakeTimer = null;
        let fakeTimeout = null;

        const cancelMM = async () => {
            cancelToken.cancelled = true;
            if (fakeTimer) { clearInterval(fakeTimer); fakeTimer = null; }
            if (fakeTimeout) { clearTimeout(fakeTimeout); fakeTimeout = null; }
            overlay.classList.remove('show');
            // Если мы в supabase-режиме, на всякий случай выходим из очереди.
            try { if (isOnlineMode) await window.store._sb.rpc('tat_dequeue'); } catch (_) {}
        };

        findBtn.addEventListener('click', async () => {
            overlay.classList.add('show');
            elapsed.textContent = '00:00';
            cancelToken = { cancelled: false };

            if (isOnlineMode) {
                // Реальный матчмейкинг через очередь.
                if (sub) sub.textContent = 'ищем живого соперника...';
                const matchId = await window.store.findMatch({
                    subject: 'cs',
                    timeoutSec: 30,
                    cancelToken,
                    onProgress: (sec) => { elapsed.textContent = fmt(sec); },
                });
                if (cancelToken.cancelled) return;
                if (matchId) {
                    if (sub) sub.textContent = 'соперник найден!';
                    setTimeout(() => {
                        window.location.href = 'duel.html?match=' + encodeURIComponent(matchId);
                    }, 600);
                } else {
                    // Никто не нашёлся — играем с ботом.
                    if (sub) sub.textContent = 'никто не явился — выходит дуэль с ботом';
                    setTimeout(() => { window.location.href = 'duel.html'; }, 1200);
                }
            } else {
                // Локальный режим: сразу с ботом.
                let sec = 0;
                const target = 3 + Math.floor(Math.random() * 4);
                fakeTimer = setInterval(() => {
                    sec++; elapsed.textContent = fmt(sec);
                }, 1000);
                fakeTimeout = setTimeout(() => {
                    clearInterval(fakeTimer); fakeTimer = null;
                    window.location.href = 'duel.html';
                }, target * 1000);
            }
        });

        cancel.addEventListener('click', cancelMM);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('show')) cancelMM();
        });
    }

    // ---------- BOOT ----------

    async function boot() {
        if (!window.store) {
            console.error('[tat] store не подключён');
            return;
        }

        // 1. lifecycle: подтягиваем сессию из supabase / localStorage.
        if (typeof window.store.init === 'function') {
            try { await window.store.init(); }
            catch (e) { console.warn('[tat] store.init failed', e); }
        }

        // 2. Гейтинг: куда пустить юзера.
        const path = (window.location.pathname.split('/').pop() || 'index.html');
        const isPublic = path === 'index.html' || path === 'signup.html' || path === '';
        const me = window.store.getMe();

        // Залогинен, но открыл лендинг/регу — ведём в кабинет.
        if (isPublic && me) {
            window.location.href = 'cabinet.html';
            return;
        }
        // Не залогинен, но открыл приватную страницу — на лендинг.
        if (!isPublic && !me) {
            window.location.href = 'index.html';
            return;
        }

        highlightNav();
        renderNavUser();
        bindLogin();
        bindSignup();

        if (path === 'cabinet.html') {
            renderSubjects();
            renderHero();
            renderRecentMatches();
            bindMatchmaking();
        }
        if (path === 'archive.html')     renderFullArchive();
        if (path === 'leaderboard.html') renderLeaderboard();
        if (path === 'profile.html')     renderProfile();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
