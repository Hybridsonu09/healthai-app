import { useState, useEffect } from 'react';
import { Heart, Stethoscope, User, FileText, LogOut } from 'lucide-react';
import AuthForm from './components/AuthForm';
import UserProfile from './components/UserProfile';
import HealthDocuments from './components/HealthDocuments';
import SymptomAssessment from './components/SymptomAssessment';
import PreliminaryAnalysis from './components/PreliminaryAnalysis';
import TreatmentRecommendation from './components/TreatmentRecommendation';
import AppointmentBooking from './components/AppointmentBooking';
import MentalHealthConsultation from './components/MentalHealthConsultation';
import { supabase } from './lib/supabase';
import { generateTreatment } from './lib/treatmentDatabase';
import { generatePreliminaryAnalysis } from './lib/preliminaryAnalysis';

type View = 'auth' | 'profile' | 'documents' | 'home' | 'assessment' | 'mental-health';
type AssessmentStep = 'symptoms' | 'analysis' | 'treatment' | 'booking';

interface Symptom {
  name: string;
  severity: number;
}

interface UserProfile {
  age?: number;
  chronic_conditions?: string[];
  allergies?: string[];
}

interface Analysis {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  urgency: 'routine' | 'urgent' | 'emergency';
  preliminary_diagnosis: string;
  recommended_specialist: string;
  analysis_summary: string;
  key_findings: string[];
  warning_signs: string[];
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
  const [currentView, setCurrentView] = useState<View>('auth');
  const [assessmentStep, setAssessmentStep] = useState<AssessmentStep>('symptoms');
  const [user, setUser] = useState<any>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentSymptoms, setCurrentSymptoms] = useState<Symptom[]>([]);
  const [currentSeverity, setCurrentSeverity] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      await checkProfile(user.id);
    }
  };

  const checkProfile = async (userId: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setHasProfile(true);
      const age = data.date_of_birth
        ? new Date().getFullYear() - new Date(data.date_of_birth).getFullYear()
        : undefined;
      setUserProfile({
        age,
        chronic_conditions: data.chronic_conditions || [],
        allergies: data.allergies || []
      });
      setCurrentView('home');
    } else {
      setCurrentView('profile');
    }
  };

  const handleAuthSuccess = () => {
    checkAuth();
  };

  const handleProfileComplete = () => {
    checkAuth();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setHasProfile(false);
    setCurrentView('auth');
  };

  const handleAssessmentComplete = async (symptoms: Symptom[], severityLevel: string) => {
    setCurrentSymptoms(symptoms);
    setCurrentSeverity(severityLevel);

    const preliminaryAnalysis = generatePreliminaryAnalysis(symptoms, userProfile || undefined);
    setAnalysis(preliminaryAnalysis);

    const treatmentData = generateTreatment(symptoms, severityLevel);
    setTreatment({
      ...treatmentData,
      severityLevel
    });

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
        setCurrentAssessmentId(assessment.id);

        await supabase
          .from('preliminary_analyses')
          .insert({
            assessment_id: assessment.id,
            risk_level: preliminaryAnalysis.risk_level,
            urgency: preliminaryAnalysis.urgency,
            preliminary_diagnosis: preliminaryAnalysis.preliminary_diagnosis,
            recommended_specialist: preliminaryAnalysis.recommended_specialist,
            analysis_summary: preliminaryAnalysis.analysis_summary
          });

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

    setAssessmentStep('analysis');
  };

  const handleViewTreatment = () => {
    setAssessmentStep('treatment');
  };

  const handleBookAppointment = () => {
    setAssessmentStep('booking');
  };

  const handleBookingComplete = () => {
    setAssessmentStep('symptoms');
    setCurrentSymptoms([]);
    setAnalysis(null);
    setTreatment(null);
    setCurrentAssessmentId(null);
    setCurrentView('home');
  };

  const renderContent = () => {
    if (currentView === 'auth') {
      return (
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Heart className="w-16 h-16 text-red-500" />
              <h1 className="text-5xl font-bold text-gray-900">AI Health Assistant</h1>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Your personal healthcare companion with AI-powered symptom analysis, treatment recommendations, and appointment booking
            </p>
          </div>
          <AuthForm onAuthSuccess={handleAuthSuccess} />
        </div>
      );
    }

    if (currentView === 'profile') {
      return (
        <div className="max-w-4xl mx-auto">
          <UserProfile onProfileComplete={handleProfileComplete} />
        </div>
      );
    }

    if (currentView === 'documents') {
      return (
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setCurrentView('home')}
            className="mb-6 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </button>
          <HealthDocuments />
        </div>
      );
    }

    if (currentView === 'assessment') {
      return (
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => {
              setCurrentView('home');
              setAssessmentStep('symptoms');
              setAnalysis(null);
              setTreatment(null);
            }}
            className="mb-6 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </button>

          {assessmentStep === 'symptoms' && (
            <SymptomAssessment onAssessmentComplete={handleAssessmentComplete} />
          )}

          {assessmentStep === 'analysis' && analysis && (
            <div className="space-y-6">
              <PreliminaryAnalysis
                riskLevel={analysis.risk_level}
                urgency={analysis.urgency}
                preliminaryDiagnosis={analysis.preliminary_diagnosis}
                recommendedSpecialist={analysis.recommended_specialist}
                analysisSummary={analysis.analysis_summary}
                keyFindings={analysis.key_findings}
                warningSigns={analysis.warning_signs}
                onBookAppointment={handleBookAppointment}
              />
              <button
                onClick={handleViewTreatment}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                View Detailed Treatment Recommendations
              </button>
            </div>
          )}

          {assessmentStep === 'treatment' && treatment && (
            <div className="space-y-6">
              <TreatmentRecommendation {...treatment} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setAssessmentStep('analysis')}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Back to Analysis
                </button>
                <button
                  onClick={handleBookAppointment}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Book Hospital Appointment
                </button>
              </div>
            </div>
          )}

          {assessmentStep === 'booking' && (
            <AppointmentBooking
              assessmentId={currentAssessmentId || undefined}
              onBookingComplete={handleBookingComplete}
            />
          )}
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

    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Heart className="w-12 h-12 text-red-500" />
            <h1 className="text-5xl font-bold text-gray-900">Welcome Back!</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            How can we help you today?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <button
            onClick={() => setCurrentView('profile')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all transform hover:-translate-y-1"
          >
            <User className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">My Profile</h3>
            <p className="text-sm text-gray-600">
              Update your health information
            </p>
          </button>

          <button
            onClick={() => setCurrentView('documents')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all transform hover:-translate-y-1"
          >
            <FileText className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Health Documents</h3>
            <p className="text-sm text-gray-600">
              Manage your medical records
            </p>
          </button>

          <button
            onClick={() => {
              setCurrentView('assessment');
              setAssessmentStep('symptoms');
            }}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all transform hover:-translate-y-1"
          >
            <Stethoscope className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Health Assessment</h3>
            <p className="text-sm text-gray-600">
              Get AI-powered analysis
            </p>
          </button>

          <button
            onClick={() => setCurrentView('mental-health')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all transform hover:-translate-y-1"
          >
            <Heart className="w-12 h-12 text-teal-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Mental Health</h3>
            <p className="text-sm text-gray-600">
              Book therapy consultation
            </p>
          </button>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl p-6 border-2 border-blue-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Important Notice</h3>
          <p className="text-gray-700 text-sm">
            This AI Health Assistant provides general health information and preliminary analysis. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare providers for proper evaluation and care. In case of emergency, call 911 immediately.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => user && setCurrentView('home')}
          >
            <Heart className="w-8 h-8 text-red-500" />
            <span className="text-2xl font-bold text-gray-900">AI Health Assistant</span>
          </div>
          {user && (
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}
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
