import { Request, Response } from 'express';
import { DefaultCommissionSettingsService, DefaultCommissionSettingsData } from '@/services/default-commission-settings.service';

const defaultCommissionSettingsService = new DefaultCommissionSettingsService();

export class DefaultCommissionSettingsController {
  /**
   * Get current default commission settings
   */
  async getDefaultSettings(req: Request, res: Response) {
    try {
      const settings = await defaultCommissionSettingsService.getDefaultSettings();
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error fetching default commission settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch default commission settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update default commission settings
   */
  async updateDefaultSettings(req: Request, res: Response) {
    try {
      const settingsData: DefaultCommissionSettingsData = req.body;
      
      const updatedSettings = await defaultCommissionSettingsService.updateDefaultSettings(settingsData);
      
      res.json({
        success: true,
        message: 'Default commission settings updated successfully',
        data: updatedSettings
      });
    } catch (error) {
      console.error('Error updating default commission settings:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to update default commission settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all commission settings profiles
   */
  async getAllSettings(req: Request, res: Response) {
    try {
      const settings = await defaultCommissionSettingsService.getAllSettings();
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error fetching all commission settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch commission settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create new commission settings profile
   */
  async createSettings(req: Request, res: Response) {
    try {
      const { name, ...settingsData } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Settings name is required'
        });
      }

      const newSettings = await defaultCommissionSettingsService.createSettings(name, settingsData);
      
      res.status(201).json({
        success: true,
        message: 'Commission settings created successfully',
        data: newSettings
      });
    } catch (error) {
      console.error('Error creating commission settings:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to create commission settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete commission settings profile
   */
  async deleteSettings(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await defaultCommissionSettingsService.deleteSettings(id);
      
      res.json({
        success: true,
        message: 'Commission settings deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting commission settings:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to delete commission settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Activate specific commission settings profile
   */
  async activateSettings(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const activatedSettings = await defaultCommissionSettingsService.activateSettings(id);
      
      res.json({
        success: true,
        message: 'Commission settings activated successfully',
        data: activatedSettings
      });
    } catch (error) {
      console.error('Error activating commission settings:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to activate commission settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}