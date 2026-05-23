import { useCallback, useEffect, useState } from 'react';
import {
  commitImport,
  fetchImportJobs,
  fetchImportTemplateDefinitions,
  previewImport,
  uploadImportCsv,
} from '../api/financeApi.js';
import { formatDate } from '../lib/format.js';
import { downloadFileFromUrl } from '../lib/downloadCsv.js';
import {
  getTemplateForImportType,
  importTypeToTemplateSlug,
  normalizeTemplatesMap,
  resolveTemplateSampleDownloadUrl,
} from '../lib/importTypeSlug.js';
import {
  BlockedPeriodsBanner,
  ImportIssuesPanel,
} from '../components/ImportIssuesPanel.jsx';
import {
  downloadSampleAsXlsxFromUrl,
  parseSpreadsheetFile,
} from '../lib/spreadsheet.js';

function friendlyTemplateLoadError(err) {
  const raw = err instanceof Error ? err.message : String(err);
  if (!raw || /not\s*found/i.test(raw) || raw === '404') {
    return 'Template details unavailable right now. Check that the API is running.';
  }
  return raw;
}

const IMPORT_TYPES = [
  { id: 'orders', label: 'Orders' },
  { id: 'payments', label: 'Payments' },
  { id: 'refunds', label: 'Refunds' },
  { id: 'fees', label: 'Fees' },
  { id: 'bank_transactions', label: 'Bank transactions' },
];

