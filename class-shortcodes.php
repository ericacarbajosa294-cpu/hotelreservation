<?php
namespace NicheHotelSyncAI;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Public_Shortcodes {
	public function __construct() {
		add_shortcode( 'nichehotel_booking', [ $this, 'render_booking' ] );
		add_shortcode( 'nichehotel_checkin', [ $this, 'render_checkin' ] );
		add_shortcode( 'nichehotel_checkout', [ $this, 'render_checkout' ] );
	}

	private function get_hotels_list(): array {
		$q = new \WP_Query( [ 'post_type' => 'hotel', 'posts_per_page' => 100, 'post_status' => 'publish' ] );
		$list = [];
		foreach ( $q->posts as $p ) {
			$list[] = [ 'id' => $p->ID, 'name' => get_the_title( $p ) ];
		}
		return $list;
	}

	private function pick_available_room( int $hotel_id, string $room_type ) {
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
		if ( empty( $available ) ) {
			return null;
		}
		return $available[ array_rand( $available ) ];
	}

	public function render_booking( $atts = [] ) {
		$submitted = false;
		$message   = '';

		// Process submission
		if ( isset( $_POST['nhsa_action'] ) && 'booking' === $_POST['nhsa_action'] ) {
			$nonce_ok = isset( $_POST['nhsa_booking_nonce'] ) && wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nhsa_booking_nonce'] ) ), 'nhsa_booking_submit' );
			if ( $nonce_ok ) {
				$hotel_id  = isset( $_POST['hotel_id'] ) ? absint( $_POST['hotel_id'] ) : 0;
				$hotel     = $hotel_id ? get_post( $hotel_id ) : null;
				$hotel_name= $hotel ? get_the_title( $hotel ) : '';
				$full_name = isset( $_POST['full_name'] ) ? sanitize_text_field( wp_unslash( $_POST['full_name'] ) ) : '';
				$email     = isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : '';
				$phone     = isset( $_POST['phone'] ) ? sanitize_text_field( wp_unslash( $_POST['phone'] ) ) : '';
				$room_type = isset( $_POST['room_type'] ) ? sanitize_text_field( wp_unslash( $_POST['room_type'] ) ) : '';
				$checkin   = isset( $_POST['checkin'] ) ? sanitize_text_field( wp_unslash( $_POST['checkin'] ) ) : '';
				$checkout  = isset( $_POST['checkout'] ) ? sanitize_text_field( wp_unslash( $_POST['checkout'] ) ) : '';
				$guests    = isset( $_POST['guests'] ) ? absint( $_POST['guests'] ) : 1;

				// Pick a random available room for the hotel+type
				$chosen = ( $hotel_id && $room_type ) ? $this->pick_available_room( $hotel_id, $room_type ) : null;
				if ( ! $chosen ) {
					$message = __( 'No rooms available for the selected type. Please pick a different room type or hotel.', 'nichehotel-sync-ai' );
				} else {
					$title = trim( sprintf( __( 'Booking for %1$s (%2$s → %3$s)', 'nichehotel-sync-ai' ), $full_name, $checkin, $checkout ) );
					if ( '' === $title ) { $title = __( 'New Booking', 'nichehotel-sync-ai' ); }

					$post_id = wp_insert_post( [
						'post_title'  => $title,
						'post_type'   => 'booking',
						'post_status' => 'publish',
					] );

					if ( ! is_wp_error( $post_id ) && $post_id ) {
						$booking_code = strtoupper( wp_generate_password( 8, false, false ) );
						update_post_meta( $post_id, '_hotel_id', $hotel_id );
						update_post_meta( $post_id, '_hotel_name', $hotel_name );
						update_post_meta( $post_id, '_room_type', $room_type );
						update_post_meta( $post_id, '_room_id', $chosen['id'] );
						update_post_meta( $post_id, '_room_number', $chosen['number'] );
						update_post_meta( $post_id, '_checkin_date', $checkin );
						update_post_meta( $post_id, '_checkout_date', $checkout );
						update_post_meta( $post_id, '_guest_name', $full_name );
						update_post_meta( $post_id, '_guest_email', $email );
						update_post_meta( $post_id, '_guest_phone', $phone );
						update_post_meta( $post_id, '_guests', $guests );
						// legacy keys for compatibility
						update_post_meta( $post_id, 'guest_name', $full_name );
						update_post_meta( $post_id, 'check_in', $checkin );
						update_post_meta( $post_id, 'check_out', $checkout );
						update_post_meta( $post_id, 'room', $chosen['number'] );
						update_post_meta( $post_id, 'booking_code', $booking_code );
						update_post_meta( $post_id, 'booking_status', 'created' );
						// mark room as booked
						update_post_meta( $chosen['id'], 'status', 'booked' );
						do_action( 'nichehotel/booking_created', $post_id );

						$submitted = true;
						$message   = __( 'Thank you! Your booking request has been submitted.', 'nichehotel-sync-ai' );
					} else {
						$message = __( 'There was an error creating your booking. Please try again.', 'nichehotel-sync-ai' );
					}
				}
			} else {
				$message = __( 'Security check failed. Please refresh and try again.', 'nichehotel-sync-ai' );
			}
		}

		$hotels = $this->get_hotels_list();
		ob_start();
		?>
		<div id="nhsa-booking" class="max-w-5xl mx-auto p-4 md:p-6">
			<div id="nhsa-booking-wizard-root"></div>
		</div>
		<?php
		return (string) ob_get_clean();
	}

