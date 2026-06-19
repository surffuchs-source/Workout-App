require('dotenv').config();
const mongoose = require('mongoose');

const Exercise = require('./models/Exercise');
const Workout = require('./models/Workout');

async function connect() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB:', process.env.MONGO_URI);
}

async function seed() {
  await Exercise.deleteMany({});
  await Workout.deleteMany({});

  const [benchPress, squat, pullUp] = await Exercise.insertMany([
    {
      name: 'Bench Press',
      muscleGroup: 'chest',
      category: 'strength',
      description: 'Barbell flat bench press',
    },
    {
      name: 'Barbell Squat',
      muscleGroup: 'legs',
      category: 'strength',
      description: 'Back squat with barbell',
    },
    {
      name: 'Pull-Up',
      muscleGroup: 'back',
      category: 'hypertrophy',
      description: 'Bodyweight pull-up to chin over bar',
    },
  ]);

  const workout = await Workout.create({
    name: 'Push/Pull Day A',
    date: new Date(),
    durationMinutes: 60,
    exercises: [
      {
        exercise: benchPress._id,
        order: 1,
        sets: [
          { setNumber: 1, reps: 5, weightKg: 80 },
          { setNumber: 2, reps: 5, weightKg: 82.5 },
          { setNumber: 3, reps: 5, weightKg: 85 },
        ],
      },
      {
        exercise: squat._id,
        order: 2,
        sets: [
          { setNumber: 1, reps: 5, weightKg: 100 },
          { setNumber: 2, reps: 5, weightKg: 100 },
          { setNumber: 3, reps: 5, weightKg: 100 },
        ],
      },
      {
        exercise: pullUp._id,
        order: 3,
        sets: [
          { setNumber: 1, reps: 8, weightKg: 0 },
          { setNumber: 2, reps: 7, weightKg: 0 },
          { setNumber: 3, reps: 6, weightKg: 0 },
        ],
      },
    ],
    notes: 'Felt strong today.',
  });

  const populated = await Workout.findById(workout._id).populate('exercises.exercise');
  console.log('\nSeeded workout:');
  console.log(JSON.stringify(populated, null, 2));
}

connect()
  .then(seed)
  .then(() => {
    console.log('\nDone.');
    mongoose.disconnect();
  })
  .catch((err) => {
    console.error(err);
    mongoose.disconnect();
    process.exit(1);
  });
