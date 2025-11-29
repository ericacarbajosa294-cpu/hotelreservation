<?php
namespace NicheHotelSyncAI;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class License {
	const GUMROAD_VERIFY_URL = 'https://api.gumroad.com/v2/licenses/verify';

	public function validate( $license_key ) {
		$product_id = get_option( 'nichehotel_sync_ai_gumroad_product', '' );
		$args       = [
			'body'    => [
				'product_id'  => $product_id,
				'license_key' => $license_key,
				'increment_uses_count' => false,
			],
			'timeout' => 15,
		];
		$response   = wp_remote_post( self::GUMROAD_VERIFY_URL, $args );
		if ( is_wp_error( $response ) ) {
			return [ 'valid' => false, 'message' => $response->get_error_message() ];
		}
		$code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( 200 === $code && ! empty( $body['success'] ) && ! empty( $body['purchase']['license_key'] ) ) {
			update_option( 'nichehotel_sync_ai_license_key', $license_key, false );
			update_option( 'nichehotel_sync_ai_license_status', 'active', false );
			return [ 'valid' => true, 'message' => __( 'License valid.', 'nichehotel-sync-ai' ), 'data' => $body ];
		}
		update_option( 'nichehotel_sync_ai_license_status', 'invalid', false );
		return [ 'valid' => false, 'message' => __( 'License invalid.', 'nichehotel-sync-ai' ), 'data' => $body ];
	}
}

