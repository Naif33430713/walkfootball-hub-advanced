<!-- src/views/AdminView.vue -->
<template>
  <div class="container my-5">
    <div class="d-flex justify-content-end mb-3">
      <router-link class="btn btn-success" to="/admin/programs/new">+ Add Program</router-link>
    </div>

    <h2 class="mb-1">Admin</h2>
    <p class="mb-1">
      Signed in as:
      <strong>{{ authReady ? (email || "unknown") : "initializing…" }}</strong>
    </p>
    <hr />

    <!-- ========== KPI DASHBOARD ========== -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3" v-for="card in kpiCards" :key="card.label">
        <div class="card h-100 text-center">
          <div class="card-body">
            <div class="text-muted small">{{ card.label }}</div>
            <div class="fs-4 fw-bold">{{ card.value }}</div>
            <div class="text-muted small">{{ card.sub }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== PROGRAMS TABLE ========== -->
    <div class="card mb-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <strong>All Programs</strong>
        <div class="d-flex gap-2">
          <button
            class="btn btn-outline-primary btn-sm"
            @click="exportProgramsCsv"
            :disabled="programRowsForTable.length === 0"
          >
            Export CSV
          </button>
          <button
            class="btn btn-outline-secondary btn-sm"
            @click="exportProgramsPdf"
            :disabled="programRowsForTable.length === 0"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div class="card-body">
        <DataTable
          :value="programRowsForTable"
          paginator
          :rows="10"
          :rowsPerPageOptions="[10,20,50]"
          responsiveLayout="scroll"
          :filters="programFilters"
          :globalFilterFields="['name','location','schedule','difficulty']"
        >
          <template #header>
            <input
              class="form-control"
              style="max-width:360px"
              v-model="programFilters.global.value"
              placeholder="Search programs..."
              aria-label="Search programs"
            />
          </template>

          <Column field="name" header="Program" sortable filter />
          <Column field="location" header="Location" sortable filter>
            <template #filter="{ filterModel, filterCallback }">
              <select
                class="form-select"
                v-model="filterModel.value"
                @change="filterCallback()"
                aria-label="Filter by location"
              >
                <option value="">All locations</option>
                <option v-for="loc in uniqueLocations" :key="loc" :value="loc">{{ loc }}</option>
              </select>
            </template>
          </Column>
          <Column field="schedule" header="Schedule" sortable filter />
          <Column field="difficulty" header="Difficulty" sortable filter>
            <template #filter="{ filterModel, filterCallback }">
              <select
                class="form-select"
                v-model="filterModel.value"
                @change="filterCallback()"
                aria-label="Filter by difficulty"
              >
                <option value="">All</option>
                <option v-for="d in difficultyOptions" :key="d" :value="d">{{ d }}</option>
              </select>
            </template>
          </Column>
          <Column field="spotsLeft" header="Spots Left" sortable />
          <Column field="avg" header="Avg ★" sortable />
          <Column field="ratings" header="#Ratings" sortable />

          <!-- NEW: Actions column -->
          <Column header="Actions" :exportable="false">
            <template #body="{ data }">
              <div class="d-flex gap-2">
                <router-link
                  class="btn btn-sm btn-outline-primary"
                  :to="`/admin/programs/${data.id}/edit`"
                  aria-label="Edit program"
                  title="Edit"
                >
                  Edit
                </router-link>
                <button
                  class="btn btn-sm btn-outline-danger"
                  :disabled="deletingId === data.id"
                  @click="onDeleteRow(data)"
                  :aria-busy="deletingId === data.id"
                  aria-label="Delete program"
                  title="Delete"
                >
                  <span v-if="deletingId === data.id">Deleting…</span>
                  <span v-else>Delete</span>
                </button>
              </div>
            </template>
          </Column>

          <template #empty>No programs found.</template>
        </DataTable>
      </div>
    </div>

    <!-- ========== RATINGS TABLE ========== -->
    <div class="card mb-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <strong>All Ratings</strong>
        <div class="d-flex gap-2">
          <button
            class="btn btn-outline-primary btn-sm"
            @click="exportRatingsCsv"
            :disabled="ratingRowsForTable.length === 0"
          >
            Export CSV
          </button>
          <button
            class="btn btn-outline-secondary btn-sm"
            @click="exportRatingsPdf"
            :disabled="ratingRowsForTable.length === 0"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div class="card-body">
        <DataTable
          :value="ratingRowsForTable"
          paginator
          :rows="10"
          :rowsPerPageOptions="[10,20,50]"
          responsiveLayout="scroll"
          :filters="ratingFilters"
          :globalFilterFields="['programName','email','comment']"
        >
          <template #header>
            <input
              class="form-control"
              style="max-width:360px"
              v-model="ratingFilters.global.value"
              placeholder="Search ratings..."
              aria-label="Search ratings"
            />
          </template>

          <Column field="programName" header="Program" sortable filter />
          <Column field="email" header="User Email" sortable filter />
          <Column field="stars" header="Stars" sortable filter />
          <Column field="comment" header="Comment" sortable filter />

          <template #empty>No ratings found.</template>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { listPrograms, listAllRatingsFlat, deleteProgram } from "@/services/db";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ---------------- Auth ---------------- */
const user = ref(null);
const authReady = ref(false);
onMounted(() =>
  onAuthStateChanged(auth, (u) => {
    user.value = u;
    authReady.value = true;
  })
);
const email = computed(() => user.value?.email || "");

/* ---------------- Data ---------------- */
const programs = ref([]);
const ratingRows = ref([]);
const ratingSummary = reactive({});
const deletingId = ref("");

async function loadData() {
  programs.value = await listPrograms();
  const all = await listAllRatingsFlat();

  ratingRows.value = all.map((r) => ({
    programId: r.programId,
    programName:
      programs.value.find((p) => String(p.id) === String(r.programId))?.name ||
      r.programId,
    email: r.email,
    stars: Number(r.stars || 0),
    comment: r.comment || "",
  }));

  for (const p of programs.value) {
    const group = all.filter((r) => String(r.programId) === String(p.id));
    const count = group.length;
    const sum = group.reduce((a, r) => a + Number(r.stars || 0), 0);
    ratingSummary[p.id] = { avg: count ? sum / count : 0, count };
  }
}
onMounted(loadData);


async function onDeleteRow(row) {
  if (!row?.id) return;
  if (!confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
  deletingId.value = row.id;
  try {

    await deleteProgram(row.id);


    const BASE =
      import.meta.env.VITE_FUNCTIONS_BASE_URL
    await fetch(`${BASE}/archiveDeletedProgramHttp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        program: row,
        adminEmail: email.value,
      }),
    });

    console.log(`Program ${row.name} archived successfully`);
    await loadData();
  } catch (e) {
    console.error("Delete failed:", e);
    alert("Failed to delete. Try again.");
  } finally {
    deletingId.value = "";
  }
}

/* ---------------- KPI ---------------- */
const kpiCards = computed(() => {
  const totalPrograms = programs.value.length;
  const totalRatings = ratingRows.value.length;
  const avgRating =
    totalRatings > 0
      ? (ratingRows.value.reduce((a, r) => a + r.stars, 0) / totalRatings).toFixed(1)
      : 0;
  const totalLocations = new Set(programs.value.map((p) => p.location)).size;
  return [
    { label: "Programs", value: totalPrograms, sub: "Total created" },
    { label: "Ratings", value: totalRatings, sub: "Total submitted" },
    { label: "Average ★", value: avgRating, sub: "Overall average" },
    { label: "Locations", value: totalLocations, sub: "Unique locations" },
  ];
});

/* ---------------- Filters ---------------- */
const difficultyOptions = ["Beginner", "Intermediate", "Advanced"];
const uniqueLocations = computed(() => {
  const set = new Set(
    programs.value.map((p) => (p.location || "").trim()).filter(Boolean)
  );
  return Array.from(set).sort();
});

const programFilters = reactive({
  global: { value: "", matchMode: "contains" },
  name: { value: null, matchMode: "contains" },
  location: { value: null, matchMode: "equals" },
  schedule: { value: null, matchMode: "contains" },
  difficulty: { value: null, matchMode: "equals" },
});

const ratingFilters = reactive({
  global: { value: "", matchMode: "contains" },
  programName: { value: null, matchMode: "contains" },
  email: { value: null, matchMode: "contains" },
  comment: { value: null, matchMode: "contains" },
});

/* ---------------- CSV/PDF Export ---------------- */
function toCsv(columns, rows) {
  const esc = (v) => (v == null ? "" : `"${String(v).replace(/"/g, '""')}"`);
  const header = columns.map((c) => esc(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => esc(r[c.key])).join(","))
    .join("\n");
  return header + "\n" + body;
}
function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function exportProgramsCsv() {
  const cols = [
    { key: "name", label: "Program" },
    { key: "location", label: "Location" },
    { key: "schedule", label: "Schedule" },
    { key: "difficulty", label: "Difficulty" },
    { key: "spotsLeft", label: "Spots Left" },
    { key: "avg", label: "Avg ★" },
    { key: "ratings", label: "#Ratings" },
  ];
  const csv = toCsv(cols, programRowsForTable.value);
  downloadCsv("programs.csv", csv);
}
function exportRatingsCsv() {
  const cols = [
    { key: "programName", label: "Program" },
    { key: "email", label: "User Email" },
    { key: "stars", label: "Stars" },
    { key: "comment", label: "Comment" },
  ];
  const csv = toCsv(cols, ratingRowsForTable.value);
  downloadCsv("ratings.csv", csv);
}

function exportProgramsPdf() {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Programs", 14, 16);

  const head = [
    ["Program", "Location", "Schedule", "Difficulty", "Spots Left", "Avg ★", "#Ratings"],
  ];
  const body = programRowsForTable.value.map((r) => [
    r.name,
    r.location,
    r.schedule,
    r.difficulty,
    r.spotsLeft,
    r.avg,
    r.ratings,
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 22,
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [240, 240, 240] },
  });

  doc.save("programs.pdf");
}

function exportRatingsPdf() {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Ratings", 14, 16);

  const head = [["Program", "User Email", "Stars", "Comment"]];
  const body = ratingRowsForTable.value.map((r) => [
    r.programName,
    r.email,
    r.stars,
    r.comment || "",
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 22,
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [240, 240, 240] },
  });

  doc.save("ratings.pdf");
}

/* ----------------  table data ---------------- */
const programRowsForTable = computed(() =>
  programs.value.map((p) => {
    const s = ratingSummary[p.id] || { avg: 0, count: 0 };
    const max = Number(p.maxParticipants || 0);
    const cur = Number(p.currentParticipants || 0);
    return {
      id: p.id,
      name: p.name || "",
      location: p.location || "",
      schedule: p.schedule || "",
      difficulty: p.difficulty || "",
      spotsLeft: max > 0 ? Math.max(0, max - cur) : 0,
      avg: s.count ? Number(s.avg.toFixed(1)) : 0,
      ratings: s.count,
    };
  })
);

const ratingRowsForTable = computed(() =>
  ratingRows.value.map((r) => ({
    id: `${r.programId}-${r.email}`,
    programName: r.programName,
    email: r.email,
    stars: r.stars,
    comment: r.comment,
  }))
);
</script>

<style scoped>
.card-header { font-weight: 600; }
.fs-4 { font-size: 1.4rem; }
</style>
