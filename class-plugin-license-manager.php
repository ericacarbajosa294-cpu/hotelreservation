<?php
namespace NicheHotelSyncAI;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Plugin_License_Manager {
	const OPTION_LICENSE_KEY    = 'nichehotel_sync_ai_license_key';
	const OPTION_LICENSE_STATUS = 'nichehotel_sync_ai_license_status';
	const OPTION_PRODUCT_PERM   = 'nichehotel_sync_ai_gumroad_product_permalink';
	const CRON_HOOK             = 'nhsa_daily_license_validation';
	const GUMROAD_VERIFY_URL    = 'https://api.gumroad.com/v2/licenses/verify';

	public function __construct() {
		add_action( 'admin_post_nhsa_activate_license', [ $this, 'handle_activate_request' ] );
		add_action( 'admin_post_nhsa_deactivate_license', [ $this, 'handle_deactivate_request' ] );

		add_action( self::CRON_HOOK, [ $this, 'validate_license' ] );

		// AJAX for SPA
		add_action( 'wp_ajax_nhsa_activate_license', [ $this, 'ajax_activate_license' ] );
		add_action( 'wp_ajax_nhsa_deactivate_license', [ $this, 'ajax_deactivate_license' ] );
	}

	// Classic settings page intentionally removed; license UI lives in SPA Settings → License

	public function handle_activate_request() {
		if ( ! current_user_can( 'manage_options' ) ) { wp_die( __( 'Unauthorized', 'nichehotel-sync-ai' ) ); }
		check_admin_referer( 'nhsa_license_form', 'nhsa_license_nonce' );
		$key = isset( $_POST['license_key'] ) ? sanitize_text_field( wp_unslash( $_POST['license_key'] ) ) : '';
		$this->activate_license( $key );
		wp_safe_redirect( admin_url( 'options-general.php?page=nhsa-plugin-license' ) );
		exit;
	}

	public function handle_deactivate_request() {
		if ( ! current_user_can( 'manage_options' ) ) { wp_die( __( 'Unauthorized', 'nichehotel-sync-ai' ) ); }
		check_admin_referer( 'nhsa_license_form', 'nhsa_license_nonce' );
		$this->deactivate_license();
		wp_safe_redirect( admin_url( 'options-general.php?page=nhsa-plugin-license' ) );
		exit;
	}

	public function ajax_activate_license() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( [ 'message' => __( 'Unauthorized', 'nichehotel-sync-ai' ) ], 403 ); }
		$key = isset( $_POST['license_key'] ) ? sanitize_text_field( wp_unslash( $_POST['license_key'] ) ) : '';
		if ( '' === $key ) { wp_send_json_error( [ 'message' => __( 'License key required.', 'nichehotel-sync-ai' ) ], 400 ); }
		$result = $this->activate_license( $key );
		if ( $result['success'] ) { wp_send_json_success( [ 'status' => $this->get_license_status() ] ); }
		wp_send_json_error( [ 'message' => $result['message'] ], 400 );
	}

	public function ajax_deactivate_license() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( [ 'message' => __( 'Unauthorized', 'nichehotel-sync-ai' ) ], 403 ); }
		$this->deactivate_license();
		wp_send_json_success( [ 'status' => $this->get_license_status() ] );
	}

	public function activate_license( string $license_key ) : array {
		update_option( self::OPTION_LICENSE_KEY, $license_key, false );
		$response = $this->request_gumroad_validation( $license_key );
		if ( is_wp_error( $response ) ) {
			update_option( self::OPTION_LICENSE_STATUS, 'inactive', false );
			return [ 'success' => false, 'message' => $response->get_error_message() ];
		}
		$parsed = $this->parse_gumroad_response( $response );
		if ( $parsed['valid'] ) {
			update_option( self::OPTION_LICENSE_STATUS, 'active', false );
			return [ 'success' => true ];
		}
		$status = ! empty( $parsed['expired'] ) ? 'expired' : 'inactive';
		update_option( self::OPTION_LICENSE_STATUS, $status, false );
		return [ 'success' => false, 'message' => $parsed['message'] ];
	}

	public function deactivate_license() : void {
		delete_option( self::OPTION_LICENSE_KEY );
		update_option( self::OPTION_LICENSE_STATUS, 'inactive', false );
	}

	public function validate_license() : void {
		$key = get_option( self::OPTION_LICENSE_KEY, '' );
		if ( '' === $key ) { update_option( self::OPTION_LICENSE_STATUS, 'inactive', false ); return; }
		$response = $this->request_gumroad_validation( $key );
		if ( is_wp_error( $response ) ) {
			// Keep previous state but could set inactive on repeated failures
			return;
		}
		$parsed = $this->parse_gumroad_response( $response );
		if ( $parsed['valid'] ) {
			update_option( self::OPTION_LICENSE_STATUS, 'active', false );
		} else {
			$status = ! empty( $parsed['expired'] ) ? 'expired' : 'inactive';
			update_option( self::OPTION_LICENSE_STATUS, $status, false );
		}
	}

	private function request_gumroad_validation( string $license_key ) {
		$product_permalink = get_option( self::OPTION_PRODUCT_PERM, '' );
		$args = [
			'body'    => [
				'product_permalink'      => $product_permalink,
				'license_key'            => $license_key,
				'increment_uses_count'   => false,
			],
			'timeout' => 15,
		];
		return wp_remote_post( self::GUMROAD_VERIFY_URL, $args );
	}

	private function parse_gumroad_response( $response ) : array {
		$code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( 200 !== $code || empty( $body ) ) {
			return [ 'valid' => false, 'message' => __( 'Connection error. Please try again.', 'nichehotel-sync-ai' ) ];
		}
		if ( ! empty( $body['success'] ) && ! empty( $body['purchase'] ) ) {
			$purchase = $body['purchase'];
			$refunded = ! empty( $purchase['refunded'] );
			$chargebacked = ! empty( $purchase['chargebacked'] );
			$subscription_ended = ! empty( $purchase['subscription_ended_at'] );
			$valid = ! $refunded && ! $chargebacked && ! $subscription_ended;
			return [ 'valid' => (bool) $valid, 'expired' => (bool) $subscription_ended, 'message' => $valid ? '' : __( 'License expired or invalid.', 'nichehotel-sync-ai' ) ];
		}
		return [ 'valid' => false, 'message' => __( 'License invalid.', 'nichehotel-sync-ai' ) ];
	}

	public function get_license_status() : string {
		$status = get_option( self::OPTION_LICENSE_STATUS, 'inactive' );
		$status = in_array( $status, [ 'active', 'inactive', 'expired' ], true ) ? $status : 'inactive';
		return $status;
	}

	public function is_license_active() : bool {
		return 'active' === $this->get_license_status();
	}
}

if ( ! function_exists( '\\NicheHotelSyncAI\\is_license_active' ) ) {
	function is_license_active() : bool {
		$status = get_option( Plugin_License_Manager::OPTION_LICENSE_STATUS, 'inactive' );
		$active = ( 'active' === $status );
		return (bool) apply_filters( 'nichehotel_sync_ai_is_license_active', $active );
	}
}