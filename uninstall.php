<?php
/**
 * Uninstall cleanup for NicheHotel Sync
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// Remove custom roles/capabilities
require_once __DIR__ . '/includes/class-rbac.php';
if ( class_exists( 'NicheHotel_RBAC' ) ) {
	NicheHotel_RBAC::remove_roles();
}

// Remove stored options.
$option_keys = [
	'nichehotel_sync_ai_license_key',
	'nichehotel_sync_ai_license_status',
	'nichehotel_sync_ai_webhook_url',
	'nichehotel_sync_ai_gumroad_product',
	'nichehotel_sync_ai_webhook_booking_created',
	'nichehotel_sync_ai_webhook_guest_checked_in',
	'nichehotel_sync_ai_webhook_guest_checked_out',
	'nichehotel_sync_ai_webhook_payment_received',
];

foreach ( $option_keys as $key ) {
	delete_option( $key );
}

