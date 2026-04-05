import Foundation
import NetworkExtension
import CoreTelephony

/// Native iOS module for managing WiFi Hotspot broadcasting.
///
/// On iOS, direct hotspot control is restricted. This module uses
/// NEHotspotConfigurationManager for WiFi configuration and provides
/// network status information. For full hotspot broadcasting, users
/// need to enable Personal Hotspot through iOS Settings.
@objc(HotspotModule)
class HotspotModule: RCTEventEmitter {

    private var isActive = false
    private var hasListeners = false

    override init() {
        super.init()
    }

    @objc override static func requiresMainQueueSetup() -> Bool {
        return false
    }

    override func supportedEvents() -> [String]! {
        return [
            "onDeviceConnected",
            "onDeviceDisconnected",
            "onDataUsageUpdated",
            "onHotspotStateChanged",
            "onNetworkChanged",
            "onHotspotError"
        ]
    }

    override func startObserving() {
        hasListeners = true
    }

    override func stopObserving() {
        hasListeners = false
    }

    /// Start the hotspot configuration.
    /// On iOS, this guides the user to enable Personal Hotspot
    /// and configures the network settings.
    @objc func startHotspot(_ config: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let ssid = config["ssid"] as? String ?? "MyMobileHotspot"
        let password = config["password"] as? String ?? "secure1234"

        if #available(iOS 11.0, *) {
            let hotspotConfig = NEHotspotConfiguration(
                ssid: ssid,
                passphrase: password,
                isWEP: false
            )
            hotspotConfig.joinOnce = false

            NEHotspotConfigurationManager.shared.apply(hotspotConfig) { [weak self] error in
                if let error = error as NSError? {
                    if error.domain == NEHotspotConfigurationErrorDomain {
                        switch error.code {
                        case NEHotspotConfigurationError.alreadyAssociated.rawValue:
                            // Already connected, treat as success
                            self?.isActive = true
                            resolve(["success": true, "ssid": ssid])
                            self?.emitStateChange(active: true, ssid: ssid)
                            return
                        case NEHotspotConfigurationError.userDenied.rawValue:
                            reject("USER_DENIED", "User denied the hotspot configuration", error)
                            return
                        default:
                            reject("HOTSPOT_ERROR", error.localizedDescription, error)
                            return
                        }
                    }
                    reject("HOTSPOT_ERROR", error.localizedDescription, error)
                    return
                }

                self?.isActive = true
                resolve(["success": true, "ssid": ssid])
                self?.emitStateChange(active: true, ssid: ssid)
            }
        } else {
            reject("UNSUPPORTED", "Hotspot configuration requires iOS 11 or later", nil)
        }
    }

    /// Stop the hotspot.
    @objc func stopHotspot(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        isActive = false
        resolve(["success": true])
        emitStateChange(active: false, ssid: "")
    }

    /// Get current hotspot status.
    @objc func getHotspotStatus(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let status: [String: Any] = [
            "isActive": isActive,
            "connectedDevices": [],
            "dataUsage": [
                "session": 0,
                "total": 0,
                "uploaded": 0,
                "downloaded": 0
            ]
        ]
        resolve(status)
    }

    /// Get connected devices (limited on iOS).
    @objc func getConnectedDevices(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        // iOS does not provide a public API to list devices connected to Personal Hotspot.
        // Return empty array; device count can be inferred from network interface monitoring.
        resolve([])
    }

    /// Get mobile network information.
    @objc func getNetworkInfo(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        var info: [String: Any] = [
            "carrierName": "Unknown",
            "networkType": "Unknown",
            "signalStrength": 0,
            "isUnlimitedPlan": false
        ]

        let networkInfo = CTTelephonyNetworkInfo()

        if let carrier = networkInfo.serviceSubscriberCellularProviders?.values.first {
            info["carrierName"] = carrier.carrierName ?? "Unknown"
        }

        if let radioAccess = networkInfo.serviceCurrentRadioAccessTechnology?.values.first {
            info["networkType"] = mapRadioAccessToName(radioAccess)
        }

        resolve(info)
    }

    /// Get data usage statistics.
    @objc func getDataUsage(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let usage: [String: Any] = [
            "session": 0,
            "total": 0,
            "uploaded": 0,
            "downloaded": 0
        ]
        resolve(usage)
    }

    /// Check permissions.
    @objc func checkPermissions(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        // On iOS, hotspot configuration does not require explicit permissions
        // beyond the entitlement in the app's capabilities.
        resolve(["granted": true])
    }

    /// Request permissions.
    @objc func requestPermissions(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(["granted": true])
    }

    // MARK: - Helpers

    private func emitStateChange(active: Bool, ssid: String) {
        guard hasListeners else { return }
        sendEvent(withName: "onHotspotStateChanged", body: [
            "isActive": active,
            "ssid": ssid
        ])
    }

    private func mapRadioAccessToName(_ radioAccess: String) -> String {
        switch radioAccess {
        case CTRadioAccessTechnologyLTE:
            return "4G LTE"
        case CTRadioAccessTechnologyWCDMA:
            return "3G"
        case CTRadioAccessTechnologyEdge:
            return "2G EDGE"
        case CTRadioAccessTechnologyGPRS:
            return "2G GPRS"
        default:
            if #available(iOS 14.1, *) {
                if radioAccess == CTRadioAccessTechnologyNRNSA || radioAccess == CTRadioAccessTechnologyNR {
                    return "5G"
                }
            }
            return "Unknown"
        }
    }
}
