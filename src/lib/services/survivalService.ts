/**
 * Cached Survival API Service
 * Wraps survivalApi with automatic caching and deduplication
 */

import { survivalApi, ExamCenter } from "@/lib/survivalApi";
import { queryCache, makeCacheKey } from "@/lib/queryCache";
import { batchedCall } from "@/lib/requestBatcher";

// TTL configurations for different data types
const TTL = {
  STATIC: 5 * 60 * 1000, // 5 minutes for exam centers, hospitals
  USER_DATA: 2 * 60 * 1000, // 2 minutes for housing, reviews
  REAL_TIME: 30 * 1000, // 30 seconds for exam buddies, online users
  SINGLE: 3 * 60 * 1000, // 3 minutes for single entity queries
} as const;

class CachedSurvivalService {
  /**
   * Get all hospitals
   */
  async getAllHospitals() {
    const key = makeCacheKey("survivalApi", "getAllHospitals");
    return queryCache.getOrFetch(
      key,
      () => survivalApi.getAllHospitals(),
      TTL.STATIC
    );
  }

  /**
   * Get all placement sites
   */
  async getAllPlacementSites() {
    const key = makeCacheKey("survivalApi", "getAllPlacementSites");
    return queryCache.getOrFetch(
      key,
      () => survivalApi.getAllPlacementSites(),
      TTL.STATIC
    );
  }

  /**
   * Get dashboard stats
   */
  async getDashboardStats() {
    const key = makeCacheKey("survivalApi", "getDashboardStats");
    return queryCache.getOrFetch(
      key,
      () => survivalApi.getDashboardStats(),
      TTL.STATIC
    );
  }

  /**
   * Get exam centers
   */
  async getExamCenters() {
    const key = makeCacheKey("survivalApi", "getExamCenters");
    return queryCache.getOrFetch(
      key,
      () => survivalApi.getExamCenters(),
      TTL.STATIC
    );
  }

  /**
   * Add exam center (invalidates cache)
   */
  async addExamCenter(centerData: any) {
    const result = await survivalApi.addExamCenter(centerData);
    this.invalidateExamCenters();
    return result;
  }

  /**
   * Update exam center (invalidates cache)
   */
  async updateExamCenter(id: string, centerData: any) {
    const result = await survivalApi.updateExamCenter(id, centerData);
    this.invalidateExamCenters();
    return result;
  }

  /**
   * Delete exam center (invalidates cache)
   */
  async deleteExamCenter(id: string) {
    const result = await survivalApi.deleteExamCenter(id);
    this.invalidateExamCenters();
    return result;
  }

  /**
   * Get exam buddies for a center
   */
  async getExamBuddies(centerId: string) {
    const key = makeCacheKey("survivalApi", "getExamBuddies", { centerId });
    return queryCache.getOrFetch(
      key,
      () => survivalApi.getExamBuddies(centerId),
      TTL.REAL_TIME
    );
  }

  /**
   * Get user registration status
   */
  async getUserRegistrationStatus(userId: string, cycle: string) {
    const key = makeCacheKey("survivalApi", "getUserRegistrationStatus", {
      userId,
      cycle,
    });
    return queryCache.getOrFetch(
      key,
      () => survivalApi.getUserRegistrationStatus(userId, cycle),
      TTL.REAL_TIME
    );
  }

  /**
   * Join exam center (invalidates related caches)
   */
  async joinExamCenter(details: {
    centerId: string;
    examCycle: string;
    roommate: boolean;
    study: boolean;
  }) {
    const result = await survivalApi.joinExamCenter(details);
    queryCache.invalidateByPrefix("survivalApi:getExamBuddies");
    return result;
  }

  /**
   * Leave exam center (invalidates related caches)
   */
  async leaveExamCenter(centerId: string) {
    const result = await survivalApi.leaveExamCenter(centerId);
    queryCache.invalidateByPrefix("survivalApi:getExamBuddies");
    return result;
  }

  /**
   * Get housing
   */
  async getHousing(params?: {
    centerId?: string;
    hospitalId?: string;
    placementId?: string;
  }) {
    const key = makeCacheKey("survivalApi", "getHousing", params);
    return queryCache.getOrFetch(
      key,
      () => survivalApi.getHousing(params || {}),
      TTL.USER_DATA
    );
  }

  /**
   * Delete housing (invalidates cache)
   */
  async deleteHousing(houseId: string) {
    const result = await survivalApi.deleteHousing(houseId);
    this.invalidateHousing();
    return result;
  }

