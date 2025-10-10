/**
 * Main entry point for Character Canvas Vue application
 * Initializes Vue 3 app with composable architecture
 */
import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

// Global error handler
const handleGlobalError = (err, instance, info) => {
  console.error('Global Error:', err);
  console.error('Component:', instance);
  console.error('Error Info:', info);

  // You can send to error tracking service here
  // Example: Sentry.captureException(err);
};

// Create and configure Vue app
const app = createApp(App);

// Register global error handler
app.config.errorHandler = handleGlobalError;

// Production tip (disable in production)
app.config.performance = true;

// Mount app
try {
  app.mount('#app');
  console.log('✓ Character Canvas initialized successfully');
} catch (error) {
  console.error('Failed to mount Vue app:', error);
  document.querySelector('#app').innerHTML = `
    <div style="padding: 20px; font-family: system-ui;">
      <h1 style="color: #c33;">Application Failed to Load</h1>
      <p>An error occurred while initializing the application.</p>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">
${error.stack || error.message}
      </pre>
      <button onclick="location.reload()" style="padding: 10px 20px; border-radius: 6px; border: none; background: #111; color: #fff; cursor: pointer;">
        Reload Page
      </button>
    </div>
  `;
}
