package com.pistream.app;

import android.os.Bundle;
import android.widget.Button;
import android.widget.Toast;
import androidx.activity.ComponentActivity;
import androidx.annotation.Nullable;

public class MainActivity extends ComponentActivity {
    static { System.loadLibrary("native-lib"); }

    public native int sendFrame(byte[] rgba, int w, int h, int port, String host);

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        Button btn = findViewById(R.id.btn_send_sample);
        btn.setOnClickListener(v -> {
            byte[] dummy = new byte[100];
            int res = sendFrame(dummy, 10, 10, 5000, "127.0.0.1");
            Toast.makeText(this, "sendFrame returned " + res, Toast.LENGTH_SHORT).show();
        });
    }
}
