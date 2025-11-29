<?php
namespace NicheHotelSyncAI;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Manage Gumroad license activation, trials, and subscription status.
 */
class Gumroad_License_Manager {
	const OPTION_KEY            = 'gumroad_license_key';
	const OPTION_STATUS         = 'gumroad_license_status'; // active|trial|expired|invalid|inactive
	const OPTION_TRIAL_END      = 'gumroad_free_trial_end';
	const PRODUCT_ID            = 'A0Illbb3vG1VHQPcs3oUUg==';
	const VERIFY_URL            = 'https://api.gumroad.com/v2/licenses/verify';
	const CRON_HOOK             = 'nhsa_daily_gumroad_license_validation';

	public function __construct() {
		add_action( 'admin_post_nhsa_gumroad_activate', [ $this, 'handle_activate_request' ] );
		add_action( self::CRON_HOOK, [ $this, 'check_license_status' ] );

		// AJAX endpoints to support SPA Settings → License
		add_action( 'wp_ajax_nhsa_gumroad_activate', [ $this, 'ajax_activate' ] );
		add_action( 'wp_ajax_nhsa_gumroad_deactivate', [ $this, 'ajax_deactivate' ] );

		// Throttled refresh on admin load to keep status current after reloads
		add_action( 'admin_init', function() {
			$key = get_option( self::OPTION_KEY, '' );
			if ( '' === $key ) { return; }
			$last = get_transient( 'gumroad_license_last_check' );
			if ( $last && ( time() - (int) $last ) < HOUR_IN_SECONDS ) { return; }
			$this->check_license_status();
			set_transient( 'gumroad_license_last_check', time(), HOUR_IN_SECONDS );
		} );
	}

	/**
	 * Optional classic settings page registration if needed.
	 */
	public function add_settings_page() {
		add_options_page( __( 'Plugin License', 'nichehotel-sync-ai' ), __( 'Plugin License', 'nichehotel-sync-ai' ), 'manage_options', 'nhsa-gumroad-license', [ $this, 'render_settings_page' ] );
	}

