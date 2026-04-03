'use strict';

const nconf = require('nconf');
const winston = require('winston');
<<<<<<< Updated upstream
const utils = require('../utils');
=======
>>>>>>> Stashed changes

function plainText(html) {
	if (!html) {
		return '';
	}
	return String(utils.stripHTMLTags(String(utils.decodeHTMLEntities(html))))
		.replace(/\s+/g, ' ')
		.trim();
}

function apiSaysEnglish(data) {
	if (!data || typeof data !== 'object') {
		return true;
	}
	const v = data.is_english;
	if (v === true || v === 'true') {
		return true;
	}
	if (v === false || v === 'false') {
		return false;
	}
	return true;
}

/**
<<<<<<< Updated upstream
 * Calls the translation microservice (GET ?content=…) and maps JSON
 * { is_english, translated_content } into NodeBB post fields.
 *
 * The Harmony theme only shows “view translated message” when isEnglish is false,
 * so we set that from whether the service returned text that differs from the
 * source (after stripping HTML), not only from is_english (which can be wrong).
 *
 * @param {{ content?: string }} postData
=======
 * Calls the LLM translator microservice: GET {base}/?content=… → JSON
 * { is_english, translated_content }.
 *
 * Never throws — failures fall back to treating the post as English so topic/reply
 * creation still succeeds (otherwise the write API turns any exception into HTTP 400).
 *
>>>>>>> Stashed changes
 * @returns {Promise<[boolean, string]>}
 */
<<<<<<< Updated upstream
exports.translate = async function (postData) {
	const raw = postData && postData.content != null ? String(postData.content) : '';

	const baseUrl = nconf.get('llmTranslator:url');
	if (!baseUrl || typeof baseUrl !== 'string') {
		return [true, raw];
	}

	const maxChars = parseInt(nconf.get('llmTranslator:maxChars'), 10) || 12000;
	if (raw.length > maxChars) {
		winston.warn('[translate] Content too long for translation; skipping');
		return [true, raw];
	}

	const normalizedBase = baseUrl.replace(/\/$/, '');
	const baseForUrl = normalizedBase.includes('://') ? normalizedBase : `http://${normalizedBase}`;
	let msUrl;
	try {
		msUrl = new URL('/', `${baseForUrl}/`);
		msUrl.searchParams.set('content', raw);
	} catch (err) {
		winston.error(`[translate] Invalid llmTranslator:url: ${err.message}`);
		return [true, raw];
	}

	const timeoutMs = parseInt(nconf.get('llmTranslator:timeoutMs'), 10) || 60000;
=======
translatorApi.translate = async function (postData) {
	const raw = postData && postData.content != null ? String(postData.content) : '';
	if (!raw.trim()) {
		return [true, ''];
	}

	const cfg = nconf.get('llmTranslator');
	const baseUrl = cfg && typeof cfg.url === 'string' ? cfg.url.trim() : '';
	if (!baseUrl) {
		winston.verbose('[translate] llmTranslator.url not configured; skipping translation');
		return [true, ''];
	}

	const maxChars = Number(cfg.maxChars) > 0 ? Number(cfg.maxChars) : 12000;
	const timeoutMs = Number(cfg.timeoutMs) > 0 ? Number(cfg.timeoutMs) : 60000;
	const text = raw.length > maxChars ? raw.slice(0, maxChars) : raw;

	const root = baseUrl.replace(/\/$/, '');
	const url = new URL(`${root}/`);
	url.searchParams.set('content', text);

>>>>>>> Stashed changes
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
<<<<<<< Updated upstream
		const response = await fetch(msUrl, {
			signal: controller.signal,
			headers: { accept: 'application/json' },
		});

		if (!response.ok) {
			winston.warn(`[translate] Upstream returned HTTP ${response.status}`);
			return [true, raw];
		}

		let body;
		try {
			body = await response.json();
		} catch (err) {
			winston.warn('[translate] Invalid JSON from translator');
			return [true, raw];
		}

		let translatedStr = body.translated_content != null ? String(body.translated_content) : '';
		if (!translatedStr.trim()) {
			return [true, raw];
		}

		const rawPlain = plainText(raw);
		const transPlain = plainText(translatedStr);

		if (transPlain === '' || transPlain === rawPlain) {
			return [true, raw];
		}

		return [false, translatedStr];
	} catch (err) {
		winston.warn(`[translate] Upstream fetch failed: ${err.message}`);
		return [true, raw];
=======
		const response = await fetch(url, {
			signal: controller.signal,
			headers: { Accept: 'application/json' },
		});

		if (!response.ok) {
			winston.warn(`[translate] translator service HTTP ${response.status}`);
			return [true, ''];
		}

		const data = await response.json();
		const isEnglish = apiSaysEnglish(data);
		const translated = data.translated_content != null ? String(data.translated_content) : '';

		return [isEnglish, translated];
	} catch (err) {
		winston.warn(`[translate] ${err.message}`);
		return [true, ''];
>>>>>>> Stashed changes
	} finally {
		clearTimeout(timer);
	}
};
