// app/actions/reset-password.ts
"use server";

import User from "@/models/User";
import { connection } from "@/utils/connection";
import bcrypt from "bcryptjs";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

export async function resetPassword(prevState: any, formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword || !token) {
    return { error: "All fields are required." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  if (
    password.length < 8 ||
    !/[a-zA-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return {
      error:
        "Password must be at least 8 characters and contain a letter and a number.",
    };
  }

  const ip = await getClientIp();
  const limit = await consumeRateLimit(`reset-submit:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return { error: "Too many attempts. Please try again later." };
  }

  try {
    await connection();

    // Find the user with a matching token that is still valid
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: new Date() },
    });

    if (!user) {
      return { error: "Invalid or expired recovery token." };
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Save and atomically remove the recovery attributes
    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetPasswordToken: "", resetPasswordExpiry: "" },
      },
    );

    return { success: "Your password has been reset successfully!" };
  } catch (error) {
    console.error(error);
    return { error: "Failed to reset password. Please try again." };
  }
}
