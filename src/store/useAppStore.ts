import { create } from 'zustand';

export interface UserState {
  id: string;
  name: string | null;
  email: string;
  domains: string[];
  skills: string[];
  locationPref: string | null;
}

export interface InternshipState {
  id: string;
  title: string;
  company: string;
  domain: string[];
  skills: string[];
  location: string | null;
  stipend: string | null;
  applyUrl: string | null;
  source: string | null;
  description: string | null;
}

export interface FiltersState {
  domain: string[];
  skills: string[];
  location: string | null;
}

interface AppState {
  user: UserState | null;
  internships: InternshipState[];
  filters: FiltersState;
  
  setUser: (user: UserState | null) => void;
  setInternships: (internships: InternshipState[]) => void;
  setFilters: (filters: FiltersState) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  internships: [],
  filters: {
    domain: [],
    skills: [],
    location: null,
  },
  
  setUser: (user) => set({ user }),
  setInternships: (internships) => set({ internships }),
  setFilters: (filters) => set({ filters }),
}));
