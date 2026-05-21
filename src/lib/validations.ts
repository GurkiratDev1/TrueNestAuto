import { z } from 'zod';

export const VehicleSubmissionSchema = z.object({
  submitted_by: z.string().min(1, 'submitted_by is required'),
  timestamp: z.string().datetime(),
  vehicle: z.object({
    vin: z.string().min(1, 'vehicle.vin must be a non-empty string').optional(),
    year: z.number().int().optional(),
    make: z.string().min(1, 'vehicle.make must be a non-empty string').optional(),
    model: z.string().min(1, 'vehicle.model must be a non-empty string').optional(),
    trim: z.string().optional(),
    mileage: z.number().optional(),
    asking_price: z.number().optional(),
    location: z.object({
      zip: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    }).optional(),
    notes: z.string().optional(),
  }).refine(data => {
    return data.vin || (data.make && data.model && data.year);
  }, {
    message: "VIN is required or provide make+model+year",
    path: ["vin"],
  }),
  meta: z.object({
    request_id: z.string().optional(),
    client_version: z.string().optional(),
  }).optional(),
  idempotency_key: z.string().optional(),
});

export type VehicleSubmission = z.infer<typeof VehicleSubmissionSchema>;
