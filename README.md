# Toolbox Hub

Toolbox Hub is a static all-in-one developer utilities website. It currently includes these 10 browser tools:

1. JSON validator
2. JSON formatter and minifier
3. UUID generator
4. Base64 encoder and decoder
5. URL encoder and decoder
6. Password generator
7. JWT decoder
8. Timestamp converter
9. Regex tester
10. QR code generator

## Run locally

Because this is a static website, you can open `index.html` directly or serve the folder with any static server:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Ad integration

Google AdSense placeholders are already added in `index.html`:

- Replace `ca-pub-XXXXXXXXXXXXXXXX` with your real publisher ID.
- Replace `1234567890` and `0987654321` with your real ad slot IDs.
- Keep the fallback text while testing, or remove it after ads are approved and rendering.
- Ad placements appear after the tool area so visitors can see and start using tools immediately on page load.

## Notes

- All tools run client-side in the browser.
- JWT decoding only decodes the header and payload; it does not verify signatures.
- The QR code tool uses the local `assets/local-qr.js` generator, so visitors do not need a third-party CDN for QR generation. It supports common short text and URL QR codes up to 106 UTF-8 bytes.
