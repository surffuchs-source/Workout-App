const mongoose = require('mongoose');

const setSchema = new mongoose.Schema(
  {
    setNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    reps:            { type: Number, min: 1 },
    weightKg:        { type: Number, default: 0, min: 0 },
    durationSeconds: { type: Number, min: 0 },
    distanceKm:      { type: Number, min: 0 },
    restSeconds: {
      type: Number,
      default: 60,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const workoutExerciseSchema = new mongoose.Schema(
  {
    exercise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: true,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
    },
    sets: {
      type: [setSchema],
      validate: {
        validator: (sets) => sets.length > 0,
        message: 'At least one set is required per exercise.',
      },
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const workoutSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    durationMinutes: {
      type: Number,
      min: 1,
    },
    exercises: {
      type: [workoutExerciseSchema],
      validate: {
        validator: (exercises) => exercises.length > 0,
        message: 'A workout must contain at least one exercise.',
      },
    },
    notes: {
      type: String,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Workout', workoutSchema);
