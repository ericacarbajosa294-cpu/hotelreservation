<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class NicheHotel_Activity_Monitor {
	public static function init() {
		add_action( 'rest_api_init', [ __CLASS__, 'register_routes' ] );
	}

	public static function register_routes() {
		register_rest_route( 'nichehotel/v1', '/activity-logs', [
			'methods'  => 'GET',
			'callback' => [ __CLASS__, 'get_logs' ],
			'permission_callback' => function() {
				return current_user_can( 'view_logs' ) || current_user_can( 'manage_settings' ) || current_user_can( 'manage_options' );
			},
		] );
		register_rest_route( 'nichehotel/v1', '/activity-logs/export', [
			'methods'  => 'GET',
			'callback' => [ __CLASS__, 'export_logs' ],
			'permission_callback' => function() {
				return current_user_can( 'view_logs' ) || current_user_can( 'manage_settings' ) || current_user_can( 'manage_options' );
			},
		] );
		register_rest_route( 'nichehotel/v1', '/activity-actions', [
			'methods'  => 'GET',
			'callback' => [ __CLASS__, 'get_actions' ],
			'permission_callback' => function() {
				return current_user_can( 'view_logs' ) || current_user_can( 'manage_settings' ) || current_user_can( 'manage_options' );
			},
		] );
	}

	public static function get_logs( \WP_REST_Request $request ) {
		global $wpdb;
		$table = NicheHotel_Activity_Logger::table_name();
		// Determine date column (support old installs with `timestamp` and new with `created_at`)
		$date_col = 'created_at';
		$col_check = $wpdb->get_var( $wpdb->prepare( "SHOW COLUMNS FROM {$table} LIKE %s", $date_col ) );
		if ( empty( $col_check ) ) { $date_col = 'timestamp'; }
		$limit = absint( $request->get_param( 'limit' ) ); if ( $limit <= 0 || $limit > 500 ) { $limit = 50; }
		$user_id = absint( $request->get_param( 'user_id' ) );
		$user_q  = sanitize_text_field( (string) $request->get_param( 'user' ) );
		$action  = sanitize_text_field( (string) $request->get_param( 'action' ) );
		$from    = sanitize_text_field( (string) $request->get_param( 'from' ) );
		$to      = sanitize_text_field( (string) $request->get_param( 'to' ) );
		$sql = "SELECT id, user_id, action, details, {$date_col} AS ts FROM {$table} WHERE 1=1";
		if ( $user_id ) { $sql .= $wpdb->prepare( " AND user_id = %d", $user_id ); }
		elseif ( $user_q !== '' ) {
			if ( ctype_digit( $user_q ) ) {
				$sql .= $wpdb->prepare( " AND user_id = %d", (int) $user_q );
			} else {
				$ids = get_users( [ 'search' => '*' . $user_q . '*', 'search_columns' => [ 'display_name', 'user_login', 'user_email' ], 'fields' => 'ID', 'number' => 100 ] );
				$ids = array_map( 'absint', (array) $ids );
				$ids = array_filter( $ids );
				if ( ! empty( $ids ) ) {
					$in = implode( ',', array_map( 'intval', $ids ) );
					$sql .= " AND user_id IN (" . $in . ")";
				} else {
					$sql .= " AND 1=0";
				}
			}
		}
		if ( $action !== '' ) { $sql .= $wpdb->prepare( " AND action = %s", $action ); }
		if ( $from !== '' ) { $sql .= $wpdb->prepare( " AND {$date_col} >= %s", $from . ' 00:00:00' ); }
		if ( $to !== '' ) { $sql .= $wpdb->prepare( " AND {$date_col} <= %s", $to . ' 23:59:59' ); }
		$sql .= " ORDER BY id DESC LIMIT {$limit}";
		$rows = $wpdb->get_results( $sql, ARRAY_A ) ?: [];
		$logs = [];
		foreach ( $rows as $r ) {
			$user_id = (int) $r['user_id'];
			$user_name = '';
			if ( $user_id ) {
				$u = get_userdata( $user_id );
				if ( $u ) { $user_name = $u->display_name ?: $u->user_login; }
			}
			$logs[] = [
				'id' => (int) $r['id'],
				'user_id' => $user_id,
				'user_name' => (string) $user_name,
				'action' => (string) $r['action'],
				'details' => (string) $r['details'],
				'timestamp' => (string) ( $r['ts'] ?? '' ),
			];
		}
		return new \WP_REST_Response( [ 'logs' => $logs ], 200 );
	}

	public static function get_actions( \WP_REST_Request $request ) {
		global $wpdb;
		$table = NicheHotel_Activity_Logger::table_name();
		$vals = $wpdb->get_col( "SELECT DISTINCT action FROM {$table} ORDER BY action ASC" ) ?: [];
		return new \WP_REST_Response( [ 'actions' => array_values( array_filter( array_map( 'strval', $vals ) ) ) ], 200 );
	}

	public static function export_logs( \WP_REST_Request $request ) {
		global $wpdb;
		$table = NicheHotel_Activity_Logger::table_name();
		$date_col = 'created_at';
		$col_check = $wpdb->get_var( $wpdb->prepare( "SHOW COLUMNS FROM {$table} LIKE %s", $date_col ) );
		if ( empty( $col_check ) ) { $date_col = 'timestamp'; }
		$limit = absint( $request->get_param( 'limit' ) ); if ( $limit <= 0 || $limit > 5000 ) { $limit = 1000; }
		$user_id = absint( $request->get_param( 'user_id' ) );
		$user_q  = sanitize_text_field( (string) $request->get_param( 'user' ) );
		$action  = sanitize_text_field( (string) $request->get_param( 'action' ) );
		$from    = sanitize_text_field( (string) $request->get_param( 'from' ) );
		$to      = sanitize_text_field( (string) $request->get_param( 'to' ) );
		$sql = "SELECT id, user_id, action, details, {$date_col} AS ts FROM {$table} WHERE 1=1";
		if ( $user_id ) { $sql .= $wpdb->prepare( " AND user_id = %d", $user_id ); }
		elseif ( $user_q !== '' ) {
			if ( ctype_digit( $user_q ) ) {
				$sql .= $wpdb->prepare( " AND user_id = %d", (int) $user_q );
			} else {
				$ids = get_users( [ 'search' => '*' . $user_q . '*', 'search_columns' => [ 'display_name', 'user_login', 'user_email' ], 'fields' => 'ID', 'number' => 100 ] );
				$ids = array_map( 'absint', (array) $ids );
				$ids = array_filter( $ids );
				if ( ! empty( $ids ) ) {
					$in = implode( ',', array_map( 'intval', $ids ) );
					$sql .= " AND user_id IN (" . $in . ")";
				} else {
					$sql .= " AND 1=0";
				}
			}
		}
		if ( $action !== '' ) { $sql .= $wpdb->prepare( " AND action = %s", $action ); }
		if ( $from !== '' ) { $sql .= $wpdb->prepare( " AND {$date_col} >= %s", $from . ' 00:00:00' ); }
		if ( $to !== '' ) { $sql .= $wpdb->prepare( " AND {$date_col} <= %s", $to . ' 23:59:59' ); }
		$sql .= " ORDER BY id DESC LIMIT {$limit}";
		$rows = $wpdb->get_results( $sql, ARRAY_A ) ?: [];

		// Output CSV
		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename=activity-logs-' . date( 'Ymd-His' ) . '.csv' );
		$fh = fopen( 'php://output', 'w' );
		fputcsv( $fh, [ 'ID', 'User ID', 'User', 'Action', 'Details', 'Timestamp' ] );
		foreach ( $rows as $r ) {
			$uid = (int) $r['user_id'];
			$uname = '';
			if ( $uid ) { $u = get_userdata( $uid ); if ( $u ) { $uname = $u->display_name ?: $u->user_login; } }
			$action = (string) $r['action'];
			$details = (string) $r['details'];
			$ts = (string) $r['ts'];
			// Sanitize Excel-injection
			foreach ( [ &$uname, &$action, &$details, &$ts ] as &$field ) {
				if ( preg_match( '/^[=+\-@]/', $field ) ) { $field = "'" . $field; }
			}
			fputcsv( $fh, [ (int) $r['id'], $uid, $uname, $action, $details, $ts ] );
		}
		fclose( $fh );
		exit;
	}
}

