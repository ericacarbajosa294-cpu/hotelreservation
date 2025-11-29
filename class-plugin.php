<?php
namespace NicheHotelSyncAI;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Plugin {
	private static $instance = null;

	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		// Register CPTs early.
		add_action( 'init', [ CPT::class, 'register_post_types' ] );

		// Bootstrap components.
		new Admin_Menu();
		new Assets();
		new Events();
		new Webhooks();
		new License();
		new Plugin_License_Manager();
		new Gumroad_License_Manager();
		new Public_Shortcodes();

		// AJAX endpoints for the SPA
		add_action( 'wp_ajax_nhsa_save_settings', [ $this, 'ajax_save_settings' ] );
		add_action( 'wp_ajax_nhsa_validate_license', [ $this, 'ajax_validate_license' ] );

		// Admin Hotels & Rooms
		add_action( 'wp_ajax_nhsa_admin_list_hotels', [ $this, 'ajax_admin_list_hotels' ] );
		add_action( 'wp_ajax_nhsa_admin_add_hotel', [ $this, 'ajax_admin_add_hotel' ] );
		add_action( 'wp_ajax_nhsa_admin_add_hotels_bulk', [ $this, 'ajax_admin_add_hotels_bulk' ] );
		add_action( 'wp_ajax_nhsa_admin_update_hotel', [ $this, 'ajax_admin_update_hotel' ] );
		add_action( 'wp_ajax_nhsa_admin_delete_hotel', [ $this, 'ajax_admin_delete_hotel' ] );
		add_action( 'wp_ajax_nhsa_admin_list_rooms', [ $this, 'ajax_admin_list_rooms' ] );
		add_action( 'wp_ajax_nhsa_admin_add_room', [ $this, 'ajax_admin_add_room' ] );
		add_action( 'wp_ajax_nhsa_admin_add_rooms_bulk', [ $this, 'ajax_admin_add_rooms_bulk' ] );
		add_action( 'wp_ajax_nhsa_admin_update_room', [ $this, 'ajax_admin_update_room' ] );
		add_action( 'wp_ajax_nhsa_admin_delete_room', [ $this, 'ajax_admin_delete_room' ] );
		add_action( 'wp_ajax_nhsa_admin_add_room_type', [ $this, 'ajax_admin_add_room_type' ] );
		add_action( 'wp_ajax_nhsa_admin_list_room_types', [ $this, 'ajax_admin_list_room_types' ] );
		add_action( 'wp_ajax_nhsa_admin_update_room_type', [ $this, 'ajax_admin_update_room_type' ] );
		add_action( 'wp_ajax_nhsa_admin_delete_room_type', [ $this, 'ajax_admin_delete_room_type' ] );

		// Public room lookup for booking form
		add_action( 'wp_ajax_nhsa_rooms_for', [ $this, 'ajax_rooms_for' ] );
		add_action( 'wp_ajax_nopriv_nhsa_rooms_for', [ $this, 'ajax_rooms_for' ] );
		add_action( 'wp_ajax_nhsa_room_type_details', [ $this, 'ajax_room_type_details' ] );
		add_action( 'wp_ajax_nopriv_nhsa_room_type_details', [ $this, 'ajax_room_type_details' ] );
		// Create booking from public wizard
		add_action( 'wp_ajax_nhsa_create_booking', [ $this, 'ajax_create_booking' ] );
		add_action( 'wp_ajax_nopriv_nhsa_create_booking', [ $this, 'ajax_create_booking' ] );

		// Bookings list for admin table and status updates
		add_action( 'wp_ajax_nhsa_admin_list_bookings', [ $this, 'ajax_admin_list_bookings' ] );
		add_action( 'wp_ajax_nhsa_admin_update_booking_status', [ $this, 'ajax_admin_update_booking_status' ] );
		add_action( 'wp_ajax_nhsa_admin_update_payment', [ $this, 'ajax_admin_update_payment' ] );
		add_action( 'wp_ajax_nhsa_admin_bulk_update_booking_status', [ $this, 'ajax_admin_bulk_update_booking_status' ] );
		add_action( 'wp_ajax_nhsa_admin_add_booking', [ $this, 'ajax_admin_add_booking' ] );
		add_action( 'wp_ajax_nhsa_admin_export_bookings', [ $this, 'ajax_admin_export_bookings' ] );

		// Dashboard metrics
		add_action( 'wp_ajax_nhsa_admin_dashboard_metrics', [ $this, 'ajax_admin_dashboard_metrics' ] );

		// Booking form settings
		add_action( 'wp_ajax_nhsa_get_booking_form_settings', [ $this, 'ajax_get_booking_form_settings' ] );
		add_action( 'wp_ajax_nhsa_save_booking_form_settings', [ $this, 'ajax_save_booking_form_settings' ] );

		// Whoami endpoint for hot-reload of caps/nonces
		add_action( 'wp_ajax_nhsa_whoami', [ $this, 'ajax_whoami' ] );

		// Payment settings (admin)
		add_action( 'wp_ajax_nhsa_get_payment_settings', [ $this, 'ajax_get_payment_settings' ] );
		add_action( 'wp_ajax_nhsa_save_payment_settings', [ $this, 'ajax_save_payment_settings' ] );

