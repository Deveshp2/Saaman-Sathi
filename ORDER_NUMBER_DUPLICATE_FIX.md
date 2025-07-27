# Fix for Order Number Duplicate Key Constraint Issue

## Problem Description
The vendor cart functionality was experiencing a "duplicate key value violates unique constraint 'orders_order_number_key'" error when multiple orders were created simultaneously from the cart.

## Root Cause
The issue occurred because of multiple problems:
1. **Column Default Value**: The `order_number` column had a default value that was overriding the trigger function
2. **Parallel Order Creation**: The cart purchase function used `Promise.all()` to create multiple orders simultaneously
3. **Race Condition**: Multiple orders created at the exact same time could generate identical order numbers
4. **Table Name Mismatch**: API code referenced `profiles` table but actual table was `user_profiles`
5. **Case Sensitivity**: Database had "Supplier" but code expected "supplier"

## Solution Implemented

### 1. Fixed Database Column Default
**Database**: Removed the conflicting default value from `order_number` column
- The column had a default value using `EXTRACT(epoch FROM now())` which was causing duplicates
- Removed the default so the trigger function can properly generate unique order numbers

```sql
ALTER TABLE orders ALTER COLUMN order_number DROP DEFAULT;
```

### 2. Fixed Table Name References
**Files**: `src/lib/api.js`, `src/lib/authUtils.js`, `src/contexts/AuthContext.js`
- Updated all references from `profiles` table to `user_profiles`
- Fixed foreign key references in API queries
- This was preventing proper authentication and order creation

### 3. Fixed Case Sensitivity Issue
**Database**: Updated user_type values and constraints
- Changed database constraint to accept lowercase values ('vendor', 'supplier')
- Updated existing data from 'Supplier' to 'supplier'
- This fixed authentication failures

```sql
-- Drop old constraint, update data, add new constraint
ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_user_type_check;
UPDATE user_profiles SET user_type = LOWER(user_type);
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_type_check
CHECK (user_type IN ('vendor', 'supplier'));
```

### 4. Sequential Order Processing
**File**: `src/components/vendor/VendorCart.js`
- Changed from parallel (`Promise.all()`) to sequential order creation
- Added small delays between order creations to ensure unique timestamps
- This prevents multiple orders from being created at the exact same microsecond

```javascript
// Before (Parallel - Problematic)
const orderPromises = Object.entries(itemsBySupplier).map(async ([supplierId, items]) => {
  // ... order creation logic
});
await Promise.all(orderPromises);

// After (Sequential - Fixed)
const createdOrders = [];
for (const [supplierId, items] of Object.entries(itemsBySupplier)) {
  // ... order creation logic
  await ordersAPI.create(orderData);
  // Small delay to ensure unique timestamps
  if (createdOrders.length < Object.keys(itemsBySupplier).length) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
```

### 2. Enhanced Order Number Generation
**Database Function**: `generate_timestamp_order_number()`
- Increased random component from 3 digits (0-999) to 4 digits (0-9999)
- This reduces collision probability by 10x
- Order numbers now format: `ORD-YYYY-MM-DD-HH-MI-SS-MICROSECONDS-XXXX`

```sql
CREATE OR REPLACE FUNCTION generate_timestamp_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ORD-' || 
                     TO_CHAR(NOW(), 'YYYY-MM-DD-HH24-MI-SS-US') || '-' ||
                     LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3. Retry Mechanism
**File**: `src/lib/api.js`
- Added automatic retry logic in the `ordersAPI.create()` function
- Detects unique constraint violations and retries up to 3 times
- Includes random delay between retries to reduce collision probability

```javascript
create: async (orderData, retryCount = 0) => {
  const maxRetries = 3;
  try {
    // ... order creation logic
  } catch (error) {
    if (error.code === '23505' && error.message.includes('orders_order_number_key') && retryCount < maxRetries) {
      console.warn(`Order number collision detected, retrying... (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
      return ordersAPI.create(orderData, retryCount + 1);
    }
    throw error;
  }
}
```

## Benefits of This Solution

1. **Eliminates Root Cause**: Fixed the database column default that was causing duplicates
2. **Proper Authentication**: Fixed table name mismatches enabling proper user authentication
3. **Eliminates Race Conditions**: Sequential processing prevents simultaneous order creation
4. **Increased Uniqueness**: Enhanced random component reduces collision probability
5. **Fault Tolerance**: Retry mechanism handles edge cases gracefully
6. **Minimal Performance Impact**: Small delays (10ms) are negligible for user experience
7. **Backward Compatible**: No changes required to existing order data or UI
8. **Consistent Data**: Fixed case sensitivity issues for reliable user type checking

## Testing Recommendations

1. **Load Testing**: Test cart purchases with multiple items from different suppliers
2. **Concurrent Testing**: Simulate multiple users purchasing simultaneously
3. **Edge Case Testing**: Test with rapid successive purchases
4. **Database Monitoring**: Monitor for any remaining unique constraint violations

## Alternative Solutions Considered

1. **UUID-based Order Numbers**: Would eliminate collisions but reduces readability
2. **Database Sequences**: More complex to implement with monthly resets
3. **Application-level Locking**: Would require additional infrastructure

The implemented solution provides the best balance of reliability, simplicity, and maintainability.

## Additional Fixes Applied

### Sign-in "User profile not found" Error
During testing, we discovered additional issues that were causing sign-in failures:

1. **Column Name Mismatch**: The code was querying for `company_name` but the database table had `business_name`
   - Fixed in: `AuthContext.js`, `authUtils.js`, `api.js`
   - Changed all references from `company_name` to `business_name`

2. **Database Trigger Function**: Updated `handle_new_user()` function to use lowercase user types
   - Fixed case sensitivity issues in user profile creation
   - Ensures new users get proper profiles with correct user_type values

3. **User Type Constraint**: Updated database constraint to accept lowercase values
   ```sql
   ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_user_type_check;
   UPDATE user_profiles SET user_type = LOWER(user_type);
   ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_type_check
   CHECK (user_type IN ('vendor', 'supplier'));
   ```

These fixes ensure that:
- User sign-in works properly without "User profile not found" errors
- New user registration creates profiles correctly
- All API queries use the correct column names
- User type validation works consistently
