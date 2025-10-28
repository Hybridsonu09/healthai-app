import { useState, useEffect } from 'react';
import { MapPin, Phone, Navigation, Building2 } from 'lucide-react';
import { supabase, Hospital } from '../lib/supabase';

export default function HospitalFinder() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getUserLocation = () => {
    setLoading(true);
    setError('');

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
          setLoading(false);
        },
        (err) => {
          setError('Unable to access location. Please enable location services.');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    const fetchHospitals = async () => {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .order('name');

      if (error) {
        setError('Failed to load hospitals');
      } else if (data) {
        setHospitals(data);
      }
    };

    fetchHospitals();
  }, []);

  const sortedHospitals = userLocation
    ? [...hospitals].sort((a, b) => {
        const distA = calculateDistance(userLocation.lat, userLocation.lon, a.latitude, b.longitude);
        const distB = calculateDistance(userLocation.lat, userLocation.lon, b.latitude, b.longitude);
        return distA - distB;
      })
    : hospitals;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-8 h-8 text-red-600" />
        <h2 className="text-2xl font-bold text-gray-800">Nearby Hospitals</h2>
      </div>

      <div className="mb-6">
        <button
          onClick={getUserLocation}
          disabled={loading}
          className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Navigation className="w-5 h-5" />
          {loading ? 'Getting Location...' : userLocation ? 'Update Location' : 'Get My Location'}
        </button>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {userLocation && (
          <p className="text-green-600 text-sm mt-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location detected - showing hospitals by distance
          </p>
        )}
      </div>

      <div className="space-y-4">
        {sortedHospitals.map((hospital) => {
          const distance = userLocation
            ? calculateDistance(userLocation.lat, userLocation.lon, hospital.latitude, hospital.longitude)
            : null;

          return (
            <div key={hospital.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-red-300 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-800">{hospital.name}</h3>
                {hospital.emergency_available && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                    24/7 Emergency
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                  <span>{hospital.address}</span>
                </div>

                {hospital.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <a href={`tel:${hospital.phone}`} className="text-blue-600 hover:underline">
                      {hospital.phone}
                    </a>
                  </div>
                )}

                {hospital.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {hospital.specialties.map((specialty, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                )}

                {distance && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="text-green-700 font-medium">
                      {distance.toFixed(1)} km away
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded text-center hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Get Directions
                </a>
                {hospital.phone && (
                  <a
                    href={`tel:${hospital.phone}`}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Call
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
