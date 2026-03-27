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

if (!mongoURI) {
  console.error('✗ MONGODB_URI environment variable not set');
  process.exit(1);
}

mongoose
  .connect(mongoURI, {

  })
  .then(() => {
    console.log("✓ MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("✗ MongoDB connection failed:", err.message);
    process.exit(1);
  });


const allowedOrigins = [
  'https://receiptkeep.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
]

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*')
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
    return res.sendStatus(204)
  }
  next()
})

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
    console.log('=== SIGNUP ATTEMPT ===');
    const { name, email, password } = req.body;
    console.log('Signup data received - name:', !!name, 'email:', !!email, 'password:', !!password);
    
    if (!name || !email || !password) {
      console.log('ERROR: Missing required fields');
      return res.status(400).json({ message: "All fields are required" });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('ERROR: User already exists:', email);
      return res.status(400).json({ message: "User already exists" });
    }
    
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');
    
    const user = new User({ name, email, password: hashedPassword });
    console.log('Saving new user:', email);
    await user.save();
    console.log('User saved successfully');
    
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error('CRITICAL ERROR in signup endpoint:', error.message || error);
    if (error.stack) console.error('Stack trace:', error.stack);
    res.status(500).json({ message: "Server error", details: error.message });
  }
});

app.post("/api/signin", async (req, res) => {
  try {
    console.log('=== SIGNIN ATTEMPT ===');
    console.log('Request body received');
    
    const { email, password } = req.body;
    console.log('Email provided:', !!email);
    console.log('Password provided:', !!password);
    
    if (!email || !password) {
      console.log('ERROR: Missing email or password');
      return res.status(400).json({ message: "Email and password are required" });
    }
    
    console.log('Querying User collection...');
    let user;
    try {
      user = await User.findOne({ email });
      console.log('User lookup successful:', user ? 'Found' : 'Not found');
    } catch (dbError) {
      console.error('Database error during User lookup:', dbError.message);
      throw dbError;
    }
    
    if (!user) {
      console.log('ERROR: User not found for email:', email);
      return res.status(400).json({ message: "Invalid credentials" });
    }
    
    if (!user.password) {
      console.error('ERROR: User found but no password hash stored');
      return res.status(500).json({ message: "User account error" });
    }
    
    console.log('Comparing passwords...');
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('Password comparison successful:', isPasswordValid);
    } catch (bcryptError) {
      console.error('Bcrypt comparison error:', bcryptError.message);
      throw bcryptError;
    }
    
    if (!isPasswordValid) {
      console.log('ERROR: Invalid password for user:', email);
      return res.status(400).json({ message: "Invalid credentials" });
    }
    
    console.log('SUCCESS: User authenticated:', email);
    res.json({ message: "Login successful", user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('CRITICAL ERROR in signin endpoint:', error.message || error);
    if (error.stack) console.error('Stack trace:', error.stack);
    res.status(500).json({ message: "Server error", details: error.message });
  }
});


// Start server in all environments
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
