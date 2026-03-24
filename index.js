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

// Get receipts for user (placeholder, needs auth)
app.get("/api/receipts", async (req, res) => {
  try {
    // For now, return all receipts; later add user auth
    const receipts = await Receipt.find();
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Save receipt
app.post("/api/receipts", async (req, res) => {
  try {
    const { name, url, public_id, description, size, type, userId } = req.body;
    const receipt = new Receipt({ name, url, public_id, description, size, type, userId });
    await receipt.save();
    res.status(201).json(receipt);
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
    res.json({ message: "Login successful", user: { name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
