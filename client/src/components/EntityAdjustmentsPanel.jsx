import { useCallback, useEffect, useState } from 'react';
import {
  listAdjustments,
  createAdjustment,
  deleteAdjustment,
  listNotes,
  createNote,
  deleteNote,
} from '../api/phase3Api.js';
import { formatCurrency, formatDate } from '../lib/format.js';

/**
 * Expandable panel shown inside order / refund table rows.  Lets an
 * operator add and delete adjustments + notes tied to the row.
 * Callers pass `entityType` ('order' | 'refund' | etc), the entity
 * `sourceSystem` and `sourceId`, and an optional `onChange` callback
 * that fires after any successful mutation so the parent can refresh
 * aggregate totals.
 */
export function EntityAdjustmentsPanel({
  entityType,
  sourceSystem,
  sourceId,
  databaseEnabled,
  onChange,
}) {
  const [adjustments, setAdjustments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjMemo, setAdjMemo] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [mutating, setMutating] = useState(false);

  const refresh = useCallback(async () => {
    if (!databaseEnabled || !sourceSystem || !sourceId) return;
    setLoading(true);
    setError(null);
    try {
      const [a, n] = await Promise.all([
        listAdjustments({
          entity_type: entityType,
          source_system: sourceSystem,
          source_id: sourceId,
        }),
        listNotes({
          entity_type: entityType,
          source_system: sourceSystem,
          source_id: sourceId,
        }),
      ]);
      setAdjustments(a || []);
      setNotes(n || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [databaseEnabled, entityType, sourceSystem, sourceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!databaseEnabled) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-3 text-xs text-[var(--muted)]">
        Adjustments and notes need a connected database. Ask your administrator to enable it.
      </div>
    );
  }

  if (!sourceSystem || !sourceId) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-3 text-xs text-[var(--muted)]">
        This row is missing a source_id, so adjustments can not be attached. Re-import it from CSV
        to record a source_id.
      </div>
    );
  }

  const addAdjustment = async () => {
    if (mutating) return;
    const parsed = Number(adjAmount);
    if (!Number.isFinite(parsed)) {
      setError('Amount must be a number');
      return;
    }
    setMutating(true);
    setError(null);
    try {
      await createAdjustment({
        entity_type: entityType,
        source_system: sourceSystem,
        source_id: sourceId,
        amount: parsed,
        reason: adjReason,
        memo: adjMemo,
      });
      setAdjAmount('');
      setAdjReason('');
      setAdjMemo('');
      await refresh();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add adjustment');
    } finally {
      setMutating(false);
    }
  };

  const removeAdjustment = async (id) => {
    if (mutating) return;
    setMutating(true);
    setError(null);
    try {
      await deleteAdjustment(id);
      await refresh();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setMutating(false);
    }
  };

  const addNote = async () => {
    if (mutating) return;
    const trimmed = noteBody.trim();
    if (!trimmed) return;
    setMutating(true);
    setError(null);
    try {
      await createNote({
        entity_type: entityType,
        source_system: sourceSystem,
        source_id: sourceId,
        body: trimmed,
      });
      setNoteBody('');
      await refresh();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add note');
    } finally {
      setMutating(false);
    }
  };

  const removeNote = async (id) => {
    if (mutating) return;
    setMutating(true);
    setError(null);
    try {
      await deleteNote(id);
      await refresh();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete note');
    } finally {
      setMutating(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-4 text-xs">
      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-rose-100">
          {error}
        </div>
      )}

      <section>
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Adjustments
          </h4>
          <p className="text-[11px] text-[var(--muted)]">
            {adjustments.length} on {entityType} · {sourceSystem}/{sourceId}
          </p>
        </div>
        {loading ? (
          <p className="mt-2 text-[var(--muted)]">Loading…</p>
        ) : adjustments.length === 0 ? (
          <p className="mt-2 text-[var(--muted)]">No adjustments yet.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {adjustments.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2"
              >
                <div>
                  <p className="font-mono text-[var(--text)]">
                    {a.amount > 0 ? '+' : ''}
                    {formatCurrency(a.amount)}
                    {a.reason ? (
                      <span className="ml-2 text-[var(--muted)]">({a.reason})</span>
                    ) : null}
                  </p>
                  {a.memo && (
                    <p className="mt-0.5 text-[var(--muted)]">{a.memo}</p>
                  )}
                  <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                    By {a.createdBy} · {formatDate(a.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAdjustment(a.id)}
                  disabled={mutating}
                  className="rounded-md border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--muted)] transition hover:text-[var(--text)] disabled:opacity-40"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[120px_180px_1fr_auto]">
          <input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={adjAmount}
            onChange={(e) => setAdjAmount(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-xs text-[var(--text)]"
          />
          <input
            type="text"
            placeholder="Reason"
            value={adjReason}
            onChange={(e) => setAdjReason(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-xs text-[var(--text)]"
          />
          <input
            type="text"
            placeholder="Memo (optional)"
            value={adjMemo}
            onChange={(e) => setAdjMemo(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-xs text-[var(--text)]"
          />
          <button
            type="button"
            onClick={addAdjustment}
            disabled={mutating || !adjAmount}
            className="rounded-md border border-[var(--primary-ring)] bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:brightness-110 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </section>

      <section>
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Notes ({notes.length})
        </h4>
        {loading ? (
          <p className="mt-2 text-[var(--muted)]">Loading…</p>
        ) : notes.length === 0 ? (
          <p className="mt-2 text-[var(--muted)]">No notes yet.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {notes.map((n) => (
              <li
                key={n.id}
                className="flex items-start justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2"
              >
                <div>
                  <p className="text-[var(--text)]">{n.body}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                    By {n.author} · {formatDate(n.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeNote(n.id)}
                  disabled={mutating}
                  className="rounded-md border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--muted)] transition hover:text-[var(--text)] disabled:opacity-40"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addNote();
            }}
            placeholder="Add a note about this row…"
            className="flex-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-xs text-[var(--text)]"
          />
          <button
            type="button"
            onClick={addNote}
            disabled={mutating || !noteBody.trim()}
            className="rounded-md border border-[var(--primary-ring)] bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:brightness-110 disabled:opacity-40"
          >
            Add note
          </button>
        </div>
      </section>
    </div>
  );
}
