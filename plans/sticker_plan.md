# Plan: Archetype Sticker System

## 1. Objective

Replace the current "per-player signature sticker" system with an **archetype** sticker system:

- On registration, the user answers a short quiz (e.g. "Bron or MJ?", "Curry or Magic?", "Middy or 3?"). The answers decide their one **standard archetype** (Sniper, Slasher, Thinker, Bully).
- The new player owns their own archetype sticker at **Level 1**.
- When a match is confirmed, the winner gets sticker progression **only if the winner has never won a confirmed match with the current opponent before. If he has played the opponent before but he has only lost he will recieve progression**:
  - If the winner doesn't own the loser's archetype yet → it's **unlocked at Level 1**. The winner is sent to the **ball editor** to place it.
  - If the winner already owns it → that sticker's **level goes up by 1**, with no duplicate. The winner is sent to the **profile**.
- If the pair has played before, and the winner has already beaten the opponent in a previous match, the win gives **no sticker progression**. The winner is sent to the profile.

End state: registration requires an archetype, `player_stickers` has a `level`, matches record a `sticker_outcome`, and the frontend routes the winner based on that outcome.

---

## 2. Current State

### Backend (FastAPI + SQLAlchemy + Alembic, Postgres via `docker-compose.yml`)

- `backend/models/sticker.py`
  - `Sticker` is the catalog: `id, slug (unique), name, asset_uri, owner_player_id (unique FK players, SET NULL)`. `owner_player_id` marks a player's **signature** sticker.
  - `PlayerSticker` is ownership: `id, player_id, sticker_id, earned_at`, with `UniqueConstraint(player_id, sticker_id)` named `uq_player_stickers_owner_asset`. There's one row per owned sticker and no level.
  - `BallSticker` is placement on the ball (`u, v, scale, rotation, z_index`), 1:1 with `PlayerSticker`, `ondelete=CASCADE`.
- `backend/models/player.py`: `Player` has `id, name, password_hash, wins, losses, rating, qr_code` and `sticker_inventory` relationship.
- `backend/models/match.py`: `Match` has `status` (`pending` → `submitted` → `confirmed`), `winner_id`, `awarded_player_sticker_id` (FK `player_stickers.id`, SET NULL).
- `backend/services/auth.py::register_player` creates the player, then creates a signature `Sticker(slug=f"signature-{id}", owner_player_id=id, asset_uri="asset://og-sticker")` and appends a `PlayerSticker` for it. It commits once at the end.
- `backend/services/match.py::confirm_match` updates wins, losses and rating. It then looks up the loser's signature sticker (`Sticker.owner_player_id == loser.id`). If the winner doesn't own it, it calls `sticker_service.award_sticker(...)` and sets `db_match.awarded_player_sticker_id`.
  - Note: `award_sticker` in `backend/services/sticker.py` calls `db.commit()` itself, so it commits halfway through `confirm_match`'s unit of work. The new function must **not** commit.
- `backend/services/sticker.py`: `get_sticker_catalog`, `get_player_inventory`, `get_ball_stickers`, `award_sticker` (only caller is `confirm_match`), `place_sticker`, `remove_sticker_placement`.
- `backend/routes/auth.py`: `POST /auth/register` and `POST /auth/login` both take `AuthCredentials {name, password}` and return `TokenResponse`.
- `backend/routes/match.py`: `POST /matches/{id}/submit?id=<player_id>` and `POST /matches/{id}/confirm?id=<player_id>`. These use a query param, and auth is commented out. **Leave this as is.** `GET /matches/{id}` returns `MatchRead`.
- `backend/routes/sticker.py`: `GET /stickers/`, `GET /stickers/inventory` (auth), `GET /stickers/ball/{player_id}`, `PUT/DELETE /stickers/inventory/{player_sticker_id}/placement` (auth).
- Alembic head is **`b2d3e4f5g6h7`** (`add_match_awarded_sticker`). The chain is `7232fa0f199c → 12f4a9d0c3bd → 9a7e3d2c1b4f → c3f8a1d7e2b9 → e5b1d8a4f2c7 → a1c2d3e4f5g6 → b2d3e4f5g6h7`. Migration `e5b1d8a4f2c7` seeds a global `og-sticker` for all existing players. Migrations are hand-written, with raw SQL for data seeding.
- There are **no backend tests** in the repo. The venv is at `backend/.venv` and the DB driver is `psycopg2`.

### Frontend (Expo 54 / expo-router 6 / axios)

