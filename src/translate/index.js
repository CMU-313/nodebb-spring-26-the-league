'use strict';

const nconf = require('nconf');
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
		return [true, raw];
	}

	const normalizedBase = baseUrl.replace(/\/$/, '');
	const baseForUrl = normalizedBase.includes('://') ? normalizedBase : `http://${normalizedBase}`;

	let postUrl;
	let getUrl;

	try {
		postUrl = new URL('translate', `${baseForUrl}/`);
		getUrl = new URL('/', `${baseForUrl}/`);
		getUrl.searchParams.set('content', raw);
	} catch (err) {
		return [true, raw];
	}

	const timeoutMs = parseInt(nconf.get('llmTranslator:timeoutMs'), 10) || 60000;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	const jsonHeaders = { accept: 'application/json', 'content-type': 'application/json' };

	try {
		let response = await fetch(postUrl, {
			method: 'POST',
			signal: controller.signal,
			headers: jsonHeaders,
			body: JSON.stringify({ content: raw }),
		});

		if (!response.ok) {
			return [true, raw];
		}

		let body;
		try {
			body = await response.json();
		} catch (err) {
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
		return [true, raw];
	} finally {
		clearTimeout(timer);
	}
};
