export interface Rocket {
  id: string;
  name: string;
  type: string;
  active: boolean;
  stages: number;
  boosters: number;
  cost_per_launch: number;
  success_rate_pct: number;
  first_flight: string;
  country: string;
  company: string;
  description: string;
  wikipedia: string;
  flickr_images: string[];
  height: { meters: number; feet: number };
  diameter: { meters: number; feet: number };
  mass: { kg: number; lb: number };
  payload_weights: {
    id: string;
    name: string;
    kg: number;
    lb: number;
  }[];
  engines: {
    number: number;
    type: string;
    version: string;
    propellant_1: string;
    propellant_2: string;
    thrust_sea_level: { kN: number; lbf: number };
    thrust_vacuum: { kN: number; lbf: number };
  };
}
