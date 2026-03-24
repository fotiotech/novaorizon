import mongoose from "mongoose";

let isConnected = false; // track the connection

export async function connection() {
  mongoose.set("strictQuery", true);

  if (isConnected) {
    console.log("MongoDB is already connected");
    return;
  }

  try {
    // In your connection file (src/utils/connection.ts or similar)
console.log('=== DEBUG MONGODB CONNECTION ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('MONGODB_URI length:', process.env.MONGODB_URI?.length);
console.log('MONGODB_URI starts with:', process.env.MONGODB_URI?.substring(0, 20));
console.log('Full MONGODB_URI (first 50 chars):', process.env.MONGODB_URI?.substring(0, 50));
console.log('================================');
    await mongoose.connect(process.env.MONGODB_URI as string, {
      dbName: "fotiodb",
    });

    isConnected = true;

    console.log("MongoDB connected");
  } catch (error) {
    console.log(error);
  }
}
