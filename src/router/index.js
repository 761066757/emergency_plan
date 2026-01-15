/*
 * @Author: sp1ke 761066757@qq.com
 * @Date: 2025-12-30 10:25:36
 * @LastEditors: sp1ke 761066757@qq.com
 * @LastEditTime: 2026-01-14 10:57:22
 * @FilePath: \emergency_plan\src\router\index.js
 * @Description: 路由配置
 */
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import StepConfig from '../views/StepConfig.vue'
import PlanEdit from '../views/PlanEdit.vue'
import PlanList from '../views/PlanList.vue'
import BpmnTest from '@/components/BpmnTest.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
    // {
    //   path: '/',
    //   redirect: '/plan/list',
    // },
    {
      path: '/step/config',
      name: 'StepConfig',
      component: StepConfig,
    },
    {
      path: '/plan/edit',
      name: 'PlanEdit',
      component: PlanEdit,
    },
    {
      path: '/plan/list',
      name: 'PlanList',
      component: PlanList,
    },
    {
      path: '/plan/bpmnTest',
      name: 'BpmnTest',
      component: BpmnTest,
    },
  ],
})

export default router
