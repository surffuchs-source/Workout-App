const router          = require('express').Router();
const auth            = require('../middleware/auth');
const ACHIEVEMENTS    = require('../data/achievements');
const UserAchievement = require('../models/UserAchievement');
const WorkoutLog      = require('../models/WorkoutLog');

router.use(auth);

async function computeStats(userId) {
  const logs = await WorkoutLog.find({ user: userId, done: true });

  const doneCount         = logs.length;
  const distinctExercises = new Set(
    logs.flatMap(l => l.exercises.map(e => String(e.exercise)))
  ).size;
  const maxWeight = Math.max(0, ...logs.flatMap(l =>
    l.exercises.flatMap(e => e.sets.map(s => s.weightKg || 0))
  ));
  const maxDuration = Math.max(0, ...logs.map(l => l.durationMinutes || 0));
  const hasEarlyBird = logs.some(l => l.startTime && l.startTime < '07:00');
  const hasNightOwl  = logs.some(l => l.startTime && l.startTime >= '21:00');
  const maxSetsInSession = Math.max(0, ...logs.map(l =>
    l.exercises.reduce((n, e) => n + e.sets.length, 0)
  ));

  const isCardioSet = s => (s.durationSeconds || 0) > 0 || (s.distanceKm || 0) > 0;
  const cardioSets  = logs.flatMap(l => l.exercises.flatMap(e => e.sets)).filter(isCardioSet);

  const cardioSessionCount    = logs.filter(l =>
    l.exercises.some(e => e.sets.some(isCardioSet))
  ).length;
  const maxCardioDistanceKm   = Math.max(0, ...cardioSets.map(s => s.distanceKm || 0));
  const totalCardioDistanceKm = cardioSets.reduce((sum, s) => sum + (s.distanceKm || 0), 0);
  const maxCardioDurationSecs = Math.max(0, ...cardioSets.map(s => s.durationSeconds || 0));

  return {
    doneCount, distinctExercises, maxWeight, maxDuration,
    hasEarlyBird, hasNightOwl, maxSetsInSession,
    cardioSessionCount, maxCardioDistanceKm, totalCardioDistanceKm, maxCardioDurationSecs,
  };
}

function buildProgress(s) {
  return {
    first_session:       { met: s.doneCount >= 1,                   current: Math.min(s.doneCount, 1),                              target: 1,    label: 'session' },
    sessions_3:          { met: s.doneCount >= 3,                   current: Math.min(s.doneCount, 3),                              target: 3,    label: 'sessions' },
    sessions_10:         { met: s.doneCount >= 10,                  current: Math.min(s.doneCount, 10),                             target: 10,   label: 'sessions' },
    sessions_25:         { met: s.doneCount >= 25,                  current: Math.min(s.doneCount, 25),                             target: 25,   label: 'sessions' },
    sessions_50:         { met: s.doneCount >= 50,                  current: Math.min(s.doneCount, 50),                             target: 50,   label: 'sessions' },
    sessions_100:        { met: s.doneCount >= 100,                 current: Math.min(s.doneCount, 100),                            target: 100,  label: 'sessions' },
    exercises_5:         { met: s.distinctExercises >= 5,           current: Math.min(s.distinctExercises, 5),                      target: 5,    label: 'exercises' },
    exercises_10:        { met: s.distinctExercises >= 10,          current: Math.min(s.distinctExercises, 10),                     target: 10,   label: 'exercises' },
    heavy_100kg:         { met: s.maxWeight >= 100,                 current: Math.min(Math.round(s.maxWeight), 100),                target: 100,  label: 'kg max' },
    marathon_session:    { met: s.maxDuration >= 90,                current: Math.min(s.maxDuration, 90),                           target: 90,   label: 'min' },
    early_bird:          { met: s.hasEarlyBird,                     current: s.hasEarlyBird ? 1 : 0,                                target: 1,    label: 'early session' },
    night_owl:           { met: s.hasNightOwl,                      current: s.hasNightOwl ? 1 : 0,                                 target: 1,    label: 'late session' },
    volume_50sets:       { met: s.maxSetsInSession >= 50,           current: Math.min(s.maxSetsInSession, 50),                      target: 50,   label: 'sets in one session' },
    cardio_first:        { met: s.cardioSessionCount >= 1,          current: Math.min(s.cardioSessionCount, 1),                     target: 1,    label: 'cardio session' },
    cardio_sessions_5:   { met: s.cardioSessionCount >= 5,          current: Math.min(s.cardioSessionCount, 5),                     target: 5,    label: 'cardio sessions' },
    cardio_sessions_25:  { met: s.cardioSessionCount >= 25,         current: Math.min(s.cardioSessionCount, 25),                    target: 25,   label: 'cardio sessions' },
    cardio_5km:          { met: s.maxCardioDistanceKm >= 5,         current: Math.min(+s.maxCardioDistanceKm.toFixed(1), 5),        target: 5,    label: 'km in one set' },
    cardio_halfmarathon: { met: s.maxCardioDistanceKm >= 21.1,      current: Math.min(+s.maxCardioDistanceKm.toFixed(1), 21.1),     target: 21.1, label: 'km in one set' },
    cardio_1hour:        { met: s.maxCardioDurationSecs >= 3600,    current: Math.min(Math.round(s.maxCardioDurationSecs / 60), 60), target: 60,  label: 'min in one set' },
    cardio_100km_total:  { met: s.totalCardioDistanceKm >= 100,     current: Math.min(Math.round(s.totalCardioDistanceKm), 100),    target: 100,  label: 'km total' },
  };
}

// GET / — all achievements with earned status and progress for the current user
router.get('/', async (req, res) => {
  try {
    const [earned, stats] = await Promise.all([
      UserAchievement.find({ user: req.userId }),
      computeStats(req.userId),
    ]);

    const earnedMap = Object.fromEntries(earned.map(e => [e.achievementId, e.earnedAt]));
    const progress  = buildProgress(stats);

    res.json(ACHIEVEMENTS.map(a => ({
      ...a,
      earned:   !!earnedMap[a.id],
      earnedAt: earnedMap[a.id] ?? null,
      progress: { current: progress[a.id].current, target: progress[a.id].target, label: progress[a.id].label },
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /check — evaluate all unearned achievements, award new ones, return newly earned
router.post('/check', async (req, res) => {
  try {
    const [alreadyEarnedIds, stats] = await Promise.all([
      UserAchievement.find({ user: req.userId }).distinct('achievementId'),
      computeStats(req.userId),
    ]);

    const earned   = new Set(alreadyEarnedIds);
    const progress = buildProgress(stats);

    const newlyEarned = [];
    for (const a of ACHIEVEMENTS) {
      if (!earned.has(a.id) && progress[a.id].met) {
        await UserAchievement.create({ user: req.userId, achievementId: a.id });
        newlyEarned.push({ ...a, earnedAt: new Date() });
      }
    }

    res.json(newlyEarned);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