- `frontend/app/login.tsx`: name and password inputs. "Log In" calls `login`. "Create Player" calls `register` directly, then `router.replace('/profile')`. Errors show in `message`.
- `frontend/services/auth.ts`: `register(credentials: AuthCredentials)` posts `/auth/register` and stores the token.
- `frontend/services/stickers.ts`: types `StickerDefinition`, `BallStickerPlacement`, `OwnedSticker`, and API functions.
- `frontend/app/match/[id].tsx`: polls the match every 3 s. When `status === 'confirmed'` and `winner_id === profile.id`, it goes to `/ball-editor?playerStickerId=<awarded_player_sticker_id>` if that is non-null, otherwise to `/profile`. This covers both the winner-as-confirmer case and the winner-as-submitter case, which learns through polling.
- `frontend/app/ball-editor.tsx`: loads the inventory and picks the sticker by `playerStickerId`, falling back to `items[0]`. Drag-to-place calls `placeSticker`. "Done" **blocks** until the sticker is placed (Alert). Every sticker is drawn with `<OGSticker/>` whatever its slug.
- `frontend/app/profile.tsx`: shows placed stickers on `<Basketball/>` using `renderSticker` → `<OGSticker/>`. **This file has uncommitted local changes (swipe-up to `/qr-code`). Keep them.**
- `frontend/components/OGSticker.tsx` and `Basketball.tsx`. `react-native-svg` is already a dependency.
- `frontend/package.json` `lint` script: `eslint app constants services api.ts`. It does **not** cover `components/`.

---

## 3. Required Changes (file list)

### Backend

| File | Action | Summary |
|---|---|---|
| `backend/alembic/versions/d4e5f6a7b8c9_add_archetype_stickers.py` | **Create** | New columns, seed archetype stickers, remove signature stickers and `owner_player_id` |
| `backend/models/player.py` | Modify | Add `archetype_sticker_id` |
| `backend/models/sticker.py` | Modify | Remove `Sticker.owner_player_id`; add `PlayerSticker.level` |
| `backend/models/match.py` | Modify | Add `sticker_outcome` |
| `backend/schemas/auth.py` | Modify | Add `RegisterRequest(AuthCredentials)` with `archetype: str` |
| `backend/schemas/match.py` | Modify | Add `sticker_outcome: str \| None` to `MatchRead` |
| `backend/schemas/sticker.py` | Modify | Add `level: int` to `PlayerStickerRead` |
| `backend/services/sticker.py` | Modify | Add `ARCHETYPE_SLUGS`; replace `award_sticker` with `award_archetype_sticker` (no commit) |
| `backend/services/auth.py` | Modify | `register_player` validates the archetype, assigns it, and grants it at Lv 1; remove the signature sticker creation |
| `backend/services/match.py` | Modify | `confirm_match` uses first-meeting and archetype logic; add a `players_have_played_before` helper |
| `backend/routes/auth.py` | Modify | `register` takes `RegisterRequest` |

### Frontend

| File | Action | Summary |
|---|---|---|
| `frontend/constants/archetypes.ts` | **Create** | Archetype list, quiz questions, scoring function |
| `frontend/components/ArchetypeQuiz.tsx` | **Create** | One-question-at-a-time quiz UI, then a result step |
| `frontend/components/StickerArt.tsx` | **Create** | Draws the sticker art for a slug (OG sticker or archetype placeholder) |
| `frontend/services/auth.ts` | Modify | `register` requires `archetype` |
| `frontend/services/stickers.ts` | Modify | `OwnedSticker.level: number` |
| `frontend/app/login.tsx` | Modify | "Create Player" → quiz step → register |
| `frontend/app/match/[id].tsx` | Modify | `Match.sticker_outcome`; route on `'unlocked'` only |
| `frontend/app/ball-editor.tsx` | Modify | Use `StickerArt` by slug; let the user skip placement |
| `frontend/app/profile.tsx` | Modify | Use `StickerArt` by slug (keep the uncommitted swipe changes) |

Nothing gets deleted. `OGSticker.tsx` stays because `StickerArt` still uses it for `og-sticker`.

---

## 4. Data / Backend Changes

### 4.1 Archetype definitions (decision)

There are four archetypes. The slug is the source of truth in both backend and frontend:

| slug | name | asset_uri |
|---|---|---|
| `sniper` | Sniper | `asset://archetype-sniper` |
| `slasher` | Slasher | `asset://archetype-slasher` |
| `thinker` | Thinker | `asset://archetype-thinker` |
| `bully` | Bully | `asset://archetype-bully` |

> **Assumption:** The user gave "Sniper, Slasher, Thinker" as examples. "Bully" (as in bully-ball / post power) is added to make four balanced archetypes. Renaming or adding an archetype later means a seed migration plus updates to `ARCHETYPE_SLUGS` and `frontend/constants/archetypes.ts`.

The archetypes are rows in the existing `stickers` table, so the catalog, inventory, placement and ball endpoints all keep working unchanged.

