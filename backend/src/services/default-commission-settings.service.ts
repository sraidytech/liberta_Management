import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DefaultCommissionSettingsData {
  baseCommission: number;
  tier78Bonus: number;
  tier80Bonus: number;
  tier82Bonus: number;
  upsellBonus: number;
  upsellMinPercent: number;
  pack2Bonus: number;
  pack2MinPercent: number;
  pack4Bonus: number;
  pack4MinPercent: number;
  [key: string]: number; // Add index signature for JSON compatibility
}

export class DefaultCommissionSettingsService {
  /**
   * Get the current default commission settings
   */
  async getDefaultSettings(): Promise<DefaultCommissionSettingsData> {
    try {
      const settings = await prisma.defaultCommissionSettings.findFirst({
        where: { 
          name: 'default',
          isActive: true 
        }
      });

      if (!settings) {
        // Return hardcoded defaults if no settings found
        return {
          baseCommission: 5000,
          tier78Bonus: 4000,
          tier80Bonus: 4500,
          tier82Bonus: 5000,
          upsellBonus: 1000,
          upsellMinPercent: 30,
          pack2Bonus: 500,
          pack2MinPercent: 50,
          pack4Bonus: 600,
          pack4MinPercent: 25
        };
      }

      return settings.settings as unknown as DefaultCommissionSettingsData;
    } catch (error) {
      console.error('Error fetching default commission settings:', error);
      throw error;
    }
  }

  /**
   * Update the default commission settings
   */
  async updateDefaultSettings(data: DefaultCommissionSettingsData): Promise<DefaultCommissionSettingsData> {
    try {
      // Validate the data
      this.validateSettingsData(data);

      const updatedSettings = await prisma.defaultCommissionSettings.upsert({
        where: { name: 'default' },
        update: {
          settings: data,
          updatedAt: new Date()
        },
        create: {
          name: 'default',
          settings: data,
          isActive: true
        }
      });

      return updatedSettings.settings as unknown as DefaultCommissionSettingsData;
    } catch (error) {
      console.error('Error updating default commission settings:', error);
      throw error;
    }
  }

  /**
   * Get all commission settings (for admin management)
   */
  async getAllSettings() {
    try {
      return await prisma.defaultCommissionSettings.findMany({
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error fetching all commission settings:', error);
      throw error;
    }
  }

  /**
   * Create a new commission settings profile
   */
  async createSettings(name: string, data: DefaultCommissionSettingsData) {
    try {
      this.validateSettingsData(data);

      return await prisma.defaultCommissionSettings.create({
        data: {
          name,
          settings: data,
          isActive: true
        }
      });
    } catch (error) {
      console.error('Error creating commission settings:', error);
      throw error;
    }
  }

  /**
   * Delete commission settings
   */
  async deleteSettings(id: string) {
    try {
      // Don't allow deletion of the default settings
      const settings = await prisma.defaultCommissionSettings.findUnique({
        where: { id }
      });

      if (settings?.name === 'default') {
        throw new Error('Cannot delete default commission settings');
      }

      return await prisma.defaultCommissionSettings.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Error deleting commission settings:', error);
      throw error;
    }
  }

  /**
   * Activate specific settings
   */
  async activateSettings(id: string) {
    try {
      // Deactivate all other settings
      await prisma.defaultCommissionSettings.updateMany({
        data: { isActive: false }
      });

      // Activate the selected settings
      return await prisma.defaultCommissionSettings.update({
        where: { id },
        data: { isActive: true }
      });
    } catch (error) {
      console.error('Error activating commission settings:', error);
      throw error;
    }
  }

  /**
   * Validate settings data
   */
  private validateSettingsData(data: DefaultCommissionSettingsData) {
    const requiredFields = [
      'baseCommission', 'tier78Bonus', 'tier80Bonus', 'tier82Bonus',
      'upsellBonus', 'upsellMinPercent', 'pack2Bonus', 'pack2MinPercent',
      'pack4Bonus', 'pack4MinPercent'
    ];

    for (const field of requiredFields) {
      if (!(field in data) || typeof data[field as keyof DefaultCommissionSettingsData] !== 'number') {
        throw new Error(`Invalid or missing field: ${field}`);
      }
    }

    // Validate percentage fields are between 0 and 100
    const percentageFields = ['upsellMinPercent', 'pack2MinPercent', 'pack4MinPercent'];
    for (const field of percentageFields) {
      const value = data[field as keyof DefaultCommissionSettingsData] as number;
      if (value < 0 || value > 100) {
        throw new Error(`${field} must be between 0 and 100`);
      }
    }

    // Validate commission amounts are positive
    const commissionFields = ['baseCommission', 'tier78Bonus', 'tier80Bonus', 'tier82Bonus', 'upsellBonus', 'pack2Bonus', 'pack4Bonus'];
    for (const field of commissionFields) {
      const value = data[field as keyof DefaultCommissionSettingsData] as number;
      if (value < 0) {
        throw new Error(`${field} must be a positive number`);
      }
    }
  }
}