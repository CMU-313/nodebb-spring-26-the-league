'use strict';

const nconf = require('nconf');
const winston = require('winston');
const utils = require('../utils');

function plainText(html) {
	if (!html) {
		return '';
	}
	return String(utils.stripHTMLTags(String(utils.decodeHTMLEntities(html))))
		.replace(/\s+/g, ' ')
		.trim();
}

/** First URL from comma list; env wins (same idea as llmTranslator controller). */
function getPrimaryTranslatorBaseUrl() {
	const fromEnv = process.env.LLM_TRANSLATOR_URL;
	const fromConf = nconf.get('llmTranslator:url');
	const raw = (typeof fromEnv === 'string' && fromEnv.trim()) ?
		fromEnv.trim() :
		(typeof fromConf === 'string' ? fromConf.trim() : '');
	if (!raw) {
		return '';
	}
	return raw.split(',')[0].trim();
}

/**
 * Calls the translation microservice (GET ?content=…) and maps JSON
 * { is_english, translated_content } into NodeBB post fields.
 *
 * Harmony shows “view translated message” only when isEnglish is false; we treat
 * distinct translated text (after stripping HTML) as non-English for display.
 *
 * @param {{ content?: string }} postData
 * @returns {Promise<[boolean, string]>}
 */
exports.translate = async function (postData) {
	const raw = postData && postData.content != null ? String(postData.content) : '';

	const baseUrl = getPrimaryTranslatorBaseUrl();
	if (!baseUrl) {
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
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
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

		const translatedStr = body.translated_content != null ? String(body.translated_content) : '';
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
	} finally {
		clearTimeout(timer);
	}
};
