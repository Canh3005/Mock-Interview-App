'use strict';

const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json({ limit: '10mb' }));

// ─── In-memory submission store ─────────────────────────────────────────────
const store = new Map();

// ─── Status codes (mirrors Judge0) ──────────────────────────────────────────
const STATUS = {
  IN_QUEUE:          { id: 1,  description: 'In Queue' },
  PROCESSING:        { id: 2,  description: 'Processing' },
  ACCEPTED:          { id: 3,  description: 'Accepted' },
  WRONG_ANSWER:      { id: 4,  description: 'Wrong Answer' },
  TIME_LIMIT:        { id: 5,  description: 'Time Limit Exceeded' },
  COMPILE_ERROR:     { id: 6,  description: 'Compilation Error' },
  RUNTIME_ERROR:     { id: 11, description: 'Runtime Error (NZEC)' },
  INTERNAL_ERROR:    { id: 13, description: 'Internal Error' },
};

// ─── Language configuration ──────────────────────────────────────────────────
// Maps Judge0 language IDs to execution config
const LANGUAGES = {
  // Python 3
  71:  { name: 'Python 3',   ext: 'py',   run: (f)         => ['python3', [f]] },
  // Python 2
  70:  { name: 'Python 2',   ext: 'py',   run: (f)         => ['python2', [f]] },
  // Node.js
  93:  { name: 'Node.js',    ext: 'js',   run: (f)         => ['node', [f]] },
  // C++ (GCC)
  54:  { name: 'C++',        ext: 'cpp',  compile: (f, d)  => ['g++', ['-O2', '-o', `${d}/sol`, f]],
                                           run: (_f, d)    => [`${d}/sol`, []] },
  // C
  48:  { name: 'C',          ext: 'c',    compile: (f, d)  => ['gcc', ['-O2', '-o', `${d}/sol`, f]],
                                           run: (_f, d)    => [`${d}/sol`, []] },
  // Java — class must be named Main
  91:  { name: 'Java',       ext: 'java', filename: 'Main.java',
                                           compile: (f, d)  => ['javac', [f]],
                                           run: (_f, d)    => ['java', ['-cp', d, 'Main']] },
  // Bash
  46:  { name: 'Bash',       ext: 'sh',   run: (f)         => ['bash', [f]] },
};

// ─── Helper: execute a process, pipe stdin, capture output ──────────────────
function execProcess(cmd, args, stdinData, timeLimitMs) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const proc = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
    }, timeLimitMs);

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    if (stdinData) {
      proc.stdin.write(stdinData);
    }
    proc.stdin.end();

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? 0, stdout, stderr, timedOut });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({ exitCode: 1, stdout, stderr, timedOut, spawnError: err.message });
    });
  });
}

