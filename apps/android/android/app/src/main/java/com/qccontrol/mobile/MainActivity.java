package com.qccontrol.mobile;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GeminiPlugin.class);
        registerPlugin(QcUsbPlugin.class);
        registerPlugin(QcRelayPlugin.class);
        registerPlugin(VoiceInputPlugin.class);
        registerPlugin(ScreenWakePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
