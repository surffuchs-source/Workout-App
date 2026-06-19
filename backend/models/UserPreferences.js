const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  statsCardOrder: [String],
}, { timestamps: true });

module.exports = mongoose.model('UserPreferences', schema);
