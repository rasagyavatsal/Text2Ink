import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { pathToFileURL } from 'node:url';

const DEFAULT_SMTP_HOST = '127.0.0.1';
const DEFAULT_SMTP_PORT = 1025;
const DEFAULT_API_HOST = '127.0.0.1';
const DEFAULT_API_PORT = 8025;

export async function startSmtpSink(options = {}) {
  const smtpHost = options.smtpHost ?? process.env.SMTP_SINK_SMTP_HOST ?? DEFAULT_SMTP_HOST;
  const smtpPort = Number(options.smtpPort ?? process.env.SMTP_SINK_SMTP_PORT ?? DEFAULT_SMTP_PORT);
  const apiHost = options.apiHost ?? process.env.SMTP_SINK_API_HOST ?? DEFAULT_API_HOST;
  const apiPort = Number(options.apiPort ?? process.env.SMTP_SINK_API_PORT ?? DEFAULT_API_PORT);
  const messages = [];

  const smtpServer = createNetServer((socket) => {
    let buffer = '';
    let dataMode = false;
    let dataLines = [];
    let authLoginStep = null;

    socket.setEncoding('utf8');
    socket.write('220 text2ink smtp sink\r\n');

    socket.on('data', (chunk) => {
      buffer += chunk;

      while (buffer.includes('\n')) {
        const newlineIndex = buffer.indexOf('\n');
        const rawLine = buffer.slice(0, newlineIndex).replace(/\r$/, '');
        buffer = buffer.slice(newlineIndex + 1);

        if (dataMode) {
          if (rawLine === '.') {
            const raw = dataLines.map((line) => line.replace(/^\.\./, '.')).join('\r\n');
            messages.unshift({
              id: `${Date.now()}-${messages.length + 1}`,
              createdAt: new Date().toISOString(),
              raw,
            });
            dataMode = false;
            dataLines = [];
            socket.write('250 2.0.0 Message accepted\r\n');
          } else {
            dataLines.push(rawLine);
          }
          continue;
        }

        if (authLoginStep === 'username') {
          authLoginStep = 'password';
          socket.write('334 UGFzc3dvcmQ6\r\n');
          continue;
        }

        if (authLoginStep === 'password') {
          authLoginStep = null;
          socket.write('235 2.7.0 Authentication successful\r\n');
          continue;
        }

        const command = rawLine.split(' ')[0]?.toUpperCase();

        switch (command) {
          case 'EHLO':
          case 'HELO':
            socket.write('250-text2ink.local\r\n');
            socket.write('250-AUTH PLAIN LOGIN\r\n');
            socket.write('250 SIZE 10485760\r\n');
            break;
          case 'AUTH':
            if (/^AUTH\s+LOGIN/i.test(rawLine)) {
              authLoginStep = 'username';
              socket.write('334 VXNlcm5hbWU6\r\n');
            } else {
              socket.write('235 2.7.0 Authentication successful\r\n');
            }
            break;
          case 'MAIL':
          case 'RCPT':
          case 'RSET':
            socket.write('250 2.1.0 OK\r\n');
            break;
          case 'DATA':
            dataMode = true;
            dataLines = [];
            socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
            break;
          case 'NOOP':
            socket.write('250 OK\r\n');
            break;
          case 'QUIT':
            socket.write('221 2.0.0 Bye\r\n');
            socket.end();
            break;
          default:
            socket.write('502 5.5.2 Command not recognized\r\n');
            break;
        }
      }
    });
  });

  const apiServer = createHttpServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `${apiHost}:${apiPort}`}`);

    if (req.method === 'GET' && url.pathname === '/api/v2/messages') {
      sendJson(res, {
        total: messages.length,
        items: messages.map((message) => ({
          ID: message.id,
          Created: message.createdAt,
          Content: {
            Body: exposeBody(message.raw),
            Headers: parseHeaders(message.raw),
          },
          Raw: { Data: message.raw },
        })),
      });
      return;
    }

    if (req.method === 'DELETE' && ['/api/v1/messages', '/api/v2/messages'].includes(url.pathname)) {
      messages.length = 0;
      sendJson(res, { total: 0, items: [] });
      return;
    }

    sendJson(res, { error: 'Not Found' }, 404);
  });

  await Promise.all([
    listen(smtpServer, smtpPort, smtpHost),
    listen(apiServer, apiPort, apiHost),
  ]);

  return {
    smtpHost,
    smtpPort,
    apiHost,
    apiPort,
    close: () => Promise.all([closeServer(smtpServer), closeServer(apiServer)]),
  };
}

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function sendJson(res, body, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function parseHeaders(raw) {
  const [headerBlock = ''] = raw.split(/\r?\n\r?\n/);
  const headers = {};
  let currentHeader = null;

  for (const line of headerBlock.split(/\r?\n/)) {
    if (/^\s/.test(line) && currentHeader) {
      headers[currentHeader][headers[currentHeader].length - 1] += ` ${line.trim()}`;
      continue;
    }

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    currentHeader = line.slice(0, separatorIndex);
    headers[currentHeader] ??= [];
    headers[currentHeader].push(line.slice(separatorIndex + 1).trim());
  }

  return headers;
}

function exposeBody(raw) {
  const decodedQuotedPrintable = raw
    .replace(/=\r?\n/g, '')
    .replace(/=([a-fA-F0-9]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));

  return decodedQuotedPrintable === raw ? raw : `${raw}\n\n${decodedQuotedPrintable}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sink = await startSmtpSink();
  console.log(`SMTP sink listening on ${sink.smtpHost}:${sink.smtpPort}`);
  console.log(`SMTP sink API listening on http://${sink.apiHost}:${sink.apiPort}`);

  const shutdown = async () => {
    await sink.close();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
