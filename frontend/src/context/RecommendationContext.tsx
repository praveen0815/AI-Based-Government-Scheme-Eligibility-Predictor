import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { CitizenProfile, RecommendResponse } from "../types/api";

interface RecommendationState {
  profile: CitizenProfile | null;
  result: RecommendResponse | null;
  setSubmission: (profile: CitizenProfile, result: RecommendResponse) => void;
  clearResult: () => void;
}

const RecommendationContext = createContext<RecommendationState | null>(null);

export function RecommendationProvider({
  children,
  initialProfile = null,
  initialResult = null,
}: {
  children: ReactNode;
  initialProfile?: CitizenProfile | null;
  initialResult?: RecommendResponse | null;
}) {
  const [profile, setProfile] = useState<CitizenProfile | null>(initialProfile);
  const [result, setResult] = useState<RecommendResponse | null>(initialResult);

  const value = useMemo<RecommendationState>(
    () => ({
      profile,
      result,
      setSubmission: (nextProfile, nextResult) => {
        setProfile(nextProfile);
        setResult(nextResult);
      },
      clearResult: () => setResult(null),
    }),
    [profile, result],
  );

  return (
    <RecommendationContext.Provider value={value}>{children}</RecommendationContext.Provider>
  );
}

// Hook lives with the provider; this is the standard React context pattern.
// eslint-disable-next-line react-refresh/only-export-components
export function useRecommendation(): RecommendationState {
  const context = useContext(RecommendationContext);
  if (!context) {
    throw new Error("useRecommendation must be used within RecommendationProvider");
  }
  return context;
}