// ─── Core: run source code against a single test ─────────────────────────────
async function runCode(sourceCode, languageId, stdin, expectedOutput, cpuTimeLimitSec) {
  const lang = LANGUAGES[languageId];
  if (!lang) {
    return {
      stdout: null, stderr: null, compile_output: null, time: null, memory: null,
      message: `Unsupported language id: ${languageId}`,
      status: STATUS.INTERNAL_ERROR,
    };
  }

  const timeLimitMs = Math.max((cpuTimeLimitSec || 5), 2) * 1000;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-'));
  const filename = lang.filename || `solution.${lang.ext}`;
  const filepath = path.join(tmpDir, filename);

  try {
    fs.writeFileSync(filepath, sourceCode, 'utf8');

    // ── Compilation (if needed) ──
    if (lang.compile) {
      const [compCmd, compArgs] = lang.compile(filepath, tmpDir);
      const comp = await execProcess(compCmd, compArgs, null, 30_000);

      if (comp.spawnError) {
        return {
          stdout: null, stderr: null, time: null, memory: null,
          compile_output: `Compiler not found: ${compCmd}\n${comp.spawnError}`,
          message: null,
          status: STATUS.INTERNAL_ERROR,
        };
      }

      if (comp.exitCode !== 0) {
        return {
          stdout: null, stderr: null, time: null, memory: null,
          compile_output: comp.stderr || comp.stdout || 'Compilation failed',
          message: null,
          status: STATUS.COMPILE_ERROR,
        };
      }
    }

    // ── Execution ──
    const [runCmd, runArgs] = lang.run(filepath, tmpDir);
    const startMs = Date.now();
    const run = await execProcess(runCmd, runArgs, stdin || '', timeLimitMs);
    const elapsed = ((Date.now() - startMs) / 1000).toFixed(3);

    if (run.spawnError) {
      return {
        stdout: null, stderr: null, compile_output: null, time: elapsed, memory: null,
        message: `Runtime not found: ${runCmd}\n${run.spawnError}`,
        status: STATUS.INTERNAL_ERROR,
      };
    }

    if (run.timedOut) {
      return {
        stdout: null, stderr: null, compile_output: null, time: elapsed, memory: null,
        message: null,
        status: STATUS.TIME_LIMIT,
      };
    }

    const stdoutResult = run.stdout || null;
    const stderrResult = run.stderr || null;

    if (run.exitCode !== 0) {
      return {
        stdout: stdoutResult, stderr: stderrResult, compile_output: null,
        time: elapsed, memory: null, message: null,
        status: STATUS.RUNTIME_ERROR,
      };
    }

    // ── Compare output (trim trailing whitespace/newlines like Judge0) ──
    const actual   = (run.stdout || '').replace(/\r\n/g, '\n').trimEnd();
    const expected = (expectedOutput || '').replace(/\r\n/g, '\n').trimEnd();
    const accepted = actual === expected;

    return {
      stdout: stdoutResult,
      stderr: stderrResult,
      compile_output: null,
      time: elapsed,
      memory: null,
      message: null,
      status: accepted ? STATUS.ACCEPTED : STATUS.WRONG_ANSWER,
    };

  } catch (err) {
    return {
      stdout: null, stderr: null, compile_output: null, time: null, memory: null,
      message: err.message,
      status: STATUS.INTERNAL_ERROR,
    };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  }
}

// ─── Process a token asynchronously ─────────────────────────────────────────
function processSubmission(token, sub) {
  store.set(token, { token, status: STATUS.IN_QUEUE, stdout: null, stderr: null,
    compile_output: null, message: null, time: null, memory: null });

  setImmediate(async () => {
    // Mark as processing
    const entry = store.get(token);
    if (entry) { entry.status = STATUS.PROCESSING; }

    const result = await runCode(
      sub.source_code,
      sub.language_id,
      sub.stdin,
      sub.expected_output,
      sub.cpu_time_limit,
    );
    store.set(token, { token, ...result });
    console.log(`[${token}] done → status=${result.status.description}`);
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /submissions/batch
app.post('/submissions/batch', (req, res) => {
  const { submissions } = req.body;
  if (!Array.isArray(submissions) || submissions.length === 0) {
    return res.status(400).json({ error: '"submissions" must be a non-empty array' });
  }

  const tokens = submissions.map((sub) => {
    const token = uuidv4();
    processSubmission(token, sub);
    return { token };
  });

  console.log(`[batch] created ${tokens.length} submission(s)`);
  return res.status(201).json(tokens);
});

// GET /submissions/batch?tokens=t1,t2,...
app.get('/submissions/batch', (req, res) => {
  const tokenList = (req.query.tokens || '').split(',').map((t) => t.trim()).filter(Boolean);

  const results = tokenList.map((token) => {
    return store.get(token) || {
      token,
      status: STATUS.INTERNAL_ERROR,
      message: 'Submission not found',
      stdout: null, stderr: null, compile_output: null, time: null, memory: null,
    };
  });

  return res.json({ submissions: results });
});

// POST /submissions  (single)
app.post('/submissions', (req, res) => {
  const token = uuidv4();
  processSubmission(token, req.body);
  console.log(`[single] created submission ${token}`);
  return res.status(201).json({ token });
});

// GET /submissions/:token
app.get('/submissions/:token', (req, res) => {
  const sub = store.get(req.params.token);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });
  return res.json(sub);
});

// GET /languages
app.get('/languages', (_req, res) => {
  return res.json(
    Object.entries(LANGUAGES).map(([id, lang]) => ({ id: Number(id), name: lang.name }))
  );
});

// GET /health
app.get('/health', (_req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 2358;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Code Runner listening on :${PORT}`);
  console.log(`   Supported language IDs: ${Object.keys(LANGUAGES).join(', ')}`);
});
