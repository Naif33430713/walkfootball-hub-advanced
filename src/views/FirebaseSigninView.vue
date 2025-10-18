
<template>
  <div class="container my-5" style="max-width: 420px">
    <h2 id="signin-title" class="mb-4 text-center">Sign in to Walking Football</h2>

    <form
      @submit.prevent="handleLogin"
      novalidate
      aria-labelledby="signin-title"
    >

      <div class="mb-3">
        <label for="email" class="form-label">Email *</label>
        <input
          id="email"
          v-model.trim="email"
          type="email"
          class="form-control"
          placeholder="you@example.com"
          autocomplete="username"
          required
          aria-required="true"
        />
      </div>


      <div class="mb-3">
        <label for="password" class="form-label">Password *</label>
        <input
          id="password"
          v-model="password"
          type="password"
          class="form-control"
          placeholder="Enter password"
          autocomplete="current-password"
          required
          aria-required="true"
        />
        <div id="pwd-help" class="form-text">Minimum 8 characters.</div>
      </div>
      <div
        v-if="errorMsg"
        class="alert alert-danger"
        role="alert"
        aria-live="assertive"
      >
        {{ errorMsg }}
      </div>


      <button
        type="submit"
        class="btn btn-primary w-100"
        :disabled="loading"
        :aria-busy="loading"
      >
        <span v-if="loading">Signing in…</span>
        <span v-else>Login</span>
      </button>

      <button
        type="button"
        class="btn btn-outline-secondary w-100 mt-2"
        @click="handleGoogle"
        :disabled="loading"
        aria-label="Sign in using Google account"
      >
        Continue with Google
      </button>

      <button
        type="button"
        class="btn btn-link mt-2 p-0"
        @click="resetPwd"
        :disabled="loading"
        aria-label="Forgot password? Send reset email"
      >
        Forgot password?
      </button>
    </form>

    <div
      v-if="currentUser"
      class="alert alert-success mt-3"
      role="status"
      aria-live="polite"
    >
      Logged in as: {{ currentUser.email }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMsg = ref("");
const currentUser = ref(null);

const route = useRoute();
const router = useRouter();

function nextPath() {
  const r = route.query.redirect?.toString();
  return r && r.startsWith("/") ? r : "/";
}

onMounted(() => {
  onAuthStateChanged(auth, (u) => {
    currentUser.value = u;
    if (u && router.currentRoute.value.path === "/signin") {
      router.replace(nextPath()).catch(() => {});
    }
  });
});

async function handleLogin() {
  if (!email.value || !password.value) return;
  loading.value = true;
  errorMsg.value = "";
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    await router.replace(nextPath());
  } catch (e) {
    const code = e?.code || "";
    if (code === "auth/user-not-found")
      errorMsg.value = "No account found with this email.";
    else if (
      code === "auth/wrong-password" ||
      code === "auth/invalid-credential"
    )
      errorMsg.value = "Incorrect email or password.";
    else if (code === "auth/invalid-email")
      errorMsg.value = "Please enter a valid email.";
    else errorMsg.value = "Login failed. Try again.";
  } finally {
    loading.value = false;
  }
}

async function handleGoogle() {
  loading.value = true;
  errorMsg.value = "";
  try {
    await signInWithPopup(auth, googleProvider);
    await router.replace(nextPath());
  } catch {
    errorMsg.value = "Google sign-in was cancelled or failed.";
  } finally {
    loading.value = false;
  }
}

async function resetPwd() {
  errorMsg.value = "";
  const addr = (email.value || "").trim();
  if (!addr) {
    errorMsg.value = "Enter your email above first.";
    return;
  }
  try {
    await sendPasswordResetEmail(auth, addr);
    errorMsg.value = "Password reset email sent.";
  } catch {
    errorMsg.value = "Failed to send reset email.";
  }
}
</script>

<style scoped>
.visually-hidden {
  position: absolute !important;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
</style>
