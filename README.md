# ТЕТ-А-ТЕТ — клуб интеллектуальных дуэлей

Платформа для 1-на-1 дуэлей по информатике. Два игрока, пять кадров, кто быстрее напишет правильный код — забирает раунд.

**Live:** https://codepvp.ru (как только пропагнётся DNS)
**Default:** https://qri1.github.io/codepvp/

## Стек

- **Фронт:** ванильные HTML/CSS/JS, без сборки.
- **Шрифты:** Cormorant Garamond (антиква) + IBM Plex Mono.
- **Визуал:** костяной фон, oxblood-акцент, плёночное зерно, артхаус-аэстетика — два фехтующих мушкетёра в полный рост.
- **Бэкенд:** Supabase — Postgres + Auth + Realtime.
- **Исполнение кода:** Pyodide (Python в WebAssembly прямо в браузере).
- **Хостинг:** GitHub Pages.

## Геймплей

1. Регистрация по e-mail / пароль.
2. В кабинете — рейтинг по информатике, история дуэлей, табло.
3. Жмёшь «найти соперника» → 30 сек ищем в очереди живого игрока со схожим рейтингом → если не нашли, играешь с ботом.
4. Дуэль из 5 раундов, по 60 сек на каждый. Перед каждым — отсчёт 3-2-1.
5. На каждом кадре — задача 9 класса, надо написать функцию `solve()`. Прогон против набора тестов: все прошли → +1 балл.
6. У кого больше баллов после 5 раундов — выиграл. Elo-пересчёт автоматом.

## Архитектура

```
frontend/
  index.html       — лендинг + логин
  signup.html      — регистрация
  cabinet.html     — личный кабинет (рейтинг, история, найти матч)
  duel.html        — экран дуэли (мушкетёры, код-редактор)
  archive.html     — все матчи с фильтрами
  leaderboard.html — табло
  rules.html       — правила
  profile.html     — редактирование карточки

  config.js               — STORE_MODE + Supabase URL/key
  lib-store.js            — localStorage-стор (offline режим)
  lib-store-supabase.js   — Supabase-стор + онлайн-MM
  app.js                  — общая логика страниц
  duel.js                 — игровая логика, Pyodide-runner
  style.css               — единый стиль
```

## Supabase-схема

- `tat_profiles` — профили игроков
- `tat_ratings` — рейтинг + W/L/streak по дисциплине
- `tat_matches` — история матчей (включая live)
- `tat_queue` — очередь матчмейкинга
- `tat_tasks` — пул задач (зарезервирован под пайплайн)

RPC:
- `tat_enqueue` / `tat_dequeue` — управление очередью
- `tat_try_create_match` — атомарное создание матча из очереди
- `tat_save_solo_match` — финал бот-матча
- `tat_finish_pvp_match` — финал онлайн-матча (idempotent)

Все RLS-политики и RPC — в `supabase-migration.sql` + `supabase-migration-addendum.sql` + `supabase-online-mm.sql` (в корне репо).

## Запуск локально

```bash
git clone https://github.com/qri1/codepvp.git
cd codepvp
python3 -m http.server 5173
# открой http://localhost:5173
```

В `config.js` укажи свой Supabase (URL + anon key) или поставь `STORE_MODE: 'local'` чтобы всё работало в localStorage.

## Источники задач

- ФИПИ открытый банк (информатика)
- kpolyakov.spb.ru
- Решу ОГЭ / ЕГЭ (sdamgia)
- Учебник Босовой 9 класс

## Лицензия

MIT.