### 4.2 Migration `d4e5f6a7b8c9_add_archetype_stickers.py`

Follow the style of the existing hand-written migrations (`revision`/`down_revision` typed header, `op.add_column`, raw `op.execute` SQL for data).

- `revision = "d4e5f6a7b8c9"`, `down_revision = "b2d3e4f5g6h7"`.

`upgrade()` in this order:
1. `op.add_column("player_stickers", sa.Column("level", sa.Integer(), nullable=False, server_default="1"))`
2. `op.add_column("matches", sa.Column("sticker_outcome", sa.String(), nullable=True))`
3. Seed the archetypes:
   ```sql
   INSERT INTO stickers (slug, name, asset_uri) VALUES
     ('sniper','Sniper','asset://archetype-sniper'),
     ('slasher','Slasher','asset://archetype-slasher'),
     ('thinker','Thinker','asset://archetype-thinker'),
     ('bully','Bully','asset://archetype-bully')
   ON CONFLICT (slug) DO NOTHING
   ```
4. `op.add_column("players", sa.Column("archetype_sticker_id", sa.Integer(), nullable=True))` plus `op.create_foreign_key("fk_players_archetype_sticker_id_stickers", "players", "stickers", ["archetype_sticker_id"], ["id"], ondelete="SET NULL")`.
5. Remove the signature sticker system (see the decision note below):
   ```sql
   DELETE FROM player_stickers
   WHERE sticker_id IN (SELECT id FROM stickers WHERE owner_player_id IS NOT NULL)
   ```
   `ball_stickers` rows cascade (FK `ondelete=CASCADE`). `matches.awarded_player_sticker_id` becomes NULL (FK `ondelete=SET NULL`).
   ```sql
   DELETE FROM stickers WHERE owner_player_id IS NOT NULL
   ```
   Then `op.drop_index(op.f("ix_stickers_owner_player_id"), table_name="stickers")`, `op.drop_constraint("fk_stickers_owner_player_id_players", "stickers", type_="foreignkey")`, `op.drop_column("stickers", "owner_player_id")`.

`downgrade()` in reverse:
1. Re-add `stickers.owner_player_id` (Integer, nullable), FK `fk_stickers_owner_player_id_players` (SET NULL), and unique index `ix_stickers_owner_player_id`. Signature data is **not** restored.
2. Drop FK `fk_players_archetype_sticker_id_stickers` and column `players.archetype_sticker_id`.
3. `DELETE FROM player_stickers WHERE sticker_id IN (SELECT id FROM stickers WHERE slug IN ('sniper','slasher','thinker','bully'))`, then `DELETE FROM stickers WHERE slug IN (...)`.
4. Drop `matches.sticker_outcome` and `player_stickers.level`.

> **Decision (destructive to dev data):** Existing signature stickers ("<name>'s Sticker"), and any placements of them, are deleted. The new rule ("winner gets the loser's *archetype*") replaces them, and keeping them would leave dead stickers on balls plus an unused model column. The global `og-sticker` is **kept untouched**.

> **Existing players:** `archetype_sticker_id` stays `NULL` for players created before this change. Beating such a player gives no sticker (see 4.5). Retroactive quizzes for existing accounts are out of scope. For manual testing, register new players.

### 4.3 Models

- `backend/models/sticker.py`
  - `Sticker`: **remove** the `owner_player_id` column. Also drop `ForeignKey` from the imports if nothing else in the file uses it. `PlayerSticker` and `BallSticker` still use it, so keep the import.
  - `PlayerSticker`: add `level = Column(Integer, nullable=False, default=1, server_default="1")`.
- `backend/models/player.py`: add
  ```python
  archetype_sticker_id = Column(
      Integer, ForeignKey("stickers.id", ondelete="SET NULL"), nullable=True
  )
  ```
  Add `ForeignKey` to the imports. No relationship is needed.
- `backend/models/match.py`: add `sticker_outcome = Column(String, nullable=True)  # unlocked, leveled_up`. Place it next to `awarded_player_sticker_id`.

### 4.4 Schemas

- `backend/schemas/auth.py`:
  ```python
  class RegisterRequest(AuthCredentials):
      archetype: str
  ```
  Login keeps using `AuthCredentials`.
- `backend/schemas/match.py` `MatchRead`: add `sticker_outcome: str | None`.
- `backend/schemas/sticker.py` `PlayerStickerRead`: add `level: int`.
- `PlayerRead` is **unchanged**. Showing the archetype on the profile is out of scope.

### 4.5 Services

**`backend/services/sticker.py`**

- Add a module constant:
  ```python
  ARCHETYPE_SLUGS = ("sniper", "slasher", "thinker", "bully")
  ```
