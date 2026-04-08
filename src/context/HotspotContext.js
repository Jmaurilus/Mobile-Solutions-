import React, { createContext, useContext, useReducer, useCallback } from 'react';

const HotspotContext = createContext(null);

const initialState = {
  // Proxy state
  proxyRunning: false,
  proxyPort: 8080,
  proxyIp: '192.168.43.1',
  bytesTransferred: 0,
  activeConnections: 0,

  // Network state
  hasMobileData: false,
  carrierName: '',
  networkType: '',
  hotspotIp: '',

  // Connected devices (from ARP table)
  connectedDevices: [],

  // UI state
  error: null,
  isLoading: false,

  // Steps tracking for the POC flow
  steps: {
    hotspotEnabled: false,  // user enabled system hotspot
    proxyStarted: false,    // proxy server is running
    deviceConnected: false, // at least one device seen in ARP
    trafficFlowing: false,  // bytes transferred > 0
  },
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'PROXY_STARTED':
      return {
        ...state,
        proxyRunning: true,
        proxyPort: action.payload.port,
        proxyIp: action.payload.ip,
        isLoading: false,
        error: null,
        steps: { ...state.steps, proxyStarted: true },
      };

    case 'PROXY_STOPPED':
      return {
        ...state,
        proxyRunning: false,
        bytesTransferred: 0,
        activeConnections: 0,
        isLoading: false,
        steps: { ...state.steps, proxyStarted: false, trafficFlowing: false },
      };

    case 'PROXY_STATUS_UPDATE':
      return {
        ...state,
        bytesTransferred: action.payload.bytesTransferred,
        activeConnections: action.payload.activeConnections,
        steps: {
          ...state.steps,
          trafficFlowing: action.payload.bytesTransferred > 0,
        },
      };

    case 'UPDATE_NETWORK':
      return {
        ...state,
        hasMobileData: action.payload.hasMobileData ?? state.hasMobileData,
        carrierName: action.payload.carrierName ?? state.carrierName,
        networkType: action.payload.networkType ?? state.networkType,
        hotspotIp: action.payload.hotspotIp ?? state.hotspotIp,
      };

    case 'SET_HOTSPOT_ENABLED':
      return {
        ...state,
        steps: { ...state.steps, hotspotEnabled: action.payload },
      };

    case 'UPDATE_DEVICES':
      return {
        ...state,
        connectedDevices: action.payload,
        steps: { ...state.steps, deviceConnected: action.payload.length > 0 },
      };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    default:
      return state;
  }
}

export function HotspotProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setLoading = useCallback((v) => dispatch({ type: 'SET_LOADING', payload: v }), []);
  const proxyStarted = useCallback((data) => dispatch({ type: 'PROXY_STARTED', payload: data }), []);
  const proxyStopped = useCallback(() => dispatch({ type: 'PROXY_STOPPED' }), []);
  const updateProxyStatus = useCallback((data) => dispatch({ type: 'PROXY_STATUS_UPDATE', payload: data }), []);
  const updateNetwork = useCallback((data) => dispatch({ type: 'UPDATE_NETWORK', payload: data }), []);
  const setHotspotEnabled = useCallback((v) => dispatch({ type: 'SET_HOTSPOT_ENABLED', payload: v }), []);
  const updateDevices = useCallback((d) => dispatch({ type: 'UPDATE_DEVICES', payload: d }), []);
  const setError = useCallback((e) => dispatch({ type: 'SET_ERROR', payload: e }), []);

  return (
    <HotspotContext.Provider value={{
      state, dispatch,
      setLoading, proxyStarted, proxyStopped, updateProxyStatus,
      updateNetwork, setHotspotEnabled, updateDevices, setError,
    }}>
      {children}
    </HotspotContext.Provider>
  );
}

export function useHotspot() {
  const ctx = useContext(HotspotContext);
  if (!ctx) throw new Error('useHotspot must be used within HotspotProvider');
  return ctx;
}
