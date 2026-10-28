import { HttpError } from "./errors.js";
export function notificationContact(user, profile) {
  const email = user.email_verified && user.email ? user.email : null;
  const phone =
    user.phone_number && user.phone_number === profile.phone
      ? user.phone_number
      : null;
  if (!email && !phone)
    throw new HttpError(
      400,
      "Verify your account email or sign in with your verified phone before sending notifications",
    );
  return { email, phone };
}
