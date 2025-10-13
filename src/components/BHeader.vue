<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-light"
    role="navigation"
    aria-label="Main navigation">

    <div class="container">
      <router-link class="navbar-brand" to="/">
        <strong>Walking Football Hub</strong>
      </router-link>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div id="navbarNav" class="collapse navbar-collapse">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item">
            <router-link class="nav-link" to="/" exact-active-class="active">Home</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/programs">Programs</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/register">Register</router-link>
          </li>

          <li class="nav-item">
           <router-link class="nav-link" to="/api-demo">API</router-link>

          </li>
          <li v-if="isAdmin" class="nav-item">
            <router-link class="nav-link" to="/admin">Admin</router-link>
          </li>
          <li v-if="isAdmin" class="nav-item">
            <router-link class="nav-link" to="/admin/analytics">Analytics</router-link>
          </li>
          <li v-if="isAdmin" class="nav-item">
            <router-link class="nav-link" to="/admin/email">Email Center</router-link>
          </li>

          <li v-if="!currentUser" class="nav-item">
            <router-link class="nav-link" to="/signin">Login</router-link>
          </li>
          <li v-else class="nav-item">
            <button class="btn btn-link nav-link" @click="logout">
              Logout ({{ currentUser.email }})
            </button>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const currentUser = ref(null)
const role = ref('user')

let auth
onMounted(async () => {
  try {
    const { auth: _auth } = await import('../firebase.js')
    auth = _auth
    const { onAuthStateChanged } = await import('firebase/auth')
    const { roleFromEmail } = await import('../utils/roles.js')
    onAuthStateChanged(auth, (u) => {
      currentUser.value = u
      role.value = roleFromEmail(u?.email) || 'user'
    })
  } catch (e) {
    console.error('[BHeader] init failed:', e)
  }
})

const isAdmin = computed(() => role.value === 'admin')

async function logout () {
  if (!auth) return
  const { signOut } = await import('firebase/auth')
  await signOut(auth)
}
</script>

<style scoped>
.nav-link.active {
  font-weight: 600;
  color: var(--primary-green, #0d6efd) !important;
}
</style>
