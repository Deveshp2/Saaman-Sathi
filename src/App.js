import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import SignUp from './components/SignUp';
import SignIn from './components/SignIn';
import SupplierDashboard from './components/supplier/SupplierDashboard';
import SupplierInventory from './components/supplier/SupplierInventory';
import SupplierReports from './components/supplier/SupplierReports';
import VendorDashboard from './components/vendor/VendorDashboard';
import VendorOrders from './components/vendor/VendorOrders';
import VendorProducts from './components/vendor/VendorProducts';
import VendorCart from './components/vendor/VendorCart';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { DataRefreshProvider } from './contexts/DataRefreshContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <DataRefreshProvider>
        <Router>
          <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />
            
            {/* Supplier Routes */}
            <Route 
              path="/supplier/dashboard" 
              element={
                <ProtectedRoute userType="supplier">
                  <SupplierDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/supplier/inventory" 
              element={
                <ProtectedRoute userType="supplier">
                  <SupplierInventory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/supplier/reports" 
              element={
                <ProtectedRoute userType="supplier">
                  <SupplierReports />
                </ProtectedRoute>
              } 
            />
            
            {/* Vendor Routes */}
            <Route
              path="/vendor/dashboard"
              element={
                <ProtectedRoute userType="vendor">
                  <CartProvider>
                    <VendorDashboard />
                  </CartProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/orders"
              element={
                <ProtectedRoute userType="vendor">
                  <CartProvider>
                    <VendorOrders />
                  </CartProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/products"
              element={
                <ProtectedRoute userType="vendor">
                  <CartProvider>
                    <VendorProducts />
                  </CartProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/cart"
              element={
                <ProtectedRoute userType="vendor">
                  <CartProvider>
                    <VendorCart />
                  </CartProvider>
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </div>
        </Router>
      </DataRefreshProvider>
    </AuthProvider>
  );
}

export default App;
