export interface VehicleSpec {
  id: string;
  name: string;
  inspiration: string;
  category: 'Sports' | 'Supercar' | 'Wagon' | 'SUV' | 'Sedan' | 'Hatchback' | 'Hypercar' | 'Truck' | 'Muscle';
  weightKg: number;
  engine: string;
  hp: number;
  torque: number;
  layout: 'MR' | 'FR' | 'FF' | 'AWD' | 'e-AWD';
  gearbox: string;
  trims: string[];
  dimensions: { length: number; width: number; height: number; wheelbase: number };
  springK: number;
  dampC: number;
  breakLimit: number;
  yieldLimit: number;
}

export const VEHICLE_ROSTER: VehicleSpec[] = [
  {
    id: 'hirochi_apex',
    name: 'Hirochi Apex NS-98',
    inspiration: '1998 Acura NSX',
    category: 'Sports',
    weightKg: 1388,
    engine: '3.2L DOHC V6',
    hp: 290,
    torque: 450,
    layout: 'MR',
    gearbox: '6-Speed Manual',
    trims: ['Factory Standard', 'Track Edition', 'Twin-Turbo Spec'],
    dimensions: { length: 4.42, width: 1.81, height: 1.17, wheelbase: 2.53 },
    springK: 3.2e6,
    dampC: 18000,
    breakLimit: 0.28,
    yieldLimit: 0.035
  },
  {
    id: 'bruckell_venom',
    name: 'Bruckell Venom VX-10',
    inspiration: '2016 Dodge Viper',
    category: 'Supercar',
    weightKg: 1528,
    engine: '8.4L Naturally Aspirated V10',
    hp: 645,
    torque: 600,
    layout: 'FR',
    gearbox: '6-Speed Heavy-Duty Manual',
    trims: ['GT', 'ACR Track Package', 'Drag Strip Special'],
    dimensions: { length: 4.46, width: 1.94, height: 1.24, wheelbase: 2.51 },
    springK: 3.8e6,
    dampC: 22000,
    breakLimit: 0.22,
    yieldLimit: 0.028
  },
  {
    id: 'solis_ecowagon',
    name: 'Solis EcoWagon V',
    inspiration: '2012 Toyota Prius V',
    category: 'Wagon',
    weightKg: 1483,
    engine: '1.8L Hybrid Inline-4',
    hp: 134,
    torque: 153,
    layout: 'FF',
    gearbox: 'eCVT',
    trims: ['Eco Base', 'Touring Comfort', 'Taxi Fleet Spec'],
    dimensions: { length: 4.61, width: 1.77, height: 1.57, wheelbase: 2.78 },
    springK: 2.5e6,
    dampC: 14000,
    breakLimit: 0.35,
    yieldLimit: 0.045
  },
  {
    id: 'hirochi_crossstar',
    name: 'Hirochi CrossStar HV',
    inspiration: '2021 Toyota Venza',
    category: 'SUV',
    weightKg: 1741,
    engine: '2.5L Hybrid e-AWD',
    hp: 219,
    torque: 221,
    layout: 'e-AWD',
    gearbox: 'eCVT Sequential Shift',
    trims: ['LE', 'XLE', 'Limited Luxe'],
    dimensions: { length: 4.74, width: 1.85, height: 1.67, wheelbase: 2.69 },
    springK: 2.9e6,
    dampC: 16500,
    breakLimit: 0.32,
    yieldLimit: 0.04
  },
  {
    id: 'bruckell_executive',
    name: 'Bruckell Executive V8',
    inspiration: '1988 American Full-size Sedan',
    category: 'Sedan',
    weightKg: 1868,
    engine: '5.0L Pushrod V8',
    hp: 180,
    torque: 270,
    layout: 'FR',
    gearbox: '4-Speed Automatic',
    trims: ['Fleet Taxi', 'Luxury V8', 'Police Interceptor'],
    dimensions: { length: 5.41, width: 1.98, height: 1.45, wheelbase: 2.95 },
    springK: 2.2e6,
    dampC: 12000,
    breakLimit: 0.42,
    yieldLimit: 0.065
  },
  {
    id: 'hirochi_surge',
    name: 'Hirochi Surge Turbo Rally',
    inspiration: '1998 Japanese AWD Hot Hatch',
    category: 'Hatchback',
    weightKg: 1197,
    engine: '2.0L Turbocharged Inline-4',
    hp: 276,
    torque: 260,
    layout: 'AWD',
    gearbox: '5-Speed Close-Ratio Manual',
    trims: ['1.5L Base', 'GT-Turbo', 'Group A Rally Spec'],
    dimensions: { length: 4.15, width: 1.71, height: 1.39, wheelbase: 2.45 },
    springK: 3.0e6,
    dampC: 17000,
    breakLimit: 0.3,
    yieldLimit: 0.038
  },
  {
    id: 'scintilla_velocita',
    name: 'Scintilla Velocita V12',
    inspiration: 'European Exotic V12 Hypercar',
    category: 'Hypercar',
    weightKg: 1428,
    engine: '6.5L High-Revving V12',
    hp: 780,
    torque: 530,
    layout: 'MR',
    gearbox: '7-Speed Dual-Clutch',
    trims: ['Stradale', 'Corse Track Edition', 'Prototype Speed Record'],
    dimensions: { length: 4.78, width: 2.05, height: 1.13, wheelbase: 2.70 },
    springK: 4.5e6,
    dampC: 26000,
    breakLimit: 0.19,
    yieldLimit: 0.02
  },
  {
    id: 'gavril_d15',
    name: 'Gavril D15 Heavy-Duty',
    inspiration: 'Full-Size Boxed Ladder Heavy Pickup',
    category: 'Truck',
    weightKg: 3107,
    engine: '6.7L Turbo-Diesel V8',
    hp: 475,
    torque: 1050,
    layout: 'AWD',
    gearbox: '10-Speed Heavy-Duty Automatic',
    trims: ['Work Truck', 'Off-Road Adventure', 'Dually Towing Spec'],
    dimensions: { length: 5.85, width: 2.12, height: 1.98, wheelbase: 3.65 },
    springK: 5.5e6,
    dampC: 32000,
    breakLimit: 0.45,
    yieldLimit: 0.05
  },
  {
    id: 'gavril_barricade',
    name: 'Gavril Barricade 429',
    inspiration: '1970 Big-Block Muscle Car',
    category: 'Muscle',
    weightKg: 1669,
    engine: '7.0L Big-Block V8 429',
    hp: 375,
    torque: 450,
    layout: 'FR',
    gearbox: '4-Speed Floor Manual',
    trims: ['302 Commuter', '429 Cobra Jet', 'Trans-Am Race Car'],
    dimensions: { length: 4.95, width: 1.88, height: 1.32, wheelbase: 2.74 },
    springK: 2.7e6,
    dampC: 15000,
    breakLimit: 0.38,
    yieldLimit: 0.055
  },
  {
    id: 'etk_856',
    name: 'ETK 856 tdb SportWagon',
    inspiration: 'Modern German Twin-Turbo Estate',
    category: 'Wagon',
    weightKg: 1859,
    engine: '3.0L Twin-Turbo Inline-6',
    hp: 503,
    torque: 479,
    layout: 'AWD',
    gearbox: '8-Speed Sport Shift',
    trims: ['854d Diesel', '856i Sport', 'tdb TrackWagon'],
    dimensions: { length: 4.82, width: 1.89, height: 1.44, wheelbase: 2.87 },
    springK: 3.6e6,
    dampC: 21000,
    breakLimit: 0.25,
    yieldLimit: 0.03
  }
];
