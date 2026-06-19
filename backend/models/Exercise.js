const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    muscleGroup: {
      type: String,
      required: true,
      enum: ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full body', 'cardio'],
    },
    category: {
      type: String,
      required: true,
      enum: ['strength', 'hypertrophy', 'endurance', 'cardio', 'flexibility'],
    },
    description: {
      type: String,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Exercise', exerciseSchema);
