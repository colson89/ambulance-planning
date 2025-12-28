import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronDown } from "lucide-react";
import { useAuth } from "../hooks/use-auth";

interface Station {
  id: number;
  name: string;
  code: string;
  displayName: string;
}

export function StationSwitcher() {
  const { user } = useAuth();
  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  console.log("🔍 StationSwitcher: COMPONENT LOADED");
  console.log("🔍 StationSwitcher: user =", user);

  // Get current station from sessionStorage
  useEffect(() => {
    const stationData = sessionStorage.getItem("selectedStation");
    if (stationData) {
      setCurrentStation(JSON.parse(stationData));
    }
  }, []);

  // Get accessible stations for this user
  const { data: accessibleStations, isLoading, error } = useQuery<Station[]>({
    queryKey: ["/api/user/stations"],
    enabled: !!user,
  });

  console.log("🔍 StationSwitcher: accessibleStations =", accessibleStations);
  console.log("🔍 StationSwitcher: isLoading =", isLoading);
  console.log("🔍 StationSwitcher: error =", error);

  // ALWAYS show something for debugging
  if (!user) {
    console.log("🔍 StationSwitcher: No user, showing placeholder");
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fef3c7', padding: '8px', borderRadius: '6px' }}>
        <Building2 style={{ width: '16px', height: '16px' }} />
        <span style={{ fontSize: '14px' }}>DEBUG: Geen gebruiker</span>
      </div>
    );
  }

  if (isLoading) {
    console.log("🔍 StationSwitcher: Loading stations");
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#dbeafe', padding: '8px', borderRadius: '6px' }}>
        <Building2 style={{ width: '16px', height: '16px' }} />
        <span style={{ fontSize: '14px' }}>Laden stations...</span>
      </div>
    );
  }

  if (error) {
    console.log("🔍 StationSwitcher: Error loading stations", error);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fecaca', padding: '8px', borderRadius: '6px' }}>
        <Building2 style={{ width: '16px', height: '16px' }} />
        <span style={{ fontSize: '14px' }}>Fout: {String(error)}</span>
      </div>
    );
  }

  if (!accessibleStations || !Array.isArray(accessibleStations)) {
    console.log("🔍 StationSwitcher: No stations data");
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fed7aa', padding: '8px', borderRadius: '6px' }}>
        <Building2 style={{ width: '16px', height: '16px' }} />
        <span style={{ fontSize: '14px' }}>Geen stations data</span>
      </div>
    );
  }

  if (accessibleStations.length <= 1) {
    console.log("🔍 StationSwitcher: Only 1 station, showing info");
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f3f4f6', padding: '8px', borderRadius: '6px' }}>
        <Building2 style={{ width: '16px', height: '16px' }} />
        <span style={{ fontSize: '14px' }}>1 station ({accessibleStations[0]?.displayName})</span>
      </div>
    );
  }

  const handleStationSwitch = async (station: Station) => {
    console.log("🔍 StationSwitcher: Switching to station", station);
    
    try {
      // Make API call to server to switch station in session
      const response = await fetch("/switch-station", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ stationId: station.id.toString() }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to switch station on server");
      }
      
      // Update local storage
      sessionStorage.setItem("selectedStation", JSON.stringify(station));
      
      // Redirect to dashboard (server redirects there after successful switch)
      window.location.href = "/dashboard";
      
    } catch (error) {
      console.error("Error switching station:", error);
      // Fallback to just updating localStorage and reloading
      sessionStorage.setItem("selectedStation", JSON.stringify(station));
      window.location.reload();
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          backgroundColor: 'white',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        <Building2 style={{ width: '16px', height: '16px' }} />
        <span>{currentStation?.displayName || "Station"}</span>
        <span style={{ 
          backgroundColor: '#f3f4f6', 
          padding: '2px 6px', 
          borderRadius: '12px', 
          fontSize: '12px' 
        }}>
          {accessibleStations.length}
        </span>
        <ChevronDown style={{ width: '12px', height: '12px' }} />
      </button>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          marginTop: '4px',
          backgroundColor: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          minWidth: '224px',
          zIndex: 50
        }}>
          {accessibleStations.map((station: Station) => (
            <div
              key={station.id}
              onClick={() => handleStationSwitch(station)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                cursor: 'pointer',
                borderBottom: '1px solid #f3f4f6',
                backgroundColor: currentStation?.id === station.id ? '#f9fafb' : 'white'
              }}
              onMouseEnter={(e) => {
                if (currentStation?.id !== station.id) {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }
              }}
              onMouseLeave={(e) => {
                if (currentStation?.id !== station.id) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: '500' }}>{station.displayName}</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>{station.code}</span>
              </div>
              {currentStation?.id === station.id && (
                <span style={{ 
                  backgroundColor: '#3b82f6', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px' 
                }}>
                  Actief
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}