(function () {
  const QR_CONFIG = {
    L: [{ version: 1, data: 19, ecc: 7 }, { version: 2, data: 34, ecc: 10 }, { version: 3, data: 55, ecc: 15 }, { version: 4, data: 80, ecc: 20 }, { version: 5, data: 108, ecc: 26 }],
    M: [{ version: 1, data: 16, ecc: 10 }, { version: 2, data: 28, ecc: 16 }, { version: 3, data: 44, ecc: 26 }],
    Q: [{ version: 1, data: 13, ecc: 13 }, { version: 2, data: 22, ecc: 22 }],
    H: [{ version: 1, data: 9, ecc: 17 }, { version: 2, data: 16, ecc: 28 }],
  };

  const FORMAT_EC_BITS = { M: 0, L: 1, H: 2, Q: 3 };
  const PAD_CODEWORDS = [0xec, 0x11];

  function getBit(value, index) {
    return ((value >>> index) & 1) !== 0;
  }

  function appendBits(bits, value, length) {
    for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
  }

  function chooseConfig(byteLength, requestedLevel) {
    const levels = [requestedLevel, 'M', 'L'];
    for (const level of levels) {
      const configs = QR_CONFIG[level] || [];
      const match = configs.find((config) => byteLength <= Math.floor((config.data * 8 - 12) / 8));
      if (match) return { ...match, level };
    }
    throw new Error('This local QR generator supports up to 106 bytes. Shorten the text or URL.');
  }

  function createDataCodewords(text, config) {
    const bytes = Array.from(new TextEncoder().encode(text));
    const bits = [];
    appendBits(bits, 0b0100, 4);
    appendBits(bits, bytes.length, 8);
    bytes.forEach((byte) => appendBits(bits, byte, 8));

    const capacityBits = config.data * 8;
    appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
    while (bits.length % 8) bits.push(0);

    const codewords = [];
    for (let i = 0; i < bits.length; i += 8) {
      codewords.push(bits.slice(i, i + 8).reduce((value, bit) => (value << 1) | bit, 0));
    }

    for (let i = 0; codewords.length < config.data; i += 1) {
      codewords.push(PAD_CODEWORDS[i % 2]);
    }
    return codewords;
  }

  function gfMultiply(left, right) {
    let result = 0;
    for (let i = 7; i >= 0; i -= 1) {
      result = (result << 1) ^ ((result >>> 7) * 0x11d);
      if ((right >>> i) & 1) result ^= left;
    }
    return result & 0xff;
  }

  function gfPow(value, power) {
    let result = 1;
    for (let i = 0; i < power; i += 1) result = gfMultiply(result, value);
    return result;
  }

  function multiplyPolynomials(left, right) {
    const result = Array(left.length + right.length - 1).fill(0);
    left.forEach((leftValue, leftIndex) => {
      right.forEach((rightValue, rightIndex) => {
        result[leftIndex + rightIndex] ^= gfMultiply(leftValue, rightValue);
      });
    });
    return result;
  }

  function reedSolomonDivisor(degree) {
    let result = [1];
    for (let i = 0; i < degree; i += 1) result = multiplyPolynomials(result, [1, gfPow(2, i)]);
    return result.slice(1);
  }

  function reedSolomonRemainder(data, degree) {
    const divisor = reedSolomonDivisor(degree);
    const result = Array(degree).fill(0);
    data.forEach((byte) => {
      const factor = byte ^ result.shift();
      result.push(0);
      divisor.forEach((coefficient, index) => {
        result[index] ^= gfMultiply(coefficient, factor);
      });
    });
    return result;
  }

  function createMatrix(size) {
    return {
      modules: Array.from({ length: size }, () => Array(size).fill(false)),
      reserved: Array.from({ length: size }, () => Array(size).fill(false)),
    };
  }

  function setModule(matrix, x, y, value, reserved = true) {
    if (x < 0 || y < 0 || y >= matrix.modules.length || x >= matrix.modules.length) return;
    matrix.modules[y][x] = Boolean(value);
    if (reserved) matrix.reserved[y][x] = true;
  }

  function drawFinder(matrix, x, y) {
    for (let dy = -1; dy <= 7; dy += 1) {
      for (let dx = -1; dx <= 7; dx += 1) {
        const xx = x + dx;
        const yy = y + dy;
        const isFinder = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
        const isDark = isFinder && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
        setModule(matrix, xx, yy, isDark, true);
      }
    }
  }

  function drawAlignment(matrix, centerX, centerY) {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        setModule(matrix, centerX + dx, centerY + dy, distance !== 1, true);
      }
    }
  }

  function drawFunctionPatterns(matrix, version) {
    const size = matrix.modules.length;
    drawFinder(matrix, 0, 0);
    drawFinder(matrix, size - 7, 0);
    drawFinder(matrix, 0, size - 7);

    for (let i = 8; i < size - 8; i += 1) {
      setModule(matrix, i, 6, i % 2 === 0, true);
      setModule(matrix, 6, i, i % 2 === 0, true);
    }

    if (version > 1) drawAlignment(matrix, size - 7, size - 7);

    for (let i = 0; i < 9; i += 1) {
      if (i !== 6) {
        matrix.reserved[8][i] = true;
        matrix.reserved[i][8] = true;
      }
    }
    for (let i = 0; i < 8; i += 1) {
      matrix.reserved[8][size - 1 - i] = true;
      matrix.reserved[size - 1 - i][8] = true;
    }
    setModule(matrix, 8, size - 8, true, true);
  }

  function placeData(matrix, codewords) {
    const size = matrix.modules.length;
    const bits = [];
    codewords.forEach((codeword) => appendBits(bits, codeword, 8));
    let bitIndex = 0;
    let upward = true;

    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right -= 1;
      for (let vert = 0; vert < size; vert += 1) {
        const y = upward ? size - 1 - vert : vert;
        for (let dx = 0; dx < 2; dx += 1) {
          const x = right - dx;
          if (!matrix.reserved[y][x]) {
            matrix.modules[y][x] = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
            bitIndex += 1;
          }
        }
      }
      upward = !upward;
    }
  }

  function shouldMask(mask, x, y) {
    switch (mask) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
      case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
      case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
      case 7: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
      default: return false;
    }
  }

  function cloneMatrix(matrix) {
    return {
      modules: matrix.modules.map((row) => row.slice()),
      reserved: matrix.reserved.map((row) => row.slice()),
    };
  }

  function applyMask(matrix, mask) {
    const size = matrix.modules.length;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (!matrix.reserved[y][x] && shouldMask(mask, x, y)) matrix.modules[y][x] = !matrix.modules[y][x];
      }
    }
  }

  function formatBits(level, mask) {
    const data = (FORMAT_EC_BITS[level] << 3) | mask;
    let remainder = data << 10;
    for (let i = 14; i >= 10; i -= 1) {
      if (getBit(remainder, i)) remainder ^= 0x537 << (i - 10);
    }
    return ((data << 10) | remainder) ^ 0x5412;
  }

  function drawFormatBits(matrix, level, mask) {
    const size = matrix.modules.length;
    const bits = formatBits(level, mask);
    for (let i = 0; i <= 5; i += 1) setModule(matrix, 8, i, getBit(bits, i), true);
    setModule(matrix, 8, 7, getBit(bits, 6), true);
    setModule(matrix, 8, 8, getBit(bits, 7), true);
    setModule(matrix, 7, 8, getBit(bits, 8), true);
    for (let i = 9; i < 15; i += 1) setModule(matrix, 14 - i, 8, getBit(bits, i), true);
    for (let i = 0; i < 8; i += 1) setModule(matrix, size - 1 - i, 8, getBit(bits, i), true);
    for (let i = 8; i < 15; i += 1) setModule(matrix, 8, size - 15 + i, getBit(bits, i), true);
    setModule(matrix, 8, size - 8, true, true);
  }

  function countPenalty(matrix) {
    const size = matrix.modules.length;
    let penalty = 0;
    for (let y = 0; y < size; y += 1) {
      let runColor = matrix.modules[y][0];
      let runLength = 1;
      for (let x = 1; x < size; x += 1) {
        if (matrix.modules[y][x] === runColor) runLength += 1;
        else {
          if (runLength >= 5) penalty += 3 + runLength - 5;
          runColor = matrix.modules[y][x];
          runLength = 1;
        }
      }
      if (runLength >= 5) penalty += 3 + runLength - 5;
    }
    for (let x = 0; x < size; x += 1) {
      let runColor = matrix.modules[0][x];
      let runLength = 1;
      for (let y = 1; y < size; y += 1) {
        if (matrix.modules[y][x] === runColor) runLength += 1;
        else {
          if (runLength >= 5) penalty += 3 + runLength - 5;
          runColor = matrix.modules[y][x];
          runLength = 1;
        }
      }
      if (runLength >= 5) penalty += 3 + runLength - 5;
    }
    for (let y = 0; y < size - 1; y += 1) {
      for (let x = 0; x < size - 1; x += 1) {
        const color = matrix.modules[y][x];
        if (color === matrix.modules[y][x + 1] && color === matrix.modules[y + 1][x] && color === matrix.modules[y + 1][x + 1]) penalty += 3;
      }
    }
    return penalty;
  }

  function createQrMatrix(text, level) {
    const config = chooseConfig(new TextEncoder().encode(text).length, level);
    const size = config.version * 4 + 17;
    const matrix = createMatrix(size);
    drawFunctionPatterns(matrix, config.version);
    const data = createDataCodewords(text, config);
    const codewords = data.concat(reedSolomonRemainder(data, config.ecc));
    placeData(matrix, codewords);

    let best = null;
    for (let mask = 0; mask < 8; mask += 1) {
      const candidate = cloneMatrix(matrix);
      applyMask(candidate, mask);
      drawFormatBits(candidate, config.level, mask);
      const penalty = countPenalty(candidate);
      if (!best || penalty < best.penalty) best = { matrix: candidate, penalty };
    }
    return best.matrix.modules;
  }

  function toCanvas(canvas, text, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const modules = createQrMatrix(String(text), options.errorCorrectionLevel || 'M');
        const quietZone = Number(options.margin ?? 4);
        const requestedWidth = Number(options.width || 240);
        const moduleCount = modules.length + quietZone * 2;
        const scale = Math.max(1, Math.floor(requestedWidth / moduleCount));
        const size = moduleCount * scale;
        const colors = options.color || {};
        const dark = colors.dark || '#000000';
        const light = colors.light || '#ffffff';
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        context.fillStyle = light;
        context.fillRect(0, 0, size, size);
        context.fillStyle = dark;
        modules.forEach((row, y) => {
          row.forEach((isDark, x) => {
            if (isDark) context.fillRect((x + quietZone) * scale, (y + quietZone) * scale, scale, scale);
          });
        });
        resolve(canvas);
      } catch (error) {
        reject(error);
      }
    });
  }

  window.QRCode = { toCanvas };
})();
