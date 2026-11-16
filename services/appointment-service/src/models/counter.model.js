import mongoose from 'mongoose';

// Atomic sequence counters. `_id` is the sequence name (e.g. 'card:2026').
// Incremented with $inc in a single findOneAndUpdate, so two simultaneous
// requests can never receive the same number.
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
  },
  { versionKey: false }
);

const Counter = mongoose.model('Counter', counterSchema);
export default Counter;
