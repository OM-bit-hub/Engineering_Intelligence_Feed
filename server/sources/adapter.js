/**
 * Base class for all Source Adapters
 * (ADR-002: Content Ingestion Architecture)
 */
class SourceAdapter {
    constructor(config = {}) {
        this.config = config;
    }

    /**
     * Fetch content published since the given date
     * @param {string} name - The person's name or handle to search for
     * @returns {Promise<Array>} List of content items
     */
    async fetchRecentContent(name) {
        throw new Error('fetchRecentContent must be implemented');
    }

    /**
     * Verify adapter can connect to source
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        throw new Error('testConnection must be implemented');
    }

    /**
     * Unique identifier for this source type
     * @returns {string} e.g. 'linkedin', 'twitter'
     */
    get sourceType() {
        throw new Error('sourceType getter must be implemented');
    }
}

module.exports = SourceAdapter;
