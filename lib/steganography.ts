// Steganographic Vault Export/Import — Block 31
// Hides encrypted mnemonic in PNG pixel LSBs

// Aethilm magic bytes: AE 71 1A 4D
const MAGIC = new Uint8Array([0xAE, 0x71, 0x1A, 0x4D]);

function stringToBits(str: string): number[] {
  const bytes = new TextEncoder().encode(str);
  const bits: number[] = [];
  for (const byte of bytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
    }
  }
  return bits;
}

function bitsToString(bits: number[]): string {
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (bits[i + j] ?? 0);
    }
    bytes.push(byte);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

// Embed data into PNG canvas via LSB steganography
export async function embedInPNG(secretText: string, filename = 'copewallet'): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Black background with subtle gradient
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 180);
  gradient.addColorStop(0, '#0a0a0a');
  gradient.addColorStop(1, '#000000');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  // Add subtle noise
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const a = Math.random() * 0.03;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, 256, 256);
  const data = imageData.data;

  // Prepend magic bytes + length header
  const payload = JSON.stringify({ v: 1, d: secretText });
  const lengthBytes = new Uint32Array([payload.length]);
  const header = new Uint8Array([
    ...MAGIC,
    ...new Uint8Array(lengthBytes.buffer),
  ]);

  const fullPayload = String.fromCharCode(...header) + payload;
  const bits = stringToBits(fullPayload);

  // Embed bits into R channel LSBs
  for (let i = 0; i < bits.length && i < data.length / 4; i++) {
    data[i * 4] = (data[i * 4] & 0xFE) | bits[i];
  }

  ctx.putImageData(imageData, 0, 0);

  // Download as PNG
  const link = document.createElement('a');
  link.download = `${filename.replace(/\.png$/i, '')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Extract data from PNG — Block 31
// NOTE: header bytes extracted as raw Uint8Array (not via TextDecoder) to avoid
// multi-byte UTF-8 collapsing bytes and causing Invalid DataView length errors.
export async function extractFromPNG(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Invalid Key'));
    reader.onload = (e) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Invalid Key'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Invalid Key')); return; }
          ctx.drawImage(img, 0, 0);

          const pixelData = ctx.getImageData(0, 0, img.width, img.height).data;
          const totalPixels = img.width * img.height;

          // Pull all LSBs from R channel
          const allBits: number[] = new Array(totalPixels);
          for (let i = 0; i < totalPixels; i++) {
            allBits[i] = pixelData[i * 4] & 1;
          }

          // Decode header as raw bytes — bypass TextDecoder to avoid UTF-8 issues
          const HEADER_BYTES = 8; // 4 magic + 4 length
          const headerBytes = new Uint8Array(HEADER_BYTES);
          for (let i = 0; i < HEADER_BYTES; i++) {
            let byte = 0;
            for (let j = 0; j < 8; j++) {
              byte = (byte << 1) | (allBits[i * 8 + j] ?? 0);
            }
            headerBytes[i] = byte;
          }

          // Verify magic bytes
          for (let i = 0; i < 4; i++) {
            if (headerBytes[i] !== MAGIC[i]) {
              reject(new Error('Invalid Key'));
              return;
            }
          }

          const length = new DataView(headerBytes.buffer).getUint32(4, true);
          if (length <= 0 || length > totalPixels - HEADER_BYTES) {
            reject(new Error('Invalid Key'));
            return;
          }

          const payloadBits = allBits.slice(HEADER_BYTES * 8, HEADER_BYTES * 8 + length * 8);
          const payload = bitsToString(payloadBits);

          try {
            const parsed = JSON.parse(payload);
            resolve(parsed.d);
          } catch {
            reject(new Error('Invalid Key'));
          }
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Invalid Key'));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
