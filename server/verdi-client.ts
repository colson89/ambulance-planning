import type { Shift, VerdiUserMapping, VerdiPositionMapping, VerdiStationConfig, User } from "../shared/schema";

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
  private getBasicAuthHeader(authId: string, authSecret: string): string {
    const credentials = Buffer.from(`${authId}:${authSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Stuurt een shift naar Verdi
   * @param shift De shift uit onze database
   * @param stationConfig De Verdi configuratie van het station
   * @param userMappings Map van user mappings (userId -> personGuid)
   * @param positionMappings Array van position mappings voor dit station
   * @param assignedUsers Array van User objecten die toegewezen zijn aan deze shift (max 3)
   * @param existingVerdiShiftGuid Optioneel: GUID van bestaande Verdi shift voor update
   */
  async sendShiftToVerdi(
    shift: Shift,
    stationConfig: VerdiStationConfig,
    userMappings: Map<number, VerdiUserMapping>,
    positionMappings: VerdiPositionMapping[],
    assignedUsers: User[],
    existingVerdiShiftGuid?: string
  ): Promise<VerdiResponse> {
    // Validatie
    if (!stationConfig.verdiUrl) {
      throw new Error("Station heeft geen Verdi URL geconfigureerd");
    }
    
    if (!stationConfig.authId) {
      throw new Error("Station heeft geen Verdi Auth ID geconfigureerd");
    }
    
    if (!stationConfig.authSecret) {
      throw new Error("Station heeft geen Verdi Auth Secret geconfigureerd");
    }
    
    if (!stationConfig.shiftSheetGuid) {
      throw new Error("Station heeft geen shiftSheet GUID geconfigureerd");
    }

    if (assignedUsers.length === 0 || assignedUsers.length > 3) {
      throw new Error(`Ongeldige aantal assignments: ${assignedUsers.length}. Moet tussen 1 en 3 zijn.`);
    }

    // Bouw assignments array
    const verdiAssignments: VerdiShiftAssignment[] = [];
    for (let i = 0; i < assignedUsers.length; i++) {
      const user = assignedUsers[i];
      const userMapping = userMappings.get(user.id);

      if (!userMapping) {
        throw new Error(`Gebruiker ${user.id} (${user.firstName} ${user.lastName}) heeft geen Verdi person GUID mapping`);
      }

      // Zoek de position mapping voor deze positie index
      // Posities beginnen bij 1: eerste persoon = positie 1 (Chauffeur), tweede persoon = positie 2 (Ambulancier)
      const positionIndex = i + 1;
      const positionMapping = positionMappings.find(pm => pm.positionIndex === positionIndex);

      if (!positionMapping) {
        const positionName = positionIndex === 1 ? 'Chauffeur' : positionIndex === 2 ? 'Ambulancier' : `Positie ${positionIndex}`;
        throw new Error(
          `Geen Verdi position mapping gevonden voor Positie ${positionIndex} (${positionName}). ` +
          `Configureer eerst de position mappings in Verdi instellingen.`
        );
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
    const url = `${stationConfig.verdiUrl}/comm-api/hooks/v1/ShiftPlanning`;
    
    console.log(`Sending shift to Verdi: ${url}`, {
      shiftId: shift.id,
      stationId: shift.stationId,
      assignments: assignedUsers.length,
      isUpdate: !!existingVerdiShiftGuid
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getBasicAuthHeader(stationConfig.authId, stationConfig.authSecret)
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
}

export const verdiClient = new VerdiClient();
