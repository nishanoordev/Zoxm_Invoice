/**
 * authService.js — Firebase Auth + Realtime Database
 *
 * Handles:
 *  - Owner sign-up  → creates business node + generates invite code
 *  - Staff join     → validates invite code, links user to business
 *  - Login          → email/password
 *  - Logout
 *  - Password reset
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';

import { GoogleSignin } from '@react-native-google-signin/google-signin';

import {
  ref,
  set,
  get,
  update,
  onValue,
  off,
  push,
  query,
  orderByChild,
  equalTo
} from 'firebase/database';

import { auth, db } from '../config/firebase';

// ─────────────────────────────────────────────────────────────
// Native Google SDK Configuration
// ─────────────────────────────────────────────────────────────

GoogleSignin.configure({
  webClientId: '993971900127-up5903rc38rgnqj0hfds8ut1q6nhr2lp.apps.googleusercontent.com',
  offlineAccess: true,
});

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Generate a short human-readable 6-char invite code */
function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ─────────────────────────────────────────────────────────────
// Auth State Observer
// ─────────────────────────────────────────────────────────────

/**
 * Subscribe to auth state changes.
 * @param {Function} callback  - called with (firebaseUser | null)
 * @returns {Function} unsubscribe
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ─────────────────────────────────────────────────────────────
// Owner Sign-Up — creates a new business in the DB
// ─────────────────────────────────────────────────────────────

/**
 * Register a new Owner and bootstrap a business in Realtime DB.
 * @param {object} opts
 * @returns {{ user, businessId, inviteCode }}
 */
export async function ownerSignUp({ name, email, password, businessName, phone = '' }) {
  // 1. Create Firebase Auth user
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;

  // 2. Set display name
  await updateFirebaseProfile(user, { displayName: name });

  // 3. Create a business node
  const businessId  = push(ref(db, 'businesses')).key;
  const inviteCode  = generateInviteCode();

  const businessData = {
    id:           businessId,
    name:         businessName || `${name}'s Business`,
    ownerId:      user.uid,
    createdAt:    Date.now(),
    inviteCode,
    plan:         'free',
    currency:     'INR',
    currencySymbol: '₹',
  };

  // 4. Persist business + user profile atomically
  const updates = {};
  updates[`businesses/${businessId}/profile`]            = businessData;
  updates[`inviteCodes/${inviteCode}`]                   = { businessId, createdAt: Date.now() };
  updates[`users/${user.uid}`]                           = {
    uid:        user.uid,
    name,
    email,
    phone,
    role:       'admin',
    businessId,
    createdAt:  Date.now(),
  };

  await update(ref(db), updates);

  return { user, businessId, inviteCode };
}

// ─────────────────────────────────────────────────────────────
// Staff Join — validates invite code and joins existing business
// ─────────────────────────────────────────────────────────────

/**
 * Register a staff member using an invite code.
 * @param {object} opts
 * @returns {{ user, businessId }}
 */
export async function staffJoin({ name, email, password, inviteCode, phone = '' }) {
  // 1. Validate invite code
  const codeSnap = await get(ref(db, `inviteCodes/${inviteCode.toUpperCase()}`));
  if (!codeSnap.exists()) {
    throw new Error('Invalid invite code. Please check with your business owner.');
  }
  const { businessId } = codeSnap.val();

  // 2. Create Firebase Auth user
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;

  await updateFirebaseProfile(user, { displayName: name });

  // 3. Persist staff profile
  await set(ref(db, `users/${user.uid}`), {
    uid:        user.uid,
    name,
    email,
    phone,
    role:       'staff',
    businessId,
    createdAt:  Date.now(),
  });

  return { user, businessId };
}

// ─────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────

/**
 * Sign in an existing user.
 * @returns {{ user, userProfile: { role, businessId, name } }}
 */
export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const user = cred.user;

  // Fetch role + businessId from DB
  const profileSnap = await get(ref(db, `users/${user.uid}`));
  if (!profileSnap.exists()) {
    throw new Error('User profile not found. Please contact your administrator.');
  }

  const userProfile = profileSnap.val();
  return { user, userProfile };
}

// ─────────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────────

export async function logoutUser() {
  await signOut(auth);
}

// ─────────────────────────────────────────────────────────────
// Password Reset
// ─────────────────────────────────────────────────────────────

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ─────────────────────────────────────────────────────────────
// Fetch current user's profile from Realtime DB
// ─────────────────────────────────────────────────────────────

