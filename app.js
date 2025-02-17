// Import required modules
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2");
const dotenv = require("dotenv");
const { body, validationResult } = require("express-validator"); // Import validation library
const flash = require("connect-flash"); // Ensure flash is set up

const crypto = require("crypto");
const nodemailer = require("nodemailer");
// const db = require('./db');  // Assuming you have your DB setup

// Initialize app
const app = express();
const port = 6000;

// Load environment variables
dotenv.config({ path: "./.env" });

require("dotenv").config();

// Configure the database connection
const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE,
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err.message);
    return;
  }
  console.log("Connected to MySQL database");
});

// Serve static files (like CSS and images)
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(flash());

app.set("views", path.join(__dirname, "views"));

// Set EJS as the view engine
app.set("view engine", "ejs");

// Session middleware
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

// Middleware to check login status and role
app.use((req, res, next) => {
  res.locals.isLoggedIn = req.session.isLoggedIn || false;
  res.locals.userRole = req.session.userRole || null;
  next();
});

// Middleware to enforce role-based access
function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.isLoggedIn || req.session.userRole !== role) {
      return res.redirect("/login");
    }
    next();
  };
}

// Routes

// Home Route
app.get("/", (req, res) => {
  res.render("index");
});
// Home Route
app.get("/successful", (req, res) => {
  res.render("successful");
});

// Registration Route (POST)

// Login Route (GET)
app.get("/login", (req, res) => {
  res.render("login");
});
// Login Route (POST)
app.post("/login", (req, res) => {
  const { usernameOrEmail, password, role } = req.body;

  console.log("Login attempt: ", { usernameOrEmail, password, role }); // Log login details for debugging

  // Query the database for user by either username or email
  const sql = "SELECT * FROM users WHERE (username = ? OR email = ?)";
  db.query(sql, [usernameOrEmail, usernameOrEmail], async (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.render("login", {
        error: "An error occurred. Please try again.",
      });
    }

    // Check if user exists
    if (results.length > 0) {
      const user = results[0];
      console.log("User found: ", user); // Log the found user

      // Compare password with the stored hashed password
      const isMatch = await bcrypt.compare(password, user.password);

      if (isMatch) {
        console.log("Password matched.");

        if (user.role === role) {
          // Check if the selected role matches the user's role
          req.session.isLoggedIn = true;
          req.session.user = user;
          req.session.userRole = user.role;

          console.log("Role matched: ", user.role); // Log role matching success

          if (user.role === "client") {
            return res.redirect("/profile"); // Redirect to the client profile page
          } else if (user.role === "officer") {
            return res.redirect("/preview"); // Redirect to the officer preview page
          }
        } else {
          // If role doesn't match
          console.log("Role mismatch.");
          return res.render("login", { error: "Invalid role selected." });
        }
      } else {
        // If password doesn't match
        console.log("Password mismatch.");
        return res.render("login", { error: "Invalid password." });
      }
    } else {
      // If user not found
      console.log("User not found.");
      return res.render("login", { error: "Invalid username/email." });
    }
  });
});

// Register Route
app.post("/register", async (req, res) => {
  const {
    full_name,
    email,
    phone,
    address,
    gender,
    dob,
    role,
    username,
    password,
    confirmPassword,
  } = req.body;

  // Validate passwords match
  if (password !== confirmPassword) {
    return res.status(400).send("Passwords do not match");
  }

  // Check if email or username already exists
  const checkQuery = "SELECT * FROM users WHERE email = ? OR username = ?";
  db.query(checkQuery, [email, username], (err, results) => {
    if (err) {
      console.error("Error checking existing user:", err);
      return res.status(500).send("Server error");
    }

    if (results.length > 0) {
      return res.status(400).send("Email or username already exists");
    }

    // Log the password to verify it's being passed correctly
    console.log("Password:", password);

    // Hash the password using bcryptjs
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error("Error hashing password:", err);
        return res.status(500).send("Error registering user");
      }

      // Insert new user into the database
      const sql =
        "INSERT INTO users (full_name, email, phone, address, gender, dob, role, username, password) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

      db.query(
        sql,
        [
          full_name,
          email,
          phone,
          address,
          gender,
          dob,
          role,
          username,
          hashedPassword,
        ],
        (err, result) => {
          if (err) {
            console.error("Error inserting user:", err);
            return res.status(500).send("Error registering user");
          }

          console.log("New user inserted:", result); // Log the result
          res.redirect("/login"); // Redirect to login after successful registration
        }
      );
    });
  });
});

