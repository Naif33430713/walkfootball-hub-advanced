
import { createRouter, createWebHistory } from 'vue-router'
import { focusMain, announce } from '@/utils/a11y.js'
const HomePage           = () => import('../views/HomePage.vue')
const ProgramsView       = () => import('../views/ProgramsView.vue')
const ProgramDetail      = () => import('../views/ProgramDetail.vue')
const RegisterView       = () => import('../views/RegisterView.vue')
const FirebaseSigninView = () => import('../views/FirebaseSigninView.vue')
const UserDashboard      = () => import('../views/UserDashboard.vue')
const AdminView          = () => import('../views/AdminView.vue')
const ProgramCreate      = () => import('../views/ProgramCreate.vue')
const AdminAnalytics     = () => import('../views/AdminAnalytics.vue')
const AdminEmailCenter   = () => import('../views/AdminEmailCenter.vue')
const ApiDemoView        = () => import('../views/ApiDemoView.vue')
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Home', component: HomePage, meta: { title: 'Home · Walking Football Hub' } },
    { path: '/programs', name: 'Programs', component: ProgramsView, meta: { title: 'Programs · Walking Football Hub' } },
    { path: '/programs/:id', name: 'ProgramDetail', component: ProgramDetail, meta: { title: 'Program Details · Walking Football Hub' } },
    { path: '/register', name: 'Register', component: RegisterView, meta: { title: 'Register · Walking Football Hub' } },
    { path: '/signin', name: 'SignIn', component: FirebaseSigninView, meta: { title: 'Sign in · Walking Football Hub' } },
    { path: '/dashboard', name: 'Dashboard', component: UserDashboard, meta: { title: 'Dashboard · Walking Football Hub' } },
    { path: '/admin', name: 'Admin', component: AdminView, meta: { title: 'Admin · Walking Football Hub' } },
    { path: '/admin/programs/new', name: 'ProgramCreate', component: ProgramCreate, meta: { title: 'Add Program · Walking Football Hub' } },
    { path: '/admin/analytics', name: 'AdminAnalytics', component: AdminAnalytics, meta: { title: 'Analytics · Walking Football Hub' } },
    { path: '/admin/email', name: 'AdminEmailCenter', component: AdminEmailCenter, meta: { title: 'Email Center · Walking Football Hub' } },
    { path: '/api-demo', name: 'APIDemo', component: ApiDemoView, meta: { title: 'API Demo · Walking Football Hub' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
    { path: '/admin/programs/:id/edit', name: 'ProgramEdit', component: ProgramCreate, meta: { title: 'Edit Program · Walking Football Hub' } },
  ],
  scrollBehavior() {
    return { left: 0, top: 0 }
  }
})

router.afterEach((to) => {
  document.title = to.meta?.title || 'Walking Football Hub'
  focusMain()
  announce(`${to.meta?.title || 'Page'} loaded`)
})


export default router
