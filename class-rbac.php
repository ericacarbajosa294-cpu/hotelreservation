<?php
/**
 * Role-Based Access Control (RBAC) for NicheHotel Sync
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class NicheHotel_RBAC {
	/**
	 * Returns an associative array of role => capabilities.
	 *
	 * @return array
	 */
	public static function get_capabilities() {
		return [
			'nichehotel_manager' => [
				'read'             => true,
				'edit_bookings'    => true,
				'view_logs'        => true,
				'manage_settings'  => true,
			],
			'nichehotel_staff' => [
				'read'             => true,
				'edit_bookings'    => true,
			],
			'nichehotel_housekeeping' => [
				'read'               => true,
				'view_housekeeping'  => true,
			],
		];
	}

	/**
	 * Add custom roles and capabilities. Call on plugin activation.
	 */
	public static function setup_roles() {
		$caps_map = self::get_capabilities();
		foreach ( $caps_map as $role => $caps ) {
			// If role already exists, update caps; else create role
			if ( $existing = get_role( $role ) ) {
				foreach ( $caps as $cap_key => $grant ) {
					if ( $grant ) { $existing->add_cap( $cap_key ); }
				}
			} else {
				add_role( $role, self::label_for( $role ), $caps );
			}
		}
	}

	/**
	 * Remove custom roles. Call on uninstall.
	 */
	public static function remove_roles() {
		foreach ( array_keys( self::get_capabilities() ) as $role ) {
			remove_role( $role );
		}
	}

	/**
	 * @param string $role
	 * @return string
	 */
	private static function label_for( $role ) {
		switch ( $role ) {
			case 'nichehotel_manager':
				return 'NicheHotel Manager';
			case 'nichehotel_staff':
				return 'NicheHotel Staff';
			case 'nichehotel_housekeeping':
				return 'NicheHotel Housekeeping';
			default:
				return ucfirst( str_replace( '_', ' ', $role ) );
		}
	}
}

