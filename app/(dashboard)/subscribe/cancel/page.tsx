import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SubscribeCancelPage() {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <Card>
        <p className="font-data text-xs uppercase tracking-[0.16em] text-muted">Checkout Cancelled</p>
        <h1 className="font-display mt-3 text-4xl font-bold tracking-[-0.02em]">No changes were made</h1>
        <p className="mt-3 text-sm text-muted">
          You can resume checkout at any time. Your account remains active with current access level.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/subscribe">
            <Button>Try Again</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>
      </Card>
    </section>
  );
}
