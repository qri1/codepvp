// =========================================================
// ТЕТ-А-ТЕТ — Supabase-вариант стора.
// Активируется только если TAT_CONFIG.STORE_MODE === 'supabase'.
// Перезаписывает window.store, повторяя сигнатуру локального.
// =========================================================

(() => {
    if (!window.TAT_CONFIG || window.TAT_CONFIG.STORE_MODE !== 'supabase') return;
    if (!window.supabase || !window.supabase.createClient) {
        console.error('[tat] supabase-js не загружен — проверь <script src="...supabase-js@2..."> в HTML');
        return;
    }

    const SUBJECTS = ['math', 'phys', 'cs', 'chem'];
    const SUBJECT_LABEL = {
        math: 'математика',
        phys: 'физика',
        cs:   'информатика',
        chem: 'химия',
    };
    const DEFAULT_RATING = 1200;
    const SUBJ_KEY = 'tat_subject';

    // ---- Создаём клиент Supabase ----
    const sb = window.supabase.createClient(
        window.TAT_CONFIG.SUPABASE_URL,
        window.TAT_CONFIG.SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storageKey: 'tat-supabase-auth',
            },
        }
    );

    // ---- Кэш (синхронные геттеры читают отсюда) ----
    const cache = {
        me: null,                               // {id, auth_id, email, handle, bio}
        ratings: defaultRatings(),              // {math: 1200, ...}
        winsLossesStreak: defaultWLS(),         // {math: {wins, losses, streak}, ...}
        matches: [],                            // last 50 matches
        leaderboards: {},                       // {math: [...], phys: [...], ...}
    };

    function defaultRatings() {
        const r = {};
        SUBJECTS.forEach(s => { r[s] = DEFAULT_RATING; });
        return r;
    }
    function defaultWLS() {
        const w = {};
        SUBJECTS.forEach(s => { w[s] = { wins: 0, losses: 0, streak: 0 }; });
        return w;
    }

    // ---- INIT: вызывается из app.js до рендера. ----
    async function init() {
        const { data: sessionData } = await sb.auth.getSession();
        const session = sessionData && sessionData.session;
        if (!session) return;
        try {
            await hydrate(session.user);
        } catch (e) {
            console.warn('[tat] hydrate failed', e);
        }
    }

    async function hydrate(user) {
        // 1. profile
        const { data: profile, error: pe } = await sb
            .from('tat_profiles')
            .select('id, auth_id, handle, bio')
            .eq('auth_id', user.id)
            .maybeSingle();
        if (pe) throw pe;
        if (!profile) {
            // Триггер должен был его создать. Если нет — создаём вручную.
            const fallbackHandle = (user.user_metadata && user.user_metadata.handle)
                || (user.email || '').split('@')[0];
            const { data: created, error: ce } = await sb
                .from('tat_profiles')
                .insert({ auth_id: user.id, handle: fallbackHandle })
                .select()
                .single();
            if (ce) throw ce;
            cache.me = { ...created, email: user.email };
        } else {
            cache.me = { ...profile, email: user.email };
        }

        // 2. ratings (одной пачкой)
        const { data: ratings } = await sb
            .from('tat_ratings')
            .select('subject, rating, wins, losses, streak')
            .eq('user_id', cache.me.id);
        const r = defaultRatings();
        const w = defaultWLS();
        (ratings || []).forEach(row => {
            r[row.subject] = row.rating;
            w[row.subject] = { wins: row.wins, losses: row.losses, streak: row.streak };
        });
        cache.ratings = r;
        cache.winsLossesStreak = w;

        // 3. last matches
        const { data: matches } = await sb
            .from('tat_my_matches')
            .select('*')
            .or(`a_id.eq.${cache.me.id},b_id.eq.${cache.me.id}`)
            .order('finished_at', { ascending: false })
            .limit(50);
        cache.matches = (matches || []).map(rowToLocalMatch);
    }

    // Превращаем строку из tat_my_matches в формат, который ожидает app.js
    function rowToLocalMatch(row) {
        const me = cache.me;
        const iAmA = me && row.a_id === me.id;
        const myScore = iAmA ? row.a_score : row.b_score;
        const oppScore = iAmA ? row.b_score : row.a_score;
        const myDelta = iAmA ? row.a_delta : row.b_delta;
        const oppHandle = iAmA ? (row.b_handle || 'бот') : (row.a_handle || 'бот');
        return {
            id: row.id,
            ts: row.finished_at,
            email: me ? me.email : null,
            subject: row.subject,
            opponent: oppHandle,
            oppRating: 0, // на сервере не храним отдельно
            win: myScore > oppScore,
            score: { my: myScore, opp: oppScore },
            delta: myDelta,
        };
    }

    // ---------- AUTH ----------

    async function signUp({ email, handle, password }) {
        email = (email || '').trim().toLowerCase();
        handle = (handle || '').trim();
        if (!email.includes('@')) return { error: 'неверный e-mail' };
        if (handle.length < 2) return { error: 'псевдоним короче 2 символов' };
        if ((password || '').length < 4) return { error: 'пароль короче 4 символов' };

        const redirectTo = window.location.origin + '/cabinet.html';
        const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: {
                data: { handle },
                emailRedirectTo: redirectTo,
            },
        });
        if (error) return { error: error.message || 'ошибка регистрации' };

        // Если confirm email включён — сессии ещё нет, нужно подтверждение по почте.
        if (!data.session) {
            return { info: 'проверьте почту — пришло письмо с подтверждением. после клика по ссылке вернитесь и войдите.' };
        }

        await hydrate(data.user);
        return { user: cache.me };
    }

    async function signIn({ email, password }) {
        email = (email || '').trim().toLowerCase();
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message || 'ошибка входа' };
        await hydrate(data.user);
        return { user: cache.me };
    }

    function signOut() {
        // fire-and-forget — sync API из соображений совместимости с локальным стором
        sb.auth.signOut().catch(() => {});
        cache.me = null;
        cache.ratings = defaultRatings();
        cache.winsLossesStreak = defaultWLS();
        cache.matches = [];
    }

    function getMe() { return cache.me; }
    function requireMe() {
        if (!cache.me) {
            window.location.href = 'index.html';
            return null;
        }
        return cache.me;
    }

    async function updateMe(patch) {
        if (!cache.me) return null;
        const updates = {};
        if (patch.handle !== undefined) updates.handle = patch.handle;
        if (patch.bio !== undefined) updates.bio = patch.bio;
        const { data, error } = await sb
            .from('tat_profiles')
            .update(updates)
            .eq('id', cache.me.id)
            .select()
            .single();
        if (error) {
            console.warn('[tat] updateMe failed', error);
            return cache.me;
        }
        cache.me = { ...cache.me, ...data };
        return cache.me;
    }

    // ---------- RATINGS / STATS ----------

    function getRating(_email, subject) {
        return cache.ratings[subject] || DEFAULT_RATING;
    }
    async function setRating(_email, subject, value) {
        cache.ratings[subject] = Math.max(0, Math.round(value));
        if (!cache.me) return;
        await sb.from('tat_ratings').upsert({
            user_id: cache.me.id,
            subject,
            rating: cache.ratings[subject],
        }, { onConflict: 'user_id,subject' });
    }
    function getAllRatings() { return { ...cache.ratings }; }
    function getStats(_email, subject) {
        const s = subject || currentSubject();
        return cache.winsLossesStreak[s] || { wins: 0, losses: 0, streak: 0, lastDelta: 0 };
    }
    function bumpStats(_email, win, _delta) {
        // Обновляется в RPC tat_save_solo_match, здесь только локальный кэш.
        const s = currentSubject();
        const w = cache.winsLossesStreak[s];
        if (win) {
            w.wins += 1;
            w.streak = w.streak >= 0 ? w.streak + 1 : 1;
        } else {
            w.losses += 1;
            w.streak = w.streak <= 0 ? w.streak - 1 : -1;
        }
    }
    function computeDelta(myRating, oppRating, win, score) {
        const expected = 1 / (1 + Math.pow(10, (oppRating - myRating) / 400));
        const actual = win ? 1 : 0;
        let delta = 32 * (actual - expected);
        if (score) {
            const diff = score.my - score.opp;
            delta = delta * (0.9 + Math.max(-0.2, Math.min(0.2, diff * 0.06)));
        }
        return Math.round(delta);
    }

    // ---------- MATCHES ----------

    async function saveMatch(match) {
        const local = {
            id: 'm_' + Date.now().toString(36),
            ts: new Date().toISOString(),
            ...match,
        };
        cache.matches.unshift(local);
        cache.matches = cache.matches.slice(0, 50);

        if (!cache.me) return local;

        try {
            const { data, error } = await sb.rpc('tat_save_solo_match', {
                p_subject: match.subject,
                p_my_score: match.score.my,
                p_opp_score: match.score.opp,
                p_my_delta: match.delta,
                p_opp_name: match.opponent || 'бот',
                p_opp_rating: match.oppRating || 0,
            });
            if (error) {
                console.warn('[tat] saveMatch RPC failed', error);
            } else if (data) {
                local.id = data;
            }
        } catch (e) {
            console.warn('[tat] saveMatch failed', e);
        }
        return local;
    }

    function loadMatches(_email, limit) {
        return typeof limit === 'number' ? cache.matches.slice(0, limit) : cache.matches.slice();
    }

    // ---------- LEADERBOARD ----------

    async function leaderboard(subject, limit) {
        const cap = limit || 50;
        const { data, error } = await sb
            .from('tat_leaderboard')
            .select('handle, rating, profile_id')
            .eq('subject', subject)
            .order('rating', { ascending: false })
            .limit(cap);
        if (error) {
            console.warn('[tat] leaderboard failed', error);
            return [];
        }
        return (data || []).map(r => ({
            handle: r.handle,
            email: cache.me && cache.me.id === r.profile_id ? cache.me.email : null,
            rating: r.rating,
        }));
    }

    // ---------- MISC ----------

    function currentSubject() {
        try { return localStorage.getItem(SUBJ_KEY) || 'math'; }
        catch (_) { return 'math'; }
    }
    function setCurrentSubject(s) {
        try { localStorage.setItem(SUBJ_KEY, s); } catch (_) {}
    }

    // ---------- ONLINE MATCHMAKING ----------

    // Войти в очередь и ждать соперника. Возвращает Promise<matchId | null>.
    // onProgress(seconds) вызывается каждую секунду пока ищем.
    // cancelToken.cancelled — если true, аборт.
    async function findMatch({ subject = 'cs', timeoutSec = 30, onProgress, cancelToken } = {}) {
        cancelToken = cancelToken || {};
        if (!cache.me) return null;

        // 1. Войти в очередь.
        const { error: enqErr } = await sb.rpc('tat_enqueue', { p_subject: subject });
        if (enqErr) {
            console.warn('[tat] enqueue failed', enqErr);
            return null;
        }

        let matchId = null;
        let resolved = false;

        // 2. Подписка на новые матчи (если кто-то нас зацепил).
        const matchChan = sb.channel('tat-matches-' + cache.me.id)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'tat_matches',
            }, (payload) => {
                const m = payload.new;
                if (!m) return;
                if (m.status !== 'live') return;
                if (m.a_id === cache.me.id || m.b_id === cache.me.id) {
                    matchId = m.id;
                    resolved = true;
                }
            });
        await matchChan.subscribe();

        // 3. Активный поиск: каждые 1.5 сек смотрим в очереди подходящего соперника.
        const tryClaim = async () => {
            const myRating = cache.ratings[subject] || 1200;
            const { data: peers, error } = await sb
                .from('tat_queue')
                .select('user_id, rating')
                .eq('subject', subject)
                .neq('user_id', cache.me.id)
                .limit(20);
            if (error || !peers || !peers.length) return false;
            // Сортируем по близости рейтинга
            peers.sort((a, b) =>
                Math.abs(a.rating - myRating) - Math.abs(b.rating - myRating));
            for (const peer of peers) {
                const { data, error: e } = await sb.rpc('tat_try_create_match', {
                    peer_id: peer.user_id,
                });
                if (e) { console.warn('[tat] try_create_match', e); continue; }
                if (data) {
                    matchId = data;
                    resolved = true;
                    return true;
                }
            }
            return false;
        };

        // 4. Цикл: проверяем раз в 1.5 секунды или когда realtime говорит что есть новый матч.
        const startedAt = Date.now();
        await tryClaim();
        while (!resolved && !cancelToken.cancelled) {
            const elapsed = Math.floor((Date.now() - startedAt) / 1000);
            if (typeof onProgress === 'function') onProgress(elapsed);
            if (elapsed >= timeoutSec) break;
            await new Promise(r => setTimeout(r, 1500));
            if (resolved || cancelToken.cancelled) break;
            await tryClaim();
        }

        // 5. Cleanup: если ничего не вышло — выходим из очереди.
        try { await matchChan.unsubscribe(); } catch (_) {}
        if (!matchId) {
            try { await sb.rpc('tat_dequeue'); } catch (_) {}
        }
        return matchId;
    }

    // Получить детали live-матча (для duel.html?match=X).
    async function getMatch(matchId) {
        const { data, error } = await sb
            .from('tat_matches')
            .select('id, a_id, b_id, subject, status, a_score, b_score, finished_at')
            .eq('id', matchId)
            .maybeSingle();
        if (error) throw error;
        return data;
    }

    async function getProfileById(profileId) {
        const { data } = await sb
            .from('tat_profiles')
            .select('id, handle')
            .eq('id', profileId)
            .maybeSingle();
        return data;
    }

    // Канал realtime для конкретного матча (broadcast поверх WebSocket).
    function matchChannel(matchId) {
        return sb.channel('match:' + matchId, {
            config: { broadcast: { self: false, ack: true } },
        });
    }

    // Загрузить пул задач из БД (новый формат с tests). Возвращает [] если пусто.
    async function loadTaskPool(subject, limit) {
        const { data, error } = await sb
            .from('tat_tasks_v2')
            .select('id, tag, body, example, starter, tests')
            .eq('subject', subject || 'cs')
            .limit(limit || 100);
        if (error) {
            console.warn('[tat] loadTaskPool failed', error);
            return [];
        }
        return data || [];
    }

    async function finishPvpMatch(matchId, aScore, bScore) {
        const { data, error } = await sb.rpc('tat_finish_pvp_match', {
            p_match_id: matchId,
            p_a_score: aScore,
            p_b_score: bScore,
        });
        if (error) console.warn('[tat] finish_pvp_match failed', error);
        return !!data;
    }

    // ---------- EXPOSE ----------

    window.store = {
        SUBJECTS, SUBJECT_LABEL, DEFAULT_RATING,
        init,
        signUp, signIn, signOut,
        getMe, requireMe, updateMe,
        getRating, setRating, getAllRatings, getStats, bumpStats, computeDelta,
        saveMatch, loadMatches,
        leaderboard,
        currentSubject, setCurrentSubject,
        // online MM
        findMatch, getMatch, getProfileById, matchChannel, finishPvpMatch,
        // tasks
        loadTaskPool,
        _sb: sb,
        _mode: 'supabase',
    };
})();
