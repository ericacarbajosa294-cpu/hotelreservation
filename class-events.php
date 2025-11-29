<?php
namespace NicheHotelSyncAI;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Events {
	public function __construct() {
		add_action( 'updated_post_meta', [ $this, 'maybe_trigger_booking_events' ], 10, 4 );
	}

	public function maybe_trigger_booking_events( $meta_id, $post_id, $meta_key, $meta_value ) {
		$post = get_post( $post_id );
		if ( ! $post || 'booking' !== $post->post_type ) {
			return;
		}

		if ( 'booking_status' === $meta_key ) {
			$old_status = get_post_meta( $post_id, '_previous_booking_status', true );
			update_post_meta( $post_id, '_previous_booking_status', $meta_value );

			if ( $meta_value === 'created' && $old_status !== 'created' ) {
				do_action( 'nichehotel/booking_created', $post_id );
			}
			if ( $meta_value === 'checked_in' && $old_status !== 'checked_in' ) {
				do_action( 'nichehotel/guest_checked_in', $post_id );
			}
			if ( $meta_value === 'checked_out' && $old_status !== 'checked_out' ) {
				do_action( 'nichehotel/guest_checked_out', $post_id );
			}
			if ( $meta_value === 'paid' && $old_status !== 'paid' ) {
				do_action( 'nichehotel/payment_received', $post_id );
			}
		}
	}
}

