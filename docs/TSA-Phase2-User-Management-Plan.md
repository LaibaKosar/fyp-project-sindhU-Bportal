# TSA Dashboard – Phase 2: Live User Management Integration

**Goal:** Replace mock data in the User Management module with real-time data from the Supabase `profiles` table and enable administrative actions (reset setup, change role, lock/unlock). Do not apply changes until the technical approach is approved.

---

## 1. Live Data Fetching

### 1.1 State and data shape

- **State in TSADashboard.jsx:**
  - `users` – array of profile rows (replace `MOCK_USERS` usage in the User Management section only).
  - `usersLoading` – boolean for initial load and refresh.
  - `usersError` – optional string for fetch error message (e.g. show inline or in toast).

- **Data shape per row:** Map from Supabase to a consistent shape used by the table:
  - `id` (UUID)
  - `full_name` (from `profiles.full_name`, or empty string if null)
  - `email` (from `profiles.email`; if your schema stores email only in `auth.users`, you will need a trigger or backend to expose it on `profiles`, or fetch via backend)
  - `role`
  - `university_id` (nullable)
  - `university_name` – resolved from `universities.name` when `university_id` is set (see below)
  - `is_setup_complete` (boolean)
  - `is_locked` (boolean; default `false` if column was added with default)

### 1.2 Supabase query

- **Primary query:** Fetch all profiles with the columns you need:
  ```js
  supabase
    .from('profiles')
    .select('id, full_name, email, role, university_id, is_setup_complete, is_locked')
    .order('created_at', { ascending: false })
  ```
- **University name:** Either:
  - **Option A:** Add a foreign-key relation in the select so Supabase returns the related row:
    ```js
    .select('id, full_name, email, role, university_id, is_setup_complete, is_locked, universities(name)')
    ```
    Then map `universities` to `university_name` (e.g. `row.universities?.name ?? '—'`).
  - **Option B:** Fetch `universities` once (e.g. `id`, `name`), store in state, and when rendering the table look up name by `user.university_id`. Prefer Option A if your RLS allows it.

### 1.3 useEffect for fetch

- **When:** On mount and whenever the User Management module is relevant (e.g. when `activeModule === 'users'`), or always on mount so data is ready when the user switches to the tab.
- **Implementation:**
  - Set `usersLoading = true`, clear `usersError`.
  - In `try/catch`: run the Supabase query above; on success map rows to the table shape (including `university_name`); `setUsers(mapped)`; on error `setUsersError(error.message)` and optionally `showToast(error.message, 'error')`.
  - In `finally`: set `usersLoading = false`.
- **Dependencies:** Empty array `[]` if you only fetch on mount and rely on “Refresh” for re-fetch; or include a `refreshKey` state that you increment when the user clicks Refresh.

### 1.4 Table display

- **When `usersLoading`:** Show a single loading row or a spinner in the table body (e.g. “Loading users…”).
- **When `usersError`:** Show the message above or inside the table (e.g. “Failed to load users. Try Refresh.”).
- **When `users` is empty and not loading:** Show “No users found.”
- **Otherwise:** Render one row per `user` with: Full name, Email, Role (badge), University (name or “—”), Setup complete (Yes/No), Locked (Yes/No), Actions (buttons as below). Use `user.id` as the row key.

---

## 2. Reset Setup

