// src/firebase-functions.js
import { getFunctions } from "firebase/functions";
import { app } from "./firebase";

export const functions = getFunctions(app, "us-central1");
