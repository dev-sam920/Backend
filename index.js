const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { upload, uploadToCloudinary } = require("./cloud");
require("dotenv").config();
const User = require("./models/User");
const Receipt = require("./models/Receipt");

const app = express();
const PORT = process.env.PORT || 5000;


const mongoURI = process.env.MONGODB_URI;

mongoose
  .connect(mongoURI, {

  })
  .then(() => {
    console.log("✓ MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("✗ MongoDB connection failed:", err.message);
  });


app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running on port " + PORT);
});

app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Image file required" });

    const result = await uploadToCloudinary(req.file);
    res.json(result);
  } catch (error) {
    console.error("Cloudinary upload failed", error.message, error);
    res.status(500).json({ message: "Cloudinary upload failed", error: error.message });
  }
});


app.get("/api/receipts", async (req, res) => {
  try {
    const { email } = req.query;
    console.log('=== LOADING RECEIPTS ===')
    console.log('Email from query:', email);
    
    if (!email) {
      console.log('ERROR: No email provided in query');
      return res.status(400).json({ message: "Email is required" });
    }
    
    const user = await User.findOne({ email });
    console.log('User lookup result:', user ? 'Found' : 'Not found');
    console.log('User details:', user);
    
    if (!user) {
      console.log('ERROR: User not found for email:', email);
      return res.status(404).json({ message: "User not found" });
    }
    
    const receipts = await Receipt.find({ userId: user._id });
    console.log('Found receipts:', receipts.length, 'receipts');
    console.log('Receipts details:', receipts);
    res.json(receipts);
  } catch (error) {
    console.error('ERROR getting receipts:', error);
    res.status(500).json({ message: "Server error" });
  }
});


app.post("/api/receipts", async (req, res) => {
  try {
    const { name, url, public_id, description, size, type, email } = req.body;
    console.log('=== SAVING RECEIPT ===')
    console.log('Request body:', { name, url, public_id, description, size, type, email });
    
    if (!email) {
      console.log('ERROR: No email provided');
      return res.status(400).json({ message: "Email is required" });
    }
    
    const user = await User.findOne({ email });
    console.log('User lookup result:', user ? 'Found' : 'Not found');
    console.log('User details:', user);
    
    if (!user) {
      console.log('ERROR: User not found for email:', email);
      return res.status(404).json({ message: "User not found" });
    }
    
    const receipt = new Receipt({ name, url, public_id, description, size, type, userId: user._id });
    console.log('Creating receipt:', receipt);
    await receipt.save();
    console.log('Receipt saved successfully:', receipt);
    res.status(201).json(receipt);
  } catch (error) {
    console.error('ERROR saving receipt:', error);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/receipts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await Receipt.findByIdAndDelete(id);
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    res.json({ message: "Receipt deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.patch("/api/receipts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;
    const receipt = await Receipt.findByIdAndUpdate(id, { description }, { new: true });
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    res.json({ message: "Login successful", user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});


if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
