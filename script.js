const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function setOutput(id, message, type = '') {
  const node = document.getElementById(id);
  node.textContent = message;
  node.className = `result ${type}`.trim();
}

function safeJsonParse(value) {
  if (!value.trim()) throw new Error('Input is empty.');
  return JSON.parse(value);
}

function copyTextFrom(id) {
  const text = document.getElementById(id).textContent;
  if (!text) return;
  navigator.clipboard?.writeText(text);
}

function bytesToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToText(value) {
  const binary = atob(value.trim());
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function createUuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (char) =>
    (Number(char) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(char) / 4).toString(16)
  );
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(Number(value) || min, min), max);
}

function randomFromCharset(charset) {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return charset[random[0] % charset.length];
}

function decodeJwtPart(part) {
  const normalized = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  return JSON.parse(base64ToText(normalized));
}

function formatDateDetails(date) {
  return [
    `Local: ${date.toString()}`,
    `UTC:   ${date.toISOString()}`,
    `Unix seconds: ${Math.floor(date.getTime() / 1000)}`,
    `Unix milliseconds: ${date.getTime()}`,
  ].join('\n');
}

function initToolTabs() {
  $$('.tool-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const tool = tab.dataset.tool;
      $$('.tool-tab').forEach((item) => item.classList.toggle('active', item === tab));
      $$('[data-tool-panel]').forEach((panel) => panel.classList.toggle('active', panel.id === tool));
    });
  });
}

function initJsonTools() {
  $('#validateJson').addEventListener('click', () => {
    try {
      safeJsonParse($('#jsonValidatorInput').value);
      setOutput('jsonValidatorOutput', 'Valid JSON ✅', 'success');
    } catch (error) {
      setOutput('jsonValidatorOutput', `Invalid JSON ❌\n${error.message}`, 'error');
    }
  });

  $('#formatJson').addEventListener('click', () => {
    try {
      setOutput('jsonFormatterOutput', JSON.stringify(safeJsonParse($('#jsonFormatterInput').value), null, 2), 'success');
    } catch (error) {
      setOutput('jsonFormatterOutput', error.message, 'error');
    }
  });

  $('#minifyJson').addEventListener('click', () => {
    try {
      setOutput('jsonFormatterOutput', JSON.stringify(safeJsonParse($('#jsonFormatterInput').value)), 'success');
    } catch (error) {
      setOutput('jsonFormatterOutput', error.message, 'error');
    }
  });
}

function initGenerators() {
  $('#generateUuid').addEventListener('click', () => {
    const count = clampNumber($('#uuidCount').value, 1, 100);
    setOutput('uuidOutput', Array.from({ length: count }, createUuid).join('\n'), 'success');
  });
  $('#copyUuid').addEventListener('click', () => copyTextFrom('uuidOutput'));

  $('#generatePassword').addEventListener('click', () => {
    const sets = [
      $('#useUppercase').checked ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '',
      $('#useLowercase').checked ? 'abcdefghijklmnopqrstuvwxyz' : '',
      $('#useNumbers').checked ? '0123456789' : '',
      $('#useSymbols').checked ? '!@#$%^&*()_+-=[]{}|;:,.<>?' : '',
    ].filter(Boolean);

    if (!sets.length) {
      setOutput('passwordOutput', 'Choose at least one character set.', 'error');
      return;
    }

    const length = clampNumber($('#passwordLength').value, 8, 128);
    const quantity = clampNumber($('#passwordQuantity').value, 1, 20);
    const charset = sets.join('');
    const passwords = Array.from({ length: quantity }, () =>
      Array.from({ length }, () => randomFromCharset(charset)).join('')
    );
    setOutput('passwordOutput', passwords.join('\n'), 'success');
  });
  $('#copyPassword').addEventListener('click', () => copyTextFrom('passwordOutput'));
}

function initEncoders() {
  $('#encodeBase64').addEventListener('click', () => {
    try { setOutput('base64Output', bytesToBase64($('#base64Input').value), 'success'); }
    catch (error) { setOutput('base64Output', error.message, 'error'); }
  });
  $('#decodeBase64').addEventListener('click', () => {
    try { setOutput('base64Output', base64ToText($('#base64Input').value), 'success'); }
    catch (error) { setOutput('base64Output', 'Invalid Base64 input.', 'error'); }
  });
  $('#encodeUrl').addEventListener('click', () => setOutput('urlOutput', encodeURIComponent($('#urlInput').value), 'success'));
  $('#decodeUrl').addEventListener('click', () => {
    try { setOutput('urlOutput', decodeURIComponent($('#urlInput').value), 'success'); }
    catch (error) { setOutput('urlOutput', 'Invalid URL encoded input.', 'error'); }
  });
}

