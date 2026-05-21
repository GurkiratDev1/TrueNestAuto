import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      let lastSent = '';

      const pollInterval = setInterval(async () => {
        try {
          const result = await db.query(
            'SELECT status, progress, error FROM vehicle_jobs WHERE id = $1',
            [jobId]
          );

          if (result.rows.length === 0) {
            sendEvent('failed', { status: 'failed', error: 'Job not found' });
            clearInterval(pollInterval);
            controller.close();
            return;
          }

          const job = result.rows[0];
          const payload = {
            status: job.status,
            progress: job.progress,
            error: job.error,
          };
          const payloadString = JSON.stringify(payload);

          if (job.status === 'completed') {
            sendEvent('completed', payload);
            clearInterval(pollInterval);
            controller.close();
            return;
          }

          if (job.status === 'failed') {
            sendEvent('failed', payload);
            clearInterval(pollInterval);
            controller.close();
            return;
          }

          if (payloadString !== lastSent) {
            lastSent = payloadString;
            sendEvent('progress', payload);
          }
        } catch (error) {
          console.error('SSE Polling Error:', error);
          sendEvent('failed', { status: 'failed', error: 'Internal stream error' });
          clearInterval(pollInterval);
          controller.close();
        }
      }, 1000);

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(pollInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