- **Replace** `award_sticker` with the function below. Its only caller is `confirm_match`.
  ```python
  def award_archetype_sticker(db: Session, player_id: int, sticker_id: int):
      owned_sticker = (
          db.query(PlayerSticker)
          .filter(PlayerSticker.player_id == player_id, PlayerSticker.sticker_id == sticker_id)
          .first()
      )
      if owned_sticker is not None:
          owned_sticker.level += 1
          return owned_sticker, "leveled_up"

      owned_sticker = PlayerSticker(player_id=player_id, sticker_id=sticker_id, level=1)
      db.add(owned_sticker)
      db.flush()
      return owned_sticker, "unlocked"
  ```
  It must **not** call `db.commit()`, because the caller owns the transaction. `db.flush()` assigns `owned_sticker.id`.
- `get_player_inventory` needs no change. `level` comes through automatically because `PlayerStickerRead` uses `from_attributes`.

**`backend/services/auth.py::register_player(db, credentials: RegisterRequest)`**

1. Keep the existing duplicate-name check first.
2. Validate the archetype:
   ```python
   if credentials.archetype not in sticker_service.ARCHETYPE_SLUGS:
       raise HTTPException(status_code=400, detail="Invalid archetype")
   archetype_sticker = db.query(Sticker).filter(Sticker.slug == credentials.archetype).first()
   if archetype_sticker is None:
       raise HTTPException(status_code=400, detail="Invalid archetype")
   ```
   Import `from services import sticker as sticker_service`, the same way `services/match.py` does.
3. Create `Player(..., archetype_sticker_id=archetype_sticker.id)`.
4. `player.sticker_inventory.append(PlayerSticker(sticker=archetype_sticker))`. Level defaults to 1.
5. **Delete** the `signature_sticker = Sticker(...)` block and its `db.flush()`. Keep one `db.commit()` and `db.refresh(player)`.
6. Update the import to `from schemas.auth import AuthCredentials, RegisterRequest`. `login_player` still uses `AuthCredentials`.

> **Assumption:** A player owns their own archetype at Lv 1 from the start. This mirrors today's behavior of granting your own signature sticker. So beating a first-time opponent who shares your archetype **levels up** your own sticker. It is not auto-placed on the ball, which matches current behavior.

**`backend/services/match.py`**

- Add a helper near `player_has_active_match`:
  ```python
  def players_have_played_before(db: Session, player_a_id: int, player_b_id: int, exclude_match_id: int):
      return (
          db.query(Match.id)
          .filter(
              Match.status == "confirmed",
              Match.id != exclude_match_id,
              ((Match.playerOne_id == player_a_id) & (Match.playerTwo_id == player_b_id))
              | ((Match.playerOne_id == player_b_id) & (Match.playerTwo_id == player_a_id)),
          )
          .first()
          is not None
      )
  ```
  "Played before" means **any earlier confirmed match between the pair, in either order and with either result**. Pending or submitted matches don't count, and only one active match per player can exist anyway.
- In `confirm_match`, **replace** the whole `signature_sticker = ...` block (from the query through `db_match.awarded_player_sticker_id = owned.id`) with:
  ```python
  if (
      loser.archetype_sticker_id is not None
      and not players_have_played_before(db, winner.id, loser.id, db_match.id)
  ):
      owned, outcome = sticker_service.award_archetype_sticker(
          db, winner.id, loser.archetype_sticker_id
      )
      db_match.awarded_player_sticker_id = owned.id
      db_match.sticker_outcome = outcome
  ```
  Leave everything else in `confirm_match` as is: wins, losses, rating, status, timestamps and the single final `db.commit()`.
- Remove the now-unused imports `from models.sticker import PlayerSticker, Sticker`.

### 4.6 Routes

- `backend/routes/auth.py`: `def register(credentials: RegisterRequest, ...)` and import `RegisterRequest`. No other route changes.

### 4.7 API contract after the change

`POST /auth/register`
```json
// request
{ "name": "ann", "password": "pw", "archetype": "sniper" }
// 200 → TokenResponse (unchanged shape)
// 400 {"detail": "Invalid archetype"} if slug unknown
// 400 {"detail": "A player with that name already exists"}
// 422 if archetype missing (Pydantic)
```

`GET /matches/{id}` / `POST /matches/{id}/confirm` → `MatchRead` gains:
```json
{ "...": "...", "awarded_player_sticker_id": 12 | null, "sticker_outcome": "unlocked" | "leveled_up" | null }
```
- `unlocked`: `awarded_player_sticker_id` = the new `PlayerSticker.id`
- `leveled_up`: `awarded_player_sticker_id` = the existing `PlayerSticker.id` whose level went up
- `null`: no progression (rematch, loser has no archetype, or match not confirmed)

`GET /stickers/inventory` → each item gains `"level": <int>`.

