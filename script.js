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


function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

function getNumber(id) {
  const value = document.getElementById(id).value.trim();
  return value === '' ? NaN : Number(value);
}

function calculateAgeParts(start, end) {
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function activateTool(tool) {
  const activeTab = $(`.tool-tab[data-tool="${tool}"]`);
  if (!activeTab) return;

  // Update active state of tabs
  $$('.tool-tab').forEach((item) => item.classList.toggle('active', item === activeTab));

  // Highlight the panel
  $$('[data-tool-panel]').forEach((panel) => {
    if (panel.id === tool) {
      // Scroll to panel
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Optional: add a temporary highlight effect
      const originalBorder = panel.style.borderColor;
      panel.style.borderColor = 'var(--primary)';
      panel.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.2)';
      setTimeout(() => {
        panel.style.borderColor = originalBorder;
        panel.style.boxShadow = '';
      }, 1500);
    }
  });
}

function initToolTabs() {
  $$('.tool-tab').forEach((tab) => {
    tab.addEventListener('click', () => activateTool(tab.dataset.tool));
  });

  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', () => {
      const tool = link.getAttribute('href').slice(1);
      activateTool(tool);
    });
  });

  if (window.location.hash) activateTool(window.location.hash.slice(1));
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
      output.innerHTML = '<p>QR library could not load. Check your internet connection or host the QRCode library locally.</p>';
      return;
    }

    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, text, {
      width: size,
      margin: 2,
      errorCorrectionLevel: $('#qrEcLevel').value,
      color: { dark: '#0f172a', light: '#ffffff' },
    });
    output.appendChild(canvas);
    $('#downloadQr').href = canvas.toDataURL('image/png');
  });
}

function initAutoToolScroll() {
  if (window.location.hash && window.location.hash !== '#top') return;
  const heroTools = document.getElementById('hero-tools');
  if (!heroTools) return;
  window.requestAnimationFrame(() => heroTools.scrollIntoView({ behavior: 'smooth', block: 'center' }));
}

function initCalculators() {
  $('#calculateAge').addEventListener('click', () => {
    const birthValue = $('#birthDate').value;
    const targetValue = $('#ageOnDate').value;
    if (!birthValue) {
      setOutput('ageOutput', 'Choose a date of birth.', 'error');
      return;
    }

    const birthDate = new Date(`${birthValue}T00:00:00`);
    const targetDate = targetValue ? new Date(`${targetValue}T00:00:00`) : new Date();
    if (birthDate > targetDate) {
      setOutput('ageOutput', 'Date of birth must be before the target date.', 'error');
      return;
    }

    const parts = calculateAgeParts(birthDate, targetDate);
    const totalDays = Math.floor((targetDate - birthDate) / 86400000);
    setOutput('ageOutput', [
      `Age: ${parts.years} years, ${parts.months} months, ${parts.days} days`,
      `Total days: ${formatCurrency(totalDays)}`,
      `As of: ${targetDate.toDateString()}`,
    ].join('\n'), 'success');
  });

  $('#calculatePercentage').addEventListener('click', () => {
    const value = getNumber('percentageValue');
    const base = getNumber('percentageBase');
    const rate = getNumber('percentageRate');
    const newValue = getNumber('percentageNewValue');
    const lines = [];

    if (Number.isFinite(value) && Number.isFinite(base) && base !== 0) {
      lines.push(`${value} is ${(value / base * 100).toFixed(2)}% of ${base}.`);
    }
    if (Number.isFinite(rate) && Number.isFinite(base)) {
      lines.push(`${rate}% of ${base} is ${(base * rate / 100).toFixed(2)}.`);
    }
    if (Number.isFinite(value) && Number.isFinite(newValue) && value !== 0) {
      const change = (newValue - value) / Math.abs(value) * 100;
      lines.push(`Change from ${value} to ${newValue}: ${change.toFixed(2)}%.`);
    }

    setOutput('percentageOutput', lines.length ? lines.join('\n') : 'Enter values to calculate percentages.', lines.length ? 'success' : 'error');
  });

  $('#calculateEmi').addEventListener('click', () => {
    const principal = getNumber('loanAmount');
    const annualRate = getNumber('annualInterest');
    const tenure = getNumber('loanTenure');
    if (!principal || !tenure || principal <= 0 || tenure <= 0 || annualRate < 0) {
      setOutput('emiOutput', 'Enter a positive loan amount, tenure, and valid interest rate.', 'error');
      return;
    }

    const months = $('#tenureUnit').value === 'years' ? tenure * 12 : tenure;
    const monthlyRate = annualRate / 12 / 100;
    const emi = monthlyRate === 0
      ? principal / months
      : principal * monthlyRate * ((1 + monthlyRate) ** months) / (((1 + monthlyRate) ** months) - 1);
    const totalPayment = emi * months;
    const totalInterest = totalPayment - principal;

    setOutput('emiOutput', [
      `Monthly EMI: ${formatCurrency(emi)}`,
      `Total interest: ${formatCurrency(totalInterest)}`,
      `Total payable: ${formatCurrency(totalPayment)}`,
      `Tenure: ${months} months`,
    ].join('\n'), 'success');
  });

  $('#calculateCgpa').addEventListener('click', () => {
    const rows = $('#cgpaInput').value.trim().split(/\n+/).map((row) => row.split(/[\s,]+/).map(Number));
    let totalCredits = 0;
    let weightedPoints = 0;
    const plainGrades = [];

    rows.forEach(([first, second]) => {
      if (Number.isFinite(first) && Number.isFinite(second)) {
        totalCredits += first;
        weightedPoints += first * second;
      } else if (Number.isFinite(first)) {
        plainGrades.push(first);
      }
    });

    if (totalCredits > 0) {
      setOutput('cgpaOutput', `Weighted CGPA: ${(weightedPoints / totalCredits).toFixed(2)}\nTotal credits: ${totalCredits}`, 'success');
      return;
    }
    if (plainGrades.length) {
      const average = plainGrades.reduce((sum, grade) => sum + grade, 0) / plainGrades.length;
      setOutput('cgpaOutput', `Average CGPA: ${average.toFixed(2)}\nEntries counted: ${plainGrades.length}`, 'success');
      return;
    }
    setOutput('cgpaOutput', 'Enter either one grade per line or credit, grade pairs.', 'error');
  });
}

