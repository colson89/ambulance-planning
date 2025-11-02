import type { Shift, VerdiUserMapping, VerdiPositionMapping, VerdiStationConfig } from "../shared/schema";

interface VerdiShiftAssignment {
  position: string; // GUID van de position
  person: string;   // GUID van de person
}

interface VerdiShiftRequest {
  shiftSheet: string;  // GUID van de shift basic configuration
  shift?: string;      // GUID van bestaande shift (optioneel, voor updates)
  start: string;       // ISO 8601 datetime
  end: string;         // ISO 8601 datetime
  assignments: VerdiShiftAssignment[];
}

interface VerdiResponse {
  result: "Success" | "Error";
  warningFeedback: string[];
  errorFeedback: string[];
  shift: string; // GUID van de aangemaakte/aangepaste shift
}

export class VerdiClient {
  private baseUrl: string;
  private authId: string;
  private authSecret: string;

  constructor() {
    this.baseUrl = process.env.VERDI_URL || "https://kempen-staging.verdi.cloud";
    this.authId = process.env.VERDI_AUTH_ID || "";
    this.authSecret = process.env.VERDI_AUTH_SECRET || "";
  }

  private getBasicAuthHeader(): string {
    const credentials = Buffer.from(`${this.authId}:${this.authSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Stuurt een shift naar Verdi
   * @param shift De shift uit onze database
   * @param stationConfig De Verdi configuratie van het station
   * @param userMappings Array van user mappings (userId -> personGuid)
   * @param positionMappings Array van position mappings (stationId + index -> positionGuid)
   * @param assignments Array van userIds die toegewezen zijn aan deze shift (max 3)
   * @param existingVerdiShiftGuid Optioneel: GUID van bestaande Verdi shift voor update
   */
  async sendShiftToVerdi(
    shift: Shift,
    stationConfig: VerdiStationConfig,
    userMappings: Map<number, VerdiUserMapping>,
    positionMappings: Map<number, VerdiPositionMapping>,
    assignments: number[],
    existingVerdiShiftGuid?: string
  ): Promise<VerdiResponse> {
    // Validatie
    if (!stationConfig.shiftSheetGuid) {
      throw new Error("Station heeft geen shiftSheet GUID geconfigureerd");
    }

    if (assignments.length === 0 || assignments.length > 3) {
      throw new Error(`Ongeldige aantal assignments: ${assignments.length}. Moet tussen 1 en 3 zijn.`);
    }

    // Bouw assignments array
    const verdiAssignments: VerdiShiftAssignment[] = [];
    for (let i = 0; i < assignments.length; i++) {
      const userId = assignments[i];
      const userMapping = userMappings.get(userId);
      const positionMapping = positionMappings.get(i);

      if (!userMapping) {
        throw new Error(`Gebruiker ${userId} heeft geen Verdi person GUID mapping`);
      }

      if (!positionMapping) {
        throw new Error(`Positie ${i} voor station ${shift.stationId} heeft geen Verdi position GUID mapping`);
      }

      verdiAssignments.push({
        position: positionMapping.positionGuid,
        person: userMapping.personGuid
      });
    }

    // Bouw request body
    const requestBody: VerdiShiftRequest = {
      shiftSheet: stationConfig.shiftSheetGuid,
      start: shift.startTime.toISOString(),
      end: shift.endTime.toISOString(),
      assignments: verdiAssignments
    };

    // Voeg shift GUID toe voor updates
    if (existingVerdiShiftGuid) {
      requestBody.shift = existingVerdiShiftGuid;
    }

    // Stuur request naar Verdi
    const url = `${this.baseUrl}/comm-api/hooks/v1/ShiftPlanning`;
    
    console.log(`Sending shift to Verdi: ${url}`, {
      shiftId: shift.id,
      stationId: shift.stationId,
      assignments: assignments.length,
      isUpdate: !!existingVerdiShiftGuid
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getBasicAuthHeader()
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Verdi API error (${response.status}): ${errorText}`);
      }

      const data: VerdiResponse = await response.json();
      
      console.log(`Verdi response:`, {
        result: data.result,
        shiftGuid: data.shift,
        warnings: data.warningFeedback?.length || 0,
        errors: data.errorFeedback?.length || 0
      });

      return data;
    } catch (error) {
      console.error("Error sending shift to Verdi:", error);
      throw error;
    }
  }

  /**
   * Test de connectie met Verdi
   */
  async testConnection(): Promise<boolean> {
    if (!this.authId || !this.authSecret) {
      throw new Error("Verdi credentials zijn niet geconfigureerd");
    }

    try {
      // Probeer een dummy request (dit zal waarschijnlijk falen met validation errors,
      // maar als de auth werkt krijgen we een 200 response)
      const url = `${this.baseUrl}/comm-api/hooks/v1/ShiftPlanning`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getBasicAuthHeader()
        },
        body: JSON.stringify({
          shiftSheet: "test",
          start: new Date().toISOString(),
          end: new Date().toISOString(),
          assignments: []
        })
      });

      // Als we een 200 krijgen (zelfs met errors in de body), dan werkt de auth
      // Een 401/403 betekent dat de auth niet werkt
      if (response.status === 401 || response.status === 403) {
        return false;
      }

      return true;
    } catch (error) {
      console.error("Verdi connection test failed:", error);
      return false;
    }
  }
}

export const verdiClient = new VerdiClient();