	public function render_checkin( $atts = [] ) {
		ob_start();
		?>
		<div id="nhsa-checkin" class="max-w-lg mx-auto">
			<div class="bg-white rounded-2xl shadow p-6">
				<h2 class="text-xl font-semibold mb-4"><?php echo esc_html__( 'Self Check-in', 'nichehotel-sync-ai' ); ?></h2>
				<form class="nhsa-form space-y-4" data-success-id="nhsa-checkin-success">
					<div>
						<label class="block text-sm text-slate-600 mb-1" for="nhsa_checkin_lookup"><?php echo esc_html__( 'Booking ID / Email', 'nichehotel-sync-ai' ); ?></label>
						<input id="nhsa_checkin_lookup" name="lookup" type="text" class="w-full border rounded-xl p-2" required placeholder="ABC123 or email@example.com" />
					</div>
					<div>
						<label class="block text-sm text-slate-600 mb-1" for="nhsa_checkin_id"><?php echo esc_html__( 'Upload ID', 'nichehotel-sync-ai' ); ?></label>
						<input id="nhsa_checkin_id" name="id_photo" type="file" class="w-full border rounded-xl p-2" accept="image/*" />
					</div>
					<div>
						<label class="block text-sm text-slate-600 mb-1" for="nhsa_checkin_signature"><?php echo esc_html__( 'Signature', 'nichehotel-sync-ai' ); ?></label>
						<textarea id="nhsa_checkin_signature" name="signature" class="w-full border rounded-xl p-2" rows="4" placeholder="Type your full name as signature..."></textarea>
					</div>
					<div>
						<button type="submit" class="w-full px-4 py-3 bg-slate-900 text-white rounded-xl"><?php echo esc_html__( 'Submit Check-in', 'nichehotel-sync-ai' ); ?></button>
					</div>
				</form>
				<div id="nhsa-checkin-success" style="display:none" class="mt-4 p-4 rounded-xl bg-green-50 text-green-700">
					<?php echo esc_html__( 'Thank you! Your check-in has been received.', 'nichehotel-sync-ai' ); ?>
				</div>
			</div>
		</div>
		<?php
		return (string) ob_get_clean();
	}

	public function render_checkout( $atts = [] ) {
		ob_start();
		?>
		<div id="nhsa-checkout" class="max-w-lg mx-auto">
			<div class="bg-white rounded-2xl shadow p-6">
				<h2 class="text-xl font-semibold mb-4"><?php echo esc_html__( 'Self Check-out', 'nichehotel-sync-ai' ); ?></h2>
				<form class="nhsa-form space-y-4" data-success-id="nhsa-checkout-success">
					<div>
						<label class="block text-sm text-slate-600 mb-1" for="nhsa_checkout_lookup"><?php echo esc_html__( 'Booking ID / Email', 'nichehotel-sync-ai' ); ?></label>
						<input id="nhsa_checkout_lookup" name="lookup" type="text" class="w-full border rounded-xl p-2" required placeholder="ABC123 or email@example.com" />
					</div>
					<div>
						<label class="block text-sm text-slate-600 mb-2"><?php echo esc_html__( 'Rating', 'nichehotel-sync-ai' ); ?></label>
						<div class="flex items-center gap-3">
							<?php for ( $i = 1; $i <= 5; $i++ ) : ?>
								<label class="flex items-center gap-1">
									<input type="radio" name="rating" value="<?php echo esc_attr( (string) $i ); ?>" class="" <?php checked( 5 === $i ); ?> />
									<span><?php echo esc_html( (string) $i ); ?></span>
								</label>
							<?php endfor; ?>
						</div>
					</div>
					<div>
						<label class="block text-sm text-slate-600 mb-1" for="nhsa_checkout_comment"><?php echo esc_html__( 'Comments', 'nichehotel-sync-ai' ); ?></label>
						<textarea id="nhsa_checkout_comment" name="comment" class="w-full border rounded-xl p-2" rows="4" placeholder="Tell us about your stay..."></textarea>
					</div>
					<div>
						<button type="submit" class="w-full px-4 py-3 bg-slate-900 text-white rounded-xl"><?php echo esc_html__( 'Submit Check-out', 'nichehotel-sync-ai' ); ?></button>
					</div>
				</form>
				<div id="nhsa-checkout-success" style="display:none" class="mt-4 p-4 rounded-xl bg-green-50 text-green-700">
					<?php echo esc_html__( 'Thank you! Your check-out has been recorded.', 'nichehotel-sync-ai' ); ?>
				</div>
			</div>
		</div>
		<?php
		return (string) ob_get_clean();
	}
}

