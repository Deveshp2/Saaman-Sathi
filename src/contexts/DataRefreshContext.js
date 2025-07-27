import React, { createContext, useContext, useState, useCallback } from 'react';

const DataRefreshContext = createContext();

export const useDataRefresh = () => {
  const context = useContext(DataRefreshContext);
  if (!context) {
    throw new Error('useDataRefresh must be used within a DataRefreshProvider');
  }
  return context;
};

export const DataRefreshProvider = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastPurchaseTime, setLastPurchaseTime] = useState(null);

  // Trigger a global data refresh
  const triggerRefresh = useCallback((reason = 'manual') => {
    console.log(`Data refresh triggered: ${reason}`);
    setRefreshTrigger(prev => prev + 1);
    
    if (reason === 'purchase') {
      setLastPurchaseTime(new Date());
    }
  }, []);

  // Trigger refresh after purchase
  const triggerPurchaseRefresh = useCallback((orderDetails = {}) => {
    console.log('Purchase completed, triggering data refresh:', orderDetails);
    setLastPurchaseTime(new Date());
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Check if data should be refreshed based on last purchase
  const shouldRefreshAfterPurchase = useCallback((componentLastRefresh) => {
    if (!lastPurchaseTime || !componentLastRefresh) return false;
    return lastPurchaseTime > componentLastRefresh;
  }, [lastPurchaseTime]);

  const value = {
    refreshTrigger,
    lastPurchaseTime,
    triggerRefresh,
    triggerPurchaseRefresh,
    shouldRefreshAfterPurchase
  };

  return (
    <DataRefreshContext.Provider value={value}>
      {children}
    </DataRefreshContext.Provider>
  );
};
