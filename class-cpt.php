<?php
namespace NicheHotelSyncAI;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CPT {
	public static function register_post_types() {
		$common = [
			'public'       => false,
			'show_ui'      => true,
			'show_in_menu' => false,
			'supports'     => [ 'title', 'editor', 'custom-fields' ],
			'show_in_rest' => false,
		];

		register_post_type( 'booking', array_merge( $common, [
			'label' => __( 'Bookings', 'nichehotel-sync-ai' ),
		] ) );

		register_post_type( 'hotel', array_merge( $common, [
			'label' => __( 'Hotels', 'nichehotel-sync-ai' ),
		] ) );

		register_post_type( 'room_type', array_merge( $common, [
			'label' => __( 'Room Types', 'nichehotel-sync-ai' ),
		] ) );

		register_post_type( 'room', array_merge( $common, [
			'label' => __( 'Rooms', 'nichehotel-sync-ai' ),
		] ) );

		register_post_type( 'addon', array_merge( $common, [
			'label' => __( 'Add-ons', 'nichehotel-sync-ai' ),
		] ) );
	}
}

