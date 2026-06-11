import { Request, Response } from "express";
import Lead from "../models/lead.model";
import Business from "../models/business.model";

export class LeadController {
  // Get all leads (optionally populate business info)
  static async getAll(req: Request, res: Response) {
    try {
      const leads = await Lead.find().lean();
      const formatted = leads.map((lead) => ({
        ...lead,
        id: lead._id.toString(),
        _id: undefined,
      }));
      res.json(formatted);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  }

  // Get a single lead by ID
  static async getOne(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const lead = await Lead.findById(id).lean();
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      const formatted = {
        ...lead,
        id: lead._id.toString(),
        _id: undefined,
      };
      res.json(formatted);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  }

  // Get all leads for a specific business
  static async getByBusinessId(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
      const business = await Business.findById(businessId)
        .populate("Leads")
        .lean();
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      // The populated Leads field will contain the lead documents
      const leads = business.Leads || [];
      const formatted = leads.map((lead: any) => ({
        ...lead,
        id: lead._id.toString(),
        _id: undefined,
      }));
      res.json(formatted);
    } catch (error) {
      console.error("Error fetching leads for business:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  }

  // Create a new lead and associate it with a business
  static async create(req: Request, res: Response) {
    try {
      const { phoneNumber, callTranscription, outcome, businessId, status } =
        req.body;

      // Validate required fields
      if (!phoneNumber || !businessId) {
        return res
          .status(400)
          .json({ error: "phoneNumber and businessId are required" });
      }

      // Check if the business exists
      const business = await Business.findById(businessId);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      // Create the lead
      const lead = new Lead({
        phoneNumber,
        callTranscription: callTranscription || [],
        outcome: outcome || null,
        status: status || "in-progress",
      });
      await lead.save();

      // Associate lead with business
      business.Leads.push(lead._id);
      await business.save();

      const formatted = {
        ...lead.toObject(),
        id: lead._id.toString(),
        _id: undefined,
      };
      res.status(201).json(formatted);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  }

  // Update an existing lead
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Optional: if you want to prevent changing phoneNumber/businessId via update, filter them out
      const allowedUpdates = { ...updates };
      delete allowedUpdates.businessId; // business association should not be changed here

      const updatedLead = await Lead.findByIdAndUpdate(
        id,
        { $set: allowedUpdates },
        { new: true, runValidators: true },
      ).lean();

      if (!updatedLead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const formatted = {
        ...updatedLead,
        id: updatedLead._id.toString(),
        _id: undefined,
      };
      res.json(formatted);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  }

  // Delete a lead and remove its reference from the associated business
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Find the lead to know which business it belongs to
      const lead = await Lead.findById(id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Remove lead from business's Leads array - re-uncomment this
      // await Business.updateMany({ Leads: id }, { $pull: { Leads: id } });

      // Delete the lead document
      await Lead.findByIdAndDelete(id);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  }
  //  ====== HELPER ========
  static async createLead({
    phoneNumber,
    businessId,
    callTranscription = [],
    outcome = null,
    status = "in-progress",
  }: {
    phoneNumber: string;
    businessId: string;
    callTranscription?: any[];
    outcome?: string | null;
    status?: string;
  }) {
    // Validate required fields
    if (!phoneNumber || !businessId) {
      throw new Error("phoneNumber and businessId are required");
    }

    // Check if the business exists
    const business = await Business.findById(businessId);
    if (!business) {
      throw new Error("Business not found");
    }

    // Create the lead
    const lead = new Lead({
      phoneNumber,
      callTranscription,
      outcome,
      status,
    });
    await lead.save();

    // Associate lead with business
    business.Leads.push(lead._id);
    await business.save();

    return lead;
  }

  /**
   * Update a lead programmatically - can be called from anywhere
   */
  static async updateLead(
    leadId: string,
    updates: Partial<{
      callTranscription: any[];
      outcome: string | null;
      status: string;
    }>,
  ) {
    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!updatedLead) {
      throw new Error("Lead not found");
    }

    return updatedLead;
  }
  /**
   * Get Lead Details
   */
  static async getLead(
    id: string,
  ): Promise<{ phoneNumber?: string; error?: string }> {
    try {
      const lead = await Lead.findById(id).lean();
      if (!lead) {
        return { error: "Lead not found" };
      }
      const formatted = {
        ...lead,
        id: lead._id.toString(),
        _id: undefined,
      };
      return formatted;
    } catch (error) {
      console.error("Error fetching lead:", error);
      return { error: "Failed to fetch lead" };
    }
  }
  /**
   * Add a transcript entry to an existing lead
   */
  static async addTranscriptEntry(
    leadId: string,
    entry: { role: "user" | "agent"; message: string },
  ) {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    lead.callTranscription.push(entry);
    await lead.save();
    return lead;
  }
}
