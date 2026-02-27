'use strict';


define('admin/appearance/skins', [
	'translator', 'alerts', 'settings', 'hooks', 'slugify',
], function (translator, alerts, settings, hooks, slugify) {
	const Skins = {};

	Skins.init = function () {
		// Populate skins from Bootswatch API
		$.ajax({
			method: 'get',
			url: 'https://bootswatch.com/api/5.json',
		}).done((bsData) => {
			hooks.on('action:settings.sorted-list.loaded', (data) => {
				if (data.hash === 'custom-skins') {
					// slugify all custom-skin ids after load
					$('.custom-skin-settings [data-type="list"] [data-theme]').each((i, el) => {
						$(el).attr('data-theme', slugify($(el).attr('data-theme')));
					});
					highlightSelectedTheme(app.config.bootswatchSkin);
				}
			});

			// Initialize color pickers when form is shown
			hooks.on('action:settings.sorted-list.modal', function () {
				// Small delay to ensure DOM is ready
				setTimeout(function () {
					if ($('#primary-color').length) {
						initColorPickers();
					}
				}, 100);
			});

			settings.load('custom-skins', $('.custom-skin-settings'));
			Skins.render(bsData);
		});

		$('#save-custom-skins').on('click', function () {
			settings.save('custom-skins', $('.custom-skin-settings'), function () {
				alerts.success('[[admin/appearance/skins:save-custom-skins-success]]');
			});
			return false;
		});


		$('#skins').on('click', function (e) {
			let target = $(e.target);

			if (!target.attr('data-action')) {
				target = target.parents('[data-action]');
			}

			const action = target.attr('data-action');

			if (action && action === 'use') {
				const parentEl = target.parents('[data-theme]');
				const cssSrc = parentEl.attr('data-css');
				const themeId = parentEl.attr('data-theme');
				const themeName = parentEl.attr('data-theme-name');

				socket.emit('admin.themes.set', {
					type: 'bootswatch',
					id: themeId,
					src: cssSrc,
				}, function (err) {
					if (err) {
						return alerts.error(err);
					}
					highlightSelectedTheme(themeId);

					alerts.alert({
						alert_id: 'admin:theme',
						type: 'info',
						title: '[[admin/appearance/skins:skin-updated]]',
						message: themeId ? ('[[admin/appearance/skins:applied-success, ' + themeName + ']]') : '[[admin/appearance/skins:revert-success]]',
						timeout: 5000,
					});
				});
			}
		});
	};

	Skins.render = function (bootswatch) {
		const themeContainer = $('#bootstrap_themes');

		app.parseAndTranslate('admin/partials/theme_list', {
			themes: bootswatch.themes.map(function (theme) {
				return {
					type: 'bootswatch',
					id: theme.name.toLowerCase(),
					name: theme.name,
					description: theme.description,
					screenshot_url: theme.thumbnail,
					url: theme.preview,
					css: theme.cssCdn,
					skin: true,
				};
			}),
			showRevert: true,
		}, function (html) {
			themeContainer.html(html);

			highlightSelectedTheme(app.config.bootswatchSkin);
		});
	};

	function highlightSelectedTheme(themeId) {
		translator.translate('[[admin/appearance/skins:select-skin]]  ||  [[admin/appearance/skins:current-skin]]', function (text) {
			text = text.split('  ||  ');
			const select = text[0];
			const current = text[1];

			$('[data-theme]')
				.removeClass('selected')
				.find('[data-action="use"]').each(function () {
					if ($(this).parents('[data-theme]').attr('data-theme')) {
						$(this)
							.html(select)
							.removeClass('btn-success')
							.addClass('btn-primary');
					}
				});

			if (!themeId) {
				return;
			}

			$('[data-theme="' + themeId + '"]')
				.addClass('selected')
				.find('[data-action="use"]')
				.html(current)
				.removeClass('btn-primary')
				.addClass('btn-success');
		});
	}

	function initColorPickers() {
		const primaryColorPicker = $('#primary-color');
		const primaryColorText = $('#primary-color-text');
		const secondaryColorPicker = $('#secondary-color');
		const secondaryColorText = $('#secondary-color-text');
		const variablesTextarea = $('#custom-skin-variables');

		if (!primaryColorPicker.length || !variablesTextarea.length) {
			return;
		}

		// Parse existing colors from variables
		const variables = variablesTextarea.val();
		const primaryMatch = variables.match(/\$primary:\s*([^;]+);/);
		const secondaryMatch = variables.match(/\$secondary:\s*([^;]+);/);

		if (primaryMatch) {
			const primaryColor = parseColor(primaryMatch[1].trim());
			if (primaryColor) {
				primaryColorPicker.val(primaryColor);
				primaryColorText.val(primaryColor);
			}
		}

		if (secondaryMatch) {
			const secondaryColor = parseColor(secondaryMatch[1].trim());
			if (secondaryColor) {
				secondaryColorPicker.val(secondaryColor);
				secondaryColorText.val(secondaryColor);
			}
		}

		// Update variables when color picker changes
		primaryColorPicker.on('input', function () {
			const color = $(this).val();
			primaryColorText.val(color);
			updateVariables();
		});

		secondaryColorPicker.on('input', function () {
			const color = $(this).val();
			secondaryColorText.val(color);
			updateVariables();
		});

		// Update color picker and variables when text input changes
		primaryColorText.on('input', function () {
			const color = $(this).val();
			if (isValidColor(color)) {
				primaryColorPicker.val(color);
				updateVariables();
			}
		});

		secondaryColorText.on('input', function () {
			const color = $(this).val();
			if (isValidColor(color)) {
				secondaryColorPicker.val(color);
				updateVariables();
			}
		});

		function updateVariables() {
			let vars = variablesTextarea.val();
			const primaryColor = primaryColorPicker.val();
			const secondaryColor = secondaryColorPicker.val();

			// Update or add $primary
			if (vars.match(/\$primary:/)) {
				vars = vars.replace(/\$primary:\s*[^;]+;/, `$primary: ${primaryColor};`);
			} else {
				// Add at the beginning if not present
				vars = `$primary: ${primaryColor};\n$secondary: ${secondaryColor};\n` + vars;
			}

			// Update or add $secondary
			if (vars.match(/\$secondary:/)) {
				vars = vars.replace(/\$secondary:\s*[^;]+;/, `$secondary: ${secondaryColor};`);
			} else if (!vars.match(/\$primary:/)) {
				// Add if $primary was also not present
				vars = `$primary: ${primaryColor};\n$secondary: ${secondaryColor};\n` + vars;
			}

			variablesTextarea.val(vars);
		}

		function parseColor(colorStr) {
			// Remove quotes and whitespace
			colorStr = colorStr.replace(/['"]/g, '').trim();
			
			// Handle hex colors
			if (colorStr.match(/^#?[0-9A-Fa-f]{6}$/)) {
				return colorStr.startsWith('#') ? colorStr : '#' + colorStr;
			}
			
			// Handle rgb/rgba
			if (colorStr.startsWith('rgb')) {
				return colorStr;
			}
			
			// Try to convert common color names to hex
			const colorMap = {
				'blue': '#007bff',
				'indigo': '#6610f2',
				'purple': '#6f42c1',
				'pink': '#e83e8c',
				'red': '#dc3545',
				'orange': '#fd7e14',
				'yellow': '#ffc107',
				'green': '#28a745',
				'teal': '#20c997',
				'cyan': '#17a2b8',
				'gray': '#6c757d',
				'grey': '#6c757d',
			};
			
			if (colorMap[colorStr.toLowerCase()]) {
				return colorMap[colorStr.toLowerCase()];
			}
			
			return null;
		}

		function isValidColor(color) {
			return /^#?[0-9A-Fa-f]{6}$/.test(color) || color.startsWith('rgb');
		}
	}

	return Skins;
});
