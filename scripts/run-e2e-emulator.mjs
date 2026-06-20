import { spawn } from 'node:child_process';
import { startSmtpSink } from './smtp-sink.mjs';

const PROJECT_ID = 'text2ink';
const API_URL = 'http://127.0.0.1:5001/text2ink/us-central1/inquiry';
const FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
const SMTP_HOST = '127.0.0.1';
const SMTP_PORT = '1025';
const SMTP_API_BASE = 'http://127.0.0.1:8025';
const playwrightCommand = ['playwright', 'test', ...process.argv.slice(2).map(shellQuote)].join(' ');

const sink = await startSmtpSink();
console.log(`SMTP sink ready at ${SMTP_API_BASE}`);

let firebaseProcess;

try {
  firebaseProcess = spawn(
    process.platform === 'win32' ? 'firebase.cmd' : 'firebase',
    [
      'emulators:exec',
      '--project',
      PROJECT_ID,
      '--only',
      'functions,firestore',
      playwrightCommand,
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        API_URL,
        FIRESTORE_EMULATOR_HOST,
        SMTP_HOST,
        SMTP_PORT,
        SMTP_SECURE: 'false',
        SMTP_USER: 'text2ink-test',
        SMTP_PASS: 'text2ink-test',
        SMTP_TO: 'inbox@text2ink.test',
        SMTP_API_BASE,
      },
    },
  );

  const exitCode = await waitForExit(firebaseProcess);
  process.exitCode = exitCode;
} finally {
  await sink.close();
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }

      resolve(code ?? 1);
    });

    const forwardSignal = (signal) => {
      child.kill(signal);
    };

    process.once('SIGINT', forwardSignal);
    process.once('SIGTERM', forwardSignal);
  });
}

function shellQuote(value) {
  if (/^[\w./:=@-]+$/.test(value)) {
    return value;
  }

  return `'${value.replaceAll("'", "'\\''")}'`;
}
