package com.qccontrol.mobile;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        if (BuildConfig.QC_DIRECT_GEMINI_ENABLED) {
            try {
                registerPlugin(Class.forName("com.qccontrol.mobile.GeminiPlugin").asSubclass(Plugin.class));
            } catch (ClassNotFoundException exception) {
                throw new IllegalStateException("Development Gemini plugin is missing", exception);
            }
        }
        registerPlugin(QcUsbPlugin.class);
        registerPlugin(QcRelayPlugin.class);
        registerPlugin(VoiceInputPlugin.class);
        registerPlugin(ScreenWakePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
