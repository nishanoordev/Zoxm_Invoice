/**
 * firebaseSync.js — Synchronization logic for ZOXM Invoice
 * 
 * Handles pushing local SQLite records to Firebase Realtime Database
 * and pulling them down for multi-device sync.
 * 
 * Data Structure:
 * businesses/{businessId}/data/{entityType}/{entityId}
 */

import { ref, set, get, remove, update, onValue, off } from 'firebase/database';
import { db } from '../config/firebase';

/**
 * Pushes a single entity record (Invoice, Customer, Item, etc.) to the cloud.
 * @param {string} businessId 
 * @param {string} entityType - e.g., 'invoices', 'customers', 'payments'
 * @param {object} data - The record object (must have an .id property)
 */
export async function pushEntity(businessId, entityType, data) {
  if (!businessId || !entityType || !data?.id) {
    console.warn(`[Sync] Missing required fields for push:`, { businessId, entityType, id: data?.id });
    return;
  }
  
  try {
    const path = `businesses/${businessId}/data/${entityType}/${data.id}`;
    await set(ref(db, path), {
      ...data,
      lastSyncedAt: Date.now(),
    });
    console.log(`[Sync] Successfully pushed ${entityType}/${data.id} to cloud.`);
  } catch (error) {
    console.error(`[Sync] Error pushing ${entityType} to cloud:`, error);
    throw error;
  }
}

/**
 * Removes an entity record from the cloud.
 * @param {string} businessId 
 * @param {string} entityType 
 * @param {string|number} entityId 
 */
export async function deleteEntity(businessId, entityType, entityId) {
  if (!businessId || !entityType || !entityId) return;
  
  try {
    const path = `businesses/${businessId}/data/${entityType}/${entityId}`;
    await remove(ref(db, path));
    console.log(`[Sync] Successfully deleted ${entityType}/${entityId} from cloud.`);
  } catch (error) {
    console.error(`[Sync] Error deleting ${entityType} from cloud:`, error);
  }
}

/**
 * Pulls the entire dataset for a business from the cloud.
 * @param {string} businessId 
 * @returns {object|null} The data object map
 */
export async function pullAllData(businessId) {
  if (!businessId) return null;
  
  try {
    const path = `businesses/${businessId}/data`;
    const snapshot = await get(ref(db, path));
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error(`[Sync] Error pulling business data:`, error);
    throw error;
  }
}

/**
 * Pulls the business profile from Firebase.
 * @param {string} businessId 
 */
export async function pullProfile(businessId) {
  if (!businessId) return null;
  try {
    const path = `businesses/${businessId}/profile`;
    const snapshot = await get(ref(db, path));
    return snapshot.val();
  } catch (error) {
    console.error(`[Sync] Error pulling profile:`, error);
    return null;
  }
}

/**
 * Pulls all data for a specific entity type (e.g., 'invoices').
 * @param {string} businessId 
 * @param {string} entityType 
 */
export async function pullEntityList(businessId, entityType) {
  if (!businessId || !entityType) return null;
  try {
    const path = `businesses/${businessId}/data/${entityType}`;
    const snapshot = await get(ref(db, path));
    return snapshot.val();
  } catch (error) {
    console.error(`[Sync] Error pulling ${entityType} list:`, error);
    return null;
  }
}

/**
 * Bulk push helper — used during initial onboarding or migration.
 */
export async function bulkPush(businessId, dataMap) {
  if (!businessId || !dataMap) return;
  
  try {
    const path = `businesses/${businessId}/data`;
    await update(ref(db, path), dataMap);
    console.log(`[Sync] Bulk push for business ${businessId} completed.`);
  } catch (error) {
    console.error(`[Sync] Error in bulk push:`, error);
    throw error;
  }
}

/**
 * Pushes the business profile to Firebase so Device B can pull it on sync.
 * Only stores business-level fields (not PII like logo URIs).
 */
export async function pushProfile(businessId, profile) {
  if (!businessId) return;
  try {
    const path = `businesses/${businessId}/profile`;
    await set(ref(db, path), {
      name:            profile.name            || '',
      business_name:   profile.business_name   || '',
      currency_symbol: profile.currency_symbol  || '\u20b9',
      currency_code:   profile.currency_code    || 'INR',
      gstin:           profile.gstin            || '',
      pan_no:          profile.pan_no           || '',
      upi_id:          profile.upi_id           || '',
      updatedAt:       Date.now(),
    });
    console.log('[Sync] Profile pushed to Firebase.');
  } catch (e) {
    console.warn('[Sync] Profile push failed (non-fatal):', e);
  }
}

/**
 * Subscribes to real-time changes for a business's data node.
 * Fires callback every time ANY data under businesses/{businessId}/data changes.
 *
 * @param {string} businessId
 * @param {function} callback - called with the full data snapshot value (or null)
 * @returns {function} unsubscribe — call to stop listening
 */
export function subscribeToBusinessData(businessId, callback) {
  if (!businessId) return () => {};

  const dbRef = ref(db, `businesses/${businessId}/data`);

  onValue(
    dbRef,
    (snapshot) => {
      callback(snapshot.exists() ? snapshot.val() : null);
    },
    (error) => {
      console.error('[Sync] Real-time listener error:', error);
    }
  );

  // Return a clean unsubscribe function
  return () => {
    try { off(dbRef); } catch (_) {}
  };
}
