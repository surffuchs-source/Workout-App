const router = require('express').Router();
const WorkoutLog = require('../models/WorkoutLog');
const auth = require('../middleware/auth');

const POPULATE = 'exercises.exercise workout';

router.use(auth);

router.get('/', async (req, res) => {
  try {
    res.json(await WorkoutLog.find({ user: req.userId }).sort('-date').populate(POPULATE));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await WorkoutLog.findOne({ _id: req.params.id, user: req.userId }).populate(POPULATE);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const doc = await WorkoutLog.create({ ...req.body, user: req.userId });
    res.status(201).json(await doc.populate(POPULATE));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const doc = await WorkoutLog.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true, runValidators: true }
    ).populate(POPULATE);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const doc = await WorkoutLog.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
