'use strict';


define('forum/account/settings', [
	'forum/account/header', 'components', 'api', 'alerts', 'hooks', 'autocomplete',
], function (header, components, api, alerts, hooks, autocomplete) {
	const AccountSettings = {};
	let savedSkin = '';
	// If page skin is changed but not saved, switch the skin back
	$(window).on('action:ajaxify.start', function () {
		const skinEl = $('#bootswatchSkin');
		if (
			ajaxify.data.template.name === 'account/settings' &&
			skinEl.length && skinEl.val() !== savedSkin) {
			reskin(savedSkin);
		}
	});

	AccountSettings.init = function () {
		savedSkin = $('#bootswatchSkin').length && $('#bootswatchSkin').val();
		header.init();

		$('#submitBtn').on('click', function () {
			const settings = loadSettings();

			if (settings.homePageRoute === 'custom' && settings.homePageCustom) {
				$.get(config.relative_path + '/' + settings.homePageCustom, function () {
					saveSettings(settings);
				}).fail(function () {
					alerts.error('[[error:invalid-home-page-route]]');
				});
			} else {
				saveSettings(settings);
			}

			return false;
		});

		$('#bootswatchSkin').on('change', function () {
			const skinValue = $(this).val();
			toggleCustomSkinColors(skinValue);
			reskin(skinValue);
		});

		$('[data-property="homePageRoute"]').on('change', toggleCustomRoute);

		toggleCustomRoute();
		initCustomSkinColorPickers();
		toggleCustomSkinColors($('#bootswatchSkin').val());
		
		// Apply colors on page load if custom skin is active
		if ($('#bootswatchSkin').val() === 'custom') {
			setTimeout(applyCustomColors, 100);
		}

		components.get('user/sessions').find('.timeago').timeago();

		handleChatAllowDenyList();
	};

	function loadSettings() {
		const settings = {};

		$('.account').find('input, textarea, select').each(function (id, input) {
			input = $(input);
			const setting = input.attr('data-property');
			if (!setting) {
				return;
			}
			if (input.is('select')) {
				settings[setting] = input.val();
				return;
			}

			switch (input.attr('type')) {
				case 'checkbox':
					settings[setting] = input.is(':checked') ? 1 : 0;
					break;
				default:
					settings[setting] = input.val();
					break;
			}
		});

		const chatAllowList = $('[component="chat/allow/list/user"][data-uid]')
			.map((i, el) => $(el).data('uid')).get();
		const chatDenyList = $('[component="chat/deny/list/user"][data-uid]')
			.map((i, el) => $(el).data('uid')).get();
		settings.chatAllowList = JSON.stringify(chatAllowList);
		settings.chatDenyList = JSON.stringify(chatDenyList);

		return settings;
	}

	function saveSettings(settings) {
		api.put(`/users/${ajaxify.data.uid}/settings`, { settings }).then((newSettings) => {
			alerts.success('[[success:settings-saved]]');
			let languageChanged = false;
			for (const [key, value] of Object.entries(newSettings)) {
				if (key === 'userLang' && config.userLang !== newSettings.userLang) {
					languageChanged = true;
				}
				if (key === 'bootswatchSkin') {
					savedSkin = newSettings.bootswatchSkin;
					config.bootswatchSkin = savedSkin === 'noskin' ? '' : savedSkin;
				} else if (config.hasOwnProperty(key)) {
					config[key] = value;
				}
			}

			if (languageChanged && parseInt(app.user.uid, 10) === parseInt(ajaxify.data.theirid, 10)) {
				window.location.reload();
			}
		}).catch(alerts.error);
	}

	function toggleCustomRoute() {
		if ($('[data-property="homePageRoute"]').val() === 'custom') {
			$('#homePageCustomContainer').show();
		} else {
			$('#homePageCustomContainer').hide();
			$('[data-property="homePageCustom"]').val('');
		}
	}

	function toggleCustomSkinColors(skinValue) {
		// Check if "custom" skin is selected (slugified value)
		const customSkinValue = 'custom';
		if (skinValue === customSkinValue) {
			$('#custom-skin-colors').show();
		} else {
			$('#custom-skin-colors').hide();
		}
	}

	function initCustomSkinColorPickers() {
		const primaryColorPicker = $('#custom-primary-color');
		const primaryColorText = $('#custom-primary-color-text');
		const secondaryColorPicker = $('#custom-secondary-color');
		const secondaryColorText = $('#custom-secondary-color-text');

		if (!primaryColorPicker.length) {
			return;
		}

		// Sync color picker with text input
		primaryColorPicker.on('input', function () {
			const color = $(this).val();
			primaryColorText.val(color);
			applyCustomColors();
		});

		secondaryColorPicker.on('input', function () {
			const color = $(this).val();
			secondaryColorText.val(color);
			applyCustomColors();
		});

		// Sync text input with color picker
		primaryColorText.on('input', function () {
			const color = $(this).val();
			if (isValidColor(color)) {
				primaryColorPicker.val(color);
				applyCustomColors();
			}
		});

		secondaryColorText.on('input', function () {
			const color = $(this).val();
			if (isValidColor(color)) {
				secondaryColorPicker.val(color);
				applyCustomColors();
			}
		});

		// Initialize text inputs from color pickers
		if (primaryColorPicker.val()) {
			primaryColorText.val(primaryColorPicker.val());
		}
		if (secondaryColorPicker.val()) {
			secondaryColorText.val(secondaryColorPicker.val());
		}

		// Apply colors if custom skin is active
		if ($('#bootswatchSkin').val() === 'custom') {
			applyCustomColors();
		}
	}

	function applyCustomColors() {
		// Get colors from settings page inputs or from saved settings
		let primaryColor = $('#custom-primary-color').length ? $('#custom-primary-color').val() : null;
		let secondaryColor = $('#custom-secondary-color').length ? $('#custom-secondary-color').val() : null;
		
		// If not on settings page, try to get from config or make API call
		if (!primaryColor && config.bootswatchSkin === 'custom' && app.user && app.user.uid) {
			// Colors will be loaded from user settings when page loads
			// For now, use defaults - they'll be updated when settings are loaded
			primaryColor = primaryColor || '#007bff';
			secondaryColor = secondaryColor || '#6c757d';
		}

		if (!primaryColor || !secondaryColor) {
			return;
		}

		// Apply colors via CSS custom properties globally
		if (!document.getElementById('custom-skin-styles')) {
			const style = document.createElement('style');
			style.id = 'custom-skin-styles';
			document.head.appendChild(style);
		}

		const styleEl = document.getElementById('custom-skin-styles');
		styleEl.textContent = `
			.skin-custom {
				--bs-primary: ${primaryColor} !important;
				--bs-primary-rgb: ${hexToRgb(primaryColor)} !important;
				--bs-secondary: ${secondaryColor} !important;
				--bs-secondary-rgb: ${hexToRgb(secondaryColor)} !important;
			}
			.skin-custom .btn-primary {
				background-color: ${primaryColor} !important;
				border-color: ${primaryColor} !important;
			}
			.skin-custom .btn-secondary {
				background-color: ${secondaryColor} !important;
				border-color: ${secondaryColor} !important;
			}
			.skin-custom .text-primary {
				color: ${primaryColor} !important;
			}
			.skin-custom .text-secondary {
				color: ${secondaryColor} !important;
			}
			.skin-custom .bg-primary {
				background-color: ${primaryColor} !important;
			}
			.skin-custom .bg-secondary {
				background-color: ${secondaryColor} !important;
			}
		`;
	}

	function hexToRgb(hex) {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
	}

	function isValidColor(color) {
		return /^#?[0-9A-Fa-f]{6}$/.test(color);
	}

	function reskin(skinName) {
		const clientEl = Array.prototype.filter.call(document.querySelectorAll('link[rel="stylesheet"]'), function (el) {
			return el.href.indexOf(config.relative_path + '/assets/client') !== -1;
		})[0] || null;
		if (!clientEl) {
			return;
		}

		if (skinName === '') {
			skinName = config.defaultBootswatchSkin || '';
		} else if (skinName === 'noskin') {
			skinName = '';
		}

		const currentSkinClassName = $('body').attr('class').split(/\s+/).filter(function (className) {
			return className.startsWith('skin-');
		});
		if (!currentSkinClassName[0]) {
			return;
		}
		let currentSkin = currentSkinClassName[0].slice(5);
		currentSkin = currentSkin !== 'noskin' ? currentSkin : '';

		// Stop execution if skin didn't change
		if (skinName === currentSkin) {
			hooks.fire('action:skin.change', { skin: skinName, currentSkin });
			return;
		}
		const langDir = $('html').attr('data-dir');
		const linkEl = document.createElement('link');
		linkEl.rel = 'stylesheet';
		linkEl.type = 'text/css';
		linkEl.href = config.relative_path +
			'/assets/client' + (skinName ? '-' + skinName : '') +
			(langDir === 'rtl' ? '-rtl' : '') +
			'.css?' + config['cache-buster'];
		linkEl.onload = function () {
			clientEl.parentNode.removeChild(clientEl);

			// Update body class with proper skin name
			$('body').removeClass(currentSkinClassName.join(' '));
			$('body').addClass('skin-' + (skinName || 'noskin'));
			
			// Apply custom colors if custom skin is selected
			if (skinName === 'custom') {
				applyCustomColors();
			}
			
			hooks.fire('action:skin.change', { skin: skinName, currentSkin });
		};

		document.head.appendChild(linkEl);
	}

	AccountSettings.changeSkin = async function (skin) {
		if (app.user.uid) {
			await api.put(`/users/${app.user.uid}/settings`, { settings: { bootswatchSkin: skin } });
		}
		config.bootswatchSkin = skin === 'noskin' ? '' : skin;
		savedSkin = skin;
		reskin(skin);
	};

	function handleChatAllowDenyList() {
		autocomplete.user($('#chatAllowListAdd'), async function (ev, selected) {
			const { user } = selected.item;
			if (!user || String(user.uid) === String(app.user.uid)) {
				return;
			}
			if ($(`[component="chat/allow/list/user"][data-uid="${user.uid}"]`).length) {
				return alerts.error('[[error:chat-allow-list-user-already-added]]');
			}
			const html = await app.parseAndTranslate('account/settings', 'settings.chatAllowListUsers', {
				settings: { chatAllowListUsers: [selected.item.user] },
			});

			$('[component="chat/allow/list"]').append(html);
			$('#chatAllowListAdd').val('');
			toggleNoUsersElement();
		});

		autocomplete.user($('#chatDenyListAdd'), async function (ev, selected) {
			const { user } = selected.item;
			if (!user || String(user.uid) === String(app.user.uid)) {
				return;
			}
			if ($(`[component="chat/deny/list/user"][data-uid="${user.uid}"]`).length) {
				return alerts.error('[[error:chat-deny-list-user-already-added]]');
			}
			const html = await app.parseAndTranslate('account/settings', 'settings.chatDenyListUsers', {
				settings: { chatDenyListUsers: [selected.item.user] },
			});

			$('[component="chat/deny/list"]').append(html);
			$('#chatDenyListAdd').val('');
			toggleNoUsersElement();
		});

		$('[component="chat/allow/list"]').on('click', '[component="chat/allow/delete"]', function () {
			$(this).parent().remove();
			toggleNoUsersElement();
		});

		$('[component="chat/deny/list"]').on('click', '[component="chat/deny/delete"]', function () {
			$(this).parent().remove();
			toggleNoUsersElement();
		});

		function toggleNoUsersElement() {
			$('[component="chat/allow/list/no-users"]').toggleClass('hidden', !!$('[component="chat/allow/list/user"]').length);
			$('[component="chat/deny/list/no-users"]').toggleClass('hidden', !!$('[component="chat/deny/list/user"]').length);
		}
	}

	return AccountSettings;
});
