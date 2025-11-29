<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class NicheHotel_Activity_Logger {
	public static function table_name() {
		global $wpdb;
		return $wpdb->prefix . 'nichehotel_activity_logs';
	}

	private static function table_exists() {
		global $wpdb;
		$table = self::table_name();
		$found = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) );
		return ( $found === $table );
	}

	public static function create_table() {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$charset = $wpdb->get_charset_collate();
		$table = self::table_name();
		$sql = "CREATE TABLE {$table} (
			id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			user_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
			action VARCHAR(191) NOT NULL,
			details LONGTEXT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			KEY user_id (user_id),
			KEY action (action)
		) {$charset};";
		dbDelta( $sql );
	}

	public static function log( $action, $details = [] ) {
		global $wpdb;
		if ( ! self::table_exists() ) {
			self::create_table();
		}
		$user_id = get_current_user_id();
		$payload = is_array( $details ) ? wp_json_encode( $details ) : (string) $details;
		$inserted = $wpdb->insert( self::table_name(), [
			'user_id'   => (int) $user_id,
			'action'    => sanitize_text_field( (string) $action ),
			'details'   => $payload,
			'created_at' => current_time( 'mysql' ),
		] );
		if ( false === $inserted ) {
			// Attempt to create table and retry once
			self::create_table();
			$wpdb->insert( self::table_name(), [
				'user_id'   => (int) $user_id,
				'action'    => sanitize_text_field( (string) $action ),
				'details'   => $payload,
				'created_at' => current_time( 'mysql' ),
			] );
		}
	}
}

