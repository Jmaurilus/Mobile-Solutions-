import Foundation

/**
 * iOS stub for the HotspotModule.
 *
 * iOS does not allow apps to programmatically create WiFi hotspots or run
 * proxy servers that bind to the hotspot interface. The Personal Hotspot
 * feature is controlled entirely by iOS Settings.
 *
 * This POC is Android-focused. On iOS, the app will display instructions
 * for enabling Personal Hotspot manually.
 */
@objc(HotspotModule)
class HotspotModule: RCTEventEmitter {

    override init() {
        super.init()
    }

    @objc override static func requiresMainQueueSetup() -> Bool {
        return false
    }

    override func supportedEvents() -> [String]! {
        return ["onProxyStatusUpdate"]
    }

    override func startObserving() {}
    override func stopObserving() {}

    @objc func startProxy(_ port: Int, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        reject("UNSUPPORTED", "Proxy server is not supported on iOS. Use Android for this POC.", nil)
    }

    @objc func stopProxy(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(["success": true])
    }

    @objc func getProxyStatus(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve([
            "isRunning": false,
            "port": 8080,
            "ip": "0.0.0.0",
            "bytesTransferred": 0,
            "activeConnections": 0
        ])
    }

    @objc func openHotspotSettings(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            if let url = URL(string: "App-Prefs:root=INTERNET_TETHERING") {
                if UIApplication.shared.canOpenURL(url) {
                    UIApplication.shared.open(url)
                    resolve(["success": true])
                    return
                }
            }
            // Fallback: open general settings
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
            }
            resolve(["success": true])
        }
    }

    @objc func checkMobileData(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(["hasMobileData": false, "hasWifi": false, "isReady": false])
    }

    @objc func getNetworkInfo(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(["carrierName": "Unknown", "networkType": "Unknown", "hotspotIp": "172.20.10.1"])
    }

    @objc func getConnectedDevices(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve([])
    }
}
