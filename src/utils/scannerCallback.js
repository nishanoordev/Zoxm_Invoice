/**
 * scannerCallback.js
 * 
 * BUG-15 Fix: React Navigation warns (and Hermes can crash) when functions
 * are passed as navigation params because they are not serializable.
 *
 * This module provides a global, module-level callback registry for the scanner,
 * eliminating the need to pass functions through navigation params.
 *
 * Usage:
 *   // In the calling screen, before navigating:
 *   setScannerCallback((item) => handleAddItem(item));
 *   navigation.navigate('Scanner');
 *
 *   // In ScannerScreen, instead of route.params?.onItemScanned:
 *   import { getScannerCallback, clearScannerCallback } from '../utils/scannerCallback';
 *   const cb = getScannerCallback();
 *   if (cb) { cb(item); clearScannerCallback(); }
 */

let _callback = null;

export function setScannerCallback(fn) {
  _callback = fn;
}

export function getScannerCallback() {
  return _callback;
}

export function clearScannerCallback() {
  _callback = null;
}
