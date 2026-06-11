// services/prompt.service.ts

import { getGoldStarSystemPrompt, getSystemPromptForCategory } from "../utils";

export class PromptService {
  static generateForBusiness(business: any, callerNumber: string) {
    return getGoldStarSystemPrompt({
      userPhone: callerNumber,
    });
  }
}
