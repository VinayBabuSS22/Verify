const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const dotenv = require('dotenv');
const Otp = require('./models/Otp');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Route to send OTP
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Save to DB
  await Otp.deleteMany({ email });  // Remove old OTPs
  const newOtp = new Otp({ email, otp });
  await newOtp.save();

  // Send email
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is ${otp}. It expires in 5 minutes.`
  };

  transporter.sendMail(mailOptions, (error) => {
    if (error) return res.status(500).json({ message: 'Error sending email' });
    res.json({ message: 'OTP sent' });
  });
});

// Route to verify OTP
app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const storedOtp = await Otp.findOne({ email, otp });
  if (storedOtp) {
    await Otp.deleteOne({ _id: storedOtp._id });
    return res.json({ success: true });
  }
  res.json({ success: false });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));