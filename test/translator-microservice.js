'use strict';

/**
 * Integration test against the LLM translator Flask app (GET /?content=…).
 *
 * Skipped unless TRANSLATOR_SERVICE_TEST=1 so normal `npm test` does not call the network.
 *
 * Run:
 *   TRANSLATOR_SERVICE_TEST=1 npm run test:translator
 *
 * Optional: TRANSLATOR_URL=http://host:port overrides config.json llmTranslator.url
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const enabled = process.env.TRANSLATOR_SERVICE_TEST === '1';

(enabled ? describe : describe.skip)('Translator microservice (TRANSLATOR_SERVICE_TEST=1)', function () {
	this.timeout(60000);

	let baseUrl;

	function contentUrl(text) {
		const root = baseUrl.replace(/\/$/, '');
		const u = new URL(`${root}/`);
		u.searchParams.set('content', text);
		return u;
	}

	before(async function () {
		if (process.env.TRANSLATOR_URL) {
			baseUrl = process.env.TRANSLATOR_URL.trim();
		} else {
			const configPath = path.join(__dirname, '../config.json');
			const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
			if (cfg.llmTranslator && typeof cfg.llmTranslator.url === 'string') {
				baseUrl = cfg.llmTranslator.url.trim();
			} else {
				baseUrl = '';
			}
		}
		if (!baseUrl) {
			this.skip();
			return;
		}

		const pingUrl = contentUrl('hi');
		try {
			const res = await fetch(pingUrl, { signal: AbortSignal.timeout(10000) });
			if (!res.ok) {
				throw new Error(
					`Translator at ${baseUrl} returned HTTP ${res.status} ${res.statusText}.\n` +
					'Start the Flask/gunicorn app and try again.'
				);
			}
		} catch (err) {
			const cause = err.cause;
			const code = cause && cause.code;
			const isRefused = code === 'ECONNREFUSED' || (err.message && err.message.includes('fetch failed'));
			if (isRefused) {
				throw new Error(
					`Cannot connect to translator at ${baseUrl}\n` +
					`  (${cause ? cause.message : err.message})\n\n` +
					'Nothing is accepting connections on that address. Typical fixes:\n' +
					'  • Start the microservice (e.g. `uv run flask` / gunicorn, or `docker compose up`).\n' +
					'  • If it listens on another port (8080 is common in Docker), run:\n' +
					'      TRANSLATOR_URL=http://127.0.0.1:8080 TRANSLATOR_SERVICE_TEST=1 npm run test:translator\n' +
					'  • From another machine/container, point TRANSLATOR_URL at the correct host.\n\n' +
					`Quick check: curl -sS "${baseUrl}/?content=test"`
				);
			}
			throw err;
		}
	});

	it('returns 200 and JSON with is_english and translated_content', async () => {
		const res = await fetch(contentUrl('Bonjour le monde'));
		assert.ok(res.ok, `expected 2xx, got ${res.status} ${res.statusText}`);
		const ct = res.headers.get('content-type') || '';
		assert.ok(ct.includes('application/json'), `expected JSON content-type, got ${ct}`);
		const data = await res.json();
		assert.ok(Object.prototype.hasOwnProperty.call(data, 'is_english'), 'response should include is_english');
		assert.ok(Object.prototype.hasOwnProperty.call(data, 'translated_content'), 'response should include translated_content');
		assert.strictEqual(typeof data.translated_content, 'string');
	});

	it('marks clear English input as English', async () => {
		const res = await fetch(contentUrl('This is a simple English sentence for testing.'));
		assert.ok(res.ok, `expected 2xx, got ${res.status}`);
		const data = await res.json();
		assert.strictEqual(data.is_english, true);
	});

	it('marks non-English input as not English and returns a string translation', async () => {
		const res = await fetch(contentUrl('Ceci est un message en français.'));
		assert.ok(res.ok, `expected 2xx, got ${res.status}`);
		const data = await res.json();
		assert.strictEqual(data.is_english, false);
		assert.ok(data.translated_content.length > 0, 'translated_content should be non-empty for French sample');
	});
});
