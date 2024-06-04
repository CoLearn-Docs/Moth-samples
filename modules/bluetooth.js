// 블루투스 연결 및 메시지 전송을 위한 함수
const writeGATTCharacteristic = async (txCharacteristic, chunk) => {
  try {
    await txCharacteristic.writeValue(new TextEncoder().encode(chunk));
    console.log(`Message sent: ${chunk}`);
  } catch (error) {
    console.error(`Error sending message: ${error}`);
    throw error;
  }
};

/**
 * 블루투스 연결
 */
async function connectToBluetoothDevice(
  deviceNamePrefix,
  serviceUUID,
  txCharacteristicUUID
) {
  const options = {
    filters: [
      { namePrefix: deviceNamePrefix },
      { services: [serviceUUID] },
    ].filter(Boolean),
  };

  try {
    let device = await navigator.bluetooth.requestDevice(options);
    console.log("Found Bluetooth device: ", device);

    console.log("Connecting to GATT Server...");
    const server = await device.gatt?.connect();

    console.log("Getting UART Service...");
    const service = await server?.getPrimaryService(serviceUUID);

    console.log("Getting UART TX Characteristic...");
    const txCharacteristic = await service?.getCharacteristic(
      txCharacteristicUUID
    );
    console.log("txCharacteristic: ", txCharacteristic);
    return { device, txCharacteristic };
  } catch (error) {
    console.error(error);
  }
}

/**
 * 블루투스 연결 해제
 */
function disconnectFromBluetoothDevice(device) {
  if (device.gatt?.connected) {
    device.gatt.disconnect();
  } else {
    console.log("Bluetooth Device is already disconnected");
  }
}

/**
 * 길이 제한이 있는 text를 전송할 때 사용
 */
async function sendMessageToDeviceOverBluetooth(
  message,
  maxTransferSize = 15,
  txCharacteristic
) {
  const MAX_MESSAGE_LENGTH = maxTransferSize;
  const messageArray = [];

  // Split message into smaller chunks
  while (message.length > 0) {
    const chunk = message.slice(0, MAX_MESSAGE_LENGTH);
    message = message.slice(MAX_MESSAGE_LENGTH);
    messageArray.push(chunk);
  }

  if (messageArray.length > 1) {
    messageArray[0] = `${messageArray[0]}#${messageArray.length}$`;
    for (let i = 1; i < messageArray.length; i++) {
      messageArray[i] = `${messageArray[i]}$`;
    }
  }

  // Check GATT operations is ready to write
  if (txCharacteristic?.properties.write) {
    for (const chunk of messageArray) {
      await writeGATTCharacteristic(txCharacteristic, chunk);
    }
  }
}

/**
 * 길이 제한이 없는 text를 전송할 때 사용
 */
async function sendTextToDeviceOverBluetooth(text, txCharacteristic) {
  await writeGATTCharacteristic(txCharacteristic, text);
}

const useBluetooth = {
  connectToBluetoothDevice,
  disconnectFromBluetoothDevice,
  sendMessageToDeviceOverBluetooth,
  sendTextToDeviceOverBluetooth,
};
export default useBluetooth;
