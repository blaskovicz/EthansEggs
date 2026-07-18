import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import ProfileSelectView from "../views/ProfileSelectView.vue";
import ChildDashboardView from "../views/ChildDashboardView.vue";
import ParentDashboardView from "../views/ParentDashboardView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "profile-select", component: ProfileSelectView },
    { path: "/child", name: "child-dashboard", component: ChildDashboardView, meta: { role: "CHILD" } },
    { path: "/parent", name: "parent-dashboard", component: ParentDashboardView, meta: { role: "PARENT" } },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.initialized) {
    await auth.fetchMe();
  }

  if (to.meta.role && !auth.user) {
    return { name: "profile-select" };
  }
  if (to.meta.role && auth.user && auth.user.role !== to.meta.role) {
    return { name: auth.user.role === "PARENT" ? "parent-dashboard" : "child-dashboard" };
  }
  if (to.name === "profile-select" && auth.user) {
    return { name: auth.user.role === "PARENT" ? "parent-dashboard" : "child-dashboard" };
  }
  return true;
});

export default router;
