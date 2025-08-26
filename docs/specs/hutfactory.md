# Spec — HutFactory Canister

## Summary
Creates/configures MyHut instances; enforces Governance Activation Window and role guards.

## API (Candid)
```did
// sketch — replace with generated .did
service : {
  create_hut: (record { owner: principal; params: record { /* init fields */ } }) -> (principal);
  set_role: (record { hut: principal; user: principal; role: variant { Admin; Trader; Viewer } }) -> ();
  open_activation_window: (record { duration_secs: nat64 }) -> ();
  close_activation_window: () -> ();
  get_state: () -> (record { current_window: opt record { opened_at: nat64; expires_at: nat64 } });
}
```

## Preconditions & Guards
- `create_hut`: caller is controller **or** governance‑approved principal.
- `set_role`: **requires Activation Window = Open** and caller has `Admin`.
- Upgrades: only if `schema_version_next == schema_version + 1` **or** migrator provided.

## State Model
- `stable struct { schema_version; huts: map<principal, HutMeta>; window: opt<Window>; }`
- Certified `window` for UI gating.

## Invariants
- **INV‑HF‑001:** No role changes when `window = Closed`.
- **INV‑HF‑002:** `expires_at > opened_at` and `now <= expires_at` during open window.

## Errors
- `ERR_WINDOW_CLOSED`, `ERR_UNAUTHORIZED`, `ERR_SCHEMA_MISMATCH`.

## Events
- `ActivationOpened{duration}`, `Executed{op}`, `Expired`, `Aborted{reason}`.

## Metrics
- `roles_changed_total`, `window_open_seconds_total`.

## Acceptance Mapping
- **FR‑004** (governance gating) → Tests: **F.6**
- **NFR** — Upgrade safety → covered by upgrade guard unit tests

