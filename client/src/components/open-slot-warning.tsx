import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { Shift } from "@shared/schema";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useState } from "react";

interface OpenSlotWarningProps {
  date: Date;
  shifts: Shift[];
  onAddShift?: (date: Date, startTime: string, endTime: string, userId?: number) => void;
  showAddButton?: boolean;
  users?: Array<{id: number, firstName: string, lastName: string}>;
  requiredStaff?: number; // Required for night shifts
  requiredDayStaff?: number; // Required for day shifts (morning & afternoon)
}

export function OpenSlotWarning({ 
  date, 
  shifts, 
  onAddShift, 
  showAddButton = false, 
  users = [], 
  requiredStaff = 2,
  requiredDayStaff = 2 
}: OpenSlotWarningProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("0");
  const [pendingShift, setPendingShift] = useState<{startTime: string, endTime: string, shiftType: "day" | "night"} | null>(null);
  
  // Add Shift Dialog extended state
  const [addShiftType, setAddShiftType] = useState<"day" | "night">("night");
  const [addShiftTimeMode, setAddShiftTimeMode] = useState<"standard" | "custom">("custom");
  const [addShiftStandardDayType, setAddShiftStandardDayType] = useState<"full" | "morning" | "afternoon">("full");
  const [addShiftCustomStartTime, setAddShiftCustomStartTime] = useState("19:00");
  const [addShiftCustomEndTime, setAddShiftCustomEndTime] = useState("07:00");

  // Filter shifts for this date
  const dayShifts = shifts.filter(s => 
    s.type === 'day' && 
    s.startTime && 
    s.endTime &&
    new Date(s.date).toDateString() === date.toDateString()
  );

  const nightShifts = shifts.filter(s => 
    s.type === 'night' && 
    s.startTime && 
    s.endTime &&
    new Date(s.date).toDateString() === date.toDateString()
  );

  // Helper function to extract clock hour (local time for coverage checks)
  const getClockHour = (timeValue: string | Date): number => {
    if (timeValue instanceof Date) return timeValue.getHours();
    if (typeof timeValue === 'string') {
      // If ISO with timezone (Z or +/-HH:MM), parse to Date to get local hour
      if (/Z|[+\-]\d{2}:\d{2}/.test(timeValue)) {
        const d = new Date(timeValue);
        if (!isNaN(d.getTime())) return d.getHours();
      }
      // Plain clock string HH:mm
      const m = timeValue.match(/^(\d{2}):(\d{2})/);
      if (m) return parseInt(m[1], 10);
      // Fallback
      const d2 = new Date(timeValue);
      if (!isNaN(d2.getTime())) return d2.getHours();
    }
    return 0;
  };

  // === DAY SHIFT COVERAGE ANALYSIS ===
  // Calculate staff coverage for morning (7-13) and afternoon (13-19) periods
  let morningStaff = 0;
  let afternoonStaff = 0;

  dayShifts.forEach(shift => {
    if (!shift.startTime || !shift.endTime || shift.userId === 0) return;

    const startHour = getClockHour(shift.startTime);
    const endHour = getClockHour(shift.endTime);

    // Full day shift (7-19): covers BOTH morning AND afternoon
    if (startHour === 7 && endHour === 19) {
      morningStaff++;
      afternoonStaff++;
    }
    // Morning shift (7-13): covers only morning
    else if (startHour === 7 && endHour === 13) {
      morningStaff++;
    }
    // Afternoon shift (13-19): covers only afternoon
    else if (startHour === 13 && endHour === 19) {
      afternoonStaff++;
    }
    // Custom shifts - check overlap with periods
    else {
      // Check if shift overlaps with morning (7-13)
      if (startHour < 13 && endHour > 7) {
        morningStaff++;
      }
      // Check if shift overlaps with afternoon (13-19)
      if (startHour < 19 && endHour > 13) {
        afternoonStaff++;
      }
    }
  });

  // === NIGHT SHIFT COVERAGE ANALYSIS ===
  // Convert night shifts to hourly time coverage
  const nightTimeSlots = Array.from({ length: 24 }, (_, hour) => {
    let staffCount = 0;

    nightShifts.forEach(shift => {
      if (!shift.startTime || !shift.endTime || shift.userId === 0) return;

      // Extract clock hours (timezone-agnostic)
      const startHour = getClockHour(shift.startTime);
      const endHour = getClockHour(shift.endTime);

      // Determine if overnight shift by comparing hours only
      const overnight = endHour <= startHour;
      
      // Coverage check based on overnight status
      if (overnight) {
        // Overnight shift: covers from start hour to 24:00, then 0:00 to end hour
        if (hour >= startHour || hour < endHour) {
          staffCount++;
        }
      } else {
        // Same day shift
        if (hour >= startHour && hour < endHour) {
          staffCount++;
        }
      }
    });

    return staffCount;
  });

  // === BUILD GAP SUGGESTIONS ===
  const suggestions: any[] = [];

  // 1. Check morning period (7:00-13:00)
  if (dayShifts.length > 0 && morningStaff < requiredDayStaff) {
    suggestions.push({
      period: 'morning',
      start: 7,
      end: 13,
      startFormatted: '07:00',
      endFormatted: '13:00',
      currentStaff: morningStaff,
      neededStaff: requiredDayStaff,
      type: 'gap',
      shiftType: 'day' as const
    });
  }

  // 2. Check afternoon period (13:00-19:00)
  if (dayShifts.length > 0 && afternoonStaff < requiredDayStaff) {
    suggestions.push({
      period: 'afternoon',
      start: 13,
      end: 19,
      startFormatted: '13:00',
      endFormatted: '19:00',
      currentStaff: afternoonStaff,
      neededStaff: requiredDayStaff,
      type: 'gap',
      shiftType: 'day' as const
    });
  }

  // 3. Check night period (19:00-07:00) - only if there are night shifts
  if (nightShifts.length > 0) {
    const nightHours = [19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6];
    
    // Check if there are ANY gaps at all
    const hasNightGaps = nightHours.some(hour => nightTimeSlots[hour] < requiredStaff);
    
    if (hasNightGaps) {
      // Build gap suggestions for periods with insufficient coverage
      let gapStart = -1;
      
      for (let i = 0; i < nightHours.length; i++) {
        const hour = nightHours[i];
        const staffCount = nightTimeSlots[hour];
        
        if (staffCount < requiredStaff) {
          if (gapStart === -1) {
            gapStart = i; // Store index in nightHours array
          }
        } else {
          if (gapStart !== -1) {
            // Found end of gap
            const startHour = nightHours[gapStart];
            const endHour = nightHours[i];
            
            suggestions.push({
              period: 'night',
              start: startHour,
              end: endHour,
              startFormatted: String(startHour).padStart(2, '0') + ':00',
              endFormatted: String(endHour).padStart(2, '0') + ':00',
              currentStaff: Math.min(...nightHours.slice(gapStart, i).map(h => nightTimeSlots[h])),
              neededStaff: requiredStaff,
              type: 'gap',
              shiftType: 'night' as const
            });
            gapStart = -1;
          }
        }
      }
      
      // Handle case where gap extends to the end of night shift
      if (gapStart !== -1) {
        const startHour = nightHours[gapStart];
        const endHour = 7; // End of night shift
        
        suggestions.push({
          period: 'night',
          start: startHour,
          end: endHour,
          startFormatted: String(startHour).padStart(2, '0') + ':00',
          endFormatted: String(endHour).padStart(2, '0') + ':00',
          currentStaff: Math.min(...nightHours.slice(gapStart).map(h => nightTimeSlots[h])),
          neededStaff: requiredStaff,
          type: 'gap',
          shiftType: 'night' as const
        });
      }
    }
  }

  // Don't show warning if no gaps detected
  if (suggestions.length === 0) return null;

  return (
    <>
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-orange-800 mb-2">
                Open tijdsloten gedetecteerd voor {format(date, "dd MMMM", { locale: nl })}
              </div>
              
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-orange-200 last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-orange-700 border-orange-300">
                      {suggestion.startFormatted} - {suggestion.endFormatted}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {suggestion.currentStaff === 0 
                        ? `Geen dekking (${suggestion.neededStaff} ${suggestion.neededStaff === 1 ? 'persoon' : 'personen'} nodig)` 
                        : `${suggestion.currentStaff}/${suggestion.neededStaff} ${suggestion.neededStaff === 1 ? 'persoon' : 'personen'}`}
                    </span>
                  </div>
                  
                  {showAddButton && onAddShift && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPendingShift({
                          startTime: suggestion.startFormatted,
                          endTime: suggestion.endFormatted,
                          shiftType: suggestion.shiftType
                        });
                        // Reset dialog state
                        setAddShiftType(suggestion.shiftType);
                        setAddShiftTimeMode("custom");
                        setAddShiftCustomStartTime(suggestion.startFormatted);
                        setAddShiftCustomEndTime(suggestion.endFormatted);
                        setSelectedUserId("0");
                        setShowDialog(true);
                      }}
                      className="text-orange-700 border-orange-300 hover:bg-orange-100"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Shift toevoegen
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Extended Add Shift Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Shift Toevoegen</DialogTitle>
            <DialogDescription>
              Voeg een nieuwe shift toe voor {format(date, "dd MMMM yyyy", { locale: nl })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Shift Type Selectie */}
            <div className="grid gap-2">
              <Label>Shift Type</Label>
              <Select value={addShiftType} onValueChange={(value: "day" | "night") => setAddShiftType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Dagshift</SelectItem>
                  <SelectItem value="night">Nachtshift</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Tijd Mode Selectie */}
            <div className="grid gap-2">
              <Label>Tijden</Label>
              <Select value={addShiftTimeMode} onValueChange={(value: "standard" | "custom") => setAddShiftTimeMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standaard tijden</SelectItem>
                  <SelectItem value="custom">Custom tijden (noodgeval)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Standaard Dag Type (alleen voor dagshift met standaard tijden) */}
            {addShiftTimeMode === "standard" && addShiftType === "day" && (
              <div className="grid gap-2">
                <Label>Dagshift Variatie</Label>
                <Select value={addShiftStandardDayType} onValueChange={(value: "full" | "morning" | "afternoon") => setAddShiftStandardDayType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Volledige dag (07:00 - 19:00)</SelectItem>
                    <SelectItem value="morning">Voormiddag (07:00 - 13:00)</SelectItem>
                    <SelectItem value="afternoon">Namiddag (13:00 - 19:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Standaard Tijden Preview */}
            {addShiftTimeMode === "standard" && (
              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-sm font-medium text-blue-900">
                  {addShiftType === "night" && "Nachtshift: 19:00 - 07:00"}
                  {addShiftType === "day" && addShiftStandardDayType === "full" && "Dagshift: 07:00 - 19:00"}
                  {addShiftType === "day" && addShiftStandardDayType === "morning" && "Voormiddag: 07:00 - 13:00"}
                  {addShiftType === "day" && addShiftStandardDayType === "afternoon" && "Namiddag: 13:00 - 19:00"}
                </p>
              </div>
            )}
            
            {/* Custom Tijd Pickers */}
            {addShiftTimeMode === "custom" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start-time">Start Tijd</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={addShiftCustomStartTime}
                      onChange={(e) => setAddShiftCustomStartTime(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end-time">Eind Tijd</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={addShiftCustomEndTime}
                      onChange={(e) => setAddShiftCustomEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="p-3 bg-amber-50 rounded-md border border-amber-200">
                  <p className="text-sm text-amber-900">
                    <strong>Let op:</strong> Custom tijden zijn bedoeld voor noodgevallen. Voor reguliere shifts gebruik standaard tijden.
                  </p>
                </div>
              </>
            )}
            
            {/* Ambulancier Toewijzing */}
            <div className="grid gap-2">
              <Label>Toewijzing</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Open Shift (niet toegewezen)</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {`${user.firstName} ${user.lastName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={() => {
                if (onAddShift) {
                  let startTime = "";
                  let endTime = "";
                  
                  // Bepaal start en end tijd op basis van mode en type
                  if (addShiftTimeMode === "standard") {
                    if (addShiftType === "day") {
                      if (addShiftStandardDayType === "full") {
                        startTime = "07:00";
                        endTime = "19:00";
                      } else if (addShiftStandardDayType === "morning") {
                        startTime = "07:00";
                        endTime = "13:00";
                      } else if (addShiftStandardDayType === "afternoon") {
                        startTime = "13:00";
                        endTime = "19:00";
                      }
                    } else {
                      // night
                      startTime = "19:00";
                      endTime = "07:00";
                    }
                  } else {
                    // custom
                    startTime = addShiftCustomStartTime;
                    endTime = addShiftCustomEndTime;
                  }
                  
                  const userId = selectedUserId === "0" ? undefined : parseInt(selectedUserId);
                  onAddShift(date, startTime, endTime, userId);
                  setShowDialog(false);
                  setPendingShift(null);
                }
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Shift Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
