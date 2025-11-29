<?php
namespace NicheHotelSyncAI;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Admin_Menu {
	public function __construct() {
		add_action( 'admin_menu', [ $this, 'register_menu' ] );
		add_action( 'admin_init', function(){
			if ( isset( $_GET['page'] ) && $_GET['page'] === 'nichehotel-sync-ai-license' ) {
				wp_safe_redirect( admin_url( 'admin.php?page=nichehotel-sync-ai-settings' ) );
				exit;
			}
		} );
	}

	public function register_menu() {
		add_menu_page(
			__( 'NicheHotel Sync', 'nichehotel-sync-ai' ),
			__( 'NicheHotel Sync', 'nichehotel-sync-ai' ),
			'edit_bookings',
			'nichehotel-sync-ai',
			[ $this, 'render_bookings' ],
			'dashicons-admin-site-alt3',
			56
		);

		// Make the top-level route point to Bookings for staff; keep a Dashboard entry for managers
		add_submenu_page( 'nichehotel-sync-ai', __( 'Dashboard', 'nichehotel-sync-ai' ), __( 'Dashboard', 'nichehotel-sync-ai' ), 'manage_settings', 'nichehotel-sync-ai-dashboard', [ $this, 'render_dashboard' ] );
		add_submenu_page( 'nichehotel-sync-ai', __( 'Bookings', 'nichehotel-sync-ai' ), __( 'Bookings', 'nichehotel-sync-ai' ), 'edit_bookings', 'nichehotel-sync-ai', [ $this, 'render_bookings' ] );
		add_submenu_page( 'nichehotel-sync-ai', __( 'Hotels & Rooms', 'nichehotel-sync-ai' ), __( 'Hotels & Rooms', 'nichehotel-sync-ai' ), 'manage_settings', 'nichehotel-sync-ai-rooms', [ $this, 'render_rooms' ] );
		add_submenu_page( 'nichehotel-sync-ai', __( 'Settings', 'nichehotel-sync-ai' ), __( 'Settings', 'nichehotel-sync-ai' ), 'manage_settings', 'nichehotel-sync-ai-settings', [ $this, 'render_settings' ] );
		add_submenu_page( 'nichehotel-sync-ai', __( 'Automation', 'nichehotel-sync-ai' ), __( 'Automation', 'nichehotel-sync-ai' ), 'manage_settings', 'nichehotel-sync-ai-automation', [ $this, 'render_automation' ] );
		// Activity Logs (React page)
		add_submenu_page( 'nichehotel-sync-ai', __( 'Activity Logs', 'nichehotel-sync-ai' ), __( 'Activity Logs', 'nichehotel-sync-ai' ), 'view_logs', 'nichehotel-sync-ai-activity-logs', [ $this, 'render_activity_logs' ] );
		// License moved into Settings; submenu removed.

	}

	public function render_dashboard() {
		$view = NICHEHOTEL_SYNC_AI_PATH . 'admin/views/dashboard.php';
		if ( file_exists( $view ) ) {
			require $view;
		}
	}

	public function render_bookings() {
		$view = NICHEHOTEL_SYNC_AI_PATH . 'admin/views/bookings.php';
		if ( file_exists( $view ) ) {
			require $view;
		}
	}

	public function render_rooms() {
		$view_new = NICHEHOTEL_SYNC_AI_PATH . 'admin/views/hotels-rooms.php';
		$view_old = NICHEHOTEL_SYNC_AI_PATH . 'admin/views/rooms.php';
		if ( file_exists( $view_new ) ) {
			require $view_new;
		} elseif ( file_exists( $view_old ) ) {
			require $view_old;
		}
	}

	public function render_booking_form() {
		$view = NICHEHOTEL_SYNC_AI_PATH . 'admin/views/bookings.php';
		if ( file_exists( $view ) ) {
			require $view;
		}
	}

	public function render_settings() {
		$view = NICHEHOTEL_SYNC_AI_PATH . 'admin/views/settings.php';
		if ( file_exists( $view ) ) {
			require $view;
		}
	}

	public function render_automation() {
		$view = NICHEHOTEL_SYNC_AI_PATH . 'admin/views/automation.php';
		if ( file_exists( $view ) ) {
			require $view;
		}
	}

	public function render_license() {
		$view = NICHEHOTEL_SYNC_AI_PATH . 'admin/views/license.php';
		if ( file_exists( $view ) ) {
			require $view;
		}
	}

	public function render_activity_logs() {
		$view = NICHEHOTEL_SYNC_AI_PATH . 'admin/views/dashboard.php';
		if ( file_exists( $view ) ) {
			require $view;
		}
	}
}

