<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const menuOpen = ref(false)

const navItems = [
  { label: '创作', path: '/creation' },
  { label: '润色', path: '/polishing' },
  { label: '历史', path: '/history' },
]

function toggleMenu(): void {
  menuOpen.value = !menuOpen.value
}

function closeMenu(): void {
  menuOpen.value = false
}
</script>

<template>
  <header class="app-header" :class="{ 'nav-open': menuOpen }">
    <div class="header-content">
      <h1 class="logo" @click="router.push('/')">CraftFlow</h1>
      <button
        class="menu-toggle"
        aria-label="菜单"
        :aria-expanded="menuOpen"
        @click="toggleMenu"
      >
        <span class="menu-icon" />
      </button>
      <nav class="nav" @click="closeMenu">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-link"
        >
          {{ item.label }}
        </router-link>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  cursor: pointer;
  margin: 0;
}

.nav {
  display: flex;
  gap: 24px;
}

.nav-link {
  text-decoration: none;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
  padding: 4px 0;
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}

.nav-link:hover {
  color: #111827;
}

.nav-link.router-link-active {
  color: #2563eb;
  border-bottom-color: #2563eb;
}

.menu-toggle {
  display: none;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  padding: 0;
}

.menu-icon,
.menu-icon::before,
.menu-icon::after {
  display: block;
  width: 18px;
  height: 2px;
  background: #374151;
  border-radius: 1px;
  transition: all 0.2s;
}

.menu-icon {
  position: relative;
}

.menu-icon::before,
.menu-icon::after {
  content: '';
  position: absolute;
  left: 0;
}

.menu-icon::before {
  top: -6px;
}

.menu-icon::after {
  top: 6px;
}

.nav-open .menu-icon {
  background: transparent;
}

.nav-open .menu-icon::before {
  top: 0;
  transform: rotate(45deg);
}

.nav-open .menu-icon::after {
  top: 0;
  transform: rotate(-45deg);
}

@media (max-width: 640px) {
  .header-content {
    padding: 0 16px;
    flex-wrap: wrap;
  }

  .menu-toggle {
    display: flex;
  }

  .nav {
    display: none;
    width: 100%;
    flex-direction: column;
    gap: 0;
    padding: 8px 0 12px;
    border-top: 1px solid #e5e7eb;
  }

  .nav-open .nav {
    display: flex;
  }

  .nav-link {
    padding: 10px 0;
    border-bottom: none;
  }
}
</style>
