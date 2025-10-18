
<template>
  <div class="container my-5">
    <h2>User Dashboard</h2>

    <p class="mb-1">
      Signed in as: <strong>{{ email || "unknown" }}</strong>
    </p>
    <hr />

    <div class="row g-2 mb-4">
      <div class="col-12 col-sm-6 col-lg-4">
        <router-link to="/programs" class="btn btn-primary w-100">Browse Programs</router-link>
      </div>
    </div>

    <div v-if="!email" class="alert alert-info">
      Sign in to see your ratings.
    </div>

    <div v-else class="text-muted">
      No ratings to show yet.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { auth } from '../firebase'
const email = computed(() => auth.currentUser?.email || '')
</script>
