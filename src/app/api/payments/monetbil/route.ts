import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { connection } from "@/utils/connection";
import Order from "@/models/Order";
import { checkMonetbilPayment } from "@/lib/monetbil";
import { markOrderFailed, markOrderPaid } from "@/lib/order-service";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function readParams(req: NextRequest): Promise<Record<string, string>> {
  const params: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  if (req.method === "POST") {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      if (body && typeof body === "object") {
        for (const [key, value] of Object.entries(body)) {
          params[key] = String(value ?? "");
        }
      }
    } else if (contentType.includes("form")) {
      const form = await req.formData().catch(() => null);
      form?.forEach((value, key) => {
        params[key] = String(value);
      });
    }
  }
  return params;
}

async function handle(req: NextRequest) {
  const ip = await getClientIp();
  const limit = await consumeRateLimit(`monetbil-notify:${ip}`, 120, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const params = await readParams(req);

  const notifyToken = process.env.MONETBIL_NOTIFY_TOKEN;
  if (notifyToken) {
    const supplied = params.token ?? params.key ?? "";
    if (!supplied || !safeEqual(supplied, notifyToken)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const paymentId =
    params.paymentId ??
    params.payment_id ??
    params.transaction_id ??
    params.transactionId;
  const orderNumber =
    params.payment_ref ?? params.item_ref ?? params.orderNumber ?? "";

  if (!paymentId || !orderNumber) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  await connection();
  const order = await Order.findOne({ orderNumber }).lean();
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const transaction = await checkMonetbilPayment(paymentId);
  if (!transaction) {
    return NextResponse.json(
      { error: "Payment could not be verified" },
      { status: 502 },
    );
  }

  if (transaction.status !== 1) {
    if (transaction.status === 0 || transaction.status === -1) {
      await markOrderFailed(orderNumber, "Monetbil payment failed or cancelled");
    }
    return NextResponse.json({ ok: false, status: transaction.status });
  }

  if (
    transaction.payment_ref &&
    transaction.payment_ref !== order.orderNumber
  ) {
    return NextResponse.json(
      { error: "Payment reference mismatch" },
      { status: 400 },
    );
  }

  const result = await markOrderPaid(orderNumber, {
    gateway: "monetbil",
    transactionId: paymentId,
    amount: transaction.amount,
    currency: transaction.currency,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, alreadyPaid: result.alreadyPaid });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