function initImageConverter() {
  $('#convertImage').addEventListener('click', () => {
    const file = $('#imageInput').files[0];
    const output = $('#imageOutput');
    output.innerHTML = '';
    if (!file) {
      output.textContent = 'Choose an image file first.';
      return;
    }

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext('2d').drawImage(image, 0, 0);
      const format = $('#imageFormat').value;
      const quality = clampNumber($('#imageQuality').value, 10, 100) / 100;
      const dataUrl = canvas.toDataURL(format, quality);
      const extension = format.split('/')[1].replace('jpeg', 'jpg');
      const preview = document.createElement('img');
      preview.alt = 'Converted image preview';
      preview.src = dataUrl;
      $('#downloadImage').href = dataUrl;
      $('#downloadImage').download = `converted-image.${extension}`;
      output.appendChild(preview);
      URL.revokeObjectURL(image.src);
    };
    image.onerror = () => {
      output.textContent = 'This image could not be loaded by the browser.';
    };
    image.src = URL.createObjectURL(file);
  });
}

function initWordCounter() {
  $('#countWords').addEventListener('click', () => {
    const text = $('#wordCounterInput').value;
    if (!text) {
      setOutput('wordCounterOutput', 'Please enter some text to count.', 'error');
      return;
    }
    const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s+/g, '').length;

    setOutput('wordCounterOutput', [
      `Words: ${words}`,
      `Characters (with spaces): ${characters}`,
      `Characters (no spaces): ${charactersNoSpaces}`
    ].join('\n'), 'success');
  });

  // Optional: Auto-update as user types
  $('#wordCounterInput').addEventListener('input', () => {
      if ($('#wordCounterOutput').textContent !== '') {
          $('#countWords').click();
      }
  });
}

function initPdfTools() {
  $('#inspectPdf').addEventListener('click', () => {
    const file = $('#pdfInput').files[0];
    if (!file) {
      setOutput('pdfOutput', 'Choose a PDF file first.', 'error');
      return;
    }
    setOutput('pdfOutput', [
      `File name: ${file.name}`,
      `File size: ${formatCurrency(file.size / 1024)} KB`,
      `Type: ${file.type || 'application/pdf'}`,
      `Last modified: ${new Date(file.lastModified).toLocaleString()}`,
    ].join('\n'), 'success');
  });

  $('#printPdfText').addEventListener('click', () => {
    const text = $('#pdfText').value.trim();
    if (!text) {
      setOutput('pdfOutput', 'Paste text before creating a print-ready PDF.', 'error');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setOutput('pdfOutput', 'Pop-up blocked. Allow pop-ups to open the print dialog.', 'error');
      return;
    }
    printWindow.document.write(`<!doctype html><title>Print to PDF</title><style>body{font:16px/1.6 system-ui;margin:40px;white-space:pre-wrap;color:#111827;}</style><body>${escapeHtml(text)}</body>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setOutput('pdfOutput', 'Print dialog opened. Choose “Save as PDF” in your browser.', 'success');
  });
}

function initResultCopyButtons() {
  $$('.result').forEach((result) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'result-wrap';

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'result-copy';
    copyButton.textContent = 'Copy result';
    copyButton.setAttribute('aria-label', `Copy ${result.id || 'tool'} result`);

    result.parentNode.insertBefore(wrapper, result);
    wrapper.appendChild(copyButton);
    wrapper.appendChild(result);

    copyButton.addEventListener('click', async () => {
      const text = result.textContent.trim();
      if (!text) {
        copyButton.textContent = 'Nothing to copy';
        setTimeout(() => { copyButton.textContent = 'Copy result'; }, 1400);
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        copyButton.textContent = 'Copied!';
      } catch (error) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(result);
        selection.removeAllRanges();
        selection.addRange(range);
        copyButton.textContent = 'Select + copy';
      }

      setTimeout(() => { copyButton.textContent = 'Copy result'; }, 1400);
    });
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

initAutoToolScroll();
initToolTabs();
initJsonTools();
initGenerators();
initEncoders();
initJwt();
initTimestamp();
initRegex();
initQr();
initCalculators();
initImageConverter();
initPdfTools();
initWordCounter();
initResultCopyButtons();
initClearButtons();
initAds();
