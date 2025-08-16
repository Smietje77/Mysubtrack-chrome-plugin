# Quick Installation Guide

## Step-by-Step Installation

### 1. Download the Extension
- Download all files from this repository
- Keep them in a single folder

### 2. Open Chrome Extensions Page
- Open Chrome browser
- Navigate to: `chrome://extensions/`
- Or go to: Menu → More Tools → Extensions

### 3. Enable Developer Mode
- Toggle the "Developer mode" switch in the top-right corner
- This will show additional options

### 4. Load the Extension
- Click "Load unpacked" button
- Select the folder containing your extension files
- The extension should now appear in your extensions list

### 5. Verify Installation
- You should see "MySubTrack - Multi-Service Subscription Tracker" in the extensions list
- The extension should be enabled (toggle switch is blue)

## Testing the Extension

### Option 1: Use the Test Page (Recommended)
1. Open `test-page.html` in Chrome
2. Click "Test Netflix" or "Test Spotify" buttons to simulate different services
3. Look for the service-specific floating button in the bottom-right corner
4. Click it to test the functionality
5. Open DevTools (F12) to see console output

### Option 2: Test on Real Sites
1. **Netflix**: Navigate to `https://netflix.com/signup/payment`
2. **Spotify**: Navigate to `https://spotify.com/premium`
3. The extension should automatically detect the service and show appropriate button text
4. Click to test price extraction

## What You'll See

### Button Text Examples
- **Netflix**: "Add Netflix ($17.99/month) to MySubTrack"
- **Spotify**: "Add Spotify (€9.99/month) to MySubTrack"
- **No Price**: "Add [Service] to MySubTrack"

### Console Output
When you click the button, you'll see comprehensive data like:
```javascript
MySubTrack - Detected Subscription: {
  service: "Netflix",
  plan: "Premium Plan",
  price: 17.99,
  priceText: "$17.99/month",
  billingCycle: "monthly",
  url: "https://netflix.com/signup/payment",
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

## Troubleshooting

### Extension Not Working?
- Make sure Developer mode is enabled
- Try refreshing the extension (click the refresh icon)
- Check that all files are in the same folder
- Verify the manifest.json file is valid

### Button Not Appearing?
- Check that you're on a supported subscription page
- For Netflix: URLs containing `/signup/payment` or `/signup/planform`
- For Spotify: URLs containing `/premium` or `/checkout`
- Open DevTools and check for any console errors
- Try refreshing the page
- Verify the extension is enabled

### Console Errors?
- Open DevTools (F12)
- Go to Console tab
- Look for any red error messages
- Check that all files are properly loaded

### Price Not Detected?
- The extension will still work without price detection
- Button will show "Add [Service] to MySubTrack"
- Check if the page uses different CSS selectors for pricing
- Try refreshing the page to allow for dynamic content loading

## File Requirements

Make sure you have these files in your extension folder:
- ✅ `manifest.json`
- ✅ `content.js`
- ✅ `styles.css`
- ✅ `test-page.html` (for testing)
- ✅ `README.md` (optional)
- ✅ `INSTALLATION.md` (optional)

## Supported Services

### Netflix
- **URLs**: `/signup/payment`, `/signup/planform`
- **Features**: Plan detection, price extraction, billing cycle detection

### Spotify
- **URLs**: `/premium`, `/checkout`
- **Features**: Premium plan detection, price extraction, billing cycle detection

## Next Steps

Once installed, the extension will:
- Automatically detect Netflix and Spotify subscription pages
- Show a floating button with service-specific text and pricing
- Extract comprehensive subscription data when clicked
- Log detailed information to the browser console
- Provide a smooth user experience with animations

## Adding More Services

The extension is designed to be easily extensible. To add support for new services:
1. Edit the `SERVICES` object in `content.js`
2. Add the service's domain and URL patterns
3. Define CSS selectors for price, plan name, and billing cycle
4. Update `manifest.json` with new URL patterns
5. Test with the service's subscription pages

Happy tracking! 🎯