- **Button:** Only show “Reset setup” for users where `role === 'UFP'` (same as Phase 1).
- **Click handler:**
  - Set a per-user or single “resetting” state (e.g. `resettingUserId === user.id`) so the button shows loading and is disabled.
  - In `try/catch`:
    - `await supabase.from('profiles').update({ is_setup_complete: false }).eq('id', user.id)`.
    - On success: update local state so that this user’s `is_setup_complete` is `false` (e.g. `setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_setup_complete: false } : u)))`, then `showToast('Setup reset successfully.', 'success')`.
    - On error: `showToast('Failed to reset setup: ' + error.message, 'error')`.
  - In `finally`: clear `resettingUserId`.
- **Loading state:** Show a small spinner or “Resetting…” text on that row’s “Reset setup” button while the request is in progress.

---

## 3. Role Management

- **UI:** Replace the static “Change role” button with a small inline control:
  - **Option A:** A `<select>` (dropdown) with options: `TSA`, `U&B_ADMIN`, `UFP`. Value = current `user.role`. On change, call the update logic immediately (no separate “Save”).
  - **Option B:** “Change role” opens a small dropdown/modal with the three options; on click of an option, run the update and close.
- **Update logic (in try/catch):**
  - Optional: set a “updating role” state for that row (e.g. `updatingRoleUserId === user.id`) to disable the control or show a spinner.
  - `await supabase.from('profiles').update({ role: newRole }).eq('id', user.id)`.
  - On success: update local state for that user’s `role`, then `showToast('Role updated.', 'success')`.
  - On error: `showToast('Failed to update role: ' + error.message, 'error')`.
- **Validation:** Only allow `TSA`, `U&B_ADMIN`, or `UFP`. If the current user is changing their own role, consider a warning or preventing demotion (optional; can be Phase 3).

---

## 4. Lock / Unlock

- **Button label:** Show “Unlock” when `user.is_locked === true`, and “Lock” when `user.is_locked === false`.
- **Click handler:**
  - Set a per-user “locking” state (e.g. `lockingUserId === user.id`) and disable the button.
  - In `try/catch`:
    - `await supabase.from('profiles').update({ is_locked: !user.is_locked }).eq('id', user.id)`.
    - On success: update local state for that user’s `is_locked` (e.g. `setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_locked: !u.is_locked } : u)))`, then `showToast(user.is_locked ? 'User unlocked.' : 'User locked.', 'success')`.
    - On error: `showToast('Failed to update lock: ' + error.message, 'error')`.
  - In `finally`: clear `lockingUserId`.
- **Loading:** Show spinner or “…” on the Lock/Unlock button while the request is in progress.

---

## 5. Security & Resilience

- **Try/catch:** Every Supabase call in this module (fetch users, reset setup, update role, lock/unlock) must be inside a `try/catch`. On error: log to console, set any relevant error state, and show a toast so the TSA sees the failure.
- **Refresh button:** Add a “Refresh” button in the User Management section (e.g. next to the “User Management” heading or in the table header). On click: set `usersLoading = true` and run the same fetch logic as in the initial `useEffect` (or call a shared `fetchUsers()` function). This allows the TSA to re-fetch after external changes or after a transient error.

---

## 6. Toast Notifications

- **Pattern:** Reuse the same pattern as UBAdminDashboard: a `toast` state object `{ message, type }` where `type` is `'success'` or `'error'`, and a `showToast(message, type)` helper that sets toast and clears it after 5 seconds.
- **Placement:** Render the toast in TSADashboard (e.g. fixed bottom-right) so it appears across all modules. Use Cyber Ops styling: dark background, light text, success = green accent, error = red accent, with a close button.
- **Usage:** Call `showToast` after every successful or failed administrative action (reset setup, role update, lock/unlock) and optionally on fetch failure.

---

## 7. File and code changes summary

| Location | Change |
|---------|--------|
| **TSADashboard.jsx** | Add state: `users`, `usersLoading`, `usersError`, `toast`, `resettingUserId`, `updatingRoleUserId`, `lockingUserId`. Add `useEffect` to fetch profiles (and optionally universities). Add `fetchUsers()` and wire Refresh to it. Replace User Management table body with live `users` and loading/error states. Add role dropdown, Reset setup handler, Lock/Unlock handler. Add `showToast` and toast UI. Wrap all Supabase calls in try/catch. |

---

## 8. RLS and schema assumptions

- **profiles table:** Has at least: `id`, `full_name`, `email`, `role`, `university_id`, `is_setup_complete`, `is_locked` (and `created_at` for ordering). If `email` or `full_name` live only in `auth.users`, you must either sync them to `profiles` (e.g. trigger) or expose them via a backend/Edge Function; the TSA dashboard will then call that or use the synced columns.
- **RLS:** Policies on `profiles` must allow the signed-in TSA user (e.g. `role = 'TSA'`) to `SELECT` all rows and `UPDATE` by `id`. If RLS blocks TSA from updating other users, you will need a backend endpoint that uses the service role to perform updates and is called from the TSA frontend with proper auth.

---

## 9. Implementation order (recommended)

1. Add state and `fetchUsers()` with try/catch; add `useEffect` to call it on mount; add Refresh button that calls `fetchUsers()`.
2. Replace mock table body with live `users`, loading and error UI.
3. Add toast state and toast UI; implement Reset setup with loading and toast.
4. Implement role dropdown and update-role logic with toast.
5. Implement Lock/Unlock with loading and toast.
6. Quick pass: ensure every Supabase call is in try/catch and that errors surface via toast or inline message.

Once this plan is approved, implementation can proceed in the order above.
