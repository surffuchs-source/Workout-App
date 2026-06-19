const router          = require('express').Router();
const auth            = require('../middleware/auth');
const UserPreferences = require('../models/UserPreferences');

router.get('/', auth, async (req, res) => {
  try {
    const prefs = await UserPreferences.findOne({ user: req.user.id });
    res.json(prefs ?? {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/', auth, async (req, res) => {
  try {
    const prefs = await UserPreferences.findOneAndUpdate(
      { user: req.user.id },
      { $set: req.body },
      { upsert: true, new: true }
    );
    res.json(prefs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
