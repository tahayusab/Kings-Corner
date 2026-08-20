async function getKey(password) {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  const keyHash = await window.crypto.subtle.digest('SHA-256', passwordBytes);
  return await window.crypto.subtle.importKey(
    'raw',
    keyHash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptData(plaintext, password) {
  try {
    const key = await getKey(password);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext)
    );
    const result = new Uint8Array(iv.length + ciphertext.byteLength);
    result.set(iv);
    result.set(new Uint8Array(ciphertext), iv.length);
    return arrayBufferToBase64(result.buffer);
  } catch (err) {
    console.error("Encryption error", err);
    throw err;
  }
}

export async function decryptData(encryptedBase64, password) {
  try {
    const key = await getKey(password);
    const encryptedBytes = new Uint8Array(base64ToArrayBuffer(encryptedBase64));
    const iv = encryptedBytes.slice(0, 12);
    const ciphertext = encryptedBytes.slice(12);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (err) {
    console.error("Decryption error", err);
    throw err;
  }
}
