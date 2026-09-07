use std::time::{Duration, Instant};

#[derive(Default)]
pub struct PerformanceMidi {
    last_sent: Option<Instant>,
    handle: Option<usize>,
    endpoint: Option<String>,
}

pub struct PerformanceMidiReceipt {
    pub endpoint: String,
    pub dispatch_latency_ms: f64,
    pub throttle_delay_ms: f64,
}

impl PerformanceMidi {
    pub fn warm_up(&mut self) -> Result<String, String> {
        if self.handle.is_none() {
            let (handle, endpoint) = open_qc_midi_output()?;
            self.handle = Some(handle);
            self.endpoint = Some(endpoint);
        }
        Ok(self
            .endpoint
            .clone()
            .unwrap_or_else(|| "Quad Cortex MIDI".into()))
    }

    pub fn send(&mut self, controller: u8, value: u8) -> Result<PerformanceMidiReceipt, String> {
        self.send_raw(
            u32::from(qc_protocol::profile::MIDI_CONTROL_CHANGE_STATUS)
                | ((controller as u32) << 8)
                | ((value as u32) << 16),
        )
    }

    fn send_raw(&mut self, message: u32) -> Result<PerformanceMidiReceipt, String> {
        let queued_at = Instant::now();
        let mut throttle_delay = Duration::ZERO;
        if let Some(last_sent) = self.last_sent {
            let elapsed = last_sent.elapsed();
            let gap = Duration::from_millis(qc_protocol::profile::PERFORMANCE_MIDI_GAP_MS);
            if elapsed < gap {
                throttle_delay = gap - elapsed;
                // Windows' ordinary Sleep timer can overshoot this 8 ms device
                // pacing interval by tens of milliseconds. The wait is short,
                // bounded, and only occurs for back-to-back performance MIDI,
                // so keep it precise instead of injecting audible control lag.
                let deadline = Instant::now() + throttle_delay;
                while Instant::now() < deadline {
                    std::hint::spin_loop();
                }
            }
        }
        self.warm_up()?;
        if let Err(error) =
            send_qc_midi_short(self.handle.expect("MIDI handle was initialized"), message)
        {
            close_qc_midi_output(self.handle.take());
            self.endpoint = None;
            return Err(error);
        }
        self.last_sent = Some(Instant::now());
        Ok(PerformanceMidiReceipt {
            endpoint: self
                .endpoint
                .clone()
                .unwrap_or_else(|| "Quad Cortex MIDI".into()),
            dispatch_latency_ms: queued_at.elapsed().as_secs_f64() * 1000.0,
            throttle_delay_ms: throttle_delay.as_secs_f64() * 1000.0,
        })
    }
}

impl Drop for PerformanceMidi {
    fn drop(&mut self) {
        close_qc_midi_output(self.handle.take());
    }
}

#[cfg(windows)]
fn open_qc_midi_output() -> Result<(usize, String), String> {
    use std::ptr::null_mut;
    use windows_sys::Win32::Media::Audio::{
        midiOutGetDevCapsW, midiOutGetNumDevs, midiOutOpen, HMIDIOUT, MIDIOUTCAPSW,
    };

    let mut endpoint = None;
    for device_id in 0..unsafe { midiOutGetNumDevs() } {
        let mut caps = MIDIOUTCAPSW::default();
        let result = unsafe {
            midiOutGetDevCapsW(
                device_id as usize,
                &mut caps,
                std::mem::size_of::<MIDIOUTCAPSW>() as u32,
            )
        };
        if result != 0 {
            continue;
        }
        let name_units = caps.szPname;
        let end = name_units
            .iter()
            .position(|unit| *unit == 0)
            .unwrap_or(name_units.len());
        let name = String::from_utf16_lossy(&name_units[..end]);
        if name.to_lowercase().contains("quad cortex") {
            endpoint = Some((device_id, name));
            break;
        }
    }
    let (device_id, name) = endpoint.ok_or_else(|| {
        "Quad Cortex Windows MIDI output was not found. Enable MIDI over USB and reconnect."
            .to_string()
    })?;
    let mut handle: HMIDIOUT = null_mut();
    let opened = unsafe { midiOutOpen(&mut handle, device_id, 0, 0, 0) };
    if opened != 0 {
        return Err(format!(
            "Could not open the Quad Cortex MIDI output (Windows MIDI error {opened})."
        ));
    }
    Ok((handle as usize, name))
}

#[cfg(windows)]
fn send_qc_midi_short(handle: usize, message: u32) -> Result<(), String> {
    use windows_sys::Win32::Media::Audio::midiOutShortMsg;

    let sent = unsafe { midiOutShortMsg(handle as _, message) };
    if sent != 0 {
        return Err(format!(
            "Could not send the Quad Cortex MIDI command (Windows MIDI error {sent})."
        ));
    }
    Ok(())
}

#[cfg(not(windows))]
fn open_qc_midi_output() -> Result<(usize, String), String> {
    Err("QC performance control currently requires Windows MIDI.".into())
}

#[cfg(not(windows))]
fn send_qc_midi_short(_handle: usize, _message: u32) -> Result<(), String> {
    Err("QC performance control currently requires Windows MIDI.".into())
}

#[cfg(windows)]
fn close_qc_midi_output(handle: Option<usize>) {
    use windows_sys::Win32::Media::Audio::midiOutClose;

    if let Some(handle) = handle {
        unsafe { midiOutClose(handle as _) };
    }
}

#[cfg(not(windows))]
fn close_qc_midi_output(_handle: Option<usize>) {}
