import type { Shift, VerdiUserMapping, VerdiPositionMapping, VerdiStationConfig, User } from "../shared/schema";

/**
 * Bepaalt of een datum in zomertijd (CEST) of wintertijd (CET) valt voor Europe/Brussels
 * Zomertijd: laatste zondag maart 02:00 → laatste zondag oktober 03:00 (UTC+2)
 * Wintertijd: rest van het jaar (UTC+1)
 */
function isDaylightSavingTime(date: Date): boolean {
  const year = date.getUTCFullYear();
  
  // Vind laatste zondag van maart (start zomertijd om 01:00 UTC = 02:00 CET)
  const marchLastDay = new Date(Date.UTC(year, 2, 31, 1, 0, 0));
  const marchLastSunday = new Date(marchLastDay);
  marchLastSunday.setUTCDate(31 - marchLastDay.getUTCDay());
  
  // Vind laatste zondag van oktober (einde zomertijd om 01:00 UTC = 03:00 CEST)
  const octoberLastDay = new Date(Date.UTC(year, 9, 31, 1, 0, 0));
  const octoberLastSunday = new Date(octoberLastDay);
  octoberLastSunday.setUTCDate(31 - octoberLastDay.getUTCDay());
  
  // Check of de datum tussen start en einde van zomertijd valt
  return date >= marchLastSunday && date < octoberLastSunday;
}

/**
 * Formatteert een Date object als ISO string met Europe/Brussels timezone offset
 * Database timestamps worden als UTC geïnterpreteerd door PostgreSQL
 * Verdi verwacht tijden in lokale tijd met timezone indicator
 * Voorbeeld: 2026-05-12T19:00:00+02:00 (zomertijd) of 2026-12-15T19:00:00+01:00 (wintertijd)
 */
