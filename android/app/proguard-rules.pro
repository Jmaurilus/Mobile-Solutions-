# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.react.**

# Our proxy server
-keep class com.mobilehotspot.ProxyServer { *; }
-keep class com.mobilehotspot.HotspotModule { *; }

# Keep native module methods
-keepclassmembers class com.mobilehotspot.HotspotModule {
    @com.facebook.react.bridge.ReactMethod *;
}
