module.exports = {
	important: ':is(#nhsa-booking-wizard-root, .nhsa-admin)',
	content: [
		'./admin/src/**/*.{js,jsx,ts,tsx}',
		'./admin/*.php',
		'./admin/views/*.php',
		'./public/src/**/*.{js,jsx,ts,tsx}',
		'./includes/**/*.php'
	],
	theme: {
		extend: {},
	},
	plugins: [require('@tailwindcss/forms')],
};

