/* Copyright (c) 2015 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import { logger } from 'pc-nrfconnect-shared';
import SerialPort from 'serialport';
import { getScanRepeat, getDelay } from './reducer';

let port = null;

export const togglePauseAction = () => ({
    type: 'RSSI_PAUSE',
});
const serialPortOpenedAction = portName => ({
    type: 'RSSI_SERIAL_OPENED',
    portName,
});
const serialPortClosedAction = () => ({
    type: 'RSSI_SERIAL_CLOSED',
});
export const changeDelay = delay => ({
    type: 'RSSI_CHANGE_DELAY',
    delay,
});
export const changeMaxScans = maxScans => ({
    type: 'RSSI_CHANGE_MAX_SCANS',
    maxScans,
});
export const changeChannelScanRepeat = scanRepeat => ({
    type: 'RSSI_CHANGE_SCAN_REPEAT',
    scanRepeat,
});
export const changeAnimationDuration = animationDuration => ({
    type: 'RSSI_CHANGE_ANIMATION_DURATION',
    animationDuration,
});
export const setChannelRange = channelRange => ({
    type: 'RSSI_CHANNEL_RANGE_SET',
    channelRange,
});
export const setLevelRange = levelRange => ({
    type: 'RSSI_LEVEL_RANGE_SET',
    levelRange,
});

export const setRssiData = rawData => ({
    type: 'RSSI_DATA',
    rawData,
});

export const clearRssiData = () => ({
    type: 'RSSI_CLEAR_DATA',
});

const writeAndDrain = async cmd => {
    if (port) {
        await new Promise(resolve => {
            port.write(cmd, () => {
                port.drain(resolve);
            });
        });
    }
};

export const writeDelay = delay => writeAndDrain(`set delay ${delay}\r`);

export const writeScanRepeat = scanRepeat =>
    writeAndDrain(`set repeat ${scanRepeat}\r`);

export const toggleLED = () => writeAndDrain('led\r');

export const startReading = async (delay, scanRepeat) => {
    await writeDelay(delay);
    await writeScanRepeat(scanRepeat);

    await writeAndDrain('start\r');
};

export const stopReading = () => writeAndDrain('stop\r');

export const togglePause = (dispatch, isPaused, delay, scanRepeat) => {
    dispatch(togglePauseAction());

    if (isPaused) {
        startReading(delay, scanRepeat);
    } else {
        stopReading();
    }
};

const openWhenClosed = serialPort => (dispatch, getState) => {
    port = new SerialPort(serialPort.path, { baudRate: 115200 }, () => {
        logger.info(`${serialPort.path} is open`);
        dispatch(serialPortOpenedAction(serialPort.path));

        startReading(getDelay(getState()), getScanRepeat(getState()));

        port.on('data', data => dispatch(setRssiData(data)));
        port.on('error', console.log);
    });
};

export const close = () => async dispatch => {
    if (
        port &&
        (typeof port.isOpen === 'function' ? port.isOpen() : port.isOpen)
    ) {
        await stopReading();
        await new Promise(resolve => port.close(resolve));
        port = null;
    }
    logger.info('Serial port is closed');
    dispatch(clearRssiData());
    return dispatch(serialPortClosedAction());
};

export function open(serialPort) {
    return dispatch =>
        dispatch(close()).then(() => dispatch(openWhenClosed(serialPort)));
}
