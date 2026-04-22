// AISC Steel Construction Manual, 16th Edition — Table 1-1 (W-Shapes)
// All dimensions in inches, areas in in², moments of inertia in in⁴,
// section moduli in in³, radii of gyration in inches, weight in lb/ft.
// Values taken from AISC published tables.

export type WShape = {
  designation: string
  d: number      // overall depth, in
  bf: number     // flange width, in
  tw: number     // web thickness, in
  tf: number     // flange thickness, in
  A: number      // cross-sectional area, in²
  Ix: number     // strong-axis moment of inertia, in⁴
  Sx: number     // strong-axis elastic section modulus, in³
  Zx: number     // strong-axis plastic section modulus, in³
  rx: number     // strong-axis radius of gyration, in
  Iy: number     // weak-axis moment of inertia, in⁴
  Sy: number     // weak-axis elastic section modulus, in³
  Zy: number     // weak-axis plastic section modulus, in³
  ry: number     // weak-axis radius of gyration, in
  h_tw: number   // web slenderness ratio h/t_w (AISC Table 1-1)
  weight: number // nominal weight, lb/ft
}

export const W_SHAPES: WShape[] = [
  { designation: 'W8X10',  d: 7.89,  bf: 3.94,   tw: 0.170, tf: 0.205, A: 2.96, Ix: 30.8,  Sx: 7.81,  Zx: 8.87,  rx: 3.22, Iy: 2.09,  Sy: 1.06, Zy: 1.66, ry: 0.841, h_tw: 40.5, weight: 10 },
  { designation: 'W8X15',  d: 8.11,  bf: 4.015,  tw: 0.245, tf: 0.315, A: 4.44, Ix: 48.0,  Sx: 11.8,  Zx: 13.6,  rx: 3.29, Iy: 3.41,  Sy: 1.70, Zy: 2.67, ry: 0.876, h_tw: 28.1, weight: 15 },
  { designation: 'W8X18',  d: 8.14,  bf: 5.250,  tw: 0.230, tf: 0.330, A: 5.26, Ix: 61.9,  Sx: 15.2,  Zx: 17.0,  rx: 3.43, Iy: 7.97,  Sy: 3.04, Zy: 4.66, ry: 1.23,  h_tw: 29.9, weight: 18 },
  { designation: 'W8X24',  d: 7.93,  bf: 6.495,  tw: 0.245, tf: 0.400, A: 7.08, Ix: 82.7,  Sx: 20.9,  Zx: 23.1,  rx: 3.42, Iy: 18.3,  Sy: 5.63, Zy: 8.57, ry: 1.61,  h_tw: 25.8, weight: 24 },
  { designation: 'W8X31',  d: 8.00,  bf: 7.995,  tw: 0.285, tf: 0.435, A: 9.12, Ix: 110,   Sx: 27.5,  Zx: 30.4,  rx: 3.47, Iy: 37.1,  Sy: 9.27, Zy: 14.1, ry: 2.02,  h_tw: 22.3, weight: 31 },
  { designation: 'W8X40',  d: 8.25,  bf: 8.070,  tw: 0.360, tf: 0.560, A: 11.7, Ix: 146,   Sx: 35.5,  Zx: 39.8,  rx: 3.53, Iy: 49.1,  Sy: 12.2, Zy: 18.5, ry: 2.04,  h_tw: 17.6, weight: 40 },

  { designation: 'W10X12', d: 9.87,  bf: 3.960,  tw: 0.190, tf: 0.210, A: 3.54, Ix: 53.8,  Sx: 10.9,  Zx: 12.6,  rx: 3.90, Iy: 2.18,  Sy: 1.10, Zy: 1.74, ry: 0.785, h_tw: 46.6, weight: 12 },
  { designation: 'W10X17', d: 10.11, bf: 4.010,  tw: 0.240, tf: 0.330, A: 4.99, Ix: 81.9,  Sx: 16.2,  Zx: 18.7,  rx: 4.05, Iy: 3.56,  Sy: 1.78, Zy: 2.80, ry: 0.845, h_tw: 36.9, weight: 17 },
  { designation: 'W10X22', d: 10.17, bf: 5.750,  tw: 0.240, tf: 0.360, A: 6.49, Ix: 118,   Sx: 23.2,  Zx: 26.0,  rx: 4.27, Iy: 11.4,  Sy: 3.97, Zy: 6.10, ry: 1.33,  h_tw: 36.9, weight: 22 },
  { designation: 'W10X30', d: 10.47, bf: 5.810,  tw: 0.300, tf: 0.510, A: 8.84, Ix: 170,   Sx: 32.4,  Zx: 36.6,  rx: 4.38, Iy: 16.7,  Sy: 5.75, Zy: 8.84, ry: 1.37,  h_tw: 29.5, weight: 30 },
  { designation: 'W10X45', d: 10.10, bf: 8.020,  tw: 0.350, tf: 0.620, A: 13.3, Ix: 248,   Sx: 49.1,  Zx: 54.9,  rx: 4.32, Iy: 53.4,  Sy: 13.3, Zy: 20.3, ry: 2.01,  h_tw: 22.5, weight: 45 },

  { designation: 'W12X14', d: 11.91, bf: 3.970,  tw: 0.200, tf: 0.225, A: 4.16, Ix: 88.6,  Sx: 14.9,  Zx: 17.4,  rx: 4.62, Iy: 2.36,  Sy: 1.19, Zy: 1.90, ry: 0.753, h_tw: 54.3, weight: 14 },
  { designation: 'W12X19', d: 12.16, bf: 4.005,  tw: 0.235, tf: 0.350, A: 5.57, Ix: 130,   Sx: 21.3,  Zx: 24.7,  rx: 4.82, Iy: 3.76,  Sy: 1.88, Zy: 2.98, ry: 0.822, h_tw: 46.2, weight: 19 },
  { designation: 'W12X26', d: 12.22, bf: 6.490,  tw: 0.230, tf: 0.380, A: 7.65, Ix: 204,   Sx: 33.4,  Zx: 37.2,  rx: 5.17, Iy: 17.3,  Sy: 5.34, Zy: 8.17, ry: 1.51,  h_tw: 47.2, weight: 26 },
  { designation: 'W12X35', d: 12.50, bf: 6.560,  tw: 0.300, tf: 0.520, A: 10.3, Ix: 285,   Sx: 45.6,  Zx: 51.2,  rx: 5.25, Iy: 24.5,  Sy: 7.47, Zy: 11.5, ry: 1.54,  h_tw: 36.2, weight: 35 },
  { designation: 'W12X50', d: 12.19, bf: 8.080,  tw: 0.370, tf: 0.640, A: 14.6, Ix: 391,   Sx: 64.2,  Zx: 71.9,  rx: 5.18, Iy: 56.3,  Sy: 13.9, Zy: 21.3, ry: 1.96,  h_tw: 26.8, weight: 50 },
  { designation: 'W12X65', d: 12.12, bf: 12.000, tw: 0.390, tf: 0.605, A: 19.1, Ix: 533,   Sx: 87.9,  Zx: 96.8,  rx: 5.28, Iy: 174,   Sy: 29.1, Zy: 44.1, ry: 3.02,  h_tw: 24.9, weight: 65 },

  { designation: 'W14X22', d: 13.74, bf: 5.000,  tw: 0.230, tf: 0.335, A: 6.49, Ix: 199,   Sx: 29.0,  Zx: 33.2,  rx: 5.54, Iy: 7.00,  Sy: 2.80, Zy: 4.39, ry: 1.04,  h_tw: 53.3, weight: 22 },
  { designation: 'W14X30', d: 13.84, bf: 6.730,  tw: 0.270, tf: 0.385, A: 8.85, Ix: 291,   Sx: 42.0,  Zx: 47.3,  rx: 5.73, Iy: 19.6,  Sy: 5.82, Zy: 8.99, ry: 1.49,  h_tw: 45.4, weight: 30 },
  { designation: 'W14X43', d: 13.66, bf: 7.995,  tw: 0.305, tf: 0.530, A: 12.6, Ix: 428,   Sx: 62.6,  Zx: 69.6,  rx: 5.82, Iy: 45.2,  Sy: 11.3, Zy: 17.3, ry: 1.89,  h_tw: 37.4, weight: 43 },
  { designation: 'W14X68', d: 14.04, bf: 10.035, tw: 0.415, tf: 0.720, A: 20.0, Ix: 722,   Sx: 103,   Zx: 115,   rx: 6.01, Iy: 121,   Sy: 24.2, Zy: 36.9, ry: 2.46,  h_tw: 27.5, weight: 68 },
  { designation: 'W14X90', d: 14.02, bf: 14.520, tw: 0.440, tf: 0.710, A: 26.5, Ix: 999,   Sx: 143,   Zx: 157,   rx: 6.14, Iy: 362,   Sy: 49.9, Zy: 75.6, ry: 3.70,  h_tw: 25.9, weight: 90 },

  { designation: 'W16X26', d: 15.69, bf: 5.500,  tw: 0.250, tf: 0.345, A: 7.68, Ix: 301,   Sx: 38.4,  Zx: 44.2,  rx: 6.26, Iy: 9.59,  Sy: 3.49, Zy: 5.48, ry: 1.12,  h_tw: 56.8, weight: 26 },
  { designation: 'W16X36', d: 15.86, bf: 6.985,  tw: 0.295, tf: 0.430, A: 10.6, Ix: 448,   Sx: 56.5,  Zx: 64.0,  rx: 6.51, Iy: 24.5,  Sy: 7.00, Zy: 10.8, ry: 1.52,  h_tw: 48.1, weight: 36 },
  { designation: 'W16X50', d: 16.26, bf: 7.070,  tw: 0.380, tf: 0.630, A: 14.7, Ix: 659,   Sx: 81.0,  Zx: 92.0,  rx: 6.68, Iy: 37.2,  Sy: 10.5, Zy: 16.3, ry: 1.59,  h_tw: 37.4, weight: 50 },
  { designation: 'W16X67', d: 16.33, bf: 10.235, tw: 0.395, tf: 0.665, A: 19.6, Ix: 954,   Sx: 117,   Zx: 130,   rx: 6.96, Iy: 119,   Sy: 23.2, Zy: 35.5, ry: 2.46,  h_tw: 35.9, weight: 67 },

  { designation: 'W18X35', d: 17.70, bf: 6.000,  tw: 0.300, tf: 0.425, A: 10.3, Ix: 510,   Sx: 57.6,  Zx: 66.5,  rx: 7.04, Iy: 15.3,  Sy: 5.12, Zy: 8.06, ry: 1.22,  h_tw: 53.5, weight: 35 },
  { designation: 'W18X50', d: 17.99, bf: 7.495,  tw: 0.355, tf: 0.570, A: 14.7, Ix: 800,   Sx: 88.9,  Zx: 101,   rx: 7.38, Iy: 40.1,  Sy: 10.7, Zy: 16.6, ry: 1.65,  h_tw: 45.2, weight: 50 },
  { designation: 'W18X76', d: 18.21, bf: 11.035, tw: 0.425, tf: 0.680, A: 22.3, Ix: 1330,  Sx: 146,   Zx: 163,   rx: 7.73, Iy: 152,   Sy: 27.6, Zy: 42.2, ry: 2.61,  h_tw: 37.8, weight: 76 },

  { designation: 'W21X44', d: 20.66, bf: 6.500,  tw: 0.350, tf: 0.450, A: 13.0, Ix: 843,   Sx: 81.6,  Zx: 95.4,  rx: 8.06, Iy: 20.7,  Sy: 6.37, Zy: 10.2, ry: 1.26,  h_tw: 53.6, weight: 44 },
  { designation: 'W21X62', d: 20.99, bf: 8.240,  tw: 0.400, tf: 0.615, A: 18.3, Ix: 1330,  Sx: 127,   Zx: 144,   rx: 8.54, Iy: 57.5,  Sy: 13.9, Zy: 21.7, ry: 1.77,  h_tw: 46.9, weight: 62 },
  { designation: 'W21X93', d: 21.62, bf: 8.420,  tw: 0.580, tf: 0.930, A: 27.3, Ix: 2070,  Sx: 192,   Zx: 221,   rx: 8.70, Iy: 92.9,  Sy: 22.1, Zy: 34.7, ry: 1.84,  h_tw: 32.3, weight: 93 },

  { designation: 'W24X55', d: 23.57, bf: 7.005,  tw: 0.395, tf: 0.505, A: 16.2, Ix: 1350,  Sx: 114,   Zx: 134,   rx: 9.11, Iy: 29.1,  Sy: 8.30, Zy: 13.3, ry: 1.34,  h_tw: 54.6, weight: 55 },
  { designation: 'W24X76', d: 23.92, bf: 8.990,  tw: 0.440, tf: 0.680, A: 22.4, Ix: 2100,  Sx: 176,   Zx: 200,   rx: 9.69, Iy: 82.5,  Sy: 18.4, Zy: 28.6, ry: 1.92,  h_tw: 49.0, weight: 76 },
  { designation: 'W24X103',d: 24.53, bf: 9.000,  tw: 0.550, tf: 0.980, A: 30.3, Ix: 3000,  Sx: 245,   Zx: 280,   rx: 9.96, Iy: 119,   Sy: 26.5, Zy: 41.5, ry: 1.99,  h_tw: 39.2, weight: 103 },
]

export const SECTION_BY_DESIGNATION: Record<string, WShape> = Object.fromEntries(
  W_SHAPES.map((s) => [s.designation, s])
)
