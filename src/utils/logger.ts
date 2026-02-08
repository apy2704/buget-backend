import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'backend.log');

function ensureLogDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

function timestamp() {
  return new Date().toISOString();
}

function safeStringify(obj: any) {
  const seen = new WeakSet();
  return JSON.stringify(obj, function (key, value) {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    if (/password|pwd|token|authorization/i.test(key)) return '***';
    return value;
  });
}

async function appendLog(line: string) {
  try {
    ensureLogDir();
    await fs.promises.appendFile(LOG_FILE, line + '\n', { encoding: 'utf8' });
  } catch (e) {
    // fallback to console if file write fails
    // eslint-disable-next-line no-console
    console.error('Failed writing log file:', e);
  }
}

export async function info(message: string, meta?: any) {
  const line = `[INFO] ${timestamp()} - ${message}${meta ? ' | ' + safeStringify(meta) : ''}`;
  // eslint-disable-next-line no-console
  console.log(line);
  await appendLog(line);
}

export async function warn(message: string, meta?: any) {
  const line = `[WARN] ${timestamp()} - ${message}${meta ? ' | ' + safeStringify(meta) : ''}`;
  // eslint-disable-next-line no-console
  console.warn(line);
  await appendLog(line);
}

export async function error(message: string, meta?: any) {
  const line = `[ERROR] ${timestamp()} - ${message}${meta ? ' | ' + safeStringify(meta) : ''}`;
  // eslint-disable-next-line no-console
  console.error(line);
  await appendLog(line);
}

export async function logRequest(req: any) {
  const meta = {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection?.remoteAddress,
    body: req.body,
    params: req.params,
    query: req.query,
  };
  await info(`Incoming request`, meta);
}

export async function logError(err: any, req?: any) {
  const meta: any = { message: err?.message, stack: err?.stack };
  if (req) meta.request = { method: req.method, url: req.originalUrl || req.url, body: req.body };
  await error('Unhandled exception', meta);
}

export default { info, warn, error, logRequest, logError };
