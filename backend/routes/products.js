// routes/products.js
// All product-related API endpoints

const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, checkRole } = require("../middleware/auth");
const { calculateRentalPrice } = require("../utils/priceCalculator");
const {
  checkProductAvailability,
  getProductReservations,
} = require("../utils/availabilityChecker");

const prisma = new PrismaClient();

// ==================== PUBLIC ROUTES (No auth needed) ====================

/**
 * GET /api/products
 * Get all published products (public - for customers to browse)
 */
router.get("/", async (req, res) => {
  try {
    const { search, minPrice, maxPrice } = req.query;

    // Build filter conditions
    const whereConditions = {
      isPublished: true, // Only show published products
    };

    // Add search filter if provided
    if (search) {
      whereConditions.name = {
        contains: search,
        mode: "insensitive", // Case-insensitive search
      };
    }

    // Add price filters if provided
    if (minPrice) {
      whereConditions.pricePerDay = {
        ...whereConditions.pricePerDay,
        gte: parseFloat(minPrice),
      };
    }

    if (maxPrice) {
      whereConditions.pricePerDay = {
        ...whereConditions.pricePerDay,
        lte: parseFloat(maxPrice),
      };
    }

    // Fetch products from database
    const products = await prisma.product.findMany({
      where: whereConditions,
      include: {
        vendor: {
          select: {
            name: true,
            companyName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc", // Newest first
      },
    });

    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/**
 * GET /api/products/:id
 * Get single product details by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

/**
 * POST /api/products/:id/check-availability
 * Check if product is available for given dates and quantity
 * This is the KEY endpoint that prevents double-booking
 */
router.post("/:id/check-availability", async (req, res) => {
  try {
    const { startDate, endDate, quantity } = req.body;
    const productId = req.params.id;

    // Validate inputs
    if (!startDate || !endDate || !quantity) {
      return res.status(400).json({
        error: "Missing required fields: startDate, endDate, quantity",
      });
    }

    // Check if dates are valid
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({
        error: "End date must be after start date",
      });
    }

    if (start < new Date()) {
      return res.status(400).json({
        error: "Start date cannot be in the past",
      });
    }

    // Check availability
    const availability = await checkProductAvailability(productId, startDate, endDate, quantity);

    // Also calculate price for this rental period
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    const pricing = calculateRentalPrice(product, startDate, endDate);

    res.json({
      ...availability,
      pricing: {
        unitPrice: pricing.price,
        totalPrice: pricing.price * quantity,
        duration: pricing.duration,
        pricingType: pricing.pricingType,
      },
    });
  } catch (error) {
    console.error("Error checking availability:", error);
    res.status(500).json({ error: error.message || "Failed to check availability" });
  }
});

/**
 * GET /api/products/:id/reservations
 * Get all reservations for a product (for calendar view)
 */
router.get("/:id/reservations", async (req, res) => {
  try {
    const reservations = await getProductReservations(req.params.id);
    res.json(reservations);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
});

// ==================== VENDOR ROUTES (Auth + Vendor role needed) ====================

/**
 * GET /api/products/vendor/my-products
 * Get all products created by logged-in vendor
 */
router.get(
  "/vendor/my-products",
  authMiddleware,
  checkRole("VENDOR", "ADMIN"),
  async (req, res) => {
    try {
      const products = await prisma.product.findMany({
        where: { vendorId: req.userId },
        orderBy: { createdAt: "desc" },
      });

      res.json(products);
    } catch (error) {
      console.error("Error fetching vendor products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  },
);

/**
 * POST /api/products
 * Create new rental product (Vendor only)
 */
router.post("/", authMiddleware, checkRole("VENDOR", "ADMIN"), async (req, res) => {
  try {
    const { name, description, quantityOnHand, pricePerHour, pricePerDay, pricePerWeek, imageUrl } =
      req.body;

    // Validate required fields
    if (!name || !quantityOnHand) {
      return res.status(400).json({
        error: "Name and quantity are required",
      });
    }

    // At least one price must be provided
    if (!pricePerHour && !pricePerDay && !pricePerWeek) {
      return res.status(400).json({
        error: "At least one price (hour/day/week) must be provided",
      });
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        vendorId: req.userId, // Logged-in vendor's ID
        name,
        description,
        quantityOnHand: parseInt(quantityOnHand),
        pricePerHour: pricePerHour ? parseFloat(pricePerHour) : null,
        pricePerDay: pricePerDay ? parseFloat(pricePerDay) : null,
        pricePerWeek: pricePerWeek ? parseFloat(pricePerWeek) : null,
        imageUrl,
        isPublished: false, // Unpublished by default
      },
    });

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

/**
 * PUT /api/products/:id
 * Update product (Vendor can only update their own products)
 */
router.put("/:id", authMiddleware, checkRole("VENDOR", "ADMIN"), async (req, res) => {
  try {
    const productId = req.params.id;

    // Check if product exists and belongs to this vendor
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check ownership (unless admin)
    if (req.userRole !== "ADMIN" && existingProduct.vendorId !== req.userId) {
      return res.status(403).json({ error: "You can only update your own products" });
    }

    const { name, description, quantityOnHand, pricePerHour, pricePerDay, pricePerWeek, imageUrl } =
      req.body;

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(quantityOnHand && { quantityOnHand: parseInt(quantityOnHand) }),
        ...(pricePerHour !== undefined && {
          pricePerHour: pricePerHour ? parseFloat(pricePerHour) : null,
        }),
        ...(pricePerDay !== undefined && {
          pricePerDay: pricePerDay ? parseFloat(pricePerDay) : null,
        }),
        ...(pricePerWeek !== undefined && {
          pricePerWeek: pricePerWeek ? parseFloat(pricePerWeek) : null,
        }),
        ...(imageUrl !== undefined && { imageUrl }),
      },
    });

    res.json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

/**
 * PATCH /api/products/:id/publish
 * Toggle product publish status
 */
router.patch("/:id/publish", authMiddleware, checkRole("VENDOR", "ADMIN"), async (req, res) => {
  try {
    const productId = req.params.id;
    const { isPublished } = req.body;

    // Check ownership
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (req.userRole !== "ADMIN" && product.vendorId !== req.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Update publish status
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { isPublished: isPublished },
    });

    res.json({
      message: `Product ${isPublished ? "published" : "unpublished"} successfully`,
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error toggling publish status:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

/**
 * DELETE /api/products/:id
 * Delete product (Vendor can only delete their own products)
 */
router.delete("/:id", authMiddleware, checkRole("VENDOR", "ADMIN"), async (req, res) => {
  try {
    const productId = req.params.id;

    // Check ownership
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (req.userRole !== "ADMIN" && product.vendorId !== req.userId) {
      return res.status(403).json({ error: "You can only delete your own products" });
    }

    // Delete product
    await prisma.product.delete({
      where: { id: productId },
    });

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

module.exports = router;
