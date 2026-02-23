#!/usr/bin/env node

'use strict';

// Script to add a custom skin called "custom" to NodeBB
// Usage: node scripts/add-custom-skin.js

const nconf = require('nconf');
const path = require('path');

// Initialize nconf properly (same as CLI does)
nconf.argv().env({
	separator: '__',
});

// Initialize nconf first
const prestart = require('../src/prestart');
prestart.loadConfig(path.join(__dirname, '../config.json'));

const script = module.exports;

script.run = async function () {
	// Load NodeBB modules after config is loaded
	const db = require('../src/database');
	const meta = require('../src/meta');

	// Initialize database and meta
	await db.init();
	await meta.configs.init();

	// Get existing custom skins
	const existingSkins = await meta.settings.get('custom-skins');
	const customSkinList = existingSkins && existingSkins['custom-skin-list'] ? existingSkins['custom-skin-list'] : [];

	// Check if "custom" skin already exists
	const skinExists = customSkinList.some(skin => 
		skin && skin['custom-skin-name'] && skin['custom-skin-name'].toLowerCase() === 'custom'
	);

	if (skinExists) {
		console.log('Custom skin "custom" already exists!');
		process.exit(0);
		return;
	}

	// Default SCSS variables for the custom skin
	// You can customize these Bootstrap variables
	const defaultVariables = `// Custom skin variables
// Override Bootstrap variables here
// Example:
// $primary: #007bff;
// $secondary: #6c757d;
// $success: #28a745;
// $info: #17a2b8;
// $warning: #ffc107;
// $danger: #dc3545;
// $light: #f8f9fa;
// $dark: #343a40;

// Body
// $body-bg: #ffffff;
// $body-color: #212529;

// You can add more Bootstrap variable overrides as needed
`;

	// Add the new custom skin
	const newSkin = {
		'custom-skin-name': 'Custom',
		'_variables': defaultVariables,
	};

	customSkinList.push(newSkin);

	// Save the updated skin list
	await meta.settings.set('custom-skins', {
		'custom-skin-list': customSkinList,
	});

	console.log('Custom skin "Custom" has been added successfully!');
	console.log('You can now:');
	console.log('1. Go to Admin > Appearance > Skins > Custom Skins');
	console.log('2. Edit the "Custom" skin to add your SCSS variables');
	console.log('3. Rebuild the theme: nodebb build');
	console.log('4. Restart NodeBB');
};

// Run the script if called directly
if (require.main === module) {
	(async () => {
		try {
			await script.run();
			process.exit(0);
		} catch (err) {
			console.error('Error:', err);
			process.exit(1);
		}
	})();
}
