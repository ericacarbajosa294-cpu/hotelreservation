<?php
namespace NicheHotelSyncAI;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Simple PSR-4-like autoloader for the plugin classes.
\spl_autoload_register( function ( $class ) {
	$prefix = 'NicheHotelSyncAI\\';
	$len    = strlen( $prefix );
	if ( strncmp( $prefix, $class, $len ) !== 0 ) {
		return;
	}

	$relative = substr( $class, $len );
	$relative = ltrim( $relative, '\\' );

	$base_dir = NICHEHOTEL_SYNC_AI_PATH . 'includes/';

	// Explicit mapping for Public_Shortcodes => includes/public/class-shortcodes.php
	if ( $relative === 'Public_Shortcodes' ) {
		$file = $base_dir . 'public/class-shortcodes.php';
		if ( file_exists( $file ) ) {
			require_once $file;
		}
		return;
	}

	// Explicit mapping for Plugin_License_Manager
	if ( $relative === 'Plugin_License_Manager' ) {
		$file = $base_dir . 'class-plugin-license-manager.php';
		if ( file_exists( $file ) ) {
			require_once $file;
		}
		return;
	}

	// Explicit mapping for Gumroad_License_Manager
	if ( $relative === 'Gumroad_License_Manager' ) {
		$file = $base_dir . 'class-gumroad-license-manager.php';
		if ( file_exists( $file ) ) {
			require_once $file;
		}
		return;
	}

	$path = str_replace( '\\', '/', $relative );
	$parts = explode( '/', $path );
	$last  = array_pop( $parts );
	$last  = 'class-' . strtolower( str_replace( '_', '-', $last ) ) . '.php';
	$dir   = ! empty( $parts ) ? implode( '/', array_map( function ( $p ) { return strtolower( $p ); }, $parts ) ) . '/' : '';
	$file  = $base_dir . $dir . $last;

	if ( file_exists( $file ) ) {
		require_once $file;
	}
} );

