import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  amount: Number,
  type: String, // 'income', 'expense', 'refund'
  description: String,
  status: String, // 'completed', 'pending', 'failed'
  date: Date,
});

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
