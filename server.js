const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Koneksyon MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/es-company', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Schema Produit
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    images: { type: [String], default: [] },
    inStock: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

// Route pou jwenn tout produk yo (aleatwa)
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find({ inStock: true });
        
        // Melanje produk yo aleatwa
        const shuffledProducts = products
            .map(product => ({ ...product._doc, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ sort, ...rest }) => rest);
        
        res.json(shuffledProducts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route pou jwenn yon sèl produk
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Produk pa jwenn' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route pou kreye produk (admin)
app.post('/api/products', async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Route pou mete ajou produk
app.put('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Route pou efase produk
app.delete('/api/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Produk efase' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`API ap kouri sou pò ${PORT}`);
});