function formatLocalDateTime(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  
  // Bepaal timezone offset: +02:00 voor zomertijd (CEST), +01:00 voor wintertijd (CET)
  const offset = isDaylightSavingTime(date) ? '+02:00' : '+01:00';
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`;
}

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
  shift: string; // GUID van de aangemaakte/aangepaste shift (Verdi gebruikt 'shift' als veldnaam)
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
   * @param emergencyShiftFlags Optioneel: Array van booleans die aangeven welke users emergency scheduled zijn
   */
  async sendShiftToVerdi(
    shift: Shift,
    stationConfig: VerdiStationConfig,
    userMappings: Map<number, VerdiUserMapping>,
    positionMappings: VerdiPositionMapping[],
    assignedUsers: User[],
    existingVerdiShiftGuid?: string,
    emergencyShiftFlags?: boolean[]
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
    // Track of GUID1 slot al gereserveerd is (voor rijbewijs C users)
    let emergencyGuid1Reserved = false;
    
    for (let i = 0; i < assignedUsers.length; i++) {
      const user = assignedUsers[i];
      const userMapping = userMappings.get(user.id);
      const isEmergencyScheduled = emergencyShiftFlags?.[i] || false;

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

      // Bepaal PersonGUID: voor noodinplanning gebruiken we de emergency PersonGUID van het station
      let personGuid: string;
      
      if (isEmergencyScheduled) {
        // Noodinplanning: kies GUID op basis van rijbewijs C
        // GUID 1 = met rijbewijs C, GUID 2 = zonder rijbewijs C of als fallback
        const hasLicenseC = user.hasDrivingLicenseC === true;
        
        // Selecteer GUID: GUID 1 voor rijbewijs C (tenzij al gereserveerd), anders GUID 2
        let selectedGuidNumber: 1 | 2;
        if (hasLicenseC && !emergencyGuid1Reserved && stationConfig.emergencyPersonGuid1) {
          selectedGuidNumber = 1;
          emergencyGuid1Reserved = true; // Reserveer GUID1 slot
        } else {
          selectedGuidNumber = 2;
        }
        
        const emergencyGuid = selectedGuidNumber === 1 
          ? stationConfig.emergencyPersonGuid1 
          : stationConfig.emergencyPersonGuid2;
          
        if (!emergencyGuid) {
          console.warn(
            `Noodinplanning voor ${user.firstName} ${user.lastName} (rijbewijs C: ${hasLicenseC}): ` +
            `geen nood PersonGUID ${selectedGuidNumber} geconfigureerd, proberen met user mapping...`
          );
          // Fallback: probeer toch de user mapping (voor het geval de user ook in dit station geregistreerd is)
          if (!userMapping) {
            throw new Error(
              `Noodinplanning voor ${user.firstName} ${user.lastName}: ` +
              `geen nood PersonGUID ${selectedGuidNumber} geconfigureerd en geen Verdi mapping gevonden. ` +
              `Configureer de nood PersonGUID in Verdi instellingen.`
            );
          }
          personGuid = userMapping.personGuid;
        } else {
          personGuid = emergencyGuid;
          console.log(
            `🚨 Noodinplanning: ${user.firstName} ${user.lastName} (rijbewijs C: ${hasLicenseC}) ` +
            `gebruikt nood PersonGUID ${selectedGuidNumber}: ${emergencyGuid}`
          );
        }
      } else {
        // Normale inplanning: gebruik user's Verdi mapping
        if (!userMapping) {
          throw new Error(`Gebruiker ${user.id} (${user.firstName} ${user.lastName}) heeft geen Verdi person GUID mapping`);
        }
        personGuid = userMapping.personGuid;
      }

      verdiAssignments.push({
        position: positionMapping.positionGuid,
        person: personGuid
      });
    }

    // Bouw request body
    // Gebruik formatLocalDateTime() om tijden te versturen zonder timezone conversie
    // Dit zorgt ervoor dat 7:00 in de database als 7:00 naar Verdi wordt gestuurd (niet als 7:00Z UTC)
    const requestBody: VerdiShiftRequest = {
      shiftSheet: stationConfig.shiftSheetGuid,
      start: formatLocalDateTime(shift.startTime),
      end: formatLocalDateTime(shift.endTime),
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
      isUpdate: !!existingVerdiShiftGuid,
      rawStartTime: shift.startTime,
      rawEndTime: shift.endTime,
      formattedStart: requestBody.start,
      formattedEnd: requestBody.end
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
        shift: data.shift,
        warnings: data.warningFeedback?.length || 0,
        errors: data.errorFeedback?.length || 0
      });

      // Log volledige error/warning details voor debugging
      if (data.errorFeedback && data.errorFeedback.length > 0) {
        console.error(`Verdi ERROR details:`, data.errorFeedback);
      }
      if (data.warningFeedback && data.warningFeedback.length > 0) {
        console.warn(`Verdi WARNING details:`, data.warningFeedback);
      }

      return data;
    } catch (error) {
      console.error("Error sending shift to Verdi:", error);
      throw error;
    }
  }

  /**
   * Verwijdert alle personen uit een shift in Verdi (de shift zelf blijft bestaan)
   * Volgens Verdi API: shifts kunnen niet verwijderd worden, maar je kan wel person: null
   * sturen voor alle posities, waardoor alle personen uit de shift worden verwijderd.
   * 
   * @param shift De shift uit onze database (voor start/end tijden)
   * @param verdiShiftGuid De GUID van de shift in Verdi
   * @param stationConfig De Verdi configuratie van het station
   * @param positionMappings Array van position mappings voor dit station
   */
  async clearShiftAssignments(
    shift: Shift,
    verdiShiftGuid: string,
    stationConfig: VerdiStationConfig,
    positionMappings: VerdiPositionMapping[]
  ): Promise<void> {
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

    // Bouw assignments met person: null voor elke positie
    // Dit verwijdert alle personen uit de shift in Verdi
    const verdiAssignments: VerdiShiftAssignment[] = positionMappings.map(pm => ({
      position: pm.positionGuid,
      person: null as any  // null verwijdert de persoon uit deze positie
    }));

    // Bouw request body - POST met shift GUID om bestaande shift te updaten
    const requestBody: VerdiShiftRequest = {
      shift: verdiShiftGuid,
      shiftSheet: stationConfig.shiftSheetGuid,
      start: formatLocalDateTime(shift.startTime),
      end: formatLocalDateTime(shift.endTime),
      assignments: verdiAssignments
    };

    const url = `${stationConfig.verdiUrl}/comm-api/hooks/v1/ShiftPlanning`;
    
    console.log(`\n========== VERDI CLEAR ASSIGNMENTS REQUEST ==========`);
    console.log(`URL: ${url}`);
    console.log(`Method: POST`);
    console.log(`Shift GUID: ${verdiShiftGuid}`);
    console.log(`Action: Alle personen uit shift verwijderen (person: null voor ${verdiAssignments.length} posities)`);
    console.log(`Authorization: Basic ****** (credentials verborgen)`);
    console.log(`=====================================================\n`);

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
        console.error(`\n========== VERDI CLEAR ASSIGNMENTS ERROR ==========`);
        console.error(`Status: ${response.status} ${response.statusText}`);
        console.error(`Body:`, errorText);
        console.error(`===================================================\n`);
        throw new Error(`Verdi API error tijdens clearen assignments (${response.status}): ${errorText}`);
      }

      const data: VerdiResponse = await response.json();
      
      console.log(`\n========== VERDI CLEAR ASSIGNMENTS RESPONSE ==========`);
      console.log(`Result: ${data.result}`);
      console.log(`Shift GUID: ${data.shift}`);
      console.log(`Warnings: ${data.warningFeedback?.length || 0}`);
      console.log(`Errors: ${data.errorFeedback?.length || 0}`);
      console.log(`======================================================\n`);

      // Log volledige error/warning details
      if (data.errorFeedback && data.errorFeedback.length > 0) {
        console.error(`Verdi ERROR details bij clearen assignments:`, data.errorFeedback);
      }
      if (data.warningFeedback && data.warningFeedback.length > 0) {
        console.warn(`Verdi WARNING details bij clearen assignments:`, data.warningFeedback);
      }

      if (data.result !== "Success") {
        throw new Error(`Verdi gaf geen Success terug bij clearen assignments: ${data.result}`);
      }

      console.log(`✓ Alle personen succesvol verwijderd uit Verdi shift ${verdiShiftGuid}`);
    } catch (error) {
      console.error(`\n========== VERDI CLEAR ASSIGNMENTS ERROR ==========`);
      console.error(`Shift GUID: ${verdiShiftGuid}`);
      console.error(`Error:`, error);
      console.error(`===================================================\n`);
      throw error;
    }
  }
}

export const verdiClient = new VerdiClient();