### 4.8 Auth implications

- Registration is still public, and the archetype is client-supplied but validated against the whitelist. This is acceptable because the archetype is a self-described play style, not a privilege.
- No change to the existing (commented-out) auth on submit and confirm. That is a pre-existing gap and out of scope.

---

## 5. Frontend Changes

### 5.1 `frontend/constants/archetypes.ts` (new)

```ts
export type ArchetypeSlug = 'sniper' | 'slasher' | 'thinker' | 'bully';

export const ARCHETYPES: { slug: ArchetypeSlug; name: string; color: string; description: string }[] = [
  { slug: 'sniper',  name: 'Sniper',  color: '#2563EB', description: 'Lives beyond the arc.' },
  { slug: 'slasher', name: 'Slasher', color: '#DC2626', description: 'Attacks the rim.' },
  { slug: 'thinker', name: 'Thinker', color: '#7C3AED', description: 'Wins with IQ.' },
  { slug: 'bully',   name: 'Bully',   color: '#EA580C', description: 'Plays through contact.' },
];

export type QuizQuestion = {
  prompt: string;
  options: [{ label: string; archetype: ArchetypeSlug }, { label: string; archetype: ArchetypeSlug }];
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  { prompt: 'Bron or MJ?',              options: [{ label: 'Bron', archetype: 'bully' },      { label: 'MJ', archetype: 'slasher' }] },
  { prompt: 'Curry or Magic?',          options: [{ label: 'Curry', archetype: 'sniper' },    { label: 'Magic', archetype: 'thinker' }] },
  { prompt: 'Middy or 3?',              options: [{ label: 'Middy', archetype: 'slasher' },   { label: '3', archetype: 'sniper' }] },
  { prompt: 'Post up or pull up?',      options: [{ label: 'Post up', archetype: 'bully' },   { label: 'Pull up', archetype: 'sniper' }] },
  { prompt: 'Dunk or dime?',            options: [{ label: 'Dunk', archetype: 'slasher' },    { label: 'Dime', archetype: 'thinker' }] },
  { prompt: 'Shaq or Jokić?',           options: [{ label: 'Shaq', archetype: 'bully' },      { label: 'Jokić', archetype: 'thinker' }] },
];

// Highest tally wins; ties go to whichever archetype appears first in ARCHETYPES.
export function getArchetypeFromAnswers(answers: ArchetypeSlug[]): ArchetypeSlug { ... }

export function getArchetype(slug: string) {
  return ARCHETYPES.find((archetype) => archetype.slug === slug) ?? null;
}
```
Each archetype appears exactly 3 times across the 6 questions, and every pair of archetypes meets once. The exact wording of the questions and descriptions is an **assumption** and can be tuned freely.

### 5.2 `frontend/components/ArchetypeQuiz.tsx` (new)

Props: `{ onComplete: (archetype: ArchetypeSlug) => void; onCancel: () => void; isSubmitting: boolean; errorMessage: string }`.

- Internal state: `answers: ArchetypeSlug[]`. The question index is `answers.length`.
- **Question step** (`answers.length < QUIZ_QUESTIONS.length`): show "Question N of 6", the prompt in large text, and two full-width `Pressable` option buttons. Tapping one appends to `answers`. A "Back" text button pops the last answer, or calls `onCancel()` on the first question.
- **Result step**: compute `getArchetypeFromAnswers(answers)` and show "You're a {name}" plus the description, a sticker preview via `<StickerArt slug=... />` inside a ~120px square `View`, a primary "Create Player" button that calls `onComplete(slug)` (disabled with "Creating..." while `isSubmitting`), a "Retake" button that resets `answers`, and `errorMessage` in red if set.
- Styling: reuse the colors, radii and button styles from `login.tsx` (`#111827` primary button, `#F8FAFC` background, radius 8, minHeight 52, fontWeight '800'). Use `StyleSheet.create`.

### 5.3 `frontend/components/StickerArt.tsx` (new)

```tsx
type Props = { slug: string };
export function StickerArt({ slug }: Props)
```
- `og-sticker`, or any slug not in `ARCHETYPES`, returns `<OGSticker height="100%" width="100%" />`.
- An archetype slug returns an `Svg` (`react-native-svg`, already installed) with `viewBox="0 0 100 100"`, `height="100%"`, `width="100%"`. It contains a `Circle` (cx 50, cy 50, r 46, fill `archetype.color`, stroke black, strokeWidth 3) and a centered `Text` (from `react-native-svg`, `textAnchor="middle"`, white, bold, fontSize ~16) showing `archetype.name.toUpperCase()`.
- This art is a **placeholder** until real artwork exists. Don't add image assets or dependencies.

### 5.4 `frontend/services/auth.ts`

