import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'
import Home from '@/views/Home.vue'
import LoadGame from '@/views/LoadGame.vue'
import Game from '@/views/Game.vue'
import Tags from '@/views/Tags.vue'
import ListsView from '@/views/Lists.vue'
import store from '@/store'

Vue.use(VueRouter)

const routes: Array<RouteConfig> = [
  {
    path: '/game',
    name: 'Game',
    component: Game,
    alias: '/',
    meta: {
      title: 'GMEmulator - Jeu'
    },
    beforeEnter (to, from, next) {
      console.log('current.game: ', store.state.current?.game)
      if (store.state.current?.game) {
        next()
      } else {
        next('/load')
      }
    }
  },
  {
    path: '/load',
    name: 'LoadGame',
    component: LoadGame,
    meta: {
      title: 'GMEmulator - Chargement'
    }
  },
  {
    path: '/tags',
    name: 'Tags',
    component: Tags,
    meta: {
      title: 'GMEmulator - Tags'
    }
  },
  {
    path: '/lists',
    name: 'Lists',
    component: ListsView,
    meta: {
      title: 'GMEmulator - Personages'
    }
  },
  {
    path: '/about',
    name: 'About',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/About.vue')
  }
]

const router = new VueRouter({
  routes
})

export default router