	/**
	 * Render a simple settings page for non-SPA environments.
	 */
	public function render_settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$key    = get_option( self::OPTION_KEY, '' );
		$status = get_option( self::OPTION_STATUS, 'inactive' );
		$trial  = get_option( self::OPTION_TRIAL_END, '' );
		$nonce  = wp_create_nonce( 'nhsa_gumroad_license_form' );
		?>
		<div class="wrap">
			<h1><?php echo esc_html__( 'Plugin License', 'nichehotel-sync-ai' ); ?></h1>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="nhsa_gumroad_activate" />
				<input type="hidden" name="_wpnonce" value="<?php echo esc_attr( $nonce ); ?>" />
				<table class="form-table" role="presentation">
					<tbody>
						<tr>
							<th scope="row"><label for="license_key"><?php echo esc_html__( 'License Key', 'nichehotel-sync-ai' ); ?></label></th>
							<td><input type="text" id="license_key" name="license_key" class="regular-text" value="<?php echo esc_attr( (string) $key ); ?>" /></td>
						</tr>
						<tr>
							<th scope="row"><?php echo esc_html__( 'Status', 'nichehotel-sync-ai' ); ?></th>
							<td>
								<?php echo esc_html( $this->format_status_label( $status, $trial ) ); ?>
							</td>
						</tr>
					</tbody>
				</table>
				<?php submit_button( __( 'Activate/Update', 'nichehotel-sync-ai' ) ); ?>
			</form>
		</div>
		<?php
	}

	public function handle_activate_request() {
		if ( ! current_user_can( 'manage_options' ) ) { wp_die( __( 'Unauthorized', 'nichehotel-sync-ai' ) ); }
		check_admin_referer( 'nhsa_gumroad_license_form' );
		$key = isset( $_POST['license_key'] ) ? sanitize_text_field( wp_unslash( $_POST['license_key'] ) ) : '';
		$result = $this->activate_license( $key );
		if ( $result['success'] ) {
			wp_safe_redirect( wp_get_referer() ? wp_get_referer() : admin_url( 'options-general.php' ) );
		} else {
			wp_die( $result['message'] );
		}
		exit;
	}

	public function ajax_activate() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( [ 'message' => __( 'Unauthorized', 'nichehotel-sync-ai' ) ], 403 ); }
		$key = isset( $_POST['license_key'] ) ? sanitize_text_field( wp_unslash( $_POST['license_key'] ) ) : '';
		if ( '' === $key ) { wp_send_json_error( [ 'message' => __( 'License key required.', 'nichehotel-sync-ai' ) ], 400 ); }
		$result = $this->activate_license( $key );
		if ( $result['success'] ) {
			wp_send_json_success( $result );
		} else {
			wp_send_json_error( $result );
		}
	}

	public function ajax_deactivate() {
		check_ajax_referer( 'nhsa_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( [ 'message' => __( 'Unauthorized', 'nichehotel-sync-ai' ) ], 403 ); }
		delete_option( self::OPTION_KEY );
		update_option( self::OPTION_STATUS, 'inactive', false );
		delete_option( self::OPTION_TRIAL_END );
		wp_send_json_success( [ 'status' => 'inactive' ] );
	}

	/**
	 * Activate/update the license by contacting Gumroad and saving status.
	 */
	public function activate_license( string $license_key ) : array {
		update_option( self::OPTION_KEY, $license_key, false );
		return $this->check_license_status();
	}

	/**
	 * Call Gumroad API and update stored status and trial end date.
	 */
	public function check_license_status() : array {
		$key = get_option( self::OPTION_KEY, '' );
		if ( '' === $key ) { update_option( self::OPTION_STATUS, 'inactive', false ); delete_option( self::OPTION_TRIAL_END ); return [ 'success' => false, 'status' => 'inactive', 'message' => __( 'No license key set.', 'nichehotel-sync-ai' ) ]; }
		$args = [
			'body'    => [
				'product_id'  => self::PRODUCT_ID,
				'license_key' => $key,
				'increment_uses_count' => false,
			],
			'timeout' => 20,
			'headers' => [ 'Accept' => 'application/json' ],
		];
		$response = wp_remote_post( self::VERIFY_URL, $args );
		if ( is_wp_error( $response ) ) {
			update_option( self::OPTION_STATUS, 'invalid', false );
			update_option( 'nichehotel_sync_ai_license_status', 'invalid', false );
			delete_option( self::OPTION_TRIAL_END );
			$hint = $this->diagnose_environment_issue( $response );
			$message = $response->get_error_message();
			if ( $hint ) { $message .= ' — ' . $hint; }
			return [ 'success' => false, 'status' => 'invalid', 'message' => $message ];
		}
		$code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( 200 !== $code ) {
			update_option( self::OPTION_STATUS, 'invalid', false );
			update_option( 'nichehotel_sync_ai_license_status', 'invalid', false );
			delete_option( self::OPTION_TRIAL_END );
			$hint = $this->diagnose_environment_issue( null );
			$message = sprintf( __( 'HTTP %d from Gumroad.', 'nichehotel-sync-ai' ), (int) $code );
			if ( $hint ) { $message .= ' — ' . $hint; }
			return [ 'success' => false, 'status' => 'invalid', 'message' => $message ];
		}
		if ( empty( $body ) ) {
			update_option( self::OPTION_STATUS, 'invalid', false );
			update_option( 'nichehotel_sync_ai_license_status', 'invalid', false );
			delete_option( self::OPTION_TRIAL_END );
			$hint = $this->diagnose_environment_issue( null );
			$message = __( 'Empty response from Gumroad.', 'nichehotel-sync-ai' );
			if ( $hint ) { $message .= ' — ' . $hint; }
			return [ 'success' => false, 'status' => 'invalid', 'message' => $message ];
		}
		if ( empty( $body['success'] ) ) {
			update_option( self::OPTION_STATUS, 'invalid', false );
			update_option( 'nichehotel_sync_ai_license_status', 'invalid', false );
			delete_option( self::OPTION_TRIAL_END );
			$message = isset( $body['message'] ) ? (string) $body['message'] : __( 'License invalid.', 'nichehotel-sync-ai' );
			return [ 'success' => false, 'status' => 'invalid', 'message' => $message ];
		}
		$purchase = isset( $body['purchase'] ) && is_array( $body['purchase'] ) ? $body['purchase'] : [];
		$refunded = ! empty( $purchase['refunded'] );
		if ( $refunded ) {
			update_option( self::OPTION_STATUS, 'invalid', false );
			update_option( 'nichehotel_sync_ai_license_status', 'invalid', false );
			delete_option( self::OPTION_TRIAL_END );
			return [ 'success' => false, 'status' => 'invalid', 'message' => __( 'Purchase was refunded.', 'nichehotel-sync-ai' ) ];
		}
		$now = time();
		$trial_end_raw = isset( $purchase['free_trial_ends_at'] ) ? (string) $purchase['free_trial_ends_at'] : '';
		$ended_raw     = isset( $purchase['subscription_ended_at'] ) ? (string) $purchase['subscription_ended_at'] : ( isset( $purchase['subscription_ends_at'] ) ? (string) $purchase['subscription_ends_at'] : '' );
		$next_charge_raw = isset( $purchase['next_charge_scheduled_at'] ) ? (string) $purchase['next_charge_scheduled_at'] : '';
		$has_subscription = ! empty( $purchase['subscription_id'] ) || ( ! empty( $purchase['subscription'] ) && (bool) $purchase['subscription'] );
		$trial_ts = $trial_end_raw ? strtotime( $trial_end_raw ) : 0;
		$ended_ts = $ended_raw ? strtotime( $ended_raw ) : 0;
		$next_ts  = $next_charge_raw ? strtotime( $next_charge_raw ) : 0;
		if ( $trial_ts && $trial_ts > $now ) {
			update_option( self::OPTION_STATUS, 'trial', false );
			update_option( 'nichehotel_sync_ai_license_status', 'trial', false );
			update_option( self::OPTION_TRIAL_END, gmdate( 'c', $trial_ts ), false );
			return [ 'success' => true, 'status' => 'trial', 'trialEnd' => gmdate( 'c', $trial_ts ) ];
		}
		delete_option( self::OPTION_TRIAL_END );
		// If subscription has not ended and next charge is scheduled, consider active
		if ( $next_ts && $next_ts > $now ) {
			update_option( self::OPTION_STATUS, 'active', false );
			update_option( 'nichehotel_sync_ai_license_status', 'active', false );
			return [ 'success' => true, 'status' => 'active' ];
		}
		// If marked ended in the past, expired
		if ( $ended_ts && $ended_ts <= $now ) {
			update_option( self::OPTION_STATUS, 'expired', false );
			update_option( 'nichehotel_sync_ai_license_status', 'expired', false );
			return [ 'success' => false, 'status' => 'expired', 'message' => sprintf( __( 'Subscription expired on %s.', 'nichehotel-sync-ai' ), date_i18n( 'M j, Y', $ended_ts ) ), 'expiredAt' => gmdate( 'c', $ended_ts ) ];
		}
		// Fallback: if we have a subscription and no ended time, treat as active
		if ( $has_subscription && ! $ended_ts ) {
			update_option( self::OPTION_STATUS, 'active', false );
			update_option( 'nichehotel_sync_ai_license_status', 'active', false );
			return [ 'success' => true, 'status' => 'active' ];
		}
		update_option( self::OPTION_STATUS, 'expired', false );
		update_option( 'nichehotel_sync_ai_license_status', 'expired', false );
		return [ 'success' => false, 'status' => 'expired', 'message' => __( 'Subscription expired.', 'nichehotel-sync-ai' ), 'expiredAt' => ( $ended_ts ? gmdate( 'c', $ended_ts ) : '' ) ];
	}

	/**
	 * Human-readable label for admin display.
	 */
	private function format_status_label( string $status, string $trial_iso ) : string {
		$status = strtolower( $status );
		if ( 'trial' === $status && $trial_iso ) {
			$days = $this->trial_days_left( $trial_iso );
			return sprintf( /* translators: 1: ISO date, 2: days left */ __( 'Trial – ends on %1$s (%2$s days left)', 'nichehotel-sync-ai' ), date_i18n( 'M j, Y', strtotime( $trial_iso ) ), max( 0, $days ) );
		}
		if ( 'active' === $status ) { return __( 'Active', 'nichehotel-sync-ai' ); }
		if ( 'expired' === $status ) { return __( 'Expired', 'nichehotel-sync-ai' ); }
		if ( 'invalid' === $status ) { return __( 'Invalid', 'nichehotel-sync-ai' ); }
		return __( 'Inactive', 'nichehotel-sync-ai' );
	}

	private function trial_days_left( string $trial_iso ) : int {
		$ts = strtotime( $trial_iso );
		if ( ! $ts ) { return 0; }
		$diff = $ts - time();
		return (int) ceil( $diff / DAY_IN_SECONDS );
	}

	private function diagnose_environment_issue( $wp_error = null ) : string {
		// Check if external HTTP requests are blocked in WP
		if ( defined( 'WP_HTTP_BLOCK_EXTERNAL' ) && WP_HTTP_BLOCK_EXTERNAL ) {
			$allowed = defined( 'WP_ACCESSIBLE_HOSTS' ) ? (string) WP_ACCESSIBLE_HOSTS : '';
			if ( false === stripos( $allowed, 'api.gumroad.com' ) ) {
				return __( 'External requests are blocked on this site. Add api.gumroad.com to WP_ACCESSIBLE_HOSTS.', 'nichehotel-sync-ai' );
			}
		}
		// cURL common issues
		if ( $wp_error instanceof \WP_Error ) {
			$msg = strtolower( (string) $wp_error->get_error_message() );
			if ( strpos( $msg, 'certificate' ) !== false || strpos( $msg, 'ssl' ) !== false || strpos( $msg, 'error 60' ) !== false ) {
				return __( 'SSL certificate verification failed on this server. Ask your host to update CA certificates or enable CURL/openssl.', 'nichehotel-sync-ai' );
			}
			if ( strpos( $msg, 'timed out' ) !== false || strpos( $msg, 'operation timed out' ) !== false || strpos( $msg, 'error 28' ) !== false ) {
				return __( 'The request to Gumroad timed out. Check firewall rules and allow outbound HTTPS to api.gumroad.com.', 'nichehotel-sync-ai' );
			}
			if ( strpos( $msg, 'could not resolve host' ) !== false ) {
				return __( 'DNS resolution failed. Verify your server DNS configuration.', 'nichehotel-sync-ai' );
			}
		}
		return '';
	}

	public function is_license_active() : bool {
		$status = get_option( self::OPTION_STATUS, 'inactive' );
		return in_array( $status, [ 'active', 'trial' ], true );
	}

	public function get_trial_end_date() : string {
		return (string) get_option( self::OPTION_TRIAL_END, '' );
	}
}