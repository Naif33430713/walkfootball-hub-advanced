<!-- src/views/RegisterView.vue -->
<template>
  <div class="register">
    <section class="py-5 bg-light">
      <div class="container text-center">
        <h1>Join Walking Football</h1>
        <p class="lead">Create your account</p>
      </div>
    </section>

    <section class="py-5">
      <div class="container" style="max-width: 560px">
        <div class="card">
          <div class="card-header text-center">
            <h3 class="mb-0">Register</h3>
          </div>

          <div class="card-body">
            <form @submit.prevent="handleRegister" novalidate>
              <!-- Username -->
              <div class="mb-3">
                <label for="username" class="form-label">Username *</label>
                <input
                  id="username"
                  v-model.trim="form.username"
                  type="text"
                  class="form-control"
                  :class="{ 'is-invalid': !!errors.username }"
                  placeholder="Pick a username"
                  autocomplete="username"
                  required
                />
                <div v-if="errors.username" class="invalid-feedback">{{ errors.username }}</div>
              </div>

              <!-- Email -->
              <div class="mb-3">
                <label for="email" class="form-label">Email *</label>
                <input
                  id="email"
                  v-model.trim="form.email"
                  type="email"
                  class="form-control"
                  :class="{ 'is-invalid': !!errors.email }"
                  placeholder="u@example.com"
                  autocomplete="email"
                  required
                />
                <div v-if="errors.email" class="invalid-feedback">{{ errors.email }}</div>
              </div>

              <!-- Password -->
              <div class="mb-3">
                <label for="password" class="form-label">Password *</label>
                <input
                  id="password"
                  v-model.trim="form.password"
                  type="password"
                  class="form-control"
                  :class="{ 'is-invalid': !!errors.password }"
                  placeholder="At least 8 characters"
                  autocomplete="new-password"
                  required
                />
                <div v-if="errors.password" class="invalid-feedback">{{ errors.password }}</div>
              </div>

              <!-- Age -->
              <div class="mb-3">
                <label for="age" class="form-label">Age *</label>
                <input
                  id="age"
                  v-model.number="form.age"
                  type="number"
                  min="0"
                  class="form-control"
                  :class="{ 'is-invalid': !!errors.age }"
                  placeholder="16+"
                  inputmode="numeric"
                  required
                />
                <div v-if="errors.age" class="invalid-feedback">{{ errors.age }}</div>
              </div>

              <!-- Phone -->
              <div class="mb-3">
                <label for="phone" class="form-label">Phone *</label>
                <input
                  id="phone"
                  v-model.trim="form.phone"
                  type="tel"
                  class="form-control"
                  :class="{ 'is-invalid': !!errors.phone }"
                  placeholder="Your phone number"
                  autocomplete="tel"
                  required
                />
                <div v-if="errors.phone" class="invalid-feedback">{{ errors.phone }}</div>
              </div>

              <!-- Terms -->
              <div class="form-check mb-3">
                <input
                  id="terms"
                  v-model="form.terms"
                  type="checkbox"
                  class="form-check-input"
                  :class="{ 'is-invalid': !!errors.terms }"
                  required
                />
                <label for="terms" class="form-check-label">
                  I agree to the terms & privacy policy *
                </label>
                <div v-if="errors.terms" class="invalid-feedback">{{ errors.terms }}</div>
              </div>

              <div class="d-grid">
                <button class="btn btn-primary" :disabled="loading">
                  <span v-if="loading">Registering…</span>
                  <span v-else>Register</span>
                </button>
              </div>
            </form>

            <!-- Simple feedback -->
            <div v-if="success" class="alert alert-success mt-3" role="status">
              Account created for <strong>{{ createdEmail }}</strong>.
            </div>
            <div v-if="fatal" class="alert alert-danger mt-3" role="alert">
              {{ fatal }}
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth } from '../firebase'

const form = ref({
  username: '',
  email: '',
  password: '',
  age: null,
  phone: '',
  terms: false,
})

const errors = ref({
  username: null,
  email: null,
  password: null,
  age: null,
  phone: null,
  terms: null,
})

const loading = ref(false)
const success = ref(false)
const fatal = ref('')
const createdEmail = ref('')

function validate() {
  // reset
  fatal.value = ''
  for (const k of Object.keys(errors.value)) errors.value[k] = null

  const username = (form.value.username || '').trim()
  const email = (form.value.email || '').trim().toLowerCase()
  const password = (form.value.password || '').trim()
  const age = Number(form.value.age)
  const phone = (form.value.phone || '').trim()

  if (!username || username.length < 3) errors.value.username = 'Username must be at least 3 characters.'
  if (!email) errors.value.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.value.email = 'Enter a valid email.'
  if (!password) errors.value.password = 'Password is required.'
  else if (password.length < 8) errors.value.password = 'Use at least 8 characters.'
  if (!Number.isFinite(age) || age < 16) errors.value.age = 'You must be 16 or older.'
  if (!phone) errors.value.phone = 'Phone is required.'
  if (!form.value.terms) errors.value.terms = 'You must agree to the terms.'

  // return true if any error exists (so caller can early return)
  return Object.values(errors.value).some(Boolean)
}

async function handleRegister() {
  if (validate()) return
  loading.value = true
  success.value = false
  fatal.value = ''

  try {
    const email = form.value.email.trim().toLowerCase()
    const password = form.value.password.trim()

    const cred = await createUserWithEmailAndPassword(auth, email, password)
    // set displayName to username (nice to have)
    const name = form.value.username.trim()
    if (name) {
      await updateProfile(cred.user, { displayName: name }).catch(() => {})
    }

    createdEmail.value = cred.user.email || email
    success.value = true
    form.value.password = ''
  } catch (e) {
    if (e?.code === 'auth/email-already-in-use') {
      errors.value.email = 'This email already has an account.'
    } else if (e?.code === 'auth/invalid-email') {
      errors.value.email = 'Please enter a valid email.'
    } else if (e?.code === 'auth/weak-password') {
      errors.value.password = 'Password too weak (min 8 chars).'
    } else {
      fatal.value = 'Something went wrong. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.card { box-shadow: 0 2px 8px rgba(0,0,0,.1); }
</style>
