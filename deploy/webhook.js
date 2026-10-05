/**
 * GitHub Webhook Listener for auto-deployment
 * Listens on port 9000 for GitHub push events
 * Verifies webhook signature and triggers deploy.sh
 */

const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');
const fs = require('fs');

// Configuration
const PORT = 9000;
const SECRET = process.env.WEBHOOK_SECRET || '8a8308b890ab4c1058b69cf5b17df81c063b7cf2';
const DEPLOY_SCRIPT = '/var/www/travel-site/deploy/deploy.sh';
const BRANCH = 'main';

function log(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}`;
    console.log(line);
    fs.appendFileSync('/var/log/travel-site-webhook.log', line + '\n');
}

function verifySignature(payload, signature) {
    if (!signature) return false;
    const sig = `sha256=${crypto.createHmac('sha256', SECRET).update(payload).digest('hex')}`;
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(signature));
}

const server = http.createServer((req, res) => {
    // Health check endpoint
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
        return;
    }

    // Only accept POST to /webhook
    if (req.method !== 'POST' || req.url !== '/webhook') {
        res.writeHead(404);
        res.end('Not Found');
        return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });

    req.on('end', () => {
        // Verify GitHub signature
        const signature = req.headers['x-hub-signature-256'];
        if (!verifySignature(body, signature)) {
            log('❌ Invalid webhook signature. Rejected.');
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        let payload;
        try {
            payload = JSON.parse(body);
        } catch (e) {
            log('❌ Invalid JSON payload');
            res.writeHead(400);
            res.end('Bad Request');
            return;
        }

        // Check event type
        const event = req.headers['x-github-event'];
        if (event !== 'push') {
            log(`ℹ️  Ignored event: ${event}`);
            res.writeHead(200);
            res.end('OK - Ignored');
            return;
        }

        // Check branch
        const ref = payload.ref || '';
        if (ref !== `refs/heads/${BRANCH}`) {
            log(`ℹ️  Ignored push to ${ref} (not ${BRANCH})`);
            res.writeHead(200);
            res.end('OK - Wrong branch');
            return;
        }

        // Trigger deployment
        const pusher = payload.pusher?.name || 'unknown';
        const commitMsg = payload.head_commit?.message || 'no message';
        log(`🚀 Push detected by ${pusher}: "${commitMsg}"`);
        log('🔄 Starting deployment...');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'deploying' }));

        // Run deploy script asynchronously
        execFile('bash', [DEPLOY_SCRIPT], { timeout: 600000 }, (error, stdout, stderr) => {
            if (error) {
                log(`❌ Deploy failed: ${error.message}`);
                if (stderr) log(`STDERR: ${stderr}`);
            } else {
                log('✅ Deploy completed successfully!');
            }
            if (stdout) log(`STDOUT: ${stdout}`);
        });
    });
});

server.listen(PORT, '127.0.0.1', () => {
    log(`🎧 Webhook server listening on 127.0.0.1:${PORT}`);
});

process.on('uncaughtException', (err) => {
    log(`💥 Uncaught Exception: ${err.message}`);
});
