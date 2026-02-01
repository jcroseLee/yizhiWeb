import { getApiDocs } from '@/lib/swagger';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: GET /api/docs
 *     description: Auto-generated description for GET /api/docs
 *     tags:
 *       - Docs
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET() {
  const spec = await getApiDocs();
  return NextResponse.json(spec);
}
