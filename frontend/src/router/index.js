import { createRouter, createWebHistory } from 'vue-router';
import { isLoggedIn } from '../services/auth.js';
import WorkoutsView      from '../views/WorkoutsView.vue';
import WorkoutFormView   from '../views/WorkoutFormView.vue';
import WorkoutLogView    from '../views/WorkoutLogView.vue';
import LogsView          from '../views/LogsView.vue';
import ExercisesView     from '../views/ExercisesView.vue';
import CalendarView      from '../views/CalendarView.vue';
import StatsView         from '../views/StatsView.vue';
import AchievementsView  from '../views/AchievementsView.vue';
import NewsView          from '../views/NewsView.vue';
import LoginView         from '../views/LoginView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',                  redirect: '/workouts' },
    { path: '/login',             component: LoginView,       meta: { public: true } },
    { path: '/workouts',          component: WorkoutsView     },
    { path: '/workouts/new',      component: WorkoutFormView  },
    { path: '/workouts/:id/edit', component: WorkoutFormView  },
    { path: '/logs',              component: LogsView         },
    { path: '/logs/new',          component: WorkoutLogView   },
    { path: '/logs/:id/edit',     component: WorkoutLogView   },
    { path: '/exercises',         component: ExercisesView    },
    { path: '/calendar',          component: CalendarView     },
    { path: '/stats',             component: StatsView        },
    { path: '/achievements',      component: AchievementsView },
    { path: '/news',              component: NewsView         },
  ],
});

router.beforeEach((to) => {
  if (!to.meta.public && !isLoggedIn()) return '/login';
});

export default router;