  /**
   * Get hospitals
   */
  async getHospitals(params?: {
    centerId?: string;
    hospitalId?: string;
    placementId?: string;
  }) {
    const key = makeCacheKey("survivalApi", "getHospitals", params);
    return queryCache.getOrFetch(
      key,
      () => survivalApi.getHospitals(params),
      TTL.STATIC
    );
  }

  /**
   * Add hospital (invalidates cache)
   */
  async addHospital(hospitalData: any) {
    const result = await survivalApi.addHospital(hospitalData);
    this.invalidateHospitals();
    return result;
  }

  /**
   * Update hospital (invalidates cache)
   */
  async updateHospital(id: string, hospitalData: any) {
    const result = await survivalApi.updateHospital(id, hospitalData);
    this.invalidateHospitals();
    return result;
  }

  /**
   * Delete hospital (invalidates cache)
   */
  async deleteHospital(id: string) {
    const result = await survivalApi.deleteHospital(id);
    this.invalidateHospitals();
    return result;
  }

  /**
   * Get placements
   */
  async getPlacements() {
    const key = makeCacheKey("survivalApi", "getPlacements");
    return queryCache.getOrFetch(
      key,
      () => survivalApi.getPlacements(),
      TTL.STATIC
    );
  }

  /**
   * Delete placement (invalidates cache)
   */
  async deletePlacement(id: string) {
    const result = await survivalApi.deletePlacement(id);
    this.invalidatePlacements();
    return result;
  }

  /**
   * Get reviews
   */
  async getReviews(targetId: string) {
    const key = makeCacheKey("survivalApi", "getReviews", { targetId });
    return queryCache.getOrFetch(
      key,
      () => survivalApi.getReviews(targetId),
      TTL.USER_DATA
    );
  }

  /**
   * Get placement by ID
   */
  async getPlacementById(id: string) {
    const key = makeCacheKey("survivalApi", "getPlacementById", { id });
    return queryCache.getOrFetch(
      key,
      () => survivalApi.getPlacementById(id),
      TTL.SINGLE
    );
  }

  /**
   * Create placement site (invalidates cache)
   */
  async createPlacementSite(formData: any) {
    const result = await survivalApi.createPlacementSite(formData);
    this.invalidatePlacements();
    return result;
  }

  /**
   * Add review (invalidates cache)
   */
  async addReview(reviewData: {
    user_id: string;
    target_type: string;
    target_id: string;
    rating: number;
    comment: string;
  }) {
    const result = await survivalApi.addReview(reviewData);
    queryCache.invalidateByPrefix(
      makeCacheKey("survivalApi", "getReviews", { targetId: reviewData.target_id })
    );
    return result;
  }


  /**
 * Update review (invalidates cache)
 */
  async updateReview(
    reviewId: string,
    targetId: string,
    updates: {
      rating?: number;
      comment?: string;
    }
  ) {
    const result = await survivalApi.updateReview(reviewId, updates);

    queryCache.invalidateByPrefix(
      makeCacheKey("survivalApi", "getReviews", {
        targetId,
      })
    );

    return result;
  }

  /**
   * Delete review (invalidates cache)
   */
  async deleteReview(reviewId: string, targetId: string) {
    const result = await survivalApi.deleteReview(reviewId);

    queryCache.invalidateByPrefix(
      makeCacheKey("survivalApi", "getReviews", {
        targetId,
      })
    );

    return result;
  }
  /**
   * Create housing (invalidates cache)
   */
  async createHousing(formData: any) {
    const result = await survivalApi.createHousing(formData);
    this.invalidateHousing();
    return result;
  }

  // ============ CACHE INVALIDATION HELPERS ============

  private invalidateExamCenters() {
    queryCache.invalidateByPrefix(
      makeCacheKey("survivalApi", "getExamCenters")
    );
    queryCache.invalidateByPrefix(
      makeCacheKey("survivalApi", "getDashboardStats")
    );
  }

  private invalidateHousing() {
    queryCache.invalidateByPrefix(makeCacheKey("survivalApi", "getHousing"));
  }

  private invalidateHospitals() {
    queryCache.invalidateByPrefix(makeCacheKey("survivalApi", "getHospitals"));
    queryCache.invalidateByPrefix(
      makeCacheKey("survivalApi", "getDashboardStats")
    );
  }

  private invalidatePlacements() {
    queryCache.invalidateByPrefix(makeCacheKey("survivalApi", "getPlacements"));
    queryCache.invalidateByPrefix(
      makeCacheKey("survivalApi", "getDashboardStats")
    );
  }

  /**
   * Clear all cached data (use sparingly)
   */
  clearAllCache() {
    queryCache.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats() {
    return queryCache.getStats();
  }
}

// Export singleton instance
export const cachedSurvivalService = new CachedSurvivalService();
