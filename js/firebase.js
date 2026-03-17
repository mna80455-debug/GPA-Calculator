/**
 * GradeIQ — Firebase Logic Module (Non-Module Version)
 * Handles Authentication and Firestore sync.
 */

// Global reference
window.FirebaseModule = (() => {
  // Stubs for functionality if Firebase can't be loaded on file://
  // Note: On file:// protocol, Firebase JS SDK may fail due to CORS.
  
  const Firebase = {
    auth: null,
    db: null,

    onAuthChange(callback) {
      console.warn("Firebase: auth change listener stubbed");
    },

    async login() {
      console.error("Firebase Login: Unsupported on file:// protocol");
      throw new Error("Login requires a web server");
    },

    async logout() {
      console.warn("Firebase: logout stubbed");
    },

    async syncUserProfile(user) {
      return null;
    },

    async saveSemester(userId, semester) {
      console.warn("Firebase: saveSemester stubbed");
    },

    async deleteSemester(userId, semesterId) {
      console.warn("Firebase: deleteSemester stubbed");
    },

    async fetchSemesters(userId) {
      return [];
    },

    async updateSettings(userId, settings) {
      console.warn("Firebase: updateSettings stubbed");
    }
  };

  return Firebase;
})();

