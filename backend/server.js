require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is running!",
    timestamp: new Date().toISOString(),
  });
});

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const quotationRoutes = require("./routes/quotations");
const orderRoutes = require("./routes/orders");
const invoiceRoutes = require("./routes/invoices");

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/invoices", invoiceRoutes);

// Error handling - catches any errors
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({ error: err.message || "Something went wrong!" });
});

// Start server
const PORT = process.env.PORT || 5030;
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`📊 Test it: http://localhost:${PORT}/health`);
});