// Profile Route - Displays user's profile and complaints
app.get("/profile", (req, res) => {
  // Check if user is logged in
  if (!req.session.isLoggedIn) {
    return res.redirect("/login");
  }

  const userId = req.session.user.id;

  // SQL query to get user's complaints
  const sql =
    "SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC";
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching complaints:", err);
      return res.status(500).send("Error loading profile");
    }

    // Render the profile page with user data and complaints
    res.render("profile", {
      user: req.session.user,
      complaints: results,
      error: req.flash("error"), // Display any error messages
      success: req.flash("success"), // Display any success messages
    });
  });
});

// Logout Route
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// Complaints Route (Protected for 'client')
app.get("/complain", requireRole("client"), (req, res) => {
  res.render("complain");
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads"); // The folder where images will be stored
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Use unique filename to avoid conflicts
  },
});

const upload = multer({ storage: storage });

app.post("/submit-complaint", upload.single("image"), (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.user || !req.session.user.id) {
    return res.status(401).send("User not logged in");
  }

  // Log the request body and file for debugging
  console.log("Request Body:", req.body);
  console.log("Uploaded File:", req.file);

  // Destructure the request body
  const { name, complaint, address, latitude, longitude } = req.body;

  // Validate required fields
  if (!name || !complaint || !address || !latitude || !longitude) {
    return res.status(400).send("Missing required fields");
  }

  // Validate latitude and longitude
  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).send("Invalid latitude or longitude");
  }

  // Handle file upload
  const imagePath = req.file ? "/uploads/" + req.file.filename : null;

  // Get the user ID from the session
  const userId = req.session.user.id;

  // Log the userId and final SQL query
  console.log("User ID:", userId);
  console.log("Inserting complaint with data:", {
    userId,
    name,
    complaint,
    address,
    imagePath,
    latitude,
    longitude,
  });

  // SQL query to insert the complaint data into the database
  const sql = `
    INSERT INTO complaints (user_id, name, complaint, address, image_path, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  // Query execution
  db.query(
    sql,
    [userId, name, complaint, address, imagePath, latitude, longitude],
    (err, result) => {
      if (err) {
        // Log the error for debugging
        console.error("Error submitting complaint:", err.message || err);
        return res.status(500).json({ error: "Error submitting complaint" });
      }

      // Log successful submission
      console.log("Complaint submitted successfully:", result);

      // Send success response
      res.status(200).json({ message: "Complaint submitted successfully" });
    }
  );
});

// Update Profile Route (POST)
app.post("/update-profile", async (req, res) => {
  const {
    full_name,
    email,
    phone,
    address,
    username,
    password,
    confirmPassword,
  } = req.body;
  const userId = req.session.user.id; // Get the logged-in user's ID from the session

  // Validate if passwords match
  if (password && password !== confirmPassword) {
    req.flash("error", "Passwords do not match!");
    return res.redirect("/profile"); // Redirect to profile to show the error message
  }

  // If password is provided, hash it
  let updatedPassword = null;
  if (password) {
    updatedPassword = await bcrypt.hash(password, 10);
  }

  // Construct the SQL query to update the user
  let sql = `
    UPDATE users SET 
      full_name = ?, 
      email = ?, 
      phone = ?, 
      address = ?, 
      username = ?
  `;

  const queryValues = [full_name, email, phone, address, username];

  // Only add password to SQL query if it's updated
  if (updatedPassword) {
    sql += `, password = ?`;
    queryValues.push(updatedPassword);
  }

  sql += ` WHERE id = ?`;
  queryValues.push(userId);

  // Execute the SQL query with the provided values
  db.query(sql, queryValues, (err, results) => {
    if (err) {
      console.error("Error updating user:", err);
      req.flash("error", "Error updating profile. Please try again.");
      return res.redirect("/profile"); // Redirect to profile with error message
    }

    // If the update was successful, update the session with the new data
    req.session.user = {
      ...req.session.user,
      full_name,
      email,
      phone,
      address,
      username,
      ...(updatedPassword ? { password: updatedPassword } : {}), // Only update password in session if changed
    };

    // Redirect to profile page with success message
    req.flash("success", "Profile updated successfully!");
    res.redirect("/profile"); // Redirect to profile to show success message
  });
});

// Route to delete complaint
app.post("/deleteComplaint", (req, res) => {
  const { complaintId } = req.body;

  // Validate that complaintId is provided
  if (!complaintId) {
    return res.json({ success: false, message: "Complaint ID is required" });
  }

  // SQL query to delete the complaint from the database
  const sql = "DELETE FROM complaints WHERE id = ?";

  db.query(sql, [complaintId], (err, result) => {
    if (err) {
      console.error("Error deleting complaint:", err);
      return res.json({
        success: false,
        message: "Failed to delete complaint",
      });
    }

    // If the deletion is successful, send a success response
    if (result.affectedRows > 0) {
      res.json({ success: true, message: "Complaint deleted successfully" });
    } else {
      res.json({ success: false, message: "Complaint not found" });
    }
  });
});

// Preview Route (Protected for 'officer')
// Route to fetch complaints and render preview.ejs
app.get('/preview', (req, res) => {
  db.query('SELECT * FROM complaints', (err, results) => {
    if (err) {
      console.error('Error fetching complaints: ', err);
      return res.status(500).send('Error fetching complaints');
    }
    // Pass the complaints data to the EJS template
    res.render('preview', { complaints: results });
  });
});
app.delete('/deleteComplaints/:id', (req, res) => {
  const complaintId = req.params.id;

  // MySQL query to delete the complaint by ID
  db.query('DELETE FROM complaints WHERE id = ?', [complaintId], (err, result) => {
      if (err) {
          console.error('Error deleting complaint:', err);
          return res.status(500).send('Error deleting complaint');
      }
      if (result.affectedRows > 0) {
          res.status(200).send('Complaint deleted');
      } else {
          res.status(404).send('Complaint not found');
      }
  });
});


// Route to render the forgot password page
// Route to render the forgot password page
app.get("/forgot-password", (req, res) => {
  res.render("forgot-password", { error: null, success: null }); // Ensure error and success are passed
});

// Route to handle password reset request (send email with token)
app.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  // Validate email format
  const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
  if (!emailRegex.test(email)) {
    return res.render("forgot-password", {
      error: "Invalid email format.",
      success: "",
    });
  }

  // Check if the user exists in the database
  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], (err, result) => {
    if (err) {
      console.error("Error finding user:", err);
      return res.render("forgot-password", {
        error: "Something went wrong, please try again.",
        success: "",
      });
    }

    if (result.length === 0) {
      return res.render("forgot-password", {
        error: "No user found with this email.",
        success: "",
      });
    }

    const user = result[0];

    // Generate a password reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expirationDate = Date.now() + 3600000; // Token expires in 1 hour

    // Save the token and expiration date in the database
    const updateSql =
      "UPDATE users SET reset_token = ?, reset_token_expiration = ? WHERE id = ?";
    db.query(
      updateSql,
      [resetToken, expirationDate, user.id],
      (err, result) => {
        if (err) {
          console.error("Error saving reset token:", err);
          return res.render("forgot-password", {
            error: "Something went wrong, please try again.",
            success: "",
          });
        }

        // Send the reset link via email
        const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER, // Use environment variable
            pass: process.env.EMAIL_PASS, // Use environment variable
          },
        });

        const mailOptions = {
          from: process.env.EMAIL_USER, // Use environment variable
          to: user.email,
          subject: "Password Reset Request",
          text: `You requested a password reset. Please click the link below to reset your password:\n\n${resetLink}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Error sending email:", error);
            return res.render("forgot-password", {
              error: "Failed to send reset email.",
              success: "",
            });
          }

          // Success: Render page with success message
          res.render("forgot-password", {
            success: "Password reset link sent to your email.",
            error: "",
          });
        });
      }
    );
  });
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "lovekuamr714283@gmail.com",
    pass: "Love@12345678901",
  },
  logger: true, // Enable SMTP logs
  debug: true, // Enable detailed debug output
});

// Route to render the reset password form (with token validation)
app.get("/reset-password/:token", (req, res) => {
  const { token } = req.params;

  // Verify the token
  const sql =
    "SELECT * FROM users WHERE reset_token = ? AND reset_token_expiration > ?";
  db.query(sql, [token, Date.now()], (err, result) => {
    if (err) {
      console.error("Error finding user with token:", err);
      return res.redirect("/login");
    }

    if (result.length === 0) {
      return res.redirect("/login");
    }

    res.render("reset-password", { token }); // Render the reset password page with the token
  });
});

// Route to handle the password reset (save the new password)
app.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  // Check if passwords match
  if (password !== confirmPassword) {
    return res.render("reset-password", {
      error: "Passwords do not match.",
      token,
    });
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Update the user's password
  const sql =
    "UPDATE users SET password = ?, reset_token = NULL, reset_token_expiration = NULL WHERE reset_token = ?";
  db.query(sql, [hashedPassword, token], (err, result) => {
    if (err) {
      console.error("Error updating password:", err);
      return res.render("reset-password", {
        error: "Something went wrong, please try again.",
        token,
      });
    }

    res.redirect("/login");
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
