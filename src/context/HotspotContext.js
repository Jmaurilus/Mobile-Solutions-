import React, { createContext, useContext, useReducer, useCallback } from 'react';

const HotspotContext = createContext(null);

const initialState = {
  isActive: false,
  ssid: 'MyMobileHotspot',
  password: 'secure1234',
  securityType: 'WPA2',
  band: '2.4GHz',
  connectedDevices: [],
  dataUsage: {
    session: 0,     // bytes used this session
    total: 0,       // bytes used all-time
    uploaded: 0,
    downloaded: 0,
  },
  networkInfo: {
    carrierName: '',
    networkType: '',  // 4G, 5G, LTE
    signalStrength: 0,
    isUnlimitedPlan: false,
  },
  error: null,
  isLoading: false,
};

function hotspotReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'HOTSPOT_STARTED':
      return { ...state, isActive: true, isLoading: false, error: null };

    case 'HOTSPOT_STOPPED':
      return { ...state, isActive: false, isLoading: false, connectedDevices: [] };

    case 'UPDATE_CONFIG':
      return { ...state, ...action.payload };

    case 'DEVICE_CONNECTED':
      return {
        ...state,
        connectedDevices: [...state.connectedDevices, action.payload],
      };

    case 'DEVICE_DISCONNECTED':
      return {
        ...state,
        connectedDevices: state.connectedDevices.filter(
          (d) => d.macAddress !== action.payload.macAddress
        ),
      };

    case 'UPDATE_CONNECTED_DEVICES':
      return { ...state, connectedDevices: action.payload };

    case 'UPDATE_DATA_USAGE':
      return { ...state, dataUsage: { ...state.dataUsage, ...action.payload } };

    case 'UPDATE_NETWORK_INFO':
      return { ...state, networkInfo: { ...state.networkInfo, ...action.payload } };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

export function HotspotProvider({ children }) {
  const [state, dispatch] = useReducer(hotspotReducer, initialState);

  const startHotspot = useCallback(() => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'HOTSPOT_STARTED' });
  }, []);

  const stopHotspot = useCallback(() => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'HOTSPOT_STOPPED' });
  }, []);

  const updateConfig = useCallback((config) => {
    dispatch({ type: 'UPDATE_CONFIG', payload: config });
  }, []);

  const updateDataUsage = useCallback((usage) => {
    dispatch({ type: 'UPDATE_DATA_USAGE', payload: usage });
  }, []);

  const updateNetworkInfo = useCallback((info) => {
    dispatch({ type: 'UPDATE_NETWORK_INFO', payload: info });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const value = {
    state,
    dispatch,
    startHotspot,
    stopHotspot,
    updateConfig,
    updateDataUsage,
    updateNetworkInfo,
    setError,
  };

  return (
    <HotspotContext.Provider value={value}>
      {children}
    </HotspotContext.Provider>
  );
}

export function useHotspot() {
  const context = useContext(HotspotContext);
  if (!context) {
    throw new Error('useHotspot must be used within a HotspotProvider');
  }
  return context;
}

export default HotspotContext;
