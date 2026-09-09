
create or replace function public.dispatch_order(_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  o record;
  v record;
  pick uuid;
begin
  select id, vendor_id, partner_id, status, rejected_partner_ids, offered_to, offer_expires_at
    into o from public.orders where id = _order_id;
  if not found or o.partner_id is not null then return null; end if;
  if o.status not in ('SEARCHING_RIDER','READY_FOR_PICKUP','ORDER_ACCEPTED') then return null; end if;
  if o.offered_to is not null and o.offer_expires_at is not null and o.offer_expires_at > now() then
    return o.offered_to;
  end if;

  select lat, lng, zone into v from public.vendors where id = o.vendor_id;
  if not found then return null; end if;

  select d.id into pick
  from public.delivery_partners d
  where d.status = 'APPROVED'
    and d.is_online = true
    and d.is_busy = false
    and not (d.id = any(coalesce(o.rejected_partner_ids, '{}'::uuid[])))
    and (v.zone is null or coalesce(array_length(d.assigned_zones,1),0) = 0 or v.zone = any(d.assigned_zones))
  order by
    case when d.lat is null or d.lng is null then 1 else 0 end,
    (abs(coalesce(d.lat,0) - coalesce(v.lat,0)) + abs(coalesce(d.lng,0) - coalesce(v.lng,0)))
  limit 1;

  if pick is null and coalesce(array_length(o.rejected_partner_ids,1),0) > 0 then
    update public.orders set rejected_partner_ids = '{}'::uuid[] where id = _order_id;
    select d.id into pick
    from public.delivery_partners d
    where d.status = 'APPROVED' and d.is_online = true and d.is_busy = false
      and (v.zone is null or coalesce(array_length(d.assigned_zones,1),0) = 0 or v.zone = any(d.assigned_zones))
    order by
      case when d.lat is null or d.lng is null then 1 else 0 end,
      (abs(coalesce(d.lat,0) - coalesce(v.lat,0)) + abs(coalesce(d.lng,0) - coalesce(v.lng,0)))
    limit 1;
  end if;

  if pick is null then
    update public.orders
      set offered_to = null, offer_expires_at = null,
          status = case when status = 'READY_FOR_PICKUP' then status else 'SEARCHING_RIDER' end
    where id = _order_id;
    return null;
  end if;

  update public.orders
    set offered_to = pick,
        offer_expires_at = now() + interval '45 seconds',
        status = case when status = 'READY_FOR_PICKUP' then status else 'SEARCHING_RIDER' end
  where id = _order_id;

  return pick;
end;
$$;

create or replace function public.sweep_dispatch()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare r record; n integer := 0;
begin
  for r in
    select id from public.orders
    where partner_id is null
      and status in ('SEARCHING_RIDER','READY_FOR_PICKUP')
      and (offered_to is null or offer_expires_at is null or offer_expires_at < now())
    order by created_at
    limit 25
  loop
    perform public.dispatch_order(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.dispatch_order(uuid) from public;
revoke all on function public.sweep_dispatch() from public;
grant execute on function public.dispatch_order(uuid) to authenticated;
grant execute on function public.sweep_dispatch() to authenticated;
grant execute on function public.dispatch_order(uuid) to service_role;
grant execute on function public.sweep_dispatch() to service_role;
