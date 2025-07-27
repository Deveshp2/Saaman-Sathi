# Inventory Management System Setup Guide

## Overview
This is a comprehensive inventory management system with separate interfaces for suppliers and vendors. Suppliers can manage their products, inventory, and orders, while vendors can browse products and place orders.

## Database Setup

### 1. Supabase Database Setup
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project: `https://rqapzmhlyciiqxgtlrdf.supabase.co`
3. Go to the SQL Editor
4. Copy and paste the entire contents of `database_schema.sql` into the SQL Editor
5. Click "Run" to execute the schema

### 2. Database Tables Created
- **profiles**: User profiles with user type (supplier/vendor)
- **categories**: Product categories
- **products**: Product information and inventory
- **orders**: Order management
- **order_items**: Individual items in orders
- **inventory_transactions**: Stock movement tracking
- **suppliers**: Additional supplier-specific data
- **vendors**: Additional vendor-specific data

### 3. Row Level Security (RLS)
All tables have RLS enabled with appropriate policies:
- Users can only access their own data
- Suppliers can manage their own products and orders
- Vendors can view active products and manage their orders
- Proper separation between supplier and vendor data

## Frontend Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
The Supabase configuration is already set up in `src/lib/supabase.js` with your credentials.

### 3. API Integration
The system includes comprehensive API services in `src/lib/api.js`:
- **userAPI**: User profile management
- **categoriesAPI**: Product category management
- **productsAPI**: Product CRUD operations
- **ordersAPI**: Order management
- **inventoryAPI**: Inventory tracking
- **reportsAPI**: Reporting functionality
- **dashboardAPI**: Dashboard data

## User Types and Features

### Supplier Features
- **Dashboard**: Overview of orders, low stock alerts, recent transactions
- **Inventory Management**: Add, edit, delete products, track stock levels
- **Order Management**: View and update order status
- **Reports**: Sales reports, inventory reports, customer reports
- **Stock Management**: Track stock movements, set minimum stock levels

### Vendor Features
- **Dashboard**: Overview of orders and available products
- **Product Browsing**: View available products from suppliers
- **Order Management**: Place orders, track order status
- **Order History**: View past orders and their status

## Authentication Flow

1. **Landing Page**: Users see the main landing page
2. **Sign Up**: Users choose between supplier or vendor account
3. **Sign In**: Users log in with their credentials
4. **Dashboard Redirect**: Based on user type, redirect to appropriate dashboard

## Key Features

### Automatic Features
- **Order Number Generation**: Automatic order numbering (ORD-YYYY-MM-XXXX)
- **Stock Updates**: Automatic stock updates when inventory transactions occur
- **Order Total Calculation**: Automatic calculation of order totals
- **Low Stock Alerts**: Products below minimum stock level are flagged

### Security Features
- **Row Level Security**: Data access controlled by user type and ownership
- **User Type Separation**: Suppliers and vendors have separate data access
- **Authentication Required**: All operations require valid authentication

## API Usage Examples

### For Suppliers

```javascript
// Get supplier's products
const products = await productsAPI.getSupplierProducts();

// Create a new product
const newProduct = await productsAPI.create({
  name: 'Sample Product',
  description: 'Product description',
  price: 29.99,
  stock_quantity: 100,
  category_id: 'category-uuid'
});

// Update stock
await productsAPI.updateStock(productId, 50, 'purchase', 'Stock purchase');

// Get dashboard data
const dashboardData = await dashboardAPI.getSupplierDashboard();
```

### For Vendors

```javascript
// Get available products
const products = await productsAPI.getAll({ is_active: true });

// Create an order
const order = await ordersAPI.create({
  supplier_id: 'supplier-uuid',
  shipping_address: '123 Main St',
  notes: 'Please deliver by Friday'
});

// Add items to order
await ordersAPI.addOrderItems(orderId, [
  {
    product_id: 'product-uuid',
    quantity: 5,
    unit_price: 29.99
  }
]);
```

## File Structure

```
src/
├── lib/
│   ├── supabase.js          # Supabase client configuration
│   └── api.js               # API services for all operations
├── contexts/
│   └── AuthContext.js       # Authentication context
├── components/
│   ├── LandingPage.js       # Landing page component
│   ├── SignIn.js           # Sign in component
│   ├── SignUp.js           # Sign up component
│   ├── ProtectedRoute.js   # Route protection
│   ├── supplier/           # Supplier-specific components
│   │   ├── SupplierDashboard.js
│   │   ├── SupplierInventory.js
│   │   └── SupplierReports.js
│   └── vendor/             # Vendor-specific components
│       ├── VendorDashboard.js
│       ├── VendorOrders.js
│       └── VendorProducts.js
```

## Testing the System

1. **Create Test Accounts**:
   - Create a supplier account
   - Create a vendor account
   - Test the sign-up and sign-in flow

2. **Supplier Testing**:
   - Add products to inventory
   - Set stock levels
   - Create categories
   - View dashboard and reports

3. **Vendor Testing**:
   - Browse available products
   - Place orders
   - Track order status
   - View order history

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Ensure user is authenticated and has proper permissions
2. **Foreign Key Errors**: Check that referenced IDs exist in parent tables
3. **Authentication Errors**: Verify Supabase credentials and user session

### Debug Tips

1. Check browser console for JavaScript errors
2. Check Supabase logs for database errors
3. Verify RLS policies are correctly applied
4. Test API calls directly in Supabase dashboard

## Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy to your preferred hosting platform** (Vercel, Netlify, etc.)

3. **Environment Variables**: Ensure Supabase URL and keys are properly configured

## Security Considerations

- All database operations are protected by RLS policies
- User authentication is required for all operations
- Data is separated by user type and ownership
- Sensitive operations are logged in inventory transactions

## Performance Optimization

- Database indexes are created for frequently queried columns
- API calls are optimized with proper joins
- Pagination is implemented for large datasets
- Caching strategies can be added for frequently accessed data 