<?php
/**
 * Permission helpers for NicheHotel Sync
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class NicheHotel_Permissions {
	public static function can_edit_bookings() {
		return current_user_can( 'edit_bookings' ) || current_user_can( 'manage_settings' );
	}

	public static function can_view_logs() {
		return current_user_can( 'view_logs' ) || current_user_can( 'manage_settings' );
	}

	public static function can_manage_settings() {
		return current_user_can( 'manage_settings' );
	}
}

