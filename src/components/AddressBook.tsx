import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SavedAddress = {
  id: string;
  full_name: string;
  mobile: string;
  pincode: string;
  line: string;
  landmark: string | null;
  lat: number;
  lng: number;
  is_default: boolean;
};

export function useAddresses(userId: string | undefined) {
  const [list, setList] = useState<SavedAddress[]>([]);

  async function reload() {
    if (!userId) return setList([]);
    const { data } = await supabase
      .from("addresses")
      .select("id,full_name,mobile,pincode,line,landmark,lat,lng,is_default")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setList((data ?? []) as SavedAddress[]);
  }

  useEffect(() => {
    void reload();
  }, [userId]);

  return { list, reload };
}

/** Saved addresses the customer can pick from at checkout or manage in their account. */
export function AddressBook({
  userId,
  selectedId,
  onPick,
}: {
  userId: string | undefined;
  selectedId?: string | null;
  onPick?: (a: SavedAddress) => void;
}) {
  const { list, reload } = useAddresses(userId);

  async function makeDefault(id: string) {
    if (!userId) return;
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    await reload();
  }

  async function remove(id: string) {
    await supabase.from("addresses").delete().eq("id", id);
    await reload();
  }

  if (list.length === 0) return null;

  return (
    <div className="card-elevated rise-in space-y-2 p-3">
      <p className="text-sm font-bold">Saved addresses</p>
      <div className="space-y-2">
        {list.map((a) => {
          const active = selectedId === a.id;
          return (
            <div
              key={a.id}
              className={`rounded-2xl border p-2.5 ${active ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <button onClick={() => onPick?.(a)} className="press block w-full text-left">
                <p className="truncate text-[13px] font-black">
                  {a.full_name} · {a.mobile}
                  {a.is_default ? <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[9px] font-black text-primary-foreground">DEFAULT</span> : null}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {a.line}
                  {a.landmark ? `, ${a.landmark}` : ""} — {a.pincode}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
                  Your live location is still needed at checkout
                </p>
              </button>
              <div className="mt-1.5 flex gap-2">
                {!a.is_default ? (
                  <button onClick={() => void makeDefault(a.id)} className="press rounded-full border border-border px-2.5 py-1 text-[10px] font-black">
                    Set default
                  </button>
                ) : null}
                <button onClick={() => void remove(a.id)} className="press rounded-full border border-destructive px-2.5 py-1 text-[10px] font-black text-destructive">
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
