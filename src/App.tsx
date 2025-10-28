import { useState } from 'react';
import { Heart, Stethoscope, MapPin, Brain } from 'lucide-react';
import SymptomAssessment from './components/SymptomAssessment';
import TreatmentRecommendation from './components/TreatmentRecommendation';
import HospitalFinder from './components/HospitalFinder';
import MentalHealthConsultation from './components/MentalHealthConsultation';
import { supabase } from './lib/supabase';
import { generateTreatment } from './lib/treatmentDatabase';

type View = 'home' | 'assessment' | 'hospitals' | 'mental-health';

interface Symptom {
  name: string;
  severity: number;
}

interface Treatment {
  diagnosis: string;
  treatmentPlan: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  precautions: string;
  severityLevel: string;
}

function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleAssessmentComplete = async (symptoms: Symptom[], severityLevel: string) => {
    const treatmentData = generateTreatment(symptoms, severityLevel);

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: assessment } = await supabase
        .from('health_assessments')
        .insert({
          user_id: user.id,
          symptoms,
          severity_level: severityLevel
        })
        .select()
        .single();

      if (assessment) {
        await supabase
          .from('treatment_recommendations')
          .insert({
            assessment_id: assessment.id,
            diagnosis: treatmentData.diagnosis,
            treatment_plan: treatmentData.treatmentPlan,
            medications: treatmentData.medications,
            precautions: treatmentData.precautions
          });
      }
    }

    setTreatment({
      ...treatmentData,
      severityLevel
    });
  };

  const handleSignIn = async () => {
    const email = prompt('Enter your email:');
    const password = prompt('Enter your password:');

    if (email && password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (!signUpError) {
          setIsAuthenticated(true);
          alert('Account created! You are now signed in.');
        }
      } else {
        setIsAuthenticated(true);
      }
    }
  };

  const renderContent = () => {
    if (currentView === 'home') {
      return (
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Heart className="w-12 h-12 text-red-500" />
              <h1 className="text-5xl font-bold text-gray-900">AI Health Assistant</h1>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get personalized health recommendations, find nearby hospitals, and access mental health support
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button
              onClick={() => setCurrentView('assessment')}
              className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              <Stethoscope className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Health Assessment</h3>
              <p className="text-gray-600">
                Describe your symptoms and get AI-powered treatment recommendations with medication guidance
              </p>
            </button>

            <button
              onClick={() => setCurrentView('hospitals')}
              className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              <MapPin className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Find Hospitals</h3>
              <p className="text-gray-600">
                Locate nearby hospitals and medical facilities based on your location with directions
              </p>
            </button>

            <button
              onClick={() => setCurrentView('mental-health')}
              className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              <Brain className="w-16 h-16 text-teal-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Mental Health</h3>
              <p className="text-gray-600">
                Book online consultations with licensed therapists for mental health support
              </p>
            </button>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl p-6 border-2 border-blue-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Important Notice</h3>
            <p className="text-gray-700 text-sm">
              This AI Health Assistant provides general health information and recommendations. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. In case of emergency, call your local emergency number immediately.
            </p>
          </div>
        </div>
      );
    }

    if (currentView === 'assessment') {
      return (
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => {
              setCurrentView('home');
              setTreatment(null);
            }}
            className="mb-6 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </button>

          {!treatment ? (
            <SymptomAssessment onAssessmentComplete={handleAssessmentComplete} />
          ) : (
            <div className="space-y-6">
              <TreatmentRecommendation {...treatment} />
              <button
                onClick={() => setTreatment(null)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Start New Assessment
              </button>
            </div>
          )}
        </div>
      );
    }

    if (currentView === 'hospitals') {
      return (
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setCurrentView('home')}
            className="mb-6 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </button>
          <HospitalFinder />
        </div>
      );
    }

    if (currentView === 'mental-health') {
      return (
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setCurrentView('home')}
            className="mb-6 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </button>
          <MentalHealthConsultation />
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
            <Heart className="w-8 h-8 text-red-500" />
            <span className="text-2xl font-bold text-gray-900">AI Health Assistant</span>
          </div>
          <button
            onClick={handleSignIn}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {isAuthenticated ? 'Account' : 'Sign In'}
          </button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {renderContent()}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-600 text-sm">
          <p>© 2025 AI Health Assistant. For informational purposes only. Not a substitute for professional medical care.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
