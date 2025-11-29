<?php
namespace NicheHotelSyncAI;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Webhooks {
	public function __construct() {
		add_action( 'nichehotel/booking_created', [ $this, 'send_booking_created' ] );
		add_action( 'nichehotel/guest_checked_in', [ $this, 'send_guest_checked_in' ] );
		add_action( 'nichehotel/guest_checked_out', [ $this, 'send_guest_checked_out' ] );
		add_action( 'nichehotel/payment_received', [ $this, 'send_payment_received' ] );
	}

	private function post_json( $option_key, $payload ) {
		$url = get_option( $option_key );
		if ( empty( $url ) ) {
			return;
		}
		// Validate URL scheme
		$parsed = wp_parse_url( $url );
		$scheme = is_array( $parsed ) && isset( $parsed['scheme'] ) ? strtolower( (string) $parsed['scheme'] ) : '';
		$host   = is_array( $parsed ) && isset( $parsed['host'] ) ? (string) $parsed['host'] : '';
		if ( ! in_array( $scheme, [ 'http', 'https' ], true ) || '' === $host ) {
			return;
		}
		// Block localhost and private/reserved IP ranges
		$ips = [];
		if ( filter_var( $host, FILTER_VALIDATE_IP ) ) {
			$ips[] = $host;
		} else {
			$resolved = @gethostbynamel( $host );
			if ( is_array( $resolved ) ) { $ips = array_values( array_unique( $resolved ) ); }
		}
		foreach ( $ips as $ip ) {
			if ( ! filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE ) ) {
				return; // Unsafe target
			}
			// Block common metadata endpoints explicitly
			if ( $ip === '169.254.169.254' ) {
				return;
			}
		}
		wp_remote_post( $url, [
			'headers' => [ 'Content-Type' => 'application/json' ],
			'body'    => wp_json_encode( $payload ),
			'timeout' => 10,
		] );
	}

	public function send_booking_created( $booking_id ) {
		$this->post_json( 'nichehotel_sync_ai_webhook_booking_created', $this->build_booking_payload( $booking_id, 'booking_created' ) );
	}

	public function send_guest_checked_in( $booking_id ) {
		$this->post_json( 'nichehotel_sync_ai_webhook_guest_checked_in', $this->build_booking_payload( $booking_id, 'guest_checked_in' ) );
	}

	public function send_guest_checked_out( $booking_id ) {
		$this->post_json( 'nichehotel_sync_ai_webhook_guest_checked_out', $this->build_booking_payload( $booking_id, 'guest_checked_out' ) );
	}

	public function send_payment_received( $booking_id ) {
		$this->post_json( 'nichehotel_sync_ai_webhook_payment_received', $this->build_booking_payload( $booking_id, 'payment_received' ) );
	}

	private function build_booking_payload( $booking_id, $event ) {
		// Fallbacks to modern meta keys
		$check_in   = get_post_meta( $booking_id, 'check_in', true );
		if ( empty( $check_in ) ) { $check_in = get_post_meta( $booking_id, '_checkin_date', true ); }
		$check_out  = get_post_meta( $booking_id, 'check_out', true );
		if ( empty( $check_out ) ) { $check_out = get_post_meta( $booking_id, '_checkout_date', true ); }
		$guest_name = get_post_meta( $booking_id, 'guest_name', true );
		if ( empty( $guest_name ) ) { $guest_name = get_post_meta( $booking_id, '_guest_name', true ); }
		$guest_email = get_post_meta( $booking_id, '_guest_email', true );
		$room       = get_post_meta( $booking_id, 'room', true );
		if ( empty( $room ) ) { $room = get_post_meta( $booking_id, '_room_number', true ); }
		if ( empty( $room ) ) {
			$rooms_json = (string) get_post_meta( $booking_id, '_rooms', true );
			$rooms_list = json_decode( $rooms_json, true );
			if ( is_array( $rooms_list ) ) {
				$nums = [];
				foreach ( $rooms_list as $r ) { if ( ! empty( $r['room_number'] ) ) { $nums[] = (string) $r['room_number']; } }
				if ( ! empty( $nums ) ) { $room = implode( ', ', $nums ); }
			}
		}
		$booking_code = get_post_meta( $booking_id, 'booking_code', true ) ?: get_post_meta( $booking_id, '_booking_code', true );
		$fmt_in  = $check_in  ? date( 'm/d/Y', strtotime( $check_in ) )  : '';
		$fmt_out = $check_out ? date( 'm/d/Y', strtotime( $check_out ) ) : '';
		$fmt_ts  = date( 'm/d/Y', current_time( 'timestamp' ) );
		$hotel_branch = get_post_meta( $booking_id, '_hotel_name', true ) ?: get_post_meta( $booking_id, 'hotel_name', true );
		$room_type    = get_post_meta( $booking_id, '_room_type', true ) ?: get_post_meta( $booking_id, 'room_type', true );
		$nights_meta  = (int) get_post_meta( $booking_id, '_nights', true );
		if ( $nights_meta <= 0 && $check_in && $check_out ) { $nights_meta = max( 0, (int) round( ( strtotime( $check_out ) - strtotime( $check_in ) ) / DAY_IN_SECONDS ) ); }
		$adults    = (int) get_post_meta( $booking_id, '_party_adults', true );
		$children  = (int) get_post_meta( $booking_id, '_party_children', true );
		$guests    = (int) get_post_meta( $booking_id, '_guests', true );
		if ( $guests <= 0 && ( $adults || $children ) ) { $guests = (int) $adults + (int) $children; }
		$subtotal  = (float) get_post_meta( $booking_id, '_subtotal', true );
		$taxes     = (float) get_post_meta( $booking_id, '_tax', true );
		$total     = (float) get_post_meta( $booking_id, '_total', true );
		return [
			'event'      => $event,
			'booking_id' => $booking_id,
			'booking'    => [
				'title'        => get_the_title( $booking_id ),
				'check_in'     => $fmt_in,
				'check_out'    => $fmt_out,
				'dates'        => trim( $fmt_in . ( $fmt_in && $fmt_out ? ' - ' : '' ) . $fmt_out ),
				'guest_name'   => $guest_name,
				'guest_email'  => $guest_email,
				'hotel_branch' => $hotel_branch,
				'room_type'    => $room_type,
				'room'         => $room,
				'booking_code' => $booking_code,
				'nights'       => $nights_meta,
				'party'        => [ 'adults' => $adults, 'children' => $children, 'guests' => $guests ],
				'subtotal'     => $subtotal,
				'taxes'        => $taxes,
				'total'        => $total,
			],
			'timestamp' => $fmt_ts,
			'site'      => [ 'url' => home_url(), 'name' => get_bloginfo( 'name' ) ],
		];
	}
}

