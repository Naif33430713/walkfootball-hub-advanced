<template>
  <div class="container my-4" v-if="loaded && program">
    <h1>{{ program.name }}</h1>
    <p class="text-muted">
      {{ program.location }} • {{ program.schedule }} • {{ program.difficulty }}
    </p>

    <div class="mb-3">
      <StarRating :model-value="Math.round(summary.avg)" readonly />
      <span class="ms-2">{{ summary.count }} ratings</span>
    </div>

    <p>{{ program.description }}</p>

    <div v-if="user" class="card my-3">
      <div class="card-body">
        <h5>Your rating</h5>

        <StarRating v-model="stars" />
        <small class="text-muted">{{ stars ? `${stars} / 5` : 'pick stars' }}</small>

        <textarea v-model="comment" class="form-control my-2" rows="3" placeholder="Optional comment"></textarea>

        <button class="btn btn-primary me-2" @click="save" :disabled="!stars || saving">
          <span v-if="saving">Saving…</span>
          <span v-else>Save</span>
        </button>
        <p v-if="saveMessage" class="d-inline-block mb-0" :class="saving ? 'text-muted' : 'text-success'">
          {{ saveMessage }}
        </p>
      </div>
    </div>
    <div v-else class="alert alert-info">
      Please sign in to rate.
    </div>


    <h5>Ratings</h5>
    <div v-if="ratings.length === 0">No ratings yet</div>
    <ul v-else class="list-group">
      <li v-for="r in ratings" :key="r.id" class="list-group-item">
        <span>{{ r.stars }}★ — {{ r.email }}</span>
        <div v-if="r.comment">{{ r.comment }}</div>
      </li>
    </ul>
  </div>

  <div v-else-if="loaded && !program" class="container my-4">
    <div class="alert alert-warning">Program not found</div>
  </div>

  <div v-else class="container my-4">
    <div class="text-muted">Loading…</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import StarRating from "@/components/StarRating.vue";

import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";


import {
  listPrograms,
  listRatingsForProgram,
  getUserRating,
  upsertUserRating,
} from "@/services/db";
import { announce, focusMain } from "@/utils/a11y";


const route = useRoute();
const programId = String(route.params.id || "");

// state
const loaded = ref(false);
const program = ref(null);
const ratings = ref([]);

const user = ref(null);
const stars = ref(0);
const comment = ref("");
const saving = ref(false);
const saveMessage = ref("")

// load auth
onMounted(() => {
  onAuthStateChanged(auth, async (u) => {
    user.value = u || null;
    await loadMine();
  });
});

// load program & ratings
onMounted(async () => {
  const all = await listPrograms();
  program.value = all.find(p => String(p.id) === programId) || null;

  await loadAllRatings();
  await loadMine();

  loaded.value = true;
   focusMain();
   announce("Program details loaded successfully.");
});

async function loadAllRatings() {
  ratings.value = await listRatingsForProgram(programId);
}

async function loadMine() {
  if (!user.value) {
    stars.value = 0;
    comment.value = "";
    return;
  }
  const mine = await getUserRating(programId, user.value.email);
  stars.value = mine?.stars || 0;
  comment.value = mine?.comment || "";
}


const summary = computed(() => {
  const count = ratings.value.length;
  const sum = ratings.value.reduce((a, r) => a + Number(r.stars || 0), 0);
  return { avg: count ? sum / count : 0, count };
});

async function save() {
  if (!user.value || !stars.value) return;
  saving.value = true;
  saveMessage.value = "";
  try {
    await upsertUserRating(programId, {
      email: user.value.email,
      stars: stars.value,
      comment: comment.value,
    });
    await loadAllRatings();
    announce("Your rating was saved successfully.");
    saveMessage.value = "Your rating has been saved!";
     setTimeout(() => (saveMessage.value = ""), 4000); // hide after 4s
  } catch (e) {
    console.error(e);
     saveMessage.value = " Failed to save rating. Try again.";
  } finally {
    saving.value = false;
  }
}
</script>
