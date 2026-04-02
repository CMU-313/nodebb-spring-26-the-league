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

/**
 * Calls the translation microservice (GET ?content=…) and maps JSON
 * { is_english, translated_content } into NodeBB post fields.
 *
 * The Harmony theme only shows “view translated message” when isEnglish is false,
 * so we set that from whether the service returned text that differs from the
 * source (after stripping HTML), not only from is_english (which can be wrong).
 *
 * @param {{ content?: string }} postData
 * @returns {Promise<[boolean, string]>}
 */
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
	} finally {
		clearTimeout(timer);
	}
};
