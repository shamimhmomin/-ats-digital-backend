const express = require('express');
const router = express.Router();
const { db_shop: db } = require('../db/shop');
const { verifyToken } = require('../middleware/auth'); // Optional: reuse existing auth middleware if compatible

// --- Create Order ---
router.post('/', async (req, res) => {
  const trx = await db.transaction();
  try {
    const { 
      customerId, totalAmount, items, 
      shippingName, shippingPhone, shippingAddress, 
      shippingCity, shippingState, shippingPincode,
      paymentMethod 
    } = req.body;

    // Generate Order Number
    const orderNumber = 'ATS-' + Date.now() + Math.floor(Math.random() * 1000);

    // 1. Insert into orders table
    const [inserted_orderId] = await trx('orders').insert({
      customer_id: customerId || null,
      order_number: orderNumber,
      total_amount: totalAmount,
      shipping_name: shippingName,
      shipping_phone: shippingPhone,
      shipping_address: shippingAddress,
      shipping_city: shippingCity,
      shipping_state: shippingState,
      shipping_pincode: shippingPincode,
      payment_method: paymentMethod || 'COD'
    }).returning('id');
    const orderId = typeof inserted_orderId === 'object' ? inserted_orderId.id : inserted_orderId;

    // 2. Insert items into order_items table
    const orderItems = items.map(item => ({
      order_id: orderId,
      product_id: item.id,
      product_name: item.title || item.name,
      quantity: item.quantity,
      price: item.price
    }));

    await trx('order_items').insert(orderItems);

    // 3. Update stock (optional logic can be added here)

    await trx.commit();
    res.status(201).json({ 
      message: 'Order placed successfully', 
      orderId, 
      orderNumber 
    });
  } catch (error) {
    await trx.rollback();
    console.error('Order error:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// --- Get My Orders ---
router.get('/my-orders/:customerId', async (req, res) => {
  try {
    const orders = await db('orders')
      .where({ customer_id: req.params.customerId })
      .orderBy('created_at', 'desc');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// --- Get All Orders (Admin) ---
router.get('/admin/all', async (req, res) => {
  try {
    const orders = await db('orders')
      .orderBy('created_at', 'desc');
    res.json(orders);
  } catch (error) {
    console.error('Fetch all orders error:', error);
    res.status(500).json({ error: 'Failed to fetch all orders' });
  }
});

module.exports = router;