export async function fetchUserProfile(uid) {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? snap.val() : null;
}

// ─────────────────────────────────────────────────────────────
// Fetch business profile
// ─────────────────────────────────────────────────────────────

export async function fetchBusinessProfile(businessId) {
  const snap = await get(ref(db, `businesses/${businessId}/profile`));
  return snap.exists() ? snap.val() : null;
}

// ─────────────────────────────────────────────────────────────
// Fetch all staff members for a business (admin only)
// ─────────────────────────────────────────────────────────────

export async function fetchBusinessStaff(businessId) {
  try {
    const usersRef = ref(db, 'users');
    const staffQuery = query(usersRef, orderByChild('businessId'), equalTo(businessId));
    const snap = await get(staffQuery);
    if (!snap.exists()) return [];
    
    // Convert object of users to an array
    const all = snap.val();
    return Object.values(all);
  } catch (error) {
    console.warn('Could not fetch business staff:', error.message);
    return []; // Fail gracefully so it doesn't crash the login flow
  }
}

// ─────────────────────────────────────────────────────────────
// Refresh Invite Code (admin only)
// ─────────────────────────────────────────────────────────────

export async function refreshInviteCode(businessId, oldCode) {
  const newCode = generateInviteCode();
  const updates = {};
  if (oldCode) {
    updates[`inviteCodes/${oldCode}`] = null; // delete old
  }
  updates[`inviteCodes/${newCode}`]           = { businessId, createdAt: Date.now() };
  updates[`businesses/${businessId}/profile/inviteCode`] = newCode;
  await update(ref(db), updates);
  return newCode;
}

// ─────────────────────────────────────────────────────────────
// Update Member Role (admin only)
// ─────────────────────────────────────────────────────────────

export async function updateMemberRole(uid, newRole) {
  await update(ref(db, `users/${uid}`), { role: newRole });
}

// ─────────────────────────────────────────────────────────────
// Remove Member (admin only)
// ─────────────────────────────────────────────────────────────

export async function removeMemberFromBusiness(uid) {
  // We unlink them by clearing their businessId and role
  // In a real app, you might also want to disable their Firebase Auth account
  // but that requires Admin SDK. Here we just strip permissions.
  await update(ref(db, `users/${uid}`), {
    businessId: null,
    role:       null,
  });
}

// ─────────────────────────────────────────────────────────────
// Google Sign-In (via expo-auth-session + Firebase)
// ─────────────────────────────────────────────────────────────

/**
 * Sign in with Google using expo-auth-session.
 * Requires the `idToken` obtained from Google OAuth flow.
 * @param {string} idToken  - Google ID token from GoogleAuthProvider
 * @returns {{ user, userProfile }}
 */
export async function googleSignInWithFirebase(idToken, accessToken) {
  if (!idToken && !accessToken) {
    throw new Error('Google Sign-In requires at least an id_token or access_token.');
  }

  // 1. Build Firebase credential — works with idToken, accessToken, or both
  const credential = GoogleAuthProvider.credential(idToken || null, accessToken || null);
  const cred = await signInWithCredential(auth, credential);
  const user = cred.user;

  // 2. Check if user profile exists in the Realtime DB
  const profileSnap = await get(ref(db, `users/${user.uid}`));

  if (profileSnap.exists()) {
    // Returning user — just return their existing profile
    return { user, userProfile: profileSnap.val() };
  }

  // 3. First-time Google sign-in — bootstrap business like owner sign-up
  const businessId = push(ref(db, 'businesses')).key;
  const inviteCode = generateInviteCode();

  const businessData = {
    id:             businessId,
    name:           `${user.displayName || 'My'}'s Business`,
    ownerId:        user.uid,
    createdAt:      Date.now(),
    inviteCode,
    plan:           'free',
    currency:       'INR',
    currencySymbol: '₹',
  };

  const userProfile = {
    uid:        user.uid,
    name:       user.displayName || user.email?.split('@')[0] || 'User',
    email:      user.email || '',
    phone:      user.phoneNumber || '',
    role:       'admin',
    businessId,
    createdAt:  Date.now(),
  };

  const updates = {};
  updates[`businesses/${businessId}/profile`] = businessData;
  updates[`inviteCodes/${inviteCode}`]         = { businessId, createdAt: Date.now() };
  updates[`users/${user.uid}`]                 = userProfile;
  await update(ref(db), updates);

  return { user, userProfile };
}
