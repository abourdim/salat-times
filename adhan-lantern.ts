// ═══════════════════════════════════════════════════════════
// ADHAN LANTERN — micro:bit V2 Firmware
// ═══════════════════════════════════════════════════════════
// Paste this into MakeCode TypeScript editor
// Requires: Bluetooth extension (removes Radio)
// Project Settings: "No Pairing Required" = ON
// ═══════════════════════════════════════════════════════════

// ------------ State ------------
let prayerTimes: string[] = ["--:--", "--:--", "--:--", "--:--", "--:--", "--:--"]
let prayerCodes: string[] = ["F", "S", "D", "A", "M", "I"]
let prayerNames: string[] = ["Fajr", "Shurq", "Dhuhr", "Asr", "Mgrb", "Isha"]
let nextPrayer = "F"
let minutesLeft = 0
let connected = false
let alertActive = false
let currentState = "idle"  // idle | warning | adhan | post | night
let rxBuffer = ""
let displayMode = 0  // 0=idle animation, 1=show next, 2=show countdown, 3=cycle all

// ------------ LED Patterns ------------

// Idle: single LED breathing (center pixel fades in/out)
function animIdle() {
    basic.clearScreen()
    for (let b = 0; b < 255; b += 25) {
        led.plotBrightness(2, 2, b)
        basic.pause(80)
    }
    for (let b = 255; b > 0; b -= 25) {
        led.plotBrightness(2, 2, b)
        basic.pause(80)
    }
}

// Warning: wave pattern radiating from center (5min before prayer)
function animWarning() {
    basic.clearScreen()
    // Ring 0: center
    led.plotBrightness(2, 2, 255)
    basic.pause(150)
    // Ring 1: adjacent 4
    for (let p of [[1, 2], [3, 2], [2, 1], [2, 3]]) {
        led.plotBrightness(p[0], p[1], 180)
    }
    basic.pause(150)
    // Ring 2: diagonals + edges
    for (let p of [[1, 1], [1, 3], [3, 1], [3, 3], [0, 2], [4, 2], [2, 0], [2, 4]]) {
        led.plotBrightness(p[0], p[1], 120)
    }
    basic.pause(150)
    // Ring 3: corners + remaining
    for (let p of [[0, 0], [0, 1], [0, 3], [0, 4], [1, 0], [1, 4], [3, 0], [3, 4], [4, 0], [4, 1], [4, 3], [4, 4]]) {
        led.plotBrightness(p[0], p[1], 60)
    }
    basic.pause(300)
    basic.clearScreen()
    basic.pause(200)
}

// Adhan: full burst geometric animation
function animAdhan() {
    // Star pattern burst
    for (let frame = 0; frame < 3; frame++) {
        basic.clearScreen()
        // Islamic star - 8 pointed
        basic.showLeds(`
            . . # . .
            . # # # .
            # # # # #
            . # # # .
            . . # . .
        `)
        basic.pause(200)
        basic.showLeds(`
            # . # . #
            . # . # .
            # . # . #
            . # . # .
            # . # . #
        `)
        basic.pause(200)
        basic.showLeds(`
            # # # # #
            # # # # #
            # # # # #
            # # # # #
            # # # # #
        `)
        basic.pause(300)
        basic.clearScreen()
        basic.pause(100)
    }
}

// Post-adhan: warm steady glow
function animPost() {
    for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
            led.plotBrightness(x, y, 40)
        }
    }
    basic.pause(2000)
}

// Night mode: faint single LED pulse
function animNight() {
    basic.clearScreen()
    for (let b = 0; b < 80; b += 10) {
        led.plotBrightness(2, 2, b)
        basic.pause(150)
    }
    for (let b = 80; b > 0; b -= 10) {
        led.plotBrightness(2, 2, b)
        basic.pause(150)
    }
}