function initJwt() {
  $('#decodeJwt').addEventListener('click', () => {
    try {
      const parts = $('#jwtInput').value.trim().split('.');
      if (parts.length < 2) throw new Error('A JWT must include at least header and payload sections.');
      const decoded = {
        header: decodeJwtPart(parts[0]),
        payload: decodeJwtPart(parts[1]),
        signaturePresent: Boolean(parts[2]),
        note: 'Decoded only. Signature is not verified.',
      };
      setOutput('jwtOutput', JSON.stringify(decoded, null, 2), 'success');
    } catch (error) {
      setOutput('jwtOutput', `Unable to decode JWT. ${error.message}`, 'error');
    }
  });
}

function initTimestamp() {
  $('#useCurrentTime').addEventListener('click', () => {
    const now = new Date();
    $('#timestampInput').value = Math.floor(now.getTime() / 1000);
    $('#dateInput').value = now.toISOString().slice(0, 16);
    setOutput('timestampOutput', formatDateDetails(now), 'success');
  });

  $('#timestampToDate').addEventListener('click', () => {
    const raw = $('#timestampInput').value.trim();
    const numeric = Number(raw);
    if (!raw || Number.isNaN(numeric)) {
      setOutput('timestampOutput', 'Enter a valid Unix timestamp.', 'error');
      return;
    }
    const milliseconds = raw.length <= 10 ? numeric * 1000 : numeric;
    setOutput('timestampOutput', formatDateDetails(new Date(milliseconds)), 'success');
  });

  $('#dateToTimestamp').addEventListener('click', () => {
    const date = new Date($('#dateInput').value);
    if (Number.isNaN(date.getTime())) {
      setOutput('timestampOutput', 'Choose a valid date and time.', 'error');
      return;
    }
    setOutput('timestampOutput', formatDateDetails(date), 'success');
  });
}

function initRegex() {
  $('#testRegex').addEventListener('click', () => {
    try {
      const pattern = $('#regexPattern').value;
      const flags = $('#regexFlags').value;
      const regex = new RegExp(pattern, flags);
      const text = $('#regexText').value;
      const matches = [];
      let match;

      if (flags.includes('g')) {
        while ((match = regex.exec(text)) !== null) {
          matches.push({ match: match[0], index: match.index, groups: match.slice(1) });
          if (match[0] === '') regex.lastIndex += 1;
        }
      } else {
        match = regex.exec(text);
        if (match) matches.push({ match: match[0], index: match.index, groups: match.slice(1) });
      }

      setOutput('regexOutput', matches.length ? JSON.stringify(matches, null, 2) : 'No matches found.', matches.length ? 'success' : '');
    } catch (error) {
      setOutput('regexOutput', error.message, 'error');
    }
  });
}

function initQr() {
  $('#generateQr').addEventListener('click', async () => {
    const text = $('#qrInput').value.trim();
    const size = clampNumber($('#qrSize').value, 120, 600);
    const output = $('#qrOutput');
    output.innerHTML = '';

    if (!text) {
      output.textContent = 'Enter text or a URL to generate a QR code.';
      return;
    }

    if (!window.QRCode) {
      output.innerHTML = '<p>Local QR generator did not load. Make sure assets/local-qr.js is deployed with the site.</p>';
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, text, {
        width: size,
        margin: 2,
        errorCorrectionLevel: $('#qrEcLevel').value,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      output.appendChild(canvas);
      $('#downloadQr').href = canvas.toDataURL('image/png');
    } catch (error) {
      output.textContent = error.message;
    }
  });
}

function initClearButtons() {
  $$('[data-clear]').forEach((button) => {
    button.addEventListener('click', () => {
      button.dataset.clear.split(',').forEach((id) => {
        const node = document.getElementById(id);
        if ('value' in node) node.value = '';
        else node.textContent = '';
      });
    });
  });
}

function initAds() {
  try {
    $$('.adsbygoogle').forEach(() => (window.adsbygoogle = window.adsbygoogle || []).push({}));
  } catch (error) {
    console.info('Ad loader skipped:', error.message);
  }
}

initToolTabs();
initJsonTools();
initGenerators();
initEncoders();
initJwt();
initTimestamp();
initRegex();
initQr();
initClearButtons();
initAds();
