const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require('cors');
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

// Connect to MongoDB
mongoose.connect("mongodb+srv://gauravrajoriya272160:pirex4YhOsLwv31f@cluster0.2eglf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => {
    console.log("Connected with MongoDB");
  }).catch((err) => {
    console.log(err);
  });
// Serve files from the "files" directory (where images are stored)
app.use('/files', express.static(path.join(__dirname, 'files')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

// Ensure the "files" directory exists
const uploadDir = './files';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Define the form schema
const formSchema = new mongoose.Schema({
  name: String,
  lastName: String,
  email: String,
  phone: Number,
  aadharCard: String,
  panCard: String,
  files: [String] // Array of file paths
});

// Create the Form model
const Form = mongoose.model("form", formSchema);

// Create Form with file upload
app.post("/api/v1/form/new", upload.array("files", 5), async (req, res) => {
  const { name, lastName, email, phone } = req.body;

  if (!name || !lastName || !email || !phone) {
    return res.status(400).json({
      success: false,
      message: "All fields are required."
    });
  }

  // Get uploaded files paths
  const files = req.files.map(file => file.path);

  try {
    const form = await Form.create({
      name,
      lastName,
      email,
      phone,
      files, // Save the uploaded file paths in the database
      aadharCard: req.body.aadharCard,
      panCard: req.body.panCard
    });

    res.status(201).json({
      success: true,
      form
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Read all forms
app.get("/api/v1/forms", async (req, res) => {
    try {
      const forms = await Form.find();
  
      // Modify the 'files' field to include the full URL for each file
      const modifiedForms = forms.map(form => {
        const updatedFiles = form.files.map(filePath => {
          return `${req.protocol}://${req.get('host')}/${filePath.replace(/\\/g, '/')}`;
        });
  
        return {
          ...form._doc, // Spread the form data
          files: updatedFiles, // Update files with URLs
        };
      });
  
      res.status(200).json({
        success: true,
        forms: modifiedForms
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
  
// Update Form
app.put("/api/v1/form/:id", async (req, res) => {
  try {
    const form = await Form.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found"
      });
    }

    res.status(200).json({
      success: true,
      form
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Delete Form
app.delete("/api/v1/form/:id", async (req, res) => {
  try {
    const form = await Form.findByIdAndDelete(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Form deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Start the server
app.listen(5000, () => {
  console.log("Server is running at http://localhost:5000");
});
