// src/composables/usePersistence.js
// Robust data persistence with debouncing, backup rotation, validation

const PRIMARY_KEY = 'hikki-canvas-state';
const BACKUP_KEY = 'hikki-canvas-state-backup';
const MAX_DATA_SIZE = 50 * 1024 * 1024; // 50MB limit

let saveTimeout = null;

/**
 * Validate data structure and size
 * @param {Object} data - Data to validate
 * @returns {boolean} True if valid
 */
function validateData(data) {
  try {
    // Check required structure
    if (!data || typeof data !== 'object') {
      console.error('🚫 Validation failed: Data is not an object');
      return false;
    }

    if (!Array.isArray(data.territories) || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
      console.error('🚫 Validation failed: Missing required arrays');
      return false;
    }

    // Check size
    const jsonStr = JSON.stringify(data);
    const sizeBytes = new Blob([jsonStr]).size;

    if (sizeBytes > MAX_DATA_SIZE) {
      console.error(`🚫 Validation failed: Data exceeds ${MAX_DATA_SIZE / 1024 / 1024}MB limit`);
      return false;
    }

    console.log(`✓ Validation passed (${(sizeBytes / 1024).toFixed(2)}KB)`);
    return true;
  } catch (error) {
    console.error('🚫 Validation error:', error);
    return false;
  }
}

/**
 * Save data to localStorage with backup rotation
 * @param {Object} data - Data to save
 * @returns {boolean} Success status
 */
function saveToStorage(data) {
  try {
    if (!validateData(data)) {
      return false;
    }

    const jsonStr = JSON.stringify(data);

    // Rotate: primary → backup, new → primary
    const existingPrimary = localStorage.getItem(PRIMARY_KEY);
    if (existingPrimary) {
      localStorage.setItem(BACKUP_KEY, existingPrimary);
      console.log('🔄 Rotated primary to backup');
    }

    localStorage.setItem(PRIMARY_KEY, jsonStr);
    console.log(`💾 Saved to primary storage (${data.nodes.length} nodes, ${data.edges.length} edges)`);
    return true;
  } catch (error) {
    console.error('❌ Save failed:', error);
    return false;
  }
}

/**
 * Load data from localStorage with fallback to backup
 * @returns {Object|null} Loaded data or null
 */
function loadFromStorage() {
  try {
    // Try primary first
    let jsonStr = localStorage.getItem(PRIMARY_KEY);

    if (jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (validateData(data)) {
          console.log(`✅ Loaded from primary storage (${data.nodes.length} nodes)`);
          return data;
        }
      } catch (parseError) {
        console.warn('⚠️ Primary storage corrupted, trying backup...');
      }
    }

    // Fallback to backup
    jsonStr = localStorage.getItem(BACKUP_KEY);
    if (jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (validateData(data)) {
          console.log(`✅ Recovered from backup storage (${data.nodes.length} nodes)`);
          // Restore backup to primary
          saveToStorage(data);
          return data;
        }
      } catch (parseError) {
        console.error('❌ Backup storage also corrupted');
      }
    }

    console.log('ℹ️ No saved data found');
    return null;
  } catch (error) {
    console.error('❌ Load failed:', error);
    return null;
  }
}

/**
 * Debounced autosave - saves after 500ms of inactivity
 * @param {Object} data - Data to save
 */
export function debouncedAutoSave(data) {
  // Clear existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Set new timeout
  saveTimeout = setTimeout(() => {
    console.log('⏱️ Debounced save triggered');
    saveToStorage(data);
  }, 500);
}

/**
 * Immediate save (for critical operations like delete)
 * @param {Object} data - Data to save
 */
export function immediateAutoSave(data) {
  // Clear any pending debounced save
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  console.log('⚡ Immediate save triggered');
  return saveToStorage(data);
}

/**
 * Load saved state
 * @returns {Object|null} Loaded data or null
 */
export function loadSavedState() {
  return loadFromStorage();
}

/**
 * Export data as downloadable JSON file
 * @param {Object} data - Data to export
 */
export function exportData(data) {
  try {
    if (!validateData(data)) {
      throw new Error('Invalid data structure');
    }

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `hikki-notes-${timestamp}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`📥 Exported data as ${filename}`);
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

/**
 * Import data from JSON file
 * @param {File} file - File to import
 * @returns {Promise<Object>} Imported data
 */
export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (!validateData(data)) {
          reject(new Error('Invalid file structure'));
          return;
        }

        console.log(`📤 Imported data (${data.nodes.length} nodes, ${data.edges.length} edges)`);
        resolve(data);
      } catch (error) {
        console.error('❌ Import failed:', error);
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('File read failed'));
    };

    reader.readAsText(file);
  });
}
