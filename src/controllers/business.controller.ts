// controllers/business.controller.ts
import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import Business from "../models/business.model";
import Lead from "../models/lead.model";
const BUSINESSES_FILE = path.join(__dirname, "../data/businesses.json");

interface Business {
  id: string;
  phoneNumber: string;
  businessName: string;
  email?: string;
  category: string;
  userZipCode?: string;
  customInstructions?: string;
  firstMessage?: string;
  active: boolean;
  createdAt: string;
}

export class BusinessController {
  // Get all businesses
  static async getAll(req: Request, res: Response) {
    try {
      const businesses = await Business.find().lean(); // lean() for plain JS objects
      // Map _id to id for consistent API response
      const formatted = businesses.map((b) => ({
        ...b,
        id: b._id.toString(),
        _id: undefined,
      }));
      res.json(formatted);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  }

  // Get single business by ID
  static async getOne(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const business = await Business.findById(id).populate("Leads").lean();
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      // Format response
      const formatted = {
        ...business,
        Leads: business.Leads?.map((lead: any) => ({
          ...lead,
          callTranscription: lead?.callTranscription?.slice(-10),
        })),
        id: business._id.toString(),
        _id: undefined,
      };
      res.json(formatted);
    } catch (error) {
      console.error("Error fetching business:", error);
      res.status(500).json({ error: "Failed to fetch business" });
    }
  }

  // Get business by phone number (important for calls!)
  static async getByPhoneNumber(phoneNumber: string) {
    try {
      const business = await Business.findOne({
        phoneNumber,
        active: true,
      }).lean();
      if (!business) return null;
      // Return as plain object with id
      return {
        ...business,
        id: business._id.toString(),
        _id: undefined,
      };
    } catch (error) {
      console.error("Failed to find business by phone:", error);
      return null;
    }
  }
  // Get business by phone number (important for calls!)
  static async getBusinessById(businessId: string) {
    try {
      const business = await Business.findOne({
        _id: businessId,
        active: true,
      }).lean();
      if (!business) return null;
      // Return as plain object with id
      return {
        ...business,
        id: business._id.toString(),
        _id: undefined,
      };
    } catch (error) {
      console.error("Failed to find business by phone:", error);
      return null;
    }
  }

  // Create new business
  static async create(req: Request, res: Response) {
    try {
      const newBusinessData = req.body;

      // Map API field phoneNumber to schema field businessPhone
      const businessDoc = new Business({
        phoneNumber: newBusinessData.phoneNumber,
        businessName: newBusinessData.businessName,
        email: newBusinessData.email,
        category: newBusinessData.category,
        active: newBusinessData.active ?? true, // default to true if not provided
        Leads: [],
      });

      // Check if phone number already exists
      const existing = await Business.findOne({
        phoneNumber: businessDoc.phoneNumber,
      });
      if (existing) {
        return res
          .status(400)
          .json({ error: "Phone number already registered" });
      }

      await businessDoc.save();

      // Format response
      const formatted = {
        ...businessDoc.toObject(),
        id: businessDoc._id.toString(),
        _id: undefined,
      };
      res.status(201).json(formatted);
    } catch (error) {
      console.error("Error creating business:", error);
      res.status(500).json({ error: "Failed to create business" });
    }
  }

  // Update business
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updated = await Business.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true },
      ).lean();

      if (!updated) {
        return res.status(404).json({ error: "Business not found" });
      }

      // Format response
      const formatted = {
        ...updated,
        id: updated._id.toString(),
        _id: undefined,
      };
      res.json(formatted);
    } catch (error) {
      console.error("Error updating business:", error);
      res.status(500).json({ error: "Failed to update business" });
    }
  }

  // Delete business
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await Business.findByIdAndUpdate(
        id,
        { $set: { active: false } },
        { new: true, runValidators: true },
      ).lean();
      if (!deleted) {
        return res.status(404).json({ error: "Business not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting business:", error);
      res.status(500).json({ error: "Failed to delete business" });
    }
  }
}
