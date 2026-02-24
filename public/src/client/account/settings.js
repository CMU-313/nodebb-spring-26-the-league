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

	const customColorKeys = [
		'customThemeColor_headerBg', 'customThemeColor_headerText',
		'customThemeColor_bodyBg', 'customThemeColor_bodyText',
		'customThemeColor_linkColor',
		'customThemeColor_buttonBg', 'customThemeColor_buttonText',
	];

	function initCustomSkinColorPickers() {
		if (!$('#customThemeColor_headerBg').length) {
			return;
		}

		customColorKeys.forEach(function (key) {
			const picker = $('#' + key + '_picker');
			const textInput = $('#' + key);

			picker.on('input change', function () {
				textInput.val($(this).val());
				applyCustomColors();
			});

			textInput.on('input change', function () {
				const val = $(this).val();
				if (isValidColor(val)) {
					picker.val(val);
					applyCustomColors();
				}
			});
		});

		$('#resetCustomColors').on('click', function () {
			customColorKeys.forEach(function (key) {
				$('#' + key).val('');
				$('#' + key + '_picker').val('#ffffff');
			});
			removeCustomColors();
		});

		if ($('#bootswatchSkin').val() === 'custom') {
			applyCustomColors();
		}
	}

	function applyCustomColors() {
		const colors = {};
		let hasAny = false;

		customColorKeys.forEach(function (key) {
			const el = $('#' + key);
			let val = el.length ? el.val() : '';
			if (!val && config[key]) {
				val = config[key];
			}
			if (val && isValidColor(val)) {
				colors[key] = val;
				hasAny = true;
			}
		});

		if (!hasAny) {
			removeCustomColors();
			return;
		}

		const root = document.documentElement;
		let css = '';

		if (colors.customThemeColor_bodyBg) {
			root.style.setProperty('--bs-body-bg', colors.customThemeColor_bodyBg, 'important');
			root.style.setProperty('--bs-body-bg-rgb', hexToRgb(colors.customThemeColor_bodyBg));
		}
		if (colors.customThemeColor_bodyText) {
			root.style.setProperty('--bs-body-color', colors.customThemeColor_bodyText, 'important');
			root.style.setProperty('--bs-body-color-rgb', hexToRgb(colors.customThemeColor_bodyText));
		}
		if (colors.customThemeColor_linkColor) {
			root.style.setProperty('--bs-link-color', colors.customThemeColor_linkColor, 'important');
			root.style.setProperty('--bs-link-color-rgb', hexToRgb(colors.customThemeColor_linkColor));
			css += '.skin-custom a { color: ' + colors.customThemeColor_linkColor + ' !important; }\n';
		}
		if (colors.customThemeColor_headerBg || colors.customThemeColor_headerText) {
			css += '.skin-custom .sidebar-left, .skin-custom .sidebar-right, .skin-custom .brand-container {';
			if (colors.customThemeColor_headerBg) {
				css += ' background-color: ' + colors.customThemeColor_headerBg + ' !important;';
			}
			if (colors.customThemeColor_headerText) {
				css += ' color: ' + colors.customThemeColor_headerText + ' !important;';
			}
			css += ' }\n';
			if (colors.customThemeColor_headerText) {
				css += '.skin-custom .sidebar-left a, .skin-custom .sidebar-left .nav-link,';
				css += ' .skin-custom .sidebar-right a, .skin-custom .sidebar-right .nav-link,';
				css += ' .skin-custom .brand-container a';
				css += ' { color: ' + colors.customThemeColor_headerText + ' !important; }\n';
			}
			if (colors.customThemeColor_headerBg) {
				css += '.skin-custom .sidebar-left .nav-link:hover, .skin-custom .sidebar-right .nav-link:hover { background-color: rgba(255,255,255,0.1) !important; }\n';
			}
		}
		if (colors.customThemeColor_buttonBg || colors.customThemeColor_buttonText) {
			const bg = colors.customThemeColor_buttonBg;
			const txt = colors.customThemeColor_buttonText;
			css += '.skin-custom .btn-primary {';
			if (bg) {
				css += ' background-color: ' + bg + ' !important; border-color: ' + bg + ' !important;';
				root.style.setProperty('--bs-primary', bg, 'important');
				root.style.setProperty('--bs-primary-rgb', hexToRgb(bg));
			}
			if (txt) { css += ' color: ' + txt + ' !important;'; }
			css += ' }\n';
			if (bg) {
				const dark = shadeColor(bg, -20);
				const light = shadeColor(bg, 40);
				css += '.skin-custom .btn-primary:hover, .skin-custom .btn-primary:focus, .skin-custom .btn-primary:active { background-color: ' + dark + ' !important; border-color: ' + dark + ' !important; }\n';
				css += '.skin-custom .btn-outline-primary { color: ' + bg + ' !important; border-color: ' + bg + ' !important; }\n';
				css += '.skin-custom .btn-outline-primary:hover { background-color: ' + bg + ' !important; color: #fff !important; }\n';
				css += '.skin-custom .nav-link.active { color: ' + bg + ' !important; }\n';
				css += '.skin-custom .nav-pills .nav-link.active { background-color: ' + bg + ' !important; color: #fff !important; }\n';
				css += '.skin-custom .page-item.active .page-link { background-color: ' + bg + ' !important; border-color: ' + bg + ' !important; color: #fff !important; }\n';
				css += '.skin-custom .form-check-input:checked { background-color: ' + bg + ' !important; border-color: ' + bg + ' !important; }\n';
				css += '.skin-custom .form-control:focus, .skin-custom .form-select:focus { border-color: ' + light + ' !important; box-shadow: 0 0 0 0.25rem rgba(' + hexToRgb(bg) + ', 0.25) !important; }\n';
				css += '.skin-custom .badge.bg-primary { background-color: ' + bg + ' !important; }\n';
				css += '.skin-custom .list-group-item.active { background-color: ' + bg + ' !important; border-color: ' + bg + ' !important; }\n';
				css += '.skin-custom .dropdown-item.active, .skin-custom .dropdown-item:active { background-color: ' + bg + ' !important; }\n';
				css += '.skin-custom .progress-bar { background-color: ' + bg + ' !important; }\n';
			}
		}

		$('#customThemeOverrides').remove();
		if (css) {
			$('<style id="customThemeOverrides">' + css + '</style>').appendTo('head');
		}
	}

	function removeCustomColors() {
		const root = document.documentElement;
		['--bs-body-bg', '--bs-body-bg-rgb', '--bs-body-color', '--bs-body-color-rgb',
			'--bs-link-color', '--bs-link-color-rgb', '--bs-primary', '--bs-primary-rgb',
		].forEach(function (prop) { root.style.removeProperty(prop); });
		$('#customThemeOverrides').remove();
	}

	function shadeColor(hex, percent) {
		hex = hex.replace('#', '');
		let r = parseInt(hex.substring(0, 2), 16) + Math.round(2.55 * percent);
		let g = parseInt(hex.substring(2, 4), 16) + Math.round(2.55 * percent);
		let b = parseInt(hex.substring(4, 6), 16) + Math.round(2.55 * percent);
		r = Math.min(255, Math.max(0, r));
		g = Math.min(255, Math.max(0, g));
		b = Math.min(255, Math.max(0, b));
		return '#' + ('0' + r.toString(16)).slice(-2) + ('0' + g.toString(16)).slice(-2) + ('0' + b.toString(16)).slice(-2);
	}

	function hexToRgb(hex) {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? parseInt(result[1], 16) + ', ' + parseInt(result[2], 16) + ', ' + parseInt(result[3], 16) : '0, 0, 0';
	}

	function isValidColor(color) {
		return /^#[0-9A-Fa-f]{6}$/.test(color);
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

		// 'custom' skin uses default CSS with color overrides applied separately
		const cssSkinName = skinName === 'custom' ? '' : skinName;

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
			'/assets/client' + (cssSkinName ? '-' + cssSkinName : '') +
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
