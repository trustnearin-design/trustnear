import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The backend returns the plain booking OTP exactly once — in the create
 * response — and never exposes it again (the detail endpoint strips the
 * hash). Persist it locally so the customer can see it again until the
 * booking lands in a terminal state.
 */
const KEY = (bookingId: string) => `sevalink.booking.otp.${bookingId}`;

export async function saveBookingOtp(bookingId: string, otp: string): Promise<void> {
  await AsyncStorage.setItem(KEY(bookingId), otp);
}

export async function getBookingOtp(bookingId: string): Promise<string | null> {
  return AsyncStorage.getItem(KEY(bookingId));
}

export async function clearBookingOtp(bookingId: string): Promise<void> {
  await AsyncStorage.removeItem(KEY(bookingId));
}
