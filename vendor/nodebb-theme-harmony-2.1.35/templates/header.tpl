<!DOCTYPE html>
<html lang="{function.localeToHTML, userLang, defaultLang}" {{{if languageDirection}}}data-dir="{languageDirection}" style="direction: {languageDirection};"{{{end}}}>
<head>
	<title>{browserTitle}</title>
	{{{each metaTags}}}{function.buildMetaTag}{{{end}}}
	<link rel="stylesheet" type="text/css" href="{relative_path}/assets/client{{{if bootswatchSkin}}}-{bootswatchSkin}{{{end}}}{{{ if (languageDirection=="rtl") }}}-rtl{{{ end }}}.css?{config.cache-buster}" />
	{{{each linkTags}}}{function.buildLinkTag}{{{end}}}

	<script>
		var config = JSON.parse('{{configJSON}}');
		var app = {
			user: JSON.parse('{{userJSON}}')
		};
		document.documentElement.style.setProperty('--panel-offset', `0px`);
		
		// Apply custom skin colors if custom skin is active
		(function() {
			if (config.bootswatchSkin === 'custom' && app.user) {
				// Try to get colors from user settings - they may be loaded async
				// We'll apply them via the settings page script, but also try here
				const primaryColor = '#007bff';
				const secondaryColor = '#6c757d';
				
				function hexToRgb(hex) {
					const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
					return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
				}
				
				const style = document.createElement('style');
				style.id = 'custom-skin-styles';
				style.textContent = `
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
				document.head.appendChild(style);
			}
		})();
	</script>

	{{{if useCustomHTML}}}
	{{customHTML}}
	{{{end}}}
	{{{if useCustomCSS}}}
	<style>{{customCSS}}</style>
	{{{end}}}
</head>

<body class="{bodyClass} skin-{{{if bootswatchSkin}}}{bootswatchSkin}{{{else}}}noskin{{{end}}}">
	<a class="visually-hidden-focusable position-absolute top-0 start-0 p-3 m-3 bg-body" style="z-index: 1021;" href="#content">[[global:skip-to-content]]</a>

	{{{ if config.theme.topMobilebar }}}
	<!-- IMPORT partials/mobile-header.tpl -->
	{{{ end }}}

	<div class="layout-container d-flex justify-content-between pb-4 pb-md-0">
		<!-- IMPORT partials/sidebar-left.tpl -->

		<main id="panel" class="d-flex flex-column gap-3 flex-grow-1 mt-3" style="min-width: 0;">
			<!-- IMPORT partials/header/brand.tpl -->
			<div class="container-lg px-md-4 d-flex flex-column gap-3 h-100 mb-5 mb-lg-0" id="content">
			<!-- IMPORT partials/noscript/warning.tpl -->
			<!-- IMPORT partials/noscript/message.tpl -->
