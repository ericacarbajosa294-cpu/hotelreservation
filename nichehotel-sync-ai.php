<?php
/**
 * Plugin Name: NicheHotel Sync
 * Plugin URI: https://example.com/nichehotel-sync-ai
 * Description: Sync hotel bookings, events, and automations with Make.com using lightweight webhooks and AI-ready endpoints.
 * Version: 1.0.0
 * Author: Your Name
 * Author URI: https://example.com
 * Text Domain: nichehotel-sync-ai
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'NICHEHOTEL_SYNC_AI_VERSION', '1.0.0' );
define( 'NICHEHOTEL_SYNC_AI_PATH', plugin_dir_path( __FILE__ ) );
define( 'NICHEHOTEL_SYNC_AI_URL', plugin_dir_url( __FILE__ ) );

// Autoloader for plugin classes.
require_once NICHEHOTEL_SYNC_AI_PATH . 'includes/class-loader.php';
// RBAC & Permissions for activation/uninstall hooks
require_once NICHEHOTEL_SYNC_AI_PATH . 'includes/class-rbac.php';
require_once NICHEHOTEL_SYNC_AI_PATH . 'includes/class-permissions.php';
require_once NICHEHOTEL_SYNC_AI_PATH . 'includes/class-activity-logger.php';
require_once NICHEHOTEL_SYNC_AI_PATH . 'includes/class-activity-monitor.php';

// Activation: ensure CPTs are registered and rewrite rules are flushed.
register_activation_hook( __FILE__, function () {
	if ( class_exists( '\\NicheHotelSyncAI\\CPT' ) ) {
		\NicheHotelSyncAI\CPT::register_post_types();
	}
	// RBAC roles
	if ( class_exists( 'NicheHotel_RBAC' ) ) {
		NicheHotel_RBAC::setup_roles();
	}
	// Activity logs table
	if ( class_exists( 'NicheHotel_Activity_Logger' ) ) {
		NicheHotel_Activity_Logger::create_table();
	}
	// Schedule daily license validation
	if ( ! wp_next_scheduled( \NicheHotelSyncAI\Plugin_License_Manager::CRON_HOOK ) && function_exists( 'wp_schedule_event' ) ) {
		wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', \NicheHotelSyncAI\Plugin_License_Manager::CRON_HOOK );
	}
	// Schedule Gumroad license validation
	if ( function_exists( 'wp_next_scheduled' ) && ! wp_next_scheduled( \NicheHotelSyncAI\Gumroad_License_Manager::CRON_HOOK ) ) {
		wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', \NicheHotelSyncAI\Gumroad_License_Manager::CRON_HOOK );
	}
	// Immediate validation
	if ( class_exists( '\\NicheHotelSyncAI\\Plugin_License_Manager' ) ) {
		( new \NicheHotelSyncAI\Plugin_License_Manager() )->validate_license();
	}
	flush_rewrite_rules();
} );

// Deactivation: flush rewrite rules only.
register_deactivation_hook( __FILE__, function () {
	// Clear scheduled event
	$timestamp = wp_next_scheduled( \NicheHotelSyncAI\Plugin_License_Manager::CRON_HOOK );
	if ( $timestamp ) { wp_unschedule_event( $timestamp, \NicheHotelSyncAI\Plugin_License_Manager::CRON_HOOK ); }

	// Clear Gumroad cron event
	$ts2 = wp_next_scheduled( \NicheHotelSyncAI\Gumroad_License_Manager::CRON_HOOK );
	if ( $ts2 ) { wp_unschedule_event( $ts2, \NicheHotelSyncAI\Gumroad_License_Manager::CRON_HOOK ); }

	flush_rewrite_rules()
} );

// Bootstrap plugin after all plugins load.
add_action( 'plugins_loaded', function () {
	if ( class_exists( '\\NicheHotelSyncAI\\Plugin' ) ) {
		\NicheHotelSyncAI\Plugin::get_instance();
	}
	// Ensure roles exist even if the activation hook did not run after update
	if ( class_exists( 'NicheHotel_RBAC' ) ) {
		NicheHotel_RBAC::setup_roles();
	}
	// Ensure activity logs table exists
	if ( class_exists( 'NicheHotel_Activity_Logger' ) ) {
		NicheHotel_Activity_Logger::create_table();
	}
	// Initialize REST route for activity logs
	if ( class_exists( 'NicheHotel_Activity_Monitor' ) ) 
		NicheHotel_Activity_Monitor::init();
	}
	// Load translations
	load_plugin_textdomain( 'nichehotel-sync-ai', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
} );