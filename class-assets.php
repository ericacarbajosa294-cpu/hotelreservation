<?php
namespace NicheHotelSyncAI;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Assets {
	public function __construct() {
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_admin' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_public' ] );
	}

	private function is_plugin_screen() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen ) {
			return false;
		}
		return strpos( (string) $screen->id, 'nichehotel-sync-ai' ) !== false;
	}

	public function enqueue_admin() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $this->is_plugin_screen() ) {
			return;
		}

		$build_dir = NICHEHOTEL_SYNC_AI_PATH . 'admin/build/';
		$build_url = NICHEHOTEL_SYNC_AI_URL . 'admin/build/';

		// Styles: support admin.css or index.css depending on bundler output
		$css_candidates = [ 'admin.css', 'index.css', 'style.css' ];
		foreach ( $css_candidates as $css_name ) {
			if ( file_exists( $build_dir . $css_name ) ) {
				$ver = @filemtime( $build_dir . $css_name );
				if ( ! $ver ) { $ver = NICHEHOTEL_SYNC_AI_VERSION; }
				wp_enqueue_style( 'nhsa-admin', $build_url . $css_name, [], $ver, 'all' );
				break;
			}
		}

		// Script
		$js_candidates = [ 'admin.js', 'index.js' ];
		foreach ( $js_candidates as $js_name ) {
			if ( file_exists( $build_dir . $js_name ) ) {
				$ver = @filemtime( $build_dir . $js_name );
				if ( ! $ver ) { $ver = NICHEHOTEL_SYNC_AI_VERSION; }
				wp_enqueue_script( 'nhsa-admin', $build_url . $js_name, [ 'wp-element' ], $ver, true );
				break;
			}
		}

		// Media library for image uploads in Room Type Categories
		if ( function_exists( 'wp_enqueue_media' ) ) {
			wp_enqueue_media();
		}

		$initial_route = '/';
		if ( $screen ) {
			$id = (string) $screen->id;
			if ( strpos( $id, 'nichehotel-sync-ai-bookings' ) !== false ) { $initial_route = '/bookings'; }
			elseif ( strpos( $id, 'nichehotel-sync-ai-rooms' ) !== false ) { $initial_route = '/rooms'; }
			elseif ( strpos( $id, 'nichehotel-sync-ai-settings' ) !== false ) { $initial_route = '/settings'; }
			elseif ( strpos( $id, 'nichehotel-sync-ai-automation' ) !== false ) { $initial_route = '/automation'; }
			elseif ( strpos( $id, 'nichehotel-sync-ai-license' ) !== false ) { $initial_route = '/settings'; }
			elseif ( strpos( $id, 'nichehotel-sync-ai-activity-logs' ) !== false ) { $initial_route = '/activity-logs'; }
		}

		// Localize
		$capabilities = [];
		if ( function_exists( 'current_user_can' ) ) {
			$capabilities = [
				'edit_bookings'   => current_user_can( 'edit_bookings' ),
				'view_logs'       => current_user_can( 'view_logs' ),
				'manage_settings' => current_user_can( 'manage_settings' ),
			];
		}
		// Force initial route for staff to bookings
		if ( ! empty( $capabilities ) && empty( $capabilities['manage_settings'] ) ) {
			$initial_route = '/bookings';
		}
		wp_localize_script( 'nhsa-admin', 'NHSA', [
			'root'  => esc_url_raw( rest_url() ),
			'ajax'  => admin_url( 'admin-ajax.php' ),
			'nonce' => wp_create_nonce( 'nhsa_admin_nonce' ),
			'rest'  => [ 'root' => esc_url_raw( rest_url() ), 'nonce' => wp_create_nonce( 'wp_rest' ) ],
			'initialRoute' => $initial_route,
			'currentUserCaps' => $capabilities,
			'options' => [
				'booking_created'   => get_option( 'nichehotel_sync_ai_webhook_booking_created', '' ),
				'guest_checked_in'  => get_option( 'nichehotel_sync_ai_webhook_guest_checked_in', '' ),
				'guest_checked_out' => get_option( 'nichehotel_sync_ai_webhook_guest_checked_out', '' ),
				'payment_received'  => get_option( 'nichehotel_sync_ai_webhook_payment_received', '' ),
				'license_key'       => get_option( 'nichehotel_sync_ai_license_key', '' ),
				'license_status'    => get_option( 'nichehotel_sync_ai_license_status', 'inactive' ),
				'gumroad_url'       => ( get_option( 'nichehotel_sync_ai_gumroad_product_permalink', '' ) ?: get_option( 'nichehotel_sync_ai_gumroad_product', '' ) ),
				'gumroad_status'    => ( get_option( 'gumroad_license_status', '' ) ?: get_option( 'nichehotel_sync_ai_license_status', 'inactive' ) ),
				'gumroad_trial_end' => get_option( 'gumroad_free_trial_end', '' ),
				'gumroad_key'       => get_option( 'gumroad_license_key', '' ),
			],
		] );
	}

	public function enqueue_public() {
		// Only enqueue on pages where our shortcodes appear
		$should_enqueue = false;
		if ( function_exists( 'has_shortcode' ) ) {
			if ( is_singular() ) {
				$post = get_post();
				if ( $post && ( has_shortcode( $post->post_content, 'nichehotel_booking' ) || has_shortcode( $post->post_content, 'nichehotel_checkin' ) || has_shortcode( $post->post_content, 'nichehotel_checkout' ) ) ) {
					$should_enqueue = true;
				}
			}
		}
		if ( ! $should_enqueue ) {
			return;
		}

		$css_file = NICHEHOTEL_SYNC_AI_PATH . 'public/css/style.css';
		$css_ver  = file_exists( $css_file ) ? @filemtime( $css_file ) : NICHEHOTEL_SYNC_AI_VERSION;
		wp_enqueue_style( 'nichehotel-sync-ai', NICHEHOTEL_SYNC_AI_URL . 'public/css/style.css', [], $css_ver, 'all' );
		$js_file = NICHEHOTEL_SYNC_AI_PATH . 'public/js/forms.js';
		$js_ver  = file_exists( $js_file ) ? @filemtime( $js_file ) : NICHEHOTEL_SYNC_AI_VERSION;
		wp_enqueue_script( 'nichehotel-sync-ai-forms', NICHEHOTEL_SYNC_AI_URL . 'public/js/forms.js', [], $js_ver, true );
		// Booking Wizard bundle if present
		$wiz = NICHEHOTEL_SYNC_AI_PATH . 'public/build/wizard.js';
		if ( file_exists( $wiz ) ) {
			$wiz_ver = @filemtime( $wiz ) ?: NICHEHOTEL_SYNC_AI_VERSION;
			$wiz_css = NICHEHOTEL_SYNC_AI_PATH . 'public/build/wizard.tsx.css';
			if ( file_exists( $wiz_css ) ) {
				$wiz_css_ver = @filemtime( $wiz_css ) ?: NICHEHOTEL_SYNC_AI_VERSION;
				wp_enqueue_style( 'nhsa-wizard', NICHEHOTEL_SYNC_AI_URL . 'public/build/wizard.tsx.css', [ 'nichehotel-sync-ai' ], $wiz_css_ver, 'all' );
			}
			wp_enqueue_script( 'nhsa-wizard', NICHEHOTEL_SYNC_AI_URL . 'public/build/wizard.js', [ 'wp-element' ], $wiz_ver, true );
			$defaults = [ 'enablePromo' => true, 'defaultBranch' => '', 'taxRate' => 12, 'buttonLabel' => 'Check Availability' ];
			$settings = get_option( 'nhsa_booking_form_settings', [] ); if ( ! is_array( $settings ) ) { $settings = []; }
			$settings = wp_parse_args( $settings, $defaults );
			$settings['paypalEnabled'] = (bool) get_option( 'nhsa_payments_paypal_enabled', false );
			$settings['paymentMethod'] = get_option( 'nhsa_payment_method', 'branch' );
			// Fetch hotels list for public UI (id and name)
			$hotels = [];
			$hq = new \WP_Query( [ 'post_type' => 'hotel', 'posts_per_page' => 200, 'post_status' => 'publish' ] );
			foreach ( $hq->posts as $hp ) {
				$hotels[] = [ 'id' => $hp->ID, 'name' => get_the_title( $hp ) ];
			}
			wp_localize_script( 'nhsa-wizard', 'NHSA_PUBLIC', [ 'ajax' => admin_url( 'admin-ajax.php' ), 'nonce' => wp_create_nonce( 'nhsa_public_nonce' ), 'settings' => $settings, 'hotels' => $hotels ] );
		}
		wp_localize_script( 'nichehotel-sync-ai-forms', 'NHSA', [ 'ajax' => admin_url( 'admin-ajax.php' ), 'nonce' => wp_create_nonce( 'nhsa_public_nonce' ) ] );
	}
}