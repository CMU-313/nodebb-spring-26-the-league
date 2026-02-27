<!DOCTYPE html>
<html lang="{function.localeToHTML, userLang, defaultLang}" {{{if languageDirection}}}data-dir="{languageDirection}" style="direction: {languageDirection};"{{{end}}}>
<head>
	<title>{browserTitle}</title>
	{{{each metaTags}}}{function.buildMetaTag}{{{end}}}
	<link rel="stylesheet" type="text/css" href="{relative_path}/assets/client{{{if bootswatchCssSkin}}}-{bootswatchCssSkin}{{{end}}}{{{ if (languageDirection=="rtl") }}}-rtl{{{ end }}}.css?{config.cache-buster}" />
	{{{each linkTags}}}{function.buildLinkTag}{{{end}}}

	<script>
		var config = JSON.parse('{{configJSON}}');
		var app = {
			user: JSON.parse('{{userJSON}}')
		};
		document.documentElement.style.setProperty('--panel-offset', `0px`);
		
		// Apply custom theme colors on page load (prevents FOUC)
		(function() {
			if (config.bootswatchSkin !== 'custom') return;
			var s = config;
			var validHex = /^#[0-9A-Fa-f]{6}$/;
			function hexToRgb(hex) {
				var r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
				return r ? parseInt(r[1],16)+','+parseInt(r[2],16)+','+parseInt(r[3],16) : null;
			}
			function shade(hex, pct) {
				hex = hex.replace('#','');
				var n = parseInt(hex,16);
				var r = Math.min(255,Math.max(0,(n>>16)+Math.round(2.55*pct)));
				var g = Math.min(255,Math.max(0,((n>>8)&0xFF)+Math.round(2.55*pct)));
				var b = Math.min(255,Math.max(0,(n&0xFF)+Math.round(2.55*pct)));
				return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
			}
			var root = document.documentElement;
			var css = '';
			if (s.customThemeColor_bodyBg && validHex.test(s.customThemeColor_bodyBg)) {
				root.style.setProperty('--bs-body-bg', s.customThemeColor_bodyBg, 'important');
				root.style.setProperty('--bs-body-bg-rgb', hexToRgb(s.customThemeColor_bodyBg));
			}
			if (s.customThemeColor_bodyText && validHex.test(s.customThemeColor_bodyText)) {
				root.style.setProperty('--bs-body-color', s.customThemeColor_bodyText, 'important');
				root.style.setProperty('--bs-body-color-rgb', hexToRgb(s.customThemeColor_bodyText));
			}
			if (s.customThemeColor_linkColor && validHex.test(s.customThemeColor_linkColor)) {
				root.style.setProperty('--bs-link-color', s.customThemeColor_linkColor, 'important');
				root.style.setProperty('--bs-link-color-rgb', hexToRgb(s.customThemeColor_linkColor));
				css += '.skin-custom a{color:'+s.customThemeColor_linkColor+' !important}';
			}
			if (s.customThemeColor_headerBg && validHex.test(s.customThemeColor_headerBg)) {
				css += '.skin-custom .sidebar-left,.skin-custom .sidebar-right,.skin-custom .brand-container{background-color:'+s.customThemeColor_headerBg+' !important}';
				css += '.skin-custom .sidebar-left .nav-link:hover,.skin-custom .sidebar-right .nav-link:hover{background-color:rgba(255,255,255,0.1) !important}';
			}
			if (s.customThemeColor_headerText && validHex.test(s.customThemeColor_headerText)) {
				css += '.skin-custom .sidebar-left,.skin-custom .sidebar-right,.skin-custom .brand-container{color:'+s.customThemeColor_headerText+' !important}';
				css += '.skin-custom .sidebar-left a,.skin-custom .sidebar-left .nav-link,.skin-custom .sidebar-right a,.skin-custom .sidebar-right .nav-link,.skin-custom .brand-container a{color:'+s.customThemeColor_headerText+' !important}';
			}
			if (s.customThemeColor_buttonBg && validHex.test(s.customThemeColor_buttonBg)) {
				var bg = s.customThemeColor_buttonBg;
				var dk = shade(bg,-20);
				css += '.skin-custom .btn-primary{background-color:'+bg+' !important;border-color:'+bg+' !important}';
				css += '.skin-custom .btn-primary:hover,.skin-custom .btn-primary:focus,.skin-custom .btn-primary:active{background-color:'+dk+' !important;border-color:'+dk+' !important}';
				root.style.setProperty('--bs-primary', bg, 'important');
				root.style.setProperty('--bs-primary-rgb', hexToRgb(bg));
			}
			if (s.customThemeColor_buttonText && validHex.test(s.customThemeColor_buttonText)) {
				css += '.skin-custom .btn-primary{color:'+s.customThemeColor_buttonText+' !important}';
			}
			if (css) {
				var el = document.createElement('style');
				el.id = 'customThemeOverrides';
				el.textContent = css;
				document.head.appendChild(el);
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
