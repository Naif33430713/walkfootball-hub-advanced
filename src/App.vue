<template>
  <div id="app">
    <a class="skip-link" href="#main">Skip to main content</a>
    <BHeader />
    <main id="main" tabindex="-1">
      <router-view />
    </main>
    <footer class="footer bg-dark text-light mt-auto" role="contentinfo">
      <div class="container py-3 small">
        <p class="mb-0">&copy; 2025 Walking Football Hub</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import BHeader from './components/BHeader.vue'
</script>

<style>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
main {
  flex: 1;
}
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #fff;
  color: #000;
  padding: 8px 12px;
  border: 2px solid #000;
  z-index: 1000;
}
.skip-link:focus {
  top: 8px;
}
:focus-visible {
  outline: 3px solid #0d6efd;
  outline-offset: 2px;
}
</style>
