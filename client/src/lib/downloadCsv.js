/**
 * Parse filename from Content-Disposition (RFC 5987 filename* and quoted filename=)
 */
function filenameFromContentDisposition(header) {
  if (!header || typeof header !== 'string') return null;
  const star = /filename\*=UTF-8''([^;\s]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      return star[1].trim();
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1];
  const plain = /filename=([^;\s]+)/i.exec(header);
  if (plain?.[1]) return plain[1].replace(/^["']|["']$/g, '');
  return null;
}

/**
 * GET a CSV (or any file) and trigger a browser download with the best filename available.
 */
export async function downloadFileFromUrl(url, fallbackFilename = 'download.csv') {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    let msg = res.statusText || 'Download failed';
    try {
      const j = JSON.parse(errBody);
      if (j?.error) msg = j.error;
    } catch {
      if (errBody && errBody.length < 200) msg = errBody;
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition');
  const name = filenameFromContentDisposition(cd) || fallbackFilename;
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