// ------------ Adhan Melody (V2 Speaker) ------------
function playAdhanMelody() {
    // Simplified adhan-inspired melody using pentatonic scale
    // Allahu Akbar opening phrase pattern
    music.setVolume(180)
    music.setTempo(72)

    // Opening: Allahu Akbar (ascending)
    music.play(music.tonePlayable(Note.D4, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
    music.play(music.tonePlayable(Note.F4, music.beat(BeatFraction.Half)), music.PlaybackMode.UntilDone)
    music.play(music.tonePlayable(Note.G4, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
    basic.pause(200)

    // Repeat higher
    music.play(music.tonePlayable(Note.G4, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
    music.play(music.tonePlayable(Note.A4, music.beat(BeatFraction.Half)), music.PlaybackMode.UntilDone)
    music.play(music.tonePlayable(Note.Bb4, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
    basic.pause(200)

    // Descent
    music.play(music.tonePlayable(Note.A4, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
    music.play(music.tonePlayable(Note.G4, music.beat(BeatFraction.Half)), music.PlaybackMode.UntilDone)
    music.play(music.tonePlayable(Note.F4, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
    basic.pause(300)

    // Closing phrase
    music.play(music.tonePlayable(Note.G4, music.beat(BeatFraction.Half)), music.PlaybackMode.UntilDone)
    music.play(music.tonePlayable(Note.F4, music.beat(BeatFraction.Half)), music.PlaybackMode.UntilDone)
    music.play(music.tonePlayable(Note.D4, music.beat(BeatFraction.Double)), music.PlaybackMode.UntilDone)
}

// Short warning beep
function playWarningTick() {
    music.setVolume(60)
    music.play(music.tonePlayable(Note.C5, music.beat(BeatFraction.Sixteenth)), music.PlaybackMode.UntilDone)
}

// Iqama beeps
function playIqamaBeeps() {
    music.setVolume(150)
    for (let i = 0; i < 3; i++) {
        music.play(music.tonePlayable(Note.E5, music.beat(BeatFraction.Quarter)), music.PlaybackMode.UntilDone)
        basic.pause(150)
    }
}

// ------------ Serial + BLE helpers ------------
function logSerial(prefix: string, msg: string) {
    serial.writeLine(prefix + " " + msg)
}

function bleTx(msg: string) {
    logSerial("[TX]", msg.trim())
    bluetooth.uartWriteString(msg)
}

// ------------ UART Parser ------------
function parseUart(line: string) {
    logSerial("[RX]", line)
    // Echo back to app
    bleTx("ECHO:" + line + "\n")

    if (line.indexOf("HELLO") === 0) {
        connected = true
        // Welcome animation
        basic.showIcon(IconNames.Heart)
        basic.pause(500)
        basic.clearScreen()
        bleTx("READY\n")
    }
    else if (line.indexOf("TIMES:") === 0) {
        // TIMES:F06:43|S07:53|D13:03|A15:45|M18:15|I19:24|N=A|T=84
        let data = line.substr(6)
        let parts = data.split("|")
        for (let part of parts) {
            if (part.length >= 6 && part.charAt(1) >= "0" && part.charAt(1) <= "9") {
                // Prayer time: X##:##
                let code = part.charAt(0)
                let time = part.substr(1)
                for (let i = 0; i < prayerCodes.length; i++) {
                    if (prayerCodes[i] === code) {
                        prayerTimes[i] = time
                    }
                }
            }
            else if (part.indexOf("N=") === 0) {
                nextPrayer = part.substr(2)
            }
            else if (part.indexOf("T=") === 0) {
                minutesLeft = parseInt(part.substr(2))
                // Auto-detect state from minutes left
                if (minutesLeft <= 0) {
                    currentState = "adhan"
                } else if (minutesLeft <= 5) {
                    currentState = "warning"
                } else {
                    // Check if night (between Isha and Fajr)
                    // Simple heuristic: if next is Fajr and minutesLeft > 60
                    if (nextPrayer === "F" && minutesLeft > 60) {
                        currentState = "night"
                    } else {
                        currentState = "idle"
                    }
                }
            }
        }
    }
    else if (line.indexOf("ALERT:") === 0) {
        // ALERT:A = Asr time now! ALERT:T = test alert
        let code = line.substr(6)
        alertActive = true
        currentState = "adhan"
        // Find prayer name
        let name = code === "T" ? "Test" : "Prayer"
        for (let i = 0; i < prayerCodes.length; i++) {
            if (prayerCodes[i] === code) {
                name = prayerNames[i]
            }
        }
        // Full adhan sequence
        animAdhan()
        playAdhanMelody()
        animPost()
        basic.pause(1000)
        // Scroll prayer name
        basic.showString(name)
        basic.pause(500)
        currentState = "post"
        alertActive = false
        // Iqama after configurable delay (default 10 min simulated as short pause)
        basic.pause(3000)
        playIqamaBeeps()
        animPost()
        basic.pause(2000)
        currentState = "idle"
    }
}

// ------------ UART RX with buffer ------------
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    let data = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine))
    if (data.trim().length > 0) {
        parseUart(data.trim())
    }
})

// ------------ Bluetooth Events ------------
bluetooth.onBluetoothConnected(function () {
    connected = true
    logSerial("[BLE]", "Connected")
    basic.showIcon(IconNames.Yes)
    basic.pause(400)
    basic.clearScreen()
})

bluetooth.onBluetoothDisconnected(function () {
    connected = false
    logSerial("[BLE]", "Disconnected")
    basic.showIcon(IconNames.No)
    basic.pause(400)
    basic.clearScreen()
})

// ------------ Button Handlers ------------

// Button A: show next prayer name + time
input.onButtonPressed(Button.A, function () {
    if (alertActive) return
    logSerial("[BTN]", "A pressed — next: " + nextPrayer)
    displayMode = 1
    let name = "?"
    let time = "--:--"
    for (let i = 0; i < prayerCodes.length; i++) {
        if (prayerCodes[i] === nextPrayer) {
            name = prayerNames[i]
            time = prayerTimes[i]
        }
    }
    basic.showString(name)
    basic.pause(300)
    basic.showString(time)
    basic.pause(500)
    basic.clearScreen()
    displayMode = 0
})

// Button B: show minutes remaining
input.onButtonPressed(Button.B, function () {
    if (alertActive) return
    logSerial("[BTN]", "B pressed — " + minutesLeft + "min left")
    displayMode = 2
    basic.showNumber(minutesLeft)
    basic.pause(300)
    basic.showString("m")
    basic.pause(500)
    basic.clearScreen()
    displayMode = 0
})

// Touch logo (V2): cycle through all prayer times
input.onLogoEvent(TouchButtonEvent.Pressed, function () {
    if (alertActive) return
    logSerial("[BTN]", "Logo touched — cycling all times")
    displayMode = 3
    for (let i = 0; i < 6; i++) {
        basic.showString(prayerCodes[i])
        basic.pause(200)
        basic.showString(prayerTimes[i])
        basic.pause(400)
    }
    basic.clearScreen()
    displayMode = 0
})

// ------------ Main Loop ------------
let loopCount = 0
basic.forever(function () {
    // Don't animate during button display or alert
    if (displayMode !== 0 || alertActive) {
        basic.pause(100)
        return
    }

    switch (currentState) {
        case "warning":
            animWarning()
            loopCount++
            // Tick sound every ~10 seconds
            if (loopCount % 8 === 0) {
                playWarningTick()
            }
            break
        case "post":
            animPost()
            break
        case "night":
            animNight()
            break
        case "idle":
        default:
            animIdle()
            break
    }
})

// ------------ Startup ------------
serial.setBaudRate(BaudRate.BaudRate115200)
logSerial("[SYS]", "Adhan Lantern v1.2 booting")
bluetooth.startUartService()
basic.showString("SLT")
basic.pause(300)
basic.clearScreen()
logSerial("[SYS]", "Ready — waiting for BLE connection")
