# 📦 Inventory Management System

A comprehensive, full-stack inventory management system built with React and Supabase, featuring separate interfaces for suppliers and vendors with real-time data synchronization.

## 🌟 Features

### 👨‍💼 For Suppliers
- **📊 Dashboard**: Real-time overview of orders, low stock alerts, and recent transactions
- **📦 Inventory Management**: Add, edit, delete products with advanced stock tracking
- **📋 Order Management**: View and update order status with automated workflows
- **📈 Reports**: Comprehensive sales reports, inventory analytics, and performance metrics
- **🔄 Stock Management**: Track stock movements, set minimum levels, and automated alerts
- **💰 Financial Tracking**: Revenue, profit, and cost analysis with visual charts

### 🛒 For Vendors
- **🏠 Dashboard**: Overview of orders and available products from suppliers
- **🔍 Product Browsing**: Search and filter products from multiple suppliers
- **🛍️ Shopping Cart**: Add products to cart with quantity management
- **📦 Order Management**: Place orders and track delivery status
- **📜 Order History**: Complete history of past orders with detailed tracking

## 🛠️ Tech Stack

- **Frontend**: React.js 18+ with modern hooks and context
- **Styling**: Tailwind CSS with custom design system
- **Backend**: Supabase (PostgreSQL + Auth + Real-time subscriptions)
- **Authentication**: Supabase Auth with Row Level Security (RLS)
- **Database**: PostgreSQL with automated triggers and functions
- **Icons**: Lucide React for consistent iconography
- **Routing**: React Router v6 with protected routes

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager
- Supabase account and project

## 🚀 Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd inventory-management-system
npm install
```

### 2. Database Setup

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project: `https://rqapzmhlyciiqxgtlrdf.supabase.co`
3. Go to the SQL Editor
4. Copy and paste the entire contents of `database_schema.sql`
5. Click "Run" to execute the schema

### 3. Environment Configuration

The Supabase configuration is pre-configured in `src/lib/supabase.js`:

```javascript
const supabaseUrl = 'https://rqapzmhlyciiqxgtlrdf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### 4. Start Development Server

```bash
npm start
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

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

## 📊 Database Schema

### Core Tables
- **profiles**: User profiles with role-based access (supplier/vendor)
- **categories**: Product categorization system
- **products**: Product catalog with inventory tracking
- **orders**: Order management with status tracking
- **order_items**: Individual line items within orders
- **inventory_transactions**: Complete audit trail of stock movements
- **suppliers/vendors**: Extended user-specific data

### Security Features
- **Row Level Security (RLS)**: All tables protected with user-specific policies
- **Automated Triggers**: Order numbering, stock updates, total calculations
- **Data Integrity**: Foreign key constraints and validation rules
- **Performance Optimization**: Strategic indexes for fast queries

## 🔐 Authentication & Security

- **Multi-role Authentication**: Separate login flows for suppliers and vendors
- **Row Level Security**: Users can only access their authorized data
- **Protected Routes**: Route-level protection based on user roles
- **Session Management**: Persistent login with automatic token refresh
- **Data Isolation**: Complete separation between supplier and vendor data

## 🎯 Key Components

### Supplier Interface
- `SupplierDashboard`: Main dashboard with key metrics
- `SupplierInventory`: Product and stock management
- `SupplierReports`: Analytics and reporting tools

### Vendor Interface
- `VendorDashboard`: Order overview and product discovery
- `VendorProducts`: Product browsing and search
- `VendorCart`: Shopping cart and checkout process
- `VendorOrders`: Order tracking and history

### Shared Components
- `AuthContext`: Global authentication state management
- `DataRefreshProvider`: Real-time data synchronization
- `ProtectedRoute`: Route protection based on user roles

## 📱 Responsive Design

- **Mobile-First**: Optimized for mobile devices
- **Tablet Support**: Enhanced layouts for tablet screens
- **Desktop Experience**: Full-featured desktop interface
- **Cross-Browser**: Compatible with modern browsers

## 🔄 Real-Time Features

- **Live Stock Updates**: Automatic inventory synchronization
- **Order Status Changes**: Real-time order tracking
- **Low Stock Alerts**: Instant notifications for suppliers
- **Dashboard Metrics**: Live updating of key performance indicators

## 🎯 Usage Examples

### For Suppliers

```javascript
import { productsAPI, dashboardAPI } from './lib/api';

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
import { productsAPI, ordersAPI } from './lib/api';

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

## 🧪 Usage Examples

### For Suppliers
1. **Sign up** as a supplier with company details
2. **Add products** to your inventory with categories, prices, and stock levels
3. **Manage orders** from vendors - confirm, ship, and track deliveries
4. **Monitor inventory** - get alerts for low stock items
5. **View reports** - analyze sales, revenue, and inventory performance

### For Vendors
1. **Sign up** as a vendor with business information
2. **Browse products** from different suppliers
3. **Add items to cart** and place orders
4. **Track orders** from placement to delivery
5. **View order history** and reorder frequently purchased items

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Deployment Options
- **Vercel**: Recommended for React applications
- **Netlify**: Easy deployment with continuous integration
- **AWS S3 + CloudFront**: Scalable static hosting
- **Supabase Hosting**: Direct deployment to Supabase platform

## 📈 Performance Optimizations

- **Code Splitting**: Lazy loading of route components
- **Memoization**: React.memo and useMemo for expensive operations
- **Database Indexing**: Optimized queries with proper indexes
- **Image Optimization**: Compressed and responsive images
- **Caching Strategy**: Efficient data caching and invalidation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the setup guide in `SETUP_GUIDE.md`

## 🎉 Acknowledgments

- Built with [React](https://reactjs.org/)
- Powered by [Supabase](https://supabase.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)

---

**Made with ❤️ for efficient inventory management**
