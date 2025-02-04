const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const otpStore = new Map(); 

exports.sendOtp = async (phone_number) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await client.messages.create({
      body: `Your OTP code is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone_number,
    });

    otpStore.set(phone_number, { otp, expiresAt: Date.now() + 300000 }); 

    return { success: true };
  } catch (error) {
    console.error("Error sending OTP:", error);
    return { success: false };
  }
};

exports.verifyOtp = async (phone_number, otp) => {
  const storedOtpData = otpStore.get(phone_number);

  if (!storedOtpData) {
    return false; 
  }

  if (Date.now() > storedOtpData.expiresAt) {
    otpStore.delete(phone_number); 
    return false; 
  }

  if (storedOtpData.otp === otp) {
    otpStore.delete(phone_number); 
    return true;
  }

  return false;
};