function FieldReqBadge({ required }) {
  if (required) {
    return (
      <span className="inline-flex shrink-0 rounded-md border border-[var(--primary-ring)] bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--text)]">
        Required
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 rounded-md border border-[var(--border)] bg-[var(--card-strong)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
      Optional
    </span>
  );
}

export default function ImportPage() {
  const [file, setFile] = useState(null);
  const [importType, setImportType] = useState('orders');
  const [sourceSystem, setSourceSystem] = useState('shopify_export');
  const [uploadId, setUploadId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [commitResult, setCommitResult] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [templateMeta, setTemplateMeta] = useState(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState(null);
  const [sampleDownloading, setSampleDownloading] = useState(false);
  const [sampleDownloadError, setSampleDownloadError] = useState(null);
  const [fileParseError, setFileParseError] = useState(null);
  const [blockedPeriods, setBlockedPeriods] = useState(null);

  const loadJobs = useCallback(async () => {
    try {
      const j = await fetchImportJobs(40);
      setJobs(j || []);
    } catch {
      setJobs([]);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTemplatesLoading(true);
      setTemplatesError(null);
      try {
        const data = await fetchImportTemplateDefinitions();
        if (!cancelled) {
          setTemplateMeta(normalizeTemplatesMap(data?.templates));
          setTemplatesError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setTemplateMeta(null);
          setTemplatesError(friendlyTemplateLoadError(e));
        }
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSampleDownloadError(null);
  }, [importType]);

  const runPreview = async (uid, mapOverride) => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      const data = await previewImport({
        uploadId: uid,
        columnMapping: mapOverride && Object.keys(mapOverride).length ? mapOverride : undefined,
      });
      setPreview(data);
      setMapping(data.activeMapping || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Choose a CSV or XLSX file first.');
      return;
    }
    setLoading(true);
    setError(null);
    setCommitResult(null);
    setPreview(null);
    try {
      let fileToUpload = file;
      if (!String(file.name || '').toLowerCase().endsWith('.csv')) {
        const parsed = await parseSpreadsheetFile(file);
        fileToUpload = parsed.uploadFile;
      }
      setFileParseError(null);
      const fd = new FormData();
      fd.append('file', fileToUpload);
      fd.append('import_type', importType);
      fd.append('source_system', sourceSystem);
      const data = await uploadImportCsv(fd);
      setUploadId(data.uploadId);
      await runPreview(data.uploadId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setFileParseError(e instanceof Error ? e.message : 'Unable to read selected file.');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!uploadId) return;
    setLoading(true);
    setError(null);
    setBlockedPeriods(null);
    try {
      const data = await commitImport({ uploadId, columnMapping: mapping });
      setCommitResult(data);
      setUploadId(null);
      setPreview(null);
      setFile(null);
      await loadJobs();
    } catch (e) {
      const details = e instanceof Error ? e.details : null;
      if (details?.blockedPeriods?.length) {
        setBlockedPeriods(details.blockedPeriods);
        setError(null);
      } else {
        setError(e instanceof Error ? e.message : 'Import failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const onDrop = async (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setFileParseError(null);
    setFile(f);
  };

  const headers = preview?.headers || [];
  const canonicalKeys = Object.keys(mapping);

  const selectedTemplate = getTemplateForImportType(templateMeta, importType);
  const sampleUrl = resolveTemplateSampleDownloadUrl(importType, selectedTemplate);

  const formatNoteLine =
    selectedTemplate?.formattingNotes?.length > 0 ? selectedTemplate.formattingNotes[0] : null;
  const typeLabel =
    selectedTemplate?.label ?? IMPORT_TYPES.find((t) => t.id === importType)?.label ?? 'Sample';

  const handleDownloadSample = useCallback(
    async (format) => {
      const url = resolveTemplateSampleDownloadUrl(importType, selectedTemplate);
      if (!url) {
        setSampleDownloadError('Template details unavailable right now.');
        return;
      }
      setSampleDownloading(true);
      setSampleDownloadError(null);
      const slug = importTypeToTemplateSlug(importType);
      const base = slug ? slug.replace(/-/g, '_') : 'sample';
      try {
        if (format === 'xlsx') {
          await downloadSampleAsXlsxFromUrl(url, `${base}_sample.xlsx`);
        } else {
          await downloadFileFromUrl(url, `${base}_sample.csv`);
        }
      } catch (e) {
        setSampleDownloadError(
          e instanceof Error ? friendlyTemplateLoadError(e) : 'Download failed.',
        );
      } finally {
        setSampleDownloading(false);
      }
    },
    [importType, selectedTemplate],
  );

  return (
    <>
      <header className="mt-1">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Import data</h1>
          <p className="mt-3 max-w-xl text-[clamp(13px,0.9vw,15px)] leading-relaxed text-[var(--muted)]">
            Select the report type, download a sample (CSV or Excel), then upload your completed CSV/XLSX file.
          </p>
        </header>

        <div className="mt-8 space-y-10 lg:mt-12 lg:space-y-14">
          {/* B–C: Type + sample */}
          <div className="space-y-6">
            <div>
              <label htmlFor="import-type" className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Import type
              </label>
              <select
                id="import-type"
                value={importType}
                onChange={(e) => {
                  const v = e.target.value;
                  const prev = importType;
                  setImportType(v);
                  if (v === 'bank_transactions' && prev !== 'bank_transactions') {
                    setSourceSystem('chase_export');
                  }
                }}
                className="mt-2 block w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-3 py-2.5 text-sm text-[var(--text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)]"
              >
                {IMPORT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-h-[5rem] space-y-4">
              {templatesLoading && (
                <p className="text-sm text-[var(--muted)]">Loading template details…</p>
              )}
              {!templatesLoading && templatesError && (
                <p className="text-sm text-amber-200/90">{templatesError}</p>
              )}
              {!templatesLoading && !templatesError && !selectedTemplate && (
                <p className="text-sm text-[var(--muted)]">
                  Column reference for this type could not be loaded. You can still download the
                  sample CSV.
                </p>
              )}
              {!templatesLoading && sampleUrl && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        disabled={sampleDownloading}
                        onClick={() => handleDownloadSample('csv')}
                        className="inline-flex items-center justify-center rounded-xl border border-[var(--primary-ring)] bg-[var(--primary-soft)] px-5 py-3 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)] disabled:cursor-wait disabled:opacity-70"
                      >
                        {sampleDownloading ? 'Preparing…' : `Download ${typeLabel} sample CSV`}
                      </button>
                      <button
                        type="button"
                        disabled={sampleDownloading}
                        onClick={() => handleDownloadSample('xlsx')}
                        className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-5 py-3 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)] disabled:cursor-wait disabled:opacity-70"
                      >
                        {sampleDownloading ? 'Preparing…' : `Download ${typeLabel} sample Excel`}
                      </button>
                    </div>
                    <div className="max-w-lg space-y-2 pt-0.5 text-sm leading-relaxed text-[var(--muted)]">
                      <p>
                        Download this sample, replace the example rows with your data, then upload it
                        back as CSV or Excel.
                      </p>
                      {selectedTemplate?.requiredSummary ? (
                        <p className="text-[var(--muted)]">
                          <span className="text-[var(--muted)]">Required: </span>
                          <span className="font-mono text-[13px] text-[var(--text)]">
                            {selectedTemplate.requiredSummary}
                          </span>
                        </p>
                      ) : null}
                      {formatNoteLine ? (
                        <p className="text-xs text-[var(--muted)]">Tip: {formatNoteLine}</p>
                      ) : null}
                    </div>
                  </div>
                  {sampleDownloadError && (
                    <p className="text-sm text-amber-200/90" role="alert">
                      {sampleDownloadError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* D: Upload */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow)] backdrop-blur-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Upload completed CSV
            </h2>
            <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Data source label
            </label>
            <input
              value={sourceSystem}
              onChange={(e) => setSourceSystem(e.target.value)}
              placeholder="e.g. shopify_export, paypal_export"
              className="mt-2 w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)]"
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              Used with row IDs to avoid duplicates. Defaults adjust when you pick bank transactions.
            </p>

            <div
              className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-strong)] px-6 py-14 text-center transition hover:brightness-105"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
            >
              <p className="text-sm text-[var(--muted)]">
                Drag and drop CSV/XLSX here, or choose a file from your computer.
              </p>
              <input
                type="file"
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="mt-4 max-w-full cursor-pointer text-sm text-[var(--muted)] file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[var(--primary-soft)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--text)]"
                onChange={(e) => {
                  setFileParseError(null);
                  setFile(e.target.files?.[0] || null);
                }}
              />
              {file && (
                <p className="mt-4 text-xs font-medium text-[var(--primary)]">Selected: {file.name}</p>
              )}
            </div>
            {fileParseError && (
              <p className="mt-3 text-sm text-amber-200/90" role="alert">
                {fileParseError}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={handleUpload}
                className="rounded-xl border border-[var(--primary-ring)] bg-[var(--primary-soft)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)] disabled:opacity-50"
              >
                {loading ? 'Working…' : 'Preview import'}
              </button>
              {uploadId && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => runPreview(uploadId, mapping)}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)] disabled:opacity-50"
                >
                  Refresh preview
                </button>
              )}
            </div>
          </section>

          {/* E: Expected columns */}
          {!templatesLoading && !templatesError && selectedTemplate?.columns?.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Expected columns ({selectedTemplate.label})
              </h2>
              <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[var(--border)] bg-[var(--card-strong)] text-[10px] uppercase tracking-wide text-[var(--muted)]">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Column</th>
                      <th className="px-4 py-2.5 font-medium">Example</th>
                      <th className="px-4 py-2.5 font-medium"> </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-xs">
                    {selectedTemplate.columns.map((row) => (
                      <tr key={row.column} className="hover:brightness-105">
                        <td className="px-4 py-2.5 font-mono text-[var(--text)]">{row.column}</td>
                        <td
                          className="max-w-[220px] truncate px-4 py-2.5 text-[var(--muted)]"
                          title={row.example}
                        >
                          {row.example === '' ? '—' : row.example}
                        </td>
                        <td className="px-4 py-2.5 align-middle">
                          <FieldReqBadge required={row.required} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {!templatesLoading &&
            !templatesError &&
            selectedTemplate &&
            (!selectedTemplate.columns || selectedTemplate.columns.length === 0) && (
              <p className="text-sm text-[var(--muted)]">
                Sample format details aren’t available for this template yet.
              </p>
            )}

          {blockedPeriods && (
            <BlockedPeriodsBanner
              periods={blockedPeriods}
              onDismiss={() => setBlockedPeriods(null)}
            />
          )}

          {error && (
            <div
              className="rounded-xl border border-rose-500/25 bg-rose-950/30 px-4 py-3 text-sm text-rose-100/95"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* F: Preview & mapping */}
          {preview && (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow)] backdrop-blur-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Preview &amp; mapping
              </h2>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {preview.totalRows} rows · {preview.validationErrorCount} row-level issues before
                commit
              </p>

              <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[var(--border)] bg-[var(--card-strong)] text-xs uppercase text-[var(--muted)]">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">Field</th>
                      <th className="px-3 py-2.5 font-medium">CSV column</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {canonicalKeys.map((k) => (
                      <tr key={k}>
                        <td className="px-3 py-2 font-mono text-xs text-[var(--text)]">{k}</td>
                        <td className="px-3 py-2">
                          <select
                            value={mapping[k] || ''}
                            onChange={(e) =>
                              setMapping((prev) => ({ ...prev, [k]: e.target.value }))
                            }
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--card-strong)] px-2 py-1.5 text-xs text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-ring)]"
                          >
                            <option value="">—</option>
                            {headers.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.warnings?.length > 0 && (
                <div className="mt-5">
                  <ImportIssuesPanel
                    title="Warnings"
                    tone="warning"
                    issues={preview.warnings.map((w, idx) => ({
                      row: null,
                      message: w,
                      severity: 'warning',
                      _key: idx,
                    }))}
                    filenameHint={`import-warnings-${importType}`}
                  />
                </div>
              )}

              {preview.validationErrors?.length > 0 && (
                <div className="mt-5">
                  <ImportIssuesPanel
                    title={
                      preview.validationErrorCount > preview.validationErrors.length
                        ? `Validation errors (showing first ${preview.validationErrors.length} of ${preview.validationErrorCount})`
                        : 'Validation errors'
                    }
                    tone="error"
                    issues={preview.validationErrors.map((v) => ({
                      row: v.row,
                      message: v.message,
                      severity: 'error',
                    }))}
                    filenameHint={`import-errors-${importType}`}
                  />
                </div>
              )}

              {preview.sampleMapped?.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Sample normalized rows
                  </p>
                  <pre className="mt-2 max-h-56 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--card-strong)] p-4 text-[11px] leading-relaxed text-[var(--muted)]">
                    {JSON.stringify(preview.sampleMapped, null, 2)}
                  </pre>
                </div>
              )}

              <div className="mt-6">
                <button
                  type="button"
                  disabled={loading || !uploadId}
                  onClick={handleCommit}
                  className="rounded-xl border border-[var(--primary-ring)] bg-[var(--primary-soft)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)] disabled:opacity-50"
                >
                  Commit import
                </button>
              </div>
            </section>
          )}

          {commitResult && (
            <section className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-6 text-sm text-emerald-50">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300/90">
                Import complete
              </h2>
              <p className="mt-2 text-xs text-emerald-100/85">
                Job #{commitResult.jobId} · total {commitResult.totalRows} · applied{' '}
                {commitResult.importedRows} · inserted {commitResult.insertedRows} · updated{' '}
                {commitResult.updatedRows} · skipped {commitResult.skippedRows} · failed rows{' '}
                {commitResult.failedRows}
              </p>
              {commitResult.failures?.length > 0 && (
                <div className="mt-4">
                  <ImportIssuesPanel
                    title={`Skipped rows (${commitResult.failedRows})`}
                    tone="error"
                    defaultOpen={commitResult.failures.length <= 20}
                    issues={commitResult.failures.map((line) => {
                      const match = /^Row\s+(\d+):\s*(.*)$/i.exec(line);
                      return match
                        ? { row: Number(match[1]), message: match[2], severity: 'error' }
                        : { row: null, message: line, severity: 'error' };
                    })}
                    filenameHint={`import-job-${commitResult.jobId}-failures`}
                  />
                </div>
              )}
            </section>
          )}

          {/* G: History */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow)] backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Recent imports
              </h2>
              <button
                type="button"
                onClick={loadJobs}
                className="text-xs font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
              >
                Refresh
              </button>
            </div>
            <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--card-strong)] text-xs uppercase text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">ID</th>
                    <th className="px-3 py-2.5 font-medium">File</th>
                    <th className="px-3 py-2.5 font-medium">Type</th>
                    <th className="px-3 py-2.5 font-medium">Source</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Rows</th>
                    <th className="px-3 py-2.5 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-10 text-center text-sm text-[var(--muted)]">
                        No imports yet. When the database is connected, completed jobs appear here.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((j) => (
                      <tr key={j.id} className="hover:brightness-105">
                        <td className="px-3 py-2.5 font-mono text-xs text-[var(--muted)]">{j.id}</td>
                        <td className="px-3 py-2.5 text-[var(--text)]">{j.filename || '—'}</td>
                        <td className="px-3 py-2.5 text-[var(--text)]">{j.import_type}</td>
                        <td className="px-3 py-2.5 text-[var(--muted)]">{j.source_system}</td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-full border border-[var(--border)] bg-[var(--card-strong)] px-2 py-0.5 text-xs text-[var(--text)]">
                            {j.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[var(--muted)]">
                          {j.imported_rows}/{j.total_rows} · skipped {j.skipped_rows}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[var(--muted)]">
                          {formatDate(j.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
    </>
  );
}
