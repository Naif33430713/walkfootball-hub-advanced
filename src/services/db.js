// src/services/db.js
// Firestore helpers
// - Programs live list / one-time fetch
// - Program CRUD
// - Ratings subcollection with simple aggregate (avg + count)

import {
  collection,
  collectionGroup,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase";

// --- Collection refs
const colPrograms = collection(db, "programs");

// --- Utils
function emailId(email) {
  return String(email || "").trim().toLowerCase();
}


function normalizeProgram(p = {}) {
  return {
    name: p.name || "",
    location: p.location || "",
    address: p.address || "",
    schedule: p.schedule || "",
    difficulty: p.difficulty || "Beginner",
    instructor: p.instructor || "",
    instructorBio: p.instructorBio || "",
    description: p.description || "",

    maxParticipants: Number(p.maxParticipants ?? 0),
    currentParticipants: Number(p.currentParticipants ?? 0),
    available: p.available !== false, // default true
    cost: p.cost !== undefined && p.cost !== null ? Number(p.cost) : null,
    equipment: p.equipment || "",
    accessibility: p.accessibility || "",
    ageRange: p.ageRange || "",
    healthRequirements: p.healthRequirements || "",


    lat: typeof p.lat === "number" ? p.lat : null,
    lng: typeof p.lng === "number" ? p.lng : null,


    ratingAvg: Number(p.ratingAvg ?? 0),
    ratingCount: Number(p.ratingCount ?? 0),

    // Timestamps (created on server)
    createdAt: p.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}



/**
 * Live subscription to programs
 * @param {(programs: Array) => void} onData
 * @param {(errMsg: string) => void} [onError]
 * @returns {() => void}
 */


/**
 * One-time fetch of programs
 * @returns {Promise<Array>}
 */
export async function listPrograms() {
  const q = query(colPrograms, orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}



/**
 * Create a program
 * @param {Object} data
 * @returns {Promise<string>}
 */
export async function addProgram(data) {
  const payload = normalizeProgram(data);
  const ref = await addDoc(colPrograms, payload);
  return ref.id;
}

/**
 * Get a single program
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getProgram(id) {
  const ref = doc(db, "programs", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Live subscription to a single program
 * @param {string} id
 * @param {(p: Object|null)=>void} onData
 * @param {(errMsg: string)=>void} [onError]
 * @returns {() => void}
 */


/**
 *
 * @param {string} id
 * @param {Object} patch
 */
export async function updateProgram(id, patch) {
  const ref = doc(db, "programs", id);
  const safe = { ...patch, updatedAt: serverTimestamp() };
  await updateDoc(ref, safe);
}

/**
 * Delete a program
 * @param {string} id
 */
export async function deleteProgram(id) {
  const ref = doc(db, "programs", id);
  await deleteDoc(ref);
}

// --- Ratings subcollection

function ratingsCol(programId) {
  return collection(db, "programs", programId, "ratings");
}

/**
 * List ratings for a program
 * @param {string} programId
 * @returns {Promise<Array<{email:string,stars:number,comment?:string}>>}
 */
export async function listRatings(programId) {
  const col = ratingsCol(programId);
  const snap = await getDocs(col);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 *
 * @param {string} programId
 * @param {{email:string, stars:number, comment?:string}} rating
 */
export async function upsertRating(programId, rating) {
  const email = String(rating.email || "").trim().toLowerCase();
  if (!email) throw new Error("Missing email for rating.");
  const starsNum = Number(rating.stars || 0);
  if (starsNum < 1 || starsNum > 5) throw new Error("Stars must be 1–5.");

  const rRef = doc(db, "programs", programId, "ratings", email);
  await setDoc(
    rRef,
    {
      email,
      stars: starsNum,
      comment: rating.comment || "",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Recompute aggregates (simple)
  await recomputeProgramRatings(programId);
}

/**
 * Delete one user's rating , recompute aggregates
 * @param {string} programId
 * @param {string} email
 */
export async function deleteRating(programId, email) {
  const id = String(email || "").trim().toLowerCase();
  if (!id) return;
  const rRef = doc(db, "programs", programId, "ratings", id);
  await deleteDoc(rRef);
  await recomputeProgramRatings(programId);
}

/**
 * Recompute ratingAvg + ratingCount for a program
 * @param {string} programId
 */
async function recomputeProgramRatings(programId) {
  const all = await listRatings(programId);
  const count = all.length;
  const sum = all.reduce((a, r) => a + Number(r.stars || 0), 0);
  const avg = count ? sum / count : 0;
  await updateProgram(programId, { ratingAvg: avg, ratingCount: count });
}

/**
 * List all ratings across all programs (flat shape)
 */
export async function listAllRatingsFlat() {
  const snap = await getDocs(collectionGroup(db, "ratings"));
  return snap.docs.map((d) => {

    const segments = d.ref.path.split("/");
    const programId = segments[1];
    return { id: d.id, programId, ...d.data() };
  });
}


export async function listRatingsForProgram(programId) {
  return listRatings(programId);
}


export async function getUserRating(programId, email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;
  const rRef = doc(db, "programs", programId, "ratings", e);
  const snap = await getDoc(rRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}


export async function upsertUserRating(programId, rating) {
  return upsertRating(programId, rating);
}


export async function bookProgram(programId, { email, displayName }) {
  const e = emailId(email);
  if (!e) throw new Error("Missing email");

  const pRef = doc(db, "programs", programId);
  const bRef = doc(db, "programs", programId, "bookings", e);

  await runTransaction(db, async (tx) => {
    const pSnap = await tx.get(pRef);
    if (!pSnap.exists()) throw new Error("Program not found");

    const p = pSnap.data();
    if (p.available === false) throw new Error("Program not available");

    const max = Number(p.maxParticipants || 0);
    const cur = Number(p.currentParticipants || 0);
    const isFull = max > 0 && cur >= max;
    if (isFull) throw new Error("Program is fully booked");

    const mySnap = await tx.get(bRef);
    if (mySnap.exists()) throw new Error("You already booked this program");


    tx.set(bRef, {
      email: e,
      displayName: displayName || "",
      createdAt: Timestamp.now(),
    });


    const next = max > 0 ? cur + 1 : cur;
    tx.update(pRef, { currentParticipants: next, updatedAt: Timestamp.now() });
  });
}


export async function cancelBooking(programId, email) {
  const e = emailId(email);
  const pRef = doc(db, "programs", programId);
  const bRef = doc(db, "programs", programId, "bookings", e);

  await runTransaction(db, async (tx) => {
    const pSnap = await tx.get(pRef);
    if (!pSnap.exists()) return;

    const bSnap = await tx.get(bRef);
    if (!bSnap.exists()) return;

    tx.delete(bRef);

    const p = pSnap.data();
    const max = Number(p.maxParticipants || 0);
    const cur = Number(p.currentParticipants || 0);
    const next = max > 0 ? Math.max(0, cur - 1) : cur;
    tx.update(pRef, { currentParticipants: next, updatedAt: Timestamp.now() });
  });
}


export async function listBookings(programId) {
  const snap = await getDocs(collection(db, "programs", programId, "bookings"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
