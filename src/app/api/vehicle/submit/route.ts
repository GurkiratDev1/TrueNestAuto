import { NextResponse } from 'next/server';
import { VehicleSubmissionSchema } from '@/lib/validations';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        status: 400,
        error: 'validation_error',
        details: [{ field: 'body', message: 'Invalid JSON payload' }]
      }, { status: 400 });
    }

    const rawPayload = body;
    const idempotencyHeader = request.headers.get('Idempotency-Key');
    const idempotencyKey = idempotencyHeader || rawPayload?.idempotency_key;

    // Validate payload
    const result = VehicleSubmissionSchema.safeParse(rawPayload);
    if (!result.success) {
      return NextResponse.json({
        status: 400,
        error: 'validation_error',
        details: result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }

    const validatedData = result.data;

    // Check for existing submission if idempotency key is provided
    if (idempotencyKey) {
      const existingSubmission = await db.query(
        'SELECT s.id as submission_id, j.id as job_id, j.status FROM vehicle_submissions s JOIN vehicle_jobs j ON s.id = j.submission_id WHERE s.idempotency_key = $1',
        [idempotencyKey]
      );

      if (existingSubmission.rows.length > 0) {
        return NextResponse.json(existingSubmission.rows[0]);
      }
    }

    // Start a transaction
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Save submission
      const submissionResult = await client.query(
        'INSERT INTO vehicle_submissions (user_id, payload, idempotency_key) VALUES ($1, $2, $3) RETURNING id',
        [validatedData.submitted_by, JSON.stringify(rawPayload), idempotencyKey]
      );
      const submissionId = submissionResult.rows[0].id;

      // 2. Create job
      const jobResult = await client.query(
        'INSERT INTO vehicle_jobs (submission_id, status) VALUES ($1, $2) RETURNING id, status',
        [submissionId, 'pending']
      );
      const jobId = jobResult.rows[0].id;
      const status = jobResult.rows[0].status;

      await client.query('COMMIT');

      // Simulate external worker trigger (background)
      triggerSimulatedWorker(jobId).catch(console.error);

      return NextResponse.json({
        submission_id: submissionId,
        job_id: jobId,
        status: status
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('SUBMISSION_ERROR_LOG:', error);
    return NextResponse.json({
      status: 500,
      error: 'internal_server_error',
      message: error instanceof Error ? error.message : 'Failed to process submission'
    }, { status: 500 });
  }
}

/**
 * Simulates a background worker processing the job.
 * Updates the database and would ideally trigger SSE updates.
 */
async function triggerSimulatedWorker(jobId: string) {
  const steps = [
    { status: 'processing', progress: { message: 'Decoding VIN and fetching MarketCheck data...', percentage: 20 } },
    { status: 'processing', progress: { message: 'Analyzing competitor pricing...', percentage: 50 } },
    { status: 'processing', progress: { message: 'Generating AI summary...', percentage: 80 } },
    { status: 'completed', progress: { message: 'Job completed successfully', percentage: 100 } }
  ];

  for (const step of steps) {
    // Artificial delay to simulate work
    await new Promise(resolve => setTimeout(resolve, 2000));

    await db.query(
      'UPDATE vehicle_jobs SET status = $1, progress = $2, updated_at = now() WHERE id = $3',
      [step.status, JSON.stringify(step.progress), jobId]
    );
  }
}