- Add `import type { ArchetypeSlug } from '@/constants/archetypes';`
- Add `type RegisterRequest = AuthCredentials & { archetype: ArchetypeSlug };`
- Change `register(credentials: RegisterRequest)`. Body unchanged (posts the whole object).

### 5.5 `frontend/services/stickers.ts`

- `OwnedSticker`: add `level: number;`.

### 5.6 `frontend/app/login.tsx`

- Add state `const [step, setStep] = useState<'credentials' | 'quiz'>('credentials');`
- Split `handleAuth`:
  - "Log In" behaves as today (`login` → `/profile`).
  - "Create Player": validate that name and password are non-empty, same message as today, then `setMessage('')` and `setStep('quiz')`. **Don't call the API yet.**
  - `async function handleQuizComplete(archetype: ArchetypeSlug)`: `setIsLoading(true)`, `await register({ name: name.trim(), password, archetype })`, then `router.replace('/profile')`. On error, `setMessage('Registration failed.')` and `setStep('credentials')` so the user can change the name (a duplicate name is the likely cause). Finally `setIsLoading(false)`.
- When `step === 'quiz'`, render inside the same `SafeAreaView`:
  `<ArchetypeQuiz onComplete={handleQuizComplete} onCancel={() => setStep('credentials')} isSubmitting={isLoading} errorMessage={message} />`
  Otherwise render the existing form unchanged.

### 5.7 `frontend/app/match/[id].tsx`

- `Match` type: add `sticker_outcome: 'unlocked' | 'leveled_up' | null;`
- In the confirm-navigation `useEffect`, change the condition to:
  ```ts
  if (match.sticker_outcome === 'unlocked' && match.awarded_player_sticker_id != null) {
    router.replace({ pathname: '/ball-editor', params: { playerStickerId: String(match.awarded_player_sticker_id) } });
  } else {
    router.replace('/profile');
  }
  ```
  `leveled_up` and `null` both go to the profile. Nothing else changes; polling, `hasNavigatedOnConfirmRef` and the loser behavior stay the same.

### 5.8 `frontend/app/ball-editor.tsx`

- Replace the `OGSticker` import with `StickerArt`.
- `renderSticker(placement)` → `<StickerArt slug={placement.sticker.slug} />`.
- Dragged sticker (currently `<OGSticker height="100%" width="100%" />` inside the pan view) → `<StickerArt slug={ownedSticker.sticker.slug} />`.
- `handleDone`: the spec says the winner has the *option* to place it. When `ownedSticker && !isPlaced`, show:
  ```ts
  Alert.alert('Place your sticker?', 'Your new sticker is saved to your collection. You can place it on your ball now or skip.', [
    { text: 'Keep editing', style: 'cancel' },
    { text: 'Skip', onPress: () => router.replace('/profile') },
  ]);
  ```
  Otherwise `router.replace('/profile')` as today.
- Status text `'Drag your new sticker onto your ball'` can stay.

### 5.9 `frontend/app/profile.tsx`

- Replace the `OGSticker` import with `StickerArt`. `renderSticker(placement)` → `<StickerArt slug={placement.sticker.slug} />` (rename `_placement` to `placement`).
- **Do not touch** the uncommitted `PanResponder` / `/qr-code` swipe code.

### 5.10 UI states summary

- Quiz: question and result steps; the submitting state disables the button; a register error returns to the credentials form with a message.
- Match screen: unchanged loading and error handling; navigation now depends on `sticker_outcome`.
- Ball editor: existing loading, "Could not load sticker", and "No sticker to place" states are unchanged; skip is now allowed.
- Profile: an empty ball renders fine (existing behavior).

---

## 6. Implementation Order

1. **Models**: edit `models/sticker.py` (remove `owner_player_id`, add `level`), `models/player.py` (`archetype_sticker_id`), `models/match.py` (`sticker_outcome`).
2. **Migration**: create `alembic/versions/d4e5f6a7b8c9_add_archetype_stickers.py` per §4.2.
3. **Apply the migration**: `docker compose up -d` (from the repo root), then `cd backend && .venv/bin/alembic upgrade head`. Check with `.venv/bin/alembic current`, which should print `d4e5f6a7b8c9 (head)`. Then test the downgrade: `.venv/bin/alembic downgrade -1 && .venv/bin/alembic upgrade head`.
4. **Schemas**: `schemas/auth.py`, `schemas/match.py`, `schemas/sticker.py`.
5. **Sticker service**: add `ARCHETYPE_SLUGS`; replace `award_sticker` with `award_archetype_sticker`.
6. **Auth service and route**: `register_player` per §4.5; `routes/auth.py` uses `RegisterRequest`.
7. **Match service**: add `players_have_played_before`; replace the signature block in `confirm_match`; clean up imports.
8. **Backend smoke check**: `cd backend && .venv/bin/python -c "import main"`, then run the API and do the curl scenario in §8.2.
9. **Frontend constants**: create `constants/archetypes.ts`.
10. **Frontend services**: `services/auth.ts`, `services/stickers.ts`.
11. **StickerArt component**: create `components/StickerArt.tsx`; switch `profile.tsx` and `ball-editor.tsx` to it.
12. **Quiz**: create `components/ArchetypeQuiz.tsx`; wire it into `login.tsx`.
13. **Match navigation**: update `app/match/[id].tsx`.
14. **Ball editor skip**: update `handleDone`.
15. **Type check and lint** (§8.1), then the manual app flow (§8.3).