		// PayPal checkout handlers (public)
		add_action( 'admin_post_nhsa_paypal_checkout', [ $this, 'handle_paypal_checkout' ] );
		add_action( 'admin_post_nopriv_nhsa_paypal_checkout', [ $this, 'handle_paypal_checkout' ] );
		add_action( 'admin_post_nhsa_paypal_return', [ $this, 'handle_paypal_return' ] );
		add_action( 'admin_post_nopriv_nhsa_paypal_return', [ $this, 'handle_paypal_return' ] );
		add_action( 'wp_ajax_nhsa_paypal_start', [ $this, 'ajax_paypal_start' ] );
		add_action( 'wp_ajax_nopriv_nhsa_paypal_start', [ $this, 'ajax_paypal_start' ] );
	}

	public function ajax_save_settings() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_manage_settings() ) {
			wp_send_json_error( 'No permission' );
		}

		$keys = [
			'booking_created'   => 'nichehotel_sync_ai_webhook_booking_created',
			'guest_checked_in'  => 'nichehotel_sync_ai_webhook_guest_checked_in',
			'guest_checked_out' => 'nichehotel_sync_ai_webhook_guest_checked_out',
			'payment_received'  => 'nichehotel_sync_ai_webhook_payment_received',
		];

		foreach ( $keys as $field => $option ) {
			if ( isset( $_POST[ $field ] ) ) {
				update_option( $option, esc_url_raw( wp_unslash( $_POST[ $field ] ) ) );
			}
		}

		wp_send_json_success( [ 'message' => __( 'Settings saved.', 'nichehotel-sync-ai' ) ] );
	}

	public function ajax_validate_license() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_manage_settings() ) {
			wp_send_json_error( 'No permission' );
		}

		$license_key = isset( $_POST['license_key'] ) ? sanitize_text_field( wp_unslash( $_POST['license_key'] ) ) : '';
		if ( empty( $license_key ) ) {
			wp_send_json_error( [ 'message' => __( 'License key required.', 'nichehotel-sync-ai' ) ], 400 );
		}

		$license = new License();
		$result  = $license->validate( $license_key );
		if ( $result['valid'] ) {
			wp_send_json_success( $result );
		}
		wp_send_json_error( $result, 400 );
	}

	public function ajax_admin_list_hotels() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$q = new \WP_Query( [ 'post_type' => 'hotel', 'posts_per_page' => 100, 'post_status' => 'publish' ] );
		$items = [];
		foreach ( $q->posts as $p ) {
			$items[] = [
				'id'       => $p->ID,
				'name'     => get_the_title( $p ),
				'location' => get_post_meta( $p->ID, 'location', true ),
			];
		}
		wp_send_json_success( [ 'hotels' => $items ] );
	}

	public function ajax_admin_add_hotel() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$name = isset( $_POST['name'] ) ? sanitize_text_field( wp_unslash( $_POST['name'] ) ) : '';
		$location = isset( $_POST['location'] ) ? sanitize_text_field( wp_unslash( $_POST['location'] ) ) : '';
		if ( '' === $name ) {
			wp_send_json_error( [ 'message' => __( 'Hotel name required.', 'nichehotel-sync-ai' ) ], 400 );
		}
		$post_id = wp_insert_post( [ 'post_title' => $name, 'post_type' => 'hotel', 'post_status' => 'publish' ] );
		if ( is_wp_error( $post_id ) ) {
			wp_send_json_error( [ 'message' => $post_id->get_error_message() ], 500 );
		}
		update_post_meta( $post_id, 'location', $location );
		wp_send_json_success( [ 'hotel_id' => $post_id ] );
	}

	public function ajax_admin_add_hotels_bulk() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$items_raw = isset( $_POST['items'] ) ? wp_unslash( $_POST['items'] ) : '';
		$created = [];
		if ( is_string( $items_raw ) ) {
			$lines = preg_split( '/\r?\n/', $items_raw );
			foreach ( $lines as $line ) {
				$line = trim( $line );
				if ( '' === $line ) { continue; }
				$parts = array_map( 'trim', explode( '|', $line ) );
				$name = sanitize_text_field( $parts[0] ?? '' );
				$location = sanitize_text_field( $parts[1] ?? '' );
				if ( '' === $name ) { continue; }
				$post_id = wp_insert_post( [ 'post_title' => $name, 'post_type' => 'hotel', 'post_status' => 'publish' ] );
				if ( ! is_wp_error( $post_id ) ) {
					if ( '' !== $location ) { update_post_meta( $post_id, 'location', $location ); }
					$created[] = $post_id;
				}
			}
		}
		wp_send_json_success( [ 'created' => $created ] );
	}

	public function ajax_admin_update_hotel() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$id = isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;
		$name = isset( $_POST['name'] ) ? sanitize_text_field( wp_unslash( $_POST['name'] ) ) : '';
		$location = isset( $_POST['location'] ) ? sanitize_text_field( wp_unslash( $_POST['location'] ) ) : '';
		if ( ! $id ) {
			wp_send_json_error( [ 'message' => __( 'Missing hotel id.', 'nichehotel-sync-ai' ) ], 400 );
		}
		if ( '' !== $name ) {
			wp_update_post( [ 'ID' => $id, 'post_title' => $name ] );
		}
		update_post_meta( $id, 'location', $location );
		wp_send_json_success();
	}

	public function ajax_admin_delete_hotel() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$id = isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;
		if ( ! $id ) {
			wp_send_json_error( [ 'message' => __( 'Missing hotel id.', 'nichehotel-sync-ai' ) ], 400 );
		}
		wp_trash_post( $id );
		wp_send_json_success();
	}

	public function ajax_admin_list_rooms() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$hotel_id = isset( $_POST['hotel_id'] ) ? absint( $_POST['hotel_id'] ) : 0;
		$sort_by  = isset( $_POST['sort_by'] ) ? sanitize_text_field( wp_unslash( $_POST['sort_by'] ) ) : '';
		$sort_dir = isset( $_POST['sort_dir'] ) ? strtolower( sanitize_text_field( wp_unslash( $_POST['sort_dir'] ) ) ) : 'asc';
		$q = new \WP_Query( [
			'post_type'      => 'room',
			'posts_per_page' => 200,
			'post_status'    => 'publish',
			'meta_query'     => [ [ 'key' => 'hotel_id', 'value' => $hotel_id ] ],
		] );
		$items = [];
		foreach ( $q->posts as $p ) {
			$items[] = [
				'id'          => $p->ID,
				'number'      => get_the_title( $p ),
				'room_type'   => get_post_meta( $p->ID, 'room_type', true ),
				'status'      => get_post_meta( $p->ID, 'status', true ) ?: 'available',
				'price'       => (float) get_post_meta( $p->ID, 'room_price', true ),
				'description' => (string) get_post_meta( $p->ID, 'room_description', true ),
			];
		}
		if ( $sort_by ) {
			usort( $items, function( $a, $b ) use ( $sort_by, $sort_dir ) {
				$av = $a[ $sort_by ] ?? '';
				$bv = $b[ $sort_by ] ?? '';
				if ( 'number' === $sort_by ) {
					$ai = (int) preg_replace( '/[^0-9]/', '', (string) $av );
					$bi = (int) preg_replace( '/[^0-9]/', '', (string) $bv );
					$cmp = $ai <=> $bi;
				} else {
					$cmp = strnatcasecmp( (string) $av, (string) $bv );
				}
				return ( 'desc' === $sort_dir ) ? -$cmp : $cmp;
			} );
		}
		wp_send_json_success( [ 'rooms' => $items ] );
	}

	public function ajax_admin_add_room() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$hotel_id   = isset( $_POST['hotel_id'] ) ? absint( $_POST['hotel_id'] ) : 0;
		$room_num   = isset( $_POST['room_number'] ) ? sanitize_text_field( wp_unslash( $_POST['room_number'] ) ) : '';
		$room_type  = isset( $_POST['room_type'] ) ? sanitize_text_field( wp_unslash( $_POST['room_type'] ) ) : '';
		$price      = isset( $_POST['price'] ) ? floatval( wp_unslash( $_POST['price'] ) ) : 0;
		$desc       = isset( $_POST['description'] ) ? sanitize_textarea_field( wp_unslash( $_POST['description'] ) ) : '';
		if ( ! $hotel_id || '' === $room_num ) {
			wp_send_json_error( [ 'message' => __( 'Missing fields.', 'nichehotel-sync-ai' ) ], 400 );
		}
		$post_id = wp_insert_post( [
			'post_title'  => $room_num,
			'post_type'   => 'room',
			'post_status' => 'publish',
		] );
		if ( is_wp_error( $post_id ) ) {
			wp_send_json_error( [ 'message' => $post_id->get_error_message() ], 500 );
		}
		update_post_meta( $post_id, 'hotel_id', $hotel_id );
		update_post_meta( $post_id, 'room_type', $room_type );
		if ( $price > 0 ) { update_post_meta( $post_id, 'room_price', $price ); }
		if ( '' !== $desc ) { update_post_meta( $post_id, 'room_description', $desc ); }
		wp_send_json_success( [ 'room_id' => $post_id ] );
	}

	public function ajax_admin_add_rooms_bulk() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$hotel_id  = isset( $_POST['hotel_id'] ) ? absint( $_POST['hotel_id'] ) : 0;
		$range     = isset( $_POST['range'] ) ? sanitize_text_field( wp_unslash( $_POST['range'] ) ) : '';
		$room_type = isset( $_POST['room_type'] ) ? sanitize_text_field( wp_unslash( $_POST['room_type'] ) ) : '';
		$price     = isset( $_POST['price'] ) ? floatval( wp_unslash( $_POST['price'] ) ) : 0;
		$desc      = isset( $_POST['description'] ) ? sanitize_textarea_field( wp_unslash( $_POST['description'] ) ) : '';
		if ( ! $hotel_id || '' === $range ) {
			wp_send_json_error( [ 'message' => __( 'Missing fields.', 'nichehotel-sync-ai' ) ], 400 );
		}
		$created = [];
		if ( preg_match( '/^(\d+)\s*[-–]\s*(\d+)$/', $range, $m ) ) {
			$start = (int) $m[1];
			$end   = (int) $m[2];
			if ( $start > $end ) { $tmp = $start; $start = $end; $end = $tmp; }
			for ( $n = $start; $n <= $end; $n++ ) {
				$post_id = wp_insert_post( [ 'post_title' => (string) $n, 'post_type' => 'room', 'post_status' => 'publish' ] );
				if ( ! is_wp_error( $post_id ) ) {
					update_post_meta( $post_id, 'hotel_id', $hotel_id );
					if ( '' !== $room_type ) { update_post_meta( $post_id, 'room_type', $room_type ); }
					if ( $price > 0 ) { update_post_meta( $post_id, 'room_price', $price ); }
					if ( '' !== $desc ) { update_post_meta( $post_id, 'room_description', $desc ); }
					$created[] = $post_id;
				}
			}
		}
		wp_send_json_success( [ 'created' => $created ] );
	}

	public function ajax_admin_update_room() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$id = isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;
		$number = isset( $_POST['room_number'] ) ? sanitize_text_field( wp_unslash( $_POST['room_number'] ) ) : '';
		$type = isset( $_POST['room_type'] ) ? sanitize_text_field( wp_unslash( $_POST['room_type'] ) ) : '';
		$status = isset( $_POST['status'] ) ? sanitize_text_field( wp_unslash( $_POST['status'] ) ) : '';
		$price = isset( $_POST['price'] ) ? floatval( wp_unslash( $_POST['price'] ) ) : null;
		$desc = isset( $_POST['description'] ) ? sanitize_textarea_field( wp_unslash( $_POST['description'] ) ) : null;
		if ( ! $id ) { wp_send_json_error( [ 'message' => __( 'Missing room id.', 'nichehotel-sync-ai' ) ], 400 ); }
		if ( '' !== $number ) { wp_update_post( [ 'ID' => $id, 'post_title' => $number ] ); }
		if ( '' !== $type ) { update_post_meta( $id, 'room_type', $type ); }
		if ( '' !== $status ) { update_post_meta( $id, 'status', $status ); }
		if ( null !== $price ) { update_post_meta( $id, 'room_price', $price ); }
		if ( null !== $desc ) { update_post_meta( $id, 'room_description', $desc ); }
		wp_send_json_success();
	}

	public function ajax_admin_delete_room() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$id = isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;
		if ( ! $id ) { wp_send_json_error( [ 'message' => __( 'Missing room id.', 'nichehotel-sync-ai' ) ], 400 ); }
		wp_trash_post( $id );
		wp_send_json_success();
	}

	public function ajax_admin_list_room_types() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$q = new \WP_Query( [ 'post_type' => 'room_type', 'posts_per_page' => 100, 'post_status' => 'publish' ] );
		$items = [];
		foreach ( $q->posts as $p ) {
			$title = get_the_title( $p );
			$items[] = [
				'id'    => $p->ID,
				'name'  => $title,
				'slug'  => sanitize_title( $title ),
				'price' => (float) get_post_meta( $p->ID, 'default_price', true ),
				'description' => (string) $p->post_content,
				'amenities'   => (array) ( json_decode( (string) get_post_meta( $p->ID, '_amenities', true ), true ) ?: [] ),
				'images'      => (array) ( json_decode( (string) get_post_meta( $p->ID, '_images', true ), true ) ?: [] ),
			];
		}
		wp_send_json_success( [ 'room_types' => $items ] );
	}

	public function ajax_admin_add_room_type() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$name = isset( $_POST['name'] ) ? sanitize_text_field( wp_unslash( $_POST['name'] ) ) : '';
		$price = isset( $_POST['price'] ) ? floatval( wp_unslash( $_POST['price'] ) ) : 0;
		$desc  = isset( $_POST['description'] ) ? sanitize_textarea_field( wp_unslash( $_POST['description'] ) ) : '';
		$amen  = isset( $_POST['amenities'] ) ? wp_unslash( (string) $_POST['amenities'] ) : '';
		$imgs  = isset( $_POST['images'] ) ? wp_unslash( (string) $_POST['images'] ) : '';
		if ( '' === $name ) {
			wp_send_json_error( [ 'message' => __( 'Room type name required.', 'nichehotel-sync-ai' ) ], 400 );
		}
		$post_id = wp_insert_post( [
			'post_title'  => $name,
			'post_type'   => 'room_type',
			'post_status' => 'publish',
			'post_content'=> $desc,
		] );
		if ( is_wp_error( $post_id ) ) {
			wp_send_json_error( [ 'message' => $post_id->get_error_message() ], 500 );
		}
		if ( $price > 0 ) { update_post_meta( $post_id, 'default_price', $price ); }
		$amenities = is_string( $amen ) && $amen !== '' ? json_decode( $amen, true ) : [];
		$images    = is_string( $imgs ) && $imgs !== '' ? json_decode( $imgs, true ) : [];
		if ( ! is_array( $amenities ) ) { $amenities = []; }
		if ( ! is_array( $images ) ) { $images = []; }
		update_post_meta( $post_id, '_amenities', wp_json_encode( array_values( array_filter( $amenities, 'strlen' ) ) ) );
		update_post_meta( $post_id, '_images', wp_json_encode( array_values( array_filter( $images, 'strlen' ) ) ) );
		wp_send_json_success( [ 'room_type_id' => $post_id ] );
	}

	public function ajax_admin_update_room_type() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$id   = isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;
		$name = isset( $_POST['name'] ) ? sanitize_text_field( wp_unslash( $_POST['name'] ) ) : '';
		$desc = isset( $_POST['description'] ) ? sanitize_textarea_field( wp_unslash( $_POST['description'] ) ) : '';
		$price= isset( $_POST['price'] ) ? floatval( wp_unslash( $_POST['price'] ) ) : null;
		$amen = isset( $_POST['amenities'] ) ? wp_unslash( (string) $_POST['amenities'] ) : '';
		$imgs = isset( $_POST['images'] ) ? wp_unslash( (string) $_POST['images'] ) : '';
		if ( ! $id ) { wp_send_json_error( [ 'message' => 'Missing id' ], 400 ); }
		if ( '' !== $name || '' !== $desc ) {
			wp_update_post( [ 'ID' => $id, 'post_title' => ( '' !== $name ? $name : get_the_title( $id ) ), 'post_content' => ( '' !== $desc ? $desc : get_post_field( 'post_content', $id ) ) ] );
		}
		if ( null !== $price ) { if ( $price > 0 ) { update_post_meta( $id, 'default_price', $price ); } else { delete_post_meta( $id, 'default_price' ); } }
		$amenities = is_string( $amen ) && $amen !== '' ? json_decode( $amen, true ) : null;
		$images    = is_string( $imgs ) && $imgs !== '' ? json_decode( $imgs, true ) : null;
		if ( is_array( $amenities ) ) { update_post_meta( $id, '_amenities', wp_json_encode( array_values( array_filter( $amenities, 'strlen' ) ) ) ); }
		if ( is_array( $images ) ) { update_post_meta( $id, '_images', wp_json_encode( array_values( array_filter( $images, 'strlen' ) ) ) ); }
		wp_send_json_success( [ 'updated' => true ] );
	}

	public function ajax_admin_delete_room_type() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$id = isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;
		if ( ! $id ) { wp_send_json_error( [ 'message' => 'Missing id' ], 400 ); }
		wp_trash_post( $id );
		wp_send_json_success( [ 'deleted' => true ] );
	}

	public function ajax_rooms_for() {
		// Nonce check for public requests
		$nonce = isset( $_POST['nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['nonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'nhsa_public_nonce' ) ) {
			wp_send_json_error( [ 'message' => __( 'Invalid nonce', 'nichehotel-sync-ai' ) ], 403 );
		}
		$hotel_id  = isset( $_POST['hotel_id'] ) ? absint( $_POST['hotel_id'] ) : 0;
		$room_type = isset( $_POST['room_type'] ) ? sanitize_text_field( wp_unslash( $_POST['room_type'] ) ) : '';
		$args = [
			'post_type'      => 'room',
			'posts_per_page' => 200,
			'post_status'    => 'publish',
		];
		if ( $hotel_id ) {
			$args['meta_query'] = [ [ 'key' => 'hotel_id', 'value' => $hotel_id ] ];
		}
		$q = new \WP_Query( $args );
		$items = [];
		foreach ( $q->posts as $p ) {
			$type   = get_post_meta( $p->ID, 'room_type', true );
			$status = get_post_meta( $p->ID, 'status', true ) ?: 'available';
			if ( $room_type && $type && $type !== $room_type ) {
				continue;
			}
			$items[] = [
				'id'          => $p->ID,
				'number'      => get_the_title( $p ),
				'room_type'   => $type,
				'status'      => $status,
				'price'       => (float) get_post_meta( $p->ID, 'room_price', true ),
				'description' => (string) get_post_meta( $p->ID, 'room_description', true ),
			];
		}
		wp_send_json_success( [ 'rooms' => $items ] );
	}

	public function ajax_admin_update_booking_status() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$booking_id = isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;
		$status     = isset( $_POST['status'] ) ? sanitize_text_field( wp_unslash( $_POST['status'] ) ) : '';
		if ( ! $booking_id || '' === $status ) {
			wp_send_json_error( [ 'message' => __( 'Missing fields.', 'nichehotel-sync-ai' ) ], 400 );
		}
		update_post_meta( $booking_id, 'booking_status', $status );
		// Log activity: booking status updated
		if ( class_exists( '\\NicheHotel_Activity_Logger' ) ) {
			\NicheHotel_Activity_Logger::log( 'booking_status_updated', [ 'booking_id' => (int) $booking_id, 'status' => (string) $status ] );
		}
		$rooms_json = (string) get_post_meta( $booking_id, '_rooms', true );
		$rooms_list = json_decode( $rooms_json, true );
		if ( ! is_array( $rooms_list ) ) { $rooms_list = []; }
		// If checking in, record per-room check-in timestamps (do not overwrite existing)
		if ( 'checked_in' === $status ) {
			$checkins_raw = (string) get_post_meta( $booking_id, '_room_checkins', true );
			$checkins = is_string( $checkins_raw ) && '' !== $checkins_raw ? json_decode( $checkins_raw, true ) : [];
			if ( ! is_array( $checkins ) ) { $checkins = []; }
			$now = current_time( 'mysql' );
			$single_room_id = (int) get_post_meta( $booking_id, '_room_id', true );
			if ( $single_room_id ) {
				if ( ! isset( $checkins[ (string) $single_room_id ] ) ) { $checkins[ (string) $single_room_id ] = $now; }
			}
			foreach ( $rooms_list as $r ) {
				$rid = isset( $r['room_id'] ) ? (int) $r['room_id'] : 0;
				if ( $rid && ! isset( $checkins[ (string) $rid ] ) ) { $checkins[ (string) $rid ] = $now; }
			}
			update_post_meta( $booking_id, '_room_checkins', wp_json_encode( $checkins ) );
		}
		// If checking out or canceling, free up the room(s)
		if ( in_array( $status, [ 'checked_out', 'canceled' ], true ) ) {
			$room_id = (int) get_post_meta( $booking_id, '_room_id', true );
			if ( $room_id ) { update_post_meta( $room_id, 'status', 'available' ); }
			foreach ( $rooms_list as $r ) {
				$rid = isset( $r['room_id'] ) ? (int) $r['room_id'] : 0;
				if ( $rid ) { update_post_meta( $rid, 'status', 'available' ); }
			}
		}
		// If booking is created, mark room(s) as booked
		if ( 'created' === $status ) {
			$room_id = (int) get_post_meta( $booking_id, '_room_id', true );
			if ( $room_id ) { update_post_meta( $room_id, 'status', 'booked' ); }
			foreach ( $rooms_list as $r ) {
				$rid = isset( $r['room_id'] ) ? (int) $r['room_id'] : 0;
				if ( $rid ) { update_post_meta( $rid, 'status', 'booked' ); }
			}
		}
		// If booking is checked-in, mark room(s) as checked_in
		if ( 'checked_in' === $status ) {
			$room_id = (int) get_post_meta( $booking_id, '_room_id', true );
			if ( $room_id ) { update_post_meta( $room_id, 'status', 'checked_in' ); }
			foreach ( $rooms_list as $r ) {
				$rid = isset( $r['room_id'] ) ? (int) $r['room_id'] : 0;
				if ( $rid ) { update_post_meta( $rid, 'status', 'checked_in' ); }
			}
		}
		wp_send_json_success();
	}

	public function ajax_admin_update_payment() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$booking_id = isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;
		$payment    = isset( $_POST['payment'] ) ? sanitize_text_field( wp_unslash( $_POST['payment'] ) ) : '';
		$method     = isset( $_POST['paymentMethod'] ) ? sanitize_text_field( wp_unslash( $_POST['paymentMethod'] ) ) : '';
		$ref        = isset( $_POST['paymentRef'] ) ? sanitize_text_field( wp_unslash( $_POST['paymentRef'] ) ) : '';
		if ( ! $booking_id ) {
			wp_send_json_error( [ 'message' => __( 'Missing booking id.', 'nichehotel-sync-ai' ) ], 400 );
		}
		if ( $method ) { update_post_meta( $booking_id, '_payment_method', $method ); }
		if ( $ref ) { update_post_meta( $booking_id, '_payment_ref', $ref ); }
		$final_payment_status = '';
		if ( $method && in_array( strtolower( $method ), [ 'card', 'ewallet' ], true ) && $ref ) {
			$final_payment_status = 'paid';
		} elseif ( $payment ) {
			$final_payment_status = ( 'paid' === strtolower( $payment ) ? 'paid' : 'unpaid' );
		}
		if ( $final_payment_status ) { update_post_meta( $booking_id, '_payment_status', $final_payment_status ); }
		// Log activity: payment update
		if ( class_exists( '\\NicheHotel_Activity_Logger' ) ) {
			\NicheHotel_Activity_Logger::log( 'booking_payment_updated', [ 'booking_id' => (int) $booking_id, 'method' => (string) $method, 'payment' => (string) $final_payment_status, 'ref' => (string) $ref ] );
		}
		wp_send_json_success( [ 'id' => $booking_id, 'payment' => ( $final_payment_status ?: get_post_meta( $booking_id, '_payment_status', true ) ) ] );
	}

	public function ajax_admin_bulk_update_booking_status() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$ids_raw = isset( $_POST['ids'] ) ? wp_unslash( $_POST['ids'] ) : '';
		$status  = isset( $_POST['status'] ) ? sanitize_text_field( wp_unslash( $_POST['status'] ) ) : '';
		if ( empty( $ids_raw ) && isset( $_POST['ids'] ) && is_array( $_POST['ids'] ) ) {
			$ids_raw = $_POST['ids'];
		}
		if ( '' === $status ) {
			wp_send_json_error( [ 'message' => __( 'Missing fields.', 'nichehotel-sync-ai' ) ], 400 );
		}
		$ids_list = is_array( $ids_raw ) ? $ids_raw : explode( ',', (string) $ids_raw );
		$ids = array_filter( array_map( 'absint', $ids_list ) );
		$updated = 0;
		foreach ( $ids as $booking_id ) {
			if ( ! $booking_id ) { continue; }
			update_post_meta( $booking_id, 'booking_status', $status );
			$rooms_json = (string) get_post_meta( $booking_id, '_rooms', true );
			$rooms_list = json_decode( $rooms_json, true );
			if ( ! is_array( $rooms_list ) ) { $rooms_list = []; }
			if ( in_array( $status, [ 'checked_out', 'canceled' ], true ) ) {
				$room_id = (int) get_post_meta( $booking_id, '_room_id', true );
				if ( $room_id ) { update_post_meta( $room_id, 'status', 'available' ); }
				foreach ( $rooms_list as $r ) {
					$rid = isset( $r['room_id'] ) ? (int) $r['room_id'] : 0;
					if ( $rid ) { update_post_meta( $rid, 'status', 'available' ); }
				}
			}
			if ( 'created' === $status ) {
				$room_id = (int) get_post_meta( $booking_id, '_room_id', true );
				if ( $room_id ) { update_post_meta( $room_id, 'status', 'booked' ); }
				foreach ( $rooms_list as $r ) {
					$rid = isset( $r['room_id'] ) ? (int) $r['room_id'] : 0;
					if ( $rid ) { update_post_meta( $rid, 'status', 'booked' ); }
				}
			}
			if ( 'checked_in' === $status ) {
				$room_id = (int) get_post_meta( $booking_id, '_room_id', true );
				if ( $room_id ) { update_post_meta( $room_id, 'status', 'checked_in' ); }
				foreach ( $rooms_list as $r ) {
					$rid = isset( $r['room_id'] ) ? (int) $r['room_id'] : 0;
					if ( $rid ) { update_post_meta( $rid, 'status', 'checked_in' ); }
				}
			}
			$updated++;
		}
		wp_send_json_success( [ 'updated' => $updated ] );
	}

	public function ajax_admin_list_bookings() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$guest     = isset( $_POST['guest'] ) ? sanitize_text_field( wp_unslash( $_POST['guest'] ) ) : '';
		$hotel_id  = isset( $_POST['hotel_id'] ) ? absint( $_POST['hotel_id'] ) : 0;
		$status    = isset( $_POST['status'] ) ? sanitize_text_field( wp_unslash( $_POST['status'] ) ) : '';
		$statuses  = isset( $_POST['statuses'] ) ? wp_unslash( $_POST['statuses'] ) : [];
		$date_from = isset( $_POST['from'] ) ? sanitize_text_field( wp_unslash( $_POST['from'] ) ) : '';
		$date_to   = isset( $_POST['to'] ) ? sanitize_text_field( wp_unslash( $_POST['to'] ) ) : '';

		$meta_query = [ 'relation' => 'AND' ];
		if ( $hotel_id ) {
			$meta_query[] = [ 'key' => '_hotel_id', 'value' => $hotel_id ];
		}
		if ( $guest ) {
			$meta_query[] = [ 'relation' => 'OR',
				[ 'key' => '_guest_name',   'value' => $guest, 'compare' => 'LIKE' ],
				[ 'key' => 'guest_name',    'value' => $guest, 'compare' => 'LIKE' ],
				[ 'key' => 'booking_code',  'value' => $guest, 'compare' => 'LIKE' ],
				[ 'key' => '_booking_code', 'value' => $guest, 'compare' => 'LIKE' ],
				// Search by room number (single-room legacy meta)
				[ 'key' => '_room_number',  'value' => $guest, 'compare' => 'LIKE' ],
				[ 'key' => 'room',          'value' => $guest, 'compare' => 'LIKE' ],
				// Search within JSON-encoded rooms list
				[ 'key' => '_rooms',        'value' => $guest, 'compare' => 'LIKE' ],
			];
		}
		if ( is_array( $statuses ) && ! empty( $statuses ) ) {
			$clean_statuses = array_values( array_filter( array_map( 'sanitize_text_field', $statuses ) ) );
			if ( ! empty( $clean_statuses ) ) {
				$meta_query[] = [ 'key' => 'booking_status', 'value' => $clean_statuses, 'compare' => 'IN' ];
			}
		} elseif ( $status ) {
			$meta_query[] = [ 'key' => 'booking_status', 'value' => $status ];
		} elseif ( '' === $guest ) {
			// Only apply default statuses when not searching
			$meta_query[] = [ 'key' => 'booking_status', 'value' => [ 'created', 'checked_in' ], 'compare' => 'IN' ];
		}
		if ( $date_from ) {
			$meta_query[] = [ 'key' => '_checkin_date', 'value' => $date_from, 'compare' => '>=' ];
		}
		if ( $date_to ) {
			$meta_query[] = [ 'key' => '_checkout_date', 'value' => $date_to, 'compare' => '<=' ];
		}
		$args = [ 'post_type' => 'booking', 'posts_per_page' => 50, 'post_status' => 'publish' ];
		if ( ! empty( $meta_query ) && count( $meta_query ) > 1 ) { $args['meta_query'] = $meta_query; }
		$q = new \WP_Query( $args );
		$data = [];
		foreach ( $q->posts as $p ) {
			$id = $p->ID;
			$author_id = (int) get_post_field( 'post_author', $id );
			$user_email = get_post_meta( $id, '_guest_email', true );
			$user_name  = '';
			if ( $author_id ) { $u = get_userdata( $author_id ); if ( $u ) { $user_name = $u->display_name ?: $u->user_login; if ( ! $user_email ) { $user_email = $u->user_email; } } }
			// Normalize meta to strings (avoid Array outputs)
			$sal = get_post_meta( $id, '_guest_salutation', true ); if ( is_array( $sal ) ) { $sal = reset( $sal ) ?: ''; }
			$fn  = get_post_meta( $id, '_guest_first_name', true ); if ( is_array( $fn ) ) { $fn = reset( $fn ) ?: ''; }
			$ln  = get_post_meta( $id, '_guest_last_name', true ); if ( is_array( $ln ) ) { $ln = reset( $ln ) ?: ''; }
			$gd  = get_post_meta( $id, '_guest_gender', true ); if ( is_array( $gd ) ) { $gd = reset( $gd ) ?: ''; }
			$bd  = get_post_meta( $id, '_guest_birth', true ); if ( is_array( $bd ) ) { $bd = reset( $bd ) ?: ''; }
			$nat = get_post_meta( $id, '_guest_nationality', true ); if ( is_array( $nat ) ) { $nat = reset( $nat ) ?: ''; }
			$em1 = get_post_meta( $id, '_guest_email', true ); if ( is_array( $em1 ) ) { $em1 = reset( $em1 ) ?: ''; }
			$em2 = get_post_meta( $id, 'guest_email', true ); if ( is_array( $em2 ) ) { $em2 = reset( $em2 ) ?: ''; }
			$em3 = get_post_meta( $id, 'email', true ); if ( is_array( $em3 ) ) { $em3 = reset( $em3 ) ?: ''; }
			$ph1 = get_post_meta( $id, '_guest_phone', true ); if ( is_array( $ph1 ) ) { $ph1 = reset( $ph1 ) ?: ''; }
			$ph2 = get_post_meta( $id, 'guest_phone', true ); if ( is_array( $ph2 ) ) { $ph2 = reset( $ph2 ) ?: ''; }
			$ph3 = get_post_meta( $id, 'phone', true ); if ( is_array( $ph3 ) ) { $ph3 = reset( $ph3 ) ?: ''; }
			$aw  = get_post_meta( $id, '_arrival_window', true ); if ( is_array( $aw ) ) { $aw = reset( $aw ) ?: ''; }
			$nt1 = get_post_meta( $id, '_notes', true ); if ( is_array( $nt1 ) ) { $nt1 = reset( $nt1 ) ?: ''; }
			$nt2 = get_post_meta( $id, 'notes', true ); if ( is_array( $nt2 ) ) { $nt2 = reset( $nt2 ) ?: ''; }
			// If first/last names are empty or numeric-like, try to derive from guest_name
			$guest_full = get_post_meta( $id, '_guest_name', true ); if ( is_array( $guest_full ) ) { $guest_full = reset( $guest_full ) ?: ''; }
			if ( ( '' === $fn || is_numeric( $fn ) ) && $guest_full ) {
				$parts = preg_split( '/\s+/', trim( (string) $guest_full ) );
				if ( is_array( $parts ) && ! empty( $parts ) ) {
					$fn = (string) ( $parts[0] ?? $fn );
					if ( '' === $ln || is_numeric( $ln ) ) {
						$ln = (string) implode( ' ', array_slice( $parts, 1 ) );
					}
				}
			}
			$details = [
				'salutation'   => (string) $sal,
				'firstName'    => (string) $fn,
				'lastName'     => (string) $ln,
				'gender'       => (string) $gd,
				'birth'        => (string) $bd,
				'nationality'  => (string) $nat,
				'email'        => (string) ( $user_email ?: $em1 ?: $em2 ?: $em3 ),
				'phone'        => (string) ( $ph1 ?: $ph2 ?: $ph3 ),
				'arrivalWindow'=> (string) $aw,
				'notes'        => (string) ( $nt1 ?: $nt2 ),
			];
			$rooms_json = (string) get_post_meta( $id, '_rooms', true );
			$rooms_list = json_decode( $rooms_json, true ); if ( ! is_array( $rooms_list ) ) { $rooms_list = []; }
			$data[] = [
				'id'          => $id,
				'guest'       => get_post_meta( $id, '_guest_name', true ) ?: get_post_meta( $id, 'guest_name', true ),
				'hotel'       => get_post_meta( $id, '_hotel_name', true ) ?: get_post_meta( $id, 'hotel_name', true ),
				'hotelId'     => (int) ( get_post_meta( $id, '_hotel_id', true ) ?: 0 ),
				'roomType'    => get_post_meta( $id, '_room_type', true ) ?: get_post_meta( $id, 'room_type', true ),
				'roomNum'     => get_post_meta( $id, '_room_number', true ) ?: get_post_meta( $id, 'room', true ),
				'checkin'     => get_post_meta( $id, '_checkin_date', true ) ?: get_post_meta( $id, 'check_in', true ),
				'checkout'    => get_post_meta( $id, '_checkout_date', true ) ?: get_post_meta( $id, 'check_out', true ),
				'status'      => get_post_meta( $id, 'booking_status', true ),
				'code'        => get_post_meta( $id, 'booking_code', true ) ?: get_post_meta( $id, '_booking_code', true ),
				'payment'     => ( get_post_meta( $id, '_payment_status', true ) ?: 'unpaid' ),
				'amounts'     => [
					'subtotal' => (float) get_post_meta( $id, '_subtotal_amount', true ),
					'tax'      => (float) get_post_meta( $id, '_tax_amount', true ),
					'total'    => (float) get_post_meta( $id, '_total_amount', true ),
				],
				'paymentInfo' => [
					'method' => (string) get_post_meta( $id, '_payment_method', true ),
					'ref'    => (string) get_post_meta( $id, '_payment_ref', true ),
				],
				'user'        => [ 'id' => $author_id, 'name' => $user_name, 'email' => (string) $user_email ],
				'details'     => $details,
				'rooms'       => $rooms_list,
				'roomCheckins'=> ( function() use ( $id ) {
					$raw = (string) get_post_meta( $id, '_room_checkins', true );
					$map = json_decode( $raw, true );
					return is_array( $map ) ? $map : [];
				} )(),
				'computed'    => [ 'checkout' => (string) ( get_post_meta( $id, '_checkout_date', true ) ?: '' ) ],
			];
		}
		wp_send_json_success( [ 'bookings' => $data ] );
	}

	public function ajax_admin_dashboard_metrics() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		// Totals
		$counts = wp_count_posts( 'room' );
		$total_rooms = isset( $counts->publish ) ? (int) $counts->publish : 0;
		$available_rooms = 0;
		$rooms_q = new \WP_Query( [ 'post_type' => 'room', 'post_status' => 'publish', 'posts_per_page' => 1000, 'fields' => 'ids' ] );
		foreach ( $rooms_q->posts as $rid ) {
			$status = (string) get_post_meta( $rid, 'status', true );
			if ( '' === $status || 'available' === $status ) { $available_rooms++; }
		}

		// Next 7 days trends
		$now = current_time( 'timestamp' );
		$days = [];
		for ( $i = 0; $i < 7; $i++ ) {
			$ts = strtotime( "+$i day", $now );
			$days[] = date( 'Y-m-d', $ts );
		}
		$from = $days[0];
		$to   = $days[6];
		$bookings_q = new \WP_Query( [
			'post_type' => 'booking',
			'post_status' => 'publish',
			'posts_per_page' => 500,
			'meta_query' => [
				'relation' => 'AND',
				[ 'key' => '_checkin_date', 'value' => $from, 'compare' => '>=' ],
				[ 'key' => '_checkout_date', 'value' => $to, 'compare' => '<=' ],
			],
		] );
		$occupancy_map = array_fill_keys( $days, 0 );
		$checkins_map  = array_fill_keys( $days, 0 );
		$checkouts_map = array_fill_keys( $days, 0 );
		foreach ( $bookings_q->posts as $bp ) {
			$id   = $bp->ID;
			$cin  = (string) get_post_meta( $id, '_checkin_date', true ) ?: (string) get_post_meta( $id, 'check_in', true );
			$cout = (string) get_post_meta( $id, '_checkout_date', true ) ?: (string) get_post_meta( $id, 'check_out', true );
			$status = (string) get_post_meta( $id, 'booking_status', true );
			if ( 'canceled' === strtolower( $status ) ) { continue; }
			if ( isset( $checkins_map[ $cin ] ) ) { $checkins_map[ $cin ]++; }
			if ( isset( $checkouts_map[ $cout ] ) ) { $checkouts_map[ $cout ]++; }
			foreach ( $days as $d ) {
				if ( $d >= $cin && $d < $cout ) { $occupancy_map[ $d ]++; }
			}
		}
		$occupancy = array_values( $occupancy_map );
		$checkins  = array_values( $checkins_map );
		$checkouts = array_values( $checkouts_map );

		wp_send_json_success( [
			'totalRooms'     => $total_rooms,
			'availableRooms' => $available_rooms,
			'days'           => $days,
			'occupancy'      => $occupancy,
			'checkins'       => $checkins,
			'checkouts'      => $checkouts,
		] );
	}

	private function pick_available_room_for( int $hotel_id, string $room_type ) {
		$args = [
			'post_type'      => 'room',
			'posts_per_page' => 200,
			'post_status'    => 'publish',
			'meta_query'     => [ [ 'key' => 'hotel_id', 'value' => $hotel_id ] ],
		];
		$q = new \WP_Query( $args );
		$want = strtolower( $room_type );
		$available = [];
		foreach ( $q->posts as $p ) {
			$type   = strtolower( (string) get_post_meta( $p->ID, 'room_type', true ) );
			$status = (string) get_post_meta( $p->ID, 'status', true );
			if ( $type === $want && ( '' === $status || 'available' === $status ) ) {
				$available[] = [ 'id' => $p->ID, 'number' => get_the_title( $p ) ];
			}
		}
		if ( empty( $available ) ) { return null; }
		return $available[ array_rand( $available ) ];
	}

	public function ajax_admin_add_booking() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_send_json_error( 'No permission' );
		}
		$hotel_id  = isset( $_POST['hotel_id'] ) ? absint( $_POST['hotel_id'] ) : 0;
		$guest     = isset( $_POST['guest'] ) ? sanitize_text_field( wp_unslash( $_POST['guest'] ) ) : '';
		$email     = isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : '';
		$phone     = isset( $_POST['phone'] ) ? sanitize_text_field( wp_unslash( $_POST['phone'] ) ) : '';
		$room_type = isset( $_POST['room_type'] ) ? sanitize_text_field( wp_unslash( $_POST['room_type'] ) ) : '';
		$checkin   = isset( $_POST['checkin'] ) ? sanitize_text_field( wp_unslash( $_POST['checkin'] ) ) : '';
		$checkout  = isset( $_POST['checkout'] ) ? sanitize_text_field( wp_unslash( $_POST['checkout'] ) ) : '';
		$guests    = isset( $_POST['guests'] ) ? absint( $_POST['guests'] ) : 1;
		$payment   = isset( $_POST['payment'] ) ? sanitize_text_field( wp_unslash( $_POST['payment'] ) ) : '';
		$pay_method= isset( $_POST['paymentMethod'] ) ? sanitize_text_field( wp_unslash( $_POST['paymentMethod'] ) ) : '';
		$pay_ref   = isset( $_POST['paymentRef'] ) ? sanitize_text_field( wp_unslash( $_POST['paymentRef'] ) ) : '';
		$salutation= isset( $_POST['salutation'] ) ? sanitize_text_field( wp_unslash( $_POST['salutation'] ) ) : '';
		$first     = isset( $_POST['firstName'] ) ? sanitize_text_field( wp_unslash( $_POST['firstName'] ) ) : '';
		$last      = isset( $_POST['lastName'] ) ? sanitize_text_field( wp_unslash( $_POST['lastName'] ) ) : '';
		$gender    = isset( $_POST['gender'] ) ? sanitize_text_field( wp_unslash( $_POST['gender'] ) ) : '';
		$birth     = isset( $_POST['birth'] ) ? sanitize_text_field( wp_unslash( $_POST['birth'] ) ) : '';
		$nation    = isset( $_POST['nationality'] ) ? sanitize_text_field( wp_unslash( $_POST['nationality'] ) ) : '';
		$arrival_w = isset( $_POST['arrivalWindow'] ) ? sanitize_text_field( wp_unslash( $_POST['arrivalWindow'] ) ) : '';
		$notes     = isset( $_POST['notes'] ) ? sanitize_textarea_field( wp_unslash( $_POST['notes'] ) ) : '';
		$selected_types_raw = isset( $_POST['selected_types'] ) ? wp_unslash( $_POST['selected_types'] ) : '';
		$nights_map_raw     = isset( $_POST['nights_map'] ) ? wp_unslash( $_POST['nights_map'] ) : '';
		$occupants_map_raw  = isset( $_POST['occupants_map'] ) ? wp_unslash( $_POST['occupants_map'] ) : '';
		$selected_types = [];
		if ( is_string( $selected_types_raw ) && '' !== $selected_types_raw ) {
			$dec = json_decode( $selected_types_raw, true );
			if ( is_array( $dec ) ) { $selected_types = $dec; }
		}
		$nights_map = [];
		if ( is_string( $nights_map_raw ) && '' !== $nights_map_raw ) {
			$dec_n = json_decode( $nights_map_raw, true );
			if ( is_array( $dec_n ) ) { $nights_map = $dec_n; }
		}
		$occupants_map = [];
		if ( is_string( $occupants_map_raw ) && '' !== $occupants_map_raw ) {
			$dec_o = json_decode( $occupants_map_raw, true );
			if ( is_array( $dec_o ) ) { $occupants_map = $dec_o; }
		}
		$has_multi = ! empty( $selected_types );
		if ( ! $hotel_id || '' === $guest || ( '' === $room_type && ! $has_multi ) || '' === $checkin || '' === $checkout ) {
			wp_send_json_error( [ 'message' => __( 'Missing fields.', 'nichehotel-sync-ai' ) ], 400 );
		}
		$default_nights = 0;
		if ( $checkin && $checkout ) {
			$ci = strtotime( $checkin );
			$co = strtotime( $checkout );
			if ( $ci && $co && $co > $ci ) {
				$default_nights = (int) floor( ( $co - $ci ) / DAY_IN_SECONDS );
			}
		}
		$hotel     = get_post( $hotel_id );
		$hotel_name= $hotel ? get_the_title( $hotel ) : '';
		$allocated = [];
		$subtotal_amount = 0.0;
		if ( $has_multi ) {
			foreach ( $selected_types as $row ) {
				$type_id = strtolower( sanitize_text_field( (string) ( $row['id'] ?? '' ) ) );
				$qty     = absint( $row['qty'] ?? 0 );
				if ( ! $type_id || $qty <= 0 ) { continue; }
				for ( $i = 0; $i < $qty; $i++ ) {
					$pick = $this->pick_available_room_for( $hotel_id, $type_id );
					if ( $pick && isset( $pick['id'] ) ) {
						// Determine nights for this allocated room using nights_map if provided
						$nm_for_type = isset( $nights_map[ $type_id ] ) && is_array( $nights_map[ $type_id ] ) ? $nights_map[ $type_id ] : [];
						$nm_value = isset( $nm_for_type[ $i ] ) ? absint( $nm_for_type[ $i ] ) : 0;
						$room_nights = ( $nm_value > 0 && ( 0 === $default_nights || $nm_value <= $default_nights ) ) ? $nm_value : $default_nights;
						// Occupants per room if provided
						$occ_for_type = isset( $occupants_map[ $type_id ] ) && is_array( $occupants_map[ $type_id ] ) ? $occupants_map[ $type_id ] : [];
						$occ_value = isset( $occ_for_type[ $i ] ) && is_array( $occ_for_type[ $i ] ) ? $occ_for_type[ $i ] : [];
						$adult = isset( $occ_value['adult'] ) ? max( 1, absint( $occ_value['adult'] ) ) : 1;
						$child = isset( $occ_value['child'] ) ? max( 0, absint( $occ_value['child'] ) ) : 0;
						$price = (float) get_post_meta( (int) $pick['id'], 'room_price', true );
						$allocated[] = [ 'room_id' => (int) $pick['id'], 'room_number' => (string) $pick['number'], 'room_type' => $type_id, 'nights' => (int) $room_nights, 'adult' => $adult, 'child' => $child, 'price' => $price ];
						$subtotal_amount += ( ( $room_nights > 0 ? $room_nights : max( 1, $default_nights ) ) * $price );
						update_post_meta( (int) $pick['id'], 'status', 'booked' );
					}
				}
			}
			if ( empty( $allocated ) ) {
				wp_send_json_error( [ 'message' => __( 'No available rooms for selected types.', 'nichehotel-sync-ai' ) ], 400 );
			}
			$first     = $allocated[0];
			$room_type = (string) ( $first['room_type'] ?? $room_type );
			$chosen    = [ 'id' => (int) $first['room_id'], 'number' => (string) $first['room_number'] ];
		} else {
			$chosen    = $this->pick_available_room_for( $hotel_id, $room_type );
			if ( ! $chosen ) {
				wp_send_json_error( [ 'message' => __( 'No available room for that type.', 'nichehotel-sync-ai' ) ], 400 );
			}
			$price = (float) get_post_meta( (int) $chosen['id'], 'room_price', true );
			$allocated[] = [ 'room_id' => (int) $chosen['id'], 'room_number' => (string) $chosen['number'], 'room_type' => strtolower( (string) $room_type ), 'nights' => (int) $default_nights, 'price' => $price ];
			$subtotal_amount += ( ( $default_nights > 0 ? $default_nights : 1 ) * $price );
			update_post_meta( (int) $chosen['id'], 'status', 'booked' );
		}
		$title = trim( sprintf( __( 'Booking for %1$s (%2$s → %3$s)', 'nichehotel-sync-ai' ), $guest, $checkin, $checkout ) );
		if ( '' === $title ) { $title = __( 'New Booking', 'nichehotel-sync-ai' ); }
		$post_id = wp_insert_post( [ 'post_title' => $title, 'post_type' => 'booking', 'post_status' => 'publish' ] );
		if ( is_wp_error( $post_id ) || ! $post_id ) {
			wp_send_json_error( [ 'message' => __( 'Could not create booking.', 'nichehotel-sync-ai' ) ], 500 );
		}
		// Log activity: booking created
		if ( class_exists( '\\NicheHotel_Activity_Logger' ) ) {
			\NicheHotel_Activity_Logger::log( 'booking_created', [ 'booking_id' => (int) $post_id, 'hotel_id' => (int) $hotel_id, 'guest' => (string) $guest ] );
		}
		$booking_code = strtoupper( wp_generate_password( 8, false, false ) );
		// Associate with user if email matches
		if ( $email ) {
			$user = get_user_by( 'email', $email );
			if ( $user ) {
				wp_update_post( [ 'ID' => $post_id, 'post_author' => (int) $user->ID ] );
				update_post_meta( $post_id, '_user_id', (int) $user->ID );
			}
		}
		update_post_meta( $post_id, '_hotel_id', $hotel_id );
		update_post_meta( $post_id, '_hotel_name', $hotel_name );
		update_post_meta( $post_id, '_room_type', $room_type );
		update_post_meta( $post_id, '_room_id', $chosen['id'] );
		update_post_meta( $post_id, '_room_number', $chosen['number'] );
		update_post_meta( $post_id, '_checkin_date', $checkin );
		update_post_meta( $post_id, '_checkout_date', $checkout );
		update_post_meta( $post_id, '_guest_name', $guest );
		if ( ! empty( $nights_map ) ) { update_post_meta( $post_id, '_nights_map', wp_json_encode( $nights_map ) ); }
		if ( $email ) { update_post_meta( $post_id, '_guest_email', $email ); }
		if ( $phone ) { update_post_meta( $post_id, '_guest_phone', $phone ); }
		if ( $salutation ) { update_post_meta( $post_id, '_guest_salutation', $salutation ); }
		if ( $first ) { update_post_meta( $post_id, '_guest_first_name', $first ); }
		if ( $last ) { update_post_meta( $post_id, '_guest_last_name', $last ); }
		if ( $gender ) { update_post_meta( $post_id, '_guest_gender', $gender ); }
		if ( $birth ) { update_post_meta( $post_id, '_guest_birth', $birth ); }
		if ( $nation ) { update_post_meta( $post_id, '_guest_nationality', $nation ); }
		if ( $arrival_w ) { update_post_meta( $post_id, '_arrival_window', $arrival_w ); }
		update_post_meta( $post_id, '_guests', $guests );
		update_post_meta( $post_id, '_rooms', wp_json_encode( $allocated ) );
		$tax_amount = round( $subtotal_amount * 0.12, 2 );
		$total_amount = round( $subtotal_amount + $tax_amount, 2 );
		update_post_meta( $post_id, '_subtotal_amount', $subtotal_amount );
		update_post_meta( $post_id, '_tax_amount', $tax_amount );
		update_post_meta( $post_id, '_total_amount', $total_amount );
		// Determine payment status
		$final_payment_status = '';
		if ( $pay_method && in_array( strtolower( $pay_method ), [ 'card', 'ewallet' ], true ) && $pay_ref ) {
			$final_payment_status = 'paid';
		} elseif ( $payment ) {
			$final_payment_status = ( 'paid' === strtolower( $payment ) ? 'paid' : 'unpaid' );
		}
		if ( $final_payment_status ) { update_post_meta( $post_id, '_payment_status', $final_payment_status ); }
		if ( $pay_method ) { update_post_meta( $post_id, '_payment_method', $pay_method ); }
		if ( $pay_ref ) { update_post_meta( $post_id, '_payment_ref', $pay_ref ); }
		if ( $notes ) { update_post_meta( $post_id, '_notes', $notes ); }
		// Log activity: payment info on create (if provided)
		if ( class_exists( '\\NicheHotel_Activity_Logger' ) && ( $final_payment_status || $pay_method || $pay_ref ) ) {
			\NicheHotel_Activity_Logger::log( 'booking_payment_info', [ 'booking_id' => (int) $post_id, 'method' => (string) $pay_method, 'payment' => (string) $final_payment_status, 'ref' => (string) $pay_ref ] );
		}
		// legacy keys
		update_post_meta( $post_id, 'guest_name', $guest );
		update_post_meta( $post_id, 'check_in', $checkin );
		update_post_meta( $post_id, 'check_out', $checkout );
		update_post_meta( $post_id, 'room', $chosen['number'] );
		update_post_meta( $post_id, 'booking_code', $booking_code );
		update_post_meta( $post_id, '_booking_code', $booking_code );
		update_post_meta( $post_id, 'booking_status', 'created' );
		// After allocation, set display meta and legacy 'room' for webhook compatibility
		$room_numbers = [];
		$type_counts  = [];
		foreach ( $allocated as $a ) {
			if ( ! empty( $a['room_number'] ) ) { $room_numbers[] = (string) $a['room_number']; }
			$t = (string) ( $a['room_type'] ?? '' );
			if ( $t !== '' ) { $type_counts[ $t ] = ( $type_counts[ $t ] ?? 0 ) + 1; }
		}
		$room_type_display = '';
		if ( ! empty( $type_counts ) ) {
			$parts = [];
			foreach ( $type_counts as $t => $c ) { $parts[] = $c . 'x ' . ucfirst( $t ); }
			$room_type_display = implode( ', ', $parts );
		}
		$room_num_display = ! empty( $room_numbers ) ? implode( ', ', $room_numbers ) : '';
		if ( $room_type_display !== '' ) { update_post_meta( $post_id, '_room_type', $room_type_display ); }
		if ( $room_num_display !== '' ) { update_post_meta( $post_id, '_room_number', $room_num_display ); update_post_meta( $post_id, 'room', $room_num_display ); }
		// Fire booking created webhook
		do_action( 'nichehotel/booking_created', $post_id );
		// Log activity (admin create)
		if ( class_exists( '\\NicheHotel_Activity_Logger' ) ) {
			\NicheHotel_Activity_Logger::log( 'booking_created', [ 'booking_id' => (int) $post_id, 'hotel_id' => (int) $hotel_id, 'guest' => (string) $guest ] );
		}
		wp_send_json_success( [ 'id' => $post_id, 'ref' => $booking_code, 'booking_code' => $booking_code ] );
	}

	public function ajax_admin_export_bookings() {
		$nonce = isset( $_REQUEST['nonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['nonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'nhsa_admin_nonce' ) || ! \NicheHotel_Permissions::can_edit_bookings() ) {
			wp_die( __( 'Unauthorized', 'nichehotel-sync-ai' ), '', [ 'response' => 403 ] );
		}
		$guest     = isset( $_REQUEST['guest'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['guest'] ) ) : '';
		$hotel_id  = isset( $_REQUEST['hotel_id'] ) ? absint( $_REQUEST['hotel_id'] ) : 0;
		$status    = isset( $_REQUEST['status'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['status'] ) ) : '';
		$date_from = isset( $_REQUEST['from'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['from'] ) ) : '';
		$date_to   = isset( $_REQUEST['to'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['to'] ) ) : '';

		$meta_query = [ 'relation' => 'AND' ];
		if ( $hotel_id ) {
			$meta_query[] = [ 'key' => '_hotel_id', 'value' => $hotel_id ];
		}
		if ( $guest ) {
			$meta_query[] = [ 'relation' => 'OR',
				[ 'key' => '_guest_name',   'value' => $guest, 'compare' => 'LIKE' ],
				[ 'key' => 'guest_name',    'value' => $guest, 'compare' => 'LIKE' ],
				[ 'key' => 'booking_code',  'value' => $guest, 'compare' => 'LIKE' ],
				[ 'key' => '_booking_code', 'value' => $guest, 'compare' => 'LIKE' ],
			];
		}
		if ( $status ) {
			$meta_query[] = [ 'key' => 'booking_status', 'value' => $status ];
		}
		if ( $date_from ) { $meta_query[] = [ 'key' => '_checkin_date', 'value' => $date_from, 'compare' => '>=' ]; }
		if ( $date_to )   { $meta_query[] = [ 'key' => '_checkout_date', 'value' => $date_to, 'compare' => '<=' ]; }
		$args = [ 'post_type' => 'booking', 'posts_per_page' => 1000, 'post_status' => 'publish' ];
		if ( count( $meta_query ) > 1 ) { $args['meta_query'] = $meta_query; }
		$q = new \WP_Query( $args );

		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename=bookings-export-' . date( 'Ymd-His' ) . '.csv' );
		$fh = fopen( 'php://output', 'w' );
		fputcsv( $fh, [ 'ID', 'Guest', 'Hotel', 'Room Type', 'Room #', 'Check-in', 'Check-out', 'Status' ] );
		foreach ( $q->posts as $p ) {
			$id = $p->ID;
			$guest   = (string) ( get_post_meta( $id, '_guest_name', true ) ?: get_post_meta( $id, 'guest_name', true ) );
			$hotel   = (string) ( get_post_meta( $id, '_hotel_name', true ) ?: get_post_meta( $id, 'hotel_name', true ) );
			$rtype   = (string) ( get_post_meta( $id, '_room_type', true ) ?: get_post_meta( $id, 'room_type', true ) );
			$rnum    = (string) ( get_post_meta( $id, '_room_number', true ) ?: get_post_meta( $id, 'room', true ) );
			$cin     = (string) ( get_post_meta( $id, '_checkin_date', true ) ?: get_post_meta( $id, 'check_in', true ) );
			$cout    = (string) ( get_post_meta( $id, '_checkout_date', true ) ?: get_post_meta( $id, 'check_out', true ) );
			$status  = (string) get_post_meta( $id, 'booking_status', true );
			foreach ( [ 'guest', 'hotel', 'rtype', 'rnum', 'cin', 'cout', 'status' ] as $k ) {
				if ( preg_match( '/^[=+\-@]/', $$k ) ) { $$k = "'" . $$k; }
			}
			$row = [ $id, $guest, $hotel, $rtype, $rnum, $cin, $cout, $status ];
			fputcsv( $fh, $row );
		}
		fclose( $fh );
		exit;
	}

	public function ajax_get_booking_form_settings() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_manage_settings() ) {
			wp_send_json_error( 'No permission' );
		}
		$defaults = [
			'enablePromo'   => true,
			'defaultBranch' => '',
			'taxRate'       => 12,
			'buttonLabel'   => 'Check Availability',
		];
		$val = get_option( 'nhsa_booking_form_settings', [] );
		if ( ! is_array( $val ) ) { $val = []; }
		$data = wp_parse_args( $val, $defaults );
		wp_send_json_success( $data );
	}

	public function ajax_save_booking_form_settings() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_manage_settings() ) {
			wp_send_json_error( 'No permission' );
		}
		$payload = isset( $_POST['payload'] ) ? wp_unslash( (string) $_POST['payload'] ) : '';
		$data = json_decode( $payload, true );
		if ( ! is_array( $data ) ) { wp_send_json_error( [ 'message' => 'Invalid payload' ], 400 ); }
		update_option( 'nhsa_booking_form_settings', [
			'enablePromo'   => ! empty( $data['enablePromo'] ),
			'defaultBranch' => isset( $data['defaultBranch'] ) ? absint( $data['defaultBranch'] ) : 0,
			'taxRate'       => isset( $data['taxRate'] ) ? (float) $data['taxRate'] : 12,
			'buttonLabel'   => isset( $data['buttonLabel'] ) ? sanitize_text_field( (string) $data['buttonLabel'] ) : 'Check Availability',
		], false );
		wp_send_json_success( [ 'saved' => true ] );
	}

	public function ajax_get_payment_settings() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_manage_settings() ) {
			wp_send_json_error( 'No permission' );
		}
		$val = [
			'paypalMode'    => get_option( 'nhsa_paypal_mode', 'sandbox' ),
			'paypalClientId' => get_option( 'nhsa_paypal_client_id', '' ),
			'paypalSecret'   => get_option( 'nhsa_paypal_secret', '' ),
			'paypalEnabled'  => (bool) get_option( 'nhsa_payments_paypal_enabled', false ),
			'accountType'    => get_option( 'nhsa_paypal_account_type', 'business' ),
			'paymentMethod'  => get_option( 'nhsa_payment_method', 'branch' ),
		];
		wp_send_json_success( $val );
	}

	public function ajax_save_payment_settings() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! \NicheHotel_Permissions::can_manage_settings() ) {
			wp_send_json_error( 'No permission' );
		}
		$payload = isset( $_POST['payload'] ) ? wp_unslash( (string) $_POST['payload'] ) : '';
		$data = json_decode( $payload, true );
		if ( ! is_array( $data ) ) { wp_send_json_error( [ 'message' => 'Invalid payload' ], 400 ); }
		update_option( 'nhsa_payments_paypal_enabled', ! empty( $data['paypalEnabled'] ), false );
		update_option( 'nhsa_paypal_mode', in_array( (string)( $data['paypalMode'] ?? 'sandbox' ), [ 'sandbox', 'live' ], true ) ? (string)$data['paypalMode'] : 'sandbox', false );
		update_option( 'nhsa_paypal_client_id', sanitize_text_field( (string)( $data['paypalClientId'] ?? '' ) ), false );
		update_option( 'nhsa_paypal_secret', sanitize_text_field( (string)( $data['paypalSecret'] ?? '' ) ), false );
		update_option( 'nhsa_paypal_account_type', in_array( (string)( $data['accountType'] ?? 'business' ), [ 'personal', 'business' ], true ) ? (string)$data['accountType'] : 'business', false );
		$method = in_array( (string)( $data['paymentMethod'] ?? 'branch' ), [ 'branch', 'online' ], true ) ? (string) $data['paymentMethod'] : 'branch';
		update_option( 'nhsa_payment_method', $method, false );
		wp_send_json_success( [ 'saved' => true ] );
	}

	private function get_paypal_api_base() : string {
		$mode = get_option( 'nhsa_paypal_mode', 'sandbox' );
		return ( $mode === 'live' ) ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
	}

	public function ajax_whoami() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! is_user_logged_in() ) {
			wp_send_json_error( [ 'message' => 'Unauthorized' ], 403 );
		}
		$caps = [
			'edit_bookings'   => current_user_can( 'edit_bookings' ),
			'view_logs'       => current_user_can( 'view_logs' ),
			'manage_settings' => current_user_can( 'manage_settings' ),
		];
		wp_send_json_success( [
			'caps'  => $caps,
			'rest'  => [ 'root' => esc_url_raw( rest_url() ), 'nonce' => wp_create_nonce( 'wp_rest' ) ],
		] );
	}

	public function handle_paypal_checkout() {
		$ref = isset( $_GET['ref'] ) ? sanitize_text_field( wp_unslash( $_GET['ref'] ) ) : '';
		$amount = isset( $_GET['amount'] ) ? (float) $_GET['amount'] : 0;
		if ( $amount <= 0 ) { wp_die( 'Invalid amount' ); }
		$client_id = get_option( 'nhsa_paypal_client_id', '' );
		$secret    = get_option( 'nhsa_paypal_secret', '' );
		if ( '' === $client_id || '' === $secret ) { wp_die( 'PayPal not configured' ); }
		// Get access token using Basic auth per PayPal spec
		$basic = 'Basic ' . base64_encode( $client_id . ':' . $secret );
		$tok_res = wp_remote_post( $this->get_paypal_api_base() . '/v1/oauth2/token', [
			'headers' => [
				'Accept'        => 'application/json',
				'Accept-Language'=> 'en_US',
				'Authorization'  => $basic,
				'Content-Type'   => 'application/x-www-form-urlencoded',
			],
			'body'    => 'grant_type=client_credentials',
			'timeout' => 20,
		] );
		if ( is_wp_error( $tok_res ) ) { wp_die( $tok_res->get_error_message() ); }
		$tok_code = wp_remote_retrieve_response_code( $tok_res );
		$tok_body = json_decode( wp_remote_retrieve_body( $tok_res ), true );
		$access   = isset( $tok_body['access_token'] ) ? (string) $tok_body['access_token'] : '';
		if ( 200 !== (int) $tok_code || '' === $access ) { wp_die( 'Could not authenticate with PayPal (HTTP ' . (int) $tok_code . ')' ); }
		// Create order
		$return_url = add_query_arg( [ 'action' => 'nhsa_paypal_return', 'ref' => rawurlencode( $ref ) ], admin_url( 'admin-post.php' ) );
		$ord_res = wp_remote_post( $this->get_paypal_api_base() . '/v2/checkout/orders', [
			'headers' => [ 'Content-Type' => 'application/json', 'Authorization' => 'Bearer ' . $access ],
			'body'    => wp_json_encode( [
				'intent' => 'CAPTURE',
				'purchase_units' => [ [ 'amount' => [ 'currency_code' => 'USD', 'value' => number_format( $amount, 2, '.', '' ) ] ] ],
				'application_context' => [ 'return_url' => $return_url, 'cancel_url' => $return_url ],
			] ),
			'timeout' => 20,
		] );
		if ( is_wp_error( $ord_res ) ) { wp_die( $ord_res->get_error_message() ); }
		$body = json_decode( wp_remote_retrieve_body( $ord_res ), true );
		$approve = '';
		if ( isset( $body['links'] ) && is_array( $body['links'] ) ) {
			foreach ( $body['links'] as $lnk ) {
				if ( isset( $lnk['rel'] ) && $lnk['rel'] === 'approve' && ! empty( $lnk['href'] ) ) { $approve = (string) $lnk['href']; break; }
			}
		}
		if ( '' === $approve ) { wp_die( 'Could not start PayPal checkout' ); }
		wp_safe_redirect( $approve );
		exit;
	}

	public function handle_paypal_return() {
		$ref  = isset( $_GET['ref'] ) ? sanitize_text_field( wp_unslash( $_GET['ref'] ) ) : '';
		$back = isset( $_GET['back'] ) ? esc_url_raw( wp_unslash( $_GET['back'] ) ) : '';
		$home_host = wp_parse_url( home_url(), PHP_URL_HOST );
		$redir = home_url( '/' );
		if ( $back ) {
			$back_host = wp_parse_url( $back, PHP_URL_HOST );
			if ( $back_host && $home_host && strtolower( $back_host ) === strtolower( $home_host ) ) {
				$redir = $back;
			}
		}
		$redir = add_query_arg( [ 'payment' => 'success', 'ref' => rawurlencode( $ref ) ], $redir );
		wp_safe_redirect( $redir );
		exit;
	}

	public function ajax_create_booking() {
		$nonce = isset( $_POST['nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['nonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'nhsa_public_nonce' ) ) {
			wp_send_json_error( [ 'message' => __( 'Invalid nonce', 'nichehotel-sync-ai' ) ], 403 );
		}
		$payload_raw = isset( $_POST['booking'] ) ? wp_unslash( (string) $_POST['booking'] ) : '';
		$data = json_decode( $payload_raw, true );
		if ( ! is_array( $data ) ) { wp_send_json_error( [ 'message' => __( 'Invalid booking payload', 'nichehotel-sync-ai' ) ], 400 ); }
		$guest   = $data['guest'] ?? [];
		$dates   = $data['dates'] ?? [];
		$party   = $data['party'] ?? [];
		$select  = $data['selection']['rooms'] ?? [];
		$totals  = $data['totals'] ?? [];
		$meta    = $data['meta'] ?? [];
		$hotel_id = isset( $meta['branchId'] ) && $meta['branchId'] !== '' ? absint( $meta['branchId'] ) : 0;
		if ( ! $hotel_id ) {
			$settings = get_option( 'nhsa_booking_form_settings', [] );
			if ( is_array( $settings ) && ! empty( $settings['defaultBranch'] ) ) {
				$hotel_id = absint( $settings['defaultBranch'] );
			}
		}
		if ( ! $hotel_id ) {
			$hq = new \WP_Query( [ 'post_type' => 'hotel', 'posts_per_page' => 1, 'post_status' => 'publish' ] );
			if ( ! empty( $hq->posts ) ) {
				$hotel_id = (int) $hq->posts[0]->ID;
			}
		}
		$hotel_name = $hotel_id ? get_the_title( $hotel_id ) : '';
		$first = sanitize_text_field( (string) ( $guest['firstName'] ?? '' ) );
		$last  = sanitize_text_field( (string) ( $guest['lastName'] ?? '' ) );
		$guest_name = trim( $first . ' ' . $last );
		if ( '' === $guest_name ) { $guest_name = sanitize_text_field( (string) ( $guest['name'] ?? '' ) ); }
		$checkin  = (string) ( $dates['checkIn'] ?? '' );
		$checkout = (string) ( $dates['checkOut'] ?? '' );
		if ( $checkin ) { $checkin = date( 'Y-m-d', strtotime( $checkin ) ); }
		if ( $checkout ) { $checkout = date( 'Y-m-d', strtotime( $checkout ) ); }
		// Create booking post
		$post_id = wp_insert_post( [ 'post_title' => $guest_name ?: 'Booking', 'post_type' => 'booking', 'post_status' => 'publish' ] );
		if ( is_wp_error( $post_id ) ) { wp_send_json_error( [ 'message' => $post_id->get_error_message() ], 500 ); }
		$booking_code = strtoupper( wp_generate_password( 8, false, false ) );
		// Log activity: booking created via public
		if ( class_exists( '\\NicheHotel_Activity_Logger' ) ) {
			\NicheHotel_Activity_Logger::log( 'booking_created', [ 'booking_id' => (int) $post_id, 'hotel_id' => (int) $hotel_id, 'guest' => (string) $guest_name ] );
		}
		update_post_meta( $post_id, 'booking_code', $booking_code );
		update_post_meta( $post_id, '_booking_code', $booking_code );
		update_post_meta( $post_id, 'booking_status', 'created' );
		update_post_meta( $post_id, '_guest_name', $guest_name );
		update_post_meta( $post_id, '_guest_email', sanitize_email( (string) ( $guest['email'] ?? '' ) ) );
		update_post_meta( $post_id, '_guest_phone', sanitize_text_field( (string) ( $guest['phone'] ?? '' ) ) );
		update_post_meta( $post_id, '_notes', sanitize_textarea_field( (string) ( $guest['notes'] ?? '' ) ) );
		// Associate booking with an existing user (by email) if available
		$user_email = isset( $guest['email'] ) ? sanitize_email( (string) $guest['email'] ) : '';
		if ( $user_email ) {
			$user = get_user_by( 'email', $user_email );
			if ( $user ) {
				wp_update_post( [ 'ID' => $post_id, 'post_author' => (int) $user->ID ] );
				update_post_meta( $post_id, '_user_id', (int) $user->ID );
				add_user_meta( (int) $user->ID, 'nhsa_booking_code', $booking_code );
			}
		}
		if ( $hotel_id ) { update_post_meta( $post_id, '_hotel_id', $hotel_id ); }
		if ( $hotel_name ) { update_post_meta( $post_id, '_hotel_name', $hotel_name ); }
		update_post_meta( $post_id, '_checkin_date', $checkin );
		update_post_meta( $post_id, '_checkout_date', $checkout );
		update_post_meta( $post_id, '_nights', absint( $dates['nights'] ?? 0 ) );
		update_post_meta( $post_id, '_party_adults', absint( $party['adults'] ?? 0 ) );
		update_post_meta( $post_id, '_party_children', absint( $party['children'] ?? 0 ) );
		$subtotal = (float) ( $totals['subtotal'] ?? 0 );
		$taxes    = (float) ( $totals['taxes'] ?? 0 );
		$total    = (float) ( $totals['grandTotal'] ?? ( $subtotal + $taxes ) );
		update_post_meta( $post_id, '_subtotal', $subtotal );
		update_post_meta( $post_id, '_tax', $taxes );
		update_post_meta( $post_id, '_total', $total );
		update_post_meta( $post_id, '_payment_method', get_option( 'nhsa_payment_method', 'branch' ) );
		if ( isset( $meta['payment'] ) ) { update_post_meta( $post_id, '_payment_status', ( $meta['payment'] === 'paid' ? 'paid' : 'unpaid' ) ); }
		// Legacy keys for compatibility
		update_post_meta( $post_id, 'guest_name', $guest_name );
		update_post_meta( $post_id, 'check_in', $checkin );
		update_post_meta( $post_id, 'check_out', $checkout );
		// Allocate rooms by type (if we have a hotel)
		$allocated = [];
		if ( $hotel_id && is_array( $select ) ) {
			foreach ( $select as $row ) {
				$type_id = strtolower( sanitize_text_field( (string) ( $row['id'] ?? '' ) ) );
				$qty = absint( $row['qty'] ?? 0 ); if ( ! $type_id || $qty <= 0 ) { continue; }
				for ( $i = 0; $i < $qty; $i++ ) {
					$pick = $this->pick_available_room_for( $hotel_id, $type_id );
					if ( $pick && isset( $pick['id'] ) ) {
						$allocated[] = [ 'room_id' => $pick['id'], 'room_number' => $pick['number'], 'room_type' => $type_id ];
						update_post_meta( $pick['id'], 'status', 'booked' );
					}
				}
			}
		}
		update_post_meta( $post_id, '_rooms', wp_json_encode( $allocated ) );
		// After allocation, set display meta and legacy 'room' for webhook compatibility
		$room_numbers = [];
		$type_counts  = [];
		foreach ( $allocated as $a ) {
			if ( ! empty( $a['room_number'] ) ) { $room_numbers[] = (string) $a['room_number']; }
			$t = (string) ( $a['room_type'] ?? '' );
			if ( $t !== '' ) { $type_counts[ $t ] = ( $type_counts[ $t ] ?? 0 ) + 1; }
		}
		$room_type_display = '';
		if ( ! empty( $type_counts ) ) {
			$parts = [];
			foreach ( $type_counts as $t => $c ) { $parts[] = $c . 'x ' . ucfirst( $t ); }
			$room_type_display = implode( ', ', $parts );
		}
		$room_num_display = ! empty( $room_numbers ) ? implode( ', ', $room_numbers ) : '';
		if ( $room_type_display !== '' ) { update_post_meta( $post_id, '_room_type', $room_type_display ); }
		if ( $room_num_display !== '' ) { update_post_meta( $post_id, '_room_number', $room_num_display ); update_post_meta( $post_id, 'room', $room_num_display ); }
		// Fire booking created webhook
		do_action( 'nichehotel/booking_created', $post_id );
		wp_send_json_success( [ 'id' => $post_id, 'ref' => $booking_code, 'booking_code' => $booking_code ] );
	}

	public function ajax_paypal_start() {
		$nonce = isset( $_REQUEST['nonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['nonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'nhsa_public_nonce' ) ) {
			wp_send_json_error( [ 'message' => __( 'Invalid nonce', 'nichehotel-sync-ai' ) ], 403 );
		}
		$amount = isset( $_REQUEST['amount'] ) ? (float) $_REQUEST['amount'] : 0;
		$ref    = isset( $_REQUEST['ref'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['ref'] ) ) : '';
		$back   = isset( $_REQUEST['back'] ) ? esc_url_raw( wp_unslash( $_REQUEST['back'] ) ) : '';
		if ( $amount <= 0 ) { wp_send_json_error( [ 'message' => 'Invalid amount' ], 400 ); }
		$client_id = get_option( 'nhsa_paypal_client_id', '' );
		$secret    = get_option( 'nhsa_paypal_secret', '' );
		if ( '' === $client_id || '' === $secret ) { wp_send_json_error( [ 'message' => 'PayPal not configured' ], 400 ); }
		$basic = 'Basic ' . base64_encode( $client_id . ':' . $secret );
		$tok_res = wp_remote_post( $this->get_paypal_api_base() . '/v1/oauth2/token', [
			'headers' => [ 'Accept' => 'application/json', 'Accept-Language' => 'en_US', 'Authorization' => $basic, 'Content-Type' => 'application/x-www-form-urlencoded' ],
			'body'    => 'grant_type=client_credentials',
			'timeout' => 20,
		] );
		if ( is_wp_error( $tok_res ) ) { wp_send_json_error( [ 'message' => $tok_res->get_error_message() ], 500 ); }
		$tok_code = wp_remote_retrieve_response_code( $tok_res );
		$tok_body = json_decode( wp_remote_retrieve_body( $tok_res ), true );
		$access   = isset( $tok_body['access_token'] ) ? (string) $tok_body['access_token'] : '';
		if ( 200 !== (int) $tok_code || '' === $access ) { wp_send_json_error( [ 'message' => 'Could not authenticate with PayPal' ], 500 ); }
		$params = [ 'action' => 'nhsa_paypal_return', 'ref' => rawurlencode( $ref ) ];
		if ( $back ) { $params['back'] = rawurlencode( $back ); }
		$return_url = add_query_arg( $params, admin_url( 'admin-post.php' ) );
		$ord_res = wp_remote_post( $this->get_paypal_api_base() . '/v2/checkout/orders', [
			'headers' => [ 'Content-Type' => 'application/json', 'Authorization' => 'Bearer ' . $access ],
			'body'    => wp_json_encode( [
				'intent' => 'CAPTURE',
				'purchase_units' => [ [ 'amount' => [ 'currency_code' => 'USD', 'value' => number_format( $amount, 2, '.', '' ) ] ] ],
				'application_context' => [ 'return_url' => $return_url, 'cancel_url' => $return_url ],
			] ),
			'timeout' => 20,
		] );
		if ( is_wp_error( $ord_res ) ) { wp_send_json_error( [ 'message' => $ord_res->get_error_message() ], 500 ); }
		$body = json_decode( wp_remote_retrieve_body( $ord_res ), true );
		$approve = '';
		if ( isset( $body['links'] ) && is_array( $body['links'] ) ) {
			foreach ( $body['links'] as $lnk ) {
				if ( isset( $lnk['rel'] ) && $lnk['rel'] === 'approve' && ! empty( $lnk['href'] ) ) { $approve = (string) $lnk['href']; break; }
			}
		}
		if ( '' === $approve ) { wp_send_json_error( [ 'message' => 'Could not start PayPal checkout' ], 500 ); }
		wp_send_json_success( [ 'approvalUrl' => $approve ] );
	}

	public function ajax_room_type_details() {
		$nonce = isset( $_POST['nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['nonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'nhsa_public_nonce' ) ) {
			wp_send_json_error( [ 'message' => __( 'Invalid nonce', 'nichehotel-sync-ai' ) ], 403 );
		}
		$slug = isset( $_POST['slug'] ) ? sanitize_title( wp_unslash( $_POST['slug'] ) ) : '';
		$name = isset( $_POST['name'] ) ? sanitize_text_field( wp_unslash( $_POST['name'] ) ) : '';
		$args = [ 'post_type' => 'room_type', 'posts_per_page' => 1, 'post_status' => 'publish' ];
		if ( $slug ) { $args['name'] = $slug; }
		elseif ( $name ) { $args['title'] = $name; }
		$q = new \WP_Query( $args );
		if ( empty( $q->posts ) ) {
			wp_send_json_error( [ 'message' => 'Not found' ], 404 );
		}
		$p = $q->posts[0];
		$title = get_the_title( $p );
		$price = (float) get_post_meta( $p->ID, 'default_price', true );
		$desc  = (string) $p->post_content;
		$amen  = (array) ( json_decode( (string) get_post_meta( $p->ID, '_amenities', true ), true ) ?: [] );
		$imgs  = (array) ( json_decode( (string) get_post_meta( $p->ID, '_images', true ), true ) ?: [] );
		$payload = [ 'id' => $p->ID, 'name' => $title, 'slug' => sanitize_title( $title ), 'price' => $price, 'description' => $desc, 'amenities' => array_values( $amen ), 'images' => array_values( $imgs ) ];
		wp_send_json_success( [ 'room_type' => $payload ] );
	}
}