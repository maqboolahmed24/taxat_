import { lowNoiseSurfaceOrder, type LowNoiseSurfaceCode } from "../models/low_noise_frame.ts";

export class LowNoiseSurfaceOrderError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "LowNoiseSurfaceOrderError";
    this.reasonCodes = reasonCodes;
  }
}

function canonicalSurfaceOrderString(values: readonly string[]) {
  return values.join(" -> ");
}

export function validatePublishedSurfaceOrder(input: {
  budgetRenderedSurfaceOrder?: readonly unknown[];
  surfaceOrder: readonly unknown[];
}): LowNoiseSurfaceCode[] {
  const surfaceOrder = input.surfaceOrder;
  const expected = [...lowNoiseSurfaceOrder];
  const hasExactPeerOrder =
    surfaceOrder.length === expected.length &&
    expected.every((surfaceCode, index) => surfaceOrder[index] === surfaceCode);
  if (!hasExactPeerOrder) {
    throw new LowNoiseSurfaceOrderError(
      `Low-noise surface order must remain ${canonicalSurfaceOrderString(expected)}`,
      ["LOW_NOISE_SURFACE_ORDER_DRIFT"],
    );
  }

  if (input.budgetRenderedSurfaceOrder !== undefined) {
    const renderedOrder = input.budgetRenderedSurfaceOrder;
    const budgetOrderMirrorsSurfaceOrder =
      renderedOrder.length === surfaceOrder.length &&
      surfaceOrder.every((surfaceCode, index) => renderedOrder[index] === surfaceCode);
    if (!budgetOrderMirrorsSurfaceOrder) {
      throw new LowNoiseSurfaceOrderError(
        "Low-noise budget audit rendered surface order must mirror surface_order",
        ["LOW_NOISE_BUDGET_SURFACE_ORDER_DRIFT"],
      );
    }
  }

  return expected;
}