---

## 7. Edge Cases and Constraints

- **Rematch after a loss.** A loses to B on their first meeting, then beats B later. B already played A, so there's no progression. `players_have_played_before` counts any earlier confirmed match, whatever the winner.
- **Same archetype as yourself.** A Sniper beats a first-time Sniper opponent. They already own `sniper` from registration, so it's `leveled_up` and they go to the profile.
- **Two different first-time opponents with the same archetype.** The first gives `unlocked` (Lv 1) and the second gives `leveled_up` (Lv 2). No duplicate row appears, which is enforced by the existing `uq_player_stickers_owner_asset` constraint.
- **Loser has no archetype** (legacy player, `archetype_sticker_id IS NULL`). No progression, `sticker_outcome = null`, and the winner goes to the profile.
- **Loser's archetype sticker row deleted.** The FK `SET NULL` makes this the same as the case above.
- **Transaction integrity.** `award_archetype_sticker` must not commit. All `confirm_match` writes (stats, rating, sticker, match status) commit together in the existing single `db.commit()`.
- **Winner is the submitter.** They learn the outcome by polling `GET /matches/{id}`, which is why `sticker_outcome` is persisted on the match instead of only being returned by `/confirm`.
- **Loser screen.** No navigation change. They stay on the "Match complete" card, as today.
- **Invalid or missing archetype on register.** Unknown slug → 400 "Invalid archetype"; missing field → 422. The frontend quiz always sends a valid slug.
- **Duplicate name.** This is only discovered after the quiz. The frontend returns to the credentials step showing "Registration failed." That's acceptable for the MVP.
- **Double-confirm race.** Two simultaneous `/confirm` calls could both pass the status check. This is a **pre-existing** issue that affects wins and rating too. It's out of scope; don't add locking.
- **Existing `awarded_player_sticker_id` on old matches** pointing at deleted signature stickers is set to NULL by the FK. Old confirmed matches have `sticker_outcome = NULL`, and the frontend treats that as "go to profile".
- **Legacy `og-sticker`.** Kept, still renders via `StickerArt` fallback, and is never awarded by matches.

### Out of scope

- Retroactive archetype quiz for existing players, or re-taking the quiz or changing archetype after registration.
- Showing the archetype or sticker levels on the profile or in the ball editor. `level` is exposed in the API only.
- Final sticker artwork; the placeholder circles are temporary.
- Dispute flow, auth on submit and confirm, QR scanning changes, backend test infrastructure.
- Any change to rating or ELO logic.

---

## 8. Verification

There is no automated test suite in the repo. Verify with the checks below and report exactly which ones were run.

### 8.1 Static checks

```bash
# backend imports cleanly
cd backend && .venv/bin/python -c "import main"
# migration head
cd backend && .venv/bin/alembic current        # → d4e5f6a7b8c9 (head)
cd backend && .venv/bin/alembic downgrade -1 && .venv/bin/alembic upgrade head

# frontend
cd frontend && npx tsc --noEmit
cd frontend && npm run lint
cd frontend && npx eslint components           # lint script doesn't cover components/
```
All of these must pass with no new errors.

### 8.2 Backend API flow (curl against `uvicorn main:app` in `backend/`)

Start with `cd backend && .venv/bin/uvicorn main:app --port 8000`. Use a unique name prefix per run, e.g. `t$(date +%s)`.

