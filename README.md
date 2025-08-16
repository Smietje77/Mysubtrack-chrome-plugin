# MySubTrack Chrome Extension

A professional Chrome extension that automatically detects subscription services on web pages and helps users track their subscriptions with smooth animations, robust error handling, and a polished user experience.

## ✨ Enhanced Features

### 🎭 Smooth Animations & Polish
- **Cubic-bezier transitions** for all UI elements
- **Loading spinners** with proper disabled states
- **Micro-interactions** with hover effects and scale transforms
- **Toast notifications** with entrance/exit animations
- **Modal transitions** with backdrop blur effects
- **Button animations** with shimmer effects

### 🛡️ Robust Error Handling
- **Automatic retry logic** with exponential backoff
- **Network error detection** and user-friendly messages
- **Timeout handling** with graceful fallbacks
- **Rate limit protection** with intelligent delays
- **Error recovery** mechanisms for failed operations

### 🔍 Smart Duplicate Detection
- **Exact match detection** for identical subscriptions
- **Fuzzy matching** using Levenshtein distance algorithm
- **User choice prompts** when duplicates are found
- **Comparison display** showing existing vs. new subscriptions

### ⚡ Performance Optimizations
- **Debounced detection** to prevent excessive processing
- **Smart mutation observers** that only process relevant changes
- **Memory management** with proper cleanup
- **Lazy loading** of components
- **Optimized DOM queries** and event handling

### 📱 Mobile-First Design
- **Responsive layouts** that work on all screen sizes
- **Touch-friendly interactions** with proper button sizes
- **Mobile-optimized modals** with full-width support
- **Reduced motion support** for accessibility
- **High contrast mode** support

### 🎨 Professional UI/UX
- **Modern design system** with consistent spacing and typography
- **Dark mode support** with automatic detection
- **Accessibility features** including ARIA labels and keyboard navigation
- **Loading states** for all async operations
- **Visual feedback** for user actions

## 🚀 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/mysubtrack-extension.git
   cd mysubtrack-extension
   ```

2. **Load in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the extension folder

3. **Test the extension:**
   - Open `test-page.html` in your browser
   - Navigate to subscription pages (Netflix, Spotify, etc.)
   - Click the MySubTrack button to add subscriptions

## 🎯 How It Works

### Service Detection
The extension uses a multi-layered detection system:

1. **Known Services**: Pre-configured patterns for popular services
2. **Generic Detection**: AI-powered detection for unknown services
3. **URL Analysis**: Checks for subscription-related keywords
4. **Content Scanning**: Looks for price patterns and payment forms

### Enhanced Features

#### Loading States
```javascript
// Beautiful loading spinners with proper states
LoadingSpinner.show(button, 'Adding subscription...');
// Automatically restores original content when done
LoadingSpinner.hide(button);
```

#### Error Handling
```javascript
// Automatic retry with exponential backoff
const result = await ErrorHandler.withRetry(
  () => api.addSubscription(data),
  3, // max retries
  1000 // base delay
);
```

#### Duplicate Detection
```javascript
// Smart duplicate checking
const duplicateCheck = await DuplicateDetector.checkDuplicate(subscriptionData);
if (duplicateCheck.isDuplicate) {
  showDuplicateWarning(subscriptionData, duplicateCheck);
}
```

#### Toast Notifications
```javascript
// Beautiful animated notifications
ToastNotification.show('Subscription added successfully!', 'success');
ToastNotification.show('Network error occurred', 'error');
ToastNotification.show('Checking for duplicates...', 'info');
```

## 🎨 Design System

### Color Palette
- **Primary**: `#667eea` to `#764ba2` (gradient)
- **Success**: `#4CAF50` to `#45a049`
- **Error**: `#f44336` to `#d32f2f`
- **Warning**: `#FF9800` to `#F57C00`
- **Info**: `#2196F3` to `#1976D2`

### Typography
- **Font Family**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif`
- **Weights**: 400 (normal), 600 (semibold), 700 (bold), 800 (extrabold)

### Animations
- **Easing**: `cubic-bezier(0.175, 0.885, 0.32, 1.275)`
- **Duration**: 0.2s (micro), 0.3s (standard), 0.4s (emphasis)
- **Reduced Motion**: Respects `prefers-reduced-motion`

## 🔧 Configuration

### Settings
The extension respects user preferences stored in Chrome storage:

- `mysubtrack_auto_detect`: Enable/disable automatic detection
- `mysubtrack_show_notifications`: Show/hide toast notifications

### Performance Tuning
- **Debounce delay**: 300ms for mutation observers
- **Retry attempts**: 3 maximum with exponential backoff
- **Timeout**: 10 seconds for network requests
- **Memory cleanup**: Automatic after 5 minutes of inactivity

## 🧪 Testing

### Test Scenarios
1. **Basic Detection**: Visit subscription pages and verify detection
2. **Error Handling**: Test network failures and timeouts
3. **Duplicate Detection**: Add the same subscription twice
4. **Mobile Experience**: Test on mobile browsers
5. **Performance**: Monitor memory usage and CPU impact

### Test Page
Open `test-page.html` to test all enhanced features:
- Animation demonstrations
- Error simulation
- Duplicate detection testing
- Mobile layout testing
- Performance monitoring

## 🐛 Troubleshooting

### Common Issues

**Extension not detecting subscriptions:**
- Check if auto-detection is enabled in settings
- Verify the page contains subscription-related content
- Try refreshing the page

**Network errors:**
- Check your internet connection
- The extension will automatically retry with exponential backoff
- Look for specific error messages in toast notifications

**Performance issues:**
- The extension uses debounced detection to minimize impact
- Memory is automatically cleaned up
- Check for other extensions that might conflict

### Debug Mode
Enable debug logging by setting:
```javascript
localStorage.setItem('mysubtrack_debug', 'true');
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style and patterns
- Add proper error handling for new features
- Include loading states for async operations
- Test on both desktop and mobile browsers
- Ensure accessibility compliance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Chrome Extension API** for the platform
- **Modern CSS** for beautiful animations
- **Accessibility guidelines** for inclusive design
- **Performance best practices** for optimal user experience

---

**MySubTrack** - Professional subscription tracking with a polished user experience ✨