1. Register **A** (`sniper`), **B** (`slasher`), **C** (`slasher`), **D** (`sniper`), **E** (`thinker`) with `POST /auth/register`. Save each token, `user.id` and `user.qr_code`.
2. `POST /auth/register` with `"archetype": "wizard"` → **400**. Without `archetype` → **422**.
3. `GET /stickers/inventory` as A → exactly one item: slug `sniper`, `level: 1`.
4. **Unlock:** A challenges B (`POST /matches/challenge` with A's token, `{"opp_qr": B.qr}`). Then `POST /matches/{id}/submit?id=A` with `{"winner_id": A, "playerOne_score": 11, "playerTwo_score": 5}`, then `POST /matches/{id}/confirm?id=B`. The response should have `sticker_outcome == "unlocked"` and `awarded_player_sticker_id` set. A's inventory now has `slasher` Lv 1.
5. **Rematch, no progression:** A vs B again, A wins, confirm → `sticker_outcome == null`. A's `slasher` is still Lv 1.
6. **Level up, new opponent with an owned archetype:** A beats C (slasher) → `"leveled_up"`, and A's `slasher` is Lv 2 with still only one slasher row.
7. **Same archetype as own:** A beats D (sniper) → `"leveled_up"`, and A's `sniper` is Lv 2.
8. **First meeting lost, then won:** E beats A (A has now played E). Check that E gets `"unlocked"` sniper, since it's E's first meeting with A. Then A beats E → `sticker_outcome == null`.
9. **Winner is the confirmer:** B vs D, B submits that D won, D confirms → the response shows D's progression (`unlocked` slasher).
10. `GET /matches/{id}` for the match in step 4 returns `sticker_outcome: "unlocked"`, which is what the polling path relies on.
11. `PUT /stickers/inventory/{awarded_player_sticker_id}/placement` as A with `{"u":0.5,"v":0.5}` → 200. `GET /stickers/ball/{A.id}` shows the `slasher` sticker.

### 8.3 Manual app flow (Expo dev build, two devices or simulators)

1. Create Player → quiz shows 6 questions one at a time; Back works; the result step shows the archetype; "Create Player" lands on the profile.
2. Register a second player; challenge them and play a match with a first-time opponent. The winner, whether submitter or confirmer, is taken to the **ball editor** with the opponent's archetype art. Dragging it onto the ball saves it; Done → profile shows it. Or Done without placing → "Skip" → profile.
3. Rematch the same two players; the winner goes straight to the **profile**.
4. Beat a new opponent whose archetype you already own → straight to the **profile**. Check via `/stickers/inventory` or the DB that the level went up.
5. Log In still works for existing accounts; the profile renders legacy `og-sticker` placements.

### 8.4 Definition of done

- Migration applies and rolls back cleanly on the local Postgres.
- `tsc --noEmit` and eslint pass for all changed frontend files.
- Every step in §8.2 behaves as described.
- The manual flow in §8.3 routes the winner correctly for `unlocked`, `leveled_up` and rematch.
- The summary to the user states which checks were run and which were not (e.g. if a second device wasn't available).

---

## 9. Final Worker Checklist

- [ ] `models/sticker.py`: remove `Sticker.owner_player_id`, add `PlayerSticker.level`
- [ ] `models/player.py`: add `archetype_sticker_id` FK → `stickers.id` (SET NULL)
- [ ] `models/match.py`: add `sticker_outcome`
- [ ] Create migration `d4e5f6a7b8c9_add_archetype_stickers.py` (down_revision `b2d3e4f5g6h7`) with upgrade and downgrade per §4.2
- [ ] `alembic upgrade head`, `downgrade -1`, `upgrade head` all succeed
- [ ] `schemas/auth.py`: `RegisterRequest`; `schemas/match.py`: `sticker_outcome`; `schemas/sticker.py`: `level`
- [ ] `services/sticker.py`: `ARCHETYPE_SLUGS`; `award_sticker` → `award_archetype_sticker` (no commit, returns `(owned, outcome)`)
- [ ] `services/auth.py`: validate archetype, set `archetype_sticker_id`, grant own archetype Lv 1, remove signature sticker code
- [ ] `routes/auth.py`: register takes `RegisterRequest`
- [ ] `services/match.py`: `players_have_played_before`; new award block in `confirm_match`; remove unused imports
- [ ] Backend curl scenario §8.2 passes
- [ ] `constants/archetypes.ts`: archetypes, 6 questions, `getArchetypeFromAnswers`, `getArchetype`
- [ ] `components/StickerArt.tsx`: OG fallback plus placeholder archetype art
- [ ] `components/ArchetypeQuiz.tsx`: question and result steps
- [ ] `services/auth.ts`: `register` requires `archetype`; `services/stickers.ts`: `level`
- [ ] `app/login.tsx`: Create Player → quiz → register
- [ ] `app/match/[id].tsx`: navigate to the ball editor only when `sticker_outcome === 'unlocked'`
- [ ] `app/ball-editor.tsx`: `StickerArt` by slug; Skip option in `handleDone`
- [ ] `app/profile.tsx`: `StickerArt` by slug; uncommitted swipe code preserved
- [ ] `npx tsc --noEmit`, `npm run lint`, `npx eslint components` all pass
- [ ] Manual app flow §8.3 done (or explicitly reported as not done)
- [ ] Report what was and wasn't verified
